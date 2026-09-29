export function mergePublications(imported, manual) {
  const records = new Map();
  for (const paper of [...imported, ...manual]) {
    const doi = String(paper.doi || '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim().toLowerCase();
    const key = doi || String(paper.title || '').trim().toLowerCase();
    if (!key) throw new Error('A publication needs a title or DOI.');
    if (paper.hidden) { records.delete(key); continue; }
    const merged = { ...records.get(key), ...paper, doi: doi || null };
    if (!merged.title?.trim() || !/^\d{4}$/.test(String(merged.year))) throw new Error(`Incomplete publication: ${key}`);
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) throw new Error(`Invalid DOI: ${doi}`);
    merged.url = doi ? `https://doi.org/${doi}` : merged.url;
    if (!/^https:\/\//.test(merged.url || '')) throw new Error(`Publication URL must use HTTPS: ${key}`);
    if (Array.isArray(paper.author_names)) merged.authors = paper.author_names.join(', ');
    if (merged.preview?.image) {
      const p = merged.preview;
      if (!/^\/assets\/img\/[a-zA-Z0-9_./ -]+\.(png|jpe?g|webp)$/i.test(p.image) || p.image.includes('..')) throw new Error(`Invalid preview image: ${key}`);
      if (!/^https:\/\//.test(p.source || '') || !p.alt?.trim()) throw new Error(`Preview requires source and description: ${key}`);
      if (p.crop && Object.values(p.crop).some(v => v != null && v !== '')) {
        const c = p.crop;
        if (!['x','y','width','height','source_width','source_height'].every(k => Number.isFinite(c[k])) || c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 || c.x + c.width > c.source_width || c.y + c.height > c.source_height) throw new Error(`Invalid preview crop: ${key}`);
      } else if (p.crop) merged.preview = { ...p, crop: undefined };
    }
    records.set(key, merged);
  }
  return [...records.values()].sort((a,b) => Number(b.year)-Number(a.year) || a.title.localeCompare(b.title));
}
export function addNewImportedPublications(previousImported, imported, catalog) {
  const keys = paper => [
    paper.doi ? `doi:${String(paper.doi).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim().toLowerCase()}` : `title:${String(paper.title || '').trim().toLowerCase()}`,
    ...(paper.orcid_put_code ? [`orcid:${paper.orcid_put_code}`] : []),
  ];
  // Previously imported records that are absent from the catalog were deleted.
  const known = new Set([...previousImported, ...catalog].flatMap(keys));
  const result = [...catalog];
  for (const paper of imported) {
    const identities = keys(paper);
    if (identities.some(key => known.has(key))) continue;
    result.push({ ...paper, year: Number(paper.year) });
    identities.forEach(key => known.add(key));
  }
  return result;
}
export function validateTeam(team, codes) {
  const forbidden = /^(advisor|supervisor|mentor|gender|sex|导师|性别)$/i;
  const inspect = value => { if(value && typeof value === 'object') for(const [key,child] of Object.entries(value)) { if(forbidden.test(key)) throw new Error(`Private field is not allowed in public team data: ${key}`); inspect(child); } };
  inspect(team);
  if(!Array.isArray(team.members)) throw new Error('Team members must be a list.');
  for(const member of team.members) {
    if(!member.name?.trim() || !member.role?.trim()) throw new Error('Member name and role are required.');
    if(!['researchers','doctoral','masters','alumni'].includes(member.group)) throw new Error(`Unknown member group: ${member.group}`);
    if(!Number.isInteger(member.year) || member.year < 1900 || member.year > 2100) throw new Error(`Invalid member year: ${member.name}`);
    if(member.graduation_year != null && (!Number.isInteger(member.graduation_year) || member.graduation_year < member.year || member.graduation_year > 2100)) throw new Error(`Invalid graduation year: ${member.name}`);
    if(!codes.includes(String(member.region))) throw new Error(`Unknown home region: ${member.name}`);
    if(member.photo && !member.photo.startsWith('/assets/img/')) throw new Error('Member photo must be a local uploaded image.');
  }
}
export function bibliography(items) {
  const escape = value => String(value ?? '').replace(/\\/g,'\\textbackslash{}').replace(/[{}]/g,'').replace(/[%&#_]/g, x=>'\\'+x);
  return items.map((p,i) => `@article{kang${p.year}_${i+1},\n  title = {{${escape(p.title)}}},\n  author = {${(p.author_names || [p.authors || '']).map(n=>`{${escape(n)}}`).join(' and ')}},\n  journal = {${escape(p.journal)}},\n  year = {${p.year}},\n${p.doi?`  doi = {${p.doi}},\n`:''}  url = {${p.url}}\n}`).join('\n\n')+'\n';
}
