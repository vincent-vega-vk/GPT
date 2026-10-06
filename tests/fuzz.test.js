/* Fuzz della fisica: nessun NaN, ogni tiro termina con un esito. node tests/fuzz.test.js [N] */
['math', 'data', 'shootout', 'rig', 'keeper', 'kicker', 'physics', 'ai'].forEach((m) => require('../src/' + m + '.js'));
const PK = globalThis.PK, M = PK.M;
const N = +process.argv[2] || 1500;
const rng = M.rng(2024);
const outcomes = {}; let bad = 0, maxSteps = 0;
for (let i = 0; i < N; i++) {
  const keeper = new PK.Keeper({ seed: rng() * 6 });
  const sim = new PK.Phys.Sim(keeper, { t0: -1.0, breakThrough: rng() < 0.5 });
  const spec = rng() < 0.3 ? PK.SPECIALS[Math.floor(rng() * PK.SPECIALS.length)] : null;
  const tgt = { x: (rng() * 2 - 1) * 6, y: -0.2 + rng() * 4.2 };
  const sh = PK.Phys.solveShot(tgt, 0.2 + rng() * 0.8, [-1, 0, 1][Math.floor(rng() * 3)], spec, { curveSign: rng() < 0.5 ? -1 : 1, phase: rng() * 6 });
  const cmdAt = -0.5 + rng() * 0.8, cmdTg = { x: (rng() * 2 - 1) * 4, y: rng() * 3.2 }, cmdSp = rng() < 0.3, doCmd = rng() < 0.8;
  let cmd = false, launched = false, steps = 0;
  while (!(sim.result && sim.settled) && steps++ < 3000) {
    sim.advance(1 / 120);
    if (!launched && sim.t >= 0) { sim.launch({ v: sh.v, w: sh.w, wob: sh.wob, special: !!spec }); launched = true; }
    if (doCmd && !cmd && sim.t >= cmdAt) { keeper.command(sim.t, cmdTg, { special: cmdSp }); cmd = true; }
    const b = sim.ball;
    if (![b.p.x, b.p.y, b.p.z, b.v.x, b.v.y, b.v.z].every(Number.isFinite)) { bad++; console.log('NaN al tiro', i); break; }
    if (b.p.y < 0.05 || Math.abs(b.p.x) > 80 || b.p.z > 40) { bad++; console.log('ball fuori dai limiti', i, b.p); break; }
  }
  maxSteps = Math.max(maxSteps, steps);
  const ty = sim.result ? sim.result.type : 'NESSUN_ESITO';
  outcomes[ty] = (outcomes[ty] || 0) + 1;
  if (!sim.result) { bad++; console.log('senza esito', i); }
  // il portiere non deve produrre pose non finite
  const sk = keeper.skeleton(sim.t);
  Object.values(sk).forEach((v) => { if (v && typeof v.x === 'number' && !(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z))) { bad++; console.log('posa non finita', i); } });
}
console.log('esiti:', JSON.stringify(outcomes), '| passi max', maxSteps, '| anomalie', bad);
if (bad) process.exit(1);
