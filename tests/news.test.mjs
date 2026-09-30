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
    assert.doesNotMatch(text, /Figure source:/);
    assert.match(text, /image_source_url: https:/);
    assert.match(text, /image_license_url: https:\/\/creativecommons.org\/licenses\//);
  }
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

test('Teachers Day news uses the supplied team illustration and joins the carousel', async () => {
  const text = await read('_news/teachers-day-2025.md');
  assert.match(text, /date: 2025-09-10/);
  assert.match(text, /category: Lab life/);
  assert.match(text, /image: \/assets\/img\/news\/teachers-day-2025.png/);
  assert.match(text, /image_fit: contain/);
  assert.match(text, /published: true/);
  assert.match(text, /show_in_hero: true/);
  assert.match(text, /illustrated team portrait/i);
  const image = await readFile(new URL('../assets/img/news/teachers-day-2025.png', import.meta.url));
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
});

test('2026 event news preserves meeting roles and documentary photo framing', async () => {
  const conference = await read('_news/ccos2026-tianjin.md');
  assert.match(conference, /30th Congress of Chinese Ophthalmological Society/);
  assert.match(conference, /date: 2026-09-12/);
  assert.match(conference, /Lu-Yue Ding \| Poster presentation/);
  assert.match(conference, /Yuan-Rong Guo \| Poster presentation/);
  assert.match(conference, /Zi-Wu Wang \| Written communication/);
  assert.doesNotMatch(conference, /oral presentation|award/i);
  assert.match(conference, /ccos2026-poster-session.jpg/);
  const teachers = await read('_news/teachers-day-2026.md');
  assert.match(teachers, /7 September/);
  assert.match(teachers, /image_presentation: team-photo/);
  for (const template of ['_includes/kanglab-carousel.liquid', '_includes/kanglab-news-card.liquid', '_layouts/kanglab-news.html']) {
    assert.match(await read(template), /data-photo-framing=/);
  }
  assert.match(await read('.pages.yml'), /name: image_presentation/);
});
