import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mapResult = spawnSync('node', ['scripts/build-contact-map.mjs'], { cwd: root, stdio: 'inherit', env: process.env });
if (mapResult.error || mapResult.status !== 0) throw mapResult.error || new Error('Contact map build failed');
const buildEnv = { ...process.env };
delete buildEnv.AMAP_WEB_SERVICE_KEY;
for (const [command, args, cwd] of [
  ['node', ['scripts/build-content.mjs'], root],
  ['node', ['scripts/build-map.mjs'], root],
  ['npm', ['run', 'build'], `${root}/atlas`],
  ['bundle', ['exec', 'jekyll', 'build'], root],
]) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: buildEnv });
  if (result.error || result.status !== 0) throw result.error || new Error(`${command} failed (${result.status})`);
}
await mkdir(`${root}/_site/expression-atlas`, { recursive: true });
await cp(`${root}/atlas/dist`, `${root}/_site/expression-atlas`, { recursive: true });
const index = await readFile(`${root}/_site/index.html`, 'utf8');
if (!index.includes('<!doctype html>') || !index.includes('navbar')) throw new Error('al-folio layout was not rendered');
console.log('Academic website and public expression atlas built successfully.');
