import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createAtlasQuery } from '../atlas/shared/query.mjs';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
requireBackend('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true });
process.env.NODE_ENV = 'production';
const { AppDataSource } = requireBackend('./dist/data-source.js');
AppDataSource.setOptions({ synchronize: false, logging: false });
const { queryExpressionAtlas } = requireBackend('./dist/services/expressionAtlas.service.js');
const staticQuery = createAtlasQuery(async path => {
  const bytes = await readFile(new URL(`../assets/atlas/v1/${path}`, import.meta.url));
  return JSON.parse(path.endsWith('.gz') ? gunzipSync(bytes).toString() : bytes.toString());
});
try {
  await AppDataSource.initialize();
  for (const gene of ['Pax6', 'RHO', 'Epha5', 'Vsx2', 'Pmel', '1190005I06Rik', 'kanglab_nonexistent_gene_999999']) {
    const original = await queryExpressionAtlas(gene);
    const published = await staticQuery(gene);
    for (let i = 0; i < original.datasets.length; i++) {
      const before = original.datasets[i];
      const after = published.datasets[i];
      if (!isDeepStrictEqual(after, before)) throw new Error(`Mismatch for ${gene}/${before.key}: database selected ${before.matchedGene}; static selected ${after.matchedGene}`);
    }
    console.log(`${gene}: all 7 datasets match the original database query`);
  }
  const alias = await staticQuery('AN2');
  const canonical = await queryExpressionAtlas('Cspg4');
  assert.deepEqual(alias.datasets, canonical.datasets, 'AN2 must resolve to CSPG4, not a substring in TSPAN24');
  console.log('AN2: exact alias resolves to CSPG4 across all 7 datasets');
} finally { if (AppDataSource.isInitialized) await AppDataSource.destroy(); }
