import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { queryExpressionAtlas } from '../api/modules';
import { ErrorState } from '../components/common/ErrorState.tsx';
import { LoadingState } from '../components/common/LoadingState.tsx';
import { KlCard } from '../components/ui/KlCard.tsx';
import type {
  ExpressionAtlasDatasetResult,
  ExpressionAtlasOrtholog,
  ExpressionAtlasQueryResult
} from '../types/index.ts';

const valueFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const linePalette = ['#1f4e79', '#2f7d78', '#9c6b4e', '#9b8b3b', '#6b5b95', '#b65e5e', '#5a7c2f', '#566a86', '#8f5d38', '#2c6c8e'];

type HeatmapMatrix = {
  columns: string[];
  rows: string[];
  values: Map<string, number | null>;
  minValue: number;
  maxValue: number;
  maxAbsValue: number;
};

type LinePoint = {
  xLabel: string;
  value: number;
  tooltip?: string;
};

type LineSeries = {
  label: string;
  color: string;
  points: LinePoint[];
};

type LinePlotData = {
  xLabels: string[];
  series: LineSeries[];
  minValue: number;
  maxValue: number;
};

type DatasetViewMode = 'plot' | 'data';
type PlotTooltip = {
  x: number;
  y: number;
  lines: string[];
};
type HeatmapClusterOptions = {
  rows: boolean;
  columns: boolean;
};
type PlotSettings = {
  width: number;
  height: number;
  fontSize: number;
};
type LegendItem = {
  label: string;
  color: string;
};
type DatasetPanel = {
  key: string;
  title: string;
  kind: 'dataset' | 'ortholog';
  datasets: ExpressionAtlasDatasetResult[];
  hasMatch: boolean;
};

const datasetPanelOrder: Record<string, number> = {
  mouse_tissue_multiomics: 1,
  human_retina_rpe_rna: 2,
  human_retina_scrna: 3,
  mouse_retina_scrna: 4,
  mouse_retina_dev_scrna: 5,
  monkey_retina_aging_scrna: 6,
  ortholog_mapping: 7
};

const excludedMouseScrnaRows = new Set(['doublets', 'red blood cells']);

const prettifyLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\//g, ' / ')
    .trim();

const getDatasetDisplayTitle = (dataset: Pick<ExpressionAtlasDatasetResult, 'key' | 'title'>) => {
  if (dataset.key === 'mouse_retina_dev_scrna') return 'Mouse retina Stereo-seq';
  return dataset.title;
};

const formatValue = (value: number | null) => {
  if (value === null) return '—';
  return valueFormatter.format(value);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const interpolateColor = (from: [number, number, number], to: [number, number, number], ratio: number) => {
  const safeRatio = clamp(ratio, 0, 1);
  const r = Math.round(from[0] + (to[0] - from[0]) * safeRatio);
  const g = Math.round(from[1] + (to[1] - from[1]) * safeRatio);
  const b = Math.round(from[2] + (to[2] - from[2]) * safeRatio);
  return `rgb(${r}, ${g}, ${b})`;
};

const triggerDownload = (fileName: string, blob: Blob) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
};

const matrixToCsv = (matrix: HeatmapMatrix) => {
  const rows = [
    ['Group', ...matrix.columns],
    ...matrix.rows.map((row) => [row, ...matrix.columns.map((column) => formatValue(matrix.values.get(`${row}::${column}`) ?? null))])
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
        .join(',')
    )
    .join('\n');
};

const svgElementToDataUrl = (svgElement: SVGSVGElement) => {
  const cloned = svgElement.cloneNode(true) as SVGSVGElement;
  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!cloned.getAttribute('xmlns:xlink')) {
    cloned.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }
  const serialized = new XMLSerializer().serializeToString(cloned);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
};

const buildSvgForExport = (svgElement: SVGSVGElement, legendItems: LegendItem[] = []) => {
  const cloned = svgElement.cloneNode(true) as SVGSVGElement;
  if (!legendItems.length) return cloned;

  const viewBox = svgElement.viewBox.baseVal;
  const baseWidth = viewBox?.width || svgElement.clientWidth || 1200;
  const baseHeight = viewBox?.height || svgElement.clientHeight || 720;
  const extraHeight = 84;
  cloned.setAttribute('viewBox', `0 0 ${baseWidth} ${baseHeight + extraHeight}`);

  const namespace = 'http://www.w3.org/2000/svg';
  const legendGroup = document.createElementNS(namespace, 'g');
  const itemsPerRow = Math.max(1, Math.floor(baseWidth / 220));
  const rowGap = 28;
  const colGap = Math.min(220, Math.max(150, baseWidth / itemsPerRow));
  const totalRows = Math.ceil(legendItems.length / itemsPerRow);
  const blockWidth = Math.min(baseWidth - 80, legendItems.length > 1 ? Math.min(baseWidth - 80, itemsPerRow * colGap) : 180);
  const startX = (baseWidth - blockWidth) / 2;
  const startY = baseHeight + 28;

  legendItems.forEach((item, index) => {
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    const x = startX + col * colGap;
    const y = startY + row * rowGap;

    const dot = document.createElementNS(namespace, 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', item.color);

    const label = document.createElementNS(namespace, 'text');
    label.setAttribute('x', String(x + 12));
    label.setAttribute('y', String(y + 4));
    label.setAttribute('fill', 'rgba(19, 49, 70, 0.92)');
    label.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    label.setAttribute('font-size', '14');
    label.textContent = item.label;

    legendGroup.appendChild(dot);
    legendGroup.appendChild(label);
  });

  const requiredHeight = baseHeight + Math.max(extraHeight, totalRows * rowGap + 40);
  cloned.setAttribute('viewBox', `0 0 ${baseWidth} ${requiredHeight}`);
  cloned.appendChild(legendGroup);
  return cloned;
};

const svgToPngDataUrl = async (svgElement: SVGSVGElement, legendItems: LegendItem[] = []) => {
  const exportSvg = buildSvgForExport(svgElement, legendItems);
  const dataUrl = svgElementToDataUrl(exportSvg);
  const image = new Image();
  image.decoding = 'sync';

  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to render SVG as image.'));
  });

  image.src = dataUrl;
  await loaded;

  const viewBox = exportSvg.viewBox.baseVal;
  const baseWidth = viewBox?.width || exportSvg.clientWidth || 1200;
  const baseHeight = viewBox?.height || exportSvg.clientHeight || 720;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(baseWidth * scale);
  canvas.height = Math.ceil(baseHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available for PDF export.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    pngDataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height
  };
};

