import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('carousel has accessible controls and published news destinations', async () => {
  const html = await read('_includes/kanglab-carousel.liquid');
  for (const attribute of ['data-prev', 'data-next', 'data-play', 'data-slide-to', 'aria-live="polite"']) assert.ok(html.includes(attribute));
  assert.match(html, /where: 'published', true/);
  assert.match(html, /where: 'show_in_hero', true/);
  assert.match(html, /story.url \| relative_url/);
  assert.match(html, /unless forloop.first %}hidden/);
});

test('carousel respects motion preferences, focus, hover and hidden tabs', async () => {
  const js = await read('assets/js/carousel.js');
  for (const term of ['prefers-reduced-motion', 'focusin', 'pointerenter', 'visibilitychange', 'document.hidden', 'slide.inert', 'clearTimeout']) assert.ok(js.includes(term));
});

test('province name is centered and news uses the existing CMS', async () => {
  assert.match(await read('assets/css/kanglab.css'), /\.kl-region-preview-title\s*\{[^}]*text-align:center/);
  assert.match(await read('.pages.yml'), /name: news\s+label: 新闻编辑与发布 \/ News\s+type: collection/);
});

test('publication news uses original paper figures, accurate dates and plain publication wording', async () => {
  for (const [slug, image, date] of [
    ['ddx19b-publication', 'ddx19b.png', '2026-09-28'],
    ['retina-rik-publication', 'retina-rik.png', '2026-01-30'],
  ]) {
    const text = await read(`_news/${slug}.md`);
    assert.ok(text.includes(`image: /assets/img/publications/${image}`));
    assert.ok(text.includes(`date: ${date}`));
    assert.match(text, /image_fit: contain/);
    assert.doesNotMatch(text, /editorial highlight|not a study of retinal|AI-generated|Publication highlight/i);
    assert.match(text, /Figure source:/);
  }
  assert.match(await read('_includes/kanglab-carousel.liquid'), /story.category == 'Publication'/);
  assert.match(await read('_includes/kanglab-news-card.liquid'), /include.story.category == 'Publication'/);
});

test('welcome news names the four incoming members without fabricated portraits', async () => {
  const text = await read('_news/welcome-2026-students.md');
  const team = JSON.parse(await read('_data/team.json'));
  const incoming = team.members.filter(member => member.year === 2026);
  assert.equal(incoming.length, 4);
  for (const member of incoming) assert.ok(text.includes(member.name));
  assert.match(text, /image: \/assets\/img\/brand\/kanglab-symbol-v17.png/);
  assert.match(text, /published: true/);
  assert.match(text, /show_in_hero: true/);
});
