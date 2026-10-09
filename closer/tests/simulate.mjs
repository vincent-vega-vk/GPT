/* Monte Carlo del trimestre v2: imprevisti, esito sigillato, forecast con Marta, shock del giorno di chiusura.
   Uso: node tests/simulate.mjs [--n=1500] [--nowild] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|[1-3]\d|60)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const N = Number(arg('n', '1500'));
const NOWILD = process.argv.includes('--nowild');
const C = CL.CONFIG;

/* ───── mosse dentro il deal ───── */
function chooseMove(d, run, pol, rnd) {
  const all = CL.choicesFor(d, run).filter((x) => !x.locked);
  const noDQ = all.filter((x) => x.c.next !== 'DQ');
  let pool;
  if (pol === 'best') {
    const top = Math.max(...all.map((x) => CL.qOf(x.c, d)));
    pool = all.filter((x) => CL.qOf(x.c, d) === top);
    const free = pool.filter((x) => !x.c.jolly);
    pool = free.length ? free : pool;
  } else if (pol === 'good') pool = noDQ.filter((x) => CL.qOf(x.c, d) >= 2);
  else if (pol === 'ok') pool = noDQ.filter((x) => CL.qOf(x.c, d) >= 1);
  else pool = noDQ;
  if (!pool.length) pool = noDQ.length ? noDQ : all;
  return pool[Math.floor(rnd() * pool.length)].c.id;
}

function playDeal(run, sc, pol, rnd) {
  const d = CL.newDeal(sc, Object.assign(CL.dealOpts(run), { rnd }));
  let guard = 0;
  while (!d.over && guard++ < 40) CL.pick(d, chooseMove(d, run, pol, rnd), run, NOWILD ? { wild: false } : { rnd });
  const res = CL.seal(d);
  CL.commitDeal(run, sc, res);
  return { res, wilds: d.hist.filter((h) => h.wild).length };
}

/* ───── pianificatore dei deal ───── */
function plan(run) {
  const est = { logistica: 340 * 0.85 * 0.8, bionova: 320 * 0.92 * 0.9 };
  const val = (sc) => est[sc.id] || sc.list * 0.88 * 0.92;
  let best = { v: -1, order: [] };
  (function rec(week, spent, used, order, v) {
    if (v > best.v) best = { v, order: order.slice() };
    for (const s of CL.pool(run)) {
      if (used.has(s.id)) continue;
      let w = week, sp = spent;
      while (w < s.window[0] && sp < C.energy) { sp++; w++; }
      if (w < s.window[0] || w > s.window[1] || sp + s.cost > C.energy) continue;
      used.add(s.id); order.push(s.id);
      rec(w + s.cost, sp + s.cost, used, order, v + val(s));
      order.pop(); used.delete(s.id);
    }
  })(1, 0, new Set(), [], 0);
  return best.order;
}
function selectDeal(run, mode) {
  const ready = CL.pool(run).filter((s) => CL.avail(run, s).state === 'ready');
  if (mode === 'plan') {
    if (!run._plan) run._plan = plan(run);   /* il piano ottimo dipende dal palinsesto del trimestre */
    const id = run._plan.find((x) => !run.done[x]);
    if (!id) return null;
    const sc = CL.getScenario(id);
    return CL.avail(run, sc).state === 'ready' ? sc : 'wait';
  }
  if (!ready.length) return CL.canWaitForAny(run) ? 'wait' : null;
  if (mode === 'greedy') return ready.sort((a, b) => b.list / b.cost - a.list / a.cost)[0];
  return ready[Math.floor(run.rnd() * ready.length)];
}

/* ───── forecast ───── */
const ANSWER = {
  honest: { evidence: 'honest', sandbag: 'correct', risk: 'name', unworked: 'honest', coverage: 'honest', custom: 'evidence' },
  inflate: { evidence: 'bluff', sandbag: 'correct', risk: 'overconf', unworked: 'bluff', coverage: 'optimistic', custom: 'bluff' },
  sandbag: { evidence: 'honest', sandbag: 'stay', risk: 'name', unworked: 'honest', coverage: 'honest', custom: 'honest' },
};
function runCall(run, kind, fpol, rnd) {
  if (!CL.FCBANK) return;
  const entries = CL.fcEntries(run, kind);
  if (!entries.length) return;
  entries.forEach((e) => {
    if (e.state === 'open') { e.cat = e.crm; return; }
    const t = CL.catRank(e.truth);
    e.cat = fpol === 'honest' ? e.truth : fpol === 'inflate' ? ['out', 'pipe', 'best', 'commit', 'commit'][t + 1] : ['out', 'out', 'pipe', 'best'][t];
  });
  const chs = CL.fcBuild(run, entries, kind, rnd);
  const scores = [];
  chs.forEach((ch) => {
    let id = ANSWER[fpol][ch.type];
    if (!ch.opts.some((o) => o.id === id)) id = (ch.opts.find((o) => o.id === 'honest') || ch.opts[0]).id;
    scores.push(CL.fcResolve(run, ch, id, rnd).score);
  });
  CL.fcFinalize(run, kind, entries, scores);
}

