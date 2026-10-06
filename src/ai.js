/* Super Rigori World Cup — intelligenza artificiale di rigoristi e portieri (puro, senza DOM) */
(function (root) {
  'use strict';
  const PK = (root.PK = root.PK || {});
  const M = PK.M;
  const { clamp } = M;
  const GOAL = () => PK.Phys.GOAL;

  const DIFF = {
    easy: { name: 'Facile', kickErr: 1.55, react: 0.15, guess: 0.38, readNoise: 0.55, slow: 0.4, exploit: 0.15 },
    normal: { name: 'Normale', kickErr: 1.2, react: 0.1, guess: 0.56, readNoise: 0.4, slow: 0.48, exploit: 0.35 },
    hard: { name: 'Difficile', kickErr: 1.0, react: 0.08, guess: 0.6, readNoise: 0.3, slow: 0.58, exploit: 0.55 },
    legend: { name: 'Leggenda', kickErr: 0.85, react: 0.06, guess: 0.64, readNoise: 0.22, slow: 0.7, exploit: 0.75 },
  };

  /** Deviazione standard (m) dell'errore di esecuzione del tiro */
  function kickSigma(kicker, power, pressure, opts) {
    opts = opts || {};
    const s0 = 0.85 * (1.18 - kicker.acc);
    const pf = 0.72 + Math.pow(power, 2.4);
    const pr = 1 + 0.55 * pressure * (1.05 - kicker.comp);
    const sweet = opts.sweet ? 0.6 : 1;
    return s0 * pf * pr * sweet * (opts.errMul || 1);
  }

  /** Il rigorista AI sceglie bersaglio, potenza, effetto e se usare il tiro speciale */
  function kickerChoice(kicker, ctx) {
    const rng = ctx.rng;
    const diff = DIFF[ctx.difficulty || 'normal'];
    const sit = ctx.sit || { pressure: 0.3 };
    const wantSpecial = ctx.specialLeft > 0 && (sit.decisive || sit.round >= 4 || sit.sudden) && rng() < (sit.decisive ? 0.75 : 0.45);
    const power = wantSpecial ? 0.84 : clamp(0.36 + 0.3 * kicker.pow + (rng() - 0.5) * 0.2, 0.4, 0.8);
    const sigma = kickSigma(kicker, power, sit.pressure, { errMul: diff.kickErr, sweet: wantSpecial });
    let side = rng() < 0.5 ? -1 : 1;
    // se il portiere si è già buttato da un lato, il rigorista esperto calcia dall'altra parte
    if (ctx.keeperDir && rng() < diff.exploit * (0.5 + kicker.comp * 0.5)) side = -ctx.keeperDir;
    const r = rng();
    const mx = clamp(1.0 * sigma + 0.14, 0.22, 0.85);
    let x, y;
    if (r < 0.34) { x = side * (GOAL().HW - mx); y = 0.28 + rng() * 0.25; }
    else if (r < 0.58) { x = side * (GOAL().HW - mx); y = GOAL().H - clamp(1.0 * sigma + 0.16, 0.25, 0.7) - rng() * 0.1; }
    else if (r < 0.8) { x = side * (1.6 + rng() * 1.1); y = 0.5 + rng() * 1.0; }
    else if (r < 0.93) { x = side * (0.3 + rng() * 0.6); y = 0.3 + rng() * 0.5; }
    else { x = side * (0.2 + rng() * 0.5); y = 1.5 + rng() * 0.5; }
    const curve = rng() < 0.15 ? side : 0;
    return { target: { x, y }, power, curve, special: wantSpecial, sigma };
}

  /** Applica l'errore di esecuzione al bersaglio scelto (gaussiano indipendente su x e y) */
  function applyError(target, sigma, rng) {
    return { x: target.x + M.gauss(rng) * sigma, y: target.y + M.gauss(rng) * sigma * 0.85 };
  }

  /**
   * Piano del portiere AI. mode 'early' = si butta a caso prima ancora del tiro; 'react' = legge la traiettoria.
   * ctx: { rng, difficulty, gk (0-100), history: {L,R,C counts}, specialLeft, sit }
   */
  function keeperPlan(ctx) {
    const rng = ctx.rng;
    const diff = DIFF[ctx.difficulty || 'normal'];
    const gk = ctx.gk / 100;
    const pGuess = clamp(diff.guess + (gk - 0.75) * 0.25, 0.1, 0.55);
    const hist = ctx.history || { L: 0, R: 0, C: 0 };
    const tot = hist.L + hist.R + hist.C;
    const plan = { special: false };
    if (rng() < pGuess) {
      // bias sulle abitudini del tiratore (a partire da 3 rigori visti)
      let pL = 0.5;
      if (tot >= 3) pL = clamp(0.5 + 0.35 * ((hist.L - hist.R) / tot), 0.2, 0.8);
      const side = rng() < pL ? -1 : 1;
      plan.mode = 'early';
      plan.t = -0.03 + rng() * 0.06;
      plan.target = { x: side * (2.0 + rng() * 1.1), y: [0.4, 0.4, 1.0, 1.0, 1.9][Math.floor(rng() * 5)] };
    } else {
      plan.mode = 'react';
      plan.t = diff.react * (1.2 - gk * 0.35) + rng() * 0.05;
      plan.noise = diff.readNoise * (1.3 - gk * 0.45);
    }
    plan.special = ctx.specialLeft > 0 && rng() < (ctx.sit && ctx.sit.decisive ? 0.7 : 0.35) && gk > 0.7;
    return plan;
  }

  /** Aggiorna il bersaglio del portiere AI dopo il ritardo di reazione leggendo la traiettoria reale */
  function keeperReadTarget(sim, plan, rng) {
    const pc = PK.Phys.predictCrossing(sim.ball, sim.wob, sim.sinceLaunch);
    const n = plan.noise || 0.4;
    const x = pc.x + M.gauss(rng) * n, y = pc.y + M.gauss(rng) * n * 0.8;
    return { x: clamp(x, -3.9, 3.9), y: clamp(y, 0.1, 3.0), t: pc.t };
  }

  PK.AI = { DIFF, kickSigma, kickerChoice, applyError, keeperPlan, keeperReadTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
})(typeof window !== 'undefined' ? window : globalThis);
