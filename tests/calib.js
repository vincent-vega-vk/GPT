/* Calibrazione statistica AI vs AI: node tests/calib.js [N]  (obiettivo realistico: ~75-78% di gol) */
['math', 'data', 'shootout', 'rig', 'keeper', 'physics', 'ai'].forEach((m) => require('../src/' + m + '.js'));
const PK = globalThis.PK, M = PK.M, { Sim, solveShot } = PK.Phys;
function runKick(cfg, rng) {
  const keeper = new PK.Keeper({ seed: 0 });
  const sim = new Sim(keeper, { t0: -1.0 });
  const sh = solveShot(cfg.target, cfg.power, cfg.curve || 0, null, {});
  const plan = cfg.keeperPlan;
  let cmd = false, launched = false;
  for (let i = 0; i < 4000 && !(sim.result && sim.settled); i++) {
    sim.advance(1 / 240);
    if (!launched && sim.t >= 0) { sim.launch({ v: sh.v, w: sh.w }); launched = true; }
    if (!cmd && plan) {
      if (plan.mode === 'early' && sim.t >= plan.t) { keeper.command(sim.t, plan.target, {}); cmd = true; }
      else if (plan.mode === 'react' && launched && sim.sinceLaunch >= plan.t) { keeper.command(sim.t, PK.AI.keeperReadTarget(sim, plan, rng), {}); cmd = true; }
    }
  }
  return sim;
}
const N = +process.argv[2] || 600;
const sq = PK.buildSquad(PK.TEAM.ITA), gkTeam = PK.TEAM.BRA;
for (const diff of ['easy', 'normal', 'hard', 'legend']) {
  const rng = M.rng(777), cnt = {}; let wood = 0;
  for (let i = 0; i < N; i++) {
    const kicker = sq.kickers[i % 5];
    const sit = { pressure: 0.3 + 0.5 * rng(), round: 1 + (i % 5), decisive: false };
    const ch = PK.AI.kickerChoice(kicker, { rng, difficulty: diff, sit, specialLeft: 0 });
    const tgt = PK.AI.applyError(ch.target, ch.sigma, rng);
    const plan = PK.AI.keeperPlan({ rng, difficulty: diff, gk: gkTeam.gk, specialLeft: 0, sit });
    const sim = runKick({ target: tgt, power: ch.power, curve: ch.curve, keeperPlan: plan }, rng);
    cnt[sim.result.type] = (cnt[sim.result.type] || 0) + 1;
    if (sim.woodHit) wood++;
  }
  const f = (k) => (((cnt[k] || 0) / N) * 100).toFixed(1).padStart(5) + '%';
  console.log(diff.padEnd(7), 'gol', f('goal'), '| parate', f('saved'), '| fuori', ((((cnt.wide || 0) + (cnt.over || 0)) / N) * 100).toFixed(1).padStart(5) + '%', '| palo(fuori)', f('post'), '| legno', ((wood / N) * 100).toFixed(1) + '%');
}
