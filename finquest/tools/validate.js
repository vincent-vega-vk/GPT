#!/usr/bin/env node
/* Valida i file content/LNNN.js rispetto a CONTENT_GUIDE.md.
   Uso: node tools/validate.js [id ...]   (senza argomenti: tutti i file presenti) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..', 'content');
const want = process.argv.slice(2).map(Number).filter(Boolean);
const files = fs.readdirSync(dir).filter((f) => /^L\d{3}\.js$/.test(f))
  .filter((f) => !want.length || want.includes(Number(f.slice(1, 4))))
  .sort();

let errors = 0, warnings = 0;
const VIS = ['stat', 'vs', 'steps', 'bars', 'pie', 'formula', 'icons', 'scale'];
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

for (const f of files) {
  const id = Number(f.slice(1, 4));
  const errs = [], warns = [];
  const E = (m) => errs.push(m), W = (m) => warns.push(m);
  let got = null, gotId = null;
  const ctx = { FQC: (i, d) => { gotId = i; got = d; } };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  } catch (e) { E('errore di sintassi/esecuzione: ' + e.message); }
  if (got) {
    const c = got;
    if (gotId !== id) E(`FQC id ${gotId} ≠ nome file ${id}`);
    const cnt = (k, n) => { if (!Array.isArray(c[k])) E(`${k} mancante`); else if (c[k].length !== n) E(`${k}: ${c[k].length} elementi, attesi ${n}`); };
    if (!isStr(c.intro)) E('intro mancante'); else if (c.intro.length > 200) W('intro lunga');
    if (!isStr(c.tip)) E('tip mancante');
    cnt('cards', 6); cnt('terms', 8); cnt('tf', 10); cnt('mcq', 8); cnt('fill', 5); cnt('order', 2); cnt('cat', 2); cnt('scen', 4);
    const kinds = new Set();
    (c.cards || []).forEach((x, i) => {
      const p = `cards[${i}]`;
      if (!isStr(x.t) || !isStr(x.x)) E(`${p}: t/x mancanti`);
      if (x.x && x.x.length > 340) W(`${p}: testo lungo (${x.x.length})`);
      const v = x.v || {};
      if (!VIS.includes(v.k)) { E(`${p}: visual k non valido (${v.k})`); return; }
      kinds.add(v.k);
      if (v.k === 'stat' && !(isStr(v.n) && isStr(v.l))) E(`${p}: stat richiede n,l`);
      if (v.k === 'vs' && !(Array.isArray(v.a) && Array.isArray(v.b) && v.a.length === 2 && v.b.length === 2)) E(`${p}: vs richiede a,b = [titolo, testo]`);
      if (v.k === 'steps' && !(Array.isArray(v.s) && v.s.length >= 3 && v.s.length <= 5)) E(`${p}: steps richiede 3-5 passi`);
      if (v.k === 'bars' && !(Array.isArray(v.d) && v.d.length >= 2 && v.d.length <= 6 && v.d.every((r) => isStr(r[0]) && typeof r[1] === 'number'))) E(`${p}: bars d=[[label,num]] 2-6`);
      if (v.k === 'pie') {
        if (!(Array.isArray(v.d) && v.d.length >= 2 && v.d.every((r) => isStr(r[0]) && typeof r[1] === 'number'))) E(`${p}: pie d=[[label,num]]`);
        else { const s = v.d.reduce((a, r) => a + r[1], 0); if (Math.abs(s - 100) > 0.6) E(`${p}: pie somma ${s} ≠ 100`); }
      }
      if (v.k === 'formula' && !isStr(v.f)) E(`${p}: formula richiede f`);
      if (v.k === 'icons' && !(Array.isArray(v.d) && v.d.length >= 2 && v.d.length <= 4)) E(`${p}: icons d 2-4`);
      if (v.k === 'scale' && !(isStr(v.a) && isStr(v.b) && Array.isArray(v.d) && v.d.length >= 2 && v.d.length <= 5 && v.d.every((r) => r[1] >= 0 && r[1] <= 100))) E(`${p}: scale a,b,d[[label,0-100]] 2-5`);
    });
    if (kinds.size < 4) W(`cards: solo ${kinds.size} tipi di visual diversi`);
    const tset = new Set();
    (c.terms || []).forEach((x, i) => {
      if (!(Array.isArray(x) && isStr(x[0]) && isStr(x[1]))) return E(`terms[${i}] non valido`);
      if (tset.has(x[0].toLowerCase())) E(`terms: duplicato ${x[0]}`); tset.add(x[0].toLowerCase());
      if (x[1].length > 130) W(`terms[${i}]: definizione lunga (${x[1].length})`);
    });
    let nt = 0, nf = 0;
    (c.tf || []).forEach((x, i) => {
      if (!(Array.isArray(x) && isStr(x[0]) && typeof x[1] === 'boolean' && isStr(x[2]))) return E(`tf[${i}] non valido`);
      x[1] ? nt++ : nf++;
    });
    if (c.tf && (nt < 4 || nf < 4)) E(`tf: ${nt} vere / ${nf} false (servono almeno 4 e 4)`);
    (c.mcq || []).forEach((x, i) => {
      const p = `mcq[${i}]`;
      if (!(isStr(x.q) && isStr(x.a) && Array.isArray(x.w) && x.w.length === 3 && x.w.every(isStr) && isStr(x.e))) return E(`${p}: q,a,w[3],e richiesti`);
      const all = [x.a, ...x.w].map((s) => s.trim().toLowerCase());
      if (new Set(all).size !== 4) E(`${p}: opzioni duplicate`);
      const maxW = Math.max(...x.w.map((s) => s.length));
      if (x.a.length > maxW * 1.6 && x.a.length - maxW > 25) W(`${p}: la risposta corretta è molto più lunga delle errate`);
    });
    (c.fill || []).forEach((x, i) => {
      const p = `fill[${i}]`;
      if (!(isStr(x.s) && isStr(x.a) && Array.isArray(x.w) && x.w.length === 3 && x.w.every(isStr))) return E(`${p}: s,a,w[3] richiesti`);
      if ((x.s.match(/___/g) || []).length !== 1) E(`${p}: ___ deve comparire una sola volta`);
      if (new Set([x.a, ...x.w].map((s) => s.toLowerCase())).size !== 4) E(`${p}: opzioni duplicate`);
    });
    (c.order || []).forEach((x, i) => {
      if (!(isStr(x.q) && Array.isArray(x.i) && x.i.length >= 4 && x.i.length <= 5 && isStr(x.e))) return E(`order[${i}]: q,i[4-5],e richiesti`);
      if (new Set(x.i).size !== x.i.length) E(`order[${i}]: elementi duplicati`);
    });
    (c.cat || []).forEach((x, i) => {
      if (!(isStr(x.q) && Array.isArray(x.g) && x.g.length === 2)) return E(`cat[${i}]: q e 2 gruppi richiesti`);
      const items = [];
      x.g.forEach((g) => { if (!(isStr(g[0]) && Array.isArray(g[1]) && g[1].length >= 3 && g[1].length <= 4)) E(`cat[${i}]: gruppo ${g[0]} con 3-4 elementi`); else items.push(...g[1]); });
      if (new Set(items).size !== items.length) E(`cat[${i}]: elementi duplicati`);
    });
    (c.scen || []).forEach((x, i) => {
      const p = `scen[${i}]`;
      if (!(isStr(x.s) && isStr(x.q) && Array.isArray(x.o) && x.o.length === 3)) return E(`${p}: s,q,o[3] richiesti`);
      if (x.o.filter((o) => o.ok === true).length !== 1) E(`${p}: serve esattamente una opzione ok:true`);
      x.o.forEach((o, j) => { if (!(isStr(o.t) && isStr(o.f) && typeof o.ok === 'boolean')) E(`${p}.o[${j}]: t,ok,f richiesti`); });
      if (x.s.length > 380) W(`${p}: situazione lunga (${x.s.length})`);
    });
    const blob = JSON.stringify(c);
    if (/<[a-z/][^>]*>/i.test(blob)) E('contiene HTML');
  } else if (!errs.length) E('FQC non chiamato');
  errors += errs.length; warnings += warns.length;
  if (errs.length || warns.length) {
    console.log(`\n${f}`);
    errs.forEach((m) => console.log('  ✗ ' + m));
    warns.forEach((m) => console.log('  ! ' + m));
  }
}
console.log(`\n${files.length} file controllati — ${errors} errori, ${warnings} avvisi`);
process.exit(errors ? 1 : 0);
