/* Scenario 2 · Meccanica Brenta · azienda familiare, relazione, concorrente locale, promesse
   v2: officina e relazione. Prima persona, widget firma (mappa del potere, verso la fiera, il dolore in numeri),
   imprevisti, shock del giorno di chiusura e domande di forecast. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    gianni: { name: `Gianni Brenta`, role: `Fondatore e Presidente`, hue: 38 },
    francesca: { name: `Francesca Brenta`, role: `CFO · il tuo champion`, hue: 335 },
    sergio: { name: `Sergio Dal Bianco`, role: `Direttore di Produzione`, hue: 212 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
    pegoraro: { name: `Renzo Pegoraro`, role: `Titolare · InfoSistemi Nordest`, hue: 98 },
    maran: { name: `Lorenzo Maran`, role: `Acquisti · cliente storico`, hue: 12 },
  };
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });
  /* i widget devono reggere anche uno stato vuoto o parziale: hist, flags, mp e m possono mancare */
  const visited = (d, node) => ((d && d.hist) || []).some((h) => h.node === node);
  const chose = (d, node, id) => ((d && d.hist) || []).some((h) => h.node === node && h.id === id);
  /* chi ha fatto il giro con Gianni (n1 b, c) arriva all’imprevisto in fiducia; chi lo ha saltato o ha fatto il pitch, no */
  const warmN1 = (d) => chose(d, 'n1', 'b') || chose(d, 'n1', 'c');
  /* Gianni ti fa entrare dal cliente storico solo se hai fatto il giro con lui e non hai messo Sergio contro di te */
  const invitedByGianni = (d) => warmN1(d) && !(d.flags || {}).sergioHostile;

  CL.registerScenario({
    id: 'brenta',
    title: `Il Titolare`,
    client: `Meccanica Brenta S.r.l.`,
    sector: `Manifattura · Vicenza`,
    hook: `Il fondatore compra le persone, la figlia compra i numeri, il capo reparto non compra niente.`,
    brief: `ERP cloud con modulo di produzione per una meccanica di precisione veneta: 380 dipendenti, tre stabilimenti, gestionale vecchio di vent’anni. €260k di ACV a listino. Gianni Brenta, 71 anni, decide. Sua figlia Francesca, CFO, ti vuole. Un rivenditore locale è arrivato con il 35% in meno.`,
    scout: `Gianni conosce da vent’anni il titolare del concorrente locale. Francesca è il tuo champion ma non firma. Il direttore di produzione Sergio non è stato coinvolto e ha già detto ai capi reparto che “è la solita moda”.`,
    teaches: [`Aziende familiari`, `Concorrente locale`, `Stakeholder resistente`, `Promesse realistiche`],
    list: 260, cost: 2, window: [1, 10], stars: 2, lep: 15, slip: 0.35,
    noWild: ['rival_offer'],   // imprevisti generici che stonano con questo scenario
    noShock: ['g_price_cut', 'g_rival_withdraws', 'g_buyer_change', 'g_champion_moves', 'g_board_postpones', 'g_last_haggle', 'g_signer_away', 'g_board_accelerates'],   // shock generici che stonano con questo scenario (il CFO è Francesca, figlia del fondatore: non lascia né cambia incarico)
    crm: { cat: `Best Case`, prob: 50 },
    cast: CAST,

    /* ───── identità: officina e relazione ───── */
    theme: {
      id: 'factory', label: `Meccanica Brenta · Vicenza`, bg: 'factory',
      accent: '#b8610a', accentDark: '#f0a04b', ambience: 'factory',
      motto: `A Brenta si firma con una stretta di mano. Per questo non si dà mai alla leggera.`,
    },
    intro: {
      when: `Martedì · 09:40`, where: `In auto, verso Vicenza`, view: 'car',
      scene: [
        { n: `La nebbia di novembre ha mangiato la provinciale. I fari davanti a te compaiono a venti metri e spariscono, e i capannoni escono dal grigio uno alla volta, con le insegne spente e i piazzali già pieni.` },
        { think: `Trecentottanta persone, tre stabilimenti, un gestionale vecchio di vent’anni. E sulla scrivania di Francesca un preventivo con il 35% in meno.` },
        { chat: { from: 'francesca', app: 'WhatsApp' }, t: `Papà è in reparto dalle sette. Prima delle slide vuole farti vedere le macchine, quindi scarpe antinfortunistiche. Se non le hai, in magazzino ne abbiamo di tutte le misure.`, sfx: 'ping' },
        { n: `Abbassi il finestrino per leggere il civico. Entra l’aria fredda, e con quella l’odore: olio da taglio, ferro appena tagliato, il dolce un po’ amaro dell’emulsione.` },
        { think: `Il fondatore compra le persone. La figlia compra i numeri. Sergio, il capo reparto, non compra niente, e ha già detto ai suoi che è “la solita moda”.` },
        { n: `Il cancello scorre da solo, con un cigolio che sembra un saluto. Dietro, il piazzale, la lamiera grigia e una luce gialla accesa sopra una porta.` },
      ],
    },

    /* ───── widget firma ───── */
    hud: [
      {
        type: 'stakeholders', title: `La mappa della famiglia`,
        build: (d) => {
          const f = d.flags || {}, has = (k) => !!d.mp && d.mp.has(k), t = (d.m && d.m.trust) || 0, disc = d.disc || 0;
          /* Gianni: la fiducia decide tutto, ma la promessa su marzo pesa */
          const gSt = t >= 72 ? 'champion' : t >= 55 ? 'ally' : t >= 28 ? 'neutral' : 'skeptic';
          const gNote = f.overpromise ? `Ha la tua parola su marzo. Se manca, sarà il primo a ricordartelo.`
            : f.giveGet && t >= 55 ? `Ha trattato e si sente vincitore: “mi fa pagare quando funziona”.`
              : gSt === 'champion' ? `Parla di te agli amici. Ormai la partita è anche sua.`
                : gSt === 'ally' ? `Si fida: con te parla da persona, non da cliente.`
                  : gSt === 'neutral' ? `Ti ascolta, ma la mano non l’ha ancora stretta davvero.`
                    : `Cortese e lontano: per lui Nexora è ancora solo un biglietto da visita.`;
          /* Francesca: ha bisogno di numeri e di una data che regga */
          const numeri = has('Co') || has('M');
          const late = visited(d, 'n5x'); /* si accorge solo dopo il piano di Davide, non appena scelta la mossa che porta a n5x */
          let fSt, fNote;
          if (f.overpromise) { fSt = late ? 'skeptic' : 'neutral'; fNote = late ? `Non si fida più della tua data e deve spiegarla al padre.` : `Ha sentito la promessa su marzo. Non ha detto niente, e dice abbastanza.`; }
          else if (chose(d, 'n3', 'b') && !numeri) { fSt = 'skeptic'; fNote = `Non ha gradito che si parlasse male di gente che la famiglia conosce da vent’anni.`; }
          else if (disc >= 30) { fSt = 'neutral'; fNote = `Ha visto il prezzo cadere del 35% in un giorno. Si chiede quanto valga il resto.`; }
          else if (numeri) { fSt = 'champion'; fNote = f.paperReady ? `Porta il piano alla banca e firma i documenti: ormai gioca la tua partita.` : `Ha le sue ragioni, con i numeri: adesso ha qualcosa da portare al padre.`; }
          else { fSt = 'ally'; fNote = `Ti vuole, ma le serve una ragione con i numeri da portare al padre.`; }
          /* Sergio: o ha la regia del pilota, o aspetta che il sistema inciampi */
          let sSt, sNote;
          if (f.sergioOn) { sSt = f.paperReady || f.phased ? 'champion' : 'ally'; sNote = f.paperReady ? `Il pilota ha il suo nome nel piano. Ne parla ai capi reparto come di una cosa sua.` : `Ha scelto lui da dove cominciare: ricerca dei disegni e fogli di avanzamento.`; }
          else if (f.sergioHostile) { sSt = 'hostile'; sNote = visited(d, 'n6') ? `Il suo ruolo è rimasto fuori dal contratto: “Vedremo come funziona il vostro sistema”.` : `Cortese e di ghiaccio: “La direzione decide, io lavoro”.`; }
          else { sSt = 'skeptic'; sNote = `Non è stato coinvolto e ha già detto ai suoi che è “la solita moda”.`; }
          /* InfoSistemi: quanto è ancora una minaccia, tra amicizia e prezzo */
          let th = 3;
          if (t >= 58) th--;
          if (t >= 72) th--;
          if (f.phased) th--;
          if (f.sergioOn) th--;
          else if (f.sergioHostile) th++;
          if (f.overpromise) th++;
          th = Math.max(0, Math.min(3, th));
          const pSt = th >= 3 ? 'hostile' : th === 2 ? 'skeptic' : 'neutral';
          const pNote = f.overpromise && th >= 2 ? `Aspetta marzo: se la data salta, il suo preventivo torna sul tavolo.`
            : th >= 3 ? `Il 35% in meno e vent’anni di amicizia con Gianni. Per ora è lui il favorito del cuore.`
              : th === 2 ? `È ancora in gioco, con il prezzo e l’amicizia. Ma non è più l’unica voce.`
                : th === 1 ? `Resta il vecchio amico di Gianni. Sul progetto non detta più i tempi.`
                  : `Sullo sfondo: resta l’amico di una vita, ma il progetto non passa più da lui.`;
          return [P('gianni', gSt, gNote), P('francesca', fSt, fNote), P('sergio', sSt, sNote), P('pegoraro', pSt, pNote)];
        },
      },
      {
        type: 'timeline', title: `Verso la fiera di marzo`,
        build: (d) => {
          const f = d.flags || {};
          const items = [
            { k: 'pact', t: `Nov`, label: f.overpromise ? `Con Gianni: tutto in produzione per marzo, a parole` : f.phased ? `Con Gianni: il reparto pilota per la fiera` : visited(d, 'n4') ? `Con Gianni: cosa vedrà a marzo, ancora aperto` : `Con Gianni: cosa vedrà alla fiera di marzo`, st: f.overpromise ? 'late' : f.phased ? 'done' : 'todo' },
            { k: 'sergio', t: `Nov`, label: f.sergioOn ? `Sergio alla guida del pilota` : f.sergioHostile ? `Sergio fuori dal pilota, in attesa` : `Portare Sergio dentro il pilota`, st: f.sergioOn ? 'done' : f.sergioHostile ? 'late' : 'todo' },
            { k: 'paper', t: `Dic`, label: f.paperReady ? `Piano firmato, leasing avviato in banca` : `Piano di progetto e leasing in banca`, st: f.paperReady ? 'done' : visited(d, 'n6') ? 'late' : 'todo' },
            { k: 'pilot', t: `Mar`, label: f.overpromise ? `Fiera: tutto in produzione, come promesso` : f.phased ? `Il reparto pilota alla fiera` : `Il reparto pilota, da definire`, st: f.overpromise ? 'late' : 'todo' },
            { k: 'ext', t: `Giu`, label: `L’estensione ai reparti principali`, st: 'todo' },
            { k: 'golive', t: `Ago`, label: `Go-live nei tre stabilimenti`, st: 'todo' },
          ];
          const first = items.findIndex((x) => x.st === 'todo');
          if (first >= 0) items[first].st = 'now';
          return { items };
        },
      },
      {
        type: 'kpis', title: `Il dolore in numeri`,
        build: (d) => {
          const has = (k) => !!d.mp && d.mp.has(k), value = (d.m && d.m.value) || 0;
          /* i numeri si rivelano man mano che li senti: ognuno compare solo dopo la scena in cui qualcuno lo dice */
          const tabella = chose(d, 'n3', 'c'); /* il confronto a cinque anni fatto con Francesca */
          const kClose = chose(d, 'n1', 'a') || chose(d, 'n1', 'c') || tabella;
          const kLate = chose(d, 'n1', 'b') || tabella;
          const kSheets = chose(d, 'n2', 'b') || chose(d, 'n2', 'c') || chose(d, 'wild:fermo_macchina', 'a');
          const kCost = tabella || value >= 44;
          const tg = (s) => (has('M') ? s : undefined);
          return [
            kClose ? { k: 'close', label: `Chiusura del mese`, value: `19 gg`, delta: `+5 gg`, tone: 'bad', spark: [14, 15, 17, 19], target: tg(`6 gg`) }
              : { k: 'close', label: `Chiusura del mese`, value: `?`, tone: 'neutral' },
            kSheets ? { k: 'sheets', label: `Fogli di carta a turno`, value: `118`, delta: `+40`, tone: 'bad', spark: [78, 92, 105, 118], target: tg(`15`) }
              : { k: 'sheets', label: `Fogli di carta a turno`, value: `?`, tone: 'neutral' },
            kLate ? { k: 'late', label: `Consegne in ritardo`, value: `17%`, delta: `+8 pt`, tone: 'bad', spark: [9, 11, 14, 17], target: tg(`5%`) }
              : { k: 'late', label: `Consegne in ritardo`, value: `?`, tone: 'neutral' },
            kCost ? { k: 'cost', label: `Costo dei ritardi, anno`, value: tabella ? `€310k` : `~€300k`, tone: 'warn' }
              : { k: 'cost', label: `Costo dei ritardi, anno`, value: `?`, tone: 'neutral' },
          ];
        },
      },
    ],

    start: { t: 30, v: 28, u: 30, c: 30, r: 42, have: ['I', 'E', 'C'] },
    caps: [
      { id: 'trust', max: 0.35, if: (d) => d.m.trust < 55, why: `Il titolare firma di chi si fida. Sotto il 55% di Fiducia, l’offerta del concorrente locale basta a spazzarti via.` },
      { id: 'sergio', max: 0.55, if: (d) => !d.flags.sergioOn, why: `Senza Sergio dalla tua parte il progetto parte ma non decolla: la direzione lo sa e frena.` },
      { id: 'promise', max: 0.40, if: (d) => d.flags.overpromise, why: `Hai promesso una data impossibile. Finché non la correggi, il deal è appoggiato a una bugia.` },
    ],

    nodes: {
      n1: {
        when: `Martedì · 10:00`, view: 'walk',
        where: `Stabilimento Brenta · martedì 10:00`,
        scene: [
          { n: `Parcheggi accanto a una Panda grigia con il cofano ancora tiepido. Il capannone è lamiera e nebbia; sopra il portone, una vecchia insegna in ferro battuto: MECCANICA BRENTA, con la B ammaccata da un colpo di muletto.` },
          { w: 'francesca', a: `ti viene incontro, giaccone da officina sopra il tailleur`, t: `Eccoti. Papà ti aspetta in reparto, non in ufficio. A me serve mezz’ora sui numeri, ma per lui conta come ti comporti.` },
          { n: `Una porta di ferro, un corridoio che sa di caffè e di olio. Poi si apre il reparto, e il rumore ti arriva addosso tutto insieme: compressori, mandrini, il sibilo dell’aria. Gianni è lì, accanto a una macchina verde scuro, con la giacca blu da lavoro e le mani dietro la schiena.` },
          { w: 'gianni', a: `ti stringe la mano un secondo di troppo`, t: `Prima di parlare di computer, venga a vedere le macchine. Ho comprato la prima nel 1984: è questa. Poi parliamo.` },
          { think: `Un secondo di troppo. Mi sta misurando la mano, non il curriculum.` },
          { n: `Sul fianco della macchina c’è una targhetta d’ottone consumata dalle dita. Più in là, nei carrelli, le commesse sono fogli di carta infilati come bandierine.` },
          { think: `Fogli ovunque. Il gestionale sta in un ufficio: la fabbrica gira su questi.` },
        ],
        prompt: `Gianni ti ha appena offerto il giro. Cosa rispondi?`,
        hint: `Con il fondatore la relazione è la porta d’ingresso. Ma l’obiettivo resta capire il business.`,
        tip: `Nelle aziende familiari l’Economic Buyer compra la persona prima del progetto. Dedica tempo vero alla relazione e usalo per scoprire il dolore, non solo per fare simpatia.`,
        choices: [
          ch('a', 0, `La ringrazio, Presidente, ma ho poco tempo oggi: se per lei va bene parto dai numeri con Francesca, e il giro lo facciamo la prossima volta.`,
            `Con un fondatore la fretta si legge come disinteresse. L’invito al giro non era una cortesia: era il colloquio, e hai chiesto di saltarlo.`,
            { t: -10, c: -4, r: 8 }, {
              next: 'n2',
              say: `La ringrazio, Presidente, ma ho poco tempo oggi. Se per lei va bene partirei dai numeri con Francesca, e il giro lo facciamo la prossima volta.`,
              react: [
                { w: 'gianni', a: `sorride, ma gli occhi no`, t: `I giovani hanno sempre fretta. Va bene, va bene: i numeri sono di là.` },
                { n: `Si volta verso la sua macchina e le dà una pacca sul fianco, come a un cavallo. Francesca ti guarda con compassione e rassegnazione insieme.` },
                { w: 'francesca', a: `in amministrazione, aprendo il file`, t: `Il mese lo chiudiamo in diciannove giorni. Quando sono entrata io erano quattordici.` },
                { think: `Mi ha offerto un’ora della sua vita e io ho guardato l’orologio.` },
              ],
            }),
          ch('b', 3, `Volentieri, Presidente. Mi racconti la storia della sua prima macchina e mi dica cosa, oggi, fa perdere tempo a lei e ai suoi capi reparto.`,
            `La storia di una macchina è la storia dell’uomo che la possiede. Chiedendogli cosa gli fa perdere tempo hai trasformato una cortesia in ascolto utile: il dolore l’hai sentito dal fondatore, che è chi decide.`,
            { t: 12, v: 6, u: 6, c: 4, r: -2 }, {
              next: 'n2',
              say: `Volentieri, Presidente. Mi racconta la storia di questa macchina? Cosa la rende speciale, e cosa invece, oggi, fa perdere tempo a lei e ai suoi capi reparto?`,
              react: [
                { w: 'gianni', a: `posa il palmo sulla targhetta`, t: `Questa? Un mutuo e la firma di mia moglie, nel 1984. Speciale? Non si ferma mai. Quello che si ferma è tutto il resto: la carta, le telefonate, uno che va a cercare un disegno per mezz’ora.` },
                { n: `Il giro dura un’ora. Gianni ti porta davanti a ogni macchina e ogni macchina ha la sua storia, e dietro ogni storia c’è un ritardo: commesse perse, fogli che girano da un reparto all’altro, un ordine importante consegnato con tre settimane di ritardo. A fine giro la conta è sua: una consegna su sei arriva dopo la data promessa.` },
                { think: `Mi sta raccontando il dolore, e nessuno gli ha messo davanti un questionario.` },
                { n: `Due passi indietro, Francesca ti guarda e per la prima volta sorride.` },
              ],
            }),
          ch('c', 2, `Con piacere. Faccio il giro con lei e, quando abbiamo finito, rubo mezz’ora a Francesca per guardare i numeri, così non le tolgo tempo.`,
            `Rispetti il rito e proteggi la mezz’ora con Francesca: nessuno si offende. Ma durante il giro hai ascoltato senza scavare, e il dolore resta da scoprire.`,
            { t: 6, v: 2, c: 4 }, {
              next: 'n2',
              say: `Con piacere, Presidente. Il giro lo faccio volentieri, e quando abbiamo finito rubo mezz’ora a Francesca per i numeri: così non le tolgo tempo.`,
              react: [
                { w: 'gianni', a: `annuisce`, t: `Così ragioniamo. Prima le macchine, poi le carte.` },
                { n: `Il giro è cordiale: Gianni indica, tu annuisci, Francesca controlla l’ora sul polso. Si parla di torni, di barre, di un cliente di Padova che non sbaglia mai un ordine.` },
                { w: 'francesca', a: `dopo, in amministrazione, aprendo il file`, t: `Il mese lo chiudiamo in diciannove giorni. Quando sono entrata io erano quattordici.` },
                { think: `Piacevole. Ma al reparto non ho chiesto niente che non potesse dirmi chiunque.` },
              ],
            }),
          ch('d', 1, `Volentieri, Presidente. Mentre camminiamo le racconto in dieci minuti cosa fa la piattaforma, così arriviamo in ufficio con un’idea chiara.`,
            `Un pitch in mezzo al reparto dice “ho già deciso cosa ti serve”. Gianni non voleva una presentazione: voleva capire se guardi le macchine prima del listino.`,
            { t: -2, c: -2, r: 4 }, {
              next: 'n2',
              say: `Volentieri, Presidente. Mentre camminiamo le racconto in dieci minuti cosa fa la nostra piattaforma, così arriviamo in ufficio che ha già un’idea.`,
              react: [
                { n: `Gli mostri sul telefono il cruscotto con le commesse in tempo reale. Gianni guarda lo schermo come si guarda l’amico di un amico.` },
                { w: 'gianni', a: `indica una fresatrice, senza voltarsi`, t: `Questa non l’ha mai fermata nessuno in quarant’anni.` },
                { think: `Gli parlo di allarmi, lui mi mostra una macchina che non si è mai fermata. Non stiamo parlando della stessa cosa.` },
              ],
            }),
        ],
      },

      n2: {
        when: `Mercoledì · 14:30`, view: 'walk',
        where: `Reparto produzione · mercoledì 14:30`,
        scene: [
          { n: `Mercoledì, dopo pranzo. Il reparto ha un altro rumore: meno fretta, più ritmo. Strisce gialle sul pavimento, bancali di barre d’acciaio, l’odore dolciastro dell’emulsione che si attacca ai vestiti. Un operaio stropiccia un disegno e se lo infila nella tuta.` },
          { n: `Francesca te lo aveva detto: senza Sergio il progetto resta sulla carta. È lui che farà usare, o ignorare, il sistema ai capi reparto.` },
          { n: `Sergio Dal Bianco ti aspetta accanto al centro di lavoro, con una cartellina di fogli di avanzamento sotto il braccio e una matita dietro l’orecchio. Due capi reparto, poco distanti, fingono di controllare un pezzo.` },
          { w: 'sergio', a: `incrocia le braccia`, t: `Questi sistemi complicano la vita. Il vecchio gestionale lo conosco a memoria, e quando si pianta so dove mettere le mani. Poi arriva qualcuno con la valigetta e mi spiega cosa devo fare.` },
          { think: `Non parla di me. Parla di tutti quelli che sono arrivati prima di me con una valigetta.` },
          { think: `E i due che fingono di guardare il pezzo sentono tutto. Quello che dico adesso, domani lo sa tutto il reparto.` },
        ],
        prompt: `Sergio ti aspetta a braccia conserte. Come ti rapporti con lui?`,
        hint: `Chi dovrà usare il sistema ogni giorno può fargli o non fargli vivere la vita. Trattalo da protagonista, non da ostacolo.`,
        tip: `Un utente influente che teme di perdere controllo diventa sabotatore se lo ignori e alleato se gli dai la regia del pilota. Fai emergere i suoi tre problemi quotidiani e costruisci il primo risultato su quelli.`,
        choices: [
          ch('a', 1, `Capisco la diffidenza, Sergio. Ma la direzione ha deciso di modernizzare e i benefici sono evidenti: meglio capire insieme come farlo bene.`,
            `Dire a chi teme di perdere il controllo che “la decisione è già presa” gli conferma che il sistema arriva dall’alto. Sergio non si opporrà: semplicemente non lo userà.`,
            { t: -6, c: -4, r: 10 }, {
              set: { sergioHostile: true }, next: 'n3',
              say: `Capisco la diffidenza, Sergio, e glielo dico con rispetto: la direzione ha già deciso di modernizzare e i benefici sono evidenti. Meglio capire insieme come farlo bene.`,
              react: [
                { w: 'sergio', a: `gelido, cortese`, t: `La direzione decide, io lavoro.` },
                { n: `I due capi reparto tornano al loro pezzo. La conversazione è finita senza che nessuno abbia alzato la voce.` },
                { think: `Ho appena trasformato un possibile alleato in un sabotatore educato.` },
              ],
            }),
          ch('b', 3, `Nessuno conosce questo reparto meglio di lei. Mi dica le tre cose che oggi le fanno perdere più tempo: il pilota parte da lì, e lo disegna lei.`,
            `Una domanda sui suoi problemi e un ruolo da protagonista spostano Sergio da ostacolo a proprietario. I suoi quattro punti dolenti diventano il perimetro del pilota e i criteri con cui verrà giudicato.`,
            { t: 8, v: 8, c: 6, r: -8 }, {
              mp: ['Dc'], set: { sergioOn: true }, next: 'n3',
              say: `Sergio, nessuno conosce questo reparto meglio di lei, e io di sicuro no. Mi dica le tre cose che oggi le fanno perdere più tempo. Il primo pilota lo disegniamo da lì, e lo disegna lei.`,
              react: [
                { w: 'sergio', a: `dopo un silenzio, scioglie le braccia`, t: `Tre? Ne ho quattro.` },
                { n: `Le conta sulle dita sporche d’olio: la ricerca dei disegni, i fogli di avanzamento che la sera ricopia a mano (centodiciotto a turno, li ha contati), le priorità che cambiano senza dirlo a nessuno, i fermi macchina segnati a matita.` },
                { w: 'sergio', t: `Se me li togliete, il resto lo imparo.` },
                { think: `Il pilota non è più mio. È suo.` },
              ],
            }),
          ch('c', 2, `Sergio, porto qui Davide con i vostri dati: ordini, cicli macchina, fermi. Così vede com’è sulla sua commessa di ieri, non su una demo da fiera.`,
            `La demo sui suoi dati funziona perché parla di fogli e di fermi, non di funzioni. Resta una presentazione fatta a Sergio, non con lui: il pilota non è ancora suo.`,
            { t: 6, v: 10, c: 2, r: -4 }, {
              jolly: 'se', mp: ['Dc'], set: { sergioOn: true }, next: 'n3',
              say: `Sergio, porto qui Davide, il nostro Solution Engineer, con i vostri dati: ordini, cicli macchina, fermi. Così vede com’è sulla sua commessa di ieri, non su una demo da fiera.`,
              react: [
                { w: 'davide', a: `con il portatile appoggiato su un bancale`, t: `Questa è la commessa di ieri. Qui la fase è finita alle quattro, qui no. Lo vede chi vuole, senza telefonare a nessuno.` },
                { w: 'sergio', a: `dopo un po’, a malincuore`, t: `Questo mi risparmia i fogli. Sono centodiciotto a turno, li conto io.` },
                { think: `“Mi risparmia”. Per lui è quasi un applauso.` },
              ],
            }),
          ch('d', 1, `Preferisco non farle perdere tempo, Sergio: ne parlo con Gianni e con Francesca. Se la direzione è convinta, il reparto si adegua senza discussioni.`,
            `Andare sopra la testa di chi deve far vivere il sistema ti dà una direzione convinta e un reparto in attesa. Il progetto avanza sulla carta e si ferma dove avviene il lavoro.`,
            { t: -4, c: -2, r: 8 }, {
              set: { sergioHostile: true }, next: 'n3',
              say: `Non voglio farle perdere tempo, Sergio. Ne parlo direttamente con Gianni e Francesca: se la direzione è convinta, il reparto si adegua.`,
              react: [
                { n: `Quella sera Gianni chiama Sergio nel suo ufficio e gli chiede, senza alzare la voce, come mai ci sia resistenza. Il giorno dopo Sergio ti passa accanto in corridoio con la cartellina sotto il braccio, e il saluto è per i muri.` },
                { w: 'francesca', a: `al telefono, piano`, t: `Papà lo ha chiamato dentro con la porta aperta. Lo hanno sentito tutti. Non è andata bene.` },
                { think: `Ho vinto la direzione e perso il reparto.` },
              ],
            }),
        ],
      },

      n3: {
        when: `Giovedì · 11:00`, view: 'meeting', bg: 'office',
        where: `Ufficio amministrazione · giovedì 11:00`,
        scene: [
          { n: `Giovedì mattina. L’ufficio amministrazione è un open space piccolo con troppi classificatori: sulla scrivania di Francesca tre monitor, due calcolatrici, una pila di prime note stampate. Odore di caffè e di toner; dalla vetrata, i camion fermi nel piazzale e la nebbia che non si decide ad andarsene.` },
          { n: `Francesca chiude la porta. In tre giorni non l’aveva mai fatto.` },
          { w: 'francesca', a: `abbassa la voce`, t: `Ho un problema. InfoSistemi Nordest ci ha mandato un’offerta del 35% più bassa della vostra. Papà conosce il titolare da vent’anni. Mi serve una ragione, con i numeri, per non andare da loro.` },
          { think: `Non mi chiede uno sconto. Mi chiede una frase che regga davanti a suo padre.` },
          { n: `Sul tavolo c’è l’offerta del concorrente: una pagina e mezza, firmata a penna in fondo con il solo nome di battesimo, “Renzo”.` },
          { think: `Una pagina e mezza contro le mie quaranta. E la firma è un nome di battesimo.` },
        ],
        prompt: `Il concorrente locale ha un vantaggio di prezzo e di amicizia. Come rispondi?`,
        hint: `Il prezzo più basso quasi mai confronta cose uguali. E parlare male del concorrente di un amico del titolare è una trappola.`,
        tip: `Chiedi un confronto a parità di perimetro, rischi e crescita (Competition + Metrics). Non denigrare mai: parlare male di un fornitore amico del titolare è la via più breve per perdere.`,
        choices: [
          ch('a', 0, `Allineiamo il prezzo: ti rifaccio in giornata la nostra offerta con il 35% di sconto, così il confronto smette di essere un problema e tuo padre decide con serenità.`,
            `Pareggiare il prezzo senza aver capito cosa si sta confrontando regala margine e svaluta il listino. A una CFO dice che il prezzo era negoziabile fin dall’inizio, e che probabilmente lo è anche il resto.`,
            { t: -8, v: -12, c: -4, d: 35 }, {
              next: 'n4',
              say: `Facciamo così, Francesca: ti rifaccio in giornata la nostra offerta allo stesso prezzo, con il 35% di sconto. Il confronto smette di essere un problema.`,
              react: [
                { w: 'francesca', a: `sbianca`, t: `Il 35% in un giorno?` },
                { w: 'francesca', a: `dopo un attimo, piano`, t: `Se scendi così in fretta, quanto vale davvero il prezzo da cui sei partito?` },
                { think: `Mi ha chiesto di dare un valore al mio listino, e l’ho svalutato in una frase.` },
              ],
            }),
          ch('b', 0, `InfoSistemi è un rivenditore piccolo: un progetto così non lo reggono. Lo sa anche tuo padre, anche se per cortesia non lo dice. Meglio dirselo adesso.`,
            `Denigrare un fornitore che il titolare conosce da vent’anni ti mette contro l’uomo, non contro il preventivo. E in un’azienda familiare una frase così ha il passo lungo: a Gianni arriva sempre.`,
            { t: -12, c: -4, r: 10 }, {
              integ: -5, next: 'n4',
              say: `InfoSistemi è un piccolo rivenditore, Francesca: un progetto così non lo reggono. Lo sa anche tuo padre, anche se per cortesia non lo dice.`,
              react: [
                { w: 'francesca', a: `si irrigidisce`, t: `Parli di gente che a Natale manda il panettone a mio padre da vent’anni.` },
                { n: `La penna che teneva in mano è ferma sul foglio. Fuori, un camion fa manovra e il silenzio nella stanza lo copre appena.` },
                { think: `Ho criticato un amico del titolare. Se arriva a Gianni, sono fuori.` },
              ],
            }),
          ch('c', 3, `Prima del prezzo confrontiamo il perimetro: produzione, magazzino, contabilità, macchine. Poi una tabella a cinque anni, con estensioni e terzo stabilimento.`,
            `Hai spostato la gara dal prezzo al perimetro, senza dire una parola contro nessuno. È il confronto che una CFO può portare al padre: numeri suoi, scritti da lei.`,
            { t: 6, v: 12, c: 8, r: -6 }, {
              mp: ['Co', 'M'], next: 'n4',
              say: `Prima del prezzo confrontiamo il perimetro: produzione, magazzino, contabilità, integrazione con le macchine. Poi costruiamo insieme una tabella a cinque anni, con personalizzazioni, aggiornamenti e il terzo stabilimento dentro. Se la loro offerta regge, lo vediamo nei numeri.`,
              react: [
                { n: `Passate un’ora con l’offerta di InfoSistemi da una parte e la tua dall’altra. Francesca barra, sottolinea, aggiunge righe.` },
                { w: 'francesca', a: `alza gli occhi dal foglio`, t: `Qui non c’è l’integrazione con le macchine. E il modulo qualità non c’è proprio.` },
                { n: `A cinque anni, con le estensioni e la manutenzione, i due totali si riavvicinano molto più di quanto pensasse. In fondo al foglio Francesca aggiunge una riga che nessuno le aveva chiesto: i ritardi di consegna, una su sei, trecentodiecimila euro l’anno.` },
                { think: `Ora ha una cifra, non una sensazione. Qualcosa da portare a suo padre senza tradire nessuno.` },
              ],
            }),
          ch('d', 3, `Ti metto in contatto con la direttrice amministrativa di una meccanica veneta come voi: ha cambiato gestionale due anni fa, dopo aver provato quello locale.`,
            `Una conversazione tra pari dà a Francesca la risposta che le serviva, senza che tu tocchi il prezzo o il concorrente. Il jolly referenza è speso bene: la credibilità, qui, non la costruisci tu.`,
            { t: 10, v: 8, c: 4, r: -6 }, {
              jolly: 'ref', mp: ['Co'], next: 'n4',
              say: `Francesca, ti metto in contatto con la direttrice amministrativa di una meccanica veneta come la vostra. Due anni fa ha cambiato gestionale, dopo aver provato una soluzione locale. Chiedile com’è andata: io non c’entro.`,
              react: [
                { n: `La call dura venti minuti. Dall’altra parte, una voce stanca e diretta: “Con la soluzione locale ci siamo ritrovati con tre sistemi che non si parlavano”.` },
                { w: 'francesca', a: `chiude il portatile, a bassa voce`, t: `Venti minuti che valgono più del tuo listino. Adesso so cosa dire a papà.` },
                { think: `Una pari vale più di dieci argomenti. E non ho dovuto dire una parola su Renzo.` },
              ],
            }),
        ],
      },

      n4: {
        when: `Lunedì · 16:00`, view: 'meeting', bg: 'office',
        where: `Ufficio del Presidente · lunedì 16:00`,
        scene: [
          { n: `Lunedì, le quattro del pomeriggio. Dalle finestre dell’ufficio del Presidente entra già la luce della sera. Alle pareti, coppe di tornei di bocce e di una vita di fiere, e foto sbiadite: Gianni giovane davanti al primo capannone, la squadra dell’officina, una stretta di mano sotto uno striscione.` },
          { chat: { from: 'davide', app: 'WhatsApp' }, t: `Sono qui fuori. Ho rifatto i conti tre volte: nove mesi, in due fasi. Per marzo non c’è verso con tutto, dillo chiaro.`, sfx: 'ping' },
          { n: `La fiera di marzo è fra quattro mesi.` },
          { w: 'gianni', a: `bonario, ma deciso`, t: `Senta, io i contratti da cento pagine non li firmo. Mi fido delle persone. Mi dica: quando siamo in produzione? Voglio vedere tutto funzionare per la fiera di marzo.` },
          { n: `Sulla scrivania un calendario di carta, con la fiera cerchiata in rosso. Francesca è seduta di lato, una cartellina chiusa sulle ginocchia, e guarda il padre, non te.` },
          { think: `Mi crede sulla parola. E più mi crede, più costa ogni parola in più.` },
        ],
        prompt: `Il titolare si fida di te e vuole una data. Come usi questa fiducia?`,
        hint: `La fiducia è un capitale. Non spenderlo con una promessa che non puoi mantenere.`,
        tip: `Il momento in cui il cliente si fida di più è quello in cui è più facile sbagliare: una promessa irrealistica oggi diventa un contenzioso domani. Meglio una tabella di marcia onesta in due fasi, con un risultato visibile per la fiera.`,
        choices: [
          ch('a', 0, `Per marzo ce la facciamo, Presidente. Non si preoccupi: ci metto la faccia, e la stretta di mano vale più di qualsiasi cronoprogramma.`,
            `Hai comprato la firma con una data che il piano non regge. Davide lo sa, Francesca lo intuisce, e la promessa pesa su ogni passaggio successivo: tutto il progetto poggia sulla parola.`,
            { t: 8, v: -4, c: -4, r: 16 }, {
              integ: -10, set: { overpromise: true }, next: 'n5',
              say: `Presidente, per marzo ce la facciamo. Non si preoccupi: ci metto la faccia io, e tra noi la stretta di mano vale più di qualsiasi cronoprogramma.`,
              react: [
                { w: 'gianni', a: `sorride, felice, e stringe`, t: `Questo mi piace: una parola sola.` },
                { n: `La stretta è lunga e calda, di quelle che chiudono. Francesca non alza gli occhi dalla cartellina. Fuori, nel corridoio delle foto, Davide ti aspetta appoggiato al muro, il portatile sotto il braccio.` },
                { w: 'davide', a: `a mezza voce`, t: `Non si fa in quattro mesi.` },
                { think: `Lo so. Lo sapevo mentre lo dicevo.` },
              ],
            }),
          ch('b', 3, `Il progetto completo richiede nove mesi, Presidente. Ma per marzo le porto una prima fase già in produzione, sul reparto che sceglie lei.`,
            `Hai trasformato un vincolo in un obiettivo onesto: nove mesi per il progetto, un risultato visibile per la fiera. Al titolare non serve la data più vicina, serve poterla raccontare.`,
            { t: 10, v: 8, u: 8, c: 8, r: -8 }, {
              mp: ['Dp'], set: { phased: true }, next: 'n5',
              say: `Presidente, le dico le cose come stanno: il progetto completo richiede nove mesi. Ma per la fiera le garantisco una prima fase già operativa sul reparto che sceglie lei, con commesse e avanzamento in tempo reale. Alla fiera mostra un risultato vero.`,
              react: [
                { w: 'gianni', a: `dopo un silenzio, guardando la foto del primo capannone`, t: `Mi piace chi mi dice le cose come stanno.` },
                { w: 'gianni', t: `Il reparto più critico, allora: se funziona lì, funziona dappertutto. E ai clienti alla fiera dico di venire a vederlo.` },
                { think: `Un vincolo diventato un obiettivo. E lui ha già in mente chi invitare.` },
              ],
            }),
          ch('c', 2, `Prepariamo una lettera d’intenti di una sola pagina con i punti essenziali. Il contratto completo lo seguono Francesca e il mio ufficio legale.`,
            `La lettera d’intenti rispetta il suo stile e dà a Francesca la regia della parte formale. Ma non risponde alla domanda che Gianni ti ha fatto, e un titolare vecchio stile le domande se le ricorda.`,
            { t: 4, c: 4, r: 2 }, {
              mp: ['P'], next: 'n5',
              say: `Presidente, facciamo una lettera d’intenti di una pagina, con i punti essenziali. Il contratto completo lo seguono Francesca e il mio ufficio legale: lei non deve leggere niente.`,
              react: [
                { w: 'gianni', a: `annuisce`, t: `Una pagina. Questa la leggo.` },
                { n: `Francesca allunga la mano e si prende i fogli dalla scrivania: da adesso le carte sono sue.` },
                { w: 'gianni', a: `sull’uscio, già in piedi`, t: `Per marzo, però, ne riparliamo.` },
                { think: `Ho lasciato la domanda sul tavolo. Lui no: se la ricorda.` },
              ],
            }),
          ch('d', 1, `Il nostro contratto è uguale per tutti i clienti e protegge anche voi. Lo mando a Francesca, e lo firmate quando siete pronti, senza fretta.`,
            `La rigidità del processo è comprensibile, ma Gianni non chiedeva un modello contrattuale: chiedeva se poteva fidarsi. Con un titolare vecchio stile, “come da standard” suona come “non mi interessa chi sei”.`,
            { t: -6, c: -2, r: 4 }, {
              next: 'n5',
              say: `Presidente, il nostro contratto è uguale per tutti i clienti, e protegge anche voi. Lo mando a Francesca e lo firmate quando siete pronti.`,
              react: [
                { w: 'gianni', a: `dopo un silenzio, a mezza voce`, t: `Ho capito. Il solito fornitore.` },
                { n: `La conversazione non si chiude male: si chiude e basta. Francesca ti accompagna alla macchina senza dire niente. Nell’ufficio restano le coppe, le foto, e la stretta di mano che non c’è stata.` },
                { think: `Un contratto standard per un uomo che si fida delle mani. Giusto, e inutile.` },
              ],
            }),
        ],
      },

      n5: {
        when: `Venerdì · 11:00`, view: 'meeting', bg: 'office',
        where: `Ufficio del Presidente · venerdì 11:00`,
        scene: [
          { n: `Venerdì, le undici. Il caffè è arrivato in tazzine spaiate. Gianni non si siede: sta in piedi accanto alla finestra, in controluce, le mani dietro la schiena, e guarda il piazzale come se contasse i camion.` },
          { w: 'gianni', a: `sporge il mento`, t: `Facciamo così: lei mi dà il venticinque per cento di sconto e stringiamo la mano oggi. Altrimenti vado da InfoSistemi, che è più vicino a casa.` },
          { n: `Francesca guarda il caffè. Questa parte è un rito, e in casa Brenta il rito si rispetta: lo ha visto fare a suo padre cento volte con cento fornitori.` },
          { think: `Venticinque. Non lo vuole davvero: vuole vedere cosa faccio quando me lo chiede.` },
          { think: `Il mio limite autonomo è il quindici. Oltre, serve il Deal Desk, e il Deal Desk non regala niente.` },
        ],
        prompt: `Come rispondi al titolare?`,
        hint: `Trattare è un rito: se cedi subito perdi rispetto. Ogni “no” deve portare con sé una vittoria che lui possa raccontare.`,
        tip: `Con un negoziatore di vecchia scuola lo sconto è questione d’onore. Dagli una vittoria raccontabile, un gesto invece di un taglio, legata a un impegno (pagamento a fasi, durata, referenza). Vuole sentirsi di aver trattato bene.`,
        choices: [
          ch('a', 0, `Ci tengo a lavorare con lei, e a una stretta di mano non si dice di no. Va bene il venticinque per cento, e chiudiamo oggi, senza altre carte.`,
            `Concedere subito il massimo toglie al titolare la trattativa, che per lui è un rito d’onore, e a te la contropartita. Un venticinque per cento senza nulla in cambio è oltre la soglia e senza copertura: il Deal Desk ti chiederà conto.`,
            { t: -2, v: -10, c: -4, d: 25 }, {
              next: (d) => (d.flags.overpromise ? 'n5x' : 'n6'),
              say: `Presidente, ci tengo a lavorare con lei, e a una stretta di mano non si dice di no. Va bene: venticinque per cento, e chiudiamo oggi stesso, senza altre carte.`,
              react: [
                { w: 'gianni', a: `stringe, ma la stretta dura meno`, t: `Troppo facile.` },
                { n: `Un secondo dopo senti che qualcosa nella stanza si è spento: non è il sollievo di chi ha vinto, è la delusione di chi si aspettava una trattativa.` },
                { n: `Dieci minuti dopo il telefono vibra: il Deal Desk. Due parole: “Chiamami. Subito.”`, sfx: 'phone' },
                { think: `Ho pagato il venticinque per cento, e anche un po’ del suo rispetto.` },
              ],
            }),
          ch('b', 3, `Il 25% non posso farlo, e lei non vorrebbe un fornitore che regala. Le propongo il 7%, pagamenti a fine fase e il diritto di raccontare il progetto.`,
            `Il no è arrivato con una vittoria raccontabile: pagamento a fasi e referenza al posto dello sconto secco. Il titolare ha trattato e ha vinto, tu hai tenuto il margine e legato il prezzo ai risultati.`,
            { t: 6, v: 4, c: 10, r: -4, d: 8 }, {
              set: { giveGet: true }, next: (d) => (d.flags.overpromise ? 'n5x' : 'n6'),
              say: `Presidente, il venticinque non posso farlo, e lei non vorrebbe un fornitore che regala. Le propongo il sette, con i pagamenti legati al completamento di ogni fase: così paga quando vede i risultati. In cambio, mi lascia raccontare il progetto come caso di successo.`,
              react: [
                { w: 'gianni', a: `ride, di gusto, per la prima volta da quando lo conosci`, t: `Mi fa pagare quando funziona… questa mi piace.` },
                { n: `Si volta verso la figlia. Francesca ha un mezzo sorriso, l’unico del mattino.` },
                { w: 'gianni', t: `Otto, allora. Otto, e pago a fine fase, come ha detto lei. Scriva.` },
                { think: `Gli ho dato qualcosa da raccontare agli amici: “ho trattato bene”.` },
              ],
            }),
          ch('c', 2, `Posso arrivare al 12%, Presidente, ma l’offerta vale fino a venerdì prossimo alle diciassette: dopo, la riporto ai numeri di partenza. Lo faccio per lei.`,
            `Il dodici è dentro la tua soglia, ma lo concedi con una sola contropartita, e debole: la scadenza è tua, non sua. A un titolare che tratta per onore suona come una pressione, e se la ricorderà.`,
            { t: -2, c: 4, d: 12 }, {
              next: (d) => (d.flags.overpromise ? 'n5x' : 'n6'),
              say: `Posso fare il dodici, Presidente, ma a una condizione: la firma entro venerdì prossimo, alle diciassette. Dopo, devo riportare l’offerta ai numeri di partenza. Lo faccio per lei.`,
              react: [
                { w: 'gianni', a: `valuta, masticando le parole`, t: `Il dodici. Va bene il dodici.` },
                { n: `Stringe la mano, ma lo sguardo gli scivola sul calendario di carta, sui giorni che mancano a venerdì.` },
                { w: 'gianni', t: `Entro venerdì. Mi mette fretta, eh.` },
                { think: `Ho ottenuto la firma. E ho comprato un po’ di freddezza.` },
              ],
            }),
          ch('d', 3, `Le preparo due formule e sceglie lei, Presidente. A) Listino, pagamento a fasi e canone fisso per tre anni. B) 10% di sconto con pagamento anticipato.`,
            `Offrire due formule invece di un sì o di un no sposta il tavolo dal prezzo alla struttura, dove il concorrente locale non ha niente da dire. Gianni sceglie ciò che gli dà tranquillità, e tu hai concesso poco sul prezzo.`,
            { t: 4, v: 4, c: 12, r: -6, d: 4 }, {
              jolly: 'desk', set: { giveGet: true, deskApproved: true }, next: (d) => (d.flags.overpromise ? 'n5x' : 'n6'),
              say: `Presidente, le preparo due formule e sceglie lei. La prima: listino, pagamento a fasi e canone bloccato per tre anni. La seconda: dieci per cento di sconto, ma con pagamento anticipato.`,
              react: [
                { n: `Gianni si volta dalla finestra, per la prima volta, e si siede. Legge con il dito sotto la riga: la A, poi la B.` },
                { w: 'gianni', t: `La A. Il canone fisso mi dà tranquillità, e il pagamento a fasi lo spiego io a quelli della banca.` },
                { think: `La discussione non è più sul prezzo. È sulla forma, e sulla forma InfoSistemi non c’è.` },
              ],
            }),
        ],
      },

      n5x: {
        when: `Lunedì · 09:00`, view: 'meeting', bg: 'office',
        where: `Sala riunioni · lunedì 09:00`,
        scene: [
          { n: `Lunedì, alle nove, nella sala riunioni di Brenta il proiettore getta sul muro un diagramma di Gantt. Davide ha le maniche rimboccate e un caffè mai toccato accanto al portatile.` },
          { w: 'davide', a: `ruota lo schermo verso di voi`, t: `Collaudo, formazione, migrazione dei dati, il fermo degli ordini nei giorni di inventario. Più stretto di così non si può senza rompere qualcosa.` },
          { n: `Il piano dice agosto per l’intero progetto e giugno per i reparti principali.` },
          { w: 'francesca', a: `a disagio, senza guardare lo schermo`, t: `Papà dice che gli avevi garantito marzo. Ora il piano dice giugno. Come glielo spiego?` },
          { think: `Marzo l’ho detto io, con la mano. Giugno l’ha scritto Davide, con i fatti.` },
        ],
        prompt: `La promessa di marzo è tornata a bussare. Che fai?`,
        hint: `Si corregge subito e di persona, con una soluzione già in mano.`,
        tip: `Una promessa sbagliata si corregge subito, di persona, con una soluzione già in mano. Ogni giorno che passa il costo cresce: Gianni, a differenza di un contratto, non perdona la sorpresa.`,
        choices: [
          ch('a', 3, `Vado io da Gianni, con te. Gli dico che ho promesso ciò che non potevo garantire e gli porto un solo reparto pilota, funzionante a marzo.`,
            `Correggere subito, di persona e con una soluzione in mano costa poco rispetto al silenzio: Gianni apprezza chi si dichiara. Il pilota diventa il biglietto da visita per la fiera, e la promessa torna a essere una cosa vera.`,
            { t: -2, u: 4, c: 4, r: -14 }, {
              integ: 6, set: { overpromise: false, phased: true }, next: 'n6',
              say: `Andiamo insieme da Gianni, Francesca. Gli dico che ho fatto una promessa che non potevo garantire, e gli porto una cosa vera: un solo reparto pilota, scelto da lui, funzionante a marzo.`,
              react: [
                { n: `Gianni vi ascolta in piedi, nella stanza delle coppe. Non interrompe mai.` },
                { w: 'gianni', a: `dopo un lungo silenzio`, t: `Almeno me lo dice in faccia.` },
                { w: 'gianni', t: `Il reparto lo scelgo io, ha detto?` },
                { think: `La fiducia si è incrinata. Non si è rotta, ed è già molto, con uno come lui.` },
              ],
            }),
          ch('b', 0, `Spingiamo il team: se lavoriamo anche nei weekend, marzo si può ancora provare a rispettare. Lo dico io a Gianni che ci stiamo muovendo.`,
            `Hai impegnato persone che non ti appartengono per difendere la tua faccia. Collaudo e qualità sono i primi a saltare, e la data resta lo stesso fragile: hai spostato il problema in produzione.`,
            { t: -8, c: -6, r: 14 }, {
              integ: -6, next: 'n6',
              say: `Spingiamo il team. Se lavoriamo anche nei weekend, marzo si può ancora provare a rispettare. Lo dico io a Gianni che ci stiamo muovendo.`,
              react: [
                { w: 'davide', a: `chiude il portatile`, t: `Sacrificare collaudo e qualità per una data è il modo più rapido per fare un disastro. Non conta il weekend: conta quello che salta.` },
                { think: `Sto pagando una bugia con il tempo degli altri.` },
              ],
            }),
          ch('c', 1, `Presentiamo il ritardo come una complicazione emersa dalla pianificazione tecnica: Davide ha trovato dei vincoli che prima non si vedevano.`,
            `Dare la colpa ai tecnici è una versione che non regge: Davide ti aveva avvertito dal primo giorno e Gianni sente dal tono che qualcosa non torna. La credibilità, con lui, non si ripara con una scusa.`,
            { t: -8, c: -4, r: 10 }, {
              integ: -6, next: 'n6',
              say: `Presentiamo il ritardo come una complicazione emersa dalla pianificazione tecnica: Davide ha trovato dei vincoli che prima non si vedevano.`,
              react: [
                { w: 'davide', a: `due ore dopo, al telefono`, t: `Dei vincoli che prima non si vedevano? Il primo giorno ti ho detto nove mesi, e ce l’ho per iscritto.` },
                { n: `Gianni non dice niente, ma ha sentito il tono. E il tono, con un uomo che si fida delle persone, vale più della spiegazione.` },
              ],
            }),
          ch('d', 2, `Offro giornate di consulenza gratuite a compensazione del ritardo e dico io a Gianni che l’errore è stato mio, senza giri di parole.`,
            `Riconosci l’errore, ed è la parte che conta, e lo compensi, ed è la parte che costa. Ma regalare giornate non sostituisce una data vera: il problema si chiude a metà e il costo lo paghi tu.`,
            { t: 2, c: 2, r: -6, d: 4 }, {
              integ: 2, set: { overpromise: false }, next: 'n6',
              say: `Gianni, ho promesso marzo e non potevo. L’errore è mio. Come compensazione le offro un pacchetto di giornate di consulenza senza costi, per il pilota.`,
              react: [
                { w: 'gianni', a: `dopo un attimo`, t: `Apprezzo che mi regali il tempo. Ma avrei preferito la data giusta.` },
                { think: `Ho riconosciuto l’errore e ci ho messo un prezzo. L’errore, intanto, è rimasto dov’era.` },
              ],
            }),
        ],
      },

      n6: {
        when: `Lunedì · 18:00`, view: 'call', bg: 'night',
        where: `Videocall · lunedì 18:00`,
        scene: (d) => [
          { n: `Lunedì sera, ufficio quasi vuoto. Sul laptop si apre la videochiamata: Francesca, nel suo ufficio, con i fogli di calcolo ancora accesi sul monitor e la nebbia che ha già riempito la finestra.` },
          { n: `Dietro di lei, dal piazzale, arriva il rumore ovattato del cambio turno: le portiere, un muletto, qualcuno che ride.` },
          { w: 'francesca', a: `operativa, la penna in mano`, t: visited(d, 'wild:banca_ritarda')
            ? `Papà è pronto. Il leasing, lo sai, resta il nodo: la banca vuole un piano di progetto firmato prima di sbloccare la delibera. E Sergio mi ha chiesto di mettere per iscritto il suo ruolo.`
            : `Papà è pronto. Ma la banca finanzia parte dell’investimento con un leasing e vuole un piano di progetto firmato. E Sergio mi ha chiesto di mettere per iscritto il suo ruolo.` },
          d.flags.sergioOn
            ? { think: `Sergio che chiede il ruolo per iscritto: vuole il pilota, e vuole che si sappia.` }
            : d.flags.sergioHostile
              ? { think: `Sergio che chiede una cosa per iscritto. O si sta mettendo in gioco, o si sta coprendo le spalle.` }
              : { think: `Il ruolo di Sergio per iscritto. Una richiesta piccola, che pesa come una firma.` },
          { think: `Banca e Sergio. Due firme che non sono di Gianni, e senza le quali la sua non vale.` },
        ],
        prompt: `Ultimi dettagli prima della firma. Che fai?`,
        hint: `Due bisogni diversi, una sola occasione: la firma passa da banca e capo reparto.`,
        tip: `Il paper process include tutte le firme che servono, formali (banca) e informali (chi usa il sistema). Un piano di progetto con responsabilità chiare serve entrambe.`,
        choices: [
          ch('a', 3, `Preparo un piano in due fasi con responsabilità chiare, Sergio come responsabile del pilota, e lo alleghiamo al contratto: serve alla banca e a lui.`,
            `Un solo documento risponde a due firme, una formale e una informale: la banca vuole un piano, Sergio vuole un ruolo. Mettendo il suo nome nel piano trasformi la sua influenza in impegno, e la firma segue senza intoppi.`,
            { t: 4, c: 10, u: 4, r: -8 }, {
              mp: ['P'], set: { paperReady: true, sergioOn: true }, next: 'END',
              say: `Francesca, preparo io il piano di progetto: due fasi, scadenze, responsabilità. Sergio è il responsabile del pilota, con il suo nome scritto. Lo alleghiamo al contratto: la banca ha il suo piano, e Sergio ha il suo ruolo.`,
              react: [
                { w: 'francesca', a: `annota`, t: `Una pagina per la banca e una per Sergio, dentro lo stesso documento. Non ci avevo pensato.` },
                { n: `Il piano parte la sera stessa. La banca lo approva due giorni dopo. Quando passi in reparto, Sergio ha già appeso la pagina alla bacheca, con la riga del suo nome. La rilegge, e lo senti dire a un capo squadra:` },
                { w: 'sergio', a: `di spalle, alla bacheca`, t: `Il mio pilota. Lunedì si comincia dalle bolle di avanzamento.` },
                { think: `Ha detto “il mio”. Non c’è modo migliore di firmare.` },
              ],
            }),
          ch('b', 1, `Mando il contratto standard come da procedura e restiamo in attesa: la banca e il ruolo di Sergio li conoscete voi, io non voglio complicare niente.`,
            `Lasciare banca e utenti al cliente significa lasciare il paper process al caso. La banca vuole un piano, non un modulo: le integrazioni arrivano una alla volta e ogni giorno di ritardo consuma la fiducia di Gianni.`,
            { t: -4, u: -6, c: -6, r: 8 }, {
              next: 'END',
              say: `Mando il contratto standard come da procedura, Francesca, e restiamo in attesa. La banca e il ruolo di Sergio li conoscete voi, io non voglio complicare niente.`,
              react: [
                { n: `La banca chiede tre integrazioni, una alla volta, e il contratto resta in filiale. La firma slitta di tre settimane.` },
                { w: 'gianni', a: `al telefono, spazientito`, t: `Mi avevate detto che era semplice.` },
                { think: `Gli avevo detto che era semplice. Era semplice per me.` },
              ],
            }),
          ch('c', 2, `Preparo un piano di progetto per la banca, con tappe e responsabilità. Il ruolo di Sergio lo definisce Gianni in azienda: è una questione interna.`,
            `Il piano per la banca è fatto e il paper process procede, ma lasci a Gianni una questione che potresti risolvere meglio tu: il ruolo di Sergio. Il progetto parte con metà reparto che aspetta di capire.`,
            { t: 0, c: 4, r: -2 }, {
              mp: ['P'], set: { paperReady: true }, next: 'END',
              say: `Preparo io il piano di progetto per la banca, Francesca. Il ruolo di Sergio lo definisce Gianni in azienda: è una questione interna.`,
              react: [
                { n: `La banca è soddisfatta e il leasing va avanti.` },
                { w: 'francesca', a: `due giorni dopo, al telefono`, t: `Per la banca va bene. Per Sergio non so: ha letto il piano e ha detto che aspetta di capire.` },
                { think: `Un pezzo l’ho chiuso. L’altro l’ho lasciato appoggiato al muro.` },
              ],
            }),
          ch('d', 0, `Il ruolo di Sergio lo definiamo dopo la firma: adesso non complichiamo il contratto, c’è già abbastanza da far quadrare con la banca e con il leasing.`,
            `Rimandare il ruolo di chi deve usare il sistema significa lasciarlo fuori dal progetto proprio quando conta. Sergio lo legge come un messaggio e risponde nel solo modo che ha: aspettando che il sistema inciampi.`,
            { t: -4, c: -6, r: 12 }, {
              set: { sergioOn: false, sergioHostile: true }, next: 'END',
              say: `Francesca, il ruolo di Sergio lo definiamo dopo la firma. Adesso non complichiamo il contratto: c’è già abbastanza da far quadrare.`,
              react: [
                { n: `Sergio lo viene a sapere in giornata, da un capo squadra. La sera ti arriva una telefonata di dieci secondi.` },
                { w: 'sergio', a: `asciutto`, t: `Vedremo come funziona il vostro sistema, allora.` },
                { think: `Il progetto parte con la persona più importante del reparto seduta ad aspettare che inciampi.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'fermo_macchina', title: `Si ferma una macchina`, w: 2, after: ['n1'],
        node: {
          when: `Martedì · 11:20`, view: 'walk', where: `Reparto tornitura · martedì 11:20`,
          scene: (d) => {
            const warm = warmN1(d), skipped = chose(d, 'n1', 'a');
            /* la scena arriva dopo la reazione di n1: chi ha parlato con Francesca torna dal reparto, chi ha fatto il giro con Gianni ne ha ancora uno da vedere */
            const dopoNumeri = skipped || chose(d, 'n1', 'c');
            return [
              { n: dopoNumeri
                ? `Finiti i numeri con Francesca, per tornare al parcheggio devi attraversare il reparto. Gianni ti raggiunge a passo lento, le mani dietro la schiena, e vi fermate un attimo davanti a un centro di lavoro con la porta sollevata.`
                : chose(d, 'n1', 'b')
                  ? `Il giro è finito, ma Gianni ha ancora un reparto da mostrarti: si ferma davanti a un centro di lavoro con la porta sollevata e ti lascia il tempo di guardarlo girare.`
                  : `A metà del giro Gianni si ferma davanti a un centro di lavoro con la porta sollevata e ti lascia il tempo di guardarlo girare.` },
              { n: `Poi il rumore cambia: prima un ronzio che sale, poi un colpo secco, poi niente. La luce verde sul cruscotto passa al rosso e il mandrino scende piano fino a fermarsi.` },
              { n: `Un operaio alza una mano senza fretta, come chi l’ha già fatto cento volte. Prende una scheda di carta, scrive qualcosa a matita, e il telefono interno si mette a squillare nel reparto accanto.` },
              warm
                ? { w: 'gianni', a: `a mezza voce, senza muoversi`, t: `Ecco. Adesso vede. Non è il guasto: è tutto quello che viene dopo.` }
                : { w: 'gianni', a: `senza voltarsi`, t: skipped ? `Capita. Non ci faccia caso, la accompagno all’uscita.` : `Capita. Non ci faccia caso, andiamo avanti.` },
              warm
                ? { think: `Il dolore dal vivo. Cosa succede adesso, e chi lo scopre, e quando?` }
                : { think: `Se andiamo avanti perdo l’unica cosa che potrei vedere: cosa succede adesso, e chi lo scopre.` },
            ];
          },
          prompt: `Una macchina si è fermata davanti a te e Gianni vuole proseguire. Cosa fai?`,
          hint: `Un guasto dal vivo è un dato che nessun questionario ti darà. Dove sta il costo vero: nel pezzo fermo, o nel tempo che serve a scoprirlo?`,
          tip: `Vedere il dolore dal vivo vale più di dieci interviste: segui la catena dell’informazione dal fermo macchina alla consegna e chiedi chi lo scopre, quando e cosa costa. Chi prosegue per cortesia perde un dato; chi si ferma e domanda a chi lavora lo guadagna, senza trasformare il guasto in una presentazione.`,
          choices: [
            ch('a', 3, `Chiedo a Gianni un minuto: con il capo squadra seguo la commessa dal fermo fino alla consegna, e mi faccio dire a ogni passaggio chi lo scopre e quando.`,
              (d) => (warmN1(d)
                ? `Con Gianni già dalla tua parte il fermo diventa una lezione: segui l’informazione dalla macchina alla consegna e fai spiegare il costo a chi lo vive.`
                : `Fermarsi quando il titolare vorrebbe proseguire è una piccola scommessa: ti ascolta perché la domanda riguarda il suo dolore, non il tuo prodotto.`),
              (d) => (warmN1(d) ? { t: 4, v: 10, u: 6, c: 2, r: -4 } : { t: 2, v: 6, u: 4, c: 2, r: -2 }),
              {
                next: 'RET',
                say: `Presidente, mi concede un minuto? Vorrei seguire questa commessa da qui fino alla consegna: chi scopre che la macchina è ferma, chi lo dice al cliente, e quando. Con il suo capo squadra, se possibile.`,
                react: [
                  { w: 'gianni', a: `con un mezzo sorriso`, t: `Fermarsi quando una macchina si ferma. Non l’avevo mai visto fare, a chi viene da fuori.` },
                  { n: `Il capo squadra ti racconta la catena: il pezzo è per un cliente di Treviso, la consegna è giovedì, e il fermo lo scoprirà l’ufficio spedizioni giovedì mattina. Venerdì il cliente telefonerà a Gianni. Di schede così, a turno, in reparto ne passano centodiciotto.` },
                  { think: `Il guasto dura un’ora. Il resto sono due giorni, e nessuno li ha mai contati.` },
                ],
              }),
            ch('b', 2, `Proseguo con Gianni, ma annoto l’ora del fermo e a fine mattina chiedo a Francesca quante volte succede in un mese e quanto costa alle consegne in ritardo.`,
              `Non perdi il filo e porti il fermo a chi ha i numeri: è una buona via laterale. Ma il momento in cui il reparto raccontava il dolore a caldo l’hai lasciato passare.`,
              { t: 2, v: 4, u: 2, c: 2 },
              {
                next: 'RET',
                say: `Va bene, Presidente, andiamo. Mi segno solo l’ora del fermo: a fine mattina chiedo a Francesca quante volte succede al mese e cosa costa, per lei, alle consegne.`,
                react: [
                  { n: `Scrivi “11:20” sul quaderno e sotto due parole: “quante volte?”. Gianni non le vede, e va bene così.` },
                  { think: `Un dato di seconda mano. Meglio di niente, peggio che vederlo.` },
                ],
              }),
            ch('c', 0, `Ne approfitto per mostrare a Gianni cosa farebbe la piattaforma: un allarme sul telefono del capo reparto, subito, e la commessa riprogrammata da sola.`,
              `Il guasto è suo, e Gianni lo vive come un vanto di quarant’anni incrinato in pubblico. Trasformare il suo dolore nel tuo prodotto, davanti ai suoi operai, ti fa passare da ospite a chi ha un listino da piazzare.`,
              { t: -6, v: -2, c: -2, r: 8 },
              {
                next: 'RET',
                say: `Presidente, guardi: è esattamente quello che farebbe la nostra piattaforma. Un allarme sul telefono del capo reparto, subito, e la commessa riprogrammata da sola.`,
                react: [
                  { w: 'gianni', a: `secco, ma educato`, t: `Il telefonino del capo reparto. Eh. Qui i telefonini stanno nell’armadietto.` },
                  { n: `L’operaio che ha scritto la scheda ti guarda un secondo, poi torna alla sua matita.` },
                  { think: `Ho parlato di allarmi a un uomo che sta ancora guardando la sua macchina.` },
                ],
              }),
            ch('d', 1, `Faccio finta di niente e proseguo con Gianni: non voglio mettere in imbarazzo il padrone di casa davanti ai suoi operai, né perdere il filo del giro.`,
              `Il tatto è apprezzato, ma il dato è perso: il momento in cui la macchina era ferma e la gente raccontava il problema non torna. Il dolore, quando si vede dal vivo, vale più di un’intervista.`,
              { t: 1, v: -2, u: -2, r: 2 },
              {
                next: 'RET',
                say: `Va benissimo, Presidente, andiamo pure. Non voglio trattenerla.`,
                react: [
                  { n: `Si riprende a camminare. Dietro di voi il telefono interno squilla ancora, e squilla a vuoto.` },
                  { think: `Ho evitato un imbarazzo e ho lasciato lì un dato.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'cliente_storico', title: `Arriva un cliente storico di Gianni`, w: 1, after: ['n2'],
        node: {
          when: `Giovedì · 09:30`, view: 'meeting', bg: 'office', where: `Ufficio del Presidente · giovedì 09:30`,
          scene: (d) => {
            const invited = invitedByGianni(d);
            return [
              { n: `Giovedì, nove e mezza. In corridoio, davanti alla porta del Presidente, c’è un cappotto grigio appeso alla stampella e un odore di dopobarba che non è di casa.` },
              invited
                ? { w: 'gianni', a: `sulla porta, senza abbassare la voce`, t: `Venga, venga. È arrivato Maran, quello delle trasmissioni: da trent’anni gli faccio i pezzi. Lei si siede e ascolta. Poi mi dice cosa ha capito.` }
                : { w: 'francesca', a: `a bassa voce, in corridoio`, t: `È Maran, un cliente storico: è dentro con papà. Resta qui, ti faccio entrare appena c’è un momento giusto. Non è detto che arrivi.` },
              { w: 'maran', a: invited ? `seduto di fronte a Gianni, senza girarsi` : `dall’interno, a porta socchiusa`, t: `Gianni, in trent’anni non mi hai mai tradito. Ma l’ultimo lotto è arrivato con tre settimane di ritardo e io avevo una linea ferma. Se succede ancora, non decido io: decide la mia direzione.` },
              invited
                ? { think: `Il cliente più importante della casa sta dicendo al fondatore, davanti a me, quanto gli costa il ritardo. Non capita due volte.` }
                : { think: `Sento tutto dalla porta socchiusa. È oro, ma se non lo uso resta una conversazione sentita di straforo.` },
            ];
          },
          prompt: `Un cliente storico dice al Presidente cosa gli costa il ritardo. Come usi questi minuti?`,
          hint: `Un cliente che parla dei propri costi ti regala la metrica più credibile che potrai avere: la sua. Come la raccogli senza rubare la scena a Gianni?`,
          tip: `Quando parla il cliente del tuo cliente, la tua parte è lasciare la scena a chi ospita e porre una sola domanda che trasformi la lamentela in un numero. Vendere in quel momento significa rubare la scena al padrone di casa e rovinare l’unica frase vera che stai ascoltando.`,
          choices: [
            ch('a', 3, `Chiedo a Maran una cosa sola: quanto gli costa in numeri un giorno di linea ferma per un ritardo di Brenta. Mi segno la cifra.`,
              (d) => (invitedByGianni(d)
                ? `La domanda giusta, nel momento giusto, con il padrone di casa che ti ha invitato: ottieni una cifra del cliente di Gianni, la metrica più credibile che potessi sperare.`
                : `Anche dal corridoio la domanda funziona e ottieni una cifra. Ma senza l’invito di Gianni pesa meno, e Maran la dà più per cortesia che per fiducia.`),
              (d) => ({ t: 4, v: invitedByGianni(d) ? 12 : 8, u: 6, c: 2, r: -3 }),
              {
                mp: ['M'], next: 'RET',
                say: `Mi scusi, signor Maran, una domanda sola: quanto vi costa, in numeri, un giorno di linea ferma per un ritardo di Brenta? Lo chiedo per capire quanto vale, per voi, la puntualità.`,
                react: (d) => (invitedByGianni(d)
                  ? [
                    { w: 'maran', a: `guarda Gianni, che annuisce`, t: `Una giornata di linea ferma? Quaranta, cinquantamila euro, con le penali verso i miei clienti.` },
                    { w: 'gianni', a: `si volta verso di te`, t: `Lo scriva. Lo scriva, questo.` },
                    { think: `Un numero che non è mio e non è di Francesca. È del cliente di Gianni, e Gianni l’ha sentito con le sue orecchie.` },
                  ]
                  : [
                    { n: `Maran esce dieci minuti dopo, il cappotto già in mano. Gli vai incontro sulla soglia, ti presenti e fai la tua domanda.` },
                    { w: 'maran', a: `si ferma, un po’ sorpreso`, t: `Una giornata di linea ferma? Quaranta, cinquantamila euro, con le penali. Lo dica pure a Gianni, se vuole: gliel’ho già detto io.` },
                    { think: `Un numero da chi lo paga. Ora devo usarlo con tatto: Gianni non sa che l’ho chiesto.` },
                  ]),
              }),
            ch('b', 2, `Resto in silenzio e ascolto fino in fondo; poi chiedo a Francesca di raccontarmi quante volte è successo e quanto è costato.`,
              `Non rubi la scena e raccogli il dato di seconda mano: prudente e corretto. Ma la cifra che Maran avrebbe detto volentieri a te la dovrai ricostruire con Francesca.`,
              { t: 3, v: 4, u: 2, c: 1 },
              {
                next: 'RET',
                say: `Non intervengo: ascolto fino in fondo e, appena posso, ne parlo con Francesca.`,
                react: [
                  { n: `Maran esce con il cappotto sul braccio e ti saluta con un cenno. Dalla porta aperta vedi Gianni, seduto a guardare il calendario.` },
                  { w: 'francesca', a: `più tardi, in corridoio`, t: `Era la terza volta quest’anno. Papà non lo dice, ma gli brucia.` },
                  { think: `Un “terza volta” senza una cifra. È un buon inizio, ma non è un numero.` },
                ],
              }),
            ch('c', 0, `Appena Maran finisce, dico che con il nostro sistema ritardi così non succederebbero più. Gianni sente che esiste una soluzione.`,
              `Prometti un risultato in casa d’altri, davanti a un cliente che ha appena detto la sua rabbia. Maran sente un fornitore che vende sulla sua pelle, e Gianni sente un ospite che gli ruba la scena.`,
              { t: -8, v: -2, c: -2, r: 8 },
              {
                next: 'RET',
                say: `Mi permetta, Presidente: con il nostro sistema ritardi di questo tipo non succederebbero più. Signor Maran, glielo garantisco.`,
                react: (d) => [
                  invitedByGianni(d) ? null : { n: `Non aspetti il momento giusto: apri la porta ed entri.` },
                  { w: 'maran', a: `secco`, t: `E lei chi sarebbe? Io parlo con Gianni.` },
                  { n: `Nessuno parla. Gianni guarda il calendario.` },
                  { think: `Ho promesso un risultato davanti a un cliente che non conosco, in casa di un uomo che si fida solo delle persone.` },
                ].filter(Boolean),
              }),
            ch('d', 1, `Mi allontano un momento per chiamare Davide e prepararmi alle domande tecniche: se Gianni mi coinvolge, voglio le risposte pronte.`,
              `Prepararsi è giusto, ma lo fai nel momento sbagliato: mentre il cliente più importante parla, tu sei altrove a occuparti di te. Il dato più prezioso della mattina passa senza di te.`,
              { u: -2, c: -2, r: 2 },
              {
                next: 'RET',
                say: `Mi allontano un momento per sentire Davide su una cosa tecnica. Torno subito.`,
                react: [
                  { n: `Quando torni davanti alla porta del Presidente, Maran ha finito. Sul tavolo c’è una tazzina vuota, e Gianni ti guarda con una domanda che non fa.` },
                  { think: `Ho preparato le risposte e ho perso la domanda.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'pranzo', title: `Il pranzo che non era in agenda`, w: 2, after: ['n3'],
        node: {
          when: `Venerdì · 12:40`, view: 'meeting', bg: 'office', where: `Sala riunioni · venerdì 12:40`,
          scene: (d) => [
            { n: chose(d, 'n3', 'c')
              ? `Venerdì, mezzogiorno e quaranta. Sei in sala riunioni con Davide. La tabella a cinque anni per Francesca è chiusa dal giorno prima; adesso lui rifà il piano per lunedì e lo rilegge per la terza volta, come fa con le cose che gli piacciono.`
              : `Venerdì, mezzogiorno e quaranta. Sei in sala riunioni con Davide, i portatili aperti. Il piano per lunedì è a metà, e lui sta rincorrendo una cella che non torna.` },
            { w: 'gianni', a: `sulla porta, il cappotto già addosso e le chiavi della Panda in mano`, t: `Oggi mangia con me. Non si discute: la Teresa ci tiene il tavolo. Le persone si conoscono a tavola, le carte vengono dopo.` },
            chose(d, 'n3', 'c')
              ? { w: 'davide', a: `sottovoce, senza alzare gli occhi`, t: `Vai. La tabella è chiusa, il piano lo finisco io. Ma lunedì non tornare a mani vuote.` }
              : { w: 'davide', a: `sottovoce, senza alzare gli occhi`, t: `Vai, se vuoi. Il piano lo finisco io, ma mi servono i tuoi numeri entro stasera, o lunedì siamo in ritardo.` },
            { think: `Due ore a tavola con il Presidente, oppure due ore per il piano che lunedì devo portargli.` },
          ],
          prompt: `Gianni ti vuole a pranzo e il pomeriggio era già pieno. Cosa fai?`,
          hint: `In un’azienda familiare il tempo passato a tavola non è tempo perso. Ma due ore possono costare un lavoro che lunedì serve: come le usi, o come le difendi?`,
          tip: `In una PMI familiare il pranzo è parte del processo di vendita: lì si capisce chi decide con chi e di cosa ha davvero paura il fondatore. Ma il tempo ha un costo reale: conviene decidere cosa si porta a tavola e cosa si lascia indietro.`,
          choices: [
            ch('a', 3, `Accetto volentieri: telefono in tasca, e tra il primo e il secondo gli chiedo come ha deciso l’ultimo investimento e chi c’era allora a tavola con lui.`,
              `Accetti il tempo e lo usi per capire come decide l’uomo che firma, e con chi. Paghi due ore di calendario e ricevi una mappa del potere raccontata dal fondatore in persona.`,
              (d) => ({ t: d.m.trust >= 40 ? 10 : 8, v: 2, u: -3, c: 6, r: -2 }),
              {
                next: 'RET',
                say: `Con piacere, Presidente. Mi faccia strada: e per una volta il telefono lo lascio in tasca.`,
                react: (d) => [
                  { n: `La trattoria è a due chilometri: tovaglie di carta, odore di brasato, tre uomini in tuta al bancone che salutano Gianni per nome. Il vino della casa arriva prima di qualsiasi domanda.` },
                  { n: `Tra il primo e il secondo gli chiedi come ha deciso l’ultimo grande investimento, e chi c’era con lui.` },
                  { w: 'gianni', a: `pulisce il bicchiere con il tovagliolo`, t: d.flags.sergioHostile
                    ? `Il centro di lavoro, nel duemilaundici. Ne ho parlato con mia moglie, con Renzo, col mio commercialista e col Sergio, che era contrario e aveva ragione. Poi ho deciso io. Ma non da solo, mai da solo.`
                    : `Il centro di lavoro, nel duemilaundici. Ne ho parlato con mia moglie, con il Sergio, con Renzo, e col mio commercialista. Poi ho deciso io. Ma non da solo, mai da solo.` },
                  { think: `Mi ha detto chi decide: lui, con quattro persone intorno. Una è Sergio, un’altra è il concorrente.` },
                ],
              }),
            ch('b', 2, `Accetto, ma prima chiedo a Davide di mandare a Francesca la bozza del piano, così il pomeriggio non resta indietro. In trattoria porto il quaderno.`,
              `Salvi il lavoro e tieni il pranzo: è un buon compromesso. Ma il quaderno sul tavolo dice a Gianni che stai lavorando, non che stai mangiando con lui.`,
              { t: 5, v: 2, u: -2, c: 2 },
              {
                next: 'RET',
                say: `Con piacere, Presidente. Un minuto per dire una cosa a Davide, e sono da lei.`,
                react: [
                  { n: `Mandi due righe a Davide e, nella trattoria, tra il pane e l’olio, appoggi il quaderno sul tavolo.` },
                  { w: 'gianni', a: `guardando il quaderno`, t: `Lavora anche a tavola, lei. Io no: a tavola si mangia.` },
                  { think: `Il lavoro l’ho portato a pranzo. A lui è sembrato un segno di fretta.` },
                ],
              }),
            ch('c', 1, `Accetto e uso il pranzo per chiudere: tra l’antipasto e il caffè gli rimetto davanti il piano di Davide, con le tappe, e la data possibile per la firma.`,
              `Un pranzo di relazione trasformato in riunione commerciale: Gianni sente che l’hai portato a tavola per vendergli. Il tempo l’hai speso, e la fiducia che ne sarebbe nata l’hai rimandata.`,
              { t: -4, v: 2, u: 2, c: 2, r: 4 },
              {
                next: 'RET',
                say: `Presidente, già che siamo qui le faccio vedere due cose: il piano di Davide, con le tappe, e la data possibile per la firma.`,
                react: [
                  { w: 'gianni', a: `appoggia la forchetta`, t: `A tavola si mangia e si chiacchiera, le carte vengono dopo. Gliel’avevo detto sulla porta.` },
                  { n: `Il resto del pranzo è cortese e corto. Il caffè arriva senza dolce.` },
                  { think: `Il pranzo era il lavoro. L’ho trasformato in una riunione, e lui se n’è accorto.` },
                ],
              }),
            ch('d', 1, `Ringrazio ma declino: oggi devo chiudere il piano con Davide prima di lunedì. Gli propongo un caffè in piedi, alle cinque, in ufficio, per dieci minuti.`,
              `Proteggi il lavoro e perdi un’occasione: in una PMI familiare un invito rifiutato pesa più di un piano in ritardo. Funziona solo se il rapporto è già solido; altrimenti è un segnale di distanza.`,
              (d) => ({ t: d.m.trust >= 55 ? -2 : -6, v: 4, u: 2, c: 4, r: 2 }),
              {
                next: 'RET',
                say: `Presidente, la ringrazio, ma oggi devo chiudere il piano con Davide prima di lunedì. Se vuole, ci vediamo per un caffè in piedi alle cinque, in ufficio, dieci minuti.`,
                react: [
                  { w: 'gianni', a: `dopo un attimo, rimettendo le chiavi in tasca`, t: `Come vuole. Mangio da solo, allora. Non è la prima volta.` },
                  { w: 'davide', a: `a bassa voce`, t: `Ce l’avremmo fatta lo stesso, sai. Ma hai perso un pranzo con lui.` },
                  { think: `Ho guadagnato un pomeriggio e perso un tavolo.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'prova_gratuita', title: `InfoSistemi arriva con una prova gratuita`, w: 2, after: ['n4'],
        node: {
          when: `Mercoledì · 08:40`, view: 'walk', where: `Reparto produzione · mercoledì 08:40`,
          scene: (d) => [
            { n: `Mercoledì mattina presto, il reparto è ancora quasi vuoto. Su un tavolo da lavoro, tra una pila di bolle e un termos di caffè, c’è un portatile che non è tuo, con un adesivo azzurro sul coperchio: InfoSistemi Nordest.` },
            { w: 'pegoraro', a: `a voce alta, già con la mano tesa`, t: `Ah, lei è di Nexora! Renzo Pegoraro, piacere. Non si disturbi, siamo qui solo a far vedere due cose a Sergio. Una prova gratuita, trenta giorni, niente impegno: se non va bene la spegniamo e ci stringiamo la mano lo stesso.` },
            { w: 'pegoraro', a: `strizzando l’occhio`, t: `E per marzo, mi hanno detto, Gianni aspetta tutto in funzione. Noi? In due settimane si accende e va: poi si cresce.`, if: (x) => !!x.flags.overpromise },
            d.flags.sergioOn
              ? { w: 'sergio', a: `a mezza voce, solo a te`, t: `È venuto senza avvisare. Gianni lo sa: gli ha telefonato Renzo ieri sera. Io gli ho detto che il pilota è già deciso. Il portatile l’ha lasciato lo stesso.` }
              : d.flags.sergioHostile
                ? { w: 'sergio', a: `senza guardarti`, t: `Questi almeno parlano la nostra lingua. Poi vedremo.` }
                : { n: `Sergio, dietro di lui, non ti guarda.` },
            d.flags.sergioOn
              ? { think: `Sergio mi ha avvisato. Non è un amico: è un alleato che ha deciso di dirmelo.` }
              : d.flags.sergioHostile
                ? { think: `Non l’ha portato Sergio. Ma Sergio gli ha lasciato la porta aperta.` }
                : { think: `Non è Sergio ad aver aperto la porta. Ma non l’ha nemmeno chiusa.` },
          ],
          prompt: `Il concorrente locale è in reparto con una prova gratuita. Che fai?`,
          hint: `Una prova gratuita non è un prezzo: è un dubbio che il cliente può misurare con le sue mani. Cosa dai a Gianni e a Sergio per giudicare anche te?`,
          tip: `Contro una prova gratuita non serve difendersi né denigrare: serve trasformare il confronto in un test equo, con criteri scritti dal cliente e risultati che anche il tuo pilota può mostrare. Chi dichiara in anticipo cosa verrà misurato, decide la partita.`,
          choices: [
            ch('a', 3, `Saluto Pegoraro con calore e propongo a Sergio un confronto leale: stessi problemi, stessi dati, stessa settimana. Quello che funziona meglio lo usiamo.`,
              (d) => (d.flags.sergioOn
                ? `Con Sergio dalla tua parte il confronto leale ti conviene: i criteri li ha scritti lui e il pilota si misura sui suoi problemi. Hai trasformato la prova gratuita in un test che conosci.`
                : `Il confronto leale è la risposta giusta, ma a chi non ha Sergio dalla sua parte costa di più: i criteri li scrive chi ha la fiducia del reparto, e quella, per ora, non è tua.`),
              (d) => (d.flags.sergioOn ? { t: 6, v: 4, c: 8, r: -8 } : { t: 2, v: 2, c: 3, r: 0 }),
              {
                mp: ['Co'], next: 'RET',
                say: `Piacere, signor Pegoraro, ben venga. Sergio, le propongo una cosa semplice: i problemi di oggi, gli stessi dati e la stessa settimana per tutti e due. Quello che funziona meglio, lo usiamo.`,
                react: (d) => [
                  { w: 'pegoraro', a: `ride, battendo una mano sul tavolo`, t: `Mi piace, mi piace! Così si fa, tra gente di mestiere.` },
                  d.flags.sergioOn
                    ? { w: 'sergio', a: `quasi sorridendo`, t: `Allora scrivo i problemi. E li scrivo uguali per tutti.` }
                    : { w: 'sergio', a: `dopo un po’, a malincuore`, t: `Io non ho preferenze. Vince quello che mi toglie i fogli.` },
                  { think: `Non ho parlato del prezzo e non ho parlato di lui. Ho parlato del test.` },
                ],
              }),
            ch('b', 2, `Chiedo a Gianni, in privato, se la prova gratuita l’ha decisa lui: voglio capire quanto è seria prima di muovermi, e lasciargli il tempo di dirmelo.`,
              `Chiedere a Gianni prima di agire rispetta i suoi equilibri e ti dà un’informazione vera. Ma lasci la prova a Sergio e a Pegoraro per un’altra mezza giornata: stanno già parlando, e tu no.`,
              { t: 2, c: 4, r: -1 },
              {
                next: 'RET',
                say: `Presidente, mi scusi: la prova gratuita nel reparto l’ha voluta lei, o è un’idea di Renzo? Preferisco saperlo prima di muovermi.`,
                react: [
                  { w: 'gianni', a: `dopo un silenzio, sul piazzale`, t: `Renzo ha chiesto, io ho detto di sì. A un amico non si dice di no. Ma la decisione non è presa, creda.` },
                  { think: `Un’informazione vera: l’amicizia pesa, la decisione no. Ma ho perso mezza mattina.` },
                ],
              }),
            ch('c', 0, `Faccio notare a Sergio, davanti a Pegoraro, che le prove gratuite si vedono bene all’inizio, ma che i costi di un sistema scollegato escono dopo, in produzione.`,
              `Parlare in reparto della prova di un amico del titolare, davanti a chi dovrà usarla, equivale a parlare di lui. Hai trasformato un test in una questione di stile, e lo stile, in casa Brenta, è la tua parte più debole.`,
              { t: -8, c: -4, r: 10 },
              {
                next: 'RET',
                say: `Le prove gratuite si vedono bene all’inizio. I costi di un sistema che non parla con il resto escono dopo, in produzione. Lo dico per esperienza, Sergio.`,
                react: [
                  { w: 'pegoraro', a: `sempre cordiale, ma fermo`, t: `Quelli di Nexora hanno tanta esperienza, si vede. Noi qui ci siamo: se si pianta una macchina, il telefono lo sentiamo squillare noi, non un call center.` },
                  { w: 'sergio', a: `a mezza voce`, t: `Lo dicono tutti, di tutti.` },
                  { think: `Ho parlato male di un concorrente in casa del suo amico.` },
                ],
              }),
            ch('d', 1, `Offro anch’io una prova gratuita: un mese di accesso al nostro sistema nel reparto che sceglie Sergio, senza impegno, per pareggiare l’offerta.`,
              `Rispondere al gratuito con il gratuito significa accettare il gioco del concorrente: il confronto passa a chi regala di più, e a quel gioco un fornitore locale vince sempre. Se il tuo sistema è gratis per un mese, perché dovrebbe costare duecentosessantamila euro?`,
              { t: -1, v: -4, c: -3, r: 3 },
              {
                next: 'RET',
                say: `Se c’è una prova gratuita, la facciamo anche noi: un mese di accesso al nostro sistema nel reparto che sceglie Sergio, senza impegno. Così si pareggia.`,
                react: [
                  { w: 'pegoraro', a: `allarga le braccia`, t: `Due prove! Questa è la fiera di marzo anticipata. Sergio, adesso ha due gestionali da guardare: buon appetito.` },
                  { think: `Ho regalato un mese di Nexora per guadagnarmi il diritto di essere uguale a lui.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'banca_ritarda', title: `La banca ritarda il leasing`, w: 2, after: ['n5'],
        node: {
          when: `Sabato · 10:20`, view: 'phone', where: `Telefono · sabato 10:20`,
          scene: (d) => [
            { n: `Sabato, dieci e venti. Sei in coda alla cassa del supermercato quando il telefono vibra. Francesca, di sabato mattina: da lei non è mai una buona notizia.`, sfx: 'phone' },
            d.flags.giveGet
              ? { chat: { from: 'francesca', app: 'WhatsApp' }, t: `La banca che istruisce il leasing ha spostato la delibera: il comitato si riunisce tra dieci giorni, non tra quattro. Papà dice che con i pagamenti a fasi il primo esborso è piccolo. Vuole sentire da te se si può partire lo stesso.` }
              : { chat: { from: 'francesca', app: 'WhatsApp' }, t: `La banca che istruisce il leasing ha spostato la delibera: il comitato si riunisce tra dieci giorni, non tra quattro. Senza leasing papà non firma, e dice che “con Renzo non si aspettavano le banche”. Cosa gli dico?` },
            d.flags.giveGet
              ? { think: `Con i pagamenti a fasi il primo esborso è piccolo: il ritardo si assorbe, se Gianni non perde la pazienza.` }
              : { think: `Senza pagamenti a fasi tutto il peso è sul leasing: se la banca slitta, slitta tutto.` },
          ],
          prompt: `La banca ritarda il leasing e Gianni perde la pazienza. Come aiuti Francesca?`,
          hint: `La banca non è una tua controparte, ma è sulla tua strada. Cosa può fare un fornitore che non sia premere o regalare?`,
          tip: `Quando un terzo ritarda, il fornitore ha tre leve legittime: ridurre l’esposizione (fasi e pagamenti a tappe), semplificare il fascicolo che l’altro deve leggere e tenere informato chi decide. Regalare sconto o forzare la banca sposta il problema, non lo risolve.`,
          choices: [
            ch('a', 3, `Propongo di spezzare l’ordine: il pilota parte subito con fondi vostri, il resto aspetta il leasing. Intanto preparo con Davide una pagina per il comitato.`,
              (d) => (d.flags.giveGet
                ? `Con il pagamento a fasi il pilota è finanziabile in autonomia: spezzare l’ordine toglie peso alla banca e tempo al ritardo. Il fascicolo di una pagina semplifica la vita a chi deve decidere.`
                : `Spezzare l’ordine e semplificare il fascicolo è la risposta giusta. Senza pagamenti a fasi, però, il pilota da solo pesa sulle tasche di Gianni più di quanto dovrebbe, e lui lo sentirà.`),
              (d) => (d.flags.giveGet ? { t: 4, c: 8, u: 4, r: -7 } : { t: 2, c: 4, u: 2, r: -3 }),
              {
                next: 'RET',
                say: `Francesca, facciamo così: il pilota parte subito con fondi vostri, e il resto dell’ordine aspetta il leasing. Intanto io e Davide prepariamo una pagina sola per il comitato, con il piano e le date.`,
                react: (d) => [
                  { w: 'francesca', a: `dopo una pausa`, t: d.flags.giveGet
                    ? `Con i fondi nostri il pilota può partire. Papà accetta, ma vuole essere lui a dirlo in banca.`
                    : `Per papà un pilota con i soldi suoi è un’altra cosa. Provo a presentarglielo come una prova di fiducia, non come un anticipo.` },
                  { think: `Ho spostato il peso dalla banca alla scelta di Gianni: per lui è una scelta, non un ritardo.` },
                ],
              }),
            ch('b', 2, `Dico a Francesca di stare tranquilla: sento io il direttore di filiale lunedì mattina e le porto una data precisa. Intanto, in azienda, nessuno tocca niente.`,
              `Offrire di muoverti con la banca è utile, ma entri in una conversazione che non è tua, senza il permesso di Francesca e senza che lei sia in copia: funziona solo se lei lo vuole davvero.`,
              { t: 2, c: 2, r: -1 },
              {
                next: 'RET',
                say: `Francesca, stai tranquilla: lunedì mattina sento io il direttore di filiale e ti porto una data. Intanto non toccare niente.`,
                react: [
                  { w: 'francesca', a: `esita`, t: `Preferirei sentirlo io, il direttore. Ma se lo senti con me in copia, va bene.` },
                  { think: `Meglio che mi lasci in copia. Meglio ancora se me lo chiede lei.` },
                ],
              }),
            ch('c', 0, `Offro un ulteriore 3% se Gianni firma comunque lunedì, senza aspettare il comitato: così il ritardo non diventa un ostacolo e il pilota parte subito.`,
              `Regalare sconto per un problema che non è tuo non risolve il ritardo della banca: lo compra. E ti toglie margine proprio quando il cliente aveva bisogno di un’idea, non di un taglio.`,
              { t: -3, v: -6, c: -3, r: 4, d: 3 },
              {
                next: 'RET',
                say: `Francesca, se Gianni firma comunque lunedì, gli riconosco un ulteriore tre per cento: così il ritardo della banca non diventa un ostacolo e il pilota parte subito.`,
                react: [
                  { w: 'francesca', a: `dopo un attimo, fredda`, t: `Il tre per cento non cambia la data del comitato. Cambia il tuo prezzo.` },
                  { think: `Ho pagato un ritardo che non era mio, e non l’ho nemmeno accorciato.` },
                ],
              }),
            ch('d', 1, `Dico a Francesca che la firma può aspettare i dieci giorni del comitato: meglio un leasing fatto bene che una corsa, e in famiglia nessuno si sente spinto.`,
              `La pazienza è una virtù, ma in una trattativa senza data diventa deriva: la firma aspetta e, nel frattempo, il concorrente locale ha dieci giorni per telefonare a Gianni. Hai tolto la tua urgenza insieme a quella della banca.`,
              { u: -6, c: -3, r: 4 },
              {
                next: 'RET',
                say: `Francesca, per noi la firma può aspettare i dieci giorni del comitato. Meglio un leasing fatto bene che una corsa: così nessuno si sente spinto.`,
                react: [
                  { w: 'francesca', t: `Allora aspettiamo. Ma papà non è uno che sa aspettare, e Renzo lo chiama ogni mattina.` },
                  { think: `Ho tolto fretta alla banca. L’ho tolta anche a me.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'banca_nega', title: `La banca nega il leasing`, kind: 'neg', w: 2,
        hit: (d) => !(d.flags.paperReady && (d.flags.phased || d.flags.giveGet)),
        dp: -0.30, dpProt: -0.03,
        hitText: `Alle 10:15 Francesca ti chiama con la voce di chi ha già smesso di arrabbiarsi: la banca nega il leasing. Nel fascicolo il comitato non trova un solo motivo per rischiare: l’importo è intero, su un ordine solo, e niente lo lega ai risultati. Gianni, senza finanziamento, non firma: “Ne riparliamo dopo la fiera”.`,
        protText: `Alle 10:15 il comitato nega il leasing sull’importo intero. Ma il piano di progetto è già in filiale, con le fasi e le date: Francesca chiede di rifare la delibera solo sulla prima fase, e il direttore di filiale, che il documento lo conosce a memoria, la firma in due ore.`,
      },
      {
        id: 'gianni_cena', title: `Gianni cambia idea dopo una cena`, kind: 'neg', w: 2,
        hit: (d) => !(d.m.trust >= 55 && d.flags.sergioOn && d.mp.has('Co')),
        dp: -0.32, dpProt: -0.03,
        hitText: `Alle 09:10 ti chiama Francesca: ieri sera Gianni ha cenato con Renzo Pegoraro, e stamattina in azienda dice che “forse conviene fare le cose in casa, tra gente che si conosce”. Nessuno ha un motivo scritto per fargli cambiare idea; quando lo chiami ti risponde in due righe: “Mi lasci pensare, sono vecchio”.`,
        protText: `Alle 09:10 Francesca ti avvisa: ieri sera Gianni ha cenato con Pegoraro e stamattina ha qualche dubbio. Ma lei ha già in mano le ragioni, con i numeri, per cui non andare da Renzo, e Sergio, che del pilota parla ormai come di una cosa sua, è salito da Gianni prima di te. A mezzogiorno è Gianni a telefonarti: “Mi hanno convinto i miei. Si va avanti”.`,
      },
      {
        id: 'fiera_anticipa', title: `La fiera anticipa e Gianni vuole la prima fase`, kind: 'pos', w: 1,
        if: (d) => d.mp.has('E'),
        hit: (d) => !!d.flags.phased && !d.flags.overpromise,
        dp: 0.12, dpProt: 0,
        hitText: `Il consorzio della fiera anticipa l’apertura di quattro settimane e Gianni, alle 08:20, ti chiama prima ancora del caffè: “Mi porti la prima fase. Il reparto che abbiamo scelto, in funzione, a metà febbraio. Dove firmo?”. Hai un pilota con un reparto e una data: per una volta la fretta di Gianni è la tua.`,
        protText: `Il consorzio della fiera anticipa l’apertura di quattro settimane e Gianni ti chiama alle 08:20: “Mi porti la prima fase”. Ma una prima fase, tra le carte, non l’avete mai scritta, e la data che hai davanti non regge. L’occasione ti passa accanto, e la coglierà chi aveva già qualcosa da mostrare: Renzo, per esempio.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Best Case al 50%: “Gianni ha detto che a marzo vuole vedere tutto funzionare”`,
      people: {
        E: `Gianni Brenta (Presidente)`,
        C: `Francesca Brenta (CFO)`,
        Dp: `Gianni e Francesca Brenta, con la banca del leasing`,
        P: `Francesca Brenta e la banca che finanzia il leasing`,
        M: `Francesca Brenta, con i numeri della chiusura mensile`,
        I: `Gianni Brenta e Sergio Dal Bianco`,
        Dc: `Sergio Dal Bianco e Francesca Brenta`,
        Co: `Renzo Pegoraro (InfoSistemi Nordest), amico di Gianni da vent’anni`,
      },
      risk: `Il rischio vero è che Gianni si ricordi di “marzo” più di quanto ricordi il piano, o che InfoSistemi la spunti all’ultimo per amicizia, con una cena.`,
      custom: [
        {
          id: 'gianni_testimoni', if: () => true, has: (d) => !!(d.flags.giveGet && d.flags.paperReady),
          q: `Dimmi una cosa su Gianni: il sì te l’ha dato davanti a Francesca, o solo a te? Nelle aziende di famiglia ho imparato che una stretta di mano in due si dimentica, in tre no.`,
          evidence: `Davanti a lei: venerdì ha detto sì al pagamento a fasi con Francesca seduta di fronte, e il piano di progetto è già alla banca. Chiedilo pure a lei.`,
          honest: `A voce: da Francesca non ho ancora niente di scritto. Finché il sì non passa anche da lei, smetto di darlo per fatto e per ora lo porto più in basso.`,
          bluff: `Davanti a lei, certo: c’era Francesca quando ci siamo stretti la mano, e il piano è già in banca. Ti giro la mail appena la ritrovo, non è un problema.`,
          vague: `Gianni è uno che la parola la rispetta: in due settimane non mi ha mai detto una cosa per un’altra. Il sì tra noi c’è; chi altro ci fosse non è il punto.`,
          react: {
            evidence: `Bene: due persone, una formula, una banca. È il primo sì che riesco a mettere nel CRM senza virgolette. Scrivilo nella scheda con il nome di Francesca e lo lascio dove l’hai messo.`,
            honest: `Grazie. Un sì che non passa da un foglio è una bella frase, ma la banca non la legge. Questa settimana vai da Francesca e fatti ripetere il sì davanti a un foglio. Intanto resta dov’è.`,
            bluffCaught: `Nel CRM su Brenta c’è una nota sola, scritta da te: “stretta di mano, ottimo clima”. Nessuna mail di Francesca. Non ti faccio la predica: ti chiedo di non scrivere “davanti a lei” se non l’hai ancora chiesto a lei.`,
            bluffPassed: `Ok, lo scrivo. Ma venerdì voglio la mail di Francesca, anche due righe: se arriva, ti chiedo scusa io. Se non arriva, lo rivedo senza chiederti il permesso.`,
            vague: `“Non è il punto” è esattamente il punto. Con le aziende di famiglia il sì conta se lo sente anche chi tiene i conti. Torna da Francesca e fatti dare una riga.`,
          },
        },
        {
          id: 'sergio_dentro', if: () => true, has: (d) => !!d.flags.sergioOn,
          q: `Sergio è dentro, o è solo uno che non ti ha ancora detto di no? Il direttore di produzione, in una meccanica, è quello che decide se il sistema si usa o resta nel cassetto.`,
          evidence: `È dentro: ha capito che il sistema gli toglie i fogli, e il pilota parte da lì. Non è più uno che aspetta di vedere come va, adesso ha voce in capitolo.`,
          honest: `Non ho niente di scritto da lui: so che non mi ha detto di no, ma un sì vero non l’ho ancora in mano. Finché non si espone, per me non è ancora dentro.`,
          bluff: `È dentro: ho fatto una demo con i loro dati, ha riconosciuto che gli risparmia i fogli e ha dato la disponibilità a guidare il reparto pilota, per iscritto.`,
          vague: `Sergio è uno diretto: se avesse qualcosa contro, me l’avrebbe detto in faccia. In reparto ci siamo visti più volte e non mi ha detto niente: per me è a favore.`,
          react: {
            evidence: `Un capo reparto che ha capito dove il sistema gli serve e da lì fa partire il pilota: è proprio quello che manca a metà dei miei Commit. Lo segno.`,
            honest: `Hai fatto bene a dirlo: “non mi ha detto di no” non è un sì, ed è l’errore più comune quando c’è di mezzo un capo reparto. Fissa un’ora con lui, in reparto, prima di venerdì. Se serve, ti accompagna Davide.`,
            bluffCaught: `Nella scheda di Brenta, a Sergio non corrisponde niente: nessun ruolo, nessuna riga sua, nessun nome nel piano. Meglio saperlo ora che in produzione: lo rimetto in Best Case e ci lavoriamo.`,
            bluffPassed: `Va bene, mi basta. Ma portami una riga di Sergio, anche una mail di due parole, entro giovedì: sulla produzione non voglio fidarmi nemmeno di me stessa.`,
            vague: `“Non mi ha detto niente” non è un favore, è un silenzio. In reparto, il silenzio di un direttore di produzione è l’inizio del sabotaggio più educato. Dammi una frase sua.`,
          },
        },
        {
          id: 'marzo_contratto', if: () => true, has: (d) => !!(d.flags.phased && !d.flags.overpromise && d.flags.paperReady),
          q: `Il go-live a marzo è nel contratto, o è una frase detta in ufficio con una stretta di mano? I contratti si leggono tra due anni, le strette di mano si ricordano già a gennaio.`,
          evidence: `È nel piano di progetto che ha visto anche la banca: marzo vale per il reparto pilota, non per tutto. Il resto del progetto ha agosto, per iscritto.`,
          honest: `A parole: Gianni ricorda “marzo” e basta. Su cosa c’è e cosa non c’è a marzo non ho ancora un suo sì scritto, e intanto non lo difendo come sicuro.`,
          bluff: `È tutto nel piano allegato al contratto, con le date per fase. Gianni l’ha letto ieri e ha detto che per lui va bene così: marzo vale per il pilota.`,
          vague: `Marzo lo abbiamo chiaro tutti: Gianni sa che il progetto richiede il suo tempo e che il pilota è la parte per la fiera. Ne abbiamo parlato più volte.`,
          react: {
            evidence: `Perfetto: il pilota a marzo e il resto ad agosto, scritti nello stesso posto. È la parte più rara di un forecast. Mandami la pagina e lo tratto come un Commit con i piedi per terra.`,
            honest: `Grazie per la chiarezza. “A parole” su una data è un debito: lo paghi tu, con gli interessi, quando Gianni se la ricorda. Mettila nel piano con il suo nome sotto e poi ne riparliamo.`,
            bluffCaught: `Ho il piano davanti: non c’è nessuna data di marzo per il pilota, e nessuna firma di Gianni. Se l’hai data per scritta ti capisco, ma la differenza tra una frase e una riga la paghiamo in due.`,
            bluffPassed: `Ok, ti credo. Ma voglio la pagina del piano con la data del pilota entro mercoledì: su una promessa di fiera non faccio atti di fede.`,
            vague: `“Ne abbiamo parlato più volte” non è una riga di contratto. Un titolare di vecchio stile ricorda una data e basta; il resto lo dimentica. Se non c’è scritta, per lui è marzo e fine della storia.`,
          },
        },
      ],
    },

    endings: {
      won: `Gianni firma con la penna con cui, racconta, firmò il primo ordine nel 1984, e ti stringe la mano un secondo di troppo, come il primo giorno. Alla fiera di marzo i clienti di Gianni vengono portati a vedere il reparto che gira con il nuovo sistema, uno alla volta. Francesca ti manda una foto senza commento.`,
      lost: `InfoSistemi presenta il suo preventivo e Gianni, fedele agli amici, lo accetta con una stretta di mano al bar. Francesca ti scrive due righe di scuse e una frase che non è nel preventivo: “Papà ha scelto chi conosce. Capita”. Fra due anni, forse, ci risentiamo.`,
      slip: `Gianni rimanda tutto a “dopo la fiera”, con la cordialità di chi non ha ancora deciso di dirti di no. La relazione resta calda; la firma no.`,
    },
    lessons: [
      { if: (d) => d.m.trust >= 60, good: true, t: `Hai investito tempo vero nella relazione con il titolare: in un’azienda familiare la firma segue la fiducia, non il contrario.` },
      { if: (d) => d.m.trust < 55, good: false, t: `Il titolare non si è fidato abbastanza di te. In queste aziende il concorrente locale vince spesso solo per questo, e con una cena.` },
      { if: (d) => d.flags.sergioOn, good: true, t: `Hai dato a Sergio la regia del pilota. Chi usa il sistema ogni giorno è il primo cliente interno: trattarlo da protagonista paga.` },
      { if: (d) => d.flags.sergioHostile, good: false, t: `Hai trattato Sergio da ostacolo, e lo è diventato. Un utente influente ignorato è un sabotatore con tempo a disposizione.` },
      { if: (d) => d.flags.overpromise, good: false, t: `Hai promesso marzo. La promessa è la scorciatoia più comoda e il debito più caro: lo pagherai a progetto avviato.` },
      { if: (d) => d.flags.phased && !d.flags.overpromise, good: true, t: `Hai trasformato la scadenza in due fasi con un risultato visibile per la fiera: onestà e ambizione possono convivere.` },
      { if: (d) => d.flags.giveGet, good: true, t: `Hai dato al titolare una vittoria raccontabile in cambio di un impegno: pagamento a fasi invece di sconto secco.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
