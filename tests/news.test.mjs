import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('carousel has accessible controls and published news destinations', async () => {
  const html = await read('_includes/kanglab-carousel.liquid');
  for (const attribute of ['data-slide-to', 'aria-live="polite"']) assert.ok(html.includes(attribute));
  assert.doesNotMatch(html, /data-prev|data-next|data-play|Read the story/);
  assert.match(await read('assets/css/kanglab.css'), /\.kl-carousel-caption h2\s*\{[^}]*max-width:none/);
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

test('publication figures remain uncropped regardless of the selected image fit', async () => {
  assert.match(await read('_includes/kanglab-carousel.liquid'), /story.category == 'Publication'/);
  assert.match(await read('_includes/kanglab-news-card.liquid'), /include.story.category == 'Publication'/);
});

test('image attribution lives on the credits page instead of in news prose', async () => {
  const layout = await read('_layouts/kanglab-news.html');
  assert.doesNotMatch(layout, /<figcaption>/);
  assert.match(layout, /\/image-credits\//);
  const credits = await read('_pages/image-credits.html');
  for (const field of ['image_credit', 'image_source_url', 'image_license_url']) assert.ok(credits.includes(field));
  assert.match(credits, /where: 'published', true/);
});

test('news templates honor CMS photo framing without prescribing article contents', async () => {
  for (const template of ['_includes/kanglab-carousel.liquid', '_includes/kanglab-news-card.liquid', '_layouts/kanglab-news.html']) {
    assert.match(await read(template), /data-photo-framing=/);
  }
  assert.match(await read('.pages.yml'), /name: image_presentation/);
});
