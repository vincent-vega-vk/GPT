// Real sky: geocentric positions on the tropical zodiac, computed offline with astronomy-engine.
import {
  Body, SunPosition, EclipticGeoMoon, GeoVector, Ecliptic, MoonPhase, Illumination,
  SearchMoonPhase, Seasons, SearchLunarApsis, NextLunarApsis, KM_PER_AU,
} from 'astronomy-engine';

export const CORPI = ['sole', 'luna', 'mercurio', 'venere', 'marte', 'giove', 'saturno', 'urano', 'nettuno', 'plutone'];

const PIANETI = {
  mercurio: Body.Mercury, venere: Body.Venus, marte: Body.Mars, giove: Body.Jupiter,
  saturno: Body.Saturn, urano: Body.Uranus, nettuno: Body.Neptune, plutone: Body.Pluto,
};

export const FASI = [
  { id: 'nuova', nome: 'Luna nuova' },
  { id: 'falce-crescente', nome: 'Falce crescente' },
  { id: 'primo-quarto', nome: 'Primo quarto' },
  { id: 'gibbosa-crescente', nome: 'Gibbosa crescente' },
  { id: 'piena', nome: 'Luna piena' },
  { id: 'gibbosa-calante', nome: 'Gibbosa calante' },
  { id: 'ultimo-quarto', nome: 'Ultimo quarto' },
  { id: 'falce-calante', nome: 'Falce calante' },
];

export const MESE_SINODICO = 29.530588;
const SECONDI_LUCE_PER_UA = 499.004784;

export const norm360 = (x) => ((x % 360) + 360) % 360;
// Signed difference a − b folded into (−180, 180].
export const delta180 = (a, b) => {
  const d = norm360(a - b);
  return d > 180 ? d - 360 : d;
};

function longitudine(id, date) {
  if (id === 'sole') return SunPosition(date).elon;
  if (id === 'luna') return EclipticGeoMoon(date).lon;
  return Ecliptic(GeoVector(PIANETI[id], date, true)).elon;
}

function distanzaUA(id, date) {
  if (id === 'sole') return GeoVector(Body.Sun, date, true).Length();
  if (id === 'luna') return EclipticGeoMoon(date).dist;
  return GeoVector(PIANETI[id], date, true).Length();
}

function posizione(id, date) {
  const lon = longitudine(id, date);
  let retro = false;
  if (PIANETI[id]) {
    const prima = longitudine(id, new Date(date.getTime() - 6 * 3600e3));
    const dopo = longitudine(id, new Date(date.getTime() + 6 * 3600e3));
    retro = delta180(dopo, prima) < 0;
  }
  return { id, lon, segno: Math.floor(lon / 30) % 12, gradi: lon % 30, retro };
}

// Snapshot of the sky at a given instant.
export function cielo(date = new Date()) {
  const corpi = {};
  for (const id of CORPI) corpi[id] = posizione(id, date);
  const fase = MoonPhase(date);
  const luna = {
    fase,
    faseIdx: Math.floor(norm360(fase + 22.5) / 45) % 8,
    illum: Illumination(Body.Moon, date).phase_fraction,
    eta: (fase / 360) * MESE_SINODICO,
    crescente: fase < 180,
  };
  return { quando: date, corpi, luna };
}

// Compact fingerprint of the sky: the same sky always gives the same string.
// `decimali` sets how fine the sampling is (2 for the daily reading, 6 for "ask again").
export function firma(c, decimali = 2) {
  return CORPI.map((id) => c.corpi[id].lon.toFixed(decimali)).join('|');
}

// Slower facts for the sky tab: distances, next lunations, next season, lunar apsis.
export function dettagli(date = new Date()) {
  const lunaKm = distanzaUA('luna', date) * KM_PER_AU;
  const soleUA = distanzaUA('sole', date);
  const nuova = SearchMoonPhase(0, date, 40);
  const piena = SearchMoonPhase(180, date, 40);

  const stagioni = [];
  for (const anno of [date.getUTCFullYear(), date.getUTCFullYear() + 1]) {
    const s = Seasons(anno);
    stagioni.push(
      { id: 'equinozio-primavera', nome: 'Equinozio di primavera', quando: s.mar_equinox.date },
      { id: 'solstizio-estate', nome: "Solstizio d'estate", quando: s.jun_solstice.date },
      { id: 'equinozio-autunno', nome: "Equinozio d'autunno", quando: s.sep_equinox.date },
      { id: 'solstizio-inverno', nome: "Solstizio d'inverno", quando: s.dec_solstice.date },
    );
  }
  const stagione = stagioni.find((s) => s.quando > date);

  let apside = SearchLunarApsis(date);
  if (apside.time.date <= date) apside = NextLunarApsis(apside);

  return {
    lunaKm,
    soleUA,
    soleKm: soleUA * KM_PER_AU,
    luceSole: soleUA * SECONDI_LUCE_PER_UA,
    lunaNuova: nuova ? nuova.date : null,
    lunaPiena: piena ? piena.date : null,
    stagione,
    apside: { perigeo: apside.kind === 0, quando: apside.time.date, km: apside.dist_km },
  };
}

// Sun position for a birth date (local noon): gives the sign without hard-coded cusp dates.
export function soleAllaNascita(anno, mese, giorno) {
  const date = new Date(anno, mese - 1, giorno, 12, 0, 0);
  const lon = SunPosition(date).elon;
  const gradi = lon % 30;
  return { lon, segno: Math.floor(lon / 30) % 12, gradi, cuspide: gradi < 0.75 || gradi > 29.25 };
}

// Cheap live longitudes of Sun and Moon, for the ticking readout in the sky tab.
export const longitudiVeloci = (date = new Date()) => ({
  sole: SunPosition(date).elon,
  luna: EclipticGeoMoon(date).lon,
});
