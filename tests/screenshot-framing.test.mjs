import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const [name, width, height] of [
  ['caption-controls', 1032, 389], ['references', 1768, 574],
  ['network', 1616, 1616], ['appearance', 792, 1456],
]) {
  test(`${name}: transparent frame preserves source bytes and scale`, async () => {
    const root = new URL('../assets/img/news/paper-loom/', import.meta.url);
    const svg = await readFile(new URL(`${name}-transparent.svg`, root), 'utf8');
    const source = await readFile(new URL(`${name}.webp`, root));
    assert.ok(svg.includes(`viewBox="0 0 ${width} ${height}"`));
    assert.ok(svg.includes(`<image width="${width}" height="${height}"`));
    assert.ok(svg.includes('clipPathUnits="userSpaceOnUse"'));
    assert.deepEqual(Buffer.from(svg.match(/data:image\/webp;base64,([^"\s]+)/)[1], 'base64'), source);
    assert.doesNotMatch(svg, /<script|<foreignObject|transform=|<filter/);
  });
}
