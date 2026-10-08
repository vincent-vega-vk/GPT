/* CLOSER · UI: home, regole, record, briefing */
(function (g) {
  'use strict';
  const CL = g.CL, UI = CL.ui, h = UI.h, S = UI.S, C = CL.CONFIG;

  UI.startCareer = () => {
    S.run = CL.newRun({ mode: 'career', hard: UI.settings.hard, name: UI.settings.name });
    S.deal = null;
    UI.go('briefing');
  };
  UI.startTrain = () => {
    S.run = CL.newRun({ mode: 'train', hard: UI.settings.hard, name: UI.settings.name });
    S.deal = null;
    UI.go('pipeline');
  };

  UI.howto = () => UI.modal((close) => h('div', null,
    h('header', null,
      h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, 'Regole'), h('h2', { class: 'display', style: { fontSize: '34px', marginTop: '6px' } }, 'Come si gioca')),
      h('button', { class: 'iconbtn', 'aria-label': 'Chiudi', onclick: close }, UI.ic('x'))),
    h('div', { class: 'body' },
      h('p', { class: 'muted' }, 'Sei un Account Executive di Nexora, software enterprise. Hai 13 settimane per raggiungere la quota. Vedi tutto con i tuoi occhi: ogni trattativa è una scena in prima persona, e nessuna risposta è neutra.'),
      h('ol', { class: 'howto' },
        h('li', null, h('b', null, 'Scegli la mossa. '), 'Con i tasti 1–5 o con un clic. Dopo ogni scelta ricevi la conseguenza e la lezione. Le opzioni sono mescolate: la risposta giusta non sta mai nello stesso posto.'),
        h('li', null, h('b', null, 'Leggi il cruscotto. '), 'Fiducia, Valore, Urgenza, Controllo e Rischio si muovono a ogni mossa. Il MEDDPICC mostra cosa sai davvero del deal. Dalla combinazione nasce la probabilità di chiusura: è un modello di gioco, non statistica reale.'),
        h('li', null, h('b', null, 'Gestisci le settimane. '), 'Ogni trattativa costa 2–3 settimane e non puoi giocarle tutte. Scegli quali meritano il tuo tempo, ispeziona il deal prima (è gratis) e abbi il coraggio di abbandonare i deal zombie.'),
        h('li', null, h('b', null, 'Usa i jolly con giudizio. '), 'Sales Engineer, Executive Sponsor, Referenza, Deal Desk, Legal: quantità limitate nel trimestre. Spesso c’è un’alternativa gratuita quasi altrettanto buona.'),
        h('li', null, h('b', null, 'Sconto e soglia LEP. '), 'Fino alla soglia LEP lo sconto è tuo. Oltre servono contropartite (give-get) o il Deal Desk. Senza approvazione il Deal Desk blocca lo sconto, e il cliente se ne accorge.'),
        h('li', null, h('b', null, 'Le scorciatoie costano. '), 'Promesse irrealistiche, omissioni, side letter e forecast gonfiati danno un vantaggio subito e un conto dopo: abbassano la Reputazione e a volte il deal stesso.'),
        h('li', null, h('b', null, 'Imprevisti e shock. '), 'Dentro le trattative può irrompere un imprevisto (un guasto, una telefonata, una notizia). Dopo, le trattative restano in sospeso fino al giorno di chiusura, quando un ultimo shock può cambiarne l’esito. Chi si è preparato (più contatti, paper pronto, piano condiviso) subisce poco; chi no, molto.'),
        h('li', null, h('b', null, 'Forecast con Marta. '), 'A metà trimestre e prima della chiusura Marta ti chiede un forecast e sfida le tue chiamate sui dati del tuo CRM. Franchezza e preparazione ti fanno guadagnare fiducia e aiuto; il bluff costa caro; chiamare basso per sorprendere è sandbagging.'),
        h('li', null, h('b', null, 'Commissione. '), `${Math.round(C.rate1 * 100)}% sul nuovo ACV fino alla quota, ${Math.round(C.rate2 * 100)}% oltre. La modalità “senza rete” (cruscotto nascosto) vale un +10%; un forecast affidabile vale fino a +8%.`)),
      h('p', { class: 'small faint mt-16' }, 'Tutti i nomi di aziende e persone sono fittizi. Scorciatoie da tastiera: 1–5 per scegliere, Invio per continuare, Esc per chiudere.')),
    h('footer', null, h('button', { class: 'btn btn--primary', 'data-autofocus': '', onclick: close }, 'Ho capito'))));

  UI.recordsModal = () => UI.modal((close) => {
    const rec = UI.records();
    const best = rec.runs.slice().sort((a, b) => b.att - a.att).slice(0, 5);
    return h('div', null,
      h('header', null,
        h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, 'Archivio'), h('h2', { class: 'display', style: { fontSize: '34px', marginTop: '6px' } }, 'Record e badge')),
        h('button', { class: 'iconbtn', 'aria-label': 'Chiudi', onclick: close }, UI.ic('x'))),
      h('div', { class: 'body' },
        h('h3', { class: 'eyebrow mt-8' }, 'Migliori trimestri'),
        best.length
          ? h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' },
            h('thead', null, h('tr', null, h('th', null, 'Data'), h('th', null, 'Titolo'), h('th', { class: 'r' }, 'Quota'), h('th', { class: 'r' }, 'Rep.'))),
            h('tbody', null, best.map((r) => h('tr', null, h('td', null, r.date), h('td', null, r.rank + (r.hard ? ' · senza rete' : '')), h('td', { class: 'r' }, Math.round(r.att * 100) + '%'), h('td', { class: 'r' }, r.rep))))))
          : h('p', { class: 'muted mt-8' }, 'Nessun trimestre completato. Il primo record è quello più facile da battere.'),
        h('h3', { class: 'eyebrow mt-24' }, 'Dojo delle obiezioni'),
        h('p', { class: 'muted mt-8' }, rec.dojo.best ? `Miglior punteggio: ${Math.round(rec.dojo.best * 100)}%` : 'Non ancora giocato.'),
        h('h3', { class: 'eyebrow mt-24' }, 'Badge'),
        h('div', { class: 'badges' }, CL.badgeDefs.map((b) => h('div', { class: 'badge' + (rec.badges[b.id] ? '' : ' off') },
          h('div', { class: 'ic' }, UI.ic(rec.badges[b.id] ? 'trophy' : 'lock')),
          h('div', null, h('b', null, b.name), h('small', null, b.desc)))))),
      h('footer', null,
        h('button', { class: 'btn btn--ghost btn--sm', onclick: () => { CL.store.write({ settings: UI.settings }); close(); UI.toast('Archivio azzerato'); } }, 'Azzera archivio'),
        h('div', { class: 'grow' }),
        h('button', { class: 'btn btn--primary', 'data-autofocus': '', onclick: close }, 'Chiudi')));
  });

  const toggle = (id, label, desc, key) => {
    const inp = h('input', { type: 'checkbox', id, onchange: (e) => { UI.settings[key] = e.target.checked; UI.saveSettings(); if (key === 'sound') { UI.syncTopbar(); UI.sfx('pick'); } } });
    inp.checked = !!UI.settings[key];
    return h('label', { class: 'toggle', for: id }, inp, h('span', { class: 'sw' }), h('span', null, h('b', null, label), h('small', null, desc)));
  };

  UI.screens.home = () => {
    const rec = UI.records();
    const best = rec.runs.slice().sort((a, b) => b.att - a.att)[0];
    const scCount = CL.scenarios.length;
    return h('main', { class: 'wrap' },
      h('section', { class: 'hero' },
        h('div', null,
          h('div', { class: 'eyebrow' }, 'Nexora · Enterprise Sales · Italia'),
          h('h1', { class: 'display', 'data-focus': '', style: { marginTop: '14px' } }, '13 settimane.', h('br'), h('em', null, 'Una quota.'), h('br'), 'Zero scuse.'),
          h('p', { class: 'sub' }, 'Sei un Account Executive di software enterprise. Discovery, champion, Economic Buyer, negoziazione, paper process: otto trattative vere, ognuna con le sue trappole. Scegli bene, o il conto arriva a fine trimestre.'),
          h('div', { class: 'row gap-12 wrapx mt-24' },
            h('button', { class: 'btn btn--primary btn--lg', onclick: UI.startCareer }, 'Inizia il trimestre', UI.ic('next')),
            h('button', { class: 'btn btn--lg', onclick: UI.startTrain }, 'Allenamento'))),
        h('aside', { class: 'sheet', 'aria-label': 'Foglio di quota' },
          h('div', { class: 'eyebrow' }, 'Foglio di quota · Q4'),
          h('dl', null,
            h('dt', null, 'Quota'), h('dd', null, CL.fmtK(C.quota) + ' di nuovo ACV'),
            h('dt', null, 'Tempo'), h('dd', null, `${C.weeks} settimane`),
            h('dt', null, 'Sul tavolo'), h('dd', null, `${scCount} trattative`),
            h('dt', null, 'Jolly'), h('dd', null, `${Object.values(CL.JOLLY).reduce((a, j) => a + j.start, 0)} in tutto`),
            h('dt', null, 'Commissione'), h('dd', null, `${Math.round(C.rate1 * 100)}% · ${Math.round(C.rate2 * 100)}% oltre quota`),
            h('dt', null, 'Miglior risultato'), h('dd', null, best ? `${Math.round(best.att * 100)}%` : '—')),
          h('div', { class: 'stampwrap' }, h('span', { class: 'stamp ' + (best && best.att >= 1 ? 'stamp--won' : 'stamp--disq') }, best ? best.rank : 'Da firmare')))),
      h('section', { class: 'modes', 'aria-label': 'Modalità di gioco' },
        h('button', { class: 'mode', onclick: UI.startCareer }, h('div', { class: 'eyebrow' }, 'Modalità principale'), h('h3', null, 'Il trimestre'), h('p', null, 'Otto trattative, settimane per giocarne quattro o cinque. Qualifica, scegli, rinuncia. Punteggio in quota, commissioni e reputazione.'), h('span', { class: 'go' }, 'Inizia', UI.ic('next'))),
        h('button', { class: 'mode', onclick: UI.startTrain }, h('div', { class: 'eyebrow' }, 'Una alla volta'), h('h3', null, 'Allenamento'), h('p', null, 'Scegli una trattativa e giocala con jolly illimitati, senza quota né orologio. Perfetto per imparare uno scenario.'), h('span', { class: 'go' }, 'Scegli lo scenario', UI.ic('next'))),
        h('button', { class: 'mode', onclick: () => UI.startDojo() }, h('div', { class: 'eyebrow' }, 'Riflessi'), h('h3', null, 'Dojo delle obiezioni'), h('p', null, 'Otto obiezioni lampo, quattro risposte ciascuna. Quale ascolta, chiarisce e riformula, e quale va subito in sconto?'), h('span', { class: 'go' }, 'Entra nel dojo', UI.ic('next')))),
      h('section', { class: 'card pad mt-24', 'aria-label': 'Impostazioni' },
        h('div', { class: 'eyebrow', style: { marginBottom: '14px' } }, 'Preferenze'),
        h('div', { class: 'settings' },
          h('div', { class: 'field' },
            h('label', { class: 'lbl', for: 'nm' }, 'Il tuo nome'),
            h('input', { type: 'text', id: 'nm', maxlength: '24', placeholder: 'Account Executive', value: UI.settings.name, autocomplete: 'nickname', oninput: (e) => { UI.settings.name = e.target.value.trim(); UI.saveSettings(); } })),
          toggle('t-hard', 'Senza rete', 'Cruscotto, probabilità e qualità delle mosse nascosti fino al verdetto. Commissione +10%.', 'hard'),
          toggle('t-timer', 'Pressione', 'Ogni decisione ha 30 secondi. Se scade, rispondi d’istinto: e di solito è la risposta peggiore.', 'timer'),
          toggle('t-wild', 'Imprevisti', 'Eventi casuali dentro le trattative e shock il giorno di chiusura. Spenti, il gioco è un percorso tutto tuo.', 'wild'),
          toggle('t-fast', 'Dialoghi rapidi', 'Le scene appaiono subito, senza il ritmo di lettura.', 'fast'),
          toggle('t-sound', 'Audio', 'Ambiente sonoro per scenario, squilli, timbri ed esiti.', 'sound')),
        h('div', { class: 'row gap-12 wrapx mt-24' },
          h('button', { class: 'btn btn--sm', onclick: UI.howto }, UI.ic('book'), 'Come si gioca'),
          h('button', { class: 'btn btn--sm', onclick: UI.recordsModal }, UI.ic('trophy'), 'Record e badge'))),
      h('p', { class: 'footer' }, 'Tutte le aziende, i nomi e le cifre di questo gioco sono di fantasia. Il modello di probabilità è una semplificazione didattica, non una previsione commerciale.'));
  };

  /* ───── Briefing del trimestre ───── */
  UI.screens.briefing = () => {
    const nm = UI.settings.name || 'benvenuto';
    return h('main', { class: 'wrap' },
      h('div', { class: 'sec-head' }, h('div', { class: 'grow' }, h('div', { class: 'eyebrow' }, 'Lunedì · settimana 1'), h('h1', { class: 'sec-title', 'data-focus': '', style: { marginTop: '8px' } }, 'Il tuo trimestre'))),
      h('section', { class: 'card pad' },
        h('div', { class: 'row gap-12', style: { alignItems: 'flex-start' } },
          UI.avatar({ name: 'Marta Colombo', hue: 348 }),
          h('div', null,
            h('div', { class: 'small' }, h('b', null, 'Marta Colombo'), h('span', { class: 'faint' }, '  ·  La tua Sales Director')),
            h('p', { style: { marginTop: '8px', fontSize: '16.5px', maxWidth: '68ch' } }, `Ciao ${nm}. Questo trimestre la quota è ${CL.fmtK(C.quota)} di nuovo ACV. Hai tredici settimane, ma tempo per lavorare bene quattro o cinque trattative, non tutte e otto. Scegli quelle che meritano le tue settimane, e quelle che no.`),
            h('p', { class: 'muted', style: { marginTop: '10px', maxWidth: '68ch' } }, 'Un consiglio: un “Commit” nel CRM non è un fatto, è un’opinione. Ispeziona un deal prima di investirci: costa zero.'))),
        h('div', { class: 'kv' },
          h('div', null, h('dt', null, 'Quota'), h('dd', null, CL.fmtK(C.quota))),
          h('div', null, h('dt', null, 'Settimane'), h('dd', null, C.weeks)),
          h('div', null, h('dt', null, 'Trattative'), h('dd', null, CL.scenarios.length)),
          h('div', null, h('dt', null, 'Commissione'), h('dd', null, `${Math.round(C.rate1 * 100)}% / ${Math.round(C.rate2 * 100)}%`)),
          h('div', null, h('dt', null, 'Modalità'), h('dd', null, UI.settings.hard ? 'Senza rete' : 'Con cruscotto'))),
        h('div', { class: 'mt-16' },
          h('div', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'I tuoi jolly per il trimestre'),
          h('div', { class: 'jollies' }, Object.keys(CL.JOLLY).map((k) => h('span', { class: 'jl', title: CL.JOLLY[k].desc }, UI.ic(k), CL.JOLLY[k].name, h('b', null, '×' + CL.JOLLY[k].start))))),
        h('div', { class: 'row gap-12 mt-24 wrapx' },
          h('button', { class: 'btn btn--primary btn--lg', onclick: () => UI.go('pipeline') }, 'Apri la pipeline', UI.ic('next')),
          h('button', { class: 'btn', onclick: UI.howto }, 'Rileggi le regole'))));
  };
})(typeof window !== 'undefined' ? window : globalThis);
