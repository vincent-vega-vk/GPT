// Builds the library: 999 readings per sign (9 planets × 111), composed from the handwritten
// pieces in content/ as tratto + sentenza + chiusa. Output: public/data/letture/<segno>.json,
// an array of 999 strings where index = tema * 111 + k.
// Deterministic: same content => same files.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tratti1 from '../content/tratti-1.mjs';
import tratti2 from '../content/tratti-2.mjs';
import tratti3 from '../content/tratti-3.mjs';
import sentenze1 from '../content/sentenze-1.mjs';
import sentenze2 from '../content/sentenze-2.mjs';
import chiuse from '../content/chiuse.mjs';
import { SEGNI, TEMI, LETTURE_PER_TEMA, LETTURE_PER_SEGNO } from '../src/segni.js';
import { hash } from '../src/oracolo.js';
import { tipografia } from '../src/tipografia.js';

const TRATTI = { ...tratti1, ...tratti2, ...tratti3 };
const SENTENZE = { ...sentenze1, ...sentenze2 };

function mulberry32(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mescola(lista, rnd) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deals items in shuffled rounds so every piece is used about equally often.
function mazzo(lista, rnd) {
  let pila = [];
  return () => {
    if (!pila.length) pila = mescola(lista, rnd);
    return pila.pop();
  };
}

// 0: tratto + sentenza + chiusa · 1: tratto + sentenza · 2: sentenza + chiusa
const FORME = [0, 1, 2];

export function genera() {
  const tutte = new Set();
  const libreria = {};
  const uso = { tratti: 0, chiuse: 0 };

  for (const segno of SEGNI) {
    const rnd = mulberry32(hash(`letture|${segno.id}`));
    const pescaTratto = mazzo(TRATTI[segno.id], rnd);
    const pescaGenerica = mazzo(chiuse.generiche, rnd);
    const coppieUsate = new Set();
    const letture = [];

    for (const tema of TEMI) {
      const pescaSentenza = mazzo(SENTENZE[tema], rnd);
      const pescaChiusaTema = mazzo(chiuse.tema[tema], rnd);
      const forme = mescola(Array.from({ length: LETTURE_PER_TEMA }, (_, i) => FORME[i % 3]), rnd);

      for (let k = 0; k < LETTURE_PER_TEMA; k++) {
        const sentenza = pescaSentenza();
        let testo = null;
        for (let tentativo = 0; tentativo < 200 && !testo; tentativo++) {
          const tratto = forme[k] !== 2 ? pescaTratto() : null;
          const chiusa = forme[k] !== 1 ? (rnd() < 0.5 ? pescaChiusaTema() : pescaGenerica()) : null;
          // The same sentenza never meets the same partner twice within a sign.
          const legami = [tratto && `T|${tratto}|${sentenza}`, chiusa && `C|${sentenza}|${chiusa}`].filter(Boolean);
          const candidato = [tratto, sentenza, chiusa].filter(Boolean).join(' ');
          if (tutte.has(candidato) || legami.some((l) => coppieUsate.has(l))) continue;
          legami.forEach((l) => coppieUsate.add(l));
          tutte.add(candidato);
          testo = candidato;
          if (tratto) uso.tratti++;
          if (chiusa) uso.chiuse++;
        }
        if (!testo) throw new Error(`Impossibile comporre una lettura unica: ${segno.id}/${tema}/${k}`);
        letture.push(tipografia(testo));
      }
    }

    if (letture.length !== LETTURE_PER_SEGNO) throw new Error(`${segno.id}: ${letture.length} letture`);
    libreria[segno.id] = letture;
  }

  const totale = SEGNI.length * LETTURE_PER_SEGNO;
  if (tutte.size !== totale) throw new Error(`Letture uniche: ${tutte.size} su ${totale}`);
  return { libreria, uso, totale };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { libreria, uso, totale } = genera();
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'letture');
  mkdirSync(dir, { recursive: true });
  let caratteri = 0, piuLunga = 0;
  for (const [segno, letture] of Object.entries(libreria)) {
    writeFileSync(path.join(dir, `${segno}.json`), JSON.stringify(letture));
    for (const l of letture) { caratteri += l.length; piuLunga = Math.max(piuLunga, l.length); }
  }
  console.log(`Letture: ${totale} uniche (${LETTURE_PER_SEGNO} × ${SEGNI.length} segni) · ` +
    `media ${Math.round(caratteri / totale)} caratteri, massimo ${piuLunga} · ` +
    `con tratto del segno ${Math.round((uso.tratti / totale) * 100)}%, con chiusa ${Math.round((uso.chiuse / totale) * 100)}%`);
}
