// Lint for the handwritten content files.
// Usage: node scripts/controlla-contenuti.mjs content/tratti-1.mjs [altri file…]
// Exits 1 on hard errors; gender warnings are listed for manual review.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const SEGNI = ['ariete', 'toro', 'gemelli', 'cancro', 'leone', 'vergine',
  'bilancia', 'scorpione', 'sagittario', 'capricorno', 'acquario', 'pesci'];
export const TEMI = ['sole', 'luna', 'mercurio', 'venere', 'marte', 'giove', 'saturno', 'urano', 'nettuno'];

// kind -> { keys, perKey, min, max } (lengths in characters)
const REGOLE = {
  'tratti-1': { keys: SEGNI.slice(0, 4), perKey: 48, min: 45, max: 125 },
  'tratti-2': { keys: SEGNI.slice(4, 8), perKey: 48, min: 45, max: 125 },
  'tratti-3': { keys: SEGNI.slice(8, 12), perKey: 48, min: 45, max: 125 },
  'sentenze-1': { keys: TEMI.slice(0, 5), perKey: 45, min: 60, max: 165 },
  'sentenze-2': { keys: TEMI.slice(5, 9), perKey: 45, min: 60, max: 165 },
};

// Second-person forms that force a gender on the reader. Heuristic: review each hit.
const GENERE = [
  /\bti sei\b/i,
  /\b(sei|eri|sarai|saresti|fossi) stat[oa]\b/i,
  /\b(sei|eri|sarai|sembri|resti|rimani|diventi|ti senti|ti credi|ti ritrovi|ti scopri)\s+(?:(?:più|meno|molto|troppo|così|sempre|già|ancora|davvero|proprio|ormai|di nuovo|quasi|l'unic[oa])\s+)*(?!un\b|una\b|uno\b|un'|la\b|lo\b|il\b|l'|i\b|gli\b|le\b|in\b|di\b|a\b|da\b|su\b|per\b|con\b|come\b|tu\b|qui\b|lì\b|là\b|che\b|e\b|ma\b|solo\b|ancora\b|quello\b|quella\b|tanto\b|sotto\b|sopra\b|dentro\b|contro\b|senza\b|fuori\b|intorno\b|dietro\b|quando\b|mentre\b|pura\b|allergia\b)[a-zàèéìòù]+[oa]\b/i,
  /\bda sol[oa]\b/i,
  /\bte stess[oa]\b/i,
  /\b(brav[oa]|pront[oa]|convint[oa]|sicur[oa]|stanc[oa]|content[oa]|nat[oa]|innamorat[oa]|arrabbiat[oa]|fidanzat[oa]|sposat[oa]|car[oa]|tesor[oa]|benvenut[oa])\b/i,
];

const errori = [];
const avvisi = [];

function controllaStringa(s, dove, min, max, viste) {
  if (typeof s !== 'string') { errori.push(`${dove}: non è una stringa`); return; }
  if (s !== s.trim()) errori.push(`${dove}: spazi ai bordi`);
  if (/["{}<>\n\t]|  /.test(s)) errori.push(`${dove}: carattere vietato (" { } < > a capo o doppio spazio) → ${s}`);
  if (/\p{Extended_Pictographic}/u.test(s)) errori.push(`${dove}: emoji → ${s}`);
  if (!/[.!?»…]$/.test(s)) errori.push(`${dove}: manca la punteggiatura finale → ${s}`);
  if (s.length < min) errori.push(`${dove}: troppo corta (${s.length} < ${min}) → ${s}`);
  if (s.length > max) errori.push(`${dove}: troppo lunga (${s.length} > ${max}) → ${s}`);
  const chiave = s.toLowerCase().replace(/[^a-zàèéìòù0-9]+/g, ' ').trim();
  if (viste.has(chiave)) errori.push(`${dove}: duplicato di ${viste.get(chiave)} → ${s}`);
  viste.set(chiave, dove);
  for (const re of GENERE) {
    const m = s.match(re);
    if (m) { avvisi.push(`${dove}: genere? «${m[0]}» → ${s}`); break; }
  }
}

function controllaListe(dati, regola, nome, viste) {
  const chiavi = Object.keys(dati);
  for (const k of regola.keys) if (!chiavi.includes(k)) errori.push(`${nome}: manca la chiave «${k}»`);
  for (const k of chiavi) if (!regola.keys.includes(k)) errori.push(`${nome}: chiave inattesa «${k}»`);
  for (const k of regola.keys) {
    const lista = dati[k] || [];
    if (lista.length !== regola.perKey) errori.push(`${nome}.${k}: ${lista.length} righe, ne servono ${regola.perKey}`);
    lista.forEach((s, i) => controllaStringa(s, `${nome}.${k}[${i}]`, regola.min, regola.max, viste));
  }
}

export function chiaveCoppia(a, b) {
  const [i, j] = [SEGNI.indexOf(a), SEGNI.indexOf(b)].sort((x, y) => x - y);
  return `${SEGNI[i]}-${SEGNI[j]}`;
}

async function controllaFile(file) {
  const nome = path.basename(file, '.mjs');
  const mod = await import(pathToFileURL(path.resolve(file)).href);
  const dati = mod.default;
  const viste = new Map();
  if (REGOLE[nome]) {
    controllaListe(dati, REGOLE[nome], nome, viste);
  } else if (nome === 'chiuse') {
    controllaListe(dati.tema || {}, { keys: TEMI, perKey: 12, min: 25, max: 95 }, 'chiuse.tema', viste);
    const g = dati.generiche || [];
    if (g.length !== 60) errori.push(`chiuse.generiche: ${g.length} righe, ne servono 60`);
    g.forEach((s, i) => controllaStringa(s, `chiuse.generiche[${i}]`, 25, 95, viste));
  } else if (nome === 'coppie') {
    const attese = [];
    for (let i = 0; i < 12; i++) for (let j = i; j < 12; j++) attese.push(`${SEGNI[i]}-${SEGNI[j]}`);
    for (const k of attese) if (!dati[k]) errori.push(`coppie: manca «${k}»`);
    for (const k of Object.keys(dati)) if (!attese.includes(k)) errori.push(`coppie: chiave inattesa «${k}»`);
    const titoli = new Map();
    for (const k of attese) {
      const c = dati[k];
      if (!c) continue;
      controllaStringa(c.x, `coppie.${k}.x`, 100, 215, viste);
      if (typeof c.t !== 'string' || c.t.length < 6 || c.t.length > 28) errori.push(`coppie.${k}.t: titolo fuori misura (6–28) → ${c.t}`);
      if (/[."{}<>]/.test(c.t || '')) errori.push(`coppie.${k}.t: carattere vietato → ${c.t}`);
      const tk = (c.t || '').toLowerCase();
      if (titoli.has(tk)) errori.push(`coppie.${k}.t: titolo duplicato di ${titoli.get(tk)}`);
      titoli.set(tk, k);
    }
  } else {
    errori.push(`${file}: tipo di file sconosciuto`);
  }
  return nome;
}

const files = process.argv.slice(2);
if (files.length) {
  for (const f of files) {
    try { await controllaFile(f); } catch (e) { errori.push(`${f}: ${e.message}`); }
  }
  if (avvisi.length) console.log(`AVVISI genere (${avvisi.length}) — da rivedere a mano:\n` + avvisi.join('\n') + '\n');
  if (errori.length) { console.log(`ERRORI (${errori.length}):\n` + errori.join('\n')); process.exit(1); }
  console.log(`OK: ${files.join(', ')} — nessun errore, ${avvisi.length} avvisi.`);
}
