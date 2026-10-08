/* CLOSER · banca testi forecast A: le sfide di Marta sui “buchi” del MEDDPICC (CL.FCBANK.gaps).
   Una voce per ciascuna lettera (E, Dp, P, M, C, I, Dc, Co) e per disc, cap, meters.
   Ogni voce ha: q (Marta), honest / bluff / vague (il giocatore, in prima persona) e react (Marta).
   Segnaposto: {client} {title} {who} {claim} {truth} {acv} {p} {nome}. Le battute sono solo parlato.
   Marta dà del tu, è equa: premia la franchezza, smonta il bluff con i dati del CRM, non accetta le atmosfere.
   Convenzione: nessun aggettivo o participio che concordi con il genere del giocatore o della persona citata ({who}). */
(function (g) {
  'use strict';
  const CL = (g.CL = g.CL || {});
  CL.FCBANK = CL.FCBANK || {};

  CL.FCBANK.gaps = {
    /* ─────────── E · Economic Buyer: chi firma e quando l’hai incontrato ─────────── */
    E: {
      q: [
        `Apro la scheda di {client}: nel campo Economic Buyer c’è un nome e nessuna data accanto. Chi firma {acv}, e quando ci hai parlato l’ultima volta?`,
        `Facciamo un test veloce. Descrivimi {who} in due righe: cosa ha a cuore, cosa ti ha detto di preciso, in quale giorno. Se ti viene da dire “so che…”, ci fermiamo qui.`,
        `Hai chiamato {claim}. A questo livello voglio vedere chi firma, non chi fa il tifo. Nome, ruolo e data dell’ultimo incontro con la persona che decide il budget.`,
        `{nome}, il tuo contatto ti dice che il budget c’è. Può essere vero. Ma un budget ha sempre un proprietario. Chi è, e che cosa ti ha detto l’ultima volta che avete parlato?`,
      ],
      honest: [
        `Hai ragione: con {who} non ho mai avuto un incontro. Ho dato fiducia a chi mi ha aperto la porta e il resto l’ho dato per scontato. La categoria giusta è {truth}.`,
        `Ammetto che qui ho girato intorno al problema. L’Economic Buyer di {client} è {who}, e con quella persona non ho mai parlato. Mi brucia, ma il foglio va corretto: {truth}. Mi serve una mano per arrivarci.`,
        `Sì, è un buco, e non è piacevole dirlo. Per {who} ho solo informazioni di seconda mano. Meglio scendere in categoria {truth} adesso che spiegarti a fine trimestre perché la chiamata non reggeva.`,
        `Non c’è stato nessun incontro, e lo sapevo mentre compilavo il foglio. Ho chiamato {claim} per ottimismo; il posto giusto è {truth}. Se mi apri un canale verso chi decide, mi muovo subito.`,
      ],
      bluff: [
        `Il decisore è coinvolto da tempo: ci siamo sentiti un paio di settimane fa e mi ha detto che il budget è suo e che il progetto rientra nelle sue priorità. Resta solo la parte formale.`,
        `Ci siamo visti a inizio trimestre, mezz’ora organizzata dal mio contatto. Il messaggio è stato chiaro: se i numeri tornano, si firma. Da allora il suo ufficio riceve i miei aggiornamenti.`,
        `Ho il suo via libera per mail, di una decina di giorni fa: proseguire con la procedura e tenere informato il suo ufficio. Te la inoltro appena ho il laptop davanti.`,
        `È già dentro: ha partecipato alla demo di due settimane fa e ha fatto domande sul prezzo, che per me è il segnale migliore. Sul sì finale non ho dubbi, è solo questione di calendario.`,
      ],
      vague: [
        `Il cliente è entusiasta e il progetto è sentito in tutta l’azienda. Si respira un clima molto favorevole e, quando sarà il momento, l’Economic Buyer firmerà senza problemi.`,
        `Il mio contatto mi dice che i vertici sono d’accordo. Mi fido: finora ha sempre mantenuto la parola data, e il progetto piace a tutti quelli che contano, a partire dall’alto.`,
        `Un nome preciso adesso non te lo so dare, ma tutti spingono nella stessa direzione e i tempi sono quelli giusti. Quando serve, il decisore ci sarà: l’atmosfera è questa.`,
      ],
      react: {
        honest: [
          `Grazie, una risposta così mi serve più di un campo riempito. Giovedì alle 10 ti chiamo e prepariamo tre righe per {who}: poi scrivo io, dal mio livello, per chiedere venti minuti. Un invito mio apre più porte di uno tuo.`,
          `Apprezzo che tu non giri intorno al problema. Facciamo una cosa pratica: lunedì mi mandi il business case in una pagina, martedì lo guardiamo insieme e giovedì chiamo io {who}. Se l’invito arriva da me, di solito l’appuntamento lo fissano in giornata.`,
          `Meno male che me lo dici adesso e non il giorno della chiusura. La categoria resta {truth} finché non c’è un incontro. Mercoledì alle 16 ci sentiamo: ti preparo un briefing di una pagina, con {who} al centro, e la mail per farti ricevere la firmo anch’io.`,
        ],
        bluffCaught: [
          `Ho la scheda aperta davanti. Sul campo Economic Buyer non c’è un incontro registrato, né una mail con quella persona in copia. Non ti faccio una scenata, ti dico cosa vedo. Ti sposto in categoria {truth}, e giovedì facciamo una deal review: io, te e il CRM aperto.`,
          `Ultima attività con il livello decisionale: nessuna. Tutto quello che ho su {client} passa dal tuo referente operativo. Non mi dispiace tanto la mancanza dell’incontro, quanto averlo dato per fatto. La chiamata scende in categoria {truth}, e una parte della settimana la dedichiamo a recuperare il buco.`,
          `Dammi una data e ti dico se torna: qui non ne trovo nessuna. Niente invito, niente nota di riunione, niente nel registro attività. Se l’incontro c’è stato, non è arrivato al CRM; se non c’è stato, abbiamo un problema più grosso. Per ora è {truth}, e ne parliamo venerdì in deal review.`,
        ],
        bluffPassed: [
          `Ok, ti prendo in parola. Ma nel CRM non c’è traccia dell’incontro, e a me serve la traccia. Entro mercoledì sera mi giri l’invito o la mail. Se non arriva, la chiamata la rivedo io, senza chiederti il permesso.`,
          `Va bene, per ora resta com’è. Però “ci siamo sentiti” senza una nota nel CRM, per me, vale zero. Venerdì mattina voglio vedere data, argomento e prossimo passo scritti nel campo. Altrimenti lunedì la scalo.`,
          `Mmm. Ti credo, ma lo segno: sul decisore ho solo la tua parola. Chiamo io {who} a fine settimana, giusto per presentarmi. Se mi risulta che non vi siete mai parlati, sai già come va a finire.`,
        ],
        vague: [
          `“Entusiasta” non è un campo del CRM, e “firmerà” non è una data. La chiamata scende di un gradino. Portami un nome, un giorno e una frase detta da chi decide, e ne riparliamo.`,
          `Mi fido di te, ma il CRM si fida solo dei fatti. Ti ho chiesto chi firma e quando ci hai parlato, e mi hai risposto con un’atmosfera. Scalo di una categoria; per risalire mi basta un incontro fissato, anche solo in agenda.`,
          `Sento tanti aggettivi e nessun nome. I vertici io non li incontro per sentito dire. Per adesso la chiamata va una riga più in basso: portami l’appuntamento e vediamo.`,
        ],
      },
    },

    /* ─────────── Dp · Decision Process: piano di chiusura condiviso, con le date ─────────── */
    Dp: {
      q: [
        `Fammi vedere il piano di chiusura per {client}: non il tuo, quello condiviso, con le date, che hanno letto e accettato. L’hai costruito con {who}, o esiste solo sul tuo laptop?`,
        `Quanti passaggi ci sono tra “ci piace” e la firma? Dimmi quali sono, chi li approva e che giorno cade ciascuno. Anche le date approssimative vanno bene, purché siano date.`,
        `{nome}, hai chiamato {claim}: vuol dire che sai a ritroso cosa deve succedere ogni settimana da qui alla firma. Partiamo dall’ultimo gradino: che giorno firmano, e chi deve aver approvato prima?`,
        `Una domanda da calendario. Il giorno in cui {client} firma è scritto da qualche parte, e da chi? Se è solo nella tua testa, per il CRM non è una data, è un desiderio.`,
      ],
      honest: [
        `Il piano condiviso non esiste. Ho in testa una sequenza di passaggi, ma non l’ho mai messa per iscritto con il cliente. La categoria giusta è {truth}, non {claim}. Mi aiuti a costruirlo?`,
        `Sulle date mi hai preso: abbiamo parlato di “fine trimestre”, ma nessun passaggio ha una scadenza concordata con {who}. Lo vedo solo adesso. Porto la chiamata in categoria {truth} finché non lo sistemo.`,
        `È un piano mio e solo mio: il cliente non l’ha visto e nessuno si è impegnato a rispettarlo. Un buco serio, e il CRM ha ragione: {truth}. Se mi dai mezz’ora per una bozza insieme, la porto al cliente questa settimana.`,
        `Il processo di approvazione l’ho dedotto, non verificato. Non so se dopo il sì operativo servano altri passaggi, né quanto durino. Meglio dirlo oggi: {truth}. Ti chiedo un confronto per capire cosa devo domandare.`,
      ],
      bluff: [
        `Il piano c’è ed è condiviso: abbiamo i passaggi fino alla firma e le date cadono tutte entro fine mese. Il cliente li ha visti, non ha obiezioni e sui tempi siamo allineati.`,
        `Abbiamo un calendario concordato: demo, approvazione interna, passaggio legale, firma. Il cliente lo conosce e lo rispetta, e sulle date non vedo slittamenti in arrivo.`,
        `Ho un piano condiviso in una pagina e lo abbiamo rivisto insieme mercoledì scorso. Mancano solo un paio di date da confermare, ma la sequenza è chiara a tutti.`,
        `I passaggi li conosco bene: me li ha spiegati il cliente uno per uno, con i tempi di ciascuno. Il percorso è lineare e non vedo ostacoli tra oggi e la firma, e tutto sta dentro il trimestre.`,
      ],
      vague: [
        `Il cliente è motivato e i tempi sono allineati, non vedo ostacoli. Il resto è un dettaglio operativo che si sistema da sé quando arriva il momento.`,
        `Abbiamo un buon rapporto e so più o meno come funziona l’approvazione. Non ho tutto scritto, ma il percorso è quello classico per aziende di questo tipo.`,
        `Mi hanno detto che per fine trimestre non ci sono problemi. Mi fido di loro: hanno sempre mantenuto le promesse, hanno un team organizzato che sa il fatto suo e nessuno ha dato segnali contrari.`,
      ],
      react: {
        honest: [
          `Dire “non esiste” fa risparmiare metà del lavoro. Costruiamolo insieme: domani alle 15 vieni da me con una pagina e le caselle vuote. Poi lo porti al cliente come bozza da correggere: i clienti correggono volentieri, e correggendo si impegnano.`,
          `Ok, grazie della franchezza. Questo si ripara in fretta. Venerdì metto a disposizione Davide per un’ora: ricostruite a ritroso il percorso, dalla firma a oggi, e ogni casella deve avere un nome e una data. Poi lo mandi al cliente.`,
          `Apprezzo che tu non abbia improvvisato un piano al volo. Lunedì mi porti i passaggi che conosci, io ti dico quali di solito mancano, e giovedì lo presenti al cliente. Se firmano il piano, siamo già a metà strada.`,
        ],
        bluffCaught: [
          `Ho aperto il campo Decision Process: due righe, nessuna data, nessun nome accanto ai passaggi. Un piano condiviso lascia tracce: una mail di conferma, un invito ricorrente, una pagina con l’intestazione del cliente. Qui non trovo niente. {client} va in categoria {truth}, e ci rivediamo in deal review per scriverlo davvero.`,
          `Se il cliente avesse visto un piano, nella scheda ci sarebbe l’allegato. Non c’è. Ti dico le cose come stanno: il piano è tuo, non vostro. Per me la chiamata è {truth}. Domani lo costruiamo insieme, con il calendario aperto.`,
          `Sul CRM l’ultima modifica al processo di approvazione risale a quattro settimane fa, e dice “da definire”. Non contesto che tu abbia in mente un percorso: contesto che l’abbia presentato come concordato. Per me è {truth}, e il piano lo rifacciamo in deal review.`,
        ],
        bluffPassed: [
          `Va bene, ti credo. Però nel CRM il processo risulta ancora “da definire”. Entro giovedì voglio il piano nella scheda, con una data e un nome per ogni passaggio. Se resta vuoto, la chiamata la rivedo io.`,
          `Ok, per ora tengo la chiamata. Mi fido, ma ho bisogno di vederlo: mandami la pagina del piano, anche una foto del foglio, entro mercoledì sera. Con le date, grazie.`,
          `Come dici tu. Metto una nota a calendario: venerdì apro la scheda e controllo se i passaggi hanno una data e un responsabile. Se sì, ti devo un caffè. Se no, parliamo.`,
        ],
        vague: [
          `“Più o meno” non è una data. Ti chiedo un fatto: che giorno cade il prossimo passaggio, e chi lo deve fare? Finché non lo scrivi, la chiamata scende di un gradino.`,
          `Il percorso classico non esiste: esiste quello di {client}, e di quello voglio nome e data del prossimo passaggio, non una media di mercato. Intanto la scalo di una categoria.`,
          `Le promesse non sono un piano. Ti basta una riga: “il tal giorno, la tal persona approva la tal cosa”. Quando me la porti, ne riparliamo.`,
        ],
      },
    },

    /* ─────────── P · Paper Process: legale, acquisti, procura di firma ─────────── */
    P: {
      q: [
        `Il contratto: chi l’ha letto, dalla parte di {client}? Dimmi se il loro legale ha visto le nostre condizioni, se Acquisti ha aperto la pratica e a nome di chi si firma. Tre risposte, mi bastano quelle.`,
        `{nome}, sul paper non accetto sorprese a fine trimestre. Quanti giorni servono a {client} per portare un contratto da “va bene” a “firmato”? E chi ha la procura per mettere la firma?`,
        `Nel campo Paper Process leggo “in corso”. In corso dove? In quale ufficio sta il contratto oggi, con quale nome sopra e da quanti giorni?`,
        `Per {acv} scommetto che ci sono Acquisti, il legale e magari una valutazione del fornitore. Con {who} avete già parlato di clausole e tempi?`,
      ],
      honest: [
        `Il contratto non è partito. Non so dire chi lo legge dalla parte del cliente né quanto ci mettano. È la parte che ho rimandato, perché mi sembrava burocrazia. Porto la chiamata in categoria {truth}.`,
        `Sulle clausole non ho ancora parlato con {who}. Pensavo di poter aprire il paper a ridosso della firma, e lo vedo adesso: è un errore. La categoria giusta è {truth}, e mi serve una mano a recuperare tempo.`,
        `Hai ragione, il paper è la mia zona cieca. Non so se serva una procura, né a nome di chi si firmi. La chiamata è {truth}. Ti chiedo di aiutarmi a coinvolgere il legale il prima possibile.`,
        `Ho venduto bene e preparato male la fine. Nessuna bozza è arrivata ai loro uffici, e non ho idea dei tempi di Acquisti. Meglio {truth} oggi che una chiamata alta ferma in coda.`,
      ],
      bluff: [
        `Il paper è avviato: il loro legale ha ricevuto la bozza e Acquisti ha aperto la pratica. Dovrebbero restituirci le osservazioni a breve, niente di anomalo, e finora nessun intoppo.`,
        `Abbiamo già parlato di contratto con il loro ufficio legale. I tempi sono quelli standard, un paio di settimane, e la procura per la firma non è un problema: ci stiamo dentro con margine.`,
        `Hanno chiesto il nostro contratto standard la settimana scorsa e lo abbiamo mandato. Mi hanno detto che il passaggio da Acquisti è questione di giorni. Non ho segnali di ritardo.`,
        `Ho sentito Acquisti e abbiamo concordato il percorso: ordine, fornitore in anagrafica, firma. Sono tre passaggi e ci sono i tempi per farli tutti, nessuno richiede più di pochi giorni.`,
      ],
      vague: [
        `La parte contrattuale è una formalità: con questo cliente non ci sono mai stati problemi. Quando arriviamo lì, si sistema in pochi giorni, e non vale la pena anticiparla ora.`,
        `Il loro legale è collaborativo, lo sento positivo. Non vedo nodi sul contratto, e comunque ce ne occuperemo a tempo debito. Per ora la priorità è tenere caldo il rapporto.`,
        `Il cliente mi ha assicurato che sul paper non ci saranno ritardi. Si fida di noi e noi di loro, e per ora basta così: chiedere di più adesso sarebbe forzare la mano.`,
      ],
      react: {
        honest: [
          `Meglio dirlo adesso: il paper è dove i trimestri vanno a morire. Martedì ti presento il nostro legale. Porta le richieste che ti hanno fatto finora, anche vaghe, e chiediamo il fast-track. Una settimana di attesa in meno vale quanto uno sconto.`,
          `Apprezzo la franchezza. Mando la scheda all’ufficio legale in giornata, e mercoledì mattina mi dai l’elenco delle clausole che il cliente ha già commentato. Se la bozza torna dal cliente entro venerdì, siamo ancora in tempo.`,
          `Ok. Di deal ne ho visti morire sulla firma più di quanti ne vorrei ricordare, quindi bene che tu lo sappia ora. Giovedì alle 11 sentiamo Giulia del Deal Desk e il legale insieme, e costruiamo la lista di cosa serve a {client} dal primo “sì” alla firma. Il nome di chi decide in Acquisti lo porti tu.`,
        ],
        bluffCaught: [
          `Il campo Paper dice “da avviare”, e l’ho ricontrollato mentre parlavi. Nessuna bozza inviata, nessuna richiesta registrata dall’ufficio legale del cliente. Non cerco colpevoli, cerco documenti. {client} passa in categoria {truth}, e martedì rivediamo il paper in deal review.`,
          `Ho il registro dei documenti inviati. Contratto a {client}: nessuno. Richiesta di anagrafica fornitore: nessuna. Se la pratica è aperta, lo è in un posto dove il CRM non arriva. Finché non lo vedo, la chiamata è {truth}.`,
          `Capisco la tentazione: a fine trimestre il paper sembra un dettaglio. Ma il registro è vuoto, senza bozza e senza una conferma di Acquisti. La categoria diventa {truth}, e in deal review costruiamo il percorso contrattuale con le date vere.`,
        ],
        bluffPassed: [
          `Va bene, vado sulla fiducia. Però nel CRM il paper è ancora vuoto: venerdì voglio la bozza inviata o una mail di Acquisti con la data di ricezione. Altrimenti lunedì rivedo la categoria.`,
          `Ok, resta così. Fammi un favore: inoltrami entro mercoledì la mail con cui hai mandato il contratto al loro legale. Se la trovo, sono la prima a ricredermi.`,
          `Va bene. Ma “è questione di giorni” lo sento ogni trimestre, ed è sempre l’ultimo giorno che si scopre che non lo era. Nome dell’ufficio e data di consegna entro giovedì, poi la tengo dov’è.`,
        ],
        vague: [
          `Una formalità, dici. Io ho visto formalità durare quattro settimane. Mi servono due cose: chi legge il contratto per {client} e da quale giorno. Intanto la scalo di un livello.`,
          `“A tempo debito” è l’ultima frase prima di una brutta fine trimestre. Nome dell’ufficio e data della prima bozza: questo mi serve, e non l’ho sentito. La chiamata scende di un gradino finché non lo scrivi.`,
          `Fiducia reciproca, bellissimo, ma non sostituisce una bozza spedita. Dammi un fatto, quello che vuoi: una mail, un nome, un numero di pratica. Senza, la metto una riga più in basso.`,
        ],
      },
    },

    /* ─────────── M · Metrics: il numero validato dal cliente ─────────── */
    M: {
      q: [
        `Il numero del business case di {client}: qual è, e chi del cliente l’ha confermato? Non voglio la nostra slide. Voglio che sia stato il cliente a dire “sì, questo è il nostro numero”.`,
        `{nome}, quanto vale per {client} risolvere il problema, in euro l’anno? Se la cifra l’ha detta il cliente, dimmi chi, quando e se è scritta da qualche parte.`,
        `Se un dirigente di {client} ti chiedesse “perché dovrei spendere {acv}?”, quale numero porteresti? E sarebbe un numero loro o un numero tuo?`,
        `Chi del cliente ha visto quel numero: {who}? Dimmi cosa ha corretto. Quando un cliente non cambia neanche una virgola, di solito non ha letto.`,
      ],
      honest: [
        `Il numero è nostro, non loro: l’ho costruito sulle medie di settore e nessuno l’ha confermato, tantomeno {who}. Non è validato, la categoria giusta è {truth}. Mi serve una mano per farlo validare da chi conta.`,
        `Ammetto che sui numeri ho fatto l’ottimista: il risparmio che racconto non l’ho mai discusso con il cliente, riga per riga. Per oggi è {truth}. Se mi dai un’ora con qualcuno di finanza, lo rifaccio con i dati loro.`,
        `Sì, lì ho un buco. Il business case esiste, ma l’abbiamo scritto noi, non il cliente. Finché non lo riconoscono come proprio, non vale. Porto la chiamata in categoria {truth} e vorrei un confronto su come farlo correggere a loro.`,
        `Non ho una cifra che il cliente abbia sottoscritto. Ho una stima, e per giorni l’ho trattata come un dato. È ora di smettere: {truth}. Dimmi come si porta il numero davanti a chi decide.`,
      ],
      bluff: [
        `Il numero è validato: il cliente stima un ritorno di circa il doppio dell’investimento nel primo anno, e lo ha confermato nella call di due settimane fa, davanti al suo team.`,
        `Il business case è condiviso e il cliente lo ha rivisto con noi. L’impatto sui costi lo hanno quantificato loro, io ho solo sistemato il formato. Hanno corretto un paio di voci e il totale è rimasto in piedi.`,
        `Sì, i numeri sono chiari: ho il loro foglio di calcolo e quello che mostriamo torna con la loro analisi interna. Il ritorno che presentiamo è perfino prudente rispetto alle loro stime.`,
        `La parte economica è risolta. Il cliente ha già fatto i suoi conti, il ritorno è chiaro anche per loro e sul valore non c’è nessuna discussione: il tema, ormai, è solo la data di firma.`,
      ],
      vague: [
        `Il valore per il cliente è evidente: tagliano i costi e migliorano il servizio. Non serve fare troppa matematica per capirlo, basta guardare cosa fanno oggi.`,
        `Il business case sta in piedi, non è quello il problema. Il cliente ha capito il ritorno e ha apprezzato molto l’analisi che gli abbiamo presentato.`,
        `I numeri girano bene. Non abbiamo ancora una cifra definitiva, ma il cliente capisce che il ritorno c’è e che è importante. Sul dettaglio ci arriviamo man mano che il progetto avanza.`,
      ],
      react: {
        honest: [
          `Un numero nostro è un’ipotesi, un numero loro è un impegno. Grazie di averlo detto. Mercoledì alle 14 sentiamo Davide e costruiamo un foglio con le loro voci di costo, non le nostre: lo porti al cliente e chiedi di correggerlo.`,
          `Apprezzo, e te lo dico perché è raro: quasi tutti difendono il proprio numero fino all’ultimo giorno. Lunedì mi mandi le tre voci di costo che il cliente ammette di avere, Giulia del Deal Desk ti prepara il modello, e giovedì torni con una cifra che hanno visto e toccato.`,
          `Bene, la verità prima di tutto. Un business case si valida in una sola riunione, se ci arrivi con le voci giuste. Venerdì mattina Davide e io ti prepariamo la bozza; tu ottieni dal cliente venti minuti con chi gestisce il budget.`,
        ],
        bluffCaught: [
          `Nella scheda il valore stimato ha come fonte “Nexora”. Non ho nessun documento con il timbro del cliente, nessun foglio ricevuto, nessun verbale. Non è un reato, ma non è nemmeno un numero validato. La trattativa passa in categoria {truth}, e in deal review ricostruiamo il caso partendo da loro.`,
          `Ho la cartella del deal aperta: l’ultimo file sul business case lo abbiamo creato noi, e il cliente non l’ha mai restituito con commenti. Se l’avessero rivisto, sarebbe tornato con almeno una correzione. La chiamata scende in categoria {truth}.`,
          `Mi hai detto “validato”. Nel CRM, campo Metrics, leggo “stima interna”. Sono due cose diverse, e la differenza è tutta qui. La categoria diventa {truth}; venerdì rifacciamo il conto insieme, ma col cliente.`,
        ],
        bluffPassed: [
          `Va bene, ti credo. Però non vedo il documento nel CRM. Caricami entro mercoledì il foglio o la mail in cui il cliente conferma il numero, e la chiamata resta dov’è.`,
          `Ok, per ora lascio com’è. Mi inquieta che il numero sia perfetto e che il cliente non abbia cambiato una virgola. Venerdì voglio il file originale, con le loro correzioni.`,
          `Prendo atto. Mercoledì sentirò io il referente del cliente, per chiedere se quel numero è anche il suo. Se risulta, tanto meglio. Se no, ci rivediamo giovedì.`,
        ],
        vague: [
          `“Evidente” a chi? Io vedo un campo Metrics con una cifra e nessuna firma accanto. Dammi un fatto: quale numero ha detto il cliente, a voce o per iscritto? Intanto la scalo di un gradino.`,
          `Non serve troppa matematica, serve una cifra detta da loro. Se è davvero quella giusta, ti basta una mail per dimostrarlo. Finché non c’è, la chiamata scende di una categoria.`,
          `Un ritorno che “c’è”, senza un numero, è un sentimento. Portami una cifra, una fonte e una data. Dopo, la categoria la rivalutiamo.`,
        ],
      },
    },

    /* ─────────── C · Champion: ha venduto internamente per te? l’hai testato? ─────────── */
    C: {
      q: [
        `Nel CRM il tuo champion è {who}. Dimmi una cosa che ha fatto per te quando tu non c’eri: una riunione, una slide, un “no” detto a qualcuno.`,
        `Un champion si vede quando non ci sei. Quando ha parlato di {client} con chi decide, senza di te? E come lo sai?`,
        `Il tuo champion ha mai passato un test? Una richiesta scomoda, un accesso, un’informazione che non poteva dare a chiunque. Cosa ti ha dato?`,
        `Simpatia e potere sono due cose diverse. Il tuo contatto ti risponde volentieri, bene. Ma ha l’orecchio di chi decide? Chi in {client} lo cercherebbe se avesse un dubbio sul progetto?`,
      ],
      honest: [
        `Ho un contatto cordiale, non un champion. Non ho mai verificato se parla di noi con chi decide: ho dato per vero quello che speravo. La categoria giusta è {truth}, e mi serve un modo per capire quanto pesa.`,
        `Ti dico com’è: {who} è cordiale e mi dà informazioni, ma non mi ha mai portato in una riunione che non avessi chiesto io. Come champion, per ora, non conta. Scendo in categoria {truth}.`,
        `Non ho testato niente. Se mi chiedi cosa ha fatto per noi in mia assenza, non ho un episodio da citare: ho preso la cordialità per sostegno. Va in categoria {truth}, e mi serve una prova vera.`,
        `Lo ammetto: ho un solo punto di contatto e non so che peso abbia. Non ho mai assistito a una sua difesa del progetto. Scrivo {truth} sul foglio, e mi serve una mano a cercare un secondo alleato.`,
      ],
      bluff: [
        `Il mio champion è solido: ha portato il progetto in direzione due volte e mi ha anticipato le obiezioni prima che arrivassero. Sta lavorando per noi, e si vede.`,
        `{who} vende per me ogni giorno. Mi ha detto che ha già parlato con chi decide e che la risposta è positiva, e me lo ha ripetuto più di una volta. Sul fronte interno non ho pensieri.`,
        `Il champion l’ho già messo alla prova: mi ha passato un documento interno riservato e ha organizzato un incontro con il suo responsabile. Non è un semplice contatto, è dalla nostra parte.`,
        `L’influenza del mio contatto è vera: decide chi entra nelle riunioni sul progetto, e finora ha sempre fatto il nostro nome. Quando serve, apre la porta senza che io debba chiedere.`,
      ],
      vague: [
        `Il mio contatto è molto coinvolto e ci tiene al progetto. Mi dice sempre che spinge dall’interno, e non ho motivo di dubitarne: ogni volta che ci sentiamo mi dà buone notizie.`,
        `Con il mio contatto c’è un ottimo rapporto: mi risponde in giornata e mi chiama prima delle riunioni importanti. Mi fido, ha sempre mantenuto la parola.`,
        `Il progetto lo sentono tutti, e il mio contatto ci crede più di me. Non devo dimostrare niente a nessuno: i segnali sono tutti positivi e nessuno ha mai sollevato dubbi.`,
      ],
      react: {
        honest: [
          `Grazie, questa distinzione la sbagliano in molti: una persona gentile non è un champion. Giovedì pomeriggio ti chiamo e prepariamo insieme una richiesta piccola ma scomoda per {who}. Se risponde, ci sta. Se rimanda, abbiamo imparato in una settimana quello che costa un trimestre.`,
          `Apprezzo che tu dica “contatto” e non “champion”. Ti aiuto a cercare il secondo: lunedì mi porti l’organigramma del progetto, scegliamo due persone con peso reale e ti scrivo io una presentazione per farti ricevere. E la prima prova deve costare qualcosa a chi la fa.`,
          `Meglio saperlo ora. Martedì alle 9 facciamo una telefonata di mezz’ora, io e te, e riscriviamo la mappa di chi conta davvero in {client}, nomi e ruoli. Mi servono due nomi in più oltre al tuo contatto, e il motivo per cui dovrebbero parlare con noi.`,
        ],
        bluffCaught: [
          `Apro il registro attività: tutte le email partono da te e arrivano al tuo contatto. Non c’è una riunione interna a cui abbia portato il progetto, né una richiesta di accesso fatta per tuo conto. Un champion lascia tracce, qui c’è solo una buona relazione. Metto la trattativa in categoria {truth}.`,
          `Mi hai raccontato di documenti riservati e di incontri organizzati. Nel CRM non c’è il documento, non c’è l’incontro, non c’è una nota. Può darsi che sia successo e che il CRM non lo sappia, ma per me conta quello che è scritto. La chiamata scende in categoria {truth}, e lunedì ne parliamo in deal review.`,
          `Tutto bene finché non guardo i dati. Il tuo contatto ha risposto a ogni tua mail, ma nessuna è stata inoltrata a un secondo nome interno. Un champion le inoltra. Il risultato è {truth}, e in deal review ci lavoriamo con calma.`,
        ],
        bluffPassed: [
          `Va bene, ti credo. Voglio però un fatto: entro giovedì mi dici cosa ha fatto per noi il tuo contatto quando non c’eri tu, con una data. Se non c’è, il champion lo cancello dal CRM.`,
          `Ok. Se dici che è un champion, mettilo alla prova entro venerdì: una richiesta scomoda, qualcosa che costa. Poi mi racconti com’è andata. Se tutto fila, ti chiederò scusa per il sospetto.`,
          `Per ora tengo la chiamata. Ma la parola “champion” la uso solo dopo un test, e nel CRM non vedo nessuna riga che lo dimostri. Martedì mi mandi una frase: cosa ha fatto per noi senza che tu lo chiedessi.`,
        ],
        vague: [
          `“Ci tiene” e “spinge dall’interno” sono impressioni. Dimmi un episodio: giorno, riunione, cosa ha detto e a chi. Se non lo trovi, la chiamata scende di un gradino.`,
          `Rispondere in giornata lo fa chiunque sia gentile. Un champion apre porte. Quale porta ti ha aperto, e quando? Mi basta una. Intanto la scalo di una categoria.`,
          `Segnali positivi, sì, ma di chi? Un champion è una persona con un nome, un peso e un’azione. Dammi un fatto e ne parliamo.`,
        ],
      },
    },

    /* ─────────── I · Identify Pain: il dolore e il costo di non agire ─────────── */
    I: {
      q: [
        `Cosa succede a {client} se non compra niente? Non tra un anno: da qui a fine trimestre. Dammi la conseguenza concreta, con un costo o con una scadenza.`,
        `Il dolore ce l’ha {who} o tutta l’azienda? Dimmi chi lo sente di più, da quanto tempo e quanto costa ogni mese.`,
        `Se togliamo il nostro nome dal progetto, resta un problema che qualcuno deve risolvere comunque? Oppure è un “sarebbe bello”? Lo capisci dal fatto che ci sia o meno un budget già stanziato.`,
        `{nome}, un progetto con un’urgenza vera ha una data. C’è una scadenza che spinge {client}: una norma, una verifica, un contratto in scadenza? O è solo un’idea buona che può aspettare?`,
      ],
      honest: [
        `Il problema esiste, ma non ho una conseguenza con un costo e una data: il cliente sta bene anche senza di noi. Per ora la chiamata è {truth}. Mi aiuteresti a trovare cosa rende urgente il progetto?`,
        `Non ho una risposta decente alla tua domanda su cosa succede se non comprano. Ho ascoltato il problema, non l’ho misurato. La categoria giusta è {truth}, e vorrei una mano a far emergere il costo.`,
        `Il dolore c’è, per {who}, ma l’ho scambiato per urgenza aziendale. Non è la stessa cosa, lo vedo adesso. Scendo in categoria {truth} finché non scopro cosa perde l’azienda se aspetta.`,
        `È un “sarebbe bello”, onestamente. L’urgenza l’ho gonfiata io, non il cliente. Tengo la chiamata in categoria {truth} e preparo domande migliori per la prossima conversazione, ma il tuo aiuto servirebbe.`,
      ],
      bluff: [
        `Per il cliente è un’emergenza: se non intervengono entro fine trimestre rischiano costi e fermi che non possono permettersi. Il prezzo di non agire è chiaro a tutti.`,
        `Il budget l’hanno già stanziato proprio perché non possono più aspettare. Il problema costa loro una cifra importante ogni mese e lo sanno bene. Ne parlano apertamente anche in direzione.`,
        `Il dolore è condiviso da più persone: chi lavora sul campo lo vive ogni giorno e anche la direzione ne è consapevole. Non è un progetto accessorio, per loro non è rinviabile.`,
        `C’è una scadenza vera: un contratto in scadenza e una verifica in arrivo. Rimandare adesso costerebbe molto più che firmare con noi, e lo hanno capito. Me l’hanno detto chiaramente.`,
      ],
      vague: [
        `Il cliente sente il problema in modo molto forte. È un tema che gli sta a cuore, ne parlano con passione e vedo che vogliono muoversi presto, senza troppi giri.`,
        `C’è consapevolezza che bisogna fare qualcosa. Non so dirti la cifra, ma ne parlano in ogni riunione e la direzione è sensibile al tema. Insomma, il terreno è pronto.`,
        `Il tema è prioritario per loro, lo capisco da come ne parlano. Non c’è bisogno di mettere i numeri per vedere che è importante: basta ascoltarli cinque minuti.`,
      ],
      react: {
        honest: [
          `Ottimo: chiamare le cose con il loro nome è l’inizio di un forecast sano. Giovedì alle 16 mi porti tre domande da fare a chi sente il problema. Le sistemiamo insieme, perché la domanda giusta fa emergere il costo senza che tu debba spingere.`,
          `Apprezzo. Aver ascoltato un problema senza averlo misurato è la fase uno, non c’è niente di cui vergognarsi. Per la fase due, lunedì ti metto in call con Davide: costruite il conto dei costi di non agire, voce per voce, e lo porti tu al cliente.`,
          `Mi piace che tu dica “sarebbe bello” invece di “è urgente”: il CRM è pieno di trattative belle e povero di trattative urgenti. Venerdì mattina chiamo io {who} per un quarto d’ora, senza vendere niente. Voglio sentire con le mie orecchie cosa non funziona.`,
        ],
        bluffCaught: [
          `Nel campo Identify Pain leggo una frase: “vogliono migliorare l’efficienza”. Nessun costo, nessuna scadenza, nessun nome di chi ci perde. Se fossero davvero in emergenza, in cartella avremmo almeno una mail con scritto “urgente”. Da oggi {client} è in categoria {truth}.`,
          `Guardiamo il CRM insieme. Budget stanziato: no. Data limite del cliente: nessuna. Persona che perde qualcosa se il progetto slitta: nessuna. Hai descritto un problema che il cliente non ha mai confermato. La chiamata scende in categoria {truth}, e rifacciamo la discovery in deal review.`,
          `Un cliente con una scadenza vera te la scrive, perché gli serve che tu la rispetti. Io qui non la trovo, né scritta né detta. Ti porto in categoria {truth}. Non ti giudico, ma da adesso chiedo la fonte di ogni “urgente”.`,
        ],
        bluffPassed: [
          `Ok, per ora ti credo. Ma l’urgenza che descrivi non è scritta da nessuna parte: entro mercoledì voglio una mail o una nota del cliente in cui compaia una scadenza o un costo. Poi la chiamata resta.`,
          `Va bene, vediamo. Se è grave come dici, il cliente te lo metterà per iscritto in due righe: chiedile entro giovedì. Se non te le dà, vuol dire che non è poi così grave.`,
          `Prendo nota. Ma quando c’è fretta vera si vede: telefonate fuori orario, riunioni anticipate, qualcuno che sollecita noi. Io non l’ho vista. Venerdì rimettiamo sul tavolo la questione, e se non è cambiato niente la categoria la cambio io.`,
        ],
        vague: [
          `Sentire non è misurare. Dimmi una conseguenza che si possa verificare: una cifra, una data, un nome di chi ci perde. Poi parliamo di priorità. Intanto la chiamata scende di un gradino.`,
          `Ne parlano in ogni riunione, ok. Quante di quelle riunioni hanno un budget in agenda? Voglio un fatto, non il clima. La scalo di una categoria finché non c’è.`,
          `Prioritario secondo chi? Il CRM non registra le priorità, registra costi e date. Portami un numero e rivedo la categoria.`,
        ],
      },
    },

    /* ─────────── Dc · Decision Criteria: i criteri con cui scelgono ─────────── */
    Dc: {
      q: [
        `Con quali criteri sceglierà {client}? Non il tuo elenco dei nostri punti di forza: i loro criteri, in ordine d’importanza, e chi li ha scritti.`,
        `Se ti chiedessi di compilare al posto di {client} la griglia con cui valuta noi e gli altri fornitori, quali voci metteresti e con che peso? E soprattutto: le hai viste scritte da loro?`,
        `Con {who} hai parlato dei criteri di scelta? Mi interessa cosa conta davvero per ciascuno: sicurezza, prezzo, tempi, referenze. Dimmi le prime due voci per persona.`,
        `Hai chiamato {claim}. Allora dimmi: se il prezzo fosse identico tra noi e gli altri, cosa farebbe pendere la scelta? Se la risposta è “la qualità”, ricominciamo.`,
      ],
      honest: [
        `Non conosco i criteri di scelta. So cosa mi piace del nostro prodotto, non cosa il cliente userà per decidere. La categoria giusta è {truth}. Mi serve una mano per fare la domanda a chi decide, cioè {who}, senza sembrare invadente.`,
        `Sui criteri ho fatto un errore da principiante: ho presentato quello che avevamo e ho dedotto che bastasse. La chiamata è {truth}, e vorrei capire con te come si chiede senza irrigidire il cliente.`,
        `La verità è che il criterio decisivo lo immagino. Non l’ho mai sentito dire dal cliente, e potrebbe essere diverso dal nostro punto di forza. Meglio {truth} ora. Un aiuto a fare la domanda giusta mi servirebbe.`,
        `Il prezzo lo conosco, il resto no. Ho un solo criterio confermato, e un trimestre non si regge su uno. Sul foglio scrivo {truth}; se ti va, rivediamo insieme come estrarre il resto.`,
      ],
      bluff: [
        `I criteri sono chiari e li abbiamo in mano: sicurezza, integrazione con i sistemi esistenti e tempi di messa in produzione. Su tutti e tre siamo davanti agli altri.`,
        `Il cliente mi ha mandato la griglia di valutazione e il nostro punteggio è il migliore. Abbiamo già discusso i pesi insieme, e sono favorevoli a noi. Manca solo l’ufficializzazione.`,
        `So esattamente cosa conta per loro: la reputazione del fornitore e la qualità dell’assistenza. Me l’hanno detto entrambi i referenti nello stesso incontro, e su entrambe siamo messi bene.`,
        `Abbiamo definito i criteri insieme al cliente, e quelli che contano sono quelli in cui siamo più forti. Mi hanno detto chiaramente che siamo in testa, e il prezzo non è in cima alla lista.`,
      ],
      vague: [
        `Credo che puntino alla soluzione più solida, e noi siamo la scelta naturale. Il prezzo non sembra il tema principale per loro: è l’impressione che ho da diverse conversazioni.`,
        `Il cliente apprezza la nostra proposta e ci ha dato buoni segnali. I criteri, alla fine, premiano chi li soddisfa meglio, e noi siamo messi bene.`,
        `Hanno un’idea chiara di quello che vogliono e ci siamo molto vicini. Su cosa guardano nello specifico non mi hanno ancora dato un elenco, ma si capisce.`,
      ],
      react: {
        honest: [
          `Bene. Si arriva ai criteri con una domanda sola, fatta nel momento giusto: “Come deciderete tra noi e le alternative?” Giovedì alle 11 la proviamo insieme: tu fai il cliente e io quella che non risponde. Poi la fai davvero, con {who}.`,
          `Grazie, è quello che volevo sapere. Il lavoro è da due: lunedì Davide ti prepara una lista dei criteri tecnici che di solito pesano, tu aggiungi quelli di business, e martedì li porti al cliente come domanda aperta. Se li correggono, hai la tua griglia.`,
          `Apprezzo la franchezza. Con i criteri conviene essere un po’ ingenui: “aiutatemi a capire come scegliete”. Venerdì mattina ti metto in contatto con un collega che ha già vinto contro lo stesso concorrente, e ascoltiamo quali criteri hanno pesato alla fine.`,
        ],
        bluffCaught: [
          `Il campo Decision Criteria è vuoto, e nella scheda non c’è nessun documento del cliente con una griglia di valutazione. Se ti avessero mandato un punteggio lo avresti caricato: è la prima cosa che si carica. Metto {client} in categoria {truth}, e ripartiamo da una domanda semplice al cliente.`,
          `Mi hai detto “i criteri sono chiari”. Io leggo tre parole nel campo e nessuna fonte. I criteri veri li scrive il cliente, non noi. La chiamata scende in categoria {truth} finché non li vedo, e in deal review prepariamo le domande per averli.`,
          `Aspetta, controllo. Richiesta di proposta del cliente: niente. Requisiti scritti: niente. Griglia di valutazione: niente. Hai descritto un mercato in cui vinciamo, non una decisione che il cliente ha preso. La chiamata è {truth}.`,
        ],
        bluffPassed: [
          `Ok, vado avanti sulla tua parola. Ma nella scheda non c’è la griglia: mandamela entro mercoledì, anche la foto di un foglio a mano. Se ti hanno dato un punteggio, sarà da qualche parte.`,
          `Va bene. Mi sembra molto bello, e quando una cosa è molto bella la guardo due volte. Entro giovedì mi scrivi i primi tre criteri con il nome di chi li ha detti. Poi confermo la chiamata.`,
          `Lo segno. Però “siamo in testa” non lo scrivo nel forecast finché non vedo un documento. Venerdì mattina voglio i criteri nel CRM, con la fonte. Se mancano, riapriamo la discussione.`,
        ],
        vague: [
          `“Credo”, “sembra”, “naturale”: tre parole che nel CRM non esistono. Dimmi un criterio che il cliente ha nominato, con il suo nome accanto. Per ora la chiamata scende di un gradino.`,
          `I criteri non si adattano a chi vince, li scrive il cliente prima di scegliere. Portami la voce che pesa di più nella loro valutazione e chi l’ha detta. Intanto la scalo di una categoria.`,
          `“Molto vicini” a cosa? Se non c’è un elenco, non c’è una misura. Un fatto, per favore: quale domanda ti ha fatto il cliente che rivela cosa conta per lui? Dopo, rivediamo la categoria.`,
        ],
      },
    },

    /* ─────────── Co · Competition: le alternative, compreso il non fare nulla ─────────── */
    Co: {
      q: [
        `Contro chi giochiamo davvero in {client}? Alla voce concorrenza, nel CRM, leggo: {who}. Basta? Dimmi cosa hanno già mostrato e quanto sono vicini.`,
        `Competizione: leggo “nessuna”. Nessuna è una parola rarissima, c’è sempre qualcuno, anche solo il foglio Excel che usano oggi. Qual è la loro alternativa e perché non basta più?`,
        `Vertex Systems ha già bussato alla porta di {client}? Sì o no, e se sì: quando e con quale offerta? Se non lo sai, qualcun altro sta parlando con il tuo cliente al posto tuo.`,
        `{nome}, il concorrente più pericoloso spesso non ha un nome: è il “rimandiamo”. L’hai studiato? Dimmi cosa risponde il cliente quando proponi una data di decisione.`,
      ],
      honest: [
        `Sulla concorrenza ho guardato poco. Non so con chi parlano né se hanno chiesto altre offerte. La categoria giusta è {truth}. Mi servirebbe una mano per farmi un’idea più precisa, e in fretta.`,
        `Ho ragionato come se fossimo l’unica opzione, e non lo siamo: c’è sempre lo status quo. Non ho verificato cosa succede se non comprano. La chiamata è {truth}, e vorrei un confronto con te su come mappare il resto.`,
        `Nel CRM, alla voce concorrenza, ho scritto: {who}. L’ho scritto a memoria, senza verificare niente con il cliente, e dei prezzi in campo non so nulla. È un buco: {truth}. Se mi aiuti a farmelo raccontare dal cliente, ti ringrazio in anticipo.`,
        `Il “non fare nulla” non l’ho mai analizzato, ed è l’avversario più duro. Ho sottovalutato l’inerzia. Correggo il foglio: {truth}. Ti chiedo aiuto per costruire un caso che superi l’inerzia.`,
      ],
      bluff: [
        `Siamo soli in gara. Abbiamo parlato con loro del mercato e non ci sono altri fornitori in valutazione. Il non fare nulla non è un’opzione, hanno già deciso di muoversi.`,
        `Vertex Systems è stata sentita mesi fa, ma il cliente non l’ha considerata adatta. Mi ha detto che per loro siamo l’unica soluzione che regge. Non hanno ripreso il discorso.`,
        `So con chi ci confrontiamo: due fornitori, uno già scartato e uno molto più caro. Me l’ha detto il cliente, e il nostro prezzo regge il confronto. Sul secondo non vedo rischi.`,
        `L’alternativa è tenere il sistema attuale, ma costerebbe loro di più, e lo sanno. Ho fatto io il confronto con il responsabile, e abbiamo anche i numeri. Il non fare nulla non regge.`,
      ],
      vague: [
        `Non mi risulta che ci siano altri in corsa, e comunque siamo ben posizionati. Il cliente sembra convinto di noi e non vedo minacce vere. Finora nessuno me ne ha parlato.`,
        `Siamo in una buona posizione rispetto agli altri. Il cliente ha già visto cosa facciamo meglio, quindi non mi preoccuperei troppo dei concorrenti. Il resto verrà da sé.`,
        `Ho la sensazione che la partita sia nostra. Sulle alternative non ho dati precisi, ma l’impressione è che ci vedano come la scelta naturale: il tono delle conversazioni è questo.`,
      ],
      react: {
        honest: [
          `Apprezzo, ed è la risposta più utile che potessi darmi: nessuno batte un concorrente che non conosce. Lunedì mi porti le tre domande che farai al cliente sull’alternativa, e le sistemiamo insieme. Davide ha un confronto già pronto contro i casi più comuni.`,
          `Ok, grazie. L’inerzia è l’avversario più sottovalutato, hai ragione. Mercoledì alle 15 ci sediamo e scriviamo insieme cosa costa a {client} aspettare un trimestre, con i numeri. Se ci riusciamo, il caso si regge da solo.`,
          `Bene. Chi ammette di non conoscere la concorrenza spesso è l’unico a cercarla davvero. Giovedì chiedo a un collega che ha chiuso contro lo stesso concorrente di raccontarti com’è andata, e tu mi riporti quello che scopri dal cliente.`,
        ],
        bluffCaught: [
          `Competition: campo vuoto. Nessun concorrente mappato, nessuna nota sulle alternative. Quando dici “siamo soli”, io leggo “non ho guardato”. Un deal da {acv} senza concorrenza è un deal non studiato. Ti riclassifico in categoria {truth}.`,
          `Il confronto con il responsabile, i numeri: non risultano. Nella scheda trovo zero allegati e nessuna riunione in cui si parli di alternative. Se il confronto l’hai fatto davvero, è fatto fuori dal CRM, e a me serve nel CRM. Per ora, {truth}.`,
          `Sai cosa mi preoccupa? Che “nessuna concorrenza” non è mai vera, e nel CRM non c’è un solo record sul tema. Se domani i concorrenti chiamassero il cliente, non sapresti cosa dire. La chiamata scende in categoria {truth}, e giovedì in deal review prepariamo la mappa delle alternative.`,
        ],
        bluffPassed: [
          `Va bene, ti credo. Però un trimestre senza un concorrente è un trimestre strano. Entro giovedì scrivimi nel CRM chi sono le alternative, incluso il non fare nulla, con una frase su ciascuna. Poi la chiamata resta dov’è.`,
          `Ok. Ho un dubbio: nessun deal importante è senza avversari. Venerdì mi mandi il nome di chi pensi sia il secondo in lista, e come fai a saperlo. Se non lo sai, lo chiediamo al cliente.`,
          `Mi hai convinta a metà. Faccio così: lascio la chiamata e mercoledì chiedo a Davide di sentire il cliente su cosa sta guardando. Se la mappa torna, mi scuso io.`,
        ],
        vague: [
          `“Non mi risulta” è una frase da testimone, non da responsabile del deal. Dammi un fatto: chi altro ha parlato con {client} negli ultimi due mesi? Intanto la chiamata scende di un gradino.`,
          `Se non ti preoccupi tu dei concorrenti, chi lo fa? Le impressioni sulla partita sono belle da raccontare, i nomi sono belli da scrivere. Ne basta uno solo, e ne riparliamo.`,
          `La sensazione che la partita sia nostra precede più sconfitte di quante pensi. Voglio un nome e un dato. Per ora la scalo di una categoria.`,
        ],
      },
    },

    /* ─────────── disc · sconto oltre soglia, senza contropartite ─────────── */
    disc: {
      q: [
        `Lo sconto che hai promesso a {client} è sopra la soglia che puoi dare in autonomia. Dimmi cosa ci hai preso in cambio: durata, volumi, pagamento, una referenza. Una cosa sola, ma concreta.`,
        `Ho davanti la scheda di prezzo: {acv} netti, con uno sconto che pesa sul margine. Ogni punto che regaliamo non torna indietro. Che cosa ha concesso il cliente in cambio?`,
        `{nome}, uno sconto fuori soglia si può fare, a una condizione: c’è una contropartita scritta. Qual è? Se la risposta è “il rapporto di fiducia”, passiamo oltre e ne parliamo con Giulia.`,
        `Hai chiamato {claim}, e va bene. Ma il prezzo che porti a quella chiamata l’hai negoziato o l’hai regalato? Dimmi cosa ha dovuto concedere il cliente per ottenerlo.`,
      ],
      honest: [
        `Lo sconto l’ho dato per far chiudere in fretta, senza chiedere niente in cambio. Lo vedo adesso: ho tolto margine e non ho comprato nulla. Riapro il prezzo con Giulia, se mi aiuti a rientrare nella soglia.`,
        `Hai ragione: ho anticipato il prezzo prima di capire cosa potevamo ottenere. Nessuna durata più lunga, nessun anticipo di pagamento. La categoria giusta è {truth}, e vorrei sistemarlo con il Deal Desk.`,
        `È un mio errore: ho confuso lo sconto con la trattativa. Il cliente ha chiesto, io ho detto sì. Meglio ammetterlo adesso e ripartire con una contropartita vera. La chiamata scende in categoria {truth}.`,
        `Ho ceduto per paura di perdere il contratto, e concordo che non è una buona ragione. Se mi aiuti a riscrivere l’offerta con uno scambio vero, la riporto indietro questa settimana. La chiamata è {truth}.`,
      ],
      bluff: [
        `Lo sconto è legato a un contratto triennale: il cliente si è impegnato a firmare per tre anni. In cambio abbiamo concordato il prezzo che vedi, e lo hanno detto chiaramente in riunione.`,
        `Ho già sentito Giulia del Deal Desk, e mi ha detto che si può fare perché il cliente anticipa il pagamento. Manca solo la conferma formale, che arriva a giorni.`,
        `È condizionato: c’è un volume garantito e una referenza pubblica, e il cliente ha già dato l’ok di principio. È tutto scritto nell’offerta che ho mandato.`,
        `È uno scambio equilibrato: loro firmano entro il trimestre, noi diamo il prezzo. Il cliente lo ha capito, e il margine complessivo regge. Ho fatto i conti prima di dire sì.`,
      ],
      vague: [
        `Per questo cliente è uno sconto normale, in linea con quello che si fa sul mercato. Non crea problemi e non vedo perché dovremmo farne un caso.`,
        `Era necessario per tenere vivo il rapporto, e il cliente l’ha apprezzato molto. Parliamo di un cliente importante, sono sconti che si fanno: non credo ci sia da preoccuparsi.`,
        `Lo sconto sblocca la decisione, e questo è quello che conta. I dettagli li sistemiamo dopo, quando il cliente avrà dato il via libera, senza perdere tempo ora.`,
      ],
      react: {
        honest: [
          `Grazie. Il margine regalato è il più difficile da recuperare, quindi meglio saperlo prima. Domani mattina alle 9 chiamo Giulia del Deal Desk: tu ci porti le condizioni che puoi ottenere dal cliente, e rifacciamo l’offerta con uno scambio vero.`,
          `Apprezzo il tono. Facciamo così: mi mandi entro mercoledì le condizioni attuali del prezzo, Giulia le guarda e ti propone tre contropartite realistiche. Poi scegli quale portare al cliente.`,
          `Bene che tu lo dica ora. Fino a giovedì nessuna conversazione sul prezzo con il cliente. Giovedì alle 10 ci sono io, c’è Giulia, e studiamo cosa chiedere in cambio dello sconto.`,
        ],
        bluffCaught: [
          `Ho aperto la richiesta di prezzo: nessun accordo pluriennale registrato, nessuna condizione di pagamento, nessun volume garantito. Lo sconto è nudo. Giulia del Deal Desk non ha ricevuto niente da te. La categoria diventa {truth}, e prima di parlare di nuovo di prezzo passi da lei.`,
          `Capisco la tentazione di raccontare la contropartita prima di averla. Ma il Deal Desk non risulta coinvolto, e senza di loro lo sconto non è approvato. Il cliente intanto lo aspetta. Metto {client} in categoria {truth}, e mercoledì sistemiamo insieme l’offerta.`,
          `Mi hai descritto uno scambio: sul foglio prezzi vedo solo lo sconto. Dov’è l’altra metà? Finché non c’è, il forecast con questo prezzo non regge. La chiamata scende in categoria {truth}, e ne parliamo giovedì in deal review.`,
        ],
        bluffPassed: [
          `Ok, ti credo. Però nell’offerta non vedo le condizioni: entro mercoledì voglio il documento con lo sconto e, accanto, quello che il cliente ha concesso. Se non c’è, il prezzo non esce.`,
          `Va bene, per ora lascio. Giulia ti scrive domani per verificare i dettagli dell’accordo: rispondile entro sera con le carte. Se salta fuori un “non l’ho ancora formalizzato”, ne riparliamo.`,
          `Prendo nota. Non mi convince che lo sconto sia già scritto e la contropartita ancora a voce. Venerdì mattina li voglio sulla stessa pagina. Intanto tengo la chiamata.`,
        ],
        vague: [
          `“In linea con il mercato” non risponde alla domanda. La domanda è: cosa ci ha dato il cliente in cambio? Dimmi una cosa che posso indicare sul contratto. Intanto la scalo di un gradino.`,
          `Un cliente che apprezza uno sconto lo apprezza anche regalato. Voglio sapere cosa hai ottenuto: un fatto, scritto. La chiamata scende di una categoria finché non c’è.`,
          `I dettagli sono il posto dove sta il margine. Uno sconto senza contropartita non si sistema dopo: si perde per sempre. Dammi un fatto e rivedo la categoria.`,
        ],
      },
    },

    /* ─────────── cap · un tetto strutturale tiene bassa la probabilità ─────────── */
    cap: {
      q: [
        `Nel CRM su {client} c’è un tetto: un blocco che tiene la probabilità sotto una soglia, qualunque cosa faccia il resto. Sai qual è? E soprattutto: cosa fai, concretamente, per toglierlo?`,
        `Una cosa mi dà fastidio. La scheda dice {p}, ma tu hai chiamato {claim}. Qualcosa, in questo deal, blocca la probabilità. Dimmi tu cos’è, prima che lo dica io.`,
        `{nome}, ci sono trattative dove tutto sembra a posto tranne una cosa, e quella cosa decide. In {client} qual è? Se non la nomini tu, la nomina il cliente il giorno della firma.`,
        `Un errore grave non rientra con la simpatia. C’è qualcosa che hai detto, promesso o dato per scontato a {client}, e che ora ti si ritorce contro? Se sì, quando lo sistemi e con chi?`,
      ],
      honest: [
        `Lo so qual è, e per questo la chiamata non regge. Finché non lo tolgo, la probabilità resta sotto quel tetto anche se il resto va bene. La categoria giusta è {truth}. Mi serve una mano per sbloccarlo.`,
        `Ho un blocco serio e ho provato a non guardarlo. Non si risolve con l’ottimismo: la chiamata scende in categoria {truth}. Se mi dai un’ora con chi può aiutarmi a rimuoverlo, la prossima settimana la situazione è diversa.`,
        `Hai ragione, c’è un problema strutturale e l’ho minimizzato. Che sia un errore mio o di percorso, non è risolto. Preferisco {truth} adesso a una chiamata più alta che salta. Dimmi come lo affronto e da chi comincio.`,
        `Non ho scuse: conosco il problema che ci blocca e l’ho lasciato nelle note invece di affrontarlo. La chiamata va in categoria {truth}. Chiedo supporto per toglierlo prima della chiusura.`,
      ],
      bluff: [
        `Non vedo un vero blocco: è una questione di tempo, il cliente è allineato e quel punto si risolve in pochi giorni. Ne abbiamo già riparlato, lo tengo sotto controllo.`,
        `Il problema di cui parli è già risolto: ne abbiamo parlato con il cliente e ha confermato che non è più un ostacolo. È il CRM a non essere aggiornato, lo sistemo oggi.`,
        `È solo un passaggio formale. Il punto critico è stato chiarito nell’ultima riunione e il cliente è tornato sulla sua posizione, quindi la probabilità reale è più alta di quella a sistema.`,
        `Quel limite è superato: abbiamo trovato un accordo e il cliente non lo contesta più. Ci sono ancora un paio di cose da scrivere, ma la sostanza è chiusa e il cliente è d’accordo.`,
      ],
      vague: [
        `Non mi preoccupa: è una cosa che si sistema strada facendo. Il cliente è collaborativo, ne abbiamo parlato con serenità e non vedo rischi seri all’orizzonte.`,
        `Sul punto che intendi abbiamo un confronto in corso. Si risolve, non è la prima volta che capita con un cliente così. Mi fido di come andrà a finire.`,
        `Non c’è un vero ostacolo, solo qualche dettaglio da chiarire. Appena il cliente si sblocca sul resto, vedrai che tutto torna: serve solo un po’ di pazienza.`,
      ],
      react: {
        honest: [
          `Grazie. Un tetto nominato è mezzo tetto tolto. Giovedì alle 15 ci sediamo in tre, tu, io e Davide, e scriviamo per ogni ostacolo chi fa cosa entro quando. Se serve un livello più alto, la chiamata la faccio io.`,
          `Chi nomina il problema ha già fatto metà del lavoro. Domani sera ti mando tre nomi di colleghi che hanno risolto blocchi simili. Scegline uno, parlaci entro venerdì e dimmi cosa ti suggerisce.`,
          `Va bene così. Il tetto è un’informazione, non una condanna. Lunedì alle 9 parliamo con Giulia e con il legale, se serve, e vediamo se il blocco si toglie con una clausola o con una persona. Vieni con le domande pronte.`,
        ],
        bluffCaught: [
          `Ti rispondo con i dati: il blocco risulta ancora attivo nel CRM, e non c’è nessuna nota di superamento. Se lo avessi risolto con il cliente, avrebbe lasciato una mail o un verbale. Il tetto resta, la probabilità è ferma al {p}. Il risultato è {truth}, e domani lo affrontiamo.`,
          `Dire “è risolto” non lo risolve. Nel CRM il vincolo è attivo e il campo non viene toccato da settimane. Finché c’è, la probabilità non sale oltre il {p}. Metto {client} in categoria {truth}, e in deal review rimettiamo mano al problema con chi può aiutarti.`,
          `Capisco che sia più comodo chiamarlo “formale”. Ma nella scheda il blocco è marcato come strutturale, e niente indica che sia stato superato. Non ti sto rimproverando, ti dico cosa vedo: categoria {truth} da oggi, finché non c’è una prova.`,
        ],
        bluffPassed: [
          `Va bene, ti credo. Voglio però la prova che si è sbloccato: una mail, una nota, qualcosa del cliente. Mandamela entro mercoledì. Fino ad allora tengo la chiamata, ma a matita.`,
          `Ok, per ora resta. Però un tetto strutturale che sparisce in una riunione mi sembra troppo comodo: venerdì ti chiedo di mostrarmi come è cambiato il campo nel CRM e cosa c’è scritto.`,
          `Prendo nota e lascio com’è. Metto una scadenza: giovedì il blocco o è tolto o è scritto come tolto. Se a quella data non troviamo niente, la chiamata scende senza discussione.`,
        ],
        vague: [
          `“Strada facendo” è come si perdono i trimestri. Il blocco ha un nome e voglio sentirtelo dire: qual è, e chi lo può togliere? Fino ad allora, la chiamata scende di un gradino.`,
          `Un confronto in corso non è un fatto. Voglio sapere quando è stato l’ultimo e quando è il prossimo, con chi. Dammi una data e vediamo.`,
          `“Appena si sblocca” è un’ipotesi, non un piano. Dimmi di quale tetto stiamo parlando e cosa succede se non si toglie. Per adesso la scalo di una categoria.`,
        ],
      },
    },

    /* ─────────── meters · il cruscotto (fiducia, valore, urgenza, controllo) è basso ─────────── */
    meters: {
      q: [
        `Il MEDDPICC di {client} sembra pieno, ma guardo i quattro numeri del cruscotto: fiducia, valore, urgenza, controllo. Qualcuno è basso. Le due cose insieme non mi tornano: mi spieghi come stanno in piedi?`,
        `Caselle spuntate e deal sano non sono la stessa cosa. Su {client} le caselle ci sono, ma il cliente ti dà poca fiducia, vede poco valore o non ha fretta. Qual è il numero più debole e cosa fai nei prossimi giorni?`,
        `{nome}, ti faccio una domanda semplice. Se domani {client} dovesse decidere con la pancia e non con la scheda, chi voterebbe per noi? I miei indicatori dicono che non è del tutto chiaro.`,
        `La scheda è bella, i segnali no. Uno dei quattro indicatori, tra fiducia, valore, urgenza e controllo, è sotto il livello che serve per {claim}. Quale? E qual è la tua mossa per rialzarlo entro venerdì?`,
      ],
      honest: [
        `Hai ragione, le lettere sono piene ma il quadro no: la fiducia non è piena e il valore non è chiaro a tutti. Ho spuntato le caselle senza verificare il clima. La categoria giusta è {truth}; mi aiuti a capire dove perdiamo terreno?`,
        `Ammetto che ho riempito il MEDDPICC per completezza, non per verità. Nei fatti il cliente non ha fretta e io non guido il processo. Il foglio va corretto: {truth}. Mi aiuteresti a rimettere in ordine le priorità?`,
        `I numeri del cruscotto sono sinceri e io non li guardavo. L’urgenza è bassa e il controllo pure: ci sono lettere piene ma poche azioni. Siamo in categoria {truth}, e mi serve una mano per riprendere il controllo.`,
        `Sì, c’è una distanza tra scheda e realtà. Il cliente mi parla volentieri ma non mi fa decidere niente. La categoria {truth} è più onesta. Vorrei capire con te quale leva toccare per prima.`,
      ],
      bluff: [
        `I numeri sono migliori di come appaiono: il cruscotto non cattura gli ultimi due incontri, che sono andati molto bene. Il cliente ha mostrato fiducia e un interesse concreto.`,
        `Sono segnali di un momento, non di una tendenza. Il cliente ha avuto una settimana difficile, ma il progetto è saldo, e il controllo ce l’ho: conosco i passaggi e i tempi.`,
        `Il quadro è più solido di quanto dica un indicatore. Ho parlato di recente con loro, e fiducia e urgenza sono salite. Il CRM è rimasto indietro, ma lo recupero in giornata.`,
        `Valore e urgenza sono chiari al cliente, lo vedo da come ne parlano, e il controllo del processo ce l’ho in mano. Il cruscotto è più prudente della realtà, e chi ci lavora lo sa.`,
      ],
      vague: [
        `Il cliente è positivo e collaborativo. I numeri sono quello che sono, ma il rapporto è buono e questo, alla fine, conta di più: le persone pesano più dei punteggi.`,
        `Non darei troppo peso agli indicatori: sono una fotografia. Il progetto sta andando nella direzione giusta e lo sento. Alla fine decidono le persone, non i numeri.`,
        `Per me la situazione è sotto controllo. Il cliente si muove nei tempi giusti, anche se i numeri non lo dicono, e non ho segnali che mi facciano cambiare idea.`,
      ],
      react: {
        honest: [
          `Meglio così. Una scheda piena è la parte facile; la parte vera è il comportamento del cliente. Mercoledì alle 9 facciamo una call di quaranta minuti, tu, io e Davide: scegliamo la leva che sposta di più e la lavoriamo fino alla chiusura.`,
          `Apprezzo l’onestà. Il cruscotto non mente, la scheda a volte sì. Ti propongo un esercizio: entro giovedì mi scrivi una riga per ciascuno dei quattro indicatori, con la cosa che farai per migliorarlo. Poi la rivediamo insieme.`,
          `Grazie. Ho visto trimestri salvati da una sola conversazione fatta nel posto giusto. Lunedì mattina chiamo io il livello giusto di {client} per sbloccare un incontro, e tu prepari cosa dire. Ci serve una scena precisa, non un altro giro di slide.`,
        ],
        bluffCaught: [
          `Mi hai detto che i numeri sono migliori. Io leggo fiducia, valore, urgenza e controllo tutti sotto la soglia da {claim}, e gli ultimi aggiornamenti non dicono niente di diverso. Nessun incontro registrato spiega la risalita. Ti riclassifico in categoria {truth}.`,
          `Il cruscotto non è un parere. Si muove con quello che fai e che scrivi. Se fosse salito, ci sarebbe un’attività in scheda a spiegarlo; non c’è. La chiamata scende in categoria {truth}, e martedì in deal review lavoriamo sugli indicatori uno per uno.`,
          `Ho preso i quattro indicatori e li ho confrontati con la tua descrizione: non corrispondono. La probabilità interna è al {p}, ed è esattamente quello che dicono i numeri. Se ci fosse stata una svolta, il CRM la mostrerebbe. La categoria diventa {truth}, e giovedì rifacciamo i conti.`,
        ],
        bluffPassed: [
          `Ok, ti credo. Però lunedì riapro il cruscotto: se fiducia o urgenza non si sono mosse, riparliamo della categoria. Tienimi pronta una prova di qualcosa che è cambiato, anche solo una mail.`,
          `Va bene. Mi sembra una versione ottimista, ma la tengo. Entro venerdì voglio vedere almeno uno dei quattro indicatori in salita, con la nota che spiega perché.`,
          `Prendo atto. Tengo la chiamata e segno una verifica a mercoledì: gli incontri di cui parli devono essere nel CRM, con data e partecipanti. Altrimenti, per me, non sono avvenuti.`,
        ],
        vague: [
          `Il rapporto buono è una cosa, il deal sano è un’altra. Se i numeri sono bassi ci sarà un motivo: dimmi quale dei quattro, e cosa lo spiega. Per ora la chiamata scende di un gradino.`,
          `Una fotografia, certo, ma è quella che mando al CRO. Se non ti fidi degli indicatori, dimmi cosa guardi tu: un fatto, una data. Poi ne riparliamo. Intanto la scalo di una categoria.`,
          `“Nei tempi giusti” a me non dice niente. Voglio il tempo: che giorno succede la prossima cosa, e chi la fa? Quando c’è, rivediamo la chiamata.`,
        ],
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
