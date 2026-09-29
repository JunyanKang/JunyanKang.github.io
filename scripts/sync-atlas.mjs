import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const site = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(site, '../frontend/src');
const files = [
  'pages/ExpressionAtlasPage.tsx', 'types/index.ts',
  'components/ui/KlCard.tsx', 'components/ui/KlButton.tsx', 'components/ui/KlSpinner.tsx',
  'components/common/ErrorState.tsx', 'components/common/LoadingState.tsx',
  'web-components/register.ts', 'styles/global.scss', 'styles/_variables.scss',
];
for (const file of files) {
  const target = resolve(site, 'atlas/src', file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(source, file), target);
}
const page = resolve(site, 'atlas/src/pages/ExpressionAtlasPage.tsx');
await writeFile(page, (await readFile(page, 'utf8')).replace('>Internal atlas<', '>Expression atlas<').replace('from the internal knowledge base', 'from our public expression collection'));
console.log(`Synced ${files.length} atlas runtime files. No analysis tools or account screens included.`);

