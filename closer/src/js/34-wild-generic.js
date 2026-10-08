/* CLOSER · imprevisti generici (valgono per tutti gli scenari).
   Un imprevisto è un nodo extra che il motore inserisce dopo una mossa: la gravità dipende da come ti sei preparato.
   Cast ammesso: marta, davide, collega, cliente. Tutte le scelte tornano al flusso con next: 'RET'.
   Eleggibilità (if): le scene da fase avanzata (sconti, clausole, trattative sul prezzo) compaiono solo dopo qualche mossa vera;
   quelle che presuppongono un contatto informale o una trattativa di prezzo non compaiono nelle gare pubbliche, e quelle
   che presuppongono giorni o settimane davanti non compaiono negli scenari “a tempo” (orologio nel cruscotto).
   Le etichette di tempo (when) sono volutamente vaghe (“Nel frattempo”, “In giornata”): l’imprevisto si innesta in qualunque momento dello scenario.
   I testi sono senza aggettivi di genere sul contatto (cambia da scenario a scenario) e senza preposizioni articolate davanti ai segnaposto. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  /* quante porte hai oltre al contatto: Economic Buyer, criteri, processo, paper */
  const threads = (d) => ['E', 'Dc', 'Dp', 'P'].filter((k) => d.mp.has(k)).length;
  /* mosse vere fatte finora (gli imprevisti già affrontati non contano): serve a non anticipare scene da fase avanzata */
  const moves = (d) => d.hist.filter((h) => !h.wild).length;
  /* gara pubblica: contatti informali, sconti a voce e prezzi negoziati all’ultimo non esistono */
  const tender = (d) => !!(d.sc && /\bgara\b|pubblic/i.test(d.sc.sector || ''));
  /* scenario “a tempo” (orologio nel cruscotto): niente scene che presuppongono giorni o settimane davanti a te */
  const boxed = (d) => !!(d.sc && (d.sc.hud || []).some((x) => x && x.type === 'clock'));
  /* percentuali con l’articolo giusto: “il 12%”, “l’8%”, “l’11%”; e “al 12%”, “all’8%” */
  const ell = (n) => n === 1 || n === 8 || n === 11 || (n >= 80 && n <= 89);
  const ilPct = (n) => (ell(n) ? 'l’' : 'il ') + n + '%';
  const alPct = (n) => (ell(n) ? 'all’' : 'al ') + n + '%';
  const TEAMS = { app: 'Teams' };
  const WA = { app: 'WhatsApp' };
  const chatM = (t, extra) => Object.assign({ chat: Object.assign({ from: 'marta' }, TEAMS), t }, extra || {});
  const chatC = (t, extra) => Object.assign({ chat: Object.assign({ from: 'cliente' }, WA), t }, extra || {});

  CL.wildGeneric = [
    /* ───────────── 1 · Marta vuole il numero ───────────── */
    {
      id: 'marta_chat',
      title: `Marta vuole il numero, adesso`,
      w: 2,
      if: (d) => moves(d) >= 2,
      node: {
        when: `Nel frattempo`,
        view: 'phone',
        where: `Chat · Teams`,
        scene: (d) => {
          const strong = d.mp.size >= 5 && d.m.control >= 55;
          const weak = d.mp.size <= 3 || d.m.control < 40;
          return [
            { n: `Sei in piedi accanto alla macchinetta del caffè quando il telefono vibra contro il palmo della mano.`, sfx: 'ping' },
            chatM(`Ho dieci minuti prima della call con il Country Manager. {client}: che numero ti metto nel forecast? Due righe. E dimmi cosa non so.`),
            strong ? { think: `Il CRM è aggiornato e a ogni casella corrisponde un nome. Posso rispondere guardandola in faccia.` }
              : weak ? { think: `Ho più sensazioni che fatti. Sul CRM la differenza si vede, e lei la sa leggere meglio di me.` }
                : { think: `Ho una parte di fatti e una parte di buone sensazioni. Il difficile è non scambiare l’una per l’altra.` },
          ];
        },
        prompt: `Hai due righe e dieci minuti. Cosa scrivi a Marta?`,
        hint: `Marta decide dove mettere risorse in base a quello che le scrivi. Cosa saresti in grado di difendere se ti chiedesse: dov’è scritto?`,
        tip: `Il forecast è un patto di fiducia: Marta lo porta in alto con il tuo nome sopra. Un numero onesto con il rischio nominato attira aiuto; uno gonfiato lo allontana proprio quando servirebbe; il silenzio non protegge nessuno.`,
        choices: [
          ch('a', 3,
            `Ti scrivo cosa regge e cosa no: dove ho nomi, date e documenti ti indico la categoria; dove ho solo la parola del cliente te lo dico. Dettaglio entro stasera.`,
            (d) => (d.mp.size >= 5
              ? `Con un deal che regge, la risposta onesta è anche la più forte: Marta vede cosa è provato e cosa è ancora parola, e può costruirci sopra. Il tuo numero diventa un dato, non una promessa da verificare.`
              : `Il numero che ne esce è più basso di quello che avresti voluto, ma è difendibile. Marta sa dove guardare e dove aiutarti, e la volta dopo la tua parola peserà di più.`),
            { t: 4, c: 4, r: -4 },
            {
              integ: 3,
              next: 'RET',
              say: `Marta, ti do il numero che posso difendere, non quello che mi piacerebbe. Dove ho nomi, date e documenti ti scrivo la categoria; dove ho solo la parola del cliente te lo dico chiaramente. Ti mando il dettaglio entro stasera.`,
              react: [
                chatM(`Meglio un numero che regge che uno che mi piace. Mandami il dettaglio e dimmi dove ti serve una mano: quello che non è provato lo tratto come tale.`),
                { n: `Rimetti il telefono in tasca. Il caffè si è raffreddato, ma il numero lo puoi guardare in faccia.` },
              ],
            }),
          ch('b', 0,
            `Mettilo in Commit. Il cliente è allineato, il budget c’è e per me la firma arriva dentro il trimestre. Se qualcosa cambia, sei la prima a saperlo.`,
            (d) => (d.mp.size >= 5
              ? `Il numero, stavolta, non è lontano dai fatti, ma l’hai dato come un’impressione, senza una prova da citare. Se Marta chiede dove sta scritto che il budget c’è, la risposta non è nel CRM, e un forecast senza evidenze resta un’opinione.`
              : `Hai dato a Marta una certezza che non hai, e lei la porterà in alto con il tuo nome sopra. Se il deal scivola, non scivola solo la firma: scivola la credibilità del prossimo numero che le darai.`),
            (d) => (d.mp.size >= 5 ? { t: -2, r: 3 } : { t: -5, c: -3, r: 8 }),
            {
              integ: -4,
              next: 'RET',
              say: `Marta, mettilo pure in Commit: il cliente è allineato, il budget c’è e per me la firma arriva dentro il trimestre. Se qualcosa cambia, sei la prima a saperlo.`,
              react: [
                chatM(`Commit, allora. Mi fido: se qualcuno mi chiede il perché, userò le tue parole. Alla lettera.`),
                { think: `Le mie parole. Speriamo che a fine trimestre abbiano ancora qualcosa dietro.` },
              ],
            }),
          ch('c', 2,
            `Best Case, direi. Manca un passaggio che sto chiarendo con il cliente: appena lo chiudo ti dico se sale di categoria. Per ora è un numero prudente.`,
            `La categoria è credibile e non promette ciò che non c’è. Ma “manca un passaggio” non dice a Marta quale: se non nomini il buco, lei non può aiutarti a chiuderlo.`,
            { t: 1, c: 2 },
            {
              next: 'RET',
              say: `Marta, io lo metterei in Best Case. Manca un passaggio che sto chiarendo con il cliente: appena lo chiudo ti dico se sale. Per ora è un numero prudente.`,
              react: [
                chatM(`Ok, Best Case. Quale passaggio, esattamente? Se me lo dici, forse ti apro io una porta.`),
                { n: `La domanda è ragionevole, e non hai una risposta pronta da scrivere in due righe.` },
              ],
            }),
          ch('d', 1,
            `È presto per un numero serio: ho ancora troppe variabili aperte. Ti aggiorno appena ho più visibilità su tempi e persone coinvolte.`,
            `Non è una bugia, ma nemmeno un forecast: Marta non può programmare risorse sulla nebbia. Chi non si espone resta al sicuro oggi e senza aiuto domani.`,
            { t: -3, c: -3, r: 3 },
            {
              next: 'RET',
              say: `Marta, è presto per darti un numero serio: ho ancora troppe variabili aperte. Ti aggiorno appena ho più visibilità su tempi e persone coinvolte.`,
              react: [
                chatM(`Se aspetti di vederci chiaro, rischio di arrivare tardi ad aiutarti. Ma va bene: ti segno “da chiarire” e ne riparliamo quando hai qualcosa in mano.`),
                { think: `Ho preso tempo e non ho detto niente. Nessun errore, ma nemmeno un passo avanti.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 2 · Il contatto è fuori per dieci giorni ───────────── */
    {
      id: 'contact_away',
      title: `Il tuo contatto sparisce per dieci giorni`,
      w: 2,
      if: (d) => !tender(d) && !boxed(d),
      node: {
        when: `Fine mattinata`,
        view: 'phone',
        where: `Telefono · segreteria`,
        scene: (d) => {
          const th = threads(d);
          return [
            { n: `Componi il suo numero per la terza volta in due giorni. Squilla a vuoto, poi scatta la segreteria.`, sfx: 'phone' },
            chatC(`Scusa se sparisco: mi hanno mandato in trasferta. Rientro tra dieci giorni e per ora ho la posta a singhiozzo. Ne parliamo al mio ritorno, ok?`, { sfx: 'ping' }),
            th >= 3 ? { think: `Dieci giorni. Ma ho il numero di chi firma e le date del percorso: il progetto non dipende da una sola linea telefonica.` }
              : th >= 1 ? { think: `Dieci giorni. Ho qualche altro nome, ma nessuno che si muova senza il suo via libera: se il calendario si ferma, si ferma per tutti.` }
                : { think: `Dieci giorni. E questo è l’unico numero che ho. Tutto il progetto appeso a un telefono che non risponde.` },
          ];
        },
        prompt: `Dieci giorni sono quasi due settimane di calendario. Cosa fai?`,
        hint: `Se il tuo unico ponte con l’azienda è partito, contano gli altri ponti: chi altro ti conosce, e che cosa gli serve per parlare con te?`,
        tip: `Un solo contatto è un punto di rottura. Il multi-threading non serve a scavalcare il champion, ma a non dipendere da una persona sola: le relazioni si costruiscono quando tutto va bene, non quando il telefono suona a vuoto.`,
        choices: [
          ch('a', 3,
            `Rispondo augurando buon viaggio e lascio il punto aperto in due righe. Poi chiedo a chi ho già conosciuto in azienda di tenere vivo il tema fino al rientro.`,
            (d) => {
              const th = threads(d);
              return th >= 3
                ? `Hai fatto ciò che il multi-threading permette: il progetto continua a muoversi anche con il tuo contatto lontano, e al rientro lo troverà più avanti di come lo ha lasciato.`
                : th >= 1
                  ? `Funziona in parte: hai qualcuno con cui tenere acceso il filo, ma pochi nomi e poca confidenza. Più relazioni avevi costruito prima, più questa mossa avrebbe reso.`
                  : `È la mossa giusta, ma hai poco su cui appoggiarla: in azienda ti conosce una persona sola. Il danno non è la partenza, è non aver costruito un secondo ponte quando tutto andava bene.`;
            },
            (d) => {
              const th = threads(d);
              return th >= 3 ? { t: 4, c: 6, r: -5 } : th >= 1 ? { t: 2, c: 3, r: -2 } : { t: 1, c: 1 };
            },
            {
              next: 'RET',
              say: `Buon viaggio, e non ti preoccupare: lascio aperto solo il punto sulle date di approvazione, ne parliamo al tuo rientro. Intanto sento i colleghi che ho già incontrato, così non si ferma tutto.`,
              react: (d) => (threads(d) >= 1
                ? [
                  chatC(`Grazie, mi fa piacere che non ti fermi. Se serve, ti metto io in copia con i colleghi giusti: basta che mi scrivi tre righe.`),
                  { n: `Il messaggio risulta consegnato, poi letto. Almeno una linea del progetto resta accesa.` },
                ]
                : [
                  chatC(`Grazie. Con gli altri però devi presentarti da zero: non sono in molti a sapere chi sei.`),
                  { think: `Ha ragione. Ho un solo ponte, e adesso lo vedo in controluce.` },
                ]),
            }),
          ch('b', 1,
            `Aspetto che rientri: dieci giorni passano in fretta, e preferisco non disturbare nessun altro in azienda mentre è via. Lascio il suo spazio.`,
            (d) => {
              const th = threads(d);
              return th >= 3
                ? `Perdi qualche giorno, ma con altri riferimenti il progetto non si ferma da solo: era l’occasione per muoverti di più, e hai scelto di fermarti anche tu.`
                : th >= 1
                  ? `Dieci giorni di silenzio con pochi altri riferimenti sono un buco nel calendario. Aspettare sembra rispetto, ma lascia che sia l’assenza di qualcun altro a decidere il ritmo.`
                  : `Dieci giorni di silenzio con un solo contatto sono un buco nel calendario: tutto ciò che nel frattempo si muove in azienda, si muove senza di te. Lo scoprirai al rientro.`;
            },
            (d) => {
              const th = threads(d);
              return th >= 3 ? { u: -2, c: -2 } : th >= 1 ? { u: -4, c: -5, r: 5 } : { u: -8, c: -9, r: 10 };
            },
            {
              next: 'RET',
              say: `Nessun problema, aspetto il tuo rientro. Buon lavoro e buon viaggio: ne riparliamo tra dieci giorni.`,
              react: [
                { n: `Le giornate passano a velocità normale. È il progetto che rallenta.` },
                { think: `Nessuno mi ha detto di no. Nessuno mi ha detto di sì. Nessuno mi ha detto niente.` },
              ],
            }),
          ch('c', 0,
            `Scrivo a un dirigente dell’azienda che non conosco, presentandomi con il progetto: dieci giorni sono troppi per stare in silenzio e non voglio perdere slancio.`,
            `Scrivere a chi non conosci, mentre chi ti ha portato fin qui è lontano, sa di una mossa alle spalle. Al rientro troverà un messaggio che non ha scritto e un fornitore che ha agito senza dire niente a nessuno.`,
            (d) => (threads(d) >= 3 ? { t: -3, c: -2, r: 3 } : { t: -8, c: -6, r: 8 }),
            {
              next: 'RET',
              say: `Buongiorno, sono di Nexora e seguo con il vostro reparto un progetto già avviato. Vorrei presentarmi e capire chi, in sua assenza, può tenere aperto il tema nei prossimi giorni.`,
              react: [
                { n: `La mail parte alle 11:42. La risposta automatica del dirigente arriva in meno di un minuto: è in riunione fino a giovedì.` },
                { think: `Ho fatto qualcosa. Non so ancora se per il progetto o per la mia ansia.` },
              ],
            }),
          ch('d', 2,
            `Uso i dieci giorni: rifaccio il piano di chiusura con le date a ritroso e le domande aperte in ordine di priorità, così al rientro non perdiamo nemmeno un’ora.`,
            `Lavorare sul piano è tempo ben speso: al rientro il lavoro sarà già fatto. Ma restare in silenzio con tutti gli altri ti lascia esposto a un ritardo che non controlli.`,
            { c: 4, u: -2, r: -1 },
            {
              next: 'RET',
              say: `Mi metto a ricostruire il piano di chiusura partendo dalla data di firma e andando all’indietro, con le domande aperte in ordine di priorità. Quando rientra, riparte tutto in un’ora.`,
              react: [
                { n: `Passi la mattinata con il calendario aperto, a contare i giorni all’indietro dalla firma. I conti non sono tranquillizzanti, ma almeno sono tuoi.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 3 · L’offerta shock del concorrente ───────────── */
    {
      id: 'rival_offer',
      title: `Circola l’offerta shock di Vertex`,
      w: 2,
      if: (d) => !tender(d) && moves(d) >= 2,
      node: {
        when: `In giornata`,
        view: 'call',
        where: `Call · Teams`,
        scene: (d) => {
          const co = d.mp.has('Co'), mm = d.mp.has('M');
          return [
            { n: `Il tuo contatto accende la telecamera con l’aria di chi ha una notizia da dare e non sa da dove cominciare.` },
            { w: 'cliente', a: `condivide lo schermo`, t: `Preferisco che lo sappia da me. Ci è arrivata un’offerta di Vertex Systems: stesso perimetro, quasi il 30% in meno, avvio in sei settimane. In direzione l’hanno già vista.`, sfx: 'alert' },
            co && mm ? { think: `Sapevo che sarebbero arrivati dal lato del prezzo. Ho un confronto sul costo totale e i numeri del cliente: è il momento di usarli.` }
              : co ? { think: `Vertex me l’aspettavo. Ma i numeri per spiegare perché la differenza di prezzo non è la differenza di costo non li ho mai costruiti.` }
                : mm ? { think: `Vertex? Non sapevo nemmeno che fossero in corsa. I numeri del cliente li ho, ma non so dove attaccano loro.` }
                  : { think: `Vertex. Non sapevo che fossero in gioco, e non ho un solo numero per rispondere. Rischio di difendermi a parole.` },
          ];
        },
        prompt: `Il prezzo di un altro è sullo schermo. Come rispondi?`,
        hint: `Un prezzo più basso è un dato; il costo totale è un’altra cosa. Cosa puoi dimostrare, con numeri del cliente, oggi?`,
        tip: `Contro un’offerta shock non si rincorre il prezzo: si riporta il confronto su ciò che il cliente ha già detto di valorizzare, cioè criteri, metriche e rischio. Chi ha mappato la concorrenza e quantificato l’impatto risponde con i fatti; gli altri, con gli sconti.`,
        choices: [
          ch('a', 3,
            `Grazie per avermelo detto subito. Mettiamo le due offerte una accanto all’altra sui vostri criteri: perimetro, rischio, costo in cinque anni. Se la loro regge, lo vediamo insieme.`,
            (d) => (d.mp.has('M')
              ? `Riporti il confronto dove ti conviene: sui criteri del cliente e sul costo totale, non sul prezzo di listino. Con i numeri che hai già condiviso la tua posizione regge, e il cliente lo vede.`
              : `Hai spostato la discussione dal prezzo ai criteri, ed è la mossa giusta. Ma senza numeri condivisi con il cliente il confronto riga per riga sarà più duro: dovrai costruirli adesso, in fretta.`),
            (d) => {
              const co = d.mp.has('Co'), mm = d.mp.has('M');
              return co && mm ? { t: 6, v: 6, c: 6, r: -8 } : co || mm ? { t: 4, v: 3, c: 4, r: -4 } : { t: 3, c: 3, r: -2 };
            },
            {
              mp: ['Co'],
              next: 'RET',
              say: `Ti ringrazio per avermelo detto subito: è la cosa più utile che potevi fare. Mettiamo le due offerte una accanto all’altra, sui criteri che avete scelto voi: perimetro, rischio, costo in cinque anni. Se la loro regge, lo vediamo insieme.`,
              react: [
                { w: 'cliente', a: `annuisce`, t: `Mi sembra corretto. Io non sono un tecnico, ma so che “stesso perimetro” è una frase che va controllata.` },
                { n: `Lo schermo condiviso resta fermo sul PDF di Vertex. Per la prima volta in una settimana, sembra solo un documento.` },
              ],
            }),
          ch('b', 0,
            `Vi vengo incontro sul prezzo. Datemi mezza giornata e vi mando una proposta rivista con uno sconto importante per avvicinarci alla loro cifra: non voglio perdervi per una differenza di numeri.`,
            `Rincorrere il prezzo del concorrente senza aver capito il confronto dice al cliente due cose: che il tuo valore si misura in sconto, e che il margine c’era. Ne hai ceduta una buona fetta per un’offerta che forse non era nemmeno comparabile.`,
            { t: 1, v: -6, c: -4, r: 2, d: 8 },
            {
              next: 'RET',
              say: `Vi vengo incontro sul prezzo. Datemi mezza giornata e vi mando una proposta rivista con uno sconto importante per avvicinarci alla loro cifra: non voglio perdervi per una differenza di numeri.`,
              react: [
                { w: 'cliente', a: `dopo un attimo`, t: `Subito? Così? Ah. Allora forse c’era più margine di quello che pensavamo.` },
                { think: `Ho appena detto al cliente quanto vale davvero il mio prezzo. Non è la cifra che avevo scritto in offerta.` },
              ],
            }),
          ch('c', 1,
            `Non è un’offerta comparabile: ho più di un dubbio che taglino su servizio e supporto. Prima di decidere, guardate bene le clausole scritte in piccolo, sui tempi di intervento.`,
            `Parlare male del concorrente senza averne la prova suona come un timore. Il cliente non ha chiesto un giudizio su Vertex, ma un motivo per restare con te: e quello, per ora, non glielo hai dato.`,
            { t: -6, v: -2, r: 6 },
            {
              next: 'RET',
              say: `Non è un’offerta comparabile, secondo me: ho più di un dubbio che taglino su servizio e supporto. Prima di decidere guardate bene le clausole scritte in piccolo.`,
              react: [
                { w: 'cliente', a: `alza un sopracciglio`, t: `Le clausole le leggiamo noi, grazie. Preferirei sentire cosa offrite voi, più che cosa non offrono loro.` },
                { n: `Dall’altra parte il silenzio dura un secondo di troppo.` },
              ],
            }),
          ch('d', 2,
            `Prima di toccare il prezzo, chiedo a Davide un confronto tecnico riga per riga. Se c’è davvero una differenza di perimetro, ve la mettiamo nero su bianco entro sera.`,
            `Prendi tempo senza cedere, e il tempo lo usi per capire cosa si sta confrontando. Ti manca ancora la parte che parla al cliente: i suoi criteri e i suoi numeri, che non hai chiesto di guardare insieme.`,
            { t: 3, v: 4, c: 4, r: -4 },
            {
              next: 'RET',
              say: `Prima di toccare il prezzo faccio fare a Davide un confronto tecnico riga per riga. Se c’è davvero una differenza di perimetro, ve la mettiamo nero su bianco entro sera.`,
              react: [
                { w: 'cliente', t: `Entro sera va bene. Ma spero di vedere qualcosa di molto chiaro: in direzione hanno poca pazienza per le sfumature.` },
                { n: `Appunti sul quaderno: perimetro, tempi, penali. Hai poche ore per trasformarli in una pagina.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 4 · Lo sconto chiesto in via ufficiosa ───────────── */
    {
      id: 'quiet_discount',
      title: `Lo sconto detto a mezza voce`,
      w: 1,
      if: (d) => !tender(d) && !boxed(d) && moves(d) >= 3,
      node: {
        when: `Sera · 19:10`,
        bg: 'night',
        view: 'phone',
        where: `Telefono · fuori orario`,
        scene: (d) => {
          const dsc = Math.round(d.disc);
          return [
            { n: `Stai spegnendo il portatile quando il telefono si illumina sul tavolo. A quest’ora il tuo contatto non chiama per il meteo.`, sfx: 'phone' },
            { w: 'cliente', a: `a voce bassa`, t: `Ti chiamo fuori orario, non è una chiamata ufficiale. Acquisti vuole uno sconto importante prima della firma. Se mi dai un numero adesso, domattina lo porto in comitato come già concordato: risparmiamo una settimana a tutti.` },
            dsc >= 8 ? { think: `Ho già promesso ${ilPct(dsc)}. Ogni punto in più lo pago io, e non esiste un modo per riprenderselo.` }
              : dsc > 0 ? { think: `Finora ho concesso ${ilPct(dsc)}. Mi chiede un numero adesso, senza carta e senza nessuno che lo veda.` }
                : { think: `Finora il prezzo è rimasto intatto. È la prima volta che mi chiede un numero, e lo chiede a fine giornata, quando ho la guardia bassa.` },
          ];
        },
        prompt: `Il tuo contatto aspetta una cifra. Cosa gli rispondi?`,
        hint: `Ciò che dici al telefono diventa il prezzo da cui si riparte. Cosa ottieni in cambio, e chi deve approvarlo dalla tua parte?`,
        tip: `Mai uno sconto senza una contropartita, e mai a voce: un numero detto al telefono diventa il nuovo prezzo di partenza. Dire che serve un’approvazione interna non è una debolezza, è un argomento.`,
        choices: [
          ch('a', 3,
            `Capisco la fretta. Un numero stasera non te lo do, ma domattina ti mando un’offerta scritta con due alternative: più sconto con durata maggiore, oppure prezzo pieno con servizi inclusi.`,
            `Non rifiuti e non regali: trasformi una richiesta ufficiosa in una scelta tra due opzioni, entrambe con una contropartita. Il tuo contatto ha qualcosa di concreto da portare in comitato, e sei tu a tenere il tavolo.`,
            (d) => (d.disc >= 8 ? { t: 2, c: 6, r: -3 } : { t: 3, c: 8, r: -4 }),
            {
              next: 'RET',
              say: `Ti ringrazio per la fiducia, davvero. Un numero stasera non te lo do, perché non voglio che tu lo porti in comitato senza nulla in mano. Domattina ti mando un’offerta scritta con due alternative: più sconto con una durata maggiore e la firma anticipata, oppure prezzo pieno con servizi inclusi.`,
              react: [
                { w: 'cliente', a: `dopo una pausa`, t: `Due alternative. Ok, è più facile da difendere di un numero buttato lì. Mandamele per le nove e le porto io.` },
                { n: `La chiamata finisce. Ti resta una scadenza per domattina e la sensazione di avere ancora in mano il tavolo.` },
              ],
            }),
          ch('b', 0,
            `Otto punti di sconto te li posso garantire subito, a voce. Portali domattina al comitato come già concordati: le carte le sistemiamo dopo, l’importante è non perdere questa settimana.`,
            (d) => `Il tuo sconto promesso sale ${alPct(Math.round(d.disc))}, per di più a voce, senza contropartita né una firma. Nella tua testa era un favore; per Acquisti è il nuovo prezzo di partenza, e il Deal Desk lo scoprirà dai documenti.`,
            (d) => (d.disc >= 8 ? { t: 1, v: -9, c: -7, r: 5, d: 8 } : { t: 2, v: -6, c: -6, r: 4, d: 8 }),
            {
              next: 'RET',
              say: `Otto punti di sconto te li posso garantire subito, a voce. Portali domattina al comitato come già concordati: le carte le sistemiamo dopo, l’importante è non perdere questa settimana.`,
              react: [
                { w: 'cliente', a: `con un sospiro`, t: `Grazie, sapevo di poter contare su di te. Lo porto domattina alle nove.` },
                { n: `Resti a guardare lo schermo spento del telefono. Hai appena dato via qualcosa che non è ancora scritto da nessuna parte.` },
              ],
            }),
          ch('c', 2,
            `Dimmi tu cosa è davvero in gioco: a che cifra si ferma Acquisti e cosa gli serve per dire sì? Con quel dato preparo con il Deal Desk una proposta che regga, senza improvvisare.`,
            `Usi la telefonata per capire invece di concedere: è un ottimo istinto. Ma resti sul suo terreno: la cifra la sceglie la controparte, e tu arrivi alla proposta con meno margine per costruire uno scambio.`,
            { t: 2, c: 4, r: -2 },
            {
              next: 'RET',
              say: `Prima di dirti qualunque numero, dimmi cosa è davvero in gioco: a che cifra si ferma Acquisti e cosa gli serve per dire sì? Con quel dato preparo con il Deal Desk una proposta che regga.`,
              react: [
                { w: 'cliente', t: `Una cifra non te la posso dare io. Ti dico però cosa gli serve davvero: chiudere prima di fine mese, per non perdere il budget.` },
                { think: `Niente numero, ma una scadenza. Posso costruirci sopra uno scambio, se mi muovo prima di domattina.` },
              ],
            }),
          ch('d', 1,
            `Ho un margine, ma non posso scoprirmi del tutto. Dimmi tu un numero e ti dico se ci sto: così evitiamo di perdere tempo con proposte che non passano e restiamo allineati.`,
            `Chiedere la cifra a chi ti sta chiamando sembra prudente, ma ti mette in difesa: qualunque numero dica diventa l’àncora della trattativa. Ora sei a metà strada tra il rifiuto e l’accordo, senza una contropartita da mostrare.`,
            { t: -2, v: -3, c: -4, d: 6 },
            {
              next: 'RET',
              say: `Ho un po’ di margine, ma non posso scoprirmi del tutto. Dimmi tu un numero e ti dico se ci sto: così evitiamo di perdere tempo con proposte che non passano.`,
              react: [
                { w: 'cliente', t: `Mettiamo sei punti e non se ne parla più. Vedrai che passa, se domattina ho il tuo sì.` },
                { think: `Non ho detto di sì. Ma non ho nemmeno detto di no, e ormai quei sei punti esistono.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 5 · Una novità normativa accelera il progetto (positivo) ───────────── */
    {
      id: 'rule_tailwind',
      title: `Una novità normativa accelera il progetto`,
      w: 1,
      node: {
        when: `In giornata`,
        view: 'mail',
        where: `Email · rassegna di settore`,
        scene: (d) => {
          const pain = d.mp.has('I'), mm = d.mp.has('M');
          return [
            { n: `Apri la posta tra una cosa e l’altra. Tra le prime righe, un inoltro del tuo contatto senza commento.` },
            { mail: { from: `Il tuo contatto · {client}`, subj: `Fwd: Termini anticipati per tutto il settore` }, t: `Hai visto? Hanno anticipato di tre mesi la scadenza dell’obbligo per l’intero settore. Qui stanno già facendo i conti con quello che manca. Pensavo a voi.`, sfx: 'ping' },
            mm ? { think: `Il problema che abbiamo quantificato adesso ha una data. E non l’ho scelta io.` }
              : pain ? { think: `Finalmente una scadenza vera. Ma se non so quanto costa al cliente non arrivare in tempo, il vantaggio è tutto da dimostrare.` }
                : { think: `Una scadenza esterna. Posso farne un’urgenza solo se so cosa rischia l’azienda a non rispettarla, e non lo so ancora.` },
          ];
        },
        prompt: `La scadenza adesso è di qualcun altro. Come la usi?`,
        hint: `Una scadenza esterna è un regalo solo se la trasformi in un piano con date e costi. Cosa diventa questa notizia, per il cliente, in euro e in settimane?`,
        tip: `Un compelling event non si sfrutta con la pressione ma con la chiarezza: ricostruisci a ritroso con il cliente cosa serve per rispettare la data e metti il tuo progetto nel percorso. Una scadenza finta brucia fiducia; una vera la guadagna.`,
        choices: [
          ch('a', 3,
            `Grazie, è un segnale importante. Fissiamo mezz’ora con te e chi segue la conformità: ricostruiamo a ritroso cosa serve per la nuova data e dove entra il nostro piano.`,
            (d) => (d.mp.has('M')
              ? `Hai trasformato una notizia in un piano condiviso, con date a ritroso e un costo del ritardo che il cliente può misurare. L’urgenza ora è sua, non una tua pressione.`
              : `Hai trasformato una notizia in un piano con date a ritroso, ed è l’uso migliore della scadenza. Senza numeri condivisi il costo del ritardo resta una stima, ma la scadenza è vera: è una buona base per costruirli.`),
            (d) => (d.mp.has('I') || d.mp.has('M') ? { u: 9, v: 4, c: 4, t: 2 } : { u: 7, v: 3, c: 3, t: 2 }),
            {
              mp: ['Dp'],
              next: 'RET',
              say: `Grazie, è un segnale importante. Fissiamo mezz’ora con te e con chi segue la conformità: ricostruiamo a ritroso tutto quello che serve per rispettare la nuova data e vediamo dove si inserisce il nostro piano.`,
              react: [
                { w: 'cliente', a: `con un mezzo sorriso`, t: `Meno male che lo proponi tu. Qui tutti sanno che c’è un problema, nessuno ha un piano. Quando riusciamo a sentirci?` },
                { n: `Sul calendario compare una nuova riga. È la prima volta che la data della scadenza non è solo tua.` },
              ],
            }),
          ch('b', 1,
            `Ottimo, la scadenza gioca per noi. Aggiorno l’offerta con una nuova validità e ricordo a tutti che il prezzo è garantito solo fino a fine mese, così nessuno aspetta troppo.`,
            `Usare una scadenza altrui come leva commerciale fa suonare una buona notizia come un’opportunità per te. Il cliente sa che la data della normativa non è tua e quella del prezzo sì: la differenza si nota.`,
            { u: 6, t: -6, r: 4 },
            {
              next: 'RET',
              say: `Ottimo, la scadenza gioca per noi. Aggiorno subito l’offerta con una nuova validità e ricordo a tutti che il prezzo è garantito solo fino a fine mese.`,
              react: [
                { w: 'cliente', a: `dopo una pausa`, t: `Capisco. Però la scadenza è quella della norma, non quella del prezzo: preferirei non mischiare le due cose.` },
                { think: `L’ho detta come una minaccia. Non lo era, ma si è sentita così.` },
              ],
            }),
          ch('c', 2,
            `Grazie. Preparo una pagina su cosa cambia per voi e quanto costa non essere pronti alla nuova data. Se ti sembra utile, la giri tu internamente a chi di dovere.`,
            `Dare al cliente un documento da usare internamente aiuta il tuo contatto a vendere per te, e ancorare il costo del ritardo è proprio ciò che serve. Manca il passo successivo: un incontro in cui costruire il piano insieme.`,
            { u: 8, v: 6, t: 1 },
            {
              next: 'RET',
              say: `Grazie. Preparo una pagina su cosa cambia per voi e quanto costa non essere pronti alla nuova data. Se ti sembra utile, la giri tu internamente a chi di dovere.`,
              react: [
                { w: 'cliente', t: `Sì, mandamela. Così alla prossima riunione ho qualcosa di scritto da mettere sul tavolo.` },
                { think: `Se la gira internamente, il messaggio arriva con la sua voce e non con la mia. È meglio così.` },
              ],
            }),
          ch('d', 1,
            `Lo tengo presente, ma non vorrei sembrare opportunista. Lascio che siano loro a muoversi e intanto continuo come prima, senza forzare nulla e senza fare rumore.`,
            `Il rispetto per il cliente è giusto, ma qui la scadenza è un fatto, non una tua mossa: ignorarla significa lasciare che sia qualcun altro a trasformarla in un piano. Un’occasione sprecata con garbo.`,
            { u: 2, c: -2 },
            {
              next: 'RET',
              say: `Grazie per la segnalazione. Lo tengo presente, ma non vorrei sembrare opportunista: lascio che siate voi a muovervi e intanto continuo come prima, senza forzare nulla.`,
              react: [
                { n: `La giornata procede come sempre. La mail resta in archivio, con la stellina gialla accanto.` },
                { think: `Una scadenza così a qualcuno servirà. Spero tocchi a me, ma non ho fatto niente perché succeda.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 6 · Davide viene richiamato (dilemma di risorse) ───────────── */
    {
      id: 'davide_recalled',
      title: `Davide viene richiamato d’urgenza`,
      w: 1,
      if: (d) => moves(d) >= 2,
      node: {
        when: `Poco dopo`,
        view: 'walk',
        where: `Sede del cliente · corridoio`,
        scene: (d) => [
          { n: `Siete nel corridoio del secondo piano, a cinque minuti dalla sessione tecnica che hai costruito con cura. Davide guarda lo schermo del telefono e cambia espressione.` },
          { w: 'davide', a: `abbassa la voce`, t: `È Marta. Un altro cliente ha un fermo in produzione e mi vuole in remoto entro mezz’ora. Mi dispiace, lo so che tra poco tocca a noi.`, sfx: 'phone' },
          d.mp.has('Dc')
            ? { think: `I criteri tecnici li ho in mano: qualcosa posso reggere anche senza di lui. Ma non tutto.` }
            : { think: `Tre persone del cliente stanno prendendo posto in sala per sentire Davide. Senza di lui la parte tecnica non sta in piedi.` },
        ],
        prompt: `La sessione sta per cominciare e Davide deve andare. Cosa decidi?`,
        hint: `Il tempo del cliente è una risorsa tua quanto quella di Davide. Cosa puoi salvare, cosa conviene spostare e cosa va detto apertamente?`,
        tip: `Quando manca una risorsa chiave, ridisegna l’incontro con onestà invece di recitare una competenza che non c’è: il cliente perdona un rinvio spiegato bene, molto meno una risposta tecnica improvvisata.`,
        choices: [
          ch('a', 3,
            `Vai pure, l’emergenza viene prima. Trasformo la sessione in un incontro di allineamento, lo dico apertamente al cliente e fisso una data per la parte tecnica, con te.`,
            `Rinunci a una parte del programma ma non alla fiducia: il cliente capisce che le persone tecniche sono impegnate sul serio, e che la sessione che si farà sarà quella giusta. Perdi qualche giorno, non credibilità.`,
            { t: 4, c: 3, u: -2, r: -3 },
            {
              next: 'RET',
              say: `Vai pure, Davide, l’emergenza viene prima. Oggi trasformo la sessione in un incontro di allineamento, lo dico apertamente al cliente e fisso subito una data per la parte tecnica, con te al completo.`,
              react: [
                { w: 'davide', a: `già con il telefono all’orecchio`, t: `Grazie. Stasera ti mando una pagina con le domande che il loro team farà quasi di sicuro, così alla prossima ci arriviamo preparati. E scusami davvero.` },
                { n: `Lo guardi sparire verso l’ascensore. Poi respiri e ti prepari a entrare in sala senza il tuo asso.` },
              ],
            }),
          ch('b', 2,
            `Resto io con la sessione, ma cambio taglio: quaranta minuti di domande e criteri, niente demo. Prendo nota delle questioni tecniche e Davide risponde per iscritto appena è libero.`,
            (d) => (d.mp.has('Dc')
              ? `Cambi il formato invece di fingere che nulla sia cambiato, e i criteri che già conosci ti permettono di reggere la conversazione. Il lavoro di Davide arriva per iscritto: non è una demo, ma è un impegno chiaro.`
              : `Cambi il formato, ed è saggio. Ma non conosci ancora i criteri tecnici del cliente: le domande ti arrivano a freddo e la sessione rischia di diventare un elenco di cose a cui non sai rispondere.`),
            (d) => (d.mp.has('Dc') ? { t: 4, v: 3, c: 3, r: -3 } : { t: 1, r: 2 }),
            {
              next: 'RET',
              say: `Faccio io la sessione, ma cambio taglio: quaranta minuti di domande e di criteri, niente demo. Segno tutte le questioni tecniche e Davide vi risponde per iscritto appena è libero.`,
              react: (d) => [
                { n: `Entri in sala con il quaderno invece del portatile. Le tre persone del cliente si scambiano uno sguardo, poi aprono i loro appunti.` },
                d.mp.has('Dc')
                  ? { think: `Le domande sono quelle che mi aspettavo. A queste posso rispondere.` }
                  : { think: `Le domande sono più precise di quanto sperassi. Almeno la metà dovrò scriverla e portarla via.` },
              ],
            }),
          ch('c', 1,
            `Davide, resta ancora un’ora. Chiamo io Marta e le spiego che qui il cliente è critico e che il tuo intervento in questa sessione pesa più di quello dell’altro cliente.`,
            `Mettere il tuo interesse davanti a un fermo di produzione altrui non è una battaglia che vinci: Marta ha priorità che non vedi e Davide si trova tra due fuochi. Hai rischiato capitale interno per salvare un programma.`,
            { t: -3, c: -4, r: 4 },
            {
              next: 'RET',
              say: `Davide, resta ancora un’ora. Chiamo io Marta e le spiego che qui il cliente è critico e che il tuo intervento in questa sessione vale più di quello altrove.`,
              react: [
                { w: 'davide', a: `scuote la testa`, t: `Non mettermi in mezzo. Se Marta dice che devo andare, vado. Ti lascio le slide, il resto lo reggi tu.` },
                { n: `Resti con il telefono in mano mentre il corridoio si svuota. Tra tre minuti la sessione comincia comunque.` },
              ],
            }),
          ch('d', 0,
            `Faccio io la parte tecnica: ho visto la demo cento volte e me la cavo. Meglio non agitare il cliente con cambi di programma dell’ultimo minuto, che qui non servono.`,
            (d) => (d.mp.has('Dc')
              ? `Sostituirti a un esperto davanti a chi ne sa più di te è la scorciatoia che si paga alla prima domanda precisa. Conoscevi i criteri e ti salvi in parte, ma hai nascosto al cliente un cambio che avrebbe capito.`
              : `Sostituirti a un esperto davanti a chi ne sa più di te è la scorciatoia che si paga alla prima domanda precisa. Non conosci i criteri del cliente: hai nascosto un cambio che avrebbe capito e ora improvvisi sul punto in cui sono più esigenti.`),
            (d) => (d.mp.has('Dc') ? { t: -4, v: -2, r: 6 } : { t: -8, v: -4, c: -2, r: 10 }),
            {
              next: 'RET',
              say: `Faccio io la parte tecnica, Davide: ho visto la demo cento volte e me la cavo. Meglio non agitare il cliente con cambi di programma dell’ultimo minuto.`,
              react: [
                { n: `Entri in sala con il sorriso di chi sa il fatto suo. La terza domanda arriva dopo undici minuti, dal fondo del tavolo.` },
                { w: 'cliente', a: `con cortesia`, t: `Quindi i dati restano sui vostri sistemi o passano da un servizio esterno? Chiedo perché per noi è un punto fermo.` },
                { think: `Questa risposta non ce l’ho. E se ne è accorto prima di me.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 7 · Compare un decisore che non conoscevi ───────────── */
    {
      id: 'new_decider',
      title: `Compare un decisore che non conoscevi`,
      w: 2,
      if: (d) => !tender(d) && moves(d) >= 2,
      node: {
        when: `Più tardi`,
        view: 'meeting',
        where: `Sede del cliente · sala riunioni`,
        scene: (d) => {
          const dc = d.mp.has('Dc'), dp = d.mp.has('Dp');
          return [
            { n: `Siete in sala da venti minuti, il proiettore ronza e i bicchieri d’acqua sono ancora pieni. La porta si apre senza che nessuno abbia bussato.`, sfx: 'door' },
            { n: `Entra una persona che non hai mai visto. Si siede a capotavola senza aspettare che qualcuno la presenti.` },
            { w: 'cliente', a: `a disagio`, t: `Scusa, non ti avevo avvisato: si unisce a noi la responsabile della funzione che userà tutto questo. Ha l’ultima parola sui requisiti.` },
            { n: `La nuova arrivata apre un quaderno e ti guarda senza sorridere: “Ho letto la vostra proposta in treno. Mi dica perché dovrei cambiare qualcosa che funziona.”` },
            dc && dp ? { think: `Criteri e percorso li conosco: se lei è un passaggio che non avevo visto, posso rimetterla nel quadro senza ripartire da capo.` }
              : dc ? { think: `I criteri li conosco, ma nessuno mi aveva detto che nel processo ci fosse anche lei. Che altro non so?` }
                : { think: `Chi è? Cosa le importa? Tutto quello che ho preparato era per qualcun altro, e lei è l’unica che conta davvero.` },
          ];
        },
        prompt: `Ha l’ultima parola e non sa nulla di te. Come ti comporti?`,
        hint: `Chi non ti conosce non ha ancora un’opinione su di te, ma ne ha già una sul problema. Da dove cominci: dalle tue slide o dalle sue domande?`,
        tip: `Quando compare un decisore nuovo, riparti dalle sue domande, non dalle tue slide: fai emergere i suoi criteri, verifica con il tuo contatto il suo ruolo nel processo e aggiorna la mappa di chi decide cosa. Ignorarla per proseguire sul copione è il modo più rapido per perderla.`,
        choices: [
          ch('a', 3,
            `Mi fermo e le passo la parola: cosa dovrebbe essere vero perché il progetto abbia senso per lei? Adatto la sessione alle risposte, poi aggiorno la mappa di chi decide cosa.`,
            (d) => (d.mp.has('Dp')
              ? `Rimetti lei al centro invece di difendere il copione: i criteri che emergono sono i suoi, e li aggiungi a quelli che già avevi. Il percorso approvativo lo conoscevi, e ora sai che passa anche da lei.`
              : `Rimetti lei al centro, ed è la mossa giusta. Ma scopri solo adesso un pezzo del percorso approvativo che non avevi mappato: da qui in poi la tua mappa di chi decide cosa va riscritta.`),
            (d) => (d.mp.has('Dc') && d.mp.has('Dp') ? { t: 5, c: 6, r: -6 } : { t: 3, c: 4, r: -3 }),
            {
              mp: ['Dc'],
              next: 'RET',
              say: `Mi fermo un momento e le passo la parola, se mi permette: cosa dovrebbe essere vero perché questo progetto abbia senso dal suo punto di vista? Adatto il resto della sessione alle sue risposte. E dopo, con il mio contatto, aggiorniamo insieme la mappa di chi decide cosa.`,
              react: [
                { n: `Lei appoggia la penna sul quaderno. Per la prima volta alza gli occhi dal foglio.` },
                { n: `“Tre cose. La prima è che non voglio un altro sistema da gestire.”` },
                { w: 'cliente', a: `si rilassa visibilmente`, t: `Ecco, queste sono le domande che servivano. Prendi pure nota.` },
              ],
            }),
          ch('b', 1,
            `Proseguo con il materiale che ho preparato, per non perdere il filo: mi rivolgo anche a lei, con qualche slide in più sul nostro valore e sui risultati dei nostri clienti.`,
            (d) => (d.mp.has('Dc') && d.mp.has('Dp')
              ? `Continui il copione, e per chi ha l’ultima parola sembri qualcuno che non ascolta. Avevi gli elementi per adattarti e hai scelto di non farlo.`
              : `Continui il copione, e per chi ha l’ultima parola sembri qualcuno che non ascolta. Non conosci i suoi criteri e hai scelto di non scoprirli: le slide in più rispondono a domande che lei non ha fatto.`),
            (d) => (d.mp.has('Dc') && d.mp.has('Dp') ? { t: -2, c: -3, r: 3 } : { t: -5, c: -6, r: 8 }),
            {
              next: 'RET',
              say: `Proseguo con quello che ho preparato per non perdere il filo, ma mi rivolgo anche a lei: aggiungo qualche slide sul nostro valore e sui risultati dei nostri clienti.`,
              react: [
                { n: `Lei guarda le slide con la stessa espressione con cui guarderebbe un menù. A metà sala il proiettore va in risparmio energetico.` },
                { think: `Nessuno si alza per riaccenderlo. Brutto segno.` },
              ],
            }),
          ch('c', 2,
            `Le chiedo di raccontarmi il suo punto di vista, ma resto sul programma di oggi. Alla fine della riunione fisso con lei un incontro dedicato, per approfondire con calma.`,
            `Ascolti lei e non perdi il filo, ma il programma continua a girare intorno alle domande di qualcun altro. L’incontro dedicato è un buon rimedio, a patto che arrivi in fretta.`,
            { t: 2, c: 2, r: -1 },
            {
              next: 'RET',
              say: `Mi piacerebbe sentire anche il suo punto di vista, ma per rispetto del tempo di tutti resto sul programma di oggi. Alla fine della riunione fisso con lei un incontro dedicato per approfondire.`,
              react: [
                { n: `Lei annuisce due volte, in un modo che non significa niente. “Va bene. Mi mandi qualcosa prima, poi ne parliamo.”` },
                { think: `Ho un secondo appuntamento. Non ancora un criterio.` },
              ],
            }),
          ch('d', 0,
            `La saluto e le faccio notare che i criteri sono già stati concordati con chi segue il progetto per voi: preferirei non riaprire una discussione che avevamo già chiuso insieme.`,
            `Rivendicare un accordo preso con qualcun altro davanti a chi ha l’ultima parola è dire che il suo parere non conta. Il processo vero è quello che passa da lei, e hai appena scelto di non entrarci.`,
            (d) => (d.mp.has('Dc') && d.mp.has('Dp') ? { t: -6, c: -5, r: 7 } : { t: -10, c: -8, r: 12 }),
            {
              next: 'RET',
              say: `La saluto volentieri. Le faccio notare che i criteri sono già stati concordati con chi segue il progetto per voi, e preferirei non riaprire una discussione che avevamo già chiuso.`,
              react: [
                { n: `Il silenzio dura tre secondi. Poi lei chiude il quaderno.` },
                { n: `“Capisco. Ne riparlerò con i miei.”` },
                { w: 'cliente', a: `evita il tuo sguardo`, t: `Ti faccio sapere io, appena parlo con lei.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 8 · Una mail riservata arriva per errore (dilemma etico) ───────────── */
    {
      id: 'leaked_mail',
      title: `Una mail riservata arriva a te per errore`,
      w: 1,
      if: (d) => !tender(d) && moves(d) >= 3,
      node: {
        when: `Nel frattempo`,
        view: 'desk',
        where: `Email · posta in arrivo`,
        scene: (d) => {
          const dsc = Math.round(d.disc);
          const goal = dsc > 0
            ? `puntare a un ulteriore ribasso oltre ${ilPct(dsc)} già concesso da Nexora`
            : `puntare a un ribasso del 12% sul prezzo di Nexora`;
          return [
            { n: `Il portatile emette il solito suono di una nuova mail. Il mittente è la Direzione Acquisti di {client}, e tra i destinatari in copia c’è anche il tuo indirizzo: l’autocompletamento ha tradito qualcuno.`, sfx: 'ping' },
            { mail: { from: `Direzione Acquisti · {client}`, subj: `RISERVATO · Linea per il prossimo incontro` }, t: `Per il prossimo incontro: ${goal}. Il budget approvato però copre l’offerta per intero: lo sconto è una posizione negoziale, non un vincolo. Se non scendono, possiamo aspettare il prossimo esercizio. Non anticipare nulla al fornitore.` },
            d.m.trust >= 60
              ? { think: `Qui c’è chi si fida di me. Se un giorno scoprono che ho letto questa mail e ho scelto di usarla, che cosa penseranno di tutto il resto?` }
              : { think: `Una scorciatoia sul tavolo del prossimo incontro. Nessuno sa che l’ho letta, per ora.` },
          ];
        },
        prompt: `Hai letto tutto, ormai. Che cosa ne fai?`,
        hint: `Quello che sai non puoi più non saperlo. Puoi scegliere che cosa farne, e che cosa quella scelta racconta di te.`,
        tip: `Un’informazione riservata arrivata per errore non è un vantaggio negoziale: è un test di integrità. La mossa che regge nel tempo è segnalare l’errore al mittente e non usarne il contenuto: la reputazione di chi è affidabile vale più di qualsiasi punto di sconto.`,
        choices: [
          ch('a', 3,
            `Cancello la mail senza usare nulla di ciò che ho letto e scrivo al mittente che mi è arrivata per errore, così può rimediare. Poi tratto come se non l’avessi mai vista.`,
            `Rinunci a un vantaggio che avresti potuto sfruttare senza che nessuno lo sapesse, ed è proprio per questo che conta. Chi riceve una segnalazione così ricorda per anni con chi ha a che fare, e il prossimo incontro lo giochi alla pari, con le tue carte.`,
            { t: 5, c: 2, r: -3 },
            {
              integ: 6,
              next: 'RET',
              say: `Cancello la mail senza usarla e scrivo al mittente: “Mi è arrivata per errore una vostra comunicazione interna. L’ho cancellata e non ne farò alcun uso. Preferisco che lo sappiate da me.”`,
              react: [
                { n: `Premi Invio. Il messaggio parte e per qualche secondo ti sembra di aver fatto una sciocchezza.` },
                { mail: { from: `Direzione Acquisti · {client}`, subj: `Re: Messaggio inviato per errore` }, t: `Grazie per la segnalazione, e per la correttezza. Ci scusiamo per l’inconveniente. A presto, al prossimo incontro.` },
              ],
            }),
          ch('b', 0,
            `Tengo la mail e uso quello che dice: so che il budget copre l’offerta per intero, quindi al prossimo incontro non cedo sul prezzo e aspetto che siano loro a muoversi per primi.`,
            `Sai che il budget c’è e il tavolo sembra tuo, ma stai giocando con carte che non dovresti avere. Se emerge, il cliente non vedrà un negoziatore abile: vedrà qualcuno che ha approfittato di un suo errore, e a rischiare saranno il deal e la tua reputazione.`,
            { v: 4, c: 8, t: -3, r: 8 },
            {
              integ: -10,
              next: 'RET',
              say: `Tengo la mail e la uso: so che il budget copre l’offerta per intero, quindi al prossimo incontro non cedo sul prezzo e aspetto che siano loro a muoversi per primi.`,
              react: [
                { n: `Apri la proposta per il prossimo incontro e cominci a riscriverla: dove avresti ceduto, adesso tieni il punto. Ti senti più forte, e questo ti mette a disagio.` },
                { think: `È un vantaggio che non ho guadagnato. E ora è mio.` },
              ],
            }),
          ch('c', 2,
            `Cancello la mail e non ne parlo con nessuno: non è successo niente, e non voglio mettere in imbarazzo il mittente. Il prossimo incontro lo preparo come se non l’avessi letta.`,
            `Non usi l’informazione, ed è l’essenziale. Ma il mittente non sa di aver sbagliato indirizzo e potrebbe sbagliare ancora: una segnalazione sarebbe stata più pulita, e ti avrebbe fatto guadagnare qualcosa.`,
            { t: 1, r: 1 },
            {
              next: 'RET',
              say: `Cancello la mail e non ne parlo con nessuno: non è successo niente, e non voglio mettere in imbarazzo il mittente. Il prossimo incontro lo preparo come se non l’avessi letta.`,
              react: [
                { n: `La mail va nel cestino, poi anche negli eliminati. Resta quello che sai, e quello non si cancella.` },
                { think: `Al prossimo incontro tratterò fingendo di non sapere. Spero di riuscirci davvero.` },
              ],
            }),
          ch('d', 1,
            `La giro a Davide e a un paio di colleghi del team: voglio un parere su come impostare il prossimo incontro tenendo conto di quello che dice. Più teste ragionano meglio di una.`,
            `Chiedere un parere sembra prudente, ma intanto un’informazione riservata del cliente circola nella tua azienda. Se un giorno venisse fuori, non basterebbe dire che l’avevi solo condivisa.`,
            { c: 3, r: 5, t: -1 },
            {
              integ: -3,
              next: 'RET',
              say: `La giro a Davide e a un paio di colleghi del team: voglio un parere su come impostare il prossimo incontro tenendo conto di quello che dice. Più teste ragionano meglio di una.`,
              react: [
                { w: 'collega', a: `legge in silenzio`, t: `Mmh. Se fossi in te non la terrei in giro. È il tipo di cosa che torna fuori nel momento peggiore.` },
                { chat: { from: 'davide', app: 'Teams' }, t: `Io la cancellerei, davvero. Meglio non averla mai avuta.` },
              ],
            }),
        ],
      },
    },

    /* ───────────── 9 · La riunione salta all’ultimo minuto ───────────── */
    {
      id: 'meeting_moved',
      title: `La riunione salta all’ultimo minuto`,
      w: 2,
      if: (d) => !tender(d) && !boxed(d),
      node: {
        when: `Poco prima delle 10:00`,
        view: 'car',
        where: `In auto · parcheggio del cliente`,
        scene: (d) => [
          { n: `Hai parcheggiato con venti minuti d’anticipo. Il motore è spento, la cartellina con il materiale è sul sedile accanto e il sole entra obliquo dal parabrezza.` },
          chatC(`Scusa, salta tutto: il direttore è bloccato fino a venerdì e senza la sua presenza la riunione non ha senso. Ti richiamo io appena ho una nuova data.`, { sfx: 'ping' }),
          d.m.urgency >= 60 ? { think: `Venerdì. Il calendario di questo progetto ha pochissimo margine, e ogni giorno che passa costa più di quanto sembri.` }
            : d.m.control >= 50 ? { think: `Venerdì. Fastidioso, ma il piano ha un po’ di respiro: posso permettermi un giorno, non due settimane.` }
              : { think: `Venerdì, o lunedì, o mai: nessuno qui sembra avere fretta, e io non ho una data scritta da difendere.` },
        ],
        prompt: `Hai guidato fin qui per niente, ma la mattina è ancora tua. Cosa ne fai?`,
        hint: `Il tempo perso non si recupera, la mattina sì. Cosa chiedi prima di salutare, e a chi altro puoi parlare, già che sei qui?`,
        tip: `Il ritmo del deal lo proteggi tu: quando una riunione salta, ottieni una data prima di salutare, usa la finestra libera per vedere altre persone e rendi visibile il costo del rinvio. Il silenzio dopo un rinvio è già un rinvio ulteriore.`,
        choices: [
          ch('a', 3,
            `Nessun problema. Prima di chiudere, fissiamo ora una nuova data, anche provvisoria, e verifichiamo se qualcun altro può vedermi oggi: sono già qui e ne approfitto volentieri.`,
            (d) => (d.mp.has('Dp')
              ? `Trasformi un rinvio in due vantaggi: una data nuova e un incontro in più. Conoscendo il percorso sai chi altro vedere, e il tempo perso diventa tempo di lavoro.`
              : `Chiedi una data prima di salutare, ed è la mossa giusta. Non conoscendo bene il percorso approvativo, però, “qualcun altro” è un nome che ti manca: l’occasione rende meno di quanto potrebbe.`),
            (d) => (d.mp.has('Dp') ? { c: 7, u: 3, t: 3 } : { c: 5, u: 3, t: 2 }),
            {
              next: 'RET',
              say: `Nessun problema, capita. Prima di chiudere però fissiamo adesso una nuova data, anche provvisoria. E se c’è qualcuno che può vedermi oggi, sono già qui e ne approfitto volentieri.`,
              react: [
                { w: 'cliente', t: `Fatto: segno venerdì alle nove, in via provvisoria. E se vuoi passare, la responsabile del reparto operativo è libera tra le undici e mezzogiorno.` },
                { n: `Giri la chiave, ma non parti. Il quaderno si apre sul volante: hai ancora una mattina da riempire.` },
              ],
            }),
          ch('b', 1,
            `Va bene, fai con calma. Aspetto che tu mi dica quando il direttore è libero, senza insistere: non voglio sembrare pressante proprio adesso, dopo un rinvio così.`,
            `Aspettare in silenzio sembra educazione, ma ogni rinvio senza una data diventa il rinvio successivo. Hai lasciato il calendario a chi ha meno fretta di te.`,
            (d) => (d.m.urgency >= 60 ? { u: -6, c: -6, r: 6 } : { u: -4, c: -4, r: 4 }),
            {
              next: 'RET',
              say: `Va bene, fai con calma. Aspetto che tu mi dica quando il direttore è libero, senza insistere: non voglio sembrare pressante proprio adesso.`,
              react: [
                { n: `Il telefono resta muto fino a sera. Poi un messaggio: “Ti faccio sapere”.` },
                { think: `Senza una data, quel “ti faccio sapere” non ha scadenza.` },
              ],
            }),
          ch('c', 2,
            `Capisco. Sostituiamo la riunione con una call di mezz’ora oggi pomeriggio, solo con te, per non perdere il filo, e rivediamo il programma prima che arrivi il direttore.`,
            `Mantieni il ritmo con la persona che hai, ed è meglio di niente. Ma resti dentro la sua agenda: la data del direttore non l’hai ottenuta, e la call aggiunge conversazione, non decisione.`,
            { c: 3, u: 2, t: 1 },
            {
              next: 'RET',
              say: `Capisco, succede. Sostituiamo la riunione con una call di mezz’ora oggi pomeriggio, solo io e te, per non perdere il filo, e riguardiamo il programma prima che arrivi il direttore.`,
              react: [
                { w: 'cliente', t: `Va bene, oggi alle 16 ti chiamo io. Ma non so ancora quando riuscirò a portare il direttore a sedersi.` },
                { think: `Un modo di restare in contatto, non di andare avanti.` },
              ],
            }),
          ch('d', 0,
            `Colgo l’occasione: passo la mattina a rifinire l’offerta e la mando direttamente al direttore per mail, così mentre è bloccato può leggerla e decidere da solo.`,
            `Mandare un’offerta a chi non hai ancora incontrato, saltando chi ti ha portato fin qui, scavalca il passaggio che serve di più: capire che cosa il direttore vuole davvero. Una proposta spedita al vuoto è già un no in attesa di essere pronunciato.`,
            { t: -4, c: -8, r: 8 },
            {
              next: 'RET',
              say: `Colgo l’occasione: passo la mattina a rifinire l’offerta e la mando direttamente al direttore per mail, così mentre è bloccato può leggerla e decidere da solo.`,
              react: [
                { n: `Premi Invia alle 10:12. L’offerta sparisce nella casella di una persona che non ti conosce.` },
                chatC(`Ho visto che hai scritto direttamente al direttore. Avrei preferito un avviso: ora devo spiegare io perché l’hai fatto.`),
              ],
            }),
        ],
      },
    },

    /* ───────────── 10 · Una promessa su una funzione che non c’è ───────────── */
    {
      id: 'colleague_promise',
      title: `Una promessa su una funzione che non c’è`,
      w: 1,
      if: (d) => !tender(d) && moves(d) >= 3,
      node: {
        when: `Più tardi`,
        view: 'call',
        where: `Call · Teams`,
        scene: (d) => [
          { n: `La call sta per finire quando il tuo contatto aggiunge una frase che non ti aspettavi.` },
          { w: 'cliente', a: `con un sorriso`, t: `Grazie anche per il chiarimento di ieri con il vostro team. Se la funzione che mi è stata garantita arriva entro il prossimo trimestre, per me sul resto non ci sono problemi. Possiamo metterla nel contratto?` },
          { chat: { from: 'collega', app: 'Teams' }, t: `Ti devo parlare, subito dopo. Mi hanno chiesto una funzione che non c’è e ho risposto che ci stavamo lavorando. Non pensavo la prendessero alla lettera.`, sfx: 'ping' },
          d.mp.has('C')
            ? { think: `Il mio contatto è dalla mia parte. Se dico la verità adesso, ci rimane male ma ci crede. Se dico di sì, la verifica arriverà dopo la firma.` }
            : { think: `Non ho abbastanza credito per una correzione: se dico che non esiste, penseranno che il problema sono io. Ma un sì adesso è un debito con la scadenza.` },
        ],
        prompt: `Il cliente vuole una clausola su una promessa che non è tua. Cosa rispondi?`,
        hint: `Una promessa fatta da qualcuno del tuo team diventa tua nel momento in cui la senti. Cosa puoi garantire per iscritto, e cosa no?`,
        tip: `Una promessa fuori roadmap costa il triplo quando arriva la verifica. Correggi subito e con garbo, proponi ciò che esiste oggi e parla poi con chi l’ha fatta: l’obiettivo è risolvere, non processare. Mai una data in contratto che il prodotto non può sostenere.`,
        choices: [
          ch('a', 3,
            `Fermiamoci un momento, perché è giusto che tu lo sappia da me: quella funzione non è in programma e non posso garantirla per iscritto. Ti mostro cosa copre oggi la stessa esigenza.`,
            (d) => (d.mp.has('C')
              ? `Correggi subito, davanti al cliente, e la fiducia che avevi costruito regge il colpo: ammettere un limite rende più solido tutto il resto. Chi ha fatto la promessa avrà una conversazione da affrontare, ma tu hai evitato la clausola.`
              : `Dici la verità senza abbellirla, ed è l’unica strada che non finisce in una contestazione. Con meno fiducia alle spalle costa di più, ma è meglio una frenata oggi di una verifica dopo la firma.`),
            (d) => (d.mp.has('C') ? { t: 6, v: 2, c: 4, r: -8 } : { t: 2, c: 2, r: -4 }),
            {
              integ: 4,
              next: 'RET',
              say: `Fermiamoci un momento, perché è giusto che tu lo sappia da me: quella funzione non è in programma e non posso garantirla per iscritto. Ti mostro cosa copre oggi la stessa esigenza, e come.`,
              react: [
                { w: 'cliente', a: `dopo un silenzio`, t: `Capisco. Non è quello che speravo, ma preferisco saperlo adesso. Fammi vedere cosa c’è, poi decido.` },
                { n: `Nella chat di team compare soltanto: “Grazie”. Poi: “Scusami”.` },
              ],
            }),
          ch('b', 0,
            `Sì, scriviamolo: metto una clausola di impegno entro il prossimo trimestre. Poi in azienda sistemiamo i dettagli con il prodotto, l’importante adesso è non perdere la firma di questa settimana.`,
            `Il cliente sorride e la firma sembra più vicina, ma hai messo il tuo nome su una data che nessuno in azienda ha deciso. La verifica arriverà: a un audit, a un rinnovo, a una telefonata nel momento peggiore.`,
            { t: 4, v: 2, c: 2, r: 12 },
            {
              integ: -8,
              next: 'RET',
              say: `Sì, scriviamolo: metto una clausola di impegno entro il prossimo trimestre. Poi in azienda sistemiamo i dettagli con il prodotto, l’importante è non perdere la firma.`,
              react: [
                { w: 'cliente', a: `con un sorriso`, t: `Perfetto, era l’ultima cosa che mi serviva. Dico io all’ufficio legale di aggiungere la riga.` },
                { think: `Ho appena venduto una cosa che non so se esiste. E ho già cominciato a contare i giorni.` },
              ],
            }),
          ch('c', 2,
            `Ti ringrazio per la fiducia nel mio team. Prima di scrivere qualunque data verifico con il prodotto cosa è davvero in programma e ti rispondo in giornata, senza impegni a voce.`,
            `Prendi tempo senza mentire, ed è prudente. Ma non smentisci la promessa fatta: se la verifica dice di no, dovrai correggere un’aspettativa che nel frattempo si è rafforzata.`,
            (d) => (d.mp.has('C') ? { t: 2, c: 3, r: -3 } : { c: 2, r: -1 }),
            {
              next: 'RET',
              say: `Ti ringrazio per la fiducia nel mio team. Prima di scrivere qualunque data verifico con il prodotto cosa è davvero in programma, e ti rispondo in giornata. A voce non prendo impegni.`,
              react: [
                { w: 'cliente', t: `Perfetto, così mi aggiorni in giornata. Non c’è fretta, anche se io ormai ne parlavo come di una cosa fatta.` },
                { think: `Ne parla come di una cosa fatta. Ho poche ore per capire come disfarla senza che sembri un passo indietro.` },
              ],
            }),
          ch('d', 1,
            `Non lo mettiamo in contratto, ma ti assicuro che faremo il possibile per averla entro l’anno: la scriviamo come intenzione, senza date, in una lettera di accompagnamento.`,
            `Una lettera di intenti sembra un compromesso, ma resta una promessa: appena il cliente la citerà, dovrai spiegare perché “fare il possibile” non è bastato. Hai ridotto il rischio di una clausola, non quello di un’aspettativa.`,
            { t: 1, v: 1, c: 1, r: 6 },
            {
              integ: -3,
              next: 'RET',
              say: `Non lo mettiamo in contratto, ma ti assicuro che faremo il possibile per averla entro l’anno: la scriviamo come intenzione, senza date, in una lettera di accompagnamento.`,
              react: [
                { w: 'cliente', a: `annota`, t: `Una lettera di intenti va bene. La giro all’ufficio legale come allegato, così è tutto tracciato.` },
                { n: `Hai appena dato al cliente una carta che nessuno in azienda ha scritto. Sul quaderno aggiungi: parlare con chi ha fatto la promessa.` },
              ],
            }),
        ],
      },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
