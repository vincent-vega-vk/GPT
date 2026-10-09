/* Giocare una trattativa dal terminale, "alla cieca": come la vedrebbe un giocatore (scena, battute, opzioni mescolate), senza voti sulle mosse.
   Serve ai collaudatori e ai playtest degli agenti: nessuna delle risposte mostra la sua qualità finché la trattativa non finisce.
   Uso:
     node tests/play-cli.mjs new <id> [--world=<mondo>] [--seed=N] [--name=<sessione>] [--hard]
     node tests/play-cli.mjs pick <sessione> <numero>      (sceglie l'opzione numero N della scena mostrata)
     node tests/play-cli.mjs show <sessione>               (rivisualizza la scena corrente)
     node tests/play-cli.mjs hint <sessione>               (il suggerimento della scena, come il pulsante del gioco)
     node tests/play-cli.mjs list                          (id dei casi, famiglie, mondi)
   La sessione è un file: seed + scelte fatte; ogni comando rigioca la partita da capo (deterministico).
   Al termine compare il debrief completo: mondo nascosto, qualità di ogni mossa, probabilità, lezioni. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'src', 'js');
const files = fs.readdirSync(jsDir).filter((f) => /^(00|[1-3]\d|60)-.*\.js$/.test(f)).sort();
for (const f of files) await import(pathToFileURL(path.join(jsDir, f)).href);
const CL = globalThis.CL;
const dir = process.env.CLOSER_PLAY_DIR || path.join(os.tmpdir(), 'closer-play');
fs.mkdirSync(dir, { recursive: true });
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (k, d) => { const a = argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const sessionFile = (n) => path.join(dir, n.replace(/[^\w.-]/g, '_') + '.json');

/* ───── formattazione ───── */
const fmt = (t, sc) => CL.fmt(String(t == null ? '' : t), sc);
const who = (sc, k) => { const c = CL.castOf(sc, k); return c ? c.name : k; };
function lineText(l, sc) {
  if (l.sfx && !l.t && !l.n && !l.think && !l.chat && !l.mail && !l.w && !l.you) return null;
  if (l.n) return '· ' + fmt(l.n, sc);
  if (l.think) return '(pensi) ' + fmt(l.think, sc);
  if (l.you) return 'TU: ' + fmt(l.t, sc);
  if (l.chat) return `[chat ${who(sc, l.chat.from)}${l.chat.app ? ' · ' + l.chat.app : ''}] ${fmt(l.t, sc)}`;
  if (l.mail) return `[mail da ${fmt(l.mail.from, sc)} · oggetto: ${fmt(l.mail.subj, sc)}]\n    ${fmt(l.t, sc)}`;
  if (l.w) return `${who(sc, l.w)}${l.a ? ' (' + fmt(l.a, sc) + ')' : ''}: ${fmt(l.t, sc)}`;
  return null;
}
const linesOf = (arr, d) => (Array.isArray(arr) ? arr : []).filter((l) => !l.if || l.if(d));

/* ───── rigioco deterministico ───── */
function replay(sess) {
  const sc = CL.getScenario(sess.id);
  const run = CL.newRun({ mode: 'career', seed: sess.seed, hard: !!sess.hard, pipe: [sess.id] });
  const opts = Object.assign(CL.dealOpts(run), { rnd: run.rnd, world: sess.world || undefined });
  const d = CL.newDeal(sc, opts);
  const log = [];
  const orderAt = (step) => {
    const chs = CL.choicesFor(d, run);
    const rng = CL.rng((sess.seed * 2654435761 + step * 97) >>> 0);
    return CL.shuffle(chs, rng);
  };
  let step = 0;
  for (const pk of sess.picks) {
    const order = orderAt(step);
    const o = order[pk - 1];
    if (!o) throw new Error('scelta ' + pk + ' non valida al passo ' + step);
    const wasWild = !!d.wild;
    const rec = CL.pick(d, o.c.id, run, { rnd: run.rnd });
    log.push({ rec, label: o.c.say || o.c.t, wasWild });
    step++;
    if (d.over) break;
  }
  return { sc, run, d, log, order: d.over ? null : orderAt(step), step };
}

function printScene(st, sess) {
  const { sc, run, d, order, step } = st;
  const n = CL.nodeOf(d);
  const placeOnly = (w, wh) => (wh ? String(w).replace(/\s*[·,–-]\s*(?:(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|giorno\s+\d+(?:\s+di\s+\d+)?|\d{1,2}[:.]\d{2})(?=[\s·]|$)[^·]*)$/i, '').trim() || w : w);
  const where = placeOnly(fmt(n.where || '', sc), n.when), when = n.when ? ` · ${n.when}` : '';
  console.log(`\n══ ${sc.label} · passo ${step + 1}${d.wild ? ' · IMPREVISTO: ' + fmt(d.wild.title, sc) : ''}`);
  console.log(`${where}${when}${n.view ? ' · vista ' + n.view : ''}\n`);
  linesOf(CL.val(n.scene, d), d).forEach((l) => { const t = lineText(l, sc); if (t) console.log(t); });
  console.log('\n' + fmt(n.prompt, sc));
  order.forEach((o, i) => console.log(`  ${i + 1}) ${fmt(o.c.t, sc)}${o.c.jolly ? `   [Jolly · ${CL.JOLLY[o.c.jolly].name}${o.locked ? ' · esaurito' : ''}]` : ''}`));
  if (!sess.hard) {
    const M = d.m;
    console.log(`\n[cruscotto] Fiducia ${Math.round(M.trust)} · Valore ${Math.round(M.value)} · Urgenza ${Math.round(M.urgency)} · Controllo ${Math.round(M.control)} · Rischio ${Math.round(M.risk)} · MEDDPICC: ${CL.MP.filter((m) => d.mp.has(m.k)).map((m) => m.label).join(', ') || 'nessuna lettera'} · Sconto promesso ${d.disc}% (soglia ${CL.approval(d).lep}%)`);
  }
  console.log(`\n→ scegli: node tests/play-cli.mjs pick ${sess.name} <numero>`);
}

