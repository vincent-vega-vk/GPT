/* CLOSER · forecast call con il manager: categorie, sfide, risoluzione, affidabilità. Nessun accesso al DOM. */
(function (g) {
  'use strict';
  const CL = g.CL;

  CL.CATS = [
    { k: 'commit', label: 'Commit', min: 0.8, hint: 'Firma entro il trimestre. Lo scrivi sul CRM e ne rispondi.' },
    { k: 'best', label: 'Best Case', min: 0.5, hint: 'Può chiudere, ma manca ancora qualcosa di concreto.' },
    { k: 'pipe', label: 'Pipeline', min: 0.25, hint: 'Esiste, ma non è prevedibile questo trimestre.' },
    { k: 'out', label: 'Fuori', min: 0, hint: 'Non firma nel trimestre.' },
  ];
  const RANK = { commit: 3, best: 2, pipe: 1, out: 0 };
  CL.catRank = (k) => RANK[k];
  CL.catLabel = (k) => (CL.CATS.find((c) => c.k === k) || { label: k }).label;
  CL.truthCat = (p) => (p >= 0.8 ? 'commit' : p >= 0.5 ? 'best' : p >= 0.25 ? 'pipe' : 'out');
  const crmCat = (c) => ({ commit: 'commit', 'best case': 'best', pipeline: 'pipe' }[String(c).toLowerCase()] || 'pipe');

  /* ───── voci del foglio ───── */
  CL.fcEntries = (run, kind) => {
    const out = [];
    CL.scenarios.forEach((sc) => {
      const res = run.results.find((r) => r.id === sc.id);
      if (res && res.status === 'pending') {
        const carried = (run.fc && run.fc.flags && run.fc.flags[sc.id]) || {};   /* segni lasciati dalla call di metà trimestre */
        out.push(Object.assign({ id: sc.id, sc, state: 'pending', p: res.p, net: res.net, res, truth: CL.truthCat(res.p), cat: null, crm: null }, carried));
      } else if (!res && kind === 'mid') {
        const av = CL.avail(run, sc);
        if (av.state === 'expired') return;
        const p0 = CL.prob(CL.newDeal(sc, CL.dealOpts(run))).p;
        out.push({ id: sc.id, sc, state: 'open', p: p0, net: Math.round(sc.list * 0.9), res: null, truth: CL.truthCat(p0), cat: crmCat(sc.crm.cat), crm: crmCat(sc.crm.cat) });
      }
    });
    return out;
  };

  /* ───── segnaposto ───── */
  CL.fcFmt = (s, e, gapKey, extra) => {
    if (typeof s !== 'string') return s;
    const sc = e && e.sc;
    const ppl = (sc && sc.fc && sc.fc.people) || {};
    const who = ppl[gapKey] || ppl.E || '';
    const ctx = Object.assign({
      client: sc ? sc.client : 'il cliente', title: sc ? sc.title : '', who,
      claim: e && e.cat ? CL.catLabel(e.cat) : '', truth: e ? CL.catLabel(e.truth) : '',
      acv: e ? CL.fmtK(e.net || 0) : '', p: e ? Math.round(e.p * 100) + '%' : '', nome: CL.playerName || 'collega',
      contact: CL.shortName(ppl.C), buyer: CL.shortName(ppl.E),
    }, extra || {});
    return s.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] != null ? ctx[k] : m));
  };

  const pick = (arr, rnd) => (arr && arr.length ? arr[Math.floor(rnd() * arr.length)] : '');
  const pickN = (arr, n, rnd) => CL.shuffle(arr || [], rnd).slice(0, n);

  /* ───── il "buco" su cui Marta punta ───── */
  const ORDER_COMMIT = ['E', 'P', 'Dp', 'M', 'C', 'I', 'Dc', 'Co'];
  const ORDER_BEST = ['E', 'Dp', 'M', 'C', 'I', 'Dc', 'P', 'Co'];
  CL.fcGap = (e) => {
    const res = e.res;
    if (!res) return 'meters';
    if (res.cap) return 'cap';
    const have = new Set(res.snap.mp);
    const order = e.cat === 'commit' ? ORDER_COMMIT : ORDER_BEST;
    const sc = CL.getScenario(res.id), skip = (sc && sc.fc && sc.fc.skipGaps) || [];   /* lettere che in questo scenario non si possono guadagnare */
    const miss = order.find((k) => !have.has(k) && skip.indexOf(k) < 0);
    if (miss) return miss;
    if (res.blocked || res.overLep) return 'disc';
    return 'meters';
  };
  CL.fcGapNote = (e, gap) => {
    const res = e.res;
    if (gap === 'cap' && res && res.cap) return res.cap.why;
    return null;
  };

  /* ───── costruzione delle sfide ───── */
  let uid = 0;
  const mk = (type, e, extra) => Object.assign({ id: 'c' + (++uid), type, entry: e }, extra);

  CL.fcBuild = (run, entries, kind, rnd) => {
    const B = CL.FCBANK;
    const rank = (k) => RANK[k];
    const mism = (e) => rank(e.cat) - rank(e.truth);
    const list = [];

    entries.filter((e) => e.state === 'pending' && mism(e) >= 1).sort((a, b) => mism(b) - mism(a)).forEach((e) => list.push(mk('evidence', e, { gap: CL.fcGap(e), sev: 4 + mism(e) })));
    entries.filter((e) => e.state === 'open' && rank(e.cat) >= 2 && CL.avail(run, e.sc).state !== 'early').forEach((e) => list.push(mk('unworked', e, { sev: 4 })));   /* una trattativa non ancora apribile non si può rimproverare di non averla lavorata */
    entries.filter((e) => e.state === 'pending' && mism(e) <= -1 && e.p >= 0.55).forEach((e) => list.push(mk('sandbag', e, { sev: 3 })));
    entries.filter((e) => e.state === 'pending' && mism(e) === 0 && rank(e.cat) >= 2).forEach((e) => {
      const pd = CL.pseudoDeal(e.res);
      const cs = ((e.sc.fc && e.sc.fc.custom) || []).filter((c) => !c.if || c.if(pd));
      if (cs.length && rnd() < 0.55) list.push(mk('custom', e, { custom: pick(cs, rnd), sev: 2.5 }));
      else list.push(mk('risk', e, { sev: 2 }));
    });
    /* le chiamate sbagliate di poco, ma con una domanda specifica dello scenario, ricevono anche la domanda custom */
    entries.filter((e) => e.state === 'pending' && mism(e) >= 1 && e.sc.fc && e.sc.fc.custom && rnd() < 0.35).forEach((e) => {
      const pd = CL.pseudoDeal(e.res);
      const cs = e.sc.fc.custom.filter((c) => !c.if || c.if(pd));
      if (cs.length) list.push(mk('custom', e, { custom: pick(cs, rnd), sev: 3 }));
    });
    list.sort((a, b) => b.sev - a.sev);
    const max = kind === 'final' ? 4 : 3;
    const chosen = [];
    const seenEntry = {};
    for (const c of list) {
      if (chosen.length >= max) break;
      if (seenEntry[c.entry.id] >= 2) continue;
      seenEntry[c.entry.id] = (seenEntry[c.entry.id] || 0) + 1;
      chosen.push(c);
    }
    const hasCalls = entries.some((e) => e.state === 'pending');
    if (hasCalls || kind === 'mid') chosen.push(mk('coverage', null, { sev: 1 }));
    return chosen.map((c) => CL.fcFill(c, run, kind, rnd));
  };

  /* riempie battute di Marta e opzioni del giocatore a partire dalla banca testi */
  CL.fcFill = (c, run, kind, rnd) => {
    const B = CL.FCBANK || {};
    const e = c.entry, f = (s, extra) => CL.fcFmt(s, e, c.gap, extra);
    const opts = [];
    const add = (id, kind_, t, reacts) => opts.push({ id, kind: kind_, t, reacts });
    if (c.type === 'evidence') {
      const g = (B.gaps || {})[c.gap] || {};
      c.q = f(pick(g.q, rnd));
      add('honest', 'honest', f(pick(g.honest, rnd)), g.react && g.react.honest);
      add('bluff', 'bluff', f(pick(g.bluff, rnd)), null);
      add('vague', 'vague', f(pick(g.vague, rnd)), g.react && g.react.vague);
      c.bank = g;
    } else if (c.type === 'sandbag') {
      const g = B.sandbag || {};
      c.q = f(pick(g.q, rnd));
      add('correct', 'honest', f(pick(g.correct, rnd)), g.react && g.react.correct);
      add('stay', 'bad', f(pick(g.stay, rnd)), g.react && g.react.stay);
      add('vague', 'vague', f(pick(g.vague, rnd)), g.react && g.react.vague);
      c.bank = g;
    } else if (c.type === 'risk') {
      const g = B.risk || {};
      c.q = f(pick(g.q, rnd));
      add('name', 'honest', f(pick(g.name, rnd), { who: e.sc.fc && e.sc.fc.risk ? e.sc.fc.risk : '' }), g.react && g.react.name);
      add('overconf', 'bad', f(pick(g.overconf, rnd)), g.react && g.react.overconf);
      add('vague', 'vague', f(pick(g.vague, rnd)), g.react && g.react.vague);
      c.bank = g;
    } else if (c.type === 'unworked') {
      const g = B.unworked || {};
      c.q = f(pick(g.q, rnd));
      add('honest', 'honest', f(pick(g.honest, rnd)), g.react && g.react.honest);
      add('bluff', 'bluff', f(pick(g.bluff, rnd)), null);
      add('plan', 'plan', f(pick(g.plan, rnd)), g.react && g.react.plan);
      c.bank = g;
    } else if (c.type === 'coverage') {
      const g = B.coverage || {};
      c.q = CL.fcFmt(pick(g.q, rnd), null, null);
      add('honest', 'honest', CL.fcFmt(pick(g.honest, rnd), null, null), g.react && g.react.honest);
      add('optimistic', 'bad', CL.fcFmt(pick(g.optimistic, rnd), null, null), g.react && g.react.optimistic);
      add('vague', 'vague', CL.fcFmt(pick(g.vague, rnd), null, null), g.react && g.react.vague);
      c.bank = g;
    } else if (c.type === 'custom') {
      const cu = c.custom;
      const pd = CL.pseudoDeal(e.res);
      const has = cu.has ? !!cu.has(pd) : false;
      c.has = has;
      c.q = f(cu.q);
      if (has) add('evidence', 'evidence', f(cu.evidence), [cu.react.evidence]);
      add('honest', 'honest', f(cu.honest), [cu.react.honest]);
      if (!has) add('bluff', 'bluff', f(cu.bluff), null);
      add('vague', 'vague', f(cu.vague), [cu.react.vague]);
      c.bank = { react: { bluffCaught: [cu.react.bluffCaught], bluffPassed: [cu.react.bluffPassed] } };
    }
    c.opts = opts;
    return c;
  };

  /* ───── risoluzione di una risposta ───── */
  const HELP = { E: 0.08, Dp: 0.08, P: 0.08, C: 0.08, M: 0.05, I: 0.05, Dc: 0.05, Co: 0.05, disc: 0.05, cap: 0.05, meters: 0.05 };
  const bump = (run, key, d) => { run[key] = CL.clamp(run[key] + d, 0, 100); };
  const downgrade = (k) => ({ commit: 'best', best: 'pipe', pipe: 'out', out: 'out' }[k]);

  CL.fcResolve = (run, c, optId, rnd) => {
    const o = c.opts.find((x) => x.id === optId);
    const e = c.entry;
    const B = c.bank || {};
    const eff = { rep: 0, mgr: 0, boost: 0, weeks: 0, cat: null, score: 0, caught: null, help: null };
    const reactFrom = (arr) => CL.fcFmt(pick(arr, rnd), e, c.gap);
    let reacts = o.reacts;
    const gapKey = c.gap || 'E';
    switch (c.type + ':' + o.id) {
      case 'evidence:honest': {
        /* ammettere dopo essere stati sfidati vale meno che aver chiamato giusto al primo colpo, e meno ancora se lo scarto era grande */
        const miss = RANK[e.cat] - RANK[e.truth];
        eff.rep = miss >= 2 ? 1 : 2; eff.mgr = miss >= 2 ? 2 : 4; eff.cat = e.truth; eff.boost = (HELP[gapKey] || 0.05) * 0.5; eff.score = miss >= 2 ? 0.5 : 0.8; eff.help = true; break;
      }
      case 'evidence:bluff': {
        const caught = rnd() < 0.85; eff.caught = caught;
        if (caught) { eff.rep = -8; eff.mgr = -15; eff.cat = e.truth; eff.weeks = 1; eff.score = -1; reacts = B.react && B.react.bluffCaught; }
        else { eff.rep = -1; eff.mgr = 0; eff.score = -0.5; reacts = B.react && B.react.bluffPassed; e.bluffed = true; }
        break;
      }
      case 'evidence:vague':
        eff.rep = -2; eff.mgr = -4; eff.cat = downgrade(e.cat) === 'out' ? 'pipe' : downgrade(e.cat); eff.score = -0.5; break;
      case 'sandbag:correct':
        eff.rep = 3; eff.mgr = 5; eff.cat = e.truth; eff.score = 1; break;
      case 'sandbag:stay':
        eff.rep = -2; eff.mgr = -3; eff.score = -0.5; e.sandbagged = true; break;
      case 'sandbag:vague':
        eff.rep = -1; eff.mgr = -2; eff.score = -0.3; e.sandbagged = true; break;
      case 'risk:name':
        eff.rep = 2; eff.mgr = 4; eff.boost = 0.03; eff.score = 1; break;
      case 'risk:overconf':
        eff.rep = -2; eff.mgr = -5; eff.score = -1; e.overconf = true; break;
      case 'risk:vague':
        eff.rep = -1; eff.mgr = -2; eff.score = -0.3; break;
      case 'unworked:honest':
        eff.rep = 2; eff.mgr = 3; eff.cat = 'pipe'; eff.score = 1; break;
      case 'unworked:bluff':
        eff.caught = true; eff.rep = -6; eff.mgr = -12; eff.cat = 'out'; eff.weeks = 1; eff.score = -1; reacts = B.react && B.react.bluffCaught; break;
      case 'unworked:plan':
        eff.mgr = 1; eff.cat = e.cat === 'commit' ? 'best' : e.cat; eff.score = 0.3; run.promised[e.id] = CL.week(run) + 3; e.promised = true; break;
      case 'coverage:honest':
        eff.rep = 3; eff.mgr = 5; eff.score = 1; break;
      case 'coverage:optimistic':
        eff.rep = -2; eff.mgr = -4; eff.score = -1; run.coverageOptimistic = true; break;
      case 'coverage:vague':
        eff.rep = -1; eff.mgr = -2; eff.score = -0.3; break;
      case 'custom:evidence':
        eff.rep = 3; eff.mgr = 5; eff.boost = 0.02; eff.score = 1; break;
      case 'custom:honest':
        eff.rep = 2; eff.mgr = 4; eff.cat = e.cat === 'commit' ? 'best' : e.cat; eff.boost = 0.04; eff.help = true; eff.score = 0.8; break;
      case 'custom:bluff': {
        const caught = rnd() < 0.8; eff.caught = caught;
        if (caught) { eff.rep = -7; eff.mgr = -13; eff.cat = downgrade(e.cat); eff.weeks = 1; eff.score = -1; reacts = B.react && B.react.bluffCaught; }
        else { eff.rep = -1; eff.score = -0.5; reacts = B.react && B.react.bluffPassed; e.bluffed = true; }
        break;
      }
      case 'custom:vague':
        eff.rep = -2; eff.mgr = -4; eff.cat = downgrade(e.cat) === 'out' ? 'pipe' : downgrade(e.cat); eff.score = -0.5; break;
      default: break;
    }
    if (eff.weeks && run.mode === 'career' && CL.energy(run) > 1) run.spent += eff.weeks; else eff.weeks = 0;
    if (eff.rep) run.rep = CL.clamp(run.rep + eff.rep, 0, 100);
    if (eff.mgr) bump(run, 'mgr', eff.mgr);
    if (eff.boost && e) run.boost[e.id] = Math.min(0.15, (run.boost[e.id] || 0) + eff.boost);
    eff.lines = reacts && reacts.length ? [reactFrom(reacts)] : [];   /* prima di aggiornare la categoria: {claim} è ciò che avevi dichiarato */
    if (eff.cat && e) { if (eff.cat !== e.cat) e.corrected = true; e.was = e.was || e.cat; e.cat = eff.cat; }
    return eff;
  };

  /* ───── chiusura della call ───── */
  CL.fcFinalize = (run, kind, entries, scores) => {
    const call = {
      kind, week: CL.week(run),
      entries: entries.map((e) => ({ id: e.id, state: e.state, cat: e.cat, truth: e.truth, p: e.p, net: e.net, bluffed: !!e.bluffed, sandbagged: !!e.sandbagged, overconf: !!e.overconf, promised: !!e.promised })),
    };
    run.fc.calls[kind] = call;
    run.fc.flags = run.fc.flags || {};
    entries.forEach((e) => { if (e.bluffed || e.sandbagged || e.overconf) run.fc.flags[e.id] = Object.assign(run.fc.flags[e.id] || {}, { bluffed: !!(e.bluffed || (run.fc.flags[e.id] || {}).bluffed), sandbagged: !!(e.sandbagged || (run.fc.flags[e.id] || {}).sandbagged), overconf: !!(e.overconf || (run.fc.flags[e.id] || {}).overconf) }); });
    const sum = (cat) => entries.filter((e) => e.state === 'pending' && e.cat === cat).reduce((a, e) => a + e.net, 0);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const quality = avg >= 0.55 ? 'good' : avg >= 0 ? 'mixed' : 'bad';
    /* premio alle voci chiamate giuste al primo colpo (senza essere state corrette dopo una sfida) */
    const rightFirst = entries.filter((e) => e.state === 'pending' && !e.corrected && e.cat === e.truth).length;
    if (rightFirst) { bump(run, 'mgr', Math.min(6, rightFirst * 2)); run.rep = CL.clamp(run.rep + Math.min(3, rightFirst), 0, 100); }
    /* concessione o taglio di risorse: solo alla call di metà trimestre (alla finale non servirebbero più a niente) */
    let grant = null;
    if (kind !== 'mid') { /* nessun effetto sulle risorse alla commit call finale */ }
    else if (run.mgr >= 80 && !run.fc.granted) { run.fc.granted = true; run.jolly.exec += 1; grant = { kind: 'exec', text: '+1 Executive Sponsor' }; }
    else if (run.mgr < 35 && !run.fc.cut) {
      const k = ['desk', 'se', 'ref', 'exec'].find((x) => run.jolly[x] > 0);
      if (k) { run.fc.cut = true; run.jolly[k] -= 1; grant = { kind: 'cut', text: '−1 ' + CL.JOLLY[k].name }; }
    }
    return { commit: sum('commit'), best: sum('best'), pipe: sum('pipe'), quality, avg, grant, rightFirst };
  };

  /* ───── affidabilità del forecast (dopo il giorno di chiusura) ───── */
  const PTS = {
    commit: { won: 1, slip: 0.35, lost: 0 },
    best: { won: 0.8, slip: 0.6, lost: 0.4 },
    pipe: { won: 0.4, slip: 0.7, lost: 0.8 },
    out: { won: 0.1, slip: 0.5, lost: 1 },
  };
  CL.fcScore = (run) => {
    const call = run.fc && run.fc.calls && run.fc.calls.final;
    if (!call) return null;
    let n = 0, sum = 0, miss = 0, sandbagged = false;
    const rows = [];
    call.entries.forEach((e) => {
      const res = run.results.find((r) => r.id === e.id);
      if (!res || res.status === 'pending' || res.status === 'disq' || e.state !== 'pending') return;
      const pts = PTS[e.cat][res.status];
      n++; sum += pts;
      if (e.cat === 'commit' && res.status !== 'won') miss++;
      if ((e.cat === 'pipe' || e.cat === 'out') && res.status === 'won' && res.p >= 0.6) sandbagged = true;
      rows.push({ id: e.id, title: res.title, client: res.client, cat: e.cat, status: res.status, pts, p: res.p, net: res.net, bluffed: e.bluffed, sandbagged: e.sandbagged, overconf: e.overconf });
    });
    return { n, acc: n ? sum / n : null, miss, sandbagged, rows };
  };

  /* penalità/premi di coda dopo il giorno di chiusura (una sola volta) */
  CL.fcSettle = (run) => {
    const lines = [];
    const sc = CL.fcScore(run);
    if (!sc || run.fc.settled) return lines;
    run.fc.settled = true;
    sc.rows.forEach((r) => {
      if (r.bluffed && r.status !== 'won') { run.rep = CL.clamp(run.rep - 8, 0, 100); bump(run, 'mgr', -10); lines.push({ id: r.id, text: 'La chiamata gonfiata non ha retto: reputazione −8.', tone: 'bad' }); }
      if (r.sandbagged && r.status === 'won') { run.rep = CL.clamp(run.rep - 3, 0, 100); bump(run, 'mgr', -5); lines.push({ id: r.id, text: 'Hai chiamato basso e poi hai vinto: sandbagging, reputazione −3.', tone: 'warn' }); }
      if (r.overconf && r.status === 'lost') { run.rep = CL.clamp(run.rep - 6, 0, 100); lines.push({ id: r.id, text: '“Nessun rischio”, avevi detto: reputazione −6.', tone: 'bad' }); }
    });
    Object.keys(run.promised).forEach((id) => {
      if (!run.results.some((r) => r.id === id)) { run.rep = CL.clamp(run.rep - 4, 0, 100); bump(run, 'mgr', -8); lines.push({ id, text: 'Avevi promesso di lavorare ' + (CL.getScenario(id) || {}).client + ' e non l’hai fatto: reputazione −4.', tone: 'bad' }); }
    });
    return lines;
  };
})(typeof window !== 'undefined' ? window : globalThis);
