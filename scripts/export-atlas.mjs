import { createRequire } from 'node:module';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { geneBucket } from '../atlas/shared/query.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
requireBackend('dotenv').config({ path: fileURLToPath(new URL('../../backend/.env', import.meta.url)), quiet: true });
const mysql = requireBackend('mysql2/promise');
const database = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
});
const parse = value => typeof value === 'string' ? JSON.parse(value) : value;
const output = `${root}/assets/atlas/v1`;
const stage = `${output}.staging-${Date.now()}`;
const shards = Array.from({ length: 256 }, () => Object.create(null));
const files = {};
let recordCount = 0;
async function saveCompressed(name, value) {
  const compressed = gzipSync(JSON.stringify(value), { level: 9 });
  await writeFile(`${stage}/${name}`, compressed);
  files[name] = { bytes: compressed.length, sha256: createHash('sha256').update(compressed).digest('hex') };
}
try {
  await database.query('SET TRANSACTION READ ONLY');
  await database.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const [rows] = await database.query('SELECT id, `key`, title, species, modality, unit, description, citation, sampleNames, sampleCount, geneCount FROM expression_datasets ORDER BY sortOrder, id');
  if (rows.length !== 7) throw new Error(`Expected 7 reviewed datasets; found ${rows.length}. Review before publishing.`);
  const datasets = [];
  for (const row of rows) {
    const { id, ...dataset } = row;
    dataset.sampleNames = parse(dataset.sampleNames);
    if (dataset.sampleNames.length !== dataset.sampleCount) throw new Error(`Sample count mismatch: ${dataset.key}`);
    let lastId = 0;
    let count = 0;
    while (true) {
      const [records] = await database.execute('SELECT id, normalizedGene, geneSymbol, `values` FROM expression_gene_records WHERE datasetId = ? AND id > ? ORDER BY id LIMIT 1000', [id, lastId]);
      if (!records.length) break;
      for (const record of records) {
        const values = parse(record.values);
        const shard = shards[parseInt(geneBucket(record.normalizedGene), 16)];
        shard[record.normalizedGene] ??= Object.create(null);
        if (shard[record.normalizedGene][dataset.key]) throw new Error(`Duplicate gene in ${dataset.key}: ${record.normalizedGene}`);
        const vector = dataset.sampleNames.map(sample => values[sample] ?? null);
        if (vector.some(value => value !== null && (typeof value !== 'number' || !Number.isFinite(value)))) throw new Error(`Invalid value in ${dataset.key}`);
        shard[record.normalizedGene][dataset.key] = [record.geneSymbol, vector];
      }
      lastId = records.at(-1).id;
      count += records.length;
    }
    if (count !== dataset.geneCount) throw new Error(`Gene count mismatch: ${dataset.key} ${count} != ${dataset.geneCount}`);
    recordCount += count;
    datasets.push(dataset);
    console.log(`${dataset.key}: ${count} genes, ${dataset.sampleCount} samples`);
  }
  const [orthologs] = await database.query('SELECT id, humanSymbol, mouseSymbol, entrezId, mgi, uniprot, alias, preferred FROM gene_ortholog_mappings ORDER BY preferred DESC, humanSymbol, id');
  orthologs.forEach(item => { item.preferred = Boolean(item.preferred); });
  await database.commit();
  await mkdir(`${stage}/genes`, { recursive: true });
  for (let index = 0; index < shards.length; index++) {
    await saveCompressed(`genes/${index.toString(16).padStart(2, '0')}.json.gz`, shards[index]);
  }
  await saveCompressed('orthologs.json.gz', orthologs);
  await writeFile(`${stage}/manifest.json`, JSON.stringify({
    schemaVersion: 1, exportedAt: new Date().toISOString(),
    source: 'Kang Lab expression database; public release approved by the data owner',
    datasets, recordCount, orthologCount: orthologs.length, shardCount: 256, files,
  }, null, 2) + '\n');
  // Keep the previous release recoverable when refreshing an existing export.
  await rename(output, `${output}.previous-${Date.now()}`).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await rename(stage, output);
  console.log(`Exported ${recordCount} expression records and ${orthologs.length} mappings (${Math.round(Object.values(files).reduce((n,f) => n + f.bytes, 0) / 1024 / 1024)} MiB compressed).`);
} finally {
  await database.end();
}

