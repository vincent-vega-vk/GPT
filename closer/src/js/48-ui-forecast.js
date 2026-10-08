/* CLOSER · UI: forecast call con Marta e giorno di chiusura */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S;
  const MARTA = CL.GENERIC_CAST.marta;
  const pickOne = (arr, rnd) => (arr && arr.length ? arr[Math.floor(rnd() * arr.length)] : '');
  const wait = (ms) => new Promise((r) => setTimeout(r, UI.settings.fast ? Math.min(ms, 80) : ms));
  const once = (el, btnSel) => new Promise((res) => { el.querySelector(btnSel).addEventListener('click', res, { once: true }); });

  const ACT = { evidence: 'scorre il CRM', sandbag: 'inarca un sopracciglio', risk: 'appoggia la penna', unworked: 'ruota lo schermo verso di te', custom: 'si china verso la camera', coverage: 'chiude la scheda del CRM' };

  /* ───── avvio ───── */
  UI.startForecast = (kind) => {
    const run = S.run;
    const entries = CL.fcEntries(run, kind);
    if (!entries.some((e) => e.state === 'pending') && kind === 'final') return UI.runClosing();
    if (!entries.length) { run.fc.calls[kind] = { kind, entries: [] }; return UI.afterForecast(kind); }
    S.fcx = { kind, entries, scores: [], logs: [], tok: ++S.nodeTok };
    UI.go('forecast');
  };

  UI.afterForecast = (kind) => {
    if (kind === 'final') return UI.runClosing();
    UI.nextAfterDeal(true);
  };

  /* ───── schermata della call ───── */
  UI.screens.forecast = () => {
    if (UI.ambience) UI.ambience.start('office');
    const X = S.fcx, run = S.run, kind = X.kind, B = CL.FCBANK || {};
    const rnd = run.rnd, hard = run.hard;
    const label = kind === 'mid' ? 'Forecast call · metà trimestre' : 'Commit call · fine trimestre';
    const host = h('div', { class: 'transcript' });
    const area = h('div', { class: 'fcarea' });
    const stage = h('section', { class: 'card stage fcstage', 'aria-live': 'polite', 'aria-label': 'Forecast call' }, h('div', { class: 'where' }, UI.ic('phone'), label), host, area);
    const vpHost = h('div', { class: 'vp-host' });
    let vp = null;
    if (UI.makeViewport) { vp = UI.makeViewport(); vpHost.appendChild(vp.el); } else vpHost.hidden = true;
    const setVp = (caption) => { if (vp) vp.set({ theme: { bg: 'office' }, view: 'call', people: [{ key: 'marta', name: MARTA.name, role: MARTA.role, hue: MARTA.hue, stance: undefined }], when: `Settimana ${CL.week(run)}`, where: label, caption: caption || '' }); };
    const head = h('div', { class: 'dealhead' },
      h('div', null, h('div', { class: 'eyebrow' }, `Settimana ${CL.week(run)} · ${kind === 'mid' ? 'pipeline review' : 'commit call'}`), h('h2', { 'data-focus': '', style: { marginTop: '6px' } }, kind === 'mid' ? 'Forecast con Marta' : 'La commit call')),
      h('div', { class: 'dots mgr', title: 'Fiducia di Marta' }, h('span', { class: 'small muted' }, 'Fiducia di Marta'), h('b', { class: 'mono', id: 'mgrv' }, String(run.mgr))));
    const root = h('main', { class: 'wrap playroot fcroot' }, head, h('div', { class: 'fcgrid' }, h('div', { class: 'stagecol' }, vpHost, stage)));
    stage.addEventListener('click', (e) => { if (!e.target.closest('button, a, input, textarea') && S.skip) UI.skipReveal(); });

    const say = (lines) => UI.reveal(host, lines.map((l) => (typeof l === 'string' ? { w: 'marta', t: l } : l)), { sc: null, vp });
    const setMgr = () => { const el = UI.$('#mgrv', root); if (el) el.textContent = String(run.mgr); };
    const gone = () => X.tok !== S.nodeTok || S.screen !== 'forecast';

    /* foglio di forecast */
    function sheet() {
      const rows = X.entries;
      const totals = h('div', { class: 'fctot' });
      const submit = h('button', { class: 'btn btn--primary btn--lg', disabled: true }, 'Presenta il forecast', UI.ic('next'));
      const upd = () => {
        const sum = (c) => rows.filter((e) => e.state === 'pending' && e.cat === c).reduce((a, e) => a + e.net, 0);
        const bonus = run.bonusAcv;
        totals.replaceChildren(
          h('div', null, h('span', { class: 'eyebrow' }, 'Commit'), h('b', null, CL.fmtK(sum('commit') + bonus))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Best Case'), h('b', null, CL.fmtK(sum('best')))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Quota'), h('b', null, CL.fmtK(CL.CONFIG.quota))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Manca (Commit)'), h('b', { class: sum('commit') + bonus >= CL.CONFIG.quota ? 'ok' : 'gap' }, CL.fmtK(Math.max(0, CL.CONFIG.quota - sum('commit') - bonus)))));
        submit.disabled = rows.some((e) => !e.cat);
      };
      const list = h('div', { class: 'fcrows' }, rows.map((e) => {
        const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': `Categoria per ${e.sc.client}` }, CL.CATS.map((c) => h('button', {
          class: 'segb' + (e.cat === c.k ? ' on' : ''), role: 'radio', 'aria-checked': String(e.cat === c.k), title: c.hint, 'data-k': c.k,
          onclick: () => { e.cat = c.k; seg.querySelectorAll('.segb').forEach((b) => { const on = b.dataset.k === e.cat; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }); UI.sfx('pick'); upd(); },
        }, c.label)));
        return h('div', { class: 'fcrow' + (e.state === 'open' ? ' open' : '') },
          h('div', { class: 'who' },
            h('b', null, e.sc.title), h('small', null, e.sc.client),
            h('div', { class: 'row gap-4 wrapx', style: { marginTop: '6px' } },
              e.state === 'pending' ? h('span', { class: 'chip chip--accent' }, 'In firma · ' + CL.fmtK(e.net)) : h('span', { class: 'chip' }, 'Non lavorato'),
              e.state === 'open' ? h('span', { class: 'chip' + (e.crm === 'commit' ? ' chip--warn' : '') }, 'CRM: ' + CL.catLabel(e.crm)) : null,
              !hard && e.state === 'pending' ? h('span', { class: 'chip' }, 'Tua stima ' + Math.round(e.p * 100) + '%') : null)),
          seg);
      }));
      const wrap = h('div', { class: 'fcsheet' },
        h('div', { class: 'eyebrow' }, 'Foglio di forecast · assegna una categoria a ogni trattativa'),
        list, totals,
        h('div', { class: 'next', style: { marginTop: '14px' } }, submit));
      upd();
      area.replaceChildren(wrap);
      wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return once(wrap, '.next button').then(() => { wrap.querySelectorAll('button').forEach((b) => { b.disabled = true; }); });
    }

    const chipEl = (txt, cls) => h('span', { class: 'delta ' + (cls || '') }, txt);

    async function challenge(ch) {
      area.replaceChildren();
      const e = ch.entry;
      host.appendChild(h('div', { class: 'fcctx' }, UI.ic('flag'), e ? `${e.sc.client} · hai chiamato ${CL.catLabel(e.cat)}` : 'Domanda sul trimestre'));
      await say([{ w: 'marta', a: ACT[ch.type] || '', t: ch.q }]);
      if (gone()) return;
      const opts = CL.shuffle(ch.opts, rnd);
      const box = h('div', { class: 'choices', role: 'group', 'aria-label': 'La tua risposta' }, opts.map((o, i) => h('button', { class: 'choice', 'data-id': o.id }, h('span', { class: 'k', 'aria-hidden': 'true' }, i + 1), h('span', { class: 'tx' }, o.t))));
      area.replaceChildren(box);
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      S.fcOpts = opts;
      S.fcPhase = 'choose';
      const picked = await new Promise((res) => {
        const pickIdx = (i) => { if (S.fcPhase === 'choose' && opts[i]) { S.fcPhase = 'wait'; res(opts[i]); } };
        S.fcKey = pickIdx;
        box.querySelectorAll('.choice').forEach((b, i) => b.addEventListener('click', () => pickIdx(i)));
      });
      if (gone()) return;
      box.remove();
      const eff = CL.fcResolve(run, ch, picked.id, rnd);
      X.scores.push(eff.score);
      setMgr();
      UI.sfx(eff.score > 0.4 ? 'q3' : eff.score < -0.2 ? 'q0' : 'q1');
      await UI.reveal(host, [{ you: true, t: picked.t }].concat(eff.lines.map((t) => ({ w: 'marta', t }))), { sc: null, vp });
      if (gone()) return;
      const chips = [];
      if (eff.rep) chips.push(chipEl(`Reputazione ${UI.signed(eff.rep)}`, eff.rep > 0 ? 'up' : 'down'));
      if (eff.mgr) chips.push(chipEl(`Fiducia di Marta ${UI.signed(eff.mgr)}`, eff.mgr > 0 ? 'up' : 'down'));
      if (e && eff.cat && eff.cat !== X.before) chips.push(h('span', { class: 'chip chip--accent' }, `Categoria: ${CL.catLabel(ch.was || e.cat)} → ${CL.catLabel(e.cat)}`));
      if (eff.boost && e) chips.push(h('span', { class: 'chip chip--good' }, UI.ic('users'), hard ? `Marta ti dà una mano su ${e.sc.client}` : `Marta ti dà una mano su ${e.sc.client}: +${Math.round(eff.boost * 100)} punti`));
      if (eff.weeks) chips.push(h('span', { class: 'chip chip--bad' }, UI.ic('clock'), 'Deal review forzata: −1 settimana'));
      if (eff.caught === false) chips.push(h('span', { class: 'chip chip--warn' }, 'Per ora la bugia regge'));
      const fin = h('div', { class: 'fcfb' }, h('div', { class: 'hd' }, chips.length ? chips : h('span', { class: 'small faint' }, 'Nessun effetto')), h('div', { class: 'next', style: { padding: '0 14px 14px' } }, h('button', { class: 'btn btn--primary', 'data-next': '' }, 'Continua', UI.ic('next'))));
      area.replaceChildren(fin);
      fin.querySelector('button').focus({ preventScroll: true });
      fin.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      S.fcPhase = 'fb';
      await new Promise((res) => { S.fcNext = res; fin.querySelector('button').addEventListener('click', res, { once: true }); });
      S.fcNext = null;
      area.replaceChildren();
    }

    async function run_() {
      setVp(kind === 'mid' ? 'Pipeline review' : 'Commit call');
      UI.sfx('phone');
      S.phase = 'reveal';
      await say(pickOne(B.open && B.open[kind], rnd) || [{ w: 'marta', t: 'Ok, partiamo. Dammi i numeri veri.' }]);
      if (gone()) return;
      await say([{ w: 'marta', t: CL.fcFmt(pickOne(B.sheet && B.sheet[kind], rnd) || 'Compila il foglio.', null, null) }]);
      if (gone()) return;
      S.fcPhase = 'sheet';
      await sheet();
      if (gone()) return;
      const beforeCats = X.entries.map((e) => e.cat);
      host.appendChild(h('div', { class: 'fcctx' }, UI.ic('check'), 'Forecast presentato'));
      await wait(500);
      const chs = CL.fcBuild(run, X.entries, kind, rnd);
      X.challenges = chs;
      for (const ch of chs) {
        if (ch.entry) ch.was = ch.entry.cat;
        await challenge(ch);
        if (gone()) return;
      }
      const fin = CL.fcFinalize(run, kind, X.entries, X.scores);
      const wrapLines = pickOne(B.wrap && B.wrap[fin.quality], rnd) || 'Ok, per ora è tutto.';
      await say([{ w: 'marta', t: CL.fcFmt(wrapLines, null, null) }]);
      if (gone()) return;
      const done = h('div', { class: 'fcsheet final' },
        h('div', { class: 'eyebrow' }, 'Forecast consegnato al CRO'),
        h('div', { class: 'fcrows' }, X.entries.filter((e) => e.cat).map((e) => h('div', { class: 'fcrow compact' }, h('div', { class: 'who' }, h('b', null, e.sc.title), h('small', null, e.sc.client)), h('span', { class: 'chip ' + (e.cat === 'commit' ? 'chip--good' : e.cat === 'best' ? 'chip--warn' : '') }, CL.catLabel(e.cat)), h('b', { class: 'mono' }, e.state === 'pending' ? CL.fmtK(e.net) : '—')))),
        h('div', { class: 'fctot' },
          h('div', null, h('span', { class: 'eyebrow' }, 'Commit'), h('b', null, CL.fmtK(fin.commit + run.bonusAcv))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Best Case'), h('b', null, CL.fmtK(fin.best))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Fiducia di Marta'), h('b', null, String(run.mgr))),
          h('div', null, h('span', { class: 'eyebrow' }, 'Reputazione'), h('b', null, String(run.rep)))),
        fin.grant ? h('div', { class: 'note ' + (fin.grant.kind === 'cut' ? 'bad' : 'good') }, fin.grant.kind === 'cut' ? h('b', null, 'Marta ritira un po’ di supporto. ') : h('b', null, 'Marta ti dà più credito. '), fin.grant.text) : null,
        h('div', { class: 'next', style: { marginTop: '14px' } }, h('button', { class: 'btn btn--primary btn--lg', 'data-next': '' }, kind === 'mid' ? 'Torna al lavoro' : 'Vai al giorno di chiusura', UI.ic('next'))));
      area.replaceChildren(done);
      done.querySelector('[data-next]').focus({ preventScroll: true });
      done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      S.fcPhase = 'end';
      await once(done, '[data-next]');
      if (gone()) return;
      S.fcx = null;
      UI.afterForecast(kind);
    }
    setTimeout(() => run_().catch((err) => { if (g.console) console.error(err); }), 0);
    return root;
  };

  UI.fcKey = (i) => { if (S.screen === 'forecast' && S.fcPhase === 'choose' && S.fcKey) S.fcKey(i); };
  UI.fcAdvance = () => {
    if (S.screen !== 'forecast') return false;
    if (S.fcPhase === 'fb' && S.fcNext) { S.fcNext(); return true; }
    if (S.skip) { UI.skipReveal(); return true; }
    return false;
  };

  /* ───── giorno di chiusura ───── */
  UI.runClosing = () => {
    const run = S.run;
    if (!run.results.some((r) => r.status === 'pending') && !run.closing) { run.closing = []; return UI.endQuarter(); }
    if (!run.closing) {
      CL.closeQuarter(run, run.rnd);
      S.fcLines = CL.fcSettle(run);
    }
    S.clo = { tok: ++S.nodeTok };
    UI.go('closing');
  };

  UI.screens.closing = () => {
    if (UI.ambience) UI.ambience.start('office');
    const run = S.run, B = CL.FCBANK || {}, rnd = run.rnd, hard = run.hard;
    const log = run.closing || [];
    const tok = S.clo.tok;
    const host = h('div', { class: 'transcript' });
    const area = h('div', { class: 'fcarea' });
    const stage = h('section', { class: 'card stage fcstage', 'aria-live': 'polite', 'aria-label': 'Giorno di chiusura' }, h('div', { class: 'where' }, UI.ic('clock'), 'Ultimo giorno del trimestre'), host, area);
    const vpHost = h('div', { class: 'vp-host' });
    let vp = null;
    if (UI.makeViewport) { vp = UI.makeViewport(); vpHost.appendChild(vp.el); vp.set({ theme: { bg: 'night' }, view: 'desk', people: [], when: 'Giorno 91 · 18:40', where: 'La tua scrivania', caption: 'CRM aperto' }); } else vpHost.hidden = true;
    const head = h('div', { class: 'dealhead' }, h('div', null, h('div', { class: 'eyebrow' }, 'Giorno 91 · 18:40'), h('h2', { 'data-focus': '', style: { marginTop: '6px' } }, 'Giorno di chiusura')), h('div', { class: 'dots' }, h('span', { class: 'small muted' }, `${log.length} trattative in sospeso`)));
    const root = h('main', { class: 'wrap playroot fcroot' }, head, h('div', { class: 'fcgrid' }, h('div', { class: 'stagecol' }, vpHost, stage)));
    stage.addEventListener('click', (e) => { if (!e.target.closest('button, a, input, textarea') && S.skip) UI.skipReveal(); });
    const gone = () => tok !== S.nodeTok || S.screen !== 'closing';
    const chat = (t) => ({ chat: { from: 'marta', app: 'Slack' }, t, sfx: 'ping' });
    const reveal = (lines) => UI.reveal(host, lines, { sc: null, vp });
    const cats = {};
    const call = run.fc && run.fc.calls && run.fc.calls.final;
    if (call) call.entries.forEach((e) => { cats[e.id] = e.cat; });

    async function main() {
      S.phase = 'reveal';
      await reveal([{ n: 'Sono le 18:40 dell’ultimo giorno del trimestre. Il CRM è aperto, il telefono è girato a faccia in giù. Per la prima volta in tre mesi, non puoi più cambiare niente.' }, chat(CL.fcFmt(pickOne(B.closing && B.closing.intro, rnd) || 'Ci siamo. Una alla volta.', null, null))]);
      if (gone()) return;
      for (let i = 0; i < log.length; i++) {
        const res = log[i];
        const sc = CL.getScenario(res.id);
        area.replaceChildren();
        const card = h('div', { class: 'cloc' },
          h('div', { class: 'eyebrow' }, `Trattativa ${i + 1} di ${log.length}`),
          h('h3', { class: 'display', style: { fontSize: '34px', marginTop: '6px' } }, sc.title),
          h('div', { class: 'small muted' }, `${sc.client} · se firma ${CL.fmtK(res.net)} netti`),
          cats[res.id] ? h('div', { class: 'mt-8' }, h('span', { class: 'chip ' + (cats[res.id] === 'commit' ? 'chip--good' : cats[res.id] === 'best' ? 'chip--warn' : '') }, 'Nel tuo forecast: ' + CL.catLabel(cats[res.id]))) : null);
        host.appendChild(h('div', { class: 'fcctx' }, UI.ic('flag'), `${sc.client}`));
        area.appendChild(card);
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (res.shock) {
          await wait(700);
          if (gone()) return;
          UI.sfx(res.shock.kind === 'pos' ? 'ping' : 'alert');
          area.appendChild(UI.shockCard(res.shock, sc));
          await wait(1200);
          if (gone()) return;
        } else {
          area.appendChild(h('p', { class: 'small muted', style: { marginTop: '10px' } }, 'Nessun imprevisto: il contratto segue il suo corso.'));
          await wait(600);
        }
        if (!hard) {
          const p0 = Math.round(res.p * 100), p1 = Math.round((res.pFinal != null ? res.pFinal : res.p) * 100);
          area.appendChild(h('div', { class: 'cloc-p' }, h('span', { class: 'small muted' }, 'Probabilità'), h('b', { class: 'mono' }, p0 + '%'), UI.ic('next'), h('b', { class: 'mono ' + (p1 >= p0 ? 'up' : 'down') }, p1 + '%'), res.boost ? h('span', { class: 'chip chip--good' }, 'aiuto di Marta') : null));
        }
        const open = h('div', { class: 'next', style: { marginTop: '14px' } }, h('button', { class: 'btn btn--primary btn--lg', 'data-next': '' }, 'Apri la busta', UI.ic('next')));
        area.appendChild(open);
        const b = open.querySelector('button'); b.focus({ preventScroll: true });
        S.fcPhase = 'open';
        await new Promise((r) => { S.fcNext = r; b.addEventListener('click', r, { once: true }); });
        S.fcNext = null;
        if (gone()) return;
        open.remove();
        const st = res.status;
        const stamp = h('div', { class: 'stampwrap' }, h('span', { class: 'stamp anim stamp--' + st }, { won: 'Firmato', lost: 'Perso', slip: 'Slitta' }[st]));
        area.appendChild(stamp);
        UI.sfx('stamp'); setTimeout(() => UI.sfx(st === 'won' ? 'win' : 'lose'), 260);
        if (st === 'won') UI.confetti();
        const key = st === 'won' ? 'won' : st === 'slip' ? 'slip' : 'lost';
        const line = CL.fcFmt(pickOne(B.closing && B.closing[key], rnd) || '', { sc, net: res.net, cat: null, truth: null, p: res.p }, null, { client: sc.client, acv: CL.fmtK(res.acv || res.net) });
        const ending = sc.endings ? (sc.endings[key] || '') : '';
        await wait(900);
        if (gone()) return;
        await reveal([{ n: CL.fmt(ending, sc) }, chat(line)]);
        if (gone()) return;
        const nx = h('div', { class: 'next', style: { marginTop: '14px' } }, h('button', { class: 'btn btn--primary', 'data-next': '' }, i + 1 < log.length ? 'Prossima trattativa' : 'Il forecast e il riepilogo', UI.ic('next')));
        area.appendChild(nx);
        const nb = nx.querySelector('button'); nb.focus({ preventScroll: true });
        S.fcPhase = 'fb';
        await new Promise((r) => { S.fcNext = r; nb.addEventListener('click', r, { once: true }); });
        S.fcNext = null;
        if (gone()) return;
      }
      /* affidabilità del forecast */
      area.replaceChildren();
      const sc = CL.fcScore(run);
      const mood = !sc || sc.acc == null ? 'fcMixed' : sc.acc >= 0.8 ? 'fcGood' : sc.acc >= 0.55 ? 'fcMixed' : 'fcBad';
      if (sc && sc.n) await reveal([chat(CL.fcFmt(pickOne(B.closing && B.closing[mood], rnd) || '', null, null))]);
      if (gone()) return;
      const rows = sc ? sc.rows : [];
      const panel = h('div', { class: 'fcsheet final' },
        h('div', { class: 'eyebrow' }, 'Affidabilità del forecast'),
        rows.length ? h('div', { class: 'fcrows' }, rows.map((r) => h('div', { class: 'fcrow compact' },
          h('div', { class: 'who' }, h('b', null, r.title), h('small', null, r.client)),
          h('span', { class: 'chip ' + (r.cat === 'commit' ? 'chip--good' : r.cat === 'best' ? 'chip--warn' : '') }, CL.catLabel(r.cat)),
          h('span', { class: 'chip ' + (r.status === 'won' ? 'chip--good' : r.status === 'slip' ? 'chip--warn' : 'chip--bad') }, { won: 'Firmato', lost: 'Perso', slip: 'Slitta' }[r.status]),
          h('b', { class: 'mono' }, Math.round(r.pts * 100) + '%')))) : h('p', { class: 'muted' }, 'Nessuna trattativa nel forecast finale.'),
        sc && sc.n ? h('div', { class: 'fctot' }, h('div', null, h('span', { class: 'eyebrow' }, 'Affidabilità'), h('b', null, Math.round(sc.acc * 100) + '%')), h('div', null, h('span', { class: 'eyebrow' }, 'Commit mancati'), h('b', null, String(sc.miss))), h('div', null, h('span', { class: 'eyebrow' }, 'Fiducia di Marta'), h('b', null, String(run.mgr))), h('div', null, h('span', { class: 'eyebrow' }, 'Reputazione'), h('b', null, String(run.rep)))) : null,
        (S.fcLines || []).length ? h('div', { class: 'ls', style: { marginTop: '12px' } }, S.fcLines.map((l) => h('p', { class: l.tone === 'warn' ? '' : 'bad', style: l.tone === 'warn' ? { background: 'var(--warn-tint)' } : null }, l.text))) : null,
        h('div', { class: 'next', style: { marginTop: '14px' } }, h('button', { class: 'btn btn--primary btn--lg', 'data-next': '' }, 'Vai al riepilogo', UI.ic('next'))));
      area.replaceChildren(panel);
      panel.querySelector('[data-next]').focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await once(panel, '[data-next]');
      if (gone()) return;
      UI.endQuarter();
    }
    setTimeout(() => main().catch((err) => { if (g.console) console.error(err); }), 0);
    return root;
  };
})(typeof window !== 'undefined' ? window : globalThis);
