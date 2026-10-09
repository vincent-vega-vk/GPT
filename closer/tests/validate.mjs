/* Validazione strutturale + calibrazione dei contenuti.
   Uso: node tests/validate.mjs [--verbose] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const verbose = process.argv.includes('--verbose');

const files = fs.readdirSync(jsDir).filter((f) => /^(00|[1-3]\d|60)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;

let errors = 0, warns = 0;
const err = (m) => { errors++; console.error('  ✗ ' + m); };
const warn = (m) => { warns++; console.warn('  ! ' + m); };

const FX_KEYS = new Set(['t', 'v', 'u', 'c', 'r', 'd', 'l']);
const MP_KEYS = new Set(CL.MP.map((x) => x.k));
const IDS = new Set();

function walkAll(d, mode, visit, depth = 0) {
  if (depth > 14) { err(`${d.sc.id}: profondità > 14 (ciclo?) al nodo ${d.node}`); return; }
  const chs = CL.choicesFor(d, null).filter((x) => mode === 'jolly' || !x.c.jolly);
  if (!chs.length) { err(`${d.sc.id}/${d.node}: nessuna scelta disponibile in modalità ${mode}`); return; }
  for (const { c } of chs) {
    const d2 = CL.cloneDeal(d);
    CL.pick(d2, c.id, null);
    if (d2.over) visit(d2); else walkAll(d2, mode, visit, depth + 1);
  }
}

/* media di p con policy: sceglie a caso tra le scelte che soddisfano filtro(q) */
function policyMean(d, mode, qmin, depth = 0) {
  const all = CL.choicesFor(d, null).filter((x) => mode === 'jolly' || !x.c.jolly);
  let pool = all.filter((x) => CL.qOf(x.c, d) >= qmin);
  if (!pool.length) pool = all;
  let sum = 0;
  for (const { c } of pool) {
    const d2 = CL.cloneDeal(d);
    CL.pick(d2, c.id, null);
    sum += d2.over ? (d2.over === 'DQ' ? 0 : CL.prob(d2).p) : policyMean(d2, mode, qmin, depth + 1);
  }
  return sum / pool.length;
}

