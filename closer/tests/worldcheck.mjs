/* I mondi nascosti contano davvero? Gioca il percorso migliore di un mondo negli altri mondi (stesse scelte) e misura il rimpianto:
   se il copione ottimo di A funziona anche in B, i mondi sono un abbellimento e non cambiano la mossa giusta.
   Uso: node tests/worldcheck.mjs [id] [--strict]   (con --strict esce con errore se un caso reale ha mondi indistinguibili) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|[1-3]\d|60)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;
const only = process.argv.find((a, i) => i > 1 && !a.startsWith('--'));
const strict = process.argv.includes('--strict');

function allPaths(d, visit, ids = [], depth = 0) {
  if (depth > 14) return;
  for (const { c } of CL.choicesFor(d, null).filter((x) => !x.c.jolly)) {
    const d2 = CL.cloneDeal(d);
    CL.pick(d2, c.id, null);
    const ids2 = ids.concat(d.node + ':' + c.id);
    if (d2.over) visit(d2, ids2); else allPaths(d2, visit, ids2, depth + 1);
  }
}
function replayIds(sc, world, ids) {
  const d = CL.newDeal(sc, { world });
  for (const step of ids) {
    const [node, cid] = step.split(':');
    if (d.over || d.node !== node) return null;
    if (!CL.choicesFor(d, null).some((x) => x.c.id === cid)) return null;
    CL.pick(d, cid, null);
  }
  return d.over ? (d.over === 'DQ' ? 0 : CL.prob(d).p) : null;
}

let bad = 0;
for (const sc of CL.scenarios) {
  if (only && sc.id !== only) continue;
  const ws = (sc.worlds || []).map((w) => w.id);
  if (ws.length < 2) { if (sc.tier === 'real') { console.log(`✗ ${sc.id}: caso reale senza mondi`); bad++; } continue; }
  const best = {};
  ws.forEach((w) => { let b = { p: -1, ids: [] }; allPaths(CL.newDeal(sc, { world: w }), (d, ids) => { const p = d.over === 'DQ' ? 0 : CL.prob(d).p; if (p > b.p) b = { p, ids }; }); best[w] = b; });
  console.log(`▸ ${sc.id} · mondi ${ws.join(', ')}`);
  let minRegret = 1;
  ws.forEach((a) => ws.forEach((b) => {
    if (a === b) return;
    const pc = replayIds(sc, b, best[a].ids);
    const regret = pc == null ? 1 : best[b].p - pc;
    minRegret = Math.min(minRegret, regret);
    console.log(`   copione migliore di ${a} giocato in ${b}: ${pc == null ? 'percorso diverso (non applicabile)' : (pc * 100).toFixed(0) + '%'} · migliore in ${b} ${(best[b].p * 100).toFixed(0)}% · rimpianto ${(regret * 100).toFixed(0)} punti`);
  }));
  const same = ws.every((w) => best[w].ids.join('>') === best[ws[0]].ids.join('>'));
  const ok = minRegret >= 0.12 && !same;
  console.log(`   ${ok ? '✓' : '✗'} i mondi cambiano la mossa giusta (rimpianto minimo ${(minRegret * 100).toFixed(0)} punti${same ? ', percorso migliore identico' : ''})`);
  if (!ok) bad++;
}
console.log(bad ? `\nMondi: ${bad} casi da correggere` : '\nMondi: ok');
if (strict && bad) process.exit(1);
