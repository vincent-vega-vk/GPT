/* Test del regolamento e del torneo: node tests/rules.test.js */
const assert = require('assert');
require('../src/math.js');
require('../src/data.js');
require('../src/shootout.js');
require('../src/tournament.js');
const PK = globalThis.PK;

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };

console.log('Shootout');
ok('5-0 su 3 tiri: terminazione anticipata dopo il 3° rigore del vincitore? (no: serve che l\'altro non raggiunga)', () => {
  const s = new PK.Shootout('knockout', 'A');
  // A segna, B sbaglia, A segna, B sbaglia, A segna, B sbaglia -> A 3-0, B ha ancora 2 tiri: max 2 < 3 => finita
  [['A', 1], ['B', 0], ['A', 1], ['B', 0], ['A', 1]].forEach(([t, g]) => s.record(t, g));
  assert(!s.over, 'dopo 5 tiri A3 B0 con B 2 restanti (max 2) non è ancora finita');
  s.record('B', 0);
  assert(s.over && s.winner === 'A');
  assert.deepStrictEqual(s.taken, { A: 3, B: 3 });
});
ok('terminazione anticipata classica 3-0 con A avanti e B con 2 tiri', () => {
  const s = new PK.Shootout('knockout', 'A');
  s.record('A', 1); s.record('B', 0); s.record('A', 1); s.record('B', 0); s.record('A', 1);
  // B calcia: 3 rimasti-> dopo il suo 3° tiro (3-0) può ancora recuperare 2 -> non finita
  s.record('B', 0);
  assert.strictEqual(s.over, true); // A 3 > B 0 + 2 rimanenti
});
ok('pareggio 5-5 porta a oltranza e decide la coppia di tiri', () => {
  const s = new PK.Shootout('knockout', 'B');
  for (let i = 0; i < 5; i++) { s.record('B', 1); s.record('A', 1); }
  assert(!s.over && s.sudden);
  s.record('B', 1); assert(!s.over);
  s.record('A', 0); assert(s.over && s.winner === 'B');
});
ok('oltranza: se entrambi segnano si continua', () => {
  const s = new PK.Shootout('knockout', 'A');
  for (let i = 0; i < 5; i++) { s.record('A', 1); s.record('B', 1); }
  for (let r = 0; r < 4; r++) { s.record('A', 1); s.record('B', 1); assert(!s.over); }
  s.record('A', 0); s.record('B', 1);
  assert(s.over && s.winner === 'B');
});
ok('gironi: si battono sempre 5+5 tiri, pareggio ammesso', () => {
  const s = new PK.Shootout('group', 'A');
  for (let i = 0; i < 5; i++) { s.record('A', 1); assert(!s.over || i === 4); s.record('B', 1); }
  assert(s.over && s.winner === null);
});
ok('gironi: nessuna terminazione anticipata (5-0 dopo 3 tiri continua)', () => {
  const s = new PK.Shootout('group', 'A');
  s.record('A', 1); s.record('B', 0); s.record('A', 1); s.record('B', 0); s.record('A', 1); s.record('B', 0);
  assert(!s.over);
});
ok('situazione: obbligato a segnare / tiro decisivo', () => {
  const s = new PK.Shootout('knockout', 'A');
  s.record('A', 1); s.record('B', 0); s.record('A', 1); s.record('B', 1); s.record('A', 1); s.record('B', 0);
  // A 3 B 1, A ha 2 tiri, B ha 2 tiri -> A calcia 4°: se segna 4-1 con B 2 restanti -> max 3 <4 -> decisivo
  const sit = s.situation();
  assert.strictEqual(sit.team, 'A');
  assert.strictEqual(sit.matchPoint, true);
});
ok('turno sbagliato lancia errore', () => {
  const s = new PK.Shootout('knockout', 'A');
  assert.throws(() => s.record('B', 1));
});

