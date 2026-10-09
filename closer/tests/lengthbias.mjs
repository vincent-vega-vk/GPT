/* Indizi di forma: la risposta giusta non deve riconoscersi dalla lunghezza (né dalla domanda, né dal nome della categoria).
   Controlla le scelte dei nodi (compresi gli imprevisti), le risposte di Marta (fc.custom) e il dojo.
   Uso: node tests/lengthbias.mjs [id-scenario] [--strict]
   Soglie (con --strict esce con errore): in un nodo "migliore = più lunga" non deve valere in più del 45% dei nodi,
   correlazione media q↔lunghezza (z-score dentro il nodo) < 0,35; per le domande di Marta l'onesta non deve essere la più lunga in più del 50%. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|[1-3]\d|60)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;
const only = process.argv.find((a, i) => i > 1 && !a.startsWith('--'));
const strict = process.argv.includes('--strict');

const len = (s) => String(s || '').length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const corr = (xs, ys) => { const mx = mean(xs), my = mean(ys), sx = sd(xs), sy = sd(ys); return sx && sy ? mean(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sx * sy) : 0; };
const CATS = /\b(Commit|Best Case|Pipeline|Fuori)\b/i;

let bad = 0;
const flag = (msg) => { bad++; console.log('  ✗ ' + msg); };

/* gruppi: [{ label, items: [{ q, text }] }] */
function analyse(title, groups, maxBest = 0.45, maxCorr = 0.35) {
  let nBest = 0, n = 0; const zs = [], qs = [];
  groups.forEach((g) => {
    const items = g.items.filter((x) => x.text);
    if (items.length < 3) return;
    const L = items.map((x) => len(x.text)), Q = items.map((x) => x.q);
    const top = Math.max(...Q);
    if (Q.filter((q) => q === top).length !== 1) { /* più "migliori": conta se il più lungo è uno di essi */ }
    const longest = L.indexOf(Math.max(...L));
    n++; if (Q[longest] === top && Math.max(...L) > L.slice().sort((a, b) => b - a)[1]) nBest++;
    const m = mean(L), s = sd(L) || 1;
    L.forEach((l, i) => { zs.push((l - m) / s); qs.push(Q[i]); });
  });
  const r = corr(zs, qs), fr = n ? nBest / n : 0;
  const ok = fr <= maxBest && Math.abs(r) < maxCorr;
  console.log(`${ok ? '  ✓' : '  ✗'} ${title}: nodi ${n} · migliore=più lunga ${(fr * 100).toFixed(0)}% · correlazione q↔lunghezza ${r.toFixed(2)}`);
  if (!ok) bad++;
}

for (const sc of CL.scenarios) {
  if (only && sc.id !== only) continue;
  console.log('▸ ' + sc.id);
  const worldIds = sc.worlds && sc.worlds.length ? sc.worlds.map((w) => w.id) : [null];
  for (const wid of worldIds) {
    const d0 = CL.newDeal(sc, { world: wid });
    const groups = [];
    const push = (label, choices) => groups.push({ label, items: choices.map((c) => ({ q: CL.qOf(c, d0), text: c.t, id: c.id })) });
    Object.entries(sc.nodes).forEach(([nid, n]) => push(nid, n.choices));
    (sc.wild || []).forEach((w) => push('wild:' + w.id, w.node.choices));
    analyse((wid ? 'mondo ' + wid + ' · ' : '') + 'scelte dei nodi (' + groups.length + ' gruppi)', groups);
  }
  /* domande di Marta */
  const cust = (sc.fc && sc.fc.custom) || [];
  let longestHonest = 0, catHonest = 0, catOther = 0, tot = 0;
  cust.forEach((c) => {
    tot++;
    const o = { honest: len(c.honest), bluff: len(c.bluff), vague: len(c.vague) };
    if (o.honest > o.bluff && o.honest > o.vague) longestHonest++;
    if (CATS.test(c.honest || '')) catHonest++;
    if (CATS.test(c.bluff || '') || CATS.test(c.vague || '')) catOther++;
  });
  if (tot) {
    const okc = longestHonest / tot <= 0.5 && !(catHonest > 0 && catOther === 0);
    console.log(`${okc ? '  ✓' : '  ✗'} domande di Marta: ${tot} · onesta più lunga ${longestHonest}/${tot} · categoria nominata solo nell'onesta: ${catHonest > 0 && catOther === 0 ? 'sì' : 'no'} (${catHonest} onesta, ${catOther} altre)`);
    if (!okc) bad++;
  }
}

if (!only) {
  console.log('▸ dojo');
  const groups = CL.dojo.pool.map((p) => ({ label: p.id, items: p.opts.map((x) => ({ q: x.g, text: x.t })) }));
  analyse('obiezioni (' + groups.length + ')', groups, 0.4, 0.3);
  const q3 = CL.dojo.pool.filter((p) => { const t = p.opts.find((x) => x.g === 3); return t && /\?/.test(t.t) && p.opts.filter((x) => /\?/.test(x.t)).length === 1; }).length;
  const okq = q3 / CL.dojo.pool.length <= 0.4;
  console.log(`${okq ? '  ✓' : '  ✗'} la domanda “?” compare solo nella risposta da cintura nera in ${q3}/${CL.dojo.pool.length} obiezioni`);
  if (!okq) bad++;
}

console.log(bad ? `\nIndizi di forma: ${bad} controlli non superati` : '\nIndizi di forma: ok');
if (strict && bad) process.exit(1);