const saveSvgAsPdf = async (title: string, svgElement: SVGSVGElement, legendItems: LegendItem[] = []) => {
  const { pngDataUrl, width, height } = await svgToPngDataUrl(svgElement, legendItems);
  const pdf = await PDFDocument.create();
  const pagePadding = 28;
  const page = pdf.addPage([width + pagePadding * 2, height + pagePadding * 2 + 34]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const png = await pdf.embedPng(pngDataUrl);

  page.drawText(title, {
    x: pagePadding,
    y: height + pagePadding + 14,
    size: 20,
    font,
    color: rgb(0.09, 0.2, 0.28)
  });
  page.drawImage(png, {
    x: pagePadding,
    y: pagePadding,
    width,
    height
  });

  const bytes = await pdf.save();
  const safeBytes = Uint8Array.from(bytes);
  triggerDownload(`${title.replace(/[^a-z0-9-_]+/gi, '_')}.pdf`, new Blob([safeBytes as unknown as BlobPart], { type: 'application/pdf' }));
};

const getHeatColor = (value: number | null, matrix: HeatmapMatrix) => {
  if (value === null) {
    return {
      background: 'rgba(231, 235, 237, 0.58)',
      color: 'var(--color-text-secondary)'
    };
  }

  if (matrix.minValue < 0 && matrix.maxValue > 0) {
    const ratio = matrix.maxAbsValue > 0 ? Math.abs(value) / matrix.maxAbsValue : 0;
    if (value < 0) {
      return {
        background: interpolateColor([246, 242, 233], [47, 89, 128], ratio),
        color: ratio > 0.52 ? '#f8fbfc' : '#173247'
      };
    }
    return {
      background: interpolateColor([246, 242, 233], [145, 86, 60], ratio),
      color: ratio > 0.56 ? '#fdfbf8' : '#412a1f'
    };
  }

  if (matrix.maxValue <= 0) {
    const ratio = matrix.maxAbsValue > 0 ? Math.abs(value) / matrix.maxAbsValue : 0;
    return {
      background: interpolateColor([246, 242, 233], [47, 89, 128], ratio),
      color: ratio > 0.52 ? '#f8fbfc' : '#173247'
    };
  }

  const ratio = Math.sqrt(value / matrix.maxValue);
  const background =
    ratio < 0.5
      ? interpolateColor([248, 245, 237], [184, 214, 213], ratio / 0.5)
      : interpolateColor([184, 214, 213], [20, 63, 93], (ratio - 0.5) / 0.5);

  return {
    background,
    color: ratio > 0.6 ? '#f8fbfc' : '#173247'
  };
};

const parseHumanScSample = (value: string) => {
  const parts = value.split('_');
  if (parts[0] === 'Adult') {
    return {
      column: 'Adult',
      row: prettifyLabel(parts.slice(1).join('_'))
    };
  }
  if (/^\d+$/.test(parts[0]) && parts[1] === 'Day') {
    return {
      column: `${parts[0]} Day`,
      row: prettifyLabel(parts.slice(2).join('_'))
    };
  }
  if (/^Hgw\d+$/i.test(parts[0])) {
    return {
      column: parts[0],
      row: prettifyLabel(parts.slice(1).join('_'))
    };
  }
  return {
    column: prettifyLabel(parts[0]),
    row: prettifyLabel(parts.slice(1).join('_'))
  };
};

const parseHumanRetinaStage = (label: string) => {
  const normalized = label.trim();
  const hgwMatch = normalized.match(/^Hgw(\d+(?:\.\d+)?)$/i);
  if (hgwMatch) {
    return { group: 0, value: Number(hgwMatch[1]) };
  }

  const hpndMatch = normalized.match(/^Hpnd(\d+(?:\.\d+)?)$/i);
  if (hpndMatch) {
    return { group: 1, value: Number(hpndMatch[1]) };
  }

  const dayMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*Day$/i);
  if (dayMatch) {
    return { group: 2, value: Number(dayMatch[1]) };
  }

  if (/^Adult$/i.test(normalized)) {
    return { group: 3, value: Number.POSITIVE_INFINITY };
  }

  return { group: 4, value: Number.POSITIVE_INFINITY };
};

const parseMouseRetinaStage = (label: string) => {
  const normalized = label.trim();
  const embryonicMatch = normalized.match(/^E(\d+(?:\.\d+)?)$/i);
  if (embryonicMatch) {
    return { group: 0, value: Number(embryonicMatch[1]) };
  }

  const postnatalMatch = normalized.match(/^P(\d+(?:\.\d+)?)$/i);
  if (postnatalMatch) {
    return { group: 1, value: Number(postnatalMatch[1]) };
  }

  if (/^Adult$/i.test(normalized)) {
    return { group: 2, value: Number.POSITIVE_INFINITY };
  }

  return { group: 3, value: Number.POSITIVE_INFINITY };
};

const sortDatasetColumns = (datasetKey: string, columns: string[]) => {
  const sorted = [...columns];
  if (datasetKey === 'human_retina_scrna') {
    sorted.sort((left, right) => {
      const a = parseHumanRetinaStage(left);
      const b = parseHumanRetinaStage(right);
      if (a.group !== b.group) return a.group - b.group;
      if (a.value !== b.value) return a.value - b.value;
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    });
    return sorted;
  }

  if (datasetKey === 'mouse_retina_scrna') {
    sorted.sort((left, right) => {
      const a = parseMouseRetinaStage(left);
      const b = parseMouseRetinaStage(right);
      if (a.group !== b.group) return a.group - b.group;
      if (a.value !== b.value) return a.value - b.value;
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    });
    return sorted;
  }

  return sorted;
};

const normalizeDatasetRowLabel = (datasetKey: string, row: string) => {
  const normalizedRow = row.toLowerCase();
  if (
    datasetKey === 'mouse_retina_scrna' &&
    normalizedRow === 'rpe / margin / periocular mesenchyme / lens epithelial cells'
  ) {
    return 'Epithelial Cells';
  }
  if (datasetKey === 'mouse_retina_dev_scrna' && normalizedRow === 'photoreceptor / bipolar precursors') {
    return 'Photoreceptor precursors';
  }
  return row;
};

const buildMatrix = (
  dataset: ExpressionAtlasDatasetResult,
  parser: (sampleName: string) => { column: string; row: string }
): HeatmapMatrix => {
  const columns: string[] = [];
  const rows: string[] = [];
  const values = new Map<string, number | null>();
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  dataset.samples.forEach((sample) => {
    const { column, row } = parser(sample.name);
    const normalizedRow = normalizeDatasetRowLabel(dataset.key, row);
    if (dataset.key === 'mouse_retina_scrna' && excludedMouseScrnaRows.has(normalizedRow.toLowerCase())) {
      return;
    }

    if (!columns.includes(column)) columns.push(column);
    if (!rows.includes(normalizedRow)) rows.push(normalizedRow);
    values.set(`${normalizedRow}::${column}`, sample.value);

    if (sample.value !== null) {
      if (sample.value < minValue) minValue = sample.value;
      if (sample.value > maxValue) maxValue = sample.value;
    }
  });

  const safeMinValue = Number.isFinite(minValue) ? minValue : 0;
  const safeMaxValue = Number.isFinite(maxValue) ? maxValue : 0;
  const orderedColumns = sortDatasetColumns(dataset.key, columns);

  return {
    columns: orderedColumns,
    rows,
    values,
    minValue: safeMinValue,
    maxValue: safeMaxValue,
    maxAbsValue: Math.max(Math.abs(safeMinValue), Math.abs(safeMaxValue))
  };
};

const buildDatasetMatrix = (dataset: ExpressionAtlasDatasetResult): HeatmapMatrix => {
  if (dataset.key === 'mouse_tissue_rna') {
    return buildMatrix(dataset, (sampleName) => ({
      column: prettifyLabel(sampleName),
      row: dataset.unit ?? 'Expression'
    }));
  }

  if (dataset.key === 'mouse_tissue_protein') {
    return buildMatrix(dataset, (sampleName) => {
      const index = sampleName.lastIndexOf('_');
      if (index === -1) {
        return { column: prettifyLabel(sampleName), row: 'Replicate' };
      }
      return {
        column: prettifyLabel(sampleName.slice(0, index)),
        row: `Rep ${sampleName.slice(index + 1)}`
      };
    });
  }

  if (dataset.key === 'human_retina_rpe_rna') {
    return buildMatrix(dataset, (sampleName) => {
      const [tissue, timepoint] = sampleName.split('_');
      return {
        column: prettifyLabel(timepoint ?? sampleName),
        row: tissue === 'RET' ? 'Retina' : tissue === 'RPE' ? 'RPE' : prettifyLabel(tissue ?? sampleName)
      };
    });
  }

  if (dataset.key === 'human_retina_scrna') {
    return buildMatrix(dataset, parseHumanScSample);
  }

  return buildMatrix(dataset, (sampleName) => {
    const [timepoint, ...rest] = sampleName.split('_');
    return {
      column: prettifyLabel(timepoint),
      row: prettifyLabel(rest.join('_'))
    };
  });
};

const singleCellDatasetKeys = new Set([
  'human_retina_scrna',
  'mouse_retina_scrna',
  'mouse_retina_dev_scrna',
  'monkey_retina_aging_scrna'
]);

const isSingleCellDataset = (dataset: Pick<ExpressionAtlasDatasetResult, 'key'>) => singleCellDatasetKeys.has(dataset.key);

