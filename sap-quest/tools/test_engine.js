#!/usr/bin/env node
/* Test del motore (nessuna dipendenza):  node tools/test_engine.js */
'use strict';
const assert = require('assert');
const QQ = require('../assets/engine.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { console.error('  KO  ' + name + '\n      ' + (e && e.stack || e)); process.exitCode = 1; }
}

const facts = {
  'sap.x': { label: 'x', value: '€1,0 mld', asOf: '2026-07-01', checked: '2026-10-08', staleAfter: '2026-10-21', source: 'https://e.com', confidence: 'primary' }
};
const E = {
  mcq: { id: 'w01-l01-a', t: 'mcq', q: 'Valore {{sap.x}}?', o: ['{{sap.x}}', 'b', 'c', 'd'], a: 0, exp: 'Spiegazione lunga abbastanza.' },
  fill: { id: 'w01-l01-b', t: 'fill', q: 'Il ___ conta.', o: ['uno', 'due', 'tre'], a: 1, exp: 'Spiegazione lunga abbastanza.' },
  multi: { id: 'w01-l01-c', t: 'multi', q: 'Quali?', o: ['a', 'b', 'c', 'd'], a: [0, 2], exp: 'Spiegazione lunga abbastanza.' },
  tf: { id: 'w01-l01-d', t: 'tf', q: 'Vero?', a: false, exp: 'Spiegazione lunga abbastanza.' },
  match: { id: 'w01-l01-e', t: 'match', pairs: [['a', '1'], ['b', '2'], ['c', '3'], ['d', '4']], exp: 'Spiegazione lunga abbastanza.' },
  order: { id: 'w01-l01-f', t: 'order', q: 'Ordina', items: ['uno', 'due', 'tre', 'quattro'], exp: 'Spiegazione lunga abbastanza.' },
  bucket: { id: 'w01-l01-g', t: 'bucket', q: 'Classifica', buckets: ['A', 'B'], items: [['x', 0], ['y', 1], ['z', 0], ['k', 1]], exp: 'Spiegazione lunga abbastanza.' }
};

console.log('== engine ==');

test('fill sostituisce i segnaposto e segnala quelli mancanti', () => {
  assert.strictEqual(QQ.fill('A {{sap.x}} B', facts), 'A €1,0 mld B');
  assert.strictEqual(QQ.fill('{{nope.y}}', facts), '[dato mancante]');
});

test('mcq: mescola ma corregge sull\'opzione giusta, qualunque seed', () => {
  for (let s = 1; s <= 50; s++) {
    const p = QQ.prepare(E.mcq, facts, QQ.rng(s));
    const right = p.options.indexOf('€1,0 mld');
    assert.ok(right >= 0);
    assert.ok(p.grade(right).ok);
    assert.ok(!p.grade((right + 1) % 4).ok);
    assert.deepStrictEqual(p.factKeys, ['sap.x']);
    assert.ok(p.q.includes('€1,0 mld'));
  }
});

test('fill / multi / tf', () => {
  const f = QQ.prepare(E.fill, facts, QQ.rng(3));
  assert.ok(f.grade(f.options.indexOf('due')).ok);
  assert.ok(!f.grade(f.options.indexOf('uno')).ok);
  const m = QQ.prepare(E.multi, facts, QQ.rng(4));
  const ia = m.options.indexOf('a'), ic = m.options.indexOf('c'), ib = m.options.indexOf('b');
  assert.ok(m.grade([ia, ic]).ok);
  assert.ok(m.grade([ic, ia]).ok);
  assert.ok(!m.grade([ia]).ok);
  assert.ok(!m.grade([ia, ic, ib]).ok);
  const t = QQ.prepare(E.tf, facts);
  assert.ok(t.grade(false).ok);
  assert.ok(!t.grade(true).ok);
});

test('match: isPair e grade', () => {
  const p = QQ.prepare(E.match, facts, QQ.rng(5));
  const pairs = p.left.map((l, i) => [i, p.right.indexOf({ a: '1', b: '2', c: '3', d: '4' }[l])]);
  assert.ok(p.grade(pairs).ok);
  const bad = pairs.slice(); const t = bad[0][1]; bad[0] = [bad[0][0], bad[1][1]]; bad[1] = [bad[1][0], t];
  const g = p.grade(bad);
  assert.ok(!g.ok); assert.strictEqual(g.wrong.length, 2);
});

