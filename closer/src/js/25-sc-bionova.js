/* Scenario 6 · BioNova · rinnovo a rischio, nuovo sponsor, valore realizzato, espansione condizionata
   v2: identità clinica (laboratori biotech, dashboard di salute dell’account), widget firma, imprevisti, shock, forecast. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    landi: { name: `Giorgio Landi`, role: `Nuovo VP R&D Operations`, hue: 190 },
    elena: { name: `Elena Cattaneo`, role: `Ex sponsor di BioNova`, hue: 12 },
    luca: { name: `Luca Bassi`, role: `Customer Success Manager Nexora`, hue: 100 },
    sara: { name: `Sara Monti`, role: `Acquisti BioNova`, hue: 320 },
    matteo: { name: `Matteo Brambilla`, role: `Responsabile Supply Clinica`, hue: 38 },
    vitali: { name: `Claudio Vitali`, role: `VP Operations di un’altra biotech`, hue: 255 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
  };
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });

  /* ───── lettura dello stato (solo funzioni pure, robuste a stato iniziale) ───── */
  const picked = (d, node, id) => d.hist.some((h) => h.node === node && h.id === id);
  const visited = (d, node) => d.hist.some((h) => h.node === node);
  const wildRec = (d, wid) => d.hist.find((h) => h.wild === wid) || null;
  /* mosse chiuse: 0 = prima mossa … 5 = ultima, 6 = trattativa conclusa */
  const done = (d) => (d.over ? 6 : d.hist.filter((h) => !h.wild).length);
  /* a che punto è il calendario dei fatti (adozione, ticket, giorni): un imprevisto cade un giorno dopo la mossa, non un mese dopo */
  const tstage = (d) => Math.max(0, done(d) - (d.wild ? 1 : 0));
  const sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  /* storico della dashboard prima che si cominci: tutto in discesa dopo il passaggio di consegne di luglio */
  const ADO_H = [43, 41, 38];
  const NPS_H = [6, 6, 5, 4];
  const DAYS = [42, 41, 13, 11, 7, 3, 3];
  const npsOf = (t) => CL.clamp(Math.round(t / 8), 1, 8);
  /* l’adozione al giorno 30 è un fatto dello scenario (52%); il resto cresce solo con ciò che hai davvero messo in piedi */
  const adoptAt = (f, p) => {
    if (p < 2) return 35;
    let a = 52;
    if (p >= 3) a += (f.ownedIssues ? 2 : 0) + (f.diagnosed ? 1 : 0);
    if (p >= 4 && f.giveGet) a += 2;
    if (p >= 5 && f.expansion) a += 3;
    if (p >= 6 && f.threaded) a += 3;
    return Math.min(69, a);
  };

  CL.registerScenario({
    id: 'bionova',
    title: `Rinnovo a Rischio`,
    client: `BioNova Therapeutics`,
    sector: `Biotech · Milano`,
    hook: `Il CRM dice che il rinnovo è automatico. La dashboard di salute dell’account dice rosso.`,
    brief: `Cliente da due anni su un modulo di supply chain clinica. Rinnovo tra sei settimane (€240k) con un’espansione possibile (+€80k): €320k a listino. Lo sponsor storico ha lasciato l’azienda e il nuovo VP non ha mai incontrato nessuno di Nexora. Adozione al 35%, NPS 4, due ticket critici aperti da sessanta giorni.`,
    scout: `Il CRM tratta il rinnovo come automatico (Commit 85%). In realtà: nessun contatto con il nuovo VP, due ticket critici aperti, un’offerta concorrente in arrivo agli Acquisti. Lo sponsor unico se n’è andato e con lui la relazione.`,
    teaches: [`Account in difficoltà`, `Ownership`, `Value realization`, `Pricing a risultato`, `Multi-threading post-churn`],
    list: 320, cost: 2, window: [2, 11], stars: 2, lep: 15, slip: 0.2, dqRefund: 1,
    crm: { cat: `Commit`, prob: 85 },
    cast: CAST,

    /* ───── identità: laboratori biotech, salute dell’account ───── */
    theme: {
      id: 'clinic', label: `Laboratori BioNova · Milano`, bg: 'clinic',
      accent: '#0369a1', accentDark: '#7dd3fc', ambience: 'clinic',
      motto: `Un rinnovo non si perde il giorno della firma: si perde nei mesi in cui nessuno ti guarda.`,
    },
    intro: {
      when: `Lunedì · 08:40`, where: `La tua scrivania`, view: 'desk', bg: 'office',
      scene: [
        { n: `Lunedì mattina, l’open space è ancora mezzo vuoto e il condizionatore ti soffia sulla nuca. Sul secondo schermo la dashboard di salute dell’account BioNova: adozione 35%, NPS 4, due ticket critici aperti da sessanta giorni. I riquadri sono tutti rossi.` },
        { think: `Nel CRM il rinnovo è automatico: Commit, 85%. La dashboard dice un’altra cosa, e la dashboard non ha niente da difendere.` },
        { n: `Scorri la cronologia dei contatti. L’ultima nota di Elena, lo sponsor storico, è di luglio: “Passo il testimone”. Sotto, nessun nome nuovo. Nessun incontro con Giorgio Landi, il VP che ha preso il suo posto.` },
        { chat: { from: 'marta', app: 'Slack' }, t: `BioNova è nel mio commit con il tuo nome: €240k di rinnovo più €80k di espansione. Ho appena aperto la dashboard e non va d’accordo con il CRM. Chi dei due ha ragione, {nome}?`, sfx: 'ping' },
        { think: `Ha ragione la dashboard. Il punto è cosa faccio con le sei settimane che restano.` },
        { n: `Alle nove meno cinque Luca Bassi, che segue l’account per la Customer Success, si ferma accanto alla scrivania con il portatile aperto sul braccio. Ha l’aria di chi aspetta da giorni il momento di dirti una cosa.` },
      ],
    },

    /* ───── widget firma: la salute dell’account, il piano 30-60-90, chi c’è dall’altra parte ───── */
    hud: [
      {
        type: 'kpis', title: `Salute dell’account`,
        build: (d) => {
          const f = d.flags, p = tstage(d);
          /* adozione */
          const ado = adoptAt(f, p);
          const adoSpark = ADO_H.concat(Array.from({ length: p + 1 }, (_, k) => adoptAt(f, k)));
          const adoDelta = p === 0 ? sgn(ado - ADO_H[0]) : ado - 35 ? sgn(ado - 35) : undefined;
          /* NPS: segue la fiducia che hai costruito */
          const trust = d.m && typeof d.m.trust === 'number' ? d.m.trust : 30;
          const nps = d.hist.length === 0 ? 4 : npsOf(trust);
          const npsSpark = NPS_H.concat(d.hist.filter((h) => h.mBefore && h.delta).map((h) => npsOf(h.mBefore.trust + (h.delta.trust || 0))));
          const npsDelta = d.hist.length === 0 ? '−2' : nps - 4 ? sgn(nps - 4) : undefined;
          /* ticket critici: i due storici si chiudono al giorno 30; un nuovo guasto può riaprire il conto */
          const live = !!(d.wild && d.wild.id === 'ticket_nuovo');
          const extra = live || (wildRec(d, 'ticket_nuovo') && !f.ticketFixed) ? 1 : 0;
          const tk = (p < 2 ? 2 : 0) + extra;
          const tkSpark = [0, 1, 2, 2].concat(p >= 2 || extra ? [tk] : []);
          const tkDelta = p < 2 && !extra ? 'da 60 gg' : tk - 2 ? sgn(tk - 2) : undefined;
          /* giorni al rinnovo: il colore dice quanto è esposto */
          const risk = d.m && typeof d.m.risk === 'number' ? d.m.risk : 60;
          return [
            { k: 'ado', label: `Adozione`, value: ado + '%', delta: adoDelta, tone: ado < 45 ? 'bad' : ado < 60 ? 'warn' : 'good', spark: adoSpark, target: '70%' },
            { k: 'nps', label: `NPS`, value: String(nps), delta: npsDelta, tone: nps >= 7 ? 'good' : nps >= 5 ? 'warn' : 'bad', spark: npsSpark, target: '8' },
            { k: 'tk', label: `Ticket critici aperti`, value: String(tk), delta: tkDelta, tone: tk === 0 ? 'good' : 'bad', spark: tkSpark, target: '0' },
            { k: 'days', label: `Giorni al rinnovo`, value: DAYS[p] + ' gg', tone: risk <= 30 ? 'good' : risk <= 50 ? 'warn' : 'bad' },
          ];
        },
      },
      {
        type: 'stakeholders', title: `Chi c’è dall’altra parte`,
        build: (d) => {
          const f = d.flags, c = done(d), p = tstage(d), M = d.mp.has('M');
          const own = !!f.ownedIssues;
          /* Landi */
          let landi;
          if (picked(d, 'n2', 'a')) landi = M ? P('landi', 'neutral', `I numeri li ha confermati. Quella frase su Elena non l’ha dimenticata.`) : P('landi', 'hostile', `Gli hai parlato male di Elena. Non l’ha dimenticato.`);
          else if (f.tonedeaf && !own) landi = P('landi', 'hostile', `Ha letto una proposta commerciale sopra due ticket aperti.`);
          else if (M && (f.giveGet || f.expansion) && !f.tonedeaf) landi = P('landi', 'champion', `Difende il piano davanti al suo CFO.`);
          else if (M) landi = P('landi', 'ally', `Ha confermato i numeri: il valore ora è suo.`);
          else if (own) landi = P('landi', f.tonedeaf ? 'skeptic' : 'neutral', f.tonedeaf ? `Ti ha dato un mese, ma la proposta di espansione la ricorda.` : `Ti ha dato un mese. Misura, non ascolta.`);
          else if (c >= 2) landi = P('landi', 'neutral', `Ti ascolta, ma non hai un piano che possa firmare.`);
          else landi = P('landi', 'skeptic', `Nuovo e freddo: i dati prima delle parole.`);
          /* Elena: l’ex sponsor, fuori dai giochi finché non scrive */
          const er = wildRec(d, 'elena_scrive');
          const elena = er
            ? (er.id === 'a' || er.id === 'c' ? P('elena', 'ally', `Ora è altrove, ma ti parla ancora volentieri.`) : er.id === 'b' ? P('elena', 'neutral', `Ti ha raccontato più di quanto dovesse.`) : P('elena', 'unknown', `Ha scritto. Non le hai risposto.`))
            : P('elena', 'unknown', `Ha lasciato BioNova a luglio. Nessuno ha raccolto il suo testimone.`);
          /* Luca: è dalla tua parte, ma da solo non basta */
          const luca = P('luca', 'ally', f.threaded ? `Ora ha un piano per non restare più scoperto.` : f.diagnosed ? `Ha ricostruito con te la causa dei ticket.` : `Vuole aiutarti. Conosce i ticket meglio di tutti.`);
          /* Sara: Acquisti */
          let sara;
          if (picked(d, 'n4', 'a')) sara = P('sara', 'skeptic', `Ha annotato che il prezzo si sposta.`);
          else if (picked(d, 'n4', 'd')) sara = P('sara', 'hostile', `Ha avviato la comparazione.`);
          else if (f.giveGet) sara = P('sara', 'neutral', `Le piace la struttura: il rischio si divide.`);
          else if (picked(d, 'n4', 'c')) sara = P('sara', 'neutral', `Non ti mostra l’offerta, ma ha ammesso cosa esclude.`);
          else if (picked(d, 'n1', 'd')) sara = P('sara', 'skeptic', `Se concedi subito, pensa, concederai ancora.`);
          else sara = p >= 3 ? P('sara', 'skeptic', `Ha chiesto di allineare il prezzo e aspetta la tua risposta.`) : P('sara', 'unknown', `Non l’hai ancora sentita.`);
          /* Matteo: il secondo nome, quello che fa la differenza */
          let matteo;
          if (f.threaded) matteo = P('matteo', 'champion', `Sponsor per la supply, nero su bianco nel contratto.`);
          else if (f.coSponsor) matteo = P('matteo', 'ally', `Al convegno parla di risultati che ha contato lui.`);
          else if (M) matteo = P('matteo', 'ally', `Le ore le ha contate lui. Lo sa, e lo dice.`);
          else if (p >= 2) matteo = P('matteo', 'neutral', `In sala con Landi: ha visto il tuo lavoro, non ti ha scelto.`);
          else matteo = P('matteo', 'unknown', `Non è ancora in scena.`);
          return [landi, elena, luca, sara, matteo];
        },
      },
      {
        type: 'timeline', title: `Il piano 30-60-90`,
        build: (d) => {
          const f = d.flags, c = done(d), p = tstage(d);
          const newTk = !!(d.wild && d.wild.id === 'ticket_nuovo') || !!(wildRec(d, 'ticket_nuovo') && !f.ticketFixed);
          return {
            items: [
              { k: 'p0', t: `Giorno 0`, label: `Diagnosi: perché 35% e perché i ticket`, st: f.diagnosed ? 'done' : c === 0 ? 'now' : 'late' },
              { k: 'p14', t: `Giorno 14`, label: `Due ticket critici chiusi, con responsabili`, st: p >= 2 ? (newTk ? 'late' : 'done') : f.ownedIssues || f.diagnosed ? 'now' : 'todo' },
              { k: 'p30', t: `Giorno 30`, label: `Review con Landi: il valore, misurato da lui`, st: p < 2 ? 'todo' : c === 2 ? 'now' : d.mp.has('M') ? 'done' : 'late' },
              { k: 'p42', t: `Giorno 42`, label: `Rinnovo con prezzo legato all’adozione`, st: c < 3 ? 'todo' : c === 3 ? 'now' : f.giveGet ? 'done' : 'late' },
              { k: 'p60', t: `Giorno 60`, label: `Opzione sul modulo trial, a prezzo bloccato`, st: c < 4 ? 'todo' : c === 4 ? 'now' : f.expansion ? 'done' : 'late' },
              { k: 'p90', t: `Giorno 90`, label: `Tre sponsor e business review trimestrale`, st: c < 5 ? 'todo' : c === 5 ? 'now' : f.threaded ? 'done' : 'late' },
            ],
          };
        },
      },
    ],

    start: { t: 30, v: 26, u: 40, c: 30, r: 60, have: ['Dp'] },
    caps: [
      { id: 'tone', max: 0.35, if: (d) => d.flags.tonedeaf, why: `Hai spinto un’espansione su un cliente con ticket critici aperti: il nuovo VP ha letto quel segnale e ti ha messo in lista nera.` },
      { id: 'own', max: 0.50, if: (d) => !d.flags.ownedIssues, why: `Non ti sei assunto la responsabilità dei problemi aperti: finché non lo fai, nessun piano commerciale regge.` },
      { id: 'discount', max: 0.55, if: (d) => d.disc >= 25, why: `Hai ceduto troppo per proteggere il rinnovo: il cliente ha imparato che pressando ottiene sempre di più.` },
    ],

    nodes: {
      n1: {
        when: `Lunedì · 09:00`, view: 'desk',
        where: `Scrivania · lunedì 09:00`,
        scene: [
          { n: `Luca appoggia il portatile sul bordo della scrivania. Sul suo schermo c’è la tua stessa dashboard, con una colonna in più: le note sui ticket, scritte da lui in due mesi di solleciti.` },
          { w: 'luca', a: `preoccupato`, t: `Il rinnovo è tra sei settimane. Landi, il nuovo VP, non ha mai visto nessuno di noi e ha fatto sapere che prima dei discorsi vuole i dati. I dati li ho. Il problema è che non sono belli.` },
          { think: `Sei settimane. Due ticket aperti da due mesi e un cliente che non ho mai guardato in faccia.` },
          { n: `Sul tuo portatile la presentazione del modulo per i trial clinici è aperta da giovedì. Mancano due slide e un prezzo.` },
          { think: `Il primo gesto che faccio lo leggerà lui, prima ancora di conoscermi.` },
        ],
        prompt: `Qual è la prima mossa?`,
        hint: `Prima di vendere qualsiasi cosa devi sapere dov’è la ferita e chi la sente.`,
        tip: `Su un account in sofferenza la prima mossa forte è di servizio: capire, riparare, mostrare. Vendere un’espansione a chi ha due ticket aperti da sessanta giorni brucia credibilità e accelera il churn.`,
        choices: [
          ch('a', 0, `Finisco la presentazione del modulo trial e la mando a Landi oggi: gli mostro dove stiamo andando, così guarda avanti invece di fermarsi sui ticket.`,
            `Hai letto un problema di sostanza come un problema di immagine e hai risposto con una proposta. Per un VP che eredita due ticket aperti il tempismo pesa quanto il contenuto: quella mail è diventata la prova che Nexora vende prima di riparare.`,
            { t: -10, v: -6, c: -4, r: 14 }, {
              set: { tonedeaf: true }, next: 'n2',
              say: `Finisco la presentazione sul modulo trial e la mando a Landi oggi. Gli mostro dove stiamo andando: così guarda avanti e non si ferma sui ticket.`,
              react: [
                { n: `La mail parte alle 11:40, con la presentazione in allegato. La risposta di Landi arriva prima di pranzo.` },
                { mail: { from: `Giorgio Landi`, subj: `Re: Modulo trial clinici` }, t: `Ho due ticket aperti da sessanta giorni e mi arriva una proposta per un modulo nuovo. Mi vendete altro mentre il resto non funziona. Ne riparleremo.`, sfx: 'ping' },
                { think: `Gli ho confermato esattamente quello che temeva di noi.` },
              ],
            }),
          ch('b', 3, `Convoco Luca e Davide per capire perché l’adozione è al 35%, cosa tiene aperti i ticket e cosa aveva promesso Elena. Il piano lo scrivo prima di chiamare Landi.`,
            `In due ore hai trasformato un sintomo in due cause riparabili. Arrivare da Landi con una diagnosi invece che con una promessa cambia il tipo di conversazione che puoi avere.`,
            { t: 4, v: 6, c: 8, r: -8 }, {
              mp: ['I'], set: { diagnosed: true }, next: 'n2',
              say: `Luca, Davide, mi servono due ore. Voglio capire perché l’adozione è al 35%, cosa tiene aperti i due ticket e cosa aveva promesso Elena, e a chi. Poi scrivo il piano, e solo dopo chiamo Landi.`,
              react: [
                { n: `Chiudete la porta della sala piccola. Davide proietta il tracciato dei due ticket; Luca porta i tre report d’uso che nessuno ha mai letto.` },
                { w: 'davide', a: `indicando una riga`, t: `Eccolo. Entrambi i ticket nascono dalla stessa configurazione dell’integrazione. Si sistema, non è un difetto del prodotto.` },
                { w: 'luca', a: `scorrendo il report`, t: `E l’adozione bassa è tutta in due team, etichettatura e rilascio lotti. Non hanno mai fatto formazione. Nessuno gliel’ha mai proposta.` },
                { think: `Non è un account che non funziona. È un account che nessuno ha guardato.` },
              ],
            }),
          ch('c', 2, `Chiamo Landi oggi stesso per presentarmi e fissare un incontro. I dati li porto dopo: prima gli serve una voce, non un allegato, e un nome a cui rivolgersi.`,
            `Hai ottenuto il contatto, che è già qualcosa, ma ti presenti a mani vuote davanti a un VP che decide con i numeri. Una prima impressione non si ripete, e questa ha la forma di una richiesta di tempo.`,
            { t: 2, c: 4, r: 2 }, {
              next: 'n2',
              say: `Dottor Landi, sono l’Account Executive di Nexora per BioNova. Non ci siamo mai incontrati: vorrei fissare un’ora questa settimana, per capire cosa si aspetta da noi.`,
              react: [
                { n: `Il numero della sede risponde al terzo squillo. La voce di Landi è calma, senza nessuna fretta di piacere.` },
                { w: 'landi', a: `cordiale, ma freddo`, t: `Piacere. Mi mandi prima i dati: utilizzo, ticket, contratto. Non ho tempo per le presentazioni.` },
                { think: `Ho la sua attenzione per un minuto. La prima impressione è già andata.` },
              ],
            }),
          ch('d', 1, `Offro subito uno sconto sul rinnovo, prima che qualcuno lo chieda: se il prezzo non è un problema, il contratto è al riparo e si lavora sul resto.`,
            `Hai trasformato una questione di valore in una di prezzo senza che nessuno l’avesse chiesta. Gli Acquisti hanno imparato la cosa più utile di tutta la trattativa: il tuo prezzo si muove anche prima che glielo chiedano.`,
            { v: -6, c: -2, r: 4, d: 10 }, {
              next: 'n2',
              say: `Luca, preparo subito una proposta di rinnovo con uno sconto già dentro. Se il prezzo non è un problema, il contratto è al riparo.`,
              react: [
                { n: `Giri la bozza a Sara Monti, degli Acquisti, per anticiparla. Risponde in venti minuti.` },
                { mail: { from: `Sara Monti · Acquisti BioNova`, subj: `Re: Proposta di rinnovo` }, t: `Apprezzo la rapidità. Se concedete subito, forse concedete ancora.` },
                { think: `Prima ancora di capire il problema, ho svalutato la soluzione.` },
              ],
            }),
        ],
      },

      n2: {
        when: `Martedì · 15:00`, view: 'meeting',
        where: `Incontro · sede BioNova · martedì 15:00`,
        scene: (d) => [
          { n: `Martedì, sede di BioNova a Milano. La sala riunioni del secondo piano dà sul laboratorio: una vetrata dal pavimento al soffitto, camici bianchi che passano, il ronzio ovattato delle cappe.` },
          { n: `Landi non si siede. Appoggia le mani alla spalliera della sedia, il badge ancora al collo, il telefono girato a faccia in giù. Luca, accanto a te, studia il bordo del tavolo.` },
          picked(d, 'n1', 'b')
            ? { n: `In cartella hai la diagnosi di Davide e Luca: due cause, nessuna dentro il prodotto. Landi non l’ha ancora sentita.` }
            : picked(d, 'n1', 'a')
              ? { n: `Ti ha concesso quest’ora dopo la tua mail sul modulo trial. Non la nomina, ma non ti ha stretto la mano.` }
              : picked(d, 'n1', 'c')
                ? { n: `L’ora te l’ha data al telefono, a patto di cominciare dai dati. In cartella hai una dashboard rossa e poco altro.` }
                : { n: `La bozza con lo sconto che hai mandato a Sara è arrivata anche a lui. Lo capisci da come evita di guardarti mentre ti siedi.` },
          { w: 'landi', a: `diretto, senza giri`, t: `Non so nemmeno cosa stiamo usando. Elena mi ha lasciato un file di tre righe. Ho due ticket aperti da due mesi che bloccano il mio team di supply clinica. Mi dica perché dovrei rinnovare.` },
          { n: `Il silenzio dura tre secondi. In sala si sente la ventilazione.` },
          { think: `Non sta chiedendo uno sconto. Sta chiedendo una ragione, e ha già deciso quanto tempo concedermi per darla.` },
        ],
        prompt: `Come reagisci?`,
        hint: `Non difenderti. Prendi in carico il problema, con nomi e date.`,
        tip: `Quando un nuovo sponsor eredita un’esperienza deludente, la mossa vincente è “own it”: riconoscere, assumersi la responsabilità e proporre un piano 30-60-90 con responsabili nominati e metriche. Non cerchi una difesa, cerchi una seconda possibilità.`,
        choices: [
          ch('a', 0, `Quello che ha ereditato non dipendeva solo da noi: il team di Elena non ha mai chiesto formazione, e senza richieste è difficile intervenire anche volendo.`,
            `Spiegare il passato per difenderti è la reazione più naturale e la più sbagliata: Landi non cerca un colpevole, cerca un fornitore che si prenda il problema. In più hai attaccato la sua predecessora davanti a lui.`,
            { t: -10, c: -4, r: 14 }, {
              integ: -2, next: 'n3',
              say: `Dottor Landi, la situazione che ha ereditato non dipendeva solo da noi. Il team di Elena non ha mai chiesto formazione, e senza richieste è difficile intervenire, anche volendo.`,
              react: [
                { w: 'landi', a: `senza alzare il tono`, t: `Non mi interessa di chi sia la colpa. Mi interessa che funzioni.` },
                { n: `Dietro la vetrata un tecnico solleva una provetta controluce. In sala nessuno si muove.` },
                { think: `Elena non è qui a rispondere. E lui se n’è accorto.` },
              ],
            }),
          ch('b', 3, `Ha ragione, e ce ne assumiamo la responsabilità. Piano a 30-60-90: ticket chiusi in 14 giorni da Davide e Luca, formazione ai due team, una review al mese con lei.`,
            `Hai trasformato un’accusa in un piano con responsabili e scadenze, e hai dato a Landi qualcosa che può misurare. Non è fiducia, è tempo: e adesso il primo mese è una scadenza che ti riguarda.`,
            { t: 10, v: 8, c: 10, r: -12 }, {
              mp: ['Dc', 'E'], set: { ownedIssues: true }, next: 'n3',
              say: `Ha ragione, e ce ne assumiamo la responsabilità. Le propongo un piano a 30-60-90 giorni. I due ticket chiusi entro quattordici giorni, con Davide e Luca come responsabili; formazione ai due team che non l’hanno mai ricevuta; una review al mese con lei, con adozione e ticket come metriche.`,
              react: [
                { w: 'landi', a: `prende appunti`, t: `Mi piace che abbia nomi e date.` },
                { w: 'landi', a: `alzando lo sguardo`, t: `Non sono convinto, intendiamoci. Ma le concedo una finestra: mi faccia vedere il primo mese.` },
                { think: `Una finestra, non un sì. Un mese per meritarlo.` },
              ],
            }),
          ch('c', 2, `Capisco la frustrazione. Faccio trattare i due ticket con priorità assoluta e ne riparliamo fra qualche settimana, quando avrà potuto vedere cosa è cambiato.`,
            `Risposta pronta e rispettosa, ma resta un impegno senza forma: niente date, niente nomi, niente metriche. Landi ha un problema in meno da temere e nessuna ragione in più per credere in noi.`,
            { t: 2, c: 2, r: -4 }, {
              mp: ['E'], set: { ownedIssues: true }, next: 'n3',
              say: `Capisco la frustrazione, dottor Landi. Faccio trattare i due ticket con priorità e ne riparliamo fra qualche settimana, con i fatti in mano.`,
              react: [
                { w: 'landi', a: `annuisce, senza entusiasmo`, t: `Va bene. Vedremo.` },
                { n: `Chiude la cartellina che aveva davanti. Il problema è stato preso in carico, ma nessuno ha scritto una data.` },
                { think: `Ho risposto a quello che ha detto, non a quello che gli serve per fidarsi.` },
              ],
            }),
          ch('d', 2, `Chiedo a Marta, la nostra Sales Director, di scriverle personalmente a nome di Nexora per impegnarsi sul piano di recupero e sui tempi dei due ticket.`,
            `Mettere in campo un executive mostra serietà, ma da solo è una promessa in più: Landi vuole fatti che può misurare. Funziona meglio quando arriva dopo un piano, non al posto del piano.`,
            { t: 6, c: 4, r: -4 }, {
              jolly: 'exec', mp: ['E'], next: 'n3',
              say: `Dottor Landi, ho chiesto a Marta, la nostra Sales Director, di scriverle direttamente. Nexora le confermerà per iscritto che i due ticket e il recupero dell’account sono una priorità della direzione.`,
              react: [
                { w: 'landi', a: `gira tra le dita il badge`, t: `Una lettera della vostra direzione. Apprezzo il gesto. Ma le lettere le leggo, le consegne le misuro.` },
                { think: `Ha preso sul serio il gesto e un secondo dopo mi ha chiesto il conto.` },
              ],
            }),
        ],
      },

      n3: {
        when: `Un mese dopo · martedì 10:00`, view: 'meeting',
        where: `Review a 30 giorni · sede BioNova`,
        scene: (d) => [
          { n: `Un mese dopo, stessa sala sul laboratorio. Stavolta la vetrata è piena: i team di etichettatura e di rilascio lotti lavorano a vista, con il nuovo flusso a schermo accanto ai banconi.` },
          picked(d, 'n2', 'b')
            ? { n: `Il piano a 30-60-90 è rimasto un mese sulla lavagna della vostra sala piccola, con le spunte che avanzano ogni lunedì. Sul tavolo, il report che Davide ha stampato ieri sera: i due ticket sono chiusi, i due team sono stati formati, l’adozione è salita al 52%.` }
            : picked(d, 'n2', 'c')
              ? { n: `Nessun piano scritto, solo la parola data: Davide e Luca hanno trattato i due ticket con priorità, a forza di telefonate. Sul tavolo, il report che Davide ha stampato ieri sera: i due ticket sono chiusi, i due team sono stati formati, l’adozione è salita al 52%.` }
              : picked(d, 'n2', 'd')
                ? { n: `Marta ha scritto a Landi, come promesso, e la sua lettera è finita in una cartella. I due ticket li hanno chiusi Davide e Luca, a forza di telefonate. Sul tavolo, il report che Davide ha stampato ieri sera: i due team sono stati formati, l’adozione è salita al 52%.` }
                : { n: `Nessun piano scritto: solo Luca e Davide che hanno rincorso i ticket a forza di telefonate. Sul tavolo, il report che Davide ha stampato ieri sera: i due ticket sono chiusi, i due team sono stati formati, l’adozione è salita al 52%.` },
          { n: `Landi ha portato con sé Matteo Brambilla, il suo responsabile di supply clinica: una cartellina sotto il braccio, il registro dei lotti aperto alla prima pagina.` },
          { w: 'landi', a: d.flags.tonedeaf || picked(d, 'n2', 'a') ? `ancora guardingo` : `più disteso`, t: `Qualcosa si è mosso. Ma mi mostri il valore: cosa abbiamo ottenuto davvero con il vostro sistema in questi due anni?` },
          { think: `Due anni. È la domanda a cui, in due anni, nessuno ha mai risposto per iscritto.` },
        ],
        prompt: `Come mostri il valore?`,
        hint: `I numeri d’uso non sono valore. Il valore è nell’esito misurato dal suo team.`,
        tip: `Una value realization review parte dagli obiettivi originali, confronta i risultati misurati dal cliente e proietta il valore futuro. L’uso (login, utenti attivi) è solo un indicatore; il risultato (ore, errori, lotti rilasciati) è la prova.`,
        choices: [
          ch('a', 1, `Gli mostro i dati di utilizzo: login, utenti attivi, moduli usati. In un mese sono saliti di 17 punti e il trend è netto in tutti e due i team formati.`,
            `Il grafico è esatto ma risponde a una domanda che Landi non ha fatto: l’uso misura l’attività, non l’esito. Per lui il valore è ciò che il suo team riesce a fare in meno tempo e con meno errori.`,
            { t: -2, c: -2 }, {
              next: 'n4',
              say: `Dottor Landi, guardi l’andamento: in un mese gli utenti attivi sono cresciuti, i moduli usati sono aumentati e l’utilizzo complessivo è salito di 17 punti.`,
              react: [
                { w: 'landi', a: `guarda il grafico`, t: `Utilizzo non è valore. Mi dice quanti entrano, non cosa ci fanno.` },
                { n: `Matteo Brambilla abbassa lo sguardo sul registro dei lotti. Il grafico, sullo schermo, resta lì: corretto e inutile.` },
                { think: `Matteo ha il registro dei lotti aperto davanti. Il valore sta lì dentro, non nel mio grafico.` },
              ],
            }),
          ch('b', 3, `Ricostruisco con il suo team tre risultati: lotti rilasciati il 22% più in fretta, errori di etichettatura quasi dimezzati, 300 ore l’anno di riconciliazione in meno.`,
            `Hai portato il valore dentro il suo team, con numeri che il cliente ha misurato e può ripetere ai suoi superiori. Quando il valore smette di essere una tua affermazione e diventa una sua conferma, cambia chi lo difende.`,
            { t: 8, v: 14, u: 6, c: 6, r: -8 }, {
              mp: ['M', 'C'], next: 'n4',
              say: `Con il suo team di supply abbiamo ricostruito tre risultati, e li ha misurati il suo team, non noi. Il rilascio dei lotti clinici è più rapido del 22%. Gli errori di etichettatura sono quasi dimezzati. E sono 300 ore l’anno di riconciliazione manuale che non servono più. Ora li proiettiamo sui due trial in partenza.`,
              react: [
                { w: 'landi', a: `guarda i numeri, poi il suo responsabile`, t: `Confermo. È vero.` },
                { w: 'matteo', a: `annuisce`, t: `Le ore le ho contate io, riga per riga.` },
                { w: 'landi', a: `posando la penna`, t: `Mi servirebbe anche per il trial di fase tre.` },
                { think: `Il valore adesso è suo. Non devo più difenderlo io.` },
              ],
            }),
          ch('c', 2, `Apro la presentazione sulla roadmap: i nuovi moduli, le date di rilascio, dove va il prodotto nei prossimi dodici mesi e cosa cambierà per il suo team.`,
            `La roadmap è materiale buono nel momento sbagliato: Landi chiede cosa è già successo e tu gli parli di cosa succederà. Il futuro si vende dopo che il passato è stato riconosciuto come valore.`,
            { v: 2 }, {
              next: 'n4',
              say: `Dottor Landi, le faccio vedere dove sta andando il prodotto: i nuovi moduli e le date di rilascio dei prossimi dodici mesi.`,
              react: [
                { w: 'landi', a: `ascolta fino in fondo`, t: `La roadmap non è ciò che ho usato. A me interessa il presente.` },
                { n: `Le slide scorrono: moduli, date di rilascio, un grafico che sale. Matteo Brambilla controlla l’orologio senza farsi notare.` },
                { think: `Quattro slide sul futuro, e il registro dei lotti è ancora lì, aperto sul tavolo.` },
              ],
            }),
          ch('d', 3, `Gli propongo una telefonata con il VP Operations di un’altra biotech che ha vissuto un percorso simile: partenza difficile, ripresa, risultati al secondo anno.`,
            `Una conversazione tra pari toglie al cliente la sensazione di essere un caso unico e fa parlare qualcuno senza interesse commerciale. È un jolly ben speso: porta prova esterna dove la tua parola, da sola, non basta.`,
            { t: 8, v: 8, c: 2, r: -6 }, {
              jolly: 'ref', mp: ['C'], next: 'n4',
              say: `Dottor Landi, le propongo una telefonata con Claudio Vitali, VP Operations di un’altra biotech. Ha fatto un percorso simile al vostro: partenza difficile, poi la ripresa, risultati al secondo anno. Lo chiamiamo domani, se le va.`,
              react: [
                { n: `La telefonata si fa il giorno dopo, nella stessa sala, in vivavoce. Parlano per quaranta minuti. Tu quasi non intervieni.` },
                { w: 'vitali', a: `al vivavoce`, t: `Anche da noi è stato difficile. Il primo anno ho pensato di cambiare fornitore: due reparti non avevano mai aperto lo strumento. Le cose sono girate quando i miei hanno cominciato a contare le ore risparmiate, non quando l’ho detto io.` },
                { think: `Non glielo dico io. Glielo dice uno che ci è già passato.` },
              ],
            }),
        ],
      },

      n4: {
        enter: { fx: { r: 6 } },
        when: `Giovedì · 14:20`, view: 'mail',
        where: `Email · Acquisti · giovedì 14:20`,
        scene: (d) => [
          { n: `Giovedì, dopo pranzo. Il laptop segnala una mail con la busta rossa: Acquisti BioNova, in copia Landi.` },
          { chat: { from: 'sara', app: 'Teams' }, t: `Le ho appena inviato una comunicazione formale a nome degli Acquisti. La apra appena può: richiede una risposta.` },
          { mail: { from: `Sara Monti · Acquisti BioNova`, subj: `Rinnovo: valutazione comparativa` }, t: `Gentili, nell’ambito del rinnovo abbiamo ricevuto l’offerta di un altro fornitore, inferiore del 30% per un perimetro che riteniamo simile. Chiediamo di allineare il prezzo del rinnovo. In caso contrario procederemo con una valutazione comparativa, come da nostra procedura.`, sfx: 'ping' },
          { think: `Il trenta per cento di €240k sono €72k: un numero che gli Acquisti sanno leggere senza aiuto.` },
          { chat: { from: 'luca', app: 'Teams' }, t: `L’ho vista. Dimmi che hai già una mossa.` },
          picked(d, 'n1', 'd')
            ? { think: `Il punto di partenza gliel’ho dato io, con uno sconto offerto prima che qualcuno lo chiedesse. Adesso lo usa.` }
            : { think: `Fino a ieri il rischio era un VP freddo. Da oggi è anche una cifra messa nero su bianco.` },
        ],
        prompt: `Come rispondi agli Acquisti?`,
        hint: `Un confronto di prezzo senza un confronto di valore premia solo chi sconta di più.`,
        tip: `Contro un’offerta più bassa porta il confronto su perimetro e rischio di migrazione, e proponi una struttura legata ai risultati: non uno sconto netto, ma un prezzo che riconosce l’adozione. Ti sposti sul valore, e il cliente ottiene ciò che cerca: un incentivo.`,
        choices: [
          ch('a', 0, `Accetto di allinearci: riduco il rinnovo del 30%, così la comparazione non parte e il contratto resta nostro senza altre trattative né altri rischi.`,
            `Allineare il prezzo senza aver confrontato i perimetri dice al cliente che quel numero era un margine, non un valore. E su un account che ha appena smesso di sanguinare, ogni punto concesso si ripresenterà al prossimo rinnovo.`,
            { t: -2, v: -12, c: -4, d: 30 }, {
              next: 'n5',
              say: `Gentile Sara, abbiamo capito la richiesta. Siamo disposti ad allinearci: sul rinnovo applichiamo il 30% di riduzione.`,
              react: [
                { w: 'sara', a: `al telefono, senza sorpresa`, t: `Ne prendo atto. Quindi si può fare.` },
                { n: `Dal Deal Desk, Giulia ti scrive una riga: “Hai detto davvero trenta?”.` },
                { think: `Settantadue mila euro regalati prima di aver capito cosa comprano.` },
              ],
            }),
          ch('b', 3, `Propongo un biennale legato all’adozione: canone base –8%, più una parte variabile se arrivano al 70% di adozione e i ticket critici si chiudono in meno di cinque giorni.`,
            `Hai trasformato lo sconto in un patto: il cliente paga di più solo se ottiene di più, e il rischio smette di essere solo tuo. È la mossa che sposta la discussione dal prezzo al valore.`,
            { t: 6, v: 6, c: 10, r: -10, d: 8 }, {
              mp: ['Co'], set: { giveGet: true }, next: 'n5',
              say: `Gentile Sara, non allineo il prezzo, allineo il rischio. Le propongo un rinnovo biennale con canone base ridotto dell’8% e una parte variabile che si paga se si raggiungono due risultati: adozione al 70% e ticket critici risolti in meno di cinque giorni. Paga di più solo chi ottiene di più.`,
              react: [
                { mail: { from: `Sara Monti · Acquisti BioNova`, subj: `Re: Rinnovo: valutazione comparativa` }, t: `La struttura mi convince: il prezzo segue i risultati e il rischio si divide. Sospendo la comparazione in attesa della vostra bozza.` },
                { mail: { from: `Giorgio Landi`, subj: `Re: Rinnovo: valutazione comparativa` }, t: `Tiene insieme valore e budget. Preparate la bozza.` },
                { think: `Non ho tagliato un prezzo. Ho dato loro un modo di misurarci.` },
              ],
            }),
          ch('c', 2, `Chiedo a Sara di vedere l’offerta concorrente, così confrontiamo perimetro e condizioni punto per punto prima di parlare di prezzo o di sconti.`,
            `Hai spostato la conversazione dal prezzo al perimetro, e l’ammissione di Sara è un argomento solido. Ma un argomento non è una controproposta: finché non offri una struttura, il confronto resta un calcolo sul prezzo.`,
            { v: 4, c: 2 }, {
              mp: ['Co'], next: 'n5',
              say: `Gentile Sara, prima di discutere il prezzo vorrei capire cosa stiamo confrontando. Può mostrarmi l’offerta, o almeno il perimetro? Sulla stessa base ragioniamo meglio.`,
              react: [
                { w: 'sara', a: `al telefono`, t: `L’offerta non posso mostrargliela. Posso dirle che non include né la validazione GxP né il supporto dedicato.` },
                { think: `Non ho il documento, ma ho un argomento. Non è ancora una proposta.` },
              ],
            }),
          ch('d', 1, `Rispondo che il prezzo non si tocca: il valore è già nel contratto e il perimetro dell’altra offerta non è confrontabile con il nostro, quindi non c’è nulla da allineare.`,
            `Un no con un argomento dichiarato e non dimostrato: dici che il perimetro non è confrontabile, ma non hai visto l’altra offerta e non porti un confronto. Così consegni agli Acquisti l’unica strada che gli resta, la comparazione.`,
            { t: -4, c: -4, r: 10 }, {
              next: 'n5',
              say: `Gentile Sara, il prezzo del rinnovo non è modificabile. Il valore è già nel contratto e il perimetro dell’offerta che avete ricevuto non è confrontabile con il nostro.`,
              react: [
                { mail: { from: `Sara Monti · Acquisti BioNova`, subj: `Re: Rinnovo: valutazione comparativa` }, t: `Ne prendiamo atto. Procediamo con la comparazione.` },
                { think: `Ho detto “non è confrontabile” senza aver visto un solo foglio dell’altra offerta.` },
              ],
            }),
        ],
      },

      n5: {
        when: `Lunedì · 11:00`, view: 'call',
        where: `Call · Landi · lunedì 11:00`,
        scene: (d) => [
          { n: `Lunedì, Teams. Landi è in una stanza con la porta a vetri: alle sue spalle il corridoio dei laboratori e, ogni tanto, un carrello di contenitori refrigerati che passa.` },
          picked(d, 'n4', 'b')
            ? { n: `La bozza del biennale con la parte variabile è sul tavolo di Sara e di Landi: nessuno l’ha firmata, nessuno l’ha respinta.` }
            : picked(d, 'n4', 'a')
              ? { n: `Sara ha il tuo meno trenta in mano e da giovedì non ha più scritto. Il silenzio degli Acquisti, dopo una concessione così, non ti rassicura.` }
              : picked(d, 'n4', 'c')
                ? { n: `Da giovedì Sara non ti ha detto altro. Sai cosa manca all’altra offerta, ma nessuno ti ha ancora chiesto cosa offri tu.` }
                : { n: `Gli Acquisti hanno aperto la comparazione. Landi non l’ha nominata una sola volta, e non sai se sia un buon segno.` },
          { w: 'landi', a: `riflessivo`, t: `Il modulo per la gestione dei trial clinici ci servirebbe. Ma prima voglio vedere l’adozione al 70% e il mio team contento.` },
          { think: `“Ci servirebbe.” Se lo trasformo in un impegno, rovino tutto. Se non lo tocco, lo regalo a qualcun altro.` },
          { n: `Nell’altra finestra il CRM mostra ancora €320k in Commit: quasi un quinto della tua quota di trimestre.` },
          { think: `Il CRM vuole un numero. Landi vuole una soglia. Non è detto che siano la stessa cosa.` },
        ],
        prompt: `Come tratti l’espansione?`,
        hint: `Rinnovo ed espansione sono due decisioni, con tempi diversi.`,
        tip: `Separa le decisioni: rinnovo certo ora, espansione legata a milestone. Un’opzione scritta a prezzo bloccato che si attiva a un obiettivo dà al cliente comfort e a te visibilità sulla pipeline.`,
        choices: [
          ch('a', 0, `Propongo il pacchetto unico: rinnovo più espansione, €320k a listino, con firma entro fine trimestre. Una decisione sola, un solo budget, un solo passaggio con il suo CFO.`,
            `Hai legato espansione e rinnovo: due decisioni con tempi e rischi diversi. Quando una vacilla trascina l’altra, e Landi ha appena detto che il suo criterio per la seconda non è ancora soddisfatto.`,
            { t: -8, c: -4, r: 12 }, {
              next: 'n6',
              say: `Dottor Landi, mi piacerebbe chiudere tutto in un colpo: rinnovo e modulo trial insieme, €320k a listino, con firma entro fine trimestre. Una decisione sola, un solo budget.`,
              react: [
                { w: 'landi', a: `si irrigidisce`, t: `Mi state forzando.` },
                { w: 'landi', a: `più piano`, t: `Ho chiesto una cosa sola: vedere l’adozione al 70%. Non un pacchetto.` },
                { think: `Sapevo che voleva una soglia, non un pacchetto. E ho portato un pacchetto.` },
              ],
            }),
          ch('b', 3, `Rinnoviamo ora il contratto base e attiviamo una prima tranche del modulo trial. Il resto è un’opzione a prezzo bloccato che scatta oltre il 70% di adozione.`,
            `Hai separato le decisioni: rinnovo certo subito, espansione legata a una soglia che il cliente stesso ha indicato. Una tranche e un’opzione scritta danno a lui un obiettivo da raggiungere e a te visibilità sulla pipeline.`,
            { t: 6, v: 8, u: 4, c: 10, r: -8, l: -40 }, {
              set: { expansion: true }, next: 'n6',
              say: `Facciamo due cose distinte. Rinnoviamo ora il contratto base e attiviamo subito una prima tranche del modulo trial. Il resto è un’opzione a prezzo bloccato, che si attiva quando l’adozione supera il 70%. Sull’opzione non paga nulla in anticipo, e io ho un obiettivo che condividiamo con lei, non una vendita da forzare.`,
              react: [
                { w: 'landi', a: `quasi sorride`, t: `Questa è una proposta che il mio CFO capisce.` },
                { n: `Annota qualcosa, poi condivide lo schermo con la sua agenda: giovedì, riunione con il CFO. La prima tranche da €40k parte subito; il resto ha una soglia e una data da inseguire.` },
                { think: `Non ho venduto un modulo. Gli ho dato una scala da salire.` },
              ],
            }),
          ch('c', 2, `Rimandiamo l’espansione all’anno prossimo: adesso ci concentriamo solo sul rinnovo e sul piano, senza forzare nulla, e ne riparliamo a risultati ottenuti.`,
            `Scelta prudente, che protegge il rinnovo ma lascia aperta la porta al primo concorrente con un pilota: Landi ha dichiarato un bisogno e tu non gli hai dato un percorso per soddisfarlo. L’opzione scritta costava meno di questa attesa.`,
            { t: 2, c: 4, r: -4, l: -80 }, {
              next: 'n6',
              say: `Dottor Landi, rimandiamo l’espansione. Oggi mi concentro sul rinnovo e sul piano; del modulo ne riparliamo l’anno prossimo, quando avremo i risultati in mano.`,
              react: [
                { w: 'landi', a: `con un cenno`, t: `Mi sembra ragionevole. Ci aggiorniamo.` },
                { n: `La call finisce in dieci minuti. Nel CRM l’espansione scivola all’anno prossimo, e il tuo trimestre perde €80k.` },
                { think: `Prudente. Ma ho lasciato fermo un modulo che Landi aveva appena nominato.` },
              ],
            }),
          ch('d', 1, `Le offro il modulo trial gratis per un anno se firma un rinnovo biennale: per noi è un investimento sul rapporto, per lei un rischio in meno.`,
            `Hai ceduto un modulo da €80k per assicurarti un rinnovo, senza chiedere altro che una firma. Uno scambio legato a un obiettivo avrebbe protetto lo stesso contratto lasciando intatto il valore del modulo.`,
            { v: -4, d: 25 }, {
              next: 'n6',
              say: `Le propongo questo: firma un rinnovo biennale e il modulo trial lo ha gratis per il primo anno. Per noi è un investimento sul rapporto.`,
              react: [
                { w: 'landi', a: `alza un sopracciglio`, t: `Gratis? Mi sta dicendo che il modulo non vale quello che costa?` },
                { think: `Ho appena messo il cartellino zero su un modulo da €80k.` },
              ],
            }),
        ],
      },

      n6: {
        when: `Venerdì · 17:30`, view: 'call', bg: 'night',
        where: `Call · Luca · venerdì 17:30`,
        scene: (d) => [
          { n: `Venerdì sera, l’open space si è svuotato. Resta il ronzio della ventilazione e una sola fila di plafoniere accesa. Luca ti chiama su Teams dal parcheggio, con il motore dell’auto acceso.` },
          { w: 'luca', a: `pensieroso`, t: `Ci ho ripensato tutta la settimana. Elena era l’unica che ci difendeva da dentro, e quando se n’è andata siamo rimasti scoperti. Non vorrei che succedesse di nuovo.` },
          { w: 'luca', t: `Matteo Brambilla, della supply, lo conosciamo. Per qualità e IT invece non ho mai sentito nessuno.` },
          d.flags.coSponsor
            ? { think: `Lunedì scade il contratto. Landi e Matteo: due nomi, ma solo uno firma il budget, e Landi tra sei mesi potrebbe essere altrove.` }
            : d.m.trust < 30
              ? { think: `Lunedì scade il contratto. L’unico nome sulla mappa è Landi, e in questo momento non ci difende: ci misura. Tra sei mesi potrebbe essere altrove.` }
              : { think: `Lunedì scade il contratto. Chi difende questo account, oggi, è Landi e basta, e tra sei mesi potrebbe essere altrove.` },
          { n: d.m.risk <= 30 ? `Sulla dashboard, in un angolo, il riquadro del rinnovo è passato da rosso a verde. Resta da firmare il contratto.` : d.m.risk <= 50 ? `Sulla dashboard, in un angolo, il riquadro del rinnovo è passato da rosso ad ambra. Non è verde.` : `Sulla dashboard, in un angolo, il riquadro del rinnovo è ancora rosso. Lunedì il contratto potrebbe firmarsi lo stesso, o no.` },
        ],
        prompt: `Come chiudi, evitando di ripetere l’errore?`,
        hint: `Il tuo prossimo rischio di churn nasce da uno sponsor unico.`,
        tip: `Dopo un churn evitato il lavoro è non ricrearlo: relazioni su più livelli (utenti chiave, IT, finanza, executive), un Executive Sponsor Nexora e una business review trimestrale con KPI condivisi.`,
        choices: [
          ch('a', 3, `Con Landi definisco tre sponsor lato BioNova (supply, qualità, IT), un executive sponsor Nexora e una business review trimestrale con KPI condivisi, nel contratto.`,
            `Hai trasformato un rinnovo in una struttura: più persone, più livelli, una cadenza e un allegato che sopravvive anche a un cambio di ruolo. È la differenza tra uno sponsor e un’assicurazione.`,
            { t: 6, c: 10, r: -10 }, {
              mp: ['P'], set: { threaded: true }, next: 'END',
              say: `Luca, facciamo così. Con Landi definiamo tre sponsor lato BioNova: supply, qualità e IT, ciascuno con un obiettivo suo. Da parte nostra un executive sponsor, e una business review trimestrale con KPI condivisi. E il piano non lo teniamo in un file: lo mettiamo come allegato al contratto di rinnovo.`,
              react: [
                { n: `Il lunedì mattina la bozza torna da BioNova con una sola modifica a mano, in margine all’allegato.` },
                { mail: { from: `Giorgio Landi`, subj: `Re: Allegato piano di relazione` }, t: `Così non dipende più da una persona. Il nome per la qualità lo aggiungo io. Mandatemi la versione finale.` },
                { think: `Adesso l’account non ha più un solo punto di rottura.` },
              ],
            }),
          ch('b', 1, `Chiudo il rinnovo e basta: una volta firmato il contratto, il resto passa alla Customer Success, che ha le persone e il tempo per seguirlo meglio di me.`,
            `Hai guadagnato il trimestre e perso l’account: il rischio che vi ha lasciati scoperti quando Elena se n’è andata, uno sponsor unico, è ancora lì, con un altro nome. Passare la palla alla Customer Success senza una struttura non è una strategia.`,
            { c: -4, r: 6 }, {
              mp: ['P'], next: 'END',
              say: `Luca, chiudiamo il rinnovo e basta. Una volta firmato, la relazione passa a te e al tuo team: è il vostro mestiere.`,
              react: [
                { w: 'luca', a: `dopo un silenzio`, t: `Va bene. Ma un CSM non sostituisce uno sponsor, lo sai. Spero solo che tra un anno qualcuno si ricordi come eravamo messi.` },
                { think: `Landi resta l’unico nome sulla mappa. Se cambia ruolo, si ricomincia da capo, come è già successo con Elena.` },
              ],
            }),
          ch('c', 2, `Fisso con Landi una business review annuale: risultati ottenuti, rinnovo e priorità dell’anno dopo, con la data già in calendario e il verbale a mio carico.`,
            `Direzione giusta, passo troppo lento: per un cliente che ha appena rischiato di andarsene, dodici mesi tra un confronto e l’altro sono un tempo in cui nessuno ti guarda. E la review resta con una persona sola.`,
            { t: 2, c: 4, r: -2 }, {
              mp: ['P'], next: 'END',
              say: `Luca, fissiamo con Landi una business review all’anno: risultati, rinnovo e priorità dell’anno dopo. La data la mettiamo in calendario adesso.`,
              react: [
                { w: 'luca', a: `scuote la testa, senza durezza`, t: `Una volta all’anno è poco. I due ticket sono rimasti aperti due mesi senza che nessuno se ne accorgesse: con una review l’anno non ce ne accorgeremmo nemmeno la prossima volta.` },
                { think: `Una riga in calendario tra dodici mesi. E nel frattempo chi guarda questo account?` },
              ],
            }),
          ch('d', 2, `Faccio strutturare al Deal Desk un contratto triennale a prezzo bloccato, con un programma di customer success dedicato, così l’account è al sicuro per tre anni.`,
            `Triennale e programma dedicato mettono l’account al sicuro sulla carta, ma la mossa viene letta come commerciale: manca la parte relazionale che ha causato il problema. Il contratto protegge il prezzo, non lo sponsor.`,
            { t: 2, c: 6, r: -4 }, {
              jolly: 'desk', mp: ['P'], set: { deskApproved: true }, next: 'END',
              say: `Faccio preparare al Deal Desk un contratto triennale a prezzo bloccato, con un programma di customer success dedicato incluso. Così l’account è messo in sicurezza per tre anni.`,
              react: [
                { n: `Giulia, del Deal Desk, risponde in un’ora con una struttura a tre anni, un referente dedicato e due review l’anno.` },
                { w: 'luca', a: `perplesso`, t: `È solido. Ma è un contratto, non una relazione. Chi lo racconta ai team?` },
                { think: `Ho blindato il documento. Le persone no.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'ticket_nuovo', title: `Un nuovo ticket critico`, w: 2, after: ['n2', 'n3'],
        node: {
          when: `Il giorno dopo · 16:40`, view: 'phone', where: `Telefono · Luca Bassi`,
          scene: (d) => [
            { n: `Il telefono vibra due volte sul tavolo, si ferma, riparte. Sul display: Luca.`, sfx: 'phone' },
            { w: 'luca', a: `di corsa, in vivavoce`, t: `Si è appena aperto un ticket critico, priorità uno. Il rilascio di un lotto clinico è fermo: l’interfaccia con il sistema di etichettatura restituisce un errore e il tecnico non può stampare le etichette del lotto.` },
            d.flags.diagnosed
              ? { w: 'davide', a: `dalla stanza accanto`, t: `Questa famiglia di errori l’ho già vista: sembra la stessa mappatura dei campi dei primi due ticket. Se è così, lo chiudo in poche ore.` }
              : { w: 'luca', a: `più piano`, t: `Davide non l’ha mai visto. Non so se è legato ai primi due o se è un problema nuovo.` },
            visited(d, 'n3')
              ? { n: `Ieri, in sala, i due ticket storici risultavano chiusi. Il terzo è nato meno di un giorno dopo.` }
              : picked(d, 'n2', 'b')
                ? { n: `Il piano a 30-60-90 concordato con Landi ha poche ore di vita, e i primi due ticket sono ancora aperti. Questo è il terzo.` }
                : { n: `Hai visto Landi per la prima volta ieri, e i primi due ticket sono ancora aperti. Questo è il terzo.` },
            d.flags.ownedIssues
              ? { think: `Ho detto a Landi che me ne occupo io. Questo è il primo guasto dopo quelle parole: se lo scopre dal sistema prima che da me, valgono zero.` }
              : { think: `Se Landi lo scopre dal sistema prima che da me, sono ancora una volta quello che arriva dopo.` },
          ],
          prompt: `Un nuovo ticket critico, e Landi non lo sa ancora. Cosa fai per prima cosa?`,
          hint: `La notizia peggiore è quella che il cliente scopre da solo.`,
          tip: `Un nuovo guasto subito dopo una promessa è il vero esame dell’“own it”: il cliente giudica meno il guasto che la velocità e l’onestà con cui glielo comunichi. Dillo tu per primo, con un nome e un orario di aggiornamento.`,
          choices: [
            ch('a', 3, `Chiamo io Landi prima che lo veda dal sistema: cosa è successo, chi ci lavora, a che ora avrà il primo aggiornamento. Davide parte subito sul ticket.`,
              (d) => (d.flags.ownedIssues
                ? `Hai fatto subito ciò che avevi detto in sala: prenderti il problema prima che arrivi a lui, con un nome e un orario. Un guasto comunicato bene costruisce più fiducia di un mese senza guasti.`
                : `Dirlo per primo trasforma un guasto in una prova di serietà, anche senza un piano scritto con Landi. Il cliente ricorda chi lo ha avvertito, non quanto era grave il problema.`),
              (d) => ({ t: d.flags.ownedIssues ? 8 : 5, c: 4, r: d.flags.diagnosed ? -6 : -3 }), {
                next: 'RET', set: { ticketFixed: true },
                say: `Dottor Landi, la chiamo prima che lo veda sul sistema: si è aperto un ticket critico sull’interfaccia di etichettatura e il rilascio di un lotto è fermo. Ci stanno lavorando Davide e Luca. Alle sei le do il primo aggiornamento, qualunque cosa sia successa.`,
                react: (d) => [
                  { w: 'landi', a: `al telefono`, t: d.flags.ownedIssues ? `Lo stavo aprendo proprio adesso. Mi fa piacere che sia lei a dirmelo. Alle sei.` : `Non l’avevo ancora visto. Grazie per averlo detto subito. Alle sei.` },
                  { n: `Alle 17:55 Davide ti scrive una riga: causa trovata, correzione in test. Alle diciotto in punto richiami Landi.` },
                ],
              }),
            ch('b', 2, `Metto Davide e Luca sul ticket con la massima priorità e scrivo a BioNova solo quando ho la causa: preferisco dare una risposta, non un aggiornamento a vuoto.`,
              `Il guasto si risolve, ma lo racconti a lavoro finito: nel frattempo Landi può averlo scoperto da solo, e un silenzio di poche ore pesa più del guasto. Corretto sul piano tecnico, meno su quello della fiducia.`,
              (d) => ({ t: -1, c: 2, r: d.flags.diagnosed ? -3 : 2 }), {
                next: 'RET', set: { ticketFixed: true },
                say: `Metto Davide e Luca sul ticket con la massima priorità. A BioNova scrivo appena ho la causa: preferisco darvi una risposta, non un aggiornamento a vuoto.`,
                react: [
                  { n: `Davide trova la causa in tre ore e mezza. Il ticket si chiude prima di cena.` },
                  { mail: { from: `Giorgio Landi`, subj: `Ticket critico etichettatura` }, t: `Ho visto il ticket sul sistema alle cinque. Per fortuna lo avete chiuso in giornata. La prossima volta preferisco saperlo da voi.` },
                ],
              }),
            ch('c', 1, `Rispondo al tecnico che ha aperto il ticket con la procedura standard e i tempi previsti dal contratto: per me è un ticket come gli altri.`,
              `Un ticket critico dopo due ticket critici non è un ticket come gli altri: per il cliente fa parte della stessa storia. La procedura standard è corretta, e proprio per questo suona come una risposta a una pratica e non a una persona.`,
              { t: -5, c: -3, r: 8 }, {
                next: 'RET',
                say: `Rispondo al tecnico con la procedura standard: presa in carico, tempi di risposta previsti dal contratto, aggiornamento entro la giornata successiva.`,
                react: [
                  { n: `Il tecnico ringrazia con una riga. Il ticket entra nella coda ordinaria e ci resta per due giorni, entro i tempi del contratto. Il lotto, intanto, è fermo.` },
                  { w: 'luca', a: `a bassa voce`, t: `Dentro i tempi, sì. Ma a Landi non basta più.` },
                ],
              }),
            ch('d', 0, `Chiedo a Luca di classificarlo a priorità due finché non capiamo la causa: segnarlo critico adesso peggiora solo i numeri della dashboard.`,
              `Declassare un ticket per tenere pulito un indicatore non è prudenza, è maquillage: se Landi lo scopre, e prima o poi lo scopre, perde fiducia nell’intera dashboard. La gravità la decide l’impatto sul cliente, non il colore di un riquadro.`,
              { t: -8, c: -4, r: 12 }, {
                integ: -3, next: 'RET',
                say: `Luca, mettilo a priorità due finché non capiamo la causa. Segnarlo critico adesso peggiora solo i numeri della dashboard.`,
                react: [
                  { w: 'luca', a: `a denti stretti`, t: `Se lo faccio, il ticket lo vedono comunque: è il loro tecnico che aspetta le etichette. Però resti scritto che lo faccio perché me l’hai chiesto tu.` },
                  { think: `Ho ritoccato il colore di un riquadro. Il lotto è sempre fermo.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'commento_duro', title: `Un commento molto duro`, w: 1, after: ['n2', 'n3', 'n4'],
        node: {
          when: `Il giorno dopo · 09:20`, view: 'mail', where: `Email · Luca Bassi · inoltro dal sondaggio`,
          scene: (d) => [
            { chat: { from: 'luca', app: 'Teams' }, t: `Ti ho girato una mail. Leggila da seduto, e prima di rispondere a chiunque.` },
            { n: `Una mail di Luca, oggetto “Da leggere prima del caffè”. In fondo, incollato senza correzioni, il commento libero di un utente nel sondaggio di soddisfazione.` },
            { mail: { from: `Luca Bassi · Nexora`, subj: `Da leggere prima del caffè` }, t: `Il sondaggio è anonimo, ma dal modo in cui scrive è un tecnico di etichettatura, turno di notte. L’hanno letto in molti. Eccolo: “Strumento disegnato da chi non ha mai indossato un camice. Per stampare un’etichetta ci metto più tempo di quanto ne servirebbe per sbagliarla a mano. Se lo rinnovate, io chiedo di cambiare reparto.”` },
            visited(d, 'n3')
              ? { n: `Il commento è di dopo la formazione: non è l’arretrato di un team lasciato solo. Qualcosa, nell’uso di tutti i giorni, continua a non funzionare.` }
              : { n: `Il commento è di prima della formazione: viene probabilmente da uno dei due team che nessuno ha mai istruito. Ma chi lo legge non lo sa, e lo prende per un giudizio di oggi.` },
            { chat: { from: 'landi', app: 'Teams' }, t: `Mi è arrivato dalla mia responsabile qualità. Voglio sapere cosa rispondete. Non a lui: a me.`, sfx: 'ping' },
            d.flags.diagnosed
              ? { think: `Quel passaggio lo conosco: è nella configurazione che Davide ha già toccato. Posso rispondere con un fatto, non con una promessa.` }
              : { think: `Non so ancora se ha ragione lui o se usa male lo strumento. In entrambi i casi devo saperlo prima di rispondere.` },
          ],
          prompt: `Il commento è duro, circola, e Landi vuole una risposta. Come la imposti?`,
          hint: `Un commento duro è un’informazione gratuita: capisci cosa dice di vero prima di decidere a chi rispondere.`,
          tip: `La risposta migliore a un utente arrabbiato è andare a vedere il suo lavoro: un’osservazione sul campo vale più di dieci risposte scritte. Ma l’accesso passa dal responsabile: concordalo con Landi prima di avvicinare l’utente.`,
          choices: [
            ch('a', 2, `Chiedo a Luca di rintracciare il tecnico e fisso mezz’ora nel suo reparto con Davide: voglio guardarlo lavorare e capire dove perde il tempo.`,
              `Andare a guardare il lavoro è la mossa giusta; farlo senza passare da Landi è un passo falso di forma: in un’azienda regolata nessuno avvicina un dipendente senza il via libera del suo responsabile. Utile sul campo, meno nella relazione.`,
              (d) => ({ t: 3, v: 3, c: 2, r: d.flags.diagnosed ? -4 : -2 }), {
                next: 'RET',
                say: `Luca, rintracciamo il tecnico e fissiamo mezz’ora nel suo reparto, io e Davide. Voglio guardarlo mentre stampa le etichette e capire dove perde il tempo.`,
                react: [
                  { n: `Due giorni dopo, nel reparto di etichettatura, Davide si siede accanto al tecnico e lo osserva stampare tre lotti di fila.` },
                  { w: 'davide', a: `a mezza voce`, t: `Su un passaggio ha ragione: l’etichetta si ricarica da un menu che nessuno gli ha mai mostrato. Dieci minuti e si sistema.` },
                  { w: 'landi', a: `per messaggio, la sera`, t: `Mi dicono che siete stati in reparto senza avvisarmi. Il risultato mi interessa. Il metodo no: la prossima volta mi avvisi prima.` },
                ],
              }),
            ch('b', 3, `Vado da Landi per primo con una risposta pronta: riconosco il problema, dico cosa verifichiamo in reparto e quando torniamo con un esito. Gli chiedo il permesso.`,
              `Hai riconosciuto il problema senza difenderti, hai detto cosa verificare e quando tornare con un esito, e hai chiesto il permesso prima di entrare nel suo reparto. Così si lavora con un cliente regolato anche quando la notizia è brutta: il commento diventa un accesso con il suo consenso.`,
              (d) => ({ t: 7, v: 4, c: 6, r: d.flags.ownedIssues ? -6 : -3 }), {
                next: 'RET',
                say: `Dottor Landi, ho letto il commento e non lo contesto: se un tecnico dice di perdere tempo a ogni etichetta, qualcosa nel flusso non va. Mi dia mezza giornata: andiamo in reparto, con il suo permesso, guardiamo cosa succede e le porto un esito entro venerdì.`,
                react: [
                  { w: 'landi', a: `scrivendo subito`, t: `Ha il mio permesso. Parli prima con la responsabile del reparto, poi con lui. E venerdì voglio un esito, non un resoconto.` },
                  { think: `Un commento che sembrava un’accusa è diventato un accesso.` },
                ],
              }),
            ch('c', 0, `Rispondo al reparto con una nota: i passaggi per stampare le etichette sono tutti nella documentazione, e dopo la formazione non dovrebbero più creare problemi.`,
              `Difendere il prodotto contro un utente che dice di perdere tempo significa dirgli che sbaglia lui. Anche se la documentazione è corretta, un tecnico che non la trova ha comunque un problema, e adesso sa che a Nexora non interessa.`,
              { t: -8, v: -3, c: -3, r: 10 }, {
                next: 'RET',
                say: `Rispondo al reparto con una nota: i passaggi per stampare le etichette sono tutti nella documentazione, e dopo la formazione non dovrebbero più creare problemi.`,
                react: [
                  { w: 'landi', a: `a Luca, con te in copia`, t: `Un rimando alla documentazione a un tecnico che lavora di notte. Non era questo che le avevo chiesto.` },
                  { think: `Gli ho spiegato dove sbaglia. Non gli ho chiesto cosa gli serve.` },
                ],
              }),
            ch('d', 1, `Lascio la gestione a Luca: i commenti degli utenti sono materia della Customer Success, io mi concentro sul rinnovo con Landi, che è il motivo per cui sono qui.`,
              `È una divisione dei ruoli comprensibile, ma sbagliata proprio ora: Landi ha chiesto la risposta a te, e un commento sull’uso quotidiano è esattamente il tipo di segnale che decide un rinnovo. Delegare significa che a rispondere sarà un altro, non che la domanda sparisca.`,
              { t: -3, c: -3, r: 4 }, {
                next: 'RET',
                say: `Luca, questa la gestisci tu: i commenti degli utenti sono materia della Customer Success. Io mi concentro sul rinnovo con Landi.`,
                react: [
                  { w: 'luca', a: `senza discutere`, t: `Va bene, la scrivo io. Però Landi l’ha chiesta a te.` },
                  { think: `Ho scelto il rinnovo e ho lasciato il segnale a qualcun altro.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'convegno', title: `Il team di Landi va al convegno`, w: 2, after: ['n3', 'n4'],
        if: (d) => !!d.flags.ownedIssues,
        node: {
          when: `Il giorno dopo · 12:10`, view: 'phone', where: `Chat · Teams · Matteo Brambilla`,
          scene: (d) => [
            { n: `Pausa pranzo. Il telefono si illumina sul tavolo della mensa Nexora: un messaggio di Matteo Brambilla, il responsabile di supply di Landi.`, sfx: 'ping' },
            { chat: { from: 'matteo', app: 'Teams' }, t: d.mp.has('M')
              ? `Ti scrivo perché è giusto che tu lo sappia da me. Il convegno sulla supply clinica ha accettato un nostro intervento: presentiamo il nuovo flusso di rilascio dei lotti, con i numeri che abbiamo messo in fila con voi. Landi ha detto sì. Si va in scena fra tre settimane.`
              : `Ti scrivo perché è giusto che tu lo sappia da me. Il convegno sulla supply clinica ha accettato un nostro intervento: presentiamo come abbiamo cambiato il rilascio dei lotti. Per ora abbiamo più impressioni che cifre. Landi ha detto sì. Si va in scena fra tre settimane.` },
            { chat: { from: 'matteo', app: 'Teams' }, t: `Il sistema compare in due slide. Se vuoi dirci qualcosa, questo è il momento.` },
            d.mp.has('M')
              ? { think: `I numeri sono quelli che Landi ha confermato davanti a me. Se in sala qualcuno li smonta, a perdere credibilità è il suo team, e subito dopo io.` }
              : { think: `Presentano un risultato che non hanno ancora misurato fino in fondo, davanti a colleghi di altre aziende. Se sbagliano una cifra, a pagarla è il loro nome.` },
          ],
          prompt: `Il team di Landi presenterà in pubblico, con il tuo sistema nelle slide. Come ti muovi?`,
          hint: `È la loro vetrina, non la tua: aiutali a fare bella figura e la tua parte arriva da sola.`,
          tip: `Quando un cliente sceglie di parlare in pubblico dei risultati, è il massimo del consenso: non va sfruttato, va protetto. Aiutare a verificare numeri e affermazioni rende l’intervento solido e lega chi parla a chi l’ha aiutato; chiedere visibilità lo trasforma in una vetrina commerciale.`,
          choices: [
            ch('a', 3, `Offro a Matteo il supporto di Davide per verificare i numeri e le affermazioni sul sistema: la presentazione è la sua e deve reggere alle domande della sala.`,
              (d) => (d.mp.has('M')
                ? `Hai protetto il momento del cliente invece di appropriartene: con numeri già confermati, il lavoro di Davide li rende a prova di domanda in sala. Matteo non è più solo un conoscente utile, diventa la voce pubblica del risultato.`
                : `Senza numeri già confermati il tuo aiuto pesa ancora di più: Matteo arriva sul palco con cifre verificate invece di impressioni, e sa a chi lo deve. Una voce pubblica che si fida di Nexora è il secondo sponsor che ti mancava.`),
              (d) => ({ t: 8, v: d.mp.has('M') ? 8 : 4, c: 6, r: -4 }), {
                next: 'RET', mp: ['C'], set: { coSponsor: true },
                say: `Matteo, grazie di avermelo detto. La presentazione è vostra e deve restare vostra. Se vi serve, Davide può rivedere con voi i numeri e le affermazioni sul sistema, così che reggano alle domande della sala. Nessun logo da aggiungere, nessuna slide mia.`,
                react: [
                  { w: 'matteo', a: `sollevato`, t: `Sapevo che non avresti chiesto niente in cambio. Mando le slide a Davide già domani.` },
                  { n: `Tre giorni dopo Davide ti gira il file con le correzioni in rosso: due cifre arrotondate male, una frase sul sistema troppo ottimista.` },
                  { think: `Gli ho tolto due errori davanti a una sala piena. Questo lo ricorderà più a lungo di un logo.` },
                ],
              }),
            ch('b', 1, `Mi offro di intervenire con loro: dieci minuti dal palco su come abbiamo lavorato insieme, Nexora e BioNova, con il loro nome accanto al mio.`,
              `Trasformare il loro intervento in un caso studio di fornitore ne cambia la natura: davanti a una platea di colleghi, un cliente che parla accanto al suo vendor perde credibilità, e Landi potrebbe leggerlo come uno sfruttamento del suo team.`,
              { t: -4, c: -3, r: 6 }, {
                next: 'RET',
                say: `Matteo, che bella notizia. Se vi fa piacere, intervengo anch’io: dieci minuti dal palco su come abbiamo lavorato insieme, Nexora e BioNova, con il vostro nome accanto al mio.`,
                react: [
                  { w: 'matteo', a: `con garbo`, t: `Ti ringrazio, ma preferisco di no. Se sul palco ci sei anche tu, la sala sente un fornitore, non un laboratorio.` },
                  { think: `Volevo una vetrina e ho rischiato di rovinare la loro.` },
                ],
              }),
            ch('c', 2, `Chiedo a Luca di preparare una pagina di dati d’uso anonimizzati, da mettere a disposizione del team se vogliono usarla nelle loro slide al convegno.`,
              `Un gesto utile e sobrio: metti a disposizione senza imporre. Ma resta passivo, aspetti che siano loro a chiedere: la verifica dei numeri e delle affermazioni, che è ciò che li protegge davvero, non l’hai offerta.`,
              { t: 3, v: 2, c: 1 }, {
                next: 'RET',
                say: `Matteo, ottima notizia. Luca prepara una pagina di dati d’uso anonimizzati: se vi serve per le slide è a vostra disposizione, altrimenti non fa nulla.`,
                react: [
                  { w: 'matteo', t: `Grazie, la tengo da parte. Se serve, ti dico.` },
                  { n: `La pagina è pronta in giornata. Nessuno la chiederà prima del convegno.` },
                ],
              }),
            ch('d', 1, `Non mi intrometto: è il loro momento e un fornitore che si avvicina troppo rischia di rovinarlo. Faccio gli auguri e basta, e li lascio lavorare.`,
              `Rispettare il loro momento è un istinto corretto, ma qui sfocia nella distanza: non offrire niente significa lasciare Matteo da solo davanti a una platea, con il tuo sistema nelle slide. Aiutare senza chiedere è diverso dall’essere assenti.`,
              { t: -2, u: -2, c: -2 }, {
                next: 'RET',
                say: `Matteo, complimenti davvero. Non voglio intromettermi: è il vostro momento. In bocca al lupo.`,
                react: [
                  { w: 'matteo', t: `Grazie. Ci sentiamo dopo il convegno.` },
                  { think: `Un’occasione in cui bastava esserci, e io ho fatto un passo indietro.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'elena_scrive', title: `Elena ti scrive dalla sua nuova azienda`, w: 1, after: ['n2', 'n3', 'n4'],
        node: {
          when: `La sera stessa · 21:40`, view: 'phone', bg: 'night', where: `WhatsApp · Elena Cattaneo`,
          scene: (d) => [
            { n: `Sera tardi, l’open space è vuoto e resta accesa solo la tua lampada. Il telefono vibra sulla scrivania: un nome che non vedevi sul display da luglio.`, sfx: 'ping' },
            { chat: { from: 'elena', app: 'WhatsApp' }, t: `Ciao! Sono Elena, spero di non disturbare. Sono da Orsa Biotech da settembre e stiamo costruendo la supply clinica da zero. Mi hanno chiesto se conosco qualcuno e ho pensato a voi. Ti va un caffè?` },
            { chat: { from: 'elena', app: 'WhatsApp' }, t: `Ah, senza secondi fini: a BioNova ho visto cose che a Landi non saranno arrivate. Se ti serve capire come ragiona quel posto, ti racconto volentieri. Orsa lavora su un programma vicino a uno dei loro, quindi tra noi, eh.` },
            d.mp.has('C')
              ? { think: `Con Landi ho appena cominciato a costruire qualcosa. Mi basta una voce sbagliata per perderlo.` }
              : { think: `Sarebbe la tessera che mi manca per capire Landi. E il modo più rapido per mettermi nei guai.` },
          ],
          prompt: `Elena ti offre un nuovo cliente e, insieme, un passaggio di informazioni su BioNova. Come rispondi?`,
          hint: `Un’opportunità e un favore possono arrivare nello stesso messaggio: non è detto che vadano accettati insieme.`,
          tip: `Tenere separati i piani è la mossa matura: Orsa è un nuovo cliente da trattare con le sue regole, BioNova un cliente la cui riservatezza non è tua da scambiare. Un’informazione di seconda mano su un decisore non vale il rischio che si sappia di averla usata.`,
          choices: [
            ch('a', 3, `Accetto il caffè per parlare di Orsa come possibile cliente, ma separo i piani: di BioNova non ti chiedo e non ti racconto niente. Ne parlo anche con Marta.`,
              `Hai preso l’opportunità e lasciato il favore: Orsa è un logo nuovo da costruire con le sue regole, BioNova resta riservata. Avvisare Marta completa il lavoro: se un giorno qualcuno chiede chi parlava con chi, la risposta è già scritta.`,
              (d) => ({ t: d.mp.has('C') ? 4 : 2, c: 2, r: -2 }), {
                next: 'RET',
                say: `Elena, che sorpresa, grazie. Il caffè volentieri: di Orsa parliamo con piacere, come di un possibile cliente nuovo. Di BioNova invece non ti chiedo niente e non ti racconto niente. Lo dico a te e lo dirò a Marta, per essere trasparenti con tutti.`,
                react: [
                  { chat: { from: 'elena', app: 'WhatsApp' }, t: `Hai ragione, scusami: l’ho messa giù male. Giovedì alle 18 va bene?` },
                  { chat: { from: 'marta', app: 'Slack' }, t: `Hai fatto bene a dirmelo: così non resta nessuna zona grigia. Tienimi aggiornata su Orsa, è un bel nome.` },
                ],
              }),
            ch('b', 1, `Accetto il caffè e ti chiedo di raccontarmi com’era la situazione da dentro: capire il retroscena mi aiuta a impostare meglio il rapporto con Landi.`,
              `Il retroscena di Elena è appetibile e parziale: ha lasciato BioNova da mesi, lavora per chi compete su un loro programma e ti darebbe la sua versione. Chiederle ciò che sa di un cliente ti mette in debito con lei e, se Landi scoprisse da dove arriva, ti costerebbe la credibilità che stai ricostruendo.`,
              (d) => ({ t: d.mp.has('C') ? -4 : -2, c: 4, r: 8 }), {
                next: 'RET',
                say: `Elena, volentieri, il caffè. E sì, raccontami com’era la situazione da dentro: capire il retroscena mi aiuta a impostare meglio il rapporto con Landi.`,
                react: [
                  { chat: { from: 'elena', app: 'WhatsApp' }, t: `Eh, c’è parecchio da dire. Vediamoci, ma poi non citarmi, ok?` },
                  { think: `Ho appena comprato un’informazione. Il prezzo lo conoscerò dopo.` },
                ],
              }),
            ch('c', 2, `Rispondo con calore ma senza fissare nulla: dopo il rinnovo di BioNova riparliamo di Orsa. Meglio non mescolare le due cose proprio adesso, per tutti.`,
              `Una scelta prudente e corretta: ringrazi, non prometti niente e non apri il fronte delle informazioni. Perdi un po’ di slancio su Orsa, ma tieni il rapporto con Elena e BioNova al riparo da ogni ombra.`,
              { t: 1, r: -1 }, {
                next: 'RET',
                say: `Elena, che bello sentirti, grazie. Ti scrivo dopo il rinnovo con BioNova, così parliamo di Orsa con calma e senza mescolare le due cose. Mi fa piacere che tu abbia pensato a noi.`,
                react: [
                  { chat: { from: 'elena', app: 'WhatsApp' }, t: `Capisco perfettamente. Quando vuoi, io ci sono.` },
                ],
              }),
            ch('d', 1, `Non rispondo: se Landi sapesse che sento l’ex sponsor potrebbe leggerla male, e il silenzio è la scelta più prudente finché il rinnovo è aperto.`,
              `Il silenzio sembra prudente, ma rinuncia a un’opportunità vera e lascia Elena a pensare che Nexora l’abbia dimenticata appena è uscita dal giro. Si potevano tenere separati i piani senza tacere.`,
              { t: -1, c: -2 }, {
                next: 'RET',
                say: `Lascio il messaggio senza risposta, per ora. Meglio non farsi vedere in contatto con l’ex sponsor mentre il rinnovo è aperto.`,
                react: [
                  { n: `Il messaggio resta lì, con le due spunte blu. La mattina dopo Elena non ha scritto altro.` },
                  { think: `Ho evitato un rischio e perso una persona. Non so ancora quale pesi di più.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'pilota_gratuito', title: `Un pilota gratuito dalla concorrenza`, w: 2, after: ['n4', 'n5'],
        node: {
          when: `Il giorno dopo · 10:30`, view: 'call', where: `Call · Teams · Matteo Brambilla`,
          scene: (d) => [
            { n: `Una chiamata inattesa su Teams: Matteo Brambilla, da un corridoio dei laboratori. Alle sue spalle un portello pneumatico si chiude con un sibilo.` },
            { w: 'matteo', a: `a bassa voce`, t: `Ti dico una cosa prima che la senta da altri. Vertex Systems ha proposto al mio team un pilota gratuito di tre mesi del loro modulo per i trial. Landi mi ha chiesto di dargli un’occhiata.` },
            { w: 'matteo', a: `quasi a scusarsi`, t: `Non è che non mi fidi di voi. Ma tre mesi gratis non si rifiutano a priori.` },
            picked(d, 'n4', 'c')
              ? { n: `Sara ti ha detto cosa manca all’altra offerta: la validazione GxP e il supporto dedicato. Un pilota gratuito è il modo più economico per non doverne parlare.` }
              : picked(d, 'n4', 'b')
                ? { n: `Gli Acquisti hanno sospeso la comparazione in attesa della tua bozza. Un pilota gratuito è il modo più economico per riaprirla.` }
                : { n: `Non hai mai visto cosa includa davvero l’altra offerta. Un pilota gratuito è il modo migliore per entrare in casa senza farselo chiedere.` },
            picked(d, 'n5', 'd')
              ? { think: `Il modulo trial l’ho già offerto gratis per un anno. Contro un altro “gratis” non mi resta niente da dare.` }
              : d.flags.expansion
                ? { think: `Ho un’opzione scritta a prezzo bloccato, loro hanno “gratis”. Non stanno sullo stesso asse.` }
                : picked(d, 'n5', 'a')
                  ? { think: `Ho messo sul tavolo un pacchetto che Landi ha respinto. Il loro “gratis” arriva proprio dove ho forzato.` }
                  : visited(d, 'n5')
                    ? { think: `Sul modulo trial ho rimandato tutto all’anno prossimo. Il loro “gratis” arriva su un tavolo vuoto.` }
                    : { think: `Sul modulo trial non ho ancora messo niente sul tavolo. Il loro “gratis” arriva per primo.` },
          ],
          prompt: `Un concorrente offre un pilota gratuito al tuo cliente. Cosa fai?`,
          hint: `Un “gratis” si batte con un criterio, non con un altro “gratis”.`,
          tip: `Contro un’offerta gratuita non si compete sul prezzo: si sposta la discussione su ciò che il pilota deve dimostrare, sul costo di migrazione e sulla validazione. Chi definisce i criteri del confronto definisce il risultato.`,
          choices: [
            ch('a', 3, `Con Matteo e Landi fisso per iscritto cosa deve dimostrare un pilota: tempi di rilascio, errori di etichettatura, validazione GxP, costo di migrazione.`,
              (d) => (d.mp.has('Co')
                ? `Avevi già spostato il confronto dal prezzo al valore, e adesso lo chiudi con criteri scritti: chi li scrive decide su che terreno si gioca. Landi ha una griglia in mano, tu hai il terreno.`
                : `Anche senza conoscere il perimetro dell’altra offerta hai portato la conversazione sui criteri invece che sul prezzo. Landi ha una griglia in mano, e il pilota dovrà superare le stesse prove di tutti.`),
              (d) => ({ t: 5, v: 4, c: d.mp.has('Co') ? 10 : 6, r: -6 }), {
                next: 'RET', mp: ['Dc'],
                say: `Matteo, è giusto che Landi guardi anche altro. Mi aiuti a capire con lui cosa dovrebbe dimostrare un pilota? Propongo criteri scritti: tempi di rilascio dei lotti, errori di etichettatura, validazione GxP e costo di migrazione. Se Vertex li regge, lo vedrete.`,
                react: [
                  { w: 'matteo', a: `sorpreso`, t: `Non me l’aspettavo da un fornitore. Mandami i criteri: li porto io a Landi e li uso per la valutazione.` },
                  { think: `Non ho parlato del loro pilota. Ho parlato di cosa deve dimostrare.` },
                ],
              }),
            ch('b', 2, `Chiedo a Davide un confronto tecnico su rischio di migrazione e validazione GxP, da portare a Landi come analisi di supporto, non come contromossa.`,
              `Un confronto tecnico serio è un contributo alla loro decisione, non una difesa: se è onesto, diventa anche un argomento. Ma lasci a Landi il compito di fissare i criteri, e chi non li fissa li subisce.`,
              { t: 2, v: 2, c: 3, r: -2 }, {
                next: 'RET',
                say: `Matteo, niente contromosse. Chiedo a Davide un confronto tecnico su rischio di migrazione e validazione GxP: lo porto a Landi come analisi di supporto alla vostra valutazione, per quello che vale.`,
                react: [
                  { w: 'davide', a: `due giorni dopo`, t: `Il documento è pronto: otto pagine, nessuna opinione, solo cosa serve per migrare e cosa va riconvalidato.` },
                  { n: `Landi lo legge e risponde con una riga: “Utile. Lo allego alla valutazione.”` },
                ],
              }),
            ch('c', 0, `Rispondo con la stessa moneta: offro un pilota gratuito di tre mesi del nostro modulo trial, prima che Vertex ci metta piede nei laboratori.`,
              `Hai accettato di competere sul loro terreno, il gratis, e hai svalutato il modulo che stavi per vendere. Se hai già un’opzione scritta, hai appena detto che il suo prezzo era negoziabile.`,
              (d) => ({ v: -6, t: -2, c: -2, r: d.flags.expansion ? 8 : 5 }), {
                next: 'RET',
                say: `Matteo, se è per il gratis, lo facciamo anche noi: pilota di tre mesi del nostro modulo trial, a costo zero per BioNova, prima che Vertex arrivi in casa.`,
                react: [
                  { w: 'matteo', a: `asciutto`, t: `Quindi adesso ho due “gratis”. Bene, immagino. Ma mi chiedo che cosa mi farete pagare, a questo punto.` },
                  { think: `Matteo adesso ha due “gratis” sul tavolo e nessun motivo per scegliere il mio.` },
                ],
              }),
            ch('d', 1, `Faccio notare a Matteo che Vertex ha avuto problemi con altri clienti biotech e che un pilota gratuito spesso costa molto in migrazione.`,
              `Un’insinuazione senza prove sul concorrente è un boomerang: chi ascolta riconosce la mossa e ne ricava un dubbio su chi la fa. Il costo di migrazione è un argomento vero, ma va documentato, non evocato.`,
              { t: -6, c: -2, r: 8 }, {
                next: 'RET',
                say: `Matteo, ti dico quello che so: Vertex ha avuto problemi con altri clienti biotech, e un pilota gratuito spesso costa molto in migrazione. Penserei bene prima di fidarmi.`,
                react: [
                  { w: 'matteo', a: `con calma`, t: `Hai dei riferimenti? “Ho sentito dire” non lo posso portare a Landi.` },
                  { think: `Ho un sospetto e nessun documento, e l’ho detto ad alta voce.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'landi_riassegnato', title: `Landi viene riassegnato`, kind: 'neg', w: 2,
        hit: (d) => !d.flags.threaded && !d.flags.coSponsor,
        dp: -0.34, dpProt: -0.03,
        hitText: `Alle 10:05 arriva un comunicato interno: Giorgio Landi passa a guidare un altro programma, con effetto dalla settimana prossima. Il suo successore ad interim non ha mai sentito parlare di Nexora, e in {client} nessun altro ha mai difeso il progetto davanti a lui. Luca ti scrive due parole: “Di nuovo.”`,
        protText: `Alle 10:05 arriva il comunicato: Giorgio Landi passa a un altro programma. Non ti coglie scoperto: in {client} c’è chi conosce i risultati e sa raccontarli, e l’account non dipende più da un solo nome. Il successore ad interim trova un dossier chiaro e qualcuno che lo difende. Perdi un interlocutore, non l’account.`,
      },
      {
        id: 'acquisti_consolidano', title: `Gli Acquisti consolidano i fornitori`, kind: 'neg', w: 2,
        hit: (d) => !(d.mp.has('M') && d.mp.has('Co')) && d.m.value < 60,
        dp: -0.26, dpProt: -0.03,
        hitText: `Gli Acquisti di {client} annunciano la riduzione dei fornitori strategici da quattordici a sei: gli altri passano a gara. Sara Monti ti chiama con la voce di chi legge un comunicato: nessuna eccezione. Ti manca qualcosa da mettere sul tavolo, un valore misurato dal cliente o un confronto già pronto sul perimetro, e il rinnovo finisce nella pila di quelli da riaprire.`,
        protText: `Gli Acquisti di {client} riducono i fornitori strategici da quattordici a sei. Sara Monti ti chiama per formalità: il valore del tuo contratto è riconosciuto dentro l’azienda, e la differenza con le altre offerte si spiega in una pagina. Resti tra i sei dopo una telefonata e un questionario.`,
      },
      {
        id: 'trial_fase_tre', title: `Parte il trial di fase tre`, kind: 'pos', w: 1,
        if: (d) => !!d.flags.ownedIssues,
        hit: (d) => !!d.flags.expansion,
        dp: 0.10, dpProt: 0,
        hitText: `Il trial di fase tre viene anticipato di sei settimane e il team di Landi ha bisogno del modulo subito. Nel contratto c’è già l’opzione a prezzo bloccato: bastano la firma di Landi e una riga a te. Per una volta, la fretta è dalla tua parte.`,
        protText: `Il trial di fase tre viene anticipato di sei settimane e il team di Landi cerca il modulo. Ma non c’è un’opzione scritta, né un prezzo concordato: Landi deve riaprire un acquisto, e gli Acquisti lo mettono in coda dietro il rinnovo. La finestra si apre e qualcun altro la usa.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Commit all’85%: “il rinnovo è automatico, il cliente non ha mai disdetto”`,
      people: { E: `Giorgio Landi (VP R&D Operations)`, C: `Giorgio Landi`, Dp: `Giorgio Landi e Matteo Brambilla (supply clinica)`, P: `Sara Monti (Acquisti) e il legale di BioNova`, M: `Giorgio Landi, con i dati del suo team di supply`, I: `Matteo Brambilla e il suo team di supply clinica`, Dc: `Giorgio Landi (adozione e ticket) e Sara Monti (prezzo e perimetro)`, Co: `il fornitore concorrente che ha presentato l’offerta, e l’opzione di non rinnovare` },
      risk: `Il rischio vero è che Landi, l’unico sponsor, cambi ruolo o venga riassegnato prima della firma, oppure che gli Acquisti portino il rinnovo in comparazione sul prezzo mentre un ticket critico è ancora aperto.`,
      custom: [
        {
          id: 'sponsor_oltre_landi', if: () => true, has: (d) => !!d.flags.threaded,
          q: `Quanti sponsor hai in BioNova oltre a Landi? Dammi i nomi, non il numero.`,
          evidence: `Tre, con nome e obiettivo: supply, qualità e IT. Sono nell’allegato al rinnovo e la business review trimestrale è già in calendario. Te lo giro.`,
          honest: `Uno solo che decide: Landi. Matteo Brambilla ci è vicino, ma su qualità e IT non ho ancora un nome e nessuno parla per noi quando io non ci sono. Finché i nomi non sono scritti nel piano, per me resta Best Case.`,
          bluff: `Ne ho tre: supply, qualità e IT. Landi li ha già coinvolti e sono tutti allineati sul piano.`,
          vague: `Landi è molto presente e il resto del team ci conosce. Non mi preoccupa restare scoperto.`,
          react: {
            evidence: `Questo è un account più forte di quello che avevo in testa un mese fa. Mandami l’allegato: lo cito io, quando il CRO chiede come evitiamo un altro caso BioNova.`,
            honest: `Grazie per averlo detto: è esattamente il rischio che ha già colpito questo account una volta. Best Case, e questa settimana ci sediamo a scrivere i nomi che mancano.`,
            bluffCaught: `Ho aperto il piano di relazione: c’è un nome solo. Non mi dà fastidio che manchino due sponsor, mi dà fastidio che tu mi abbia detto che ci sono.`,
            bluffPassed: `Va bene, lo scrivo. Ma mandami i tre nomi entro domani: se Landi cambia ruolo fra due mesi, voglio sapere con chi parliamo.`,
            vague: `“Il team ci conosce” non è uno sponsor. Finché sulla mappa c’è un nome solo, il giorno in cui cambia ruolo si ricomincia da capo: è già successo con Elena. Rifacciamolo con i nomi.`,
          },
        },
        {
          id: 'ticket_chiusi', if: () => true, has: (d) => !!d.flags.ownedIssues,
          q: `I ticket critici sono chiusi o solo in lavorazione? E con “chiusi” intendo chiusi da loro, non dichiarati chiusi da noi.`,
          evidence: `Chiusi e confermati: Landi ha firmato la chiusura di entrambi dopo il test del suo team. Ho la mail e il verbale della review del giorno trenta.`,
          honest: `Chiusi dal nostro lato. Il team di Landi li ha testati, ma la conferma scritta non c’è ancora. Per me restano “quasi chiusi” finché non arriva.`,
          bluff: `Chiusi, tutti e due. Davide ha rilasciato la correzione e nel sistema risultano risolti.`,
          vague: `Sono in buono stato, mi pare. Luca li segue ogni giorno e non mi risultano nuove segnalazioni.`,
          react: {
            evidence: `Ecco la differenza tra chiuso e dichiarato chiuso. Con la firma di Landi il tema ticket esce dal mio radar: me la inoltri con la data.`,
            honest: `Distinzione giusta, e te ne do atto: nel CRM “chiuso” deve voler dire chiuso per loro. Chiedi la conferma entro giovedì e il tema è risolto.`,
            bluffCaught: `Nel sistema di BioNova uno dei due risulta ancora “in verifica”. Non è un dramma. Lo è dirmi “chiusi” quando potevi saperlo.`,
            bluffPassed: `Ok, lo registro come chiuso. Ma mandami la conferma di BioNova entro venerdì, altrimenti lo riapro io nel forecast.`,
            vague: `“Non mi risultano nuove segnalazioni” è assenza di notizie, non una notizia. Dammi un fatto: chi ha firmato cosa, e quando.`,
          },
        },
        {
          id: 'clausola_adozione', if: () => true, has: (d) => !!d.flags.giveGet,
          q: `Com’è scritto il prezzo del rinnovo? Se c’è una parte legata all’adozione, voglio soglia, misura, data e cosa succede al prezzo se non la raggiungono. “L’abbiamo discussa” non mi basta.`,
          evidence: `È nella bozza che Sara ha già in mano: adozione al 70% misurata sui dati del sistema a fine primo anno, ticket critici chiusi in meno di cinque giorni, e la parte variabile del prezzo scatta solo se le due soglie sono raggiunte.`,
          honest: `Non ancora. Nella bozza c’è il prezzo, ma nessuna clausola sull’adozione: soglia, misura e data le devo ancora scrivere con Sara. Finché non sono sul foglio, per me è Best Case.`,
          bluff: `È scritta, sì: soglia al 70%, misura sui dati del sistema, ticket in cinque giorni. Sara ha la bozza.`,
          vague: `Con Sara il prezzo è a buon punto, e a Landi la struttura piace. Manca solo la formalità finale.`,
          react: {
            evidence: `Questo è un Commit che si può difendere: soglia, misura, data e conseguenza sul prezzo. Mandami la bozza, la tengo con me fino alla firma.`,
            honest: `Grazie per avermelo detto così. Un’idea di struttura non è una clausola: oggi stesso fai partire la bozza e fissa una data con Sara. Fino ad allora, Best Case.`,
            bluffCaught: `Ho chiesto a Giulia del Deal Desk di aprire la bozza: di una clausola sull’adozione non c’è traccia. Non è un’accusa, è un controllo. Rifacciamolo con i fatti.`,
            bluffPassed: `Va bene, lo scrivo. Ma entro domani voglio vedere il paragrafo: se la soglia non è sul foglio, non è nel contratto.`,
            vague: `“Manca solo la formalità finale” è la frase che precede quasi tutti i deal che slittano. La formalità è il deal. Portami la bozza.`,
          },
        },
      ],
    },

    endings: {
      won: `Il rinnovo è firmato prima della scadenza. Landi ti scrive due righe: “Ricordo quel primo incontro. Non pensavo di rivederla.” Luca ti manda una gif. Sulla dashboard, per la prima volta da luglio, i riquadri non sono più tutti rossi.`,
      lost: `BioNova non rinnova. La comunicazione arriva in tre righe di Sara Monti, un lunedì mattina. Il fornitore concorrente non ha il tuo prodotto, ma ha un vantaggio decisivo: nel momento del bisogno c’era. Il churn pesa sulla tua scheda.`,
      slip: `Landi estende il contratto di tre mesi per “completare la valutazione”. Un limbo scomodo ma ancora vivo: la dashboard resta ambra, e il ritmo, adesso, lo detta lui.`,
    },
    lessons: [
      { if: (d) => d.flags.ownedIssues, good: true, t: `Hai preso in carico i problemi invece di difenderti. In un account in sofferenza, assumersi la responsabilità è l’inizio della ricostruzione.` },
      { if: (d) => d.flags.tonedeaf, good: false, t: `Hai proposto un’espansione con ticket aperti da sessanta giorni. Vendere prima di riparare è il segnale peggiore che puoi dare a un nuovo sponsor.` },
      { if: (d) => d.flags.giveGet, good: true, t: `Hai trasformato lo sconto in un patto legato all’adozione. Il cliente paga di più solo se ottiene di più: un incentivo che allinea.` },
      { if: (d) => d.disc >= 25, good: false, t: `Hai ceduto troppo per proteggere il rinnovo. Il cliente ora sa che il prezzo si può spremere.` },
      { if: (d) => d.flags.threaded, good: true, t: `Hai spostato il rischio da una persona a tre: dopo uno sponsor perso, la multi-relazione è l’assicurazione sul rinnovo.` },
      { if: (d) => d.flags.expansion, good: true, t: `Hai separato rinnovo ed espansione e legato la seconda a un obiettivo condiviso. Meno pressione, più pipeline.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