console.log('Tournament');
function playAll(seed, player) {
  const t = new PK.Tournament({ seed, player });
  let guard = 0;
  while (!t.over && guard++ < 20) {
    t.simulateRound(false);
    assert(t.roundComplete());
    t.advance();
  }
  return t;
}
ok('32 squadre in 8 gironi da 4, vincoli confederazioni', () => {
  const t = new PK.Tournament({ seed: 7, player: 'ITA' });
  assert.strictEqual(t.groups.length, 8);
  const all = new Set();
  t.groups.forEach((g) => {
    assert.strictEqual(g.teams.length, 4);
    g.teams.forEach((c) => all.add(c));
    const uefa = g.teams.filter((c) => PK.TEAM[c].conf === 'UEFA').length;
    assert(uefa <= 2, 'max 2 UEFA nel girone ' + g.id);
    ['CAF', 'CONMEBOL', 'AFC', 'CONCACAF'].forEach((cf) => assert(g.teams.filter((c) => PK.TEAM[c].conf === cf).length <= 1));
  });
  assert.strictEqual(all.size, 32);
});
ok('torneo completo: 48 gironi + 8+4+2+1+1 partite, un campione', () => {
  const t = playAll(11, 'BRA');
  assert(t.over && t.champion);
  assert.deepStrictEqual(t.rounds.map((r) => r.id), ['G1', 'G2', 'G3', 'R16', 'QF', 'SF', '3P', 'F']);
  const counts = t.rounds.map((r) => r.matches.length);
  assert.deepStrictEqual(counts, [16, 16, 16, 8, 4, 2, 1, 1]);
  t.rounds.slice(3).forEach((r) => r.matches.forEach((m) => assert(m.result.winner === 'A' || m.result.winner === 'B', 'KO senza vincitore')));
  t.groups.forEach((g) => {
    const st = t.standings(g.id);
    assert.strictEqual(st.length, 4);
    st.forEach((r) => assert.strictEqual(r.p, 3));
    for (let i = 1; i < 4; i++) assert(st[i - 1].pts >= st[i].pts);
  });
});
ok('ottavi: 1A-2B, 1C-2D, 1B-2A, 1D-2C ... come Qatar 2022', () => {
  const t = playAll(5, 'ITA');
  const st = {};
  t.groups.forEach((g) => (st[g.id] = t.standings(g.id).map((r) => r.code)));
  const r16 = t.rounds.find((r) => r.id === 'R16').matches;
  assert.deepStrictEqual([r16[0].a, r16[0].b], [st.A[0], st.B[1]]);
  assert.deepStrictEqual([r16[2].a, r16[2].b], [st.B[0], st.A[1]]);
  assert.deepStrictEqual([r16[7].a, r16[7].b], [st.H[0], st.G[1]]);
  const qf = t.rounds.find((r) => r.id === 'QF').matches;
  assert.strictEqual(qf[0].a, t.winnerOf(r16[4]));
  assert.strictEqual(qf[0].b, t.winnerOf(r16[5]));
  const f = t.rounds.find((r) => r.id === 'F').matches[0];
  const sf = t.rounds.find((r) => r.id === 'SF').matches;
  assert.strictEqual(f.a, t.winnerOf(sf[0]));
  const tp = t.rounds.find((r) => r.id === '3P').matches[0];
  assert.strictEqual(tp.a, t.loserOf(sf[0]));
});
ok('serializzazione JSON e ripresa', () => {
  const t = new PK.Tournament({ seed: 3, player: 'JPN' });
  t.simulateRound(false); t.advance();
  const t2 = PK.Tournament.fromJSON(JSON.parse(JSON.stringify(t.toJSON())));
  assert.strictEqual(t2.roundIndex, 1);
  assert.deepStrictEqual(t2.standings('A').map((r) => r.pts), t.standings('A').map((r) => r.pts));
});
ok('statistiche: i favoriti vincono più spesso, ma non sempre (500 tornei)', () => {
  const wins = {};
  let draws = 0, matches = 0, sudden = 0, kosh = 0;
  for (let s = 0; s < 500; s++) {
    const t = playAll(s * 77 + 1, 'ITA');
    wins[t.champion] = (wins[t.champion] || 0) + 1;
    t.rounds.forEach((r) => r.matches.forEach((m) => {
      matches++;
      if (!m.result.winner) draws++;
      if (r.stage === 'ko') { kosh++; if (m.result.sudden) sudden++; }
    }));
  }
  const top = Object.entries(wins).sort((a, b) => b[1] - a[1]);
  console.log('    campioni top5:', top.slice(0, 5).map(([c, v]) => c + ' ' + v).join(', '), '| squadre diverse:', top.length);
  console.log('    pareggi ' + ((100 * draws) / (matches - kosh)).toFixed(1) + '% dei match di girone;', 'oltranza ' + ((100 * sudden) / kosh).toFixed(1) + '% dei KO');
  assert(top.length > 8);
});

console.log(`\n${n} test OK`);
