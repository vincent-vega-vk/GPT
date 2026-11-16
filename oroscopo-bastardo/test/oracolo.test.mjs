import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEGNI, TEMI, LETTURE_PER_SEGNO, LETTURE_PER_TEMA, chiaveCoppia } from '../src/segni.js';
import { cielo, firma, dettagli, soleAllaNascita, FASI } from '../src/cielo.js';
import { letturaDelGiorno, letturaAdesso, bastardometro, presagi, compatibilita, aspetto, sfigaCosmica } from '../src/oracolo.js';
import coppie from '../content/coppie.mjs';

const leggi = (id) => JSON.parse(readFileSync(new URL(`../public/data/letture/${id}.json`, import.meta.url), 'utf8'));

test('la libreria ha 999 letture uniche per segno e nessun doppione tra segni', () => {
  const tutte = new Set();
  for (const s of SEGNI) {
    const l = leggi(s.id);
    assert.equal(l.length, LETTURE_PER_SEGNO);
    assert.equal(new Set(l).size, LETTURE_PER_SEGNO);
    for (const t of l) {
      assert.ok(t.length > 60 && t.length < 400, `lunghezza anomala: ${t}`);
      assert.ok(!/[{}<>"']/.test(t), `carattere vietato: ${t}`);
      tutte.add(t);
    }
  }
  assert.equal(tutte.size, 12 * LETTURE_PER_SEGNO);
  assert.equal(LETTURE_PER_SEGNO, 999);
});

test('il cielo calcolato coincide con posizioni note', () => {
  // 2024-04-08 18:18 UTC: total solar eclipse, so Sun and Moon share the same longitude in Aries.
  const eclissi = cielo(new Date('2024-04-08T18:18:00Z'));
  assert.equal(eclissi.corpi.sole.segno, 0);
  assert.ok(Math.abs(eclissi.corpi.sole.lon - eclissi.corpi.luna.lon) < 0.3);
  assert.equal(FASI[eclissi.luna.faseIdx].id, 'nuova');
  assert.ok(eclissi.luna.illum < 0.01);
  // 2024-04-08: Mercury was retrograde (1–25 April 2024), Venus was not.
  assert.equal(eclissi.corpi.mercurio.retro, true);
  assert.equal(eclissi.corpi.venere.retro, false);
  // 2025-03-20 09:01 UTC: March equinox, Sun at 0° Aries.
  const equinozio = cielo(new Date('2025-03-20T09:01:00Z'));
  assert.ok(equinozio.corpi.sole.lon < 0.02 || equinozio.corpi.sole.lon > 359.98);
  // 2025-09-07 18:11 UTC: total lunar eclipse, full Moon in Pisces opposite the Sun in Virgo.
  const piena = cielo(new Date('2025-09-07T18:11:00Z'));
  assert.equal(FASI[piena.luna.faseIdx].id, 'piena');
  assert.equal(piena.corpi.luna.segno, 11);
  assert.equal(piena.corpi.sole.segno, 5);
});

test('la data di nascita dà il segno giusto, cuspidi comprese', () => {
  assert.equal(SEGNI[soleAllaNascita(1990, 8, 10).segno].id, 'leone');
  assert.equal(SEGNI[soleAllaNascita(1985, 1, 1).segno].id, 'capricorno');
  assert.equal(SEGNI[soleAllaNascita(2000, 11, 16).segno].id, 'scorpione');
  assert.equal(SEGNI[soleAllaNascita(1995, 3, 25).segno].id, 'ariete');
  assert.equal(soleAllaNascita(1990, 8, 10).cuspide, false);
});

test('la lettura del giorno è stabile nello stesso giorno e cambia con il cielo', () => {
  const mattina = new Date(2026, 10, 16, 7, 5), sera = new Date(2026, 10, 16, 23, 40);
  for (let segno = 0; segno < 12; segno++) {
    const a = letturaDelGiorno(segno, mattina), b = letturaDelGiorno(segno, sera);
    assert.equal(a.n, b.n);
    assert.ok(a.n >= 1 && a.n <= LETTURE_PER_SEGNO);
    assert.equal(TEMI[Math.floor((a.n - 1) / LETTURE_PER_TEMA)], a.tema);
  }
  // Over a year, with the app's memory of recent readings, a sign never sees the same one twice
  // and every planet gets its turn.
  for (const segno of [0, 3, 7, 10]) {
    const visti = [], temi = {};
    for (let g = 0; g < 365; g++) {
      const l = letturaDelGiorno(segno, new Date(2026, 0, 1 + g), visti.slice(-600));
      visti.push(l.n);
      temi[l.tema] = (temi[l.tema] || 0) + 1;
    }
    assert.equal(new Set(visti).size, 365);
    for (const t of TEMI) assert.ok(temi[t] >= 12 && temi[t] <= 80, `${SEGNI[segno].id}: ${t} domina ${temi[t]} giorni`);
  }
});

test('«chiedi di nuovo» evita le letture già viste e dipende dall’istante', () => {
  const t = new Date(2026, 10, 16, 14, 30, 0);
  const prima = letturaAdesso(3, t);
  const dopo = letturaAdesso(3, new Date(t.getTime() + 1000));
  assert.notEqual(firma(prima.cielo, 6), firma(dopo.cielo, 6));
  const evitata = letturaAdesso(3, t, [prima.n]);
  assert.notEqual(evitata.n, prima.n);
  assert.equal(evitata.tema, prima.tema);
});

test('bastardometro e presagi restano nei limiti', () => {
  for (let g = 0; g < 120; g++) {
    const c = cielo(new Date(2026, 0, 1 + g * 3, 12));
    for (let segno = 0; segno < 12; segno++) {
      const m = bastardometro(c, segno);
      for (const k of ['amore', 'lavoro', 'soldi', 'sfiga']) assert.ok(m[k] >= 3 && m[k] <= 99);
      assert.ok(m.voto >= 0 && m.voto <= 10);
      const p = presagi(c, segno);
      assert.notEqual(p.evitare, segno);
      assert.match(p.ora, /^\d\d:\d\d$/);
      assert.ok(p.numero >= 1 && p.numero <= 90);
    }
    const s = sfigaCosmica(c);
    assert.ok(s.indice >= 1 && s.indice <= 99);
  }
});

test('aspetti: congiunzione, quadratura, trigono, opposizione e segni che non si vedono', () => {
  assert.equal(aspetto(15, 0).id, 'congiunzione');
  assert.equal(aspetto(105, 0).id, 'quadratura');
  assert.equal(aspetto(135, 0).id, 'trigono');
  assert.equal(aspetto(195, 0).id, 'opposizione');
  assert.equal(aspetto(75, 0).id, 'sestile');
  assert.equal(aspetto(45, 0), null);
  assert.equal(aspetto(165, 0), null);
});

test('compatibilità: simmetrica, completa di testo e coerente con gli aspetti', () => {
  const c = cielo(new Date(2026, 10, 16, 12));
  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      const x = compatibilita(a, b, c), y = compatibilita(b, a, c);
      assert.deepEqual(x, y);
      assert.ok(coppie[x.chiave], `manca il testo per ${x.chiave}`);
      assert.equal(x.chiave, chiaveCoppia(a, b));
      assert.ok(x.totale >= 1 && x.totale <= 99);
      assert.ok(Math.abs(x.totale - x.base) <= 12);
    }
  }
  assert.equal(Object.keys(coppie).length, 78);
  // Trines beat squares whatever the pair.
  assert.ok(compatibilita(0, 4).base > compatibilita(0, 3).base);
  assert.equal(compatibilita(0, 4).stessoElemento, 'fuoco');
  assert.equal(compatibilita(0, 6).aspetto.id, 'opposizione');
});

test('i dettagli del cielo guardano al futuro', () => {
  const t = new Date('2026-11-16T12:00:00Z');
  const d = dettagli(t);
  assert.ok(d.lunaPiena > t && d.lunaNuova > t && d.stagione.quando > t && d.apside.quando > t);
  assert.equal(d.stagione.id, 'solstizio-inverno');
  assert.ok(d.lunaKm > 356000 && d.lunaKm < 407000);
  assert.ok(d.luceSole > 480 && d.luceSole < 510);
});
