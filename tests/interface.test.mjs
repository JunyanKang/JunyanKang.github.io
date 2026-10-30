import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/js/kanglab.js', import.meta.url), 'utf8');
function element(options = {}) {
  return Object.assign({
    hidden: false, value: '', dataset: {}, textContent: '', attributes: {}, events: {},
    classList: { toggle() {} },
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); },
    fire(type, event = {}) { for (const fn of this.events[type] || []) fn(event); },
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  }, options);
}
function run(selectors = {}, ids = {}, lists = {}, url = 'https://kanglab.cool/publications/') {
  const media = element({ matches: true });
  const document = element({
    querySelector: key => selectors[key] || null,
    getElementById: key => ids[key] || null,
    querySelectorAll: key => lists[key] || [],
  });
  const window = { matchMedia: () => media, location: new URL(url), history: { replaceState(_state, _title, value) { window.location.href = String(value); } } };
  vm.runInNewContext(source, { document, window, URL, URLSearchParams });
  return { media, document, window };
}

test('mobile navigation opens, Escape restores focus, resize restores desktop links', () => {
  const label = element();
  const toggle = element({ querySelector: () => label });
  const nav = element();
  const { media, document } = run({ '.kl-menu-toggle': toggle }, { 'site-navigation': nav });
  assert.equal(nav.hidden, true);
  toggle.fire('click');
  assert.equal(nav.hidden, false);
  assert.equal(toggle.attributes['aria-expanded'], 'true');
  document.fire('keydown', { key: 'Escape' });
  assert.equal(nav.hidden, true);
  assert.equal(toggle.focused, true);
  media.matches = false; media.fire('change');
  assert.equal(nav.hidden, false);
  assert.equal(toggle.hidden, true);
});

test('publication search restores URL queries, reports matches and clears without losing other URL state', () => {
  const search = element(), clear = element(), result = element(), empty = element();
  const papers = ['retina study 2026', 'rna translation 2022'].map(text => element({ dataset: { search: text } }));
  const { window } = run({ '[data-clear-publications]': clear }, {
    'publication-search': search, 'publication-empty': empty, 'publication-results': result,
  }, { '[data-publication]': papers }, 'https://kanglab.cool/publications/?q=retina&preview=1#main');
  assert.equal(search.value, 'retina');
  assert.equal(result.textContent, '1 of 2 publications');
  search.value = 'not-found'; search.fire('input');
  assert.equal(empty.hidden, false);
  clear.fire('click');
  assert.equal(papers.every(p => !p.hidden), true);
  assert.equal(clear.hidden, true);
  assert.equal(search.focused, true);
  assert.equal(window.location.href, 'https://kanglab.cool/publications/?preview=1#main');
});

test('external search matches multiple terms across fields and restores empty groups on clearing', () => {
  const search = element(), field = element({ hidden: true }), result = element(), clear = element();
  const items = [element({ textContent: 'Retinal development Harvard' }), element({ textContent: 'Gene regulation NIH' })];
  const groups = items.map(item => element({ querySelectorAll: () => [item] }));
  run({ '[data-resource-search]': field, '[data-clear-resources]': clear }, { 'resource-search': search, 'resource-results': result }, { '.kl-external-group': groups });
  assert.equal(field.hidden, false);
  search.value = 'HARVARD retinal'; search.fire('input');
  assert.equal(result.textContent, '1 of 2 resources');
  assert.deepEqual(groups.map(g => g.hidden), [false, true]);
  search.value = '<script>'; search.fire('input');
  assert.equal(groups.every(g => g.hidden), true);
  assert.match(result.textContent, /No matching resources/);
  clear.fire('click');
  assert.equal(groups.every(g => !g.hidden), true);
});

test('news filters use CMS categories without fixed counts and restore all stories', () => {
  const buttons = ['', 'Publication', 'New category'].map(value => element({ dataset: { newsFilter: value } }));
  const stories = ['Publication', 'Lab life', 'New category'].map(value => element({ dataset: { newsCategory: value } }));
  const filters = element({ querySelectorAll: () => buttons }), result = element();
  run({ '[data-news-filters]': filters }, { 'news-results': result }, { '[data-news-category]': stories });
  buttons[2].fire('click');
  assert.equal(result.textContent, '1 of 3 stories');
  assert.equal(stories[2].hidden, false);
  assert.equal(buttons[2].attributes['aria-pressed'], 'true');
  buttons[0].fire('click');
  assert.equal(stories.every(story => !story.hidden), true);
});

test('carousel distinguishes horizontal swipes from scrolling and respects reduced motion', async () => {
  const slides = ['One', 'Two', 'Three'].map(text => element({ querySelector: () => ({ textContent: text }) }));
  const dots = slides.map(() => element({ removeAttribute(key) { delete this.attributes[key]; } }));
  const status = element(), controls = element(), reduced = element({ matches: false });
  const timers = new Map(); let nextTimer = 0;
  const root = element({
    querySelectorAll: key => key === '[data-slide]' ? slides : dots,
    querySelector: key => key === '[data-carousel-controls]' ? controls : status,
    contains: () => false,
  });
  const document = element({ hidden: false, querySelectorAll: () => [root] });
  vm.runInNewContext(await readFile(new URL('../assets/js/carousel.js', import.meta.url), 'utf8'), {
    document, window: { matchMedia: () => reduced },
    setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  assert.equal(slides[0].hidden, false);
  root.fire('pointerdown', { pointerType: 'touch', clientX: 250, clientY: 200 });
  assert.equal(timers.size, 0);
  root.fire('pointerup', { clientX: 60, clientY: 210 });
  assert.equal(slides[1].hidden, false);
  let suppressed = false;
  root.fire('click', { preventDefault() { suppressed = true; } });
  assert.equal(suppressed, true);
  root.fire('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 200 });
  root.fire('pointerup', { clientX: 190, clientY: 400 });
  assert.equal(slides[1].hidden, false);
  reduced.matches = true; reduced.fire('change');
  assert.equal(timers.size, 0);
  root.fire('keydown', { key: 'ArrowRight', preventDefault() {} });
  assert.equal(slides[2].hidden, false);
  assert.match(status.textContent, /Slide 3 of 3: Three/);
  assert.equal(timers.size, 0);
});
