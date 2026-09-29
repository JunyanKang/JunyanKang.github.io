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
function mapFixture() {
  const buttons = ['amap', 'google'].map(mapProvider => ({
    dataset: { mapProvider }, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(_, fn) { this.click = fn; },
  }));
  let source, loads = 0;
  const preview = {}, google = { hasAttribute: () => Boolean(source), get src() { return source; }, set src(value) { source = value; loads++; } };
  const root = { dataset: { address: 'Shanghai' }, querySelector: name => name === '[data-amap-preview]' ? preview : google, querySelectorAll: () => buttons };
  return { root, buttons, preview, google, get loads() { return loads; } };
}

test('manual logo selection wins over an in-flight country lookup and retries Google', async () => {
  let resolveCountry;
  const f = mapFixture();
  const initialized = initContactMap(f.root, () => new Promise(resolve => { resolveCountry = resolve; }));
  assert.equal(f.root.dataset.provider, 'amap');
  assert.equal(f.loads, 0);
  f.buttons[0].click();
  resolveCountry({ ok: true, json: async () => ({ country: 'US' }) });
  await initialized;
  assert.equal(f.root.dataset.provider, 'amap');
  f.buttons[1].click();
  assert.equal(f.root.dataset.provider, 'google');
  assert.equal(f.google.hidden, false);
  assert.equal(f.preview.hidden, true);
  assert.equal(f.loads, 1);
  f.buttons[0].click();
  assert.equal(f.preview.hidden, false);
  assert.equal(f.google.hidden, true);
  f.buttons[1].click();
  assert.equal(f.loads, 2);
  f.buttons[1].click();
  assert.equal(f.loads, 3);
});

test('automatic IP selection activates exactly the logo of the displayed provider', async () => {
  for (const [country, expected] of [['CN', 'amap'], ['US', 'google'], [null, 'amap']]) {
    const f = mapFixture();
    await initContactMap(f.root, async () => ({ ok: true, json: async () => ({ country }) }));
    assert.equal(f.root.dataset.provider, expected);
    assert.equal(f.buttons.filter(b => b.attributes['aria-pressed'] === 'true').length, 1);
    assert.equal(f.buttons.find(b => b.attributes['aria-pressed'] === 'true').dataset.mapProvider, expected);
  }
});
