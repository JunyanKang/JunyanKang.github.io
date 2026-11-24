import { useEffect, useMemo, useRef, useState } from "react";
import { gunzipSync, strFromU8 } from "fflate";
import { useSearchParams } from "react-router-dom";
import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import type { ReactNode } from "react";
import "./retina-facets.css";
import { drawAnnotationLabels } from "./annotationLabels";

type Mode = "RNA" | "Activity";
type Manifest = {
  groups: { age: string; sample: string }[];
  types: string[];
  n: number;
  layers: { prefix: string; mode: Mode }[];
  coordinate: string;
};
type Geometry = { x: number[]; y: number[]; type: number[]; group: number[] };
type Layer = {
  genes: string[];
  cells: number[];
  lib: number[];
  unmeasured?: number[];
};
type Bounds = [number, number, number, number];
const cohorts = {
  spatial: [
    ["mouse_dev_space", "Mouse · development"],
    ["monkey_age_space", "Monkey · aging"],
    ["monkey_dev_space", "Monkey · development"],
    ["mouse_age_space", "Mouse · aging"],
    ["human_age_space", "Human · aging"],
  ],
  multi: [
    ["monkey_age_multi", "Monkey · aging"],
    ["monkey_dev_multi", "Monkey · development"],
    ["mouse_dev_multi", "Mouse · development"],
  ],
};
const base = (
  import.meta.env.VITE_RETINA_ATLAS_BASE || "/assets/retina-atlas"
).replace(/\/$/, "");
async function bytes(path: string, signal: AbortSignal) {
  const response = await fetch(`${base}/${path}`, { signal });
  if (!response.ok) throw Error(`Data request failed (${response.status}).`);
  const b = new Uint8Array(await response.arrayBuffer());
  return b[0] === 31 && b[1] === 139 ? gunzipSync(b) : b;
}
async function json<T>(path: string, signal: AbortSignal): Promise<T> {
  return JSON.parse(strFromU8(await bytes(path, signal)));
}
async function load(key: string, signal: AbortSignal, embedding: boolean) {
  const [manifest, geo] = await Promise.all([
    json<Manifest>(`${key}/dataset.json.gz`, signal),
    json<Geometry>(`${key}/geometry.json.gz`, signal),
  ]);
  if (embedding) {
    const umap = await json<{ x: number[]; y: number[]; name: string }>(
      `${key}/umap.json.gz`,
      signal,
    );
    geo.x = umap.x;
    geo.y = umap.y;
    manifest.coordinate = umap.name;
  }
  const layers = await Promise.all(
    manifest.layers.map((l) =>
      json<Layer>(`${key}/${l.prefix}.json.gz`, signal),
    ),
  );
  const sets = manifest.groups.map(() => [] as number[]);
  const bounds: Bounds[] = sets.map(() => [
    Infinity,
    -Infinity,
    Infinity,
    -Infinity,
  ]);
  geo.group.forEach((g, i) => {
    sets[g].push(i);
    const b = bounds[g];
    b[0] = Math.min(b[0], geo.x[i]);
    b[1] = Math.max(b[1], geo.x[i]);
    b[2] = Math.min(b[2], geo.y[i]);
    b[3] = Math.max(b[3], geo.y[i]);
  });
  const common: Bounds = [
    Math.min(...bounds.map((b) => b[0])),
    Math.max(...bounds.map((b) => b[1])),
    Math.min(...bounds.map((b) => b[2])),
    Math.max(...bounds.map((b) => b[3])),
  ];
  const annotations = sets.map(indices => annotate(indices, geo, manifest.types));
  return { key, manifest, geo, layers, sets, bounds, common, annotations };
}
function annotate(indices: number[], geo: Geometry, labels: string[]) {
    const types = labels.map(() => ({ count: 0, x: 0, y: 0, anchor: -1, distance: Infinity }));
    for (const i of indices) {
      const t = types[geo.type[i]];
      t.count++;
      t.x += geo.x[i];
      t.y += geo.y[i];
    }
    // A centroid can lie in the empty interior of a curved retinal layer.
    for (const i of indices) {
      const t = types[geo.type[i]];
      const distance = (geo.x[i] - t.x / t.count) ** 2 + (geo.y[i] - t.y / t.count) ** 2;
      if (distance < t.distance) {
        t.distance = distance;
        t.anchor = i;
      }
    }
    return types;
}
type Data = Awaited<ReturnType<typeof load>>;
function combinedMaps(d: Data) {
  const indices = d.geo.group.map((_, i) => i);
  const ages = [...new Set(d.manifest.groups.map(group => group.age))].sort(natural.compare);
  const ageByGroup = d.manifest.groups.map(group => ages.indexOf(group.age));
  const timeGeo = { ...d.geo, type: d.geo.group.map(group => ageByGroup[group]) };
  const manifest = { ...d.manifest, groups: [{ age: "All", sample: "All samples" }] };
  const cells = { ...d, manifest, sets: [indices], annotations: [annotate(indices, d.geo, manifest.types)] };
  const time = { ...cells, manifest: { ...manifest, types: ages }, geo: timeGeo, annotations: [annotate(indices, timeGeo, ages)] };
  return { cells, time };
}
async function query(d: Data, gene: string, signal: AbortSignal) {
  const modes = [...new Set(d.manifest.layers.map((l) => l.mode))];
  return Promise.all(
    modes.map(async (mode) => {
      const values = new Float32Array(d.manifest.n).fill(NaN);
      const layers = [...d.manifest.layers.entries()].filter(
        ([, layer]) => layer.mode === mode,
      );
      const pending = layers.values();
      async function readLayers() {
        for (const [l, desc] of pending) {
          const layer = d.layers[l];
          let idx = layer.genes.indexOf(gene);
          if (idx < 0)
            idx = layer.genes.findIndex(
              (s) => s.toUpperCase() === gene.toUpperCase(),
            );
          if (idx < 0 || layer.unmeasured?.includes(idx)) continue;
          const block = await bytes(
            `${d.key}/${desc.prefix}-${Math.floor(idx / 32)}.bin.gz`,
            signal,
          );
          const view = new DataView(
            block.buffer,
            block.byteOffset,
            block.byteLength,
          );
          const integer = (i: number) => view.getInt32(4 * i, true);
          const offsets = integer(0),
            count = integer(offsets),
            start = integer(1 + (idx % 32)),
            end = integer(2 + (idx % 32));
          layer.cells.forEach((cell, i) => {
            if (layer.lib[i] > 0) values[cell] = 0;
          });
          for (let i = start; i < end; i++) {
            const k = integer(1 + offsets + i);
            if (layer.lib[k] > 0)
              values[layer.cells[k]] = Math.log1p(
                (10000 * view.getFloat32(4 * (1 + offsets + count + i), true)) /
                  layer.lib[k],
              );
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(3, layers.length) }, readLayers),
      );
      const positive = values.filter((v) => v > 0).sort();
      const cap = positive[Math.floor((positive.length - 1) * 0.98)] || 0;
      const stats = d.manifest.types.map(() =>
        d.sets.map(() => ({ sum: 0, n: 0, pos: 0 })),
      );
      values.forEach((v, i) => {
        if (Number.isFinite(v)) {
          const s = stats[d.geo.type[i]][d.geo.group[i]];
          s.n++;
          s.sum += v;
          if (v > 0) s.pos++;
        }
      });
      return { mode, values, cap, stats };
    }),
  );
}
type Result = Awaited<ReturnType<typeof query>>[number];
const natural = new Intl.Collator("en", { numeric: true });
const typeColor = (t: number) =>
  `hsl(${(t * 137.508 + 162) % 360} 51% ${38 + 10 * (t % 3)}%)`;
