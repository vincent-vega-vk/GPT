/* Scenario 7 · Logistica Adriatica · deal zombie, qualificazione, compelling event, right-sizing
   v2: porto e scetticismo. Il CRM dice novanta, il porto dice nebbia: entusiasmo del contatto contro fatti che nessuno ha verificato. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    mirko: { name: `Mirko Tesei`, role: `IT Manager · contatto`, hue: 40 },
    aldo: { name: `Aldo Fabbri`, role: `Amministratore Delegato`, hue: 150 },
    marta: { name: `Marta Colombo`, role: `La tua Sales Director`, hue: 348 },
    paolo: { name: `Paolo Gatti`, role: `Ex responsabile operativo · TrasportiNord`, hue: 205 },
    lorenzo: { name: `Lorenzo Fabbri`, role: `Fratello dell’AD · socio`, hue: 95 },
    franco: { name: `Franco Ricci`, role: `Autista · rappresentante sindacale`, hue: 14 },
    rosa: { name: `Rosa Bellini`, role: `Responsabile traffico`, hue: 300 },
    /* il “contatto” degli imprevisti generici è Mirko */
    cliente: { name: `Mirko Tesei`, role: `IT Manager · contatto`, hue: 40 },
  };
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });
  /* il nodo è già stato giocato? / l’imprevisto è già stato affrontato? */
  const seen = (d, node) => d.hist.some((h) => h.node === node);
  const wildOf = (d, id) => d.hist.find((h) => h.node === 'wild:' + id) || null;
  /* i widget funzionano anche con un deal vuoto o incompleto (flags, mp, hist, m assenti) */
  const W = (fn) => (d) => {
    const x = Object.assign({}, d || {});
    x.flags = x.flags || {}; x.hist = Array.isArray(x.hist) ? x.hist : []; x.m = x.m || {}; x.disc = x.disc || 0;
    x.mp = x.mp instanceof Set ? x.mp : new Set(x.mp ? Array.from(x.mp) : []);
    return fn(x);
  };

  CL.registerScenario({
    id: 'logistica',
    title: `Il Deal Zombie`,
    client: `Logistica Adriatica S.r.l.`,
    sector: `Trasporti · Rimini`,
    hook: `Il deal più grosso della tua pipeline: 14 mesi, 9 demo, zero contratti.`,
    brief: `Piattaforma di tracking e ottimizzazione consegne: €900k di ACV a listino. Nel CRM è Commit al 90% da mesi. Il tuo contatto, Mirko, è entusiasta e ripete che “il budget lo troviamo”. Ma non hai mai incontrato chi firma, e nessuno ti ha detto perché dovrebbero decidere adesso.`,
    scout: `14 mesi di trattativa, 9 demo, nessun budget approvato e nessun accesso all’AD. Mirko è simpatico e sincero, ma non decide nulla. Il vero concorrente è il “non fare niente”.`,
    teaches: [`Qualificazione`, `Compelling event`, `Accesso al decisore`, `Right-sizing`, `Quando andarsene`],
    list: 900, cost: 3, window: [1, 12], stars: 4, lep: 15, slip: 0.45, dqRefund: 2,
    crm: { cat: `Commit`, prob: 90 },
    cast: CAST,

    /* ───── identità: il porto, lo scetticismo ───── */
    theme: {
      id: 'port', label: `Logistica Adriatica · Rimini`, bg: 'port',
      accent: '#0e5a8a', accentDark: '#8ec9f2', ambience: 'port',
      motto: `Il CRM dice novanta, il porto dice nebbia.`,
    },
    intro: {
      when: `Giovedì · 07:50`, where: `In auto · SS16 Adriatica`, view: 'car',
      scene: [
        { n: `Giovedì, le otto meno dieci. La SS16 corre dritta lungo la costa e la nebbia ha cancellato l’Adriatico: a destra dovrebbe esserci il mare, a sinistra i capannoni, e tu vedi solo i fanali dei camion davanti, uno ogni cento metri.` },
        { n: `Dove la foschia si strappa, per un attimo, spuntano le gru del porto. Ferme, altissime, senza nessuno sotto.` },
        { n: `Il vivavoce si accende da solo. Sul cruscotto: Mirko Tesei.`, sfx: 'phone' },
        { w: 'mirko', a: `allegro, in vivavoce`, t: `Buongiorno! Ti rubo un minuto: ieri sera ne abbiamo riparlato tra noi e sono tutti contenti, davvero. Sicuro che ci siamo. Il budget lo troviamo, tranquillo.` },
        { think: `Quattordici mesi che “ci siamo”. Nove demo. E io, a ogni telefonata, che confermo il novanta per cento.` },
        { n: `Chiudi la chiamata. Alle dieci Marta apre la pipeline review, e la riga di Logistica Adriatica è la prima che guarderà: €900k, Commit, 90%. Oltre il parabrezza, il mondo finisce a trenta metri.` },
      ],
    },

    /* ───── widget firma: il CRM contro la realtà, i quattordici mesi, la mappa del potere ───── */
    hud: [
      {
        type: 'scorecard', title: `Il CRM contro la realtà`,
        build: W((d) => {
          const ev = !!d.flags.event, eb = !!d.flags.ebEngaged, rs = !!d.flags.rightsized, mpl = !!d.flags.mutualPlan, tn = !!d.flags.tnData;
          const has = (k) => d.mp.has(k);
          const budget = rs && mpl ? { real: `Fase 1 da €340k: Aldo può approvarla, le date vanno al finanziario`, st: 'good' }
            : rs ? { real: `Fase 1 da €340k “approvabile”, ma senza date`, st: 'warn' }
              : seen(d, 'n5') ? { real: `Aldo non ha €900k e non li spende in un colpo`, st: 'bad' }
                : { real: `Mai visto: “a fine anno lo troviamo”`, st: 'bad' };
          const dec = eb ? (has('M') ? { real: `Venti minuti con Aldo, e un caso con i numeri da portare`, st: 'good' } : { real: `Venti minuti con Aldo, nessun impegno`, st: 'warn' })
            : { real: `Mai incontrato Aldo: Mirko non firma nulla`, st: 'bad' };
          const mot = ev ? (has('M') ? { real: `TrasportiNord, −10% di fatturato: Aldo ne ha fatto il conto`, st: 'good' }
            : tn ? { real: `TrasportiNord perso: hai i numeri di chi c’era`, st: 'good' }
              : eb ? { real: `TrasportiNord perso a settembre: con Aldo non l’hai usato`, st: 'warn' }
                : { real: `TrasportiNord perso a settembre: lo sai tu, nessuno l’ha collegato al progetto`, st: 'warn' })
            : { real: `Nessuno: “prima o poi”, “a fine anno”`, st: 'bad' };
          const tmp = mpl ? { real: `Piano datato: 10 finanziario, 15 legale, 28 firma`, st: 'good' }
            : has('P') ? { real: `Firma al 28 chiesta da te, non concordata`, st: 'warn' }
              : seen(d, 'n6') ? { real: `“Non prima di due settimane”, nessuna data`, st: 'bad' }
                : rs ? { real: `Firma possibile, nessuna data concordata`, st: 'warn' }
                  : { real: `Nessuna data: “a fine anno, probabilmente”`, st: 'bad' };
          const alt = has('Co') ? (has('M') || tn ? { real: `Non fare niente costa: l’hai quantificato`, st: 'good' }
            : d.flags.fogSeen ? { real: `Il “non fare niente” ha un costo: l’hai visto in piazzale, senza cifra`, st: 'warn' }
              : { real: `Il “non fare niente” ha un costo, ma senza cifra`, st: 'warn' })
            : { real: `Il “non fare niente”: finora vince`, st: 'bad' };
          return [
            Object.assign({ k: 'budget', label: `Budget approvato`, crm: `Sì, a fine anno` }, budget),
            Object.assign({ k: 'eb', label: `Decisore incontrato`, crm: `Sì, Mirko` }, dec),
            Object.assign({ k: 'event', label: `Motivo per decidere`, crm: `Sì, strategico` }, mot),
            Object.assign({ k: 'time', label: `Tempi di firma`, crm: `Entro il trimestre` }, tmp),
            Object.assign({ k: 'alt', label: `Alternativa`, crm: `Nessuna` }, alt),
          ];
        }),
      },
      {
        type: 'timeline', title: `Quattordici mesi, una firma`,
        build: W((d) => {
          const steps = [!!d.flags.event, !!d.flags.ebEngaged, !!d.flags.rightsized, !!d.flags.mutualPlan];
          const cur = steps.indexOf(false);
          const at = (i) => (steps[i] ? 'done' : cur === i ? 'now' : 'todo');
          const items = [
            { k: 't0', t: `14 mesi`, label: `Nove demo, nessun contratto`, st: 'late' },
            { k: 't1', t: `Perché ora`, label: steps[0] ? `TrasportiNord come motivo per decidere` : `Un motivo per decidere adesso`, st: at(0) },
            { k: 't2', t: `Decisore`, label: steps[1] ? `Venti minuti con Aldo` : `Un incontro con chi firma`, st: at(1) },
            { k: 't3', t: `Perimetro`, label: steps[2] ? `Fase 1 firmabile, da €340k` : `Un perimetro che il budget regge`, st: !steps[2] && seen(d, 'n5') ? 'late' : at(2) },
          ];
          if (steps[3]) {
            items.push(
              { k: 't4', t: `Il 10`, label: `Il direttore finanziario valida`, st: 'now' },
              { k: 't5', t: `Il 15`, label: `Revisione legale`, st: 'todo' },
              { k: 't6', t: `Il 28`, label: `Firma`, st: 'todo' }
            );
          } else {
            items.push({ k: 't4', t: `Le date`, label: `Validazione, legale, firma: nessuna concordata`, st: seen(d, 'n6') ? 'late' : cur === 3 ? 'now' : 'todo' });
          }
          return { items };
        }),
      },
      {
        type: 'stakeholders', title: `Chi pesa davvero`,
        build: W((d) => {
          const f = d.flags, has = (k) => d.mp.has(k);
          /* Aldo ha sentito l’offerta del 30%: l’hai fatta tu, davanti a lui */
          const aldoDisc = d.hist.some((h) => h.node === 'n4' && h.id === 'd');
          /* come ha preso Aldo l’ultima richiesta di date (n6): la scadenza imposta lo irrigidisce */
          const n6 = d.hist.find((h) => h.node === 'n6');
          const n6id = n6 ? n6.id : '';
          const rows = [
            P('mirko', has('C') ? 'champion' : 'ally',
              has('C') ? (d.flags.mutualPlan ? `È il referente del piano: tiene tutti sulle date.` : `Ha collegato TrasportiNord al progetto: adesso vende per te.`) : `Entusiasta con tutti, ma non decide nulla.`),
            P('aldo',
              !d.flags.ebEngaged ? 'unknown'
                : aldoDisc ? 'skeptic'
                  : d.flags.rightsized ? (n6id === 'd' ? 'neutral' : 'ally')
                    : seen(d, 'n5') ? 'skeptic'
                      : 'neutral',
              !d.flags.ebEngaged ? (d.flags.event ? `Furioso per TrasportiNord. Con te non ha mai parlato.` : seen(d, 'n2') ? `Mai incontrato: “ha altre priorità”.` : `Chi firma, sulla carta. Non lo hai mai incontrato.`)
                : aldoDisc ? `Ha capito che il prezzo non è il punto, e che hai fretta.`
                  : d.flags.rightsized ? (d.flags.mutualPlan ? `Dice che la Fase 1 può approvarla, e ha girato le date al finanziario.`
                    : n6id === 'd' ? `La Fase 1 resta approvabile, ma ha sentito una minaccia: “Mi sta minacciando?”.`
                      : n6id === 'c' ? `Non firma impegni scritti al buio: prima la validazione del finanziario.`
                        : `“Questo posso approvarlo”. Ma non ha ancora date.`)
                    : seen(d, 'n5') ? `Il perimetro non gli torna: nessuna firma in vista.`
                      : has('M') ? `Ha fatto il conto di TrasportiNord: vuole un caso con i numeri.` : `Indifferente: “ho già troppi progetti”.`),
            P('marta',
              d.flags.mutualPlan && !f.inflated ? 'ally' : f.inflated && !d.flags.mutualPlan ? 'skeptic' : 'neutral',
              d.flags.mutualPlan ? (f.inflated ? `Il tuo Commit aveva anticipato i fatti. Ora arrivano date e nomi.` : `Vede date e nomi: può difendere il numero col CRO.`)
                : f.inflated ? `Ha il tuo Commit da €900k davanti al CRO, sulla tua parola.` : `Vuole sapere cosa sai davvero, non cosa speri.`),
          ];
          if (wildOf(d, 'fratello')) {
            rows.push(P('lorenzo', d.flags.fratelloOk ? 'neutral' : d.flags.fratelloKo ? 'skeptic' : 'unknown',
              d.flags.fratelloOk ? `Vuole i numeri, non le slide. Ti ascolta.` : d.flags.fratelloKo ? `Ti vede come un venditore con fretta.` : `Socio al 30%. Non lo avevi mappato.`));
          }
          const strike = wildOf(d, 'sciopero');
          if (strike) {
            rows.push(P('franco', strike.id === 'a' ? 'ally' : strike.id === 'c' ? 'neutral' : 'skeptic',
              strike.id === 'a' ? `Nessuno gli aveva mai chiesto cosa teme. Ti ha stretto la mano.`
                : strike.id === 'c' ? `Ha detto che la domanda sul controllo non sparisce da sola.`
                  : strike.id === 'b' ? `Non ti crede: i dati li decide Aldo, non tu.`
                    : `Senza risposta alla sua domanda: ti ha visto usare lo sciopero per vendere.`));
          }
          return rows;
        }),
      },
    ],

    start: { t: 45, v: 25, u: 15, c: 12, r: 60, have: [] },
    caps: [
      { id: 'event', max: 0.12, if: (d) => !d.flags.event, why: `Senza un motivo per decidere adesso, l’entusiasmo del tuo contatto non porta da nessuna parte: è un deal zombie.` },
      { id: 'eb', max: 0.20, if: (d) => !d.flags.ebEngaged, why: `Non hai mai parlato con chi firma. Un contatto entusiasta non sostituisce l’AD.` },
      { id: 'size', max: 0.40, if: (d) => !d.flags.rightsized, why: `Il perimetro da €900k non è firmabile con il budget reale: serve una prima fase ridimensionata.` },
    ],
    nodes: {
      n1: {
        when: `Giovedì · 10:00`, view: 'meeting', bg: 'office',
        where: `Pipeline review · sala riunioni Nexora · giovedì 10:00`,
        scene: [
          { n: `Sala riunioni, terzo piano. Marta ha proiettato il CRM sul muro e la riga più grossa del trimestre è evidenziata di giallo. Dalla vetrata si vede il parcheggio e basta: la nebbia ha mangiato il resto.` },
          { w: 'marta', a: `scorrendo il CRM`, t: `Logistica Adriatica è il più grosso del trimestre: €900k in Commit. Perché non lo abbiamo ancora chiuso? Dimmi cosa serve.` },
          { n: `Sotto la tua riga, i numeri che conosci a memoria: quattordici mesi di trattativa, nove demo, nessun contratto. Nel campo note, la frase di Mirko: “Sicuro che ci siamo, il budget lo troviamo”.` },
          { think: `L’ho scritta io, quella nota. Più volte, con date diverse.` },
          { w: 'marta', a: `si volta verso di te`, t: `Il novanta per cento mi piace. Voglio solo sapere da dove arriva.` },
          { think: `Arriva da Mirko. Che è simpatico, e non firma niente.` },
        ],
        prompt: `Come rispondi a Marta?`,
        hint: `Un deal grande non è un deal sano. Cosa sai davvero, oggi?`,
        tip: `La dimensione di un deal non lo qualifica. Quattordici mesi, nove demo e nessun accesso al decisore sono segnali di deal zombie. La domanda giusta è: ci sono budget, decisore e un motivo per decidere adesso?`,
        choices: [
          ch('a', 0, `Lo teniamo in Commit. Mirko è sicuro e, dopo quattordici mesi, siamo a un passo: sono questioni di settimane, non di mesi. L’ho sentito stamattina.`,
            `Hai trasformato l’entusiasmo di Mirko in una cifra da €900k scritta a tuo nome. Se le cose non cambiano, a fine trimestre dovrai spiegare perché un Commit così è sparito.`,
            { r: 6 }, {
              integ: -4, set: { inflated: true }, next: 'n2',
              say: `Io lo terrei in Commit, Marta. Mirko è sicuro e, dopo quattordici mesi, siamo a un passo: sono questioni di settimane.`,
              react: [
                { w: 'marta', a: `dopo una pausa`, t: `Settimane. D’accordo, lo lascio dov’è. Lo porto così al CRO, con il tuo nome accanto.` },
                { think: `Ho appena messo la firma su un novanta per cento che so spiegare con una frase sola. Di Mirko.` },
              ],
            }),
          ch('b', 3, `Non lo so ancora. Questa settimana faccio con Mirko una qualifica seria: budget, decisore, motivo per decidere. Poi ti dico in che categoria sta.`,
            `Hai spostato la conversazione da una speranza a una verifica, e Marta lo riconosce: dire “non lo so ancora” con un piano per scoprirlo vale più di un Commit difeso a oltranza.`,
            { t: 2, c: 8, r: -6 }, {
              integ: 2, next: 'n2',
              say: `Onestamente non lo so ancora, e preferisco dirtelo. Questa settimana faccio con Mirko una chiamata di qualificazione vera: budget, chi decide, perché adesso, che alternative hanno. Poi ti dico se è Commit, Best Case o da chiudere.`,
              react: [
                { w: 'marta', a: `abbassa la penna`, t: `È il modo giusto di guardarlo. Vienimi a dire cosa trovi, anche se non ti piace.` },
                { think: `Ho cambiato una speranza con una verifica. Adesso la verifica va fatta.` },
              ],
            }),
          ch('c', 1, `Gli do una spinta sul prezzo: 25% di sconto se firma entro fine mese. Su un deal fermo da quattordici mesi, un incentivo così lo smuove.`,
            `Hai speso lo sconto prima di capire cosa blocca il deal: non è fermo per il prezzo, è fermo perché nessuno ha approvato un budget. Per ora hai solo insegnato a Mirko che il tuo prezzo si muove.`,
            { v: -4, c: -4, r: 4, d: 25 }, {
              next: 'n2',
              say: `Posso spingerlo con il prezzo, Marta: gli offro il venticinque per cento se firma entro fine mese. Su un deal fermo da quattordici mesi, un incentivo così lo smuove.`,
              react: [
                { w: 'marta', a: `inarca un sopracciglio`, t: `Venticinque per cento. A un cliente che finora non ha mai detto che il problema è il prezzo.` },
                { n: `Nel pomeriggio Mirko ti ringrazia con un vocale di un minuto: lo sconto è bellissimo, ma senza un budget approvato non saprebbe a chi girarlo.` },
              ],
            }),
          ch('d', 2, `Lo porto in Best Case e chiedo a Mirko di farmi incontrare il suo capo. Se l’AD si fa vedere, ne riparliamo con più elementi.`,
            `Una mossa equilibrata: dichiari prudenza e cerchi l’accesso al decisore. Ma non hai ancora una qualifica solida.`,
            { c: 4, r: -2 }, {
              next: 'n2',
              say: `Lo porto in Best Case, Marta, e chiedo a Mirko di farmi incontrare il suo capo. Se l’AD si fa vedere, ne riparliamo con più elementi.`,
              react: [
                { w: 'marta', a: `segna sul CRM`, t: `Best Case. Almeno una categoria onesta. Ma l’AD non l’hai mai visto, e tutto dipende dalla porta che ti apre Mirko.` },
                { think: `Cerco la porta giusta. Non so ancora cosa dirò quando si aprirà.` },
              ],
            }),
          ch('dq', 1, `Lo chiudo. Quattordici mesi senza budget non sono una trattativa, sono un’abitudine: il tempo che libero lo metto sui deal sani.`,
            `Squalificare è una mossa legittima, ma qui arriva prima della verifica: l’istinto è buono, l’ordine delle cose no. Non saprai mai cosa c’era sotto.`,
            { }, {
              next: 'DQ',
              say: `Io lo chiuderei, Marta. Quattordici mesi senza budget non sono una trattativa, sono un’abitudine: tolgo la riga e metto le ore sui deal che hanno una firma in vista.`,
              react: [
                { w: 'marta', a: `dopo una pausa`, t: `Magari hai ragione. Ma l’hai verificato, o lo senti e basta?` },
                { think: `Lo sento. Non l’ho verificato. Marta vede la differenza da qui.` },
              ],
            }),
        ],
      },

      n2: {
        when: `Venerdì · 11:00`, view: 'call',
        where: `Call · Teams · Mirko · venerdì 11:00`,
        scene: (d) => {
          const festa = !!wildOf(d, 'mirko_festa');
          return [
            { n: `Venerdì, le undici. Mirko ti sorride dallo schermo con la faccia delle buone notizie. Alle sue spalle, una parete di cartine stradali e un vecchio monitor con la mappa dei camion: metà dei puntini non si muove dalle otto.` },
            festa
              ? { w: 'mirko', a: `entusiasta`, t: `Siamo a posto, davvero: te l’ho detto ieri sera, la voce di budget c’è. Che accanto ci sia scritto “da valutare” è una formalità, a fine anno la sistemiamo di sicuro. Aldo, il capo, ha altre priorità, ma quando vede la demo finale firma. Noi vogliamo andare avanti.` }
              : { w: 'mirko', a: `entusiasta`, t: `Siamo a posto, davvero: abbiamo apprezzato tutto, anche l’ultima demo, tutti contenti. Il budget? Eh, a fine anno lo troviamo di sicuro. Aldo, il capo, ha altre priorità, ma quando vede la demo finale firma. Noi vogliamo andare avanti.` },
            { n: `Alza la tazzina verso la camera, come per un brindisi.` },
            festa
              ? { think: `Ieri sera era “nel budget”. Oggi è “da valutare, ma è una formalità”. La stessa voce, un po’ più piccola.` }
              : { think: `“Il budget lo troviamo.” Come le chiavi di casa: sempre da qualche parte, mai in mano.` },
            { n: `Dietro di lui, i puntini sul monitor restano dove sono.` },
            { think: `Mi dice che va tutto bene, e intanto il suo schermo mi dice il contrario.` },
          ];
        },
        prompt: `Cosa chiedi a Mirko?`,
        hint: `Un contatto entusiasta senza dati è rumore. Cosa è cambiato di recente in azienda?`,
        tip: `La qualifica non è un interrogatorio: sono domande che portano alla luce il motivo per decidere adesso (compelling event). Se non c’è, l’entusiasmo del contatto non basta.`,
        choices: [
          ch('a', 3, `Mirko, cosa è cambiato da voi negli ultimi mesi? Cosa vi ha fatto accelerare, o frenare, sul tracking? E se non cambiate niente, cosa succede?`,
            `La domanda aperta, seguita da quanto costa non cambiare, ha fatto emergere il fatto che conta. Il motivo per decidere non lo hai inventato: lo hai fatto dire a chi lo conosceva già.`,
            { t: 6, v: 10, u: 24, c: 6, r: -6 }, {
              mp: ['I', 'C', 'Co'], set: { event: true }, next: 'n4',
              say: `Mirko, mi aiuti a capire una cosa? Cosa è cambiato da voi negli ultimi mesi? Cosa vi ha fatto accelerare, o frenare, sul tracking? E se non cambiate niente per altri dodici mesi, cosa succede?`,
              react: [
                { n: `Mirko si ferma con la tazzina a mezz’aria. Si volta, per un attimo, verso il monitor alle sue spalle.` },
                { w: 'mirko', a: `piano`, t: `Beh… a settembre abbiamo perso TrasportiNord, il cliente più grosso, proprio per i ritardi nel tracking. Aldo era furioso. Ma non l’avevo collegato.` },
                { think: `Il motivo per decidere è sempre stato lì. Nessuno l’aveva ancora detto ad alta voce.` },
              ],
            }),
          ch('b', 1, `Mirko, mi dai una data? Quando arriva, di preciso, il budget? Così la metto in calendario con Marta e lavoriamo a ritroso da lì.`,
            `Una data vaga è l’anticamera del trimestre successivo: hai chiesto il quando prima di capire il perché, e Mirko non aveva niente di più preciso da darti.`,
            { u: -2, c: -2, r: 4 }, {
              next: 'n3b',
              say: `Mirko, mi dai una data? Quando arriva, di preciso, il budget? Così la metto in calendario con Marta e lavoriamo a ritroso da lì.`,
              react: [
                { w: 'mirko', a: `sicuro`, t: `Entro fine anno, probabilmente. Fine anno, fine anno, ma la data precisa ancora non la so.` },
                { think: `“Probabilmente.” Una data che si scrive al condizionale. L’ho chiesta prima di sapere perché dovrebbe arrivare.` },
              ],
            }),
          ch('c', 0, `Ti mando oggi la proposta finale, già con il nostro miglior sconto. Così hai in mano tutto quello che serve per convincere Aldo, senza aspettare altre demo.`,
            `Senza una storia e senza un business case, la proposta finisce nella cartella “più avanti” e lo sconto è già bruciato. Hai consegnato un’arma senza munizioni.`,
            { v: -4, c: -6, r: 8, d: 15 }, {
              next: 'n3b',
              say: `Ti mando oggi la proposta finale, già con il nostro miglior sconto. Così hai in mano tutto quello che serve per convincere Aldo, senza aspettare altre demo.`,
              react: [
                { w: 'mirko', a: `contento`, t: `Perfetto! La giro ad Aldo stasera con due righe mie, vedrai.` },
                { n: `Alle sei di sera ricevi un inoltro in copia. Il messaggio di Mirko ad Aldo, per intero: “Da vedere. M.”` },
                { think: `Senza una storia dietro, la mia proposta più bella è un allegato.` },
              ],
            }),
          ch('d', 2, `Mirko, e se facessimo una call di venti minuti con Aldo? Gli porto un riassunto del progetto, due pagine al massimo, e ci dice lui che cosa ne pensa.`,
            `L’accesso resta chiuso, ma ora è chiaro che lo vuoi e Mirko lo sa: chiederlo in modo esplicito è meglio che aspettare che l’AD si faccia vivo.`,
            { c: 2 }, {
              next: 'n3b',
              say: `Mirko, e se facessimo una call di venti minuti con Aldo? Gli porto un riassunto del progetto, due pagine al massimo, e ci dice lui che cosa ne pensa.`,
              react: [
                { w: 'mirko', a: `esita`, t: `Aldo? Adesso non ha tempo, ha una riunione dopo l’altra… Ci provo, ma non ti prometto niente.` },
                { think: `Non ha detto di no. Ha detto che non può. È una differenza piccola.` },
              ],
            }),
          ch('dq', 2, `Mirko, non ci sono le condizioni per chiudere in questo trimestre. Preferisco dirtelo che inseguire una firma che non c’è. Ci risentiamo quando c’è un motivo per decidere.`,
            `Corretto nel metodo, prematuro nei tempi: non avevi ancora esplorato cosa fosse cambiato in azienda, e uscire prima di saperlo vuol dire non scoprire mai cosa c’era sotto.`,
            { }, {
              next: 'DQ',
              say: `Mirko, ti dico come la vedo: onestamente non ci sono le condizioni per chiudere questo trimestre. Preferisco dirtelo che inseguire una firma che non c’è. Ci risentiamo quando c’è un motivo per decidere.`,
              react: [
                { w: 'mirko', a: `dopo un silenzio`, t: `Ci resto male, ma apprezzo che me lo dici in faccia. Avrei fatto lo stesso.` },
                { think: `L’ho detto bene. Ma non gli ho mai chiesto che cosa fosse cambiato da loro.` },
              ],
            }),
        ],
      },

      n3b: {
        when: `Martedì · 09:30`, view: 'call',
        where: `Call · Teams · Mirko · martedì 09:30`,
        scene: [
          { n: `Martedì, le nove e mezza. Mirko ha la telecamera spostata di lato e il tono di chi ha provato la frase in corridoio.` },
          { w: 'mirko', a: `un po’ in imbarazzo`, t: `Aldo non è ancora convinto. Ma abbiamo fatto nove demo: possiamo farne un’altra con il team commerciale? Così capisce meglio.` },
          { w: 'mirko', a: `abbassando la voce`, t: `Tra noi: sono mesi che Aldo dice “vediamo”. Ma se vede il team commerciale contento, magari si smuove.` },
          { think: `Una decima demo. E ancora nessuno che dica cosa dovrebbe cambiare dopo.` },
          { n: `Nel CRM, alla voce “prossima azione”, per la nona volta c’è scritta la stessa parola: demo.` },
        ],
        prompt: `Il deal si sta incagliando. Che fai?`,
        hint: `L’ennesima demo non è un motivo per decidere. Hai una seconda occasione per scoprirlo, oppure puoi andartene bene.`,
        tip: `Quando manca un motivo per decidere, hai due opzioni valide: ripartire dalla scoperta (cosa è cambiato, cosa costa non decidere) oppure uscire con eleganza lasciando una checklist di condizioni. Quello che non funziona è un’altra demo.`,
        choices: [
          ch('a', 3, `Mirko, preferisco liberare il tuo tempo e il mio finché non c’è un motivo per decidere. Ti lascio tre condizioni: budget approvato, AD coinvolto, scadenza reale.`,
            `Hai chiuso con una checklist di tre condizioni e senza rancore: la porta resta aperta e le energie tornano sui deal sani. È una squalifica fatta bene.`,
            { t: 4 }, {
              integ: 4, next: 'DQ',
              say: `Mirko, ti parlo chiaro: preferisco liberare il tuo tempo e il mio finché non c’è un motivo vero per decidere. Ti lascio tre condizioni: un budget approvato, Aldo coinvolto, una scadenza reale. Quando sono vere, mi chiami e ripartiamo.`,
              react: [
                { w: 'mirko', a: `dopo un silenzio`, t: `È giusto così. Mi dispiace, ma è giusto.` },
                { think: `Ho chiuso con le porte aperte. È la cosa meglio riuscita di tutta questa trattativa.` },
              ],
            }),
          ch('b', 2, `Mirko, prima di una decima demo mi aiuti a capire una cosa? Cosa è cambiato da voi negli ultimi mesi, e quanto vi costa, ogni mese, non decidere?`,
            `Lo scopri tardi, dopo una settimana persa, ma lo scopri: la domanda sul costo di non decidere funziona anche alla seconda occasione.`,
            { t: 2, v: 6, u: 16, c: 2, r: -2 }, {
              mp: ['I', 'C', 'Co'], set: { event: true }, next: 'n4',
              say: `Mirko, prima della decima demo mi aiuti a capire una cosa? Cosa è cambiato da voi, negli ultimi mesi? E cosa vi costa, davvero, non decidere?`,
              react: [
                { w: 'mirko', a: `sorpreso`, t: `Beh… a settembre abbiamo perso TrasportiNord, per i ritardi nel tracking. Aldo era una furia.` },
                { think: `Dopo nove demo. Lo scopro oggi.` },
              ],
            }),
          ch('c', 0, `Va bene, organizziamo la decima demo con il team commerciale, magari con il cruscotto aggiornato: più persone coinvolgiamo, più Aldo si convince. La registriamo per lui.`,
            `La demo è un successo di cortesia, ma nessuno prende decisioni: hai consumato un’altra settimana del trimestre per rinforzare un entusiasmo che non firma.`,
            { v: -2, u: -6, c: -4, r: 6 }, {
              next: 'END',
              say: `Va bene, Mirko. Facciamo la decima demo con il team commerciale: più persone coinvolgiamo, più Aldo si convince. E la registriamo, così gliela giri tu.`,
              react: [
                { n: `La decima demo va benissimo. Il team commerciale applaude il cruscotto delle consegne e qualcuno chiede se esiste anche l’app.` },
                { w: 'mirko', a: `a fine demo`, t: `Grande! Aldo non è riuscito a collegarsi, ma gli giro il video.` },
                { think: `Dieci demo. Stessa fine delle altre nove.` },
              ],
            }),
          ch('d', 1, `Mirko, prima della demo ti propongo un’altra cosa: uno sconto aggressivo per chi firma entro fine mese, così Aldo ha un motivo per muoversi e chiudiamo nel trimestre.`,
            `Uno sconto funziona quando il prezzo è l’ostacolo. Qui l’ostacolo è che nessuno ha stanziato un euro: venti per cento di niente resta niente, e hai insegnato a Mirko che il tuo listino è trattabile.`,
            { v: -4, c: -2, r: 4, d: 20 }, {
              next: 'END',
              say: `Mirko, prima di un’altra demo ti propongo una cosa: uno sconto aggressivo, il venti per cento, per chi firma entro fine mese. Così Aldo ha un motivo per muoversi.`,
              react: [
                { w: 'mirko', a: `a disagio`, t: `Ma io il budget non ce l’ho… Lo sconto non lo posso usare se non c’è dove metterlo.` },
                { think: `Non è un problema di prezzo. Ed è l’unica leva che ho offerto.` },
              ],
            }),
        ],
      },

      n4: {
        when: `Lunedì · 15:00`, view: 'meeting',
        where: `Incontro · sede Logistica Adriatica · lunedì 15:00`,
        scene: (d) => [
          { n: `Lunedì, le tre. L’ufficio di Aldo Fabbri sta all’ultimo piano, con la finestra sul piazzale. Alle pareti, carte nautiche ingiallite e una mappa d’Italia crivellata di spilli colorati: uno spillo per cliente. Fuori, a pettine, i camion in sosta.` },
          { n: `Mirko ha ottenuto venti minuti con l’amministratore delegato. Si è seduto in disparte, le mani sulle ginocchia, come a un esame non suo.` },
          { n: `Sulla scrivania, accanto al telefono, una cartellina rossa con due lettere a pennarello: TN. Aldo ci tiene sopra una mano, senza aprirla.` },
          { w: 'aldo', a: `provato, poco interessato`, t: `Mirko dice che vuole un nuovo sistema. Io ho già troppi progetti. Mi dia una ragione per cui non fare niente non va bene.` },
          d.flags.tnData
            ? { think: `In borsa ho tre pagine di appunti della telefonata con Paolo Gatti, da usare senza il suo nome: trentuno consegne in ritardo in tre mesi, contate da chi le ha subite. Davanti a me, la cartellina che Aldo non apre e non smette di toccare.` }
            : { think: `Venti minuti. Una ragione sola. E quella cartellina, che non apre e non smette di toccare.` },
        ],
        prompt: `Hai una sola occasione con l’AD. Cosa dici?`,
        hint: `Il dolore che ha vissuto a settembre è l’unico argomento che è già suo.`,
        tip: `Con un decisore indifferente la leva è il costo dell’inazione legato a un evento che ha vissuto: non gli vendi una soluzione, gli mostri che il problema continua a costargli.`,
        choices: [
          ch('a', 3, `A settembre avete perso TrasportiNord per i ritardi di tracking. Quanto vi è costato, e quali altri clienti grandi rischiano lo stesso? Poi le mostro come altri hanno recuperato margine.`,
            `Una sola domanda sul costo di quella perdita ha spostato la conversazione dalla tua demo al suo conto economico: Aldo ha fatto il calcolo ad alta voce e ha fissato lui la data. Il costo dell’inazione, quando l’ha vissuto di persona, vende più di qualunque funzione.`,
            { t: 10, v: 16, u: 22, c: 14, r: -8 }, {
              mp: ['E', 'M'], set: { ebEngaged: true }, next: 'n5',
              say: `Signor Fabbri, a settembre avete perso TrasportiNord per i ritardi di tracking. Mi dica: quanto vi è costato? E gli altri clienti grandi, hanno lo stesso rischio? Poi le mostro come altre aziende di logistica hanno recuperato margine in sei mesi.`,
              react: [
                { n: `Aldo ritira la mano dalla cartellina e la apre. Dentro, un foglio con una colonna di cifre sottolineata due volte.` },
                { w: 'aldo', a: `posa la penna`, t: `Perso il dieci per cento del fatturato. E non avevo fatto il conto per gli altri tre clienti grandi.` },
                { w: 'aldo', a: `si volta verso Mirko`, t: `Mirko, preparami un piano. Rivediamoci il 15: mi serve un caso con i numeri.` },
                { think: `Venti minuti. Gliene sono bastati cinque.` },
              ],
            }),
          ch('b', 1, `Le faccio vedere l’ultima versione della demo: tracking in tempo reale, ottimizzazione dei percorsi, cruscotto per il responsabile del traffico, mappa dei mezzi. Sono quindici minuti, e le mostro tutto.`,
            `Hai ripetuto una demo a chi la conosceva già, nel tempo in cui potevi scoprire cosa gli sta a cuore. L’accesso c’è stato, ma lo hai speso a presentare invece che a capire.`,
            { t: -2, c: 2 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Signor Fabbri, le faccio vedere l’ultima versione: tracking in tempo reale, ottimizzazione dei percorsi, un cruscotto per il responsabile del traffico. Sono quindici minuti.`,
              react: [
                { n: `Apri il laptop e giri lo schermo. I camion sulla mappa si muovono, l’ottimizzazione ridisegna un percorso, il cruscotto lampeggia di verde.` },
                { w: 'aldo', a: `guarda l’orologio`, t: `Mirko mi ha già fatto vedere questo. C’è altro?` },
                { think: `Ho usato l’unico momento con l’AD per ripetere la nona demo.` },
              ],
            }),
          ch('c', 2, `Le propongo di sentire la nostra Sales Director, Marta Colombo: può parlarle da pari, sul rischio di perdere altri clienti come TrasportiNord. Fisso io il momento che le va meglio.`,
            `Il livello del contatto è piaciuto e ti sei guadagnato un secondo appuntamento. Ma il tema resta il tuo, non il suo: Marta potrà parlargli da pari solo di ciò che Aldo sente come un problema proprio.`,
            { t: 6, c: 4, r: -2 }, {
              jolly: 'exec', mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Signor Fabbri, le propongo di sentire la nostra Sales Director, Marta Colombo: può parlarle da pari, sul rischio di perdere altri clienti. Fisso io il momento che le va meglio.`,
              react: [
                { w: 'aldo', a: `annuisce lentamente`, t: `Una direttrice che parla con me, e non con Mirko. Questo lo apprezzo. Fissi con la mia segretaria.` },
                { think: `Mi ha dato un secondo appuntamento. Non una ragione per non fare niente.` },
              ],
            }),
          ch('d', 0, `Le propongo il 30% di sconto se firma entro fine trimestre. È la condizione migliore che abbiamo mai concesso su questo sistema, e darebbe a Mirko qualcosa da portare in consiglio.`,
            `Con un decisore indifferente lo sconto non crea urgenza, la svaluta: Aldo ha letto la tua fretta e ha messo in dubbio il valore del prodotto prima ancora di conoscerlo.`,
            { t: -6, v: -6, c: -4, r: 8, d: 30 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n5',
              say: `Signor Fabbri, le propongo il trenta per cento di sconto se firma entro fine trimestre. È la condizione migliore che Nexora abbia mai concesso su questo sistema.`,
              react: [
                { w: 'aldo', a: `senza scomporsi`, t: `Trenta per cento. E se me lo offrono a questo prezzo, quanto vale?` },
                { n: `Mirko, in disparte, sposta lo sguardo sul tappeto.` },
                { think: `Ha capito due cose in una frase: che il prezzo non è il punto, e che ho fretta.` },
              ],
            }),
        ],
      },

      n5: {
        when: `Mercoledì · 10:30`, view: 'call',
        where: `Videocall · mercoledì 10:30`,
        scene: (d) => [
          { n: `Mercoledì, le dieci e mezza. Aldo compare sullo schermo da una stanza che non conosci, forse la sala operativa: alle sue spalle una lavagna bianca fitta di targhe e orari scritti a pennarello, cancellati e riscritti.` },
          { w: 'aldo', a: `serio`, t: `Mirko mi ha fatto un conto: il progetto completo sono novecentomila euro l’anno. Non li ho, e non voglio spenderli in un colpo.` },
          { w: 'mirko', a: `sottovoce, in un angolo dell’inquadratura`, t: `Tutto o niente non funziona per noi.` },
          d.mp.has('M')
            ? { think: `Il margine perso con TrasportiNord ce l’ho. Il novecentomila è il mio listino, non il suo budget: devo trovare la cifra che può firmare.` }
            : { think: `Il novecentomila è il numero del CRM. Non è quello che qualcuno può firmare.` },
          { think: `Sul quaderno ho ancora le quattro righe di ieri mattina: due camion cercati a voce, tre ore di errore su una consegna, un numero scritto a mano. Non sono un mio argomento di vendita: sono la loro mattina.`, if: (dd) => !!dd.flags.fogSeen },
        ],
        prompt: `Come ridimensioni il deal?`,
        hint: `Un deal da €900k che non si può firmare vale zero. Uno da €340k che si firma vale €340k.`,
        tip: `Right-sizing: quando il budget non regge il perimetro, riduci il perimetro, non il prezzo. Una prima fase con risultati misurabili (land) crea il caso per l’espansione (expand) e porta la firma nel trimestre.`,
        choices: [
          ch('a', 0, `Insisto sul perimetro completo: il valore sta nel sistema integrato. Se togliamo dei pezzi, togliamo anche i risultati che stiamo promettendo, e il progetto non risolverebbe più il suo problema.`,
            `Hai difeso un perimetro che non si poteva firmare: se il budget non regge, il valore dell’integrazione non conta, perché nessuno può comprarlo.`,
            { u: -10, c: -6, r: 10 }, {
              next: 'n6',
              say: `Capisco la cifra, signor Fabbri, ma il valore sta nel sistema integrato. Se togliamo dei pezzi, togliamo anche i risultati che le sto promettendo.`,
              react: [
                { w: 'aldo', a: `freddo`, t: `Allora ne riparliamo a primavera.` },
                { w: 'mirko', a: `abbassa lo sguardo`, t: `Aldo, aspetta…` },
                { think: `Ho difeso con ostinazione un perimetro che nessuno può firmare.` },
              ],
            }),
          ch('b', 3, `Propongo una Fase 1 mirata: tracking in tempo reale e consegne dei tre clienti più a rischio. €340k l’anno, obiettivi misurabili in sei mesi, estensione a prezzo bloccato.`,
            `Hai ridotto il perimetro, non il prezzo: una prima fase misurabile e firmabile, con un’opzione che tiene aperto il resto. Un sogno da €900k è diventato un deal da €340k che si può firmare.`,
            { t: 6, v: 12, u: 8, c: 16, r: -8, l: -560 }, {
              mp: ['Dc', 'Dp'], set: { rightsized: true }, next: 'n6',
              say: `Allora facciamo un passo alla volta. Una Fase 1 mirata: tracking in tempo reale e gestione delle consegne per i tre clienti più a rischio. Trecentoquarantamila euro l’anno, con obiettivi misurabili entro sei mesi e un’opzione per estendere al resto a prezzo bloccato.`,
              react: [
                { n: `Aldo prende un pennarello, si volta verso la lavagna e scrive 340 sotto una colonna di targhe.` },
                { w: 'aldo', t: `Questo posso approvarlo.` },
                { w: 'mirko', a: `a mezza voce`, t: `Per i tre grandi. Sì. Così sì.` },
                { think: `Da novecento a trecentoquaranta. È il primo numero che qualcuno, lì dentro, dice di poter firmare.` },
              ],
            }),
          ch('c', 1, `Rivedo il prezzo: tolgo il 40% sul totale, quindi €540k l’anno per lo stesso perimetro. Così la cifra si avvicina a quello che può spendere, e le tengo tutto dentro.`,
            `Il problema era il perimetro, non il prezzo: tagliare il 40% sullo stesso perimetro lascia ad Aldo una cifra comunque fuori portata e un valore svalutato.`,
            { v: -8, c: -4, r: 6, d: 40 }, {
              next: 'n6',
              say: `Allora rivedo il prezzo, signor Fabbri: tolgo il quaranta per cento sul totale, cinquecentoquarantamila euro l’anno per lo stesso perimetro. Così la cifra si avvicina a quello che può spendere.`,
              react: [
                { w: 'aldo', a: `scuote la testa`, t: `Cinquecentoquaranta. Sempre troppo, e sempre tutto insieme.` },
                { think: `Ho tolto soldi, non pezzi. Lui parlava di spenderli “in un colpo”: il colpo è rimasto uguale.` },
              ],
            }),
          ch('d', 2, `Prendo tempo e torno con una proposta articolata, a fasi, in cui spiego cosa si può staccare e cosa no. Gliela mando entro venerdì, con costi e tempi di ciascuna fase.`,
            `Una risposta ragionevole, ma cede l’iniziativa a lui: senza una data tua, nessuno ti aspetta con urgenza.`,
            { u: -4, c: -2 }, {
              next: 'n6',
              say: `Prendo tempo, signor Fabbri, e torno con una proposta articolata, a fasi, in cui spiego cosa si può staccare e cosa no. Gliela mando entro venerdì.`,
              react: [
                { w: 'aldo', a: `distratto`, t: `Come vuole. Mi mandi quello che ha quando ce l’ha.` },
                { n: `Chiude la chiamata prima che tu abbia finito di salutare.` },
                { think: `Gli ho promesso una proposta entro venerdì. Lui non mi ha promesso di leggerla.` },
              ],
            }),
        ],
      },

      n6: {
        when: `Lunedì · 17:00`, view: 'call',
        where: `Videocall · lunedì 17:00`,
        scene: (d) => [
          d.flags.rightsized
            ? { n: `Lunedì, fine giornata. Aldo ti chiama dall’auto, parcheggiata nel piazzale: due telefoni sul cruscotto, un termos, i camion che rientrano dal giro. Il vivavoce amplifica i motori.` }
            : { n: `Lunedì, fine giornata. Dopo la call di mercoledì, che non ha sciolto niente, Mirko non ha mollato per quattro giorni. Aldo cede e ti chiama dall’auto, parcheggiata nel piazzale: due telefoni sul cruscotto, i camion che rientrano alle sue spalle.` },
          d.flags.rightsized
            ? { w: 'aldo', a: `pratico`, t: `Ci siamo. Ma prima voglio che Mirko e il mio direttore finanziario validino tutto. Non prima di due settimane.` }
            : { w: 'aldo', a: `pratico, senza entusiasmo`, t: `Mirko mi dice che ci siamo, e allora va bene: se il progetto si fa, prima voglio che lui e il mio direttore finanziario validino tutto. Non prima di due settimane.` },
          { think: `Due settimane. Se le lascio scorrere diventano quattro, e il trimestre chiude con il contratto in un cassetto.` },
          { n: `Sul tuo calendario la fine del trimestre è un rettangolo rosso. Sul suo, probabilmente, non c’è.` },
          { n: `Dietro la voce di Aldo se ne sente un’altra, più roca, che chiede “quanto”. È Lorenzo.`, if: (dd) => !!wildOf(dd, 'fratello') },
          { think: `Non è più un progetto solo suo.`, if: (dd) => !!wildOf(dd, 'fratello') },
        ],
        prompt: `Come blindi i tempi?`,
        hint: `Il tuo trimestre ha una data. Il loro processo, ancora no.`,
        tip: `Un Mutual Close Plan trasforma “ci siamo” in date e responsabili: chi fa cosa, entro quando, con quali conseguenze se slitta. Senza date reciproche, la tua urgenza resta solo tua.`,
        choices: [
          ch('a', 3, `Costruiamo un piano di chiusura con date e responsabili: finanziario entro il 10, legale entro il 15, firma entro il 28. Mirko lo segue, io preparo il contratto in parallelo.`,
            `Un piano con date, responsabili e un referente interno trasforma la tua urgenza in un calendario condiviso: ora è Aldo a inoltrare le scadenze al finanziario, non tu a inseguirle.`,
            { t: 8, u: 6, c: 16, r: -12 }, {
              mp: ['P'], set: { mutualPlan: true }, next: 'END',
              say: `Allora costruiamo insieme un piano di chiusura, con date e responsabili. Validazione del direttore finanziario entro il 10, revisione legale entro il 15, firma entro il 28. Mirko ne è il responsabile, io preparo il contratto in parallelo.`,
              react: [
                { w: 'aldo', a: `scrive qualcosa`, t: `Va bene. Giro tutto al direttore finanziario così come sta: queste sono le date.` },
                { w: 'mirko', a: `in sottofondo`, t: `Il referente sono io. Ci sto, ci sto.` },
                { think: `Per la prima volta le date non sono solo mie.` },
              ],
            }),
          ch('b', 1, `Le lascio il tempo che serve, nessuna fretta. Preferisco che Mirko e il direttore finanziario validino tutto con calma, e quando hanno finito ne riparliamo insieme, senza rincorse.`,
            `Aspettare senza date non è cortesia: se nessuno è responsabile del calendario, decide il passo più lento. Il tuo trimestre ha una scadenza, la loro validazione no.`,
            { u: -8, c: -6, r: 8 }, {
              next: 'END',
              say: `Le lascio il tempo che serve, signor Fabbri, nessuna fretta. Preferisco che Mirko e il direttore finanziario validino tutto con calma, e poi ne riparliamo.`,
              react: [
                { w: 'aldo', t: `Perfetto. Quando abbiamo finito, la chiamo.` },
                { n: `Passano due settimane. Poi quattro. Nel CRM, alla riga di Logistica Adriatica, la data di chiusura prevista si sposta da sola.` },
              ],
            }),
          ch('c', 2, `Le chiedo un impegno scritto, anche una mail breve: firma entro il 28. Così so cosa riferire in azienda e posso già far partire il contratto con i nostri legali.`,
            `Un impegno unilaterale senza piano condiviso è solo una richiesta: la data resta tua, e al cliente manca il percorso per raggiungerla.`,
            { c: 4, r: -2 }, {
              mp: ['P'], next: 'END',
              say: `Signor Fabbri, le chiedo un impegno scritto: firma entro il 28. Così so cosa riferire in azienda e posso già muovere il contratto.`,
              react: [
                { w: 'aldo', a: `secco`, t: `Non posso garantire la data prima della validazione. Un impegno scritto al buio non lo firmo.` },
                { think: `Gli ho chiesto una promessa. Non gli ho offerto un percorso.` },
              ],
            }),
          ch('d', 0, `Le tengo il prezzo bloccato se firma entro il 28; dopo quella data ritiro l’offerta. Mi serve una scadenza chiara, o non riesco a tenerle il prezzo né a difenderlo con i miei.`,
            `Un prezzo bloccato fino al 28 è una scadenza tua travestita da cortesia: ad Aldo non costa niente ignorarla, a te costa fiducia. Una data regge solo se l’hanno scritta anche loro.`,
            { t: -8, c: -6, r: 10 }, {
              integ: -2, next: 'END',
              say: `Signor Fabbri, le tengo il prezzo bloccato se firma entro il 28. Dopo quella data devo ritirare l’offerta: mi serve una scadenza chiara.`,
              react: [
                { w: 'aldo', a: `dopo un silenzio`, t: `Mi sta minacciando?` },
                { think: `Per me la scadenza è del trimestre. Per lui non lo è, e lo sa.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'mirko_festa', title: `Mirko ha una bellissima notizia`, w: 2, after: ['n1', 'n4'],
        node: {
          when: `In serata`, view: 'car', where: `In auto · SS16 Adriatica`,
          scene: (d) => {
            const f = d.flags;
            if (d.node === 'n5') {
              return [
                { n: `Sera, sulla SS16. La nebbia è tornata a salire dai canali e le code si allungano in un tunnel di fanali rossi. Sul supporto il telefono si illumina: Mirko.`, sfx: 'phone' },
                { w: 'mirko', a: `quasi gridando`, t: `Aldo ha detto sì! Ha detto che il progetto si fa. Mi ha chiesto di preparargli il conto di tutto, tutto il pacchetto. Stavolta ci siamo davvero!` },
                d.mp.has('M')
                  ? { think: `Aldo mi ha chiesto un caso con i numeri. Mirko ha sentito “sì”. Sono due frasi diverse, e il CRM non sa distinguerle.` }
                  : { think: `Nell’ufficio di Aldo non ho sentito un sì. Ho sentito un uomo stanco che si lascia convincere a guardare un conto.` },
              ];
            }
            return [
              { n: `Giovedì sera, in rientro. I tergicristalli spazzano una nebbia che non se ne va. Sul supporto il telefono si illumina: Mirko, a quest’ora.`, sfx: 'phone' },
              { w: 'mirko', a: `quasi gridando`, t: `Ti do subito la bella notizia: ho parlato con il direttore finanziario e il progetto è nel budget! Nel budget, capito? C’è una voce apposta, l’ho vista con questi occhi.` },
              f.inflated
                ? { think: `Marta ha già il mio Commit da novecentomila euro. Questa notizia mi darebbe ragione, ed è proprio per questo che devo diffidarne.` }
                : { think: `Una voce di budget. Con quale cifra, e approvata da chi?` },
            ];
          },
          prompt: `Mirko è al settimo cielo. Come gestisci la notizia?`,
          hint: `Una notizia bella arriva sempre senza carte. Cosa servirebbe per crederci?`,
          tip: `Un contatto entusiasta traduce ogni segnale in un sì. Prima di cambiare forecast o contratto, separa i fatti (chi ha detto cosa, per iscritto) dall’interpretazione: è il momento in cui i deal zombie si gonfiano.`,
          choices: [
            ch('a', 3, `Bellissima notizia, Mirko, se è scritta. Mi giri il documento e mi dici chi ha approvato, per quale cifra e da quando vale?`,
              (d) => (d.node === 'n5'
                ? `Hai separato quello che Aldo ha detto da quello che Mirko ha sentito: “preparami il conto” è un compito, non un via libera. Così ti presenti a mercoledì con la realtà in mano, non con l’entusiasmo.`
                : `Hai chiesto la carta prima di festeggiare. La “voce di budget” era una previsione da valutare, non un impegno: una notizia vale quanto il documento che c’è sotto.`),
              (d) => ({ t: 3, c: d.mp.has('E') ? 7 : 5, r: -5 }), {
                next: 'RET',
                say: `Mirko, che bella notizia. Facciamo una cosa: mi giri il documento? Voglio capire chi ha approvato, per quale cifra e da quando vale, così so come muovermi.`,
                react: (d) => (d.node === 'n5'
                  ? [
                    { w: 'mirko', a: `un po’ spiazzato`, t: `Beh, a voce. Mi ha detto di preparargli il conto di tutto e di tornare da lui. Per me è un sì, eh.` },
                    { think: `A voce. “Preparami il conto.” Non è una firma: è un compito.` },
                  ]
                  : [
                    { w: 'mirko', a: `un po’ spiazzato`, t: `Te la giro domattina, è una tabella del direttore. Però c’è, ti giuro. Solo che… accanto c’è scritto “da valutare”.` },
                    { think: `“Da valutare.” Ecco la parte che dentro “nel budget” non c’era.` },
                  ]),
              }),
            ch('b', 0, `Fantastico, Mirko! Preparo subito il contratto completo, i novecentomila per intero: così domani lo trovi pronto da portare ad Aldo e non perdiamo altro tempo.`,
              (d) => (d.node === 'n5'
                ? `Hai trasformato un “preparami il conto” in un contratto da €900k: darai ad Aldo un perimetro che non può firmare, proprio mentre sta ancora decidendo se interessarsi. Ti sei complicato la strada verso un perimetro firmabile.`
                : `Hai preparato un contratto su una frase detta in macchina. Se la “voce di budget” non è un impegno, hai speso ore e una promessa implicita su qualcosa che non esiste ancora.`),
              (d) => ({ t: -3, c: d.mp.has('E') ? -4 : -7, r: d.mp.has('E') ? 6 : 10 }), {
                next: 'RET',
                say: `Che meraviglia, Mirko! Allora preparo subito il contratto completo, i novecentomila per intero: domani lo trovi pronto da portare ad Aldo.`,
                react: [
                  { w: 'mirko', a: `felice`, t: `Perfetto! Domani lo stampo e glielo porto io, così vede che facciamo sul serio.` },
                  { n: `Per tutta la sera, sul tavolo, un contratto da novecentomila euro costruito su una frase detta al telefono.` },
                  { think: `Sto preparando una firma che nessuno mi ha chiesto.` },
                ],
              }),
            ch('c', 1, `Perfetto, la notizia la passo a Marta stasera: porto il deal a Commit pieno e scrivo che la firma arriva nel trimestre, così può presentarlo al CRO.`,
              `Hai girato a Marta, come un fatto, una frase di Mirko detta in macchina: il forecast ora è più alto di quanto i fatti sostengano. Se la notizia non regge, il costo non è solo la firma: è la credibilità del prossimo numero.`,
              (d) => ({ t: -2, c: -3, r: d.mp.has('E') ? 6 : 9 }), {
                integ: -2, set: { inflated: true }, next: 'RET',
                say: `Grande notizia, Mirko. La passo a Marta stasera: porto la trattativa a Commit pieno e scrivo che la firma arriva nel trimestre, così può presentarla al CRO.`,
                react: [
                  { chat: { from: 'marta', app: 'Teams' }, t: `Letto: Commit pieno, firma nel trimestre. Lo porto al CRO così. Se qualcosa cambia, lo voglio sapere da te per prima.`, sfx: 'ping' },
                  { think: `Le ho passato una certezza che ho ricevuto anch’io, a voce, in macchina, da una persona che non firma.` },
                ],
              }),
            ch('d', 2, `Mirko, ti ringrazio e ci credo, ma ho bisogno di vederlo scritto prima di muovermi. Mandami domattina quello che hai e ne parliamo con calma.`,
              `Prudente e corretto, ma passivo: aspetti che la carta arrivi invece di chiedere subito chi, quanto e da quando. Il dubbio lo risolvi comunque, solo un po’ più tardi.`,
              { t: 1, c: 2 }, {
                next: 'RET',
                say: `Mirko, ti ringrazio e ci credo davvero, ma ho bisogno di vederlo scritto prima di muovermi. Mandami domattina quello che hai e ne parliamo con calma.`,
                react: (d) => (d.node === 'n5'
                  ? [
                    { w: 'mirko', a: `un po’ deluso`, t: `Va bene, va bene… Pensavo ti facesse più piacere. Domattina ti giro la mail.` },
                    { n: `La mail di Aldo arriva alle otto e dieci, inoltrata da Mirko: due righe. “Preparami il conto del progetto completo.” Nessun’altra parola.` },
                  ]
                  : [
                    { w: 'mirko', a: `un po’ deluso`, t: `Va bene, va bene… Pensavo ti facesse più piacere. Domattina la trovi in posta.` },
                    { n: `La pagina arriva alle otto e dieci. La riga evidenziata ha una cifra e, accanto, due parole che Mirko non aveva citato: “da valutare”.` },
                  ]),
              }),
          ],
        },
      },
      {
        id: 'paolo_gatti', title: `Una mail da TrasportiNord`, w: 2, after: ['n2', 'n3b'],
        if: (d) => d.node === 'n4' && !!d.flags.event,
        node: {
          when: `Domenica · 21:15`, view: 'mail', bg: 'night', where: `Email · domenica 21:15`,
          scene: (d) => [
            { n: `Domenica sera, il laptop sulle ginocchia. Tra le notifiche, un nome che non ti aspettavi: Paolo Gatti, fino a poco fa responsabile operativo di TrasportiNord.` },
            { mail: { from: `Paolo Gatti`, subj: `Logistica Adriatica: forse posso esserle utile` }, t: `Buonasera, mi hanno detto che sta lavorando con Logistica Adriatica. Ero il responsabile operativo di TrasportiNord quando, a settembre, abbiamo lasciato quel fornitore. Da allora ho cambiato azienda e non devo niente a nessuno. Non ho nulla contro di loro, sono brava gente, ma da fuori non si vedeva mai dove fossero i camion. Se le serve sapere cosa è successo davvero, le dedico mezz’ora. Paolo Gatti` },
            d.flags.inflated
              ? { think: `Se Paolo conferma il quadro, il mio Commit smette di essere una speranza. Se lo smentisce, meglio saperlo prima di Marta.` }
              : { think: `Chi ha vissuto il problema dal lato del cliente vale più di dieci slide. Ma è un terreno delicato: sto parlando con l’uomo che se n’è andato da loro.` },
          ],
          prompt: `Un ex cliente di Logistica Adriatica si offre di parlare. Come usi la sua mezz’ora?`,
          hint: `Chi ti offre un’informazione sta decidendo di fidarsi di te. Cosa gli chiedi, e cosa ne farai dopo?`,
          tip: `Un ex cliente è la fonte più onesta del costo del problema, ma va trattato da fonte: gli si chiede cosa ha visto, non cosa nasconde. I numeri che servono al caso sono del cliente e tuoi; quelli di terzi si usano solo con il loro permesso e senza nomi.`,
          choices: [
            ch('a', 3, `Accetto la mezz’ora e gli chiedo cosa ha visto, non i conti della sua azienda. Se i numeri sono suoi e li condivide, li uso con Aldo, senza citarlo.`,
              (d) => (d.flags.inflated
                ? `Hai trattato Paolo da testimone, non da fonte da sfruttare: ti dà il quadro dal lato di chi ha subito il problema. Con il Commit che hai già dato a Marta, è la prova che ti mancava.`
                : `Hai trattato Paolo da testimone, non da fonte da sfruttare: ti dà il quadro dal lato di chi ha subito il problema, e un numero che non viene né da te né da Mirko. Basta non citarlo.`),
              (d) => ({ t: 4, v: d.flags.inflated ? 12 : 10, u: 6, r: -5 }), {
                set: { tnData: true }, next: 'RET',
                say: `Paolo, la ringrazio, accetto volentieri. Mi interessa cosa ha visto dal lato operativo: ritardi, telefonate dei clienti, cosa non riusciva a sapere. Se i numeri sono suoi e vuole condividerli, li uso nel caso per Aldo, senza fare il suo nome.`,
                react: [
                  { w: 'paolo', a: `il giorno dopo, al telefono`, t: `Tra giugno e agosto: trentuno consegne in ritardo di oltre due ore, senza un avviso. Quattro clienti finali hanno chiamato direttamente il nostro direttore. Li ho contati perché nessun sistema lo faceva.` },
                  { think: `Trentuno consegne. Un numero che non viene da me né da Mirko.` },
                ],
              }),
            ch('b', 0, `Accetto, ma gli chiedo i dati interni di TrasportiNord: volumi, margini, contratti. Con quelli il caso per Aldo diventa a prova di obiezione e non dipende da Mirko.`,
              `Hai chiesto a un ex cliente informazioni riservate della sua azienda: anche se le avesse date, il caso per Aldo si sarebbe appoggiato su dati che non potevi usare. Una fonte onesta va trattata onestamente.`,
              { t: -6, v: 3, c: -2, r: 8 }, {
                integ: -3, next: 'RET',
                say: `Paolo, volentieri. Se riesce a passarmi i dati interni di TrasportiNord, volumi, margini e contratti, il caso per Aldo diventa a prova di obiezione.`,
                react: [
                  { w: 'paolo', a: `dopo un silenzio`, t: `I numeri della mia ex azienda no. Non è una questione di rancore. Se vuole sapere cosa è successo glielo racconto; altro, no.` },
                  { think: `Ho fatto il passo più lungo della gamba, e lui l’ha sentito subito.` },
                ],
              }),
            ch('c', 2, `Lo ringrazio e gli propongo di sentirsi con Mirko, che conosce meglio l’azienda. Lascio a lui la decisione di come usare quello che ne esce.`,
              `Corretto passare l’informazione a chi può usarla, ma ti togli di mezzo proprio dove avresti potuto capire di più: quello che Paolo dirà a Mirko resta di Mirko.`,
              { t: 1, v: 3, c: -3, r: 1 }, {
                next: 'RET',
                say: `Paolo, la ringrazio. Le presento Mirko Tesei, che conosce Logistica Adriatica dall’interno: sentitevi voi due, e poi sarà lui a decidere come usare quello che ne esce.`,
                react: [
                  { w: 'paolo', t: `Va bene. Con Mirko non ho problemi a parlare, se serve a qualcosa.` },
                  { n: `Giri la mail a Mirko con due righe. Risponde dopo mezz’ora con tre punti esclamativi, e nient’altro.` },
                ],
              }),
            ch('d', 1, `Lo ringrazio e non do seguito. È un ex di un cliente perso, non un interlocutore: la domenica sera preferisco non lavorare su opinioni, e il caso per Aldo lo costruisco con quello che ho.`,
              `Hai lasciato scivolare la persona che aveva già contato i danni dal lato del cliente: il motivo per decidere resta quello che ti ha detto Mirko, senza una cifra che lo regga.`,
              { u: -2, v: -2, r: 4 }, {
                next: 'RET',
                say: `Paolo, grazie dell’offerta. Al momento preferisco non allargare il giro: se serve, la ricontatto io.`,
                react: [
                  { w: 'paolo', a: `due righe, secche`, t: `Capisco. Se cambia idea, sa dove trovarmi.` },
                  { think: `Ho lasciato fuori dalla porta l’unico che aveva già fatto i conti.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'nebbia', title: `La nebbia cancella il sopralluogo`, w: 2, after: ['n4'],
        node: {
          when: `Martedì · 07:30`, view: 'walk', where: `Piazzale · sede Logistica Adriatica · martedì 07:30`,
          scene: (d) => [
            { n: `Alle sette e mezza il piazzale è un acquario. Del terminal si vede la base di una gru e poi niente; i camion sono sagome grigie in sosta, e il fiato dei motori si mescola alla nebbia.` },
            { n: `Il giro era fissato per le otto: seguire un carico dal piazzale fino alla banchina del terminal, il sopralluogo che Mirko ti aveva promesso dopo l’incontro con Aldo.` },
            { w: 'mirko', a: `sconsolato, con il telefono in mano`, t: `Il terminal è chiuso: nebbia, banchine ferme fino a nuovo ordine. Il sopralluogo salta. Scusami, ti ho fatto alzare all’alba per niente.` },
            { w: 'rosa', a: `al telefono, quasi urlando`, t: `Dove sei? No, non “in coda”: dove? Che cartello vedi? Dimmi il cartello!` },
            d.mp.has('M')
              ? { think: `Aldo mi ha chiesto un caso con i numeri. Su questo piazzale, stamattina, i numeri si stanno scrivendo da soli.` }
              : { think: `Un numero non ce l’ho ancora. Ma ho la scena che lo spiega: il tracking, qui, per ora è una persona che urla in un telefono.` },
          ],
          prompt: `Il sopralluogo è saltato, ma il problema è lì davanti a te. Che fai?`,
          hint: `Una mattina storta può essere l’occasione migliore per vedere il problema in azione. Cosa ti serve portare via?`,
          tip: `Quando un imprevisto cancella il piano, guarda cosa mostra al suo posto. Vedere dal vivo come il cliente gestisce il problema vale più di una visita ben organizzata: quello che osservi diventa il caso. Ma osservare non è un pretesto per vendere.`,
          choices: [
            ch('a', 3, `Resto. Chiedo a Rosa di farmi sedere in sala operativa fino alle dieci e guardo come lavorano, quaderno alla mano, segnando dove si perde tempo.`,
              (d) => (d.flags.ebEngaged
                ? `Hai trasformato un’uscita a vuoto in una scena che nessuna slide avrebbe saputo costruire: poche righe precise, scritte da chi c’era, da portare ad Aldo. E Rosa, che sa chi ti manda, ti ha lasciato guardare.`
                : `Hai trasformato un’uscita a vuoto in una scena che nessuna slide avrebbe saputo costruire: poche righe precise, scritte da chi c’era, da portare nel caso.`),
              (d) => ({ t: 4, v: d.mp.has('M') ? 8 : 10, u: 7, c: 4 }), {
                set: { fogSeen: true }, next: 'RET',
                say: `Mirko, non scusarti: resto. Rosa, se non disturbo, mi siedo in un angolo della sala operativa fino alle dieci e guardo come lavorate. Non faccio domande, prendo solo nota di dove si perde tempo.`,
                react: [
                  { w: 'rosa', a: `chiusa la chiamata, senza voltarsi`, t: `Si metta lì. Ma non mi chieda niente finché non ho trovato il camion quarantuno.` },
                  { n: `Alle dieci hai quattro righe sul quaderno: due camion cercati a voce, una consegna annunciata al cliente con tre ore di errore, una telefonata persa per colpa di un numero scritto a mano.` },
                  { think: `Quattro righe. Il caso lo sta scrivendo la nebbia.` },
                ],
              }),
            ch('b', 2, `Riprogrammiamo il sopralluogo per la settimana prossima, con il terminal aperto. Intanto torno in ufficio e preparo il materiale per mercoledì, così non perdiamo la mattina.`,
              `Scelta ordinata e sicura: non perdi niente, ma non guadagni niente. Hai lasciato dov’era l’unica scena che avrebbe raccontato il problema meglio di te.`,
              { t: 1, c: 2 }, {
                next: 'RET',
                say: `Va bene, Mirko. Riprogrammiamo il sopralluogo per la settimana prossima, con il terminal aperto. Io intanto torno in ufficio e preparo il materiale per mercoledì, così la mattina non va persa.`,
                react: [
                  { w: 'mirko', t: `Va bene, lo rifaccio fissare io. Grazie di essere venuto, eh.` },
                  { n: `Torni in macchina. La nebbia si apre solo a mezzogiorno, quando non serve più a nessuno.` },
                ],
              }),
            ch('c', 1, `Visto che salta, uso la mattina per scrivere ad Aldo: la nebbia dimostra che senza tracking siete ciechi. Un argomento così non lo trovo più.`,
              `Il collegamento è giusto, il tempismo no: dire a un AD con i camion fermi che “avete bisogno di noi” trasforma il suo problema in un tuo argomento di vendita.`,
              { t: -4, u: 3, r: 6 }, {
                next: 'RET',
                say: `Mirko, visto che il sopralluogo salta, scrivo due righe ad Aldo: la nebbia dimostra quello di cui parliamo da mesi. Un argomento più a pennello di questo non lo trovo.`,
                react: [
                  { w: 'mirko', a: `a disagio`, t: `Ma Aldo oggi ha tre camion fermi e la banca che lo chiama… Non è proprio il momento, eh.` },
                  { think: `Ho usato la sua giornata peggiore come slide.` },
                ],
              }),
            ch('d', 0, `Il giro lo faccio comunque: conosco qualcuno al terminal e un pass si trova. Una mattina così, vista da vicino, vale più di una visita organizzata.`,
              `Hai trattato un divieto di sicurezza come un ostacolo da aggirare, davanti all’uomo che ti ha fatto entrare. La fiducia che stavi costruendo con Mirko vale molto più di un giro al terminal.`,
              { t: -6, c: -4, r: 8 }, {
                integ: -2, next: 'RET',
                say: `Mirko, il giro lo faccio lo stesso: chiamo un conoscente al terminal e mi faccio dare un pass. Una mattina così, vista da vicino, vale più di una visita organizzata.`,
                react: [
                  { w: 'mirko', a: `serio`, t: `No, ferma. Le banchine sono chiuse per sicurezza, non per dispetto. Se ti vedono in giro senza autorizzazione, il guaio ce l’ho io.` },
                  { think: `Un’area chiusa per sicurezza non si apre con una telefonata. Mirko ha già abbastanza guai.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'fratello', title: `Compare il fratello dell’AD`, w: 1, after: ['n5'],
        node: {
          when: `Venerdì · 16:30`, view: 'walk', bg: 'public', where: `Corridoio dell’AD · sede Logistica Adriatica · venerdì 16:30`,
          scene: (d) => [
            { n: `Venerdì, le quattro e mezza. Mirko ti ha chiesto di passare a lasciargli le ultime carte. Siete nel corridoio, davanti alla porta di Aldo, quando si apre ed esce un uomo grande e abbronzato, con la cravatta allentata e le mani di chi ha guidato un camion per vent’anni.` },
            { w: 'mirko', a: `a mezza voce`, t: `Lorenzo Fabbri, il fratello di Aldo. Socio al trenta per cento. Segue altre cose, ma sui soldi dell’azienda ha sempre un’opinione.` },
            { w: 'lorenzo', a: `senza presentarsi`, t: d.flags.rightsized
              ? `Tu sei quello del software. Aldo mi ha detto che spendiamo trecentoquarantamila euro l’anno per vedere dove sono i camion. Io i camion li ho guidati: so dove sono, li chiamo. E il figlio di un mio amico, a Cesena, dice che con un gestionale si fa lo stesso per un terzo.`
              : `Tu sei quello del software. Sono mesi che Mirko porta gente a fare demo. Quanto ci costerebbe, tutta questa roba? E perché non lo facciamo con il figlio di un mio amico, a Cesena, che ce lo fa per un terzo?` },
            d.mp.has('M')
              ? { think: `Ho il conto di TrasportiNord. Se lo uso bene, Lorenzo non mi sta chiedendo il prezzo: mi sta chiedendo il perché.` }
              : { think: `Non ho ancora un conto che parli la sua lingua. Mi chiede il prezzo, e io non ho il perché in tasca.` },
          ],
          prompt: `Un socio che non avevi mai mappato ti ferma nel corridoio. Come rispondi?`,
          hint: `Chi non ha mai visto il caso ragiona in prezzo. Come lo porti a ragionare in rischio?`,
          tip: `Nelle aziende di famiglia il potere informale conta quanto l’organigramma: un socio che compare a un passo dalla firma può fermare tutto. Trattalo da stakeholder: ascolta cosa teme, non difenderti, e dagli un modo di arrivare da solo alla stessa conclusione di chi decide.`,
          choices: [
            ch('a', 3, `Lorenzo, fa bene a chiedere. Mi dica cosa vorrebbe vedere perché la spesa le sembri giustificata: lo metto nel caso che stiamo preparando.`,
              (d) => (d.flags.rightsized
                ? `Hai trattato Lorenzo da stakeholder, non da ostacolo: la Fase 1 regge meglio se chi la discute è stato ascoltato prima che qualcuno gliela difenda. La sua domanda diventa una porta, non un blocco.`
                : `Hai ascoltato invece di difenderti: Lorenzo non cerca lo sconto, vuole capire se la spesa protegge i clienti. Senza una Fase 1 definita, però, hai poche cifre da mettergli davanti.`),
              (d) => ({ t: 5, c: 6, r: d.flags.rightsized ? -6 : -3 }), {
                set: { fratelloOk: true }, next: 'RET',
                say: `Lorenzo, fa bene a chiedere. Mi dica cosa vorrebbe vedere perché questa spesa le sembri giustificata, e lo metto nel caso che Aldo e Mirko stanno preparando. Il confronto con Cesena, se vuole, lo facciamo sugli stessi numeri.`,
                react: [
                  { w: 'lorenzo', a: `si ferma, ci pensa`, t: `Cosa vorrei vedere. Eh. Quanti clienti ci stiamo giocando, e se i camion arrivano meno in ritardo. Il resto lo capisce Aldo; io mi fido dei numeri.` },
                  { think: `Non mi ha chiesto lo sconto. Mi ha chiesto un perché.` },
                ],
              }),
            ch('b', 1, `Gli spiego che un gestionale di quel tipo non regge trecento consegne al giorno: senza integrazioni né garanzie, a conti fatti costerebbe di più.`,
              `Smontare un concorrente che non conosci, davanti a chi lo ha già scelto nella sua testa, non convince: lo irrigidisce. Hai difeso il tuo prodotto prima di capire cosa teme Lorenzo.`,
              { t: -5, c: -3, r: 6 }, {
                set: { fratelloKo: true }, next: 'RET',
                say: `Lorenzo, un gestionale di quel tipo non regge trecento consegne al giorno. Senza integrazioni e senza garanzie sui tempi, a conti fatti vi costerebbe di più.`,
                react: [
                  { w: 'lorenzo', a: `con un mezzo sorriso`, t: `Lo dice uno che il gestionale di Cesena non l’ha mai visto. Strano, eh.` },
                  { think: `Ho smontato un concorrente che non conosco davanti a un uomo che lo ha già scelto, nella sua testa.` },
                ],
              }),
            ch('c', 0, `Gli propongo subito di rivedere il prezzo: se il problema è la cifra, la faccio costare meno e la chiudiamo senza un altro giro di riunioni.`,
              `Hai offerto un compromesso sul prezzo a chi non aveva ancora visto il valore: ora per Lorenzo il listino è una trattativa, e per Mirko una trattativa che non si chiude mai.`,
              { t: -4, v: -6, c: -2, r: 6, d: 8 }, {
                set: { fratelloKo: true }, next: 'RET',
                say: `Lorenzo, se il problema è la cifra ne parliamo subito: posso farla costare meno, e la chiudiamo senza un altro giro di riunioni.`,
                react: [
                  { w: 'lorenzo', a: `senza sorpresa`, t: `Vedi? Basta chiedere. Allora un altro po’ lo togli anche domani.` },
                  { w: 'mirko', a: `a mezza voce`, t: `Così non ne usciamo.` },
                ],
              }),
            ch('d', 2, `Dico a Lorenzo che è giusto che ne parli con calma: fisso una mezz’ora in cui gli presento il caso, insieme a Mirko e al direttore finanziario.`,
              `Una mossa ordinata: non rispondi in corridoio a una domanda che merita carte, e dai a Lorenzo un posto al tavolo. Rimandi però il confronto, e in famiglia il tempo lavora per chi dubita.`,
              { t: 3, c: 4, r: -2 }, {
                set: { fratelloOk: true }, next: 'RET',
                say: `Lorenzo, è giusto che ne parli con calma. Fisso una mezz’ora in cui le presento il caso di persona, insieme a Mirko e al direttore finanziario: così ha davanti i numeri, non le mie parole.`,
                react: [
                  { w: 'lorenzo', a: `guarda l’orologio`, t: `Mezz’ora. Va bene, ma voglio i numeri, non le slide. E porta qualcuno che sappia di camion.` },
                  { n: `Mirko segna sul telefono: “Lorenzo, giovedì”. Sembra sollevato.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'sciopero', title: `Sciopero degli autisti`, w: 1, after: ['n5'],
        node: {
          when: `Giovedì · 06:50`, view: 'walk', where: `Piazzale · sede Logistica Adriatica · giovedì 06:50`,
          scene: (d) => [
            { n: `Alle sei e cinquanta il piazzale è un parcheggio dove nessuno parcheggia. Trentadue camion in fila, motori spenti, cabine al buio. Davanti al cancello una dozzina di autisti con i giubbotti catarifrangenti e un cartello scritto a mano: “Turni di notte: pagateli”.` },
            { n: `Mirko ti aveva scritto alle sei: “Non venire, c’è sciopero”. Il messaggio lo leggi adesso, fermo davanti al cancello, con le carte per Aldo sotto il braccio.` },
            { w: 'franco', a: `si stacca dal gruppo, sguardo diretto`, t: `Lei è quello del sistema nuovo? Quello dei localizzatori sui camion? In mensa non si parla d’altro. Dicono che ci vogliono controllare anche in bagno.` },
            d.flags.rightsized
              ? { think: `Il progetto che Aldo ha detto di poter approvare gira su questi camion. Se qui dentro lo scambiano per una sorveglianza, nessun contratto sopravvive al primo mese.` }
              : { think: `Il tracking vive o muore su questi camion. E io ho parlato con tutti, tranne che con chi li guida.` },
          ],
          prompt: `Il rappresentante degli autisti ti sbarra la strada. Come rispondi?`,
          hint: `Chi usa un sistema ogni giorno può farlo funzionare o affondarlo. Cosa puoi dire senza promettere ciò che non controlli?`,
          tip: `Nei progetti di tracking gli utenti finali sono stakeholder, non comparse: se temono il controllo, il progetto muore dopo la firma. Ascolta prima di rassicurare, e prometti solo ciò che puoi garantire per iscritto.`,
          choices: [
            ch('a', 3, `La ascolto: cosa temete, esattamente? Poi le dico cosa può fare il sistema e cosa no, e propongo un vostro rappresentante nel gruppo di progetto.`,
              (d) => (d.flags.rightsized
                ? `Hai trattato gli autisti da utenti da coinvolgere, non da convincere: il tracking della Fase 1 si gioca qui, sul piazzale, molto più che nella stanza di Aldo. Franco non è più una minaccia al rollout.`
                : `Hai trattato gli autisti da utenti da coinvolgere, non da convincere: il tracking si gioca qui, sul piazzale, molto più che nella stanza di Aldo. Franco non è più una minaccia al rollout, ma il perimetro resta tutto da definire.`),
              (d) => ({ t: 6, c: d.flags.rightsized ? 8 : 5, r: -5 }), {
                set: { autistiOk: true }, next: 'RET',
                say: `Mi dica lei cosa teme, esattamente: la ascolto. Poi le dico con chiarezza cosa può fare il sistema e cosa no, e propongo che un vostro rappresentante partecipi alla scelta di come usarlo.`,
                react: [
                  { w: 'franco', a: `dopo un lungo silenzio`, t: `Nessuno ce l’ha mai chiesto, cosa temiamo. Di solito ce lo dicono dopo.` },
                  { n: `Parlate dieci minuti, in piedi, accanto al cancello. Alla fine ti stringe la mano senza aggiungere altro.` },
                  { think: `Non ho venduto niente. Ho tolto una mina dal contratto prima che esplodesse.` },
                ],
              }),
            ch('b', 1, `Gli garantisco che nessuno controllerà nessuno: il sistema traccia i mezzi, non le persone, e se serve lo metto nero su bianco nel contratto con l’azienda.`,
              `Rassicurare è giusto, garantire ciò che non controlli no. Una promessa che l’azienda può smentire il giorno dopo la firma brucia la tua credibilità con gli utenti, e sono loro a far vivere o morire il progetto.`,
              { t: -2, c: -3, r: 5 }, {
                next: 'RET',
                say: `Le garantisco che nessuno controllerà nessuno: il sistema traccia i mezzi, non le persone, e lo metto nero su bianco nel contratto.`,
                react: [
                  { w: 'franco', a: `non si muove`, t: `Lo mette nel suo contratto. Ma il contratto con noi lo firma Aldo, non lei. Cosa fanno dei dati lo decidono loro.` },
                  { think: `Ho promesso una cosa che non dipende da me.` },
                ],
              }),
            ch('c', 2, `Non è il momento: lo saluto, lascio le carte a Mirko e me ne vado. Se ne parla a sciopero finito, con calma, con Aldo e Mirko presenti.`,
              `Rispettare il picchetto è corretto, ma la domanda sul controllo resta aperta, e prima o poi qualcuno dovrà rispondere. Se non sei tu, sarà qualcun altro, con meno informazioni.`,
              { t: 1, c: 1 }, {
                next: 'RET',
                say: `Non è il momento, e lo capisco. Le lascio le carte per Mirko e vado via. Ne parliamo a sciopero finito, con Aldo e Mirko presenti.`,
                react: [
                  { w: 'franco', a: `con un cenno`, t: `Così va bene. Ma quella domanda non sparisce se non rispondete voi.` },
                  { n: `Lasci le carte in portineria. Nello specchietto, mentre vai via, il cartello è l’ultima cosa che vedi.` },
                ],
              }),
            ch('d', 0, `Scrivo subito ad Aldo che c’è un malumore da gestire e che posso presentare il sistema agli autisti, con una riunione in mensa questa mattina.`,
              `Sfruttare uno sciopero per presentare il tuo prodotto è un errore di lettura: per gli autisti sei parte del problema, per Aldo sei uno che non sa leggere il momento.`,
              { t: -5, c: -4, r: 7 }, {
                next: 'RET',
                say: `Scrivo subito ad Aldo: c’è un malumore da gestire, e io posso presentare il sistema agli autisti con una riunione in mensa, questa mattina stessa.`,
                react: [
                  { w: 'mirko', a: `al telefono, secco`, t: `Una riunione in mensa durante lo sciopero? Aldo l’ha letta come una provocazione. Fermati, per favore.` },
                  { think: `Ho portato un’agenda di vendita dentro una vertenza sindacale.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'ad_vende', title: `L’AD vende l’azienda`, kind: 'neg', w: 2,
        hit: (d) => !(d.flags.rightsized && d.flags.mutualPlan),
        dp: -0.38, dpProt: -0.04,
        hitText: `Alle 9:40 una mail interna firmata Aldo Fabbri annuncia la cessione di {client} a un gruppo di Milano. Il nuovo azionista sospende ogni impegno pluriennale in attesa della due diligence. Il tuo contratto non è abbastanza avanti da reggere un cambio di proprietà, e Aldo ha ormai ben altro a cui pensare: Mirko non ha il peso per difenderlo. La telefonata di Mirko dura quindici secondi: “Ti richiamo io”.`,
        protText: `Alle 9:40 una mail interna firmata Aldo Fabbri annuncia la cessione di {client} a un gruppo di Milano. Il tuo contratto è la Fase 1: un impegno ordinario, già nel circuito del finanziario con le date scritte. Aldo lo cita come esempio di “spesa che protegge i ricavi” e il legale dell’acquirente chiede una conferma, che ottiene in giornata. Si rallenta di qualche giorno, non di un trimestre.`,
      },
      {
        id: 'budget_ai_mezzi', title: `Il budget va ai mezzi`, kind: 'neg', w: 1,
        hit: (d) => !(d.flags.event && (d.mp.has('M') || d.flags.rightsized)),
        dp: -0.27, dpProt: -0.03,
        hitText: `Alle 8:15 tre motrici restano ferme in officina e altre due vengono ritirate per revisione. Il consiglio sposta in blocco il budget degli investimenti sul rinnovo dei mezzi: la voce “sistemi” è azzerata. Nessuno ha scritto da nessuna parte quanto costa a {client} non vedere i propri camion, e nessuno ha un argomento per salvarla. “Ne riparliamo a primavera”, ti scrive Mirko.`,
        protText: `Alle 8:15 tre motrici restano ferme in officina e il consiglio sposta il budget degli investimenti sul rinnovo dei mezzi. Ma il tuo progetto non è più una voce “sistemi”: è il modo in cui {client} evita un altro TrasportiNord, e Aldo lo ripete in consiglio con parole sue. Esce dal taglio con una riga a margine: “Questo protegge il fatturato dei mezzi che abbiamo”.`,
      },
      {
        id: 'cliente_minaccia', title: `Un altro cliente grande minaccia di andarsene`, kind: 'pos', w: 1,
        hit: (d) => d.mp.has('E') && !!d.flags.event,
        dp: 0.12, dpProt: 0,
        hitText: `Alle 8:30 Aldo riceve una lettera da uno dei tre clienti grandi: se entro dicembre non c’è visibilità in tempo reale sulle consegne, il contratto va in gara. Telefona a te prima ancora che al direttore finanziario: “Mi dica cosa serve per firmare questa settimana, le date le anticipiamo noi”. Hai l’accesso a chi decide e un motivo che adesso ha anche una scadenza esterna: per una volta la fretta è sua.`,
        protText: `Un altro cliente grande di {client} scrive una lettera dura: o la visibilità sulle consegne arriva entro dicembre, o il contratto va in gara. Tu, però, non hai una strada diretta verso chi decide, né un motivo che il cliente senta suo. Mirko ti chiama emozionato, ma non sa a chi portare la notizia: Aldo non ti conosce e, quando cerca chi lo aiuti, chiama un altro fornitore.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Commit al 90%: “Mirko dice che ci siamo, il budget lo troviamo”`,
      people: {
        E: `Aldo Fabbri (AD)`, C: `Mirko Tesei`, Dp: `Aldo Fabbri e il direttore finanziario`,
        P: `il direttore finanziario e il legale di Logistica Adriatica`, M: `Aldo Fabbri e il suo direttore finanziario`,
        I: `Aldo Fabbri e Mirko Tesei`, Dc: `Aldo Fabbri e Mirko Tesei`, Co: `il “non fare niente” e il tracking di oggi`,
      },
      risk: `Il rischio vero è che Aldo rimandi tutto “a primavera”: finché il costo di non decidere pesa su di te e non su di lui, il deal resta uno zombie.`,
      custom: [
        {
          id: 'budget_approvato', if: () => true, has: (d) => !!(d.flags.rightsized && d.flags.mutualPlan && d.mp.has('E')),
          q: `Hai visto il budget approvato, o è il “lo troviamo” di Mirko? Dimmi dov’è scritto e chi l’ha firmato.`,
          evidence: `Aldo ha detto davanti a me che la Fase 1 da €340k la può approvare, e ha girato il piano con le date al direttore finanziario. Il piano con le date è in mano a Mirko, che ne è il referente.`,
          honest: `No: ho il “lo troviamo” di Mirko e, nel migliore dei casi, qualcosa detto a voce da Aldo. Il budget scritto non l’ho visto. Fino ad allora non lo chiamo Commit.`,
          bluff: `Sì, il budget c’è: Aldo l’ha confermato e Mirko ha già il codice di spesa. Manca solo la firma formale.`,
          vague: `Mirko dice che a fine anno il budget si trova, e di lui mi fido: sono quattordici mesi che lavoriamo insieme.`,
          react: {
            evidence: `Questo è un fatto: Aldo che dice “posso approvarlo” davanti a te, più un piano con le date che ha girato lui. Mandamelo, e per me resta dov’è.`,
            honest: `Grazie, è la risposta che mi serve. Allora Best Case, e ti dico io come arrivare alla riga di bilancio: lo chiedi al direttore finanziario, non a Mirko.`,
            bluffCaught: `Nel CRM non c’è nessun codice di spesa, e il nome di Aldo compare in una sola nota, tua, di mesi fa. Non cerco il colpevole, cerco la carta. Si riparte dal budget.`,
            bluffPassed: `Va bene, lo scrivo. Ma il codice di spesa lo voglio vedere entro venerdì: se non c’è, lo sposto io e ne parliamo.`,
            vague: `“Mi fido di Mirko” non è un budget. Quattordici mesi di simpatia non valgono una riga di bilancio. Dimmi dov’è scritto.`,
          },
        },
        {
          id: 'chi_firma', if: () => true, has: (d) => !!(d.flags.ebEngaged && d.mp.has('M')),
          q: `Chi firma, e quando l’hai incontrato? Con le parole sue, non quelle di Mirko.`,
          evidence: `Aldo Fabbri, l’AD. L’ho incontrato nella sua sede: venti minuti. Mi ha detto che il problema gli è costato il dieci per cento del fatturato e mi ha chiesto un caso con i numeri per il 15.`,
          honest: `Aldo l’ho visto una volta, per venti minuti. Una sua frase di sostegno o una data scritta da lui non le ho. Fino ad allora non lo chiamo Commit.`,
          bluff: `Aldo è con noi: l’ho incontrato e mi ha detto che il progetto si fa. Sulla firma non vedo problemi.`,
          vague: `Aldo è un tipo pratico: quando decide, decide in fretta. Mirko dice che è dalla nostra parte.`,
          react: {
            evidence: `Un numero suo, detto a te, e una data. Questo è un decisore che hai davvero incontrato. Segnati la data del 15 e portami l’esito.`,
            honest: `Venti minuti e nessun impegno: grazie per averlo detto. Allora Best Case, e prepariamo insieme cosa portargli la prossima volta.`,
            bluffCaught: `Nel CRM la nota su Aldo dice “indifferente, troppi progetti”. Non c’è nessun “il progetto si fa”. Rifacciamolo con i fatti.`,
            bluffPassed: `Va bene, lo scrivo. Ma voglio una frase di Aldo per iscritto, anche tre righe di Mirko che la riportano, entro giovedì.`,
            vague: `“Mirko dice che è dalla nostra parte” è la voce di Mirko, non quella di Aldo. Portami una frase sua, con la data.`,
          },
        },
        {
          id: 'data_perdita', if: () => true, has: (d) => !!(d.flags.event && d.mp.has('M') && d.flags.mutualPlan),
          q: `Qual è la data in cui, se non firmano, perdono qualcosa? Una data loro, non il nostro fine trimestre.`,
          evidence: `Una scadenza esterna precisa no, ma un costo sì: a settembre hanno perso il dieci per cento del fatturato con TrasportiNord, e Aldo ha chiesto il conto sugli altri tre clienti grandi. Il 28 è la data del piano che ha girato lui al finanziario: se salta, si scivola di un trimestre con lo stesso rischio aperto.`,
          honest: `Una data loro non ce l’ho. Ho il nostro fine trimestre, ma per il cliente nessuno ha scritto cosa si perde se slitta. Finché è così non lo chiamo Commit.`,
          bluff: `Il 28: dopo quella data il progetto non rientra nel budget dell’anno e Aldo l’ha detto chiaramente. Per loro è una scadenza vera.`,
          vague: `Hanno fretta anche loro, si vede: Mirko dice che prima si firma e meglio è per tutti.`,
          react: {
            evidence: `Questa è la risposta che cerco: un costo vero, un nome e una data scritta da lui. Una scadenza loro, non solo nostra. Per me regge.`,
            honest: `Bene che tu lo dica. Una scadenza senza una conseguenza è solo un desiderio. Mettiamoci questa settimana a trovarla insieme, partendo da Aldo.`,
            bluffCaught: `Sul CRM non c’è nessuna nota di Aldo sul budget dell’anno. C’è una tua riga di qualche settimana fa, e basta. Non mi serve una scadenza perfetta: mi serve una vera.`,
            bluffPassed: `Ok. Ma voglio il nome di chi, da loro, lo ha confermato. Entro giovedì, o lo sposto io.`,
            vague: `“Hanno fretta anche loro” è una sensazione. Una data in cui perdono qualcosa è un fatto. Torniamo a parlarne con un fatto in mano.`,
          },
        },
      ],
    },

    endings: {
      won: `Aldo firma. Dopo quattordici mesi di “ci siamo”, il contratto ha finalmente il suo nome sopra, e sulla mappa di Mirko i puntini ricominciano a muoversi. Alla pipeline review Marta fa una sola domanda: “Quando applichiamo lo stesso metodo agli altri zombie?”.`,
      lost: `Aldo rimanda tutto “a primavera”. Il deal resta nel CRM con il nome di sempre e una stima ottimistica ritoccata. A giugno ci sarà una decima demo, e Mirko dirà che ci siamo.`,
      slip: `Il progetto non muore, ma non parte: slitta al trimestre successivo, con una data nuova e una probabilità, finalmente, un po’ più onesta.`,
      disq: `Hai chiuso la trattativa prima che si mangiasse un altro trimestre, senza rancore e con la porta socchiusa. Il tempo che recuperi è tempo di vendita vero, su deal che hanno una firma in vista.`,
    },
    lessons: [
      { if: (d) => d.flags.event, good: true, t: `Hai scoperto il motivo per decidere: la perdita di TrasportiNord. Un compelling event è spesso già lì, in azienda, e aspetta solo che qualcuno lo colleghi al progetto.` },
      { if: (d) => !d.flags.event, good: false, t: `Senza un motivo per decidere adesso, un deal può restare in Commit per anni. L’entusiasmo del contatto non è un budget, e dieci demo non sono un motivo.` },
      { if: (d) => d.flags.inflated, good: false, t: `Hai mantenuto in Commit un deal non qualificato: stai raccontando al management una storia che non conosci ancora, e il CRM la ricorderà meglio di te.` },
      { if: (d) => d.flags.rightsized, good: true, t: `Hai ridotto il perimetro invece del prezzo: €340k firmabili valgono più di €900k sperati.` },
      { if: (d) => d.flags.mutualPlan, good: true, t: `Un piano di chiusura con date reciproche ti ha dato un calendario condiviso invece di un tuo desiderio.` },
      { if: (d) => d.flags.ebEngaged, good: true, t: `Hai ottenuto il tempo del decisore. Quello che conta è come lo usi: parlare del suo dolore vale più di un’altra demo.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
