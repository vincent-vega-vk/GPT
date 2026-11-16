// Hand-drawn stroke glyphs (24×24) so the zodiac never falls back to emoji on iOS.
const SEGNI_PATH = {
  ariete: 'M12 21V8.5M12 8.5C12 5 10.3 3 8 3 5.8 3 4.5 4.6 4.5 6.5c0 1.5.8 2.7 2 3.3M12 8.5C12 5 13.7 3 16 3c2.2 0 3.5 1.6 3.5 3.5 0 1.5-.8 2.7-2 3.3',
  toro: 'M12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM4.5 3C5.5 7 8.5 10 12 10s6.5-3 7.5-7',
  gemelli: 'M5 3.5c4.5 2 9.5 2 14 0M5 20.5c4.5-2 9.5-2 14 0M9 5v14M15 5v14',
  cancro: 'M9.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM4.5 8.5C5.5 5 10 3.5 14 4c2.5.3 4.5 1.3 6 2.8M19.5 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19.5 15.5c-1 3.5-5.5 5-9.5 4.5-2.5-.3-4.5-1.3-6-2.8',
  leone: 'M9.5 15.5a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0ZM9.3 14.5C8.5 12 7 10.5 7 8a5 5 0 0 1 10 0c0 3.5-3 6.5-3 9.5 0 2 1.2 3.5 3 3.5 1.2 0 2.2-.6 2.8-1.6',
  vergine: 'M3.5 5.5C4.9 5.5 6 6.5 6 8v10M6 8c0-1.5 1.1-2.5 2.5-2.5S11 6.5 11 8v10M11 8c0-1.5 1.1-2.5 2.5-2.5S16 6.5 16 8v8c0 2.5 1.5 4.3 4 4.8M16 12.5c1.2-1.7 4.5-1.6 4.5 1.2 0 3-3.4 5.5-7.5 7.3',
  bilancia: 'M3.5 20.5h17M3.5 16H9a4.6 4.6 0 1 1 6 0h5.5',
  scorpione: 'M3 5.5C4.4 5.5 5.5 6.5 5.5 8v10M5.5 8c0-1.5 1.1-2.5 2.5-2.5s2.5 1 2.5 2.5v10M10.5 8c0-1.5 1.1-2.5 2.5-2.5s2.5 1 2.5 2.5v9c0 1.4 1.1 2.5 2.5 2.5h3M18.5 17l2.5 2.5-2.5 2.5',
  sagittario: 'M4.5 19.5l15-15M11 4.5h8.5V13M6.5 11.5l6 6',
  capricorno: 'M3.5 5l3.5 10.5L10.5 6c.6-1.5 2.4-1.5 3 0 1 2.6 1.5 6 1.5 9.5 0 2.7-1.5 4.8-3.5 5.5M15 16.5a2.75 2.75 0 1 0 5.5 0 2.75 2.75 0 0 0-5.5 0Z',
  acquario: 'M3 9.5l3-3 3 3 3-3 3 3 3-3 3 3M3 16.5l3-3 3 3 3-3 3 3 3-3 3 3',
  pesci: 'M6 3.5c3 4.5 3 12.5 0 17M18 3.5c-3 4.5-3 12.5 0 17M4 12h16',
};

const ICONE_PATH = {
  oggi: 'M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1ZM19 16.5v4M17 18.5h4',
  coppia: 'M14.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM20.5 12a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z',
  cielo: 'M19.5 14.2A8 8 0 1 1 9.8 4.5a6.3 6.3 0 0 0 9.7 9.7ZM17 4v3M15.5 5.5h3',
  regola: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM9 19.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
  condividi: 'M12 15V3.5M7.5 7.5L12 3l4.5 4.5M5 12.5v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6.5',
  ricarica: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v4h-4',
  chiudi: 'M6 6l12 12M18 6L6 18',
  avanti: 'M9 5l7 7-7 7',
};

const svg = (d, classe, etichetta) =>
  `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${etichetta ? `role="img" aria-label="${etichetta}"` : 'aria-hidden="true"'}><path d="${d}"/></svg>`;

export const glifo = (id, etichetta = '') => svg(SEGNI_PATH[id], 'glifo', etichetta);
export const icona = (id) => svg(ICONE_PATH[id], 'icona');

let contatore = 0;
const CRATERI = [[-18, -20, 9], [14, -8, 6], [-6, 16, 11], [22, 20, 5], [-28, 6, 5], [8, -30, 4], [26, -22, 3.5]];

// Moon disc with the real terminator. `fase` is the phase angle: 0 new, 90 first quarter, 180 full.
export function lunaSVG(fase, etichetta = '') {
  const r = 50;
  const calante = fase > 180;
  const f = calante ? 360 - fase : fase;
  const rx = Math.abs(Math.cos((f * Math.PI) / 180)) * r;
  const luce = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${f < 90 ? 0 : 1} 0 ${-r}Z`;
  const id = `luce-${++contatore}`;
  const crateri = CRATERI.map(([x, y, cr]) => `<circle cx="${x}" cy="${y}" r="${cr}"/>`).join('');
  return `<svg class="luna" viewBox="-54 -54 108 108" role="img" aria-label="${etichetta}">
    <defs><clipPath id="${id}"><path d="${luce}"${calante ? ' transform="scale(-1 1)"' : ''}/></clipPath></defs>
    <circle r="${r}" class="luna-ombra"/><g class="luna-crateri-ombra">${crateri}</g>
    <g clip-path="url(#${id})"><circle r="${r}" class="luna-luce"/><g class="luna-crateri-luce">${crateri}</g></g>
    <circle r="${r}" class="luna-bordo"/>
  </svg>`;
}