function colorRamp(from: number[], to: number[]) {
  return Array.from({ length: 101 }, (_, i) =>
    'rgb(' + from.map((v, j) => Math.round(v + (to[j] - v) * i / 100)).join(',') + ')');
}
const palettes = {
  RNA: colorRamp([205, 231, 223], [20, 100, 89]),
  Activity: colorRamp([250, 222, 181], [163, 70, 16]),
};
function scaleStyle(mode: Mode) {
  return { background: 'linear-gradient(90deg, ' + palettes[mode][0] + ', ' + palettes[mode][100] + ')' };
}
function SampleView({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const pair = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const command = useRef<(factor: number) => void>(() => {});
  useEffect(() => {
    const canvases = Array.from(pair.current!.querySelectorAll("canvas"));
    const behavior = zoom<HTMLCanvasElement, unknown>().scaleExtent([1, 32])
      .filter(e => !e.button && (e.type !== "wheel" || e.ctrlKey || e.metaKey))
      .on("zoom", function (event) {
        for (const el of canvases) {
          select(el).property("__zoom", event.transform);
          el.dispatchEvent(new Event("viewchange"));
        }
        setScale(event.transform.k);
      });
    canvases.forEach(el => select(el).call(behavior));
    command.current = factor => {
      const node = select(canvases[0]);
      if (!factor) node.call(behavior.transform, zoomIdentity);
      else node.call(behavior.scaleBy, factor);
    };
    return () => { canvases.forEach(el => select(el).on(".zoom", null)); };
  }, []);
  return <section>
    <header><strong>{title}</strong><small>{count.toLocaleString()} cells</small></header>
    <div className="retina-pair" ref={pair}>{children}</div>
    <div className="retina-view-tools" role="group" aria-label={`${title} view`}>
      <button type="button" aria-label="Zoom out" disabled={scale <= 1} onClick={() => command.current(0.5)}>−</button>
      <output>{Number(scale.toFixed(1))}×</output>
      <button type="button" aria-label="Zoom in" disabled={scale >= 32} onClick={() => command.current(2)}>+</button>
      <button type="button" onClick={() => command.current(0)}>Reset view</button>
    </div>
  </section>;
}
function Plot({
  d,
  g,
  result,
  spatial,
  focus = -1,
  time = false,
}: {
  d: Data;
  g: number;
  result?: Result;
  spatial: boolean;
  focus?: number;
  time?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [labelKey, setLabelKey] = useState<number[]>([]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function draw() {
      if (!el) return;
      const w = el.clientWidth,
        h = el.clientHeight;
      if (!w || !h) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (el.width !== Math.ceil(w * ratio)) el.width = Math.ceil(w * ratio);
      if (el.height !== Math.ceil(h * ratio)) el.height = Math.ceil(h * ratio);
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const view = zoomTransform(el);
      const [x0, x1, y0, y1] = spatial ? d.bounds[g] : d.common;
      const s = Math.min(
        (w - 8) / Math.max(x1 - x0, 1e-8),
        (h - 8) / Math.max(y1 - y0, 1e-8),
      );
      const baseDot = Math.max(
        1,
        Math.min(2.4, Math.sqrt((w * h) / d.sets[g].length) * 0.65),
      );
      const dot = baseDot * Math.sqrt(view.k);
      const sx = s * view.k, sy = spatial ? sx : -sx;
      const ox = view.applyX(w / 2) - ((x0 + x1) / 2) * sx;
      const oy = view.applyY(h / 2) - ((y0 + y1) / 2) * sy;
      const visibleTypes = new Map<number, Map<number, { count: number; x: number; y: number }>>();
      const columns = Math.ceil(w / 24);
      for (const pass of result || focus >= 0 ? [0, 1] : [0])
        for (const i of d.sets[g]) {
          const v = result?.values[i] ?? NaN;
          if (result && Number(v > 0) !== pass) continue;
          if (!result && focus >= 0 && Number(d.geo.type[i] === focus) !== pass) continue;
          const x = ox + d.geo.x[i] * sx, y = oy + d.geo.y[i] * sy;
          if (x < -dot || x > w + dot || y < -dot || y > h + dot) continue;
          if (!result && (focus < 0 || pass === 1) && x >= 0 && y >= 0 && x < w && y < h) {
            const id = d.geo.type[i];
            let bins = visibleTypes.get(id);
            if (!bins) { bins = new Map(); visibleTypes.set(id, bins); }
            const bin = Math.floor(y / 24) * columns + Math.floor(x / 24);
            const existing = bins.get(bin);
            if (existing) existing.count++;
            else bins.set(bin, { count: 1, x, y });
          }
          ctx.fillStyle = result
            ? v > 0
              ? palettes[result.mode][Math.min(100, Math.ceil((100 * v) / result.cap))]
              : Number.isNaN(v)
                ? "#c8bba9"
                : "#d5dbdc"
            : focus >= 0 && pass === 0 ? "#dce1e1" : typeColor(d.geo.type[i]);
          ctx.beginPath();
          ctx.arc(x, y, dot / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      if (!result) {
        const anchors = Array.from(visibleTypes, ([id, bins]) => {
          const peak = Array.from(bins.values()).reduce((best, bin) => bin.count > best.count ? bin : best);
          return { id, x: peak.x, y: peak.y, name: d.manifest.types[id].replaceAll("_", " ") };
        }).sort((a, b) => a.id - b.id);
        const key = drawAnnotationLabels(ctx, anchors, w, h, view.k);
        setLabelKey(previous => previous.length === key.length && previous.every((v,i) => v === key[i]) ? previous : key);
      }
    }
    let visible = false, frame = 0;
    function schedule() {
      if (visible && !frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
    }
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }, { rootMargin: "160px" });
    visibility.observe(el);
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    el.addEventListener("viewchange", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      el.removeEventListener("viewchange", schedule);
    };
  }, [d, g, result, spatial, focus]);
  return (
    <figure>
      <figcaption>
        {result?.mode === "Activity"
          ? "ATAC activity"
          : result?.mode || (focus < 0 ? (time ? "Time point" : d.key === "mouse_dev_multi" ? "Cluster annotation" : "Cell annotation") : `${time ? "Time point · " : ""}${d.manifest.types[focus]} · ${d.annotations[g][focus].count.toLocaleString()} cells`)}
      </figcaption>
      <canvas
        ref={ref}
        aria-label={`${d.manifest.groups[g].sample} ${result?.mode || (time ? "time point" : d.key === "mouse_dev_multi" ? "clusters" : "cell types")} map`}
      />
      {labelKey.length > 0 && <div className="retina-map-label-key" aria-label="Visible annotations">
        {labelKey.map(id => <span key={id}><b>{id + 1}</b> {d.manifest.types[id]?.replaceAll("_", " ")}</span>)}
      </div>}
    </figure>
  );
}
export function RetinaFacets({
  kind,
  gene,
}: {
  kind: keyof typeof cohorts;
  gene: string;
}) {
  const [params, setParams] = useSearchParams();
  const key = (cohorts[kind].find(([id]) => id === params.get("cohort")) ?? cohorts[kind][0])[0];
  const updateView = (field: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(field, value);
    setParams(next);
  };
  const [d, setData] = useState<Data>();
  const [res, setRes] = useState<{
    gene: string;
    key: string;
    list: Result[];
  }>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const embedding = kind === "spatial" && params.get("coordinates") === "umap";
  const combined = kind === "multi" && params.get("view") !== "facet";
  const merged = useMemo(() => combined && d?.key === key ? combinedMaps(d) : null, [combined, d, key]);
  const [timeSelection, setTimeSelection] = useState({ key, index: -1 });
  const ageFocus = timeSelection.key === key ? timeSelection.index : -1;
  const [highlight, setHighlight] = useState({ key, index: -1 });
  const focus = highlight.key === key ? highlight.index : -1;
  const setFocus = (index: number) => setHighlight({ key, index });
  const hasGene = Boolean(gene);
  useEffect(() => {
    const c = new AbortController();
    setData(undefined);
    setRes(undefined);
    setError("");
    if (!hasGene) return;
    load(key, c.signal, embedding)
      .then((v) => {
        if (!c.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(String(e.message));
      });
    return () => c.abort();
  }, [key, retry, embedding, hasGene]);
  useEffect(() => {
    if (!gene || !d || d.key !== key) return;
    const c = new AbortController();
    setError("");
    query(d, gene, c.signal)
      .then((list) => {
        if (!c.signal.aborted) setRes({ gene, key, list });
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(String(e.message));
      });
    return () => c.abort();
  }, [d, key, gene]);
  const order = useMemo(
    () =>
      d?.manifest.groups
        .map((_, i) => i)
        .sort((a, b) => {
          const A = d.manifest.groups[a],
            B = d.manifest.groups[b];
          return (
            natural.compare(A.age, B.age) || natural.compare(A.sample, B.sample)
          );
        }) || [],
    [d],
  );
  const label = (g: number) => {
    const v = d!.manifest.groups[g];
    return v.age === v.sample ? v.age : `${v.age} · ${v.sample}`;
  };
  return (
    <div className="retina-facets">
      <div className="retina-toolbar" id="atlas-map-controls">
      <label>
        Cohort{" "}
        <select value={key} onChange={(e) => { setFocus(-1); updateView("cohort", e.target.value); }}>
          {cohorts[kind].map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </label>
      {kind === "multi" && <label>View
        <select value={combined ? "combined" : "facet"} onChange={e => updateView("view", e.target.value)}>
          <option value="combined">Combined</option><option value="facet">Facet</option>
        </select>
      </label>}
      {kind === "spatial" && (
        <label>
          Coordinates{" "}
          <select
            value={embedding ? "umap" : "tissue"}
            onChange={(e) => updateView("coordinates", e.target.value)}
          >
            <option value="tissue">Tissue section</option>
            <option value="umap">RNA UMAP</option>
          </select>
        </label>
      )}
      {d?.key === key && res?.key === key && res.gene === gene && <button type="button" className="retina-jump" onClick={() => document.getElementById("atlas-statistics")?.focus()}>View statistics ↓</button>}
      </div>
      {!hasGene ? null : error ? (
        <p role="alert">
          {error} <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
        </p>
      ) : !d || d.key !== key || res?.key !== key || res.gene !== gene ? (
        <p role="status">Loading {gene}…</p>
      ) : (
        <>
          <p>
            {d.manifest.n.toLocaleString()} cells · {order.length} samples ·{" "}
            {d.manifest.coordinate}
          </p>
          <div className="retina-scales">
            {res.list.map((r) => (
              <span key={r.mode}>
                {r.mode}{" "}
                {r.cap > 0 ? (
                  <>
                    0 <i style={scaleStyle(r.mode)} /> ≥{r.cap.toFixed(2)}
                  </>
                ) : r.stats.some((row) => row.some((s) => s.n)) ? (
                  "· all measured values zero"
                ) : (
                  "· feature unavailable"
                )}
              </span>
            ))}
          </div>
            <fieldset className="retina-annotation-key">
              <legend>{key === "mouse_dev_multi" ? "Highlight cluster" : "Highlight cell type"}</legend>
              <button type="button" aria-pressed={focus === -1} onClick={() => setFocus(-1)}>{key === "mouse_dev_multi" ? "All clusters" : "All types"}</button>
              {d.manifest.types.map((name, i) => (
                <button key={name} type="button" aria-pressed={focus === i} onClick={() => setFocus(i)}>
                  <i style={{ background: typeColor(i) }} />{name.replaceAll("_", " ")}
                </button>
              ))}
            </fieldset>
          {merged && <fieldset className="retina-annotation-key">
            <legend>Highlight time point</legend>
            {["All time points", ...merged.time.manifest.types].map((name, i) =>
              <button type="button" key={name} aria-pressed={ageFocus === i - 1} onClick={() => setTimeSelection({ key, index: i - 1 })}>
                {i > 0 && <i style={{ background: typeColor(i - 1) }} />}{name}
              </button>)}
          </fieldset>}
          <div
            className={`retina-grid ${kind === "multi" ? "retina-grid--triplets" : order.some((g, i) => i > 0 && d.manifest.groups[g].age === d.manifest.groups[order[i - 1]].age) ? "retina-grid--replicates" : ""}`}
          >
            {merged ? <SampleView key="combined" title="All samples" count={d.manifest.n}>
              <Plot d={merged.cells} g={0} spatial={false} focus={focus} />
              <Plot d={merged.time} g={0} spatial={false} focus={ageFocus} time />
              {res.list.map(r => <Plot key={r.mode} d={merged.cells} g={0} result={r} spatial={false} />)}
            </SampleView> : order.map((g) => (
              <SampleView key={g} title={label(g)} count={d.sets[g].length}>
                  <Plot d={d} g={g} spatial={kind === "spatial" && !embedding} focus={focus} />
                  {res.list.map((r) => (
                    <Plot
                      key={r.mode}
                      d={d}
                      g={g}
                      result={r}
                      spatial={kind === "spatial" && !embedding}
                    />
                  ))}
              </SampleView>
            ))}
          </div>
          <div className="retina-toolbar retina-statistics" id="atlas-statistics" tabIndex={-1}>
          <h4>
            {key === "mouse_dev_multi"
              ? "Cluster summary"
              : "Cell-type summary"}
          </h4>
          <button type="button" className="retina-jump" onClick={() => document.querySelector<HTMLSelectElement>("#atlas-map-controls select")?.focus()}>Back to maps ↑</button>
          </div>
          <DotSummary results={res.list} types={d.manifest.types} order={order} label={label}
            category={key === "mouse_dev_multi" ? "Cluster" : "Cell type"} gene={gene} />
          <small>
            Signal: log(1 + 10,000 × feature count / cell library size),
            separately per assay. Maps saturate at the 98th percentile of
            positive cells across samples. Gray: zero. Sand: unavailable. NA: no
            measured cells.
          </small>
        </>
      )}
    </div>
  );
}

function DotSummary({ results, types, order, label, category, gene }: {
  results: Result[]; types: string[]; order: number[]; label: (group: number) => string;
  category: string; gene: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container.current!);
    return () => observer.disconnect();
  }, []);
  const assays = results.map(result => ({
    ...result, title: result.mode === 'RNA' ? 'RNA' : 'ATAC activity',
    max: Math.max(0, ...result.stats.flat().filter(s => s.n).map(s => s.sum / s.n)),
    measured: result.stats.some(row => row.some(s => s.n)),
  }));
  const perBlock = Math.max(1, Math.floor((width - 120) / (assays.length === 2 ? 72 : 64)));
  const groups = Array.from({length: Math.ceil(order.length / perBlock)}, (_, i) => order.slice(i * perBlock, (i + 1) * perBlock));
  return <div className="retina-heat retina-summary" ref={container}>
    <div className="retina-dot-legend">
      <strong>{gene}</strong><span>Positive cells</span>
      {[25, 50, 100].map(pct => <span key={pct}><i className="retina-dot" style={{width: 20 * Math.sqrt(pct / 100), background: '#adc0c5'}} />{pct}%</span>)}
      <span>0% = empty · NA = unavailable</span>
    </div>
    <div className="retina-dot-legend"><strong>Mean normalized signal</strong>
      {assays.map(a => <span key={a.mode}>{a.title} {a.measured ? <>0 <i className="retina-dot-ramp" style={scaleStyle(a.mode)} /> {Number(a.max.toPrecision(3))}</> : '· unavailable'}</span>)}
    </div>
    {groups.map(block => <table key={block[0]} style={{width: `min(100%, ${120 + block.length * (assays.length === 2 ? 114 : 72)}px)`}} aria-label={`${gene} · ${block.map(label).join(', ')}`}>
      <thead><tr><th rowSpan={assays.length > 1 ? 2 : 1}>{category}</th>
        {block.map(g => <th key={g} colSpan={assays.length}>{label(g)}</th>)}
      </tr>{assays.length > 1 && <tr>{block.flatMap(g => assays.map(a => <th key={`${g}-${a.mode}`} className="retina-assay-heading">{a.mode === 'RNA' ? 'RNA' : 'ATAC'}</th>))}</tr>}</thead>
      <tbody>{types.map((type, i) => <tr key={type}><th scope="row">{type}</th>
        {block.flatMap(g => assays.map(a => {
          const s = a.stats[i][g];
          const mean = s.n ? s.sum / s.n : 0;
          const fraction = s.n ? s.pos / s.n : 0;
          const detail = `${type} · ${label(g)} · ${a.title} · ` + (s.n ? `mean ${mean.toFixed(2)} · ${(100 * fraction).toFixed(1)}% (${s.pos}/${s.n} measured cells)` : 'NA');
          return <td key={`${g}-${a.mode}`} className="retina-dot-cell" title={detail} aria-label={detail}>
            {s.n ? <i className="retina-dot" style={{width: 20 * Math.sqrt(fraction), background: palettes[a.mode][a.max ? Math.round(100 * mean / a.max) : 0]}} /> : 'NA'}
          </td>;
        }))}</tr>)}</tbody>
    </table>)}
  </div>;
}
