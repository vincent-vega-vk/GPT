// Turns the sky into verdicts: which of the 999 readings, the four gauges, the couple score.
// Pure functions: same sky + same sign => same answer.
import { SEGNI, TEMI, LETTURE_PER_TEMA, chiaveCoppia } from './segni.js';
import { cielo, firma, delta180 } from './cielo.js';

// --- deterministic randomness -------------------------------------------------

// cyrb53-style string hash folded to 32 bits.
export function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

// Uniform in [0, 1) from a string.
export const caso = (str) => hash(str) / 4294967296;

// --- aspects ------------------------------------------------------------------

export const ASPETTI = [
  { id: 'congiunzione', nome: 'congiunzione', gradi: 0 },
  { id: 'sestile', nome: 'sestile', gradi: 60 },
  { id: 'quadratura', nome: 'quadratura', gradi: 90 },
  { id: 'trigono', nome: 'trigono', gradi: 120 },
  { id: 'opposizione', nome: 'opposizione', gradi: 180 },
];
const ORB = 15;

// The sign is represented by its midpoint (15°): any body in an aspecting sign is within orb.
export const centroSegno = (segno) => segno * 30 + 15;

// Aspect between a body and a sign, or null when the two signs do not "see" each other.
export function aspetto(lonCorpo, segno) {
  const sep = Math.abs(delta180(lonCorpo, centroSegno(segno)));
  let migliore = null;
  for (const a of ASPETTI) {
    const orb = Math.abs(sep - a.gradi);
    if (orb <= ORB && (!migliore || orb < migliore.orb)) migliore = { ...a, orb, forza: 1 - orb / ORB };
  }
  return migliore;
}

const BENEFICI = new Set(['venere', 'giove', 'sole', 'luna']);
const MALEFICI = new Set(['marte', 'saturno', 'urano']);

// Signed quality of a body's aspect to a sign, in [−1, 1]: positive helps, negative hurts.
export function qualita(c, corpo, segno) {
  const a = aspetto(c.corpi[corpo].lon, segno);
  if (!a) return 0;
  let q;
  if (a.id === 'trigono') q = 1;
  else if (a.id === 'sestile') q = 0.6;
  else if (a.id === 'quadratura') q = -1;
  else if (a.id === 'opposizione') q = -0.7;
  else q = MALEFICI.has(corpo) ? -0.6 : BENEFICI.has(corpo) ? 0.9 : 0.3;
  return q * a.forza;
}

// --- which body rules the day ---------------------------------------------------

// Slow planets hold an aspect for months: their pull is flattened so they neither rule every day
// nor vanish for years. Tuned so each body leads roughly 25–55 days a year for any sign.
const LENTI = new Set(['giove', 'saturno', 'urano', 'nettuno']);

// Each of the nine bodies scores: tightness of its aspect to the sign plus sky-seeded noise.
export function dominante(c, segno, seme) {
  let top = null;
  for (const corpo of TEMI) {
    const a = aspetto(c.corpi[corpo].lon, segno);
    const forza = a ? a.forza : 0;
    const spinta = LENTI.has(corpo) ? 0.25 + 0.15 * forza : forza;
    const punti = 0.25 * spinta + 0.75 * caso(`${seme}|${segno}|${corpo}`);
    if (!top || punti > top.punti) top = { corpo, aspetto: a, punti };
  }
  return { ...top, retro: c.corpi[top.corpo].retro, segnoCorpo: c.corpi[top.corpo].segno };
}

// --- reading selection ----------------------------------------------------------

export const mezzogiorno = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
export const chiaveGiorno = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Picks reading n (1…999) for a sign from a sky snapshot. `evita` holds numbers shown recently.
export function scegli(c, segno, { decimali = 2, evita = [] } = {}) {
  const seme = firma(c, decimali);
  const dom = dominante(c, segno, seme);
  const tema = TEMI.indexOf(dom.corpo);
  const visti = new Set(evita);
  let k = hash(`${seme}|${segno}|k`) % LETTURE_PER_TEMA;
  let n = tema * LETTURE_PER_TEMA + k + 1;
  for (let i = 0; i < LETTURE_PER_TEMA && visti.has(n); i++) {
    k = (k + 1) % LETTURE_PER_TEMA;
    n = tema * LETTURE_PER_TEMA + k + 1;
  }
  return { n, tema: dom.corpo, dominante: dom, seme };
}

// The reading of the day: sky at local noon, coarse fingerprint, so it holds all day.
export function letturaDelGiorno(segno, data = new Date(), evita = []) {
  const c = cielo(mezzogiorno(data));
  return { ...scegli(c, segno, { decimali: 2, evita }), cielo: c, giorno: chiaveGiorno(data), istantanea: false };
}

// "Ask again": sky at this very instant, sampled to a millionth of a degree.
export function letturaAdesso(segno, adesso = new Date(), evita = []) {
  const c = cielo(adesso);
  return { ...scegli(c, segno, { decimali: 6, evita }), cielo: c, giorno: chiaveGiorno(adesso), istantanea: true };
}

// --- the four gauges ------------------------------------------------------------

const limita = (x, lo = 3, hi = 99) => Math.max(lo, Math.min(hi, Math.round(x)));

