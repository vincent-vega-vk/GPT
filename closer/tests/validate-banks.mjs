/* Valida le banche generiche v2: FCBANK, shock e imprevisti generici (e, se presenti, i campi v2 degli scenari).
   Uso: node tests/validate-banks.mjs [--strict]  (--strict: richiede anche i campi v2 in tutti gli scenari) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const strict = process.argv.includes('--strict');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|1\d|2\d|3\d)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;

let errors = 0, warns = 0;
const err = (m) => { errors++; console.error('  ✗ ' + m); };
const warn = (m) => { warns++; console.warn('  ! ' + m); };
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const GENERIC_CAST = new Set(['marta', 'davide', 'collega', 'cliente']);
const MP = ['E', 'Dp', 'P', 'M', 'C', 'I', 'Dc', 'Co'];
const BAD = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\bundefined\b|\bnull\b|\[object|\.\.\.\s*$/u;

function checkText(where, s) {
  if (!isStr(s)) return err(`${where}: stringa vuota o non valida`);
  if (BAD.test(s)) err(`${where}: testo sospetto (emoji/undefined/null/…): ${s.slice(0, 60)}`);
  if (/ {2,}/.test(s)) warn(`${where}: doppi spazi`);
  if (/(^|[\s(])'[^']*'/.test(s) && !/\w'\w/.test(s)) warn(`${where}: apici dritti, usa “ ” o ’`);
  if (/"/.test(s)) warn(`${where}: virgolette dritte, usa “ ”`);
}
const arr = (where, a, min) => {
  if (!Array.isArray(a)) return err(`${where}: non è un array`), false;
  if (a.length < min) err(`${where}: servono almeno ${min} voci (ne ho ${a.length})`);
  return true;
};

/* ───── riga di scena ───── */
function checkLine(where, l, castKeys) {
  if (!l || typeof l !== 'object') return err(`${where}: riga non valida`);
  const kinds = ['n', 'think', 'w', 'mail', 'chat'].filter((k) => l[k] != null);
  if (kinds.length !== 1) return err(`${where}: una riga deve avere esattamente uno tra n/think/w/mail/chat (ha: ${kinds.join(',') || 'nessuno'})`);
  if (l.n != null) checkText(where + '.n', l.n);
  if (l.think != null) checkText(where + '.think', l.think);
  if (l.w != null) {
    if (!castKeys.has(l.w)) err(`${where}: personaggio sconosciuto “${l.w}”`);
    checkText(where + '.t', l.t);
    if (l.a != null) checkText(where + '.a', l.a);
  }
  if (l.mail) { checkText(where + '.mail.from', l.mail.from); checkText(where + '.mail.subj', l.mail.subj); checkText(where + '.t', l.t); }
  if (l.chat) { if (!castKeys.has(l.chat.from)) err(`${where}: chat.from sconosciuto “${l.chat.from}”`); checkText(where + '.t', l.t); }
  if (l.sfx != null && !['phone', 'ping', 'alert', 'door', 'stamp'].includes(l.sfx)) err(`${where}: sfx non valido ${l.sfx}`);
}
const lines = (where, v, d, castKeys, min) => {
  let a;
  try { a = typeof v === 'function' ? v(d) : v; } catch (e) { return err(`${where}: la funzione lancia: ${e.message}`); }
  if (!arr(where, a, min || 1)) return;
  a.forEach((l, i) => { if (l && l.if && !l.if(d)) return; checkLine(`${where}[${i}]`, l, castKeys); });
};

/* due stati di prova: iniziale e "ricco" (tutto acquisito, molti flag) */
function sampleDeals(sc) {
  const d0 = CL.newDeal(sc, {});
  const d1 = CL.newDeal(sc, {});
  CL.MP.forEach((m) => d1.mp.add(m.k));
  Object.keys(d1.m).forEach((k) => { d1.m[k] = k === 'risk' ? 15 : 85; });
  const flagKeys = new Set();
  JSON.stringify(sc, (k, v) => { if (typeof v === 'function') { (v.toString().match(/flags\.(\w+)/g) || []).forEach((m) => flagKeys.add(m.slice(6))); } return v; });
  flagKeys.forEach((f) => { d1.flags[f] = true; });
  d1.hist.push({ node: 'n1', id: 'a', q: 3, t: 'x', r: 'y' });
  return [d0, d1];
}

