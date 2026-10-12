import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Native SVG clipping preserves the original screenshot pixels and canvas size.
// Coordinates describe panel boundaries, not a crop or a replacement UI.
const directory = new URL('../assets/img/news/paper-loom/', import.meta.url);
const screenshots = [
  { name: 'caption-controls', width: 1032, height: 389,
    panels: [[48, 48, 936, 69, 22], [264, 115, 504, 227, 20]] },
  { name: 'references', width: 1768, height: 574,
    panels: [[48, 48, 880, 314, 38], [928, 130, 824, 396, 36]] },
  { name: 'network', width: 1616, height: 1616,
    panels: [[48, 48, 1520, 1520, 40]] },
  { name: 'appearance', width: 792, height: 1456,
    panels: [[48, 48, 720, 1360, 40]] },
];

for (const { name, width, height, panels } of screenshots) {
  const original = await readFile(new URL(`${name}.webp`, directory));
  const shapes = panels.map(([x, y, w, h, r]) =>
    `      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Paper Loom ${name.replaceAll('-', ' ')} screenshot</title>
  <defs>
    <clipPath id="panels" clipPathUnits="userSpaceOnUse">
${shapes}
    </clipPath>
  </defs>
  <image width="${width}" height="${height}" clip-path="url(#panels)" href="data:image/webp;base64,${original.toString('base64')}"/>
</svg>
`;
  const target = new URL(`${name}-transparent.svg`, directory);
  await writeFile(target, svg);
  console.log(fileURLToPath(target));
}
