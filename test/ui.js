/*
 * Headless UI test: drives the real game in Chrome (Puppeteer) and checks the
 * interactions work end to end - navigation, tactics, transfers, inbox
 * actions, loans, a live match with substitutions / mentality / team talk,
 * leaving a match early, a walkover, save slots - with zero console errors.
 *   npm run test:ui        (CHROME=/path/to/chrome to choose the browser)
 */
const fs = require('fs');
const puppeteer = require('puppeteer');
process.env.PORT = process.env.PORT || '8097';
const server = require('../server.js');
const BASE = 'http://localhost:' + process.env.PORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  try {
    const base = '/opt/pw-browsers';
    const d = fs.readdirSync(base).find(x => /^chromium-\d+/.test(x));
    if (d && fs.existsSync(base + '/' + d + '/chrome-linux/chrome')) return base + '/' + d + '/chrome-linux/chrome';
  } catch (e) { /* use puppeteer's own browser */ }
  return undefined;
}

let failures = 0, checks = 0;
function check(name, cond, extra) {
  checks++;
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (!cond && extra != null ? '  -> ' + extra : ''));
  if (!cond) failures++;
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: chromePath(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 860 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const S = (fn, ...a) => page.evaluate(fn, ...a);
  const go = async r => { await page.evaluate(r => { location.hash = '#/' + r; }, r); await sleep(250); };
  const click = async sel => { await page.$eval(sel, el => el.click()); await sleep(200); };
  const confirmModal = async () => { await page.$eval('#modal-root .modal .btn.primary, #modal-root .modal .btn.danger:last-child', el => el.click()); await sleep(250); };

  console.log('\nBoot & navigation');
  await page.goto(BASE + '/?club=66&seed=4242&name=Tester', { waitUntil: 'networkidle0' });
  await sleep(500);
  check('career starts on the home page', await S(() => window.SimUI.route === 'home' && !!document.querySelector('.home-grid')));
  check('your club is red + bold in the top bar', await S(() => getComputedStyle(document.querySelector('#tb-club .tb-name')).fontWeight >= 700 && document.querySelector('#tb-club .tb-name').classList.contains('me')));
  const routes = ['inbox', 'squad', 'tactics', 'fixtures', 'competitions', 'league/0', 'league/4/results', 'league/6/stats', 'cup/champions', 'cup/coppaitalia/scorers',
    'club/5', 'club/5/squad', 'transfers', 'transfers/history', 'finances', 'board', 'jobs', 'stats', 'honours/totals', 'career', 'saves', 'help'];
  let empty = [];
  for (const r of routes) { await go(r); const ok = await S(() => document.querySelector('#view').textContent.trim().length > 30 && !/Something went wrong/.test(document.querySelector('#view').textContent)); if (!ok) empty.push(r); }
  check('every page renders', empty.length === 0, empty.join(', '));

  console.log('\nTactics');
  await go('tactics');
  const before = await S(() => window.SIMSOC_TEST.state().selection.xi.slice());
  await click('.slot[data-slot="1"]');
  await click('.plist .prow[data-kind="res"]:not(.na)');
  const after = await S(() => ({ xi: window.SIMSOC_TEST.state().selection.xi.slice(), auto: window.SIMSOC_TEST.state().tactics.autoPick }));
  check('swapping a reserve into the XI changes the line-up', after.xi[1] !== before[1] && after.xi.length === 11);
  check('a manual change turns off assistant team selection', after.auto === false);
  await click('[data-act="tacFormation"][data-v="352"]');
  check('formation switch to 3-5-2', await S(() => window.SIMSOC_TEST.state().selection.formation === '352'));
  await click('[data-act="tacMent"][data-v="1"]');
  check('mentality set to attacking', await S(() => window.SIMSOC_TEST.state().tactics.mentality === 1));
  await click('[data-act="tacAuto"][data-v="fresh"]');
  check('Pick Fresh XI fills eleven', await S(() => window.SIMSOC_TEST.state().selection.xi.filter(x => x != null).length === 11));

  console.log('\nTransfers, sales, loans');
  await S(() => { const s = window.SIMSOC_TEST.state(); s.clubs[s.userClub].balance = 5e6; });
  const n0 = await S(() => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].players.length);
  await go('transfers');
  await click('[data-act="bid"]:not([disabled])');
  await confirmModal();
  const n1 = await S(() => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].players.length);
  check('signing a player from the market', n1 === n0 + 1, n0 + ' -> ' + n1);
  const pid = await S(() => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].players[3].id);
  await go('player/' + pid);
  const bal0 = await S(() => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].balance);
  await click('[data-act="sellPlayer"]');
  await confirmModal();
  const sold = await S(id => { const s = window.SIMSOC_TEST.state(); return !s.clubs[s.userClub].players.some(p => p.id === id); }, pid);
  check('selling from the player page is instant', sold && await S(b => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].balance > b, bal0));
  await go('finances');
  await page.$eval('#loan-amt', el => { el.value = '100000'; });
  await click('[data-act="loan"][data-v="borrow"]');
  check('taking a bank loan', await S(() => window.SIMSOC_TEST.state().debt === 100000));

  console.log('\nInbox actions');
  await S(() => {
    const s = window.SIMSOC_TEST.state(), E = window.SimSocEngine, p = s.clubs[s.userClub].players[0], buyer = s.divisions[0].members[0];
    s.clubs[buyer].balance = 1e9;
    s.offers.push({ id: 777, playerId: p.id, club: buyer, amount: p.value * 2, expires: s.day + 5, done: false });
    E.mail(s, { cat: 'transfer', from: s.clubs[buyer].name, subject: 'Test bid', body: 'A bid.', actions: [{ label: 'Accept', cmd: 'acceptBid', args: { offer: 777 } }, { label: 'Reject', cmd: 'rejectBid', args: { offer: 777 } }] });
    window._bidPlayer = p.id;
  });
  await go('inbox');
  await click('.msg');
  await click('[data-act="inboxAct"][data-idx="0"]');
  check('accepting a bid from the inbox sells the player', await S(() => { const s = window.SIMSOC_TEST.state(); return !s.clubs[s.userClub].players.some(p => p.id === window._bidPlayer); }));

  console.log('\nLive match');
  await go('home');
  await page.keyboard.press('Space'); await sleep(900);
  check('Continue / Space opens the match preview', await S(() => window.SimUI.route === 'match' && !!document.querySelector('[data-act="mtKick"]')));
  check('the assistant offers a recommendation', await S(() => document.querySelectorAll('.mentality-table .row-m').length === 5));
  await click('[data-act="mtKick"]'); await sleep(400);
  check('kick off shows the 2D pitch', await S(() => !!document.querySelector('#pitch-canvas') && !!document.querySelector('#mt-score')));
  await click('[data-act="mtSpeed"][data-v="8"]');
  for (let i = 0; i < 30; i++) { const m = await S(() => window.SimUI.route === 'match' && document.querySelector('#mt-clock') ? parseInt(document.querySelector('#mt-clock').textContent, 10) || 0 : 0); if (m >= 8) break; await sleep(100); }
  await click('[data-act="mtLiveMent"][data-v="-1"]');
  check('changing mentality during the match', await S(() => document.querySelector('#mt-ment .on').dataset.v === '-1'));
  await click('[data-act="mtSubs"]');
  await confirmModal();
  check('making a substitution', await S(() => /2 left/.test(document.querySelector('#mt-subs').textContent)));
  for (let i = 0; i < 60; i++) { if (await page.$('.talk-opts')) break; await sleep(150); }
  check('half-time stops for the team talk', !!(await page.$('.talk-opts')));
  await click('.talk-opts [data-v="demand"]');
  check('the team talk resumes the match', await S(() => !document.querySelector('.talk-opts')));
  await click('[data-act="mtSkip"]'); await sleep(500);
  check('skip to full time shows the summary', await S(() => /FULL TIME|AFTER EXTRA TIME/.test(document.querySelector('.scorebar').textContent) && !!document.querySelector('[data-act="mtDone"]')));
  const played1 = await S(() => window.SIMSOC_TEST.state().record.P);
  await page.keyboard.press('Space'); await sleep(500);
  check('Continue goes to the results round-up', await S(() => window.SimUI.route === 'roundup'));
  await page.keyboard.press('Space'); await sleep(400);
  await page.keyboard.press('Space'); await sleep(900);
  if (await S(() => window.SimUI.route === 'review')) { await page.keyboard.press('Space'); await sleep(900); }
  await click('[data-act="mtKick"]'); await sleep(600);
  await go('squad'); await sleep(300);
  check('leaving a live match lets the assistant finish it', await S(p => window.SIMSOC_TEST.state().record.P === p + 1, played1));

  console.log('\nWalkover');
  await S(() => { const s = window.SIMSOC_TEST.state(); s.clubs[s.userClub].players.forEach((p, i) => { if (i > 4) { p.injuredFor = 4; p.injured = true; } }); });
  await go('home'); await page.keyboard.press('Space'); await sleep(900);
  if (await S(() => window.SimUI.route === 'review')) { await page.keyboard.press('Space'); await sleep(900); }
  check('fewer than 8 fit players: walkover offered', await S(() => !!document.querySelector('[data-act="mtForfeit"]')));
  await click('[data-act="mtForfeit"]'); await sleep(300);
  check('walkover recorded 0-3', await S(() => /WALKOVER/.test(document.querySelector('.scorebar').textContent)));
  await S(() => { const s = window.SIMSOC_TEST.state(); s.clubs[s.userClub].players.forEach(p => { p.injuredFor = 0; p.injured = false; }); });
  await page.keyboard.press('Space'); await sleep(400);

  console.log('\nSaves');
  await go('saves'); await sleep(300);
  await click('[data-act="slotSave"][data-v="slot1"]'); await sleep(400);
  const club = await S(() => window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].name);
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' }); await sleep(700);
  check('reloading shows the title with Continue career', !!(await page.$('[data-act="loadAuto"]')));
  await go('load'); await sleep(500);
  await click('[data-act="slotLoad"][data-v="slot1"]'); await sleep(700);
  check('loading slot 1 restores the career', await S(c => window.SimUI.route === 'home' && window.SIMSOC_TEST.state().clubs[window.SIMSOC_TEST.state().userClub].name === c, club));

  console.log('\nResponsive');
  await page.setViewport({ width: 390, height: 844 });
  let overflow = [];
  for (const r of ['home', 'squad', 'tactics', 'transfers', 'league/3', 'finances', 'inbox']) { await go(r); const ov = await S(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (ov > 1) overflow.push(r + ':' + ov); }
  check('no horizontal page overflow on a phone', overflow.length === 0, overflow.join(' '));

  check('no console or page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log('\n' + (failures ? failures + ' UI CHECK(S) FAILED' : 'ALL ' + checks + ' UI CHECKS PASSED'));
  await browser.close();
  server.close && server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
