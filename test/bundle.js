/*
 * Checks the single-file build (tools/bundle.js) the two ways players use it:
 *  1. opened from disk (file://): a career starts, a match is played live on
 *     the pitch, the autosave survives a reload and loads again;
 *  2. hosted: the body-only fragment inside a skeleton like a hosted viewer's
 *     (its own <head>, light colour scheme, safe-area padding, a reset) in a
 *     sandboxed cross-origin iframe - the dark theme wins, the shell fills the
 *     frame, hash navigation, the keyboard, a quick result and the save round
 *     trip still work.
 *   npm run test:bundle    (CHROME=/path/to/chrome to choose the browser)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');
const { build } = require('../tools/bundle.js');
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

/* ---- the files under test ------------------------------------------------ */
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'simsoc6-bundle-'));
const PORT_HOST = 8101, PORT_PAGE = 8102;
fs.writeFileSync(path.join(DIR, 'simsoc6.html'), build());
fs.writeFileSync(path.join(DIR, 'hosted.html'),
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif;background:#f6f6f3}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n' +
  build({ fragment: true }) + '</body></html>');
fs.writeFileSync(path.join(DIR, 'host.html'),
  '<!doctype html><html><body style="margin:0"><iframe id="f" src="http://localhost:' + PORT_PAGE + '/hosted.html" ' +
  'sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" style="border:0;width:100vw;height:100vh"></iframe></body></html>');
function serve(port) {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
      const f = path.join(DIR, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
    });
    s.listen(port, () => resolve(s));
  });
}

(async () => {
  const servers = [await serve(PORT_HOST), await serve(PORT_PAGE)];
  const browser = await puppeteer.launch({ headless: 'new', executablePath: chromePath(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 860 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  /* ---- 1. from disk -------------------------------------------------------- */
  console.log('\nSingle file opened from disk (file://)');
  const S = (fn, ...a) => page.evaluate(fn, ...a);
  const click = async sel => { await page.$eval(sel, el => el.click()); await sleep(250); };
  await page.goto('file://' + path.join(DIR, 'simsoc6.html'), { waitUntil: 'load' });
  await sleep(600);
  check('the title screen appears', await S(() => !!document.querySelector('[data-go="new"]') && document.title === 'SIMSOC 6 Manager'));
  await click('[data-go="new"]');
  await click('.club-card');
  await click('[data-act="newStart"]');
  await sleep(400);
  check('a career starts on the home page', await S(() => window.SimUI.route === 'home' && !!document.querySelector('.home-grid')));
  await page.keyboard.press('Space'); await sleep(900);
  check('Space opens the match preview', await S(() => window.SimUI.route === 'match' && !!document.querySelector('[data-act="mtKick"]')));
  await click('[data-act="mtKick"]'); await sleep(500);
  check('the live match draws the pitch', await S(() => { const c = document.querySelector('#pitch-canvas'); return !!c && c.width > 100 && c.height > 50 && !!document.querySelector('#mt-score'); }));
  await click('[data-act="mtSpeed"][data-v="8"]');
  for (let i = 0; i < 80; i++) { if (await page.$('.talk-opts')) break; await sleep(150); }
  check('half time stops for the team talk', !!(await page.$('.talk-opts')));
  await click('.talk-opts [data-v="encourage"]');
  await click('[data-act="mtSkip"]'); await sleep(500);
  check('full time', await S(() => /FULL TIME|AFTER EXTRA TIME/.test(document.querySelector('.scorebar').textContent)));
  await page.keyboard.press('Space'); await sleep(500);
  await page.keyboard.press('Space'); await sleep(500);
  await S(() => window.SIMSOC_TEST.advance(3));
  const played = await S(() => window.SIMSOC_TEST.state().record.P);
  check('four matches played', played === 4, played);
  await S(() => window.SIMSOC_TEST.save()); await sleep(600);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  check('after a reload the title offers to continue the career', await S(() => !!document.querySelector('[data-act="loadAuto"]')));
  await page.keyboard.press('Space'); await sleep(700);
  check('Space continues the career from the autosave', await S(p => window.SimUI.route === 'home' && window.SIMSOC_TEST.state().record.P === p, played));

  /* ---- 2. hosted in a sandboxed cross-origin frame ------------------------- */
  console.log('\nFragment hosted in a sandboxed cross-origin iframe');
  let frame = null;
  const F = (fn, ...a) => frame.evaluate(fn, ...a);
  const fclick = async sel => { await frame.$eval(sel, el => el.click()); await sleep(250); };
  async function findFrame() {
    for (let i = 0; i < 60; i++) {
      frame = page.frames().find(f => f.url().indexOf('hosted.html') >= 0) || null;
      if (frame) { try { if (await F(() => !!window.SimUI && document.querySelector('#view').textContent.length > 0)) return; } catch (e) { /* not ready */ } }
      await sleep(150);
    }
  }
  await page.goto('http://localhost:' + PORT_HOST + '/host.html', { waitUntil: 'load' });
  await findFrame();
  check('the page boots inside the host frame', !!frame && await F(() => !!document.querySelector('[data-go="new"]')));
  check('the game\'s dark theme wins over the host\'s light reset', await F(() => getComputedStyle(document.body).backgroundColor === 'rgb(13, 18, 28)'));
  check('the shell fills the frame without scrolling the page', await F(() => document.documentElement.scrollWidth <= innerWidth + 1 && Math.abs(document.getElementById('app').getBoundingClientRect().height - innerHeight) < 3));
  await fclick('[data-go="new"]');
  await fclick('.club-card');
  await fclick('[data-act="newStart"]');
  await sleep(400);
  check('a career starts', await F(() => window.SimUI.route === 'home' && !!document.querySelector('.home-grid')));
  await F(() => { location.hash = '#/squad'; }); await sleep(300);
  check('hash navigation works in the frame', await F(() => window.SimUI.route === 'squad' && document.querySelectorAll('#view tr').length > 10));
  await F(() => window.SimUI.go('league/0', true)); await sleep(300);
  check('replaceState navigation works in the frame', await F(() => window.SimUI.route === 'league' && document.querySelectorAll('#view tr').length > 10));
  await F(() => window.SimUI.go('home')); await sleep(300);
  await frame.click('#tb-date');                                   // a plain click gives the frame the keyboard focus
  await page.keyboard.press('Space'); await sleep(900);
  check('the keyboard reaches the game inside the frame', await F(() => window.SimUI.route === 'match' && !!document.querySelector('[data-act="mtQuick"]')));
  await fclick('[data-act="mtQuick"]'); await sleep(500);
  check('quick result', await F(() => /FULL TIME|AFTER EXTRA TIME/.test(document.querySelector('.scorebar').textContent) && window.SIMSOC_TEST.state().record.P === 1));
  await F(() => window.SIMSOC_TEST.save()); await sleep(600);
  await page.reload({ waitUntil: 'load' });
  await findFrame(); await sleep(300);
  check('the autosave survives a reload of the host', !!frame && await F(() => !!document.querySelector('[data-act="loadAuto"]')));
  await fclick('[data-act="loadAuto"]'); await sleep(500);
  check('the career loads again', await F(() => window.SimUI.route === 'home' && window.SIMSOC_TEST.state().record.P === 1));
  check('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  servers.forEach(s => s.close());
  fs.rmSync(DIR, { recursive: true, force: true });
  console.log('\n' + (failures ? failures + ' of ' + checks + ' BUNDLE CHECKS FAILED' : 'ALL ' + checks + ' BUNDLE CHECKS PASSED'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
