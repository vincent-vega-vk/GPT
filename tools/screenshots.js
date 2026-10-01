/*
 * Drives the game in headless Chrome (Puppeteer) and captures the README
 * screenshots into ./shots. Uses CHROME=/path/to/chrome if set, otherwise a
 * Playwright Chromium under /opt/pw-browsers, otherwise Puppeteer's own.
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

process.env.PORT = process.env.PORT || '8099';
require('../server.js');
const BASE = 'http://localhost:' + process.env.PORT;
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
fs.readdirSync(OUT).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(OUT, f)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  try {
    const d = fs.readdirSync('/opt/pw-browsers').find(x => /^chromium-\d+/.test(x));
    if (d) return '/opt/pw-browsers/' + d + '/chrome-linux/chrome';
  } catch (e) { /* default */ }
  return undefined;
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: chromePath(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('  [pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
  const shot = async name => { await sleep(350); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  captured', name); };
  const go = async r => { await page.evaluate(r => { location.hash = '#/' + r; }, r); await sleep(350); };
  const clearToasts = () => page.evaluate(() => { document.getElementById('toasts').innerHTML = ''; });
  const seed = 20259;

  /* ---- new career ---- */
  await page.goto(BASE + '/?fresh=1&seed=' + seed, { waitUntil: 'networkidle0' });
  await sleep(500);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.club-card')].find(x => /Romford/.test(x.textContent)); c.click(); });
  await shot('01-new-career');
  await page.evaluate(() => document.querySelector('[data-act="newStart"]').click());
  await sleep(500);

  /* ---- a first match, live ---- */
  await clearToasts();
  await page.keyboard.press('Space'); await sleep(1000);
  await shot('03-match-preview');
  await page.evaluate(() => document.querySelector('[data-act="mtKick"]').click());
  await page.evaluate(() => document.querySelector('[data-act="mtSpeed"][data-v="2"]').click());
  await sleep(9000);
  await shot('04-match-live');
  await page.evaluate(() => document.querySelector('[data-act="mtSpeed"][data-v="8"]').click());
  for (let i = 0; i < 80; i++) { if (await page.$('.talk-opts')) break; await sleep(150); }
  await shot('05-half-time-team-talk');
  await page.evaluate(() => document.querySelector('.talk-opts [data-v="encourage"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('[data-act="mtSkip"]').click());
  await sleep(700); await clearToasts();
  await shot('06-full-time');
  await page.keyboard.press('Space'); await sleep(700); await clearToasts();
  await shot('07-results-roundup');
  await page.keyboard.press('Space'); await sleep(500);

  /* ---- a chunk of the season ---- */
  await page.evaluate(() => window.SIMSOC_TEST.advance(16));
  await sleep(500); await go('home'); await clearToasts();
  await shot('02-home');
  await go('tactics'); await shot('08-tactics');
  await go('squad'); await shot('09-squad');
  const pid = await page.evaluate(() => { const s = window.SIMSOC_TEST.state(); return s.clubs[s.userClub].players.slice().sort((a, b) => b.skill - a.skill)[0].id; });
  await go('player/' + pid); await shot('10-player');
  await go('league/3'); await shot('11-league-table');
  await go('league/4/stats'); await shot('12-league-stats');
  await go('cup/champions'); await shot('13-cup-bracket');
  await go('transfers'); await shot('14-transfers');
  await go('inbox'); await page.evaluate(() => { const m = document.querySelector('.msg'); if (m) m.click(); }); await sleep(300); await shot('15-inbox');
  await go('finances'); await shot('16-finances');
  await go('competitions'); await shot('17-competitions');
  await go('club/' + (await page.evaluate(() => window.SIMSOC_TEST.state().divisions[0].members[0]))); await shot('18-club');

  /* ---- end of the season ---- */
  await page.evaluate(() => window.SIMSOC_TEST.advance(40));
  await sleep(500);
  await go('review'); await clearToasts(); await shot('19-season-review');
  await page.evaluate(() => { window.SIMSOC_TEST.state().pendingReview = null; });
  await go('honours/totals'); await shot('20-hall-of-fame');
  await go('career'); await shot('21-career');
  await go('board'); await shot('22-board');

  /* ---- title & phone ---- */
  await page.evaluate(() => window.SIMSOC_TEST.save());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' }); await sleep(800);
  await shot('00-title');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => window.SimUI.acts.loadAuto()); await sleep(900); await clearToasts();
  await shot('23-phone-home');

  await browser.close();
  console.log('Done. Screenshots in', OUT);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
