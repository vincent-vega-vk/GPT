const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message + (e.stack||'').split('\n').slice(0,4).join('|')));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  // partita di FINALE con rigorista umano, tiro speciale per forzare la ripetizione
  await page.evaluate(() => {
    const G = PK.Game; G.tour = new PK.Tournament({ player: 'ITA' }); G.hubTab = 'match';
    G.match = new PK.Match({ teamA: PK.TEAM.ITA, teamB: PK.TEAM.BRA, playerSide: 'A', mode: 'knockout', stage: 'F', label: 'FINALE', difficulty: 'normal', first: 'A', onFinish: () => {} });
    PK.HUD.show(true); PK.Screens.clear();
  });
  await page.waitForTimeout(2600);
  await page.evaluate(() => { const m = PK.Game.match; if (m.phase === 'intro') m.pt = m.introDur; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/r_final_aim.png' });
  await page.evaluate(() => { const m = PK.Game.match; m.aim = { x: 2.8, y: 1.9 }; m.toggleSuper(); m.pressKick(); });
  await page.evaluate(() => new Promise((res) => { const m = PK.Game.match; (function f() { if (m.power > 0.77 && m.power < 0.85) { m.pressKick(); res(); } else requestAnimationFrame(f); })(); }));
  for (let i = 0; i < 400; i++) { if ((await page.evaluate(() => PK.Game.match.phase)) === 'replay') break; await page.waitForTimeout(50); }
  console.log('fase', await page.evaluate(() => PK.Game.match.phase));
  await page.waitForTimeout(1300); await page.screenshot({ path: OUT + '/r_replay1.png' });
  await page.waitForTimeout(900); await page.screenshot({ path: OUT + '/r_replay2.png' });
  await page.waitForTimeout(1200); await page.screenshot({ path: OUT + '/r_replay3.png' });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await browser.close();
})();
