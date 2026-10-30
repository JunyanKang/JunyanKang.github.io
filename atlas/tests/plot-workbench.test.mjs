import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { categoryLayout, fitCategoryBlocks } from '../shared/chart-layout.mjs';
import { createAtlasQuery } from '../shared/query.mjs';

// Exercise the actual private component/helpers without adding production exports
// or a browser runner. Width injection stands in only for ResizeObserver.
const source = readFileSync(new URL('../src/pages/ExpressionAtlasPage.tsx', import.meta.url), 'utf8');
const exportsForTest = ['DatasetLineChart', 'DatasetHeatmap', 'PlotControlPanel', 'PlotWorkbench', 'CombinedMouseTissuePanel', 'DatasetPanelToolbar', 'getPlotPresets', 'getDefaultPlotSettings', 'clampPlotSettings', 'buildSvgForExport', 'wrapPlotLabel', 'buildDatasetMatrix', 'getDisplayMatrix', 'buildBulkLinePlotData', 'matrixToCsv', 'retainDatasetSelection'];
const compiled = ts.transpileModule(`${source}\nexport { ${exportsForTest.join(', ')} };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }
}).outputText;
const require = createRequire(import.meta.url);
function loadPage(width = 1100) {
  const module = { exports: {} };
  const localRequire = name => {
    if (name === '../api/modules') return {};
    if (name === '../../shared/chart-layout.mjs') return { categoryLayout, fitCategoryBlocks };
    if (name === 'react') return { ...React, useState: initial => React.useState(initial === 0 ? width : initial) };
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}
const page = loadPage();
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const noOp = () => {};
const bulk = {
  key: 'mouse_tissue_rna', title: 'Mouse tissue RNA', unit: 'TPM', hasMatch: true, matchedGene: 'Pax6',
  samples: Array.from({ length: 30 }, (_, index) => ({ name: `tissue_${index}_long_label`, value: index === 3 ? null : index / 2 }))
};

test('presets and manual sliders retain safe bounds and reset to dataset defaults', () => {
  const defaults = page.getDefaultPlotSettings(bulk);
  assert.equal(defaults.width, 880);
  assert.equal(defaults.height, 320);
  assert.deepEqual(page.getPlotPresets(defaults).map(item => item.label), ['Compact']);
  const changes = [];
  const tree = page.PlotControlPanel({ title: 'Size', settings: defaults, defaultSettings: defaults, onChange: settings => changes.push(settings) });
  const nodes = [];
  function walk(node) {
    if (!React.isValidElement(node)) return;
    nodes.push(node);
    React.Children.forEach(node.props.children, walk);
  }
  walk(tree);
  const sliders = nodes.filter(node => node.type === 'input');
  assert.equal(sliders.length, 3);
  sliders[0].props.onChange({ target: { value: '99999' } });
  assert.equal(changes.at(-1).width, 2200);
  sliders[1].props.onChange({ target: { value: '1' } });
  assert.equal(changes.at(-1).height, 260);
  sliders[2].props.onChange({ target: { value: '26' } });
  assert.equal(changes.at(-1).fontSize, 26);
  sliders[2].props.onChange({ target: { value: 'invalid' } });
  assert.equal(changes.at(-1).fontSize, defaults.fontSize);
  nodes.find(node => node.type === 'button' && node.props.children === 'Compact').props.onClick();
  assert.deepEqual(changes.at(-1), defaults);
  nodes.find(node => node.type === 'button' && node.props.children === 'Reset size').props.onClick();
  assert.deepEqual(changes.at(-1), defaults);
});

for (const width of [250, 375, 760, 1280]) {
  test(`chart preserves all sample labels and nonmissing values at ${width}px`, () => {
    const { DatasetLineChart } = loadPage(width);
    const html = render(DatasetLineChart, { dataset: bulk, selectedSeriesLabels: [], settings: { width: 1280, height: 340, fontSize: 18 } });
    assert.equal((html.match(/class="expression-atlas-chart__x-label"/g) ?? []).length, 30);
    assert.equal((html.match(/<rect /g) ?? []).length, 29);
    assert.match(html, /font-size:17px/); // Narrow screens do not silently shrink selected labels.
    assert.doesNotMatch(html, /NaN|Infinity/);
    const [, svgWidth, svgHeight] = html.match(/<svg[^>]*width="([\d.]+)" height="([\d.]+)"/);
    assert.ok(Number(svgHeight) >= 340 && Number(svgHeight) < 30000);
    assert.ok(Number(svgWidth) <= width);
    assert.equal((html.match(/<svg /g) ?? []).length, 1);
    assert.match(html, /tabindex="0" role="region"/);
    assert.doesNotMatch(html, /scroll to inspect|Dense plots scroll|Scroll horizontally/);
  });
}

test('workbench DOM order is controls then figure, with explicit PDF and CSV actions', () => {
  const html = render(page.PlotWorkbench, { dataset: bulk, settings: page.getDefaultPlotSettings(bulk), onSettingsChange: noOp, selectedSeriesLabels: [], onExportData: noOp });
  assert.ok(html.indexOf('expression-atlas-plot-controls') < html.indexOf('expression-atlas-plot-layout__figure'));
  assert.doesNotMatch(html, /plot-layout__side/);
  assert.match(html, /Download PDF/);
  assert.match(html, /Download CSV/);
  assert.match(render(page.DatasetPanelToolbar, { label: 'RNA', viewMode: 'data', onViewChange: noOp, matched: true }), /aria-pressed="true"[^>]*>Table/);
});

test('RNA and protein retain separate workbenches and CSV actions', () => {
  const protein = { ...bulk, key: 'mouse_tissue_protein', title: 'Mouse tissue protein', unit: 'Abundance', samples: [{ name: 'heart_1', value: 2 }, { name: 'heart_2', value: 4 }] };
  const html = render(page.CombinedMouseTissuePanel, { datasets: [bulk, protein], viewMode: 'plot', onViewChange: noOp, rnaSettings: page.getDefaultPlotSettings(bulk), proteinSettings: page.getDefaultPlotSettings(protein), onRnaSettingsChange: noOp, onProteinSettingsChange: noOp, matched: true });
  assert.equal((html.match(/Download PDF/g) ?? []).length, 2);
  assert.equal((html.match(/Download CSV/g) ?? []).length, 2);
  assert.equal(page.buildBulkLinePlotData(protein).series[0].points[0].value, 3);
});

const dataBase = new URL('../../assets/atlas/v1/', import.meta.url);
const query = createAtlasQuery(async path => {
  const bytes = readFileSync(new URL(path, dataBase));
  return JSON.parse(path.endsWith('.gz') ? gunzipSync(bytes).toString() : bytes.toString());
});
test('all released Pax6 datasets retain full heatmap dimensions and CSV before/after clustering', async () => {
  const result = await query('Pax6');
  for (const dataset of result.datasets.filter(item => item.hasMatch)) {
    const original = page.buildDatasetMatrix(dataset);
    for (const options of [{ rows: false, columns: false }, { rows: true, columns: true }]) {
      const matrix = page.getDisplayMatrix(dataset, original, options);
      assert.deepEqual(matrix.values, original.values);
      assert.equal(matrix.rows.length, original.rows.length);
      assert.equal(matrix.columns.length, original.columns.length);
      const html = render(page.DatasetHeatmap, { dataset, matrix, clusterOptions: options, onClusterOptionsChange: noOp, onExportData: noOp });
      const blocks = (html.match(/<table /g) ?? []).length;
      assert.ok(blocks >= 1);
      assert.equal((html.match(/<td /g) ?? []).length, matrix.rows.length * matrix.columns.length);
      assert.equal((html.match(/scope="col"/g) ?? []).length, matrix.columns.length + blocks);
      assert.equal((html.match(/scope="row"/g) ?? []).length, matrix.rows.length * blocks);
      assert.equal(page.matrixToCsv(matrix).split('\n').length, matrix.rows.length + 1);
      assert.match(html, /tabindex="0"/);
    }
  }
});

test('missing data renders an explanation, not a zero-valued chart/table', () => {
  const html = render(page.DatasetHeatmap, { dataset: { ...bulk, hasMatch: false }, matrix: page.buildDatasetMatrix(bulk), clusterOptions: { rows: false, columns: false }, onClusterOptionsChange: noOp });
  assert.match(html, /No matched gene/);
  assert.doesNotMatch(html, /<table/);
});

class SvgNode {
  constructor(tag, attributes = {}) { this.tag = tag; this.attributes = { ...attributes }; this.style = {}; this.children = []; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  get firstChild() { return this.children[0]; }
  appendChild(node) { this.children.push(node); }
  insertBefore(node) { this.children.unshift(node); }
  cloneNode() {
    const copy = new SvgNode(this.tag, this.attributes);
    copy.style = { ...this.style };
    copy.children = this.children.map(child => child.cloneNode());
    return copy;
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(selector.startsWith('.') ? child.attributes.class === selector.slice(1) : child.tag === selector) ? [child] : [],
      ...child.querySelectorAll(selector)
    ]);
  }
}

test('export freezes white-paper fonts/grid without changing SVG geometry or data fills', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElementNS: (_namespace, tag) => new SvgNode(tag) };
  try {
    const svg = new SvgNode('svg', { width: '980', height: '1500', viewBox: '0 0 980 1500' });
    svg.viewBox = { baseVal: { width: 980, height: 1500 } };
    const text = new SvgNode('text', { x: '20', y: '60', transform: 'rotate(-60 20 60)', class: 'expression-atlas-chart__row-label' });
    text.style.fontSize = '19px';
    svg.appendChild(text);
    svg.appendChild(new SvgNode('line', { class: 'expression-atlas-chart__grid', x1: '20', x2: '904' }));
    svg.appendChild(new SvgNode('line', { class: 'expression-atlas-chart__axis', y1: '90', y2: '1400' }));
    svg.appendChild(new SvgNode('rect', { fill: '#1f4e79', x: '33', y: '100', width: '22', height: '141' }));
    const exported = page.buildSvgForExport(svg);
    assert.deepEqual(exported.attributes, svg.attributes);
    assert.equal(exported.firstChild.getAttribute('fill'), '#ffffff');
    const exportedText = exported.querySelectorAll('text')[0];
    assert.equal(exportedText.style.fill, '#1a3443');
    assert.equal(exportedText.style.fontSize, '19px');
    assert.equal(exportedText.style.fontFamily, 'Arial, Helvetica, sans-serif');
    assert.deepEqual(exportedText.attributes, text.attributes);
    assert.equal(exported.querySelectorAll('.expression-atlas-chart__grid')[0].style.stroke, '#d4dde0');
    assert.equal(exported.querySelectorAll('.expression-atlas-chart__axis')[0].style.strokeWidth, '1.2');
    assert.deepEqual(exported.querySelectorAll('rect')[1].attributes, svg.querySelectorAll('rect')[0].attributes);
    assert.equal(svg.querySelectorAll('text')[0].style.fill, undefined, 'live DOM is not mutated');
    const withLegend = page.buildSvgForExport(svg, Array.from({ length: 20 }, (_, index) => ({ label: `Long cell type name number ${index} with further detail`, color: '#1f4e79' })));
    assert.equal(withLegend.getAttribute('width'), '980');
    assert.ok(Number(withLegend.getAttribute('height')) > 1500);
    assert.equal(withLegend.querySelectorAll('circle').length, 20);
    assert.equal(withLegend.querySelectorAll('text').length, 21);
    assert.ok(withLegend.querySelectorAll('tspan').length > 20);
  } finally { globalThis.document = previousDocument; }
});

test('long unbroken labels wrap without dropping characters', () => {
  const label = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const lines = page.wrapPlotLabel(label, 12);
  assert.equal(lines.join(''), label);
  assert.ok(lines.every(line => line.length <= 12));
});

test('CSV preserves raw nonzero precision, zero, missing values and quoted labels', () => {
  const matrix={rows:['RPCs'],columns:['tiny','zero','missing','a,"b'],values:new Map([['RPCs::tiny',0.000467294],['RPCs::zero',0],['RPCs::a,"b',1531.578]])};
  const csv=page.matrixToCsv(matrix);
  assert.equal(csv.split('\n')[1],'"RPCs","0.000467294","0","","1531.578"');
  assert.match(csv, /"a,""b"/);
});

test('released Rho expression remains nonzero and exact in CSV',async()=>{
  const result=await query('Rho');
  const dataset=result.datasets.find(d=>d.key==='human_retina_scrna');
  const matrix=page.buildDatasetMatrix(dataset);
  const csv=page.matrixToCsv(matrix);
  const row=csv.split('\n')[matrix.rows.indexOf('RPCs')+1].split(',').map(v=>v.slice(1,-1));
  for(const column of ['42 Day','Hgw20']) {
    const value=matrix.values.get(`RPCs::${column}`);
    assert.ok(value>0 && value<.001);
    assert.equal(Number(row[matrix.columns.indexOf(column)+1]),value);
  }
});

test('plot exports carry source units and protein aggregation semantics in the SVG',()=>{
  const rna=render(page.DatasetLineChart,{dataset:{...bulk,unit:'RPKM'},selectedSeriesLabels:[],settings:page.getDefaultPlotSettings(bulk)});
  assert.match(rna,/RPKM/);
  const protein={...bulk,key:'mouse_tissue_protein',unit:'iBAQ',samples:[{name:'heart_1',value:2},{name:'heart_2',value:4}]};
  const html=render(page.DatasetLineChart,{dataset:protein,selectedSeriesLabels:[],settings:page.getDefaultPlotSettings(protein)});
  assert.match(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),/iBAQ \(mean of available replicates\)/);
});

test('changing genes retains the chosen dataset even when the new gene is missing there',()=>{
  const panels=[{key:'bulk',hasMatch:true},{key:'single-cell',hasMatch:false}];
  assert.equal(page.retainDatasetSelection(panels,'single-cell'),'single-cell');
  assert.equal(page.retainDatasetSelection(panels,''),'bulk');
  assert.equal(page.retainDatasetSelection([], 'single-cell'),'single-cell');
  assert.doesNotMatch(source,/setDatasetViewModes\(\{\}\)/);
  assert.doesNotMatch(source,/setDatasetPlotSettings\(\{\}\)/);
});

 test('responsive category blocks preserve order and share plot geometry without horizontal overflow',()=>{
 for(const width of [220,250,320,375,760,1280]) for(const fontSize of [11,14,25]) {
  const labels=bulk.samples.map(s=>s.name);
  const layout=fitCategoryBlocks(labels,fontSize,880,width,110);
  assert.deepEqual(layout.blocks.flat(),labels);
  assert.ok(layout.width <= width);
  assert.ok(layout.width > layout.leftPad + 110);
  assert.ok(layout.blocks.every(block=>block.length>0));
 }
 const css=readFileSync(new URL('../src/styles/atlas-charts.scss',import.meta.url),'utf8');
 assert.doesNotMatch(css,/max-height: (?:min\(680px|60svh)/);
 assert.match(css,/max-height: none;\s+overflow: visible/);
 });

test('RNA and protein use the same slim bars regardless of sample count',()=>{
  for(const width of [250,375,1280]) {
    const {DatasetLineChart}=loadPage(width);
    const protein={...bulk,key:'mouse_tissue_protein',samples:Array.from({length:11},(_,i)=>({name:`tissue_${i}_1`,value:i+1}))};
    const widths=[bulk,protein].map(dataset=>{
      const html=render(DatasetLineChart,{dataset,selectedSeriesLabels:[],settings:page.getDefaultPlotSettings(dataset)});
      return [...html.matchAll(/<rect[^>]*width="([\d.]+)"/g)].map(match=>Number(match[1]));
    });
    assert.ok(widths.every(values=>values.length>0 && values.every(value=>value===14)));
  }
});

test('every published expression plot shares 14px bars and 26px category spacing',async()=>{
 const results=await Promise.all([query('Pax6'),query('Rho')]);
 const covered=new Set();
 for(const width of [250,375,1280]) {
  const {DatasetLineChart}=loadPage(width);
  for(const dataset of results.flatMap(result=>result.datasets).filter(d=>d.hasMatch)) {
   covered.add(dataset.key);
   const labels=page.buildDatasetMatrix(dataset).rows;
   const html=render(DatasetLineChart,{dataset,selectedSeriesLabels:labels,settings:page.getDefaultPlotSettings(dataset)});
   const bars=[...html.matchAll(/<rect[^>]*width="([\d.]+)"/g)];
   assert.ok(bars.length>0, dataset.key);
   assert.ok(bars.every(match=>Number(match[1])===14),dataset.key);
   const ticks=[...html.matchAll(/<text x="([\d.]+)"[^>]*class="expression-atlas-chart__x-label"/g)].map(match=>Number(match[1]));
   assert.ok(ticks.length>0,dataset.key);
   for(let i=1;i<ticks.length;i++) if(ticks[i]>ticks[i-1]) assert.ok(Math.abs(ticks[i]-ticks[i-1]-26)<.001,dataset.key);
  }
 }
 assert.equal(covered.size,7);
});

test('presentation helper prose is removed while errors and scientific units remain',()=>{
 assert.doesNotMatch(source,/Width fits the panel|Size changes apply to the PDF|Explore retinal development, aging|atlas-reading-note|Dense plots scroll/);
 assert.match(source,/mean of available replicates/);
 assert.match(source,/Missing data does not indicate zero expression/);
});
