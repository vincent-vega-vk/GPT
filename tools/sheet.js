/* foglio di contatto: node tools/sheet.js <nome> '<json list>' cols cw ch */
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const [name, json, cols, cw, ch] = process.argv.slice(2);
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1920, height: 1100 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await page.goto('file://' + path.resolve(__dirname, 'preview.html')); await page.waitForTimeout(300);
  await page.evaluate(([l, c, w, h]) => window.sheet(JSON.parse(l), +c, +w, +h), [json, cols, cw, ch]);
  await (await page.$('#sheet')).screenshot({ path: `${OUT}/${name}.png` });
  console.log(errs.length ? 'ERRORS ' + errs.join('\n') : 'ok'); await browser.close();
})();
