/* FinQuest — simulazioni interattive: sala trading, allocazione (portafoglio/budget), laboratorio */
(function (root) {
  const FQ = (root.FQ = root.FQ || {});
  const U = FQ.U, C = FQ.Charts, h = U.h;
  const S = (FQ.Sims = {});

  /* ---------------- SALA TRADING ----------------
     Missione: fare almeno un’operazione senza che il conto perda più del limite dal suo massimo.
     Insegna stop loss, costi e confronto con il buy & hold. */
  S.tradeSpec = function (r, d) {
    const n = 46, vis = 16;
    const closes = [];
    let p = r.step(20, 120, 5);
    const crashAt = r.int(22, 38), crash = r.chance(0.75);
    for (let i = 0; i < n; i++) {
      const drift = crash && i >= crashAt && i < crashAt + 5 ? -0.035 : r.range(-0.002, 0.004);
      p = Math.max(1, p * (1 + drift + 0.017 * r.normal()));
      closes.push(p);
    }
    return { kind: 'trade', ohlc: C.ohlc(r, closes, 0.014), vis, limit: d > 0.6 ? 8 : 12, fee: 0.1, cash: 10000 };
  };

  S.trade = function (spec, api) {
    const st = { i: spec.vis - 1, cash: spec.cash, sh: 0, entry: null, stopPct: 8, trades: 0, fees: 0, peak: spec.cash, maxDD: 0, log: [], done: false };
    const el = h('div', { class: 'sim sim-trade' });
    const chartBox = h('div', { class: 'sim-chart' });
    const stats = h('div', { class: 'sim-stats' });
    const logBox = h('div', { class: 'sim-log', 'aria-live': 'polite' });
    const stopSel = h('div', { class: 'seg', role: 'group', 'aria-label': 'Stop loss' });
    [0, 5, 8, 10].forEach((v) => {
      const b = h('button', { class: 'seg-b' + (v === st.stopPct ? ' on' : ''), type: 'button', onclick: () => { st.stopPct = v; U.$$('.seg-b', stopSel).forEach((x) => x.classList.toggle('on', x === b)); render(); } }, v ? `−${v}%` : 'Nessuno');
      stopSel.appendChild(b);
    });
    const bBuy = h('button', { class: 'btn btn-up', type: 'button', onclick: buy }, 'Compra');
    const bSell = h('button', { class: 'btn btn-down', type: 'button', onclick: sell }, 'Vendi');
    const bNext = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => step(1) }, 'Avanti ▸');
    const bNext5 = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => step(5) }, '▸▸ ×5');
    const bEnd = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => step(999) }, 'Fino alla fine');
    el.append(
      h('div', { class: 'sim-mission' }, h('b', null, 'Missione: '), `fai almeno un’operazione e arriva alla fine senza che il conto scenda più del ${spec.limit}% dal suo massimo. Commissione ${U.nf(spec.fee, 1)}% per operazione.`),
      chartBox, stats,
      h('div', { class: 'sim-row' }, h('span', { class: 'sim-lbl' }, 'Stop loss automatico'), stopSel),
      h('div', { class: 'sim-row sim-actions' }, bBuy, bSell, bNext, bNext5, bEnd),
      logBox,
    );
    const px = () => spec.ohlc[st.i].c;
    const equity = () => st.cash + st.sh * px();
    function note(s) { st.log.unshift(s); logBox.innerHTML = st.log.slice(0, 4).map((x) => `<div>${U.esc(x)}</div>`).join(''); }
    function buy() {
      if (st.sh || st.done) return;
      const fee = st.cash * spec.fee / 100;
      st.sh = (st.cash - fee) / px(); st.fees += fee; st.cash = 0; st.entry = px(); st.trades++;
      note(`Giorno ${st.i + 1}: comprato a ${U.eur(px(), 2)} (commissione ${U.eur(fee, 2)})`);
      FQ.App && FQ.App.sfx('tap'); render();
    }
    function sell(reason, price) {
      if (!st.sh || st.done && !reason) return;
      const p = price || px();
      const gross = st.sh * p, fee = gross * spec.fee / 100;
      const res = (p / st.entry - 1) * 100;
      st.cash = gross - fee; st.fees += fee; st.sh = 0; st.trades++;
      note(`Giorno ${st.i + 1}: ${reason || 'venduto'} a ${U.eur(p, 2)} (${U.signPct(res, 1)})`);
      st.entry = null; render();
    }
    function step(k) {
      for (let j = 0; j < k && st.i < spec.ohlc.length - 1; j++) {
        st.i++;
        const c = spec.ohlc[st.i];
        if (st.sh && st.stopPct) {
          const lvl = st.entry * (1 - st.stopPct / 100);
          if (c.l <= lvl) { sell('stop loss scattato', Math.min(c.o, lvl)); FQ.App && FQ.App.sfx('wrong'); }
        }
        const eq = equity();
        st.peak = Math.max(st.peak, eq);
        st.maxDD = Math.max(st.maxDD, (st.peak - eq) / st.peak * 100);
        if (st.maxDD > spec.limit && st.sh) { /* resta: è una lezione */ }
      }
      if (st.i >= spec.ohlc.length - 1) finish();
      render();
    }
    function finish() {
      if (st.done) return;
      st.done = true;
      if (st.sh) sell('chiusura finale');
      const ok = st.trades > 0 && st.maxDD <= spec.limit;
      const bh = (spec.ohlc[spec.ohlc.length - 1].c / spec.ohlc[spec.vis - 1].c - 1) * 100;
      const res = (st.cash / spec.cash - 1) * 100;
      st.result = { ok, res, bh, dd: st.maxDD };
      api.setReady(true);
    }
    function render() {
      const vis = spec.ohlc.slice(0, st.i + 1);
      const hl = [];
      if (st.entry) {
        hl.push({ y: st.entry, label: 'Ingresso', col: 'ink2' });
        if (st.stopPct) hl.push({ y: st.entry * (1 - st.stopPct / 100), label: 'Stop', col: 'down' });
      }
      chartBox.innerHTML = C.candles({ c: vis, hl, label: 'Grafico di trading' }).svg;
      const eq = equity();
      const ddNow = st.maxDD;
      stats.innerHTML = `
        <div><span>Conto</span><b class="mono">${U.eur(eq, 0)}</b></div>
        <div><span>Risultato</span><b class="mono ${eq >= spec.cash ? 'pos' : 'neg'}">${U.signPct((eq / spec.cash - 1) * 100, 1)}</b></div>
        <div><span>Calo max</span><b class="mono ${ddNow > spec.limit ? 'neg' : ''}">${U.nf(ddNow, 1)}%</b></div>
        <div><span>Giorno</span><b class="mono">${st.i + 1}/${spec.ohlc.length}</b></div>`;
      bBuy.disabled = !!st.sh || st.done;
      bSell.disabled = !st.sh || st.done;
      [bNext, bNext5, bEnd].forEach((b) => (b.disabled = st.done));
    }
    render();
    note('Il grafico mostra gli ultimi giorni. Decidi se e quando entrare, poi fai avanzare il tempo.');
    return {
      el,
      check() {
        const R = st.result;
        const msg = `Risultato ${U.signPct(R.res, 1)} contro ${U.signPct(R.bh, 1)} del “compra e tieni” · calo massimo del conto ${U.nf(R.dd, 1)}% · commissioni ${U.eur(st.fees, 2)}.`;
        const why = st.trades === 0 ? 'Non hai fatto operazioni: la missione richiedeva almeno un acquisto.'
          : R.ok ? 'Hai tenuto il rischio sotto controllo. Nota: il risultato di una singola simulazione dipende anche dal caso; conta il processo.'
            : `Il conto è sceso oltre il ${spec.limit}%. Uno stop loss più stretto o una posizione più piccola avrebbero limitato il danno.`;
        return { ok: R.ok, exp: msg + ' ' + why, answer: R.ok ? null : 'Rischio oltre il limite' };
      },
      stats: () => st.result,
    };
  };

  /* ---------------- ALLOCAZIONE ---------------- */
  const ASSETS = {
    az: { n: 'Azioni', col: 's1', mu: 7, sd: 16 },
    ob: { n: 'Obbligazioni', col: 's2', mu: 3, sd: 6 },
    li: { n: 'Liquidità', col: 's3', mu: 2, sd: 0.5 },
  };
  const PROFILES = [
    { nm: 'Marta, 62 anni', txt: 'Andrà in pensione tra 3 anni. Le serviranno parte dei soldi per integrare la pensione; un forte calo la metterebbe in difficoltà.', eq: [10, 35], cash: [5, 30], label: 'prudente' },
    { nm: 'Luca, 45 anni', txt: 'Investe per l’università dei figli tra 10 anni. Accetta oscillazioni moderate ma non vuole rischiare tutto.', eq: [35, 65], cash: [0, 20], label: 'bilanciato' },
    { nm: 'Giulia, 28 anni', txt: 'Ha già un fondo di emergenza a parte. Investe per la pensione, tra oltre 30 anni, e ha retto bene i ribassi passati.', eq: [65, 100], cash: [0, 15], label: 'dinamico' },
    { nm: 'Paolo, 35 anni', txt: 'Vuole comprare casa tra 2 anni con questi risparmi. Non può permettersi di trovarsi con il 30% in meno al momento dell’acquisto.', eq: [0, 25], cash: [15, 100], label: 'molto prudente' },
    { nm: 'Sara, 50 anni', txt: 'Orizzonte di 15 anni, entrate stabili, tollera cali temporanei ma non estremi.', eq: [40, 70], cash: [0, 20], label: 'bilanciato-dinamico' },
  ];

  S.allocSpec = function (r, d, preset) {
    if (preset === 'budget') {
      const inc = r.step(1400, 3000, 100);
      const rent = Math.round(inc * r.range(0.25, 0.33) / 10) * 10;
      const bills = r.step(120, 260, 10), food = r.step(250, 450, 10);
      const ess = rent + bills + food;
      return { kind: 'alloc', preset, inc, ess, cats: [
        { k: 'ne', n: 'Spese essenziali', col: 's1', v: 60 },
        { k: 'de', n: 'Desideri', col: 's2', v: 30 },
        { k: 'ri', n: 'Risparmio e investimenti', col: 's3', v: 10 },
      ], fixed: [['Affitto', rent], ['Bollette', bills], ['Spesa alimentare', food]], minSave: d > 0.3 ? 20 : 15 };
    }
    const p = r.pick(PROFILES);
    return { kind: 'alloc', preset: 'port', p, cats: [
      { k: 'az', n: 'Azioni', col: 's1', v: 34 }, { k: 'ob', n: 'Obbligazioni', col: 's2', v: 33 }, { k: 'li', n: 'Liquidità', col: 's3', v: 33 },
    ] };
  };

  S.alloc = function (spec, api) {
    const cats = spec.cats.map((c) => Object.assign({}, c));
    const el = h('div', { class: 'sim sim-alloc' });
    const pieBox = h('div', { class: 'sim-pie' });
    const metrics = h('div', { class: 'sim-stats' });
    const sliders = h('div', { class: 'sliders' });
    let touched = false;
    if (spec.preset === 'budget') {
      el.append(h('div', { class: 'sim-mission' }, h('b', null, 'Missione: '), `stipendio netto ${U.eur(spec.inc)}. Copri tutte le spese essenziali e risparmia almeno il ${spec.minSave}% del reddito.`),
        h('ul', { class: 'fixed-list' }, spec.fixed.map(([n, v]) => h('li', null, h('span', null, n), h('b', { class: 'mono' }, U.eur(v)))), h('li', { class: 'tot' }, h('span', null, 'Totale essenziali'), h('b', { class: 'mono' }, U.eur(spec.ess)))));
    } else {
      el.append(h('div', { class: 'profile-card' }, h('div', { class: 'pc-name' }, spec.p.nm), h('p', null, spec.p.txt)),
        h('div', { class: 'sim-mission' }, h('b', null, 'Missione: '), 'scegli un’allocazione coerente con orizzonte, obiettivo e tolleranza al rischio di questa persona.'));
    }
    cats.forEach((c, i) => {
      const out = h('output', { class: 'mono' });
      const inp = h('input', { type: 'range', min: 0, max: 100, step: 5, value: c.v, id: 'sl-' + c.k, 'aria-label': c.n });
      inp.addEventListener('input', () => { setVal(i, Number(inp.value)); touched = true; api.setReady(true); });
      c.inp = inp; c.out = out;
      sliders.append(h('label', { class: 'slider', for: 'sl-' + c.k }, h('span', { class: 'sl-name' }, h('i', { class: 'sw', style: `background:var(--${c.col})` }), c.n), inp, out));
    });
    el.append(h('div', { class: 'alloc-grid' }, sliders, pieBox), metrics);

    function setVal(i, v) {
      const others = cats.filter((_, j) => j !== i);
      const rest = 100 - v;
      const curOthers = U.sum(others.map((c) => c.v));
      cats[i].v = v;
      if (curOthers === 0) others.forEach((c) => (c.v = rest / others.length));
      else others.forEach((c) => (c.v = (c.v / curOthers) * rest));
      // arrotonda a multipli di 5 mantenendo somma 100
      others.forEach((c) => (c.v = Math.round(c.v / 5) * 5));
      const diff = 100 - U.sum(cats.map((c) => c.v));
      if (diff) { const o = others.sort((a, b) => b.v - a.v)[0]; o.v += diff; }
      render();
    }
    function port() {
      const w = Object.fromEntries(cats.map((c) => [c.k, c.v / 100]));
      const mu = U.sum(cats.map((c) => (c.v / 100) * ASSETS[c.k].mu));
      const cov = (a, b) => (a === b ? 1 : a + b === 'azob' || a + b === 'obaz' ? 0.1 : 0) * ASSETS[a].sd * ASSETS[b].sd;
      let v = 0;
      cats.forEach((a) => cats.forEach((b) => { v += w[a.k] * w[b.k] * cov(a.k, b.k); }));
      return { mu, sd: Math.sqrt(v) };
    }
    function render() {
      cats.forEach((c) => { c.inp.value = c.v; c.out.textContent = U.nf(c.v, 0) + '%'; });
      pieBox.innerHTML = C.pie({ d: cats.filter((c) => c.v > 0).map((c) => [c.n, c.v]), label: 'Allocazione' }).svg;
      // colori coerenti con gli slider anche quando una voce è a zero
      const used = cats.filter((c) => c.v > 0);
      const paths = pieBox.querySelectorAll('svg path, svg circle');
      paths.forEach((pth, j) => used[j] && (pth.style[pth.tagName === 'circle' ? 'stroke' : 'fill'] = `var(--${used[j].col})`));
      pieBox.querySelectorAll('.legend .sw').forEach((sw, j) => used[j] && (sw.style.background = `var(--${used[j].col})`));
      if (spec.preset === 'budget') {
        const amt = (k) => spec.inc * cats.find((c) => c.k === k).v / 100;
        metrics.innerHTML = cats.map((c) => `<div><span>${U.esc(c.n)}</span><b class="mono">${U.eur(amt(c.k))}</b></div>`).join('') +
          `<div><span>Essenziali da coprire</span><b class="mono ${amt('ne') >= spec.ess ? 'pos' : 'neg'}">${U.eur(spec.ess)}</b></div>`;
      } else {
        const p = port();
        metrics.innerHTML = `<div><span>Rendimento atteso*</span><b class="mono">${U.pct(p.mu, 1)}</b></div>
          <div><span>Volatilità stimata*</span><b class="mono">${U.pct(p.sd, 1)}</b></div>
          <div><span>Anno negativo plausibile*</span><b class="mono neg">${U.signPct(p.mu - 2 * p.sd, 0)}</b></div>
          <div class="note">*Ipotesi didattiche: azioni 7% ± 16%, obbligazioni 3% ± 6%, liquidità 2%. Non sono previsioni.</div>`;
      }
    }
    render();
    api.setReady(false);
    return {
      el,
      check() {
        const v = Object.fromEntries(cats.map((c) => [c.k, c.v]));
        if (spec.preset === 'budget') {
          const essOk = spec.inc * v.ne / 100 >= spec.ess - 1;
          const saveOk = v.ri >= spec.minSave;
          const ok = essOk && saveOk;
          const exp = !essOk ? `Le spese essenziali (${U.eur(spec.ess)}) non sono coperte: servono almeno ${U.nf(Math.ceil(spec.ess / spec.inc * 100), 0)}% del reddito.`
            : !saveOk ? `Risparmi solo il ${v.ri}%: l’obiettivo era almeno il ${spec.minSave}%. Prova a ridurre i desideri.`
              : `Ottimo: essenziali coperti e ${v.ri}% (${U.eur(spec.inc * v.ri / 100)}) messo da parte ogni mese.`;
          return { ok, exp, answer: ok ? null : `Essenziali ≥ ${U.eur(spec.ess)}, risparmio ≥ ${spec.minSave}%` };
        }
        const [lo, hi] = spec.p.eq, [cl, ch] = spec.p.cash;
        const okEq = v.az >= lo && v.az <= hi, okCash = v.li >= cl && v.li <= ch;
        const ok = okEq && okCash;
        const exp = ok ? `Allocazione coerente con un profilo ${spec.p.label}: azioni tra ${lo}% e ${hi}%.`
          : !okEq ? `Per un profilo ${spec.p.label} la quota azionaria dovrebbe stare tra ${lo}% e ${hi}% (tu: ${v.az}%). Pesano orizzonte, obiettivo e capacità di sopportare perdite.`
            : `La liquidità (${v.li}%) dovrebbe stare tra ${cl}% e ${ch}% per questo obiettivo.`;
        return { ok, exp, answer: ok ? null : `Azioni ${lo}–${hi}%, liquidità ${cl}–${ch}%` };
      },
    };
  };

  /* ---------------- LABORATORIO ---------------- */
  S.labSpec = function (r, d, mode) {
    if (mode === 'infl') {
      const X = r.pick([10000, 20000, 50000]), i = r.pick([2, 3, 4, 5]), n = r.pick([10, 15, 20, 25]);
      const a = X / (1 + i / 100) ** n;
      const no = C.numOpts(r, a, (x) => U.eur(Math.round(x / 100) * 100), [X * (1 - i * n / 100), X, X * 0.5]);
      return { kind: 'lab', mode, q: `Usa il laboratorio: ${U.eur(X)} fermi per ${n} anni con inflazione al ${i}%. Quanto vale il loro potere d’acquisto, circa?`, no, init: { cap: 10000, rate: 2, yrs: 10 } };
    }
    if (mode === 'cost') {
      const X = r.pick([10000, 20000, 30000]), g = r.pick([5, 6, 7]), n = r.pick([20, 25, 30]), t = r.pick([1.5, 2, 2.5]);
      const a = X * ((1 + (g - 0.2) / 100) ** n - (1 + (g - t) / 100) ** n);
      const no = C.numOpts(r, a, (x) => U.eur(Math.round(x / 500) * 500), [X * (t - 0.2) / 100 * n, X * t / 100]);
      return { kind: 'lab', mode, q: `Usa il laboratorio: ${U.eur(X)} per ${n} anni al ${g}% lordo. Quanto perdi circa con costi del ${U.nf(t, 1)}% invece dello 0,2%?`, no, init: { cap: 10000, rate: 6, yrs: 20, fee: 1 } };
    }
    const cap = r.pick([0, 1000, 5000, 10000]), pmt = r.pick([50, 100, 200, 300]), rate = r.pick([3, 4, 5, 6, 7]), yrs = r.pick([10, 15, 20, 25, 30]);
    const m = rate / 1200, N = yrs * 12;
    const a = cap * (1 + m) ** N + pmt * (((1 + m) ** N - 1) / m);
    const no = C.numOpts(r, a, (x) => U.eur(Math.round(x / 500) * 500), [cap + pmt * N, (cap + pmt * N) * (1 + rate / 100 * yrs / 2) * 1.4]);
    return { kind: 'lab', mode: 'compound', q: `Usa il laboratorio: capitale iniziale ${U.eur(cap)}, versamento ${U.eur(pmt)} al mese, rendimento ${rate}% annuo, ${yrs} anni. Quanto avrai circa?`, no, init: { cap: 2000, pmt: 100, rate: 5, yrs: 15 } };
  };

  S.lab = function (spec, api, r) {
    const el = h('div', { class: 'sim sim-lab' });
    const v = Object.assign({}, spec.init);
    const mode = spec.mode;
    const defs = mode === 'infl'
      ? [['cap', 'Somma (€)', 1000, 50000, 1000], ['rate', 'Inflazione annua (%)', 0, 10, 0.5], ['yrs', 'Anni', 1, 40, 1]]
      : mode === 'cost'
        ? [['cap', 'Capitale (€)', 1000, 50000, 1000], ['rate', 'Rendimento lordo (%)', 0, 10, 0.5], ['yrs', 'Anni', 1, 40, 1], ['fee', 'Costi annui fondo (%)', 0, 3, 0.1]]
        : [['cap', 'Capitale iniziale (€)', 0, 50000, 500], ['pmt', 'Versamento mensile (€)', 0, 1000, 25], ['rate', 'Rendimento annuo (%)', 0, 12, 0.5], ['yrs', 'Anni', 1, 40, 1]];
    const chartBox = h('div', { class: 'sim-chart' });
    const out = h('div', { class: 'sim-stats' });
    const sl = h('div', { class: 'sliders' });
    defs.forEach(([k, n, lo, hi, st]) => {
      const o = h('output', { class: 'mono' });
      const id = 'lab-' + k;
      const inp = h('input', { type: 'range', min: lo, max: hi, step: st, value: v[k], id, 'aria-label': n });
      inp.addEventListener('input', () => { v[k] = Number(inp.value); draw(); });
      sl.append(h('label', { class: 'slider', for: id }, h('span', { class: 'sl-name' }, n), inp, o));
      defs.find((d) => d[0] === k).o = o;
    });
    function draw() {
      defs.forEach((d) => (d.o.textContent = d[0] === 'cap' || d[0] === 'pmt' ? U.eur(v[d[0]]) : d[0] === 'yrs' ? v.yrs + ' anni' : U.nf(v[d[0]], 1) + '%'));
      const Y = v.yrs;
      if (mode === 'infl') {
        const real = Array.from({ length: Y + 1 }, (_, t) => v.cap / (1 + v.rate / 100) ** t);
        const nom = real.map(() => v.cap);
        const ch = C.line({ series: [{ v: nom, col: 's2', name: 'Valore nominale', dash: true }, { v: real, col: 's1', name: 'Potere d’acquisto', area: true }], ymin: 0, xl: [[0, 'Oggi'], [Y, Y + ' anni']], yfmt: (t) => U.nf(t / 1000, 0) + 'k', label: 'Effetto dell’inflazione' });
        chartBox.innerHTML = ch.svg + C.legend([['Valore nominale', 's2', true], ['Potere d’acquisto', 's1']]);
        out.innerHTML = `<div><span>Potere d’acquisto finale</span><b class="mono">${U.eur(real[Y])}</b></div><div><span>Perso</span><b class="mono neg">${U.signPct((real[Y] / v.cap - 1) * 100, 0)}</b></div>`;
      } else if (mode === 'cost') {
        const a = Array.from({ length: Y + 1 }, (_, t) => v.cap * (1 + (v.rate - 0.2) / 100) ** t);
        const b = Array.from({ length: Y + 1 }, (_, t) => v.cap * (1 + (v.rate - v.fee) / 100) ** t);
        const ch = C.line({ series: [{ v: a, col: 's1', name: 'Costi 0,2%' }, { v: b, col: 's2', name: 'Costi ' + U.nf(v.fee, 1) + '%' }], ymin: 0, xl: [[0, 'Oggi'], [Y, Y + ' anni']], yfmt: (t) => U.nf(t / 1000, 0) + 'k', label: 'Impatto dei costi' });
        chartBox.innerHTML = ch.svg + C.legend([['Costi 0,2%', 's1'], ['Costi ' + U.nf(v.fee, 1) + '%', 's2']]);
        out.innerHTML = `<div><span>Con costi 0,2%</span><b class="mono">${U.eur(a[Y])}</b></div><div><span>Con costi ${U.nf(v.fee, 1)}%</span><b class="mono">${U.eur(b[Y])}</b></div><div><span>Differenza</span><b class="mono neg">${U.eur(a[Y] - b[Y])}</b></div>`;
      } else {
        const m = v.rate / 1200;
        const tot = [], dep = [];
        for (let t = 0; t <= Y; t++) {
          const N = t * 12;
          tot.push(v.cap * (1 + m) ** N + (m ? v.pmt * (((1 + m) ** N - 1) / m) : v.pmt * N));
          dep.push(v.cap + v.pmt * N);
        }
        const ch = C.line({ series: [{ v: tot, col: 's1', name: 'Valore totale', area: true }, { v: dep, col: 's2', name: 'Versato', dash: true }], ymin: 0, xl: [[0, 'Oggi'], [Y, Y + ' anni']], yfmt: (t) => (t >= 1000 ? U.nf(t / 1000, 0) + 'k' : U.nf(t, 0)), label: 'Crescita del capitale' });
        chartBox.innerHTML = ch.svg + C.legend([['Valore totale', 's1'], ['Versato', 's2', true]]);
        out.innerHTML = `<div><span>Valore finale</span><b class="mono">${U.eur(tot[Y])}</b></div><div><span>Versato</span><b class="mono">${U.eur(dep[Y])}</b></div><div><span>Interessi</span><b class="mono pos">${U.eur(tot[Y] - dep[Y])}</b></div>`;
      }
    }
    // domanda a scelta multipla legata al laboratorio
    const opts = r.shuffle([spec.no.correct, ...spec.no.wrong]);
    let sel = -1;
    const ob = h('div', { class: 'opts opts-grid' });
    opts.forEach((o, i) => {
      const b = h('button', { class: 'opt mono', type: 'button', onclick: () => { sel = i; U.$$('.opt', ob).forEach((x, j) => x.classList.toggle('sel', j === i)); api.setReady(true); FQ.App && FQ.App.sfx('tap'); } }, o);
      ob.append(b);
    });
    el.append(h('div', { class: 'lab-grid' }, sl, h('div', null, chartBox, out)), h('p', { class: 'q-sub' }, spec.q), ob);
    draw();
    return {
      el,
      check() {
        const ok = opts[sel] === spec.no.correct;
        U.$$('.opt', ob).forEach((x, j) => { x.disabled = true; if (opts[j] === spec.no.correct) x.classList.add('right'); else if (j === sel) x.classList.add('wrong'); });
        return { ok, answer: spec.no.correct, exp: 'Il laboratorio calcola il valore con la capitalizzazione composta: prova a cambiare un parametro alla volta per vedere quale pesa di più.' };
      },
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
