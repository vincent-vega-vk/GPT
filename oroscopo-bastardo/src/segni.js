// The twelve signs, in zodiac order. Index = floor(ecliptic longitude / 30).
export const SEGNI = [
  { id: 'ariete', nome: 'Ariete', art: "l'Ariete", dell: "dell'Ariete", elemento: 'fuoco', modo: 'cardinale', date: '21 mar – 19 apr' },
  { id: 'toro', nome: 'Toro', art: 'il Toro', dell: 'del Toro', elemento: 'terra', modo: 'fisso', date: '20 apr – 20 mag' },
  { id: 'gemelli', nome: 'Gemelli', art: 'i Gemelli', dell: 'dei Gemelli', elemento: 'aria', modo: 'mobile', date: '21 mag – 20 giu' },
  { id: 'cancro', nome: 'Cancro', art: 'il Cancro', dell: 'del Cancro', elemento: 'acqua', modo: 'cardinale', date: '21 giu – 22 lug' },
  { id: 'leone', nome: 'Leone', art: 'il Leone', dell: 'del Leone', elemento: 'fuoco', modo: 'fisso', date: '23 lug – 22 ago' },
  { id: 'vergine', nome: 'Vergine', art: 'la Vergine', dell: 'della Vergine', elemento: 'terra', modo: 'mobile', date: '23 ago – 22 set' },
  { id: 'bilancia', nome: 'Bilancia', art: 'la Bilancia', dell: 'della Bilancia', elemento: 'aria', modo: 'cardinale', date: '23 set – 22 ott' },
  { id: 'scorpione', nome: 'Scorpione', art: 'lo Scorpione', dell: 'dello Scorpione', elemento: 'acqua', modo: 'fisso', date: '23 ott – 21 nov' },
  { id: 'sagittario', nome: 'Sagittario', art: 'il Sagittario', dell: 'del Sagittario', elemento: 'fuoco', modo: 'mobile', date: '22 nov – 21 dic' },
  { id: 'capricorno', nome: 'Capricorno', art: 'il Capricorno', dell: 'del Capricorno', elemento: 'terra', modo: 'cardinale', date: '22 dic – 19 gen' },
  { id: 'acquario', nome: 'Acquario', art: "l'Acquario", dell: "dell'Acquario", elemento: 'aria', modo: 'fisso', date: '20 gen – 18 feb' },
  { id: 'pesci', nome: 'Pesci', art: 'i Pesci', dell: 'dei Pesci', elemento: 'acqua', modo: 'mobile', date: '19 feb – 20 mar' },
];

// The nine bodies that own a block of 111 readings each (9 × 111 = 999).
export const TEMI = ['sole', 'luna', 'mercurio', 'venere', 'marte', 'giove', 'saturno', 'urano', 'nettuno'];
export const LETTURE_PER_TEMA = 111;
export const LETTURE_PER_SEGNO = TEMI.length * LETTURE_PER_TEMA;

export const NOMI_CORPI = {
  sole: 'Sole', luna: 'Luna', mercurio: 'Mercurio', venere: 'Venere', marte: 'Marte',
  giove: 'Giove', saturno: 'Saturno', urano: 'Urano', nettuno: 'Nettuno', plutone: 'Plutone',
};

export const indiceSegno = (id) => SEGNI.findIndex((s) => s.id === id);

// Key of an unordered pair, always in zodiac order: "ariete-toro".
export function chiaveCoppia(a, b) {
  const [i, j] = a <= b ? [a, b] : [b, a];
  return `${SEGNI[i].id}-${SEGNI[j].id}`;
}
