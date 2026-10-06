const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  const ok = await page.evaluate(() => {
    const G = PK.Game; G.tour = new PK.Tournament({ player: 'ITA' });
    const sheet = document.createElement('canvas'); sheet.id = 'sheet'; sheet.width = 1920; sheet.height = 1080;
    document.body.appendChild(sheet); document.getElementById('app').style.display = 'none'; document.body.style.overflow = 'auto';
    const g = sheet.getContext('2d');
    PK.SPECIALS.forEach((sp, i) => {
      const m = new PK.Match({ teamA: PK.TEAM.ITA, teamB: PK.TEAM.BRA, playerSide: 'A', mode: 'knockout', stage: 'QF', label: 'x', first: 'A', onFinish: () => {} });
      m.resize(1280, 720);
      m.beginKick(); m.phase = 'aim';
      m.shot = { target: { x: i % 2 ? 2.2 : -2.2, y: 1.3 }, power: 0.84, curve: 0, spec: sp, sigma: 0 };
      m.kicker.aimX = m.shot.target.x;
      m.startRun();
      let n = 0; while (!m.launched && n++ < 400) m.update(1 / 60);
      m.hitStop = 0; m.hitInfo = null; m.timeScale = 0.3; m.dolly = 1; m.dollyTarget = 1;
      for (let k = 0; k < 46; k++) m.update(1 / 60);
      m.draw(G.ctx, 1280, 720);
      const cx = (i % 4) * 480, cy = Math.floor(i / 4) * 360;
      g.drawImage(G.canvas, 0, 0, 1280, 720, cx, cy, 480, 360);
      g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText(sp.name, cx + 8, cy + 24);
    });
    return true;
  });
  await (await page.$('#sheet')).screenshot({ path: OUT + '/sh_specials.png' });
  console.log(errs.length ? errs.join('\n') : 'ok'); await browser.close();
})();
