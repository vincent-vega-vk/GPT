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
  await page.$eval('#m-speed', el => { el.value = '9'; el.dispatchEvent(new Event('input')); });
  await sleep(3200);
  await shoot(page, '#screen-match', '4-match.png');
  // skip to full time and capture the result state
  await page.click('#m-skip');
  await page.waitForSelector('#m-continue:not(.hidden)');
  await sleep(300);
  await shoot(page, '#screen-match', '5-match-fulltime.png');
  await page.click('#m-continue');

  /* ---- transfer market ---- */
  await page.waitForSelector('#screen-squad:not(.hidden)');
  await page.click('#btn-transfer');
  await page.waitForSelector('#tm-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-transfer', '6-transfer-market.png');
  await page.click('#tm-close');

  /* ---- league + results (after simulating a chunk of the season) ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await page.click('#choose-confirm');                 // take charge of Romford
  await page.waitForSelector('#squad-grid tbody tr');
  await page.evaluate(() => window.SIMSOC_TEST.advance(15));
  await page.click('#btn-league');
  await page.waitForSelector('#lg-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-league', '7-league-table.png');     // user division (Conference)
  // switch up to the top division to show the pyramid is all simulated
  await page.click('#lg-prev'); await page.click('#lg-prev'); await page.click('#lg-prev');
  await sleep(150);
  await shoot(page, '#screen-league', '8-league-premier.png');
  await page.click('#lg-close');
  // classified results with scorers
  await page.click('#btn-results');
  await page.waitForSelector('#rs-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-results', '9-classified-results.png');
  await page.click('#rs-close');

  /* ---- roll of honour (finish a season first) ---- */
  await page.evaluate(() => window.SIMSOC_TEST.advance(70));   // play out the rest of the season
  await page.waitForSelector('#screen-squad:not(.hidden)');
  await page.click('#btn-honours');
  await page.waitForSelector('#hon-grid tbody tr');
  await sleep(150);
  await shoot(page, '#screen-honours', '10-roll-of-honour.png');

  /* ---- a cup tie in the team selector ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#choose-grid tbody tr');
  await page.click('#choose-confirm');
  await page.waitForSelector('#squad-grid tbody tr');
  let gotCup = false;
  for (let i = 0; i < 14 && !gotCup; i++) {
    await page.click('#btn-play');
    await page.waitForSelector('#screen-team:not(.hidden)');
    const comp = await page.$eval('#league-name', el => el.textContent);
    if (/Cup/.test(comp)) {
      await sleep(150);
      await shoot(page, '#screen-team', '11-cup-tie.png');
      gotCup = true;
      break;
    }
    await page.click('#btn-action');
    await page.waitForSelector('#screen-match:not(.hidden)');
    await page.$eval('#m-speed', el => { el.value = '10'; el.dispatchEvent(new Event('input')); });
    await page.click('#m-skip');
    await page.waitForSelector('#m-continue:not(.hidden)');
    await page.click('#m-continue');
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
