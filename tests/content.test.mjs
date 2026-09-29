import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergePublications, validateTeam, bibliography, addNewImportedPublications, publicationAuthors } from '../scripts/content.mjs';
const paper={title:'Test paper',year:'2025',doi:'10.1234/TEST',authors:'A, B',author_names:['A','B'],url:'https://doi.org/10.1234/TEST'};
test('refresh preserves CMS edits, hidden papers and deletions while adding new works',()=>{
  const hidden={...paper,hidden:true,title:'Edited'};
  const added={...paper,doi:'10.1234/new'};
  const result=addNewImportedPublications([paper],[paper,added],[hidden]);
  assert.equal(result.length,2); assert.deepEqual(result[0],hidden);
  assert.equal(mergePublications([],result).length,1);
  assert.deepEqual(addNewImportedPublications([paper],[paper],[]),[]);
});
test('catalog author edits including clearing authors affect rendering and BibTeX',()=>{
  const edited=mergePublications([],[{...paper,author_names:['C']}]);
  assert.equal(edited[0].authors,'C');assert.match(bibliography(edited),/author = \{\{C\}\}/);
  assert.equal(mergePublications([],[{...paper,author_names:[]}])[0].authors,'');
});
test('author flags support multiple first authors, corresponding authors and both roles',()=>{
  const entries=[{name:'A',first_author:true},{name:'B',first_author:true,corresponding_author:true},{name:'C',corresponding_author:true}];
  const [result]=mergePublications([],[{...paper,author_entries:entries}]);
  assert.deepEqual(result.author_names,['A','B','C']);
  assert.equal(result.authors,'A, B, C');
  assert.equal(result.author_entries.filter(a=>a.first_author).length,2);
  assert.equal(result.author_entries.filter(a=>a.corresponding_author).length,2);
  assert.match(bibliography([result]),/author = \{\{A\} and \{B\} and \{C\}\}/);
  assert.equal(mergePublications([],[{...paper,author_entries:[]}])[0].authors,'');
  const [updated]=mergePublications([{...paper,author_entries:entries}],[{...paper,author_names:['D']}]);
  assert.equal(updated.authors,'D');
  assert.equal(updated.author_entries[0].first_author,false);
});
test('refresh preserves author flags and adds new authors without inferring roles',()=>{
  const edited={...paper,author_entries:[{name:'B',corresponding_author:true}]};
  const added={...paper,doi:'10.1234/new'};
  const result=addNewImportedPublications([paper],[paper,added],[edited]);
  assert.deepEqual(result[0],edited);
  assert.equal(result[1].author_entries.length,2);
  assert.ok(result[1].author_entries.every(a=>!a.first_author&&!a.corresponding_author));
  assert.throws(()=>publicationAuthors({author_entries:[{name:'',first_author:true}]}));
  assert.throws(()=>publicationAuthors({author_entries:[{name:'A',first_author:'false'}]}));
});
test('team descriptions and every map region have English text without inventing missing bios',async()=>{
  const team=JSON.parse(await readFile(new URL('../_data/team.json',import.meta.url),'utf8'));
  const names=JSON.parse(await readFile(new URL('../_data/region_names_en.json',import.meta.url),'utf8'));
  const geo=JSON.parse(await readFile(new URL('../assets/geo/china-provinces.geojson',import.meta.url),'utf8'));
  for(const member of team.members) for(const key of ['role','hometown','bio']) assert.doesNotMatch(member[key]||'',/[\u3400-\u9fff]/);
  for(const feature of geo.features) {
    const label=names[feature.properties.adcode];
    assert.ok(label); assert.doesNotMatch(label,/[\u3400-\u9fff]/);
  }
});
test('CMS catalog has valid, unique publications and preview files',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../_data/publications_manual.json',import.meta.url),'utf8'));
  const visible=mergePublications([],catalog.items);
  assert.equal(new Set(visible.map(p=>p.doi||p.title)).size,visible.length);
  for(const p of visible) if(p.preview?.image) assert.ok((await readFile(new URL('..'+p.preview.image,import.meta.url))).length>0);
});
test('preview crop validates bounds and supports clearing CMS crop fields',()=>{
  const preview={image:'/assets/img/example.jpg',source:'https://example.com',alt:'Model',crop:{x:0,y:0,width:100,height:100,source_width:100,source_height:100}};
  assert.equal(mergePublications([],[{...paper,preview}])[0].preview.crop.width,100);
  assert.throws(()=>mergePublications([],[{...paper,preview:{...preview,crop:{...preview.crop,width:101}}}]));
  assert.equal(mergePublications([],[{...paper,preview:{...preview,crop:{x:null,y:null}}}])[0].preview.crop,undefined);
});
test('manual edits override ORCID records without duplicate DOIs',()=>{ const papers=mergePublications([paper],[{...paper,doi:'https://doi.org/10.1234/test',title:'Corrected title'}]);assert.equal(papers.length,1);assert.equal(papers[0].title,'Corrected title'); });
test('new manual records survive refresh and hidden records are excluded',()=>{ const papers=mergePublications([paper],[{...paper,doi:'10.1234/new',title:'Manual work'},{doi:paper.doi,hidden:true}]);assert.equal(papers.length,1);assert.equal(papers[0].title,'Manual work');assert.match(bibliography(papers),/Manual work/); });
test('unsafe publication links are rejected',()=>{assert.throws(()=>mergePublications([],[{...paper,doi:null,url:'javascript:alert(1)'}]));});
test('public team roster excludes private fields and has valid regional assignments',async()=>{const team=JSON.parse(await readFile(new URL('../_data/team.json',import.meta.url),'utf8'));const geo=JSON.parse(await readFile(new URL('../assets/geo/china-provinces.geojson',import.meta.url),'utf8'));const codes=geo.features.map(f=>String(f.properties.adcode));validateTeam(team,codes);assert.throws(()=>validateTeam({...team,advisor:'hidden'},codes));assert.throws(()=>validateTeam({...team,members:[{...team.members[0],region:'invalid'}]},codes));});
test('alumni can be saved with an optional graduation year',()=>{const member={name:'Example',role:'Master student',year:2023,group:'alumni',region:'310000'};validateTeam({members:[member]},['310000']);validateTeam({members:[{...member,graduation_year:2026}]},['310000']);assert.throws(()=>validateTeam({members:[{...member,graduation_year:2022}]},['310000']));});
