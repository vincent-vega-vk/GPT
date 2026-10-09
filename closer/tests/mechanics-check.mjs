/* Verifica che la meccanica di uno scenario non sia cambiata rispetto a una versione di riferimento (git).
   Confronta, per ogni nodo e scelta: q, fx, mp, mpx, set, integ, jolly, next; e i campi di bilanciamento
   dello scenario (list, cost, window, lep, slip, start, caps, lessons.if, endings presenti).
   Uso: node tests/mechanics-check.mjs <id-scenario|file> [--ref=HEAD]
        node tests/mechanics-check.mjs --dump <cartella>   (uso interno) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

async function dump(dir) {
  const files = fs.readdirSync(dir).filter((f) => /^(00|1\d|2\d|60)-.*\.js$/.test(f)).sort();
  for (const f of files) await import(pathToFileURL(path.join(dir, f)).href);
  const CL = globalThis.CL;
  const ser = (v) => (typeof v === 'function' ? 'fn:' + v.toString().replace(/\s+/g, ' ') : JSON.stringify(v));
  const out = {};
  for (const sc of CL.scenarios) {
    const o = { top: {}, nodes: {} };
    ['id', 'list', 'cost', 'window', 'stars', 'lep', 'slip', 'dqRefund', 'start'].forEach((k) => { o.top[k] = ser(sc[k]); });
    o.top.caps = (sc.caps || []).map((c) => [c.id, c.max, ser(c.if)]);
    o.top.lessons = (sc.lessons || []).map((l) => [l.good, ser(l.if)]);
    o.top.endings = Object.keys(sc.endings || {}).sort();
    /* imprevisti dello scenario: scelte (meccanica) e condizioni; shock e domande di Marta: condizioni ed effetti */
    o.wild = {}; (sc.wild || []).forEach((w) => { o.wild[w.id] = { after: ser(w.after), if: ser(w.if), w: w.w || 1, choices: {} }; (w.node.choices || []).forEach((c) => { o.wild[w.id].choices[c.id] = { q: c.q, fx: ser(c.fx), mp: ser(c.mp), mpx: ser(c.mpx), set: ser(c.set), integ: c.integ || 0, jolly: c.jolly || null, next: ser(c.next), if: ser(c.if) }; }); });
    o.shocks = {}; (sc.shocks || []).forEach((s2) => { o.shocks[s2.id] = { kind: s2.kind, dp: s2.dp, dpProt: s2.dpProt, w: s2.w || 1, hit: ser(s2.hit), if: ser(s2.if) }; });
    o.fcc = {}; ((sc.fc && sc.fc.custom) || []).forEach((c) => { o.fcc[c.id] = { if: ser(c.if) }; });
    for (const [nid, n] of Object.entries(sc.nodes)) {
      o.nodes[nid] = { enter: ser(n.enter), t: ser(n.t), ifs: n.choices.map((c) => ser(c.if)), choices: {} };
      n.choices.forEach((c) => {
        o.nodes[nid].choices[c.id] = { q: c.q, fx: ser(c.fx), mp: ser(c.mp), mpx: ser(c.mpx), set: ser(c.set), integ: c.integ || 0, jolly: c.jolly || null, next: ser(c.next), if: ser(c.if) };
      });
    }
    out[sc.id] = o;
  }
  return out;
}

