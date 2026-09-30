import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('shared symbol and icon are square alpha PNGs at the declared sizes', async () => {
  for (const [name, size] of [['symbol', 256], ['icon', 192]]) {
    const data = await readFile(new URL(`../assets/img/brand/kanglab-${name}-v17.png`, import.meta.url));
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
    assert.equal(data[25], 6, 'RGBA color type preserves transparent negative space');
  }
});

test('academic pages and atlas use the same emblem, lockups and icon', async () => {
  const layout = await read('_layouts/kanglab.liquid');
  const include = await read('_includes/kanglab-logo.liquid');
  const atlas = await read('atlas/src/main.tsx');
  for (const variant of ['horizontal', 'stacked']) {
    assert.ok(layout.includes(`variant='${variant}'`));
    assert.ok(atlas.includes(`variant="${variant}"`));
  }
  for (const source of [include, atlas]) assert.ok(source.includes('/assets/img/brand/kanglab-symbol-v17.png'));
  for (const source of [layout, atlas]) {
    assert.ok(source.includes('aria-label="Kang Lab home"'));
    assert.ok(source.includes('https://app.pagescms.org/sign-in'));
    assert.ok(!source.includes('kang-lab-retinal-k-v3'));
  }
  assert.ok((await read('_config.yml')).includes('icon: brand/kanglab-icon-v17.png'));
  assert.ok((await read('atlas/index.html')).includes('/assets/img/brand/kanglab-icon-v17.png'));
});
