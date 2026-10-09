/* CLOSER · shock generici del giorno di chiusura (valgono per tutti gli scenari).
   hit(d) = true: la trattativa è vulnerabile (negativi) oppure beneficia della fortuna (positivi).
   d è lo stato "ricostruito" al momento della firma: d.mp (Set), d.m, d.disc, d.flags, d.sc.
   Ogni protezione ha almeno una strada alternativa fondata sui meter (controllo, fiducia…): alcuni scenari non
   offrono mai certe lettere MEDDPICC (champion, Economic Buyer, criteri), e chi gioca bene deve potersi proteggere comunque.
   I testi funzionano con qualunque percorso di protezione e con i segnaposto di riserva ({contact} = “il tuo contatto”,
   {buyer} = “chi decide”): nessuna preposizione articolata davanti a un segnaposto, nessun aggettivo di genere. */
(function (g) {
  'use strict';
  const CL = g.CL;

  const has = (d, ...ks) => ks.every((k) => d.mp.has(k));
  /* gara pubblica: niente trattative di prezzo dell’ultimo minuto, niente champion, niente budget “anticipato” */
  const tender = (d) => !!(d.sc && /\bgara\b|pubblic/i.test(d.sc.sector || ''));
  const lepOf = (d) => (d.sc && d.sc.lep != null ? d.sc.lep : 15);

  CL.shocksGeneric = [
    /* ───────────── NEGATIVI ───────────── */
    {
      id: 'g_freeze',
      title: `Congelamento degli acquisti`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),   /* in una gara pubblica non si negozia con chi decide: lo shock non ha senso */
      /* protetto: contratto già nel circuito di firma e un costo del rinvio dimostrabile (urgenza o valore) */
      hit: (d) => !d.mp.has('P') || (d.m.urgency < 50 && d.m.value < 55),
      dp: -0.30,
      dpProt: -0.04,
      hitText: `Alle 9:05 {client} diffonde una circolare interna: ogni ordine non ancora emesso resta bloccato fino alla conferma dei budget. La tua pratica è in cima alla pila, ma ferma: nessuno ha una ragione abbastanza forte da chiedere un’eccezione, perché il costo di aspettare non è scritto da nessuna parte. “Ne riparliamo con il nuovo budget”, ti risponde una voce cortese.`,
      protText: `Alle 9:05 {client} diffonde una circolare interna: ogni ordine non ancora emesso resta bloccato. Ma il tuo contratto è già nel circuito di firma, e il costo di un rinvio ha una cifra precisa e una data. Basta una mail con quel numero per ottenere l’eccezione: sapevi che prima o poi sarebbe successo.`,
    },
    {
      id: 'g_buyer_change',
      title: `Cambio di chi firma`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),   /* in una gara pubblica non si negozia con chi decide: lo shock non ha senso */
      /* protetto: Economic Buyer e champion insieme, oppure la mappa del processo con un buon controllo */
      hit: (d) => !has(d, 'E', 'C') && !(d.mp.has('Dp') && d.m.control >= 60),
      dp: -0.32,
      dpProt: -0.03,
      hitText: `Un comunicato interno annuncia che il direttore finanziario di {client} lascia l’incarico con effetto immediato. Il successore arriva lunedì con una priorità dichiarata: rivedere ogni impegno pluriennale. Non lo hai mai incontrato, e chi conosce il progetto non ha il peso per difenderlo davanti a un volto nuovo.`,
      protText: `Un comunicato interno annuncia che il direttore finanziario di {client} lascia l’incarico con effetto immediato. Non è una sorpresa: il progetto non dipendeva da una sola persona e sai come si decide. In due giorni il business case è sul tavolo di chi arriva, presentato da chi lo difende davvero.`,
    },
    {
      id: 'g_champion_moves',
      title: `Cambio di incarico del tuo contatto`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),
      /* protetto: accesso a chi decide, oppure un controllo del processo tale da non dipendere da una sola persona */
      hit: (d) => !d.mp.has('E') && d.m.control < 65,
      dp: -0.27,
      dpProt: -0.02,
      hitText: `Una mail interna annuncia che {contact} passa a un’altra divisione dal primo del mese. Nessuno di chi decide ti conosce, e nessun altro ha seguito il progetto da vicino. Chi subentra non ha mai sentito il tuo nome e chiede di ripartire dai requisiti.`,
      protText: `Una mail interna annuncia che {contact} passa a un nuovo incarico e lascia il progetto. Prima che tu la legga, ti chiama: sapeva di dover passare la mano. Il progetto non dipendeva da una persona sola: perdi un alleato, non il filo del processo.`,
    },
    {
      id: 'g_price_cut',
      title: `Taglio del 35% sul prezzo di Vertex`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),
      /* protetto: concorrente mappato e numeri del cliente (metriche condivise o business case solido) */
      hit: (d) => !d.mp.has('Co') || (!d.mp.has('M') && d.m.value < 60),
      dp: -0.28,
      dpProt: -0.04,
      hitText: `Alle 17:40 ti arriva inoltrata, senza commento, un’offerta di Vertex Systems: stesso perimetro, prezzo ridotto del 35%, validità fino a sera. Non hai un confronto pronto, né numeri che mostrino perché la differenza di prezzo non è la differenza di costo. Ti ritrovi a rispondere con le parole contro una cifra.`,
      protText: `Alle 17:40 ti arriva inoltrata un’offerta di Vertex Systems: stesso perimetro, prezzo ridotto del 35%, validità fino a sera. Non è una sorpresa: sapevi che sarebbero scesi, e hai già in cartella il confronto sul costo totale, costruito sui numeri del cliente. Basta mezz’ora per mostrare che la differenza di prezzo è una differenza di perimetro.`,
    },
    {
      id: 'g_board_postpones',
      title: `Rinvio della delibera`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),   /* in una gara pubblica non si negozia con chi decide: lo shock non ha senso */
      hit: (d) => !has(d, 'Dp', 'P'),
      dp: -0.30,
      dpProt: -0.03,
      hitText: `Per un’urgenza di bilancio, {client} sposta di tre settimane la seduta in cui doveva deliberare. Avevi una data in testa, non un calendario: scopri adesso che senza quel voto il contratto non può nemmeno essere messo in firma. Il trimestre chiude e la pratica resta in un cassetto.`,
      protText: `Per un’urgenza di bilancio, {client} sposta di tre settimane la seduta in cui doveva deliberare. Conoscevi il percorso passo per passo e il contratto è già negoziato in ogni clausola: ti basta chiedere che il punto sia trattato in via d’urgenza, con la firma subordinata al solo voto. Una telefonata e una serata un po’ lunga, niente di più.`,
    },
    {
      id: 'g_signer_away',
      title: `Firmatario irraggiungibile`,
      kind: 'neg',
      w: 1,
      hit: (d) => !d.mp.has('P'),
      dp: -0.24,
      dpProt: -0.02,
      hitText: `L’ultimo giorno utile scopri che chi ha la firma è in ferie fino a lunedì, in un posto senza copertura. Nessuno ha mai chiesto chi potesse firmare al suo posto, e il portale di firma digitale richiede il suo certificato personale. Il telefono squilla a vuoto, la scadenza no.`,
      protText: `L’ultimo giorno utile chi ha la firma è in trasferta e non rientra prima di lunedì. Lo avevi messo in conto: nel piano di firma c’è un procuratore con delega scritta, e il documento è già sulla piattaforma. Il passaggio slitta di un’ora, non di una settimana.`,
    },
    {
      id: 'g_last_haggle',
      title: `Rinegoziazione all’ultima ora`,
      kind: 'neg',
      w: 1,
      if: (d) => !tender(d),
      /* vulnerabile: tavolo non tuo, oppure sconto già alto (in proporzione alla soglia LEP) senza averlo scambiato con nulla */
      hit: (d) => d.m.control < 50 || (d.disc >= 0.75 * lepOf(d) && !d.flags.giveGet),
      dp: -0.25,
      dpProt: -0.03,
      hitText: `Il giorno della firma gli Acquisti di {client} ti chiamano con un tono cordiale e una richiesta fredda: “Un piccolo gesto sul prezzo, il 5%, e chiudiamo oggi”. Il tavolo non è più tuo, e qualunque cosa risponderai diventerà la base della richiesta successiva. Prendi tempo, ma l’orologio non gioca dalla tua parte.`,
      protText: `Il giorno della firma gli Acquisti di {client} ti chiamano con un tono cordiale: “Un piccolo gesto sul prezzo, il 5%, e chiudiamo oggi”. Era nel copione, e hai già la risposta: un passo sul prezzo solo contro un impegno sulla durata. Dall’altra parte una pausa, poi una risata: ci provano sempre.`,
    },
    {
      id: 'g_compliance_audit',
      title: `Audit di compliance sul fornitore`,
      kind: 'neg',
      w: 1,
      /* protetto: criteri di ammissione noti, oppure iter di firma conosciuto e ben presidiato */
      hit: (d) => !d.mp.has('Dc') && !(d.mp.has('P') && d.m.control >= 55),
      dp: -0.26,
      dpProt: -0.03,
      hitText: `Il giorno prima della firma {client} avvia una verifica sui nuovi fornitori: questionario di sicurezza, certificazioni e coperture assicurative da consegnare in cinque giorni lavorativi. Nessuno ti aveva parlato di questo passaggio, e non c’è modo di saltarlo. Il contratto resta fermo, in attesa di un timbro che non sapevi di dover chiedere.`,
      protText: `Il giorno prima della firma {client} avvia una verifica sui nuovi fornitori. Conoscevi i criteri di ammissione perché li avevi chiesti da tempo, e il fascicolo con certificazioni e polizze è già pronto. Due ore dopo la pratica torna in firma; al telefono qualcuno aggiunge: “Siete i primi che rispondono senza chiederci una proroga”.`,
    },

    /* ───────────── POSITIVI (hit = ne approfitti; altrimenti l’occasione passa) ───────────── */
    {
      id: 'g_board_accelerates',
      title: `Accelerazione del budget`,
      kind: 'pos',
      w: 1,
      if: (d) => !tender(d),
      hit: (d) => d.mp.has('E') && d.m.urgency >= 45,
      dp: 0.12,
      dpProt: 0,
      hitText: `Alle 8:30 ti arriva un messaggio di tre righe da parte di {buyer}: la delibera sul budget è stata anticipata e si vuole chiudere con i fornitori entro la settimana. Hai l’accesso diretto a chi decide, un motivo per cui il progetto non può aspettare e un contratto che si legge in una sera. Per una volta, la corsa è dalla tua parte.`,
      protText: `{client} anticipa la delibera sul budget e chiede ai fornitori di stringere i tempi. Ma ti manca una strada diretta verso chi decide, oppure un motivo abbastanza forte per correre: la finestra si apre e la vedi passare. L’accelerazione va a chi è già pronto a firmare.`,
    },
    {
      id: 'g_second_department',
      title: `Interesse di un secondo reparto`,
      kind: 'pos',
      w: 1,
      if: (d) => !tender(d),
      /* un alleato interno che vende per te: il champion, oppure una fiducia solida unita a un forte controllo del processo */
      hit: (d) => d.m.trust >= 50 && (d.mp.has('C') || d.m.control >= 70),
      dp: 0.10,
      dpProt: 0,
      hitText: `In una riunione interna {contact} parla del progetto con tale convinzione che un altro responsabile chiede di aggiungere il proprio reparto: stesso contratto, un secondo budget. Non è merito di una mossa dell’ultima ora, ma di quello che succede quando qualcuno vende per te anche quando non ci sei.`,
      protText: `Un altro reparto di {client} sente parlare del progetto e chiede informazioni. Ma nessuno ha abbastanza peso, là dentro, per spiegare con precisione cosa fate e perché: i messaggi si perdono in due scambi di mail e la curiosità si spegne da sola. Una porta si è aperta, e nessuno l’ha tenuta ferma per te.`,
    },
    {
      id: 'g_rival_withdraws',
      title: `Ritiro del concorrente`,
      kind: 'pos',
      w: 1,
      hit: (d) => d.mp.has('Co'),
      dp: 0.10,
      dpProt: 0,
      hitText: `Vertex Systems comunica a {client} che non parteciperà alla fase finale: un riassetto interno ha bloccato l’offerta. Conoscevi i loro punti deboli e quella partita l’avevi già preparata, così la notizia ti trova con la proposta pronta a riempire il vuoto. Il cliente ha un confronto in meno da giustificare, e tu uno spazio in più.`,
      protText: `Vertex Systems si ritira dalla fase finale, ma la notizia ti arriva da terzi, due giorni dopo. Non avevi mai mappato chi altro sedesse al tavolo, e il vantaggio non lo hai potuto usare quando contava. Quando provi a farlo, il cliente è già andato avanti.`,
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
