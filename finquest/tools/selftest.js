#!/usr/bin/env node
/* Stress test dei generatori: calcoli, grafici, simulazioni e costruzione delle sessioni */
const path = require('path');
global.window = global;
['util', 'curriculum', 'charts', 'calc', 'sims', 'engine'].forEach((f) => require(path.join(__dirname, '..', 'js', f + '.js')));
const fs = require('fs');
const cdir = path.join(__dirname, '..', 'content');
fs.readdirSync(cdir).filter((f) => /^L\d{3}\.js$/.test(f)).forEach((f) => require(path.join(cdir, f)));
const FQ = global.FQ, U = FQ.U;
let errs = 0;
const bad = (m) => { if (errs++ < 40) console.log('✗ ' + m); };
function checkEx(ex, where) {
  if (!ex) return bad(where + ': esercizio nullo');
  if (ex.type === 'mcq') {
    if (!Array.isArray(ex.options) || ex.options.length < 2) bad(where + ': opzioni mancanti');
    if (ex.answer < 0 || ex.answer >= ex.options.length) bad(where + ': risposta fuori range');
    if (new Set(ex.options).size !== ex.options.length) bad(where + ': opzioni duplicate ' + JSON.stringify(ex.options));
    if (ex.options.some((o) => /NaN|undefined|Infinity/.test(String(o)))) bad(where + ': opzione non valida ' + JSON.stringify(ex.options));
    if (/NaN|undefined|Infinity/.test(ex.prompt + (ex.exp || ''))) bad(where + ': testo non valido: ' + ex.prompt);
    if (ex.visual && /NaN|undefined/.test(ex.visual.svg)) bad(where + ': svg con NaN');
  }
  if (ex.type === 'num') {
    if (!isFinite(ex.answer)) bad(where + ': risposta numerica non finita');
    if (/NaN|undefined|Infinity/.test(ex.prompt + ex.exp + ex.display)) bad(where + ': testo non valido ' + ex.prompt);
  }
}
const N = Number(process.argv[2] || 300);
for (const k of FQ.Calc.KEYS) for (let i = 0; i < N; i++) {
  const r = U.rng(i * 7919 + k.length);
  const d = (i % 10) / 9;
  try { checkEx(FQ.Calc.make(k, r, d, 'mcq'), 'calc ' + k); checkEx(FQ.Calc.make(k, r, d, 'num'), 'calc ' + k); }
  catch (e) { bad('calc ' + k + ': ' + e.message); }
}
for (const k of FQ.Charts.KEYS) for (let i = 0; i < N; i++) {
  const r = U.rng(i * 104729 + k.length);
  try { checkEx(FQ.Charts.gen[k](r, (i % 10) / 9), 'chart ' + k); } catch (e) { bad('chart ' + k + ': ' + e.message + '\n' + e.stack.split('\n')[1]); }
}
for (let i = 0; i < 50; i++) {
  const r = U.rng(i + 1);
  try { FQ.Sims.tradeSpec(r, 0.5); FQ.Sims.allocSpec(r, 0.5, 'budget'); FQ.Sims.allocSpec(r, 0.5, 'port'); ['infl', 'cost', 'compound'].forEach((m) => { const s = FQ.Sims.labSpec(r, 0.5, m); if (new Set([s.no.correct, ...s.no.wrong]).size !== 4) bad('lab ' + m + ' opzioni duplicate'); }); }
  catch (e) { bad('sim: ' + e.message); }
}
// livelli usati: chiavi esistenti
FQ.LEVELS.forEach((L) => {
  L.calc.forEach((k) => FQ.Calc.gen[k] || bad(`L${L.id}: calc ${k} inesistente`));
  L.chart.forEach((k) => FQ.Charts.gen[k] || bad(`L${L.id}: chart ${k} inesistente`));
});
// sessioni per tutti i livelli con contenuti
let sessions = 0;
for (const L of FQ.LEVELS) {
  if (!FQ.CONTENT[L.id]) continue;
  for (let si = 0; si < 20; si++) for (let rep = 0; rep < 3; rep++) {
    try {
      const s = FQ.Engine.build(L.id, si, L.id * 1000 + si * 10 + rep + 1);
      if (!s.items.length) bad(`L${L.id} tappa ${si}: vuota`);
      s.items.forEach((ex, j) => checkEx(ex, `L${L.id} t${si} #${j} (${ex.type})`));
      sessions++;
    } catch (e) { bad(`L${L.id} tappa ${si}: ${e.message}\n${e.stack.split('\n')[1]}`); }
  }
}
try { FQ.Engine.placement(5).forEach((ex, j) => checkEx(ex, 'placement #' + j)); } catch (e) { bad('placement: ' + e.message); }
console.log(`${FQ.Calc.KEYS.length} calcoli, ${FQ.Charts.KEYS.length} grafici, ${sessions} sessioni, ${Object.keys(FQ.CONTENT).length} livelli con contenuti — ${errs} errori`);
process.exit(errs ? 1 : 0);