function printDebrief(st, sess) {
  const { sc, d, log } = st;
  const sealed = CL.seal(d);
  console.log(`\n══ FINE DELLA TRATTATIVA · ${sc.label}`);
  log.forEach((x, i) => {
    const r = x.rec;
    console.log(`\n${i + 1}. ${x.wasWild ? '[imprevisto] ' : ''}${fmt(x.label, sc)}`);
    console.log(`   reazione: ${(r.react || []).map((l) => lineText(l, sc)).filter(Boolean).join(' / ')}`);
    console.log(`   qualità ${['0 errore', '1 discutibile', '2 solida', '3 da closer'][r.q]}${r.luck ? ' · ' + (r.luck.kind === 'good' ? 'fortuna' : 'sfortuna') : ''} · lettura: ${fmt(r.r, sc)}`);
  });
  if (d.over === 'DQ') { console.log('\nEsito: squalificata (hai lasciato la trattativa).'); return; }
  console.log(`\nMondo nascosto: ${d.world || '(nessuno)'}${sc.worlds ? ' — ' + ((sc.worlds.find((w) => w.id === d.world) || {}).note || '') : ''}`);
  console.log(`Probabilità di chiusura: ${Math.round(sealed.p * 100)}% · sconto ${sealed.disc}% (promesso ${d.disc}%, soglia ${sealed.lep}%) · MEDDPICC ${d.mp.size}/8 · qualità media ${(CL.avgQ(d) / 3 * 100).toFixed(0)}%`);
  if (sealed.cap) console.log(`Tetto: ${Math.round(sealed.cap.max * 100)}% — ${fmt(sealed.cap.why, sc)}`);
  (sc.lessons || []).filter((l) => { try { return l.if(d); } catch (e) { return false; } }).forEach((l) => console.log(`${l.good ? '+' : '-'} ${fmt(l.t, sc)}`));
}

/* ───── comandi ───── */
if (cmd === 'list') {
  CL.scenarios.forEach((s) => console.log(`${s.id.padEnd(22)} famiglia ${s.family.padEnd(10)} ${s.tier.padEnd(6)} mondi: ${(s.worlds || []).map((w) => w.id).join(', ') || '—'} · ${s.label}`));
} else if (cmd === 'new') {
  const id = argv[1];
  if (!CL.getScenario(id)) { console.error('caso inesistente: ' + id + ' (usa: list)'); process.exit(2); }
  const seed = Number(flag('seed', String((Date.now() % 100000) + 1)));
  const name = flag('name', id + '-' + seed);
  const sess = { name, id, seed, world: flag('world', '') || null, hard: argv.includes('--hard'), picks: [] };
  fs.writeFileSync(sessionFile(name), JSON.stringify(sess));
  const sc = CL.getScenario(id);
  console.log(`Sessione "${name}" · ${sc.label} (${sc.client}) · ${sc.teaser}`);
  if (sc.intro) { console.log(`\n── prima di entrare${sc.intro.when ? ' · ' + sc.intro.when : ''}`); linesOf(CL.val(sc.intro.scene, CL.newDeal(sc, { world: sess.world || undefined })), null).forEach((l) => { const t = lineText(l, sc); if (t) console.log(t); }); }
  printScene(replay(sess), sess);
} else if (cmd === 'pick' || cmd === 'show' || cmd === 'hint') {
  const f = sessionFile(argv[1] || '');
  if (!fs.existsSync(f)) { console.error('sessione inesistente'); process.exit(2); }
  const sess = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (cmd === 'pick') {
    const n = Number(argv[2]);
    const st0 = replay(sess);
    if (st0.d.over) { console.error('la trattativa è già finita'); process.exit(2); }
    if (!st0.order[n - 1]) { console.error('numero non valido (1-' + st0.order.length + ')'); process.exit(2); }
    if (st0.order[n - 1].locked) { console.error('jolly esaurito'); process.exit(2); }
    sess.picks.push(n);
    fs.writeFileSync(f, JSON.stringify(sess));
    const st = replay(sess);
    const last = st.log[st.log.length - 1];
    console.log(`\nTU: ${fmt(last.label, st.sc)}`);
    (last.rec.react || []).forEach((l) => { const t = lineText(l, st.sc); if (t) console.log(t); });
    if (st.d.over) printDebrief(st, sess); else printScene(st, sess);
  } else if (cmd === 'hint') {
    const st = replay(sess);
    if (st.d.over) console.log('la trattativa è finita'); else console.log(fmt(CL.nodeOf(st.d).hint, st.sc));
  } else {
    const st = replay(sess);
    if (st.d.over) printDebrief(st, sess); else printScene(st, sess);
  }
} else {
  console.error('uso: new <id> | pick <sessione> <n> | show <sessione> | hint <sessione> | list');
  process.exit(2);
}
