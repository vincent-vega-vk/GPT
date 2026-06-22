/*
 * Drives the game in headless Chrome (Puppeteer) and captures a screenshot of
 * each screen, so we can prove the remake actually runs and renders.
 * Output: ./shots/*.png
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

process.env.PORT = process.env.PORT || '8099';
require('../server.js'); // starts the static server
const BASE = 'http://localhost:' + process.env.PORT;
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shoot(page, sel, name) {
  const el = await page.$(sel);
  await el.screenshot({ path: path.join(OUT, name) });
  console.log('  captured', name);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 980, height: 720, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });

  const seed = 20259;

  /* ---- choose club ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-choose', '1-choose-club.png');

  /* ---- squad (after taking charge) ---- */
  await page.click('#choose-confirm');
  await page.waitForSelector('#screen-squad:not(.hidden)');
  await page.waitForSelector('#squad-grid tbody tr');
  await sleep(100);
  await shoot(page, '#screen-squad', '2-squad.png');

  /* ---- team selector ---- */
  await page.click('#btn-play');
  await page.waitForSelector('#xi-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-team', '3-team-selector.png');

  /* ---- match (let it run, then capture in play) ---- */
  await page.click('#btn-action');
  await page.waitForSelector('#screen-match:not(.hidden)');
  await page.$eval('#m-speed', el => { el.value = '8'; el.dispatchEvent(new Event('input')); });
  await sleep(3600);
  await shoot(page, '#screen-match', '4-match.png');
  await page.click('#m-skip');
  await page.waitForSelector('#m-continue:not(.hidden)');
  await sleep(300);
  await shoot(page, '#screen-match', '5-match-fulltime.png');
  await page.click('#m-continue');

  /* ---- results round-up ---- */
  await page.waitForSelector('#screen-roundup:not(.hidden)');
  await sleep(150);
  await shoot(page, '#screen-roundup', '6-results-roundup.png');
  await page.click('#ru-ok');
  await page.waitForSelector('#screen-squad:not(.hidden)');

  /* ---- transfer market ---- */
  await page.click('#btn-transfer');
  await page.waitForSelector('#tm-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-transfer', '7-transfer-market.png');
  await page.click('#tm-close');

  /* ---- league, brackets, results, finances (after a chunk of the season) ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await page.click('#choose-confirm');
  await page.waitForSelector('#squad-grid tbody tr');
  await page.evaluate(() => window.SIMSOC_TEST.advance(20));
  await page.click('#btn-league');
  await page.waitForSelector('#lg-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-league', '8-league-table.png');       // user division (Conference)
  await page.click('#lg-prev'); await page.click('#lg-prev'); await page.click('#lg-prev');
  await sleep(150);
  await shoot(page, '#screen-league', '9-league-premier.png');
  await page.click('#lg-close');
  await page.click('#btn-cups');
  await page.waitForSelector('#screen-bracket:not(.hidden)');
  await page.waitForSelector('#bk-body .bcol');
  await sleep(150);
  await shoot(page, '#screen-bracket', '10-cup-bracket.png');
  await page.click('#bk-close');
  await page.click('#btn-results');
  await page.waitForSelector('#rs-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-results', '11-classified-results.png');
  await page.click('#rs-close');
  await page.click('#btn-finance');
  await page.waitForSelector('#screen-finance:not(.hidden)');
  await page.$eval('#fin-amount', el => { el.value = '400000'; });
  await page.click('#fin-borrow');
  await sleep(120);
  await shoot(page, '#screen-finance', '12-finances.png');
  await page.click('#fin-close');

  /* ---- roll of honour (finish the season) ---- */
  await page.evaluate(() => window.SIMSOC_TEST.advance(80));
  await page.waitForSelector('#screen-squad:not(.hidden)');
  await page.click('#btn-honours');
  await page.waitForSelector('#hon-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-honours', '13-roll-of-honour.png');
  await page.click('#hon-close');

  /* ---- head-to-head + a cup tie ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await page.click('#choose-confirm');
  await page.waitForSelector('#squad-grid tbody tr');
  await page.evaluate(() => window.SIMSOC_TEST.advance(55));        // build up some history
  await page.click('#btn-play');
  await page.waitForSelector('#screen-team:not(.hidden)');
  await page.$eval('#btn-history', el => el.click());
  await page.waitForSelector('#screen-history:not(.hidden)');
  await sleep(150);
  await shoot(page, '#screen-history', '14-head-to-head.png');
  await page.$eval('#h2h-close', el => el.click());
  await page.waitForSelector('#screen-team:not(.hidden)');
  /* ---- a cup tie in the team selector (fresh start, before being knocked out) ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await page.click('#choose-confirm');
  await page.waitForSelector('#squad-grid tbody tr');
  let gotCup = false;
  for (let i = 0; i < 12 && !gotCup; i++) {
    await page.$eval('#btn-play', el => el.click());
    await page.waitForSelector('#screen-team:not(.hidden)');
    const comp = await page.$eval('#league-name', el => el.textContent);
    if (/Cup/.test(comp)) { await sleep(150); await shoot(page, '#screen-team', '15-cup-tie.png'); gotCup = true; break; }
    await page.$eval('#btn-action', el => el.click());
    await page.waitForSelector('#screen-match:not(.hidden)');
    await page.$eval('#m-speed', el => { el.value = '10'; el.dispatchEvent(new Event('input')); });
    await page.$eval('#m-skip', el => el.click());
    await page.waitForSelector('#m-continue:not(.hidden)');
    await page.$eval('#m-continue', el => el.click());
    await page.waitForSelector('#screen-roundup:not(.hidden)');
    await page.$eval('#ru-ok', el => el.click());
    await page.waitForSelector('#screen-squad:not(.hidden)');
  }

  /* ---- a full-window desktop shot ---- */
  await page.goto(BASE + '/?fresh=1&club=66&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#squad-grid tbody tr');
  await page.evaluate(() => window.SIMSOC_TEST.show('screen-squad'));
  await page.waitForSelector('#screen-squad:not(.hidden)');
  await sleep(100);
  await page.screenshot({ path: path.join(OUT, '0-desktop.png') });
  console.log('  captured 0-desktop.png');

  await browser.close();
  console.log('Done. Screenshots in', OUT);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
