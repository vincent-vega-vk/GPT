/* Scenario 3 · Terrasole · negoziazione con gli Acquisti a fine trimestre, give-get, forecast onesto
   v2: ufficio di sera, il tempo come variabile che nessuno al tavolo può negoziare.
   Widget firma: orologio verso la mezzanotte del 31, foglio di trattativa, mappa del potere. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    valeria: { name: `Valeria Conti`, role: `Direttrice Acquisti`, hue: 318 },
    paolo: { name: `Paolo Greco`, role: `Head of Supply Chain`, hue: 200 },
    rinaldi: { name: `Marco Rinaldi`, role: `Direttore Generale · firma`, hue: 150 },
    marta: { name: `Marta Colombo`, role: `La tua Sales Director`, hue: 348 },
    giulia: { name: `Giulia Ferraro`, role: `Deal Desk Nexora`, hue: 95 },
    bruni: { name: `Stefano Bruni`, role: `Legale Nexora`, hue: 28 },
    /* il “tuo contatto” delle scene generiche è Paolo */
    cliente: { name: `Paolo Greco`, role: `Head of Supply Chain`, hue: 200 },
  };
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });

  /* storia della trattativa: nodi visitati, scelte fatte, imprevisti già comparsi */
  const hist = (d) => (d && Array.isArray(d.hist) ? d.hist : []);
  const visited = (d, node) => hist(d).some((h) => h.node === node);
  const picked = (d, node, id) => hist(d).some((h) => h.node === node && h.id === id);
  const wildSeen = (d, id) => hist(d).some((h) => h.wild === id);

  const sc0 = () => CL.getScenario('terrasole');
  const chatM = (t, extra) => Object.assign({ chat: { from: 'marta', app: 'Teams' }, t }, extra || {});

  /* ───── il tempo: minuti dalla mezzanotte di lunedì 30; la scadenza è martedì 31 alle 24:00 ───── */
  const DAY0 = { lunedì: 0, martedì: 1440 };
  const T_START = 15 * 60 + 40, T_END = 2880;
  const minutesOf = (when) => {
    const m = /(lunedì|martedì)[^·]*·\s*(\d{1,2}):(\d{2})/i.exec(String(when || ''));
    return m ? DAY0[m[1].toLowerCase()] + (+m[2]) * 60 + (+m[3]) : NaN;
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  const hhmm = (t) => { const m = ((Math.round(t) % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
  const leftTxt = (min) => { const m = Math.max(0, Math.round(min)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad2(m % 60)}` : `${m} min`; };
  /* ora della scena corrente: nodo o imprevisto in corso. Un imprevisto generico (etichetta vaga, “Nel frattempo”)
     cade poco prima del nodo successivo, ma mai prima dell’ultima scena giocata. */
  const T_OVER = 1440 + 17 * 60 + 40;
  const nowOf = (d) => {
    if (d.over) return T_OVER;
    const nodes = (d.sc && d.sc.nodes) || {};
    const nodeT = nodes[d.node] ? minutesOf(nodes[d.node].when) : NaN;
    const next = isFinite(nodeT) ? nodeT : T_START;
    if (!d.wild) return next;
    let prev = T_START;
    hist(d).forEach((h) => { if (!h.wild && nodes[h.node]) { const t = minutesOf(nodes[h.node].when); if (isFinite(t)) prev = t; } });
    const w = d.wild.node ? minutesOf(d.wild.node.when) : NaN;
    if (isFinite(w) && w >= prev && w <= next) return w;
    return next - 20 >= prev ? next - 20 : Math.round((prev + next) / 2);
  };

  CL.registerScenario({
    id: 'terrasole',
    title: `Ultimo Giorno del Trimestre`,
    client: `Gruppo Terrasole`,
    sector: `Alimentare · Parma`,
    hook: `Business case approvato, champion pronto. Poi arrivano gli Acquisti con quattro richieste e un ultimatum.`,
    brief: `Pianificazione della domanda e supply chain per un gruppo alimentare: €620k di ACV a listino. La valutazione tecnica è favorevole e il champion, Paolo Greco, è dalla tua parte. È il penultimo giorno del trimestre. Il deal è Commit, Marta ti ha scritto due volte. E nella tua casella è appena arrivata una mail dagli Acquisti.`,
    scout: `Il CRM dice Commit al 90%. In realtà: nessun contatto diretto con il Direttore Generale, la contrattualistica non è stata aperta, e Acquisti ha da sempre l’abitudine di spremere chiunque a ridosso della fine mese.`,
    teaches: [`Give-get`, `Ancoraggio`, `Pacchetti di offerta`, `Forecast onesto`, `Soglia LEP`],
    list: 620, cost: 2, window: [10, 13], stars: 3, lep: 12, slip: 0.25,
    noWild: ['davide_recalled', 'new_decider', 'rival_offer'],   // imprevisti generici che stonano con questo scenario
    noShock: ['g_freeze', 'g_board_accelerates', 'g_price_cut', 'g_rival_withdraws'],   // shock generici che stonano con questo scenario
    crm: { cat: `Commit`, prob: 90 },
    cast: CAST,

    /* ───── identità: l’ufficio che si svuota, il calendario che non aspetta ───── */
    theme: {
      id: 'night', label: `Fine trimestre · ufficio Nexora`, bg: 'night',
      accent: '#c2410c', accentDark: '#ff8a5b', ambience: 'office',
      motto: `Prezzo e condizioni si trattano. Il tempo no: quello lo decide il calendario.`,
    },
    intro: {
      when: `Lunedì 30 · 15:40`, where: `La tua scrivania`, view: 'desk', bg: 'night',
      scene: [
        { n: `Lunedì 30 dicembre, le 15:40. L’open space si svuota a ondate dall’ora di pranzo: restano tre scrivanie accese, un termosifone che tossisce nei tubi e il ronzio del distributore d’acqua. Fuori il cielo ha già il colore dell’ardesia.` },
        { n: `Sul secondo schermo il CRM è fermo sulla riga di Terrasole, pianificazione della domanda: €620k, Commit, 90%. Il cursore nel campo delle note lampeggia da un’ora, come se aspettasse una smentita.` },
        { think: `Domani a mezzanotte il trimestre chiude. Quello che non è firmato entro allora, per questa azienda, non è mai esistito.` },
        { chat: { from: 'marta', app: 'Teams' }, t: `Seconda volta che te lo scrivo, {nome}. Terrasole è nel numero che porto al CRO domani alle 19. Dimmi che è tutto sotto controllo, oppure dimmi cosa non lo è.`, sfx: 'ping' },
        { think: `Valutazione tecnica favorevole, Paolo Greco che risponde alla prima telefonata. Con il Direttore Generale, Marco Rinaldi, non ho mai scambiato una parola.` },
        { n: `Un’anteprima scivola in alto a destra dello schermo. Mittente: Valeria Conti, Acquisti Terrasole. Oggetto: Termini per la finalizzazione.`, sfx: 'ping' },
        { think: `“Finalizzazione”. A trentadue ore dalla chiusura, è la parola che si usa quando si vuole cominciare a trattare.` },
      ],
    },

    /* ───── widget firma ───── */
    hud: [
      {
        type: 'clock', title: `Il tempo che resta`,
        build: (d) => {
          const f = d.flags || {}, mp = d.mp || new Set();
          const t = nowOf(d), mon = t < 1440, left = T_END - t;
          const pf = (id) => picked(d, 'wild:portale_firma', id);
          let sub;
          if (d.over) sub = `Il contratto è nelle mani di Valeria. Da qui in poi lavora il calendario.`;
          else if (t < 17 * 60) sub = `Penultimo giorno. Valeria vuole una risposta prima di sera.`;
          else if (t < 1440) sub = f.giveGet ? `Sera del 30. Hai già uno scambio sul tavolo.` : `Sera del 30. Sul tavolo ci sono solo numeri, nessuno scambio.`;
          else if (t < 1440 + 11 * 60) sub = f.rinaldiScritto ? `Ultimo giorno. Hai già il sì scritto di Rinaldi.` : `Ultimo giorno. Le finestre con chi decide si contano sulle dita.`;
          else if (t < 1440 + 15 * 60) {
            sub = `Alle 19 Marta porta il numero al CRO. ` + (mp.has('P') ? `La bozza del contratto è pronta.` : `Il contratto è ancora aperto.`);
            if (f.rinaldiScritto) sub += ` Il sì di Rinaldi è per iscritto.`;
          } else {
            sub = `Alle 19 Marta porta il numero al CRO. Dopo la mezzanotte il trimestre è chiuso.`;
            if (pf('a')) sub += ` Canale di riserva concordato: PEC e firma qualificata.`;
            else if (pf('b')) sub += ` Il portale riapre “entro le 18”, forse.`;
            else if (pf('c')) sub += ` Il portale riapre “entro le 18”, e non c’è un altro canale.`;
            else if (pf('d')) sub += ` A Marta hai scritto “di fatto firmato”: la notifica deve arrivare davvero.`;
          }
          if (mon) sub += ` Restano ${leftTxt(left)}.`;
          return {
            label: mon ? `Alla chiusura del trimestre` : `Alla mezzanotte del 31`,
            time: `${hhmm(t)} ${mon ? 'lun 30' : 'mar 31'}`,
            deadline: mon ? `mar 31 · 24:00` : `24:00`,
            pct: Math.max(0, Math.min(1, (t - T_START) / (T_END - T_START))),
            urgent: left <= 600,
            sub,
          };
        },
      },
      {
        type: 'termsheet', title: `Il foglio di trattativa`,
        build: (d) => {
          const f = d.flags || {}, disc = Number(d.disc) || 0;
          const ap = CL.approval({ sc: d.sc || sc0(), flags: f, disc });
          const p3 = (id) => picked(d, 'n3', id), p6 = (id) => picked(d, 'n6', id), pf = (id) => picked(d, 'wild:portale_firma', id);
          let sOurs = `—`, sSt = 'open';
          if (disc <= 0) { sOurs = picked(d, 'wild:giulia_chiude', 'a') ? `3 pacchetti letti dal Deal Desk` : f.tradeSetup ? `da scambiare` : `—`; sSt = 'open'; }
          else if (ap.status === 'blocked') { sOurs = `${Math.round(disc)}% (max ${ap.allowed}%)`; sSt = 'blocked'; }
          else if (!f.giveGet && disc > 8) { sOurs = `${Math.round(disc)}% senza scambio`; sSt = 'lost'; }
          else if (ap.status === 'approved') { sOurs = `${Math.round(disc)}% contro scambio`; sSt = 'traded'; }
          else { sOurs = `${Math.round(disc)}%` + (picked(d, 'n4', 'c') || p6('a') || p6('d') || p6('b') ? ` con Analytics` : ''); sSt = f.giveGet ? 'won' : 'open'; }
          const sAsk = f.tradeSetup ? `30% (le bastano “due cifre”)` : f.insider ? `30% (da portare al DG)` : `30%`;

          const pAsk = f.tradeSetup ? `120 gg (ne servono 90)` : f.insider ? `120 gg · politica di gruppo` : `120 giorni`;
          let pOurs = `—`, pSt = 'open';
          const lAsk = f.insider ? `15% del canone (trattabile)` : `fino al 15% del canone`;
          let lOurs = `—`, lSt = 'open';
          const rAsk = f.insider ? `dopo 12 mesi (di principio)` : `dopo 12 mesi`;
          let rOurs = `—`, rSt = 'open';
          if (f.termsBleed) {
            pOurs = `120 giorni accettati`; pSt = 'lost';
            lOurs = `senza tetto`; lSt = 'lost';
            rOurs = `libero a 12 mesi`; rSt = 'lost';
          } else if (p3('b')) {
            pOurs = `90 giorni`; pSt = 'traded';
            lOurs = `tetto 5%, solo critici`; lSt = 'traded';
            rOurs = `24 mesi con penale`; rSt = 'traded';
          } else if (p3('c')) {
            pOurs = `condizioni standard`; pSt = 'blocked';
            lOurs = `condizioni standard`; lSt = 'blocked';
            rOurs = `condizioni standard`; rSt = 'blocked';
          } else if (p3('d')) {
            lOurs = `bozza del legale`; lSt = 'open';
            rOurs = `bozza del legale`; rSt = 'open';
          }

          const rows = [
            { k: 'Sconto', ask: sAsk, ours: sOurs, st: sSt },
            { k: 'Pagamento', ask: pAsk, ours: pOurs, st: pSt },
            { k: 'Penali SLA', ask: lAsk, ours: lOurs, st: lSt },
            { k: 'Recesso', ask: rAsk, ours: rOurs, st: rSt },
          ];
          if (picked(d, 'n4', 'c') || visited(d, 'n6') || d.node === 'n6') {
            let aOurs = `—`, aSt = 'open';
            if (p6('a')) { aOurs = `gratis`; aSt = 'lost'; }
            else if (p6('b')) { aOurs = `50% e referenza`; aSt = 'traded'; }
            else if (p6('c')) { aOurs = `fuori perimetro`; aSt = 'won'; }
            else if (p6('d')) { aOurs = `gratis, scadenza finta`; aSt = 'lost'; }
            else if (picked(d, 'n4', 'c')) { aOurs = `già offerto a Rinaldi`; aSt = 'lost'; }
            rows.push({ k: 'Analytics', ask: `gratis nel 1° anno`, ours: aOurs, st: aSt });
          }
          /* la firma: compare quando c’è qualcosa di scritto o il portale è andato in manutenzione */
          if (wildSeen(d, 'portale_firma')) {
            const fa = `portale Terrasole, fermo fino alle 18`;
            if (pf('a')) rows.push({ k: 'Firma', ask: fa, ours: f.rinaldiScritto ? `PEC e firma qualificata · Rinaldi o il direttore finanziario` : `PEC e firma qualificata, per iscritto`, st: 'won' });
            else if (pf('b')) rows.push({ k: 'Firma', ask: fa, ours: `in attesa del ripristino`, st: 'open' });
            else if (pf('c')) rows.push({ k: 'Firma', ask: fa, ours: `nessun altro canale`, st: 'blocked' });
            else if (pf('d')) rows.push({ k: 'Firma', ask: fa, ours: `“di fatto firmato”, senza notifica`, st: 'lost' });
          } else if (f.rinaldiScritto) {
            rows.push({ k: 'Firma', ask: `Rinaldi, entro il 31`, ours: `sì scritto, o il direttore finanziario con procura`, st: 'won' });
          }
          return { cols: [`Richiesta`, `Nostra posizione`, `Stato`], rows };
        },
      },
      {
        type: 'stakeholders', title: `Chi decide a Terrasole`,
        build: (d) => {
          const f = d.flags || {};
          const p2 = (id) => picked(d, 'n2', id), p3 = (id) => picked(d, 'n3', id), p4 = (id) => picked(d, 'n4', id), p6 = (id) => picked(d, 'n6', id);
          const vx = (id) => picked(d, 'wild:vertex_offerta', id), sl = (id) => picked(d, 'wild:valeria_silenzio', id);

          let v;
          if (p6('b')) v = ['ally', `Ha portato il 50% a Rinaldi e lo ha ottenuto.`];
          else if (p6('c')) v = ['neutral', `Ha insistito, poi ha capito che la linea tiene.`];
          else if (p6('a')) v = ['skeptic', `Ha scoperto che la linea era elastica.`];
          else if (p6('d')) v = ['skeptic', `Ha riconosciuto la scadenza artificiale.`];
          else if (sl('a')) v = ['neutral', `Sta leggendo il tuo riepilogo con il legale e il direttore finanziario.`];
          else if (sl('b')) v = ['skeptic', `Ha letto che sei pronto a scendere ancora, e lo ha annotato.`];
          else if (sl('c')) v = ['skeptic', `Ha contato le tue chiamate. Si fa sentire quando decide lei.`];
          else if (f.termsBleed) v = ['skeptic', `Ha ottenuto tutto. Sa che la linea cede.`];
          else if (p3('c')) v = ['skeptic', `Valuta la rimessa a gara.`];
          else if (p3('b')) v = ['neutral', `Difende i 90 giorni in gruppo, il resto va a Rinaldi.`];
          else if (p3('d')) v = ['neutral', `Ha apprezzato la rapidità. Il prezzo è ancora aperto.`];
          else if (vx('a')) v = ['skeptic', `Con Vertex hai ceduto subito. Ora sa quanto vale la tua linea.`];
          else if (vx('c')) v = ['skeptic', `Ti ha chiesto una prova scritta su Vertex. Non l’hai.`];
          else if (vx('b')) v = ['neutral', `Ti ha detto su cosa confronta le offerte: implementazione, servizio, tre anni.`];
          else if (vx('d')) v = ['neutral', `Aspetta il tuo confronto scritto per le otto.`];
          else if (f.deskApproved) v = ['ally', `Sceglie dai pacchetti: ha smesso di negoziare contro di te.`];
          else if (p2('c')) v = ['neutral', `Ha preso nota del 12%. Il primo numero l’hai dato tu.`];
          else if (f.tradeSetup) v = ['neutral', `Ti ha detto cosa le serve: 90 giorni e due cifre.`];
          else if (p2('a')) v = ['skeptic', `Il tuo “ultimo prezzo” l’ha avuto alla prima battuta.`];
          else if (picked(d, 'n1', 'a')) v = ['skeptic', `Ha in mano il tuo 20% e non si fermerà lì.`];
          else v = ['skeptic', `Quattro richieste e un ultimatum. Non ha ancora mostrato le carte.`];

          let p = ['champion', f.insider ? `Ti ha detto cosa è vero e cosa è tattica.` : `Dalla tua parte. Non l’hai ancora chiamato.`];
          if (visited(d, 'n4')) p = ['champion', f.insider ? `Ti ha detto cosa è vero e ti ha ottenuto dieci minuti con Rinaldi.` : `Ti ha ottenuto dieci minuti con Rinaldi. Tu non l’hai ancora chiamato.`];
          if (picked(d, 'wild:paolo_confidenza', 'a')) p = ['neutral', `Teme che la sua confidenza sia arrivata fino a Valeria.`];
          else if (picked(d, 'wild:paolo_confidenza', 'b')) p = ['champion', `Ti ha dato una confidenza e sa che non uscirà dalla stanza.`];
          else if (picked(d, 'wild:paolo_confidenza', 'c')) p = ['ally', `Ti ha avvertito: se forzi Valeria, la gara la fa per orgoglio.`];
          else if (picked(d, 'wild:paolo_confidenza', 'd')) p = ['champion', `Ti ha dato una voce e ha visto che non ci scommetti sopra.`];

          let r = ['unknown', f.insider ? `Mai incontrato. Valeria gli porta un numero.` : `Mai incontrato. Non sai cosa gli arriva.`];
          if (p4('a')) r = [f.rinaldiScritto ? 'champion' : 'ally', f.rinaldiScritto ? `Ha scritto il suo sì prima di partire.` : `Difenderà i tuoi numeri col board.`];
          else if (p4('b')) r = ['neutral', `Ti ha ascoltato. La risposta che cercava non è arrivata.`];
          else if (p4('c')) r = ['neutral', `Ha sentito “gratis”. Il valore, no.`];
          else if (p4('d')) r = ['neutral', `Ha gradito Marta. Il dubbio sul semestre resta.`];
          if (f.rinaldiScritto && !p4('a')) r = ['ally', `Ti ha scritto un sì, con riserva sui termini.`];
          if (picked(d, 'wild:rinaldi_gate', 'c')) r = ['skeptic', `Non gradisce che lo chiami per il prezzo.`];

          return [P('valeria', v[0], v[1]), P('paolo', p[0], p[1]), P('rinaldi', r[0], r[1])];
        },
      },
    ],

    start: { t: 50, v: 52, u: 50, c: 38, r: 50, have: ['M', 'I', 'C', 'Co'] },
    caps: [
      { id: 'terms', max: 0.55, if: (d) => d.flags.termsBleed, why: `Hai ceduto su pagamento, penali e recesso senza tetti. Legale e Deal Desk non possono approvare il contratto così.` },
      { id: 'gg', max: 0.62, if: (d) => !d.flags.giveGet && d.disc > 8, why: `Hai concesso sconto senza scambio: Acquisti sa che la linea è elastica e continuerà a spingere, o rimetterà a gara.` },
    ],
    nodes: {
      /* ───────── lunedì 30 · 15:40 · la mail degli Acquisti ───────── */
      n1: {
        when: `Lunedì 30 · 15:40`, view: 'mail', bg: 'night',
        where: `Email · Acquisti Terrasole · lunedì 15:40`,
        scene: [
          { n: `Apri la mail. Sul vetro accanto alla scrivania il tuo riflesso e quello del monitor si sovrappongono; più giù, nel parcheggio, qualcuno scalda il motore.` },
          { mail: { from: `Valeria Conti · Acquisti Terrasole`, subj: `Termini per la finalizzazione` }, t: `A valle del parere tecnico favorevole, per procedere entro il 31 chiediamo: sconto del 30% sul listino; pagamento a 120 giorni; penali SLA fino al 15% del canone annuo; recesso per convenienza dopo 12 mesi. In assenza di accordo procederemo con la rimessa a gara nel primo trimestre.` },
          { think: `Trenta, centoventi, quindici, dodici. Quattro numeri in fila e un ultimatum in coda: scritti per essere inoltrati, non per avere una risposta.` },
          { n: `Il campo di risposta è vuoto. Sul secondo schermo la riga di Terrasole non è cambiata di una virgola.` },
          { think: `Meno di trentadue ore. Qualunque cosa risponda adesso, la scrivo con il fiato corto.` },
        ],
        prompt: `Qual è la tua prima mossa?`,
        hint: `Prima di rispondere, capisci cosa è reale e cosa è tattica. Chi può dirtelo?`,
        tip: `Quattro richieste massimaliste in una mail sono un’ancora, non un verdetto. Prima di muoverti verifica col champion cosa è davvero vincolante: reagire a caldo è la leva di chi compra.`,
        choices: [
          ch('a', 0, `Chiamo Valeria adesso: se oggi mi viene incontro sui tempi, io le vengo incontro sul prezzo e ci fermiamo attorno al 20%.`,
            `Hai messo un numero sul tavolo prima di sapere quali delle quattro richieste fossero vere. Per chi compra, il venti da quel momento è il punto da cui si riparte, non quello a cui ci si ferma.`,
            { t: -2, v: -6, c: -6, d: 20 }, {
              next: 'n2',
              say: `Valeria, ho letto la mail. Ho poco tempo e lei anche: se oggi mi viene incontro sui tempi, io le vengo incontro sul prezzo. Possiamo ragionare attorno al venti per cento.`,
              react: [
                { w: 'valeria', a: `senza alzare il tono`, t: `Prendo nota del venti. Le faccio sapere se può bastare.` },
                { think: `Le ho dato un numero che non mi aveva chiesto, e nessuno scambio in cambio.` },
              ],
            }),
          ch('b', 3, `Chiamo Paolo, il mio champion: voglio sapere quali di queste richieste sono vincoli veri e quali ancore, prima di muovermi.`,
            `Una telefonata di dieci minuti ha trasformato un ultimatum in una mappa. Con Paolo sai cosa è politica, cosa è principio e dove Valeria ha bisogno di un risultato da mostrare.`,
            { t: 6, v: 4, c: 10, r: -6 }, {
              mp: ['Dp'], set: { insider: true }, next: 'n2',
              say: `Paolo, sono io. Ti è arrivata la mail di Valeria? Prima di risponderle mi serve il tuo parere da dentro: quali di queste quattro richieste sono vincoli veri, e quali sono ancore?`,
              react: [
                { w: 'paolo', a: `a voce bassa, dal corridoio`, t: `Ti dico come stanno le cose. I centoventi giorni sono politica di gruppo: non li ha decisi lei, e una deroga le costa fatica. Le penali si trattano, ma sulla struttura: tetti e livelli di servizio, non la percentuale. Il recesso lo vogliono “per principio”.` },
                { w: 'paolo', t: `Sullo sconto è diverso. Valeria deve portare un numero a Rinaldi, e con quel numero ci mette la faccia.` },
                { think: `Quattro richieste, due leve vere: le penali e il numero che Valeria deve portare a Rinaldi.` },
              ],
            }),
          ch('c', 1, `Inoltro la mail a Marta e le chiedo di approvarmi subito il 25%: con il numero già in tasca, domani riesco a chiudere.`,
            `Hai chiesto a Marta un numero senza contropartite da mostrarle. Il segnale che le arriva è nervosismo, e il credito che spendi qui ti servirà quando ci sarà davvero da chiedere una deroga.`,
            { v: -2, c: -4, r: 6 }, {
              next: 'n2',
              say: `Marta, ti giro la mail di Terrasole. Mi serve l’approvazione per il venticinque per cento, subito: con quel numero in tasca, domani chiudo.`,
              react: [
                { w: 'marta', a: `telefona dopo meno di un minuto`, t: `Venticinque? E con cosa in cambio, {nome}? Qui vedo una mail degli Acquisti e un numero tuo. Uno scambio non lo vedo.` },
                { think: `Ho chiesto un permesso prima ancora di avere un piano. E lei se n’è accorta in trenta secondi.` },
              ],
            }),
          ch('d', 2, `Lascio passare qualche ora prima di rispondere, per non mostrare troppa fretta, e intanto preparo la strategia con calma.`,
            `Una pausa dà l’idea di fermezza, ma il calendario non aspetta e le ore in cui Paolo avrebbe potuto aiutarti sono passate senza che tu le usassi. Qui il tempo lavora per chi compra.`,
            { c: 2, u: -2 }, {
              next: 'n2',
              say: `Chiudo la mail senza rispondere. Mi alzo, vado a prendermi un caffè e lascio che Valeria aspetti: nel frattempo ragiono con calma sulla strategia.`,
              react: [
                { n: `Alle 16:30 la macchinetta del caffè è l’unica cosa che fa ancora rumore al piano. Il telefono sulla scrivania resta nero.` },
                { think: `Sembra fermezza. Intanto le ore passano, e di informazioni nuove non ne ho nemmeno una.` },
              ],
            }),
        ],
      },

      /* ───────── lunedì 30 · 17:30 · l’ancora del 30% ───────── */
      n2: {
        when: `Lunedì 30 · 17:30`, view: 'call', bg: 'night',
        where: `Call · Teams · lunedì 17:30`,
        scene: [
          { n: `Alle 17:30 Teams ti avvisa: Valeria Conti. Accetti, e nel riquadro compare un ufficio ordinato come una cartella clienti: scrivania sgombra, un blocco con la riga già tracciata, nessuna fotografia.` },
          { w: 'valeria', a: `sfogliando il blocco`, t: `Il suo venti l’ho annotato. Lo considero un punto di partenza.`, if: (d) => picked(d, 'n1', 'a') },
          { w: 'valeria', a: `tono professionale, senza sbilanciarsi`, t: `Ho il mandato di chiudere oggi o domani. Il trenta è il numero che ho in testa. Sono certa che capirà le nostre esigenze.` },
          { n: `Dietro di lei, sulla parete, un calendario di carta: il 31 è cerchiato due volte, a pennarello rosso.` },
          { think: `Un mandato, un numero, un “capirà”. Non ha fatto nessuna domanda: vuole un sì o un no, non una conversazione.` },
          { think: `Paolo mi ha detto che il numero lo deve portare a Rinaldi. Questa è la parte in cui recita.`, if: (d) => d.flags.insider },
          { think: `Ho lasciato che chiamasse lei. Vedremo se ho guadagnato fermezza o perso due ore.`, if: (d) => picked(d, 'n1', 'd') },
          { think: `Ho tre pacchetti scritti e già letti dal Deal Desk. Se vuole una cifra, io ho una tabella.`, if: (d) => picked(d, 'wild:giulia_chiude', 'a') },
        ],
        prompt: `Valeria ha messo il 30% sul tavolo. Come rispondi?`,
        hint: `Non discutere il numero. Discuti cosa serve a lei per portare un accordo al suo capo.`,
        tip: `Non contrattare il numero: contratta le variabili. Chiedi cosa le serve per portare un accordo al DG e proponi scambi uno a uno (Give-Get). Offrire opzioni invece di un sì/no ti restituisce la regia.`,
        choices: [
          ch('a', 0, `Il trenta è fuori portata. Posso arrivare al quindici, ma è il mio ultimo prezzo: da lì non mi muovo, e se per lei va bene possiamo firmare già oggi.`,
            `“Ultimo prezzo” alla prima battuta è un’etichetta a cui nessuno crede. Hai solo spostato l’ancora da trenta a ventidue, senza ottenere uno scambio.`,
            { t: -2, c: -4, d: 15 }, {
              next: 'n3',
              say: `Valeria, il trenta è fuori portata. Posso arrivare al quindici, ma è il mio ultimo prezzo: da lì non mi muovo. Se per lei va bene, possiamo firmare già oggi.`,
              react: (d) => (picked(d, 'n1', 'a')
                ? [
                  { w: 'valeria', a: `rileggendo il blocco`, t: `Poco fa mi parlava di venti, adesso di quindici e di “ultimo prezzo”. Se ventidue le va bene, chiudiamo.` },
                  { think: `Venti, poi quindici, e questo lo chiamo ultimo. Quello che dico ha già smesso di pesare.` },
                ]
                : [
                  { w: 'valeria', a: `con un mezzo sorriso nella voce`, t: `Capisco. E se arrivassimo a ventidue?` },
                  { think: `“Ultimo prezzo”. L’ho detto alla prima battuta, e lei l’ha sentito come un invito.` },
                ]),
            }),
          ch('b', 3, `Il trenta dipende da cosa ricevo in cambio: durata, tempi di firma, una referenza. E a lei, per portare un accordo a Rinaldi, che cosa serve?`,
            `Hai trasformato un 30% secco in uno scambio e scoperto i bisogni veri di Valeria. Quando chiedi cosa le serve, smette di recitare la parte e comincia a lavorare con te.`,
            { t: 4, v: 4, c: 10, r: -4 }, {
              set: { tradeSetup: true }, next: 'n3',
              say: `Valeria, posso muovermi, ma non sul numero secco: dipende da cosa ricevo in cambio. Durata, tempi di firma, una referenza. E mi dica che cosa le serve per portare un accordo al Direttore Generale, perché è quello che dobbiamo costruire insieme.`,
              react: [
                { n: `Valeria resta in silenzio. Dall’altra parte senti scorrere una penna sul blocco.` },
                { w: 'valeria', a: `dopo una pausa`, t: `Ho bisogno di novanta giorni di pagamento e di un numero a due cifre.` },
                { think: `Non è più un trenta contro un quindici. È una lista di bisogni, e adesso ce l’ho.` },
              ],
            }),
          ch('c', 2, `La capisco. Le propongo il 12% a fronte di un impegno triennale: è un numero che riesco a difendere con la mia direzione e che regge nel tempo anche per voi.`,
            `Una proposta già agganciata a una contropartita è una mossa solida. Aprire per primo, però, significa che il negoziato parte dal tuo numero e non dal suo.`,
            { c: 2, d: 12 }, {
              set: { giveGet: true }, next: 'n3',
              say: `Capisco la sua posizione, Valeria. Le propongo il dodici per cento a fronte di un impegno triennale: è un numero che riesco a difendere con la mia direzione e che regge nel tempo anche per voi.`,
              react: (d) => (picked(d, 'n1', 'a')
                ? [
                  { w: 'valeria', a: `scrive`, t: `Dodici, tre anni. Poco fa mi parlava di venti: lo riporto, ma non le garantisco che basti.` },
                  { think: `Venti, poi dodici, in due ore. Per lei il numero che conta è il primo che ha sentito.` },
                ]
                : [
                  { w: 'valeria', a: `scrive`, t: `Dodici, tre anni. Lo riporto.` },
                  { think: `Dodici con tre anni. Solido, ma ho aperto io: da qui si parte dal mio numero.` },
                ]),
            }),
          ch('d', 3, `Con Giulia del Deal Desk ho preparato tre pacchetti tra cui scegliere: A) 10% con fatturazione annuale; B) 15% con impegno triennale; C) 8% con prepagamento.`,
            `Passare da “sì o no” ad “A, B o C” cambia il gioco: ogni sconto ha la sua contropartita e a scegliere è lei. Valeria prende il B e ti dice su cosa lavorare: ha smesso di negoziare contro di te.`,
            { t: 4, v: 2, c: 12, r: -6, d: 15 }, {
              jolly: 'desk', set: { giveGet: true, deskApproved: true }, next: 'n3',
              say: `Nelle ultime ore ho lavorato con Giulia, del Deal Desk, a tre pacchetti. A: dieci per cento con fatturazione annuale. B: quindici per cento con impegno triennale. C: otto per cento con pagamento anticipato. Scegliamo insieme quello che regge davanti al suo Direttore Generale.`,
              react: [
                { n: `Valeria non risponde subito. Dal movimento della penna sul blocco capisci che sta facendo i conti.` },
                { w: 'valeria', a: `dopo una pausa`, t: `Il B. Il B lo posso portare a Rinaldi. Su pagamento e penali dobbiamo ancora lavorare.` },
                { think: `Ha scelto lei, tra tre scambi che andavano bene a me. Non ho dovuto dirle di no neanche una volta.` },
              ],
            }),
        ],
      },

      /* ───────── lunedì 30 · 18:15 · pagamento, penali, recesso ───────── */
      n3: {
        when: `Lunedì 30 · 18:15`, view: 'call', bg: 'night',
        where: `Call · Teams · lunedì 18:15`,
        scene: [
          { n: `Valeria richiama dopo tre quarti d’ora. Questa volta la telecamera inquadra solo le sue mani e un foglio fitto di appunti; fuori campo, un telefono fisso squilla a vuoto.` },
          { n: `Il numero rivisto che le hai mandato un quarto d’ora fa, quello contro Vertex, per lei è già archiviato: nessun commento, nessun ringraziamento.`, if: (d) => picked(d, 'wild:vertex_offerta', 'a') },
          { n: `Il tono di Valeria è più freddo di un’ora fa: il discorso su Vertex, per lei, non è chiuso.`, if: (d) => picked(d, 'wild:vertex_offerta', 'c') },
          { n: `Il pacchetto B è ancora sul tavolo, ma lei non lo cita: la partita si è spostata altrove.`, if: (d) => d.flags.deskApproved },
          { w: 'valeria', a: `legge dagli appunti`, t: `Sul resto: il pagamento a 120 giorni è politica di gruppo, le penali SLA arrivano fino al 15% del canone, il recesso per convenienza è possibile dopo dodici mesi. Sono condizioni standard per i nostri fornitori.` },
          { think: `Ha detto novanta, adesso legge centoventi. Una cosa è ciò che le serve, un’altra ciò che può dire a voce alta.`, if: (d) => d.flags.tradeSetup },
          { think: `Il quindici per cento del canone sono circa ottantamila euro che possono tornare indietro. E un recesso a dodici mesi trasforma un triennale in un annuale con un’altra etichetta.` },
          { think: `Nessuno di questi tre punti compare nello sconto. Tutti e tre valgono denaro.` },
        ],
        prompt: `Come tratti le condizioni non di prezzo?`,
        hint: `Le condizioni valgono denaro. Ogni concessione ha un controvalore per te e per loro.`,
        tip: `Termini di pagamento, penali e recesso sono prezzo mascherato. Valutali in euro, scambiali uno a uno, usa tetti (cap) e durate (lock-in) invece di rifiutare in blocco.`,
        choices: [
          ch('a', 0, `Su pagamento, penali e recesso posso venirle incontro: li accetto così come sono, purché lo sconto resti fermo al 12%. È il numero su cui rispondo io, il resto lo sistemiamo.`,
            `Centoventi giorni di incasso, penali per circa ottantamila euro e un recesso a un anno valgono più dei punti di sconto che hai difeso, anche se nel listino non compaiono. Un contratto così il Deal Desk non lo approva.`,
            { v: -6, c: -4, r: 14 }, {
              set: { termsBleed: true }, next: 'n4',
              say: `Valeria, su pagamento, penali e recesso posso venirle incontro: le accetto così come sono, purché lo sconto resti fermo al dodici per cento. È il numero su cui rispondo io, il resto lo sistemiamo.`,
              react: [
                { w: 'valeria', a: `con soddisfazione appena trattenuta`, t: `Ne prendo atto. Aggiorno la bozza stasera.` },
                { n: `Giri gli appunti della chiamata al legale e al Deal Desk. Alle 18:50 il telefono vibra due volte di fila.` },
                { chat: { from: 'bruni', app: 'Teams' }, t: `Penali senza tetto e recesso libero a dodici mesi. Così non passa dal mio tavolo.` },
                { w: 'giulia', a: `senza saluti`, t: `Dimmi che non hai detto sì a tutte e tre. Dimmelo adesso.` },
              ],
            }),
          ch('b', 3, `Su ciascuna ho una proposta: pagamento a 90 giorni; penali con tetto al 5%, solo sui livelli critici; recesso dopo 24 mesi con penale. In cambio, triennale e firma entro domani.`,
            `Hai tradotto ogni richiesta in una variabile con un prezzo e le hai legate a un impegno di Valeria. È il cuore del give-get: ogni cosa che dai ha una cosa che ricevi.`,
            { t: 4, c: 8, r: -8 }, {
              mp: ['P'], set: { giveGet: true }, next: 'n4',
              say: `Posso lavorare su ciascuna, ma una per una e con un prezzo. Pagamento a novanta giorni. Penali SLA con un tetto al cinque per cento e solo sui livelli di servizio critici. Recesso dopo ventiquattro mesi, con una penale di uscita. In cambio, impegno triennale e firma entro domani.`,
              react: [
                { w: 'valeria', a: `scrive`, t: `Il novanta lo difendo in gruppo. Il recesso a ventiquattro mesi con penale lo porto a Rinaldi.` },
                { think: `Non ha detto no a niente. Ha detto “lo porto”, che è il modo in cui si dice sì senza firmare.` },
              ],
            }),
          ch('c', 1, `Le nostre condizioni standard non si toccano: pagamento, penali e recesso sono quelli di ogni cliente Nexora. Sul prezzo ho margine, sul resto no, e non apro un secondo tavolo.`,
            `Una rigidità senza alternative non ti fa perdere il prezzo: ti fa perdere il tavolo. Valeria ha già in mano un piano B, e la rimessa a gara è scritta nella sua mail del pomeriggio.`,
            { t: -4, u: -4, c: -4, r: 8 }, {
              next: 'n4',
              say: `Valeria, le nostre condizioni standard non si toccano: pagamento, penali e recesso sono quelli di ogni cliente Nexora. Sul prezzo ho margine, sul resto no, e non apro un secondo tavolo.`,
              react: [
                { w: 'valeria', a: `piano, senza alterarsi`, t: `Allora valuto se la rimessa a gara non ci convenga.` },
                { think: `Ho difeso un contratto standard davanti a una persona che aveva già pronto il piano B. Chi aveva più alternative?` },
                { n: `Un clic. La chiamata finisce senza saluti.` },
              ],
            }),
          ch('d', 2, `Faccio intervenire il Legal fast-track di Nexora: entro stasera le mando clausole alternative su SLA e recesso, scritte apposta per essere approvate in fretta da voi.`,
            `Un testo equilibrato in due ore e una Valeria che ringrazia per la rapidità. È un buon uso del jolly, ma lo scambio economico resta ancora da fare.`,
            { t: 4, c: 8, r: -6 }, {
              jolly: 'legal', mp: ['P'], next: 'n4',
              say: `Valeria, attivo il Legal fast-track di Nexora. Entro stasera le mando clausole alternative su SLA e recesso, scritte apposta per essere approvate in fretta da voi.`,
              react: [
                { w: 'valeria', a: `quasi cordiale`, t: `Se arriva stasera, lo leggo stanotte. Grazie per la rapidità.` },
                { chat: { from: 'bruni', app: 'Teams' }, t: `Ho riscritto SLA e recesso in forma bilanciata: tetto sulle penali, preavviso sul recesso. Il testo ti arriva entro le 20:40.` },
                { think: `Il testo sarà buono. Ma il prezzo di tutto questo, per ora, non l’ho scambiato con niente.` },
              ],
            }),
        ],
      },

      /* ───────── martedì 31 · 09:00 · dieci minuti con il Direttore Generale ───────── */
      n4: {
        when: `Martedì 31 · 09:00`, view: 'call', bg: 'office',
        where: `Call · Teams · martedì 09:00`,
        scene: [
          { n: `Dopo una notte di cinque ore, la mattina del 31 ti accoglie con la luce piatta e la polvere sospesa sopra il monitor. L’open space è quasi deserto: due colleghi e un aspirapolvere in lontananza.` },
          { n: `Il confronto con Vertex, punto per punto, è partito alle 07:50. Valeria ha risposto con una parola sola: “Ricevuto”.`, if: (dd) => picked(dd, 'wild:vertex_offerta', 'd') },
          { chat: { from: 'paolo', app: 'WhatsApp' }, t: `Ti ho ottenuto dieci minuti, non uno di più: poi ha un volo da prendere. Ti collego io.`, sfx: 'ping' },
          { think: `Paolo mi ha detto che Rinaldi la gara non la vuole. Non devo chiederglielo: devo capire se me lo lascia intendere.`, if: (dd) => picked(dd, 'wild:paolo_confidenza', 'b') },
          { n: `Nel riquadro Teams compare Marco Rinaldi: sessant’anni, maglione blu sopra la camicia, un trolley accanto alla sedia e, dietro, le vetrate di una sala d’attesa. Ha un blocco bianco davanti e guarda l’orologio ogni due frasi. In un secondo riquadro, a telecamera spenta, Valeria ascolta senza parlare.` },
          { think: `Valeria è lì, a telecamera spenta. Ieri sera mi ha chiesto chi mi avesse parlato, e io non ho risposto.`, if: (dd) => picked(dd, 'wild:paolo_confidenza', 'a') },
          { w: 'rinaldi', a: `diretto`, t: `Valeria mi dice che siamo vicini. Io ho una sola domanda: se firmiamo oggi, cosa mi garantisce che vedrò dei benefici nel primo semestre?`, if: (dd) => !picked(dd, 'n3', 'c') },
          { w: 'rinaldi', a: `diretto`, t: `Ieri sera Valeria mi parlava di una gara, stamattina mi dice che siamo vicini. Non so quale delle due sia vera. Io ho una sola domanda: se firmiamo oggi, cosa mi garantisce che vedrò dei benefici nel primo semestre?`, if: (dd) => picked(dd, 'n3', 'c') },
          { think: `Dieci minuti e una domanda con una scadenza dentro: il primo semestre. Se rispondo con il prodotto, ha già ricominciato a guardare l’orologio.` },
        ],
        prompt: `È l’Economic Buyer. Cosa gli dici?`,
        hint: `Il DG non vuole sapere come funziona. Vuole sapere cosa vedrà, e quando.`,
        tip: `Con l’Economic Buyer parla di risultati misurabili e di tempi, non di funzioni. KPI condivisi e verifiche a cadenza fissa ti rendono corresponsabile del suo risultato.`,
        choices: [
          ch('a', 3, `Go-live in 90 giorni e un primo risultato misurabile su tre stabilimenti entro giugno: scorte giù dell’8%, meno rotture di stock. Verifica mensile con lei e con Paolo.`,
            `Hai risposto alla domanda che ti aveva fatto: un risultato, una data, un modo per verificarlo. Rinaldi ora ha qualcosa da difendere davanti al board, e tu hai il suo appoggio davanti a Valeria.`,
            { t: 8, v: 8, u: 4, c: 8 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Direttore, le do una risposta in tre punti. Go-live in novanta giorni dalla firma. Primo risultato misurabile entro giugno su tre stabilimenti: scorte giù dell’otto per cento e meno rotture di stock. E una verifica ogni mese con lei e con Paolo, su indicatori che decidiamo oggi.`,
              react: [
                { w: 'rinaldi', a: `appunta una cifra sul blocco`, t: `Questi numeri li posso difendere col board. Decido in giornata.` },
                { think: `Non ha chiesto il prodotto neanche una volta.` },
              ],
            }),
          ch('b', 1, `Nexora è leader nella pianificazione della domanda e lavora con gruppi alimentari come il vostro in tutta Europa. Le mando le referenze oggi stesso, se vuole.`,
            `Rinaldi ti ha chiesto cosa vedrà e quando, e tu gli hai parlato di Nexora. È educato, ma ha già capito che da te non avrà una risposta sul suo semestre.`,
            { t: 0, v: 0, c: 2 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Direttore, Nexora è leader nella pianificazione della domanda e lavora con gruppi alimentari come il vostro in tutta Europa. Le mando le referenze oggi stesso, se vuole.`,
              react: [
                { w: 'rinaldi', a: `educatamente`, t: `Questo l’ho letto. Io le ho chiesto un’altra cosa.` },
                { think: `Ho risposto alla domanda che avevo in testa, non a quella che mi ha fatto.` },
              ],
            }),
          ch('c', 1, `Se firma oggi, le aggiungo gratuitamente il modulo Analytics. Di solito lo vendiamo a parte, ma per una firma di oggi lo metto in conto alla nostra relazione con voi.`,
            `Hai regalato un modulo senza ottenere nulla e hai detto a Valeria, che ascoltava, che sul resto c’è margine. A Rinaldi non hai risposto: il suo dubbio è rimasto intatto.`,
            { t: 2, v: -4, c: -2, d: 8 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Direttore, se firma oggi le aggiungo gratuitamente il modulo Analytics. Di solito lo vendiamo a parte, ma per una firma di oggi lo metto in conto alla nostra relazione con voi.`,
              react: [
                { w: 'rinaldi', a: `con un mezzo sorriso`, t: `Gratis. Interessante.` },
                { n: `Nel riquadro in ombra, Valeria non dice niente. Abbassa lo sguardo e scrive una riga sul blocco.` },
                { think: `Un regalo per Rinaldi. Il conto, però, me lo presenterà Valeria.` },
              ],
            }),
          ch('d', 2, `Posso far collegare Marta, la nostra Sales Director, perché si impegni personalmente sul go-live. Due persone del suo livello che rispondono del risultato, davanti a lei.`,
            `Rinaldi gradisce la presenza: due persone di pari grado, finalmente. Ma il suo dubbio sul primo semestre non l’hai risolto: l’impegno di Marta è di cortesia, non di sostanza.`,
            { t: 6, v: 2, c: 4 }, {
              jolly: 'exec', mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Direttore, se può farle piacere, Marta Colombo, la nostra Sales Director, può collegarsi adesso e impegnarsi personalmente sul go-live.`,
              react: [
                { w: 'marta', a: `si collega, voce ferma`, t: `Buongiorno, Direttore. Sul go-live ci metto la faccia, e il mio nome sul piano.` },
                { w: 'rinaldi', a: `annuendo`, t: `Fa piacere vedere due livelli al tavolo. Resta la mia domanda: cosa vedo nel primo semestre?` },
                { think: `Ha apprezzato la presenza. Ma la sua domanda è ancora lì, senza risposta.` },
              ],
            }),
        ],
      },

      /* ───────── martedì 31 · 12:10 · il numero per il CRO ───────── */
      n5: {
        when: `Martedì 31 · 12:10`, view: 'phone', bg: 'office',
        where: `Messaggio · Marta · martedì 12:10`,
        scene: (d) => {
          const aperto = d.flags.termsBleed
            ? `Legale e Deal Desk hanno detto chiaro che il contratto, così com’è, non passa.`
            : `Manca ancora la risposta di Valeria sulle penali.`;
          return [
            { n: `Mezzogiorno e dieci. Sei nell’angolo cucina, davanti alla finestra opaca di vapore: il microonde sta finendo il suo giro, il panino è il primo pasto della giornata. Il telefono vibra sul piano di lavoro.` },
            chatM(`Alla call delle 19 devo dare al CRO il numero di Terrasole. Se non è un Commit pieno devo dirlo adesso, non alle 18:50. Dimmi dove siamo, davvero.`, { sfx: 'ping' }),
            { n: `Apri il CRM. Il campo dice ancora Commit, 90%.` },
            d.flags.rinaldiScritto
              ? { think: `Il sì di Rinaldi ce l’ho per iscritto, delle 10:52. ${aperto}` }
              : { think: `Sensazioni, non certezze. ${aperto} E da Rinaldi non ho un sì che non sia una frase detta in una call.` },
            { think: `Il microonde suona. Il panino può aspettare, il numero no.` },
          ];
        },
        prompt: `Cosa dichiari a Marta?`,
        hint: `Un forecast serve a prendere decisioni, non a farti sentire bene.`,
        tip: `Un forecast gonfiato brucia fiducia con chi decide risorse; uno sottostimato fa perdere opportunità di supporto. Dai un numero onesto, con ciò che manca e ciò che stai facendo per chiuderlo.`,
        choices: [
          ch('a', 0, `Commit pieno, al cento per cento: Valeria ha il mandato di chiudere entro stasera e il Direttore Generale è con noi. Puoi scriverlo così al CRO, senza riserve.`,
            `Hai trasformato una sensazione in un impegno: se Valeria prende tempo, Marta avrà detto al CRO una cosa non vera sulla tua parola, e il tuo credito con il management è azzerato per i prossimi tre trimestri.`,
            { r: 4 }, {
              integ: -8, set: { forecastInflated: true }, next: 'n6',
              say: `Marta, Commit pieno, cento per cento. Valeria ha il mandato di chiudere entro stasera e il Direttore Generale è con noi. Scrivilo pure così al CRO, senza riserve.`,
              react: [
                chatM(`Perfetto. Seicentoventimila come certi, con il tuo nome accanto. Alle 19 il numero lo dico io al CRO, con la mia faccia.`),
                { think: `Ho dato per certo qualcosa che ho soltanto sentito dire.` },
              ],
            }),
          ch('b', 3, `Commit con rischio, circa 70%: mi mancano il sì scritto di Valeria sul contratto e quello di Rinaldi. Ti dico cosa serve per arrivare al 90% e chi chiamo.`,
            `Hai dato un numero con le sue evidenze e i suoi buchi, e un piano per colmarli. Marta può difenderlo in alto, e sa dove aiutarti: un forecast onesto è ciò che apre le porte quando servono.`,
            { c: 4, r: -4 }, {
              integ: 6, set: { forecastHonest: true }, next: 'n6',
              say: `Marta, Commit con rischio, circa il settanta per cento. Mi mancano due cose: il sì scritto di Valeria sul contratto e quello di Rinaldi. Per portarlo al novanta le chiedo a entrambi nelle prossime ore, e ti dico io come va.`,
              react: [
                chatM(`Meglio un settanta che regge che un novanta che mi piace. Lo porto così, con il rischio scritto. E se il CRO mi chiede chi può sbloccare la cosa, faccio il tuo nome.`),
                { think: `Un numero con i buchi dichiarati. Non è comodo, ma è un numero che posso guardare in faccia.` },
              ],
            }),
          ch('c', 1, `Mettilo in Best Case, intorno al 40%: preferisco restare basso e non esporre te con il CRO. Se poi chiude, è un regalo per tutti, e nessuno resta deluso.`,
            `Hai nascosto informazioni utili: se chiudi, il successo arriva a sorpresa, e Marta non ha potuto aiutarti con ciò che sapeva. Un forecast sottostimato è sleale quanto uno gonfiato.`,
            { c: -2 }, {
              integ: -3, next: 'n6',
              say: `Marta, mettilo in Best Case, intorno al quaranta per cento. Preferisco restare basso e non esporti con il CRO. Se poi chiude, è un regalo per tutti.`,
              react: [
                chatM(`Quaranta. Quindi lo tolgo dal Commit, e il CRO mi chiederà che ne faccio di quei seicentoventi. O non lo vedi o non me lo dici, {nome}: quale delle due?`),
                { think: `Ho scelto di non sbilanciarmi, e intanto ho tolto a Marta la possibilità di aiutarmi.` },
              ],
            }),
          ch('d', 2, `Adesso non ho un numero che regga: ti mando un quadro aggiornato nel pomeriggio, quando avrò sentito sia Valeria sia Rinaldi e potrò dirti qualcosa di concreto.`,
            `Non è una bugia, ma neppure un aiuto: Marta ha un orario preciso per il CRO e le tue informazioni arrivano dopo. Rimandare un forecast è un modo per non decidere.`,
            {}, {
              integ: -1, next: 'n6',
              say: `Marta, adesso non ho un numero che regga. Ti mando un quadro aggiornato nel pomeriggio, quando avrò sentito sia Valeria sia Rinaldi e potrò dirti qualcosa di concreto.`,
              react: [
                chatM(`Alle 16 devo sapere che numero metto sulla slide. “Nel pomeriggio” non è un numero.`),
                { think: `Ha ragione. Ho rimandato il numero, e la preoccupazione è rimasta tutta a me.` },
              ],
            }),
        ],
      },

      /* ───────── martedì 31 · 16:20 · l’ultima richiesta ───────── */
      n6: {
        when: `Martedì 31 · 16:20`, view: 'call', bg: 'night',
        where: `Call · Teams · martedì 16:20`,
        scene: (d) => {
          const maint = wildSeen(d, 'portale_firma');
          const chiusura = !maint ? `prima delle sette`
            : picked(d, 'wild:portale_firma', 'a') ? `dal portale o via PEC, come concordato`
              : `appena il portale è di nuovo in piedi`;
          return [
            { n: `La luce di fine dicembre fuori dalla finestra è già arancione e piatta, e le auto lasciano il parcheggio a gruppetti, in anticipo sul veglione. Hai le cuffie ancora calde dal giro di telefonate.` },
            { w: 'valeria', a: `cordiale, quasi amichevole`, t: `Siamo al novanta per cento dell’accordo. Un’ultima cosa: includete il modulo Analytics, quello che di solito vendete a parte, senza costi nel primo anno. Con questo firmiamo stasera, ${chiusura}.` },
            { w: 'valeria', a: `con lo stesso tono`, t: `Stamattina lei ne ha parlato al Direttore Generale, e lui se lo ricorda bene. Preferisco metterlo per iscritto, per non fare confusione.`, if: (dd) => picked(dd, 'n4', 'c') },
            { n: `Dietro di lei c’è ancora il calendario con il 31 cerchiato di rosso. Per la prima volta, sul tavolo non c’è il blocco: solo una tazza di caffè.` },
            { think: `Novanta per cento. Il dieci che resta ha un nome solo: Analytics.` },
            { think: `Ieri sera parlava di rimessa a gara, oggi dice novanta per cento. Qualcosa, dall’altra parte, è cambiato. Non so cosa.`, if: (dd) => picked(dd, 'n3', 'c') },
            { think: `Alle 19 Marta dirà al CRO che è tutto certo. Qualsiasi cosa chieda Valeria adesso, la pago due volte.`, if: (dd) => picked(dd, 'n5', 'a') },
            { think: `Marta voleva il mio numero alle 16. Sono le 16:20 e non le ho ancora scritto.`, if: (dd) => picked(dd, 'n5', 'd') },
            { think: `Il tono è cambiato: niente ultimatum, niente numeri scanditi come ordini. Quando una buyer diventa gentile all’ultima ora, c’è sempre un motivo.` },
          ];
        },
        prompt: `Ultima richiesta. Come la gestisci?`,
        hint: `L’ultima richiesta è quasi sempre una verifica: ti hanno messo alla prova per capire se la linea è elastica.`,
        tip: `La richiesta dell’ultimo minuto (in gergo, la “nibble”) testa se hai tenuto la linea. Se cedi senza scambio, hai appena detto che tutto il resto era trattabile. Ogni extra va legato a un impegno concreto: firma, referenza, caso di successo.`,
        choices: [
          ch('a', 0, `D’accordo, Analytics senza costi nel primo anno. Se è davvero l’ultima cosa, firmiamo stasera e chiudiamo l’anno in bellezza: la mail di conferma la preparo io, subito.`,
            `Hai regalato circa dieci punti di sconto equivalenti e confermato a Valeria che la linea era elastica. Il Deal Desk ti guarderà a lungo.`,
            { v: -8, c: -4, d: 10 }, {
              next: 'END',
              say: `D’accordo, Valeria: Analytics senza costi nel primo anno. Se è davvero l’ultima cosa, firmiamo stasera e chiudiamo l’anno in bellezza: la mail di conferma la preparo io, subito.`,
              react: [
                { w: 'valeria', a: `sorride, appena`, t: `Perfetto. Preparo l’ordine d’acquisto.` },
                { think: `Ho detto che tutto il resto era trattabile, e lei lo ha scritto a margine.` },
                { n: `Appena chiusa la chiamata, il telefono vibra: Giulia, del Deal Desk. Un solo messaggio. “Chiamami.”` },
              ],
            }),
          ch('b', 3, `Analytics lo includo al 50% nel primo anno, con firma entro stasera e un caso di successo da pubblicare tra sei mesi. Se ci siamo, preparo l’addendum entro un’ora.`,
            `Hai ceduto poco, e in cambio hai ottenuto tempi, referenza e rispetto da parte di chi ti ha spremuto per tutta la giornata. Una concessione legata a un impegno non è una resa: è uno scambio.`,
            { t: 4, v: 4, c: 10, d: 3 }, {
              set: { giveGet: true }, next: 'END',
              say: `Valeria, Analytics lo includo al cinquanta per cento nel primo anno, a tre condizioni: firma entro stasera, un caso di successo da pubblicare tra sei mesi e l’addendum che le preparo io entro un’ora. Se ci siamo, parto subito.`,
              react: [
                { w: 'valeria', a: `dopo una pausa`, t: `Porto il cinquanta a Rinaldi.` },
                { n: `Passano quattro minuti, riempiti da un rumore di tastiera. Poi la voce di Valeria, più distesa.` },
                { w: 'valeria', t: `Lo accetta. Preparate l’addendum.` },
                { think: `Metà modulo contro una firma stasera e un nome da mettere sul sito. Alle sette ci arrivo con un contratto, non con una promessa.` },
              ],
            }),
          ch('c', 2, `Analytics non fa parte del perimetro di questo contratto. Dopo la firma le preparo una proposta dedicata, con condizioni pensate apposta per il vostro gruppo.`,
            `Hai tenuto la linea: la richiesta era una verifica, e ha scoperto che c’è un limite. L’accordo slitta di qualche ora e il rischio sale, ma la tua posizione ne esce più solida.`,
            { c: 2, u: -4, r: 4 }, {
              next: 'END',
              say: `Valeria, Analytics non fa parte del perimetro di questo contratto. Dopo la firma le preparo una proposta dedicata, con condizioni pensate per voi.`,
              react: [
                { w: 'valeria', a: `insiste, senza durezza`, t: `Mi riesce difficile spiegarlo al Direttore Generale.` },
                { w: 'valeria', a: `dopo un silenzio`, t: `Va bene. Aspetto la sua proposta dopo la firma.` },
                { n: `Valeria chiude la chiamata senza fissare un orario. Alle 17:30 il telefono è ancora zitto, ma nessuno ha detto no.` },
              ],
            }),
          ch('d', 1, `Se firmate entro stasera, Analytics è gratis. Dopo la mezzanotte l’offerta decade, e a gennaio dovrei riscriverla da zero a un prezzo diverso, con un’altra approvazione.`,
            `Una scadenza artificiale non regge con chi conosce il calendario: Valeria la riconosce subito, e ti costa credibilità proprio nel momento in cui ne avevi più bisogno. Hai regalato Analytics lo stesso.`,
            { t: -6, v: -4, c: -4, d: 10 }, {
              integ: -2, next: 'END',
              say: `Valeria, se firmate entro stasera Analytics è gratis. Dopo la mezzanotte l’offerta decade, e a gennaio dovrei riscriverla da zero, a un altro prezzo.`,
              react: [
                { w: 'valeria', a: `sorridendo`, t: `Quindi a gennaio sarà disponibile, a un prezzo diverso?` },
                { think: `Ha riconosciuto la scadenza finta. E il modulo glielo ho regalato lo stesso.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'giulia_chiude', title: `Il Deal Desk chiude alle sei`, w: 3, after: ['n1'],
        node: {
          when: `Lunedì 30 · 16:35`, view: 'call', bg: 'night', where: `Call · Teams · Giulia Ferraro · lunedì 16:35`,
          scene: (d) => [
            { n: `Alle 16:35 il piano è già mezzo vuoto. Sul bordo della scrivania il telefono si illumina, e poi suona Teams: Giulia Ferraro, del Deal Desk.`, sfx: 'phone' },
            { n: `Ha il badge ancora al collo e, sul tavolo dietro di lei, una pila di scatole di panettoni in attesa di essere distribuite. Parla guardando l’orologio, non lo schermo.` },
            { w: 'giulia', a: `senza saluti`, t: `Ho visto girare la mail degli Acquisti di Terrasole. Ti dico come stanno le cose: alle sei chiudo con Finance. Quello che mi porti prima lo leggo stasera. Il resto lo vedo domani mattina, e a fine anno “domani mattina” vuol dire dopo pranzo.` },
            { think: `Paolo mi ha detto cosa è leva e cosa è scena. Se devo far approvare qualcosa, che sia soltanto ciò che serve davvero.`, if: (dd) => picked(dd, 'n1', 'b') },
            { think: `Il venti l’ho detto io a Valeria, a voce. A Giulia quel numero non l’ho mai fatto vedere.`, if: (dd) => picked(dd, 'n1', 'a') },
            { think: `Marta mi ha chiesto cosa do in cambio e non ho saputo dirglielo. A Giulia lo devo portare scritto, e in meno di due ore.`, if: (dd) => picked(dd, 'n1', 'c') },
            { think: `Ho lasciato passare il pomeriggio, e adesso il tempo ce l’ha lei. Un’ora e mezza per decidere cosa chiederle.`, if: (dd) => picked(dd, 'n1', 'd') },
          ],
          prompt: `Giulia chiude alle sei. Cosa le chiedi?`,
          hint: `Un’approvazione serve se si sa cosa si approva. Prima dello sconto, pensa a cosa ricevi in cambio.`,
          tip: `Il Deal Desk approva meglio uno scambio che un numero: porta pacchetti con la contropartita scritta accanto, non una cifra da giustificare dopo. Una delega in bianco sembra comoda, ma diventa il tetto verso cui scivoli quando il cliente spinge.`,
          choices: [
            ch('a', 3, `Ti porto entro le cinque e mezza tre pacchetti, ognuno con lo sconto e la sua contropartita scritta accanto. Da domani uso solo quelli, e solo contro qualcosa che Valeria mi dà.`,
              `Hai usato l’ora che il Deal Desk ti concede per fissare la cornice: ogni punto di sconto ha già il suo prezzo scritto e letto da chi lo deve approvare. Domani, davanti a Valeria, non dovrai inventare una contropartita.`,
              { t: 2, c: 8, r: -6 }, {
                next: 'RET',
                say: `Giulia, ho un’ora e ti chiedo di usarla bene: entro le cinque e mezza ti porto tre pacchetti, ognuno con lo sconto e la sua contropartita scritta accanto. Da domani uso solo quelli, e solo contro qualcosa che Valeria mi dà.`,
                react: [
                  { w: 'giulia', a: `già con le dita sulla tastiera`, t: `Entro le cinque e mezza. Ricorda: uno sconto senza la sua contropartita accanto, per me, non è un pacchetto. È un regalo.` },
                  { think: `Tre pacchetti da far leggere stasera. Domani non dovrò inventare niente: dovrò scegliere.` },
                ],
              }),
            ch('b', 2, `Dammi un’approvazione quadro fino al 18%, da usare domani come mi serve: non ho il tempo di scrivere pacchetti, e Valeria non aspetta nessuno, nemmeno noi due.`,
              `Un’approvazione quadro ti dà margine ma non una struttura: senza contropartite scritte, il 18% rischia di diventare il numero a cui ti avvicini da solo, per fretta. Meglio di niente, peggio di un pacchetto.`,
              { c: 4, r: -1 }, {
                next: 'RET',
                say: `Giulia, non ho il tempo di scrivere pacchetti, e Valeria non aspetta nessuno, nemmeno noi due. Dammi un’approvazione quadro fino al diciotto per cento, da usare domani come mi serve.`,
                react: [
                  { w: 'giulia', a: `dopo una pausa`, t: `Lo firmo, ma lo scrivo come tetto e non come obiettivo. Ogni punto che scendi, domani lo spieghi a me.` },
                  { think: `Un diciotto in tasca e nessuna contropartita. È un margine, non una strategia.` },
                ],
              }),
            ch('c', 1, `Non voglio rubarti l’ultima ora dell’anno: domani ho la mia soglia al 12% e, se serve, ti chiamo. Lascia che sia io a decidere cosa portarti, e quando.`,
              `Hai scambiato un po’ di pudore con un buco: oltre il 12% ti serve il Deal Desk, e a fine anno il Deal Desk risponde dopo pranzo. Se Valeria spinge, deciderai da solo, e da solo risponderai.`,
              { c: -4, r: 6 }, {
                next: 'RET',
                say: `Giulia, non voglio rubarti l’ultima ora dell’anno. Domani ho la mia soglia al dodici per cento e, se serve, ti chiamo. Lascia che sia io a decidere cosa portarti, e quando.`,
                react: [
                  { w: 'giulia', a: `asciutta`, t: `Come vuoi. Ma qualunque cosa sopra il dodici, dopo le sei, la vedo domani a pranzo. Non prima.` },
                  { think: `Ho evitato di disturbarla. Adesso il tempo che ho per decidere dura quanto una telefonata di Valeria.` },
                ],
              }),
            ch('d', 0, `Lasciami mano libera fino al 25% per domani sera. So come muovermi, e non voglio tornare da te ogni volta che Valeria rilancia o guarda l’orologio.`,
              `Una delega in bianco è l’opposto di ciò per cui esiste il Deal Desk, e Giulia lo sa. Ti sei bruciato un po’ di credito con lei, e ti porti dietro un numero che alla prima occasione uscirà dalla tua bocca.`,
              { t: -2, c: -4, r: 8 }, {
                next: 'RET',
                say: `Giulia, lasciami mano libera fino al venticinque per cento per domani sera. So come muovermi, e non voglio tornare da te ogni volta che Valeria rilancia o guarda l’orologio.`,
                react: [
                  { w: 'giulia', a: `secca`, t: `No. Mano libera non esiste, né per te né per Marta. Portami un pacchetto, o una cifra con la sua contropartita, e ne parliamo.` },
                  { think: `Ho chiesto un permesso in bianco a chi, di mestiere, non ne firma.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'vertex_offerta', title: `Un’offerta di Vertex sulla scrivania di Valeria`, w: 3, after: ['n2'],
        node: {
          when: `Lunedì 30 · 17:55`, view: 'mail', bg: 'night', where: `Email · Valeria Conti · lunedì 17:55`,
          scene: (d) => [
            { n: `La chiamata con Valeria è finita da dieci minuti. Stai ancora sistemando gli appunti quando sul portatile scivola una notifica. Oggetto: “Per trasparenza”.`, sfx: 'ping' },
            { mail: { from: `Valeria Conti · Acquisti Terrasole`, subj: `Per trasparenza` }, t: `Le segnalo che oggi abbiamo ricevuto un’offerta di Vertex Systems per un perimetro analogo, con un prezzo inferiore del 28% al vostro listino e pagamento a 120 giorni. Lo comunico perché ne tenga conto nelle sue valutazioni di stasera.` },
            { think: `Ho già una struttura sul tavolo: durata, pagamento, firma. Posso rispondere con un confronto, non con un numero.`, if: (dd) => dd.flags.giveGet || dd.flags.deskApproved },
            { think: `Ho già detto un numero e non ho avuto niente in cambio. Adesso il mio prezzo deve difendersi da solo contro il loro.`, if: (dd) => dd.disc >= 12 && !dd.flags.giveGet && !dd.flags.deskApproved },
            { think: `Ventotto per cento in meno. Vero, gonfiato o scritto apposta perché io scenda? Dalla mail non lo capisco.`, if: (dd) => !(dd.flags.giveGet || dd.flags.deskApproved) && dd.disc < 12 },
            { n: `Il termosifone sotto la finestra ticchetta mentre si scalda. Rileggi due volte la riga con il nome di Vertex Systems.` },
          ],
          prompt: `Come rispondi all’offerta di Vertex?`,
          hint: `Un prezzo non è un’offerta: finché non conosci il perimetro, stai confrontando due numeri che non dicono la stessa cosa.`,
          tip: `Davanti a un’offerta concorrente il prezzo è l’ultima cosa da toccare. Chiedi il perimetro, confronta il costo totale e riporta la discussione su ciò che per il cliente vale più dello sconto. Chi denigra perde credibilità, chi chiarisce la conserva.`,
          choices: [
            ch('a', 0, `Le scrivo che mi allineo: se Vertex è sotto del 28%, scendo anch’io e chiudiamo stasera, senza altri giri e senza altre riunioni con nessuno.`,
              `Allinearsi al prezzo di un concorrente che non hai visto significa accettare il suo terreno: un numero contro un numero. Hai trasformato la trattativa in un’asta, e un’asta si perde ribassando.`,
              { t: -4, v: -8, c: -6, r: 6, d: 10 }, {
                next: 'RET',
                say: `Valeria, la ringrazio per la trasparenza. Se Vertex è sotto del ventotto per cento, mi allineo: scendo anch’io e chiudiamo stasera, senza altri giri.`,
                react: [
                  { w: 'valeria', a: `con un tono quasi gentile`, t: `Apprezzo la disponibilità. Mi aspetto di vedere il nuovo numero entro un’ora.` },
                  { think: `Per lei il mio prezzo era un punto di partenza. Adesso lo so anche io.` },
                ],
              }),
            ch('b', 3, `Le chiedo su cosa si basa il confronto: perimetro, implementazione, SLA, referenze. Confrontiamo il costo totale, non il prezzo di partenza.`,
              (d) => (d.flags.giveGet || d.flags.deskApproved
                ? `Con uno scambio già impostato il confronto regge: difendi una struttura, non un numero, e Valeria lo sa. Spostare il discorso dal prezzo al perimetro è la mossa giusta davanti a un’offerta che non hai visto.`
                : `Hai spostato la conversazione dal prezzo al perimetro. Senza uno scambio già in piedi la tua posizione è meno solida, ma sei tu a guidare il confronto, non Vertex.`),
              (d) => ({ t: 4, v: (d.flags.giveGet || d.flags.deskApproved || d.m.value >= 55) ? 8 : 4, c: 8, r: -6 }), {
                next: 'RET',
                say: `Valeria, grazie per averlo detto: mi aiuta a confrontarci su qualcosa di vero. Mi dica su cosa si basa il confronto: perimetro, implementazione, livelli di servizio, referenze, costi di migrazione. Lo facciamo sul costo totale, non sul prezzo di partenza.`,
                react: [
                  { w: 'valeria', a: `dopo un momento`, t: `Il documento di Vertex non glielo posso girare. Le dico però su cosa li confronto: implementazione, livelli di servizio e costo su tre anni.` },
                  { think: `Non vedrò la loro offerta, ma ho i suoi criteri. Da un numero contro un numero siamo passati a una tabella: è il terreno su cui voglio stare.` },
                ],
              }),
            ch('c', 1, `Le dico che Vertex ha una storia di implementazioni in ritardo e di costi extra: l’ho visto in altri clienti, e il prezzo basso si paga dopo la firma.`,
              `Hai parlato male di un concorrente senza una prova in mano. Valeria ora ha un motivo per non fidarsi di te, e un’occasione per ripeterlo a Rinaldi.`,
              { t: -6, c: -2, r: 6 }, {
                next: 'RET',
                say: `Valeria, le dico quello che ho visto in altri clienti: Vertex ha una storia di implementazioni in ritardo e di costi extra. Il prezzo basso, di solito, si paga dopo la firma.`,
                react: [
                  { w: 'valeria', a: `gelida`, t: `Mi sta dicendo che l’offerta che ho in mano è una trappola. Ha qualcosa di scritto da mostrarmi?` },
                  { think: `Una voce, non un fatto. E l’ho detta a chi decide cosa credere.` },
                ],
              }),
            ch('d', 2, `Prendo nota e le preparo per domani alle otto un confronto scritto, punto per punto, da portare al Direttore Generale in riunione.`,
              `Una risposta composta e professionale: eviti di inseguire il prezzo e prometti un confronto serio. Ma arriva dopo, e per stanotte il dubbio resta sul tavolo di Valeria.`,
              { t: 2, v: 2, u: -2, r: 2 }, {
                next: 'RET',
                say: `Valeria, prendo nota e la ringrazio. Le preparo per domani alle otto un confronto scritto, punto per punto, che potrà portare al Direttore Generale.`,
                react: [
                  { w: 'valeria', a: `asciutta`, t: `Apprezzo la precisione. Alle otto e mezza ho il Direttore Generale in agenda: lo prepari bene.` },
                  { think: `Un documento promesso per domattina. Stanotte si dorme poco, ma il confronto lo scrivo io.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'paolo_confidenza', title: `Paolo ti chiama con una confidenza`, w: 3, after: ['n3'],
        node: {
          when: `Lunedì 30 · 19:20`, view: 'phone', bg: 'night', where: `Telefono · Paolo Greco · lunedì 19:20`,
          scene: (d) => [
            { n: `Il piano è ormai vuoto: restano le luci a sensore e il bip lontano di una stampante dimenticata accesa. Il telefono squilla sulla scrivania.`, sfx: 'phone' },
            { w: 'paolo', a: `a voce bassa, camminando`, t: d.flags.insider
              ? `Ti richiamo perché prima, al telefono, non potevo dirti tutto. Una cosa però devi saperla, e tu non l’hai sentita da me, ok?`
              : `Mi hanno girato la mail di Valeria, e da te non ho sentito niente. Ti dico una cosa e poi finisce qui: tu non l’hai sentita da me, ok?` },
            { w: 'paolo', t: `Oggi ho preso un caffè con Rinaldi. La gara a gennaio non la vuole: il primo trimestre è già saturo e non ha le risorse per ripartire da zero. Valeria la usa come leva, ma lui non la farebbe mai.` },
            { n: `Senti un portone che si chiude, poi il passo di Paolo che rallenta sul marciapiede.` },
            { think: `Se è vero, ho in mano il punto più importante del tavolo. Se Paolo ha capito male, ho in mano una bomba con il suo nome sopra.` },
          ],
          prompt: `Paolo ti ha dato una confidenza. Cosa ne fai?`,
          hint: `Una confidenza è un dato, non un fatto. E chi te l’ha data si fida di te: come la usi lo dice anche a lui.`,
          tip: `Le informazioni del champion servono a calibrare le mosse, non a mostrare le carte. Se citi la fonte la bruci, se la prendi per certa ci scommetti il trimestre: usala per decidere dove tenere la linea, e verificala dalla fonte vera.`,
          choices: [
            ch('a', 0, `Uso l’informazione apertamente: dico a Valeria che so che la gara non è un’opzione e che da stasera non mi muovo più di un millimetro.`,
              `Hai usato la confidenza come un’arma e hai mostrato la fonte. Valeria risalirà a Paolo in meno di un’ora, e il canale che ti diceva la verità si chiude.`,
              { t: -10, c: -4, r: 10 }, {
                next: 'RET',
                say: `Valeria, le dico una cosa con franchezza: so che la rimessa a gara non è un’opzione per il Direttore Generale. Quindi da stasera non mi muovo più dalle posizioni che abbiamo sul tavolo.`,
                react: [
                  { w: 'valeria', a: `dopo un silenzio lungo`, t: `Chi gliel’ha detto?` },
                  { think: `Se rispondo, ho perso il mio champion. Se non rispondo, ho appena confessato di avere una talpa.` },
                ],
              }),
            ch('b', 3, `Non lo cito con nessuno. Lo uso per decidere dove tenere la linea e dove cedere, e domattina lo verifico con Rinaldi.`,
              (d) => (d.flags.insider
                ? `Hai trattato la confidenza per ciò che è: un dato da pesare, non una carta da giocare. Paolo ha visto come la usi e si fida di te ancora di più; la verifica con Rinaldi, domani, ti dirà quanto vale.`
                : `Hai trattato la confidenza per ciò che è: un dato da pesare. Non hai ancora una relazione solida con Paolo, ma questa mossa la costruisce: la prossima volta ti dirà di più.`),
              (d) => ({ t: d.flags.insider ? 6 : 3, c: 6, r: -4 }), {
                next: 'RET',
                say: `Grazie, Paolo. Non l’ho sentita da te e non la cito con nessuno. Mi serve per capire dove tenere la linea e dove cedere. Domattina la verifico io, dalla bocca di Rinaldi.`,
                react: [
                  { w: 'paolo', a: `sollevato`, t: `Bravo. Con Rinaldi parla di risultati, non di gare: se lo senti, capisci da solo se ho ragione.` },
                  { think: `Una confidenza è un dato, non un fatto. Intanto so dove ho spazio.` },
                ],
              }),
            ch('c', 1, `Alzo la posta: da domani tolgo ogni concessione dal tavolo e non scendo di un punto. Se la gara è un bluff, non c’è motivo di cedere ancora.`,
              `Hai scambiato una voce per una certezza e ci hai scommesso sopra il trimestre. Un irrigidimento a freddo è proprio ciò che serve a Valeria per giustificare la gara che Rinaldi non vuole.`,
              { t: -4, u: -6, c: -4, r: 8 }, {
                next: 'RET',
                say: `Paolo, se è così, da domani non cedo più nulla. Tolgo ogni concessione dal tavolo: se la gara è un bluff, non c’è motivo di cedere ancora.`,
                react: [
                  { w: 'paolo', a: `preoccupato`, t: `Aspetta. Ti ho detto che la gara non la vuole lui, non che Valeria non la farebbe. Se la forzi, la fa per orgoglio.` },
                  { think: `Una frase sentita al telefono, e io ci sto costruendo sopra la serata.` },
                ],
              }),
            ch('d', 2, `Lo ringrazio ma non cambio niente: continuo a trattare come se la gara fosse un’ipotesi vera, e la confidenza resta una voce.`,
              `Prudente e rispettoso della fonte, ma la confidenza resta sprecata: sapere che la gara non è la carta di Rinaldi ti avrebbe permesso di tenere meglio la linea. Non rischi niente e non guadagni niente.`,
              { t: 2, c: 2, r: -2 }, {
                next: 'RET',
                say: `Grazie, Paolo. Ma una voce è una voce: continuo a trattare come se la gara fosse un’ipotesi vera.`,
                react: [
                  { w: 'paolo', a: `con un mezzo sorriso`, t: `Fai bene a non fidarti di nessuno. Però adesso sai almeno che puoi respirare.` },
                  { think: `Prudente. Spero di non scoprire domani che era l’unica cosa vera della giornata.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'rinaldi_gate', title: `Rinaldi è al gate: hai cinque minuti`, w: 3, after: ['n4'],
        node: {
          when: `Martedì 31 · 10:40`, view: 'phone', bg: 'office', where: `Telefono · Paolo Greco · martedì 10:40`,
          scene: (d) => [
            { n: `Stai rispondendo a una mail quando il telefono vibra due volte di fila: è Paolo.`, sfx: 'phone' },
            { w: 'paolo', a: `di corsa, con altoparlanti sullo sfondo`, t: `Rinaldi è al gate a Bologna, imbarco alle 11. Va a Catania, e una volta a terra ha le riunioni: il telefono lo riaccende dopo le tre. Ha cinque minuti adesso: o lo chiami o lo ritrovi nel pomeriggio.` },
            { n: `Un secondo messaggio di Paolo, senza commento: il numero diretto di Rinaldi.` },
            { think: `Ha il mio piano a novanta giorni in mano. Se c’è un momento per fargli scrivere un sì, è questo.`, if: (dd) => picked(dd, 'n4', 'a') },
            { think: `Dopo stamattina non so cosa abbia davvero capito. Cinque minuti non bastano per ricominciare, ma bastano per una domanda.`, if: (dd) => !picked(dd, 'n4', 'a') },
          ],
          prompt: `Hai cinque minuti con il Direttore Generale. Cosa chiedi?`,
          hint: `Cinque minuti non servono per spiegare: servono per ottenere una cosa sola, che resti anche quando il telefono si spegne.`,
          tip: `Con un decisore in movimento una richiesta precisa e verificabile vale più di una conversazione: un sì scritto, un nome per la firma, una data. Quello che resta su carta è ciò che il manager e il cliente possono usare dopo.`,
          choices: [
            ch('a', 3, `Lo chiamo e chiedo una cosa sola: due righe scritte, anche su WhatsApp, con il suo sì e il nome di chi firma se lui non è raggiungibile.`,
              (d) => (picked(d, 'n4', 'a')
                ? `Con cinque minuti e una richiesta sola hai trasformato un sì a voce in un documento. Per Marta e per Valeria è un’altra categoria di prova.`
                : `Anche con un piano meno forte, una richiesta precisa ti porta a casa un sì scritto, seppur condizionato. Con Rinaldi le richieste vaghe si perdono, quelle da due righe si eseguono.`),
              (d) => (picked(d, 'n4', 'a') ? { t: 4, v: 4, c: 10, r: -8 } : { t: 2, c: 6, r: -4 }), {
                set: { rinaldiScritto: true, procuraNota: true }, next: 'RET',
                say: `Direttore, ci siamo sentiti stamattina. Le chiedo una cosa sola, in trenta secondi: due righe scritte, anche da WhatsApp, in cui conferma il suo sì e indica chi firma al suo posto, se lei non è raggiungibile.`,
                react: (d) => (picked(d, 'n4', 'a')
                  ? [
                    { w: 'rinaldi', a: `tra un annuncio e l’altro`, t: `Va bene, scrivo. Approvo il piano come lo ha presentato. Per la firma, se non rispondo, c’è il direttore finanziario con la procura.` },
                    { chat: { from: 'rinaldi', app: 'WhatsApp' }, t: `Approvo il piano di go-live come presentato. Valeria ha il mio mandato a chiudere. In mia assenza firma il direttore finanziario, con procura.` },
                    { think: `Due righe, con data e ora e un nome per la firma. Valgono più di dieci call.` },
                  ]
                  : [
                    { w: 'rinaldi', a: `tra un annuncio e l’altro`, t: `Per me si può procedere, salvo i termini che deve valutare Valeria. Le scrivo due righe adesso. Se non rispondo, firma il direttore finanziario.` },
                    { chat: { from: 'rinaldi', app: 'WhatsApp' }, t: `Per me si può procedere, salvo i termini che valuta Valeria. In mia assenza firma il direttore finanziario, con procura.` },
                    { think: `Un sì con riserva. Non è tutto, ma è su carta.` },
                  ]),
              }),
            ch('b', 1, `Gli lascio un vocale con il riassunto del piano e gli chiedo di richiamarmi appena atterra, quando ha un momento più calmo per parlarne.`,
              `Un vocale a chi sta salendo su un aereo è un messaggio in bottiglia. Hai lasciato scorrere l’unica finestra utile: un eventuale sì scritto arriverà dopo le tre, a numero già dato a Marta.`,
              { u: -4, c: -2 }, {
                next: 'RET',
                say: `Lascio un messaggio a Rinaldi: gli riassumo il piano in trenta secondi e gli chiedo di richiamarmi appena atterra.`,
                react: [
                  { n: `Squilla quattro volte, poi parte la segreteria. Registri trenta secondi di piano, parlando più veloce del dovuto.` },
                  { think: `Un vocale a un uomo che sta per imbarcarsi. Lo ascolterà alle tre, forse.` },
                ],
              }),
            ch('c', 1, `Gli chiedo di sbloccare subito lo sconto: se mi dà il via sul 12% adesso, risparmiamo tempo a tutti, Valeria compresa, e chiudiamo in giornata.`,
              `Hai usato l’unica finestra con l’Economic Buyer per parlare di prezzo, scavalcando Valeria, con cui il prezzo si tratta. Rinaldi non ama essere trattato come un ufficio acquisti.`,
              { t: -6, c: -6, r: 6 }, {
                next: 'RET',
                say: `Direttore, le chiedo una cosa pratica: se mi dà il via sul dodici per cento adesso, risparmiamo tempo a tutti, Valeria compresa.`,
                react: [
                  { w: 'rinaldi', a: `secco`, t: `Queste cose le tratto con Valeria. Non mi chiami per il prezzo.` },
                  { think: `Cinque minuti rari, e li ho usati per saltare Valeria. Lui se n’è accorto prima che finissi la frase.` },
                ],
              }),
            ch('d', 2, `Chiedo a Paolo di sentirlo lui al gate e di portarmi una conferma scritta appena può, così io non lo disturbo e lui resta tranquillo.`,
              `Una scelta ragionevole, ma delegata: la conferma arriva filtrata, e conta meno di una che ti scrive di sua mano. Paolo ti aiuta, ma non puoi chiedergli di fare il tuo mestiere.`,
              { t: 2, c: 4, r: -2 }, {
                next: 'RET',
                say: `Paolo, riesci a sentirlo tu al gate e a portarmi una conferma scritta appena puoi? Non voglio disturbarlo io.`,
                react: [
                  { w: 'paolo', a: `di corsa`, t: `Ci provo. Ma se la chiedo io vale meno che se la chiedi tu.` },
                  { think: `Soluzione ragionevole. Ma delegata: fra tre ore saprò se Paolo ha avuto la sua risposta.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'valeria_silenzio', title: `Valeria non risponde da due ore`, w: 3, after: ['n5'],
        node: {
          when: `Martedì 31 · 14:35`, view: 'phone', bg: 'office', where: `Telefono · Valeria Conti · martedì 14:35`,
          scene: (d) => [
            { n: `Sul telefono l’ultimo messaggio di Valeria risale alle 12:40: “Ci aggiorniamo nel pomeriggio”. Da allora niente. Il suo stato su Teams è passato da verde a grigio.` },
            { n: `Anche il rumore se n’è andato dall’open space: restano il ronzio del computer e un raggio di sole di dicembre che ha attraversato metà della scrivania e adesso se ne va.` },
            { think: `Paolo saprebbe dov’è. Ma non posso telefonargli ogni mezz’ora senza che qualcuno lo noti.`, if: (dd) => dd.flags.insider && !picked(dd, 'wild:paolo_confidenza', 'a') },
            { think: `Paolo forse sa dov’è. Ma finora l’ho cercato solo quando mi serviva un favore, e non so quanto mi dirà.`, if: (dd) => !dd.flags.insider && !picked(dd, 'wild:paolo_confidenza', 'a') },
            { think: `Paolo saprebbe dov’è. Ma ieri sera ho messo in piazza la sua confidenza: se lo chiamo adesso, non so se risponde.`, if: (dd) => picked(dd, 'wild:paolo_confidenza', 'a') },
            { think: `Dal nostro lato il contratto è a posto in ogni riga. Se c’è un buco di due ore, almeno non è colpa nostra.`, if: (dd) => dd.mp.has('P') },
            { think: `E il contratto ha ancora clausole aperte. Due ore di silenzio sono due ore che nessun legale lavora.`, if: (dd) => !dd.mp.has('P') },
          ],
          prompt: `Valeria è sparita da due ore. Cosa fai?`,
          hint: `Un silenzio, a fine trimestre, è informazione. Ma da solo non ti dice se è un problema o un procedimento.`,
          tip: `Quando il buyer sparisce, il tuo lavoro è rendere facile il suo prossimo passo: un riepilogo breve, già pronto da girare a chi firma, vale più di dieci solleciti. Insistere o regalare nuove concessioni parla soltanto della tua ansia.`,
          choices: [
            ch('a', 3, `Le mando un riepilogo di cinque righe con posizioni, scambi e scadenza di stasera, pronto da girare a Rinaldi. Intanto chiedo a Paolo dov’è.`,
              (d) => (d.mp.has('P')
                ? `Con un contratto pronto e un riepilogo che si gira in un clic, il silenzio di Valeria diventa un tempo di attesa utile: quando riemerge, ha tutto in mano e può decidere subito.`
                : `Il riepilogo le semplifica la vita e ti riporta in controllo del tempo, ma il contratto ha ancora clausole aperte: la mossa è corretta, ma il contratto che hai da girare a Valeria non è ancora a posto.`),
              (d) => ({ t: 2, c: d.flags.insider ? 10 : 6, r: d.mp.has('P') ? -8 : -4 }), {
                next: 'RET',
                say: `Mando a Valeria un riepilogo di cinque righe: le nostre posizioni, gli scambi concordati e la scadenza di stasera, pronto da girare al Direttore Generale. E intanto scrivo a Paolo per sapere dov’è.`,
                react: (d) => [
                  { chat: { from: 'valeria', app: 'Teams' }, t: `Ricevuto. Lo sto leggendo con il legale e con il direttore finanziario.` },
                  picked(d, 'wild:paolo_confidenza', 'a')
                    ? { chat: { from: 'paolo', app: 'WhatsApp' }, t: `Dopo ieri sera non ti dico altro. Sono chiusi in sala riunioni, il tuo riepilogo lo stanno leggendo.` }
                    : d.flags.insider
                      ? { chat: { from: 'paolo', app: 'WhatsApp' }, t: `Sono chiusi in sala riunioni da un’ora. Tranquillo, il tuo riepilogo lo stanno leggendo.` }
                      : { n: `Nessun altro messaggio. Ma la conversazione, almeno, adesso è sul tuo foglio.` },
                  { think: `Il silenzio non era un “no”: era una riunione. E adesso il mio riepilogo è sul tavolo.` },
                ],
              }),
            ch('b', 0, `Le scrivo che, pur di sbloccare la situazione, posso rivedere ancora il prezzo prima delle 16, se mi dice che cosa le serve.`,
              `Hai pagato il silenzio con una concessione. Valeria vede un fornitore che cede appena l’orologio si avvicina, e impara che aspettare conviene.`,
              { t: -4, v: -6, c: -6, r: 4, d: 6 }, {
                next: 'RET',
                say: `Valeria, per sbloccare la situazione posso rivedere ancora il prezzo prima delle sedici. Mi dica solo che cosa le serve.`,
                react: [
                  { n: `Il messaggio risulta letto alle 14:41. Nessuna risposta.` },
                  { think: `Ho offerto un altro sconto a una persona che non mi ha neanche risposto.` },
                ],
              }),
            ch('c', 1, `La chiamo ogni quarto d’ora e lascio messaggi sul fisso e sul cellulare, e scrivo anche alla sua segretaria, finché non risponde.`,
              `L’insistenza non ti fa vincere tempo, te ne fa perdere: Valeria non è sparita per un problema di raggiungibilità, e la tua pressione la irrigidisce. Un buyer che si sente inseguito rallenta, non accelera.`,
              { t: -6, c: -4, r: 6 }, {
                next: 'RET',
                say: `Provo a chiamare Valeria ogni quarto d’ora, sul fisso e sul cellulare, e scrivo anche alla sua segretaria finché qualcuno non risponde.`,
                react: [
                  { n: `Alla quarta chiamata lasci un messaggio in segreteria. Alla quinta, la segretaria ti risponde con una gentilezza che ha il sapore del ghiaccio.` },
                  { think: `Se torna online, si ricorderà di me così: quello che chiamava ogni quindici minuti.` },
                ],
              }),
            ch('d', 2, `Aspetto senza forzare e uso il tempo per rifinire allegati e bozza del contratto, così quando riappare è tutto pronto da firmare in un colpo solo.`,
              `Una scelta serena e produttiva: non alimenti il silenzio e prepari il terreno. Ti manca solo un passo in più: dare a Valeria qualcosa di già pronto da usare con Rinaldi.`,
              { c: 2, u: -2, r: -2 }, {
                next: 'RET',
                say: `Aspetto, senza forzare. Intanto rifinisco gli allegati e la bozza del contratto, così quando Valeria riappare è tutto pronto da firmare.`,
                react: [
                  { n: `Alle 15:50 gli allegati sono a posto. Il telefono è ancora fermo, sul bordo della scrivania.` },
                  { think: `Almeno questo tempo non l’ho buttato.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'portale_firma', title: `Il portale di firma digitale va in manutenzione`, w: 3, after: ['n5'],
        node: {
          when: `Martedì 31 · 14:50`, view: 'mail', bg: 'office', where: `Email · IT Terrasole · martedì 14:50`,
          scene: (d) => [
            { n: `Una pagina arancione si apre sopra il portale fornitori di Terrasole: “Manutenzione straordinaria in corso”.` },
            { mail: { from: `IT Terrasole · Servizio di firma digitale`, subj: `Interruzione del servizio` }, t: `Il servizio di firma digitale è temporaneamente sospeso per manutenzione straordinaria. Il ripristino è previsto entro le 18:00. I documenti in attesa di firma resteranno in coda.` },
            { n: `Dal piano di sopra arriva un rumore di sedie spostate: una riunione che finisce in anticipo, gente che ha già la testa alle cene di stasera.` },
            { think: `Il contratto è pronto in ogni riga e so chi firma al posto di Rinaldi. La firma, se serve, può viaggiare anche su un altro canale.`, if: (dd) => dd.mp.has('P') },
            { think: `Non so con certezza chi possa firmare al posto di Rinaldi, né se Terrasole riconosca una firma che non passi dal portale. Scoprirlo adesso è la peggiore delle posizioni.`, if: (dd) => !dd.mp.has('P') },
          ],
          prompt: `Il portale è fermo fino alle 18. Come ti muovi?`,
          hint: `La scadenza è la mezzanotte. Chi dipende da un solo canale, a fine trimestre, ha già perso una parte del tempo.`,
          tip: `L’iter contrattuale non finisce con la bozza finale: comprende i canali di firma, i procuratori e un piano B scritto prima del bisogno. Un canale di riserva concordato per iscritto vale più di una promessa di ripristino.`,
          choices: [
            ch('a', 3, `Chiedo a Valeria e al legale di Terrasole di concordare adesso un canale di riserva: firma digitale qualificata e invio via PEC, approvato per iscritto.`,
              (d) => (d.mp.has('P')
                ? `Con l’iter contrattuale già impostato, il canale di riserva è una formalità da mettere per iscritto: sai chi firma, con quale procura, e il documento è pronto. La manutenzione diventa una nota a margine.`
                : `Il canale di riserva è la mossa giusta, ma arriva tardi: devi scoprire adesso chi può firmare e con quale procura. Stai costruendo il piano B con il cronometro acceso.`),
              (d) => ({ t: 4, c: d.mp.has('P') ? 10 : 6, r: d.mp.has('P') ? -8 : -4 }), {
                set: { procuraNota: true }, next: 'RET',
                say: `Valeria, il portale è fermo fino alle diciotto, quindi concordiamo adesso un canale di riserva, per iscritto: il contratto firmato da Rinaldi, o dal procuratore, con firma digitale qualificata e invio via PEC. Se il portale riapre in tempo, bene; se no, abbiamo già un’altra strada.`,
                react: [
                  { w: 'valeria', a: `dopo una pausa breve`, t: `Ragionevole. Lo chiedo al nostro legale: la risposta entro un’ora.` },
                  { chat: { from: 'bruni', app: 'Teams' }, t: `Lato nostro va benissimo: certificato qualificato e PEC bastano. Aspetto solo il loro via libera scritto.` },
                  { think: `Un piano B concordato prima del bisogno. È l’unico che non dipende dal portale.` },
                ],
              }),
            ch('b', 2, `Chiamo l’IT di Terrasole e chiedo un aggiornamento ogni mezz’ora sull’orario reale di ripristino, e intanto tengo tutto pronto per l’invio.`,
              `Una mossa ordinata: ti informi, sei pronto e non perdi la testa. Ma dipende ancora da un solo canale, e “entro le sei” non è un impegno.`,
              { c: 2, u: -2, r: -2 }, {
                next: 'RET',
                say: `Chiamo l’IT di Terrasole: voglio sapere quando riapre davvero il servizio e li prego di avvisarmi ogni mezz’ora. Nel frattempo tengo tutto pronto per l’invio.`,
                react: [
                  { n: `Al telefono, un tecnico stanco e gentile: “Entro le diciotto. Forse.”` },
                  { think: `“Forse”. Per un contratto da seicentoventimila euro è una parola molto grande.` },
                ],
              }),
            ch('c', 1, `Aspetto che il portale riapra: il ripristino è previsto entro le 18, e fino alla mezzanotte il margine è ampio, non vedo il bisogno di muovermi.`,
              `Hai deciso di non decidere: il margine c’è, ma dipende da un solo canale e da una promessa di ripristino. Se salta, a mezzanotte non hai altra strada.`,
              { c: -2, u: -2, r: 6 }, {
                next: 'RET',
                say: `Aspetto che il portale riapra: il ripristino è previsto entro le diciotto, e la scadenza è la mezzanotte. Non mi muovo.`,
                react: [
                  { n: `Passano quasi due ore. Alle 16:45 il banner arancione è ancora lì.` },
                  { think: `Un banner arancione e un “forse”: su questo ho appoggiato un contratto da seicentoventimila euro.` },
                ],
              }),
            ch('d', 0, `Scrivo a Marta che il contratto è di fatto firmato: Rinaldi ha dato il suo sì e la firma digitale è soltanto una formalità, la facciamo entro stasera.`,
              `Hai dichiarato “di fatto firmato” un contratto che non lo è, per proteggere il forecast. Una formalità, a fine giornata, è ciò che decide se hai chiuso il trimestre o no.`,
              { c: -4, r: 8 }, {
                integ: -4, next: 'RET',
                say: `Marta, il contratto è di fatto firmato. Rinaldi ha dato il suo sì e la firma digitale è solo una formalità: la facciamo entro stasera.`,
                react: [
                  chatM(`“Di fatto firmato”. Va bene, lo metto nel numero. Ma alle 19 il CRO mi chiederà la notifica di firma, non una formula: tienila pronta.`),
                  { think: `L’ho scritto. Adesso devo anche renderlo vero, e alle sette mancano meno di cinque ore.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'firma_al_due', title: `Rinaldi sposta la firma al 2 gennaio`, kind: 'neg', w: 2,
        hit: (d) => !(d.mp.has('P') && (d.mp.has('Dp') || d.flags.procuraNota)),
        dp: -0.32, dpProt: -0.03,
        hitText: `Alle 18:05 arriva una mail di due righe dalla segreteria di Rinaldi: “Il Direttore Generale preferisce firmare il 2 gennaio, a ufficio aperto e con calma”. Nessuno ha mai chiarito chi potrebbe firmare al suo posto, e non c’è un piano B per la firma. A mezzanotte il trimestre chiude con il contratto di Terrasole in un cassetto.`,
        protText: `Alle 18:05 la segreteria di Rinaldi scrive che il Direttore Generale preferirebbe firmare il 2 gennaio. Ma sai già chi può firmare al suo posto, e il contratto è pronto. Valeria gira la mail al direttore finanziario con una riga sola: “Firmi lei”. Costa un’ora e un po’ di tensione, non il trimestre.`,
      },
      {
        id: 'ordini_bloccati', title: `Il sistema ordini del cliente si blocca`, kind: 'neg', w: 1,
        hit: (d) => !(d.mp.has('P') && d.mp.has('E') && d.m.control >= 50),
        dp: -0.28, dpProt: -0.03,
        hitText: `Alle 18:10 il gestionale di Terrasole si pianta nell’aggiornamento di fine anno: nessun ordine può essere emesso, né registrato, fino a nuovo avviso. Per firmare serve l’ordine d’acquisto, e nessuno ha mai chiesto a chi spetti emetterlo a mano. Il trimestre non aspetta l’informatica di nessuno.`,
        protText: `Alle 18:10 il gestionale di Terrasole si pianta nell’aggiornamento di fine anno. Per te non è una sorpresa: hai già con Valeria e con Rinaldi un’idea chiara di chi emette l’ordine, e il contratto è pronto. Perdi un’ora di telefonate, non la chiusura.`,
      },
      {
        id: 'gara_comunque', title: `Gli Acquisti rimettono comunque a gara`, kind: 'neg', w: 2,
        hit: (d) => !(d.flags.giveGet && d.m.value >= 55 && d.m.trust >= 55),
        dp: -0.30, dpProt: -0.04,
        hitText: `Alle 18:20 Valeria ti scrive tre righe formali: la direzione ha deciso di “non procedere con la finalizzazione” e di avviare la rimessa a gara nel primo trimestre. Dai toni capisci che non era una decisione di oggi: l’hanno tenuta in tasca fino all’ultimo, come leva da usare finché serviva. Ti restano il fascicolo e un invito a partecipare.`,
        protText: `Alle 18:20 Valeria ti avvisa che gli Acquisti hanno comunque aperto la procedura di rimessa a gara, “per dovere di cautela”. Ma sul tavolo ci sono ancora i tuoi scambi e il valore del progetto è chiaro a tutti: ricominciare con un altro fornitore costerebbe a Terrasole più che firmare con te. Un’ora dopo la procedura è sospesa, con una riga di scuse: “Andava fatta per prassi”.`,
      },
      {
        id: 'rinaldi_firma', title: `Rinaldi firma subito`, kind: 'pos', w: 1,
        if: (d) => d.mp.has('E'),
        hit: (d) => d.mp.has('P') && d.m.value >= 55 && d.m.trust >= 55,
        dp: 0.12, dpProt: 0,
        hitText: `Alle 18:12 ti arriva una notifica di firma: “Documento firmato · Marco Rinaldi”. Senza un’altra riunione, senza una telefonata: aveva sentito parlare bene di Nexora da Paolo e da Valeria, ha chiesto se il contratto era a posto, e ha firmato. Era pronto, ed è per questo che ha potuto farlo.`,
        protText: `Alle 18:12 Rinaldi fa sapere a Valeria che firmerebbe subito, se il contratto fosse pronto. Ma il fascicolo non è del tutto pronto per lui: mancano due allegati e una pagina che gli dica cosa cambia nel primo semestre, e Rinaldi preferisce rileggere i numeri con Valeria prima di firmare. La finestra resta aperta per venti minuti, poi la riunione di Rinaldi ricomincia e il momento non torna.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Commit al 90%: “la valutazione tecnica è favorevole e Paolo è con noi”`,
      people: { E: `Marco Rinaldi (Direttore Generale)`, C: `Paolo Greco`, Dp: `Paolo Greco e Valeria Conti`, P: `Valeria Conti (Acquisti) e il legale di Terrasole`, M: `Marco Rinaldi e Paolo Greco`, I: `Paolo Greco (Supply Chain)`, Dc: `Valeria Conti (Acquisti) e Paolo Greco`, Co: `Vertex Systems e la rimessa a gara` },
      risk: `Il rischio vero è che gli Acquisti usino la rimessa a gara fino all’ultimo minuto, oppure che la firma di Rinaldi non arrivi entro la mezzanotte del 31.`,
      custom: [
        {
          id: 'desk_scritto', if: (d) => d.disc > 12, has: (d) => !!d.flags.deskApproved,
          q: `Hai promesso oltre il dodici per cento, che è la soglia che puoi dare da solo. Lo sconto è approvato dal Deal Desk per iscritto, o è un “ci siamo sentiti”?`,
          evidence: `Sì: Giulia, del Deal Desk, ha approvato per iscritto lo schema a pacchetti, sconto e contropartite insieme. La mail è nel fascicolo, te la inoltro.`,
          honest: `A voce: con Giulia ne abbiamo parlato, ma l’approvazione scritta non ce l’ho ancora. Fino a quando non arriva, tengo il numero in Best Case.`,
          bluff: `Approvato, sì. Giulia mi ha dato l’ok e la mail è nel mio archivio: se vuoi la ritrovo e te la giro subito dopo la call.`,
          vague: `Il Deal Desk è informato e non ha sollevato problemi. Di solito sono rapidi.`,
          react: {
            evidence: `Perfetto, è esattamente ciò che chiedo. Schema, contropartite e approvazione nello stesso documento: per me resta in {claim}.`,
            honest: `Grazie per la chiarezza. Chiamo io Giulia e le chiedo di darti la risposta in giornata: finché non arriva ti tengo in {claim}.`,
            bluffCaught: `Ho sentito Giulia mezz’ora fa: nessuna approvazione scritta, solo una chiacchierata. Non ti voglio mettere in difficoltà, ma da qui in poi mi servono i documenti, non i ricordi.`,
            bluffPassed: `Va bene, ti credo. Ma la mail la voglio entro domattina: se non arriva, il numero lo rivedo io.`,
            vague: `“Non ha sollevato problemi” non è un’approvazione. Il sì del Deal Desk si legge nella firma di Giulia, in fondo a una mail: per ora ti sposto in {claim}.`,
          },
        },
        {
          id: 'rinaldi_scritto', if: () => true, has: (d) => !!d.flags.rinaldiScritto,
          q: `Rinaldi ti ha dato il sì per iscritto, o è un “ci siamo” detto in una call?`,
          evidence: `Per iscritto: due righe su WhatsApp, prima che si imbarcasse, con il suo sì. Te lo giro in screenshot, con data e ora.`,
          honest: `A voce, in una call da dieci minuti: non ho niente di scritto. Finché non lo ottengo, per me resta Best Case.`,
          bluff: `Per iscritto, sì. Mi ha scritto prima del volo che approva: ho il messaggio sul telefono, ti giro lo screenshot subito dopo la call.`,
          vague: `Rinaldi è con noi, me l’ha detto lui e Paolo me lo conferma. Non è uno che torna indietro.`,
          react: {
            evidence: `Ottimo. Uno screenshot con data e ora vale più di dieci “siamo vicini”. Lo allego al forecast: per me resta in {claim}.`,
            honest: `Grazie per la franchezza. Un sì a voce, a questo livello, vale un sì condizionato. Chiamo io la sua segreteria e chiedo che mettano due righe per iscritto, a nome mio e tuo.`,
            bluffCaught: `Nel CRM l’ultima nota su Rinaldi è “call di dieci minuti”. Nessun messaggio, nessuna mail in copia. Non mi serve che sia perfetto: mi serve che sia vero.`,
            bluffPassed: `Ok, per ora resta in {claim}. Ma lo screenshot lo voglio prima della call con il CRO. Senza, lo ritiro io.`,
            vague: `“Non è uno che torna indietro” descrive il carattere, non prova nulla per iscritto. Mi serve una mail con la sua firma sotto: per ora ti sposto in {claim}.`,
          },
        },
        {
          id: 'procura_firma', if: () => true, has: (d) => !!d.flags.procuraNota || (d.mp.has('P') && d.mp.has('Dp')),
          q: `Chi firma, esattamente, e con quale procura? Se il giorno della firma Rinaldi non risponde al telefono, il contratto resta fermo o c’è un’altra firma valida?`,
          evidence: `Firma Rinaldi. Se non risponde, firma il direttore finanziario con procura: il nome e il canale di firma li ho, e la bozza del contratto è pronta.`,
          honest: `Firma Rinaldi. Una seconda firma valida non l’ho verificata: ho dato per scontato che ci sia una procura, ma non ho il documento. La chiedo oggi a Valeria.`,
          bluff: `Firma Rinaldi e, in sua assenza, il direttore finanziario con procura speciale. Il documento ce l’ha il legale di Terrasole, me lo ha confermato Valeria.`,
          vague: `Il contratto lo firma chi deve firmarlo da loro: il Direttore Generale o chi per lui. Sono aspetti che si sistemano all’ultimo.`,
          react: {
            evidence: `Questo è un forecast. Un nome, una procura, e chi l’ha vista. Se Rinaldi quel giorno è in volo, so già che non è un problema: resta in {claim}.`,
            honest: `Meglio saperlo ora che alle sette di sera del 31. Oggi stesso chiedi a Valeria il nome del procuratore e una copia della procura; finché non l’hai, la categoria è {claim}.`,
            bluffCaught: `Nel fascicolo di Terrasole non c’è nessuna procura. Ti ho chiesto una cosa verificabile, e la risposta non lo era.`,
            bluffPassed: `Va bene. Ma entro domani mi serve la copia della procura nel CRM: se manca, quel deal nel forecast lo ritrovo come “rischio firma”.`,
            vague: `“Si sistemano all’ultimo” è la frase che precede i post-mortem. Voglio un nome e un documento: per ora ti sposto in {claim}.`,
          },
        },
      ],
    },

    endings: {
      won: `Il 31, prima delle sette di sera, arriva la firma digitale di Rinaldi. Valeria ti scrive: “È stata dura ma corretta”. Alla call delle 19 Marta dice al CRO una sola frase: “Terrasole è chiuso”.`,
      lost: `Il 31 sera Valeria comunica la rimessa a gara. Il concorrente più aggressivo riceverà l’invito appena riapre l’anno, e a te il CRM chiede soltanto di cambiare una categoria, con l’open space già spento.`,
      slip: `L’accordo c’è, ma non entro il 31: alle 19 Marta deve spiegare al CRO dove sono finiti i seicentoventimila. La firma arriva il 9 gennaio. Ottimo contratto, trimestre sbagliato.`,
    },
    lessons: [
      { if: (d) => d.flags.giveGet, good: true, t: `Hai agganciato le concessioni a un impegno: durata, tempi, referenza. Questo è il cuore della negoziazione, e protegge il margine.` },
      { if: (d) => d.disc >= 20, good: false, t: `Hai superato il 20% di sconto. Chiudere è facile quando si regala: il vero lavoro è chiudere dove il margine regge.` },
      { if: (d) => d.flags.termsBleed, good: false, t: `Pagamento, penali e recesso valgono denaro anche se non compaiono nello sconto. Cederli in blocco ha reso il contratto inapprovabile.` },
      { if: (d) => d.flags.forecastHonest, good: true, t: `Un forecast onesto ti ha dato copertura e credibilità. Il management ricorda chi lo informa bene.` },
      { if: (d) => d.flags.forecastInflated, good: false, t: `Hai gonfiato il forecast. Se salta, a pagare sarà la tua reputazione per i prossimi tre trimestri.` },
      { if: (d) => d.flags.insider, good: true, t: `Hai chiamato il champion prima di rispondere: ti ha detto cosa era vero e cosa era tattica. Il champion è la tua fonte migliore.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
