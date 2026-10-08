/* Smoke test end-to-end con Playwright: gioca un intero trimestre, il dojo e l'allenamento.
   Uso: node tests/e2e.mjs [--shots=cartella] [--policy=best|random] [--seed=N]
   Richiede playwright (globale o locale) e un Chromium; usa PLAYWRIGHT_BROWSERS_PATH se presente. */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { driveForecast, driveClosing } from './lib-ui.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
  try { ({ chromium } = require(p)); break; } catch (e) { /* prova il prossimo */ }
}
if (!chromium) { console.error('playwright non trovato'); process.exit(2); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const shots = arg('shots', '');
const policy = arg('policy', 'best');
const seed = Number(arg('seed', '1'));
if (shots) fs.mkdirSync(shots, { recursive: true });

const url = pathToFileURL(path.join(root, 'dist', 'closer.html')).href;
const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });

const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true }); };
const screen = () => page.evaluate(() => CL.ui.S.screen);
const click = (sel) => page.locator(sel).first().click();
const text = (t) => page.getByRole('button', { name: t }).first();

/* RNG deterministico per la policy "random" */
await page.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);

await page.goto(url);
await page.waitForFunction(() => window.CL && CL.booted);
await page.evaluate(() => { CL.ui.settings.fast = true; });
await shot('01-home-light');

/* dark mode */
await page.evaluate(() => { CL.ui.settings.theme = 'dark'; CL.ui.applyTheme(); });
await shot('02-home-dark');
await page.evaluate(() => { CL.ui.settings.theme = 'light'; CL.ui.applyTheme(); });