const normalizeRowVector = (values: Array<number | null>) => {
  const finiteValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!finiteValues.length) return values.map(() => 0);

  const mean = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
  const centered = values.map((value) => (value === null ? mean : value) - mean);
  const variance = centered.reduce((sum, value) => sum + value ** 2, 0) / Math.max(1, centered.length);
  const standardDeviation = Math.sqrt(variance);

  if (!Number.isFinite(standardDeviation) || standardDeviation === 0) {
    return centered.map(() => 0);
  }

  return centered.map((value) => value / standardDeviation);
};

const calculateEuclideanDistance = (left: number[], right: number[]) => {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    sum += delta ** 2;
  }
  return Math.sqrt(sum);
};

const clusterMatrixLabels = (
  labels: string[],
  getVector: (label: string) => Array<number | null>
) => {
  if (labels.length < 3) return labels;

  const vectors = labels.map((label) => normalizeRowVector(getVector(label)));

  const pairwiseDistances = new Map<string, number>();
  const getPairKey = (left: number, right: number) => (left < right ? `${left}:${right}` : `${right}:${left}`);

  for (let leftIndex = 0; leftIndex < vectors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < vectors.length; rightIndex += 1) {
      pairwiseDistances.set(getPairKey(leftIndex, rightIndex), calculateEuclideanDistance(vectors[leftIndex], vectors[rightIndex]));
    }
  }

  type ClusterNode = { members: number[]; left?: ClusterNode; right?: ClusterNode };
  let clusters: ClusterNode[] = labels.map((_, index) => ({ members: [index] }));

  const getAverageLinkageDistance = (left: ClusterNode, right: ClusterNode) => {
    let total = 0;
    let count = 0;
    left.members.forEach((leftMember) => {
      right.members.forEach((rightMember) => {
        total += pairwiseDistances.get(getPairKey(leftMember, rightMember)) ?? 0;
        count += 1;
      });
    });
    return count ? total / count : Number.POSITIVE_INFINITY;
  };

  while (clusters.length > 1) {
    let bestLeftIndex = 0;
    let bestRightIndex = 1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let leftIndex = 0; leftIndex < clusters.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < clusters.length; rightIndex += 1) {
        const distance = getAverageLinkageDistance(clusters[leftIndex], clusters[rightIndex]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLeftIndex = leftIndex;
          bestRightIndex = rightIndex;
        }
      }
    }

    const leftCluster = clusters[bestLeftIndex];
    const rightCluster = clusters[bestRightIndex];
    const mergedCluster: ClusterNode = {
      members: [...leftCluster.members, ...rightCluster.members],
      left: leftCluster,
      right: rightCluster
    };

    clusters = clusters.filter((_, index) => index !== bestLeftIndex && index !== bestRightIndex);
    clusters.push(mergedCluster);
  }

  const flattenClusterLeaves = (node: ClusterNode): number[] => {
    if (!node.left || !node.right) return node.members;
    return [...flattenClusterLeaves(node.left), ...flattenClusterLeaves(node.right)];
  };

  return flattenClusterLeaves(clusters[0]).map((index) => labels[index]);
};

const clusterSingleCellMatrix = (matrix: HeatmapMatrix, options: HeatmapClusterOptions): HeatmapMatrix => {
  if (!options.rows && !options.columns) return matrix;

  const nextRows = options.rows
    ? clusterMatrixLabels(matrix.rows, (row) => matrix.columns.map((column) => matrix.values.get(`${row}::${column}`) ?? null))
    : matrix.rows;
  const nextColumns = options.columns
    ? clusterMatrixLabels(matrix.columns, (column) => matrix.rows.map((row) => matrix.values.get(`${row}::${column}`) ?? null))
    : matrix.columns;

  return {
    ...matrix,
    rows: nextRows,
    columns: nextColumns
  };
};

const getDisplayMatrix = (dataset: ExpressionAtlasDatasetResult, matrix: HeatmapMatrix, options: HeatmapClusterOptions) =>
  isSingleCellDataset(dataset) ? clusterSingleCellMatrix(matrix, options) : matrix;

const getPreferredOrtholog = (orthologs: ExpressionAtlasOrtholog[]) =>
  orthologs.find((item) => item.preferred) ?? orthologs[0] ?? null;