const rows = [];
for (const sc of CL.scenarios) {
  console.log(`\n▸ ${sc.id} — ${sc.title}`);
  if (IDS.has(sc.id)) err('id duplicato'); IDS.add(sc.id);
  ['title', 'client', 'sector', 'hook', 'brief', 'scout', 'list', 'cost', 'window', 'stars', 'crm', 'cast', 'start', 'nodes', 'endings', 'lessons', 'teaches'].forEach((k) => { if (sc[k] == null) err(`campo mancante: ${k}`); });
  if (!sc.nodes.n1 && !sc.first) err('manca nodo iniziale n1');
  const reachable = new Set();

  for (const [nid, n] of Object.entries(sc.nodes)) {
    const where = `${sc.id}/${nid}`;
    if (!n.scene || !n.prompt || !n.tip || !n.hint) err(`${where}: scene/prompt/tip/hint mancanti`);
    if (!n.choices || n.choices.length < 2) err(`${where}: servono almeno 2 scelte`);
    const ids = new Set();
    (n.choices || []).forEach((c) => {
      if (ids.has(c.id)) err(`${where}: id scelta duplicato ${c.id}`); ids.add(c.id);
      if (typeof c.q !== 'function' && ![0, 1, 2, 3].includes(c.q)) err(`${where}/${c.id}: q non valido`);
      if (!c.t || !c.r) err(`${where}/${c.id}: testo o risultato mancante`);
      for (const k of Object.keys(c.fx || {})) if (!FX_KEYS.has(k)) err(`${where}/${c.id}: fx sconosciuto ${k}`);
      { const dd = CL.newDeal(sc, {}); const mpOf = (v) => (Array.isArray(v) ? v : typeof v === 'function' ? (v(dd) || []) : []); for (const k of [...mpOf(c.mp), ...mpOf(c.mpx), ...((n.enter && n.enter.mp) || [])]) if (!MP_KEYS.has(k)) err(`${where}/${c.id}: MEDDPICC sconosciuto ${k}`); }
      if (c.jolly && !CL.JOLLY[c.jolly]) err(`${where}/${c.id}: jolly sconosciuto ${c.jolly}`);
      if (c.next == null) err(`${where}/${c.id}: next mancante`);
      if (typeof c.next === 'string' && c.next !== 'END' && c.next !== 'DQ' && !sc.nodes[c.next]) err(`${where}/${c.id}: next → nodo inesistente ${c.next}`);
      if (c.t.length > 420) warn(`${where}/${c.id}: testo scelta molto lungo (${c.t.length})`);
    });
    const free = (n.choices || []).filter((c) => !c.jolly);
    if (free.length < 2) err(`${where}: meno di 2 scelte senza jolly`);
    const q0 = CL.newDeal(sc, {});
    if (!free.some((c) => CL.qOf(c, q0) >= 2)) warn(`${where}: nessuna scelta q≥2 senza jolly (nello stato iniziale)`);
    if ((n.choices || []).filter((c) => CL.qOf(c, q0) === 3).length === 0) warn(`${where}: nessuna scelta q=3 (nello stato iniziale)`);
  }

  if (sc.tier === 'real') {
    ['label', 'teaser', 'family'].forEach((k) => { if (!sc[k]) err(`${sc.id}: manca ${k}`); });
    if (!sc.worlds || sc.worlds.length < 2) err(`${sc.id}: un caso reale ha almeno due mondi nascosti`);
  }
  const worldIds = sc.worlds && sc.worlds.length ? sc.worlds.map((w) => w.id) : [null];
  const seenUnion = { jolly: new Set(), nojolly: new Set() };
  for (const wid of worldIds) {
  const start = CL.newDeal(sc, { world: wid });
  for (const mode of ['jolly', 'nojolly']) {
    let best = { p: -1 }, worst = { p: 2 }, n = 0, wins = 0;
    const seen = new Set();
    walkAll(start, mode, (d) => {
      n++;
      const p = d.over === 'DQ' ? -1 : CL.prob(d).p;
      d.hist.forEach((h) => seen.add(h.node));
      if (d.over === 'DQ') return;
      if (p > best.p) best = { p, path: d.hist.map((h) => h.node + ':' + h.id).join(' ') };
      if (p < worst.p) worst = { p };
      if (p >= 0.6) wins++;
    });
    seen.forEach((x) => seenUnion[mode].add(x));
    const rand = policyMean(start, mode, 0);
    const q2 = policyMean(start, mode, 2);
    const q3 = policyMean(start, mode, 3);
    rows.push({ id: sc.id, mode, paths: n, best: best.p, worst: worst.p, rand, q2, q3 });
    console.log(`  ${(wid ? wid + '/' : '') + mode.padEnd(8)} percorsi ${String(n).padStart(6)} · migliore ${(best.p * 100).toFixed(0).padStart(3)}% · peggiore ${(worst.p * 100).toFixed(0).padStart(3)}% · casuale ${(rand * 100).toFixed(0).padStart(3)}% · solo q≥2 ${(q2 * 100).toFixed(0).padStart(3)}% · solo q3 ${(q3 * 100).toFixed(0).padStart(3)}%`);
    if (verbose) console.log('    best: ' + best.path);
    if (mode === 'jolly') {
      if (best.p < 0.85) warn(`${sc.id}: il percorso migliore non supera l’85% (${(best.p * 100).toFixed(0)}%)`);
      if (worst.p > 0.1) warn(`${sc.id}: il percorso peggiore supera il 10%`);
    } else if (best.p < 0.78) warn(`${sc.id}: senza jolly il massimo è ${(best.p * 100).toFixed(0)}% (<78%)`);
  }
  }
  Object.keys(sc.nodes).forEach((id) => { if (!seenUnion.jolly.has(id)) err(`nodo non raggiungibile (in nessun mondo): ${id}`); });
}

console.log(`\nScenari: ${CL.scenarios.length} · errori: ${errors} · avvisi: ${warns}`);
if (errors) process.exit(1);
