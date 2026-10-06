const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const SCR = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  // 1) file singolo
  // 2) frammento dentro uno scheletro come quello della pubblicazione
  const frag = fs.readFileSync(path.join(SCR, 'artifact.html'), 'utf8');
  const wrapped = path.join(SCR, 'artifact-wrapped.html');
  fs.writeFileSync(wrapped, '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui;background:#fafafa}[hidden]{display:none!important}</style></head><body>' + frag + '</body></html>');
  for (const [name, file] of [['dist', path.resolve('dist/super-rigori.html')], ['frammento', wrapped]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CERT|ERR_NAME|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.goto('file://' + file); await page.waitForTimeout(800);
    const title = await page.title();
    await page.click('#b-new'); await page.click('.tcard[data-c="JPN"]'); await page.click('#b-ok'); await page.waitForTimeout(400);
    await page.click('#b-go'); await page.waitForTimeout(300); await page.click('#b-play');
    await page.waitForTimeout(2800);
    const ph = await page.evaluate(() => PK.Game.match && PK.Game.match.phase);
    console.log(name, '| title:', title, '| fase partita:', ph, '|', errs.length ? errs.join(' / ') : 'nessun errore');
    if (name === 'frammento') await page.screenshot({ path: path.join(SCR, 'd_fragment.png') });
    await page.close();
  }
  await browser.close();
})();
