import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('five content pages omit the large introductory header without losing accessible page titles', async () => {
  for (const file of ['research.md', 'publications.html', 'profile.html', 'resources.html', 'contact.md']) {
    const template = await readFile(new URL(`../_pages/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(template, /<header class="kl-page-heading">/);
    assert.match(template, /<h1 class="kl-visually-hidden">[^<]+<\/h1>/);
  }
});

test('footer uses an accessible admin icon next to Kang Lab, without a colophon', async () => {
  const layout = await readFile(new URL('../_layouts/kanglab.liquid', import.meta.url), 'utf8');
  const footer = layout.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  assert.match(footer, /<strong>Kang Lab<\/strong><a class="kl-admin-link"/);
  assert.match(footer, /href="https:\/\/app\.pagescms\.org\/sign-in"/);
  assert.match(footer, /aria-label="Admin sign-in"/);
  assert.doesNotMatch(footer, /kl-colophon|©|Built with|Open science, shared knowledge/);
});

test('contact details show only the English address and no legacy map caption/buttons', async () => {
  const template = await readFile(new URL('../_pages/contact.md', import.meta.url), 'utf8');
  const details = template.match(/<section class="kl-contact-details"[\s\S]*?<\/section>/)[0];
  assert.match(details, /contact\.address_en/);
  assert.doesNotMatch(details, /contact\.address_zh|kl-links|百度|Directions/);
  assert.doesNotMatch(template, /<figcaption/);
  assert.doesNotMatch(template, /kl-map-toolbar|data-map-status/);
  assert.match(template, /class="kl-map-provider"[^>]*aria-label="Map provider"/);
});
