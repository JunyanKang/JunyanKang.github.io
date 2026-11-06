import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../assets/js/home-umap.js', import.meta.url), 'utf8');
function setup({ blocked = false } = {}) {
  const eventTarget = () => ({ events: {}, attributes: {}, hidden: false, addEventListener(t, f) { (this.events[t] ||= []).push(f); }, fire(t) { (this.events[t] || []).forEach(f => f()); }, setAttribute(k, v) { this.attributes[k] = v; } });
  const toggle = eventTarget(), label = eventTarget(), icon = eventTarget(), mediaSource = eventTarget();
  const video = Object.assign(eventTarget(), { paused: true, calls: 0, querySelectorAll: () => [mediaSource], play() { this.calls++; if (blocked) return Promise.reject(new Error('Autoplay blocked')); this.paused = false; this.fire('play'); return Promise.resolve(); }, pause() { this.paused = true; this.fire('pause'); } });
  const elements = { '[data-umap-video]': video, '[data-umap-toggle]': toggle, '[data-umap-label]': label, '[data-umap-icon]': icon };
  const player = { querySelector: key => elements[key] };
  const document = Object.assign(eventTarget(), { hidden: false, querySelector: () => player });
  let observe;
  class Observer { constructor(fn) { observe = fn; } observe() {} }
  const window = { IntersectionObserver: Observer, matchMedia() { throw new Error('System motion preference must not disable this user-requested video'); } };
  vm.runInNewContext(source, { document, window, IntersectionObserver: Observer });
  return { video, toggle, label, mediaSource, document, observe: visible => observe([{ isIntersecting: visible }]) };
}
test('UMAP autoplays without controls and suspends while hidden',()=>{const a=setup(); assert.equal(a.video.paused,false); a.observe(false); assert.equal(a.video.paused,true); a.observe(true); assert.equal(a.video.paused,false); a.document.hidden=true; a.document.fire('visibilitychange'); assert.equal(a.video.paused,true); a.document.hidden=false; a.document.fire('visibilitychange'); assert.equal(a.video.paused,false);});
test('blocked playback is safely handled',async()=>{const a=setup({blocked:true}); await Promise.resolve(); assert.equal(a.video.paused,true);});
test('failed media recovers on loadeddata',()=>{const a=setup(); a.video.fire('error'); const n=a.video.calls; a.observe(true); assert.equal(a.video.calls,n); a.video.fire('loadeddata'); assert.equal(a.video.calls,n+1);});
test('other pages require no player',()=>{vm.runInNewContext(source,{document:{querySelector:()=>null}});});
test('hero artwork has no visible playback control',async()=>{const html=await readFile(new URL('../_pages/about.md',import.meta.url),'utf8'); assert.equal(html.includes('data-umap-toggle'),false);});
