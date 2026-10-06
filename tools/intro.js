const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message + (e.stack||'').split('\n').slice(0,4).join('|')));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(300);
  await page.evaluate(() => { PK.Game.forceFirst = 'A'; PK.Game.newTournament('ITA'); PK.Game.playNext(); });
  await page.waitForTimeout(1900); await page.screenshot({ path: OUT + '/i_coin.png' });
  await page.waitForTimeout(1200); await page.screenshot({ path: OUT + '/i_versus1.png' });
  await page.waitForTimeout(450); await page.screenshot({ path: OUT + '/i_versus2.png' });
  console.log(errs.length ? errs.join('\n') : 'no errors'); await browser.close();
})();