function checkNode(where, n, d, castKeys, { wild } = {}) {
  ['prompt', 'hint', 'tip'].forEach((k) => checkText(`${where}.${k}`, n[k]));
  if (!n.where) err(`${where}: manca where`); else checkText(`${where}.where`, n.where);
  if (strict && !n.when) warn(`${where}: manca when`);
  if (n.view && !['call', 'meeting', 'walk', 'desk', 'phone', 'mail', 'car'].includes(n.view)) err(`${where}: view non valida ${n.view}`);
  lines(`${where}.scene`, n.scene, d, castKeys, 1);
  if (!arr(`${where}.choices`, n.choices, 3)) return;
  let hi = 0, lo = 0;
  n.choices.forEach((c) => {
    const w = `${where}/${c.id}`;
    checkText(w + '.t', c.t);
    try { const r = typeof c.r === 'function' ? c.r(d) : c.r; checkText(w + '.r', r); } catch (e) { err(`${w}.r lancia: ${e.message}`); }
    if (c.say != null) checkText(w + '.say', c.say);
    if (c.react != null) lines(w + '.react', c.react, d, castKeys, 1);
    try { const fx = typeof c.fx === 'function' ? c.fx(d) : c.fx; for (const k of Object.keys(fx || {})) { if (!['t', 'v', 'u', 'c', 'r', 'd', 'l'].includes(k)) err(`${w}: fx ${k}`); else if (typeof fx[k] !== 'number') err(`${w}: fx.${k} non numerico`); else if (wild && ['t', 'v', 'u', 'c', 'r'].includes(k) && Math.abs(fx[k]) > 14) err(`${w}: fx.${k}=${fx[k]} oltre ±14`); else if (wild && k === 'd' && Math.abs(fx[k]) > 10) err(`${w}: fx.d=${fx[k]} oltre ±10`); } } catch (e) { err(`${w}.fx lancia: ${e.message}`); }
    if (wild && c.next !== 'RET') err(`${w}: negli imprevisti next deve essere 'RET'`);
    if (![0, 1, 2, 3].includes(c.q)) err(`${w}: q non valido`);
    if (c.q >= 2) hi++; if (c.q <= 1) lo++;
  });
  if (!hi) err(`${where}: nessuna scelta con q>=2`);
  if (!lo) err(`${where}: nessuna scelta con q<=1`);
}

/* ───── FCBANK ───── */
console.log('\n▸ FCBANK');
const B = CL.FCBANK;
if (!B) { err('CL.FCBANK assente'); } else {
  const stringsOf = (where, a, min) => { if (arr(where, a, min)) a.forEach((s, i) => checkText(`${where}[${i}]`, s)); };
  ['mid', 'final'].forEach((k) => {
    if (arr(`open.${k}`, B.open && B.open[k], 3)) B.open[k].forEach((blk, i) => { arr(`open.${k}[${i}]`, blk, 2) && blk.forEach((l, j) => checkLine(`open.${k}[${i}][${j}]`, l, GENERIC_CAST)); });
    stringsOf(`sheet.${k}`, B.sheet && B.sheet[k], 2);
  });
  const gapKeys = [...MP, 'disc', 'cap', 'meters'];
  gapKeys.forEach((k) => {
    const g = B.gaps && B.gaps[k];
    if (!g) return err(`gaps.${k} assente`);
    stringsOf(`gaps.${k}.q`, g.q, 3); stringsOf(`gaps.${k}.honest`, g.honest, 3); stringsOf(`gaps.${k}.bluff`, g.bluff, 3); stringsOf(`gaps.${k}.vague`, g.vague, 2);
    ['honest', 'bluffCaught', 'bluffPassed', 'vague'].forEach((r) => stringsOf(`gaps.${k}.react.${r}`, g.react && g.react[r], 2));
  });
  const shape = {
    sandbag: { q: 3, correct: 3, stay: 2, vague: 2, react: { correct: 2, stay: 2, vague: 2 } },
    risk: { q: 3, name: 3, overconf: 2, vague: 2, react: { name: 2, overconf: 2, vague: 2 } },
    unworked: { q: 3, honest: 3, bluff: 2, plan: 2, react: { honest: 2, bluffCaught: 2, bluffPassed: 2, plan: 2 } },
    coverage: { q: 3, honest: 3, optimistic: 3, vague: 2, react: { honest: 2, optimistic: 2, vague: 2 } },
    wrap: { good: 3, mixed: 3, bad: 3 },
    closing: { intro: 3, won: 3, lost: 3, slip: 3, fcGood: 3, fcBad: 3, fcMixed: 3 },
  };
  const walk = (where, spec, obj) => {
    if (!obj) return err(`${where} assente`);
    for (const [k, v] of Object.entries(spec)) {
      if (typeof v === 'number') stringsOf(`${where}.${k}`, obj[k], v); else walk(`${where}.${k}`, v, obj[k]);
    }
  };
  Object.entries(shape).forEach(([k, spec]) => walk(k, spec, B[k]));
  /* segnaposto ammessi */
  const PH = new Set(['client', 'title', 'who', 'claim', 'truth', 'acv', 'p', 'nome', 'contact', 'buyer']);
  const scan = (o, p) => { if (typeof o === 'string') { (o.match(/\{(\w+)\}/g) || []).forEach((m) => { if (!PH.has(m.slice(1, -1))) err(`${p}: segnaposto non ammesso ${m}`); }); } else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => scan(v, p + '.' + k)); };
  scan(B, 'FCBANK');
}

