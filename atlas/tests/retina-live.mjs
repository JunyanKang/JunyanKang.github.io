// Run against the local data preview: node atlas/tests/retina-live.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({channel: 'chrome'});
try {
  const page = await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  page.setDefaultTimeout(90000);
  await page.goto(new URL('/expression-atlas/?gene=PAX6&dataset=spatial', process.env.ATLAS_TEST_ORIGIN || 'http://127.0.0.1:4387').href);
  for (const [kind,cohorts] of Object.entries({spatial:{monkey_age_space:8,mouse_dev_space:8,mouse_age_space:10,human_age_space:3,monkey_dev_space:6},multi:{monkey_age_multi:4,monkey_dev_multi:9,mouse_dev_multi:13}})) {
    await page.getByRole('button',{name:kind==='multi'?'Single-cell multiomics':'Spatial RNA',exact:true}).click();
    for(const [key,n] of Object.entries(cohorts)) {
      await page.getByLabel('Cohort').selectOption(key);
      await page.waitForFunction(n=>document.querySelectorAll('.retina-grid header').length===n,n);
      const grid = await page.locator('.retina-grid').boundingBox();
      const card = await page.locator('.expression-atlas-dataset-card').boundingBox();
      assert.ok(grid.width >= card.width - 48, `${key}: plots must span the result card`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${key}: desktop overflow`);
      const scales=await page.locator('.retina-scales').innerText(); assert.ok(scales.includes('≥'));assert.equal(await page.locator('.retina-pair canvas').count(),(kind === 'multi' ? 3 : 2)*n);
      if (kind === 'multi') {
        const sample = page.locator('.retina-grid section').first();
        const target = key === 'mouse_dev_multi' ? 'Cluster 1' : 'Rod';
        await page.getByRole('button', {name: target, exact: true}).click();
        assert.ok((await sample.locator('figcaption').first().innerText()).startsWith(target + ' · '));
        await sample.getByRole('button', {name: 'Zoom in'}).click();
        assert.deepEqual(await sample.locator('canvas').evaluateAll(nodes => nodes.map(node => node.__zoom.k)), [2,2,2]);
      }
      if(key==='monkey_age_space') {
        const sample = page.locator('.retina-grid section').first();
        await sample.getByRole('button', {name: 'Zoom in'}).click();
        assert.equal(await sample.locator('output').innerText(), '2×');
        const transforms = await sample.locator('canvas').evaluateAll(nodes => nodes.map(node => [node.__zoom.x, node.__zoom.y, node.__zoom.k]));
        assert.deepEqual(transforms[0], transforms[1]);
        assert.equal(transforms[0][2], 2);
        await sample.getByRole('button', {name: 'Reset view'}).click();
        assert.equal(await sample.locator('output').innerText(), '1×');
        const row=page.getByRole('rowheader',{name:'RPE',exact:true}).locator('..');assert.equal(await row.locator('td').first().innerText(),'0.11');await page.getByLabel('Statistic').selectOption('n');assert.equal(await row.locator('td').first().innerText(),'709');await page.getByLabel('Statistic').selectOption('mean');
      }
      if(kind==='spatial') {
        await page.getByLabel('Coordinates').selectOption('umap');
        await page.waitForFunction(()=>/umap/i.test(document.querySelector('.retina-facets > p')?.textContent||''));
        await page.getByLabel('Coordinates').selectOption('tissue');await page.locator('.retina-grid header').first().waitFor();
      }
      console.log(key,n,scales.replaceAll('\n',' '));
    }
  }
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByLabel('Gene symbol').fill('UNLISTED_FEATURE_123');await page.getByRole('button',{name:'Query',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.retina-scales')?.textContent.includes('feature unavailable'));assert.ok((await page.locator('.retina-heat tbody td').allTextContents()).every(v=>v==='NA'));
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
