// Renders risorse/icona.svg into every icon and launch image the web app and the iOS project need.
// Needs Playwright with Chromium on the machine: node scripts/icone.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const radice = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(radice, 'risorse', 'icona.svg'), 'utf8');
const figura = svg.replace(/<rect width="1024" height="1024"[^>]*\/>/, '');

const ICONE = [
  ['public/icone/icona-180.png', 180],
  ['public/icone/icona-192.png', 192],
  ['public/icone/icona-512.png', 512],
  ['store/icona-1024.png', 1024],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024],
];
const LANCIO = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']
  .map((f) => `ios/App/App/Assets.xcassets/Splash.imageset/${f}`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const scatta = async (file, lato, html) => {
    await page.setViewportSize({ width: lato, height: lato });
    await page.setContent(`<body style="margin:0;background:#07070c">${html}</body>`);
    const dest = path.join(radice, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    // JPEG-free, alpha-free PNG: the page is opaque and omitBackground stays off.
    await page.screenshot({ path: dest, omitBackground: false });
  };
  for (const [file, lato] of ICONE) {
    await scatta(file, lato, `<div style="width:${lato}px;height:${lato}px">${svg}</div>`);
  }
  // Launch image: the moon alone, centred on the night background.
  const lancio = `<div style="width:2732px;height:2732px;display:grid;place-items:center"><div style="width:620px;height:620px">${figura}</div></div>`;
  for (const file of LANCIO) await scatta(file, 2732, lancio);
  await browser.close();
  console.log(`Icone: ${ICONE.length} · immagini di lancio: ${LANCIO.length}`);
})();
