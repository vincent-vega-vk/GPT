/* Test di robustezza UI: policy casuali, modalità "senza rete" e "pressione", squalifica, abbandono,
   interludi, modali, tema, overflow su mobile per ogni schermata.
   Uso: node tests/robust.mjs */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { driveForecast, driveClosing } from './lib-ui.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (e) { /* next */ } }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'dist', 'closer.html')).href;

const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) errors.push('FAIL: ' + msg); };

async function newPage(viewport, seed) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  await page.goto(url);
  await page.waitForFunction(() => window.CL && CL.booted);
  await page.evaluate(() => { CL.ui.settings.fast = true; });
  return page;
}
const screen = (p) => p.evaluate(() => CL.ui.S.screen);
const noText = async (p, label) => {
  const bad = await p.evaluate(() => /\[object |(^|\s)null(\s|$)|undefined|NaN/.test(document.getElementById('app').innerText));
  ok(!bad, `${label}: testo sospetto (null/undefined/NaN/[object])`);
};
const noOverflow = async (p, label) => {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(o <= 1, `${label}: overflow orizzontale di ${o}px`);
};

async function playDealKeys(p, pol) {
  let guard = 0;
  while ((await screen(p)) === 'play' && guard++ < 120) {
    const act = await p.evaluate((pol_) => {
      const S = CL.ui.S;
      if (S.phase === 'reveal' || S.phase === 'react') return { wait: true };
      if (S.phase === 'intro' || S.phase === 'feedback') return { next: true };
      if (S.phase !== 'choose') return { wait: true };
      const ok_ = S.order.map((o, i) => ({ o, i })).filter((x) => !x.o.locked);
      const pool = pol_ === 'random' ? ok_ : ok_.filter((x) => !x.o.c.jolly).sort((a, b) => b.o.c.q - a.o.c.q);
      return { i: (pol_ === 'random' ? pool[Math.floor(Math.random() * pool.length)] : pool[0]).i };
    }, pol);
    if (act.wait) await p.waitForTimeout(30);
    else if (act.next) await p.keyboard.press('Enter');
    else await p.keyboard.press(String(act.i + 1));
  }
}

async function playQuarter(p, pol, label) {
  await p.evaluate(() => CL.ui.go('home'));
  await p.getByRole('button', { name: /Inizia il trimestre/ }).first().click();
  await p.getByRole('button', { name: 'Apri la pipeline' }).click();
  for (let guard = 0; guard < 60; guard++) {
    const sc = await screen(p);
    await noText(p, `${label}/${sc}`);
    if (sc === 'summary') break;
    if (sc === 'forecast') { await driveForecast(p, pol === 'random' ? 'random' : 'honest'); continue; }
    if (sc === 'closing') { await driveClosing(p); continue; }
    if (sc === 'event') {
      const n = await p.locator('.choice').count();
      await p.locator('.choice').nth(Math.floor(Math.random() * n)).click();
      await noText(p, `${label}/event-fb`);
      await p.getByRole('button', { name: 'Continua', exact: true }).click();
      continue;
    }
    if (sc === 'pipeline') {
      const next = await p.evaluate(() => {
        const run = CL.ui.S.run;
        const ready = CL.scenarios.filter((s) => CL.avail(run, s).state === 'ready');
        if (ready.length) return { id: ready[Math.floor(Math.random() * ready.length)].id };
        return { wait: CL.canWaitForAny(run) };
      });
      if (next.id) {
        await p.evaluate((id) => CL.ui.dealModal(CL.getScenario(id)), next.id);
        await p.getByRole('button', { name: /Avvia la trattativa/ }).click();
        await playDealKeys(p, pol);
        await p.waitForFunction(() => CL.ui.S.screen === 'debrief');
        await noText(p, `${label}/debrief`);
        await p.getByRole('button', { name: 'Prosegui', exact: true }).click();
      } else if (next.wait) await p.getByRole('button', { name: /Aspetta una settimana/ }).click();
      else { await p.getByRole('button', { name: 'Chiudi il trimestre' }).first().click(); await p.getByRole('button', { name: 'Chiudi il trimestre' }).last().click(); }
    }
  }
  await p.waitForFunction(() => CL.ui.S.screen === 'summary');
  await noText(p, `${label}/summary`);
}

/* 1) quarti completi con policy casuale, su desktop */
const p1 = await newPage({ width: 1280, height: 900 }, 7);
for (let i = 0; i < 4; i++) await playQuarter(p1, 'random', `random#${i}`);
ok(true, 'trimestri casuali completati');

/* 2) modalità senza rete + pressione */
await p1.evaluate(() => { CL.ui.settings.hard = true; CL.ui.settings.timer = true; });
await p1.evaluate(() => CL.ui.go('home'));
await p1.getByRole('button', { name: /Inizia il trimestre/ }).first().click();
await p1.getByRole('button', { name: 'Apri la pipeline' }).click();
await p1.evaluate(() => { CL.getScenario('farmavita').nodes.n1.t = 0.4; CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario('farmavita')); });
const hardMask = await p1.locator('.hardmask').count();
ok(hardMask === 1, 'senza rete: cruscotto nascosto');
ok((await p1.locator('.ring').count()) === 0, 'senza rete: nessuna probabilità visibile');
await p1.waitForFunction(() => CL.ui.S.phase === 'choose' || CL.ui.S.phase === 'react' || CL.ui.S.phase === 'feedback');
ok((await p1.locator('.timer').count()) + (await p1.evaluate(() => CL.ui.S.run.timeouts)) >= 1, 'pressione: timer visibile o già scaduto');
/* simula la scadenza del timer */
const before = 0;
await p1.waitForFunction(() => CL.ui.S.phase === 'feedback', null, { timeout: 8000 });
const after = await p1.evaluate(() => CL.ui.S.run.timeouts);
ok(after === before + 1, 'pressione: la scadenza conta come decisione d’istinto');
await noText(p1, 'hard+timer feedback');
await p1.evaluate(() => { CL.ui.settings.hard = false; CL.ui.settings.timer = false; });

