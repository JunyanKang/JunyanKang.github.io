import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { providerForCountry, mapLinks, lookupCountry, initContactMap } from '../assets/js/contact-map.mjs';

test('offline map snapshot is an attributed PNG with key-free metadata', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../assets/maps/contact-amap-fallback.json', import.meta.url), 'utf8'));
  assert.equal(snapshot.available, true);
  assert.match(snapshot.location, /^\d+\.\d+,\d+\.\d+$/);
  assert.equal(snapshot.image, '/assets/maps/contact-amap-fallback.png');
  assert.doesNotMatch(JSON.stringify(snapshot), /key=|restapi\.amap/);
  const bytes = await readFile(new URL(`..${snapshot.image}`, import.meta.url));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});

test('mainland China uses AMap; other countries use Google; unavailable lookup uses AMap', () => {
  assert.equal(providerForCountry('CN'), 'amap');
  for (const country of ['US', 'GB', 'HK', 'SG']) assert.equal(providerForCountry(country), 'google');
  assert.equal(providerForCountry(null), 'amap');
});
test('navigation encodes addresses, uses AMap coordinates only for AMap, and exposes no API key', () => {
  const address = '上海市浦东新区严桥路350号';
  const amap = mapLinks('amap', address, '121.529696,31.186486');
  assert.match(amap.directions, /coordinate=gaode/);
  assert.equal(new URL(amap.directions).searchParams.get('name'), address);
  assert.equal(amap.embed, undefined);
  const google = mapLinks('google', address);
  assert.equal(new URL(google.embed).searchParams.get('q'), address);
  assert.match(google.directions, /destination=/);
  assert.doesNotMatch(JSON.stringify({ amap, google }), /key=/);
  assert.match(mapLinks('amap', address, 'invalid').directions, /\/search\?/);
});
test('country lookup handles failures, malformed results and timeout', async () => {
  const fetcher = country => async () => ({ ok: true, json: async () => ({ country, ip: 'unused' }) });
  assert.equal(await lookupCountry(fetcher('CN')), 'CN');
  assert.equal(await lookupCountry(fetcher('invalid')), null);
  assert.equal(await lookupCountry(async () => ({ ok: false })), null);
  assert.equal(await lookupCountry(async () => { throw new Error('offline'); }), null);
  assert.equal(await lookupCountry(() => new Promise(() => {}), 5), null);
});
test('manual selection wins over an in-flight country lookup; switching back restores auto', async () => {
  let change, resolveCountry;
  const select = { value: 'auto', addEventListener: (_, fn) => { change = fn; } };
  const preview = {}, google = { hasAttribute: () => Boolean(google.src) }, link = {}, status = {};
  const elements = { select, '[data-amap-preview]': preview, '[data-google-map]': google, '[data-map-directions]': link, '[data-map-status]': status };
  const root = { dataset: { address: 'Shanghai' }, querySelector: name => elements[name] };
  const initialized = initContactMap(root, () => new Promise(resolve => { resolveCountry = resolve; }));
  assert.equal(root.dataset.provider, 'amap');
  assert.equal(google.src, undefined);
  select.value = 'amap'; change();
  resolveCountry({ ok: true, json: async () => ({ country: 'US' }) });
  await initialized;
  assert.equal(root.dataset.provider, 'amap');
  select.value = 'auto'; change();
  assert.equal(root.dataset.provider, 'google');
  assert.equal(google.hidden, false);
  assert.equal(preview.hidden, true);
  select.value = 'amap'; change();
  assert.equal(preview.hidden, false);
  assert.equal(google.hidden, true);
});
