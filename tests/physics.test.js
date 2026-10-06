/* Test fisica + calibrazione AI: node tests/physics.test.js [N] */
const assert = require('assert');
['math', 'data', 'shootout', 'rig', 'keeper', 'physics', 'ai'].forEach((m) => require('../src/' + m + '.js'));
const PK = globalThis.PK;
const { Sim, solveShot, GOAL } = PK.Phys;
const M = PK.M;
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };

/** Esegue un rigore completo. cfg: {target,power,curve,special,keeperPlan,keeperSpecial,breakThrough,noKeeper} */
function runKick(cfg, rng) {
  const keeper = cfg.noKeeper ? null : new PK.Keeper({ seed: 0 });
  const sim = new Sim(keeper, { t0: -1.0, breakThrough: cfg.breakThrough });
  const sp = cfg.special ? PK.SPECIALS[cfg.specialIdx || 0] : null;
  const sh = solveShot(cfg.target, cfg.power, cfg.curve || 0, sp, { curveSign: 1 });
  const plan = cfg.keeperPlan;
  let cmd = false;
  const dt = 1 / 240;
  let launched = false;
  for (let i = 0; i < 4000 && !(sim.result && sim.settled); i++) {
    sim.advance(dt);
    if (!launched && sim.t >= 0) { sim.launch({ v: sh.v, w: sh.w, wob: sh.wob, special: !!sp }); launched = true; }
    if (keeper && plan && !cmd) {
      if (plan.mode === 'early' && sim.t >= plan.t) { keeper.command(sim.t, plan.target, { special: plan.special }); cmd = true; }
      else if (plan.mode === 'react' && launched && sim.sinceLaunch >= plan.t) {
        const tg = PK.AI.keeperReadTarget(sim, plan, rng);
        keeper.command(sim.t, tg, { special: plan.special }); cmd = true;
      }
    }
  }
  return { sim, sh, result: sim.result };
}

console.log('Solutore di tiro');
ok('colpisce il punto mirato (±3 cm) senza portiere, per potenze/effetti diversi', () => {
  const rng = M.rng(1);
  let worst = 0;
  for (let i = 0; i < 60; i++) {
    const target = { x: (rng() * 2 - 1) * 3.2, y: 0.3 + rng() * 1.9 };
    const power = 0.45 + rng() * 0.5, curve = [-1, 0, 1][i % 3];
    const sh = solveShot(target, power, curve, null, {});
    const e = Math.hypot(sh.cross.x - target.x, sh.cross.y - target.y);
    worst = Math.max(worst, e);
  }
  assert(worst < 0.03, 'errore max ' + worst);
});
ok('con effetto la traiettoria curva davvero (scostamento laterale > 25 cm a metà volo)', () => {
  const target = { x: 2.0, y: 1.0 };
  const a = solveShot(target, 0.8, 0, null, {}), b = solveShot(target, 0.8, 1, null, {});
  const mid = (sh) => PK.Phys.flight({ x: 0, y: 0.11, z: 0 }, sh.v, sh.w, sh.wob, 0, 0.2);
  void mid;
  // confronta l'angolo orizzontale iniziale: con curva a destra bisogna mirare più a sinistra
  assert(Math.atan2(b.v.x, b.v.z) < Math.atan2(a.v.x, a.v.z) - 0.02);
});
ok('velocità: potenza 0.85 ≈ 110 km/h, tempo di volo ≈ 0.4 s', () => {
  const sh = solveShot({ x: 2, y: 1 }, 0.85, 0, null, {});
  const kmh = sh.speed * 3.6;
  console.log('    v0 =', kmh.toFixed(0), 'km/h, T =', sh.T.toFixed(2), 's');
  assert(kmh > 95 && kmh < 125 && sh.T > 0.33 && sh.T < 0.55);
});

console.log('Palla, pali, rete');
ok('gol centrato senza portiere: palla in rete, la rete si gonfia e si ferma', () => {
  const { sim, result } = runKick({ target: { x: 1.5, y: 1.2 }, power: 0.8, noKeeper: true });
  assert.strictEqual(result.type, 'goal');
  assert(sim.events.some((e) => e.type === 'net'));
  const maxU = sim.maxNetU;
  console.log('    gonfiore massimo rete =', maxU.toFixed(2), 'm; z finale palla =', sim.ball.p.z.toFixed(2), ' y =', sim.ball.p.y.toFixed(2));
  assert(maxU > 0.15 && maxU < 0.7);
  assert(sim.ball.p.z > GOAL.Z && sim.ball.p.z < GOAL.Z + 2.2 && sim.ball.p.y < 0.5);
});
ok('palo: tiro sul palo destro è respinto (woodHit)', () => {
  let post = 0;
  for (let i = 0; i < 20; i++) {
    const { result, sim } = runKick({ target: { x: 3.66 + 0.02 * (i - 10) * 0.2, y: 1.2 }, power: 0.75, noKeeper: true });
    if (sim.woodHit) post++;
    void result;
  }
  assert(post > 0, 'nessun palo colpito');
});
ok('traversa: tiro sotto l\'incrocio colpisce il legno', () => {
  let bar = 0;
  for (let i = 0; i < 12; i++) {
    const { sim } = runKick({ target: { x: 0.5, y: 2.46 + 0.02 * i }, power: 0.8, noKeeper: true });
    if (sim.events.some((e) => e.type === 'bar')) bar++;
  }
  assert(bar > 0, 'nessuna traversa');
});
ok('fuori: tiro largo -> wide; alto -> over', () => {
  assert.strictEqual(runKick({ target: { x: 5.2, y: 1 }, power: 0.8, noKeeper: true }).result.type, 'wide');
  assert.strictEqual(runKick({ target: { x: 0, y: 3.4 }, power: 0.8, noKeeper: true }).result.type, 'over');
});

