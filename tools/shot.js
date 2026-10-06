/* Screenshot di scene di prova: node tools/shot.js  -> /tmp/.../scratch/*.png */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-GPT/4f84b9e1-f814-59bf-a155-0a30802c06e3/scratchpad';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'preview.html'));
  const scenes = JSON.parse(process.argv[2] || '[]');
  for (const [name, opts] of scenes) {
    await page.evaluate((o) => window.render(o), opts);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('saved', name);
  }
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
  await browser.close();
})();
