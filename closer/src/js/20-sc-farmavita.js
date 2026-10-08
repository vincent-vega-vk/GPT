/* Scenario 1 · FarmaVita · multi-threading, Economic Buyer, business case, give-get
   v2: scenario di riferimento per stile e struttura (prima persona, identità propria, widget firma, imprevisti, shock, forecast). */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    elisa: { name: `Elisa Marchetti`, role: `VP Operations · il tuo champion`, hue: 205 },
    sala: { name: `Bruno Sala`, role: `CIO`, hue: 28 },
    villa: { name: `Roberto Villa`, role: `CFO · Economic Buyer`, hue: 150 },
    chiara: { name: `Chiara Neri`, role: `Responsabile Acquisti`, hue: 320 },
    anna: { name: `Anna Ferrante`, role: `Direttrice Qualità`, hue: 265 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
  };
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });
  const visited = (d, node) => d.hist.some((h) => h.node === node);

  CL.registerScenario({
    id: 'farmavita',
    title: `Il Champion Fantasma`,
    client: `FarmaVita S.p.A.`,
    sector: `Pharma · Latina`,
    hook: `Un solo contatto, un CRM che dice “Commit” e un CFO che non hai mai visto.`,
    brief: `Suite di tracciabilità lotti e supply chain con validazione GxP: €480k di ACV a listino. Elisa Marchetti, VP Operations, è entusiasta e ripete che “il board approva a novembre”. Ma in quattro mesi hai parlato solo con lei. Nel CRM il deal è in Commit all’80%.`,
    scout: `Tutte le email arrivano da Elisa. Nessun contatto con CFO, IT o Qualità. La data del board è una sua frase, non un documento. Il vendor attuale ha un contratto fino al 2028.`,
    teaches: [`Mutual close plan`, `Multi-threading`, `Business case col CFO`, `Give-get`],
    list: 480, cost: 3, window: [1, 8], stars: 3, lep: 15, slip: 0.3,
    crm: { cat: `Commit`, prob: 80 },
    cast: CAST,

    /* ───── identità: laboratorio, compliance ───── */
    theme: {
      id: 'lab', label: `Stabilimento FarmaVita · Latina`, bg: 'lab',
      accent: '#0e7c86', accentDark: '#4fd1c5', ambience: 'lab',
      motto: `In farmaceutica la compliance non è un reparto: è la lingua in cui si decide.`,
    },
    intro: {
      when: `Lunedì · 08:55`, where: `La tua scrivania`, view: 'desk', bg: 'office',
      scene: [
        { n: `Lunedì mattina. Sul secondo schermo il CRM è aperto sulla riga di FarmaVita: €480k, Commit, 80%. Il caffè è già freddo.` },
        { think: `Quattro mesi. Ho parlato con una persona sola. E nel CRM c’è scritto 80%.` },
        { chat: { from: 'marta', app: 'Slack' }, t: `{nome}, FarmaVita è nel mio commit di questo trimestre. Dimmi tu se lo è davvero, prima che me lo chieda il CRO.`, sfx: 'ping' },
        { think: `Se rispondo “sì” senza saperlo, il problema non è più di FarmaVita. È mio.` },
        { n: `Il telefono vibra sulla scrivania. Sul display: Elisa Marchetti.`, sfx: 'phone' },
      ],
    },

    /* ───── widget firma ───── */
    hud: [
      {
        type: 'stakeholders', title: `Mappa del potere`,
        build: (d) => {
          const f = d.flags, has = (k) => d.mp.has(k);
          return [
            P('elisa', f.bypassed ? 'skeptic' : has('C') ? 'champion' : 'ally', f.bypassed ? `Si è sentita scavalcata.` : has('C') ? `Vende per te, e adesso ha un piano.` : `Entusiasta, ma non ancora testata.`),
            P('sala', f.overclaimGxp ? 'hostile' : f.gxpPath ? 'ally' : f.cioMeeting ? 'neutral' : 'skeptic', f.overclaimGxp ? `Ti ha colto in fallo sulla validazione.` : f.gxpPath ? `Ha scritto i suoi tre criteri. Ti ascolta.` : f.cioMeeting ? `Ha visto il tuo materiale. Non è convinto.` : `Freddo: “il vendor attuale funziona”.`),
            P('villa', f.ebEngaged && f.bizCase ? 'ally' : f.ebEngaged ? 'neutral' : 'unknown', f.ebEngaged && f.bizCase ? `Discute i numeri con i suoi dati.` : f.ebEngaged ? `Ti ha dato venti minuti, non un sì.` : f.cfoAccess ? `Elisa sta cercando di fissare un incontro.` : `Mai incontrato.`),
            P('chiara', f.giveGet ? 'neutral' : visited(d, 'n5') ? 'skeptic' : 'unknown', f.giveGet ? `Ha scambiato sconto contro durata.` : visited(d, 'n5') ? `Chiede il 20% e prezzo bloccato.` : `Non è ancora in scena.`),
            P('anna', f.overclaimGxp ? 'hostile' : f.gxpPath ? 'neutral' : 'unknown', f.overclaimGxp ? `Pretende evidenza di convalida completa.` : f.gxpPath ? `Sa cosa fa e cosa non fa il prodotto.` : `Non l’hai ancora incontrata.`),
          ];
        },
      },
      {
        type: 'scorecard', title: `Il CRM contro la realtà`,
        build: (d) => {
          const f = d.flags, has = (k) => d.mp.has(k);
          return [
            { k: 'budget', label: `Budget approvato`, crm: `Sì, a novembre`, real: has('Dp') ? `Da votare il 14/11, piano scritto` : `Da votare: data non verificata`, st: has('Dp') ? 'warn' : 'bad' },
            { k: 'eb', label: `Economic Buyer allineato`, crm: `Sì`, real: f.ebEngaged ? (f.bizCase ? `Incontrato, numeri sul tavolo` : `Incontrato una volta`) : `Mai incontrato`, st: f.ebEngaged ? (f.bizCase ? 'good' : 'warn') : 'bad' },
            { k: 'gxp', label: `Criteri GxP definiti`, crm: `Sì`, real: f.gxpPath ? `Tre criteri scritti con l’IT` : f.overclaimGxp ? `Hai promesso ciò che il prodotto non ha` : `Non definiti`, st: f.gxpPath ? 'good' : f.overclaimGxp ? 'bad' : 'bad' },
            { k: 'comp', label: `Alternative mappate`, crm: `Nessuna`, real: has('Co') ? `Vendor attuale fino al 2028` : `Non mappate`, st: has('Co') ? 'good' : 'warn' },
            { k: 'paper', label: `Iter contrattuale`, crm: `Standard`, real: f.paperReady ? `Avviato in parallelo` : `Non avviato`, st: f.paperReady ? 'good' : 'warn' },
          ];
        },
      },
      {
        type: 'timeline', title: `Il piano di chiusura`,
        build: (d) => {
          const f = d.flags;
          return {
            items: [
              { k: 't1', t: `15 ott`, label: `Richiesta di budget al CdA`, st: f.bizCase ? 'done' : f.plan ? 'now' : 'todo' },
              { k: 't2', t: `Entro ott`, label: `Via libera IT e Qualità`, st: f.gxpPath ? 'done' : f.cioMeeting ? 'now' : 'todo' },
              { k: 't3', t: `Ott`, label: `Condizioni con gli Acquisti`, st: visited(d, 'n5') ? 'done' : f.ebEngaged ? 'now' : 'todo' },
              { k: 't4', t: `4 nov`, label: `Contratto al legale (10 giorni prima)`, st: f.paperReady ? 'done' : visited(d, 'n6') ? 'late' : 'todo' },
              { k: 't5', t: `14 nov`, label: `Voto del board`, st: 'todo' },
            ],
          };
        },
      },
    ],

    start: { t: 38, v: 30, u: 35, c: 22, r: 48, have: ['I'] },
    caps: [
      { id: 'eb', max: 0.30, if: (d) => !d.flags.ebEngaged, why: `Nessuno approva €480k senza il CFO. Finché Roberto Villa non è dentro, il deal non supera il 30%.` },
      { id: 'gxp', max: 0.55, if: (d) => !d.flags.gxpPath, why: `IT e Qualità non hanno ricevuto una risposta credibile sulla validazione GxP: lo stallo è sempre dietro l’angolo.` },
      { id: 'claim', max: 0.35, if: (d) => d.flags.overclaimGxp, why: `Hai promesso una validazione che il prodotto non ha. Finché non rettifichi, la Qualità ti blocca.` },
    ],

    nodes: {
      n1: {
        when: `Lunedì · 09:10`, view: 'call',
        where: `Call · Teams · lunedì 09:10`,
        scene: [
          { n: `Accetti la chiamata. Sul laptop si apre la finestra Teams: Elisa è nel suo ufficio, alle spalle uno scaffale di raccoglitori con le etichette GMP.` },
          { w: 'elisa', a: `entusiasta`, t: `Ottime notizie: il board approva il budget a novembre e io ho già detto a tutti che con voi siamo a posto. Mandami l’offerta definitiva e la infilo nel pacchetto per il CdA.` },
          { think: `“Siamo a posto” non è una data. Non è un nome. Non è un processo.` },
        ],
        prompt: `Come rispondi?`,
        hint: `Un entusiasmo non è un processo decisionale. Cosa sai davvero di come si decide, e di chi?`,
        tip: `Un champion forte non ti dice “è fatta”: ti porta dentro il processo. Prima di mandare carte, mappa chi decide, con quali criteri e in che tempi (Decision Process + Mutual Close Plan).`,
        choices: [
          ch('a', 1, `Ti mando l’offerta definitiva entro domani, con il miglior prezzo.`,
            `Elisa è contenta, ma l’offerta finisce in un buco nero: nessuno sa come verrà valutata, né da chi. Hai bruciato la leva più preziosa, cioè il tempo per capire come si decide davvero.`,
            { t: 2, v: -2, c: -8, r: 8 }, {
              say: `Perfetto, Elisa. Domani ti mando l’offerta definitiva, con il miglior prezzo che riesco a ottenere.`,
              react: [
                { w: 'elisa', a: `soddisfatta`, t: `Ecco, così chiudo il pacchetto per il CdA entro venerdì.` },
                { think: `Le ho appena promesso un documento. A chi lo porta, con quali criteri e in che data, non l’ho chiesto.` },
                { n: `Chiudi la chiamata. Sul CRM non è cambiato niente: è solo diventato un po’ più urgente.` },
              ],
              next: 'n2',
            }),
          ch('b', 3, `Costruiamo insieme la “storia del deal”: chi approva cosa, con quali criteri, entro quando.`,
            `Elisa apre il suo calendario: serve la validazione del CFO Roberto Villa e il via libera IT, e la richiesta di budget va presentata entro il 15 ottobre. Ora hai un processo, non una speranza.`,
            { t: 6, v: 3, u: 6, c: 12, r: -6 }, {
              mp: ['Dp', 'C'], set: { plan: true, cfoAccess: true },
              say: `Grazie, Elisa. Prima di mandarti carte facciamo una cosa insieme, venti minuti: costruiamo la storia del deal. Chi approva cosa, con quali criteri, entro quando. Così la proposta arriva al CdA già pronta per chi deve firmare, e tu non rischi di fare brutta figura.`,
              react: [
                { w: 'elisa', a: `apre il calendario`, t: `Allora, vediamo. Serve la validazione di Villa, il CFO, e il via libera di Sala per l’IT. La richiesta di budget va presentata entro il 15 ottobre.` },
                { think: `Un nome. Una data. Finalmente un processo.` },
                { n: `Scrivi “Villa” e “15 ottobre” sul quaderno e li sottolinei due volte.` },
              ],
              next: 'n2',
            }),
          ch('c', 2, `Organizziamo un incontro con il CFO, così arriva in CdA già allineato.`,
            `Ottima direzione, ma la richiesta arriva a freddo: Elisa non ha mai coinvolto Villa e non ha un messaggio chiaro. Concede solo un “vediamo”, senza data.`,
            { t: 2, c: 4, r: 2 }, {
              set: { cfoAccess: true },
              say: `Elisa, facciamo un passo in più: organizziamo un incontro con il CFO, così arriva al CdA già allineato.`,
              react: [
                { w: 'elisa', a: `esita`, t: `Con Villa? Non l’ho mai coinvolto direttamente… Ci provo. Non ti prometto niente.` },
                { n: `Dalla sua espressione sul riquadro capisci che non sa cosa dirgli.` },
              ],
              next: 'n2',
            }),
          ch('d', 1, `Faccio chiamare il CEO dalla nostra Sales Director, per mettere al sicuro l’approvazione dall’alto.`,
            `Il CEO non fa parte del processo e Elisa si sente scavalcata: “Non c’era bisogno di coinvolgere il CEO”. Hai speso un jolly e un po’ della sua fiducia.`,
            { t: -8, c: -4, r: 6 }, {
              jolly: 'exec',
              say: `Chiedo a Marta, la nostra Sales Director, di chiamare il vostro CEO: così l’approvazione è al sicuro, dall’alto.`,
              react: [
                { w: 'elisa', a: `si raffredda`, t: `Il CEO? Non c’era bisogno di coinvolgere il CEO. Ho già detto che gestisco io.` },
                { think: `Ho speso un jolly per far sentire il mio champion scavalcato.` },
              ],
              next: 'n2',
            }),
        ],
      },

      n2: {
        when: `Giovedì · 15:00`, view: 'meeting',
        where: `Incontro · sede FarmaVita · giovedì 15:00`,
        scene: [
          { n: `Giovedì, sede di Latina. Elisa ti riceve nel suo ufficio al primo piano. Dalla finestra si vedono i silos e il piazzale con i camion frigoriferi in fila, i motori accesi.` },
          { w: 'elisa', a: `sottovoce`, t: `Il problema è Sala, il CIO. Dice che il vendor attuale funziona e che un cambio mette a rischio la compliance. Comunque lo gestisco io: tu non ti preoccupare.` },
          { think: `“Lo gestisco io.” Il rischio più grosso del deal è nelle mani di una persona che non controllo.` },
        ],
        prompt: `Il CIO è il tuo ostacolo più grosso. Cosa fai?`,
        hint: `“Lo gestisco io” significa che il rischio è in mani che non controlli. Come lo rendi visibile e gestibile?`,
        tip: `Delegare il rischio principale al champion senza visibilità è la prima causa di deal che deragliano in silenzio. Dagli materiale per vendere al posto tuo, e porta chi è tecnico a parlare con chi è tecnico.`,
        choices: [
          ch('a', 0, `D’accordo, tu conosci l’azienda meglio di me. Aspetto un tuo segnale.`,
            `Tre settimane di silenzio. Quando Elisa riprova con Sala, il CIO ha già raccolto obiezioni da un altro fornitore. Hai delegato il rischio più grosso senza avere alcuna visibilità.`,
            { t: -2, u: -6, c: -10, r: 12 }, {
              say: `D’accordo, Elisa: conosci l’azienda meglio di me. Aspetto un tuo segnale.`,
              react: [
                { w: 'elisa', t: `Perfetto. Ti faccio sapere io.` },
                { n: `Tre settimane dopo, il tuo telefono non ha ricevuto nessun segnale. Quando Elisa riprova con Sala, il CIO ha già incontrato un altro fornitore.` },
              ],
              next: 'n3',
            }),
          ch('b', 0, `Scrivo direttamente a Sala su LinkedIn per rompere il ghiaccio.`,
            `Sala risponde gelido: “Ne parli con la dottoressa Marchetti”. E Elisa lo scopre in giornata: ha capito che non ti fidi di lei.`,
            { t: -10, c: -6, r: 10 }, {
              mpx: ['C'], set: { bypassed: true },
              say: `Non voglio farti perdere tempo, Elisa: scrivo io a Sala, direttamente, per rompere il ghiaccio.`,
              react: [
                { n: `Il giorno dopo, nella casella di posta, un messaggio di Elisa. Una riga sola.` },
                { w: 'elisa', a: `gelida, al telefono`, t: `Sala mi ha girato il tuo messaggio. Pensavo ci fidassimo l’uno dell’altra.` },
                { think: `Ho appena dimostrato che non mi fido di lei.` },
              ],
              next: 'n3',
            }),
          ch('c', 2, `Preparo due pagine per Sala: integrazioni, sicurezza, convalida GxP. Le giri tu.`,
            `Elisa lo gira a Sala. Il CIO non è convertito, ma accetta mezz’ora di confronto: ora ha qualcosa di concreto da criticare. Molto meglio del silenzio.`,
            { t: 6, v: 4, c: 8, r: -6 }, {
              set: { cioMeeting: true },
              say: `Facciamo così: preparo due pagine per Sala, con integrazioni, sicurezza, convalida GxP e un piano di coesistenza col sistema attuale. Le giri tu, con una riga tua.`,
              react: [
                { w: 'elisa', t: `Questo posso farlo. Gli dico che l’hai preparato tu, ma lo presento io.` },
                { n: `Due giorni dopo Elisa ti inoltra la risposta di Sala: tre righe, fredde ma non ostili. Accetta mezz’ora.` },
              ],
              next: 'n3',
            }),
          ch('d', 3, `Porto Davide, il nostro Solution Engineer, per un workshop tecnico con l’IT.`,
            `Il team IT arriva con le domande più difficili e Davide risponde con esempi, schemi e documentazione. Sala non è “convertito”, ma smette di essere il tuo ostacolo silenzioso e ti dice cosa gli serve per fidarsi.`,
            { t: 8, v: 8, c: 6, r: -10 }, {
              jolly: 'se', mp: ['Dc'], set: { cioMeeting: true },
              say: `Porto Davide, il nostro Solution Engineer: un workshop tecnico di un’ora con il tuo team IT, costruito sugli scenari che temete di più.`,
              react: [
                { w: 'davide', a: `alla lavagna`, t: `Ditemi la cosa che vi preoccupa di più. Partiamo da lì, non dalle slide.` },
                { w: 'sala', a: `diffidente, ma attento`, t: `L’audit trail. Se non lo posso mostrare a un ispettore, il resto non mi interessa.` },
                { think: `Ecco il suo vero criterio. Finalmente.` },
              ],
              next: 'n3',
            }),
        ],
      },

      n3: {
        when: `Martedì · 11:30`, view: 'call',
        where: `Videocall · Teams · martedì 11:30`,
        scene: [
          { n: `Sala accetta di incontrarti in videochiamata. Sullo schermo: un ufficio sobrio, una cartella piena di appunti aperta davanti a lui, una tazzina di caffè mai toccata.` },
          { w: 'sala', a: `braccia incrociate`, t: `Il nostro sistema è già validato GxP. Voi mi proponete otto mesi di convalida e di rischio. Perché dovrei mettere in gioco la compliance per darvi mezzo milione l’anno?` },
          { think: `Ha ragione, e sa di avere ragione. Qualunque cosa dica adesso, deve reggere a un audit.` },
        ],
        prompt: `Ha ragione su un punto: la compliance non si tocca. Come rispondi?`,
        hint: `Prima di convincerlo, capisci cosa dovrebbe essere vero per lui perché un cambio sia “sicuro”.`,
        tip: `Quando un tecnico dice “rischio”, sta parlando di criteri di decisione non ancora dichiarati. Falli emergere (Decision Criteria) e costruisci il piano attorno a quelli. Mai promettere ciò che il prodotto non fa.`,
        choices: [
          ch('a', 0, `La nostra piattaforma è già validata GxP: non c’è nessuna convalida da fare.`,
            `Sala sorride appena: “Strano, la vostra documentazione parla di accelerator pack”. In una frase hai perso credibilità e ti sei legato a una promessa che il prodotto non mantiene.`,
            { t: -12, v: -4, r: 16 }, {
              integ: -10, set: { overclaimGxp: true },
              say: `Dottor Sala, la nostra piattaforma è già validata GxP. Non c’è nessuna convalida da fare.`,
              react: [
                { w: 'sala', a: `sorride appena`, t: `Strano. La vostra documentazione parla di accelerator pack e di PQ a carico del cliente.` },
                { think: `Mi ha letto. Ha letto tutto.` },
                { n: `Nel riquadro, Sala scrive qualcosa sulla cartella. Non alza gli occhi.` },
              ],
              next: (d) => (d.flags.cfoAccess ? 'n4' : 'n4b'),
            }),
          ch('b', 3, `La compliance non si negozia. Cosa dovrebbe essere vero perché un cambio, per lei, sia sicuro?`,
            `Sala elenca tre criteri: audit trail conforme ad Annex 11 e Part 11, zero fermi di produzione, rollback garantito. Ora hai i criteri di decisione nero su bianco e un piano a ondate che li soddisfa tutti e tre.`,
            { t: 8, v: 8, c: 8, r: -10 }, {
              mp: ['Dc', 'Co'], set: { gxpPath: true, cfoAccess: true },
              say: `Ha ragione sulla compliance: non si negozia. Allora la domanda è un’altra: cosa dovrebbe essere vero, perché un cambio, per lei, sia sicuro? Poi le mostro come altri hanno proceduto a ondate, partendo da un solo sito.`,
              react: [
                { w: 'sala', a: `prende appunti`, t: `Audit trail conforme ad Annex 11 e Part 11. Zero fermi di produzione. Rollback garantito. Se mi dà questi tre, ascolto.` },
                { think: `Tre criteri. Nero su bianco. Adesso ho un compito, non un’obiezione.` },
              ],
              next: (d) => (d.flags.cfoAccess ? 'n4' : 'n4b'),
            }),
          ch('c', 1, `Guardi i numeri: il nostro TCO a cinque anni è il 22% più basso dell’attuale.`,
            `Sala annuisce senza sorprese: il prezzo non era la sua obiezione. Hai risposto a una domanda che non ti aveva fatto.`,
            { t: 0, v: 2, r: 2 }, {
              say: `Guardi i numeri, dottor Sala: il nostro TCO a cinque anni è più basso del 22% rispetto a quello attuale.`,
              react: [
                { w: 'sala', a: `annuisce, senza scomporsi`, t: `Bene. Non era quello il punto.` },
                { n: `Il silenzio che segue dura un secondo di troppo.` },
              ],
              next: (d) => (d.flags.cfoAccess ? 'n4' : 'n4b'),
            }),
          ch('d', 3, `La metto in contatto con il Direttore IT di un’azienda farmaceutica che ha migrato a ondate.`,
            `Una chiamata tra pari fa più di cento slide. Sala resta cauto ma ammette: “Se le cose stanno così, parliamone sul serio”. E dice a Elisa che per lui si può procedere.`,
            { t: 10, v: 6, c: 4, r: -10 }, {
              jolly: 'ref', mp: ['Co'], set: { gxpPath: true, cfoAccess: true },
              say: `Le faccio parlare con il Direttore IT di un’azienda farmaceutica che ha migrato a ondate in cinque mesi, superando l’ispezione senza rilievi.`,
              react: [
                { w: 'sala', a: `dopo un attimo`, t: `Mi dia il suo numero. Se le cose stanno così, parliamone sul serio.` },
                { think: `Un pari parla meglio di dieci slide.` },
              ],
              next: (d) => (d.flags.cfoAccess ? 'n4' : 'n4b'),
            }),
        ],
      },

      n4b: {
        when: `Venerdì · 17:20`, view: 'phone',
        where: `Telefono · venerdì 17:20`,
        scene: [
          { n: `Venerdì sera, ufficio quasi vuoto. Il telefono è appoggiato sul tavolo: Elisa, in vivavoce.` },
          { w: 'elisa', a: `a disagio`, t: `Non sono riuscita a fissare niente con Villa. Il CFO è sommerso fino a dicembre. Mandami un documento e glielo giro io.` },
          { think: `Un documento girato da lei. Senza che Villa mi abbia mai visto in faccia.` },
        ],
        prompt: `Il tempo stringe. Come arrivi al CFO?`,
        hint: `Chi ha il potere di firma deve incontrarti. Chi può farlo con pari grado, senza scavalcare Elisa?`,
        tip: `L’Executive Sponsor serve quando il champion non riesce ad arrivare in alto: una Sales Director che scrive a un CFO cambia registro. Ma va concordato col champion, mai alle sue spalle.`,
        choices: [
          ch('a', 2, `Ti preparo un one-pager sul capitale in quarantena. Lo giri tu a Villa, io chiedo quindici minuti.`,
            `Villa risponde in tre righe: “Numeri interessanti, ne parlo con Elisa”. Non lo hai visto in faccia, ma il documento è circolato e hai un tema, la cassa liberata, di cui parlare.`,
            { t: 2, v: 8, u: 4, c: 2, r: -2 }, {
              mp: ['M'], set: { bizCase: true },
              say: `Ti preparo un one-pager con il business case sui lotti in quarantena. Lo giri a Villa con una tua nota, e io chiedo solo quindici minuti per validare i numeri.`,
              react: [
                { w: 'elisa', t: `Va bene. Lo mando stasera.` },
                { n: `Lunedì mattina Elisa ti inoltra la risposta di Villa, tre righe: “Numeri interessanti, ne parlo con Elisa”.` },
                { think: `Non l’ho visto in faccia. Ma almeno adesso lo sa che esisto.` },
              ],
              next: 'n5',
            }),
          ch('b', 3, `Chiedo a Marta di scrivere a Villa per un briefing esecutivo di venti minuti, d’accordo con te.`,
            `Una Sales Director che scrive a un CFO come pari grado cambia il registro: Villa concede venti minuti. Elisa è sollevata di non dover più fare da postina.`,
            { t: 6, v: 6, u: 4, c: 10, r: -6 }, {
              jolly: 'exec', mp: ['E'], set: { ebEngaged: true },
              say: `Elisa, d’accordo con te: chiedo a Marta, la nostra Sales Director, di scrivere a Villa per un briefing esecutivo di venti minuti su cassa e compliance. Tu resti in copia.`,
              react: [
                { w: 'elisa', a: `sollevata`, t: `Meno male. Mi dispiaceva fare da postina. Sì, mandate pure.` },
                { n: `Il giorno dopo Marta ti gira la risposta di Villa: venti minuti, mercoledì alle 08:30.` },
              ],
              next: 'n4',
            }),
          ch('c', 0, `Scrivo io direttamente a Villa con una email diretta.`,
            `Villa gira l’email a Elisa con un punto interrogativo. Elisa ti chiama, gelida: “Pensavo ci fidassimo l’uno dell’altra”.`,
            { t: -10, c: -6, r: 10 }, {
              mpx: ['C'], set: { bypassed: true },
              say: `Elisa, il tempo stringe: scrivo io direttamente a Villa, con una mail breve e diretta.`,
              react: [
                { n: `La risposta arriva in diciotto minuti. Non da Villa: da Elisa. Una riga.` },
                { w: 'elisa', a: `gelida`, t: `Villa mi ha girato la tua mail con un punto interrogativo. Pensavo ci fidassimo l’uno dell’altra.` },
              ],
              next: 'n5',
            }),
          ch('d', 1, `Aspetto che Elisa trovi il momento giusto.`,
            `Passano due settimane. Il 15 ottobre si avvicina e il CFO non sa ancora che esisti.`,
            { u: -6, c: -8, r: 8 }, {
              say: `Va bene, Elisa. Aspetto che si liberi un momento: non voglio forzare.`,
              react: [
                { w: 'elisa', t: `Grazie per la pazienza. Vedrai che ci arriviamo.` },
                { n: `Passano due settimane. Il 15 ottobre si avvicina. Villa non sa ancora che esisti.` },
              ],
              next: 'n5',
            }),
        ],
      },

      n4: {
        when: `Mercoledì · 08:30`, view: 'call',
        where: `Videocall · Teams · mercoledì 08:30`,
        scene: [
          { n: `Hai venti minuti con Roberto Villa, CFO di FarmaVita. Elisa è collegata in silenzio, la telecamera spenta. Sullo schermo Villa sfoglia qualcosa fuori campo; il suo sguardo cade sull’orologio.` },
          { w: 'villa', a: `guarda l’orologio`, t: `Mi dicono che è un progetto “strategico”. Dimmi in una frase perché dovrei approvare €480.000 l’anno.` },
          { think: `Una frase sola. Se parlo di funzioni, ho già perso.` },
        ],
        prompt: `Hai una sola frase. Quale?`,
        hint: `Un CFO ascolta numeri propri, non funzioni altrui.`,
        tip: `Con l’Economic Buyer apri con i suoi numeri (Metrics) e chiedi di validarli insieme: è il modo più rapido per passare da “interessante” a “sponsorizzato”.`,
        choices: [
          ch('a', 1, `Le faccio vedere in dieci minuti la piattaforma: tracciabilità lotti, dashboard, allarmi.`,
            `Dopo sette minuti Villa interrompe: “Le funzioni le vedrà Elisa. A me servono numeri”. Hai usato metà del tuo tempo a parlare a chi non decide.`,
            { t: 0, v: 0, c: 2, r: 2 }, {
              mp: ['E'], set: { ebEngaged: true },
              say: `Le faccio vedere in dieci minuti come funziona: tracciabilità dei lotti, cruscotto, allarmi di scostamento.`,
              react: [
                { n: `Condividi lo schermo. La dashboard si apre, i lotti scorrono, gli allarmi lampeggiano.` },
                { w: 'villa', a: `dopo sette minuti`, t: `Le funzioni le vedrà Elisa. A me servono numeri.` },
                { think: `Gli ho mostrato quello che piace a me, non quello che serve a lui.` },
              ],
              next: 'n5',
            }),
          ch('b', 3, `Dai dati di Elisa, il capitale fermo in quarantena vale milioni. Possiamo validarlo insieme?`,
            `Villa contesta il 18%, ma subito dopo: “Se i numeri reggono con i nostri dati, il budget non è un problema”. Hai ottenuto metriche condivise e il permesso di tornare.`,
            { t: 8, v: 14, u: 8, c: 8, r: -6 }, {
              mp: ['M', 'E'], set: { ebEngaged: true, bizCase: true },
              say: `Dai dati di Elisa, i lotti in quarantena immobilizzano circa sei milioni di capitale circolante. Con un meno 18%, il benchmark dei nostri clienti pharma, si liberano oltre un milione di cassa e il progetto si ripaga in circa quattordici mesi. Possiamo validare queste ipotesi con i vostri dati in due settimane?`,
              react: [
                { w: 'villa', a: `smette di sfogliare`, t: `Il diciotto per cento lo contesto. Ma se i numeri reggono con i nostri dati, il budget non è un problema.` },
                { think: `Ha detto “con i nostri dati”. Ha detto “il budget non è un problema”.` },
                { n: `Elisa, dall’altra parte, mette il microfono in muto e ti fa un cenno con il pollice.` },
              ],
              next: 'n5',
            }),
          ch('c', 2, `Le porto un ROI calculator con le medie di settore: in venti minuti stimiamo il ritorno.`,
            `Villa: “Medie di settore, non le nostre”. Apprezza lo sforzo ma non si sbilancia. Ti concede una seconda call, se porti dati FarmaVita.`,
            { t: 2, v: 5, c: 3 }, {
              mp: ['E'], set: { ebEngaged: true },
              say: `Le porto un calcolatore di ritorno con le medie di settore: in venti minuti stimiamo insieme quanto vale per voi.`,
              react: [
                { w: 'villa', a: `scettico, ma cortese`, t: `Medie di settore, non le nostre. Se porta dati FarmaVita, ci rivediamo.` },
                { n: `Il suo riquadro resta immobile un istante. Poi la chiamata si chiude con un “grazie” asciutto.` },
              ],
              next: 'n5',
            }),
          ch('d', 0, `Se approva entro fine mese, le garantisco subito il 15% di sconto.`,
            `Villa sorride: “Interessante. E perché il 15%? Se ne chiedo di più, a cosa serve il resto?”. Hai svalutato il prodotto prima ancora di averne spiegato il valore.`,
            { t: -4, v: -10, c: -2, d: 15 }, {
              mp: ['E'], set: { ebEngaged: true },
              say: `Se approva entro fine mese, le garantisco subito il quindici per cento di sconto.`,
              react: [
                { w: 'villa', a: `quasi divertito`, t: `Interessante. E perché il quindici? Se ne chiedo di più, a cosa serve il resto?` },
                { think: `Gli ho appena detto che il prezzo di listino è una cifra di partenza.` },
              ],
              next: 'n5',
            }),
        ],
      },

      n5: {
        when: `Giovedì · 14:05`, view: 'mail',
        where: `Email · Acquisti · giovedì 14:05`,
        scene: [
          { n: `Dopo pranzo, una notifica sul laptop. Mittente: Acquisti FarmaVita. In copia, Elisa.` },
          { mail: { from: `Chiara Neri · Acquisti FarmaVita`, subj: `Proposta commerciale: condizioni` }, t: `Il progetto ha ricevuto parere favorevole. Per procedere ci aspettiamo uno sconto del 20% sul listino e prezzo bloccato per tre anni. In caso contrario valuteremo altri fornitori.` },
          { think: `Venti punti. Più il blocco del prezzo. Detto così, senza una domanda.` },
        ],
        prompt: `Acquisti entra in scena. Come negozi?`,
        hint: `Ogni concessione ha un prezzo: cosa puoi chiedere in cambio? Esiste una soglia oltre cui servono approvazioni.`,
        tip: `Mai un “give” senza un “get”: lo sconto si scambia con durata, tempi di firma, referenza. E se offri opzioni invece di un sì/no, guidi tu la negoziazione.`,
        choices: [
          ch('a', 0, `Va bene il 20%, ma ho bisogno della firma entro fine mese.`,
            `Hai concesso venti punti senza ottenere nulla in cambio. Il Deal Desk ti richiama: sei ben oltre la soglia LEP e senza alcuna contropartita da mostrare.`,
            { t: 2, v: -8, c: -4, d: 20 }, {
              say: `Chiara, va bene il venti per cento. Mi serve solo la firma entro fine mese.`,
              react: [
                { w: 'chiara', a: `senza espressione`, t: `Perfetto. Procediamo con la bozza.` },
                { n: `Dieci minuti dopo, un messaggio dal Deal Desk: “Chiamami. Subito.”` },
              ],
              next: (d) => (d.flags.overclaimGxp ? 'n5x' : 'n6'),
            }),
          ch('b', 3, `Posso lavorarci: sconto contro un impegno triennale, firma a fine mese e diritto di citarvi.`,
            `Chiara contropropone il 12% con tre anni e fatturazione annuale. Dopo una call con il Deal Desk chiudete a 12%, con referenza e impegno triennale: hai scambiato sconto contro durata, tempi e visibilità.`,
            { t: 4, v: 4, c: 10, r: -4, d: 12 }, {
              set: { giveGet: true },
              say: `Posso lavorarci, Chiara. Se vi serve il prezzo bloccato per tre anni, riconosco il nove per cento su un impegno triennale, con firma entro fine mese e il diritto di citarvi come referenza. Più vi impegnate, più mi sposto.`,
              react: [
                { w: 'chiara', a: `dopo una pausa`, t: `Dodici, tre anni, fatturazione annuale. La referenza la valuto con la direzione.` },
                { think: `Ha alzato di tre punti. Ma ha accettato il perimetro dello scambio.` },
              ],
              next: (d) => (d.flags.overclaimGxp ? 'n5x' : 'n6'),
            }),
          ch('c', 2, `Il listino riflette il valore: preferisco non scendere, ma includo formazione e ore di validazione.`,
            `Chiara apprezza il pacchetto ma chiede comunque un gesto sul prezzo. Si chiude su un 6% e servizi inclusi: margine sano, ma una settimana in più.`,
            { t: 2, v: 2, c: 2, d: 6 }, {
              say: `Chiara, il listino riflette il valore del progetto: preferisco non scendere. Posso però includere formazione e ore di supporto alla validazione.`,
              react: [
                { w: 'chiara', a: `con un mezzo sorriso`, t: `Apprezzo il pacchetto. Ma un gesto sul prezzo lo devo portare anch’io.` },
                { n: `Dopo tre telefonate e una pausa pranzo si chiude su un sei per cento, con i servizi inclusi.` },
              ],
              next: (d) => (d.flags.overclaimGxp ? 'n5x' : 'n6'),
            }),
          ch('d', 3, `Preparo con il Deal Desk tre scenari: annuale al 10%, triennale al 14%, prepagato all’8%.`,
            `Passare da “sì o no” ad “A, B o C” cambia la conversazione. Chiara sceglie B e chiede solo di aggiustare le date di pagamento: hai guidato tu il tavolo.`,
            { t: 4, v: 4, c: 12, r: -6, d: 14 }, {
              jolly: 'desk', set: { giveGet: true, deskApproved: true },
              say: `Chiara, preparo con il Deal Desk tre scenari tra cui scegliere: A, fatturazione annuale al 10%; B, impegno triennale al 14%; C, pagamento anticipato all’8%.`,
              react: [
                { w: 'chiara', a: `legge due volte`, t: `Tre scenari. Interessante. Il B è quello che reggo con la direzione, ma sul pagamento ho bisogno di un aggiustamento.` },
                { think: `Smette di negoziare contro di me. Comincia a scegliere.` },
              ],
              next: (d) => (d.flags.overclaimGxp ? 'n5x' : 'n6'),
            }),
        ],
      },

      n5x: {
        when: `Venerdì · 09:40`, view: 'mail',
        where: `Email · Qualità · venerdì 09:40`,
        scene: [
          { n: `Il venerdì mattina inizia con una mail che non ti aspettavi. Mittente: la Direttrice Qualità. In copia, Sala e Villa.` },
          { mail: { from: `Anna Ferrante · Qualità FarmaVita`, subj: `Evidenza di convalida` }, t: `Nella vostra comunicazione si afferma che la piattaforma è “già validata”. Vi chiediamo evidenza documentale completa, entro lunedì. In mancanza, sospendiamo la valutazione.` },
          { think: `La frase di Sala è tornata indietro. E con lui, la Qualità.` },
        ],
        prompt: `La Qualità ti chiede conto. Come reagisci?`,
        hint: `Una correzione tempestiva costa poco. Una difesa a oltranza costa il deal.`,
        tip: `Se hai sbagliato, dillo subito e metti per iscritto cosa è fornito dal vendor e cosa spetta al cliente. La credibilità si ricostruisce con la precisione, non con la difesa.`,
        choices: [
          ch('a', 3, `Ha ragione, ho semplificato. Le mando oggi la documentazione e la divisione delle responsabilità.`,
            `Ferrante apprezza la franchezza: “Meglio saperlo ora”. La correzione costa qualche punto di fiducia, ma evita che il problema esploda a contratto firmato.`,
            { t: 4, v: 2, c: 2, r: -12 }, {
              integ: 4, set: { overclaimGxp: false },
              say: `Dottoressa Ferrante, ha ragione e mi assumo la responsabilità: ho semplificato. Le invio oggi la documentazione IQ e OQ e il piano di PQ, con la divisione chiara tra ciò che fornisce Nexora e ciò che convalida FarmaVita con il nostro supporto.`,
              react: [
                { w: 'anna', a: `dopo una pausa`, t: `Meglio saperlo ora che a contratto firmato. Mi mandi tutto entro lunedì.` },
                { think: `Un errore corretto in tempo costa poco. Uno difeso, tutto.` },
              ],
              next: 'n6',
            }),
          ch('b', 0, `Il prodotto è validato nei suoi componenti: è una questione di interpretazione.`,
            `Ferrante scrive in copia a Sala e Villa: “Chiediamo una dichiarazione formale”. Hai trasformato un errore in un caso di credibilità.`,
            { t: -12, v: -6, c: -6, r: 14 }, {
              integ: -6,
              say: `Dottoressa, il prodotto è validato nei suoi componenti. È una questione di interpretazione della comunicazione.`,
              react: [
                { n: `La risposta arriva in venti minuti. Ancora in copia: Sala, Villa, Elisa.` },
                { w: 'anna', a: `per iscritto`, t: `Chiediamo una dichiarazione formale. Un’interpretazione non è un’evidenza.` },
              ],
              next: 'n6',
            }),
          ch('c', 1, `Chiedo a Elisa di calmare la Qualità: dopotutto il progetto è già approvato.`,
            `Elisa non vuole farsi carico della tua imprecisione. La Qualità ottiene la documentazione dal contratto standard e non dalle tue parole: il danno è contenuto, non rimosso.`,
            { t: -4, c: -4, r: 4 }, {
              say: `Elisa, puoi parlare tu con la Qualità? Il progetto è praticamente approvato, è solo una questione di formalità.`,
              react: [
                { w: 'elisa', a: `a disagio`, t: `Non è una formalità, e non è un mio errore. Ci parli tu.` },
                { n: `Alla fine la documentazione arriva dal contratto standard, non dalle tue parole.` },
              ],
              next: 'n6',
            }),
          ch('d', 2, `Mi prendo la responsabilità, ma prima faccio verificare a Davide cosa possiamo certificare.`,
            `Davide ricostruisce il quadro in due giorni. La risposta arriva giusta ma in ritardo: la Qualità tiene un occhio puntato su di te.`,
            { t: 0, v: 0, c: 0, r: -4 }, {
              jolly: 'se', integ: 2, set: { overclaimGxp: false },
              say: `Dottoressa Ferrante, mi prendo la responsabilità della frase. Prima di risponderle nel merito faccio verificare al nostro Solution Engineer cosa possiamo certificare, così la risposta è precisa.`,
              react: [
                { w: 'davide', a: `due giorni dopo`, t: `Ecco cosa è coperto, cosa no, e cosa spetta a loro. Ho messo tutto in una tabella.` },
                { n: `La risposta arriva giusta, ma con due giorni di ritardo. La Qualità ora ti segue da vicino.` },
              ],
              next: 'n6',
            }),
        ],
      },

      n6: {
        when: `Lunedì · 17:00`, view: 'call',
        where: `Call · Teams · lunedì 17:00`,
        scene: [
          { n: `Fine giornata. Elisa ti chiama dall’auto, il vivavoce amplifica il rumore della strada.` },
          { w: 'elisa', a: `rilassata`, t: `Il board vota il 14 novembre. Il legale vuole il contratto almeno dieci giorni prima, altrimenti rischiamo di slittare a gennaio.` },
          { think: `Dieci giorni prima del voto. Non dopo.` },
        ],
        prompt: `Come blindi la firma?`,
        hint: `Il contratto non si apre il giorno dopo il voto. Chi lo prepara, quando, con chi?`,
        tip: `Paper Process: avvia l’iter legale in parallelo, con un unico referente e un calendario a ritroso dalla data di voto. Le scadenze artificiali, invece, bruciano fiducia con chi conosce il processo.`,
        choices: [
          ch('a', 1, `Aspettiamo il voto: una volta approvato, il legale parte subito.`,
            `Il voto passa il 14 novembre. Poi il legale richiede quattro settimane per i termini e le clausole GxP: la firma slitta a gennaio e il trimestre chiude senza di te.`,
            { u: -8, c: -8, r: 8 }, {
              say: `Elisa, aspettiamo il voto: una volta approvato, il legale parte subito con il contratto.`,
              react: [
                { w: 'elisa', t: `Va bene. Ti faccio sapere dopo il voto.` },
                { n: `Il 14 novembre il board vota sì. Il legale legge il contratto: quattro settimane per i termini e le clausole GxP. La firma è a gennaio.` },
              ],
              next: 'END',
            }),
          ch('b', 3, `Prepariamo il contratto in parallelo, con un calendario a ritroso dal voto del 14.`,
            `Quando il board vota, il contratto è già negoziato al 90%. Villa firma pochi giorni dopo, dentro il trimestre.`,
            { c: 12, u: 6, r: -8 }, {
              mp: ['P'], set: { paperReady: true },
              say: `Elisa, prepariamo il contratto in parallelo: ti mando oggi MSA e DPA, concordiamo un unico referente legale e un calendario a ritroso, con la firma subordinata al voto del 14.`,
              react: [
                { w: 'elisa', a: `annota`, t: `Il nostro legale è Tommasi. Gli giro tutto stasera: così parte subito.` },
                { think: `Il giorno del voto, il contratto sarà già a nove decimi.` },
              ],
              next: 'END',
            }),
          ch('c', 1, `Faccio presente che l’offerta è valida solo fino al 31 del mese, per accelerare.`,
            `Elisa lo gira a Villa: “È una pressione senza ragione”. Una scadenza finta non regge con chi conosce il processo e ti costa fiducia.`,
            { t: -6, c: -2, u: 2 }, {
              integ: -3,
              say: `Elisa, ti avviso: l’offerta è valida solo fino al 31 del mese. Dopo, devo rivedere le condizioni.`,
              react: [
                { w: 'elisa', a: `dopo un silenzio`, t: `Ho girato la tua mail a Villa. Ha detto: “È una pressione senza ragione”.` },
                { think: `Una scadenza finta. E lei lo sa.` },
              ],
              next: 'END',
            }),
          ch('d', 2, `Attivo il Legal fast-track di Nexora: contratto e DPA pronti in cinque giorni.`,
            `Funziona, ma era un cannone per una mosca: lo stesso risultato si otteneva in autonomia con un buon calendario. Il jolly ora manca altrove.`,
            { c: 8, u: 4, r: -6 }, {
              jolly: 'legal', mp: ['P'], set: { paperReady: true },
              say: `Elisa, attivo il Legal fast-track di Nexora: contratto e DPA pronti in cinque giorni, e richiedo subito la revisione del vostro legale.`,
              react: [
                { n: `Il nostro avvocato manda tutto entro mercoledì. Il vostro legale risponde con una riga: “Ricevuto, grazie”.` },
                { think: `Ha funzionato. Ma questo jolly potevo spenderlo su un deal che davvero ne avesse bisogno.` },
              ],
              next: 'END',
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'ispezione', title: `Ispezione in stabilimento`, w: 2, after: ['n1', 'n2'],
        node: {
          when: `Mercoledì · 10:30`, view: 'phone', where: `Telefono · mercoledì 10:30`,
          scene: (d) => [
            { n: `Il telefono vibra mentre sei in riunione. È l’assistente di Elisa.` },
            d.flags.plan
              ? { w: 'elisa', a: `per messaggio vocale`, t: `Scusa, sono bloccata: ispezione AIFA fino a giovedì, nessuno può uscire dal reparto. Il piano del 15 ottobre resta valido, ci sentiamo venerdì.` }
              : { w: 'elisa', a: `per messaggio vocale`, t: `Scusa, sono bloccata: ispezione AIFA, non so dirti fino a quando. Ti richiamo io.` },
            d.flags.plan
              ? { think: `Ho un piano, ho le date. Posso usare questi giorni.` }
              : { think: `Non so nemmeno quando ricomparirà. Sono nelle mani di una persona che non riesco a raggiungere.` },
          ],
          prompt: `Il tuo champion è irraggiungibile. Come usi questi giorni?`,
          hint: `Quando il canale si ferma, il tempo diventa tuo. Come lo investi?`,
          tip: `Quando il champion sparisce, il deal non deve fermarsi: usa il tempo per preparare ciò che dovrai portare quando riemerge. Insistere con chi è in ispezione costa fiducia.`,
          choices: [
            ch('a', 1, `Le mando due messaggi al giorno finché non risponde.`, (d) => d.flags.plan ? `Elisa, in ispezione, vede un’ondata di messaggi e si irrita: hai un piano, avresti potuto fidarti.` : `Elisa vede un’ondata di messaggi mentre è in ispezione. Non è il momento, e lo capisce anche lei.`, { t: -6, c: -4, r: 6 }, {
              next: 'RET',
              say: `Le mando un messaggio la mattina e uno il pomeriggio. Prima o poi risponderà.`,
              react: [{ n: `Nessuna risposta. Il tuo nome scivola in fondo alle notifiche.` }, { think: `Sto facendo rumore, non progressi.` }],
            }),
            ch('b', 3, `Uso i giorni per preparare il materiale per Villa e Sala, da consegnarle quando riemerge.`, (d) => d.mp.has('Dp') ? `Con un piano condiviso, il tempo morto diventa un vantaggio: quando Elisa riemerge trova già tutto pronto.` : `Hai trasformato un blocco in tempo utile: quando Elisa riemerge, ha qualcosa di concreto da portare.`, (d) => ({ t: 4, v: d.mp.has('Dp') ? 8 : 4, c: 6, r: -4 }), {
              next: 'RET',
              say: `Elisa è bloccata, io no. Questi giorni li uso per preparare ciò che le servirà: il brief per Sala e le ipotesi per Villa, pronti per quando riemerge.`,
              react: [{ n: `Giovedì sera hai due documenti nel cassetto. Venerdì mattina, Elisa risponde con un solo messaggio: “Dimmi cos’hai preparato”.` }, { think: `Un blocco è diventato un anticipo.` }],
            }),
            ch('c', 2, `Scrivo alla sua segreteria per capire quando può liberarsi, senza forzare.`, `Una richiesta sobria: ricevi una data (venerdì) e conservi il rapporto. Non guadagni niente, non perdi niente.`, { t: 2, c: 2 }, {
              next: 'RET',
              say: `Scrivo all’assistente di Elisa: le chiedo solo quando potrà liberarsi, senza forzare.`,
              react: [{ n: `Dopo un’ora arriva la risposta: venerdì, tra le 10 e le 11.` }],
            }),
            ch('d', 1, `Chiedo a Sala di fissare l’incontro con Villa al posto di Elisa.`, `Sala non è il canale giusto: rifiuta con cortesia e riferisce l’episodio a Elisa. Hai bruciato un po’ di fiducia con entrambi.`, { t: -6, c: -4, r: 6 }, {
              next: 'RET',
              say: `Sala, dato che Elisa è bloccata: potrebbe presentarmi lei a Villa?`,
              react: [{ w: 'sala', a: `secco`, t: `Non è il mio ruolo. Ne parli con la dottoressa Marchetti.` }, { think: `Ho usato la persona sbagliata per saltare quella giusta.` }],
            }),
          ],
        },
      },
      {
        id: 'sala_gap', title: `Un buco nella documentazione`, w: 2, after: ['n2', 'n3'],
        node: {
          when: `Giovedì · 16:40`, view: 'mail', where: `Email · IT FarmaVita · giovedì 16:40`,
          scene: (d) => [
            { n: `Una mail del team IT, in copia a Sala. Il tono è tecnico, secco.` },
            { mail: { from: `Team IT FarmaVita`, subj: `Documentazione: modulo di integrazione` }, t: d.flags.gxpPath ? `Bruno ci ha chiesto di segnalarvi in anticipo: nella documentazione tecnica il modulo di interfaccia con il nostro sistema attuale non è descritto. Possiamo chiarirlo prima dell’incontro?` : `Nella vostra documentazione tecnica manca la descrizione del modulo di interfaccia con il nostro sistema attuale. Senza, non possiamo proseguire la valutazione.` },
            { think: d.flags.gxpPath ? `Sala mi sta avvisando prima di escalare. È un segnale: si fida abbastanza.` : `Se non rispondo bene, questa riga arriva sul tavolo del CIO come prova.` },
          ],
          prompt: `Il team IT ha trovato un buco. Come rispondi?`,
          hint: `Un errore ammesso presto costa poco. Uno minimizzato costa credibilità.`,
          tip: `Quando il cliente trova un difetto vero nella tua documentazione, ammettilo, correggilo e documenta la correzione. La credibilità tecnica si guadagna nella gestione degli errori, non nel loro nascondimento.`,
          choices: [
            ch('a', 3, `Hanno ragione: manca. Vi mando oggi la scheda corretta e un workaround per il periodo di transizione.`, (d) => d.flags.gxpPath ? `Sala apprezza l’onestà e il tempismo: il suo team ti vede come un fornitore con cui si può lavorare.` : `Il team IT risponde con un “grazie, preciso”: l’errore c’era, la gestione è stata esemplare.`, { t: 8, v: 4, c: 4, r: -8 }, {
              next: 'RET',
              say: `Avete ragione: nel documento manca la descrizione di quel modulo. Oggi vi mando la scheda corretta, con un workaround per il periodo di transizione, e un referente tecnico per ogni dubbio.`,
              react: [{ w: 'sala', a: `leggendo la risposta`, t: `Preciso. Mi piace che non abbiate cercato scuse.` }, { think: `Un errore ammesso in tempo diventa un punto a favore.` }],
            }),
            ch('b', 1, `Il modulo è descritto in un altro capitolo: rileggete la sezione quattro.`, `Il team IT trova la sezione quattro, ma la descrizione è insufficiente: sembri sulla difensiva, e hai perso un’occasione.`, { t: -4, c: -2, r: 6 }, {
              next: 'RET',
              say: `Il modulo è descritto: guardate il capitolo quattro, dalla pagina trentuno.`,
              react: [{ w: 'sala', a: `asciutto`, t: `Il capitolo quattro non copre quel caso. Mi aspettavo una risposta, non un rimando.` }, { think: `Ho difeso un documento invece di ascoltare chi lo legge.` }],
            }),
            ch('c', 2, `Giro la richiesta a Davide perché la risolva con loro, senza passare da me.`, `Davide risolve il tema tecnico, ma il team IT percepisce che hai delegato la relazione: la risposta è corretta, il rapporto non cresce.`, { t: 0, v: 2, c: 2 }, {
              next: 'RET',
              say: `Passo subito la vostra richiesta a Davide Ferri, il nostro Solution Engineer: la risolve lui direttamente con voi.`,
              react: [{ n: `Davide risponde in due ore, chiaro e preciso. Del tuo nome, nella conversazione, non rimane traccia.` }],
            }),
            ch('d', 0, `Rispondo che non è un problema: il modulo lo integriamo noi e basta.`, `La risposta suona come una promessa vaga. Sala la legge e scrive in margine: “Che significa ‘e basta’?”.`, { t: -8, v: -4, r: 10 }, {
              next: 'RET',
              say: `Non è un problema: il modulo lo integriamo noi, voi non dovete fare nulla.`,
              react: [{ w: 'sala', a: `rileggendo`, t: `“Non dovete fare nulla.” In un sito GxP è la frase che mi preoccupa di più.` }, { think: `Ho promesso senza sapere cosa.` }],
            }),
          ],
        },
      },
      {
        id: 'ascensore', title: `Incontro con il CFO nell’atrio`, w: 1, after: ['n3', 'n4b', 'n5'],
        if: (d) => !d.flags.ebEngaged,
        node: {
          when: `Mercoledì · 12:10`, view: 'walk', where: `Atrio · sede FarmaVita · mercoledì 12:10`,
          scene: (d) => [
            { n: `Esci dall’ascensore con il badge ospite ancora al collo. Nell’atrio, due metri davanti a te, riconosci un uomo con una cartellina di pelle: Roberto Villa.` },
            { w: 'villa', a: `senza fermarsi`, t: `Lei è quello di Nexora, vero? Elisa mi ha parlato di lei. Ho trenta secondi.` },
            { think: d.mp.has('M') ? `Ho un numero: i lotti in quarantena. Trenta secondi bastano, se li uso bene.` : `Non ho un numero suo. Ho solo il nome del prodotto. Trenta secondi sono pochissimi.` },
          ],
          prompt: `Hai trenta secondi con il CFO. Cosa fai?`,
          hint: `Trenta secondi non sono una presentazione: sono una domanda ben posta.`,
          tip: `Con un decisore in movimento non si presenta il prodotto: si pone una domanda sui suoi numeri e si chiede il permesso di tornare. Chi parla di funzioni si brucia, chi chiede dati si rende memorabile.`,
          choices: [
            ch('a', 3, `Gli faccio una domanda sui suoi numeri e gli chiedo quindici minuti per validarli.`, (d) => d.mp.has('M') ? `Con un numero in tasca, la tua domanda è precisa: Villa rallenta, fissa un appuntamento e annota il tuo nome.` : `Anche senza un numero tuo, la domanda sul capitale in quarantena funziona: Villa rallenta e ti concede un appuntamento.`, (d) => ({ t: 6, v: d.mp.has('M') ? 8 : 4, c: 8, r: -4 }), {
              mp: ['E'], set: { ebEngaged: true },
              next: 'RET',
              say: `Dottor Villa, una domanda sola: quanto capitale tiene fermo oggi in quarantena, fra un lotto e l’altro? Se mi dà quindici minuti, le dico quanto potrebbe liberarne e le chiedo di verificare i numeri con i vostri dati.`,
              react: [{ w: 'villa', a: `rallenta`, t: `Domanda giusta. Non sono sicuro di saperla. Mandi due righe a Elisa, ci rivediamo.` }, { think: `Non ho venduto niente. Mi sono fatto ricordare.` }],
            }),
            ch('b', 1, `Gli dico in venti secondi cosa fa la piattaforma e perché è la migliore del mercato.`, `Villa annuisce, già diretto verso l’uscita: “Elisa mi ha detto”. Hai usato il tuo unico momento per ripetere ciò che sa già.`, { t: -2, c: 2 }, {
              mp: ['E'], set: { ebEngaged: true },
              next: 'RET',
              say: `Dottor Villa, in venti secondi: tracciabilità lotti validata GxP, la migliore del mercato, con clienti pharma in tutta Europa.`,
              react: [{ w: 'villa', a: `già in movimento`, t: `Elisa mi ha detto. Grazie.` }, { think: `Ha già sentito tutto. Ho sprecato la porta.` }],
            }),
            ch('c', 2, `Mi presento e gli dico che sono a disposizione, senza chiedere nulla.`, `Villa apprezza la discrezione, ma non ricorderà la conversazione: nessuna richiesta, nessun seguito.`, { t: 2, c: 0 }, {
              mp: ['E'], set: { ebEngaged: true },
              next: 'RET',
              say: `Piacere, dottor Villa. Sono a sua disposizione, se Elisa o lei avete bisogno di qualcosa.`,
              react: [{ w: 'villa', a: `con un cenno`, t: `Grazie. Buona giornata.` }, { n: `Si allontana verso l’ascensore. L’incontro è durato quanto un saluto.` }],
            }),
            ch('d', 0, `Gli chiedo subito se possiamo parlare di prezzo, prima che entri in riunione.`, `Villa si ferma, si volta, ti guarda: “Prezzo di cosa, esattamente?”. Hai saltato il valore e consegnato il prezzo.`, { t: -8, v: -6, c: -4, r: 8 }, {
              set: { ebEngaged: false },
              next: 'RET',
              say: `Dottor Villa, so che ha poco tempo: possiamo parlare di prezzo prima che entri in riunione?`,
              react: [{ w: 'villa', a: `fermo`, t: `Prezzo di cosa, esattamente? Non mi hanno ancora spiegato che cosa compro.` }, { think: `Ho consegnato il prezzo prima del valore.` }],
            }),
          ],
        },
      },
      {
        id: 'audit_fornitore', title: `Audit di fornitore a sorpresa`, w: 1, after: ['n3', 'n4', 'n4b'],
        node: {
          when: `Venerdì · 09:00`, view: 'call', where: `Videocall · Qualità FarmaVita · venerdì 09:00`,
          scene: (d) => [
            { n: `Un invito arriva con un’ora di preavviso: Qualità FarmaVita, “audit di fornitore, sessione remota”.` },
            { w: 'anna', a: `cordiale e precisa`, t: `Buongiorno. Prima di qualsiasi accordo, per procedura, valutiamo i fornitori critici. Vi chiedo di condividere il vostro sistema di qualità, adesso.` },
            { think: d.flags.gxpPath ? `Sala mi ha già dato i criteri. Anna chiede la stessa cosa dal suo lato. Sono pronto, se non improvviso.` : `Non ho i criteri del CIO scritti. Questa può essere la mia occasione, o la mia trappola.` },
          ],
          prompt: `La Qualità ti mette alla prova all’improvviso. Come rispondi?`,
          hint: `Un audit improvviso non è un attacco: è un modo di vedere come ti comporti sotto controllo.`,
          tip: `Un audit a sorpresa misura la trasparenza più della perfezione. Dichiara cosa è documentato, cosa no e cosa stai facendo per colmare le lacune: è ciò che un’azienda regolata apprezza di più.`,
          choices: [
            ch('a', 3, `Accetto subito, condivido ciò che ho e dichiaro chiaramente ciò che non ho ancora.`, (d) => d.flags.gxpPath ? `La Qualità vede un fornitore coerente con ciò che ha detto all’IT: la fiducia sale in due direzioni.` : `Ferrante annota la tua franchezza. Non è un via libera, ma la Qualità non è più un’incognita.`, (d) => ({ t: 8, v: 4, c: 6, r: d.flags.gxpPath ? -8 : -4 }), {
              mp: ['Dc'], next: 'RET',
              say: `Volentieri, dottoressa. Le condivido ora il nostro sistema di qualità. Su due punti, il piano di convalida PQ e la tracciabilità dell’audit trail in ambienti ibridi, la documentazione non è ancora completa: le dico cosa manca e quando arriva.`,
              react: [{ w: 'anna', a: `scrive`, t: `Ottimo: preferisco una lacuna dichiarata a una tappata. Mi mandi il calendario.` }, { think: `L’audit non misura la perfezione. Misura la trasparenza.` }],
            }),
            ch('b', 1, `Chiedo di rimandare l’audit a quando sarà pronta tutta la documentazione.`, `Ferrante prende atto, ma il rinvio suona come una difesa: la sessione viene riprogrammata fra due settimane, con più pressione.`, { t: -4, c: -4, r: 8 }, {
              next: 'RET',
              say: `Dottoressa, preferirei rimandare l’audit a quando avrò la documentazione completa, così la sessione è più utile a tutti.`,
              react: [{ w: 'anna', a: `senza alzare la voce`, t: `Capisco. La riprogrammo fra due settimane. Ma un fornitore pronto non rimanda.` }, { think: `Ho comprato tempo, e perso credito.` }],
            }),
            ch('c', 2, `Delego il responsabile qualità di Nexora, che conosce meglio i dettagli.`, `L’audit va bene sul piano tecnico, ma la Qualità non ha visto te: nessun guadagno sulla relazione, nessuna perdita sul contenuto.`, { t: 0, v: 2, c: 0 }, {
              next: 'RET',
              say: `Dottoressa, la sessione la guida il nostro responsabile qualità: conosce ogni dettaglio meglio di me.`,
              react: [{ n: `L’audit si svolge senza intoppi. A fine mattinata Ferrante ti scrive tre righe cortesi.` }],
            }),
            ch('d', 0, `Dico che il nostro sistema di qualità è certificato e passo oltre.`, `Ferrante chiede la certificazione specifica e il numero di registro: non hai il numero a portata di mano e l’affermazione ti si ritorce contro.`, { t: -8, v: -4, r: 10 }, {
              integ: -3, next: 'RET',
              say: `Il nostro sistema di qualità è certificato. Possiamo passare oltre.`,
              react: [{ w: 'anna', a: `senza giri`, t: `Mi indichi la certificazione e il numero di registro, per favore.` }, { think: `Non ce l’ho a portata di mano. E lei lo ha capito.` }],
            }),
          ],
        },
      },
      {
        id: 'roadshow', title: `Il concorrente alla porta del CIO`, w: 1, after: ['n2', 'n3'],
        node: {
          when: `Martedì · 14:20`, view: 'walk', where: `Atrio · sede FarmaVita · martedì 14:20`,
          scene: (d) => [
            { n: `Nell’atrio, un cavalletto con il logo di Vertex Systems. “Roadshow: tracciabilità e compliance in tempo reale”. Un rappresentante sorridente distribuisce penne.` },
            { w: 'sala', a: `all’uscita della sala, sottovoce`, t: d.flags.gxpPath ? `Sì, hanno chiesto di presentarsi. Ho detto di sì, per correttezza. Ma i miei criteri sono i vostri: li ho già scritti.` : `Hanno chiesto di presentarsi. Ho detto di sì: se il mio vendor attuale funziona, voglio vedere cosa c’è sul mercato.` },
            { think: d.flags.gxpPath ? `Ha scritto i suoi criteri. Posso farli valere.` : `Non ho criteri scritti. E sta valutando altri.` },
          ],
          prompt: `Vertex è arrivato prima di te. Come reagisci?`,
          hint: `Contro un concorrente che ti precede non servono insinuazioni: servono criteri chiari.`,
          tip: `Quando un concorrente entra nel perimetro, non parlare di lui: rendi più nitidi i criteri del cliente e verifica che siano tuoi punti di forza. Chi denigra perde, chi chiarisce guadagna.`,
          choices: [
            ch('a', 3, `Chiedo a Sala quali criteri userà per confrontare i fornitori e mi allineo a quelli.`, (d) => d.flags.gxpPath ? `Con i tre criteri già scritti, il confronto è a tuo favore: Sala ti apre la griglia di valutazione e ti chiede conferma.` : `Sala ti detta tre criteri al volo: diventano il terreno su cui ti confronti, senza che tu abbia denigrato nessuno.`, (d) => ({ t: 6, v: 6, c: 8, r: -6 }), {
              mp: ['Dc', 'Co'], next: 'RET',
              say: `Giusto che veda cosa c’è sul mercato, dottor Sala. Mi aiuta a capire con quali criteri confronterà i fornitori? Così le porto solo ciò che serve a decidere, e le dico dove siamo forti e dove no.`,
              react: [{ w: 'sala', a: `sorpreso`, t: `Non me l’aspettavo. Ma è la cosa più utile che mi abbia detto.` }, { think: `Non ho parlato del concorrente. Ho parlato del suo criterio.` }],
            }),
            ch('b', 0, `Gli dico che Vertex ha avuto problemi di affidabilità in altri clienti pharma.`, `Sala ti guarda: “Ha prove?”. Non ne hai. La frase ti definisce come uno che parla male dei concorrenti.`, { t: -10, c: -4, r: 14 }, {
              integ: -4, next: 'RET',
              say: `Dottor Sala, le dico quello che so: Vertex ha avuto problemi di affidabilità con altri clienti pharma.`,
              react: [{ w: 'sala', a: `fermo`, t: `Ha prove? Documenti, riferimenti?` }, { think: `Ho una voce, non un fatto. Ho appena perso metà della mia credibilità.` }],
            }),
            ch('c', 1, `Faccio finta di niente e preparo una demo più brillante della loro.`, `La demo è ottima, ma non risponde ai criteri che Sala non ti ha detto: ti misuri su un terreno che non conosci.`, { t: 0, v: 2, c: -2, r: 4 }, {
              next: 'RET',
              say: `Perfetto, dottor Sala. Buon lavoro, ci sentiamo presto.`,
              react: [{ n: `Passi la sera a preparare una demo che nessuno ti ha chiesto.` }, { think: `Brillante, ma su criteri che non ho mai sentito.` }],
            }),
            ch('d', 2, `Chiedo a Elisa di sondare cosa abbia detto Vertex.`, `Elisa ti riferisce due frasi, ma l’iniziativa le pesa: non è il suo ruolo fare da spia.`, { t: -2, c: 0, r: 2 }, {
              next: 'RET',
              say: `Elisa, riesci a capire cosa ha detto Vertex a Sala? Mi aiuterebbe a non essere colto di sorpresa.`,
              react: [{ w: 'elisa', a: `a disagio`, t: `Provo… ma non mi piace fare la spia. Non chiedermelo più.` }],
            }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'cfo_cambia', title: `Il CFO lascia l’azienda`, kind: 'neg', w: 2,
        hit: (d) => !(d.mp.has('E') && d.mp.has('C')),
        dp: -0.32, dpProt: -0.03,
        hitText: `Alle 11:20 arriva un comunicato interno: Roberto Villa lascia FarmaVita con effetto immediato. Il suo successore ad interim non ha mai sentito parlare di {client}, né di te. Elisa ti scrive tre parole: “Ricominciamo da capo”.`,
        protText: `Il comunicato arriva alle 11:20: Villa lascia FarmaVita. Hai la sensazione di averlo già vissuto, perché lo avevi previsto: Elisa conosce il successore e il business case è già stato condiviso dal tuo champion. Rallenta tutto di una settimana, non di un trimestre.`,
      },
      {
        id: 'ispezione_blocco', title: `L’ispezione congela i nuovi progetti`, kind: 'neg', w: 1,
        hit: (d) => !(d.flags.gxpPath && d.mp.has('Dp')),
        dp: -0.25, dpProt: -0.03,
        hitText: `L’autorità regolatoria emette un rilievo su un altro sito di {client}. La direzione sospende tutti i progetti non indispensabili per sessanta giorni. Il tuo non rientra nella lista di quelli salvati.`,
        protText: `Un rilievo su un altro sito di {client} congela i nuovi progetti. Il tuo è nella lista delle eccezioni: il piano di convalida a ondate e i criteri scritti con l’IT lo qualificano come “rischio ridotto”. Perdi cinque giorni, non il trimestre.`,
      },
      {
        id: 'board_anticipa', title: `Il CdA anticipa il voto`, kind: 'pos', w: 1,
        if: (d) => d.mp.has('E') && !!d.flags.bizCase,
        hit: () => true,
        dp: 0.10, dpProt: 0,
        hitText: `Il presidente del CdA chiede di anticipare il voto al 28 ottobre per chiudere i budget prima della revisione contabile. Villa porta i tuoi numeri in tavola con una slide: “Questo è il progetto che propongo di approvare per primo”.`,
        protText: `Il presidente del CdA anticipa il voto. Villa porta i tuoi numeri in tavola.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Commit all’80%: “il board approva a novembre”`,
      people: { E: `Roberto Villa (CFO)`, C: `Elisa Marchetti`, Dp: `Elisa Marchetti e il legale di FarmaVita`, P: `Chiara Neri (Acquisti) e il legale`, M: `Roberto Villa, con i dati di FarmaVita`, I: `Elisa Marchetti (Operations)`, Dc: `Bruno Sala (CIO) e Anna Ferrante (Qualità)`, Co: `il vendor storico, con contratto fino al 2028` },
      risk: `Il rischio vero è che il voto del board slitti, oppure che IT e Qualità blocchino la convalida GxP.`,
      custom: [
        {
          id: 'villa_numeri', if: () => true, has: (d) => !!d.flags.bizCase,
          q: `Villa ha validato i numeri sul capitale in quarantena, o li hai validati tu con Elisa?`,
          evidence: `Li ha discussi lui, di persona: ha contestato il diciotto per cento e ha chiesto i dati reali. Ho la call di validazione in agenda.`,
          honest: `Li ho costruiti con i dati di Elisa. Villa li ha sentiti, non li ha ancora validati. Fino ad allora non la chiamo Commit.`,
          bluff: `Li ha validati lui: ha detto che se reggono, il budget non è un problema.`,
          vague: `Villa è positivo, me l’ha fatto capire Elisa.`,
          react: {
            evidence: `Ok, questo è un fatto: me lo giri con la data della call. Con Villa che discute i numeri, per me resta in Commit.`,
            honest: `Grazie per averlo detto. Allora è Best Case, e ti metto in contatto con la mia controparte nella tesoreria: serve una seconda via verso Villa.`,
            bluffCaught: `Nel CRM la nota su Villa è vuota, e Elisa non ha mai scritto di una validazione. Non mi serve che sia perfetto: mi serve che sia vero.`,
            bluffPassed: `Va bene, lo scrivo. Ma venerdì voglio la data della call di validazione, altrimenti lo sposto io.`,
            vague: `“Me l’ha fatto capire Elisa” non è un fatto. Torno a chiedertelo giovedì.`,
          },
        },
        {
          id: 'sala_dentro', if: () => true, has: (d) => !!d.flags.gxpPath && !d.flags.overclaimGxp,
          q: `Sala è dentro o è solo non contrario? A me serve un sì tecnico, non un silenzio.`,
          evidence: `Ha scritto i suoi tre criteri e me li ha mandati. Gli ho risposto punto per punto: tiene la bozza e la usa nella valutazione.`,
          honest: `È non contrario. Ha fissato i suoi criteri ma non mi ha dato un via libera. Per me, fino ad allora, Best Case.`,
          bluff: `È dentro: l’ultima volta mi ha detto che per lui si può procedere.`,
          vague: `Sala è una persona seria: se ha detto che ci pensa, ci pensa.`,
          react: {
            evidence: `Questo mi piace: criteri scritti da lui e risposta tua per iscritto. Il resto è esecuzione.`,
            honest: `Giusta distinzione: “non contrario” e “a favore” sono due righe diverse del CRM. Quindi Best Case, e lavoriamo per portarlo a sì.`,
            bluffCaught: `L’ultima nota del tuo CRM su Sala è “ha detto che ci pensa”. Non c’è nessun “si può procedere”. Rifacciamolo con i fatti.`,
            bluffPassed: `Lo scrivo, ma voglio un’email di Sala con quelle parole, entro venerdì.`,
            vague: `“Sala è una persona seria” non è un criterio di forecast. Dammi una frase sua.`,
          },
        },
        {
          id: 'piano_board', if: () => true, has: (d) => d.mp.has('Dp'),
          q: `Chi presenta la richiesta di budget al board, quando, e con quale documento?`,
          evidence: `La presenta Elisa il 15 ottobre, con la nostra proposta e il business case. Il voto è il 14 novembre: ho il calendario scritto con lei.`,
          honest: `Dovrebbe presentarla Elisa entro metà ottobre. Non ho ancora il documento, né una data scritta.`,
          bluff: `La presenta Elisa il 15 ottobre, con tutto il materiale: è già nel pacchetto del CdA.`,
          vague: `Elisa mi ha detto che ci pensa lei, il resto non lo so.`,
          react: {
            evidence: `Bene: nome, data e documento. È esattamente ciò che mi aspetto da un Commit.`,
            honest: `Grazie. Allora fissa subito la data con lei: ti do tre giorni, e lo sposto in Best Case fino ad allora.`,
            bluffCaught: `Ho il pacchetto del CdA davanti: la tua proposta non c’è. Parliamone senza rimproveri, ma da lunedì lo rifacciamo daccapo.`,
            bluffPassed: `Ok. Mandami l’indice del pacchetto domani e lo chiudiamo.`,
            vague: `“Ci pensa lei” è esattamente ciò che dice un champion che non è stato testato. Riparliamone con una data.`,
          },
        },
      ],
    },

    endings: {
      won: `Il board approva il 14 novembre. Villa firma tre giorni dopo un ordine pluriennale. Elisa ti scrive: “Alla fine è stato più semplice di come lo immaginavo”. Era semplice perché lo avevi disegnato prima.`,
      lost: `Il board rinvia. Senza il CFO dalla tua parte, la richiesta di budget non ha un difensore e viene ritirata “in attesa di priorità”. Il vendor storico rinnova a prezzo scontato.`,
      slip: `Il deal non muore, ma il budget viene riallocato al primo trimestre dell’anno prossimo. Elisa resta alleata. La finestra no.`,
    },
    lessons: [
      { if: (d) => d.flags.ebEngaged && d.flags.bizCase, good: true, t: `Hai portato il CFO dentro con i suoi numeri, non con le tue slide: è ciò che separa un “Commit” sperato da uno reale.` },
      { if: (d) => !d.flags.ebEngaged, good: false, t: `Nessuno firma mezzo milione senza l’Economic Buyer. Con un solo contatto il CRM dice Commit, la realtà dice Best Case.` },
      { if: (d) => d.flags.plan, good: true, t: `Aver costruito subito la storia del deal con Elisa ti ha dato date, ruoli e criteri. Un Mutual Close Plan è un’assicurazione sul tempo.` },
      { if: (d) => d.flags.overclaimGxp, good: false, t: `Promettere una validazione che il prodotto non ha è la scorciatoia più cara: la Qualità legge i documenti, e gli audit ancora di più.` },
      { if: (d) => d.flags.giveGet, good: true, t: `Hai scambiato sconto contro durata, tempi e referenza. Mai un “give” senza un “get”.` },
      { if: (d) => d.flags.bypassed, good: false, t: `Scavalcare il champion costa più di quanto rende: ha bisogno di sentirsi protagonista del progetto.` },
      { if: (d) => d.flags.paperReady, good: true, t: `Hai avviato l’iter legale in parallelo. Il paper process è dove muoiono più deal “già vinti”.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
