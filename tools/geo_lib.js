// Funzioni condivise per gli strumenti del grafo delle province (Node.js)
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'js/world.js'));
require(path.join(ROOT, 'js/data.js'));
const GEO = globalThis.GEO;
const pointInRing = (x, y, r) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
const inCountry = (iso, lon, lat) => (GEO.WORLD[iso] || []).some(r => pointInRing(lon, lat, r));
const countryAt = (lon, lat) => Object.keys(GEO.WORLD).find(iso => inCountry(iso, lon, lat)) || null;
const bbox = (iso) => { let a = [999, 999, -999, -999]; (GEO.WORLD[iso] || []).forEach(r => r.forEach(([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; })); return a; };
const nationMap = () => Object.fromEntries(GEO.NATIONS.map(n => [n.id, n]));
const regionNames = (id) => nationMap()[id].regions.map(r => r[0]);
module.exports = { GEO, ROOT, pointInRing, inCountry, countryAt, bbox, nationMap, regionNames };
