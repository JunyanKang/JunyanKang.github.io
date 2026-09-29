import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createAtlasQuery, geneBucket } from '../shared/query.mjs';

const base = new URL('../../assets/atlas/v1/', import.meta.url);
async function loadJson(path) {
  const bytes = await readFile(new URL(path, base));
  return JSON.parse(path.endsWith('.gz') ? gunzipSync(bytes).toString() : bytes.toString());
}
const manifest = await loadJson('manifest.json');
const query = createAtlasQuery(loadJson);

test('the complete released data matches its manifest and preserves sample alignment', async () => {
  const counts = new Map(manifest.datasets.map(dataset => [dataset.key, 0]));
  let total = 0;
  for (const [path, expected] of Object.entries(manifest.files)) {
    const compressed = await readFile(new URL(path, base));
    assert.equal(compressed.length, expected.bytes);
    assert.equal(createHash('sha256').update(compressed).digest('hex'), expected.sha256);
    const value = JSON.parse(gunzipSync(compressed));
    if (path === 'orthologs.json.gz') { assert.equal(value.length, manifest.orthologCount); continue; }
    for (const [gene, datasets] of Object.entries(value)) {
      assert.equal(path, `genes/${geneBucket(gene)}.json.gz`);
      for (const [key, [symbol, vector]] of Object.entries(datasets)) {
        const dataset = manifest.datasets.find(d => d.key === key);
        assert.ok(dataset);
        assert.equal(symbol.trim().toLowerCase(), gene);
        assert.equal(vector.length, dataset.sampleCount);
        assert.ok(vector.every(number => number === null || Number.isFinite(number)));
        counts.set(key, counts.get(key) + 1);
        total++;
      }
    }
  }
  assert.equal(total, manifest.recordCount);
  manifest.datasets.forEach(dataset => assert.equal(counts.get(dataset.key), dataset.geneCount));
  assert.equal(manifest.datasets.length, 7);
  assert.ok(!manifest.datasets.find(d => d.key === 'human_retina_scrna').sampleNames.some(s => /^hpnd8_/i.test(s)));
});

test('queries are case-insensitive and preserve original non-zero expression', async () => {
  const lower = await query('pax6');
  const upper = await query(' PAX6 ');
  assert.deepEqual(lower.datasets, upper.datasets);
  assert.equal(lower.datasets.length, 7);
  assert.ok(lower.datasets.some(d => d.hasMatch && d.samples.some(s => s.value > 0)));
});

test('no-match is not confused with zero expression', async () => {
  const absent = await query('kanglab_nonexistent_gene_999999');
  assert.equal(absent.orthologs.length, 0);
  assert.ok(absent.datasets.every(d => !d.hasMatch && d.matchedGene === null && d.samples.every(s => s.value === null)));
});

test('aliases resolve through ortholog mapping', async () => {
  const mappings = await loadJson('orthologs.json.gz');
  const mapping = mappings.find(m => m.humanSymbol?.toLowerCase() === 'pax6' && m.alias);
  assert.ok(mapping);
  const alias = mapping.alias.split(/[;,|\s]+/).find(a => a.length > 2 && a.toLowerCase() !== 'pax6');
  assert.ok(alias);
  const result = await query(alias);
  assert.ok(result.orthologs.some(m => m.humanSymbol?.toLowerCase() === 'pax6'));
  assert.ok(result.datasets.some(d => d.hasMatch));
});

test('invalid input and missing shards surface errors rather than false no-match', async () => {
  await assert.rejects(query(' '), /Enter a gene/);
  await assert.rejects(query('a'.repeat(121)), /Enter a gene/);
  const broken = createAtlasQuery(path => path.startsWith('genes/') ? Promise.reject(new Error('network unavailable')) : loadJson(path));
  await assert.rejects(broken('Pax6'), /network unavailable/);
});

test('short aliases do not silently select unrelated substring matches', async () => {
  const alias = await query('AN2');
  assert.deepEqual(alias.candidateGenes.sort(), ['an2', 'cspg4']);
  assert.ok(alias.datasets.every(d => !d.hasMatch || d.matchedGene.toLowerCase() === 'cspg4'));
});