/* 3) squalifica del deal zombie (allenamento e trimestre) */
await p1.evaluate(() => { CL.ui.startCareer(); CL.ui.go('pipeline'); CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario('logistica')); });
await p1.waitForFunction(() => CL.ui.S.phase === 'choose');
await p1.evaluate(() => { const i = CL.ui.S.order.findIndex((o) => o.c.next === 'DQ'); CL.ui.playKey(i); });
await p1.waitForFunction(() => CL.ui.S.phase === 'feedback');
await p1.keyboard.press('Enter');
await p1.waitForFunction(() => CL.ui.S.screen === 'debrief');
ok(await p1.evaluate(() => CL.ui.S.res.status === 'disq'), 'squalifica: esito disq');
ok(await p1.evaluate(() => CL.energy(CL.ui.S.run) === 12 - 1), 'squalifica: costa 1 settimana (recuperate 2)');
await noText(p1, 'debrief disq');

/* 4) abbandono di una trattativa */
await p1.getByRole('button', { name: 'Prosegui', exact: true }).click().catch(() => {});
await p1.evaluate(() => { if (CL.ui.S.screen !== 'pipeline') CL.ui.go('pipeline'); });
await p1.evaluate(() => { CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario('brenta')); });
await p1.getByRole('button', { name: 'Esci dalla trattativa' }).click();
await p1.getByRole('button', { name: /Abbandona/ }).click();
await p1.waitForFunction(() => CL.ui.S.screen === 'debrief');
ok(await p1.evaluate(() => CL.ui.S.res.status === 'lost' && CL.ui.S.res.forfeited), 'abbandono: deal perso');
await noText(p1, 'debrief forfeit');

/* 5) modali: Esc, how-to, record */
await p1.evaluate(() => CL.ui.go('home'));
await p1.getByRole('button', { name: 'Come si gioca' }).first().click();
ok((await p1.locator('.modal').count()) === 1, 'modale regole aperta');
await p1.keyboard.press('Escape');
ok((await p1.locator('.modal').count()) === 0, 'Esc chiude la modale');
await p1.getByRole('button', { name: 'Record e badge' }).click();
ok((await p1.locator('.modal').count()) === 1, 'modale record aperta');
await noText(p1, 'records modal');
await p1.keyboard.press('Escape');

/* 6) tema */
const t0 = await p1.evaluate(() => document.documentElement.getAttribute('data-theme'));
await p1.getByRole('button', { name: /Tema/ }).click();
const t1 = await p1.evaluate(() => document.documentElement.getAttribute('data-theme'));
ok(t0 !== t1, 'il tema cambia');

/* 7) mobile: nessun overflow su tutte le schermate */
const pm = await newPage({ width: 360, height: 740 }, 3);
await noOverflow(pm, 'home');
await pm.evaluate(() => { CL.ui.startCareer(); });
await noOverflow(pm, 'briefing');
await pm.evaluate(() => CL.ui.go('pipeline'));
await noOverflow(pm, 'pipeline');
await pm.evaluate(() => CL.ui.dealModal(CL.getScenario('terrasole')));
await noOverflow(pm, 'deal modal');
await pm.keyboard.press('Escape');
const ids = await pm.evaluate(() => CL.scenarios.map((s) => s.id));
for (const id of ids) {
  await pm.evaluate((i) => { CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario(i)); }, id);
  await pm.waitForFunction(() => CL.ui.S.phase === 'choose');
  await noOverflow(pm, 'play ' + id);
  await pm.evaluate(() => CL.ui.playKey(0));
  await pm.waitForFunction(() => CL.ui.S.phase === 'feedback');
  await noOverflow(pm, 'feedback ' + id);
  await noText(pm, 'play ' + id);
  await pm.evaluate(() => { CL.ui.S.dash.el.classList.add('open'); });
  await noOverflow(pm, 'dash open ' + id);
}
await pm.evaluate(() => CL.ui.startDojo());
await noOverflow(pm, 'dojo');
await pm.keyboard.press('1');
await noOverflow(pm, 'dojo feedback');
await pm.evaluate(() => { const S = CL.ui.S; S.run = CL.newRun({ mode: 'career' }); S.run.results.push({ id: 'x', title: 'X', client: 'Y', status: 'won', acv: 400, disc: 5, p: .8, avgQ: 2, mp: 5, listFinal: 420, flags: {}, hasE: true, hasC: true }); S.run.closing = []; CL.ui.endQuarter(); });
await noOverflow(pm, 'summary');
await noText(pm, 'summary mobile');

await browser.close();
console.log(`Controlli: ${checks}`);
if (errors.length) { console.error('PROBLEMI:\n' + errors.join('\n')); process.exit(1); }
console.log('Robustezza ok');