const buildOrthologLinks = (ortholog: ExpressionAtlasOrtholog, fallbackQuery: string) => {
  const fallbackLabel = ortholog.humanSymbol ?? ortholog.mouseSymbol ?? fallbackQuery;
  return {
    summaryHref: ortholog.entrezId
      ? `https://www.ncbi.nlm.nih.gov/gene/${ortholog.entrezId}`
      : `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(fallbackLabel)}`,
    phenotypeHref: ortholog.mgi
      ? `https://www.mousephenotype.org/data/genes/${ortholog.mgi}`
      : `https://www.mousephenotype.org/data/search?term=${encodeURIComponent(ortholog.mouseSymbol ?? fallbackLabel)}`,
    structureHref: ortholog.uniprot
      ? `https://www.ebi.ac.uk/interpro/protein/UniProt/${ortholog.uniprot}`
      : `https://www.ebi.ac.uk/interpro/search/text/${encodeURIComponent(fallbackLabel)}/`,
    referenceHref: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(fallbackLabel)}`
  };
};

const buildExternalLinks = (result: ExpressionAtlasQueryResult) => {
  const preferred = getPreferredOrtholog(result.orthologs);
  const fallbackLabel = preferred?.humanSymbol ?? preferred?.mouseSymbol ?? result.query;
  return buildOrthologLinks(
    {
      id: preferred?.id ?? 0,
      humanSymbol: preferred?.humanSymbol ?? null,
      mouseSymbol: preferred?.mouseSymbol ?? null,
      entrezId: preferred?.entrezId ?? null,
      mgi: preferred?.mgi ?? null,
      uniprot: preferred?.uniprot ?? null,
      alias: preferred?.alias ?? null,
      preferred: preferred?.preferred ?? false
    },
    fallbackLabel
  );
};

const chunkColumns = <T,>(items: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const getHeatmapChunkSize = (dataset: ExpressionAtlasDatasetResult) => {
  if (dataset.key === 'mouse_tissue_rna') return 8;
  if (dataset.key === 'human_retina_rpe_rna') return 10;
  if (dataset.key === 'mouse_tissue_protein') return 8;
  return 14;
};

const calculateStandardDeviation = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const isBulkDataset = (dataset: ExpressionAtlasDatasetResult) =>
  ['mouse_tissue_rna', 'mouse_tissue_protein', 'human_retina_rpe_rna'].includes(dataset.key);

const clampPlotSettings = (settings: PlotSettings): PlotSettings => ({
  width: clamp(Math.round(settings.width), 720, 2200),
  height: clamp(Math.round(settings.height), 260, 900),
  fontSize: clamp(Math.round(settings.fontSize), 11, 26)
});

const getXAxisTitle = (dataset: ExpressionAtlasDatasetResult) => {
  if (dataset.key === 'mouse_tissue_rna' || dataset.key === 'mouse_tissue_protein') return 'Tissue';
  return 'Time / stage';
};

const toLinePoints = (items: { xLabel: string; value: number | null; tooltip?: string }[]) =>
  items.reduce<LinePoint[]>((accumulator, item) => {
    if (item.value !== null) {
      accumulator.push({
        xLabel: item.xLabel,
        value: item.value,
        tooltip: item.tooltip
      });
    }
    return accumulator;
  }, []);

const getDefaultPlotSettings = (dataset: ExpressionAtlasDatasetResult): PlotSettings => {
  if (dataset.key === 'mouse_tissue_rna') {
    return { width: 1180, height: 400, fontSize: 15 };
  }
  if (dataset.key === 'mouse_tissue_protein') {
    return { width: 1100, height: 340, fontSize: 13 };
  }
  if (dataset.key === 'human_retina_scrna') {
    return { width: 1180, height: 420, fontSize: 15 };
  }
  if (dataset.key === 'monkey_retina_aging_scrna' || dataset.key === 'mouse_retina_dev_scrna') {
    return { width: 1080, height: 340, fontSize: 13 };
  }
  if (dataset.key === 'human_retina_rpe_rna') {
    return { width: 980, height: 360, fontSize: 14 };
  }
  return { width: 1040, height: 400, fontSize: 14 };
};

const buildLinePlotData = (dataset: ExpressionAtlasDatasetResult): LinePlotData => {
  const matrix = buildDatasetMatrix(dataset);
  return {
    xLabels: matrix.columns,
    series: matrix.rows.map((row, index) => {
      const points = toLinePoints(
        matrix.columns.map((column) => ({
          xLabel: column,
          value: matrix.values.get(`${row}::${column}`) ?? null,
          tooltip: `${row}\n${column}\n${formatValue(matrix.values.get(`${row}::${column}`) ?? null)}`
        }))
      );

      return {
        label: row,
        color: linePalette[index % linePalette.length],
        points
      };
    }),
    minValue: matrix.minValue,
    maxValue: matrix.maxValue
  };
};

const buildBulkLinePlotData = (dataset: ExpressionAtlasDatasetResult): LinePlotData => {
  if (dataset.key === 'mouse_tissue_protein') {
    const grouped = new Map<string, number[]>();
    dataset.samples.forEach((sample) => {
      if (sample.value === null) return;
      const match = sample.name.match(/^(.*)_\d+$/);
      const baseKey = prettifyLabel(match?.[1] ?? sample.name);
      const existing = grouped.get(baseKey) ?? [];
      existing.push(sample.value);
      grouped.set(baseKey, existing);
    });

    const xLabels = Array.from(grouped.keys());
    const meanPoints = xLabels.map((label) => {
      const values = grouped.get(label) ?? [];
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return { xLabel: label, value: mean };
    });
    const errorLabels = xLabels.map((label) => {
      const values = grouped.get(label) ?? [];
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const sd = calculateStandardDeviation(values);
      return `${label}\nMean: ${formatValue(mean)}\nSD: ${formatValue(sd)}`;
    });

    return {
      xLabels,
      series: [
        {
          label: 'Protein mean',
          color: '#1f5f8b',
          points: meanPoints.map((point, index) => ({ ...point, tooltip: errorLabels[index] }))
        }
      ],
      minValue: 0,
      maxValue: Math.max(...meanPoints.map((item) => item.value), 1)
    };
  }

  if (dataset.key === 'human_retina_rpe_rna') {
    const matrix = buildDatasetMatrix(dataset);
    return {
      xLabels: matrix.columns,
      series: matrix.rows.map((row, index) => {
        const points = toLinePoints(
          matrix.columns.map((column) => ({
            xLabel: column,
            value: matrix.values.get(`${row}::${column}`) ?? null,
            tooltip: `${row}\n${column}\n${formatValue(matrix.values.get(`${row}::${column}`) ?? null)}`
          }))
        );

        return {
          label: row,
          color: linePalette[index % linePalette.length],
          points
        };
      }),
      minValue: Math.min(matrix.minValue, 0),
      maxValue: matrix.maxValue
    };
  }

  const matrix = buildDatasetMatrix(dataset);
  const points = toLinePoints(
    matrix.columns.map((column) => ({
      xLabel: column,
      value: matrix.values.get(`${matrix.rows[0]}::${column}`) ?? null,
      tooltip: `${matrix.rows[0]}\n${column}\n${formatValue(matrix.values.get(`${matrix.rows[0]}::${column}`) ?? null)}`
    }))
  );

  return {
    xLabels: matrix.columns,
    series: [
      {
        label: dataset.title,
        color: '#1f5f8b',
        points
      }
    ],
    minValue: Math.min(matrix.minValue, 0),
    maxValue: matrix.maxValue
  };
};

const DatasetLineChart = ({
  dataset,
  selectedSeriesLabels,
  settings
}: {
  dataset: ExpressionAtlasDatasetResult;
  selectedSeriesLabels: string[];
  settings: PlotSettings;
}) => {
  const plot = isBulkDataset(dataset) ? buildBulkLinePlotData(dataset) : buildLinePlotData(dataset);
  const [tooltip, setTooltip] = useState<PlotTooltip | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const visibleSeries = isBulkDataset(dataset)
    ? plot.series
    : plot.series.filter((series) => selectedSeriesLabels.includes(series.label));
  if (!visibleSeries.length) return <p className="text-muted">Select at least one cell type to render the bar plot.</p>;

  const plotSettings = clampPlotSettings(settings);
  const width = plotSettings.width;
  const multiRow = visibleSeries.length > 1;
  const longestRowLabelLength = visibleSeries.reduce((maxLength, series) => Math.max(maxLength, series.label.length), 0);
  const fontFamily = 'Arial, Helvetica, sans-serif';
  const axisFontSize = plotSettings.fontSize;
  const xFontSize = Math.max(plotSettings.fontSize - 1, 11);
  const titleFontSize = plotSettings.fontSize + 5;
  const axisTitleFontSize = plotSettings.fontSize + 1;
  const estimatedRowLabelWidth = longestRowLabelLength * plotSettings.fontSize * 0.62;
  const leftPad = multiRow
    ? Math.max(190, Math.min(340, estimatedRowLabelWidth + 84))
    : Math.max(112, plotSettings.fontSize * 6.4);
  const rightPad = multiRow ? Math.max(96, plotSettings.fontSize * 6.2) : Math.max(72, plotSettings.fontSize * 4.8);
  const topPad = Math.max(62, plotSettings.fontSize * 4.4);
  const bottomPad = Math.max(134, plotSettings.fontSize * 8.6);
  const rowGap = multiRow ? Math.max(8, plotSettings.fontSize * 0.55) : 0;
  const minRowHeight = multiRow ? Math.max(28, plotSettings.fontSize * 2.1) : Math.max(180, plotSettings.fontSize * 10);
  const requiredHeight = topPad + bottomPad + visibleSeries.length * minRowHeight + Math.max(0, visibleSeries.length - 1) * rowGap;
  const height = Math.max(plotSettings.height, requiredHeight);
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const minValue = Math.min(plot.minValue, 0);
  const maxValue = plot.maxValue === minValue ? minValue + 1 : plot.maxValue;
  const yRange = maxValue - minValue;
  const panelHeight = multiRow
    ? (chartHeight - Math.max(0, visibleSeries.length - 1) * rowGap) / visibleSeries.length
    : chartHeight;
  const categoryWidth = plot.xLabels.length ? chartWidth / plot.xLabels.length : chartWidth;
  const barWidth = Math.max(multiRow ? 8 : 12, Math.min(multiRow ? 28 : 38, categoryWidth * (multiRow ? 0.46 : 0.56)));
  const getBarX = (index: number) => leftPad + index * categoryWidth + (categoryWidth - barWidth) / 2;
  const getPanelTop = (seriesIndex: number) => topPad + seriesIndex * (panelHeight + rowGap);
  const getPanelY = (seriesIndex: number, value: number) =>
    getPanelTop(seriesIndex) + panelHeight - ((value - minValue) / yRange) * panelHeight;
  const axisTextStyle = { fontFamily, fontSize: axisFontSize };
  const xTextStyle = { fontFamily, fontSize: xFontSize };
  const titleStyle = { fontFamily, fontSize: titleFontSize };
  const axisTitleStyle = { fontFamily, fontSize: axisTitleFontSize };
  const xTickLabelY = topPad + chartHeight + Math.max(22, plotSettings.fontSize * 1.55);
  const xAxisTitleY = height - Math.max(18, plotSettings.fontSize * 0.95);
  const updateTooltipPosition = (event: MouseEvent<SVGElement>, lines: string[]) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const rawX = event.clientX - rect.left + frame.scrollLeft + 12;
    const rawY = event.clientY - rect.top + frame.scrollTop + 12;
    const tooltipWidth = 180;
    const tooltipHeight = 76;
    setTooltip({
      x: clamp(rawX, 8, frame.scrollLeft + rect.width - tooltipWidth),
      y: clamp(rawY, 8, frame.scrollTop + rect.height - tooltipHeight),
      lines
    });
  };

  return (
    <div className="expression-atlas-plot-card">
      <div ref={frameRef} className="expression-atlas-line-chart__frame">
        {tooltip ? (
          <div className="expression-atlas-plot-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {tooltip.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}
        <svg
          className="expression-atlas-line-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${dataset.title} plot`}
          preserveAspectRatio="xMidYMid meet"
        >
          <text x={width / 2} y={topPad - 24} textAnchor="middle" className="expression-atlas-chart__title" style={titleStyle}>
            {getDatasetDisplayTitle(dataset)} · {dataset.matchedGene ?? getDatasetDisplayTitle(dataset)}
          </text>
          <text
            x={leftPad + chartWidth / 2}
            y={xAxisTitleY}
            textAnchor="middle"
            className="expression-atlas-chart__axis-title"
            style={axisTitleStyle}
          >
            {getXAxisTitle(dataset)}
          </text>
          {visibleSeries.map((series, seriesIndex) => {
            const panelTop = getPanelTop(seriesIndex);
            const panelBottom = panelTop + panelHeight;
            return (
              <g key={`${series.label}-panel`}>
                {Array.from({ length: 4 }).map((_, tickIndex) => {
                  const ratio = tickIndex / 3;
                  const value = minValue + yRange * ratio;
                  const y = getPanelY(seriesIndex, value);
                  return (
                    <g key={`${series.label}-tick-${tickIndex}`}>
                      <line x1={leftPad} y1={y} x2={width - rightPad} y2={y} className="expression-atlas-chart__grid" />
                      {seriesIndex === 0 ? (
                        <text
                          x={width - rightPad + 14}
                          y={y + axisFontSize * 0.35}
                          textAnchor="start"
                          className="expression-atlas-chart__axis-label"
                          style={axisTextStyle}
                        >
                          {formatValue(value)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                <line x1={leftPad} y1={panelTop} x2={leftPad} y2={panelBottom} className="expression-atlas-chart__axis" />
                <line x1={leftPad} y1={panelBottom} x2={width - rightPad} y2={panelBottom} className="expression-atlas-chart__axis" />
                <text
                  x={leftPad - 18}
                  y={panelTop + panelHeight / 2 + axisFontSize * 0.35}
                  textAnchor="end"
                  className="expression-atlas-chart__row-label"
                  style={axisTextStyle}
                >
                  {series.label}
                </text>
              </g>
            );
          })}
          <line
            x1={leftPad}
            y1={topPad + chartHeight}
            x2={width - rightPad}
            y2={topPad + chartHeight}
            className="expression-atlas-chart__axis"
          />
          {plot.xLabels.map((label, index) => {
            const x = leftPad + index * categoryWidth + categoryWidth / 2;
            return (
              <g key={label}>
                <line x1={x} y1={topPad + chartHeight} x2={x} y2={topPad + chartHeight + 6} className="expression-atlas-chart__axis" />
                <text
                  x={x}
                  y={xTickLabelY}
                  textAnchor="end"
                  transform={`rotate(-36 ${x} ${xTickLabelY})`}
                  className="expression-atlas-chart__x-label"
                  style={xTextStyle}
                >
                  {label}
                </text>
              </g>
            );
          })}
          {visibleSeries.map((series, seriesIndex) => {
            return (
              <g key={`${dataset.key}-${series.label}`}>
                {series.points.map((point) => {
                  const xIndex = plot.xLabels.indexOf(point.xLabel);
                  const x = getBarX(xIndex);
                  const y = getPanelY(seriesIndex, point.value);
                  const baselineY = getPanelY(seriesIndex, minValue);
                  const barHeight = Math.max(1.5, baselineY - y);
                  return (
                    <rect
                      key={`${series.label}-${point.xLabel}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={Math.min(4, barWidth / 5)}
                      fill={series.color}
                      onMouseEnter={(event) => updateTooltipPosition(event, (point.tooltip ?? `${series.label}\n${point.xLabel}\n${formatValue(point.value)}`).split('\n'))}
                      onMouseMove={(event) => updateTooltipPosition(event, (point.tooltip ?? `${series.label}\n${point.xLabel}\n${formatValue(point.value)}`).split('\n'))}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const HeatmapClusterToggle = ({
  label,
  active,
  onToggle
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className={`expression-atlas-cluster-toggle ${active ? 'is-active' : ''}`}
    onClick={onToggle}
    aria-pressed={active}
  >
    {label}
  </button>
);

const DatasetHeatmap = ({
  dataset,
  matrix,
  clusterOptions,
  onClusterOptionsChange,
  onExportData
}: {
  dataset: ExpressionAtlasDatasetResult;
  matrix: HeatmapMatrix;
  clusterOptions: HeatmapClusterOptions;
  onClusterOptionsChange: (nextOptions: HeatmapClusterOptions) => void;
  onExportData?: () => void;
}) => {
  if (!dataset.hasMatch) return <p className="text-muted">No matched gene was found in this dataset.</p>;

  const columnGroups = chunkColumns(matrix.columns, getHeatmapChunkSize(dataset));
  return (
    <>
      <div className="expression-atlas-figure-meta">
        <p className="text-muted">
          Matched gene: <strong>{dataset.matchedGene}</strong>
        </p>
        {isSingleCellDataset(dataset) ? (
          <div className="expression-atlas-heatmap-controls">
            <HeatmapClusterToggle
              label="Cluster rows"
              active={clusterOptions.rows}
              onToggle={() => onClusterOptionsChange({ ...clusterOptions, rows: !clusterOptions.rows })}
            />
            <HeatmapClusterToggle
              label="Cluster columns"
              active={clusterOptions.columns}
              onToggle={() => onClusterOptionsChange({ ...clusterOptions, columns: !clusterOptions.columns })}
            />
          </div>
        ) : null}
        <div className="expression-atlas-figure-meta__aside">
          {onExportData ? (
            <button type="button" className="link-button link-button--outline" onClick={onExportData}>
              Export
            </button>
          ) : null}
          <div className="expression-atlas-legend">
            <span>{matrix.minValue < 0 ? 'Negative' : 'Low'}</span>
            <div className="expression-atlas-legend__bar" />
            <span>{matrix.minValue < 0 ? 'Positive' : 'High'}</span>
            <strong>{formatValue(matrix.maxValue)}</strong>
          </div>
        </div>
      </div>
      <div className="expression-atlas-table-stack">
        {columnGroups.map((columns, index) => (
          <div key={`${dataset.key}-chunk-${index}`} className="expression-atlas-table-wrap">
            <table className="expression-atlas-table expression-atlas-table--heatmap">
              <thead>
                <tr>
                  <th>{matrix.rows.length === 1 ? 'Metric' : 'Cell / group'}</th>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr key={`${row}-${index}`}>
                    <th>{row}</th>
                    {columns.map((column) => {
                      const value = matrix.values.get(`${row}::${column}`) ?? null;
                      const colors = getHeatColor(value, matrix);
                      const style = {
                        '--heat-bg': colors.background,
                        '--heat-color': colors.color
                      } as CSSProperties;
                      return (
                        <td key={`${row}-${column}`} className="expression-atlas-heat-cell" style={style}>
                          <span>{formatValue(value)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

const PlotControlPanel = ({
  title,
  settings,
  defaultSettings,
  onChange
}: {
  title: string;
  settings: PlotSettings;
  defaultSettings: PlotSettings;
  onChange: (nextSettings: PlotSettings) => void;
}) => {
  const handleFieldChange =
    (field: keyof PlotSettings) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = Number(event.target.value);
      const nextSettings = clampPlotSettings({
        ...settings,
        [field]: Number.isFinite(rawValue) ? rawValue : settings[field]
      });
      onChange(nextSettings);
    };

  const isDefault =
    settings.width === defaultSettings.width && settings.height === defaultSettings.height && settings.fontSize === defaultSettings.fontSize;

  const sliderConfig: Array<{ field: keyof PlotSettings; label: string; min: number; max: number; step: number; suffix: string }> = [
    { field: 'width', label: 'Width', min: 720, max: 2200, step: 20, suffix: 'px' },
    { field: 'height', label: 'Height', min: 260, max: 900, step: 20, suffix: 'px' },
    { field: 'fontSize', label: 'Font', min: 11, max: 26, step: 1, suffix: 'px' }
  ];

  return (
    <div className="expression-atlas-plot-controls">
      <div className="expression-atlas-plot-controls__header">
        <strong>{title}</strong>
        <button type="button" className="link-button link-button--outline" onClick={() => onChange(defaultSettings)} disabled={isDefault}>
          Default
        </button>
      </div>
      <div className="expression-atlas-plot-controls__grid">
        {sliderConfig.map((item) => (
          <label key={item.field} className="expression-atlas-plot-controls__field">
            <div className="expression-atlas-plot-controls__field-head">
              <span>{item.label}</span>
              <strong className="expression-atlas-plot-controls__value">
                {settings[item.field]}
                {item.suffix}
              </strong>
            </div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={settings[item.field]}
              onChange={handleFieldChange(item.field)}
            />
            <small>
              {item.min}
              {item.suffix} - {item.max}
              {item.suffix}
            </small>
          </label>
        ))}
      </div>
    </div>
  );
};

const DatasetPanelToolbar = ({
  label,
  viewMode,
  onViewChange,
  matched
}: {
  label: string;
  viewMode: DatasetViewMode;
  onViewChange: (mode: DatasetViewMode) => void;
  matched: boolean;
}) => (
  <div className="expression-atlas-panel-toolbar">
    <div className="expression-atlas-panel-toolbar__actions">
      <div className="expression-atlas-view-switch" role="tablist" aria-label={`${label} view mode`}>
        <button type="button" className={`expression-atlas-view-switch__button ${viewMode === 'plot' ? 'is-active' : ''}`} onClick={() => onViewChange('plot')}>
          Plot
        </button>
        <button type="button" className={`expression-atlas-view-switch__button ${viewMode === 'data' ? 'is-active' : ''}`} onClick={() => onViewChange('data')}>
          Data
        </button>
      </div>
      <span className={`badge ${matched ? 'badge--success' : ''}`}>{matched ? 'Matched' : 'No match'}</span>
    </div>
  </div>
);

const DatasetFigurePanel = ({
  dataset,
  viewMode,
  onViewChange,
  plotSettings,
  onPlotSettingsChange,
  matched
}: {
  dataset: ExpressionAtlasDatasetResult;
  viewMode: DatasetViewMode;
  onViewChange: (mode: DatasetViewMode) => void;
  plotSettings: PlotSettings;
  onPlotSettingsChange: (nextSettings: PlotSettings) => void;
  matched: boolean;
}) => {
  const matrix = useMemo(() => buildDatasetMatrix(dataset), [dataset]);
  const [clusterOptions, setClusterOptions] = useState<HeatmapClusterOptions>({ rows: true, columns: false });
  const displayMatrix = useMemo(() => getDisplayMatrix(dataset, matrix, clusterOptions), [clusterOptions, dataset, matrix]);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const plotData = useMemo(() => (isBulkDataset(dataset) ? buildBulkLinePlotData(dataset) : buildLinePlotData(dataset)), [dataset]);
  const defaultPlotSettings = useMemo(() => getDefaultPlotSettings(dataset), [dataset]);
  const [selectedSeriesLabels, setSelectedSeriesLabels] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSeriesLabels(plotData.series.map((series) => series.label));
  }, [dataset.key, dataset.matchedGene, plotData.series]);

  useEffect(() => {
    setClusterOptions({ rows: true, columns: false });
  }, [dataset.key, dataset.matchedGene]);

  const toggleSeries = (label: string) => {
    setSelectedSeriesLabels((prev) => {
      if (prev.includes(label)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  };

  const handleSavePlot = async () => {
    const svg = plotRef.current?.querySelector('svg');
    if (!svg) return;
    const legendItems =
      plotData.series.length > 1
        ? (isBulkDataset(dataset) ? plotData.series : plotData.series.filter((series) => selectedSeriesLabels.includes(series.label))).map((series) => ({
            label: series.label,
            color: series.color
          }))
        : [];
    await saveSvgAsPdf(`${getDatasetDisplayTitle(dataset)} ${dataset.matchedGene ?? ''}`.trim(), svg, legendItems);
  };

  const handleExportData = () => {
    const csv = matrixToCsv(displayMatrix);
    triggerDownload(`${dataset.key}-${dataset.matchedGene ?? 'expression'}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  };

  return (
    <>
      <DatasetPanelToolbar
        label={dataset.title}
        viewMode={viewMode}
        onViewChange={onViewChange}
        matched={matched}
      />
      <div className="expression-atlas-dataset-panel-body">
        {viewMode === 'plot' ? (
          <div className="expression-atlas-plot-layout">
            <div ref={plotRef} className="expression-atlas-plot-layout__figure">
              <div className="expression-atlas-plot-layout__figure-actions">
                <button type="button" className="link-button link-button--outline" onClick={() => void handleSavePlot()} disabled={!dataset.hasMatch}>
                  Save
                </button>
              </div>
              <DatasetLineChart dataset={dataset} selectedSeriesLabels={selectedSeriesLabels} settings={plotSettings} />
              {plotData.series.length > 1 ? (
                <div className="expression-atlas-series-filter expression-atlas-series-filter--inside">
                  {plotData.series.map((series) =>
                    isBulkDataset(dataset) ? (
                      <div key={series.label} className="expression-atlas-series-filter__chip is-active is-static">
                        <span className="expression-atlas-series-filter__dot" style={{ backgroundColor: series.color }} />
                        {series.label}
                      </div>
                    ) : (
                      <button
                        key={series.label}
                        type="button"
                        className={`expression-atlas-series-filter__chip ${selectedSeriesLabels.includes(series.label) ? 'is-active' : ''}`}
                        onClick={() => toggleSeries(series.label)}
                      >
                        <span className="expression-atlas-series-filter__dot" style={{ backgroundColor: series.color }} />
                        {series.label}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>
            <div className="expression-atlas-plot-layout__side">
              <PlotControlPanel
                title="Plot settings"
                settings={plotSettings}
                defaultSettings={defaultPlotSettings}
                onChange={onPlotSettingsChange}
              />
            </div>
          </div>
        ) : (
          <DatasetHeatmap
            dataset={dataset}
            matrix={displayMatrix}
            clusterOptions={clusterOptions}
            onClusterOptionsChange={setClusterOptions}
            onExportData={handleExportData}
          />
        )}
      </div>
    </>
  );
};

const CombinedMouseTissuePanel = ({
  datasets,
  viewMode,
  onViewChange,
  rnaSettings,
  proteinSettings,
  onRnaSettingsChange,
  onProteinSettingsChange,
  matched
}: {
  datasets: ExpressionAtlasDatasetResult[];
  viewMode: DatasetViewMode;
  onViewChange: (mode: DatasetViewMode) => void;
  rnaSettings: PlotSettings;
  proteinSettings: PlotSettings;
  onRnaSettingsChange: (nextSettings: PlotSettings) => void;
  onProteinSettingsChange: (nextSettings: PlotSettings) => void;
  matched: boolean;
}) => {
  const rnaPlotRef = useRef<HTMLDivElement | null>(null);
  const proteinPlotRef = useRef<HTMLDivElement | null>(null);
  const rnaDataset = datasets.find((item) => item.key === 'mouse_tissue_rna') ?? datasets[0];
  const proteinDataset = datasets.find((item) => item.key === 'mouse_tissue_protein') ?? datasets[1] ?? datasets[0];
  const defaultRnaSettings = useMemo(() => getDefaultPlotSettings(rnaDataset), [rnaDataset]);
  const defaultProteinSettings = useMemo(() => getDefaultPlotSettings(proteinDataset), [proteinDataset]);

  const savePlotFromRef = async (title: string, container: HTMLDivElement | null) => {
    const svg = container?.querySelector('svg');
    if (!svg) return;
    await saveSvgAsPdf(title, svg);
  };

  const handleExportRnaData = () =>
    triggerDownload(`${rnaDataset.key}-${rnaDataset.matchedGene ?? 'expression'}.csv`, new Blob([matrixToCsv(buildDatasetMatrix(rnaDataset))], { type: 'text/csv;charset=utf-8;' }));

  const handleExportProteinData = () =>
    triggerDownload(`${proteinDataset.key}-${proteinDataset.matchedGene ?? 'expression'}.csv`, new Blob([matrixToCsv(buildDatasetMatrix(proteinDataset))], { type: 'text/csv;charset=utf-8;' }));

  return (
    <>
      <DatasetPanelToolbar label="Mouse tissue RNA and protein" viewMode={viewMode} onViewChange={onViewChange} matched={matched} />
      <div className="expression-atlas-dataset-panel-body">
        <div className="expression-atlas-combined-stack">
          <section className="expression-atlas-combined-section">
            {viewMode === 'plot' ? (
              <div className="expression-atlas-plot-layout">
                <div ref={rnaPlotRef} className="expression-atlas-plot-layout__figure">
                  <div className="expression-atlas-plot-layout__figure-actions">
                    <button
                      type="button"
                      className="link-button link-button--outline"
                      onClick={() => void savePlotFromRef(`${getDatasetDisplayTitle(rnaDataset)} ${rnaDataset.matchedGene ?? ''}`.trim(), rnaPlotRef.current)}
                      disabled={!rnaDataset.hasMatch}
                    >
                      Save
                    </button>
                  </div>
                  <DatasetLineChart dataset={rnaDataset} selectedSeriesLabels={[]} settings={rnaSettings} />
                </div>
                <div className="expression-atlas-plot-layout__side">
                  <PlotControlPanel
                    title="RNA plot settings"
                    settings={rnaSettings}
                    defaultSettings={defaultRnaSettings}
                    onChange={onRnaSettingsChange}
                  />
                </div>
              </div>
            ) : (
              <DatasetHeatmap
                dataset={rnaDataset}
                matrix={buildDatasetMatrix(rnaDataset)}
                clusterOptions={{ rows: false, columns: false }}
                onClusterOptionsChange={() => undefined}
                onExportData={handleExportRnaData}
              />
            )}
          </section>
          <section className="expression-atlas-combined-section">
            {viewMode === 'plot' ? (
              <div className="expression-atlas-plot-layout">
                <div ref={proteinPlotRef} className="expression-atlas-plot-layout__figure">
                  <div className="expression-atlas-plot-layout__figure-actions">
                    <button
                      type="button"
                      className="link-button link-button--outline"
                      onClick={() => void savePlotFromRef(`${getDatasetDisplayTitle(proteinDataset)} ${proteinDataset.matchedGene ?? ''}`.trim(), proteinPlotRef.current)}
                      disabled={!proteinDataset.hasMatch}
                    >
                      Save
                    </button>
                  </div>
                  <DatasetLineChart dataset={proteinDataset} selectedSeriesLabels={[]} settings={proteinSettings} />
                </div>
                <div className="expression-atlas-plot-layout__side">
                  <PlotControlPanel
                    title="Protein plot settings"
                    settings={proteinSettings}
                    defaultSettings={defaultProteinSettings}
                    onChange={onProteinSettingsChange}
                  />
                </div>
              </div>
            ) : (
              <DatasetHeatmap
                dataset={proteinDataset}
                matrix={buildDatasetMatrix(proteinDataset)}
                clusterOptions={{ rows: false, columns: false }}
                onClusterOptionsChange={() => undefined}
                onExportData={handleExportProteinData}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
};

const OrthologPanel = ({
  orthologs,
  query,
  page,
  totalPages,
  onPageChange
}: {
  orthologs: ExpressionAtlasOrtholog[];
  query: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="expression-atlas-ortholog-panel">
    {orthologs.length ? (
      <div className="expression-atlas-ortholog-list">
        {orthologs.map((ortholog) => {
          const links = buildOrthologLinks(ortholog, query);
          return (
            <div key={ortholog.id} className="expression-atlas-ortholog-item">
              <div className="expression-atlas-ortholog-item__symbols">
                <strong>{ortholog.humanSymbol ?? '—'}</strong>
                <span>human</span>
                <strong>{ortholog.mouseSymbol ?? '—'}</strong>
                <span>mouse</span>
                {ortholog.alias ? <em>{ortholog.alias}</em> : <em>No alias</em>}
              </div>
              <div className="expression-atlas-ortholog-item__actions">
                <a href={links.summaryHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                  Summary
                </a>
                <a href={links.phenotypeHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                  Phenotype
                </a>
                <a href={links.structureHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                  Structure
                </a>
                <a href={links.referenceHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                  Reference
                </a>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-muted">No ortholog entry matched this query.</p>
    )}
    {totalPages > 1 ? (
      <div className="expression-atlas-ortholog-pagination">
        <button type="button" className="link-button link-button--outline" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
          Prev
        </button>
        <span className="text-muted">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="link-button link-button--outline"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    ) : null}
  </div>
);

export const ExpressionAtlasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialGene = searchParams.get('gene')?.trim() || 'Pax6';
  const [queryInput, setQueryInput] = useState(initialGene);
  const [submittedGene, setSubmittedGene] = useState(initialGene);
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string>('');
  const [datasetViewModes, setDatasetViewModes] = useState<Record<string, DatasetViewMode>>({});
  const [datasetPlotSettings, setDatasetPlotSettings] = useState<Record<string, PlotSettings>>({});
  const [orthologPage, setOrthologPage] = useState(1);
  const [queryState, setQueryState] = useState<{
    data: ExpressionAtlasQueryResult | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: Boolean(initialGene),
    error: null
  });

  useEffect(() => {
    const geneFromUrl = searchParams.get('gene')?.trim() || 'Pax6';
    setQueryInput(geneFromUrl);
    setSubmittedGene(geneFromUrl);
  }, [searchParams]);

  useEffect(() => {
    setDatasetViewModes({});
    setDatasetPlotSettings({});
  }, [submittedGene]);

  useEffect(() => {
    setOrthologPage(1);
  }, [submittedGene, queryState.data?.orthologs.length]);

  useEffect(() => {
    if (!submittedGene) return;
    let cancelled = false;

    void (async () => {
      try {
        setQueryState((prev) => ({ ...prev, loading: true, error: null }));
        const data = await queryExpressionAtlas(submittedGene);
        if (cancelled) return;
        setQueryState({ data, loading: false, error: null });
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setQueryState({ data: null, loading: false, error: 'Failed to query the expression atlas.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submittedGene]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextGene = queryInput.trim();
    if (!nextGene) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('gene', nextGene);
    setSearchParams(nextParams, { replace: true });
    setSubmittedGene(nextGene);
  };

  const matchedDatasetCount = useMemo(
    () => queryState.data?.datasets.filter((dataset) => dataset.hasMatch).length ?? 0,
    [queryState.data]
  );

  const externalLinks = useMemo(
    () => (queryState.data ? buildExternalLinks(queryState.data) : null),
    [queryState.data]
  );

  const datasetPanels = useMemo<DatasetPanel[]>(() => {
    if (!queryState.data) return [];
    const rna = queryState.data.datasets.find((dataset) => dataset.key === 'mouse_tissue_rna');
    const protein = queryState.data.datasets.find((dataset) => dataset.key === 'mouse_tissue_protein');
    const rest = queryState.data.datasets.filter((dataset) => !['mouse_tissue_rna', 'mouse_tissue_protein'].includes(dataset.key));
    const panels: DatasetPanel[] = [];
    if (rna || protein) {
      const grouped = [rna, protein].filter(Boolean) as ExpressionAtlasDatasetResult[];
      panels.push({
        key: 'mouse_tissue_multiomics',
        title: 'Mouse tissue RNA + protein',
        kind: 'dataset',
        datasets: grouped,
        hasMatch: grouped.some((dataset) => dataset.hasMatch)
      });
    }
    rest
      .sort((left, right) => (datasetPanelOrder[left.key] ?? 999) - (datasetPanelOrder[right.key] ?? 999))
      .forEach((dataset) => {
      panels.push({
        key: dataset.key,
        title: getDatasetDisplayTitle(dataset),
        kind: 'dataset',
        datasets: [dataset],
        hasMatch: dataset.hasMatch
      });
      });
    panels.push({
      key: 'ortholog_mapping',
      title: 'Ortholog mapping',
      kind: 'ortholog',
      datasets: [],
      hasMatch: Boolean(queryState.data.orthologs.length)
    });
    return panels.sort((left, right) => (datasetPanelOrder[left.key] ?? 999) - (datasetPanelOrder[right.key] ?? 999));
  }, [queryState.data]);
  const activePanel = useMemo(
    () => datasetPanels.find((panel) => panel.key === selectedDatasetKey) ?? datasetPanels[0] ?? null,
    [datasetPanels, selectedDatasetKey]
  );
  useEffect(() => {
    if (!datasetPanels.length) {
      setSelectedDatasetKey('');
      return;
    }
    const preferred = datasetPanels.find((panel) => panel.hasMatch) ?? datasetPanels[0];
    setSelectedDatasetKey(preferred.key);
  }, [datasetPanels]);
  const orthologPageSize = 3;
  const orthologTotalPages = Math.max(1, Math.ceil((queryState.data?.orthologs.length ?? 0) / orthologPageSize));
  const visibleOrthologs = useMemo(
    () => queryState.data?.orthologs.slice((orthologPage - 1) * orthologPageSize, orthologPage * orthologPageSize) ?? [],
    [queryState.data, orthologPage]
  );

  return (
    <div className="section">
      <div className="container">
        <div className="expression-atlas-page-header">
          <div>
            <h2 className="section-title">Expression atlas</h2>
            <p className="section-subtitle">
              Query bulk and single-cell eye-related expression datasets from our public expression collection.
            </p>
          </div>
          <Link to="/internal-resources" className="link-button link-button--outline">
            Back to resources
          </Link>
        </div>

        <KlCard className="expression-atlas-intro expression-atlas-intro--hero">
          <div className="expression-atlas-hero-main">
            <div className="expression-atlas-hero-copy">
              <div className="expression-atlas-hero-topline">
                <span className="badge">Expression atlas</span>
                {queryState.data ? (
                  <p className="text-muted expression-atlas-query-meta">
                    Matched {matchedDatasetCount} / {queryState.data.datasets.length} datasets for <strong>{queryState.data.query}</strong>
                  </p>
                ) : null}
              </div>
              <h3 className="card__title">Gene-centric bulk and single-cell expression viewer</h3>
              <p className="card__excerpt">
                Search retina-centered datasets and cross-species ortholog mappings from one page. Plot mode focuses on
                comparison-ready figures, while data mode keeps the heatmap-style matrix for exact inspection.
              </p>
            </div>
            <div className="expression-atlas-hero-side">
              <form className="expression-atlas-form" onSubmit={handleSubmit}>
                <label htmlFor="atlas-gene">Gene symbol</label>
                <div className="expression-atlas-form__row">
                  <input
                    id="atlas-gene"
                    type="search"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="e.g. Pax6"
                  />
                  <button type="submit" className="link-button">
                    Query
                  </button>
                </div>
                <p className="text-muted">Suggested: Pax6, Rax, Vsx2, Otx2, Crx, Rho</p>
              </form>
              {externalLinks ? (
                <div className="expression-atlas-hero-links">
                  <a href={externalLinks.summaryHref} target="_blank" rel="noreferrer" className="link-button">
                    Summary
                  </a>
                  <a href={externalLinks.phenotypeHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                    Phenotype
                  </a>
                  <a href={externalLinks.structureHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                    Structure
                  </a>
                  <a href={externalLinks.referenceHref} target="_blank" rel="noreferrer" className="link-button link-button--outline">
                    Reference
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </KlCard>

        {queryState.loading ? <LoadingState message="Querying expression atlas..." /> : null}
        {queryState.error ? <ErrorState description={queryState.error} onRetry={() => setSubmittedGene(queryInput.trim() || 'Pax6')} /> : null}

        {queryState.data ? (
          <div className="expression-atlas-stack">
            <div className="tab-switch expression-atlas-dataset-tabs">
              {datasetPanels.map((panel) => (
                <button
                  key={panel.key}
                  type="button"
                  className={`tab-button ${activePanel?.key === panel.key ? 'is-active' : ''}`}
                  onClick={() => setSelectedDatasetKey(panel.key)}
                >
                  {panel.title}
                </button>
              ))}
            </div>

            {activePanel ? (
              <KlCard className="expression-atlas-dataset-card">
                <div className="expression-atlas-dataset-card__header">
                  <h3 className="card__title expression-atlas-dataset-card__title">{activePanel.title}</h3>
                  <p className="text-muted expression-atlas-dataset-card__subtitle">
                    {activePanel.kind === 'ortholog'
                      ? 'Cross-species symbol, alias and external annotation links'
                      : activePanel.datasets.length > 1
                      ? 'Bulk RNA-seq + Bulk proteomics · Mouse'
                      : `${activePanel.datasets[0].modality} · ${activePanel.datasets[0].species}${activePanel.datasets[0].unit ? ` · ${activePanel.datasets[0].unit}` : ''}`}
                  </p>
                  {activePanel.kind === 'ortholog' ? (
                    <div className="expression-atlas-dataset-card__meta">
                      <span className={`badge ${activePanel.hasMatch ? 'badge--success' : ''}`}>
                        {activePanel.hasMatch ? 'Matched' : 'No match'}
                      </span>
                    </div>
                  ) : null}
                </div>
                {activePanel.kind === 'ortholog' ? (
                  <OrthologPanel
                    orthologs={visibleOrthologs}
                    query={queryState.data.query}
                    page={orthologPage}
                    totalPages={orthologTotalPages}
                    onPageChange={setOrthologPage}
                  />
                ) : activePanel.datasets.length > 1 ? (
                  <CombinedMouseTissuePanel
                    datasets={activePanel.datasets}
                    viewMode={datasetViewModes[activePanel.key] ?? 'plot'}
                    onViewChange={(mode) =>
                      setDatasetViewModes((prev) => ({
                        ...prev,
                        [activePanel.key]: mode
                      }))
                    }
                    rnaSettings={
                      datasetPlotSettings.mouse_tissue_rna ??
                      getDefaultPlotSettings(activePanel.datasets.find((item) => item.key === 'mouse_tissue_rna') ?? activePanel.datasets[0])
                    }
                    proteinSettings={
                      datasetPlotSettings.mouse_tissue_protein ??
                      getDefaultPlotSettings(activePanel.datasets.find((item) => item.key === 'mouse_tissue_protein') ?? activePanel.datasets[0])
                    }
                    onRnaSettingsChange={(nextSettings) =>
                      setDatasetPlotSettings((prev) => ({
                        ...prev,
                        mouse_tissue_rna: nextSettings
                      }))
                    }
                    onProteinSettingsChange={(nextSettings) =>
                      setDatasetPlotSettings((prev) => ({
                        ...prev,
                        mouse_tissue_protein: nextSettings
                      }))
                    }
                    matched={activePanel.hasMatch}
                  />
                ) : (
                  <DatasetFigurePanel
                    dataset={activePanel.datasets[0]}
                    viewMode={datasetViewModes[activePanel.key] ?? 'plot'}
                    onViewChange={(mode) =>
                      setDatasetViewModes((prev) => ({
                        ...prev,
                        [activePanel.key]: mode
                      }))
                    }
                    plotSettings={datasetPlotSettings[activePanel.datasets[0].key] ?? getDefaultPlotSettings(activePanel.datasets[0])}
                    onPlotSettingsChange={(nextSettings) =>
                      setDatasetPlotSettings((prev) => ({
                        ...prev,
                        [activePanel.datasets[0].key]: nextSettings
                      }))
                    }
                    matched={activePanel.hasMatch}
                  />
                )}
              </KlCard>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