if (argv[0] === '--dump') {
  process.stdout.write(JSON.stringify(await dump(argv[1])));
} else {
  const target = argv.find((a) => !a.startsWith('--'));
  const ref = (argv.find((a) => a.startsWith('--ref=')) || '--ref=HEAD').split('=')[1];
  if (!target) { console.error('uso: node tests/mechanics-check.mjs <id|file> [--ref=HEAD]'); process.exit(2); }
  const jsDir = path.join(root, 'src', 'js');
  const all = fs.readdirSync(jsDir).filter((f) => /^(00|1\d|2\d|60)-.*\.js$/.test(f)).sort();
  const scFile = all.find((f) => f === target || f.includes('-sc-' + target) || f.endsWith(target));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'closer-ref-'));
  for (const f of all) {
    const r = spawnSync('git', ['show', `${ref}:closer/src/js/${f}`], { cwd: root, encoding: 'utf8' });
    if (r.status === 0) fs.writeFileSync(path.join(tmp, f), r.stdout);
  }
  const run = (dir) => JSON.parse(spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--dump', dir], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout);
  const A = run(tmp), B = run(jsDir);
  const idOf = (f) => (f ? Object.keys(B).find((k) => scFile && scFile.includes(k.replace('farmavita', 'farmavita'))) : null);
  const ids = scFile ? Object.keys(B).filter((k) => scFile.includes('-sc-' + (k === 'farmavita' ? 'farmavita' : k))) : Object.keys(B);
  let diffs = 0;
  const cmp = (where, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) { diffs++; console.error(`  ✗ ${where}\n      prima: ${JSON.stringify(a)}\n      ora:   ${JSON.stringify(b)}`); } };
  for (const id of (ids.length ? ids : Object.keys(B))) {
    const a = A[id], b = B[id];
    if (!a) { console.log(`(${id}: assente nel riferimento, salto)`); continue; }
    if (!b) { diffs++; console.error(`  ✗ ${id}: scenario scomparso`); continue; }
    Object.keys(a.top).forEach((k) => cmp(`${id}.${k}`, a.top[k], b.top[k]));
    /* imprevisti, shock, domande di Marta (se il riferimento li contiene) */
    Object.keys(a.wild || {}).forEach((wid) => { const aw = a.wild[wid], bw = (b.wild || {})[wid]; if (!bw) { diffs++; console.error(`  ✗ ${id}/wild:${wid}: imprevisto scomparso`); return; } ['after', 'if', 'w'].forEach((k) => cmp(`${id}/wild:${wid}.${k}`, aw[k], bw[k])); Object.keys(aw.choices).forEach((cid) => { const bc = bw.choices[cid]; if (!bc) { diffs++; console.error(`  ✗ ${id}/wild:${wid}/${cid}: scelta scomparsa`); return; } Object.keys(aw.choices[cid]).forEach((k) => cmp(`${id}/wild:${wid}/${cid}.${k}`, aw.choices[cid][k], bc[k])); }); });
    Object.keys(a.shocks || {}).forEach((sid) => { const bs = (b.shocks || {})[sid]; if (!bs) { diffs++; console.error(`  ✗ ${id}/shock:${sid}: shock scomparso`); return; } Object.keys(a.shocks[sid]).forEach((k) => cmp(`${id}/shock:${sid}.${k}`, a.shocks[sid][k], bs[k])); });
    Object.keys(a.nodes).forEach((nid) => {
      const an = a.nodes[nid], bn = b.nodes[nid];
      if (!bn) { diffs++; console.error(`  ✗ ${id}/${nid}: nodo scomparso`); return; }
      cmp(`${id}/${nid}.enter`, an.enter, bn.enter); cmp(`${id}/${nid}.t`, an.t, bn.t);
      Object.keys(an.choices).forEach((cid) => {
        const ac = an.choices[cid], bc = bn.choices[cid];
        if (!bc) { diffs++; console.error(`  ✗ ${id}/${nid}/${cid}: scelta scomparsa`); return; }
        Object.keys(ac).forEach((k) => cmp(`${id}/${nid}/${cid}.${k}`, ac[k], bc[k]));
      });
      Object.keys(bn.choices).forEach((cid) => { if (!an.choices[cid]) { diffs++; console.error(`  ✗ ${id}/${nid}/${cid}: scelta aggiunta (non ammesso)`); } });
    });
    Object.keys(b.nodes).forEach((nid) => { if (!a.nodes[nid]) { diffs++; console.error(`  ✗ ${id}/${nid}: nodo aggiunto (non ammesso)`); } });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(diffs ? `Meccanica modificata: ${diffs} differenze` : 'Meccanica invariata ✓');
  process.exit(diffs ? 1 : 0);
}
