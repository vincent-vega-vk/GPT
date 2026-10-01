#!/usr/bin/env node
/* Test end-to-end dell'interfaccia con Playwright: onboarding, percorso, una tappa completa, schermate. */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'dist', 'shots');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'finquest.html');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function page(w, h, scheme) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`[${w}] pageerror: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(`[${w}] console: ${m.text()}`); });
    await p.goto(file);
    return p;
  }
  // risponde all'esercizio corrente: sceglie la prima opzione, o compila
  async function answer(p) {
    for (let guard = 0; guard < 80; guard++) {
      if (!(await p.$('#lesson:not([hidden])'))) return;
      if (await p.$('#modal:not([hidden])')) return;
      const btn = await p.$('.lbtn');
      const label = (await btn.textContent()).trim();
      if (!(await btn.isDisabled())) { await btn.click(); await p.waitForTimeout(60); continue; }
      if (await p.$('.ex-match')) {
        const L = await p.$$('.mcol:first-child .mitem:not(.matched)');
        const Rr = await p.$$('.mcol-r .mitem:not(.matched)');
        if (L.length) { await L[0].click(); for (const r of Rr) { await r.click(); await p.waitForTimeout(30); if (await L[0].evaluate((e) => e.classList.contains('matched'))) break; await L[0].click(); } }
        continue;
      }
      if (await p.$('.ex-order')) { const b = await p.$('.order-bank .chip-btn'); if (b) await b.click(); continue; }
      if (await p.$('.ex-cat')) { for (const row of await p.$$('.cat-row')) { const s = await row.$('.seg-b'); await s.click(); } continue; }
      if (await p.$('.num-in')) { await p.fill('.num-in', '100'); continue; }
      if (await p.$('.sim-trade')) { await p.click('.sim-actions .btn-up'); await p.click('.sim-actions button:has-text("Fino alla fine")'); continue; }
      if (await p.$('.sim-alloc')) { await p.$eval('.sliders input', (i) => { i.value = 50; i.dispatchEvent(new Event('input')); }); continue; }
      if (await p.$('.sim-lab')) { await p.click('.sim-lab .opt'); continue; }
      const opt = await p.$('.opt:not([disabled])');
      if (opt) { await opt.click(); continue; }
      await p.waitForTimeout(100);
    }
  }
  // DESKTOP chiaro
  let p = await page(1366, 900, 'light');
  await p.screenshot({ path: `${OUT}/01-onboarding.png` });
  await p.click('text=Inizia');
  await p.click('.onb-opt >> nth=1');
  await p.click('text=Continua');
  await p.screenshot({ path: `${OUT}/02-start.png` });
  await p.click('.onb-opt.start >> nth=0');
  await p.evaluate(() => { FQ.App.state().set.relax = true; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/03-path.png` });
  await p.click('.node.current');
  await p.screenshot({ path: `${OUT}/04-pop.png` });
  await p.click('.pop .btn-primary');
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/05-lesson-card.png` });
  await answer(p);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/06-results.png` });
  await p.click('#modal .btn-primary');
  // tappe successive: vocabolario e grafici
  for (let k = 0; k < 5; k++) {
    await p.click('.node.current');
    await p.click('.pop .btn-primary');
    if (k === 4) { await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/07-chart.png` }); }
    await answer(p);
    await p.waitForTimeout(200);
    if (await p.$('#modal:not([hidden])')) await p.click('#modal .btn-col .btn >> nth=-1');
  }
  await p.screenshot({ path: `${OUT}/08-path-progress.png` });
  for (const t of ['practice', 'glossary', 'goals', 'profile']) { await p.click(`.rail .nav-${t}`); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/09-${t}.png`, fullPage: false }); }
  // guida livello
  await p.click('.rail .nav-path');
  await p.click('.lvl-side .btn >> nth=0');
  await p.screenshot({ path: `${OUT}/10-guide.png` });
  await p.close();

  // MOBILE scuro: salta all'esperto e gioca tappe con grafici/sim
  p = await page(390, 844, 'dark');
  await p.click('text=Inizia'); await p.click('text=Continua');
  await p.click('.onb-opt.start >> nth=3');
  await p.evaluate(() => { FQ.App.state().set.relax = true; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/20-m-path.png` });
  // apre direttamente tappe specifiche via API interna
  const stages = [[61, 5, 'chart'], [61, 17, 'sim'], [64, 12, 'calc2'], [66, 13, 'chart2'], [61, 0, 'intro'], [62, 11, 'sort'], [61, 7, 'scen']];
  for (const [lv, si, nm] of stages) {
    await p.evaluate(([lv, si]) => { const s = FQ.App.state(); s.unlocked = Math.max(s.unlocked, lv + 1); }, [lv, si]);
    await p.evaluate(() => { document.querySelector('.tabbar .nav-path').click(); });
    await p.evaluate(([lv]) => { const s = FQ.App.state(); s.unit = Math.ceil(lv / 10); }, [lv]);
    await p.evaluate(() => document.querySelector('.tabbar .nav-practice').click());
    await p.evaluate(() => document.querySelector('.tabbar .nav-path').click());
    const node = await p.$(`#lv-${lv} .node >> nth=${si}`);
    await node.scrollIntoViewIfNeeded();
    await node.click();
    await p.click('.pop .btn-primary');
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/21-m-${nm}.png` });
    // prima risposta per mostrare il feedback
    const opt = await p.$('.opt:not([disabled])');
    if (opt && !(await p.$('.ex-card'))) { await opt.click(); await p.click('.lbtn'); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/22-m-${nm}-fb.png` }); }
    await answer(p);
    await p.waitForTimeout(250);
    if (await p.$('#modal:not([hidden])')) { await p.screenshot({ path: `${OUT}/23-m-${nm}-res.png` }); await p.click('#modal .btn-col .btn >> nth=-1'); }
  }
  // overflow orizzontale
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (ov > 1) errors.push('overflow orizzontale mobile: ' + ov + 'px');
  await p.close();
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'Nessun errore JS');
})().catch((e) => { console.error(e); process.exit(1); });
