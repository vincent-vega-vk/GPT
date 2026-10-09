#!/usr/bin/env node
// Unisce data/provinces/*.json in js/provinces.js (grafo simmetrico delle province e dei mari).
const fs = require('fs'); const path = require('path');
const L = require('./geo_lib.js');
const dir = path.join(L.ROOT, 'data/provinces');
const seas = JSON.parse(fs.readFileSync(path.join(dir, '_seas.json'), 'utf8'));
const NM = L.nationMap();
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
const P = {}; const warns = []; const errors = [];
const idOf = (r) => { const i = r.indexOf(':'); const nat = r.slice(0, i), name = r.slice(i + 1); const n = NM[nat]; if (!n) return null; const idx = n.regions.findIndex(x => x[0] === name); return idx < 0 ? null : `${nat}.${idx}`; };
files.forEach(f => {
  const frag = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  Object.entries(frag.nations || {}).forEach(([nat, arr]) => arr.forEach((p, idx) => {
    const id = `${nat}.${idx}`; if (P[id]) errors.push(`${id} definita due volte (${f}).`);
    P[id] = { id, nation: nat, idx, name: NM[nat].regions[idx][0], lon: p.lon, lat: p.lat, seas: [...new Set(p.seas || [])], adj: [], corridors: [], sc: !!p.sc, capital: !!NM[nat].regions[idx][2], _adj: p.adj || [], _cor: p.corridors || [], _src: f };
  }));
});
L.GEO.NATIONS.forEach(n => n.regions.forEach((r, i) => { if (!P[`${n.id}.${i}`]) errors.push(`Manca la provincia ${n.id}.${i} (${r[0]}).`); }));
const link = (a, b, kind) => { if (!P[a] || !P[b] || a === b) return; const fa = kind === 'cor' ? 'corridors' : 'adj'; if (!P[a][fa].includes(b)) P[a][fa].push(b); if (!P[b][fa].includes(a)) P[b][fa].push(a); };
Object.values(P).forEach(p => {
  p._adj.forEach(r => { const o = idOf(r); if (!o) errors.push(`${p.id}: riferimento non valido ${r}`); else { if (!P[o]._adj.some(x => idOf(x) === p.id)) warns.push(`simmetrizzata: ${p.id} (${p.name}) ↔ ${o} (${P[o].name}) dichiarata solo in ${p._src}`); link(p.id, o, 'adj'); } });
  p._cor.forEach(c => { const o = idOf(c.to); if (o) { link(p.id, o, 'cor'); (p.corridorVia = p.corridorVia || {})[o] = c.via; (P[o].corridorVia = P[o].corridorVia || {})[p.id] = c.via; } });
});
const S = {}; Object.entries(seas).forEach(([id, s]) => S[id] = { id, name: s.name, lon: s.lon, lat: s.lat, adj: s.adj.slice(), coasts: [] });
Object.values(P).forEach(p => p.seas.forEach(sz => S[sz] && S[sz].coasts.push(p.id)));
Object.values(S).forEach(s => { if (!s.coasts.length) warns.push(`il mare ${s.id} (${s.name}) non ha coste giocabili`); });
// connettività globale (terra + mare + corridoi)
const nodes = [...Object.keys(P), ...Object.keys(S)]; const nb = (id) => P[id] ? [...P[id].adj, ...P[id].corridors, ...P[id].seas] : [...S[id].adj, ...S[id].coasts];
const seen = new Set([nodes[0]]); const q = [nodes[0]]; while (q.length) { const k = q.shift(); nb(k).forEach(o => { if (!seen.has(o)) { seen.add(o); q.push(o); } }); }
const unreached = nodes.filter(x => !seen.has(x)); if (unreached.length) warns.push(`nodi non collegati al resto del mondo: ${unreached.join(', ')}`);
// vicinanze nazionali derivate dal grafo
const natNb = {}; Object.values(P).forEach(p => [...p.adj, ...p.corridors].forEach(o => { const on = P[o].nation; if (on !== p.nation) { (natNb[p.nation] = natNb[p.nation] || new Set()).add(on); } }));
const out = {}; Object.values(P).forEach(p => { const { _adj, _cor, _src, ...rest } = p; rest.coastal = rest.seas.length > 0; out[p.id] = rest; });
const nn = Object.fromEntries(Object.entries(natNb).map(([k, v]) => [k, [...v].sort()]));
const js = `/* Grafo delle province e dei mari — GENERATO da tools/build_provinces.js a partire da data/provinces/*.json. Non modificare a mano. */\n(function(root){const GEO=root.GEO=root.GEO||{};\nGEO.SEAS=${JSON.stringify(S)};\nGEO.PROVINCES=${JSON.stringify(out)};\nGEO.LAND_NEIGHBORS=${JSON.stringify(nn)};\n})(typeof globalThis!=='undefined'?globalThis:window);\n`;
warns.forEach(w => console.log('AVVISO  ' + w)); errors.forEach(e => console.log('ERRORE  ' + e));
if (errors.length) { console.log(`\n${errors.length} errori: js/provinces.js NON scritto.`); process.exit(1); }
fs.writeFileSync(path.join(L.ROOT, 'js/provinces.js'), js);
console.log(`\njs/provinces.js scritto: ${Object.keys(out).length} province, ${Object.keys(S).length} mari, ${Object.values(out).reduce((a, p) => a + p.adj.length, 0) / 2} confini terrestri, ${Object.values(out).reduce((a, p) => a + p.corridors.length, 0) / 2} corridoi, ${Object.values(out).filter(p => p.sc).length} centri di rifornimento. ${warns.length} avvisi.`);
