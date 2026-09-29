import { readFile, writeFile } from 'node:fs/promises';
import { mergePublications, validateTeam, bibliography } from './content.mjs';
const root = new URL('../',import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path,root),'utf8'));
const manual = await read('_data/publications_manual.json');
const team = await read('_data/team.json');
const geo = await read('assets/geo/china-provinces.geojson');
validateTeam(team,geo.features.map(f=>String(f.properties.adcode)));
// The CMS catalog is authoritative, including deletions and hidden records.
const items = mergePublications([],manual.items);
for (const paper of items) if (paper.preview?.image) await readFile(new URL(paper.preview.image.slice(1),root));
await writeFile(new URL('_data/publications_all.json',root),JSON.stringify({items})+'\n');
await writeFile(new URL('assets/data/publications.bib',root),bibliography(items));
console.log(`Validated ${team.members.length} members and ${items.length} deduplicated publications.`);
