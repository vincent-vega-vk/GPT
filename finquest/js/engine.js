/* FinQuest — costruzione delle sessioni (20 tappe per livello) */
(function (root) {
  const FQ = (root.FQ = root.FQ || {});
  const U = FQ.U;
  FQ.CONTENT = FQ.CONTENT || {};
  root.FQC = function (id, data) { FQ.CONTENT[id] = data; };
  const E = (FQ.Engine = {});

  E.level = (id) => FQ.LEVELS[id - 1];
  E.content = (id) => FQ.CONTENT[id] || null;

  // difficoltà 0..1: cresce con il livello e con le tappe "avanzate"
  E.diff = function (lv, stageIdx) {
    const base = ((lv - 1) / 99) * 0.75;
    const hard = ['calc2', 'chart2', 'boss', 'review', 'check'].includes(FQ.STAGES[stageIdx].k) ? 0.25 : stageIdx >= 10 ? 0.1 : 0;
    return U.clamp(base + hard, 0, 1);
  };

  // ---------- costruttori di esercizi dai contenuti ----------
  const B = (E.B = {});
  B.card = (c, lv, i) => ({ type: 'card', card: c, ref: { l: lv, k: 'card', i } });
  B.tf = (r, lv, i) => {
    const t = E.content(lv).tf[i];
    return { type: 'tf', prompt: t[0], answer: t[1], exp: t[2], ref: { l: lv, k: 'tf', i } };
  };
  B.mcq = (r, lv, i) => {
    const m = E.content(lv).mcq[i];
    const opts = r.shuffle([m.a, ...m.w]);
    return { type: 'mcq', prompt: m.q, options: opts, answer: opts.indexOf(m.a), exp: m.e, ref: { l: lv, k: 'mcq', i } };
  };
  B.fill = (r, lv, i) => {
    const f = E.content(lv).fill[i];
    const opts = r.shuffle([f.a, ...f.w]);
    const [pre, post] = f.s.split('___');
    return { type: 'fill', pre, post, options: opts, answer: opts.indexOf(f.a), exp: f.e || null, ref: { l: lv, k: 'fill', i } };
  };
  B.order = (r, lv, i) => {
    const o = E.content(lv).order[i];
    let sh = r.shuffle(o.i);
    for (let k = 0; k < 5 && sh.every((x, j) => x === o.i[j]); k++) sh = r.shuffle(o.i);
    return { type: 'order', prompt: o.q, items: o.i, shuffled: sh, exp: o.e, ref: { l: lv, k: 'order', i } };
  };
  B.cat = (r, lv, i) => {
    const c = E.content(lv).cat[i];
    const items = r.shuffle(c.g.flatMap((g, gi) => g[1].map((t) => ({ t, g: gi }))));
    return { type: 'cat', prompt: c.q, groups: c.g.map((g) => g[0]), items, ref: { l: lv, k: 'cat', i } };
  };
  B.scen = (r, lv, i) => {
    const s = E.content(lv).scen[i];
    const opts = r.shuffle(s.o);
    return { type: 'scen', story: s.s, prompt: s.q, options: opts.map((o) => o.t), feedback: opts.map((o) => o.f), answer: opts.findIndex((o) => o.ok), ref: { l: lv, k: 'scen', i } };
  };
  // termine ↔ definizione
  B.term = (r, lv, i, dir) => {
    const terms = E.content(lv).terms;
    const [t, def] = terms[i];
    let pool = terms.filter((_, j) => j !== i);
    if (pool.length < 3) pool = pool.concat(E.neighborTerms(lv));
    const wrong = r.sample(pool, 3);
    if (dir === 'def') {
      const opts = r.shuffle([def, ...wrong.map((w) => w[1])]);
      return { type: 'mcq', prompt: `Che cosa significa “${t}”?`, options: opts, answer: opts.indexOf(def), exp: `${t}: ${def}`, ref: { l: lv, k: 'term', i, d: 'def' } };
    }
    const opts = r.shuffle([t, ...wrong.map((w) => w[0])]);
    return { type: 'mcq', prompt: `Quale termine corrisponde a questa definizione?`, quote: def, options: opts, answer: opts.indexOf(t), exp: `${t}: ${def}`, ref: { l: lv, k: 'term', i, d: 'term' } };
  };
  B.match = (r, lv, n = 4, offset = 0) => {
    const terms = E.content(lv).terms;
    const idx = r.shuffle(terms.map((_, i) => i)).slice(offset, offset + n);
    if (idx.length < 3) idx.push(...r.sample(terms.map((_, i) => i).filter((i) => !idx.includes(i)), 3 - idx.length));
    return { type: 'match', pairs: idx.map((i) => terms[i]), ref: { l: lv, k: 'match', i: idx } };
  };
  B.calc = (r, lv, key, d, mode) => Object.assign(FQ.Calc.make(key, r, d, mode), { ref: { l: lv, k: 'calc', g: key } });
  B.chart = (r, lv, key, d) => {
    const g = FQ.Charts.gen[key] || FQ.Charts.gen.trend;
    const ex = g(r, d);
    ex.ref = { l: lv, k: 'chart', g: key };
    return ex;
  };
  B.sim = (r, lv, d) => {
    const L = E.level(lv);
    const kind = L.sim;
    let spec;
    if (kind === 'trade') spec = FQ.Sims.tradeSpec(r, d);
    else if (kind === 'budget') spec = FQ.Sims.allocSpec(r, d, 'budget');
    else if (kind === 'alloc') spec = FQ.Sims.allocSpec(r, d, 'port');
    else spec = FQ.Sims.labSpec(r, d, [6, 72].includes(lv) ? 'infl' : [43, 96].includes(lv) ? 'cost' : 'compound');
    return { type: 'sim', spec, ref: { l: lv, k: 'sim' } };
  };

  E.neighborTerms = function (lv) {
    const out = [];
    for (const k of [lv - 1, lv + 1, lv - 2, lv + 2]) { const c = E.content(k); if (c) out.push(...c.terms); }
    return out;
  };

  // rigenera un esercizio da un riferimento (per il ripasso degli errori)
  E.fromRef = function (ref, r) {
    const lv = ref.l;
    if (!E.content(lv) && ref.k !== 'calc' && ref.k !== 'chart') return null;
    const d = ((lv - 1) / 99) * 0.75;
    try {
      switch (ref.k) {
        case 'tf': return B.tf(r, lv, ref.i);
        case 'mcq': return B.mcq(r, lv, ref.i);
        case 'fill': return B.fill(r, lv, ref.i);
        case 'order': return B.order(r, lv, ref.i);
        case 'cat': return B.cat(r, lv, ref.i);
        case 'scen': return B.scen(r, lv, ref.i);
        case 'term': return B.term(r, lv, ref.i, ref.d);
        case 'match': return B.match(r, lv, 4);
        case 'calc': return B.calc(r, lv, ref.g, d, 'mcq');
        case 'chart': return B.chart(r, lv, ref.g, d);
      }
    } catch (e) { /* contenuto cambiato */ }
    return null;
  };

  // pesca senza ripetizioni all'interno di una sessione
  function picker(r, n) {
    let bag = [];
    return () => { if (!bag.length) bag = r.shuffle([...Array(n).keys()]); return bag.pop(); };
  }

  /* Costruisce la sessione di una tappa.
     Ritorna { items, mode: 'normal'|'timed'|'boss', pass } */
  E.build = function (lv, si, seed) {
    const r = U.rng(seed || U.seed());
    const L = E.level(lv);
    const c = E.content(lv);
    const st = FQ.STAGES[si].k;
    const d = E.diff(lv, si);
    const items = [];
    const calcKey = () => r.pick(L.calc);
    const chartKey = () => r.pick(L.chart);
    const numMode = () => (lv >= 25 && r.chance(0.5) ? 'num' : 'mcq');

    if (!c) {
      // contenuti mancanti: sessione solo numerica/grafica
      for (let i = 0; i < 6; i++) items.push(i % 2 ? B.calc(r, lv, calcKey(), d, 'mcq') : B.chart(r, lv, chartKey(), d));
      return { items, mode: 'normal' };
    }
    const tf = picker(r, c.tf.length), mcq = picker(r, c.mcq.length), fill = picker(r, c.fill.length), term = picker(r, c.terms.length), scen = picker(r, c.scen.length);
    const T = () => B.tf(r, lv, tf());
    const Q = () => B.mcq(r, lv, mcq());
    const Fi = () => B.fill(r, lv, fill());
    const Te = (dir) => B.term(r, lv, term(), dir || r.pick(['def', 'term']));
    const Sc = () => B.scen(r, lv, scen());
    const Ca = (mode) => B.calc(r, lv, calcKey(), d, mode || 'mcq');
    const Ch = (key) => B.chart(r, lv, key || chartKey(), d);
    const card = (i) => B.card(c.cards[i], lv, i);
    // per i miti: preferisce le affermazioni false (errori comuni)
    const falseTf = c.tf.map((t, i) => (t[1] ? -1 : i)).filter((i) => i >= 0);

    switch (st) {
      case 'intro':
        items.push(card(0), T(), card(1), Te('def'), Q(), B.match(r, lv, 3));
        break;
      case 'vocab':
        items.push(B.match(r, lv, 4), Te('term'), Te('def'), Te('term'), B.match(r, lv, 4, 4), Te('def'));
        break;
      case 'deep':
        items.push(card(2), Q(), card(3), T(), Q(), T());
        break;
      case 'tf':
        for (let i = 0; i < 7; i++) items.push(T());
        break;
      case 'calc':
        items.push(Ca('mcq'), Ca('mcq'), Ca('mcq'), Ca(numMode()), Ca('mcq'));
        break;
      case 'chart':
        items.push(Ch(L.chart[0]), Ch(L.chart[1] || L.chart[0]), Ch(), Ch(), Ch());
        break;
      case 'mix':
        items.push(Q(), T(), Ca(), Ch(), Fi(), B.match(r, lv, 4));
        break;
      case 'scen':
        items.push(Sc(), Sc(), Sc(), T());
        break;
      case 'fill':
        for (let i = 0; i < 5; i++) items.push(Fi());
        items.push(Te('term'));
        break;
      case 'check':
        items.push(Q(), Ca(numMode()), Ch(), T(), Sc(), Fi(), B.order(r, lv, r.int(0, c.order.length - 1)), B.match(r, lv, 5));
        break;
      case 'info':
        items.push(card(4), Q(), card(5), T(), B.cat(r, lv, 0), Te());
        break;
      case 'sort':
        items.push(B.order(r, lv, 0), B.cat(r, lv, 0), B.order(r, lv, c.order.length > 1 ? 1 : 0), B.cat(r, lv, c.cat.length > 1 ? 1 : 0));
        break;
      case 'calc2':
        items.push(Ca('num'), Ca('num'), Ca('mcq'), Ca('num'), Ca('num'));
        break;
      case 'chart2': {
        const keys = U.uniq(FQ.LEVELS.filter((x) => x.unit === L.unit && x.id <= lv).flatMap((x) => x.chart));
        items.push(Ch(), Ch(r.pick(keys)), Ch(), Ch(r.pick(keys)), Ch());
        break;
      }
      case 'decide':
        items.push(Sc(), B.sim(r, lv, d), Sc(), Q());
        break;
      case 'timed':
        for (let i = 0; i < 16; i++) items.push(r.pick([T, T, Q, Te])());
        return { items, mode: 'timed', seconds: 75 };
      case 'myth': {
        const ff = r.shuffle(falseTf).slice(0, 4);
        ff.forEach((i) => items.push(B.tf(r, lv, i)));
        items.push(Q(), Sc(), T());
        break;
      }
      case 'sim':
        items.push(B.sim(r, lv, d), Ca(), T());
        break;
      case 'review': {
        items.push(Q(), Ca(numMode()), Ch(), Te(), Fi(), Sc());
        const prev = E.content(lv - 1);
        if (prev && lv > 1) {
          const L2 = E.level(lv - 1);
          items.push(B.tf(r, lv - 1, r.int(0, prev.tf.length - 1)), B.mcq(r, lv - 1, r.int(0, prev.mcq.length - 1)), B.calc(r, lv - 1, r.pick(L2.calc), d, 'mcq'));
        } else items.push(T(), Q());
        break;
      }
      case 'boss':
        items.push(Q(), T(), Ca('num'), Ch(), Sc(), Fi(), Q(), Ca('mcq'), Ch(), B.match(r, lv, 5), r.chance(0.5) ? B.order(r, lv, r.int(0, c.order.length - 1)) : B.cat(r, lv, r.int(0, c.cat.length - 1)), T());
        return { items: items.filter(Boolean), mode: 'boss', pass: 0.75 };
    }
    return { items: items.filter(Boolean), mode: 'normal' };
  };

  // allenamento misto da più livelli (pratica, ripasso, test di posizionamento e di salto)
  E.mixed = function (levels, n, seed, opts = {}) {
    const r = U.rng(seed || U.seed());
    const items = [];
    const avail = levels.filter((l) => E.content(l));
    for (let k = 0; k < n * 3 && items.length < n; k++) {
      const lv = r.pick(avail.length ? avail : levels);
      const c = E.content(lv);
      const L = E.level(lv);
      const d = ((lv - 1) / 99) * 0.75;
      const kinds = c ? (opts.quick ? ['tf', 'mcq', 'term'] : ['tf', 'mcq', 'mcq', 'term', 'calc', 'chart', 'fill']) : ['calc', 'chart'];
      const kd = r.pick(kinds);
      let ex = null;
      if (kd === 'tf') ex = B.tf(r, lv, r.int(0, c.tf.length - 1));
      if (kd === 'mcq') ex = B.mcq(r, lv, r.int(0, c.mcq.length - 1));
      if (kd === 'term') ex = B.term(r, lv, r.int(0, c.terms.length - 1), r.pick(['def', 'term']));
      if (kd === 'fill') ex = B.fill(r, lv, r.int(0, c.fill.length - 1));
      if (kd === 'calc') ex = B.calc(r, lv, r.pick(L.calc), d, 'mcq');
      if (kd === 'chart') ex = B.chart(r, lv, r.pick(L.chart), d);
      if (ex) { ex.lvTag = lv; items.push(ex); }
    }
    return items;
  };

  // test di posizionamento: 2 domande per unità, in ordine crescente
  E.placement = function (seed) {
    const r = U.rng(seed || U.seed());
    const items = [];
    for (let u = 1; u <= 10; u++) {
      const lvs = FQ.LEVELS.filter((l) => l.unit === u).map((l) => l.id);
      const two = E.mixed(r.sample(lvs, 4), 2, r.int(1, 1e9), { quick: false });
      two.forEach((x) => { x.unitTag = u; items.push(x); });
    }
    return items;
  };
})(typeof window !== 'undefined' ? window : globalThis);
