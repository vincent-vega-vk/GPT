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
      wild: null, wildCount: 0, wildUsed: {},
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
    wild: d.wild, wildCount: d.wildCount, wildUsed: Object.assign({}, d.wildUsed),
  });

  /* il nodo corrente: un imprevisto (wild) ha la precedenza sul nodo dello scenario */
  CL.nodeOf = (d) => (d.wild ? d.wild.node : d.sc.nodes[d.node]);

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
    if (d.wild) return null;
    const n = d.sc.nodes[d.node];
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

  /* righe della reazione immediata di una scelta (react può essere funzione dello stato) */
  CL.reactLines = (d, c) => {
    const raw = CL.val(c.react, d);
    return Array.isArray(raw) ? raw.filter((l) => !l.if || l.if(d)) : [];
  };

  /* opts: { rnd } abilita gli imprevisti (wild); { wild:false } li esclude; { pWild } ne cambia la probabilità */
  CL.pick = (d, id, run, opts) => {
    opts = opts || {};
    const inWild = !!d.wild;
    const n = CL.nodeOf(d);
    const c = n.choices.find((x) => x.id === id);
    if (!c) throw new Error('scelta inesistente ' + d.sc.id + '/' + (inWild ? 'wild:' + d.wild.id : d.node) + '/' + id);
    if (c.jolly && run && !run.free) {
      if ((run.jolly[c.jolly] || 0) <= 0) throw new Error('jolly esaurito ' + c.jolly);
      run.jolly[c.jolly]--;
    }
    if (c.jolly) d.used[c.jolly] = (d.used[c.jolly] || 0) + 1;
    const pBefore = CL.prob(d).p;
    const mBefore = Object.assign({}, d.m);
    const delta = applyFx(d, CL.val(c.fx, d) || {});
    const gained = [], lost = [];
    (c.mp || []).forEach((k) => { if (!d.mp.has(k)) { d.mp.add(k); gained.push(k); } });
    (c.mpx || []).forEach((k) => { if (d.mp.delete(k)) lost.push(k); });
    if (c.set) Object.assign(d.flags, c.set);
    if (c.integ) {
      d.integ += c.integ;
      if (run) run.rep = CL.clamp(run.rep + c.integ, 0, 100);
    }
    const next = inWild ? 'RET' : CL.val(c.next, d);
    if (!next) throw new Error('next mancante ' + d.sc.id + '/' + d.node + '/' + id);
    const rec = {
      node: inWild ? 'wild:' + d.wild.id : d.node, id: c.id, q: c.q, t: c.t, say: c.say || null, r: CL.val(c.r, d), react: CL.reactLines(d, c),
      tip: n.tip, delta, gained, lost, jolly: c.jolly || null, integ: c.integ || 0, pBefore, mBefore,
      wild: inWild ? d.wild.id : null, wildTitle: inWild ? d.wild.title : null,
    };
    d.hist.push(rec);
    if (inWild) {
      d.wild = null;
      rec.entered = CL.enterNode(d); /* ora si entra davvero nel nodo che l'imprevisto aveva interrotto */
    } else if (next === 'END' || next === 'DQ') { d.over = next; }
    else {
      if (!d.sc.nodes[next]) throw new Error('nodo inesistente ' + next + ' da ' + d.sc.id + '/' + d.node);
      d.node = next;
      if (opts.rnd && CL.rollWild(d, opts.rnd, opts)) rec.wildNext = d.wild.id;
      else rec.entered = CL.enterNode(d);
    }
    const pAfter = CL.prob(d).p;
    rec.pAfter = pAfter;
    d.minP = Math.min(d.minP, pAfter);
    if (pAfter < 0.25 && d.maxP >= 0.45) d.dipped = true;
    d.maxP = Math.max(d.maxP, pAfter);
    return rec;
  };

  /* ───────────── IMPREVISTI (variabili aleatorie dentro la trattativa) ───────────── */
  CL.wildPool = (d) => {
    const last = d.hist[d.hist.length - 1];
    const lastNode = last ? last.node : null;
    const mk = (w, generic) => ({ w, key: (generic ? 'g:' : 's:') + w.id, weight: (w.w || 1) * (generic ? 0.5 : 1.5), generic });
    const no = d.sc.noWild || [];   /* imprevisti generici che stonano con questo scenario */
    return [].concat((d.sc.wild || []).map((w) => mk(w, false)), (CL.wildGeneric || []).filter((w) => no.indexOf(w.id) < 0).map((w) => mk(w, true)))
      .filter((x) => !d.wildUsed[x.key] && (!x.w.after || x.w.after.indexOf(lastNode) >= 0) && (!x.w.if || x.w.if(d)));
  };

  CL.rollWild = (d, rnd, opts) => {
    opts = opts || {};
    if (opts.wild === false || d.wild || d.over) return false;
    if (d.wildCount >= (opts.maxWild != null ? opts.maxWild : 2)) return false;
    const last = d.hist[d.hist.length - 1];
    if (!last || last.wild) return false;
    if (rnd() >= (opts.pWild != null ? opts.pWild : 0.3)) return false;
    const pool = CL.wildPool(d);
    if (!pool.length) return false;
    let tot = 0; pool.forEach((x) => { tot += x.weight; });
    let u = rnd() * tot, pick = pool[pool.length - 1];
    for (const x of pool) { if ((u -= x.weight) <= 0) { pick = x; break; } }
    d.wild = { id: pick.w.id, title: pick.w.title, node: pick.w.node, generic: pick.generic };
    d.wildCount++; d.wildUsed[pick.key] = 1;
    return true;
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
    minP: d.minP, dipped: false, wilds: 0, integ: d.integ, flags: Object.assign({}, d.flags), used: Object.assign({}, d.used), steps: d.hist.length,
    status: 'lost', acv: 0, p: CL.prob(d).p, pe: 0, roll: 1, disc: 0, promised: d.disc, blocked: false, lep: CL.approval(d).lep, cap: null, listFinal: d.list, overLep: false, forfeited: true,
  });

  CL.avgQ = (d) => (d.hist.length ? d.hist.reduce((a, h) => a + h.q, 0) / d.hist.length : 0);

  const baseResult = (d) => {
    const sc = d.sc;
    return { id: sc.id, title: sc.title, client: sc.client, avgQ: CL.avgQ(d), mp: d.mp.size, hasE: d.mp.has('E'), hasC: d.mp.has('C'), minP: d.minP, dipped: !!d.dipped, integ: d.integ, flags: Object.assign({}, d.flags), used: Object.assign({}, d.used), steps: d.hist.length, wilds: d.hist.filter((h) => h.wild).length };
  };

  /* chiude le decisioni: l'esito resta SIGILLATO (pending) fino al giorno di chiusura */
  CL.seal = (d) => {
    const sc = d.sc;
    const base = baseResult(d);
    if (d.over === 'DQ') return Object.assign(base, { status: 'disq', acv: 0, p: 0, disc: 0, refund: sc.dqRefund != null ? sc.dqRefund : 2 });
    const pr = CL.prob(d), ap = pr.ap;
    return Object.assign(base, {
      status: 'pending', acv: 0, p: pr.p, disc: ap.eff, promised: d.disc, blocked: ap.status === 'blocked', lep: ap.lep, cap: pr.cap,
      listFinal: d.list, overLep: ap.eff > ap.lep, net: Math.round(d.list * (1 - ap.eff / 100)),
      snap: { m: Object.assign({}, d.m), mp: Array.from(d.mp), flags: Object.assign({}, d.flags), disc: d.disc, list: d.list },
    });
  };

  /* stato "ricostruito" da un risultato sigillato, per testare shock e domande di forecast */
  CL.pseudoDeal = (res) => ({
    sc: CL.getScenario(res.id), m: Object.assign({}, res.snap.m), mp: new Set(res.snap.mp), flags: Object.assign({}, res.snap.flags),
    disc: res.snap.disc, list: res.snap.list, hist: [], node: null, integ: res.integ, over: 'END', entered: {}, used: {}, wildUsed: {}, wildCount: 0, wild: null,
  });

  /* ───────────── SHOCK DEL GIORNO DI CHIUSURA (variabili aleatorie dopo le decisioni) ───────────── */
  CL.drawShock = (pd, rnd, opts) => {
    opts = opts || {};
    if (rnd() >= (opts.pShock != null ? opts.pShock : 0.6)) return null;
    const pool = [].concat(
      (pd.sc.shocks || []).map((s) => ({ s, w: (s.w || 1) * 2 })),
      (CL.shocksGeneric || []).filter((s) => (pd.sc.noShock || []).indexOf(s.id) < 0).map((s) => ({ s, w: s.w || 1 }))
    ).filter((x) => !x.s.if || x.s.if(pd));
    if (!pool.length) return null;
    let tot = 0; pool.forEach((x) => { tot += x.w; });
    let u = rnd() * tot, pick = pool[pool.length - 1];
    for (const x of pool) { if ((u -= x.w) <= 0) { pick = x; break; } }
    const s = pick.s;
    const hit = s.hit ? !!s.hit(pd) : true;
    const dp = hit ? s.dp : (s.dpProt != null ? s.dpProt : (s.kind === 'neg' ? s.dp * 0.12 : 0));
    return { id: s.id, title: s.title, kind: s.kind, hit, dp, text: hit ? s.hitText : s.protText, generic: !(pd.sc.shocks || []).includes(s) };
  };

  /* risolve un risultato sigillato: aiuto del manager, shock, tiro finale */
  CL.settle = (res, run, rnd, opts) => {
    if (res.status !== 'pending') return res;
    opts = opts || {};
    const pd = CL.pseudoDeal(res);
    const boost = (run && run.boost && run.boost[res.id]) || 0;
    let p = CL.clamp(res.p + boost, 0, 0.99);
    const shock = opts.shocks === false ? null : CL.drawShock(pd, rnd, opts);
    if (shock) p = CL.clamp(p + shock.dp, 0, 1);
    /* sopra l'80% la firma è quasi certa: una trattativa condotta bene non deve dipendere da un dado sfortunato */
    const pe = p >= 0.9 ? 1 : p >= 0.8 ? p + (p - 0.8) * 2 : p;
    const u = rnd();
    let status;
    if (u < pe) status = 'won';
    else status = (u - pe) / (1 - pe) < (pd.sc.slip != null ? pd.sc.slip : 0.3) ? 'slip' : 'lost';
    return Object.assign({}, res, { status, acv: status === 'won' ? res.net : 0, pFinal: p, pe, roll: u, boost, shock });
  };

  /* risultato immediato (allenamento) */
  CL.finish = (d, run, rnd, opts) => {
    const sealed = CL.seal(d);
    if (sealed.status !== 'pending') return sealed;
    const r = CL.settle(sealed, run, rnd, opts);
    r.p = sealed.p;
    return r;
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
      mgr: 60, boost: {}, fc: { calls: {} }, promised: {}, closing: null,
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
    res.week = CL.week(run);
    let delta = 0;
    if (res.status === 'disq') { run.spent += Math.max(1, sc.cost - res.refund); delta = -Math.max(1, sc.cost - res.refund); }
    else {
      run.spent += sc.cost;
      delta = -sc.cost;
      /* slancio: una trattativa condotta in modo eccellente restituisce una settimana (una volta per trimestre) */
      if (res.status !== 'lost' && res.p >= 0.85 && res.avgQ >= 2.6 && !run.momentumUsed) { run.momentumUsed = true; run.spent = Math.max(0, run.spent - 1); delta += 1; res.momentum = true; }
    }
    return { energyDelta: delta };
  };

  /* giorno di chiusura: tutte le trattative in sospeso vengono risolte (aiuto del manager, shock, tiro) */
  CL.closeQuarter = (run, rnd) => {
    const log = [];
    run.results.forEach((res, i) => {
      if (res.status !== 'pending') return;
      const fin = CL.settle(res, run, rnd);
      run.results[i] = fin;
      log.push(fin);
    });
    log.sort((a, b) => (a.week || 0) - (b.week || 0));
    run.closing = log;
    return log;
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
    { id: 'fc', name: 'Forecast da manuale', desc: 'Chiudi il trimestre con affidabilità del forecast ≥ 85% su almeno 3 trattative.', test: (r, s) => !!(s.fc && s.fc.n >= 3 && s.fc.acc >= 0.85) },
    { id: 'resil', name: 'Preparato a tutto', desc: 'Assorbi senza danni almeno 2 shock del giorno di chiusura.', test: (r, s) => s.shocksAbsorbed >= 2 },
    { id: 'sandbag', name: 'Sandbagger', desc: 'Chiama basso una trattativa che poi vinci. Marta se lo ricorda.', test: (r, s) => !!(s.fc && s.fc.sandbagged) },
    { id: 'dojo', name: 'Cintura nera di obiezioni', desc: 'Totalizza almeno il 90% nel Dojo delle obiezioni.', test: () => false },
  ];

  CL.summary = (run) => {
    const wonDeals = run.results.filter((x) => x.status === 'won');
    const acvDeals = wonDeals.reduce((a, x) => a + x.acv, 0);
    const total = acvDeals + run.bonusAcv;
    const att = total / C.quota;
    let comm = C.rate1 * Math.min(total, C.quota) + C.rate2 * Math.max(0, total - C.quota);
    if (run.hard) comm *= 1.1;
    const fcs = CL.fcScore ? CL.fcScore(run) : null;
    const kicker = fcs && fcs.n >= 2 ? (fcs.acc >= 0.85 ? 1.08 : fcs.acc >= 0.7 ? 1.03 : fcs.acc < 0.4 ? 0.92 : 1) : 1;
    comm *= kicker;
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
      weeks: CL.week(run), energyLeft: Math.max(0, CL.energy(run)), fc: fcs, kicker,
      shocksHit: run.results.filter((x) => x.shock && x.shock.hit && x.shock.kind === 'neg').length,
      shocksAbsorbed: run.results.filter((x) => x.shock && !x.shock.hit && x.shock.kind === 'neg').length,
      wilds: run.results.reduce((a, x) => a + (x.wilds || 0), 0),
    };
    sum.badges = CL.badgeDefs.filter((b) => b.test(run, sum)).map((b) => b.id);
    return sum;
  };
})(typeof window !== 'undefined' ? window : globalThis);
