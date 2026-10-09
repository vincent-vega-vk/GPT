/* CLOSER · UI v2: scena in prima persona (viewport, trascrizione, la tua voce, reazioni, imprevisti, widget firma, debrief) */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S;
  S.rv = 0; S.nodeTok = 0;
  const f = (s) => CL.fmt(s, S.sc);

  /* ───── righe di scena ───── */
  UI.lineEl = (l, ctx) => {
    ctx = ctx || {};
    const sc = ctx.sc !== undefined ? ctx.sc : S.sc;
    const fm = (s) => CL.fmt(s, sc);
    const castOf = (k) => (ctx.cast && ctx.cast[k]) || CL.castOf(sc, k);
    const cls = 'l-rise';
    if (l.you) return h('div', { class: 'you ' + cls }, h('div', { class: 'bub' }, h('span', { class: 'who' }, 'Tu', CL.playerName ? h('small', null, ' · ' + CL.playerName) : null), h('div', { class: 'say' }, fm(l.t))));
    if (l.think != null) return h('p', { class: 'think ' + cls }, h('span', { class: 'lbl' }, 'Pensi'), fm(l.think));
    if (l.n != null) return h('p', { class: 'narr ' + cls }, fm(l.n));
    if (l.mail) return h('div', { class: 'mail ' + cls }, h('div', { class: 'hd' }, h('div', null, 'Da: ', h('b', null, fm(l.mail.from))), h('div', null, 'Oggetto: ', h('b', null, fm(l.mail.subj)))), h('div', { class: 'tx' }, fm(l.t)));
    if (l.chat) {
      const c = castOf(l.chat.from);
      return h('div', { class: 'chat ' + cls }, UI.avatar(c, true), h('div', { class: 'bub' }, h('div', { class: 'who' }, c.name, h('small', null, l.chat.app || 'Chat')), h('div', { class: 'say' }, fm(l.t))));
    }
    const c = castOf(l.w);
    return h('div', { class: 'line ' + cls },
      UI.avatar(c),
      h('div', null,
        h('div', { class: 'who' }, c.name, h('small', null, c.role), l.a ? h('span', { class: 'act' }, `(${fm(l.a)})`) : null),
        h('div', { class: 'say' }, fm(l.t))));
  };
  UI.sceneEls = (lines, cast, sc) => lines.map((l, i) => { const el = UI.lineEl(l, { cast, sc }); el.style.animationDelay = i * 90 + 'ms'; return el; });

  /* scorrimento consapevole del viewport "appiccicoso": barra in alto + viewport restano visibili */
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const stickyTop = () => {
    const bar = document.querySelector('.topbar');
    let off = bar ? bar.getBoundingClientRect().height : 0;
    const vp = document.querySelector('.vp-host:not([hidden])');
    if (vp && getComputedStyle(vp).position === 'sticky') off += vp.getBoundingClientRect().height + 10;
    return off;
  };
  const scrollBy = (dy) => { if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: reduced() || UI.settings.fast ? 'auto' : 'smooth' }); };
  /* mode: 'start' = l'elemento sotto la zona fissa; 'nearest' = il minimo scorrimento perché sia tutto visibile */
  UI.scrollTo = (el, mode) => {
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect(), top = stickyTop() + 8, bottom = window.innerHeight - 14;
    if (mode === 'start') return scrollBy(r.top - top);
    if (r.top < top) return scrollBy(r.top - top);
    if (r.bottom > bottom) return scrollBy(Math.min(r.bottom - bottom, r.top - top));
  };
  /* mostra un blocco (dalla domanda alle risposte): se ci sta tutto, parte dall'inizio; altrimenti garantisce la parte finale (le risposte) */
  UI.scrollBlock = (first, last) => {
    if (!first || !last || !first.isConnected || !last.isConnected) return;
    const a = first.getBoundingClientRect(), b = last.getBoundingClientRect(), top = stickyTop() + 8, bottom = window.innerHeight - 14;
    if (a.top >= top && b.bottom <= bottom) return;
    if (b.bottom - a.top <= bottom - top) return scrollBy(a.top - top);
    scrollBy(b.bottom - bottom);
  };

  const speakerOf = (l) => (l.you ? 'you' : l.w ? l.w : l.chat ? l.chat.from : null);
  const readMs = (l) => Math.min(1500, 320 + String(l.t || l.n || l.think || '').length * 11);

  /* riproduce le righe una alla volta; click/Invio/Spazio le completa. Restituisce una promise (false se annullata). */
  UI.reveal = (host, lines, ctx) => new Promise((resolve) => {
    ctx = ctx || {};
    const tok = ++S.rv;
    let i = 0, fast = !!UI.settings.fast || !!ctx.fast, timer = 0, done = false;
    const finish = (ok) => { if (done) return; done = true; S.skip = null; clearTimeout(timer); if (ctx.vp) ctx.vp.speak(null); resolve(ok); };
    const step = () => {
      clearTimeout(timer);
      if (tok !== S.rv) return finish(false);
      if (i >= lines.length) return finish(true);
      const l = lines[i++];
      const el = UI.lineEl(l, ctx);
      host.appendChild(el);
      if (!ctx.still) UI.scrollTo(el, 'nearest');
      if (l.sfx) UI.sfx(l.sfx);
      if (ctx.vp) ctx.vp.speak(speakerOf(l));
      if (ctx.onLine) ctx.onLine(l);
      if (fast) step(); else timer = setTimeout(step, readMs(l));
    };
    S.skip = () => { if (done) return; fast = true; step(); };
    step();
  });
  UI.skipReveal = () => { if (S.skip) S.skip(); };

  /* il luogo senza l'ora, se l'ora è già mostrata a parte (evita "Lunedì · 09:10 / Call · lunedì 09:10") */
  const placeOnly = (where, when) => {
    const w = String(where || '');
    if (!when) return w;
    return w.replace(/\s*[·,–-]\s*(?:(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|giorno\s+\d+(?:\s+di\s+\d+)?|\d{1,2}[:.]\d{2})(?=[\s·]|$)[^·]*)$/i, '').trim() || w;
  };

  const PHYS = { meeting: 1, walk: 1 };   /* viste in cui le persone sono fisicamente presenti */
  const deduceView = (where) => {
    const w = String(where || '').toLowerCase();
    if (/video|call|teams|zoom|meet/.test(w)) return 'call';
    if (/e-?mail|pec|posta/.test(w)) return 'mail';
    if (/telefon|messaggio|chat|whatsapp|sms/.test(w)) return 'phone';
    if (/auto|viaggio|strada|treno/.test(w)) return 'car';
    if (/reparto|stabilimento|negozio|magazzino|piazzale|giro|cammin|corridoio|mensa/.test(w)) return 'walk';
    if (/incontro|riunione|sala|ufficio|sede|review|consultazione|pipeline/.test(w)) return 'meeting';
    return 'desk';
  };

  /* ───── cruscotto ───── */
  const CIRC = 2 * Math.PI * 40;
  const hudData = (spec, deal) => { try { return spec.build(deal); } catch (e) { return null; } };
  function makeDash(deal, run) {
    const hard = run.hard, sc = deal.sc;
    const el = h('aside', { class: 'card dash' + (S.openDash ? ' open' : ''), 'aria-label': 'Cruscotto del deal' });
    const refs = { rows: {}, mp: {}, hud: [] };

    if (!hard) {
      refs.ring = h('div', { class: 'ring', role: 'img', 'aria-label': 'Probabilità di chiusura', html: `<svg viewBox="0 0 96 96" aria-hidden="true"><circle class="bg" cx="48" cy="48" r="40"/><circle class="fg" cx="48" cy="48" r="40" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>` });
      refs.num = h('div', { class: 'num' });
      refs.ring.appendChild(refs.num);
      refs.fg = refs.ring.querySelector('.fg');
      refs.stat = h('div', { class: 'pstat' });
      refs.cap = h('div', { class: 'capnote', hidden: true });
      el.appendChild(h('div', null, h('h4', null, 'Probabilità di chiusura'), h('div', { class: 'pring' }, refs.ring, refs.stat), refs.cap));
    } else {
      el.appendChild(h('div', { class: 'hardmask' }, UI.ic('lock'), h('div', { style: { marginTop: '6px' } }, h('b', null, 'Senza rete.'), ' Probabilità e indicatori sono nascosti fino al verdetto.')));
    }

    /* widget firma dello scenario */
    const specs = (sc.hud || []).filter((x) => !hard || x.type === 'clock').slice(0, 3);   /* senza rete: restano solo i widget puramente descrittivi (il tempo) */
    specs.forEach((spec, i) => {
      const host = h('div', { class: 'hudw extra' });
      refs.hud.push({ spec, host, data: null });
      el.appendChild(host);
    });

    if (!hard) {
      const ms = h('div', { class: 'extra' }, h('h4', null, 'Il deal'));
      CL.METERS.forEach((m) => {
        const i = h('i', { class: m.k === 'risk' ? 'risk' : '' });
        const n = h('span', { class: 'n' });
        const fl = h('span', { class: 'fl' });
        refs.rows[m.k] = { i, n, fl };
        ms.appendChild(h('div', { class: 'mrow', title: m.desc }, h('span', { class: 'l' }, m.label), h('div', { class: 'bar' }, i), n, fl));
      });
      el.appendChild(ms);
    }

    const extra = h('div', { class: 'extra xgrid' });
    if (!hard) {
      refs.mpCap = h('div', { class: 'mpcap' }, 'Tocca una voce per leggerne il significato.');
      const grid = h('div', { class: 'mps', role: 'group', 'aria-label': 'Checklist MEDDPICC' });
      CL.MP.forEach((m) => {
        const b = h('button', { class: 'mp', title: m.full, 'aria-label': `${m.label}: non acquisito`, onclick: () => { refs.mpCap.textContent = m.full; } }, m.label);
        refs.mp[m.k] = b; grid.appendChild(b);
      });
      extra.appendChild(h('div', null, h('h4', null, 'MEDDPICC · cosa sai davvero'), grid, refs.mpCap));
    }
    const lep = sc.lep != null ? sc.lep : CL.CONFIG.lepDefault;
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
    if (!specs.some((s) => s.type === 'stakeholders')) {
      const castKeys = Object.keys(sc.cast).slice(0, 6);
      extra.appendChild(h('div', null, h('h4', null, 'Chi c’è nella stanza'), h('div', { class: 'cast' }, castKeys.map((k) => h('div', { class: 'm' }, UI.avatar(sc.cast[k], true), h('div', null, sc.cast[k].name, h('small', null, sc.cast[k].role)))))));
    }
    el.appendChild(extra);
    const label = () => (S.openDash ? 'Nascondi dettagli' : 'Mostra il cruscotto completo');
    el.appendChild(h('button', { class: 'btn btn--sm dash-toggle', 'aria-expanded': String(!!S.openDash), onclick: (e) => { S.openDash = !S.openDash; el.classList.toggle('open', S.openDash); e.currentTarget.setAttribute('aria-expanded', String(S.openDash)); e.currentTarget.textContent = label(); } }, label()));

    const flashT = {};
    function paintHud() {
      refs.hud.forEach((hh) => {
        if (!UI.widget) return;
        const data = hudData(hh.spec, deal);
        const node = UI.widget(hh.spec.type, hh.spec.title, data, hh.data);
        hh.data = data;
        hh.host.replaceChildren(node);
      });
    }
    function update(prevM, prevMp) {
      const pr = CL.prob(deal), ap = pr.ap;
      if (!hard) {
        const p = pr.p;
        refs.fg.style.strokeDashoffset = String(CIRC * (1 - p));
        refs.fg.style.opacity = p < 0.01 ? '0' : '1';
        refs.fg.classList.toggle('hi', p >= 0.7);
        refs.fg.classList.toggle('lo', p < 0.3);
        refs.num.replaceChildren(h('span', null, String(Math.round(p * 100)), h('small', null, '%')));
        refs.ring.setAttribute('aria-label', `Probabilità di chiusura ${Math.round(p * 100)}%`);
        const net = deal.list * (1 - ap.eff / 100);
        refs.stat.replaceChildren(h('div', null, 'Se vinci: ', h('b', null, CL.fmtK(net))), h('div', null, 'Valore atteso: ', h('b', null, CL.fmtK(p * net))));
        if (pr.cap) { refs.cap.hidden = false; refs.cap.textContent = `Limite ${Math.round(pr.cap.max * 100)}%: ${f(pr.cap.why)}`; } else refs.cap.hidden = true;
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
          b.setAttribute('aria-label', `${m.label}: ${on ? 'acquisito' : 'non acquisito'}`);
          if (on && !wasOn) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
        });
      }
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
      paintHud();
    }
    update(null, null);
    return { el, update, stances: () => {
      const spec = specs.find((s) => s.type === 'stakeholders');
      const data = spec && hudData(spec, deal);
      const m = {};
      (Array.isArray(data) ? data : []).forEach((x) => { if (x && x.who) m[x.who] = x.stance; });
      return m;
    } };
  }

  /* ───── timer di pressione ───── */
  let tm = null;
  UI.stopTimer = () => { if (tm) { cancelAnimationFrame(tm.raf); document.removeEventListener('visibilitychange', tm.vis); tm = null; } };
  function startTimer(bar, secs, onEnd) {
    UI.stopTimer();
    const total = secs * 1000;
    tm = { end: performance.now() + total, raf: 0, hiddenAt: 0, last: performance.now() };
    tm.vis = () => { if (document.hidden) tm.hiddenAt = performance.now(); else if (tm.hiddenAt) { tm.end += performance.now() - tm.hiddenAt; tm.hiddenAt = 0; } };
    document.addEventListener('visibilitychange', tm.vis);
    const tick = (t) => {
      if (!tm) return;
      /* le finestre aperte (regole, conferma di uscita) fermano il tempo */
      if (UI.modalOpen()) { tm.end += t - tm.last; tm.last = t; tm.raf = requestAnimationFrame(tick); return; }
      tm.last = t;
      const left = tm.end - t, fr = Math.max(0, left / total);
      bar.firstChild.style.transform = `scaleX(${fr})`;
      bar.classList.toggle('low', fr < 0.25);
      if (left <= 0) { UI.stopTimer(); onEnd(); return; }
      tm.raf = requestAnimationFrame(tick);
    };
    tm.raf = requestAnimationFrame(tick);
  }

  /* ───── tema dello scenario ───── */
  function applyTheme(root, sc) {
    const th = sc.theme || {};
    if (th.accent) root.style.setProperty('--sc-accent', th.accent);
    if (th.accentDark) root.style.setProperty('--sc-accent-dark', th.accentDark);
    if (th.id) root.setAttribute('data-scth', th.id);
  }

  /* ───── scena ───── */
  UI.screens.play = () => {
    const run = S.run, deal = S.deal, sc = S.sc;
    const stage = h('section', { class: 'card stage', 'aria-live': 'polite', 'aria-label': 'Scena' });
    const dash = makeDash(deal, run);
    S.dash = dash; S.stage = stage;
    S.vp = null;
    const vpHost = h('div', { class: 'vp-host' });
    if (UI.makeViewport) { S.vp = UI.makeViewport(); vpHost.appendChild(S.vp.el); } else vpHost.hidden = true;
    const dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
    S.dots = dots;
    const head = h('div', { class: 'dealhead' },
      h('button', { class: 'iconbtn', 'aria-label': 'Esci dalla trattativa', onclick: () => UI.leaveDeal() }, UI.ic('back')),
      h('div', null, h('div', { class: 'eyebrow' }, `${sc.client} · ${sc.sector}`), h('h2', { 'data-focus': '', style: { marginTop: '6px' } }, sc.label)),
      dots);
    const root = h('main', { class: 'wrap playroot' }, head, h('div', { class: 'play' }, h('div', { class: 'stagecol' }, vpHost, stage), dash.el));
    applyTheme(root, sc);
    stage.addEventListener('click', (e) => { if (!e.target.closest('button, a, input, textarea') && S.skip) UI.skipReveal(); });
    if (UI.ambience) UI.ambience.start((sc.theme && sc.theme.ambience) || 'office');
    S.phase = 'reveal';
    if (sc.intro && !S.skipIntro) showIntro(); else showNode();
    S.skipIntro = false;
    /* a schermata montata: porta in vista la scena (su mobile il cruscotto compatto la precede) */
    requestAnimationFrame(() => { if (S.screen === 'play' && stage.isConnected) UI.scrollTo(stage, 'start'); });
    return root;
  };

  function setView(node, lines, extraPeople) {
    if (!S.vp) return;
    const sc = S.sc, stances = S.dash ? S.dash.stances() : {};
    const keys = [];
    const add = (k) => { if (k && k !== 'you' && keys.indexOf(k) < 0) keys.push(k); };
    const view = node.view || deduceView(node.where);
    /* chi scrive in chat o per email non è nella stanza: compare solo nelle viste a distanza */
    const remote = !PHYS[view];
    lines.forEach((l) => { add(l.w); if (l.chat && remote) add(l.chat.from); });
    (extraPeople || []).forEach(add);
    const mailLine = lines.find((l) => l.mail);
    const people = keys.slice(0, 5).map((k) => { const c = CL.castOf(sc, k); return { key: k, name: c.name, role: c.role, hue: c.hue, stance: stances[k] || undefined }; });
    S.vpKeys = keys;
    S.vpState = {
      theme: Object.assign({ bg: 'office' }, sc.theme || {}, node.bg ? { bg: node.bg } : {}),
      view,
      people, when: node.when || '', where: placeOnly(f(node.where || ''), node.when), caption: node.caption || '',
    };
    if (mailLine) S.vpState.mail = { from: f(mailLine.mail.from), subj: f(mailLine.mail.subj) };
    S.vp.set(S.vpState);
  }
  const personOf = (l) => l.w || (l.chat && S.vpState && !PHYS[S.vpState.view] ? l.chat.from : null);
  function ensurePerson(key) {
    if (!S.vp || !key || key === 'you' || (S.vpKeys || []).indexOf(key) >= 0 || (S.vpKeys || []).length >= 5) return;
    S.vpKeys.push(key);
    const sc = S.sc, stances = S.dash ? S.dash.stances() : {};
    const people = S.vpKeys.map((k) => { const c = CL.castOf(sc, k); return { key: k, name: c.name, role: c.role, hue: c.hue, stance: stances[k] || undefined }; });
    S.vpState = Object.assign({}, S.vpState, { people });
    S.vp.set(S.vpState);
  }

  function paintDots() {
    const cur = S.deal.hist.filter((x) => !x.wild).length, total = Math.max(6, cur + 1);
    S.dots.replaceChildren(...Array.from({ length: total }, (_, i) => h('i', { class: i < cur ? 'on' : i === cur ? 'cur' : '' })));
  }

  /* cold open */
  function showIntro() {
    const sc = S.sc, intro = sc.intro, stage = S.stage;
    const tok = ++S.nodeTok;
    S.phase = 'reveal';
    const host = h('div', { class: 'transcript' });
    const go = h('div', { class: 'next intro-go', hidden: true }, h('button', { class: 'btn btn--primary btn--lg', 'data-next': '', onclick: () => { UI.sfx('pick'); showNode(); } }, 'Entra', UI.ic('next')));
    UI.fill(stage,
      h('div', { class: 'where sr-only-vp' }, UI.ic('clock'), intro.where),
      h('div', { class: 'eyebrow intro-eyebrow' }, 'Prima di entrare'),
      sc.theme && sc.theme.motto ? h('p', { class: 'motto' }, f(sc.theme.motto)) : null,
      host, go);
    const lines = (typeof intro.scene === 'function' ? intro.scene(S.deal) : intro.scene);
    setView({ view: intro.view || deduceView(intro.where), where: intro.where, when: intro.when, bg: intro.bg }, lines);
    paintDots();
    UI.reveal(host, lines, { sc, vp: S.vp, onLine: (l) => ensurePerson(personOf(l)) }).then((ok) => {
      if (!ok || tok !== S.nodeTok) return;
      S.phase = 'intro';
      go.hidden = false; UI.scrollTo(go, 'nearest');
      const b = go.querySelector('button'); if (b) b.focus({ preventScroll: true });
    });
  }

  /* nodo */
  async function showNode(twist) {
    const run = S.run, deal = S.deal, sc = S.sc, stage = S.stage;
    const node = CL.nodeOf(deal);
    const tok = ++S.nodeTok;
    S.phase = 'reveal'; S.picked = null;
    paintDots();
    const lines = CL.sceneLines(deal, node);
    S.order = CL.shuffle(CL.choicesFor(deal, run), run.rnd);
    const isWild = !!deal.wild;
    const host = h('div', { class: 'transcript' });
    const prompt = h('div', { class: 'prompt', hidden: true }, h('h3', null, f(node.prompt)));
    const hintBox = h('div', { class: 'hint', hidden: true }, f(node.hint));
    const hintBtn = !run.hard ? h('button', { class: 'hintbtn', onclick: (e) => { hintBox.hidden = !hintBox.hidden; if (!hintBox.hidden) S.hints = (S.hints || 0) + 1; e.currentTarget.textContent = hintBox.hidden ? 'Serve un suggerimento?' : 'Nascondi suggerimento'; } }, 'Serve un suggerimento?') : null;
    if (hintBtn) prompt.appendChild(hintBtn);
    const timerBar = UI.settings.timer ? h('div', { class: 'timer', role: 'timer', 'aria-label': 'Tempo per decidere', hidden: true }, h('i')) : null;
    const box = h('div', { class: 'choices', role: 'group', 'aria-label': 'Le tue mosse', hidden: true });
    S.choiceEls = S.order.map((o, i) => {
      const c = o.c;
      const tags = [];
      if (c.jolly) tags.push(h('span', { class: 'chip chip--accent' }, UI.ic(c.jolly), `Jolly · ${CL.JOLLY[c.jolly].name}` + (run.free ? '' : ` · ${run.jolly[c.jolly]} rimasti`)));
      if (o.locked) tags.push(h('span', { class: 'chip chip--bad' }, 'Esaurito'));
      if (c.next === 'DQ') tags.push(h('span', { class: 'chip chip--warn' }, UI.ic('flag'), 'Esci dalla trattativa'));
      return h('button', { class: 'choice' + (o.locked ? ' locked' : ''), disabled: o.locked || null, 'data-i': i, onclick: () => choose(i) },
        h('span', { class: 'k', 'aria-hidden': 'true' }, i + 1),
        h('span', { class: 'tx' }, f(c.t), tags.length ? h('div', { class: 'tags' }, tags) : null));
    });
    S.choiceEls.forEach((b) => box.appendChild(b));
    const alertEl = isWild ? h('div', { class: 'alert', role: 'alert' }, UI.ic('bolt'), h('div', null, h('div', { class: 'eyebrow' }, 'Imprevisto'), h('b', null, f(deal.wild.title)))) : null;
    UI.fill(stage,
      twist ? h('div', { class: 'twist', role: 'status' }, UI.ic('flag'), 'Colpo di scena', twist.map((t) => h('span', { class: 'delta' }, t))) : null,
      alertEl,
      h('div', { class: 'where sr-only-vp' }, UI.ic('clock'), f(node.where || ''), node.when ? ' · ' + node.when : ''),
      host, prompt, hintBox, timerBar, box, h('div', { id: 'fbslot' }));
    stage.classList.toggle('wild', isWild);
    setView(node, lines);
    if (isWild) UI.sfx('alert');
    UI.scrollTo(stage, 'start');
    const ok = await UI.reveal(host, lines, { sc, vp: S.vp, onLine: (l) => ensurePerson(personOf(l)) });
    if (!ok || tok !== S.nodeTok) return;
    S.phase = 'choose';
    prompt.hidden = false; box.hidden = false;
    if (timerBar) { timerBar.hidden = false; startTimer(timerBar, node.t || 30, onTimeout); }
    UI.scrollBlock(prompt, box);
  }

  function onTimeout() {
    if (S.phase !== 'choose') return;
    const cands = S.order.map((o, i) => ({ o, i })).filter((x) => !x.o.locked && !x.o.c.jolly && x.o.c.next !== 'DQ');
    cands.sort((a, b) => a.o.c.q - b.o.c.q);
    S.run.timeouts++;
    choose(cands[0].i, true);
  }

  UI.playKey = (i) => { if (S.phase === 'choose' && S.order && S.order[i] && !S.order[i].locked) choose(i); };
  UI.playNext = () => {
    if (S.phase === 'feedback') advance();
    else if (S.phase === 'reveal' || S.phase === 'react') UI.skipReveal();
    else if (S.phase === 'intro') { UI.sfx('pick'); showNode(); }
  };

  async function choose(i, timedOut) {
    if (S.phase !== 'choose') return;
    UI.stopTimer();
    const run = S.run, deal = S.deal, o = S.order[i];
    S.phase = 'react'; S.picked = i;
    const prevM = Object.assign({}, deal.m), prevMp = new Set(deal.mp);
    const node = CL.nodeOf(deal);
    const wasWild = !!deal.wild;
    const tok = S.nodeTok;
    const rec = CL.pick(deal, o.c.id, run, UI.settings.wild === false ? { wild: false } : { rnd: run.rnd });
    rec.timedOut = !!timedOut;
    /* la scelta diventa la tua voce nella trascrizione */
    const host = UI.$('.transcript', S.stage);
    const box = UI.$('.choices', S.stage);
    if (box) box.remove();
    const prm = UI.$('.prompt', S.stage); if (prm) prm.classList.add('done');
    const hb = UI.$('.hint', S.stage); if (hb) hb.hidden = true;
    const tb = UI.$('.timer', S.stage); if (tb) tb.remove();
    const late = lateCoach(run);
    S.dash.update(late ? null : prevM, prevMp);
    if (!run.hard) UI.syncTopbar();
    UI.sfx(late ? 'pick' : 'q' + rec.q);
    paintDots();
    const youLine = { you: true, t: o.c.say || o.c.t };
    const reactLines = rec.react || [];
    const ok = await UI.reveal(host, [youLine].concat(timedOut ? [{ n: 'Il tempo scade: rispondi d’istinto.' }] : [], reactLines), { sc: S.sc, vp: S.vp, onLine: (l) => ensurePerson(personOf(l)) });
    if (!ok || tok !== S.nodeTok) return;
    S.phase = 'feedback';
    const fb = feedbackEl(rec, node, wasWild);
    const slot = UI.$('#fbslot', S.stage);
    slot.replaceChildren(fb);
    const btn = UI.$('[data-next]', slot);
    if (btn && !UI.modalOpen()) btn.focus({ preventScroll: true });
    UI.scrollTo(fb, 'nearest');
  }

  /* in carriera l'allenatore parla a fine trattativa (salvo impostazione): durante la scena si capisce com'è andata dai fatti, non da un voto */
  const lateCoach = (run) => !!run.hard || (run.mode === 'career' && !UI.settings.coachEach);

  function feedbackEl(rec, node, wasWild) {
    const run = S.run, deal = S.deal, hard = lateCoach(run);
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
      h('div', { class: 'hd' }, chips.length ? chips : h('span', { class: 'small faint' }, wasWild ? 'Imprevisto gestito' : 'Esito della mossa')),
      hard
        ? (run.hard
          ? h('div', { class: 'lesson' }, h('span', { class: 'eyebrow' }, 'Senza rete'), run.mode === 'career' ? 'Valutazione e lezione dopo il verdetto del giorno di chiusura, nel riepilogo.' : 'Valutazione e lezione nel debrief.')
          : h('div', { class: 'lesson' }, h('span', { class: 'eyebrow' }, 'Allenatore'), 'Il commento arriva a fine trattativa. Intanto guarda come ha reagito chi hai davanti: nella realtà nessuno ti dà un voto.'))
        : h('div', null,
          h('div', { class: 'bd' }, h('span', { class: 'eyebrow' }, 'Lettura della mossa'), h('p', null, f(rec.r))),
          h('div', { class: 'lesson' }, h('span', { class: 'eyebrow' }, 'Lezione dal campo'), f(node.tip))),
      rec.wildNext ? h('div', { class: 'wildnote' }, UI.ic('bolt'), 'Qualcosa sta per irrompere nella scena…') : null,
      h('div', { class: 'next', style: { padding: '0 16px 16px' } },
        h('button', { class: 'btn btn--primary', 'data-next': '', onclick: advance }, last ? 'Chiudi la trattativa' : 'Continua', UI.ic('next'))));
  }

  /* la trattativa è conclusa (ultima scelta fatta): sigilla o risolve e passa al debrief */
  function conclude() {
    const deal = S.deal, run = S.run, sc = S.sc;
    UI.stopTimer();
    const sealed = CL.seal(deal);
    let res;
    if (run.mode === 'career') res = sealed;
    else res = CL.finish(deal, run, run.rnd);
    CL.commitDeal(run, sc, res);
    S.res = res;
    S.fx = false;
    return UI.go('debrief');
  }

  function advance() {
    if (S.phase !== 'feedback') return;
    const deal = S.deal, run = S.run, sc = S.sc;
    if (deal.over) return conclude();
    const last = deal.hist[deal.hist.length - 1];
    let twist = null;
    if (last.entered && last.entered.delta) {
      const e = last.entered.delta, bits = [];
      CL.METERS.forEach((m) => { if (e[m.k]) bits.push(`${m.label} ${UI.signed(e[m.k])}`); });
      if (bits.length && !run.hard) twist = bits;
    }
    showNode(twist);
  }

  UI.leaveDeal = () => {
    if (S.screen !== 'play' || !S.deal) return;
    const run = S.run, career = run.mode === 'career';
    /* una trattativa già conclusa non si abbandona: si chiude (altrimenti diventerebbe un deal perso) */
    if (S.deal.over && (S.phase === 'feedback' || S.phase === 'react')) { UI.skipReveal(); S.phase = 'feedback'; return conclude(); }
    if (!career) { UI.stopTimer(); return UI.go('pipeline'); }
    UI.modal((close) => h('div', null,
      h('header', null, h('div', { class: 'grow' }, h('h3', { class: 'display', style: { fontSize: '28px' } }, 'Abbandonare la trattativa?'))),
      h('div', { class: 'body' }, h('p', { class: 'muted' }, `Nel trimestre un deal abbandonato conta come perso e le ${S.sc.cost} settimane restano spese. Se il deal non è qualificabile, la mossa giusta è squalificarlo con una scelta: costa meno.`)),
      h('footer', null,
        h('button', { class: 'btn btn--primary', onclick: () => { close(); if (S.screen !== 'play' || run.results.some((r) => r.id === S.sc.id)) return; UI.stopTimer(); const res = CL.forfeit(S.deal); CL.commitDeal(run, S.sc, res); S.res = res; S.fx = true; UI.go('debrief'); } }, 'Abbandona (deal perso)'),
        h('button', { class: 'btn', 'data-autofocus': '', onclick: close }, 'Continua la trattativa'))));
  };

  /* ───── Debrief ───── */
  /* la mossa con q più alto del nodo (preferendo quelle senza jolly), se quella scelta non lo era */
  const bestOf = (rec) => {
    try {
      const nid = String(rec.node || '');
      const node = nid.indexOf('wild:') === 0 ? ((S.sc.wild || []).concat(CL.wildGeneric || []).find((w) => 'wild:' + w.id === nid) || {}).node : S.sc.nodes[nid];
      if (!node) return null;
      const mq = Math.max(...node.choices.map((c) => c.q));
      if (rec.q >= mq) return null;
      const c = node.choices.filter((x) => x.q === mq);
      return c.find((x) => !x.jolly) || c[0];
    } catch (e) { return null; }
  };
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  UI.screens.debrief = () => {
    if (UI.ambience) UI.ambience.stop();
    const res = S.res, deal = S.deal, sc = S.sc, run = S.run, career = run.mode === 'career';
    const st = res.status;
    const pending = st === 'pending';
    const mask = !!run.hard && pending;   /* senza rete: fino al verdetto restano nascosti tetto, meter, MEDDPICC e valutazione delle mosse */
    const stampTxt = { won: 'Firmato', lost: 'Perso', slip: 'Slitta', disq: 'Squalificato' }[st];
    const ending = res.forfeited ? 'Hai abbandonato la trattativa: il cliente non ha mai ricevuto una proposta definitiva e le settimane investite restano spese.' : !pending && sc.endings ? (sc.endings[st] || sc.endings.lost) : '';
    const net = res.listFinal ? Math.round(res.listFinal * (1 - (res.disc || 0) / 100)) : 0;
    const comm = res.acv * CL.CONFIG.rate1;
    const goodL = (sc.lessons || []).filter((l) => l.if(deal) && l.good), badL = (sc.lessons || []).filter((l) => l.if(deal) && !l.good);
    const energyLine = !career ? null
      : st === 'disq' ? `Hai speso 1 settimana e ne hai recuperate ${res.refund}.`
        : res.momentum && !mask ? `Costo: ${sc.cost} settimane, ma una conduzione eccellente ti restituisce 1 settimana di slancio.` : `Costo: ${sc.cost} settimane.`;

    if (!S.fx) {
      S.fx = true;
      if (!pending) {
        setTimeout(() => {
          UI.sfx('stamp');
          setTimeout(() => UI.sfx(st === 'won' ? 'win' : st === 'disq' ? 'pick' : 'lose'), 260);
          if (st === 'won') UI.confetti();
        }, 350);
      }
    }

    const tl = deal.hist.map((rec, i) => {
      const Q = CL.QUALITY[rec.q];
      const alt = mask ? null : bestOf(rec);
      const body = h('div', { class: 'dt', hidden: true },
        h('p', null, h('b', null, 'Hai detto: '), f(rec.say || rec.t)),
        alt ? h('p', { style: { marginTop: '6px' } }, h('b', null, 'La mossa più forte: '), f(alt.t)) : null,
        mask ? null : h('p', { style: { marginTop: '6px' } }, h('b', null, 'Lettura: '), f(rec.r)),
        mask ? null : h('p', { class: 'muted', style: { marginTop: '6px' } }, h('b', null, 'Lezione: '), f(rec.tip)));
      return h('li', null,
        h('button', { 'aria-expanded': 'false', onclick: (e) => { body.hidden = !body.hidden; e.currentTarget.setAttribute('aria-expanded', String(!body.hidden)); } },
          h('span', { class: 'n' }, rec.wild ? '!!' : String(i + 1).padStart(2, '0')),
          h('span', { class: 'tt' }, (rec.wild ? 'Imprevisto' + (rec.wildTitle ? ' · ' + f(rec.wildTitle) : '') + ' — ' : '') + trunc(f(rec.t), 190)),
          mask ? null : h('span', { class: 'q ' + Q.cls }, Q.label)),
        body);
    });

    const shock = res.shock;
    return h('main', { class: 'wrap' },
      h('div', { class: 'sec-head' }, h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, `Debrief · ${sc.client}`), h('h1', { class: 'sec-title', 'data-focus': '', style: { marginTop: '8px' } }, sc.title))),
      pending
        ? h('section', { class: 'card verdict sealed' },
          h('div', { style: { padding: '8px 12px' } }, h('span', { class: 'stamp anim stamp--seal' }, 'In firma')),
          h('div', null,
            h('p', { style: { fontSize: '17px', maxWidth: '62ch' } }, 'Le tue decisioni sono finite. Il contratto è in mano al cliente, e da qui in poi il mondo fa la sua parte: l’esito si saprà il giorno di chiusura del trimestre.'),
            !run.hard ? h('p', { class: 'small muted', style: { marginTop: '10px' } }, `Probabilità di chiusura oggi: ${Math.round(res.p * 100)}%. Se firma: ${CL.fmtK(res.net)} netti. Imprevisti e shock possono ancora spostarla.`) : h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'In modalità senza rete la probabilità resta nascosta fino al giorno di chiusura.'),
            energyLine ? h('p', { class: 'small muted', style: { marginTop: '4px' } }, energyLine) : null))
        : h('section', { class: 'card verdict' },
          h('div', { style: { padding: '8px 12px' } }, h('span', { class: 'stamp anim stamp--' + st }, stampTxt)),
          h('div', null,
            h('p', { style: { fontSize: '17px', maxWidth: '62ch' } }, f(ending)),
            st !== 'disq' && !res.forfeited ? h('p', { class: 'small muted', style: { marginTop: '10px' } }, (() => {
              const pf = Math.round((res.pFinal != null ? res.pFinal : res.p) * 100), pe = Math.round(Math.min(1, res.pe) * 100);
              if (res.pe >= 1) return `Probabilità finale ${pf}%: sopra il 90% la firma è praticamente certa.`;
              const thr = pe > pf ? `Probabilità finale ${pf}% (con la spinta di una trattativa ben condotta, soglia effettiva ${pe}%).` : `Probabilità finale ${pf}%.`;
              return `${thr} Estrazione: ${Math.round(res.roll * 100)} su 100${st === 'won' ? ', sotto la soglia: hai vinto.' : ', sopra la soglia: ' + (st === 'slip' ? 'il deal slitta.' : 'il deal è perso.')}`;
            })()) : null,
            energyLine ? h('p', { class: 'small muted', style: { marginTop: '4px' } }, energyLine) : null)),
      shock ? h('section', { class: 'mt-16' }, UI.shockCard(shock, sc)) : null,
      st !== 'disq' && !res.forfeited ? h('dl', { class: 'stats' },
        h('div', { class: 'stat' }, h('dt', null, pending ? 'ACV se firma' : 'ACV netto'), h('dd', null, pending ? CL.fmtK(res.net) : st === 'won' ? CL.fmtK(res.acv) : '—', !pending && st !== 'won' ? h('small', null, `se vinto: ${CL.fmtK(net)}`) : null)),
        h('div', { class: 'stat' }, h('dt', null, 'Sconto applicato'), h('dd', null, (res.disc || 0).toFixed(0) + '%', h('small', null, `LEP ${res.lep}%`))),
        h('div', { class: 'stat' }, h('dt', null, 'Commissione base'), h('dd', null, st === 'won' ? '€' + Math.round(comm * 1000).toLocaleString('it-IT') : pending ? 'a fine trimestre' : '—')),
        mask ? null : h('div', { class: 'stat' }, h('dt', null, 'Qualità decisioni'), h('dd', null, Math.round((res.avgQ / 3) * 100) + '%')),
        mask ? null : h('div', { class: 'stat' }, h('dt', null, 'MEDDPICC'), h('dd', null, `${res.mp}/8`)),
        h('div', { class: 'stat' }, h('dt', null, 'Imprevisti'), h('dd', null, String(res.wilds || 0), mask ? null : h('small', null, `rep. ${UI.signed(res.integ)} · ora ${run.rep}`)))) : null,
      res.blocked ? h('div', { class: 'note mt-16' }, h('b', null, 'Deal Desk. '), `Avevi promesso il ${Math.round(res.promised)}% senza contropartite sufficienti: ne è stato approvato il ${res.disc}%. Il cliente ha notato la retromarcia e la probabilità ne ha risentito.`) : null,
      res.cap && !mask ? h('div', { class: 'note mt-16' }, h('b', null, `Limite ${Math.round(res.cap.max * 100)}%. `), f(res.cap.why)) : null,
      h('div', { class: 'two' },
        h('section', { class: 'card pad' },
          h('div', { class: 'eyebrow' }, 'Le tue mosse'),
          h('ul', { class: 'tl' }, tl)),
        mask
          ? h('section', { class: 'card pad' }, h('div', { class: 'eyebrow' }, 'Valutazione'), h('p', { class: 'muted', style: { marginTop: '10px' } }, 'Senza rete: tetto, meter, MEDDPICC e valutazione delle mosse restano nascosti fino al verdetto. Li trovi nel riepilogo, dopo il giorno di chiusura.'))
          : h('section', { class: 'card pad' },
          h('div', { class: 'eyebrow' }, 'Il quadro finale'),
          h('div', { style: { marginTop: '10px' } }, CL.METERS.map((m) => h('div', { class: 'mrow', style: { gridTemplateColumns: '78px minmax(0,1fr) 30px' } }, h('span', { class: 'l' }, m.label), h('div', { class: 'bar' }, h('i', { class: m.k === 'risk' ? 'risk' : '', style: { width: deal.m[m.k] + '%' } })), h('span', { class: 'n' }, Math.round(deal.m[m.k]))))),
          h('div', { class: 'mps mt-16' }, CL.MP.map((m) => h('div', { class: 'mp' + (deal.mp.has(m.k) ? ' on' : ''), title: m.full }, m.label))),
          h('div', { class: 'ls' },
            goodL.map((l) => h('p', { class: 'good' }, f(l.t))),
            badL.map((l) => h('p', { class: 'bad' }, f(l.t))),
            !goodL.length && !badL.length ? h('p', { class: 'muted' }, 'Nessun elemento determinante: una trattativa neutra.') : null))),
      h('div', { class: 'row gap-12 wrapx mt-24' },
        career ? h('button', { class: 'btn btn--primary btn--lg', 'data-autofocus': '', onclick: () => UI.nextAfterDeal() }, 'Prosegui', UI.ic('next'))
          : [h('button', { class: 'btn btn--primary btn--lg', onclick: () => UI.startDeal(sc) }, UI.ic('refresh'), 'Rigioca lo scenario'), h('button', { class: 'btn', onclick: () => UI.go('pipeline') }, 'Altro scenario')]),
      h('p', { class: 'footer' }, S.hints ? `Suggerimenti usati: ${S.hints}. ` : '', run.timeouts ? `Decisioni scadute: ${run.timeouts}.` : ''));
  };

  /* scheda di uno shock (usata nel debrief di allenamento e nel giorno di chiusura) */
  UI.shockCard = (shock, sc, opts) => {
    const kind = shock.kind === 'pos' ? 'pos' : 'neg';
    const pct = Math.round(shock.dp * 100);
    const veil = !!(opts && opts.hard);   /* senza rete: la scheda racconta, non quantifica e non anticipa l'esito */
    return h('div', { class: 'shock shock--' + kind + (veil ? '' : shock.hit ? ' hit' : ' prot') },
      h('div', { class: 'hd' },
        h('span', { class: 'eyebrow' }, kind === 'neg' ? 'Shock del giorno di chiusura' : veil || shock.hit ? 'Colpo di fortuna' : 'Occasione mancata'),
        veil ? null : h('span', { class: 'chip ' + (kind === 'pos' ? (shock.hit ? 'chip--good' : 'chip--warn') : shock.hit ? 'chip--bad' : 'chip--good') }, kind === 'pos' ? (shock.hit ? 'A tuo favore' : 'Non sfruttata') : shock.hit ? 'Colpito' : 'Protetto'),
        veil ? null : (pct ? h('span', { class: 'delta ' + (pct > 0 ? 'up' : 'down') }, `Probabilità ${UI.signed(pct)} punti`) : h('span', { class: 'delta' }, 'Nessun effetto'))),
      h('h4', null, CL.fmt(shock.title, sc)),
      h('p', null, CL.fmt(shock.text, sc)));
  };
})(typeof window !== 'undefined' ? window : globalThis);