/* ───── shock generici ───── */
console.log('\n▸ shocksGeneric');
function checkShock(where, s, d) {
  ['id', 'title', 'hitText', 'protText'].forEach((k) => checkText(`${where}.${k}`, s[k]));
  if (!['neg', 'pos'].includes(s.kind)) err(`${where}: kind`);
  if (typeof s.dp !== 'number') err(`${where}: dp`);
  if (s.kind === 'neg' && !(s.dp <= -0.1 && s.dp >= -0.5)) err(`${where}: dp neg fuori da [-0.5,-0.1]`);
  if (s.kind === 'pos' && !(s.dp >= 0.04 && s.dp <= 0.2)) err(`${where}: dp pos fuori da [0.04,0.2]`);
  if (s.dpProt != null && s.kind === 'neg' && !(s.dpProt <= 0 && s.dpProt >= -0.08)) err(`${where}: dpProt neg fuori da [-0.08,0]`);
  if (s.w != null && !(s.w >= 1 && s.w <= 3)) err(`${where}: w fuori da 1..3`);
  [s.if, s.hit].forEach((f, i) => { if (f != null) { try { const v = f(d); if (typeof v !== 'boolean') err(`${where}.${i ? 'hit' : 'if'} non restituisce boolean`); } catch (e) { err(`${where}.${i ? 'hit' : 'if'} lancia: ${e.message}`); } } });
}
const sc0 = CL.scenarios[0];
const sd0 = sc0 ? sampleDeals(sc0) : [];
if (!CL.shocksGeneric) err('CL.shocksGeneric assente'); else {
  if (CL.shocksGeneric.length < 8) err('servono almeno 8 shock generici');
  const kinds = CL.shocksGeneric.reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {});
  if ((kinds.neg || 0) < 5 || (kinds.pos || 0) < 2) err(`shock generici: servono ≥5 neg e ≥2 pos (ho ${JSON.stringify(kinds)})`);
  CL.shocksGeneric.forEach((s) => sd0.forEach((d) => checkShock(`shocksGeneric/${s.id}`, s, d)));
  /* a stato "ricco" gli shock negativi devono essere in prevalenza protetti, a stato iniziale vulnerabili */
  const neg = CL.shocksGeneric.filter((s) => s.kind === 'neg');
  const vuln0 = neg.filter((s) => (s.hit ? s.hit(sd0[0]) : true)).length, vuln1 = neg.filter((s) => (s.hit ? s.hit(sd0[1]) : true)).length;
  console.log(`  shock neg vulnerabili: iniziale ${vuln0}/${neg.length} · preparato ${vuln1}/${neg.length}`);
  if (vuln1 > Math.ceil(neg.length * 0.4)) err('troppi shock negativi colpiscono anche uno stato ben preparato');
  if (vuln0 < Math.floor(neg.length * 0.6)) err('troppi pochi shock negativi colpiscono uno stato non preparato');
}

