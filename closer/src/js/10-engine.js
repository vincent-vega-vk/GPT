/* CLOSER · engine: stato del deal, probabilità, esito, trimestre, badge. Nessun accesso al DOM. */
(function (g) {
  'use strict';
  const CL = g.CL;
  const C = CL.CONFIG;
  const FX = { t: 'trust', v: 'value', u: 'urgency', c: 'control', r: 'risk' };

  CL.getScenario = (id) => CL.scenarios.find((s) => s.id === id);

  /* ───────────── DEAL ───────────── */
  CL.newDeal = (sc, opts) => {
    opts = opts || {};
    const st = sc.start;
    const bonus = opts.trustBonus || 0;
    const d = {
      sc,
      node: sc.first || 'n1',
      over: null,
      m: {
        trust: CL.clamp(st.t + bonus + (opts.mods && opts.mods.t || 0), 0, 100),
        value: CL.clamp(st.v + (opts.mods && opts.mods.v || 0), 0, 100),
        urgency: CL.clamp(st.u + (opts.mods && opts.mods.u || 0), 0, 100),
        control: CL.clamp(st.c + (opts.mods && opts.mods.c || 0), 0, 100),
        risk: CL.clamp(st.r + (opts.mods && opts.mods.r || 0), 0, 100),
      },
      disc: st.d || 0,
      list: sc.list,
      mp: new Set(st.have || []),
      flags: Object.assign({}, st.flags || {}),
      hist: [],
      entered: {},
      integ: 0,
      used: {},
      minP: 1, maxP: 0,
    };
    CL.enterNode(d);
    const p = CL.prob(d).p;
    d.minP = d.maxP = p;
    return d;
  };

  CL.cloneDeal = (d) => ({
    sc: d.sc, node: d.node, over: d.over,
    m: Object.assign({}, d.m), disc: d.disc, list: d.list,
    mp: new Set(d.mp), flags: Object.assign({}, d.flags),
    hist: d.hist.slice(), entered: Object.assign({}, d.entered),
    integ: d.integ, used: Object.assign({}, d.used), minP: d.minP, maxP: d.maxP, dipped: d.dipped,
  });

  CL.nodeOf = (d) => d.sc.nodes[d.node];

  const applyFx = (d, fx) => {
    const delta = {};
    for (const k in fx) {
      const v = fx[k];
      if (FX[k]) {
        const key = FX[k];
        const before = d.m[key];
        d.m[key] = CL.clamp(before + v, 0, 100);
        delta[key] = d.m[key] - before;
      } else if (k === 'd') {
        const before = d.disc;
        d.disc = CL.clamp(before + v, 0, 60);
        delta.disc = d.disc - before;
      } else if (k === 'l') {
        d.list = Math.max(0, d.list + v);
        delta.list = v;
      }
    }
    return delta;
  };

  /* applica una sola volta gli effetti d’ingresso di un nodo (colpi di scena) */
  CL.enterNode = (d) => {
    const n = CL.nodeOf(d);
    if (!n || d.entered[d.node]) return null;
    d.entered[d.node] = true;
    if (!n.enter) return null;
    const e = n.enter;
    const delta = applyFx(d, e.fx || {});
    const gained = [];
    (e.mp || []).forEach((k) => { if (!d.mp.has(k)) { d.mp.add(k); gained.push(k); } });
    const lost = [];
    (e.mpx || []).forEach((k) => { if (d.mp.delete(k)) lost.push(k); });
    if (e.set) Object.assign(d.flags, e.set);
    return { delta, gained, lost };
  };

  CL.sceneLines = (d, n) => {
    const raw = typeof n.scene === 'function' ? n.scene(d) : n.scene;
    return raw.filter((l) => !l.if || l.if(d));
  };

  /* scelte disponibili; un jolly esaurito resta visibile ma bloccato */
  CL.choicesFor = (d, run) => {
    const n = CL.nodeOf(d);
    return n.choices
      .filter((c) => !c.if || c.if(d))
      .map((c) => {
        let locked = false, reason = '';
        if (c.jolly && run && !run.free && (run.jolly[c.jolly] || 0) <= 0) {
          locked = true; reason = CL.JOLLY[c.jolly].name + ' esaurito';
        }
        return { c, locked, reason };
      });
  };

  CL.pick = (d, id, run) => {
    const n = CL.nodeOf(d);
    const c = n.choices.find((x) => x.id === id);
    if (!c) throw new Error('scelta inesistente ' + d.sc.id + '/' + d.node + '/' + id);
    if (c.jolly && run && !run.free) {
      if ((run.jolly[c.jolly] || 0) <= 0) throw new Error('jolly esaurito ' + c.jolly);
      run.jolly[c.jolly]--;
    }
    if (c.jolly) d.used[c.jolly] = (d.used[c.jolly] || 0) + 1;
    const pBefore = CL.prob(d).p;
    const mBefore = Object.assign({}, d.m);
    const delta = applyFx(d, c.fx || {});
    const gained = [], lost = [];
    (c.mp || []).forEach((k) => { if (!d.mp.has(k)) { d.mp.add(k); gained.push(k); } });
    (c.mpx || []).forEach((k) => { if (d.mp.delete(k)) lost.push(k); });
    if (c.set) Object.assign(d.flags, c.set);
    if (c.integ) {
      d.integ += c.integ;
      if (run) run.rep = CL.clamp(run.rep + c.integ, 0, 100);
    }
    const next = typeof c.next === 'function' ? c.next(d) : c.next;
    if (!next) throw new Error('next mancante ' + d.sc.id + '/' + d.node + '/' + id);
    const rec = { node: d.node, id: c.id, q: c.q, t: c.t, r: c.r, tip: n.tip, delta, gained, lost, jolly: c.jolly || null, integ: c.integ || 0, pBefore, mBefore };
    d.hist.push(rec);
    if (next === 'END' || next === 'DQ') { d.over = next; }
    else {
      if (!d.sc.nodes[next]) throw new Error('nodo inesistente ' + next + ' da ' + d.sc.id + '/' + d.node);
      d.node = next;
      rec.entered = CL.enterNode(d);
    }
    const pAfter = CL.prob(d).p;
    rec.pAfter = pAfter;
    d.minP = Math.min(d.minP, pAfter);
    if (pAfter < 0.25 && d.maxP >= 0.45) d.dipped = true;
    d.maxP = Math.max(d.maxP, pAfter);
    return rec;
  };

  /* ───────────── SCONTO / LEP ───────────── */
  CL.approval = (d) => {
    const lep = d.sc.lep != null ? d.sc.lep : C.lepDefault;
    let allowed = lep;
    if (d.flags.giveGet) allowed = Math.max(allowed, lep + 6);
    if (d.flags.deskApproved) allowed = Math.max(allowed, lep + 12);
    const eff = Math.min(d.disc, allowed);
    const excess = Math.max(0, d.disc - allowed);
    let status = 'ok';
    if (d.disc > allowed) status = 'blocked';
    else if (d.disc > lep) status = 'approved';
    return { lep, allowed, eff, excess, status, mult: excess ? Math.max(0.35, 1 - 0.045 * excess) : 1 };
  };

  /* ───────────── PROBABILITÀ ───────────── */
  CL.score = (d) => {
    const m = d.m;
    const cov = (d.mp.size / 8) * 100;
    const ap = CL.approval(d);
    return 0.22 * m.trust + 0.24 * m.value + 0.16 * m.urgency + 0.18 * m.control + 0.20 * cov
      - 0.25 * Math.max(0, m.risk - 20) + 0.22 * Math.min(ap.eff, 30);
  };

  CL.prob = (d) => {
    const s = CL.score(d);
    const ap = CL.approval(d);
    let p = (1 / (1 + Math.exp(-(s - 59) / 7.5))) * ap.mult;
    let cap = null;
    for (const c of d.sc.caps || []) {
      if (c.if(d) && (!cap || c.max < cap.max)) cap = c;
    }
    let capped = false;
    if (cap && p > cap.max) { p = cap.max; capped = true; }
    return { p, score: s, cap: capped ? cap : null, ap };
  };

  CL.ev = (d) => CL.prob(d).p * d.list * (1 - CL.approval(d).eff / 100);

  /* ───────────── ESITO ───────────── */
  /* abbandono di una trattativa in corso: perso, nessun ACV */
  CL.forfeit = (d) => ({
    id: d.sc.id, title: d.sc.title, client: d.sc.client, avgQ: CL.avgQ(d), mp: d.mp.size, hasE: d.mp.has('E'), hasC: d.mp.has('C'),
    minP: d.minP, dipped: false, integ: d.integ, flags: Object.assign({}, d.flags), used: Object.assign({}, d.used), steps: d.hist.length,
    status: 'lost', acv: 0, p: CL.prob(d).p, pe: 0, roll: 1, disc: 0, promised: d.disc, blocked: false, lep: CL.approval(d).lep, cap: null, listFinal: d.list, overLep: false, forfeited: true,
  });

  CL.avgQ = (d) => (d.hist.length ? d.hist.reduce((a, h) => a + h.q, 0) / d.hist.length : 0);

  CL.finish = (d, run, rnd) => {
    const sc = d.sc;
    const base = { id: sc.id, title: sc.title, client: sc.client, avgQ: CL.avgQ(d), mp: d.mp.size, hasE: d.mp.has('E'), hasC: d.mp.has('C'), minP: d.minP, dipped: !!d.dipped, integ: d.integ, flags: Object.assign({}, d.flags), used: Object.assign({}, d.used), steps: d.hist.length };
    if (d.over === 'DQ') {
      return Object.assign(base, { status: 'disq', acv: 0, p: 0, disc: 0, refund: sc.dqRefund != null ? sc.dqRefund : 2 });
    }
    const pr = CL.prob(d);
    const ap = pr.ap;
    /* sopra l'80% la firma è quasi certa: una trattativa condotta bene non deve dipendere da un dado sfortunato */
    const pe = pr.p >= 0.9 ? 1 : pr.p >= 0.8 ? pr.p + (pr.p - 0.8) * 2 : pr.p;
    const u = rnd();
    let status;
    if (u < pe) status = 'won';
    else status = (u - pe) / (1 - pe) < (sc.slip != null ? sc.slip : 0.3) ? 'slip' : 'lost';
    const acv = status === 'won' ? Math.round(d.list * (1 - ap.eff / 100)) : 0;
    return Object.assign(base, {
      status, acv, p: pr.p, pe, roll: u, disc: ap.eff, promised: d.disc, blocked: ap.status === 'blocked', lep: ap.lep,
      cap: pr.cap, listFinal: d.list, overLep: ap.eff > ap.lep,
    });
  };

  /* ───────────── TRIMESTRE ───────────── */
  CL.newRun = (opts) => {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : (Date.now() ^ (Math.random() * 4294967296)) >>> 0;
    const jolly = {};
    Object.keys(CL.JOLLY).forEach((k) => (jolly[k] = CL.JOLLY[k].start));
    return {
      mode: opts.mode || 'career', seed, rnd: CL.rng(seed), hard: !!opts.hard, name: opts.name || '',
      free: opts.mode === 'train', spent: 0, jolly, rep: C.repStart,
      results: [], done: {}, scouted: {}, eventsSeen: {}, eventLog: [], bonusAcv: 0, bonusDeals: [], timeouts: 0, mods: {},
    };
  };
  CL.energy = (run) => C.energy - run.spent;
  CL.week = (run) => CL.clamp(1 + run.spent, 1, C.weeks);
  CL.trustBonus = (run) => (run.mode === 'career' ? Math.round((run.rep - C.repStart) / 10) : 0);
  CL.dealOpts = (run) => ({ trustBonus: CL.trustBonus(run), mods: run.mode === 'career' ? run.mods : {} });
  CL.waitWeek = (run) => { run.spent += 1; };

  CL.avail = (run, sc) => {
    if (run.free) return { state: 'ready' };
    if (run.done[sc.id]) return { state: 'done' };
    const w = CL.week(run);
    if (w < sc.window[0]) return { state: 'early', from: sc.window[0] };
    if (w > sc.window[1]) return { state: 'expired', until: sc.window[1] };
    if (sc.cost > CL.energy(run)) return { state: 'poor' };
    return { state: 'ready' };
  };

  CL.canPlayAny = (run) => CL.scenarios.some((s) => CL.avail(run, s).state === 'ready');
  CL.canWaitForAny = (run) => CL.energy(run) > 0 && CL.scenarios.some((s) => CL.avail(run, s).state === 'early');

  CL.commitDeal = (run, sc, res) => {
    run.results.push(res);
    if (run.mode !== 'career') return { energyDelta: 0 };
    run.done[sc.id] = true;
    let delta = 0;
    if (res.status === 'disq') { run.spent += Math.max(1, sc.cost - res.refund); delta = -Math.max(1, sc.cost - res.refund); }
    else {
      run.spent += sc.cost;
      delta = -sc.cost;
      if (res.status === 'won' && res.avgQ >= 2.6 && !run.momentumUsed) { run.momentumUsed = true; run.spent = Math.max(0, run.spent - 1); delta += 1; res.momentum = true; }
    }
    return { energyDelta: delta };
  };

  /* ───────────── RIEPILOGO ───────────── */
  const RANKS = [
    { max: 0.4, name: 'Stagista dei preventivi', line: 'Hai compilato molte offerte. Pochi clienti se ne sono accorti.' },
    { max: 0.7, name: 'Order taker', line: 'Chiudi ciò che si chiude da solo. Il resto aspetta qualcuno che lo guidi.' },
    { max: 1.0, name: 'Closer in rodaggio', line: 'Il metodo c’è. Ti manca poco: un deal ben condotto fa la differenza.' },
    { max: 1.15, name: 'Closer affidabile', line: 'Quota centrata con metodo. Il forecast che il tuo manager vorrebbe da tutti.' },
    { max: 1.3, name: 'Trusted advisor', line: 'I clienti ti chiamano prima ancora di avere un budget. È un altro mestiere.' },
    { max: 99, name: 'Rainmaker', line: 'Presidents Club e un nome che circola nei corridoi. Ora insegna.' },
  ];

  CL.badgeDefs = [
    { id: 'quota', name: 'Quota centrata', desc: 'Raggiungi il 100% della quota.', test: (r, s) => s.att >= 1 },
    { id: 'rain', name: 'Rainmaker', desc: 'Raggiungi il 130% della quota.', test: (r, s) => s.att >= 1.3 },
    { id: 'clean', name: 'Mani pulite', desc: 'Chiudi il trimestre con reputazione ≥ 90 e almeno il 70% della quota.', test: (r, s) => r.rep >= 90 && s.att >= 0.7 },
    { id: 'qual', name: 'Occhio da qualificatore', desc: 'Squalifica un deal zombie invece di inseguirlo.', test: (r) => r.results.some((x) => x.status === 'disq' && x.steps >= 2) },
    { id: 'multi', name: 'Multi-threading', desc: 'Vinci 3 deal con Economic Buyer e Champion entrambi acquisiti.', test: (r) => r.results.filter((x) => x.status === 'won' && x.hasE && x.hasC).length >= 3 },
    { id: 'disc', name: 'Disciplina di sconto', desc: 'Vinci almeno 3 deal senza mai superare la soglia LEP.', test: (r) => { const w = r.results.filter((x) => x.status === 'won'); return w.length >= 3 && w.every((x) => !x.overLep); } },
    { id: 'manual', name: 'Deal da manuale', desc: 'Vinci un deal con qualità media delle decisioni ≥ 2,8.', test: (r) => r.results.some((x) => x.status === 'won' && x.avgQ >= 2.8) },
    { id: 'comeback', name: 'Rimonta', desc: 'Vinci un deal che, dopo essere stato oltre il 45%, è sceso sotto il 25% di probabilità.', test: (r) => r.results.some((x) => x.status === 'won' && x.dipped) },
    { id: 'streak', name: 'Filotto', desc: 'Vinci 3 deal consecutivi.', test: (r) => { let s = 0, m = 0; r.results.forEach((x) => { if (x.status === 'won') { s++; m = Math.max(m, s); } else if (x.status !== 'disq') s = 0; }); return m >= 3; } },
    { id: 'hard', name: 'Senza rete', desc: 'Centra la quota in modalità “senza rete” (probabilità e indicatori nascosti).', test: (r, s) => r.hard && s.att >= 1 },
    { id: 'cowboy', name: 'Cowboy del forecast', desc: 'Centra la quota con reputazione sotto 40. Capita. Poi i clienti se lo ricordano.', test: (r, s) => s.att >= 1 && r.rep < 40 },
    { id: 'dojo', name: 'Cintura nera di obiezioni', desc: 'Totalizza almeno il 90% nel Dojo delle obiezioni.', test: () => false },
  ];

  CL.summary = (run) => {
    const wonDeals = run.results.filter((x) => x.status === 'won');
    const acvDeals = wonDeals.reduce((a, x) => a + x.acv, 0);
    const total = acvDeals + run.bonusAcv;
    const att = total / C.quota;
    let comm = C.rate1 * Math.min(total, C.quota) + C.rate2 * Math.max(0, total - C.quota);
    if (run.hard) comm *= 1.1;
    let rank = RANKS.find((x) => att < x.max);
    if (att >= 1 && run.rep < 40) rank = { name: 'Cowboy del forecast', line: 'Quota centrata, ma con una scia di promesse che qualcuno dovrà onorare. Il trimestre prossimo si paga.' };
    else if (att < 0.7 && run.rep >= 85) rank = { name: 'Boy scout della pipeline', line: 'Integrità impeccabile, risultato pallido. La coscienza è a posto, la quota un po’ meno.' };
    const played = run.results.filter((x) => x.status !== 'disq');
    const sum = {
      acvDeals, bonus: run.bonusAcv, total, att, commission: comm, rank,
      wins: wonDeals.length, losses: run.results.filter((x) => x.status === 'lost').length,
      slips: run.results.filter((x) => x.status === 'slip').length, dq: run.results.filter((x) => x.status === 'disq').length,
      avgDisc: wonDeals.length ? wonDeals.reduce((a, x) => a + x.disc, 0) / wonDeals.length : 0,
      avgQ: played.length ? played.reduce((a, x) => a + x.avgQ, 0) / played.length : 0,
      avgMp: played.length ? played.reduce((a, x) => a + x.mp, 0) / played.length : 0,
      weeks: CL.week(run), energyLeft: Math.max(0, CL.energy(run)),
    };
    sum.badges = CL.badgeDefs.filter((b) => b.test(run, sum)).map((b) => b.id);
    return sum;
  };
})(typeof window !== 'undefined' ? window : globalThis);
