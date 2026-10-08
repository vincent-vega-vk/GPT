/* CLOSER · UI: scena di trattativa, cruscotto, feedback, debrief */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S;

  /* ───── Scena ───── */
  UI.sceneEls = (lines, cast) => lines.map((l, i) => {
    const st = { animationDelay: i * 90 + 'ms' };
    if (l.n != null) return h('p', { class: 'narr', style: st }, l.n);
    if (l.mail) return h('div', { class: 'mail', style: st }, h('div', { class: 'hd' }, h('div', null, 'Da: ', h('b', null, l.mail.from)), h('div', null, 'Oggetto: ', h('b', null, l.mail.subj))), h('div', { class: 'tx' }, l.t));
    const c = (cast && cast[l.w]) || { name: l.w, role: '', hue: 210 };
    return h('div', { class: 'line', style: st },
      UI.avatar(c),
      h('div', null,
        h('div', { class: 'who' }, c.name, h('small', null, c.role), l.a ? h('span', { class: 'act' }, `(${l.a})`) : null),
        h('div', { class: 'say' }, l.t)));
  });
  const whereIcon = (w) => (/^(call|videocall|telefon|messaggio|giorno \d+ · \w+$)/i.test(w) ? 'phone' : /^email/i.test(w) ? 'mail' : /(incontro|riunione|reparto|ufficio|sala|stabilimento|sede|mensa|corridoio|review)/i.test(w) ? 'users' : 'building');

  /* ───── Cruscotto ───── */
  const CIRC = 2 * Math.PI * 40;
  function makeDash(deal, run) {
    const hard = run.hard, sc = deal.sc;
    const el = h('aside', { class: 'card dash' + (S.openDash ? ' open' : ''), 'aria-label': 'Cruscotto del deal' });
    const refs = { rows: {}, mp: {} };

    if (!hard) {
      refs.ring = h('div', { class: 'ring', role: 'img', 'aria-label': 'Probabilità di chiusura', html: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle class="bg" cx="48" cy="48" r="40"/><circle class="fg" cx="48" cy="48" r="40" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>` });
      refs.num = h('div', { class: 'num' });
      refs.ring.appendChild(refs.num);
      refs.fg = refs.ring.querySelector('.fg');
      refs.stat = h('div', { class: 'pstat' });
      refs.cap = h('div', { class: 'capnote', hidden: true });
      el.appendChild(h('div', null,
        h('h4', null, 'Probabilità di chiusura'),
        h('div', { class: 'pring' }, refs.ring, refs.stat),
        refs.cap));
      const ms = h('div', { class: 'extra' }, h('h4', null, 'Il deal'));
      CL.METERS.forEach((m) => {
        const i = h('i', { class: m.k === 'risk' ? 'risk' : '' });
        const n = h('span', { class: 'n' });
        const fl = h('span', { class: 'fl' });
        refs.rows[m.k] = { i, n, fl };
        ms.appendChild(h('div', { class: 'mrow', title: m.desc }, h('span', { class: 'l' }, m.label), h('div', { class: 'bar' }, i), n, fl));
      });
      el.appendChild(ms);
    } else {
      el.appendChild(h('div', { class: 'hardmask' }, UI.ic('lock'), h('div', { style: { marginTop: '6px' } }, h('b', null, 'Senza rete.'), ' Il cruscotto è nascosto fino al verdetto. Fidati di quello che senti nella stanza.')));
    }

    const extra = h('div', { class: 'extra xgrid' });
    if (!hard) {
      refs.mpCap = h('div', { class: 'mpcap' }, 'Tocca una voce per leggerne il significato.');
      const grid = h('div', { class: 'mps', role: 'list' });
      CL.MP.forEach((m) => {
        const b = h('button', { class: 'mp', role: 'listitem', title: m.full, onclick: () => { refs.mpCap.textContent = m.full; } }, m.label);
        refs.mp[m.k] = b; grid.appendChild(b);
      });
      extra.appendChild(h('div', null, h('h4', null, 'MEDDPICC · cosa sai davvero'), grid, refs.mpCap));
    }
    const lep = deal.sc.lep != null ? deal.sc.lep : CL.CONFIG.lepDefault;
    refs.dv = h('div', { class: 'v' });
    refs.dz1 = h('div', { class: 'z1' });
    refs.dz2 = h('div', { class: 'z2' });
    refs.dst = h('div', { class: 'dstatus' });
    extra.appendChild(h('div', null,
      h('h4', null, `Sconto · soglia LEP ${lep}%`),
      h('div', { class: 'disc', role: 'img', 'aria-label': 'Sconto promesso rispetto alla soglia LEP' }, refs.dz1, refs.dz2, refs.dv),
      h('div', { class: 'disclbl' }, h('span', null, '0%'), h('span', null, `LEP ${lep}%`), h('span', null, '40%')),
      refs.dst));
    refs.jl = h('div', { class: 'jollies' });
    extra.appendChild(h('div', null, h('h4', null, 'Jolly'), refs.jl));
    const castKeys = Object.keys(sc.cast).slice(0, 6);
    extra.appendChild(h('div', null, h('h4', null, 'Chi c’è nella stanza'),
      h('div', { class: 'cast' }, castKeys.map((k) => h('div', { class: 'm' }, UI.avatar(sc.cast[k], true), h('div', null, sc.cast[k].name, h('small', null, sc.cast[k].role)))))));
    el.appendChild(extra);
    el.appendChild(h('button', { class: 'btn btn--sm dash-toggle', 'aria-expanded': String(!!S.openDash), onclick: (e) => { S.openDash = !S.openDash; el.classList.toggle('open', S.openDash); e.currentTarget.setAttribute('aria-expanded', String(S.openDash)); e.currentTarget.textContent = S.openDash ? 'Nascondi dettagli' : 'Mostra il cruscotto completo'; } }, S.openDash ? 'Nascondi dettagli' : 'Mostra il cruscotto completo'));

    const flashT = {};
    function update(prevM, prevMp) {
      const pr = CL.prob(deal), ap = pr.ap;
      if (!hard) {
        const p = pr.p;
        refs.fg.style.strokeDashoffset = String(CIRC * (1 - p));
        refs.fg.classList.toggle('hi', p >= 0.7);
        refs.fg.classList.toggle('lo', p < 0.3);
        refs.num.replaceChildren(h('span', null, String(Math.round(p * 100)), h('small', null, '%')));
        refs.fg.style.opacity = p < 0.01 ? '0' : '1';
        refs.ring.setAttribute('aria-label', `Probabilità di chiusura ${Math.round(p * 100)}%`);
        const net = deal.list * (1 - ap.eff / 100);
        refs.stat.replaceChildren(h('div', null, 'Se vinci: ', h('b', null, CL.fmtK(net))), h('div', null, 'Valore atteso: ', h('b', null, CL.fmtK(p * net))));
        if (pr.cap) { refs.cap.hidden = false; refs.cap.textContent = `Limite ${Math.round(pr.cap.max * 100)}%: ${pr.cap.why}`; } else refs.cap.hidden = true;
        CL.METERS.forEach((m) => {
          const v = deal.m[m.k], r = refs.rows[m.k];
          r.i.style.width = v + '%'; r.n.textContent = Math.round(v);
          if (prevM && prevM[m.k] !== v) {
            const d = Math.round(v - prevM[m.k]);
            if (d) {
              r.fl.textContent = UI.signed(d);
              const goodDir = m.k === 'risk' ? d < 0 : d > 0;
              r.fl.className = 'fl show ' + (goodDir ? 'up' : 'down');
              clearTimeout(flashT[m.k]);
              flashT[m.k] = setTimeout(() => r.fl.classList.remove('show'), 2200);
            }
          }
        });
        CL.MP.forEach((m) => {
          const on = deal.mp.has(m.k), b = refs.mp[m.k];
          const wasOn = prevMp ? prevMp.has(m.k) : on;
          b.classList.toggle('on', on);
          if (on && !wasOn) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
        });
      }
      /* sconto */
      const scale = 40, lepP = (ap.lep / scale) * 100;
      refs.dz1.style.width = lepP + '%';
      refs.dz2.style.left = lepP + '%'; refs.dz2.style.width = Math.max(0, ((ap.allowed - ap.lep) / scale) * 100) + '%';
      refs.dv.style.width = Math.min(100, (deal.disc / scale) * 100) + '%';
      refs.dv.className = 'v' + (ap.status === 'blocked' ? ' bad' : ap.status === 'approved' ? ' warn' : '');
      refs.dst.className = 'dstatus ' + ap.status;
      refs.dst.textContent = deal.disc === 0 ? 'Nessuno sconto promesso.'
        : ap.status === 'ok' ? `${Math.round(deal.disc)}% promesso, entro la soglia LEP.`
          : ap.status === 'approved' ? `${Math.round(deal.disc)}% promesso: oltre LEP ma coperto da contropartite o Deal Desk (max ${ap.allowed}%).`
            : `${Math.round(deal.disc)}% promesso: il Deal Desk approva al massimo ${ap.allowed}%. Il cliente se ne accorgerà.`;
      refs.jl.replaceChildren(...Object.keys(CL.JOLLY).map((k) => h('span', { class: 'jl' + (!run.free && !run.jolly[k] ? ' zero' : ''), title: CL.JOLLY[k].desc }, UI.ic(k), CL.JOLLY[k].short, h('b', null, run.free ? '∞' : '×' + run.jolly[k]))));
    }
    update(null, null);
    return { el, update };
  }

  /* ───── Timer di pressione ───── */
  let tm = null;
  UI.stopTimer = () => { if (tm) { cancelAnimationFrame(tm.raf); document.removeEventListener('visibilitychange', tm.vis); tm = null; } };
  function startTimer(bar, secs, onEnd) {
    UI.stopTimer();
    const total = secs * 1000;
    tm = { end: performance.now() + total, raf: 0, hiddenAt: 0 };
    tm.vis = () => { if (document.hidden) tm.hiddenAt = performance.now(); else if (tm.hiddenAt) { tm.end += performance.now() - tm.hiddenAt; tm.hiddenAt = 0; } };
    document.addEventListener('visibilitychange', tm.vis);
    const tick = (t) => {
      if (!tm) return;
      const left = tm.end - t, f = Math.max(0, left / total);
      bar.firstChild.style.transform = `scaleX(${f})`;
      bar.classList.toggle('low', f < 0.25);
      if (left <= 0) { UI.stopTimer(); onEnd(); return; }
      tm.raf = requestAnimationFrame(tick);
    };
    tm.raf = requestAnimationFrame(tick);
  }

  /* ───── Gioco ───── */
  UI.screens.play = () => {
    const run = S.run, deal = S.deal, sc = S.sc;
    const stage = h('section', { class: 'card stage', 'aria-live': 'polite', 'aria-label': 'Scena' });
    const dash = makeDash(deal, run);
    S.dash = dash; S.stage = stage;
    const dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
    const head = h('div', { class: 'dealhead' },
      h('button', { class: 'iconbtn', 'aria-label': 'Esci dalla trattativa', onclick: () => UI.leaveDeal() }, UI.ic('back')),
      h('div', null, h('div', { class: 'eyebrow' }, `${sc.client} · ${sc.sector}`), h('h2', { 'data-focus': '', style: { marginTop: '6px' } }, sc.title)),
      dots);
    S.dots = dots;
    const root = h('main', { class: 'wrap' }, head, h('div', { class: 'play' }, stage, dash.el));
    showNode();
    return root;
  };

  UI.leaveDeal = () => {
    const run = S.run, career = run.mode === 'career';
    if (!career) { UI.stopTimer(); return UI.go('pipeline'); }
    UI.modal((close) => h('div', null,
      h('header', null, h('div', { class: 'grow' }, h('h3', { class: 'display', style: { fontSize: '28px' } }, 'Abbandonare la trattativa?'))),
      h('div', { class: 'body' }, h('p', { class: 'muted' }, `Nel trimestre un deal abbandonato conta come perso e le ${S.sc.cost} settimane restano spese. Se il deal non è qualificabile, la mossa giusta è squalificarlo con una scelta: costa meno.`)),
      h('footer', null,
        h('button', { class: 'btn btn--primary', onclick: () => { close(); UI.stopTimer(); const res = CL.forfeit(S.deal); CL.commitDeal(run, S.sc, res); S.res = res; S.fx = true; UI.go('debrief'); } }, 'Abbandona (deal perso)'),
        h('button', { class: 'btn', 'data-autofocus': '', onclick: close }, 'Continua la trattativa'))));
  };

  function paintDots() {
    const total = 6, cur = S.deal.hist.length;
    S.dots.replaceChildren(...Array.from({ length: total }, (_, i) => h('i', { class: i < cur ? 'on' : i === cur ? 'cur' : '' })));
  }

  function showNode(twist) {
    const run = S.run, deal = S.deal, sc = S.sc, stage = S.stage;
    const node = CL.nodeOf(deal);
    S.phase = 'choose'; S.picked = null;
    paintDots();
    const lines = CL.sceneLines(deal, node);
    S.order = CL.shuffle(CL.choicesFor(deal, run), run.rnd);
    const hintBox = h('div', { class: 'hint', hidden: true }, node.hint);
    const timerBar = UI.settings.timer ? h('div', { class: 'timer', role: 'timer', 'aria-label': 'Tempo per decidere' }, h('i')) : null;
    S.choiceEls = S.order.map((o, i) => {
      const c = o.c;
      const tags = [];
      if (c.jolly) tags.push(h('span', { class: 'chip chip--accent' }, UI.ic(c.jolly), `Jolly · ${CL.JOLLY[c.jolly].name}` + (run.free ? '' : ` · ${run.jolly[c.jolly]} rimasti`)));
      if (o.locked) tags.push(h('span', { class: 'chip chip--bad' }, 'Esaurito'));
      if (c.next === 'DQ') tags.push(h('span', { class: 'chip chip--warn' }, UI.ic('flag'), 'Esci dalla trattativa'));
      return h('button', { class: 'choice' + (o.locked ? ' locked' : ''), disabled: o.locked || null, 'data-i': i, onclick: () => choose(i) },
        h('span', { class: 'k', 'aria-hidden': 'true' }, i + 1),
        h('span', { class: 'tx' }, c.t, tags.length ? h('div', { class: 'tags' }, tags) : null));
    });
    const box = h('div', { class: 'choices', role: 'group', 'aria-label': 'Le tue mosse' }, S.choiceEls);
    const hintBtn = !run.hard ? h('button', { class: 'hintbtn', onclick: (e) => { hintBox.hidden = !hintBox.hidden; if (!hintBox.hidden) S.hints = (S.hints || 0) + 1; e.currentTarget.textContent = hintBox.hidden ? 'Serve un suggerimento?' : 'Nascondi suggerimento'; } }, 'Serve un suggerimento?') : null;
    UI.fill(stage,
      twist ? h('div', { class: 'twist', role: 'status' }, UI.ic('flag'), 'Colpo di scena', twist.map((t) => h('span', { class: 'delta' }, t))) : null,
      h('div', { class: 'where' }, UI.ic(whereIcon(node.where)), node.where),
      UI.sceneEls(lines, sc.cast),
      h('div', { class: 'prompt' }, h('h3', null, node.prompt), hintBtn),
      hintBox,
      timerBar,
      box,
      h('div', { id: 'fbslot' }));
    if (timerBar) startTimer(timerBar, node.t || 30, onTimeout);
    stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function onTimeout() {
    if (S.phase !== 'choose') return;
    const cands = S.order.map((o, i) => ({ o, i })).filter((x) => !x.o.locked && !x.o.c.jolly && x.o.c.next !== 'DQ');
    cands.sort((a, b) => a.o.c.q - b.o.c.q);
    S.run.timeouts++;
    choose(cands[0].i, true);
  }

  UI.playKey = (i) => { if (S.phase === 'choose' && S.order && S.order[i] && !S.order[i].locked) choose(i); };
  UI.playNext = () => { if (S.phase === 'feedback') advance(); };

  function choose(i, timedOut) {
    if (S.phase !== 'choose') return;
    UI.stopTimer();
    const run = S.run, deal = S.deal, o = S.order[i];
    S.phase = 'feedback'; S.picked = i;
    const prevM = Object.assign({}, deal.m), prevMp = new Set(deal.mp);
    const node = CL.nodeOf(deal);
    const rec = CL.pick(deal, o.c.id, run);
    rec.timedOut = !!timedOut;
    S.choiceEls.forEach((el, k) => { el.disabled = true; el.classList.toggle('picked', k === i); el.classList.toggle('dim', k !== i); });
    S.dash.update(prevM, prevMp);
    UI.sfx(run.hard ? 'pick' : 'q' + rec.q);
    const fb = feedbackEl(rec, node, !!timedOut);
    const slot = UI.$('#fbslot');
    slot.replaceChildren(fb);
    const btn = UI.$('[data-next]', slot);
    if (btn) btn.focus({ preventScroll: true });
    fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    paintDots();
  }

  function feedbackEl(rec, node, timedOut) {
    const run = S.run, deal = S.deal, hard = run.hard;
    const Q = CL.QUALITY[rec.q];
    const chips = [];
    if (!hard) {
      chips.push(h('span', { class: 'q ' + Q.cls }, Q.label));
      CL.METERS.forEach((m) => { const d = rec.delta[m.k]; if (d) chips.push(h('span', { class: 'delta ' + ((m.k === 'risk' ? d < 0 : d > 0) ? 'up' : 'down') }, `${m.label} ${UI.signed(d)}`)); });
      if (rec.delta.disc) chips.push(h('span', { class: 'delta ' + (rec.delta.disc > 0 ? 'down' : 'up') }, `Sconto ${UI.signed(rec.delta.disc)}%`));
      if (rec.delta.list) chips.push(h('span', { class: 'delta ' + (rec.delta.list > 0 ? 'up' : 'down') }, `Listino ${UI.signed(rec.delta.list)}k`));
      rec.gained.forEach((k) => chips.push(h('span', { class: 'chip chip--good' }, UI.ic('check'), CL.MP.find((m) => m.k === k).label)));
      rec.lost.forEach((k) => chips.push(h('span', { class: 'chip chip--bad' }, UI.ic('x'), CL.MP.find((m) => m.k === k).label)));
      if (rec.integ) chips.push(h('span', { class: 'chip ' + (rec.integ > 0 ? 'chip--good' : 'chip--bad') }, UI.ic('shield'), `Reputazione ${UI.signed(rec.integ)}`));
    }
    if (rec.jolly) chips.push(h('span', { class: 'chip chip--accent' }, UI.ic(rec.jolly), CL.JOLLY[rec.jolly].name + ' usato'));
    const last = !!deal.over;
    return h('div', { class: 'fb', role: 'status' },
      h('div', { class: 'hd' }, chips.length ? chips : h('span', { class: 'small faint' }, 'Esito della mossa')),
      h('div', { class: 'bd' }, timedOut ? h('p', { class: 'small', style: { color: 'var(--bad)', marginBottom: '8px' } }, 'Tempo scaduto: hai risposto d’istinto.') : null, h('p', null, rec.r)),
      hard
        ? h('div', { class: 'lesson' }, h('span', { class: 'eyebrow' }, 'Senza rete'), 'Valutazione e lezione nel debrief.')
        : h('div', { class: 'lesson' }, h('span', { class: 'eyebrow' }, 'Lezione dal campo'), node.tip),
      h('div', { class: 'next', style: { padding: '0 16px 16px' } },
        h('button', { class: 'btn btn--primary', 'data-next': '', onclick: advance }, last ? 'Vai al verdetto' : 'Continua', UI.ic('next'))));
  }

  function advance() {
    if (S.phase !== 'feedback') return;
    const deal = S.deal, run = S.run, sc = S.sc;
    if (deal.over) {
      const res = CL.finish(deal, run, run.rnd);
      CL.commitDeal(run, sc, res);
      S.res = res;
      S.fx = false;
      return UI.go('debrief');
    }
    const last = deal.hist[deal.hist.length - 1];
    let twist = null;
    if (last.entered && last.entered.delta) {
      const e = last.entered.delta, bits = [];
      CL.METERS.forEach((m) => { if (e[m.k]) bits.push(`${m.label} ${UI.signed(e[m.k])}`); });
      if (bits.length && !run.hard) twist = bits;
    }
    showNode(twist);
  }

  /* ───── Debrief ───── */
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  UI.screens.debrief = () => {
    const res = S.res, deal = S.deal, sc = S.sc, run = S.run, career = run.mode === 'career';
    const st = res.status;
    const stampTxt = { won: 'Firmato', lost: 'Perso', slip: 'Slitta', disq: 'Squalificato' }[st];
    const ending = (sc.endings && (sc.endings[st] || sc.endings.lost)) || '';
    const net = res.listFinal ? Math.round(res.listFinal * (1 - (res.disc || 0) / 100)) : 0;
    const comm = res.acv * CL.CONFIG.rate1;
    const goodL = (sc.lessons || []).filter((l) => l.if(deal) && l.good), badL = (sc.lessons || []).filter((l) => l.if(deal) && !l.good);
    const dispMeters = deal.m;
    const energyLine = !career ? null
      : st === 'disq' ? `Hai speso 1 settimana e ne hai recuperate ${res.refund}.`
        : res.momentum ? `Costo: ${sc.cost} settimane, ma il deal da manuale ti restituisce 1 settimana di slancio.` : `Costo: ${sc.cost} settimane.`;

    if (!S.fx) {
      S.fx = true;
      setTimeout(() => {
        UI.sfx('stamp');
        setTimeout(() => UI.sfx(st === 'won' ? 'win' : st === 'disq' ? 'pick' : 'lose'), 260);
        if (st === 'won') UI.confetti();
      }, 350);
    }

    const tl = deal.hist.map((rec, i) => {
      const Q = CL.QUALITY[rec.q];
      const body = h('div', { class: 'dt', hidden: true }, h('p', null, h('b', null, 'Cosa hai fatto: '), rec.t), h('p', { style: { marginTop: '6px' } }, h('b', null, 'Cosa è successo: '), rec.r), h('p', { class: 'muted', style: { marginTop: '6px' } }, h('b', null, 'Lezione: '), rec.tip));
      return h('li', null,
        h('button', { 'aria-expanded': 'false', onclick: (e) => { body.hidden = !body.hidden; e.currentTarget.setAttribute('aria-expanded', String(!body.hidden)); } },
          h('span', { class: 'n' }, String(i + 1).padStart(2, '0')),
          h('span', { class: 'tt' }, trunc(rec.t, 120)),
          h('span', { class: 'q ' + Q.cls }, Q.label)),
        body);
    });

    return h('main', { class: 'wrap' },
      h('div', { class: 'sec-head' }, h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, `Debrief · ${sc.client}`), h('h1', { class: 'sec-title', 'data-focus': '', style: { marginTop: '8px' } }, sc.title))),
      h('section', { class: 'card verdict' },
        h('div', { style: { padding: '8px 12px' } }, h('span', { class: 'stamp anim stamp--' + st }, stampTxt)),
        h('div', null,
          h('p', { style: { fontSize: '17px', maxWidth: '62ch' } }, ending),
          st !== 'disq' ? h('p', { class: 'small muted', style: { marginTop: '10px' } }, res.pe >= 1 ? `Probabilità finale ${Math.round(res.p * 100)}%: sopra il 90% la firma è praticamente certa.` : `Probabilità finale ${Math.round(res.p * 100)}%. Estrazione: ${Math.round(res.roll * 100)} su 100${st === 'won' ? ', sotto la soglia: hai vinto.' : ', sopra la soglia: ' + (st === 'slip' ? 'il deal slitta.' : 'il deal è perso.')}`) : null,
          energyLine ? h('p', { class: 'small muted', style: { marginTop: '4px' } }, energyLine) : null)),
      st !== 'disq' ? h('dl', { class: 'stats' },
        h('div', { class: 'stat' }, h('dt', null, 'ACV netto'), h('dd', null, st === 'won' ? CL.fmtK(res.acv) : '—', st !== 'won' ? h('small', null, `se vinto: ${CL.fmtK(net)}`) : null)),
        h('div', { class: 'stat' }, h('dt', null, 'Sconto applicato'), h('dd', null, (res.disc || 0).toFixed(0) + '%', h('small', null, `LEP ${res.lep}%`))),
        h('div', { class: 'stat' }, h('dt', null, 'Commissione base'), h('dd', null, st === 'won' ? '€' + Math.round(comm * 1000).toLocaleString('it-IT') : '—')),
        h('div', { class: 'stat' }, h('dt', null, 'Qualità decisioni'), h('dd', null, Math.round((res.avgQ / 3) * 100) + '%')),
        h('div', { class: 'stat' }, h('dt', null, 'MEDDPICC'), h('dd', null, `${res.mp}/8`)),
        h('div', { class: 'stat' }, h('dt', null, 'Reputazione'), h('dd', null, UI.signed(res.integ), h('small', null, `ora ${run.rep}`)))) : null,
      res.blocked ? h('div', { class: 'note mt-16' }, h('b', null, 'Deal Desk. '), `Avevi promesso il ${Math.round(res.promised)}% senza contropartite sufficienti: ne è stato approvato il ${res.disc}%. Il cliente ha notato la retromarcia e la probabilità ne ha risentito.`) : null,
      res.cap ? h('div', { class: 'note mt-16' }, h('b', null, `Limite ${Math.round(res.cap.max * 100)}%. `), res.cap.why) : null,
      h('div', { class: 'two' },
        h('section', { class: 'card pad' },
          h('div', { class: 'eyebrow' }, 'Le tue mosse'),
          h('ul', { class: 'tl' }, tl)),
        h('section', { class: 'card pad' },
          h('div', { class: 'eyebrow' }, 'Il quadro finale'),
          h('div', { style: { marginTop: '10px' } }, CL.METERS.map((m) => h('div', { class: 'mrow', style: { gridTemplateColumns: '78px minmax(0,1fr) 30px' } }, h('span', { class: 'l' }, m.label), h('div', { class: 'bar' }, h('i', { class: m.k === 'risk' ? 'risk' : '', style: { width: dispMeters[m.k] + '%' } })), h('span', { class: 'n' }, Math.round(dispMeters[m.k]))))),
          h('div', { class: 'mps mt-16' }, CL.MP.map((m) => h('div', { class: 'mp' + (deal.mp.has(m.k) ? ' on' : ''), title: m.full }, m.label))),
          h('div', { class: 'ls' },
            goodL.map((l) => h('p', { class: 'good' }, l.t)),
            badL.map((l) => h('p', { class: 'bad' }, l.t)),
            !goodL.length && !badL.length ? h('p', { class: 'muted' }, 'Nessun elemento determinante: una trattativa neutra.') : null))),
      h('div', { class: 'row gap-12 wrapx mt-24' },
        career ? h('button', { class: 'btn btn--primary btn--lg', 'data-autofocus': '', onclick: UI.nextAfterDeal }, 'Prosegui', UI.ic('next'))
          : [h('button', { class: 'btn btn--primary btn--lg', onclick: () => UI.startDeal(sc) }, UI.ic('refresh'), 'Rigioca lo scenario'), h('button', { class: 'btn', onclick: () => UI.go('pipeline') }, 'Altro scenario')]),
      h('p', { class: 'footer' }, S.hints ? `Suggerimenti usati: ${S.hints}. ` : '', run.timeouts ? `Decisioni scadute: ${run.timeouts}.` : ''));
  };
})(typeof window !== 'undefined' ? window : globalThis);
