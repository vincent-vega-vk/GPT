// App Store screenshots (6.9", 1320 × 2868) taken from the built web app.
// Needs Playwright with Chromium and a running preview: npm run build && npm run preview
// then: node scripts/schermate.cjs [http://localhost:4173/]
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const url = process.argv[2] || 'http://localhost:4173/';
const dir = path.join(__dirname, '..', 'store', 'schermate');
const SEGNO = 4; // Leone

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    locale: 'it-IT', timezoneId: 'Europe/Rome',
  });
  const page = await ctx.newPage();
  // Same insets as an iPhone with Dynamic Island, so the layout matches the real device.
  const margini = () => page.addStyleTag({ content: ':root{--sopra:62px!important;--sotto:34px!important}' });
  const scatta = async (nome) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(dir, nome) });
  };

  await page.goto(url);
  await margini();
  await scatta('5-segni.png');
  await page.click(`[data-azione="scegli-segno"][data-segno="${SEGNO}"]`);
  await page.waitForSelector('#scontrino');
  await scatta('1-oggi.png');
  await page.evaluate(() => {
    const v = document.querySelector('#vista');
    v.scrollTop = document.querySelector('.pannello').offsetTop - v.offsetTop - 12;
  });
  await scatta('2-bastardometro.png');
  await page.click('[data-scheda="coppia"]');
  await scatta('3-coppia.png');
  await page.click('[data-scheda="cielo"]');
  await scatta('4-cielo.png');
  await browser.close();
  console.log(`Schermate salvate in ${dir}`);
})();
