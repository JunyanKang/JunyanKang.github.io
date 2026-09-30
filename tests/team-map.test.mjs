import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('team heading omits member totals and doctoral roles use PhD student', async () => {
  const template = await readFile(new URL('../_pages/profile.html', import.meta.url), 'utf8');
  const cms = await readFile(new URL('../.pages.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(template, /All regions|team\.members\.size/);
  assert.doesNotMatch(cms, /Direct-entry PhD student/);
  assert.match(cms, /name: PhD student/);
});

test('origins map is a hover preview, not a member-filter control', async () => {
  const template = await readFile(new URL('../_pages/profile.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../assets/js/team.js', import.meta.url), 'utf8');
  assert.doesNotMatch(template, /team-filter-status|kl-region-button|role="button"|aria-pressed/);
  assert.match(template, /role="tooltip" hidden/);
  assert.match(template, /tabindex="0"/);
  assert.match(script, /addEventListener\('pointerenter'/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.doesNotMatch(script, /addEventListener\('click'|card\.hidden\s*=|group\.hidden\s*=/);
  assert.match(script, /portrait\.cloneNode\(true\)/);
  assert.match(script, /label\.textContent = name/);
  assert.doesNotMatch(script, /innerHTML/);
});
