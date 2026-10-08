/* Anteprima visiva di uno scenario: gioca una trattativa e scatta screenshot a ogni passaggio (intro, scena, scelta, reazione, feedback).
   Carica direttamente src/index.html (nessuna build necessaria).
   Uso: node tests/preview.mjs --sc=farmavita --out=<cartella> [--policy=best|random|q0] [--dark] [--mobile] [--seed=N]
                              [--wild=<id>]   forza un imprevisto (id scenario o generico) alla prima occasione
                              [--shocks]      scatta una scheda per ogni shock dello scenario (colpito/protetto)
                              [--hud]         scatta il cruscotto con i widget a stato iniziale e a stato ricco
                              [--fc]          stampa le sfide di forecast possibili per lo scenario (testo) */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch (e) { /* next */ } }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes('--' + k);
const scId = arg('sc', 'farmavita'), out = arg('out', path.join(root, '..', '.preview')), policy = arg('policy', 'best'), seed = Number(arg('seed', '3'));
fs.mkdirSync(out, { recursive: true });
const dark = flag('dark'), mobile = flag('mobile');

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|net::/.test(m.text())) errors.push('console: ' + m.text()); });
await page.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
await page.goto(pathToFileURL(path.join(root, 'src', 'index.html')).href);
await page.waitForFunction(() => window.CL && CL.booted);
let n = 0;
const shot = async (label, full = true) => { const f = path.join(out, `${scId}-${String(++n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f, fullPage: full }); console.log(f); };
const settle = (ms = 250) => page.waitForTimeout(ms);

if (flag('fc')) {
  const txt = await page.evaluate((id) => {
    const sc = CL.getScenario(id), lines = [];
    const run = CL.newRun({ mode: 'career', seed: 5 }), rnd = run.rnd;
    const states = [['iniziale', CL.newDeal(sc, {})], ['ricco', (() => { const d = CL.newDeal(sc, {}); CL.MP.forEach((m) => d.mp.add(m.k)); Object.keys(d.m).forEach((k) => { d.m[k] = k === 'risk' ? 15 : 85; }); return d; })()]];
    states.forEach(([label, d]) => {
      const res = CL.seal(d); res.week = 6; run.results = [res];
      lines.push('=== stato ' + label + ' · p=' + Math.round(res.p * 100) + '% · verità: ' + CL.truthCat(res.p));
      ['commit', 'best', 'pipe'].forEach((cat) => {
        const entries = CL.fcEntries(run, 'final'); entries.forEach((e) => { e.cat = cat; });
        const chs = CL.fcBuild(run, entries, 'final', rnd).filter((c) => c.entry);
        chs.forEach((c) => { lines.push(`-- chiamata ${cat} · tipo ${c.type}${c.gap ? ' · gap ' + c.gap : ''}`); lines.push('   MARTA: ' + c.q); c.opts.forEach((o) => lines.push(`   [${o.id}] ${o.t}`)); });
      });
    });
    return lines.join('\n');
  }, scId);
  console.log(txt);
}

if (flag('hud') || flag('shocks')) {
  await page.evaluate((id) => { CL.ui.startTrain(); CL.ui.S.skipIntro = true; CL.ui.startDeal(CL.getScenario(id)); }, scId);
  await settle(600);
}
if (flag('hud')) {
  await shot('hud-iniziale');
  await page.evaluate(() => { const d = CL.ui.S.deal; CL.MP.forEach((m) => d.mp.add(m.k)); Object.keys(d.m).forEach((k) => { d.m[k] = k === 'risk' ? 15 : 85; }); Object.keys(d.sc.start.flags || {}).forEach(() => {}); const src = JSON.stringify(d.sc, (k, v) => (typeof v === 'function' ? v.toString() : v)); (src.match(/flags\.(\w+)/g) || []).forEach((m) => { d.flags[m.slice(6)] = true; }); CL.ui.S.dash.update(null, null); });
  await settle(300);
  await shot('hud-ricco');
}
if (flag('shocks')) {
  await page.evaluate((id) => {
    const sc = CL.getScenario(id), host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:var(--bg);overflow:auto;padding:20px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));align-content:start';
    const mkd = (rich) => { const d = CL.newDeal(sc, {}); if (rich) { CL.MP.forEach((m) => d.mp.add(m.k)); Object.keys(d.m).forEach((k) => { d.m[k] = k === 'risk' ? 15 : 85; }); const src = JSON.stringify(sc, (k, v) => (typeof v === 'function' ? v.toString() : v)); (src.match(/flags\.(\w+)/g) || []).forEach((m) => { d.flags[m.slice(6)] = true; }); } return d; };
    (sc.shocks || []).concat(CL.shocksGeneric || []).forEach((s) => [false, true].forEach((rich) => { const d = mkd(rich); const hit = s.hit ? !!s.hit(d) : true; const dp = hit ? s.dp : (s.dpProt != null ? s.dpProt : 0); host.appendChild(CL.ui.shockCard({ id: s.id, title: s.title, kind: s.kind, hit, dp, text: hit ? s.hitText : s.protText }, sc)); }));
    document.body.appendChild(host);
  }, scId);
  await settle(300);
  await shot('shock-cards', false);
}

if (!flag('hud') && !flag('shocks') && !flag('fc')) {
  /* una trattativa intera */
  if (arg('wild', '')) await page.evaluate((w) => { const orig = CL.rollWild; let used = false; CL.rollWild = (d, rnd, o) => { if (used || d.wild || d.over) return false; const pool = CL.wildPool(d); const hit = pool.find((x) => x.w.id === w) || null; if (!hit) return orig(d, rnd, Object.assign({}, o, { pWild: 0 })); used = true; d.wild = { id: hit.w.id, title: hit.w.title, node: hit.w.node, generic: hit.generic }; d.wildCount++; d.wildUsed[hit.key] = 1; return true; }; }, arg('wild', ''));
  await page.evaluate((id) => { CL.ui.settings.fast = false; CL.ui.startTrain(); CL.ui.startDeal(CL.getScenario(id)); }, scId);
  await settle(300);
  const phase = () => page.evaluate(() => CL.ui.S.phase);
  const waitPhase = async (p, ms = 20000) => { await page.waitForFunction((x) => CL.ui.S.phase === x, p, { timeout: ms }); await settle(150); };
  let guard = 0;
  /* intro */
  if (await page.evaluate(() => !!CL.ui.S.sc.intro && CL.ui.S.phase !== 'choose')) {
    await settle(900); await shot('intro-in-corso');
    await page.evaluate(() => CL.ui.skipReveal()); await waitPhase('intro'); await shot('intro-fine');
    await page.evaluate(() => CL.ui.playNext());
  }
  while ((await page.evaluate(() => CL.ui.S.screen)) === 'play' && guard++ < 30) {
    await page.waitForFunction(() => ['reveal', 'choose'].includes(CL.ui.S.phase));
    await settle(500); if ((await phase()) === 'reveal') { await shot('scena-in-corso', false); await page.evaluate(() => CL.ui.skipReveal()); }
    await waitPhase('choose');
    const wild = await page.evaluate(() => !!CL.ui.S.deal.wild);
    await shot(wild ? 'IMPREVISTO-scelta' : 'scelta');
    const idx = await page.evaluate((pol) => {
      const ord = CL.ui.S.order, ok = ord.map((o, i) => ({ o, i })).filter((x) => !x.o.locked && x.o.c.next !== 'DQ');
      const pool = (pol === 'random' ? ok : pol === 'q0' ? ok.slice().sort((a, b) => a.o.c.q - b.o.c.q) : ok.filter((x) => !x.o.c.jolly).sort((a, b) => b.o.c.q - a.o.c.q));
      return pool[0].i;
    }, policy);
    await page.evaluate((i) => CL.ui.playKey(i), idx);
    await settle(400); await shot('reazione-in-corso', false);
    await page.evaluate(() => CL.ui.skipReveal());
    await waitPhase('feedback'); await shot('feedback');
    await page.evaluate(() => CL.ui.playNext());
    await settle(200);
  }
  await page.waitForFunction(() => CL.ui.S.screen === 'debrief'); await settle(900); await shot('debrief');
}
await browser.close();
if (errors.length) { console.error('ERRORI:\n' + errors.join('\n')); process.exit(1); }
console.log('Anteprima ok · ' + n + ' screenshot in ' + out);
