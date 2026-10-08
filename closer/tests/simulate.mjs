/* Monte Carlo del trimestre: verifica che quota, energia e punteggi premino la competenza.
   Uso: node tests/simulate.mjs [--n=1500] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|10|2\d|3\d)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=1500').split('=')[1]);
const C = CL.CONFIG;

/* policy di scelta all'interno di un deal */
function chooseMove(d, run, pol, rnd) {
  const all = CL.choicesFor(d, run).filter((x) => !x.locked);
  const noDQ = all.filter((x) => x.c.next !== 'DQ');
  let pool;
  if (pol === 'best') {
    const top = Math.max(...all.map((x) => x.c.q));
    pool = all.filter((x) => x.c.q === top);
    const free = pool.filter((x) => !x.c.jolly);
    // spendi un jolly solo se è davvero l'unica via al massimo
    pool = free.length ? free : pool;
  } else if (pol === 'good') pool = noDQ.filter((x) => x.c.q >= 2);
  else if (pol === 'ok') pool = noDQ.filter((x) => x.c.q >= 1);
  else pool = noDQ;
  if (!pool.length) pool = noDQ.length ? noDQ : all;
  return pool[Math.floor(rnd() * pool.length)].c.id;
}

function playDeal(run, sc, pol, rnd) {
  const d = CL.newDeal(sc, CL.dealOpts(run));
  let guard = 0;
  while (!d.over && guard++ < 30) CL.pick(d, chooseMove(d, run, pol, rnd), run);
  const res = CL.finish(d, run, rnd);
  CL.commitDeal(run, sc, res);
  return res;
}

/* pianificatore: ordine ottimale dei deal date finestre e costi (stima p fissa) */
function plan() {
  const est = { logistica: 340 * 0.85 * 0.8, bionova: 320 * 0.92 * 0.9 };
  const val = (sc) => est[sc.id] || sc.list * 0.88 * 0.92;
  const sc = CL.scenarios;
  let best = { v: -1, order: [] };
  (function rec(week, spent, used, order, v) {
    if (v > best.v) best = { v, order: order.slice() };
    for (const s of sc) {
      if (used.has(s.id)) continue;
      let w = week;
      // attende (spende energia) fino all'apertura della finestra
      let sp = spent;
      while (w < s.window[0] && sp < C.energy) { sp++; w++; }
      if (w < s.window[0] || w > s.window[1] || sp + s.cost > C.energy) continue;
      used.add(s.id); order.push(s.id);
      rec(w + s.cost, sp + s.cost, used, order, v + val(s));
      order.pop(); used.delete(s.id);
    }
  })(1, 0, new Set(), [], 0);
  return best.order;
}
const PLAN = plan();

function selectDeal(run, mode) {
  const ready = CL.scenarios.filter((s) => CL.avail(run, s).state === 'ready');
  if (mode === 'plan') {
    const id = PLAN.find((x) => !run.done[x]);
    if (!id) return null;
    const sc = CL.getScenario(id);
    return CL.avail(run, sc).state === 'ready' ? sc : 'wait';
  }
  if (!ready.length) return CL.canWaitForAny(run) ? 'wait' : null;
  if (mode === 'greedy') return ready.sort((a, b) => b.list / b.cost - a.list / a.cost)[0];
  return ready[Math.floor(run.rnd() * ready.length)];
}

function quarter(seed, movePol, dealPol) {
  const run = CL.newRun({ mode: 'career', seed });
  const rnd = run.rnd;
  let guard = 0;
  while (guard++ < 40) {
    const s = selectDeal(run, dealPol);
    if (!s) break;
    if (s === 'wait') { if (!CL.canWaitForAny(run)) break; CL.waitWeek(run); continue; }
    playDeal(run, s, movePol, rnd);
    const ev = CL.pickEvent(run);
    if (ev) CL.applyEvent(run, ev, ev.choices[Math.floor(rnd() * ev.choices.length)].id);
  }
  return CL.summary(run);
}

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
const rows = [];
for (const [label, mp, dp] of [['esperto + piano ottimo', 'best', 'plan'], ['esperto + greedy', 'best', 'greedy'], ['buono (q≥2) + greedy', 'good', 'greedy'], ['discreto (q≥1) + greedy', 'ok', 'greedy'], ['casuale + casuale', 'random', 'random']]) {
  const atts = [], wins = [], reps = [];
  for (let i = 0; i < N; i++) { const s = quarter(1000 + i, mp, dp); atts.push(s.att); wins.push(s.wins); reps.push(s.rank.name); }
  atts.sort((a, b) => a - b);
  const mean = atts.reduce((a, b) => a + b, 0) / atts.length;
  rows.push({ label, mean, p10: pct(atts, 0.1), p50: pct(atts, 0.5), p90: pct(atts, 0.9), wins: wins.reduce((a, b) => a + b, 0) / wins.length });
}
console.log(`Piano ottimo: ${PLAN.join(' → ')}`);
console.log(`Quota ${CL.fmtK(C.quota)} · energia ${C.energy}\n`);
console.log('profilo                      media   p10    p50    p90   vittorie');
rows.forEach((r) => console.log(`${r.label.padEnd(28)} ${(r.mean * 100).toFixed(0).padStart(4)}%  ${(r.p10 * 100).toFixed(0).padStart(4)}%  ${(r.p50 * 100).toFixed(0).padStart(4)}%  ${(r.p90 * 100).toFixed(0).padStart(4)}%   ${r.wins.toFixed(1)}`));
