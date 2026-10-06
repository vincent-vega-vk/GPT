/* Partita giocata via script con screenshot: node tools/play.js <scenario> */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
const scenario = process.argv[2] || 'kick';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|ERR_NAME|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(500);
  const shot = async (n) => { await page.screenshot({ path: `${OUT}/${scenario}_${n}.png` }); };
  const ev = (f, a) => page.evaluate(f, a);
  await ev((sc) => { PK.Game.settings.difficulty = 'normal'; PK.Game.forceFirst = (sc === 'keeper') ? 'B' : 'A'; PK.Game.newTournament('ITA'); }, scenario);
  await ev(() => PK.Game.playNext());
  // salta sorteggio e intro
  await page.waitForTimeout(2600);
  await ev(() => { const m = PK.Game.match; if (m.phase === 'intro') m.pt = m.introDur; });
  await page.waitForTimeout(300);
  const phase = () => ev(() => PK.Game.match.phase);
  if (scenario === 'kick') {
    // l'utente calcia per primo? dipende dal sorteggio
    const humanKicks = await ev(() => PK.Game.match.humanKicks);
    console.log('humanKicks', humanKicks, 'phase', await phase());
    if (!humanKicks) { console.log('tocca al portiere: scenario non applicabile'); }
    await ev(() => { const m = PK.Game.match; m.aim = { x: 2.6, y: 0.55 }; m.setCurve(0); });
    await page.waitForTimeout(200);
    await shot('0_aim');
    await ev(() => PK.Game.match.pressKick());
    // aspetta che la barra entri nella zona e blocca
    for (let i = 0; i < 80; i++) {
      const p = await ev(() => PK.Game.match.power);
      if (p > 0.77 && p < 0.84) break;
      await page.waitForTimeout(15);
    }
    await shot('1_power');
    await ev(() => PK.Game.match.pressKick());
    for (const [i, ms] of [[2, 500], [3, 450], [4, 500], [5, 350], [6, 250], [7, 250], [8, 400], [9, 600], [10, 700]]) {
      await page.waitForTimeout(ms);
      await shot(i + '_' + (await phase()));
    }
  }
  if (scenario === 'special') {
    await ev(() => { const m = PK.Game.match; m.aim = { x: -2.7, y: 1.9 }; m.toggleSuper(); });
    await page.waitForTimeout(200);
    await shot('0_armed');
    await ev(() => PK.Game.match.pressKick());
    for (let i = 0; i < 120; i++) { const p = await ev(() => PK.Game.match.power); if (p > 0.78 && p < 0.84) break; await page.waitForTimeout(12); }
    await shot('1_power');
    await ev(() => PK.Game.match.pressKick());
    // aspetta il contatto (hit-stop)
    for (let i = 0; i < 200; i++) { if (await ev(() => PK.Game.match.hitStop > 0)) break; await page.waitForTimeout(15); }
    await page.waitForTimeout(350);
    await shot('2_intro');
    await page.waitForTimeout(700);
    await shot('3_fx1');
    for (const [i, ms] of [[4, 250], [5, 250], [6, 300], [7, 500], [8, 800]]) { await page.waitForTimeout(ms); await shot(i + '_' + (await phase())); }
  }
  if (scenario === 'keeper') {
    console.log('humanKeeps', await ev(() => PK.Game.match.humanKeeps), await phase());
    await shot('0_ready');
    // attende il contatto e si tuffa a destra in basso
    for (let i = 0; i < 400; i++) { if (await ev(() => PK.Game.match.launched)) break; await page.waitForTimeout(12); }
    await ev(() => PK.Game.match.humanDive({ x: 2.6, y: 0.6 }));
    for (const [i, ms] of [[1, 150], [2, 250], [3, 300], [4, 300], [5, 400], [6, 600], [7, 800]]) { await page.waitForTimeout(ms); await shot(i + '_' + (await phase())); }
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await browser.close();
})();
