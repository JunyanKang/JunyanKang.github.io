// Explicit maintenance command; requires ImageMagick and Ruby. Never runs during a build.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const apply = process.argv.includes('--apply');
function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) throw r.error || new Error(r.stderr);
  return r.stdout.trim();
}
const team = JSON.parse(await readFile(resolve(root, '_data/team.json')));
const external = JSON.parse(run('ruby', ['-ryaml', '-rjson', '-e', "puts JSON.generate(YAML.load_file('_data/external_resources.yml')['items'])"]));
const targets = new Map();
for (const person of [team.pi, ...team.members]) if (person.photo) targets.set(person.photo, '640x1280>');
for (const item of external) if (item.image_kind === 'portrait' && item.image) targets.set(item.image, '224x224>');
const output = resolve(root, 'output', `portrait-optimization-${Date.now()}`);
const report = [];
for (const [url, size] of targets) {
  if (!/^\/assets\/img\/[\w/-]+\.(jpg|jpeg|png)$/.test(url)) throw new Error(`Unsupported local portrait: ${url}`);
  const relative = url.slice(1);
  const source = resolve(root, relative);
  const before = (await stat(source)).size;
  const dimensions = run('magick', ['identify', '-format', '%wx%h', source]);
  const [width, height] = dimensions.split('x').map(Number);
  const teamPhoto = size.startsWith('640');
  if (before <= (teamPhoto ? 100000 : 32000) && width <= (teamPhoto ? 640 : 224) && height <= (teamPhoto ? 1280 : 224)) {
    report.push({ file: relative, before, after: before, dimensions });
    continue;
  }
  const candidate = resolve(output, 'optimized', relative);
  const backup = resolve(output, 'originals', relative);
  await mkdir(dirname(candidate), { recursive: true });
  await mkdir(dirname(backup), { recursive: true });
  await copyFile(source, backup);
  run('magick', [source, '-auto-orient', '-colorspace', 'sRGB', '-resize', size, '-strip', '-sampling-factor', '4:4:4', '-interlace', 'Plane', '-quality', '86', candidate]);
  const encoded = (await stat(candidate)).size;
  const smaller = encoded < before;
  if (apply && smaller) await copyFile(candidate, source);
  report.push({ file: relative, before, after: smaller ? encoded : before, dimensions: run('magick', ['identify', '-format', '%wx%h', smaller ? candidate : source]) });
}
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ applied: apply, backupDirectory: output, before: report.reduce((n, r) => n + r.before, 0), after: report.reduce((n, r) => n + r.after, 0), portraits: report.length }, null, 2));