export function bastardometro(c, segno, seme = firma(c, 2)) {
  const q = (corpo) => qualita(c, corpo, segno);
  const rumore = (voce) => (caso(`${seme}|${segno}|${voce}`) - 0.5) * 24;
  const retro = (corpo) => (c.corpi[corpo].retro ? 1 : 0);
  const piena = c.luna.faseIdx === 4 ? 1 : 0;

  const amore = limita(50 + 28 * q('venere') + 14 * q('luna') + 8 * q('marte') - 8 * retro('venere') + rumore('amore'));
  const lavoro = limita(50 + 24 * q('saturno') + 16 * q('mercurio') + 10 * q('sole') - 10 * retro('mercurio') + rumore('lavoro'));
  const soldi = limita(50 + 28 * q('giove') + 12 * q('venere') - 6 * retro('giove') + rumore('soldi'));
  const sfiga = limita(50 - 18 * q('marte') - 18 * q('saturno') - 10 * q('urano') + 12 * retro('mercurio') + 6 * piena + rumore('sfiga'));
  const voto = Math.round(((amore + lavoro + soldi + (100 - sfiga)) / 40) * 10) / 10;
  return { amore, lavoro, soldi, sfiga, voto };
}

// Small daily omens derived from the same fingerprint.
export function presagi(c, segno, seme = firma(c, 2)) {
  // Avoid the sign Mars is crossing; if it is yours, the next sign takes the blame.
  let evitare = c.corpi.marte.segno;
  if (evitare === segno) evitare = (evitare + 1) % 12;
  const minuti = Math.floor(caso(`${seme}|${segno}|ora`) * 96) * 15;
  const ora = `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`;
  const numero = 1 + (hash(`${seme}|${segno}|numero`) % 90);
  return { evitare, ora, numero };
}

// --- compatibility --------------------------------------------------------------

export const ASPETTI_SEGNI = [
  { id: 'congiunzione', nome: 'Congiunzione', gradi: 0 },
  { id: 'semisestile', nome: 'Semisestile', gradi: 30 },
  { id: 'sestile', nome: 'Sestile', gradi: 60 },
  { id: 'quadratura', nome: 'Quadratura', gradi: 90 },
  { id: 'trigono', nome: 'Trigono', gradi: 120 },
  { id: 'quinconce', nome: 'Quinconce', gradi: 150 },
  { id: 'opposizione', nome: 'Opposizione', gradi: 180 },
];

// Indexed by distance in signs (0…6).
const BASE = [64, 41, 76, 33, 89, 38, 57];
const LETTO = [62, 44, 68, 74, 80, 50, 92];
const DIALOGO = [70, 40, 82, 30, 85, 35, 55];
const LITIGI = [58, 50, 30, 90, 25, 60, 82];

export function compatibilita(a, b, c = null) {
  const chiave = chiaveCoppia(a, b);
  const dist = Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
  const jit = (voce, ampiezza) => Math.round((caso(`${chiave}|${voce}`) - 0.5) * 2 * ampiezza);
  const elementi = [SEGNI[a].elemento, SEGNI[b].elemento];
  const conta = (el) => elementi.filter((e) => e === el).length;

  const base = limita(BASE[dist] + jit('base', 6), 1, 99);
  const voci = {
    letto: limita(LETTO[dist] + 5 * conta('fuoco') + 4 * conta('acqua') + jit('letto', 8), 5, 99),
    dialogo: limita(DIALOGO[dist] + 6 * conta('aria') - 3 * conta('acqua') + jit('dialogo', 8), 5, 99),
    litigi: limita(LITIGI[dist] + 6 * conta('fuoco') - 4 * conta('terra') + jit('litigi', 8), 5, 99),
    portafoglio: limita(50 + 14 * conta('terra') - 8 * conta('fuoco') - 4 * conta('acqua') + jit('portafoglio', 12), 5, 99),
  };

  // Today's sky nudges the score: Venus and the Moon help or hurt, Mars only hurts.
  let oggi = null;
  if (c) {
    const contributi = [
      { corpo: 'venere', v: 6 * (qualita(c, 'venere', a) + qualita(c, 'venere', b)) },
      { corpo: 'luna', v: 3 * (qualita(c, 'luna', a) + qualita(c, 'luna', b)) },
      { corpo: 'marte', v: 4 * Math.min(0, qualita(c, 'marte', a) + qualita(c, 'marte', b)) },
    ];
    if (c.corpi.venere.retro) contributi.push({ corpo: 'venere-retro', v: -3 });
    const delta = Math.max(-12, Math.min(12, Math.round(contributi.reduce((s, x) => s + x.v, 0))));
    const peso = contributi.slice().sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
    oggi = { delta, corpo: peso.corpo, segnoCorpo: c.corpi[peso.corpo.replace('-retro', '')].segno };
  }

  return {
    chiave,
    dist,
    aspetto: ASPETTI_SEGNI[dist],
    stessoElemento: elementi[0] === elementi[1] ? elementi[0] : null,
    base,
    totale: limita(base + (oggi ? oggi.delta : 0), 1, 99),
    voci,
    oggi,
  };
}

// --- a proudly made-up index for the sky tab --------------------------------------

// Counts retrogrades and tight squares/oppositions between bodies. Real inputs, invented formula.
export function sfigaCosmica(c) {
  const ids = Object.keys(c.corpi);
  const retrogradi = ids.filter((id) => c.corpi[id].retro);
  const tensioni = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const sep = Math.abs(delta180(c.corpi[ids[i]].lon, c.corpi[ids[j]].lon));
      for (const [nome, gradi] of [['quadratura', 90], ['opposizione', 180]]) {
        if (Math.abs(sep - gradi) <= 4) tensioni.push({ a: ids[i], b: ids[j], nome, orb: Math.abs(sep - gradi) });
      }
    }
  }
  const indice = limita(15 + 11 * retrogradi.length + 9 * tensioni.length + (c.luna.faseIdx === 4 ? 12 : 0), 1, 99);
  return { indice, retrogradi, tensioni };
}
