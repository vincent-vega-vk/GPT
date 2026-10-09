#!/usr/bin/env node
// Valida un frammento del grafo delle province: node tools/validate_provinces.js data/provinces/<cluster>.json
// Esce con codice 1 se ci sono errori. Gli avvisi non bloccano.
const fs = require('fs');
const L = require('./geo_lib.js');
const seas = require('../data/provinces/_seas.json');
const file = process.argv[2];
if (!file) { console.error('Uso: node tools/validate_provinces.js <frammento.json>'); process.exit(2); }
const errors = [], warns = [];
let frag;
try { frag = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('JSON non valido:', e.message); process.exit(1); }
const NM = L.nationMap();
const ref = (r) => { if (typeof r !== 'string' || !r.includes(':')) return null; const i = r.indexOf(':'); const id = r.slice(0, i), name = r.slice(i + 1); if (!NM[id]) return null; const idx = NM[id].regions.findIndex(x => x[0] === name); return idx < 0 ? null : { id, idx, name }; };
const nations = frag.nations || {};
if (!Object.keys(nations).length) errors.push('Nessuna nazione nel frammento (chiave "nations").');
const allAdj = {};
for (const [id, arr] of Object.entries(nations)) {
  const n = NM[id];
  if (!n) { errors.push(`${id}: non è una nazione giocabile.`); continue; }
  if (!Array.isArray(arr) || arr.length !== n.regions.length) { errors.push(`${id}: servono ${n.regions.length} province nell'ordine di data.js, trovate ${Array.isArray(arr) ? arr.length : 'n/d'}.`); continue; }
  arr.forEach((p, i) => {
    const key = `${id}:${n.regions[i][0]}`;
    if (p.region !== n.regions[i][0]) errors.push(`${id}[${i}]: region "${p.region}" ≠ "${n.regions[i][0]}" (nome e ordine devono coincidere con data.js).`);
    if (typeof p.lon !== 'number' || typeof p.lat !== 'number') errors.push(`${key}: lon/lat mancanti.`);
    else if (!L.inCountry(id, p.lon, p.lat)) { const at = L.countryAt(p.lon, p.lat); const b = L.bbox(id); errors.push(`${key}: il punto (${p.lon}, ${p.lat}) non è dentro il poligono di ${id}${at ? ` (cade in ${at})` : ' (cade in mare)'}. Bounding box di ${id}: lon ${b[0]}..${b[2]}, lat ${b[1]}..${b[3]}.`); }
    if (!Array.isArray(p.seas)) errors.push(`${key}: "seas" deve essere un array (vuoto se senza sbocco al mare).`);
    else p.seas.forEach(sz => { if (!seas[sz]) errors.push(`${key}: zona di mare sconosciuta "${sz}".`); });
    if (!Array.isArray(p.adj)) errors.push(`${key}: "adj" deve essere un array.`);
    else { const seen = new Set(); p.adj.forEach(a => { const r = ref(a); if (!r) errors.push(`${key}: adiacenza non risolvibile "${a}" (formato "NAZ:Nome regione esatto").`); else if (r.id === id && r.idx === i) errors.push(`${key}: adiacente a se stessa.`); if (seen.has(a)) warns.push(`${key}: adiacenza duplicata ${a}.`); seen.add(a); }); }
    (p.corridors || []).forEach(c => { if (!c || !ref(c.to)) errors.push(`${key}: corridoio non valido ${JSON.stringify(c)}.`); else if (!c.via) errors.push(`${key}: il corridoio verso ${c.to} deve indicare "via" (paese attraversato).`); });
    if (typeof p.sc !== 'boolean') errors.push(`${key}: "sc" (centro di rifornimento) deve essere true/false.`);
    if (n.regions[i][2] && p.sc !== true) errors.push(`${key}: è la capitale, deve avere sc: true.`);
    const land = (p.adj || []).length + (p.corridors || []).length;
    if (!land && !(p.seas || []).length) errors.push(`${key}: isolata (nessuna adiacenza terrestre, corridoio o mare).`);
    allAdj[key] = new Set([...(p.adj || []), ...(p.corridors || []).map(c => c.to)]);
    // nazione vicina non dichiarata in data.js
    (p.adj || []).forEach(a => { const r = ref(a); if (r && r.id !== id && !(n.neighbors || []).includes(r.id) && !(NM[r.id].neighbors || []).includes(id)) warns.push(`${key} → ${a}: ${id} e ${r.id} non sono vicini in data.js (verrà aggiornato, controlla che il confine sia reale).`); });
  });
  // connettività interna via terra
  const keys = n.regions.map(r => `${id}:${r[0]}`); const seen = new Set([keys[0]]); const q = [keys[0]];
  while (q.length) { const k = q.shift(); keys.forEach(o => { if (!seen.has(o) && ((allAdj[k] && allAdj[k].has(o)) || (allAdj[o] && allAdj[o].has(k)))) { seen.add(o); q.push(o); } }); }
  const lone = keys.filter(k => !seen.has(k));
  if (lone.length) { const noSea = lone.filter(k => !(nations[id][keys.indexOf(k)].seas || []).length); (noSea.length ? errors : warns).push(`${id}: province non collegate via terra alla capitale: ${lone.join(', ')}${noSea.length ? ' (e senza mare: irraggiungibili)' : ' (raggiungibili solo via mare)'}.`); }
}
// simmetria entro il frammento
for (const [k, set] of Object.entries(allAdj)) set.forEach(o => { if (allAdj[o] && !allAdj[o].has(k)) warns.push(`asimmetria: ${k} → ${o} ma non viceversa (il build la simmetrizza; verifica che sia voluta).`); });
warns.forEach(w => console.log('AVVISO  ' + w));
errors.forEach(e => console.log('ERRORE  ' + e));
console.log(`\n${file}: ${Object.keys(nations).length} nazioni, ${Object.keys(allAdj).length} province — ${errors.length} errori, ${warns.length} avvisi.`);
process.exit(errors.length ? 1 : 0);
