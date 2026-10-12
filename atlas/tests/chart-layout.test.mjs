import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryLayout } from '../shared/chart-layout.mjs';

for (const fontSize of [11, 15, 25]) {
  for (const preferredWidth of [280, 1000, 2200]) {
    test(`all 30 category labels have readable slots at ${preferredWidth}px / ${fontSize}px font`, () => {
      const labels = ['heart', ...Array(29).fill('skeletal muscle')];
      const layout = categoryLayout(labels, fontSize, preferredWidth, 100);
      assert.ok((layout.width - layout.leftPad - 100) / labels.length >= Math.max(26, fontSize * 1.6));
      assert.ok(layout.leftPad < 60, 'no sidebar reserved for redundant series labels');
      assert.ok(layout.width >= preferredWidth);
      assert.ok(layout.bottomPad > 'skeletal muscle'.length * fontSize * 0.62 * Math.sin(Math.PI / 3));
    });
  }
}

test('long first labels and an empty category list produce finite, unclipped layouts', () => {
  const label = 'a very long first tissue label';
  const layout = categoryLayout([label], 25, 320, 100);
  const center = layout.leftPad + (layout.width - layout.leftPad - 100) / 2;
  assert.ok(center - label.length * 25 * 0.62 * Math.cos(Math.PI / 3) >= 0);
  assert.ok(Object.values(categoryLayout([], 11, 320, 76)).every(Number.isFinite));
});
