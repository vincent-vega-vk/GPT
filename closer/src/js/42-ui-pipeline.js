/* CLOSER · UI: pipeline, scheda trattativa, interludi, riepilogo del trimestre */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S, C = CL.CONFIG;

  const resultOf = (run, sc) => run.results.find((r) => r.id === sc.id);
  const STATUS_LABEL = { won: 'Vinto', lost: 'Perso', slip: 'Slitta', disq: 'Squalificato', pending: 'In firma' };
  const STATUS_CHIP = { won: 'chip--good', lost: 'chip--bad', slip: 'chip--warn', disq: '', pending: 'chip--accent' };

  UI.startDeal = (sc) => {
    S.sc = sc;
    const mem = CL.store.read().worlds || {};
    S.deal = CL.newDeal(sc, Object.assign(CL.dealOpts(S.run), { rnd: S.run.rnd, avoidWorld: mem[sc.id] }));   /* il mondo nascosto cambia da una partita all'altra */
    if (S.deal.world) CL.store.patch((o) => { o.worlds = Object.assign({}, o.worlds, { [sc.id]: S.deal.world }); });
    S.phase = 'choose';
    S.res = null;
    S.hints = 0;
    S.openDash = false;
    UI.go('play');
  };

  UI.nextAfterDeal = (afterMid) => {
    afterMid = afterMid === true;   /* i gestori di click passano l'evento: conta solo un true esplicito */
    const run = S.run;
    if (run.mode === 'career') {
      /* forecast call di metà trimestre: dalla settimana 6, una volta, se c'è qualcosa in sospeso */
      if (!afterMid && !run.fc.calls.mid && CL.week(run) >= 6 && run.results.some((r) => r.status === 'pending')) return UI.startForecast('mid');
      const ev = CL.pickEvent(run);
      if (ev) return UI.go('event', { ev, evDone: null });
      if (!CL.canPlayAny(run) && !CL.canWaitForAny(run)) return UI.finishQuarter();
    }
    UI.go('pipeline');
  };

  /* fine delle decisioni: commit call finale → giorno di chiusura → riepilogo */
  UI.finishQuarter = () => {
    const run = S.run;
    if (!run.fc.calls.final && run.results.some((r) => r.status === 'pending')) return UI.startForecast('final');
    UI.runClosing();
  };

  UI.endQuarter = () => {
    const run = S.run;
    S.sum = CL.summary(run);
    if (!run.saved) {
      run.saved = true;
      const dt = new Date();
      const date = dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
      S.newBadges = [];
      UI.saveRecords((rec) => {
        rec.runs.push({ date, att: S.sum.att, rank: S.sum.rank.name, rep: run.rep, hard: run.hard, fc: S.sum.fc ? S.sum.fc.acc : null });
        rec.runs = rec.runs.slice(-30);
        S.sum.badges.forEach((id) => { if (!rec.badges[id]) { rec.badges[id] = date; S.newBadges.push(id); } });
      });
    }
    UI.go('summary');
  };

  /* ───── Scheda trattativa (modale) ───── */
  UI.dealModal = (sc) => {
    const run = S.run;
    UI.modal((close) => {
      const root = h('div', null);
      const paint = () => {
        const av = CL.avail(run, sc);
        const free = run.free;
        const scouted = !!run.scouted[sc.id];
        root.replaceChildren(
          h('header', null,
            h('div', { class: 'grow' },
              h('div', { class: 'eyebrow' }, `${sc.client} · ${sc.sector}`),
              h('h2', { class: 'display', style: { fontSize: '38px', marginTop: '8px' } }, sc.label)),
            h('button', { class: 'iconbtn', 'aria-label': 'Chiudi', onclick: close }, UI.ic('x'))),
          h('div', { class: 'body' },
            h('p', { style: { fontSize: '16px' } }, sc.brief),
            h('dl', { class: 'kv' },
              h('div', null, h('dt', null, 'Listino ACV'), h('dd', null, CL.fmtK(sc.list))),
              h('div', null, h('dt', null, 'CRM dice'), h('dd', null, `${sc.crm.cat} · ${sc.crm.prob}%`)),
              free ? null : h('div', null, h('dt', null, 'Costo'), h('dd', null, `${sc.cost} settimane`)),
              free ? null : h('div', null, h('dt', null, 'Finestra'), h('dd', null, `Sett. ${sc.window[0]}–${sc.window[1]}`)),
              h('div', null, h('dt', null, 'Difficoltà'), h('dd', { class: 'stars', style: { fontSize: '15px' } }, UI.stars(sc.stars)))),
            h('div', { class: 'row gap-8 wrapx mt-16' }, h('span', { class: 'eyebrow' }, 'Cosa allena'), sc.teaches.map((t) => h('span', { class: 'chip' }, t))),
            scouted
              ? h('div', { class: 'note mt-16' }, h('b', null, 'Nota dal campo. '), sc.scout)
              : h('div', { class: 'mt-16 row gap-12 wrapx' },
                h('button', { class: 'btn btn--sm', onclick: () => { run.scouted[sc.id] = true; paint(); } }, UI.ic('search'), 'Ispeziona il deal (gratis)'),
                h('span', { class: 'small faint' }, 'Il CRM è un’opinione. La nota dal campo è un fatto.')),
            av.state === 'early' ? h('div', { class: 'note mt-16' }, h('b', null, 'Non ancora disponibile. '), `Si apre alla settimana ${av.from}; oggi è la ${CL.week(run)}.`) : null,
            av.state === 'expired' ? h('div', { class: 'note mt-16' }, h('b', null, 'Scaduto. '), `La finestra si è chiusa alla settimana ${av.until}.`) : null,
            av.state === 'poor' ? h('div', { class: 'note mt-16' }, h('b', null, 'Energia insufficiente. '), `Servono ${sc.cost} settimane, ne restano ${CL.energy(run)}.`) : null),
          h('footer', null,
            av.state === 'ready'
              ? h('button', { class: 'btn btn--primary', 'data-autofocus': '', onclick: () => { close(); UI.startDeal(sc); } }, free ? 'Avvia la trattativa' : `Avvia la trattativa (−${sc.cost} sett.)`, UI.ic('next'))
              : null,
            h('button', { class: 'btn', onclick: close }, 'Chiudi')));
      };
      paint();
      return root;
    });
  };

  /* ───── Pipeline ───── */
  UI.screens.pipeline = () => {
    const run = S.run, career = run.mode === 'career';
    const sum = CL.summary(run);
    const week = CL.week(run), energy = CL.energy(run);
    const pend = run.results.filter((r) => r.status === 'pending');
    const weighted = pend.reduce((a, r) => a + r.p * r.net, 0) + run.bonusAcv;
    const wAtt = weighted / C.quota;
    const list = CL.scenarios.slice().sort((a, b) => a.window[0] - b.window[0]);
    const scale = Math.max(1.5, wAtt * 1.05);

    const nextCall = !run.fc.calls.mid && week < 6 ? 'Forecast call alla settimana 6' : !run.fc.calls.mid ? 'Forecast call: dopo il prossimo deal' : 'Commit call a fine trimestre';
    const hud = career ? h('section', { class: 'hud', 'aria-label': 'Stato del trimestre' },
      h('div', { class: 'card pad-sm cell' },
        h('div', { class: 'eyebrow' }, run.hard ? 'In firma' : 'Forecast ponderato'),
        run.hard
          ? h('div', { class: 'big' }, `${pend.length} ${pend.length === 1 ? 'trattativa' : 'trattative'}`)
          : h('div', { class: 'big' }, CL.fmtK(weighted)),
        run.hard ? h('div', { class: 'track' }) : h('div', { class: 'trackwrap' },
          h('div', { class: 'track', role: 'img', 'aria-label': `Forecast ponderato al ${Math.round(wAtt * 100)}% della quota` }, h('i', { class: wAtt >= 1 ? 'over' : '', style: { width: Math.min(100, (wAtt / scale) * 100) + '%' } }), h('span', { class: 'mark', style: { left: (1 / scale) * 100 + '%' } })),
          h('span', { class: 'marklbl', style: { left: (1 / scale) * 100 + '%' } }, '100%')),
        h('div', { class: 'sub', style: { marginTop: run.hard ? '10px' : '18px' } }, run.hard ? `Quota ${CL.fmtK(C.quota)}. L’esito si saprà a fine trimestre.` : `${Math.round(wAtt * 100)}% di ${CL.fmtK(C.quota)} · si decide a fine trimestre`)),
      h('div', { class: 'card pad-sm cell' },
        h('div', { class: 'eyebrow' }, 'Tempo'),
        h('div', { class: 'big' }, `Sett. ${week}`),
        h('div', { class: 'track' }, h('i', { style: { width: Math.min(100, (run.spent / C.energy) * 100) + '%' } })),
        h('div', { class: 'sub' }, `${Math.max(0, energy)} ${Math.max(0, energy) === 1 ? 'settimana rimasta' : 'settimane rimaste'} su ${C.energy} · ${nextCall}`)),
      h('div', { class: 'card pad-sm cell' },
        h('div', { class: 'eyebrow' }, 'Jolly'),
        h('div', { class: 'jollies' }, Object.keys(CL.JOLLY).map((k) => h('span', { class: 'jl' + (run.jolly[k] ? '' : ' zero'), title: CL.JOLLY[k].desc }, UI.ic(k), CL.JOLLY[k].short, h('b', null, '×' + run.jolly[k])))),
        h('div', { class: 'sub' }, 'Quantità limitate: usali dove pesano.')),
      h('div', { class: 'card pad-sm cell' },
        h('div', { class: 'eyebrow' }, 'Reputazione · Marta'),
        h('div', { class: 'big' }, run.rep, h('small', { class: 'mono', style: { fontSize: '14px', marginLeft: '10px', color: 'var(--ink-3)' } }, 'Marta ' + run.mgr)),
        h('div', { class: 'track' }, h('i', { style: { width: run.rep + '%', background: run.rep < 40 ? 'var(--bad)' : run.rep < 70 ? 'var(--warn)' : 'var(--good)' } })),
        h('div', { class: 'sub' }, run.rep >= 80 ? 'Marta si fida del tuo forecast.' : run.rep >= 50 ? 'Nella media. Le scorciatoie si vedono.' : 'Sotto osservazione.'))) : null;

    const cal = career ? h('section', { class: 'card calendar', 'aria-label': 'Calendario del trimestre' },
      h('div', { class: 'eyebrow', style: { marginBottom: '10px' } }, 'Calendario: finestre di disponibilità'),
      h('div', { class: 'cal', role: 'img', 'aria-label': 'Finestre di disponibilità delle trattative per settimana' },
        h('span', null),
        Array.from({ length: C.weeks }, (_, i) => h('span', { class: 'wk' + (i + 1 === week ? ' now' : '') }, i + 1)),
        list.map((sc) => {
          const r = resultOf(run, sc);
          return [
            h('span', { class: 'nm', title: sc.client }, sc.label),
            Array.from({ length: C.weeks }, (_, i) => {
              const w = i + 1, inside = w >= sc.window[0] && w <= sc.window[1];
              const cls = ['cell'];
              if (inside) { cls.push('in'); if (r) cls.push(r.status === 'won' ? 'won' : r.status === 'lost' ? 'lost' : r.status === 'slip' ? 'slip' : r.status === 'pending' ? 'pend' : 'done'); }
              if (w === sc.window[0]) cls.push('first');
              if (w === sc.window[1]) cls.push('last');
              if (w === week) cls.push('now');
              return h('span', { class: cls.join(' ') });
            }),
          ];
        }))) : null;

    const cards = list.map((sc) => {
      const av = CL.avail(run, sc), r = career ? resultOf(run, sc) : null;   /* in allenamento ogni scenario resta rigiocabile */
      let badge;
      if (r) badge = h('span', { class: 'chip ' + STATUS_CHIP[r.status] }, STATUS_LABEL[r.status] + (r.status === 'won' ? ' · ' + CL.fmtK(r.acv) : r.status === 'pending' ? ' · ' + CL.fmtK(r.net) : ''));
      else if (av.state === 'early') badge = h('span', { class: 'chip' }, UI.ic('lock'), `Dalla sett. ${av.from}`);
      else if (av.state === 'expired') badge = h('span', { class: 'chip chip--bad' }, 'Scaduto');
      else if (av.state === 'poor') badge = h('span', { class: 'chip chip--warn' }, 'Poca energia');
      else badge = h('span', { class: 'chip chip--accent' }, career ? 'Disponibile' : 'Gioca');
      const scouted = run.scouted[sc.id];
      const disabled = !!r;
      return h('button', { class: 'deal', disabled: disabled || null, onclick: () => UI.dealModal(sc), 'aria-label': `${sc.label}, ${sc.client}` },
        h('div', { class: 'top' }, h('div', { class: 'eyebrow' }, sc.sector), badge),
        h('h3', null, sc.label),
        h('div', { class: 'small muted' }, sc.client),
        h('p', { class: 'small', style: { color: 'var(--ink-2)' } }, sc.teaser),
        h('div', { class: 'row', style: { marginTop: 'auto', justifyContent: 'space-between', alignItems: 'flex-end' } },
          h('div', null, h('div', { class: 'eyebrow' }, 'Listino'), h('div', { class: 'acv' }, CL.fmtK(sc.list))),
          h('div', { class: 'meta', style: { justifyContent: 'flex-end' } },
            career ? h('span', { class: 'chip' }, UI.ic('clock'), `${sc.cost} sett.`) : null,
            h('span', { class: 'chip' }, h('span', { class: 'stars' }, UI.stars(sc.stars))))),
        h('div', { class: 'row gap-8 wrapx' },
          h('span', { class: 'chip' + (scouted && sc.crm.prob >= 80 ? ' chip--warn' : '') }, `CRM ${sc.crm.cat} ${sc.crm.prob}%`),
          scouted ? h('span', { class: 'chip chip--accent' }, UI.ic('search'), 'ispezionato') : null,
          career && !r && run.promised && run.promised[sc.id] ? h('span', { class: 'chip chip--warn', title: 'Hai promesso a Marta di lavorare questa trattativa: se non lo fai, costa reputazione e fiducia.' }, UI.ic('flag'), `Promessa a Marta · entro sett. ${run.promised[sc.id]}`) : null));
    });

    const noReady = !CL.canPlayAny(run);
    const actions = career ? h('div', { class: 'row gap-12 wrapx mt-24' },
      noReady && CL.canWaitForAny(run) ? h('button', { class: 'btn btn--primary', onclick: () => { CL.waitWeek(run); UI.go('pipeline'); } }, UI.ic('clock'), 'Aspetta una settimana (−1)') : null,
      h('button', { class: 'btn' + (noReady && !CL.canWaitForAny(run) ? ' btn--primary' : ''), onclick: () => UI.modal((close) => h('div', null,
        h('header', null, h('div', { class: 'grow' }, h('h3', { class: 'display', style: { fontSize: '30px' } }, 'Chiudere il trimestre?'))),
        h('div', { class: 'body' }, h('p', { class: 'muted' }, run.results.length ? 'Le trattative non giocate restano nel CRM del prossimo trimestre. Il risultato attuale diventa definitivo.' : 'Non hai giocato nessuna trattativa: il risultato sarà zero.')),
        h('footer', null,
          h('button', { class: 'btn btn--primary', onclick: () => { close(); UI.finishQuarter(); } }, 'Chiudi il trimestre'),
          h('button', { class: 'btn', 'data-autofocus': '', onclick: close }, 'Continua a lavorare')))) }, UI.ic('flag'), 'Chiudi il trimestre'),
      h('span', { class: 'small faint' }, noReady ? 'Nessuna trattativa giocabile adesso.' : '')) : h('div', { class: 'row gap-12 mt-24' }, h('button', { class: 'btn', onclick: () => UI.go('home') }, UI.ic('back'), 'Torna al menu'));

    return h('main', { class: 'wrap' },
      h('div', { class: 'sec-head' },
        h('div', { class: 'grow' },
          h('div', { class: 'eyebrow' }, career ? `Settimana ${week} di ${C.weeks}` : 'Allenamento · jolly illimitati'),
          h('h1', { class: 'sec-title', 'data-focus': '', style: { marginTop: '8px' } }, career ? 'Pipeline del trimestre' : 'Scegli una trattativa'),
          h('p', null, career ? 'Il CRM è ottimista per natura. Ispeziona prima di investire: ogni trattativa costa settimane che non tornano.' : 'Gioca uno scenario alla volta con jolly illimitati. Nessuna quota, nessun orologio: solo decisioni.'))),
      hud, cal,
      h('section', { class: 'deals', 'aria-label': 'Trattative' }, cards),
      actions);
  };

  /* ───── Interludio ───── */
  UI.screens.event = () => {
    const ev = S.ev;
    const cast = ev.cast || {};
    const done = S.evDone;
    if (S.evFor !== ev) { S.evFor = ev; S.evOrder = CL.shuffle(ev.choices, S.run.rnd); }   /* la migliore non sta sempre al primo posto */
    const hardEv = !!S.run.hard;
    return h('main', { class: 'wrap', style: { maxWidth: '780px' } },
      h('div', { class: 'sec-head' }, h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, 'Tra una trattativa e l’altra'), h('h1', { class: 'sec-title', 'data-focus': '', style: { marginTop: '8px' } }, ev.title))),
      h('section', { class: 'card stage' },
        h('div', { class: 'where' }, UI.ic('clock'), ev.where),
        UI.sceneEls(ev.scene, cast, null),
        done
          ? h('div', null,
            (() => {
              /* senza rete: niente reputazione né valutazione fino al verdetto; restano tempo, jolly ed esiti concreti */
              const log = hardEv ? done.log.filter((l) => !/reputazione|di partenza/.test(l)) : done.log;
              return h('div', { class: 'fb' }, h('div', { class: 'hd' }, log.length ? log.map((l) => h('span', { class: 'delta' }, l)) : h('span', { class: 'delta' }, hardEv ? 'scelta registrata' : 'nessun effetto')), h('div', { class: 'bd' }, h('p', null, hardEv ? 'Senza rete: la valutazione di questa scelta arriva con il riepilogo del trimestre.' : done.text), h('div', { style: { height: '12px' } })));
            })(),
            h('div', { class: 'next' }, h('button', { class: 'btn btn--primary', 'data-autofocus': '', onclick: () => { S.ev = null; S.evDone = null; if (!CL.canPlayAny(S.run) && !CL.canWaitForAny(S.run)) UI.finishQuarter(); else UI.go('pipeline'); } }, 'Continua', UI.ic('next'))))
          : h('div', { class: 'choices' }, S.evOrder.map((c, i) => h('button', { class: 'choice', onclick: () => { UI.sfx('pick'); S.evDone = CL.applyEvent(S.run, ev, c.id); UI.render(); } }, h('span', { class: 'k' }, i + 1), h('span', { class: 'tx' }, c.t))))));
  };

  /* ───── Riepilogo del trimestre ───── */
  const recapText = (run, sum) => {
    const euro = (k) => '€' + Math.round(k * 1000).toLocaleString('it-IT');
    const nm = UI.settings.name ? UI.settings.name + ' · ' : '';
    return [
      `CLOSER · ${nm}Trimestre chiuso al ${Math.round(sum.att * 100)}% della quota`,
      `${sum.rank.name} · Reputazione ${run.rep}${run.hard ? ' · senza rete' : ''}`,
      `ACV chiuso ${CL.fmtK(sum.total)} su ${CL.fmtK(C.quota)} · commissione stimata ${euro(sum.commission)}`,
      `${sum.wins} vinte · ${sum.losses} perse · ${sum.slips} slittate · ${sum.dq} squalificate`,
      `Sconto medio sulle vinte ${sum.avgDisc.toFixed(1).replace('.', ',')}% · qualità decisioni ${Math.round((sum.avgQ / 3) * 100)}%`,
      sum.fc && sum.fc.n ? `Affidabilità del forecast ${Math.round(sum.fc.acc * 100)}% · fiducia di Marta ${run.mgr}` : null,
    ].filter(Boolean).join('\n');
  };

  UI.screens.summary = () => {
    const run = S.run, sum = S.sum || CL.summary(run);
    const rec = UI.records();
    const stampCls = sum.att >= 1 ? 'stamp--won' : sum.att >= 0.7 ? 'stamp--slip' : 'stamp--lost';
    const euro = (k) => '€' + Math.round(k * 1000).toLocaleString('it-IT');
    const rows = run.results.map((r) => h('tr', null,
      h('td', null, h('b', null, r.label || r.title), h('div', { class: 'small faint' }, r.client + (r.label && r.label !== r.title ? ' · ' + r.title : '')), r.shock ? h('div', { class: 'small', style: { marginTop: '4px', color: r.shock.kind === 'pos' ? 'var(--good)' : r.shock.hit ? 'var(--bad)' : 'var(--ink-2)' } }, (r.shock.kind === 'pos' ? 'Fortuna: ' : r.shock.hit ? 'Colpito da: ' : 'Protetto da: ') + CL.fmt(r.shock.title, CL.getScenario(r.id))) : null),
      h('td', null, h('span', { class: 'chip ' + STATUS_CHIP[r.status] }, STATUS_LABEL[r.status])),
      h('td', { class: 'r mono' }, r.status === 'disq' ? '—' : CL.fmtK(r.listFinal || 0)),
      h('td', { class: 'r mono' }, r.status === 'disq' ? '—' : (r.disc || 0).toFixed(0) + '%'),
      h('td', { class: 'r mono' }, r.status === 'won' ? CL.fmtK(r.acv) : '—'),
      h('td', { class: 'r mono' }, r.status === 'disq' ? '—' : Math.round(r.p * 100) + '%')));
    run.bonusDeals.forEach((b) => rows.push(h('tr', null, h('td', null, h('b', null, b.label), h('div', { class: 'small faint' }, 'Interludio')), h('td', null, h('span', { class: 'chip chip--good' }, 'Vinto')), h('td', { class: 'r mono' }, '—'), h('td', { class: 'r mono' }, '—'), h('td', { class: 'r mono' }, CL.fmtK(b.acv)), h('td', { class: 'r mono' }, '—'))));
    const text = recapText(run, sum);

    return h('main', { class: 'wrap' },
      h('section', { class: 'card rank mt-24' },
        h('div', null,
          h('div', { class: 'eyebrow' }, `Esito del trimestre${UI.settings.name ? ' · ' + UI.settings.name : ''}`),
          h('h1', { class: 'display', 'data-focus': '', style: { marginTop: '10px' } }, sum.rank.name),
          h('p', { class: 'muted', style: { marginTop: '12px', fontSize: '17px', maxWidth: '52ch' } }, sum.rank.line)),
        h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '14px' } },
          h('div', { class: 'attain' }, Math.round(sum.att * 100) + '%'),
          h('span', { class: 'stamp anim ' + stampCls }, sum.att >= 1 ? 'Quota centrata' : sum.att >= 0.7 ? 'Quasi' : 'Sotto quota'))),
      h('dl', { class: 'stats' },
        h('div', { class: 'stat' }, h('dt', null, 'ACV chiuso'), h('dd', null, CL.fmtK(sum.total))),
        h('div', { class: 'stat' }, h('dt', null, 'Commissione'), h('dd', null, euro(sum.commission))),
        h('div', { class: 'stat' }, h('dt', null, 'Reputazione'), h('dd', null, run.rep, h('small', null, '/100'))),
        h('div', { class: 'stat' }, h('dt', null, 'Vinte / perse'), h('dd', null, `${sum.wins} / ${sum.losses}`, sum.slips ? h('small', null, `${sum.slips} slittate`) : null)),
        h('div', { class: 'stat' }, h('dt', null, 'Sconto medio'), h('dd', null, sum.avgDisc.toFixed(1).replace('.', ',') + '%')),
        h('div', { class: 'stat' }, h('dt', null, 'Qualità decisioni'), h('dd', null, Math.round((sum.avgQ / 3) * 100) + '%')),
        h('div', { class: 'stat' }, h('dt', null, 'MEDDPICC medio'), h('dd', null, sum.avgMp.toFixed(1).replace('.', ','), h('small', null, '/8'))),
        h('div', { class: 'stat' }, h('dt', null, 'Settimane usate'), h('dd', null, run.spent))),
      sum.fc && sum.fc.n ? h('section', { class: 'card pad mt-16' },
        h('div', { class: 'eyebrow' }, 'Forecast con Marta'),
        h('div', { class: 'row gap-24 wrapx', style: { marginTop: '10px', alignItems: 'flex-end' } },
          h('div', null, h('div', { class: 'attain', style: { fontSize: '64px' } }, Math.round(sum.fc.acc * 100) + '%'), h('div', { class: 'small muted' }, 'affidabilità del forecast')),
          h('p', { class: 'muted', style: { maxWidth: '56ch' } }, (() => {
            /* il testo segue ciò che il motore applica davvero (il kicker richiede almeno due trattative nel forecast) */
            const k = sum.kicker || 1, a = sum.fc.acc;
            if (k > 1.05) return 'Hai dichiarato ciò che poi è successo. Il forecast è il tuo biglietto da visita: Marta ti ha riconosciuto un bonus dell’8% sulla commissione.';
            if (k > 1) return 'Forecast solido, con qualche scarto. Bonus del 3% sulla commissione.';
            if (k < 1) return 'Il forecast è lontano dalla realtà: commissione ridotta dell’8% e credibilità da ricostruire.';
            if (sum.fc.n < 2) return a >= 0.7 ? 'Con una sola trattativa nel forecast Marta non applica né bonus né malus alla commissione: la tua credibilità conta dalla prossima volta.' : 'Con una sola trattativa nel forecast non c’è né bonus né malus sulla commissione, ma Marta ricorda quanto è andata lontana la chiamata.';
            return 'Forecast nella media: né un merito né un problema, finché non si ripete.';
          })())),
        sum.fc.sandbagged ? h('p', { class: 'small', style: { marginTop: '8px', color: 'var(--warn)' } }, 'Hai chiamato basso una trattativa che poi hai vinto. Sorprendere in alto non è un merito: è un dato nascosto.') : null) : null,
      (sum.shocksHit || sum.shocksAbsorbed) ? h('p', { class: 'small muted mt-16' }, `Il giorno di chiusura hai assorbito ${sum.shocksAbsorbed} shock negativi senza danni e ne hai subiti ${sum.shocksHit}. ${sum.shocksAbsorbed >= sum.shocksHit ? 'La preparazione paga.' : 'Più relazioni e più paper pronto, meno sorprese.'}`) : null,
      h('section', { class: 'card pad mt-16' },
        h('div', { class: 'eyebrow' }, 'Le tue trattative'),
        rows.length ? h('div', { class: 'tblwrap', style: { marginTop: '10px' } }, h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, 'Trattativa'), h('th', null, 'Esito'), h('th', { class: 'r' }, 'Listino'), h('th', { class: 'r' }, 'Sconto'), h('th', { class: 'r' }, 'ACV'), h('th', { class: 'r' }, 'Prob.'))),
          h('tbody', null, rows))) : h('p', { class: 'muted mt-8' }, 'Nessuna trattativa giocata.')),
      run.hard && run.results.some((r) => r.review && r.review.length) ? h('section', { class: 'card pad mt-16' },
        h('div', { class: 'eyebrow' }, 'La valutazione delle tue mosse'),
        h('p', { class: 'small muted', style: { margin: '6px 0 10px' } }, 'In “senza rete” resta nascosta fino al verdetto. Ora puoi rivederla, trattativa per trattativa.'),
        run.results.filter((r) => r.review && r.review.length).map((r) => {
          const scr = CL.getScenario(r.id), fm = (t) => CL.fmt(t, scr);
          return h('details', { class: 'rv' },
            h('summary', null, h('b', null, r.label || r.title), h('span', { class: 'chip ' + STATUS_CHIP[r.status] }, STATUS_LABEL[r.status])),
            h('ul', { class: 'rvl' }, r.review.map((m, i) => h('li', null,
              h('div', { class: 'rvh' }, h('span', { class: 'n mono' }, m.wild ? '!!' : String(i + 1).padStart(2, '0')), h('span', { class: 'tt' }, fm(m.say || m.t)), h('span', { class: 'q ' + CL.QUALITY[m.q].cls }, CL.QUALITY[m.q].label)),
              h('p', { class: 'small' }, fm(m.r)),
              m.tip ? h('p', { class: 'small muted' }, fm(m.tip)) : null))),
            (r.lessons || []).length ? h('div', { class: 'ls' }, r.lessons.map((l) => h('p', { class: l.good ? 'good' : 'bad' }, fm(l.t)))) : null);
        })) : null,
      h('section', { class: 'card pad mt-16' },
        h('div', { class: 'eyebrow' }, 'Badge'),
        h('div', { class: 'badges' }, CL.badgeDefs.map((b) => {
          const have = sum.badges.includes(b.id), isNew = (S.newBadges || []).includes(b.id), old = rec.badges[b.id];
          return h('div', { class: 'badge' + (isNew ? ' new' : have || old ? '' : ' off') },
            h('div', { class: 'ic' }, UI.ic(have || old ? 'trophy' : 'lock')),
            h('div', null, h('b', null, b.name, isNew ? '  · nuovo' : ''), h('small', null, b.desc)));
        }))),
      h('div', { class: 'row gap-12 wrapx mt-24' },
        h('button', { class: 'btn btn--primary btn--lg', onclick: UI.startCareer }, UI.ic('refresh'), 'Nuovo trimestre'),
        h('button', { class: 'btn', onclick: () => {
          const done = () => UI.toast('Riepilogo copiato negli appunti');
          try { navigator.clipboard.writeText(text).then(done, () => UI.showRecap(text)); } catch (e) { UI.showRecap(text); }
        } }, UI.ic('copy'), 'Copia riepilogo'),
        h('button', { class: 'btn', onclick: () => { S.run = null; UI.go('home'); } }, 'Home')),
      h('p', { class: 'footer' }, run.hard ? 'Modalità senza rete: commissione maggiorata del 10%.' : 'Prova la modalità “senza rete” dalla home: cruscotto nascosto e commissione +10%.'));
  };

  UI.showRecap = (text) => UI.modal((close) => h('div', null,
    h('header', null, h('div', { class: 'grow' }, h('h3', { class: 'display', style: { fontSize: '28px' } }, 'Riepilogo')), h('button', { class: 'iconbtn', 'aria-label': 'Chiudi', onclick: close }, UI.ic('x'))),
    h('div', { class: 'body' }, h('p', { class: 'small muted' }, 'Selezionalo e copialo:'), h('textarea', { readonly: true, rows: '6', style: { width: '100%', marginTop: '8px', font: '13px var(--font-mono)', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink)' }, 'data-autofocus': '', onfocus: (e) => e.target.select() }, text)),
    h('footer', null, h('button', { class: 'btn', onclick: close }, 'Chiudi'))));
})(typeof window !== 'undefined' ? window : globalThis);
