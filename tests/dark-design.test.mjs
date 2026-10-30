import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile(new URL('../assets/css/design-system.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/(--kl-[\w-]+):\s*(#[0-9a-f]{6});/g)].map(m => [m[1],m[2]]));
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('all shared reading surfaces are dark with accessible text and links',()=>{
  assert.match(css,/color-scheme:dark/);
  for(const bg of ['--kl-paper','--kl-surface','--kl-white','--kl-recommended']) {
    assert.ok(luminance(tokens[bg])<.04,`${bg} must remain dark`);
    for(const fg of ['--kl-ink','--kl-muted','--kl-accent']) assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg} on ${bg}`);
  }
  assert.ok(contrast(tokens['--kl-highlight'],tokens['--kl-on-primary'])>=7);
});
test('both page systems load the shared theme rather than a homepage-only theme',async()=>{
  for(const name of ['_layouts/kanglab.liquid','atlas/index.html']) {
    const source=await readFile(new URL(`../${name}`,import.meta.url),'utf8');
    assert.ok(source.includes('/assets/css/design-system.css'));
  }
});
test('current navigation hover keeps a dark background and explicit readable text',async()=>{
  const source=await readFile(new URL('../assets/css/kanglab.css',import.meta.url),'utf8');
  const rule=source.match(/\.kl-nav a\[aria-current\]:hover\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule,'current navigation hover rule');
  assert.match(rule,/background:var\(--kl-white\)/);
  assert.match(rule,/color:var\(--kl-ink\)/);
  assert.ok(contrast(tokens['--kl-ink'],tokens['--kl-white'])>=4.5);
});
