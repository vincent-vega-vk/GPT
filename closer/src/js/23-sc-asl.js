/* Scenario 4 · ASL Valle Serena · gara pubblica, consultazione di mercato, partner, correttezza
   v2: il palazzo dell’ASL, il corridoio con le bacheche, ogni parola con un numero di protocollo.
   Widget firma: registro di conformità (pubblico / riservato), calendario della gara, punteggio stimato 70/30. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    bellandi: { name: `Laura Bellandi`, role: `RUP · ASL Valle Serena`, hue: 20 },
    moro: { name: `Stefano Moro`, role: `AD di Sinergia IT · partner`, hue: 105 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
    fenu: { name: `Marco Fenu`, role: `Direttore Sistemi Informativi ASL`, hue: 215 },
    legale: { name: `Ilaria Corti`, role: `Legale Nexora`, hue: 300 },
  };

  /* storia della trattativa: nodi visitati, scelta fatta in un nodo, scelta fatta in un imprevisto.
     Tutti difensivi: i widget devono costruirsi anche su un deal vuoto (hist, flags, mp, m assenti). */
  const hist = (d) => (d && Array.isArray(d.hist) ? d.hist : []);
  const flagsOf = (d) => (d && d.flags) || {};
  const hasMp = (d, k) => !!(d && d.mp && typeof d.mp.has === 'function' && d.mp.has(k));
  const visited = (d, node) => hist(d).some((h) => h.node === node);
  const pick = (d, node) => { const h = hist(d).find((x) => x.node === node); return h ? h.id : null; };
  const wildPick = (d, id) => { const h = hist(d).find((x) => x.wild === id); return h ? h.id : null; };
  /* punteggio stimato (70 tecnico + 30 economico): lo usano il widget e la PEC di aggiudicazione, così i due non si contraddicono */
  const estimate = (d) => {
    d = d || {};
    const f = flagsOf(d);
    const c1 = pick(d, 'n1'), c2 = pick(d, 'n2'), c4 = pick(d, 'n4'), c5 = pick(d, 'n5');
    const n3 = visited(d, 'n3');
    const wi = wildPick(d, 'integrazioni'), wr = wildPick(d, 'rettifica'), wq = wildPick(d, 'quesito_vertex');
    /* tecnico, su 70: noi */
    let us = 30;
    us += ({ a: 1, b: 3, c: 4, d: -3 })[c1] || 0;
    us += ({ a: 3, b: 6, c: 1, d: -1 })[c2] || 0;
    if (n3) us += f.clarified ? 4 : -6;
    else if (f.clarified) us += 4;
    us += ({ a: 0, b: 11, c: 7, d: 8 })[c4] || 0;
    if (!c4 && f.techStrong) us += 11;
    /* criteri e metriche note: la commissione le premia (le stesse mosse le hanno acquisite) */
    if (hasMp(d, 'Dc')) us += 2;
    if (hasMp(d, 'M')) us += 3;
    if (wr === 'a') us += 2;
    if (wq) us += (f.clarified ? { a: 3, b: 1, c: -1, d: -2 } : { a: 1, b: 0, c: -1, d: -2 })[wq] || 0;
    if (wi) us += ({ a: 3, b: 1, c: -5, d: -2 })[wi] || 0;
    /* tecnico, su 70: Vertex, che si muove con le tue scelte */
    let vx = 54;
    if (c1 === 'd') vx += 3;
    if (c2 === 'a') vx += 5;
    if (n3) vx += f.clarified ? -4 : 4;
    else if (f.clarified) vx -= 4;
    if (wq) vx += f.clarified ? 2 : 3;
    /* economico, su 30: ribasso da 0 a 22% in proporzione, oltre il 22% punteggio pieno */
    const rib = d.disc || (c5 === 'a' ? 5 : 0);
    const ecoUs = c5 ? Math.round(30 * Math.min(1, rib / 22)) : 14;
    const ecoVx = 21;
    const clampTec = (x) => Math.max(0, Math.min(70, x));
    const tecUs = clampTec(us), tecVx = clampTec(vx);
    return { tecUs, tecVx, ecoUs, ecoVx, rib, priced: !!c5, total: { us: tecUs + ecoUs, them: tecVx + ecoVx, max: 100 } };
  };
  const chatM = (t, extra) => Object.assign({ chat: { from: 'marta', app: 'Teams' }, t }, extra || {});

  CL.registerScenario({
    id: 'asl',
    title: `La Gara`,
    client: `ASL Valle Serena`,
    sector: `Sanità pubblica · gara`,
    hook: `Quando il bando è pubblicato, le regole del gioco cambiano: vince chi le rispetta meglio.`,
    brief: `Sistema di logistica sanitaria e gestione scorte per sei presidi ospedalieri: €750k di ACV a listino, in gara pubblica con criterio dell’offerta economicamente più vantaggiosa. L’ASL ha aperto una consultazione preliminare di mercato. Il concorrente, Vertex Systems, è già fornitore di altre ASL della regione.`,
    scout: `L’unico momento in cui puoi incidere legittimamente è la consultazione: dopo la pubblicazione ogni contatto riservato col RUP è un rischio. Il partner locale più forte, Sinergia IT, ha anche un accordo di rivendita con Vertex.`,
    teaches: [`Gara pubblica`, `Par condicio`, `Partner e conflitti`, `Offerta tecnica vs prezzo`, `Condotta corretta`],
    list: 750, cost: 3, window: [3, 10], stars: 4, lep: 20, slip: 0.4, dqRefund: 1,
    noWild: ['davide_recalled'],   // imprevisti generici che stonano con questo scenario
    crm: { cat: `Best Case`, prob: 50 },
    cast: CAST,

    /* ───── identità: il palazzo dell’ASL, il protocollo, il verbale ───── */
    theme: {
      id: 'public', label: `ASL Valle Serena · sede della Direzione`, bg: 'public',
      accent: '#35506b', accentDark: '#9fb9d4', ambience: 'public',
      motto: `Ogni parola ha un numero di protocollo: pronuncia solo quelle che potresti rileggere davanti al TAR.`,
    },
    intro: {
      when: `Mercoledì · 09:40`, where: `ASL Valle Serena · ingresso`, view: 'walk',
      scene: [
        { n: `Parcheggi nel piazzale dei visitatori, tra un’ambulanza con il motore spento e una fila di utilitarie di familiari. Il palazzo dell’ASL Valle Serena è un blocco di cemento anni Settanta, finestre a nastro, un’insegna stinta dal sole. Sullo schermo del telefono c’è ancora la PEC arrivata ieri alle 19:12.` },
        { mail: { from: `ASL Valle Serena · Ufficio Protocollo (PEC)`, subj: `Avviso di consultazione preliminare di mercato · Prot. n. 0048211` }, t: `Si comunica la pubblicazione dell’avviso in oggetto. Gli operatori economici interessati sono invitati a partecipare alla seduta di consultazione. Quanto emerso sarà verbalizzato e il verbale pubblicato sul profilo del committente.`, sfx: 'ping' },
        { think: `Un avviso, non un bando. Nessun requisito è ancora scritto. Da qui in avanti ogni cosa che dico ha un numero di protocollo accanto.` },
        { n: `Dentro, l’aria sa di disinfettante e di caffè da distributore. Il corridoio è una teoria di bacheche in sughero: orari dei reparti, graduatorie, determine con la firma a penna blu. L’avviso è l’ultimo foglio della colonna, con il timbro rosso del protocollo. Lo leggerà chiunque passi di qui, concorrenti compresi.` },
        { w: 'davide', a: `a mezza voce, con la cartellina sotto il braccio`, t: `Sul foglio presenze siamo undici. Vertex ha firmato per primo, alle nove e dieci: era qui prima che aprissero il portone.` },
        { think: `Undici nomi sul foglio, undici idee di come scrivere la stessa gara. Una sola finirà nel capitolato.` },
        { n: `In fondo al corridoio, una porta a vetri con un cartello fotocopiato: “Consultazione preliminare di mercato · Sala riunioni 2”. Posi la mano sulla maniglia.`, sfx: 'door' },
      ],
    },

    /* ───── widget firma ───── */
    hud: [
      {
        type: 'checklist', title: `Registro di conformità`,
        build: (d) => {
          d = d || {};
          const f = flagsOf(d), has = (k) => hasMp(d, k);
          const c1 = pick(d, 'n1'), c2 = pick(d, 'n2'), c3 = pick(d, 'n3'), c4 = pick(d, 'n4'), c6 = pick(d, 'n6');
          const wq = wildPick(d, 'quesito_vertex'), wi = wildPick(d, 'integrazioni'), we = wildPick(d, 'pec_errore'), wr = wildPick(d, 'rettifica');
          const leak = c2 === 'a';
          const stained = !!(f.lobbied || f.backchannel || f.coffee);
          const standCall = c6 === 'b';
          /* offerta tecnica: lo stato di base, poi le integrazioni chieste dalla commissione */
          let tecSt = f.techStrong ? (c4 === 'c' ? 'warn' : 'done') : c4 ? 'bad' : 'todo';
          let tecNote = c4 === 'c' ? `Dispersiva: la commissione premia solo ciò che sa misurare.`
            : f.techStrong ? (has('M') ? `Pubblica. Migliorie misurabili, referenze verificabili.` : `Pubblica. Migliorie dichiarate, da verificare.`)
              : c4 ? `Minima: i 70 punti restano sul tavolo.`
                : `Pubblica. Ogni miglioria deve poter essere verificata.`;
          if (wi === 'c') { tecSt = 'bad'; tecNote = `Schede nuove in integrazione: stralciate, perché modificative dell’offerta.`; }
          else if (wi === 'd') { tecSt = 'warn'; tecNote = `Comprova consegnata in duecento pagine: la commissione dovrà cercarla.`; }
          else if (wi === 'a' && f.techStrong) tecNote = `Pubblica. Migliorie verificabili, comprova consegnata punto per punto.`;
          /* dossier: prima dello stand-still conta l’errore di PEC, se c’è stato; poi la condotta del termine dilatorio */
          let dosSt = c6 === 'a' ? 'done' : c6 === 'c' ? 'bad' : c6 ? 'warn' : 'todo';
          let dosNote = c6 === 'a' ? `Agli atti. Contributi, chiarimenti e PEC in ordine di protocollo.`
            : c6 === 'd' ? `Solo controllo delle comunicazioni: il fascicolo non è pronto.`
              : c6 === 'b' ? `Una telefonata di cortesia e nessun fascicolo pronto.`
                : c6 === 'c' ? `Incontro informale in stand-still: sarà prova di ingerenza.`
                  : `Agli atti. Verbali, chiarimenti e PEC, tutto con protocollo.`;
          if (!c6 && we === 'a') dosNote = `Agli atti. Verbali, chiarimenti e PEC, compresa quella che ha sostituito l’allegato sbagliato.`;
          else if (!c6 && we === 'b') dosNote = `Agli atti. La PEC di rimedio è partita il mattino dopo: una notte con l’allegato sbagliato in protocollo.`;
          else if (!c6 && (we === 'c' || we === 'd')) { dosSt = 'warn'; dosNote = `L’allegato sbagliato è ancora in protocollo, senza un atto scritto che lo sostituisca.`; }
          return [
            { k: 'cons', t: `Consultazione di mercato`,
              st: f.tailored ? 'bad' : c1 === 'd' ? 'warn' : c1 ? 'done' : 'todo',
              note: f.tailored ? `Pubblica. Requisiti su misura a verbale: Vertex li legge.`
                : c1 === 'd' ? `Pubblica. Nessun tuo contributo agli atti.`
                  : c1 === 'c' ? `Pubblica. Demo aperta a tutti, Davide citato nel verbale.`
                    : c1 ? `Pubblica. KPI e standard aperti a verbale.`
                      : `Pubblica. Il verbale lo leggono tutti i concorrenti.` },
            { k: 'partner', t: `Accordo con Sinergia IT`,
              st: leak ? 'bad' : c2 === 'b' ? 'done' : c2 ? 'warn' : 'todo',
              note: leak ? `Riservata. Firmato senza tutele: Vertex copia la tua impostazione.`
                : c2 === 'b' ? `Riservata. Esclusiva, riservatezza, nessun raggruppamento con Vertex.`
                  : c2 === 'c' ? `Riservata. Partner nazionale, nessuna presenza locale.`
                    : c2 === 'd' ? `Riservata. Nessun partner: il territorio è da costruire.`
                      : `Riservata. Tra privati, ma la gara deve restarne al riparo.` },
            { k: 'chiar', t: `Chiarimento formale`,
              st: f.clarified ? 'done' : visited(d, 'n3') ? (wq === 'a' ? 'warn' : 'bad') : 'todo',
              note: f.clarified ? (wr ? `Pubblico. Risposta per tutti, poi recepita nel testo rettificato.`
                : wq === 'a' ? `Pubblico. Risposta per tutti, più un quesito sulle modalità di prova.`
                  : `Pubblico. Risposta per tutti: soluzioni equivalenti ammesse.`)
                : visited(d, 'n3') ? (wq === 'a' ? `Quesito tardivo: il requisito per Vertex è confermato, ma la contestazione è agli atti.`
                  : `Nessun chiarimento: il requisito per Vertex è rimasto.`)
                  : `Pubblico. L’unico canale a bando aperto: 13 giorni.` },
            { k: 'rup', t: `Contatti riservati con il RUP`,
              st: stained ? 'bad' : standCall ? 'warn' : visited(d, 'n3') ? 'done' : 'todo',
              note: f.lobbied ? (c6 === 'c' && c3 !== 'a' ? `Riservata. Incontro informale in stand-still, tramite Moro: annotato dall’ASL.` : `Riservata. Contatto a bando aperto: annotato dall’ASL.`)
                : f.coffee ? `Riservata. Un caffè informale è un contatto, anche senza parlare di gara.`
                  : f.backchannel ? `Riservata. Un canale laterale fuori dal portale: è a verbale.`
                    : standCall ? `Riservata. Una telefonata “di cortesia” in stand-still: nessuna informazione, ma una traccia.`
                      : visited(d, 'n3') ? `Riservata. Nessun contatto registrato.`
                        : `Riservata. Ogni contatto fuori dal portale resta a verbale.` },
            { k: 'tec', t: `Offerta tecnica`, st: tecSt, note: tecNote },
            { k: 'dos', t: `Dossier di conformità`, st: dosSt, note: dosNote },
          ];
        },
      },
      {
        type: 'timeline', title: `Il calendario della gara`,
        build: (d) => {
          d = d || {};
          const f = flagsOf(d);
          const STEP = { n1: 0, n2: 0, n3: 1, n4: 2, n5: 3, n6: 4 };
          const at = STEP[d.node] != null ? STEP[d.node] : 0;
          const st = (i) => (i < at ? 'done' : i === at ? 'now' : 'todo');
          const rib = d.disc || (pick(d, 'n5') === 'a' ? 5 : 0);
          return {
            items: [
              { k: 't1', t: `Avviso`, label: `Consultazione di mercato e partner`, st: st(0) },
              { k: 't2', t: `13 giorni`, label: f.clarified ? `Chiarimenti: risposta pubblicata` : visited(d, 'n3') ? (wildPick(d, 'quesito_vertex') === 'a' ? `Chiarimenti: quesito tardivo agli atti` : `Chiarimenti: nessuna risposta`) : `Chiarimenti formali`, st: st(1) },
              { k: 't3', t: wildPick(d, 'rettifica') ? `37 giorni` : `30 giorni`, label: f.techStrong ? `Offerta tecnica: migliorie dichiarate` : visited(d, 'n4') ? `Offerta tecnica: essenziale` : `Offerta tecnica`, st: st(2) },
              { k: 't4', t: `48 ore`, label: rib ? `Offerta economica: ribasso ${rib}%` : `Offerta economica`, st: st(3) },
              { k: 't5', t: `35 giorni`, label: `Stand-still: finestra per i ricorsi`, st: st(4) },
            ],
          };
        },
      },
      {
        type: 'scoreboard', title: `Punteggio stimato`,
        build: (d) => {
          d = d || {};
          const f = flagsOf(d), e = estimate(d);
          return {
            labels: ['Nexora', 'Vertex'],
            rows: [
              { k: 'tec', label: `Offerta tecnica`, max: 70, us: e.tecUs, them: e.tecVx },
              { k: 'eco', label: `Offerta economica`, max: 30, us: e.ecoUs, them: e.ecoVx },
            ],
            total: e.total,
            caption: e.rib > 20 ? `Ribasso oltre il 20%: il punteggio c’è, ma scatta la verifica di anomalia.`
              : f.lobbied ? `Con un contatto riservato agli atti, il punteggio può non bastare.`
                : (f.backchannel || f.coffee) ? `Un contatto fuori dal portale non toglie punti, ma dà a Vertex un motivo di ricorso.`
                  : e.priced ? `Stima interna: la commissione decide, e un ricorso può ribaltare tutto.`
                    : `Stima interna: il prezzo non è ancora stato offerto.`,
          };
        },
      },
    ],

    start: { t: 42, v: 40, u: 48, c: 26, r: 46, have: ['I'] },
    caps: [
      { id: 'lobby', max: 0.12, if: (d) => d.flags.lobbied, why: `Hai avuto un contatto riservato con la RUP durante la procedura. Il ricorso di Vertex può escluderti dalla gara.` },
      { id: 'tailored', max: 0.35, if: (d) => d.flags.tailored, why: `Il tuo contributo “su misura” in consultazione è agli atti: il capitolato è facilmente impugnabile.` },
      { id: 'clarif', max: 0.45, if: (d) => !d.flags.clarified, why: `Il requisito che favorisce Vertex è rimasto. Senza un chiarimento formale, parti già escluso.` },
      { id: 'tech', max: 0.60, if: (d) => !d.flags.techStrong, why: `Hai un’offerta tecnica debole: nel criterio 70/30, la gara si vince sul punteggio tecnico.` },
    ],

    nodes: {
      /* ───────────── 1 · La consultazione: cinque minuti a verbale ───────────── */
      n1: {
        when: `Mercoledì · 10:05`, view: 'meeting',
        where: `Sala riunioni 2 · ASL Valle Serena`,
        scene: [
          { n: `Sala riunioni 2: un tavolo a ferro di cavallo, sedie in finta pelle, una lavagna che conserva i fantasmi di una riunione precedente. Undici operatori, undici cartelline. Davanti alla presidenza un registratore è acceso: la seduta sarà verbalizzata, e il verbale pubblicato.` },
          { n: `Laura Bellandi, la responsabile unica del procedimento (la RUP), apre con il foglio presenze in mano. Dietro di lei Marco Fenu, direttore dei Sistemi Informativi, scrive con una Bic. Il cartellino con il tuo nome è accanto a quello di Vertex Systems.` },
          { w: 'bellandi', a: `legge dal foglio, senza alzare la voce`, t: `Il dialogo con il mercato serve a scrivere un capitolato che permetta la più ampia partecipazione. Ogni operatore avrà lo stesso tempo e le stesse informazioni. Quanto verrà detto oggi sarà messo a verbale.` },
          { think: `È l’unico momento in cui posso parlare. E tutto quello che dico lo leggerà anche chi siede alla mia destra.` },
          { n: `Il rappresentante di Vertex ha steso davanti a sé tre fascicoli rilegati, copertine lucide. Sorride a tutti. A te per ultimo.` },
          { w: 'bellandi', a: `guardando l’elenco`, t: `Nexora. Ha cinque minuti.` },
          { think: `Cinque minuti, a verbale, per dire come dovrebbe essere scritta una gara da settecentocinquantamila euro.` },
        ],
        prompt: `Cinque minuti, a verbale. Come li usi?`,
        hint: `È l’unica finestra in cui puoi incidere in modo legittimo, e il verbale lo leggeranno tutti. C’è una linea che non si attraversa.`,
        tip: `Nella consultazione si portano contributi neutrali (esiti misurabili, standard aperti, KPI, suddivisione in lotti), non requisiti cuciti sul proprio prodotto. Un capitolato “su misura” è il modo più rapido per vedere la gara impugnata: vale la par condicio.`,
        choices: [
          ch('a', 0, `Porto tre requisiti tecnici precisi, maturati sul campo in altre installazioni: servono a evitare che il capitolato si fermi a una soluzione di livello inferiore.`,
            `Un requisito che solo il tuo prodotto soddisfa non è un contributo: è una gara cucita addosso a te. Il verbale è pubblico, i concorrenti lo leggeranno con la matita in mano, e il primo motivo di ricorso lo hai scritto tu.`,
            { t: -6, c: -2, r: 16 }, {
              integ: -10, set: { tailored: true }, next: 'n2',
              say: `Grazie, dottoressa. Dopo molte installazioni in strutture simili, ci sono tre requisiti che a nostro avviso un capitolato serio non dovrebbe omettere: la lettura a radiofrequenza di ogni confezione, la riconciliazione automatica di lotto e scadenza, un unico responsabile per l’intero sistema.`,
              react: [
                { w: 'bellandi', a: `annotando`, t: `La ringrazio. Il contributo viene acquisito agli atti così come presentato.` },
                { n: `Nella sala qualcuno smette di scrivere. Alla tua destra il rappresentante di Vertex segna una riga sul primo fascicolo, senza alzare gli occhi.` },
                { think: `Tre requisiti con il mio nome sopra. Qualcuno, a quel tavolo, li sta già ricopiando.` },
              ],
            }),
          ch('b', 3, `Porto un contributo sugli esiti: obiettivi di servizio misurabili (scorte, rotture, consegne), standard aperti, lotti per presidio, tempi di attivazione realistici.`,
            `Hai portato misure e standard che valgono per chiunque: è così che si plasma una gara senza forzarla. Alcuni tuoi KPI finiscono nel capitolato e ti sei fatto riconoscere come interlocutore serio, non come venditore.`,
            { t: 10, v: 8, u: 4, c: 10, r: -6 }, {
              mp: ['Dc', 'Dp'], next: 'n2',
              say: `Grazie, dottoressa. Suggerirei di scrivere il capitolato per obiettivi: scorte minime garantite, rotture di stock sotto una soglia, tempi di consegna ai reparti. Standard aperti per l’interoperabilità, perché nessun fornitore parta avvantaggiato. I lotti, per presidio, per favorire la partecipazione. E tempi di attivazione realistici: meglio un avvio graduale di una data impossibile.`,
              react: [
                { w: 'bellandi', a: `acquisisce`, t: `Contributo molto utile. Lo acquisisco agli atti.` },
                { w: 'fenu', a: `alza gli occhi dal quaderno`, t: `Sulle rotture di stock ci servirebbero dei valori di riferimento. Può trasmetterli per iscritto, attraverso il portale?` },
                { think: `Per iscritto, dal portale. Giusto: quello che propongo devono poterlo leggere tutti.` },
              ],
            }),
          ch('c', 3, `Porto Davide: un’architettura di riferimento aperta e una demo con dati sintetici, a disposizione di tutti gli operatori presenti alla consultazione.`,
            `Una demo su dati sintetici, aperta a tutti, mostra maturità senza dare a nessuno un vantaggio. Nel verbale Davide diventa l’interlocutore tecnico di riferimento: è visibilità guadagnata nel modo che la gara ammette.`,
            { t: 8, v: 10, c: 8, r: -8 }, {
              jolly: 'se', mp: ['Dc', 'Dp'], next: 'n2',
              say: `Con il permesso della presidenza, Davide Ferri, il nostro Solution Engineer, mostra un’architettura di riferimento aperta, su dati sintetici. La stessa sessione, alle stesse condizioni, è a disposizione di tutti gli operatori presenti.`,
              react: [
                { w: 'davide', a: `davanti alla lavagna ripulita`, t: `Dati sintetici, niente dell’ASL: chiunque può rifare la prova a casa sua. Le interfacce sono documentate sul nostro sito, accesso libero.` },
                { w: 'fenu', a: `scrivendo`, t: `Quindi le API sono pubbliche. Mi segno il nome.` },
                { n: `Bellandi si rivolge al verbalista, in tono piano: “Si dia atto che la sessione tecnica è stata aperta a tutti gli operatori”.` },
                { think: `Una demo che non ho riservato a nessuno. Nessuno potrà dire che ho avuto una corsia mia.` },
              ],
            }),
          ch('d', 1, `Non intervengo: ascolto gli altri operatori e mi riservo di partecipare al bando, quando sarà pubblicato, con le regole che ci saranno scritte, senza scoprire le carte.`,
            `Restare fuori dalla consultazione è rinunciare all’unica leva che la gara concede in modo legittimo: leggerai regole già scritte, senza aver potuto spiegare dove ti escludono.`,
            { v: -4, c: -6, r: 8 }, {
              next: 'n2',
              say: `Grazie, dottoressa, per ora ascolto. Parteciperò al bando quando sarà pubblicato.`,
              react: [
                { w: 'bellandi', t: `Prendo atto. Passiamo all’operatore successivo.` },
                { n: `Il rappresentante di Vertex si alza con i suoi tre fascicoli. Parla per cinque minuti esatti e li usa tutti.` },
                { think: `Sto guardando scrivere le regole di una gara a cui dovrò partecipare.` },
              ],
            }),
        ],
      },

      /* ───────────── 2 · Il partner con due cappelli ───────────── */
      n2: {
        when: `Martedì · 15:30`, view: 'meeting', bg: 'office',
        where: `Sede Sinergia IT · zona industriale`,
        scene: [
          { n: `Per assistere sei presidi in tre mesi serve qualcuno con i furgoni sul territorio, e il nome che circola è Sinergia IT. Zona industriale, a un quarto d’ora dall’ASL: una palazzina a vetri accanto a un capannone grigio, sul piazzale tre furgoni bianchi con la scritta “assistenza h24”. Stefano Moro, l’amministratore delegato, ti aspetta sulla porta e ti stringe la mano con tutte e due le sue.` },
          { n: `Il suo ufficio è una galleria di targhe e fotografie: Moro con il Presidente della Provincia, Moro davanti a una fila di server, un attestato incorniciato dopo l’altro. Sinergia ha vinto tre forniture nelle ASL vicine, e ogni vittoria ha la sua cornice.` },
          { w: 'moro', a: `sicuro di sé, versandoti il caffè`, t: `Guardi, il territorio io ce l’ho nel sangue. Quelli che vengono da fuori, in Valle Serena, il primo guasto lo cercano col navigatore. Noi siamo lì in venti minuti. Chiediamo l’esclusiva di zona e il diciotto per cento di margine sul servizio, e la gara è sua.` },
          { think: `Venti minuti. Il punteggio sulla presenza sul territorio è fatto di cose così. Ma esclusiva e diciotto per cento sono il prezzo di qualcosa che non mi ha ancora detto.` },
          { n: `Il telefono di Moro squilla. Esce nel corridoio e lo senti ridere: “Ci mancherebbe, dottore, ci vediamo senz’altro”. Davide si avvicina alla vetrinetta e abbassa la voce.` },
          { w: 'davide', a: `ti prende da parte, indicando l’ultima targa a destra`, t: `Leggi lì: “Vertex Systems · Partner autorizzato”. Sul loro sito c’è la stessa pagina. Rivendono anche per loro.` },
          { think: `Se firmo a occhi chiusi, la mia strategia di gara finisce in una palazzina dove c’è già il logo dell’altro.` },
          { n: `Moro rientra, rimette il cellulare nel taschino e ti guarda. Aspetta.` },
        ],
        prompt: `Come imposti l’accordo con Sinergia?`,
        hint: `Un partner con due cappelli è un rischio di riservatezza e di lealtà. Cosa metti per iscritto, prima di raccontargli qualcosa?`,
        tip: `Il partner locale pesa sul punteggio tecnico (presenza sul territorio, referenze). Ma uno con legami col concorrente è un rischio: tutelati con esclusiva di partecipazione, riservatezza scritta e obiettivi condivisi.`,
        choices: [
          ch('a', 0, `Firmo oggi alle sue condizioni: il territorio è decisivo e se aspetto Moro può accordarsi con Vertex. Le tutele le definiamo a rapporto avviato, con calma.`,
            `Hai condiviso la tua strategia con chi ha un piede nell’altra squadra senza un solo vincolo scritto. Il partner locale serve, ma la riservatezza si firma prima di raccontare, non dopo.`,
            { v: -2, c: -4, r: 14 }, {
              next: 'n3',
              say: `Stefano, ci sto. Mandi pure la bozza: firmiamo oggi, alle sue condizioni. Le garanzie le mettiamo a posto strada facendo.`,
              react: [
                { w: 'moro', a: `ti stringe di nuovo la mano`, t: `Lo sapevo che con lei si ragionava. Il timbro lo porto io, di persona.` },
                { n: `Firmi in due copie. Poi, per il resto del pomeriggio, apri a Moro la lavagna: lo schema di attivazione su due presidi pilota, i punti su cui pensi di spingere, i prezzi del servizio. Il timbro di Sinergia scende sul foglio con un tonfo.` },
                { n: `Una settimana dopo, a un tavolo tecnico, il rappresentante di Vertex presenta uno schema di attivazione su due presidi pilota. Lo conosci a memoria: l’hai disegnato tu.` },
                { think: `Qualcuno, da Sinergia, ha parlato. E non ho scritto niente che gli impedisse di farlo.` },
              ],
            }),
          ch('b', 3, `Firmo solo con esclusiva per questa gara, riservatezza scritta e divieto di raggruppamento col concorrente, in cambio del 15% sul servizio e di un co-marketing sul territorio.`,
            `Hai tenuto il partner locale e chiuso la porta di servizio: esclusiva, riservatezza e divieto di raggruppamento proteggono il vantaggio senza rinunciare al territorio. È un accordo che regge anche a una lettura ostile.`,
            { t: 4, v: 4, c: 10, r: -8 }, {
              mp: ['Co'], next: 'n3',
              say: `Stefano, il territorio è suo e lo voglio. Ma per questa gara mi servono tre cose per iscritto: esclusiva, riservatezza su tutto il materiale e il divieto di raggrupparsi con Vertex. In cambio le riconosco il quindici per cento sul servizio e un co-marketing sul territorio, con il suo nome accanto al nostro.`,
              react: [
                { w: 'moro', a: `una smorfia, poi una risata`, t: `Mi fa scegliere, eh? E va bene: questa gara vale più dell’opzione. Il quindici lo prendo.` },
                { n: `Mezz’ora dopo l’avvocato di Sinergia porta le clausole in tripla copia. Le firmate in piedi, appoggiati alla vetrinetta delle targhe.` },
                { think: `Gli costa un’opzione, e lo sa. Ma adesso so da che parte sta, e lo so per iscritto.` },
              ],
            }),
          ch('c', 1, `Rinuncio a Sinergia e cerco un partner di respiro nazionale: nessun legame con il concorrente, nessuna ambiguità di lealtà, una struttura già abituata alle gare pubbliche.`,
            `Hai eliminato il conflitto, ma anche l’unico partner con presenza sul territorio e referenze in zona: il punteggio tecnico ne risente, e il prezzo del servizio lievita.`,
            { v: -2, c: 2, r: -2 }, {
              next: 'n3',
              say: `Stefano, la ringrazio ma preferisco un’altra strada. Cerco un partner di respiro nazionale: meno legami locali, meno rischi.`,
              react: [
                { w: 'moro', a: `si rimette il telefono in tasca`, t: `Come vuole. Ma il territorio, in Valle Serena, non si trova nei cataloghi.` },
                { n: `Il partner nazionale risponde dopo due settimane: struttura eccellente, nessuna referenza presso l’ASL e un’offerta di servizio che sale di un terzo.` },
                { think: `Ho evitato un rischio e comprato un limite.` },
              ],
            }),
          ch('d', 1, `Vado da solo con un servizio diretto, senza terzi: nessun margine da cedere, nessun problema di riservatezza e il controllo di ogni intervento sul territorio.`,
            `Sei libero e riservato, ma costruire in tre mesi una presenza locale costa tempo e personale. Il punteggio sul territorio ne soffre: hai scelto di non dipendere da nessuno e di pagare la differenza.`,
            { v: -4, c: 4, r: 4 }, {
              next: 'n3',
              say: `Stefano, la ringrazio ma per questa gara faccio da solo: un servizio diretto, senza terzi.`,
              react: [
                { w: 'moro', a: `alza le spalle`, t: `Contento lei. Ma una presenza in tre mesi non si costruisce con una cartellina.` },
                { n: `Il mese dopo la tua scrivania si riempie di candidature per due tecnici di zona, del preventivo per un’officina in affitto e di quello per tre furgoni. Costi che nessuno aveva messo in conto.` },
                { think: `Nessun problema di fedeltà. Resta il problema di essere assenti.` },
              ],
            }),
        ],
      },

      /* ───────────── 3 · Il bando che ti esclude ───────────── */
      n3: {
        when: `Giorno 4 di 13 · 11:20`, view: 'desk',
        where: `La tua scrivania · disciplinare di gara`,
        scene: [
          { n: `Il bando è online da quattro giorni. Il disciplinare, stampato, è un blocco di centoquaranta pagine e ne hai evidenziate nove con il giallo. Sul secondo schermo il portale della gara: in alto un conto alla rovescia, “Termine per i chiarimenti: 9 giorni”.` },
          { n: `Tra i requisiti obbligatori, all’articolo 7.3, c’è un modulo certificato che oggi solo Vertex Systems possiede. I chiarimenti si chiudono tredici giorni dopo la pubblicazione, l’offerta va presentata entro trenta.` },
          { w: 'davide', a: `concentrato, con il dito sulla riga`, t: `Questo requisito non è funzionalmente necessario: lo stesso risultato si ottiene con standard aperti. Ma così com’è scritto, ci esclude.` },
          { think: `Sette righe di burocratese, e noi siamo fuori.` },
          { n: `Il telefono è a un palmo dalla tua mano. Il numero diretto della dottoressa Bellandi è in calce al disciplinare, a pochi centimetri dalla frase che dice come si comunica con l’ASL: tramite portale.` },
          { think: `Una telefonata sarebbe più rapida. Un ricorso farebbe più rumore. Non so quale delle due costi di più.` },
        ],
        prompt: `Come reagisci al requisito che ti esclude?`,
        hint: `Dopo la pubblicazione il canale è uno solo: le richieste di chiarimento formali e pubbliche. Ogni altra strada ha un costo.`,
        tip: `A bando pubblicato non si parla in privato col RUP: si usano i chiarimenti, pubblici e uguali per tutti, motivati su equivalenza funzionale e concorrenza. Un contatto riservato espone il tuo nome (e la gara) a contestazioni.`,
        choices: [
          ch('a', 0, `Chiamo la dottoressa Bellandi sul numero diretto: le spiego a voce che il requisito è sbagliato e che la gara rischia l’annullamento. Cinque minuti valgono dieci pagine.`,
            `A bando pubblicato non esistono telefonate “per capire”: quella riga di appunti sarà il primo documento che un avvocato di Vertex allegherà a un ricorso. Hai trasformato una ragione tecnica in una condotta contestabile.`,
            { t: -8, c: -6, r: 16 }, {
              integ: -12, set: { lobbied: true }, next: 'n4',
              say: `Dottoressa Bellandi, la disturbo sul numero diretto: l’articolo 7.3 mi pare sbagliato, e se resta così la gara rischia di essere annullata. Volevo spiegarglielo prima che diventi un problema per tutti.`,
              react: [
                { w: 'bellandi', a: `gelida, dopo un silenzio`, t: `Dopo la pubblicazione non posso avere interlocuzioni riservate. La invito a usare il canale dei chiarimenti.` },
                { n: `Il tono è quello di una voce registrata. Prima che la linea cada senti la dottoressa dettare a qualcuno: “Annoti. Telefonata, ore undici e quaranta, operatore Nexora”.` },
                { think: `Annotato, con data e ora. La prima cosa che ho fatto a bando aperto è stata quella che non si fa.` },
              ],
            }),
          ch('b', 3, `Presento una richiesta di chiarimento formale: chiedo di ammettere soluzioni funzionalmente equivalenti su standard aperti, motivando con concorrenza e proporzionalità.`,
            `Un chiarimento formale non è un favore: è una risposta pubblica, uguale per tutti. Aiuta anche Vertex, ma ti ha reso l’operatore che usa il canale giusto e ti ha riaperto la porta del requisito.`,
            { t: 6, v: 4, c: 10, r: -12 }, {
              mp: ['Dc'], set: { clarified: true }, next: 'n4',
              say: `Presento sul portale una richiesta di chiarimento: chiedo se all’articolo 7.3 siano ammesse soluzioni funzionalmente equivalenti, basate su standard aperti, a parità di risultato. La motivo con i principi di concorrenza e di proporzionalità: un requisito che solo un operatore soddisfa restringe il mercato senza una ragione tecnica.`,
              react: [
                { n: `Due giorni dopo, sul portale, compare la risposta: numerata, datata, visibile a tutti i concorrenti.` },
                { mail: { from: `Portale gara · Area chiarimenti`, subj: `Risposta al quesito n. 7` }, t: `In relazione al quesito, si precisa che sono ammesse soluzioni funzionalmente equivalenti, purché l’operatore dimostri il raggiungimento dei medesimi risultati. La presente risposta è pubblicata a beneficio di tutti gli operatori.` },
                { think: `Vale per tutti, anche per Vertex. Ma adesso il requisito non mi chiude più la porta, e io sono quello che ha chiesto bene.` },
              ],
            }),
          ch('c', 3, `Faccio scrivere alla nostra legale una richiesta di chiarimento puntuale, con riferimenti normativi e giurisprudenza, valutando con lei anche un’eventuale diffida a tutela.`,
            `Funziona e regge a qualunque lettura, ma costa un jolly: poteva bastare un chiarimento ben scritto da te e da Davide. La legale serve quando c’è da difendere un testo, non quando basta scriverne uno semplice.`,
            { t: 4, v: 4, c: 10, r: -14 }, {
              jolly: 'legal', mp: ['Dc'], set: { clarified: true }, next: 'n4',
              say: `Chiedo alla nostra legale di scrivere il quesito: puntuale, con i riferimenti normativi e la giurisprudenza sulla proporzionalità dei requisiti. E di tenersi pronta una diffida, da usare solo se serve.`,
              react: [
                { w: 'legale', a: `porgendoti quattro pagine rilegate`, t: `Ogni affermazione ha il suo riferimento. La diffida l’ho lasciata fuori: se serve la tiriamo fuori più avanti, per ora sarebbe solo rumore.` },
                { n: `Due giorni dopo il portale pubblica la risposta: soluzioni equivalenti ammesse, a condizione di dimostrarne i risultati.` },
                { think: `Quattro pagine blindate per un quesito che ne chiedeva due. Funziona. Resta da vedere se serviva.` },
              ],
            }),
          ch('d', 1, `Impugno subito il bando davanti al TAR: il requisito è illegittimo e un ricorso è il solo modo per farsi ascoltare davvero, senza aspettare risposte che non arriveranno.`,
            `Il ricorso è l’arma più grossa e si tiene per quando i chiarimenti non bastano. Usarlo per primo guasta il rapporto con l’ASL, non sospende nulla e dice a Vertex che sei con le spalle al muro.`,
            { t: -6, u: -6, c: -6, r: 8 }, {
              next: 'n4',
              say: `Presento ricorso al TAR contro il bando: l’articolo 7.3 è illegittimo, restringe la concorrenza senza una ragione tecnica. Non intendo aspettare.`,
              react: [
                { n: `La notifica parte via PEC, con la firma digitale della nostra legale. La risposta dell’ASL arriva il giorno dopo, di una riga.` },
                { w: 'bellandi', a: `per PEC`, t: `Si prende atto del ricorso. Si comunica che il procedimento di gara prosegue.` },
                { think: `Un ricorso notificato e una gara che prosegue come prima. Ho fatto il rumore più grosso che potevo, e non è cambiato niente.` },
              ],
            }),
        ],
      },

      /* ───────────── 4 · L’offerta tecnica: settanta punti ───────────── */
      n4: {
        when: `Giorno 15 · 09:30`, view: 'meeting', bg: 'office',
        where: `Sala gara · Nexora`,
        scene: [
          { n: `La sala gara è una stanza senza finestre al terzo piano di Nexora, con il condizionatore che rantola. Sul tavolo il disciplinare stampato, le griglie di valutazione, tre caffè già freddi e un quaderno a quadretti.` },
          { n: `Criterio: offerta economicamente più vantaggiosa. Settanta punti all’offerta tecnica, trenta al prezzo. Il tecnico premia le migliorie misurabili: formazione, presenza sul territorio, tempi di attivazione, referenze.` },
          { if: (d) => d.flags.clarified, n: `Dopo il chiarimento sul portale l’equivalenza funzionale è ammessa, e Davide ha segnato in verde la riga che prima era rossa.` },
          { if: (d) => !d.flags.clarified, n: `Il modulo certificato dell’articolo 7.3 è ancora lì, cerchiato in rosso. Davide lo ha ripassato due volte con il pennarello e non ha detto una parola: se la commissione lo applica alla lettera, il tecnico non lo leggerà nemmeno.` },
          { w: 'davide', a: `davanti alla lavagna, il pennarello in mano`, t: `Il budget ci permette di investire in poche migliorie, non in tutte. Dobbiamo scegliere dove farci notare.` },
          { think: `Settanta punti contro trenta. Eppure il mio istinto, ogni volta, corre ai trenta.` },
        ],
        prompt: `Dove concentri l’offerta tecnica?`,
        hint: `Il 70% dei punti non si vince con il prezzo. Cosa può misurare, davvero, la commissione?`,
        tip: `Nel criterio dell’offerta economicamente più vantaggiosa ciò che distingue è la qualità dell’offerta tecnica: migliorie misurabili, referenze verificabili, un piano di attivazione credibile. Il prezzo pesa meno di quanto ti viene istintivo pensare.`,
        choices: [
          ch('a', 0, `Tengo il tecnico essenziale e investo sul prezzo: se siamo i più bassi, i 30 punti economici sono nostri e la commissione ha un confronto semplice da fare.`,
            `Tecnico minimo e prezzo spinto ti tolgono sul 70% quello che speri di guadagnare sul 30%. Un prezzo troppo basso, per di più, espone al sospetto di offerta anomala e ti consuma ogni margine.`,
            { v: -6, c: -2, r: 10 }, {
              next: 'n5',
              say: `Davide, sul tecnico facciamo l’essenziale. I punti li prendiamo sul prezzo: dobbiamo essere i più bassi di tutti.`,
              react: [
                { w: 'davide', a: `posa il pennarello`, t: `Come vuoi. Allora il piano di attivazione sono quattro cartelle e un servizio standard, e stanotte rifacciamo i conti sul prezzo.` },
                { think: `Sto per giocarmi il settanta per cento della gara per rincorrere il trenta.` },
              ],
            }),
          ch('b', 3, `Concentro l’offerta sulle migliorie che pesano: attivazione in 90 giorni su due presidi pilota, formazione certificata, presenza locale h24, tre referenze verificabili.`,
            `Sei andato dove la griglia dà punti: poche migliorie, ciascuna misurabile e verificabile. La commissione sa leggerle e tu sai difenderle, riga per riga.`,
            { t: 6, v: 14, u: 4, c: 8, r: -6 }, {
              mp: ['M'], set: { techStrong: true }, next: 'n5',
              say: `Davide, mettiamo tutte le risorse su quattro cose: un piano di attivazione in novanta giorni su due presidi pilota, la formazione certificata del personale, un presidio locale h24 e tre referenze sanitarie che la commissione possa verificare.`,
              react: (d) => [
                { w: 'davide', a: `scrive sulla lavagna`, t: `Ogni riga con un numero, un responsabile, una prova. Niente aggettivi: la commissione non assegna punti agli aggettivi.` },
                ['a', 'b'].includes(pick(d, 'n2'))
                  ? { n: `Moro manda le schede del presidio h24 con i nomi dei tecnici e le targhe dei furgoni. Per due settimane la sala gara non si svuota mai.` }
                  : { n: `Per due settimane la sala gara non si svuota mai: i turni del presidio h24 li scrivete voi, uno per uno, con i nomi.` },
                { think: `Il documento che esce è denso, verificabile, senza una promessa vaga. Su almeno tre criteri so di poter prendere il punteggio pieno.` },
              ],
            }),
          ch('c', 2, `Metto sul tavolo tutte le migliorie che riusciamo a immaginare, anche le più costose: la commissione deve vedere quanto siamo disposti a dare a questa ASL.`,
            `La commissione non premia ciò che non sa misurare: ventidue migliorie su cui nessuno può fare il conto diluiscono le sei che contano, e il costo lo paghi tu.`,
            { v: 4, c: 2, r: 2 }, {
              set: { techStrong: true }, next: 'n5',
              say: `Davide, mettiamo dentro tutto: ogni miglioria possibile, anche quelle che ci costano. Meglio abbondare che far vedere che ci siamo risparmiati.`,
              react: [
                { w: 'davide', a: `contando le righe sulla lavagna`, t: `Sono ventidue migliorie. La commissione ne saprà misurare sei, forse sette. Sulle altre sedici paghiamo e basta.` },
                { think: `Ho appena chiamato generosità un modo di non scegliere.` },
              ],
            }),
          ch('d', 3, `Organizzo la verifica diretta di tre nostre referenze: visite ai presidi dei clienti e attestazioni di buona esecuzione che la commissione può riscontrare di persona.`,
            `Le referenze verificabili dalla commissione pesano nel punteggio e rafforzano la credibilità: chi può telefonare ai tuoi clienti non ha bisogno di fidarsi delle tue slide. Una mossa solida e istituzionale.`,
            { t: 8, v: 10, c: 4, r: -6 }, {
              jolly: 'ref', mp: ['M'], set: { techStrong: true }, next: 'n5',
              say: `Davide, facciamo una cosa diversa: porto tre referenze e le rendo verificabili. Visita ai presidi dei clienti, colloquio con il personale, attestazione di buona esecuzione. La commissione potrà riscontrare tutto di persona.`,
              react: [
                { n: `I tre clienti rispondono in due giorni. Nell’offerta ci saranno i nomi dei direttori e le date delle visite: la commissione, se vuole, può telefonare.` },
                { w: 'davide', a: `rileggendo le attestazioni`, t: `Non c’è un aggettivo senza un timbro accanto. È la parte del documento che nessuno potrà contestare.` },
                { think: `Questa è la parte che non dovrò difendere: si difende da sola.` },
              ],
            }),
        ],
      },

      /* ───────────── 5 · La busta economica ───────────── */
      n5: {
        when: `Due giorni alla scadenza · 20:15`, view: 'desk', bg: 'night',
        where: `La tua scrivania · busta economica`,
        scene: [
          { n: `Le otto passate. L’ufficio si è svuotato, il piano ha le luci a metà e i corridoi si accendono solo al tuo passaggio. Sul portale la busta economica: un solo campo da compilare, la percentuale di ribasso sul listino. Sotto, un bottone grigio: “Firma e invia”. In alto, un conto alla rovescia: 47:52:10.` },
          { n: `L’offerta economica si presenta una volta sola. Niente secondo round, niente rilanci: le buste si aprono in seduta pubblica, davanti a tutti i concorrenti.` },
          { w: 'davide', a: `gira lo schermo, con il foglio di calcolo aperto`, t: `Con questo perimetro il margine regge fino a circa il 20% sul listino. Oltre, ogni imprevisto in attivazione diventa una perdita.` },
          { n: `Sul foglio di Davide una curva sale ripida fino al venti per cento e poi si appiattisce. Poco oltre, una riga rossa: “soglia di anomalia”.` },
          { if: (d) => d.flags.techStrong, think: `Ho un tecnico solido: il prezzo non deve comprare la gara. Deve soltanto non perderla.` },
          { if: (d) => !d.flags.techStrong, think: `Il tecnico è debole, e la tentazione di compensare con il prezzo è fortissima.` },
          { think: `Non so cosa offrirà Vertex. Nessuno lo sa: è questo il punto. Ogni punto in più lo pago io, ogni punto in meno lo regalo a loro.` },
        ],
        prompt: `Quale ribasso offri?`,
        hint: `Il 30% di punteggio economico non vale un margine azzerato. Ma un ribasso timido regala punti.`,
        tip: `In gara il prezzo si congela alla consegna. Scegli il ribasso che dà un punteggio competitivo senza avvicinarti alla soglia di anomalia né al limite del tuo margine.`,
        choices: [
          ch('a', 1, `Offro un ribasso del 5%: un prezzo che protegge il margine, senza esporci a verifiche né a sorprese in attivazione.`,
            `Prudente e redditizio, ma con il 5% il punteggio economico è basso e regali a Vertex un vantaggio facile: gli basta offrire poco più di te per passarti su una categoria che potevi presidiare.`,
            { c: -2 }, {
              next: 'n6',
              say: `Inserisco cinque per cento. Firmo e invio.`,
              react: [
                { n: `Il portale restituisce la ricevuta con numero di protocollo e ora: 20:31. Il bottone diventa verde, poi di nuovo grigio. Non si può più cambiare.` },
                { w: 'davide', a: `con un mezzo sorriso`, t: `Margine bello pieno. Se Vertex scende di dieci punti, ce lo teniamo da soli.` },
                { think: `Ho protetto il margine di un contratto che forse non firmerò.` },
              ],
            }),
          ch('b', 3, `Offro un ribasso del 12%: prendo una quota solida dei trenta punti senza intaccare il margine che serve per l’attivazione.`,
            `Competitivo e sostenibile: hai preso un buon punteggio economico e tenuto una riserva di margine per gli imprevisti. È il numero che puoi difendere anche dopo la firma.`,
            { c: 4, r: -2, d: 12 }, {
              next: 'n6',
              say: `Inserisco dodici per cento. Il resto del margine è la nostra riserva per l’attivazione.`,
              react: [
                { n: `Il portale chiede conferma. Rileggi il numero tre volte, come si rilegge un IBAN. Poi invii.` },
                { w: 'davide', a: `ricontrollando il foglio`, t: `Dodici. Quando apriamo il primo presidio, i conti tornano ancora: l’ho provato con tre ipotesi di ritardo.` },
                { think: `Non è il numero più basso e non è il più alto. È il più difendibile.` },
              ],
            }),
          ch('c', 2, `Offro un ribasso del 20%: porto il punteggio economico quasi al massimo, spingendomi fino al limite del nostro margine.`,
            `Punteggio economico quasi pieno, ma sei al limite: ogni imprevisto in attivazione si trasforma in perdita. Funziona solo se il tecnico regge e nulla va storto.`,
            { r: 4, d: 20 }, {
              next: 'n6',
              say: `Metto venti per cento. È il massimo che il margine regge: da lì in poi non scendo.`,
              react: [
                { w: 'davide', a: `appoggiandosi allo schienale`, t: `Venti è esattamente la riga che avevo segnato. Da lì in poi non abbiamo più un euro di scorta.` },
                { n: `La ricevuta arriva alle 20:44. Il margine è un filo teso in una stanza vuota.` },
                { think: `Se l’attivazione di un solo presidio va storta, la differenza la pago io.` },
              ],
            }),
          ch('d', 0, `Offro un ribasso del 32%: con un prezzo così nessuno può starci dietro, e i costi li recuperiamo in attivazione e nel servizio.`,
            `Oltre il 20% la commissione apre la verifica di anomalia: dovrai giustificare costi e margini, voce per voce. E anche se vinci, il progetto parte in perdita: un prezzo così non è una strategia, è una scommessa.`,
            { v: -6, c: -4, r: 14, d: 32 }, {
              next: 'n6',
              say: `Trentadue per cento. Con un prezzo così nessuno può starci dietro: i costi li recuperiamo in attivazione e nel servizio.`,
              react: [
                { w: 'davide', a: `si ferma con la penna a mezz’aria`, t: `Trentadue? Questo non è un prezzo, è un’ipotesi. Ogni sistemazione in attivazione la paghiamo di tasca nostra.` },
                { n: `Il campo diventa rosso e compare un avviso: “L’offerta potrà essere sottoposta a verifica di congruità”. Confermi. Invii.` },
                { think: `Mi sono comprato i punti con il margine. Adesso dovrò dimostrare che il numero è onesto.` },
              ],
            }),
        ],
      },

      /* ───────────── 6 · Lo stand-still ───────────── */
      n6: {
        when: `Giorno 1 di 35 · 08:50`, view: 'phone', caption: `Teams · chat`,
        where: `Al bar · la PEC`,
        scene: (d) => [
          { n: `La PEC arriva alle 08:50, mentre sei in fila al bar sotto l’ufficio. Il barista chiama un nome che non è il tuo. Apri l’allegato col pollice, in piedi, il cappuccino che si raffredda sul banco.` },
          { mail: { from: `ASL Valle Serena · Ufficio Gare (PEC)`, subj: `Comunicazione di aggiudicazione · avvio del termine dilatorio` }, t: `Si comunica che la commissione giudicatrice ha concluso i propri lavori. La graduatoria è pubblicata sul portale${(() => { const e = estimate(d).total; return e.us - e.them >= -10 ? `: i primi due concorrenti sono separati da pochi punti` : ''; })()}. Il contratto non potrà essere stipulato prima della scadenza del termine dilatorio di 35 giorni.`, sfx: 'ping' },
          { chat: { from: 'davide', app: 'Teams' }, t: `Sono le 11:20. Sul portale c’è un’istanza di accesso agli atti dello studio che segue Vertex: chiedono i verbali, i chiarimenti e ogni comunicazione fra l’ASL e noi.`, sfx: 'ping' },
          { if: (d) => d.flags.lobbied, n: `Ogni comunicazione, quindi anche la tua telefonata alla RUP del giorno 4: ha una data, un’ora e una durata.` },
          { if: (d) => d.flags.tailored, n: `Tra i verbali richiesti c’è quello della consultazione, con i tuoi tre requisiti nero su bianco.` },
          { if: (d) => (d.flags.backchannel || d.flags.coffee) && !d.flags.lobbied, n: `“Anche informali”, specifica l’istanza. Chi scrive così sa già dove cercare.` },
          { if: (d) => !d.flags.lobbied && !d.flags.tailored && !d.flags.backchannel && !d.flags.coffee, n: `Per ora è carta: la mossa di chi valuta un ricorso, non ancora un’accusa.` },
          chatM(`Ho visto la graduatoria. Trentacinque giorni in cui nessuno festeggia e nessuno telefona in ASL, nemmeno per salutare. Dimmi cosa fai nel frattempo.`, { sfx: 'ping' }),
          { think: `La gara non è di nessuno finché il termine non scade. Quello che faccio, o non faccio, finirà in un fascicolo.` },
        ],
        prompt: `Nel periodo di stand-still, cosa fai?`,
        hint: `Dopo l’aggiudicazione c’è un periodo in cui si può ancora impugnare: tieni la condotta pulita e documentata.`,
        tip: `Nel periodo sensibile contano la trasparenza e la documentazione. Un dossier di conformità, ordinato e completo, è la tua migliore difesa; una telefonata “per sapere come va” può diventare un problema.`,
        choices: [
          ch('a', 3, `Preparo il dossier di conformità con verbali, chiarimenti e comunicazioni ufficiali, e in parallelo il piano di avvio, senza mai toccare la valutazione.`,
            `Il fascicolo è la tua migliore difesa: non è fatto di opinioni ma di protocolli. Preparare l’avvio senza toccare la valutazione dimostra che sai distinguere ciò che è tuo da ciò che è dell’ASL.`,
            { c: 8, u: 4, r: -12 }, {
              mp: ['P'], next: 'END',
              say: `Mi metto al lavoro su due fronti. Primo, un dossier con tutto quello che è agli atti, in ordine di protocollo: verbali, quesiti e risposte, comunicazioni ufficiali, la PEC di oggi. Secondo, il piano di avvio sui due presidi pilota, pronto quando l’ASL lo chiederà. Alla valutazione non tocco nulla.`,
              react: [
                { w: 'davide', a: `posa una risma di fogli numerati sulla scrivania`, t: `Indice, protocollo, data, ora. Ogni documento ha il suo numero e il suo timbro. Se ne manca uno, lo vedo subito.` },
                { n: `A metà del termine l’ASL consegna allo studio di Vertex le copie degli atti richiesti. Con quelle in mano scriveranno i loro motivi: la nostra legale, intanto, apre la cartella condivisa, scorre l’indice, la richiude.` },
                { w: 'legale', a: `senza alzare lo sguardo`, t: `Nessun rilievo. Ogni passaggio è documentato, e nessuno è passato fuori dal portale.`, if: (d) => !d.flags.lobbied && !d.flags.tailored && !d.flags.backchannel && !d.flags.coffee },
                { w: 'legale', a: `senza alzare lo sguardo`, t: `Tutto in ordine, tranne il contributo in consultazione. Lo difenderemo per ciò che è, un intervento pubblico, ma partiamo in salita.`, if: (d) => d.flags.tailored && !d.flags.lobbied },
                { w: 'legale', a: `senza alzare lo sguardo`, t: `Tutto documentato, e questo aiuta. Ma la telefonata a bando aperto non posso toglierla dal fascicolo. La spiegheremo.`, if: (d) => d.flags.lobbied },
                { w: 'legale', a: `senza alzare lo sguardo`, t: `Tutto documentato, tranne un contatto fuori dal portale. Pesa meno di una telefonata alla RUP, ma lo spiegheremo noi prima che lo faccia la controparte.`, if: (d) => !d.flags.lobbied && !d.flags.tailored && (d.flags.backchannel || d.flags.coffee) },
                { think: `Se mi chiedono cos’è successo, non dovrò ricordare: basterà aprire la cartella.` },
              ],
            }),
          ch('b', 1, `Chiamo l’ufficio gare dell’ASL per sapere “a che punto siamo”: una telefonata di cortesia, nessuna richiesta, giusto per non restare all’oscuro.`,
            `Nel periodo sensibile la RUP non può dare informazioni oltre quelle pubbliche: una telefonata “di cortesia” non porta nulla e lascia solo una traccia.`,
            { t: -2, r: 4 }, {
              next: 'END',
              say: `Buongiorno, sono di Nexora. Chiamavo solo per sapere come stanno andando le cose, nessuna richiesta: una telefonata di cortesia.`,
              react: [
                { w: 'bellandi', a: `dopo un respiro`, t: `Durante il termine non posso fornire informazioni oltre quelle pubblicate sul portale. Le trova lì, uguali per tutti.` },
                { n: `La linea resta aperta mezzo secondo di troppo. Poi il clic.` },
                { think: `Volevo sapere. Ho solo fatto sapere a loro che non so aspettare.` },
              ],
            }),
          ch('c', 0, `Chiedo a Moro, che conosce bene l’ASL, di organizzare un incontro informale prima dell’avvio: così partiamo già allineati sulle prime settimane.`,
            `Un incontro informale per interposta persona, nello stand-still, è esattamente ciò che un ricorso cerca. Hai trasformato un caffè in una prova di ingerenza.`,
            { t: -4, r: 14 }, {
              integ: -6, set: { lobbied: true }, next: 'END',
              say: `Stefano, lei conosce bene l’ASL. Mi organizza un incontro informale con la dottoressa Bellandi prima dell’avvio? Così partiamo già allineati sulle prime settimane.`,
              react: (d) => [
                ['a', 'b'].includes(pick(d, 'n2'))
                  ? { w: 'moro', a: `compiaciuto, già con il telefono in mano`, t: `Ci mancherebbe. Un caffè, due parole, e il giorno dopo siete già in confidenza.` }
                  : { w: 'moro', a: `compiaciuto di essere richiamato, già con il telefono in mano`, t: `Alla fine si ricorda di me. Un caffè, due parole, e il giorno dopo siete già in confidenza.` },
                { n: `L’incontro si tiene, in un bar di fronte all’ASL, per venti minuti. Bellandi non si siede e non cita la gara; nessuno ne ha bisogno, perché a contare è un altro fatto: vi hanno visti insieme.` },
                { mail: { from: `Studio legale · per Vertex Systems`, subj: `Istanza integrativa di accesso agli atti` }, t: `Si chiede copia di ogni ulteriore comunicazione intercorsa tra la stazione appaltante e Nexora, anche per interposta persona, successiva alla comunicazione di aggiudicazione.` },
                { think: `“Anche per interposta persona.” Lo sapevano già, o lo scrivono sempre. In ogni caso adesso c’è un caffè in più nel fascicolo di qualcun altro.` },
              ],
            }),
          ch('d', 2, `Resto fermo: controllo ogni giorno il portale e la PEC, e non faccio altro finché il termine non scade, perché ogni mossa in più è un rischio.`,
            `Corretto, ma passivo: non commetti errori e non prepari difese. Se il ricorso arriva, il fascicolo che ti protegge è ancora da costruire, e in fretta.`,
            { c: 0 }, {
              mp: ['P'], next: 'END',
              say: `Aspetto. Controllo il portale e la PEC ogni mattina e ogni sera, e non faccio altro finché il termine non scade.`,
              react: [
                { n: `Passano dieci giorni, poi quindici. Il portale cambia solo quando cambiano le scadenze; la PEC suona due volte, sempre per altro.` },
                { think: `Quindici giorni di silenzio, e nemmeno una riga scritta per il giorno in cui servirà.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la gara ───── */
    wild: [
      {
        id: 'rettifica', title: `Rettifica del bando`, w: 2, after: ['n3', 'n4'],
        node: {
          when: `Giovedì · 09:05`, view: 'mail', where: `Portale gara · rettifica degli atti`,
          scene: (d) => [
            { n: `Il telefono vibra: Davide ti ha girato la notifica che aspettavi meno, quella del portale. Un PDF con il timbro del protocollo e, in cima, una nota in rosso: il termine per presentare le offerte slitta di sette giorni.`, sfx: 'ping' },
            { mail: { from: `Davide Ferri · inoltro dal portale gara`, subj: `Fwd: Rettifica n. 1 · rettifica degli atti di gara e proroga del termine` }, t: `Si comunica la rettifica degli articoli 7.3 e 12 del disciplinare e la proroga di sette giorni del termine per la presentazione delle offerte. Le modifiche sono efficaci per tutti gli operatori. Si invita a prenderne visione integrale.` },
            d.flags.clarified
              ? { w: 'davide', a: `leggendo il testo coordinato`, t: `Hanno riscritto il 7.3 recependo il chiarimento: le soluzioni equivalenti adesso sono nel testo, non solo in una risposta. In compenso l’articolo 12 chiede un piano nominativo dei docenti per i punti sulla formazione.` }
              : { w: 'davide', a: `leggendo il testo coordinato`, t: `Il 7.3 è rimasto com’è: il modulo resta obbligatorio. In compenso hanno toccato l’articolo 12: i punti sulla formazione vanno solo a chi allega il piano nominativo dei docenti. E sette giorni in più, per tutti.` },
            d.flags.clarified
              ? { think: `Il chiarimento è diventato testo. Una risposta si può rileggere in due modi; un articolo no.` }
              : { think: `Sette giorni in più, anche per Vertex. E una regola nuova in cui si può inciampare.` },
          ],
          prompt: `Gli atti sono cambiati. Cosa fai?`,
          hint: `Una rettifica vale per tutti: ha un vantaggio chi la legge meglio, non chi si procura un’interpretazione in privato.`,
          tip: `Una rettifica si legge per intero, si confronta con il testo precedente e si adegua il piano di conseguenza. Se un punto resta ambiguo, la strada è un nuovo quesito pubblico, non una mail a un funzionario.`,
          choices: [
            ch('a', 3, `Faccio confrontare a Davide il testo coordinato con la versione precedente, riga per riga, e aggiorno il piano. La settimana in più la uso sulla parte tecnica.`,
              (d) => (d.flags.clarified
                ? `Con il chiarimento già recepito nel testo, la rettifica lavora per te: leggerla bene trasforma una proroga uguale per tutti in un vantaggio tuo.`
                : `Una rettifica uguale per tutti premia chi la legge meglio: hai trovato le due righe che cambiano i punti e hai usato la settimana per metterci mano.`),
              (d) => ({ t: 2, v: d.flags.clarified ? 8 : 5, c: 6, r: d.flags.clarified ? -7 : -5 }), {
                mp: ['Dc'], next: 'RET',
                say: `Davide, mi serve il testo coordinato a fianco della versione di prima, riga per riga, con le differenze evidenziate. Aggiorniamo il piano di offerta sulle modifiche, e la settimana in più la spendiamo sulla parte tecnica.`,
                react: [
                  { w: 'davide', a: `già con i due testi affiancati`, t: `Tre differenze vere e quattro di forma. Ti faccio la tabella entro sera.` },
                  { n: `Alle sette il testo coordinato è sulla lavagna: due righe in giallo, una in rosso. La rossa è quella che cambia il piano.` },
                  { think: `La riga rossa è la formazione. Chi la scopre per ultimo, perde quei punti.` },
                ],
              }),
            ch('b', 2, `Pubblico un quesito sul punto che resta ambiguo: la regola sul piano dei docenti vale anche per il personale messo a disposizione da terzi? La risposta sarà valida per tutti.`,
              `Corretto e a prova di contestazione: il dubbio era reale e ora la risposta è pubblica per tutti. Ma copre un punto solo, il resto della rettifica non è stato confrontato riga per riga, e intanto la settimana scorre.`,
              { t: 2, c: 4, r: -2 }, {
                next: 'RET',
                say: `Presento sul portale un quesito: la regola dell’articolo 12 sul piano nominativo dei docenti vale anche per il personale messo a disposizione da soggetti terzi? La risposta varrà per tutti i concorrenti.`,
                react: [
                  { n: `Il quesito parte con il numero 21. La risposta arriva due giorni dopo, di tre righe: sì, vale anche per il personale di terzi.` },
                  { think: `Avevo ragione sul dubbio. Ho speso due giorni per averne la prova, e il resto del testo è ancora da leggere.` },
                ],
              }),
            ch('c', 1, `Considero la rettifica una formalità: il piano di offerta resta quello, e uso la proroga per respirare e rivedere con calma i numeri del prezzo.`,
              (d) => (d.flags.clarified
                ? `Il chiarimento ti ha già coperto sul punto più delicato, ma l’articolo 12 è cambiato e il tuo piano non lo sa: una settimana regalata a chi ha letto.`
                : `Una rettifica non è una formalità: cambia i punti e cambia ciò che è ammesso. Trattarla così significa scoprire la regola nuova quando la commissione ti toglierà i punti.`),
              (d) => ({ u: -3, c: -3, r: d.flags.clarified ? 4 : 8 }), {
                next: 'RET',
                say: `Davide, è una rettifica: roba da protocollo. Il piano resta com’è, e la settimana in più la usiamo per prendere fiato.`,
                react: [
                  { w: 'davide', a: `dopo una pausa`, t: `Sicuro? L’articolo 12 non è una virgola.` },
                  { think: `Ho appena detto che leggere gli atti è una perdita di tempo.` },
                ],
              }),
            ch('d', 0, `Scrivo due righe a Marco Fenu, conosciuto in consultazione, per capire se la regola dell’articolo 12 sia stata pensata per qualcuno in particolare.`,
              `Una mail a un funzionario fuori dal portale è un contatto riservato, anche se la domanda sembra innocente. Fenu l’ha girata alla RUP, come doveva: adesso è agli atti che hai cercato un canale laterale.`,
              { t: -6, c: -4, r: 10 }, {
                integ: -4, set: { backchannel: true }, next: 'RET',
                say: `Marco, buongiorno. Ci siamo conosciuti in consultazione. Una curiosità sulla rettifica: la regola dell’articolo 12 è stata pensata per qualche operatore in particolare? Mi aiuterebbe a capire come orientarmi.`,
                react: [
                  { w: 'fenu', a: `per PEC, dopo un’ora`, t: `Buongiorno, non posso rispondere fuori dal portale. Ho inoltrato la sua mail alla RUP, come previsto dalla procedura.` },
                  { think: `Ha fatto bene lui. Ho fatto male io.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'quesito_vertex', title: `Un quesito di Vertex cambia il quadro`, w: 2, after: ['n3'],
        node: {
          when: `Giorno 12 di 13 · 17:40`, view: 'mail', where: `Portale gara · quesiti`,
          scene: (d) => [
            { n: `Alle 17:40, a un giorno dalla chiusura dei chiarimenti, il portale pubblica l’elenco aggiornato dei quesiti con le risposte, e Davide te lo gira subito. Sono anonimi. Ma leggi il numero 14 e riconosci la mano come si riconosce una grafia.`, sfx: 'ping' },
            d.flags.clarified
              ? { mail: { from: `Davide Ferri · inoltro dal portale gara`, subj: `Fwd: Quesito n. 14 e risposta` }, t: `Quesito: si chiede di precisare con quali modalità l’operatore debba dimostrare l’equivalenza funzionale ammessa in risposta al quesito n. 7. Risposta: l’equivalenza deve essere dimostrata con una relazione di prova rilasciata da un organismo terzo accreditato, da allegare all’offerta tecnica.` }
              : { mail: { from: `Davide Ferri · inoltro dal portale gara`, subj: `Fwd: Quesito n. 14 e risposta` }, t: `Quesito: si chiede conferma che il modulo certificato previsto dall’art. 7.3 sia requisito di ammissione non sostituibile. Risposta: si conferma. Il requisito è condizione di ammissione alla gara.` },
            d.flags.clarified
              ? { w: 'davide', a: `leggendo la risposta due volte`, t: `Hanno fatto la domanda scomoda: l’equivalenza vale, ma va dimostrata con una prova di terza parte. Un laboratorio accreditato ci mette tre settimane. Ne abbiamo due e mezza.` }
              : { w: 'davide', a: `a voce bassa`, t: `Hanno chiesto conferma e l’hanno avuta. Il modulo è condizione di ammissione, nero su bianco. I chiarimenti chiudono domani: dopo, nessuno potrà più chiedere niente.` },
            d.flags.clarified
              ? { think: `La mia porta è rimasta aperta, ma qualcuno ci ha messo davanti un gradino. Alto quanto basta per vedere chi riesce a salirlo.` }
              : { think: `Quel requisito era davanti a me da giorni. Adesso ho una sera.` },
          ],
          prompt: `Un quesito di Vertex ha cambiato la partita. Come rispondi?`,
          hint: `La partita si gioca sul portale, davanti a tutti. Una domanda pubblica pesa più di qualunque informazione raccolta in privato.`,
          tip: `Quando un concorrente muove nel canale pubblico, si risponde nello stesso canale: con un quesito motivato o con la prova già pronta. Scoprire chi ha scritto cosa, fuori dal portale, non cambia il testo e lascia una traccia.`,
          choices: [
            ch('a', 3, `Entro stasera pubblico un quesito formale sul punto, motivato su concorrenza e proporzionalità, e faccio partire con Davide la raccolta delle prove.`,
              (d) => (d.flags.clarified
                ? `Hai risposto nello stesso canale e senza perdere tempo: il quesito precisa le modalità di prova per tutti e la raccolta parte in parallelo. Il gradino resta, ma lo sali con un passo di vantaggio.`
                : `A un giorno dalla chiusura il quesito arriva tardi per ottenere ciò che volevi: l’ASL confermerà. Ma resta agli atti che hai contestato il requisito nei termini, e in un eventuale ricorso conta.`),
              (d) => (d.flags.clarified ? { t: 4, v: 4, c: 8, r: -6 } : { t: 3, c: 5, r: -3 }), {
                next: 'RET',
                say: `Davide, scriviamo il quesito adesso e lo pubblichiamo entro stasera: motivato su concorrenza e proporzionalità, con le modalità di prova che proponiamo. E intanto partiamo con la raccolta delle prove, che ci serve comunque.`,
                react: (d) => [
                  { n: `Alle 20:12 il quesito è sul portale, con il suo numero. Davide ha già aperto una cartella per le prove.` },
                  d.flags.clarified
                    ? { w: 'davide', a: `al telefono con un laboratorio`, t: `Ci danno una finestra fra due settimane e mezza. Stretta, ma c’è.` }
                    : { w: 'davide', a: `rileggendo il testo inviato`, t: `Se confermano il modulo, almeno è scritto che lo avevamo contestato in tempo.` },
                  { think: `Il quesito ha un numero e un’ora. Se mai servirà, un giudice potrà rileggerlo.` },
                ],
              }),
            ch('b', 2, `Preparo la documentazione che regge l’interpretazione più severa e non faccio altri quesiti: lavoro come se la risposta fosse definitiva.`,
              (d) => (d.flags.clarified
                ? `Lavorare sull’ipotesi peggiore è prudente e, con l’equivalenza ammessa, regge: ma rinunci a precisare le modalità di prova e giochi sulla tua sola interpretazione.`
                : `Prepararsi al peggio è razionale, ma senza un quesito non resta traccia di aver contestato: se il requisito escludente andrà impugnato, avrai meno da mostrare.`),
              (d) => (d.flags.clarified ? { v: 2, c: 2, r: -2 } : { c: -2, r: 4 }), {
                next: 'RET',
                say: `Davide, lavoriamo sull’ipotesi più severa: prepariamo la documentazione come se la risposta fosse definitiva. Se c’è da contestare, lo faremo più avanti.`,
                react: [
                  { w: 'davide', a: `annuendo piano`, t: `Allora cominciamo dalle prove. Il resto lo vediamo man mano.` },
                  { think: `Prudente. Ma ho lasciato la parola agli altri, nell’unico posto in cui si poteva usare.` },
                ],
              }),
            ch('c', 1, `Segnalo alla RUP che il quesito di quell’operatore è pretestuoso e scritto per favorire un solo concorrente, e chiedo che la risposta venga riesaminata.`,
              `Contestare il quesito di un altro operatore è lecito, ma suona come la mossa di chi non ha risposte proprie. Una risposta pubblicata non si riesamina per segnalazione, e il tuo nome finisce nel fascicolo come quello che si lamenta.`,
              { t: -4, c: -2, r: 6 }, {
                next: 'RET',
                say: `Trasmetto una segnalazione: il quesito 14 appare pretestuoso e formulato per favorire un solo operatore. Chiedo che la risposta venga riesaminata.`,
                react: [
                  { w: 'bellandi', a: `per PEC`, t: `La segnalazione è acquisita agli atti. I quesiti e le relative risposte sono pubblici e restano quelli pubblicati.` },
                  { think: `Ho protestato nello stesso canale in cui l’altro ha mosso. E lui ha mosso meglio.` },
                ],
              }),
            ch('d', 0, `Faccio sentire in ASL, tramite un conoscente dell’ufficio gare, chi ha posto il quesito e cosa si dice in giro: se so chi si muove, so come rispondere e dove insistere.`,
              `Dare la caccia all’autore di un quesito anonimo, per interposta persona, non cambia il testo e crea una traccia: se emerge, l’ASL leggerà che Nexora cercava informazioni fuori dal portale.`,
              { t: -4, c: -2, r: 10 }, {
                integ: -4, set: { backchannel: true }, next: 'RET',
                say: `Senti, tu in ASL ci lavori da anni: riesci a capire chi ha posto quel quesito e cosa si dice in giro? Se so chi si muove, so come rispondere.`,
                react: [
                  { n: `Il conoscente prende tempo, poi ti richiama la mattina dopo: il quesito è di un operatore regionale, e “si dice in giro” che l’ASL sia molto attenta a chi fa domande fuori dal portale.` },
                  { think: `Ho chiesto per sapere chi si muove, e adesso so solo che l’ASL è attenta. Anche a me.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'caffe_moro', title: `Un caffè con la RUP, offerto da Moro`, w: 2, after: ['n3', 'n4', 'n5'],
        if: (d) => d.hist.some((h) => h.node === 'n2' && (h.id === 'a' || h.id === 'b')),
        node: {
          when: `Giovedì · 18:40`, view: 'car', bg: 'night', where: `In auto · tangenziale`,
          scene: (d) => [
            { n: `Sono le 18:40 e sei in tangenziale, con i fari dei camion che ti scorrono sul parabrezza. Lo schermo dell’auto si illumina: Stefano Moro.`, sfx: 'phone' },
            { w: 'moro', a: `dal vivavoce, allegro`, t: `Allora, novità buone. La Bellandi la conosco da vent’anni: domenica ci vediamo per il caffè, come ogni tanto. Le ho detto che veniva un amico e non ha fatto una piega. Informale, due chiacchiere, mica si parla di gara: si parla di sanità. E intanto capiamo cosa guarda di più la commissione.` },
            d.mp.has('Co')
              ? { think: `Con Sinergia ho un’esclusiva firmata: Moro ha rinunciato a Vertex per questa gara e ha tutto l’interesse a non guastarla. Posso dirgli di no.` }
              : { think: `Con Sinergia non ho firmato niente che regoli chi parla con chi. Moro si sente libero, e in un certo senso lo è.` },
            { n: `Un camion ti affianca e ti sorpassa sbuffando. Nell’abitacolo resta solo la voce di Moro, che aspetta.` },
          ],
          prompt: `Moro ti offre un caffè con la RUP. Cosa rispondi?`,
          hint: `Il vantaggio è reale e il costo pure. Chi paga se il caffè finisce in un fascicolo?`,
          tip: `Un contatto informale con la stazione appaltante durante la gara, anche senza parlare di gara, è un contatto: il patto di integrità lo vieta e basta una persona che lo racconti per trasformare un caffè in una contestazione. Vale anche se lo fa il partner a tuo nome.`,
          choices: [
            ch('a', 0, `Accetto: un caffè informale non ha mai fatto male a nessuno, e capire cosa guarderà di più la commissione vale il rischio. Vengo con lui.`,
              `Il caffè non ha niente di male finché qualcuno non lo racconta, e in una gara qualcuno lo racconta sempre. Hai guadagnato, al massimo, un’impressione sulla commissione; in cambio c’è un incontro informale con la RUP che chiunque può riferire.`,
              { t: -4, v: 4, c: 4, r: 14 }, {
                integ: -8, set: { coffee: true }, next: 'RET',
                say: `Stefano, ci sto. Un caffè non ha mai fatto male a nessuno, e capire cosa guarderà di più la commissione mi fa comodo. Domenica vengo con lei.`,
                react: [
                  { n: `Domenica il bar del parco è pieno di famiglie e di cani al guinzaglio. Moro è già al tavolo. Bellandi arriva con un quotidiano piegato sotto il braccio, ti vede, e si ferma.` },
                  { w: 'bellandi', a: `a bassa voce, senza sedersi`, t: `Stefano mi aveva parlato di un amico. Non sapevo fosse lei. Non è opportuno. Buona domenica.` },
                  { think: `Non mi ha detto niente di sbagliato. Ma qualcuno, in questo bar, mi ha visto con lei.` },
                ],
              }),
            ch('b', 1, `Gli dico di andare lui, da amico: io non c’ero e non so nulla. Se ne ricava qualcosa di utile, me lo riferisce a voce, senza fare nomi.`,
              `Mandare il partner a fare ciò che tu non faresti è la stessa mossa con una scusa in più: il contatto è comunque tuo, per interposta persona, e resti appeso alla discrezione di Moro.`,
              { v: 2, t: -2, r: 10 }, {
                integ: -4, set: { coffee: true }, next: 'RET',
                say: `Stefano, vada pure lei, da amico: io non c’ero e non so niente. Se ne ricava qualcosa di utile, mi dica a voce.`,
                react: [
                  { w: 'moro', t: `Capito. Io non dico niente a nessuno. Naturalmente.` },
                  { n: `Lunedì Moro ti richiama con un riassunto di tre minuti: “La dottoressa dice che guardano molto le referenze”. Non ti dice cosa abbia detto lui.` },
                  { think: `Un’informazione che avrei letto in qualunque disciplinare, e un contatto che non posso più disdire.` },
                ],
              }),
            ch('c', 3, `Ringrazio e declino: ogni contatto con la RUP passa dal portale, e vale anche per lui. Gli propongo di scrivere insieme un quesito pubblico.`,
              (d) => (d.mp.has('Co')
                ? `Hai chiuso la porta senza chiudere l’alleanza: l’esclusiva che Moro ha firmato ti dà l’argomento, e lui, che ha già rinunciato a Vertex per questa gara, lo riconosce. Hai perso un’impressione e tenuto una gara che nessuno potrà contestare.`
                : `Declinare costa meno di quanto sembri, anche se Moro ci rimane male: senza un accordo che regoli chi parla con chi, il suo malumore è il prezzo di una mossa che nessuno potrà rimproverarti.`),
              (d) => (d.mp.has('Co') ? { t: 2, c: 6, r: -8 } : { t: -2, c: 4, r: -5 }), {
                next: 'RET',
                say: `Stefano, la ringrazio, ma declino. Ogni contatto con la RUP, da qui al termine, passa dal portale, e vale anche per lei: siamo nella stessa squadra. Se c’è qualcosa che le sta a cuore, scriviamolo insieme in un quesito pubblico.`,
                react: (d) => [
                  d.mp.has('Co')
                    ? { w: 'moro', a: `dopo un silenzio`, t: `Dopo quello che ho firmato, la squadra è la sua. Va bene, ha ragione: un quesito, allora, lo scriviamo domattina.` }
                    : { w: 'moro', a: `raffreddandosi`, t: `Come vuole. Io il territorio lo conosco, ma se lei preferisce le carte…` },
                  { think: `Un caffè in meno. E una cosa in meno da spiegare.` },
                ],
              }),
            ch('d', 2, `Declino per me, ma gli dico che è libero di vedere chi vuole: non posso impedirglielo. Gli chiedo solo di non parlare di gara a nome di Nexora.`,
              `Hai tenuto pulito te stesso ma non il perimetro: finché il tuo partner è libero di vedere la RUP, quello che fa conta anche per te. Dichiarare le regole è il passo che manca.`,
              { t: 2, c: 2, r: 3 }, {
                next: 'RET',
                say: `Stefano, per me no, grazie. Lei è libero di vedere chi vuole, ci mancherebbe. Le chiedo solo una cosa: di gara, a nome di Nexora, non si parla.`,
                react: [
                  { w: 'moro', t: `Figuriamoci. Un caffè è un caffè.` },
                  { think: `Un caffè è un caffè, finché qualcuno non scrive che è stato un caffè.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'integrazioni', title: `La commissione chiede integrazioni`, w: 2, after: ['n5'],
        node: {
          when: `Lunedì · 10:15`, view: 'mail', where: `PEC · richiesta di integrazioni`,
          scene: (d) => [
            { n: `Davide ti gira la PEC arrivata nella casella di gara: l’intestazione della stazione appaltante, un numero di protocollo in uscita, la firma di Laura Bellandi, RUP, per conto della commissione giudicatrice. Oggetto: richiesta di integrazioni documentali.`, sfx: 'ping' },
            { mail: { from: `Davide Ferri · inoltro PEC dell’ASL Valle Serena`, subj: `Fwd: Richiesta di integrazioni · Comprova delle referenze` }, t: d.flags.clarified
              ? `La commissione chiede di produrre, a comprova di quanto dichiarato nell’offerta tecnica, le attestazioni di buona esecuzione relative alle referenze indicate e il curriculum del responsabile del servizio. Termine per la risposta: cinque giorni di calendario. Non sono ammesse modifiche all’offerta.`
              : `La commissione chiede di produrre, a comprova di quanto dichiarato nell’offerta tecnica, le attestazioni di buona esecuzione relative alle referenze indicate, e di precisare in quale modo la soluzione proposta soddisfi quanto previsto dall’art. 7.3. Termine: cinque giorni di calendario. Non sono ammesse modifiche all’offerta.` },
            { w: 'davide', a: `contando sulle dita`, t: `Cinque giorni di calendario, non lavorativi. In mezzo c’è un weekend.` },
            d.flags.techStrong && d.mp.has('M')
              ? { think: `Le attestazioni le ho, già firmate. Una domanda a cui ho già la risposta: era la richiesta che speravo.` }
              : d.flags.techStrong
                ? { think: `Le referenze ci sono, ma le attestazioni sono sparse in tre cartelle. Cinque giorni bastano, se non li perdo a cercarle.` }
                : { think: `Non ho un fascicolo di prove. Cinque giorni per costruirlo, su un’offerta che non posso toccare.` },
          ],
          prompt: `La commissione chiede carte, non promesse. Come rispondi?`,
          hint: `Un’integrazione non è l’occasione per cambiare l’offerta: è l’occasione per dimostrare che ciò che hai scritto regge.`,
          tip: `Il soccorso istruttorio permette di completare o chiarire, mai di modificare. Si risponde entro il termine, solo a ciò che è richiesto, con documenti numerati e protocollati: la completezza è un segnale di affidabilità che la commissione ricorda.`,
          choices: [
            ch('a', 3, `Rispondo entro due giorni, punto per punto, con documenti numerati e un indice che rimanda a ogni richiesta: né più né meno di quanto è stato chiesto.`,
              (d) => (d.flags.techStrong && d.mp.has('M')
                ? `Avevi le prove e le hai consegnate come si deve: la completezza non è eccesso di zelo, è un segnale di affidabilità, e la commissione lo ricorderà quando assegnerà i punti.`
                : `Hai risposto a ciò che era richiesto, nei tempi e senza decorazioni. Le prove erano meno pronte di quanto avresti voluto, ma la precisione ha compensato.`),
              (d) => ({ t: 6, v: d.flags.techStrong ? 8 : 4, c: 6, r: d.mp.has('M') ? -8 : -4 }), {
                next: 'RET',
                say: `Dottoressa, la nostra risposta arriva entro due giorni, punto per punto: ogni richiesta ha il suo documento, ogni documento il suo numero, e un indice li collega. Nient’altro che quanto richiesto.`,
                react: [
                  { w: 'davide', a: `consegnandoti la cartella`, t: `Nove allegati numerati. Nessuno aggiunge qualcosa all’offerta: sono tutte prove di ciò che avevamo già scritto.` },
                  { n: `La PEC parte il secondo giorno alle 11:40. La ricevuta di consegna arriva dopo un minuto e si aggancia alla richiesta della commissione, riga per riga.` },
                  { think: `Una risposta completa non si nota mentre la scrivi. Si nota quando manca.` },
                ],
              }),
            ch('b', 2, `Chiedo due giorni di proroga per raccogliere tutto con calma, e rispondo il quinto giorno con la documentazione completa e ordinata.`,
              `Una proroga si può chiedere, ma il termine è uguale per tutti e la commissione non la concede per comodità. Hai risposto per intero e nei tempi, ma al limite, e senza mostrare di essere pronto.`,
              { t: 1, v: 2, c: 2, r: -2 }, {
                next: 'RET',
                say: `Dottoressa, chiedo cortesemente due giorni di proroga per raccogliere e ordinare tutta la documentazione. Garantisco una risposta completa entro il termine prorogato.`,
                react: [
                  { w: 'bellandi', a: `per PEC`, t: `La richiesta di proroga non è accoglibile: il termine è uguale per tutti.` },
                  { n: `Rispondi comunque il quinto giorno, alle 17:50, a dieci minuti dalla scadenza, con una cartella che hai finito di ordinare all’una di notte.` },
                  { think: `Due giorni che non ho avuto e dieci minuti di margine che mi sono bastati. Dovevo cominciare il primo giorno.` },
                ],
              }),
            ch('c', 0, `Ne approfitto per migliorare l’offerta: allego due schede tecniche nuove e una referenza in più, che la commissione apprezzerà.`,
              `Le integrazioni completano, non cambiano: una scheda nuova è una modifica dell’offerta dopo l’apertura delle buste, e la par condicio la vieta. Hai offerto alla commissione un motivo per scartare ciò che era valido.`,
              { t: -4, v: -2, c: -4, r: 12 }, {
                next: 'RET',
                say: `Rispondo a tutto e, già che ci sono, allego due schede tecniche aggiornate e una referenza in più: così la commissione ha un quadro più completo.`,
                react: [
                  { w: 'bellandi', a: `per PEC`, t: `Si comunica che le schede e la referenza ulteriori non sono ammesse in quanto modificative dell’offerta. Saranno stralciate dal fascicolo.` },
                  { think: `Cinque giorni per rispondere a una richiesta, e ho usato il quinto per fare un’altra offerta. Nessuno me l’aveva chiesta.` },
                ],
              }),
            ch('d', 1, `Consegno tutto quello che ho, senza selezionare: documenti, brochure, presentazioni, certificazioni vecchie e nuove. Meglio troppo che troppo poco.`,
              `La commissione ha chiesto poche carte precise e ne riceve duecento pagine: non è completezza, è rumore. Far trovare ciò che serve con un indice vale più di un cartone di carta.`,
              { v: -2, c: -2, r: 4 }, {
                next: 'RET',
                say: `Rispondo con tutto quello che abbiamo: attestazioni, certificazioni, presentazioni, brochure. Meglio abbondare.`,
                react: [
                  { w: 'davide', a: `sollevando lo scatolone`, t: `Duecento pagine. Per due righe di richiesta.` },
                  { think: `Non l’ho aiutata a trovare ciò che cerca. L’ho sepolta.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'pec_errore', title: `Errore materiale in una PEC`, w: 1, after: ['n4', 'n5'],
        node: {
          when: `Mercoledì · 17:55`, view: 'desk', where: `La tua scrivania · ricevute PEC`,
          scene: (d) => [
            { n: `Le 17:55. Il disciplinare vuole la documentazione amministrativa via PEC, firmata digitalmente, e il termine non è ancora scaduto. Hai appena chiuso la cartella con il DGUE e le altre dichiarazioni e spedito tutto all’ufficio gare. Sul portatile, la ricevuta di consegna: tutto verde.` },
            { chat: { from: 'davide', app: 'Teams' }, t: `Ferma tutto. Guarda l’estensione dell’allegato con il DGUE. Dice .pdf. Doveva essere .p7m.`, sfx: 'ping' },
            { n: `Apri la ricevuta. L’allegato è la versione senza firma digitale, quella della revisione interna, con ancora i commenti a margine.` },
            d.m.control >= 55
              ? { think: `So esattamente cosa è partito e quando: un invio, sei minuti fa, nessun altro protocollo di mezzo. C’è il tempo per rimediare bene.` }
              : { think: `Se Davide non avesse riaperto la ricevuta, l’avrei scoperto quando la commissione mi avesse escluso. Non ricordo nemmeno cos’altro ho allegato.` },
          ],
          prompt: `Un errore materiale è partito con il tuo nome. Che fai?`,
          hint: `Un errore ammesso presto costa un’ora. Uno nascosto può costare l’esclusione.`,
          tip: `Un errore materiale si rimedia per iscritto e nei tempi, con un atto che richiami il protocollo precedente e lo sostituisca. Una telefonata “per sistemare” non ha valore e attira l’attenzione.`,
          choices: [
            ch('a', 3, `Rimedio per iscritto: nuova PEC entro stasera, con il file firmato, che richiama il protocollo della prima e la sostituisce integralmente. Tengo copia di entrambe.`,
              (d) => (d.m.control >= 55
                ? `Sapevi esattamente cosa era partito e quando, e hai ricostruito tutto in dieci minuti: errore, rimedio, protocollo. Un errore corretto per iscritto e nei termini è una pagina nel fascicolo, non un problema.`
                : `Hai rimediato nel modo che regge davanti a un giudice: atto scritto, protocollo richiamato, sostituzione dichiarata. Meno ordine avevi prima, più merito ha averlo fatto subito.`),
              (d) => ({ t: 4, c: d.m.control >= 55 ? 6 : 4, r: d.m.control >= 55 ? -7 : -5 }), {
                next: 'RET',
                say: `Davide, scriviamo subito la nuova PEC: il file firmato digitalmente, il riferimento al protocollo di quella errata e la dichiarazione che la sostituisce integralmente. Parte entro stasera, e teniamo copia di entrambe nel fascicolo.`,
                react: [
                  { w: 'davide', a: `al suo schermo`, t: `Firma applicata, estensione .p7m, hash verificato. Parte.` },
                  { n: `La nuova PEC esce alle 18:31. Un minuto dopo arriva la ricevuta, e nel testo il protocollo della prima: le due PEC ora si leggono insieme.` },
                  { think: `Mi è costato mezz’ora e la faccia davanti a Davide. Va bene così.` },
                ],
              }),
            ch('b', 2, `Preparo con calma la PEC corretta, la faccio rileggere a Davide e la invio domattina all’apertura degli uffici: meglio una sola correzione, fatta bene.`,
              `Una notte di ritardo non fa danni finché il termine non è scaduto, ma lasci per ore agli atti un documento sbagliato che nessuno ha ancora corretto: quando l’errore è tuo, il tempo di rimedio è il primo costo.`,
              { c: 2, r: -2 }, {
                next: 'RET',
                say: `Davide, non correre: prepariamo la PEC giusta con calma, la riguardiamo insieme e la mandiamo domattina all’apertura. Meglio una correzione sola, ma fatta bene.`,
                react: [
                  { w: 'davide', a: `dopo un attimo`, t: `Va bene. Però stanotte la prima PEC resta lì, con i commenti a margine, a disposizione di chiunque la apra.` },
                  { n: `La correzione parte alle 08:40. Nessuno, nel frattempo, ha toccato niente, e tu non hai dormito bene.` },
                ],
              }),
            ch('c', 1, `Non dico niente: nel peggiore dei casi la commissione può chiedere il file firmato con il soccorso istruttorio, e intanto non attiro l’attenzione.`,
              `Il soccorso istruttorio è una rete, non un piano: lo concede la commissione a suo giudizio, e un errore taciuto diventa una scorrettezza se qualcuno lo scopre prima di te.`,
              { t: -2, c: -2, r: 8 }, {
                next: 'RET',
                say: `Davide, lasciamo così. Se serve, la commissione chiederà il file firmato con il soccorso istruttorio: succede spesso.`,
                react: [
                  { w: 'davide', a: `dopo una pausa`, t: `Succede spesso, è vero. Ma succede a chi lo segnala.` },
                  { think: `Ho scommesso sulla clemenza di qualcuno che non conosco.` },
                ],
              }),
            ch('d', 0, `Telefono subito all’ufficio protocollo dell’ASL e chiedo di “non tenere conto” della prima PEC, spiegando che è stato un errore: per oggi si chiude lì.`,
              `Una richiesta a voce a un impiegato non ha alcun effetto sul protocollo: la PEC resta registrata com’è, e hai attirato l’attenzione su un documento che nessuno aveva ancora letto.`,
              { t: -3, c: -4, r: 8 }, {
                next: 'RET',
                say: `Buonasera, sono di Nexora. Questa sera ho trasmesso una PEC con un allegato sbagliato: potete non tenerne conto? Rimando tutto domattina.`,
                react: [
                  { n: `Dall’altra parte un impiegato, cortese e stanco: “Non posso non tenerne conto, è già protocollata. Mandi una nuova PEC e registriamo anche quella”.` },
                  { think: `Ho perso dieci minuti e ho detto a qualcuno che c’è un errore. Per iscritto, ancora niente.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'ricorso_tar', title: `Vertex presenta ricorso al TAR`, kind: 'neg', w: 2,
        /* vulnerabile se la condotta ha una macchia (integrità negativa) o se non hai un fascicolo pronto */
        hit: (d) => d.integ < 0 || !d.mp.has('P'),
        dp: -0.34, dpProt: -0.03,
        hitText: `A due giorni dalla scadenza del termine dilatorio arriva la notifica: Vertex ha depositato ricorso al TAR contro l’aggiudicazione, con richiesta di sospensiva. I suoi avvocati sanno dove spingere: o su un passaggio della tua condotta che richiede una spiegazione, o su un fascicolo che non regge un confronto riga per riga. La risposta non è pronta. Per prudenza l’ASL sospende la stipula, e la data di chiusura passa senza di te.`,
        protText: `A due giorni dalla scadenza del termine dilatorio arriva la notifica: Vertex ha depositato ricorso al TAR contro l’aggiudicazione. Te l’aspettavi, e la tua condotta è pulita: ogni scambio con l’ASL è passato dal portale o dalla PEC, con la sua ricevuta, e non c’è un contatto da spiegare. La memoria difensiva è pronta in quarantotto ore, il giudice non sospende e il termine di firma regge.`,
      },
      {
        id: 'autotutela', title: `L’ASL annulla la gara in autotutela`, kind: 'neg', w: 1,
        hit: (d) => !d.flags.clarified,
        dp: -0.30, dpProt: -0.03,
        hitText: `Alle 10:15 una PEC dell’ASL a tutti i concorrenti: “Avvio del procedimento di annullamento in autotutela”. L’articolo 7.3 restringe il mercato senza una ragione tecnica, nessuno l’ha mai corretto, e l’ASL preferisce ritirare la gara che difenderla davanti al TAR. Tutto da rifare, con un nuovo bando e un trimestre in meno.`,
        protText: `Alle 10:15 una PEC dell’ASL a tutti i concorrenti: “Avvio del procedimento di annullamento in autotutela”. Ma il punto critico, l’articolo 7.3, era stato chiarito in tempo e in pubblico, con una risposta che ammetteva le soluzioni equivalenti: l’ASL conclude che il vizio è sanato e archivia l’avvio in tre giorni. Il rinvio è di una settimana, non di un trimestre.`,
      },
      {
        id: 'avvio_anticipato', title: `L’ASL chiede l’avvio anticipato`, kind: 'pos', w: 1,
        /* a favore solo di chi ha un fascicolo in ordine, nessuna macchia e un tecnico solido */
        if: (d) => d.mp.has('P') && d.integ >= 0 && !!d.flags.techStrong,
        hit: () => true,
        dp: 0.10, dpProt: 0,
        hitText: `Alle 9:30 una PEC della RUP: la Direzione chiede l’esecuzione anticipata del contratto, in via d’urgenza. I magazzini dei sei presidi sono ai minimi prima dell’inverno e ogni settimana di attesa costa uno scaffale vuoto. Con tutte le carte in regola e nessun contatto da spiegare, Bellandi può procedere senza il timore di una contestazione, e la stipula si accorcia di settimane. Per una volta la correttezza lavora per te.`,
        protText: `Il contratto segue il suo corso, con le sue date. Nessun fatto nuovo, nessuna accelerazione.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      skipGaps: ['E', 'C'],   // in una gara non si incontra il decisore e non c’è un champion: il divario non può cadere lì
      crm: `Best Case al 50%: “se passiamo il tecnico, la gara è nostra”`,
      people: {
        E: `Ettore Ruggeri (Direttore Generale)`, C: `Marco Fenu (Direttore Sistemi Informativi)`,
        Dp: `Laura Bellandi (RUP) e il calendario di gara`, P: `Laura Bellandi (RUP) e l’ufficio contratti dell’ASL`,
        M: `Marco Fenu e la commissione giudicatrice`, I: `Marco Fenu e i direttori dei presidi`,
        Dc: `Laura Bellandi (RUP) e il disciplinare di gara`, Co: `Vertex Systems, già fornitore di altre ASL della regione`,
      },
      risk: `Il rischio vero è che un contatto fuori dal portale o un requisito su misura rendano l’aggiudicazione impugnabile, e che la gara si fermi nello stand-still.`,
      custom: [
        {
          id: 'atti_dossier', if: () => true, has: (d) => d.mp.has('P') && d.integ >= 0,
          q: `Se domani Vertex ricorre e il suo avvocato chiede ogni scambio con l’ASL, tu cosa consegni? Dimmi dov’è il fascicolo, chi lo tiene e se ogni pezzo ha un protocollo.`,
          evidence: `Ogni scambio è passato dal portale o dalla PEC, con ricevuta e protocollo, e le ricevute le ho tutte. Ti giro oggi stesso l’elenco dei protocolli, con la nostra legale in copia.`,
          honest: `Il materiale c’è, ma l’ordine no: l’indice con i protocolli non l’ha ancora visto nessuno. Lo completo entro venerdì e lo faccio rivedere alla nostra legale.`,
          bluff: `Fascicolo completo, protocollo per protocollo. La nostra legale l’ha già visto e non ha rilievi: se serve, domani è pronto per l’accesso agli atti.`,
          vague: `Abbiamo sempre usato i canali ufficiali, la legale è informata di tutto e non c’è mai stato un rilievo: non vedo dove possa esserci un problema.`,
          react: {
            evidence: `Portale, PEC, protocolli, la legale in copia: questa è una risposta che mi fa dormire. Girami l’elenco e per me la trattativa resta dove l’hai messa.`,
            honest: `Va bene così: un fascicolo incompleto che sai di avere vale più di uno completo che credi di avere. Venerdì voglio l’indice, e il tempo della legale te lo trovo io.`,
            bluffCaught: `Ho chiesto all’ufficio gare l’elenco dei protocolli inviati: ne mancano quattro nel tuo fascicolo. L’errore si sistema, la sicurezza con cui mi hai garantito il contrario no. Rifacciamo il punto, con i numeri.`,
            bluffPassed: `D’accordo, lo scrivo. Ma lunedì voglio vedere l’indice con i numeri di protocollo: una gara non si difende a parole.`,
            vague: `“Non vedo dove possa esserci un problema” è la frase che precede quasi tutti i ricorsi. Portami un indice, non un’impressione.`,
          },
        },
        {
          id: 'contatti_rup', if: () => true, has: (d) => !d.flags.lobbied && !d.flags.backchannel && !d.flags.coffee,
          q: `Hai avuto contatti con la RUP fuori dal portale da quando c’è il bando? Telefonate, caffè, messaggi, anche tramite altri: dimmelo adesso, non voglio scoprirlo dallo studio di Vertex.`,
          evidence: `Nessuno. Dal bando in poi solo portale, quesiti e PEC. La nostra legale tiene il registro delle comunicazioni: una riga per scambio, con data e protocollo.`,
          honest: `A memoria non ti garantisco niente. Rileggo il registro riga per riga con la nostra legale e, se c’è un contatto da dichiarare, lo dichiaro io per primo, entro venerdì.`,
          bluff: `Nessuno. Dopo la pubblicazione ho scritto solo sul portale e ogni scambio è registrato: se Vertex vuole controllare, trova un registro pulito.`,
          vague: `Con la RUP i rapporti sono ottimi, ma sempre nei limiti: ho tenuto la distanza giusta e non c’è niente di cui preoccuparsi.`,
          react: {
            evidence: `Registro con data e protocollo, tenuto dalla legale: perfetto. È la risposta che voglio avere in tasca se un domani me lo chiede il CRO. Per me la chiamata regge.`,
            honest: `Grazie di averlo detto tu e non il TAR. Se c’è qualcosa, si governa: nota al fascicolo, nessun altro contatto, e per prudenza ti abbasso di una categoria finché non vediamo il registro.`,
            bluffCaught: `Il registro delle comunicazioni dell’ASL si può chiedere, e un contatto fuori dal portale ha sempre una data e un’ora. Non mi interessa l’errore, mi interessa che tu me l’abbia negato. Ripartiamo da capo.`,
            bluffPassed: `Ok, lo scrivo. Se un giorno trovo una riga diversa nel loro registro, la leggeremo insieme davanti al CRO. Spero di no.`,
            vague: `“Rapporti ottimi, nei limiti” non è un’informazione. Quando, quanti, in che forma: sono tre risposte che devo poter scrivere sul CRM.`,
          },
        },
        {
          id: 'chiarimento_pubblico', if: () => true, has: (d) => !!d.flags.clarified,
          q: `Il requisito dell’articolo 7.3, quello che favorisce Vertex, è stato sciolto per tutti, sul portale? Dammi il numero del quesito, non la tua lettura.`,
          evidence: `Sì: quesito e risposta sono sul portale, con numero e data, visibili a tutti gli operatori. L’ASL ha ammesso le soluzioni equivalenti. Ti mando il link adesso.`,
          honest: `Il numero non te lo cito con certezza. Apro il portale oggi e ti scrivo cosa risulta pubblicato sul 7.3 e cosa no: finché non lo vedo, per me il requisito resta un rischio aperto.`,
          bluff: `Sì, è pubblico: l’ASL ha risposto sul portale ammettendo le soluzioni equivalenti, per tutti gli operatori. Ti mando il numero appena rientro in ufficio.`,
          vague: `La questione è chiara a tutti i partecipanti, la RUP è molto trasparente e Davide ha già letto tutto: sul punto non vedo rischi per noi.`,
          react: {
            evidence: `Quesito, numero, data, risposta per tutti: più pulito di così non si può. È ciò che separa un Best Case sperato da uno fondato.`,
            honest: `Apprezzo che tu non l’abbia girata. Il numero lo voglio entro venerdì: se c’è, lo scrivo nel CRM; se non c’è, mi dici se esiste ancora una finestra per un quesito. Io tengo il tempo, tu tieni la penna.`,
            bluffCaught: `Sul portale non c’è nessuna risposta con quel contenuto: ho aperto la pagina mentre parlavi. Non voglio una storia, voglio un numero di protocollo. Rifacciamolo.`,
            bluffPassed: `Va bene, lo scrivo. Ma il numero lo voglio entro stasera: è una di quelle cose che si verificano in quindici secondi.`,
            vague: `“La RUP è trasparente” descrive la RUP, non il tuo deal. Dammi il numero del quesito, o dimmi che non c’è.`,
          },
        },
      ],
    },

    endings: {
      won: `Il termine dilatorio scade, i ricorsi non reggono e l’aggiudicazione diventa definitiva. Il primo presidio pilota parte a gennaio. Bellandi ti scrive una riga sola, con il numero di protocollo: “Grazie per la correttezza”. In una gara pubblica è l’unico complimento che conta.`,
      lost: `Alla fine la graduatoria cambia e la gara va a Vertex, per quattro punti. Nel verbale la tua offerta tecnica è definita “completa ma meno circostanziata”. Lo leggerai due volte, la seconda con la matita in mano.`,
      slip: `La gara viene sospesa per un ricorso. Se ne riparla fra sei mesi, con le stesse regole e tutta la pazienza che serve; nel frattempo il tuo fascicolo resta nell’archivio dell’ASL, con tutti i suoi protocolli.`,
    },
    lessons: [
      { if: (d) => d.flags.clarified && !d.flags.lobbied, good: true, t: `Hai usato il canale giusto: un chiarimento formale, pubblico e uguale per tutti, ti ha aperto la porta e ti ha reso un operatore di cui l’ASL può fidarsi.` },
      { if: (d) => d.flags.lobbied, good: false, t: `Un contatto riservato durante la procedura ti ha esposto al rischio di esclusione. In gara pubblica la correttezza non è un valore: è una condizione di accesso.` },
      { if: (d) => d.flags.tailored, good: false, t: `Il requisito “su misura” è finito agli atti e ha reso il capitolato attaccabile. Si influenza una gara con contributi neutrali, non con vantaggi mascherati.` },
      { if: (d) => d.flags.techStrong, good: true, t: `Hai investito nel 70% dei punti che contano davvero: l’offerta tecnica. Il prezzo ha fatto il resto.` },
      { if: (d) => d.disc >= 25, good: false, t: `Un ribasso così aggressivo espone a verifica di anomalia e annulla il margine. Vincere in perdita non è vincere.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