function quarter(seed, movePol, dealPol, fpol) {
  const run = CL.newRun({ mode: 'career', seed });
  const rnd = run.rnd;
  let guard = 0, wilds = 0;
  while (guard++ < 40) {
    const s = selectDeal(run, dealPol);
    if (!s) break;
    if (s === 'wait') { if (!CL.canWaitForAny(run)) break; CL.waitWeek(run); continue; }
    wilds += playDeal(run, s, movePol, rnd).wilds;
    if (!run.fc.calls.mid && CL.week(run) >= 6 && run.results.some((r) => r.status === 'pending')) runCall(run, 'mid', fpol, rnd);
    const ev = CL.pickEvent(run);
    if (ev) CL.applyEvent(run, ev, ev.choices[Math.floor(rnd() * ev.choices.length)].id);
  }
  runCall(run, 'final', fpol, rnd);
  CL.closeQuarter(run, rnd);
  CL.fcSettle(run);
  const sum = CL.summary(run);
  sum.wildCount = wilds;
  sum.hitShocks = run.results.filter((x) => x.shock && x.shock.hit && x.shock.kind === 'neg').length;
  sum.protShocks = run.results.filter((x) => x.shock && !x.shock.hit && x.shock.kind === 'neg').length;
  sum.posShocks = run.results.filter((x) => x.shock && x.shock.kind === 'pos').length;
  sum.rep = run.rep; sum.mgr = run.mgr;
  return sum;
}

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
const rows = [];
const PROFILES = [
  ['esperto + piano ottimo', 'best', 'plan', 'honest'],
  ['esperto + greedy', 'best', 'greedy', 'honest'],
  ['esperto, forecast gonfiato', 'best', 'greedy', 'inflate'],
  ['esperto, sandbagging', 'best', 'greedy', 'sandbag'],
  ['buono (q≥2) + greedy', 'good', 'greedy', 'honest'],
  ['discreto (q≥1) + greedy', 'ok', 'greedy', 'honest'],
  ['casuale + casuale', 'random', 'random', 'inflate'],
];
for (const [label, mp, dp, fp] of PROFILES) {
  const atts = [], acc = [], agg = { wins: 0, wilds: 0, hit: 0, prot: 0, pos: 0, rep: 0, mgr: 0 };
  for (let i = 0; i < N; i++) {
    const s = quarter(1000 + i, mp, dp, fp);
    atts.push(s.att); if (s.fc && s.fc.n) acc.push(s.fc.acc);
    agg.wins += s.wins; agg.wilds += s.wildCount; agg.hit += s.hitShocks; agg.prot += s.protShocks; agg.pos += s.posShocks; agg.rep += s.rep; agg.mgr += s.mgr;
  }
  atts.sort((a, b) => a - b);
  const mean = atts.reduce((a, b) => a + b, 0) / atts.length;
  rows.push({ label, mean, p10: pct(atts, 0.1), p50: pct(atts, 0.5), p90: pct(atts, 0.9), wins: agg.wins / N, wilds: agg.wilds / N, hit: agg.hit / N, prot: agg.prot / N, pos: agg.pos / N, acc: acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null, rep: agg.rep / N, mgr: agg.mgr / N });
}
console.log(`Quota ${CL.fmtK(C.quota)} · energia ${C.energy} · ${N} trimestri per profilo${NOWILD ? ' · senza imprevisti' : ''}\n`);
console.log('profilo                        media   p10    p50    p90  vitt. imprev. shock(colp/prot/pos) affid.  rep  Marta');
rows.forEach((r) => console.log(`${r.label.padEnd(30)} ${(r.mean * 100).toFixed(0).padStart(4)}%  ${(r.p10 * 100).toFixed(0).padStart(4)}%  ${(r.p50 * 100).toFixed(0).padStart(4)}%  ${(r.p90 * 100).toFixed(0).padStart(4)}%  ${r.wins.toFixed(1).padStart(4)}  ${r.wilds.toFixed(1).padStart(5)}   ${r.hit.toFixed(2)}/${r.prot.toFixed(2)}/${r.pos.toFixed(2)}      ${r.acc == null ? '  —' : (r.acc * 100).toFixed(0).padStart(3) + '%'}  ${r.rep.toFixed(0).padStart(3)}  ${r.mgr.toFixed(0).padStart(4)}`));