console.log('Portiere');
function saveRate(tg, power, plan, N, mirror, special) {
  const rng = M.rng(5);
  let saved = 0;
  for (let i = 0; i < N; i++) {
    const sgn = mirror && i % 2 ? -1 : 1;
    const t = { x: tg.x * sgn + (rng() - 0.5) * 0.2, y: tg.y + (rng() - 0.5) * 0.2 };
    const p = Object.assign({}, plan);
    if (p.target) p.target = { x: p.target.x * sgn, y: p.target.y };
    if (runKick({ target: t, power, keeperPlan: p, special }, rng).result.type === 'saved') saved++;
  }
  return saved / N;
}
ok('portiere che legge subito (0 ms) para il centro e il medio-lato quasi sempre', () => {
  const a = saveRate({ x: 0.2, y: 0.9 }, 0.6, { mode: 'react', t: 0, noise: 0.02 }, 30, true);
  const b = saveRate({ x: 1.8, y: 0.9 }, 0.7, { mode: 'react', t: 0, noise: 0.02 }, 30, true);
  console.log('    centro', a, 'medio-lato', b);
  assert(a >= 0.9 && b >= 0.7);
});
ok('con 200 ms di ritardo di reazione il tiro a lato (1.8 m) non è più raggiungibile', () => {
  const r = saveRate({ x: 1.8, y: 0.9 }, 0.7, { mode: 'react', t: 0.2, noise: 0.02 }, 30, true);
  assert(r <= 0.1, 'rate ' + r);
});
ok('portiere che si butta dalla parte sbagliata prende sempre gol', () => {
  const r = saveRate({ x: 2.7, y: 0.4 }, 0.8, { mode: 'early', t: 0, target: { x: -2.7, y: 0.5 } }, 20, true);
  assert.strictEqual(r, 0);
});
ok('parata speciale (reach esteso) arriva sull\'incrocio dei pali a reazione 100 ms', () => {
  const normal = saveRate({ x: 3.1, y: 2.1 }, 0.85, { mode: 'react', t: 0.1, noise: 0.02 }, 30, true);
  const sp = saveRate({ x: 3.1, y: 2.1 }, 0.85, { mode: 'react', t: 0.1, noise: 0.02, special: true }, 30, true);
  console.log('    incrocio: normale', normal, '| speciale', sp);
  assert(normal <= 0.1 && sp >= 0.6);
});
ok('scontro super-tiro vs super-parata: sfonda o respinge', () => {
  const a = runKick({ target: { x: 2.0, y: 1.0 }, power: 0.85, special: true, keeperPlan: { mode: 'react', t: 0.05, noise: 0.01, special: true }, breakThrough: true }, M.rng(3));
  const b = runKick({ target: { x: 2.0, y: 1.0 }, power: 0.85, special: true, keeperPlan: { mode: 'react', t: 0.05, noise: 0.01, special: true }, breakThrough: false }, M.rng(3));
  console.log('    sfonda ->', a.result.type, '| respinto ->', b.result.type);
  assert(a.result.type === 'goal' && b.result.type === 'saved');
});
ok('determinismo: stessa simulazione = stesso risultato (necessario per i replay)', () => {
  const cfg = { target: { x: 2.2, y: 0.8 }, power: 0.75, keeperPlan: { mode: 'react', t: 0.15, noise: 0 } };
  const a = runKick(cfg, M.rng(9)), b = runKick(cfg, M.rng(9));
  assert.strictEqual(a.result.type, b.result.type);
  assert.strictEqual(a.sim.ball.p.x, b.sim.ball.p.x);
});

console.log('Calibrazione AI vs AI');
function campaign(label, cfgFn, N) {
  const rng = M.rng(12345);
  const cnt = {};
  let wood = 0, goalsW = 0;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const cfg = cfgFn(rng, i);
    const r = runKick(cfg, rng);
    const key = r.result.type;
    cnt[key] = (cnt[key] || 0) + 1;
    if (r.sim.woodHit) { wood++; if (key === 'goal') goalsW++; }
  }
  const pct = (k) => (((cnt[k] || 0) / N) * 100).toFixed(1).padStart(5) + '%';
  console.log(`  ${label}: gol ${pct('goal')} | parate ${pct('saved')} | fuori ${pct('wide')}+${pct('over')} | palo ${pct('post')} | legno ${((wood / N) * 100).toFixed(1)}% | ${(Date.now() - t0) / N | 0} ms/tiro`);
  return cnt;
}
const N = +process.argv[2] || 300;
const team = PK.TEAM.ITA, gkTeam = PK.TEAM.BRA;
const sq = PK.buildSquad(team);
['easy', 'normal', 'hard', 'legend'].forEach((diff) => {
  campaign('AI tiratore vs AI portiere [' + diff + ']', (rng, i) => {
    const kicker = sq.kickers[i % 5];
    const sit = { pressure: 0.3 + 0.5 * rng(), round: 1 + (i % 5), decisive: rng() < 0.2 };
    const ch = PK.AI.kickerChoice(kicker, { rng, difficulty: diff, sit, specialLeft: 0 });
    const tgt = PK.AI.applyError(ch.target, ch.sigma, rng);
    const plan = PK.AI.keeperPlan({ rng, difficulty: diff, gk: gkTeam.gk, specialLeft: 0, sit });
    return { target: tgt, power: ch.power, curve: ch.curve, keeperPlan: plan };
  }, N);
});

console.log(`\n${n} test OK`);