async function playDeal() {
  let guard = 0;
  while ((await screen()) === 'play' && guard++ < 80) {
    const info = await page.evaluate((pol) => {
      const S = CL.ui.S;
      if (S.phase === 'reveal' || S.phase === 'react') return { wait: true };
      if (S.phase === 'intro') return { next: true };
      if (S.phase === 'choose') {
        const ord = S.order;
        const ok = ord.map((o, i) => ({ o, i })).filter((x) => !x.o.locked);
        let pick;
        if (pol === 'best') {
          const nj = ok.filter((x) => !x.o.c.jolly);
          const pool = (nj.length ? nj : ok).slice().sort((a, b) => b.o.c.q - a.o.c.q);
          pick = pool.find((x) => x.o.c.next !== 'DQ') || pool[0];
        } else pick = ok[Math.floor(Math.random() * ok.length)];
        return { act: 'choose', i: pick.i };
      }
      return { act: 'next' };
    }, policy);
    if (info.wait) { await page.waitForTimeout(40); continue; }
    if (info.act === 'choose') {
      await page.keyboard.press(String(info.i + 1));
      if (guard === 2) await shot('20-play-feedback');
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(30);
  }
}

/* ───── Carriera ───── */
await click('text=Inizia il trimestre');
await page.waitForFunction(() => CL.ui.S.screen === 'briefing');
await shot('03-briefing');
await text('Apri la pipeline').click();
await shot('04-pipeline');

let deals = 0, shotPlay = false, shotDebrief = false;
for (let guard = 0; guard < 40; guard++) {
  const sc = await screen();
  if (sc === 'summary') break;
  if (sc === 'forecast') { await shot('35-forecast-sheet'); await driveForecast(page, policy === 'best' ? 'honest' : 'random'); continue; }
  if (sc === 'closing') { await shot('36-closing'); await driveClosing(page); continue; }
  if (sc === 'event') {
    await shot('30-event');
    await page.locator('.choice').first().click();
    await page.getByRole('button', { name: 'Continua', exact: true }).click();
    continue;
  }
  if (sc === 'pipeline') {
    const next = await page.evaluate(() => {
      const run = CL.ui.S.run;
      const ready = CL.scenarios.filter((s) => CL.avail(run, s).state === 'ready');
      if (ready.length) {
        // preferisci il deal con più valore atteso per costo
        ready.sort((a, b) => b.list / b.cost - a.list / a.cost);
        return { id: ready[0].id };
      }
      return { wait: CL.canWaitForAny(run) };
    });
    if (next.id) {
      await page.evaluate((id) => CL.ui.dealModal(CL.getScenario(id)), next.id);
      await page.getByRole('button', { name: /Ispeziona/ }).click();
      if (deals === 0) await shot('05-dealmodal');
      await page.getByRole('button', { name: /Avvia la trattativa/ }).click();
      deals++;
      await page.waitForFunction(() => CL.ui.S.screen === 'play');
      if (!shotPlay) { shotPlay = true; await shot('10-play'); }
      await playDeal();
      await page.waitForFunction(() => CL.ui.S.screen === 'debrief');
      await page.waitForTimeout(700);
      if (!shotDebrief) { shotDebrief = true; await shot('21-debrief'); }
      await page.getByRole('button', { name: 'Prosegui', exact: true }).click();
      continue;
    }
    if (next.wait) { await page.getByRole('button', { name: /Aspetta una settimana/ }).click(); continue; }
    await page.getByRole('button', { name: 'Chiudi il trimestre' }).first().click();
    await page.getByRole('button', { name: 'Chiudi il trimestre' }).last().click();
    continue;
  }
}
await page.waitForFunction(() => CL.ui.S.screen === 'summary', null, { timeout: 5000 });
await page.waitForTimeout(500);
await shot('40-summary');
const sum = await page.evaluate(() => { const s = CL.ui.S.sum; return { att: s.att, rank: s.rank.name, wins: s.wins, losses: s.losses, dq: s.dq, comm: s.commission, rep: CL.ui.S.run.rep, badges: s.badges }; });
console.log('Trimestre:', JSON.stringify(sum), 'deal giocati:', deals);

/* ───── Dojo ───── */
await page.evaluate(() => CL.ui.go('home'));
await text(/Entra nel dojo/).click();
for (let i = 0; i < 8; i++) {
  await page.waitForFunction(() => CL.ui.S.screen === 'dojo');
  if (i === 0) await shot('50-dojo');
  await page.keyboard.press(String(1 + Math.floor(Math.random() * 4)));
  if (i === 0) { await page.waitForTimeout(450); await shot('51-dojo-fb'); }
  await page.keyboard.press('Enter');
}
await page.waitForFunction(() => CL.ui.S.screen === 'dojoEnd');
await shot('52-dojo-end');

/* ───── Allenamento ───── */
await page.evaluate(() => CL.ui.go('home'));
await page.getByRole('button', { name: 'Allenamento' }).first().click();
await page.waitForFunction(() => CL.ui.S.screen === 'pipeline');
await shot('60-train');
await page.evaluate(() => CL.ui.startDeal(CL.getScenario('logistica')));
await playDeal();
await page.waitForFunction(() => CL.ui.S.screen === 'debrief');
await shot('61-train-debrief');

/* ───── Mobile ───── */
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await m.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
await mp.goto(url);
await mp.waitForFunction(() => window.CL && CL.booted);
const mshot = async (n) => { if (shots) await mp.screenshot({ path: path.join(shots, n + '.png'), fullPage: true }); };
await mshot('70-m-home');
await mp.evaluate(() => { CL.ui.startCareer(); CL.ui.go('pipeline'); });
await mshot('71-m-pipeline');
await mp.evaluate(() => { CL.ui.settings.fast = true; CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario('farmavita')); });
await mp.waitForFunction(() => CL.ui.S.phase === 'choose');
await mshot('72-m-play');
await mp.evaluate(() => CL.ui.playKey(0));
await mp.waitForFunction(() => CL.ui.S.phase === 'feedback');
await mshot('73-m-feedback');
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
if (overflow) errors.push('overflow orizzontale su mobile');

await browser.close();
if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1); }
console.log('E2E ok');