test('order: l\'ordine iniziale non è mai già quello corretto; grade', () => {
  for (let s = 1; s <= 40; s++) {
    const p = QQ.prepare(E.order, facts, QQ.rng(s));
    assert.notDeepStrictEqual(p.items, ['uno', 'due', 'tre', 'quattro']);
    const seq = ['uno', 'due', 'tre', 'quattro'].map(x => p.items.indexOf(x));
    assert.ok(p.grade(seq).ok);
    const swapped = seq.slice(); [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const g = p.grade(swapped);
    assert.ok(!g.ok); assert.deepStrictEqual(g.wrong, [0, 1]);
  }
});

test('bucket: grade con assegnazioni', () => {
  const p = QQ.prepare(E.bucket, facts, QQ.rng(8));
  const right = p.items.map(t => ({ x: 0, y: 1, z: 0, k: 1 }[t]));
  assert.ok(p.grade(right).ok);
  const wrong = right.slice(); wrong[0] = 1 - wrong[0];
  const g = p.grade(wrong);
  assert.ok(!g.ok); assert.deepStrictEqual(g.wrong, [0]);
});

test('Session: errore => rimessa in coda, cuore perso, stelle', () => {
  const exs = ['mcq', 'tf', 'fill'].map((k, i) => QQ.prepare(E[k], facts, QQ.rng(i + 1)));
  const s = new QQ.Session(exs, 'lesson');
  assert.strictEqual(s.hearts, 3);
  s.submit(true);                         // mcq ok
  let r = s.submit(false);                // tf sbagliata
  assert.strictEqual(r.heartsLeft, 2);
  assert.strictEqual(s.queue.length, 2);  // fill + tf rimessa
  s.submit(true); s.submit(true);         // fill ok, tf ripetuta ok
  assert.ok(s.done()); assert.ok(!s.failed);
  assert.strictEqual(s.firstTry, 2);
  assert.strictEqual(s.mistakes, 1);
  assert.strictEqual(s.stars(), 2);
  assert.strictEqual(s.xp(false), 10 + 2 * 2);
  assert.strictEqual(s.xp(true), 7);
});

test('Session: 3 errori su livello normale = fallito', () => {
  const exs = ['mcq', 'tf', 'fill', 'multi'].map((k, i) => QQ.prepare(E[k], facts, QQ.rng(i + 1)));
  const s = new QQ.Session(exs, 'lesson');
  s.submit(false); s.submit(false); const r = s.submit(false);
  assert.ok(r.failed && s.done()); assert.strictEqual(s.stars(), 0);
});

test('Session: ripetere lo stesso errore non costa un secondo cuore', () => {
  const s = new QQ.Session([QQ.prepare(E.tf, facts)], 'lesson');
  s.submit(false); const h = s.hearts; s.submit(false);
  assert.strictEqual(s.hearts, h);
});

test('SRS: giusto avanza di box, sbagliato retrocede e scade oggi', () => {
  const st = QQ.newState(); const today = '2026-10-08';
  QQ.srsRecord(st, 'w01-x', true, today);
  assert.deepStrictEqual(st.srs['w01-x'], [1, '2026-10-09', 0]);
  QQ.srsRecord(st, 'w01-x', true, '2026-10-09');
  assert.deepStrictEqual(st.srs['w01-x'], [2, '2026-10-12', 0]);
  QQ.srsRecord(st, 'w01-x', false, '2026-10-12');
  assert.deepStrictEqual(st.srs['w01-x'], [0, '2026-10-12', 1]);
  assert.deepStrictEqual(QQ.dueIds(st, '2026-10-12'), ['w01-x']);
  assert.deepStrictEqual(QQ.dueIds(st, '2026-10-11'), []);
});

test('SRS: dueIds ordina per box e poi per scadenza', () => {
  const st = QQ.newState();
  st.srs = { a: [3, '2026-10-01', 0], b: [0, '2026-10-05', 1], c: [0, '2026-10-02', 1], d: [1, '2026-10-20', 0] };
  assert.deepStrictEqual(QQ.dueIds(st, '2026-10-08'), ['c', 'b', 'a']);
  assert.deepStrictEqual(QQ.dueIds(st, '2026-10-08', 2), ['c', 'b']);
});

test('Streak: giorno dopo +1, salto di 1 giorno consuma un freeze, salto più lungo azzera', () => {
  const st = QQ.newState();
  QQ.touchActivity(st, 10, '2026-10-01'); assert.strictEqual(st.streak.count, 1);
  QQ.touchActivity(st, 10, '2026-10-01'); assert.strictEqual(st.streak.count, 1);   // stesso giorno
  QQ.touchActivity(st, 10, '2026-10-02'); assert.strictEqual(st.streak.count, 2);
  QQ.touchActivity(st, 10, '2026-10-04'); assert.strictEqual(st.streak.count, 3);   // freeze usato
  assert.strictEqual(st.streak.freezes, 0);
  QQ.touchActivity(st, 10, '2026-10-07'); assert.strictEqual(st.streak.count, 1);   // reset
  assert.strictEqual(st.streak.best, 3);
  assert.strictEqual(st.xp, 50);
  assert.strictEqual(st.daily.xp, 10);
});

test('Streak: 7 giorni consecutivi regalano un freeze', () => {
  const st = QQ.newState(); st.streak.freezes = 0;
  for (let i = 0; i < 7; i++) QQ.touchActivity(st, 1, QQ.addDays('2026-10-01', i));
  assert.strictEqual(st.streak.count, 7); assert.strictEqual(st.streak.freezes, 1);
});

test('date: addDays/diffDays attraversano il cambio ora legale', () => {
  assert.strictEqual(QQ.addDays('2026-10-24', 3), '2026-10-27');
  assert.strictEqual(QQ.diffDays('2026-10-24', '2026-10-27'), 3);
  assert.strictEqual(QQ.diffDays('2026-03-28', '2026-03-30'), 2);
});

test('factStatus', () => {
  const f = facts['sap.x'];
  assert.strictEqual(QQ.factStatus(f, '2026-10-08'), 'ok'.replace('ok', 'soon'));   // scade entro 14 gg
  assert.strictEqual(QQ.factStatus(f, '2026-09-01'), 'ok');
  assert.strictEqual(QQ.factStatus(f, '2026-10-22'), 'stale');
  assert.strictEqual(QQ.factStatus(undefined, '2026-10-22'), 'missing');
});

/* ---- bundle fixture per percorso/assessment/badge */
function mkWorld(id, n) {
  const levels = [];
  for (let i = 1; i <= n; i++) {
    levels.push({ id: `${id}-l${String(i).padStart(2, '0')}`, kind: i === n ? 'boss' : 'lesson', title: 't', lesson: { points: ['a', 'b', 'c'] },
      ex: [{ id: `${id}-l${String(i).padStart(2, '0')}-x`, t: 'tf', q: 'Vero?', a: true, exp: 'Spiegazione lunga abbastanza.' }] });
  }
  return { id, title: id, levels };
}
function mkAssess(wid) {
  return [1, 1, 2, 2, 3, 3].map((d, i) => ({ id: `${wid}-as${i + 1}`, t: 'tf', q: 'q' + i, a: true, diff: d, exp: 'Spiegazione lunga abbastanza.' }));
}
const bundle = {
  worlds: [mkWorld('w01', 14), mkWorld('w02', 16), { id: 'w03', title: 'x', levels: [], missing: true }],
  assessment: { w01: mkAssess('w01'), w02: mkAssess('w02') },
  facts
};

test('Percorso: sblocco lineare e progresso mondo', () => {
  const st = QQ.newState(); const w = bundle.worlds[0];
  assert.ok(QQ.isUnlocked(w, 0, st)); assert.ok(!QQ.isUnlocked(w, 1, st));
  QQ.completeLevel(st, w.levels[0].id, 3, '2026-10-08');
  assert.ok(QQ.isUnlocked(w, 1, st));
  const p = QQ.worldProgress(w, st);
  assert.deepStrictEqual([p.done, p.total, p.stars], [1, 14, 3]);
  assert.strictEqual(QQ.firstOpenLevel(w, st), 1);
});

test('completeLevel: rigiocare non abbassa le stelle e segnala replay', () => {
  const st = QQ.newState();
  assert.strictEqual(QQ.completeLevel(st, 'w01-l01', 3, 'x'), false);
  assert.strictEqual(QQ.completeLevel(st, 'w01-l01', 1, 'x'), true);
  assert.strictEqual(st.levels['w01-l01'].stars, 3);
  assert.strictEqual(st.levels['w01-l01'].plays, 2);
});

test('Assessment: 2 domande per mondo, adattivo, mondi senza pool saltati', () => {
  const a = new QQ.Assessment(bundle, QQ.rng(11));
  assert.strictEqual(a.total, 4);
  const seen = []; let q;
  while ((q = a.next())) {
    seen.push([q.world, q.item.diff]);
    a.answer(true);
  }
  assert.strictEqual(seen.length, 4);
  // seconda domanda di ogni mondo, dopo una risposta giusta, è diff 3
  assert.deepStrictEqual(seen.slice(0, 2).map(s => s[1]), [2, 2]);
  assert.deepStrictEqual(seen.slice(2).map(s => s[1]), [3, 3]);
  const r = a.results();
  assert.strictEqual(r.w01.score, 3); assert.strictEqual(r.w02.score, 3);
});

test('Assessment: mappa punteggio (RR=3, RW=2, WR=1, WW=0) e domanda facile dopo errore', () => {
  const a = new QQ.Assessment(bundle, QQ.rng(5));
  const diffs = []; let q, k = 0;
  while ((q = a.next())) { diffs.push(q.item.diff); a.answer(false); k++; }
  assert.deepStrictEqual(diffs, [2, 2, 1, 1]);
  assert.strictEqual(a.results().w01.score, 0);
  a.per.w01.answers = [true, false]; assert.strictEqual(a.results().w01.score, 2);
  a.per.w01.answers = [false, true]; assert.strictEqual(a.results().w01.score, 1);
});

test('applyAssessment: accredita livelli (boss mai), senza XP, e nextUp parte dal più debole', () => {
  const st = QQ.newState();
  const results = { w01: { score: 3, answers: [true, true] }, w02: { score: 0, answers: [false, false] } };
  const plan = QQ.applyAssessment(st, results, bundle, '2026-10-08');
  // w01: 13 livelli non-boss * 0.7 = 9
  assert.strictEqual(plan.credited.filter(x => x.startsWith('w01')).length, 9);
  assert.strictEqual(plan.credited.filter(x => x.startsWith('w02')).length, 0);
  assert.ok(!st.levels['w01-l14']);
  assert.ok(st.levels['w01-l01'].skipped);
  assert.deepStrictEqual(plan.weakest[0], 'w02');
  const nu = QQ.nextUp(bundle, st);
  assert.strictEqual(nu.world.id, 'w02'); assert.strictEqual(nu.index, 0);
  assert.strictEqual(st.xp, 0);
});

test('Badge: scattano una volta sola e i livelli accreditati non contano', () => {
  const st = QQ.newState();
  QQ.applyAssessment(st, { w01: { score: 3, answers: [true, true] }, w02: { score: 3, answers: [true, true] } }, bundle, '2026-10-08');
  let b = QQ.evaluateBadges(st, bundle, '2026-10-08').map(x => x.id);
  assert.deepStrictEqual(b, ['assessed']);
  QQ.completeLevel(st, 'w02-l15', 3, 'x');
  b = QQ.evaluateBadges(st, bundle, '2026-10-09').map(x => x.id).sort();
  assert.deepStrictEqual(b, ['first', 'perfect']);
  assert.deepStrictEqual(QQ.evaluateBadges(st, bundle, '2026-10-10'), []);
});

test('recordAnswers: aggiorna precisione per mondo e SRS al primo tentativo', () => {
  const st = QQ.newState();
  QQ.recordAnswers(st, [{ id: 'w02-l01-a', ok: false, first: true }, { id: 'w02-l01-a', ok: true, first: false }, { id: 'w02-l01-b', ok: true, first: true }], '2026-10-08');
  assert.deepStrictEqual(st.acc.w02, [2, 3]);
  assert.deepStrictEqual(st.srs['w02-l01-a'], [0, '2026-10-08', 1]);
  assert.deepStrictEqual(st.srs['w02-l01-b'], [1, '2026-10-09', 0]);
});

test('export/import: roundtrip e rifiuto di codici sbagliati', () => {
  const st = QQ.newState(); st.xp = 123; st.levels['w01-l01'] = { stars: 3, plays: 1 }; st.name = 'Àlé ✓';
  const code = QQ.exportCode(st);
  const back = QQ.importCode(code);
  assert.strictEqual(back.xp, 123); assert.strictEqual(back.name, 'Àlé ✓');
  assert.deepStrictEqual(back.levels, st.levels);
  assert.throws(() => QQ.importCode('boh'));
  assert.throws(() => QQ.importCode('QQ1.' + Buffer.from('{"v":2}').toString('base64')));
});

test('migrate: riempie i campi mancanti senza perdere quelli presenti', () => {
  const m = QQ.migrate({ v: 1, xp: 5, streak: { count: 2 }, levels: { a: { stars: 1 } } });
  assert.strictEqual(m.xp, 5); assert.strictEqual(m.streak.count, 2); assert.strictEqual(m.streak.freezes, 1);
  assert.deepStrictEqual(m.levels, { a: { stars: 1 } });
  assert.strictEqual(m.settings.sound, true);
});

console.log(`\n${passed} test passati` + (process.exitCode ? ' (con errori)' : ''));
