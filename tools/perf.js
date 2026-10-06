/* Prestazioni, pausa e touch: node tools/perf.js */
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|ERR_NAME|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(400);
  await page.evaluate(() => { PK.Game.forceFirst = 'A'; PK.Game.newTournament('ITA'); PK.Game.playNext(); });
  await page.waitForTimeout(2800);
  await page.evaluate(() => { const m = PK.Game.match; if (m.phase === 'intro') m.pt = m.introDur; });
  await page.waitForTimeout(600);
  const perf = await page.evaluate(() => {
    const G = PK.Game, m = G.match;
    const t0 = performance.now(); let n = 0;
    while (performance.now() - t0 < 1500) { m.draw(G.ctx, G.w, G.h); n++; }
    return { canvas: G.w + 'x' + G.h, drawMs: ((performance.now() - t0) / n).toFixed(1), n };
  });
  console.log('perf (aim, headless sw render):', JSON.stringify(perf));
  await page.screenshot({ path: OUT + '/m_aim_mobile.png' });
  // tocco: trascina per mirare, poi tocca TIRA
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { w: r.width, h: r.height }; });
  await page.touchscreen.tap(box.w * 0.62, box.h * 0.52);
  await page.waitForTimeout(150);
  console.log('aim dopo tap:', JSON.stringify(await page.evaluate(() => PK.Game.match.aim)));
  await page.tap('#btn-kick');
  await page.waitForTimeout(500);
  console.log('fase dopo TIRA:', await page.evaluate(() => PK.Game.match.phase));
  await page.screenshot({ path: OUT + '/m_power_mobile.png' });
  await page.tap('#btn-kick');
  await page.waitForTimeout(2600);
  console.log('fase dopo lock:', await page.evaluate(() => PK.Game.match.phase));
  const perf2 = await page.evaluate(() => { const G = PK.Game, m = G.match; const t0 = performance.now(); let n = 0; while (performance.now() - t0 < 800) { m.draw(G.ctx, G.w, G.h); n++; } return ((performance.now() - t0) / n).toFixed(1); });
  console.log('draw ms (volo/risultato):', perf2);
  await page.screenshot({ path: OUT + '/m_flight_mobile.png' });
  // pausa con Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('pausa:', await page.evaluate(() => PK.Game.paused), await page.evaluate(() => PK.Game.screen));
  await page.screenshot({ path: OUT + '/m_pause.png' });
  await page.click('#b-res');
  await page.waitForTimeout(300);
  console.log('ripreso:', !(await page.evaluate(() => PK.Game.paused)));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await browser.close();
})();
