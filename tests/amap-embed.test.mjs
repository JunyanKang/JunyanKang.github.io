import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseLocation} from '../assets/js/amap-embed.mjs';

test('interactive map coordinates reject empty, invalid and out-of-range locations', () => {
  assert.deepEqual(parseLocation('121.529696,31.186486'), [121.529696,31.186486]);
  for (const value of ['', ',', '1,', ',1', 'abc,2', '181,2', '1,91', '1,2,3']) {
    assert.throws(() => parseLocation(value));
  }
});

test('AMap is interactive in a separate frame with navigation and familiar controls', async () => {
  const frame = await readFile(new URL('../_pages/amap.html',import.meta.url),'utf8');
  const parent = await readFile(new URL('../_pages/contact.md',import.meta.url),'utf8');
  assert.match(frame,/layout: null/);
  assert.match(frame,/script-src 'self' 'unsafe-eval' https:\/\/\*\.amap\.com/);
  assert.match(frame,/worker-src blob:/);
  assert.match(frame,/uri\.amap\.com\/navigation\?to=/);
  assert.match(frame,/data-satellite/);
  assert.match(frame,/data-zoom="in"/);
  assert.match(frame,/data-zoom="out"/);
  assert.match(frame,/data-reset/);
  assert.match(parent,/<iframe data-amap-map/);
  assert.doesNotMatch(parent,/data-amap-preview|unsafe-eval/);
});

test('CMS exposes a recommendation toggle without altering visibility semantics', async () => {
  const config = await readFile(new URL('../.pages.yml',import.meta.url),'utf8');
  assert.match(config,/- name: recommended\s+label: 推荐 \/ Recommended\s+type: boolean/);
});