/* ───── imprevisti generici ───── */
console.log('\n▸ wildGeneric');
if (!CL.wildGeneric) err('CL.wildGeneric assente'); else {
  if (CL.wildGeneric.length < 8) err('servono almeno 8 imprevisti generici');
  const ids = new Set();
  CL.wildGeneric.forEach((w) => {
    const where = `wildGeneric/${w.id}`;
    if (ids.has(w.id)) err(where + ': id duplicato'); ids.add(w.id);
    checkText(where + '.title', w.title);
    if (!w.node) return err(where + ': manca node');
    sd0.forEach((d, i) => checkNode(`${where}#${i}`, w.node, d, GENERIC_CAST, { wild: true }));
  });
  const dyn = CL.wildGeneric.filter((w) => typeof w.node.scene === 'function' || w.node.choices.some((c) => typeof c.fx === 'function' || typeof c.r === 'function')).length;
  if (dyn < 3) err(`almeno 3 imprevisti generici devono dipendere dallo stato (ho ${dyn})`);
}

/* ───── campi v2 degli scenari ───── */
console.log('\n▸ campi v2 degli scenari' + (strict ? ' (strict)' : ''));
const THEMES = ['lab', 'factory', 'night', 'public', 'retail', 'clinic', 'port', 'control', 'office'];
const WIDGETS = ['stakeholders', 'clock', 'termsheet', 'board', 'kpis', 'scorecard', 'timeline', 'checklist', 'scoreboard'];
for (const sc of CL.scenarios) {
  const has = sc.theme || sc.intro || sc.hud || sc.wild || sc.shocks || sc.fc;
  if (!has) { if (strict) err(`${sc.id}: nessun campo v2`); continue; }
  const castKeys = new Set([...GENERIC_CAST, ...Object.keys(sc.cast)]);
  const [d0, d1] = sampleDeals(sc);
  const w = (m) => `${sc.id}: ${m}`;
  if (!sc.theme) err(w('manca theme')); else {
    if (!THEMES.includes(sc.theme.bg)) err(w('theme.bg non valido'));
    ['id', 'label', 'accent', 'accentDark', 'ambience', 'motto'].forEach((k) => checkText(w('theme.' + k), sc.theme[k]));
    if (!/^#[0-9a-f]{6}$/i.test(sc.theme.accent || '') || !/^#[0-9a-f]{6}$/i.test(sc.theme.accentDark || '')) err(w('theme.accent/accentDark devono essere #rrggbb'));
  }
  if (!sc.intro) err(w('manca intro')); else { checkText(w('intro.when'), sc.intro.when); checkText(w('intro.where'), sc.intro.where); lines(w('intro.scene'), sc.intro.scene, d0, castKeys, 4); }
  if (!arr(w('hud'), sc.hud, 2)) {} else sc.hud.forEach((h, i) => {
    if (!WIDGETS.includes(h.type)) err(w(`hud[${i}].type non valido`)); checkText(w(`hud[${i}].title`), h.title);
    [d0, d1].forEach((d) => { try { const data = h.build(d); if (data == null) err(w(`hud[${i}].build restituisce null`)); } catch (e) { err(w(`hud[${i}].build lancia: ${e.message}`)); } });
  });
  if (!arr(w('wild'), sc.wild, 4)) {} else {
    const ids = new Set(); let dyn = 0;
    sc.wild.forEach((x) => {
      const where = `${sc.id}/wild/${x.id}`;
      if (ids.has(x.id)) err(where + ': id duplicato'); ids.add(x.id);
      checkText(where + '.title', x.title);
      if (x.after) x.after.forEach((n) => { if (!sc.nodes[n]) err(`${where}: after → nodo inesistente ${n}`); });
      [d0, d1].forEach((d, i) => checkNode(`${where}#${i}`, x.node, d, castKeys, { wild: true }));
      if (typeof x.node.scene === 'function' || x.node.choices.some((c) => typeof c.fx === 'function' || typeof c.r === 'function')) dyn++;
    });
    if (dyn < 2) err(w(`almeno 2 imprevisti devono dipendere dallo stato (ho ${dyn})`));
    if (sc.wild.length > 6) err(w('troppi imprevisti (max 6)'));
  }
  if (!arr(w('shocks'), sc.shocks, 3)) {} else {
    sc.shocks.forEach((s) => [d0, d1].forEach((d) => checkShock(`${sc.id}/shock/${s.id}`, s, d)));
    const k = sc.shocks.reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {});
    if ((k.neg || 0) < 2 || (k.pos || 0) < 1) err(w(`shock: servono ≥2 neg e ≥1 pos (ho ${JSON.stringify(k)})`));
    sc.shocks.filter((s) => s.kind === 'neg' && s.hit).forEach((s) => { if (!s.hit(d0)) warn(w(`shock ${s.id}: non colpisce nemmeno uno stato iniziale`)); if (s.hit(d1)) warn(w(`shock ${s.id}: colpisce anche uno stato ben preparato`)); });
  }
  if (!sc.fc) err(w('manca fc')); else {
    checkText(w('fc.crm'), sc.fc.crm); checkText(w('fc.risk'), sc.fc.risk);
    MP.forEach((m) => checkText(w(`fc.people.${m}`), sc.fc.people && sc.fc.people[m]));
    if (arr(w('fc.custom'), sc.fc.custom, 2)) sc.fc.custom.forEach((c) => {
      const where = `${sc.id}/fc/${c.id}`;
      ['q', 'evidence', 'honest', 'bluff', 'vague'].forEach((k) => checkText(`${where}.${k}`, c[k]));
      ['evidence', 'honest', 'bluffCaught', 'bluffPassed', 'vague'].forEach((k) => checkText(`${where}.react.${k}`, c.react && c.react[k]));
      [d0, d1].forEach((d) => { ['if', 'has'].forEach((f) => { if (c[f]) { try { if (typeof c[f](d) !== 'boolean') err(`${where}.${f}: non boolean`); } catch (e) { err(`${where}.${f} lancia: ${e.message}`); } } }); });
    });
  }
  /* esclusioni dai banchi generici (id inesistenti = refuso silenzioso) */
  (sc.noWild || []).forEach((id) => { if (!(CL.wildGeneric || []).some((x) => x.id === id)) err(w(`noWild: imprevisto generico inesistente "${id}"`)); });
  (sc.noShock || []).forEach((id) => { if (!(CL.shocksGeneric || []).some((x) => x.id === id)) err(w(`noShock: shock generico inesistente "${id}"`)); });
  ((sc.fc && sc.fc.skipGaps) || []).forEach((k) => { if (!MP.includes(k)) err(w(`fc.skipGaps: lettera MEDDPICC inesistente "${k}"`)); });
  /* nodi e scelte */
  for (const [nid, n] of Object.entries(sc.nodes)) {
    if (strict) {
      if (!n.when) err(w(`${nid}: manca when`));
      if (!n.view) err(w(`${nid}: manca view`));
    }
    if (n.view && !['call', 'meeting', 'walk', 'desk', 'phone', 'mail', 'car'].includes(n.view)) err(w(`${nid}: view non valida`));
    n.choices.forEach((c) => {
      const where = `${sc.id}/${nid}/${c.id}`;
      if (strict && !c.react) err(`${where}: manca react`);
      if (strict && !c.say) warn(`${where}: manca say`);
      if (c.say != null) checkText(where + '.say', c.say);
      if (c.react != null) [d0, d1].forEach((d) => lines(where + '.react', c.react, d, castKeys, 1));
    });
    [d0, d1].forEach((d) => lines(`${sc.id}/${nid}.scene`, n.scene, d, castKeys, 1));
    const thinkCount = (typeof n.scene === 'function' ? n.scene(d0) : n.scene).filter((l) => l.think).length;
    if (strict && !thinkCount) warn(w(`${nid}: nessun pensiero (think)`));
  }
}

console.log(`\nErrori: ${errors} · avvisi: ${warns}`);
if (errors) process.exit(1);
