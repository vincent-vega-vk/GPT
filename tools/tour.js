/* Torneo intero in modalità automatica (accelerata): node tools/tour.js */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|ERR_NAME|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(400);
  const shot = (n) => page.screenshot({ path: `${OUT}/tour_${n}.png` });
  let n = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    const ok = await page.evaluate(() => new Promise((resolve) => {
      const G = PK.Game; G.settings.difficulty = 'normal'; G.newTournament('ITA');
      for (let r = 0; r < 3; r++) {
        G.playNext(true); const m = G.match; let steps = 0;
        while (G.match === m && steps++ < 60000) { m.update(1 / 60); if (m.phase === 'end') { m.pt = 2; m.advanceFromEnd(); } }
        if (r === 0) G._firstResult = true;
        G.afterResult();
      }
      resolve(!!G.tour.playerMatch());
    }));
    console.log('tentativo', attempt, ok ? 'qualificata' : 'eliminata');
    if (ok) break;
  }
  await page.waitForTimeout(500);
  await shot('1_hub');
  for (let guard = 0; guard < 12; guard++) {
    const st = await page.evaluate(() => { const t = PK.Game.tour; return { over: t.over, has: !!t.playerMatch(), round: t.round && t.round.id }; });
    console.log('turno', st.round, st.has ? 'giocatore in campo' : 'fuori', st.over ? 'FINITO' : '');
    if (st.over || !st.has) break;
    await page.evaluate(() => PK.Game.playNext(true));
    // avanzamento rapido della partita
    const res = await page.evaluate(() => new Promise((resolve) => {
      const G = PK.Game; const m = G.match; let steps = 0;
      const t0 = performance.now();
      while (G.match === m && steps < 60000) { m.update(1 / 60); if (m.phase === 'end') { m.pt = 2; m.advanceFromEnd(); } steps++; }
      resolve({ steps, ms: Math.round(performance.now() - t0), screen: G.screen, result: G.lastResult && { goals: G.lastResult.result.goals, w: G.lastResult.result.winner, kicks: G.lastResult.result.kicks.length } });
    }));
    console.log('  partita:', JSON.stringify(res));
    await page.waitForTimeout(500);
    if (n === 0) await shot('0_result_ko');
    n++;
    await page.evaluate(() => PK.Game.afterResult());
    await page.waitForTimeout(150);
    if (n === 1) { await page.evaluate(() => { PK.Game.hubTab = 'groups'; PK.Screens.hub(PK.Game); }); await page.waitForTimeout(500); await shot('2_groups'); await page.evaluate(() => { PK.Game.hubTab = 'match'; PK.Screens.hub(PK.Game); }); }
  }
  await page.evaluate(() => { PK.Game.hubTab = 'bracket'; if (PK.Game.tour.playerMatch()) PK.Screens.hub(PK.Game); });
  await page.waitForTimeout(500);
  await shot('3_bracket');
  await page.evaluate(() => { if (!PK.Game.tour.over) PK.Game.simulateRest(); else PK.Screens.end(PK.Game); });
  await page.waitForTimeout(600);
  await shot('4_end');
  await page.evaluate(() => { PK.Game.hubTab = 'bracket'; });
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await browser.close();
})();
