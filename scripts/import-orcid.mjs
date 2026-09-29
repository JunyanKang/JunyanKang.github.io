import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { addNewImportedPublications, mergePublications, bibliography } from './content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const previous = JSON.parse(await readFile(`${root}/_data/publications.json`, 'utf8'));
const catalog = JSON.parse(await readFile(`${root}/_data/publications_manual.json`, 'utf8'));
const orcid = '0000-0001-5191-5217';
const api = `https://pub.orcid.org/v3.0/${orcid}`;
async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const input = process.argv[2];
const record = input ? JSON.parse(await readFile(input, 'utf8')) : await getJson(`${api}/record`);
if (record['orcid-identifier']?.path !== orcid) throw new Error('Unexpected ORCID identity');
const retrievedAt = new Date().toISOString().slice(0, 10);
const unique = new Map();
for (const group of record['activities-summary'].works.group) {
  for (const work of group['work-summary']) {
    const doi = work['external-ids']?.['external-id']?.find(item => item['external-id-type'] === 'doi')?.['external-id-value']?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
    const title = work.title.title.value.trim();
    const key = doi || title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!unique.has(key)) unique.set(key, { work, doi, title });
  }
}
const papers = [];
for (const { work, doi, title } of unique.values()) {
  const detail = await getJson(`${api}/work/${work['put-code']}`);
  let authors = (detail.contributors?.contributor || []).map(c => c['credit-name']?.value).filter(Boolean);
  let authorSource = 'ORCID contributors (may be incomplete)';
  if (doi) {
    try {
      const { message } = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (message.DOI?.toLowerCase() !== doi) throw new Error('Crossref DOI mismatch');
      const completeAuthors = (message.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ') || a.name).filter(Boolean);
      if (completeAuthors.length) { authors = completeAuthors; authorSource = 'Crossref publisher metadata'; }
    } catch (error) { console.warn(`Author metadata unavailable for ${doi}: ${error.message}`); }
  }
  const year = work['publication-date']?.year?.value || '';
  papers.push({
    title, year, journal: work['journal-title']?.value || '', doi: doi || null,
    authors: authors.join(', '),
    author_names: authors,
    author_source: authorSource,
    url: doi ? `https://doi.org/${doi}` : `https://orcid.org/${orcid}/work/${work['put-code']}`,
    orcid_put_code: work['put-code'],
    selected: ['10.1186/s12967-026-07769-z', '10.1126/science.abj6647', '10.1016/j.cell.2017.04.034'].includes(doi),
  });
}
papers.sort((a, b) => Number(b.year) - Number(a.year) || a.title.localeCompare(b.title));
// The DOI from the ORCID record is authoritative, including for selected works.
papers.forEach(p => { if (p.title.startsWith('LLPS of FXR1')) p.selected = true; });
const affiliations = ['employments', 'educations'].flatMap(kind =>
  (record['activities-summary'][kind]['affiliation-group'] || []).flatMap(group => group.summaries.map(summary => {
    const item = summary[kind === 'employments' ? 'employment-summary' : 'education-summary'];
    return {
      organization: item.organization.name, role: item['role-title'],
      city: item.organization.address.city, country: item.organization.address.country,
      start_year: item['start-date']?.year?.value, end_year: item['end-date']?.year?.value,
    };
  }))
).sort((a,b) => Number(b.start_year) - Number(a.start_year));
const items = addNewImportedPublications(previous.items, papers, catalog.items);
const bib = bibliography(mergePublications([], items));
await mkdir(`${root}/assets/data`, { recursive: true });
await mkdir(`${root}/_data`, { recursive: true });
await writeFile(`${root}/_data/publications_manual.json`, JSON.stringify({ ...catalog, items }, null, 2) + '\n');
await writeFile(`${root}/_data/publications.json`, JSON.stringify({ orcid, retrieved_at: retrievedAt, source: api, items: papers }, null, 2) + '\n');
await writeFile(`${root}/_data/profile.json`, JSON.stringify({ orcid, retrieved_at: retrievedAt, affiliations }, null, 2) + '\n');
await writeFile(`${root}/assets/data/publications.bib`, bib + '\n');
console.log(`Imported ${papers.length} unique works and ${affiliations.length} affiliations from ${orcid}.`);
