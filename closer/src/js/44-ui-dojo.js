/* CLOSER · UI: Dojo delle obiezioni */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S;
  const GL = ['g0', 'g1', 'g2', 'g3'];
  const GTXT = ['Errore', 'Debole', 'Buona', 'Da cintura nera'];

  UI.startDojo = () => {
    const rnd = CL.rng((Date.now() ^ (Math.random() * 4294967296)) >>> 0);
    S.run = null;
    S.dojo = { qs: CL.dojo.build(rnd, CL.dojo.rounds), i: 0, grades: [], phase: 'ask', picked: null, picks: [] };
    UI.go('dojo');
  };

  let timer = null;
  const stop = () => { if (timer) { cancelAnimationFrame(timer.raf); if (timer.vis) document.removeEventListener('visibilitychange', timer.vis); timer = null; } };
  UI.stopDojoTimer = stop;

  function startTimer(bar, secs, onEnd) {
    stop();
    const total = secs * 1000;
    timer = { raf: 0, end: performance.now() + total, hiddenAt: 0 };
    /* il tempo non scorre con la scheda in background */
    timer.vis = () => { if (!timer) return; if (document.hidden) timer.hiddenAt = performance.now(); else if (timer.hiddenAt) { timer.end += performance.now() - timer.hiddenAt; timer.hiddenAt = 0; } };
    document.addEventListener('visibilitychange', timer.vis);
    const tick = (t) => {
      if (!timer) return;
      if (UI.modalOpen()) { timer.end += 16; timer.raf = requestAnimationFrame(tick); return; }
      const left = timer.end - t, f = Math.max(0, left / total);
      bar.firstChild.style.transform = `scaleX(${f})`;
      bar.classList.toggle('low', f < 0.25);
      if (left <= 0) { stop(); onEnd(); return; }
      timer.raf = requestAnimationFrame(tick);
    };
    timer.raf = requestAnimationFrame(tick);
  }

  UI.screens.dojo = () => {
    const D = S.dojo;
    const q = D.qs[D.i];
    const root = h('main', { class: 'wrap' });
    const inner = h('div', { class: 'dojo' });
    root.appendChild(inner);

    const dots = h('div', { class: 'score-dots', 'aria-label': 'Punteggio dei round' }, D.qs.map((_, k) => h('i', { class: k < D.grades.length ? GL[D.grades[k]] : '' })));
    const timerBar = UI.settings.timer ? h('div', { class: 'timer', role: 'timer', 'aria-label': 'Tempo per rispondere' }, h('i')) : null;
    const slot = h('div', null);

    const opts = q.opts.map((o, i) => h('button', { class: 'choice opt', 'data-i': i, onclick: () => pick(i) },
      h('span', { class: 'k', 'aria-hidden': 'true' }, i + 1),
      h('span', { class: 'tx' }, o.t)));

    UI.fill(inner,
      h('div', { class: 'row gap-12 wrapx', style: { justifyContent: 'space-between' } },
        h('div', { class: 'eyebrow' }, `Dojo · obiezione ${D.i + 1} di ${D.qs.length}`),
        dots),
      h('div', { class: 'row gap-12 mt-24' },
        UI.avatar({ name: q.who, hue: 20 + ((D.i * 47) % 300) }),
        h('div', null, h('div', { class: 'small' }, h('b', null, q.who)), h('div', { class: 'small faint' }, q.ctx))),
      h('h1', { class: 'quote', 'data-focus': '' }, `“${q.line}”`),
      h('p', { class: 'muted' }, 'Qual è la risposta migliore?'),
      timerBar,
      h('div', { class: 'opts', role: 'group', 'aria-label': 'Le tue risposte' }, opts),
      slot);
    S.dojoEls = opts;

    function reveal(chosen, timedOut) {
      const o = q.opts[chosen];
      D.phase = 'fb'; D.picked = chosen;
      D.grades.push(o.g);
      opts.forEach((el, i) => {
        el.disabled = true;
        const oo = q.opts[i];
        el.classList.add('reveal', GL[oo.g]);
        el.classList.toggle('picked', i === chosen);
        el.classList.toggle('dim', i !== chosen && oo.g < 3);
        el.querySelector('.tx').appendChild(h('span', { class: 'why' }, h('b', null, GTXT[oo.g] + (i === chosen ? ' · la tua risposta' : '') + ': '), oo.why));
      });
      dots.replaceChildren(...D.qs.map((_, k) => h('i', { class: k < D.grades.length ? GL[D.grades[k]] : '' })));
      UI.sfx(o.g === 3 ? 'q3' : o.g === 2 ? 'q2' : o.g === 1 ? 'q1' : 'q0');
      const last = D.i + 1 >= D.qs.length;
      slot.setAttribute('role', 'status'); slot.setAttribute('aria-live', 'polite');
      slot.replaceChildren(h('span', { class: 'sr-only' }, `${GTXT[o.g]}${timedOut ? ' (tempo scaduto)' : ''}. La risposta migliore è indicata nell’elenco.`), h('div', { class: 'next' }, h('button', { class: 'btn btn--primary', 'data-next': '', onclick: next }, last ? 'Vedi il risultato' : 'Prossima obiezione', UI.ic('next'))));
      D.picks.push({ line: q.line, chosen: o.t, g: o.g, best: q.opts.find((x) => x.g === 3).t });
      const b = slot.querySelector('button'); if (b) b.focus({ preventScroll: true });
      b && UI.scrollTo(b, 'nearest');
      if (timedOut) slot.prepend(h('p', { class: 'small', style: { color: 'var(--bad)' } }, 'Tempo scaduto: risposta d’istinto.'));
    }
    function pick(i) { if (D.phase !== 'ask') return; stop(); reveal(i, false); }
    function next() {
      if (D.phase !== 'fb') return;
      D.i++; D.phase = 'ask'; D.picked = null;
      if (D.i >= D.qs.length) return finish();
      UI.go('dojo');
    }
    function finish() {
      const pts = D.grades.reduce((a, b) => a + b, 0), pct = pts / (D.qs.length * 3);
      D.pct = pct;
      UI.saveRecords((rec) => {
        if (pct > (rec.dojo.best || 0)) rec.dojo.best = pct;
        if (pct >= 0.9 && !rec.badges.dojo) rec.badges.dojo = new Date().toLocaleDateString('it-IT');
      });
      UI.go('dojoEnd');
    }
    S.dojoPick = pick; S.dojoNext = next;
    if (timerBar) startTimer(timerBar, CL.dojo.seconds, () => {
      if (D.phase !== 'ask') return;
      const worst = q.opts.map((o, i) => ({ g: o.g, i })).sort((a, b) => a.g - b.g)[0].i;
      reveal(worst, true);
    });
    return root;
  };

  UI.dojoKey = (i) => { if (S.screen === 'dojo' && S.dojo.phase === 'ask' && S.dojoPick && i < S.dojo.qs[S.dojo.i].opts.length) S.dojoPick(i); };
  UI.dojoAdvance = () => { if (S.screen === 'dojo' && S.dojo.phase === 'fb' && S.dojoNext) S.dojoNext(); };

  UI.screens.dojoEnd = () => {
    const D = S.dojo, pct = D.pct, gr = CL.dojo.grade(pct);
    const rec = UI.records();
    const best = rec.dojo.best;
    return h('main', { class: 'wrap' },
      h('section', { class: 'card rank mt-24' },
        h('div', null,
          h('div', { class: 'eyebrow' }, 'Dojo delle obiezioni · risultato'),
          h('h1', { class: 'display', 'data-focus': '', style: { marginTop: '10px' } }, gr.name),
          h('p', { class: 'muted', style: { marginTop: '12px', fontSize: '17px', maxWidth: '52ch' } }, gr.line)),
        h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '14px' } },
          h('div', { class: 'attain' }, Math.round(pct * 100) + '%'),
          h('span', { class: 'stamp anim ' + (pct >= 0.75 ? 'stamp--won' : pct >= 0.5 ? 'stamp--slip' : 'stamp--lost') }, pct >= 0.9 ? 'Cintura nera' : pct >= 0.75 ? 'Ottimo' : pct >= 0.5 ? 'Così così' : 'Da rivedere'))),
      h('p', { class: 'small muted mt-16' }, best ? `Il tuo record: ${Math.round(best * 100)}%.` : ''),
      h('section', { class: 'card pad mt-16' },
        h('div', { class: 'eyebrow' }, 'Revisione'),
        h('ul', { class: 'tl' }, D.picks.map((p, i) => h('li', null,
          h('div', { style: { padding: '12px' } },
            h('div', { class: 'row gap-8', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('b', null, `${i + 1}. “${p.line}”`),
              h('span', { class: 'q ' + CL.QUALITY[p.g].cls }, GTXT[p.g])),
            p.g < 3 ? h('p', { class: 'small', style: { marginTop: '8px', color: 'var(--ink-2)' } }, h('b', null, 'Meglio: '), p.best) : null))))),
      h('div', { class: 'row gap-12 wrapx mt-24' },
        h('button', { class: 'btn btn--primary btn--lg', onclick: UI.startDojo }, UI.ic('refresh'), 'Un altro giro'),
        h('button', { class: 'btn', onclick: () => UI.go('home') }, 'Home')));
  };
})(typeof window !== 'undefined' ? window : globalThis);
