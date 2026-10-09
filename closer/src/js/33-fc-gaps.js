/* CLOSER · banca testi forecast A: le sfide di Marta sui “buchi” del MEDDPICC (CL.FCBANK.gaps).
   Una voce per ciascuna lettera (E, Dp, P, M, C, I, Dc, Co) e per disc, cap, meters.
   Ogni voce ha: q (Marta), honest / bluff / vague (il giocatore, in prima persona) e react (Marta).
   Segnaposto: {client} {who} {claim} {acv} {nome} (il motore conosce anche {truth}, ma qui non si usa). Le battute sono solo parlato.
   Marta dà del tu, è equa: premia la franchezza, smonta il bluff con i dati del CRM, non accetta le atmosfere.

   Regole di scrittura (il motore pesca ogni riga a caso, in modo indipendente dalla risposta scelta):
   - {truth} (la categoria che i dati sostengono, cioè la fascia di probabilità nascosta in modalità “Senza rete”) non
     compare in nessuna riga: né nelle domande di Marta, né nelle opzioni, né nelle react (che si leggono prima del
     verdetto e, in “Senza rete”, hanno accanto il solo chip “Categoria corretta”). Per dire dove va la chiamata si
     usano formule che non nominano la fascia (“dove la sostengono i dati”, “più in basso”). {claim} è la categoria
     dichiarata dal giocatore (nelle react è quella dichiarata prima della risoluzione): si usa nelle domande di Marta
     e nelle react, mai nelle opzioni del giocatore;
   - le opzioni honest / bluff / vague di uno stesso blocco non hanno segnaposto (né {who}, né {claim}, né {client}):
     la lunghezza che il giocatore legge non deve dipendere dallo scenario. Hanno lo stesso numero di frasi (tre) e
     lunghezza simile (circa 185-215 caratteri), nessun punto interrogativo, nessuna categoria nominata e nessuna formula
     che le separi per forma (richieste d’aiuto, registro supplichevole, aperture da difesa, il “CRM più prudente” in un
     solo tipo): si distinguono per il contenuto, non per la forma;
   - le sfide non presuppongono né suggeriscono contatti informali con chi decide (alcuni scenari sono gare pubbliche, in
     cui sono vietati): niente telefonate di cortesia o inviti “dal mio livello”, niente “demo” o “budget”; formule valide
     in contesto privato e pubblico (“nei canali previsti”, “il tavolo giusto”, “la spesa prevista a bilancio”);
   - le react di un blocco devono reggere dopo QUALUNQUE variante dello stesso blocco: mai citare parole o dettagli
     di una sola risposta del giocatore; parlano di ciò che dice il CRM, non di ciò che è stato detto;
   - {who} (solo in q e react) è un nome proprio di persona o un organo, singolare o plurale, con eventuale parentesi o
     inciso: solo dopo con, per, due punti, virgola, oppure come soggetto o complemento oggetto (mai dopo a, di, su, da);
     nessun pronome di genere riferito a {who}, nessun verbo concordato con {who} se non come soggetto singolare (E, C);
   - {client} mai prima di un punto (nomi come “S.r.l.”) e mai dopo “a” (“a ASL” suona male: gira con per, in, con);
     {nome} mai a inizio frase (il fallback è “collega”);
   - il legale di Nexora è Ilaria Corti, la Deal Desk è Giulia, il Solution Engineer è Davide;
   - nessun aggettivo o participio che concordi con il genere del giocatore; le sole forme femminili sono di Marta. */
(function (g) {
  'use strict';
  const CL = (g.CL = g.CL || {});
  CL.FCBANK = CL.FCBANK || {};

  CL.FCBANK.gaps = {
    /* ─────────── E · Economic Buyer: chi firma e come lo sai ─────────── */
    E: {
      q: [
        `Apro la scheda di {client}: nel campo Economic Buyer c’è un nome e nessuna data accanto. Chi firma un contratto da {acv}, e che traccia hai dell’ultimo scambio con quella persona?`,
        `Facciamo un test veloce. Descrivimi {who} in due righe: cosa ha a cuore, cosa ti è stato detto di preciso e in quale giorno. Se ti viene da dire “so che…”, ci fermiamo qui.`,
        `Hai messo {client} in {claim}, e a questo punto voglio vedere chi firma, non chi fa il tifo. Nome, ruolo e data dell’ultimo riscontro che hai avuto da chi ha l’ultima parola sulla spesa.`,
        `Il tuo contatto ti dice che i fondi ci sono, {nome}. Può essere vero. Ma una spesa del genere ha sempre un titolare: chi è, e quando hai avuto un riscontro diretto da quella persona?`,
      ],
      honest: [
        `Con chi firma non c’è mai stato uno scambio diretto. Ho dato fiducia a chi mi ha aperto la porta e il resto l’ho dato per scontato. Ora devo arrivare a quella persona, con una richiesta nei modi giusti.`,
        `Mi costa dirlo, ma con chi firma il contratto non ho mai scambiato una parola. Tutto passa dal mio contatto. Scendo di categoria e preparo una richiesta formale entro venerdì, nei canali previsti.`,
        `Sì, è un buco, e dirlo non è piacevole. Su chi firma ho solo informazioni di seconda mano, e nessuna con una data. Preferisco correggere adesso che spiegarti a fine trimestre perché non reggeva.`,
        `Nessun riscontro da chi firma. Ho chiamato troppo in alto sperando di rimediare in tempo, ma non sta in piedi. Riporto la chiamata su ciò che posso dimostrare e fisso un primo passo con una data.`,
      ],
      bluff: [
        `Chi firma è dentro da un po’. Ci siamo sentiti un paio di settimane fa e mi ha confermato che la spesa è sua e che il progetto rientra nelle sue priorità. Resta la parte formale, ma per me la chiamata regge.`,
        `Ci siamo visti a inizio trimestre, mezz’ora organizzata dal mio contatto, con l’agenda in mano. Il messaggio è stato chiaro: se i numeri tornano, si firma. Non vedo un motivo per abbassare la chiamata.`,
        `Ho il suo via libera per mail, di una decina di giorni fa: proseguire con la procedura e tenere informato il suo ufficio. Te la inoltro appena posso. Per me il passaggio con chi firma è fatto.`,
        `Sì, è già dentro: ha partecipato all’incontro di due settimane fa e ha fatto domande sul prezzo, che per me è un ottimo segnale. Sul sì finale non ho dubbi: per me è deciso. È questione di calendario.`,
      ],
      vague: [
        `Il progetto è sentito in tutta l’azienda e il clima è molto favorevole. Un nome preciso adesso non te lo so dare, ma quando sarà il momento chi deve firmare firmerà. Sulla chiamata non ho dubbi.`,
        `Il mio contatto mi assicura che i vertici sono d’accordo. Finora ha sempre mantenuto la parola data e il progetto piace a chi conta. Il CRM sarà più prudente, ma non vorrei forzare i tempi adesso.`,
        `Un incontro da citarti non ce l’ho, ma tutti spingono nella stessa direzione e i tempi sono quelli giusti. Quando serve, chi decide ci sarà. Il segnale che ho è questo, e per ora mi sembra sufficiente.`,
      ],
      react: {
        honest: [
          `Meglio saperlo oggi che il giorno della chiusura. Giovedì alle 10 ti chiamo e prepariamo tre righe per {who}: perché vale il suo tempo e cosa chiediamo. La richiesta di incontro parte poi nei canali previsti, con il mio nome accanto al tuo.`,
          `Grazie per non aver girato intorno al problema. Lunedì mi mandi il business case in una pagina, martedì lo guardiamo insieme e giovedì partiamo con la richiesta di incontro per {who}, nei canali previsti. Se c’è anche il mio nome, di solito la data te la danno in giornata.`,
          `Chiaro, e preferisco questo a un campo riempito. Mercoledì alle 16 ci sentiamo con Davide: ti preparo una scheda di una pagina con {who} al centro, e la richiesta di incontro, nei canali previsti, la firmo anch’io.`,
        ],
        bluffCaught: [
          `Ho la scheda davanti. Sul campo Economic Buyer non c’è un incontro registrato, né una mail con quella persona in copia. Non faccio processi, dico solo cosa vedo: ti porto alla categoria che i dati sostengono, e giovedì facciamo una deal review con il CRM aperto, io e te.`,
          `Ultima attività con il livello decisionale: nessuna. Tutto quello che ho su {client} passa dal tuo referente operativo. Il problema non è l’incontro che manca, è averlo dato per fatto. La chiamata scende al livello che i dati sostengono, e lunedì recuperiamo il buco.`,
          `Quello che mi hai descritto non ha lasciato traccia: nessun invito, nessuna nota di riunione, niente nel registro attività. Se l’incontro c’è stato, non è arrivato al CRM, e per me conta solo quello. Per ora la chiamata sta dove la portano i fatti, e venerdì mi porti quello che manca.`,
        ],
        bluffPassed: [
          `Ok, ti prendo in parola. Ma nel CRM non c’è traccia dell’incontro, e a me serve la traccia. Entro mercoledì sera mi giri l’invito o la mail. Se non arriva, la chiamata la rivedo io.`,
          `Per ora resta com’è. Però un incontro senza una nota nel CRM, per me, vale zero: venerdì mattina voglio vedere data, argomento e prossimo passo scritti nel campo. Altrimenti lunedì la scalo.`,
          `Mmm. Ti credo, ma lo segno: sul decisore ho solo la tua parola. A fine settimana mi fai avere l’invito o la mail, e li leggo io. Se poi i conti non tornano, ne riparliamo con i fatti sul tavolo.`,
        ],
        vague: [
          `Mi stai dando un clima, e io ti avevo chiesto un fatto. La chiamata perde un gradino. Portami un nome, un giorno e una frase detta da chi decide, e ne riparliamo.`,
          `Mi fido di te, ma il CRM si fida solo dei fatti. Ti ho chiesto chi firma e quando ci hai parlato; mi hai risposto con l’atmosfera. Scalo di una categoria: per risalire mi basta un incontro fissato, anche solo in agenda.`,
          `Sento tanti aggettivi e nessun nome. Il CRM non registra gli aggettivi, registra gli incontri. La chiamata va una riga più in basso; portami l’appuntamento e vediamo.`,
        ],
      },
    },

    /* ─────────── Dp · Decision Process: piano di chiusura condiviso, con le date ─────────── */
    Dp: {
      q: [
        `Fammi vedere il piano di chiusura per {client}: non il tuo, quello condiviso, con le date, che hanno letto e accettato. L’hai costruito con {who}, o esiste solo sul tuo portatile?`,
        `Quanti passaggi ci sono tra “ci piace” e la firma? Dimmi quali sono, chi li approva e che giorno cade ciascuno. Anche le date approssimative vanno bene, purché siano date.`,
        `Hai chiamato {claim}, {nome}: vuol dire che sai a ritroso cosa deve succedere ogni settimana da qui alla firma. Partiamo dall’ultimo gradino: che giorno firmano, e chi deve aver approvato prima?`,
        `Una domanda da calendario. Il giorno in cui {client} firma è scritto da qualche parte, e da chi? Se sta solo nella tua testa, per il CRM non è una data, è un desiderio.`,
      ],
      honest: [
        `Il piano condiviso non esiste. Ho in testa una sequenza di passaggi, ma non l’ho mai messa per iscritto con il cliente. Ho corso troppo con la chiamata: lo costruisco con loro entro venerdì, con le date.`,
        `Sulle date mi hai preso. Si parla di “fine trimestre”, ma nessun passaggio ha una scadenza concordata con il cliente. Abbasso la chiamata e porto una bozza di calendario da correggere entro mercoledì.`,
        `È un piano mio e basta: il cliente non l’ha visto e nessuno si è impegnato a rispettarlo. Un buco serio, e il CRM ha ragione. Preparo una bozza entro due giorni e la porto al cliente questa settimana.`,
        `Il processo di approvazione l’ho dedotto, non verificato. Non so se dopo il sì operativo servano altri passaggi, né quanto durino. Prima di rialzare la chiamata chiedo al cliente l’elenco completo, con i tempi.`,
      ],
      bluff: [
        `Il piano c’è ed è condiviso: abbiamo i passaggi fino alla firma e le date cadono tutte entro fine mese. Il cliente li ha visti, non ha obiezioni e sui tempi siamo allineati. Per questo la chiamata resta com’è.`,
        `Abbiamo un calendario concordato: approvazione interna, passaggio legale, firma. Il cliente lo conosce e non vedo slittamenti in arrivo. Ce lo siamo scritto in una mail, che ti giro appena posso.`,
        `Il piano è condiviso: l’abbiamo rivisto insieme mercoledì scorso. Mancano solo un paio di date da confermare, e la firma resta dentro il trimestre. Mi basta il tuo ok per chiuderle, e la chiamata resta dov’è.`,
        `Sì, i passaggi li conosco bene: me li ha spiegati il cliente uno per uno, con i tempi di ciascuno. Il CRM è più prudente di me, ma il percorso è lineare. Tra oggi e la firma non vedo ostacoli.`,
      ],
      vague: [
        `Il cliente è motivato e i tempi sono allineati, non vedo ostacoli. Il resto è organizzazione che si sistema da sé quando arriva il momento. Per ora la categoria mi sembra il posto giusto per questa trattativa.`,
        `Abbiamo un buon rapporto e so più o meno come funziona l’approvazione. Non ho tutto scritto, ma il percorso è quello classico per aziende di questo tipo. Sui tempi non vedo problemi e non ne ho mai visti.`,
        `Mi hanno detto che per fine trimestre non ci sono problemi. Hanno sempre mantenuto le promesse e hanno un team organizzato che sa il fatto suo. Non vedo motivo di dubitare di loro, né di toccare la chiamata.`,
      ],
      react: {
        honest: [
          `Dirlo così fa risparmiare metà del lavoro. Costruiamolo insieme: domani alle 15 vieni da me con una pagina e le caselle vuote. Poi lo porti al cliente come bozza da correggere: i clienti correggono volentieri, e correggendo si impegnano.`,
          `Ok, questo si ripara in fretta. Venerdì ti do Davide per un’ora: ricostruite a ritroso il percorso, dalla firma a oggi, e ogni casella deve avere un nome e una data. Poi lo mandi al cliente.`,
          `Meglio un piano che manca che uno inventato al volo. Lunedì mi porti i passaggi che conosci, io ti dico quali di solito mancano, e giovedì lo presenti al cliente. Se firmano il piano, siamo già a metà strada.`,
        ],
        bluffCaught: [
          `Ho aperto il campo Decision Process: due righe, nessuna data, nessun nome accanto ai passaggi. Un piano condiviso lascia tracce: una mail di conferma, un invito ricorrente, una pagina con l’intestazione del cliente. Qui non trovo niente. Ti porto alla categoria che i dati sostengono, e il piano lo scriviamo davvero, insieme.`,
          `Se il cliente avesse visto un piano, nella scheda ci sarebbe l’allegato, e non c’è. Le cose come stanno: il piano è tuo, non vostro. Per me la chiamata sta dove la portano i fatti. Domani lo costruiamo insieme, con il calendario aperto.`,
          `Sul CRM l’ultima modifica al processo di approvazione risale a quattro settimane fa e dice “da definire”. Non contesto che tu abbia in mente un percorso: contesto che l’abbia presentato come concordato. Per me la chiamata scende al livello che i dati sostengono, e il piano lo rifacciamo in deal review.`,
        ],
        bluffPassed: [
          `D’accordo, la chiamata per ora resta. Però nel CRM il processo risulta ancora “da definire”: entro giovedì voglio il piano nella scheda, con una data e un nome per ogni passaggio. Se resta vuoto, la chiamata la rivedo io.`,
          `Ok, la tengo dov’è. Mi fido, ma ho bisogno di vederlo: mandami la pagina del piano, anche la foto di un foglio, entro mercoledì sera. Con le date, grazie.`,
          `Come dici tu. Metto una nota a calendario: venerdì apro la scheda e guardo se i passaggi hanno una data e un responsabile. Se sì, ti devo un caffè. Se no, ne parliamo.`,
        ],
        vague: [
          `Non mi hai dato nemmeno una data. Ti chiedo un fatto: che giorno cade il prossimo passaggio, e chi lo deve fare? Finché non lo scrivi, la chiamata perde un gradino.`,
          `Il percorso medio non mi interessa: mi interessa quello di {client}, con nome e data del prossimo passaggio. Intanto la scalo di una categoria.`,
          `Fiducia e buone intenzioni non fanno un piano. Ti basta una riga: “il tal giorno, la tal persona approva la tal cosa”. Quando me la porti, ne riparliamo; per ora scende di un gradino.`,
        ],
      },
    },

    /* ─────────── P · Paper Process: legale, acquisti, procura di firma ─────────── */
    P: {
      q: [
        `Il contratto: chi l’ha letto, dalla parte di {client}? Dimmi in quale ufficio sta la pratica, quali documenti mancano per la firma e a nome di chi si firma. Tre risposte, mi bastano quelle.`,
        `Sul paper non accetto sorprese a fine trimestre, {nome}. Quanti giorni servono, in {client}, per portare un contratto da “va bene” a “firmato”? E chi ha la procura per mettere la firma?`,
        `Nel campo Paper Process leggo “in corso”. In corso dove? In quale ufficio sta il contratto oggi, con quale nome sopra e da quanti giorni?`,
        `Per un contratto da {acv} immagino ci siano Acquisti, il legale e magari una valutazione del fornitore. Per ciascun passaggio dimmi se è avviato, chi lo segue e con quale data.`,
      ],
      honest: [
        `Il contratto non è partito. Non so dire chi lo legge dalla parte del cliente né quanto ci mettano. È la parte che ho rimandato, perché mi sembrava burocrazia: ora la porto al primo posto e scendo di categoria.`,
        `Il paper non l’ho ancora aperto con il cliente. Pensavo di farlo a ridosso della firma, ed è stato un errore. Abbasso la chiamata e questa settimana fisso tempi e passaggi, uno per uno, con una data.`,
        `Hai ragione, il paper è la mia zona cieca. Non so se serva una procura né a nome di chi si firmi. Porto la chiamata più in basso e riparto dal contratto, per capire tempi, passaggi e chi deve approvare.`,
        `Ho lavorato bene sulla vendita e male sulla fine. Ho chiamato troppo presto, senza la documentazione pronta e senza i tempi degli uffici. Meglio correggere oggi che lasciare una chiamata alta ferma in coda.`,
      ],
      bluff: [
        `Il paper è avviato: la documentazione è pronta, la pratica risulta aperta e Ilaria Corti l’ha già controllata. Mi serve solo il tuo ok per dare priorità al fascicolo. Con questo, la chiamata regge.`,
        `Le clausole le abbiamo già viste. I tempi sono quelli standard, un paio di settimane, e sulla procura per la firma ci stiamo dentro. Non vedo dove sia il rischio, per questo non cambio la chiamata.`,
        `Sì, la pratica è partita la settimana scorsa e i documenti richiesti sono già a posto da parte nostra. Per il passaggio negli uffici del cliente mi aspetto pochi giorni. Non ho segnali di ritardo.`,
        `Il percorso l’ho già ricostruito: approvazione interna, verifica dei documenti, firma. Sono tre passaggi e ci sono i tempi per farli tutti. Nessuno richiede più di pochi giorni, e il primo è già partito.`,
      ],
      vague: [
        `La parte contrattuale è una formalità: con questo cliente non ci sono mai stati problemi. Quando arriviamo lì si sistema in pochi giorni, e non vale la pena anticiparla adesso. Per me la chiamata è giusta.`,
        `L’ufficio legale del cliente ha un atteggiamento positivo, da quel che mi risulta. Non vedo nodi sul contratto, e comunque ce ne occuperemo a tempo debito. Per ora la priorità è non appesantire il rapporto.`,
        `Dalle indicazioni ufficiali, sul paper non dovrebbero esserci ritardi. Il cliente è affidabile e noi anche. Il CRM sarà più prudente, ma la chiamata può restare: insistere sul contratto adesso sarebbe forzare la mano.`,
      ],
      react: {
        honest: [
          `Meglio dirlo adesso: il paper è dove i trimestri vanno a morire. Martedì sentiamo Ilaria Corti, il nostro legale. Porta le richieste che ti hanno fatto finora, anche vaghe, e chiediamo la corsia preferenziale. Una settimana di attesa in meno vale quanto uno sconto.`,
          `Bene che tu me lo dica. Mando la scheda a Ilaria Corti in giornata, e mercoledì mattina mi dai l’elenco delle clausole e dei documenti che il cliente richiede. Se la bozza parte entro venerdì, siamo ancora in tempo.`,
          `Ok. Di trattative ne ho viste morire sulla firma più di quante ne vorrei ricordare, quindi meglio che tu lo sappia ora. Giovedì alle 11 sentiamo Giulia del Deal Desk e Ilaria Corti insieme e costruiamo la lista di cosa serve a {client} dalla decisione alla firma. Il nome di chi segue la pratica in Acquisti lo porti tu.`,
        ],
        bluffCaught: [
          `Ho il registro dei documenti inviati. Contratto per {client}: nessuno. Richiesta di anagrafica fornitore: nessuna. Se la pratica è aperta, lo è in un posto dove il CRM non arriva. Finché non la vedo, la chiamata scende dove la sostengono i dati, e martedì rivediamo il paper in deal review.`,
          `Capisco la tentazione: a fine trimestre il paper sembra un dettaglio. Ma il registro è vuoto, senza bozza e senza una conferma di Acquisti. Non cerco colpevoli, cerco documenti. La categoria si sposta al livello che i dati sostengono, e costruiamo il percorso contrattuale con le date vere.`,
          `Ho ricontrollato mentre parlavi: nessuna bozza inviata, nessuna richiesta registrata dal legale del cliente, nessuna pratica aperta in Acquisti. Quello che mi hai descritto non è nel CRM. Per me la chiamata sta dove la portano i fatti. Giovedì ripartiamo dal paper con Ilaria Corti.`,
        ],
        bluffPassed: [
          `Va bene, vado sulla fiducia. Però nel CRM il paper è ancora vuoto: venerdì voglio la bozza inviata o una mail di Acquisti con la data di ricezione. Altrimenti lunedì rivedo la categoria.`,
          `Ok, resta così. Fammi un favore: inoltrami entro mercoledì una traccia scritta di quello che mi hai detto: una mail, un numero di pratica, il nome di chi legge. Se la trovo, sono la prima a ricredermi.`,
          `Va bene. Ma di paper “a posto” ne ho sentiti tanti, e l’ultimo giorno si scopre sempre che non lo era. Nome dell’ufficio e data di consegna entro giovedì, poi la tengo dov’è.`,
        ],
        vague: [
          `Il paper sembra una formalità fino al giorno in cui non lo è: io ho visto contratti fermi quattro settimane in un solo ufficio. Mi servono due cose: chi legge il contratto per {client} e da quale giorno. Intanto la scalo di un livello.`,
          `Rimandare il paper è l’ultima cosa che si fa prima di una brutta fine trimestre. Nome dell’ufficio e data della prima bozza: questo mi serve, e non l’ho sentito. La chiamata arretra di un gradino finché non lo scrivi.`,
          `Le buone sensazioni sul paper non valgono una bozza spedita. Dammi un fatto, quello che vuoi: una mail, un nome, un numero di pratica. Senza, la metto una riga più in basso.`,
        ],
      },
    },

    /* ─────────── M · Metrics: il numero validato dal cliente ─────────── */
    M: {
      q: [
        `Il numero del business case di {client}: qual è, e chi del cliente l’ha confermato? Non voglio la nostra slide. Voglio che sia stato il cliente a dire “sì, questo è il nostro numero”.`,
        `Quanto vale per {client} risolvere il problema, in euro l’anno, {nome}? Se la cifra l’ha detta il cliente, dimmi chi, quando e se è scritta da qualche parte.`,
        `Se un dirigente di {client} ti chiedesse “perché dovrei spendere {acv}?”, quale numero porteresti? E sarebbe un numero loro o un numero tuo?`,
        `Quel numero l’hai rivisto con {who}? Dimmi cosa è stato corretto: quando un cliente non cambia neanche una virgola, di solito non ha letto.`,
      ],
      honest: [
        `Il numero è nostro, non loro: l’ho costruito sulle medie di settore e non l’ho mai rivisto con il cliente. Non è validato, quindi la chiamata non regge. Lo faccio validare da chi decide, nei canali previsti.`,
        `Sui numeri ho fatto l’ottimista. Il risparmio che racconto non l’ho mai discusso con il cliente voce per voce. Abbasso la chiamata e rifaccio il conto con i loro dati, partendo dalle tre voci più pesanti.`,
        `Sì, lì ho un buco. Il business case l’abbiamo scritto noi, non il cliente, e finché non lo riconoscono come proprio non vale. Ho chiamato troppo presto, e lo faccio correggere a loro entro giovedì sera.`,
        `Non ho una cifra che il cliente abbia sottoscritto. Ho una stima, e per settimane l’ho trattata come un dato. È ora di smettere: riscrivo la chiamata e vado a far confermare il numero da chi decide davvero.`,
      ],
      bluff: [
        `Il numero è validato. Il cliente stima un ritorno di circa il doppio dell’investimento nel primo anno, e lo ha confermato davanti al suo team due settimane fa. Per questo la chiamata non è in discussione.`,
        `Il business case è condiviso e il cliente lo ha rivisto con noi. L’impatto sui costi lo hanno quantificato loro, e hanno corretto un paio di voci. Il totale ha retto, quindi la chiamata è giusta.`,
        `Ho il loro foglio di calcolo, e quello che mostriamo torna con la loro analisi interna. Il ritorno che presentiamo è perfino prudente rispetto alle loro stime. Su questo punto non vedo rischi per la chiamata.`,
        `La parte economica è risolta: il cliente ha già fatto i suoi conti e il ritorno è chiaro. Il CRM è più prudente di me, ma sul valore non c’è discussione. Mi serve solo il tuo appoggio sulla data di firma.`,
      ],
      vague: [
        `Il valore per il cliente è evidente: tagliano i costi e migliorano il servizio. Non serve fare troppa matematica per capirlo, basta guardare come lavorano oggi. Per me la chiamata è giusta.`,
        `Il business case sta in piedi, non è quello il problema. Il cliente ha capito il ritorno e ha apprezzato molto l’analisi che gli abbiamo presentato. Per me non è il punto debole, e nessuno l’ha mai messo in dubbio.`,
        `I numeri girano bene. Non abbiamo ancora una cifra definitiva, ma il cliente capisce che il ritorno c’è e che è importante. Sulla chiamata non cambio idea: sul dettaglio ci arriviamo man mano, come si fa di solito.`,
      ],
      react: {
        honest: [
          `Un numero nostro è un’ipotesi, un numero loro è un impegno. Mercoledì alle 14 sentiamo Davide e costruiamo un foglio con le loro voci di costo, non le nostre: lo porti al cliente e chiedi di correggerlo.`,
          `Quasi tutti difendono il proprio numero fino all’ultimo giorno: che tu non lo faccia conta, per me. Lunedì mi mandi le tre voci di costo che il cliente ammette di avere; Giulia del Deal Desk prepara il modello e giovedì torni con una cifra che hanno toccato loro.`,
          `Bene, la verità prima di tutto. Un business case si valida in una sola riunione, se ci arrivi con le voci giuste. Venerdì mattina Davide e io ti prepariamo la bozza; tu ottieni dal cliente venti minuti con chi approva la spesa.`,
        ],
        bluffCaught: [
          `Nella scheda il valore stimato ha come fonte “Nexora”. Non ho nessun documento con il timbro del cliente, nessun foglio ricevuto, nessun verbale. Non è una colpa, ma non è nemmeno un numero validato. La trattativa passa dove la sostengono i dati, e ricostruiamo il caso partendo da loro.`,
          `Ho la cartella della trattativa aperta: l’ultimo file sul business case lo abbiamo creato noi, e il cliente non l’ha mai restituito con commenti. Un numero rivisto da loro torna con almeno una correzione. La chiamata scende al livello che i dati sostengono.`,
          `Nel CRM, campo Metrics, leggo “stima interna”. “Validato” e “stima interna” sono due cose diverse, e la differenza sta tutta lì. La categoria si sposta dove la portano i fatti; venerdì rifacciamo il conto insieme, ma con il cliente.`,
        ],
        bluffPassed: [
          `Intanto non tocco niente. Ma non vedo il documento nel CRM: caricami entro mercoledì il foglio o la mail in cui il cliente conferma il numero, e la chiamata resta dov’è.`,
          `Mi inquieta un numero perfetto: i clienti correggono sempre qualcosa. Per ora lascio la chiamata, ma venerdì voglio il file originale, con le loro modifiche in evidenza.`,
          `Prendo atto. Ma un numero validato lascia una mail, un verbale o un foglio con le loro correzioni. Mercoledì li voglio nel CRM, e li leggo io; se tutto torna, la chiamata resta.`,
        ],
        vague: [
          `A me serve il numero, non l’impressione. Nel campo Metrics non c’è una cifra con la firma del cliente accanto. Dimmi quale numero ha detto il cliente, a voce o per iscritto. Intanto la porto un gradino sotto.`,
          `Il valore si dimostra con una cifra detta da loro, non con il buon senso. Se è davvero quella giusta, ti basta una mail. Finché non c’è, la chiamata scende di una categoria.`,
          `Un ritorno senza un numero è un sentimento. Portami una cifra, una fonte e una data. Dopo, la categoria la rivalutiamo; per ora scende di un gradino.`,
        ],
      },
    },

    /* ─────────── C · Champion: ha venduto internamente per te? l’hai testato? ─────────── */
    C: {
      q: [
        `Nel CRM il tuo champion è {who}. Dimmi una cosa che ha fatto per te quando tu non c’eri: una riunione, una slide, un “no” detto a qualcuno.`,
        `Un champion si vede quando tu non ci sei. L’ultima volta che {who} ha parlato di {client} con chi decide, senza di te, quando è stata? E come lo sai?`,
        `Il tuo champion ha mai passato un test? Una richiesta scomoda, un favore che costa, una posizione presa per noi in una riunione senza di te. Cosa ha fatto?`,
        `Simpatia e potere sono due cose diverse. {who} ti risponde volentieri, bene. Ma ha l’orecchio di chi decide? Se in {client} nascesse un dubbio sul progetto, chi sentirebbero per primo?`,
      ],
      honest: [
        `Ho un contatto cordiale, non un champion. Non ho mai verificato se parla di noi con chi decide: ho dato per vero quello che speravo. Scendo di categoria e il prossimo passo è capire quanto pesa davvero.`,
        `Ti dico com’è: il mio contatto è cordiale e mi dà informazioni, ma non mi ha mai portato in una riunione che non avessi chiesto io. Come champion non conta. La chiamata scende e parto da una prova vera.`,
        `Non ho testato niente. Se mi chiedi cosa ha fatto per noi in mia assenza, non ho un episodio da citare: ho preso la cordialità per sostegno. Ho chiamato troppo presto, e preparo una prova per venerdì.`,
        `Ho un solo punto di contatto e non so che peso abbia. Non ho mai assistito a una sua difesa del progetto, e scoprirlo adesso brucia. Correggo il foglio e questa settimana cerco anche un secondo alleato.`,
      ],
      bluff: [
        `È giusto chiederlo: il mio champion è solido, ha portato il progetto in direzione due volte e mi ha anticipato le obiezioni prima che arrivassero. Sta lavorando per noi. Per me la chiamata regge.`,
        `Il mio contatto vende per me ogni giorno. Mi ha detto più di una volta che ha già parlato con chi decide e che la risposta è positiva. Sul fronte interno non ho pensieri, e la chiamata è al suo posto.`,
        `Il mio champion l’ho già messo alla prova. Ha organizzato un incontro con il suo responsabile e ha difeso il nostro nome quando un collega ha avuto dei dubbi. Non è un semplice contatto, ne ho viste le prove.`,
        `Il mio contatto pesa davvero: decide chi entra nelle riunioni sul progetto, e finora ha sempre fatto il nostro nome. Apre la porta quando serve. Per questo non cambio la chiamata, senza esitazioni.`,
      ],
      vague: [
        `Il mio contatto è molto coinvolto e ci tiene al progetto. Mi dice sempre che spinge dall’interno, e non ho motivo di dubitarne: ogni volta che ci sentiamo mi dà buone notizie. Resto sulla chiamata.`,
        `Con il mio contatto c’è un ottimo rapporto: mi risponde in giornata e mi chiama prima delle riunioni. Mi fido, ha sempre mantenuto la parola data. Il CRM sarà più prudente, ma i segnali non mi preoccupano.`,
        `Il progetto lo sentono tutti, e il mio contatto ci crede più di me. Non devo dimostrare niente a nessuno: i segnali sono tutti positivi. Nessuno ha mai sollevato dubbi, e non vedo perché toccare la chiamata.`,
      ],
      react: {
        honest: [
          `Non sei il primo a scambiare un contatto per un champion. Giovedì pomeriggio ti chiamo e prepariamo insieme una richiesta piccola ma scomoda per {who}. Se risponde, ci sta. Se rimanda, abbiamo imparato in una settimana quello che costa un trimestre.`,
          `Meglio un contatto vero che un champion di carta. Ti aiuto a cercare il secondo: lunedì mi porti l’organigramma del progetto, scegliamo due persone con peso reale e prepariamo la richiesta di incontro, da far partire nei canali previsti. E la prima prova deve costare qualcosa a chi la fa.`,
          `Meglio saperlo ora. Martedì alle 9 ci sediamo mezz’ora, io e te, e riscriviamo la mappa di chi conta davvero in {client}, nomi e ruoli. Mi servono due nomi in più oltre al tuo contatto, e il motivo per cui dovrebbero parlare con noi.`,
        ],
        bluffCaught: [
          `Apro il registro attività: tutte le mail partono da te e arrivano al tuo contatto. Non c’è una riunione interna a cui abbia portato il progetto, né un accesso o un documento ottenuto per tuo conto. Un champion lascia tracce, qui c’è una buona relazione. Metto la trattativa dove la sostengono i dati.`,
          `Mi hai raccontato cose che nel CRM non trovo: non c’è un documento, non c’è un incontro, non c’è una nota. Può darsi che sia successo e che il CRM non lo sappia, ma per me conta quello che è scritto. La chiamata scende al livello che i dati sostengono, e lunedì ne parliamo in deal review.`,
          `Tutto bene finché non guardo i dati. Il tuo contatto ha risposto a ogni tua mail, ma nessuna è stata inoltrata a un secondo nome interno. Un champion le inoltra. La chiamata si sposta dove la portano i fatti, e ci lavoriamo con calma.`,
        ],
        bluffPassed: [
          `D’accordo. Voglio però un fatto: entro giovedì mi dici cosa ha fatto per noi il tuo contatto quando non c’eri tu, con una data. Se non c’è, il champion lo cancello dal CRM.`,
          `Ok. Se dici che è un champion, mettilo alla prova entro venerdì: una richiesta scomoda, qualcosa che costa. Poi mi racconti com’è andata. Se tutto fila, ti chiederò scusa per il sospetto.`,
          `Per ora tengo la chiamata. Ma la parola “champion” la uso solo dopo un test, e nel CRM non vedo nessuna riga che lo dimostri. Martedì mi mandi una frase: cosa ha fatto per noi senza che tu lo chiedessi.`,
        ],
        vague: [
          `Dimmi un episodio: giorno, riunione, cosa è stato detto e a chi. Coinvolgimento e buona volontà sono impressioni, il CRM registra fatti. Se non lo trovi, la riduco di un livello.`,
          `Essere gentili e rispondere in giornata lo fa chiunque. Un champion apre porte. Quale porta ti ha aperto, e quando? Mi basta una. Intanto la scalo di una categoria.`,
          `Segnali positivi, sì, ma di chi? Un champion è una persona con un nome, un peso e un’azione. Dammi un fatto e ne parliamo; per ora la chiamata perde un gradino.`,
        ],
      },
    },

    /* ─────────── I · Identify Pain: il dolore e il costo di non agire ─────────── */
    I: {
      q: [
        `Cosa cambia per {client} se non compra niente? Non tra un anno: da qui a fine trimestre. Dammi la conseguenza concreta, con un costo o con una scadenza.`,
        `Chi lo sente davvero, il problema, in {client}? Se la risposta è {who}, dimmi da quanto tempo dura e quanto costa ogni mese. Se la risposta è “tutti”, ricominciamo.`,
        `Se togliamo il nostro nome dal progetto, resta un problema che qualcuno deve risolvere comunque? Oppure è un “sarebbe bello”? Un indizio: c’è una spesa già prevista a bilancio, sì o no?`,
        `Un progetto con un’urgenza vera ha una data, {nome}. C’è una scadenza che spinge {client}: una norma, una verifica, un contratto in scadenza? O è solo un’idea buona che può aspettare?`,
      ],
      honest: [
        `Il problema esiste, ma non ho una conseguenza con un costo e una data. Il cliente sta bene anche senza di noi. Mi sposto più in basso, e prima di rialzare la chiamata trovo cosa rende urgente il progetto.`,
        `Non ho una risposta decente alla tua domanda su cosa succede se non comprano. Ho ascoltato il problema, non l’ho misurato. Quindi abbasso la chiamata e torno dal cliente a misurare il costo con loro.`,
        `Il dolore c’è, per il mio contatto, ma l’ho scambiato per urgenza aziendale. Non è la stessa cosa, lo vedo adesso. Ho chiamato troppo presto, e ora scopro cosa perde davvero l’azienda se aspetta ancora.`,
        `È un “sarebbe bello”, onestamente. L’urgenza l’ho gonfiata io, non il cliente. Abbasso la chiamata e preparo domande migliori per la prossima conversazione, a partire dal costo di aspettare ancora.`,
      ],
      bluff: [
        `Per il cliente è un’emergenza: se non intervengono entro fine trimestre rischiano costi e fermi che non possono permettersi. Il prezzo di non agire è chiaro a tutti da tempo. Per me la chiamata regge.`,
        `La spesa è già prevista a bilancio proprio perché non possono più aspettare. Il problema costa loro una cifra importante ogni mese e lo sanno bene. Ne parlano apertamente anche in direzione, e non da oggi.`,
        `Il dolore è condiviso: chi lavora sul campo lo vive ogni giorno e anche la direzione ne è consapevole. Per tutti non è rinviabile, nemmeno di poco. Resto sulla chiamata, perché il tema non ha alternative.`,
        `C’è una scadenza vera: un contratto in scadenza e una verifica in arrivo. Rimandare adesso costerebbe molto più che firmare con noi. Il CRM è più prudente di me, ma me l’hanno detto chiaramente.`,
      ],
      vague: [
        `Il cliente sente il problema in modo molto forte, lo vedo. È un tema che gli sta a cuore, ne parlano con passione e vedo che vogliono muoversi presto, senza troppi giri. Per me la chiamata è corretta.`,
        `C’è consapevolezza che bisogna fare qualcosa. Non so dirti la cifra, ma ne parlano in ogni riunione e la direzione è sensibile al tema. Il terreno è pronto, e io non vedo motivi per aspettare ancora.`,
        `Il tema è prioritario per loro, lo capisco da come ne parlano. Non servono i numeri per capire che è importante. Sulla chiamata non ho esitazioni: bastano cinque minuti con il loro team per rendersene conto.`,
      ],
      react: {
        honest: [
          `Chiamare le cose con il loro nome è l’inizio di un forecast sano. Giovedì alle 16 mi porti tre domande da fare a chi sente il problema. Le sistemiamo insieme, perché la domanda giusta fa emergere il costo senza che tu debba spingere.`,
          `Aver ascoltato un problema senza averlo misurato è la fase uno, non c’è niente di cui vergognarsi. Per la fase due, lunedì ti metto in videochiamata con Davide: costruite il conto dei costi di non agire, voce per voce, e lo porti tu al cliente.`,
          `Meglio un problema ammesso che un’urgenza inventata: il CRM è pieno di trattative belle e povero di trattative urgenti. Venerdì mattina ci sediamo con la scheda di {client} e scriviamo le domande che fanno emergere cosa non funziona per {who}.`,
        ],
        bluffCaught: [
          `Nel campo Identify Pain leggo una frase generica e basta. Nessun costo, nessuna scadenza, nessun nome di chi ci perde. Se fossero davvero in emergenza, in cartella avremmo almeno una mail con scritto “urgente”. Da oggi la chiamata su {client} sta dove la sostengono i dati.`,
          `Guardiamo il CRM insieme. Spesa a bilancio: non risulta. Data limite del cliente: non registrata. Persona che perde qualcosa se il progetto slitta: nessun nome. Il problema che hai descritto il cliente non l’ha mai confermato per iscritto. Porto la chiamata al livello che i dati sostengono, e rifacciamo insieme il giro di domande al cliente.`,
          `Un cliente con una scadenza vera te la scrive, perché gli serve che tu la rispetti. Io qui non la trovo, né scritta né detta. Porto la chiamata su {client} dove la portano i fatti. Non ti giudico, ma da adesso chiedo la fonte di ogni “urgente”.`,
        ],
        bluffPassed: [
          `Intanto la lascio. Ma l’urgenza che descrivi non è scritta da nessuna parte: entro mercoledì voglio una mail o una nota del cliente in cui compaia una scadenza o un costo. Poi la chiamata resta.`,
          `Va bene, vediamo. Se è grave come dici, il cliente te lo metterà per iscritto in due righe: chiedile entro giovedì. Se non te le dà, vuol dire che non è poi così grave.`,
          `Prendo nota. Ma quando c’è fretta vera si vede: solleciti, riunioni anticipate, qualcuno che ci chiede di accelerare. Io non l’ho vista. Venerdì rimettiamo sul tavolo la questione, e se non è cambiato niente la categoria la cambio io.`,
        ],
        vague: [
          `Sentire non è misurare. Dimmi una conseguenza che si possa verificare: una cifra, una data, un nome di chi ci perde. Intanto la chiamata arretra di un gradino.`,
          `Dell’urgenza si parla in tante riunioni; quante hanno una spesa in agenda? Voglio un fatto, non il clima. La scalo di una categoria finché non c’è.`,
          `Il CRM non registra le priorità, registra costi e date. Portami un numero e rivedo la categoria; per ora la chiamata va una riga più in basso.`,
        ],
      },
    },

    /* ─────────── Dc · Decision Criteria: i criteri con cui scelgono ─────────── */
    Dc: {
      q: [
        `Con quali criteri sceglierà {client}? Non il tuo elenco dei nostri punti di forza: i loro criteri, in ordine d’importanza, e chi li ha scritti.`,
        `Se ti chiedessi di compilare al posto di {client} la griglia con cui valuta noi e gli altri fornitori, quali voci metteresti e con che peso? E soprattutto: le hai viste scritte da loro?`,
        `Per {who}, cosa conta davvero nella scelta: sicurezza, prezzo, tempi, referenze? Dimmi le prime due voci, e di chi sono. Se non le hai viste scritte da loro, vale come se non le avessi.`,
        `Hai chiamato {claim}. Allora dimmi: se il prezzo fosse identico tra noi e gli altri, cosa farebbe pendere la scelta? Se la risposta è “la qualità”, ricominciamo.`,
      ],
      honest: [
        `Non conosco i criteri di scelta. Conosco il nostro prodotto, non il metro del cliente. Abbasso la chiamata e preparo la domanda giusta da portare al tavolo giusto, per capire come valuta davvero.`,
        `Sui criteri ho fatto un errore da principiante. Ho presentato quello che avevamo e ho dedotto che bastasse. Ho chiamato troppo in alto per ottimismo, e adesso chiedo al cliente come valuta, senza irrigidirlo.`,
        `Il criterio decisivo lo immagino. Non l’ho mai visto scritto dal cliente, e potrebbe essere diverso dal nostro punto di forza. Abbasso la chiamata e riparto da una domanda aperta, fatta nel posto giusto.`,
        `Il prezzo lo conosco, il resto no. Ho un solo criterio confermato, e un trimestre non si regge su uno. Correggo il foglio e questa settimana ricostruisco con loro il resto della griglia, voce per voce.`,
      ],
      bluff: [
        `I criteri sono chiari e li abbiamo in mano: sicurezza, integrazione con i sistemi esistenti e tempi di messa in produzione. Su tutti e tre siamo davanti agli altri. Per questo la chiamata regge.`,
        `Il cliente ci ha mandato la griglia di valutazione e il nostro punteggio è il migliore. I pesi sono scritti nel documento e sono favorevoli a noi. Manca solo l’ufficializzazione, che ti inoltro appena arriva.`,
        `So esattamente cosa conta per loro: la reputazione del fornitore e la qualità dell’assistenza. Lo dicono tutti e due i referenti, riunione dopo riunione, e su entrambe siamo messi bene. Resto sulla chiamata.`,
        `I criteri sono quelli in cui siamo più forti, e il prezzo non è in cima alla lista. I punti che contano li vedo chiari, e su quasi tutti siamo davanti. Per me siamo in testa, e questo basta.`,
      ],
      vague: [
        `Credo che puntino alla soluzione più solida, e noi siamo la scelta naturale. Il prezzo non sembra il tema principale per loro: è l’impressione che ho da diverse conversazioni. Per me la chiamata è giusta.`,
        `Il cliente apprezza la nostra proposta e ci ha dato buoni segnali. I criteri, alla fine, premiano chi li soddisfa meglio, e noi siamo messi bene. Il CRM sarà più prudente, ma non vedo motivo di cambiare.`,
        `Hanno un’idea chiara di quello che vogliono e ci siamo molto vicini. Un elenco non me l’hanno ancora dato, ma si capisce dalle domande. Per ora mi basta questo per tenere la chiamata dov’è.`,
      ],
      react: {
        honest: [
          `Bene. Si arriva ai criteri con una domanda sola, fatta nel momento giusto: “Come deciderete tra noi e le alternative?” Giovedì alle 11 la proviamo insieme: tu fai il cliente e io quella che non risponde. Poi la fai davvero, al tavolo giusto.`,
          `È quello che volevo sapere. Il lavoro è da due: lunedì Davide ti prepara una lista dei criteri tecnici che di solito pesano, tu aggiungi quelli di business, e martedì li porti al cliente come domanda aperta. Se li correggono, hai la tua griglia.`,
          `Con i criteri conviene essere un po’ ingenui: “aiutatemi a capire come scegliete”. Venerdì mattina ti metto in contatto con un collega che ha già vinto contro un concorrente simile, e ascoltiamo quali criteri hanno pesato alla fine.`,
        ],
        bluffCaught: [
          `Il campo Decision Criteria è vuoto, e nella scheda non c’è nessun documento del cliente con una griglia di valutazione o dei requisiti scritti. Se ci fossero, sarebbero la prima cosa caricata. Porto la chiamata su {client} dove la sostengono i dati, e ripartiamo da una domanda semplice al cliente.`,
          `I criteri veri li scrive il cliente, non noi. Nel campo leggo poche parole e nessuna fonte. La chiamata scende al livello che i dati sostengono finché non li vedo, e prepariamo insieme le domande per averli.`,
          `Aspetta, controllo. Richiesta di proposta del cliente: niente. Requisiti scritti: niente. Griglia di valutazione: niente. Mi hai descritto un mercato in cui vinciamo, non una decisione che il cliente ha preso. La chiamata sta dove la portano i fatti.`,
        ],
        bluffPassed: [
          `Ok, vado avanti sulla tua parola. Ma nella scheda non c’è nessun documento sui criteri: mandamelo entro mercoledì, anche la foto di un foglio a mano. Se ti hanno dato un punteggio, sarà da qualche parte.`,
          `Va bene. Mi sembra molto bello, e quando una cosa è molto bella la guardo due volte. Entro giovedì mi scrivi i primi tre criteri con il nome di chi li ha detti. Poi confermo la chiamata.`,
          `Lo segno. Però un vantaggio sui concorrenti non lo scrivo nel forecast finché non vedo un documento. Venerdì mattina voglio i criteri nel CRM, con la fonte. Se mancano, riapriamo la discussione.`,
        ],
        vague: [
          `Un’impressione non è un criterio. Dimmi un criterio che il cliente ha nominato, con il suo nome accanto. Per ora ti tolgo una categoria.`,
          `I criteri non si adattano a chi vince, li scrive il cliente prima di scegliere. Portami la voce che pesa di più nella loro valutazione e chi l’ha detta. Intanto la scalo di una categoria.`,
          `Se non c’è un elenco, non c’è una misura. Un fatto, per favore: quale domanda ti ha fatto il cliente che rivela cosa conta per lui? Dopo, rivediamo la categoria; intanto scende di un gradino.`,
        ],
      },
    },

    /* ─────────── Co · Competition: le alternative, compreso il non fare nulla ─────────── */
    Co: {
      q: [
        `Contro chi giochiamo davvero in {client}? Nel CRM, alla voce concorrenza, non c’è niente di verificato. Dimmi chi altro è in partita, cosa propone e da dove lo sai.`,
        `Competizione: la risposta “nessuna” non esiste. C’è sempre qualcuno, anche solo il foglio Excel che usano oggi. Qual è la loro alternativa e perché non basta più?`,
        `Vertex Systems è in partita su {client}? Sì o no, e se sì: da quando e con quale proposta? Se non lo sai, qualcun altro sta occupando il tuo posto senza che tu te ne accorga.`,
        `Il concorrente più pericoloso spesso non ha un nome: è il “rimandiamo”, {nome}. L’hai studiato? Dimmi chi in {client} ha interesse a rimandare e cosa renderebbe il rinvio più costoso della decisione.`,
      ],
      honest: [
        `Sulla concorrenza ho guardato poco. Non so chi altro sia in valutazione né con quale proposta. Abbasso la chiamata, e questa settimana mi faccio un’idea precisa partendo da fonti verificabili e datate.`,
        `Ho ragionato come se fossimo l’unica opzione, e non lo siamo. Non ho verificato chi altro sia in valutazione. Ho chiamato troppo presto, e rifaccio la mappa delle alternative entro giovedì, fonte per fonte.`,
        `Alla voce concorrenza ho scritto un nome a memoria. Non l’ho mai verificato, e di come stanno davvero le cose non so quasi nulla. Correggo la chiamata e verifico le fonti una per una, prima di rialzarla.`,
        `Il “non fare nulla” non l’ho mai analizzato, ed è l’avversario più duro. Ho sottovalutato l’inerzia. Abbasso la chiamata e costruisco un caso, con i numeri, che renda il rinvio più caro della decisione.`,
      ],
      bluff: [
        `Siamo l’unica proposta in campo. Dai segnali del mercato non risultano altri fornitori in valutazione, e il non fare nulla non è un’opzione: hanno già deciso di muoversi. Per questo la chiamata resta dov’è.`,
        `Un altro fornitore era stato considerato mesi fa, ma dalla documentazione pubblica risulta non adatto. Il discorso non è stato ripreso. Dalle informazioni che ho, quella minaccia non c’è.`,
        `So con chi ci confrontiamo: due fornitori, uno già scartato e uno molto più caro. Il quadro l’ho ricostruito dalle informazioni disponibili, e il nostro prezzo regge il confronto. Sul secondo non vedo rischi.`,
        `L’alternativa è tenere il sistema attuale, e costerebbe loro di più: lo sanno. Il confronto l’ho fatto io con i numeri, e regge. Il non fare nulla qui non è una minaccia, per questo non cambio la chiamata.`,
      ],
      vague: [
        `Non mi risulta che ci siano altri in corsa, e comunque siamo ben posizionati. L’offerta sta in piedi e non vedo minacce vere. Finora nessuno me ne ha parlato, quindi la chiamata mi pare giusta.`,
        `Siamo in una buona posizione rispetto agli altri. La nostra proposta mostra cosa facciamo meglio, quindi i concorrenti non mi preoccupano. Il CRM sarà più prudente, ma la chiamata può restare: il resto verrà da sé.`,
        `Ho la sensazione che la partita sia nostra. Sulle alternative non ho dati precisi, ma l’impressione è che la nostra proposta sia la più solida. Sono impressioni, ma per ora mi bastano per tenere la chiamata.`,
      ],
      react: {
        honest: [
          `Questa è la risposta più utile che potessi darmi: nessuno batte un concorrente che non conosce. Lunedì mi porti le tre domande da porre sull’alternativa, nei canali previsti, e le sistemiamo insieme. Davide ha un confronto già pronto contro i casi più comuni.`,
          `Ok. L’inerzia è l’avversario più sottovalutato di tutti. Mercoledì alle 15 ci sediamo e scriviamo insieme quanto pesa per {client} aspettare un trimestre, numeri alla mano. Se ci riusciamo, il caso si regge da solo.`,
          `Chi ammette di non conoscere la concorrenza spesso è l’unico a cercarla davvero. Giovedì chiedo a un collega che ha chiuso contro un concorrente simile di raccontarti com’è andata, e tu mi riporti quello che scopri dalle fonti.`,
        ],
        bluffCaught: [
          `Competition: campo vuoto. Nessun concorrente mappato, nessuna nota sulle alternative. Una trattativa da {acv} senza concorrenza mappata è una trattativa non studiata. Ti riclassifico alla categoria che i dati sostengono.`,
          `Quello che mi hai raccontato sulle alternative non risulta da nessuna parte: zero allegati, nessuna riunione in cui se ne parli. Se il confronto l’hai fatto davvero, l’hai fatto fuori dal CRM, e a me serve nel CRM. Per ora la chiamata sta dove la portano i fatti.`,
          `Sai cosa mi preoccupa? Che nel CRM non c’è un solo record sul tema. Se domani i concorrenti si facessero avanti, non sapresti cosa dire. La chiamata passa dove la sostengono i dati, e giovedì in deal review prepariamo la mappa delle alternative.`,
        ],
        bluffPassed: [
          `Può darsi. Però una trattativa senza un concorrente è una trattativa strana. Entro giovedì scrivimi nel CRM chi sono le alternative, incluso il non fare nulla, con una frase su ciascuna. Poi la chiamata resta dov’è.`,
          `Ok. Ho un dubbio: nessuna trattativa importante è senza avversari. Venerdì mi mandi il nome di chi pensi sia il secondo in lista, e come fai a saperlo. Se non lo sai, lo cerchiamo insieme.`,
          `Mi hai convinta a metà. Faccio così: lascio la chiamata e mercoledì chiedo a Davide di controllare cosa risulta dalle fonti pubbliche e dal nostro archivio. Se la mappa torna, mi scuso io.`,
        ],
        vague: [
          `Fare il testimone non basta: il responsabile della trattativa sei tu. Dammi un fatto: chi altro è in partita con {client} da due mesi? Intanto la porto un gradino sotto.`,
          `Se non ti preoccupi tu dei concorrenti, chi lo fa? Le impressioni sulla partita sono belle da raccontare, i nomi sono belli da scrivere. Ne basta uno solo, e ne riparliamo; per ora scende di una categoria.`,
          `Sentirsi in vantaggio precede più sconfitte di quante pensi. Voglio un nome e un dato. Per ora la scalo di una categoria.`,
        ],
      },
    },

    /* ─────────── disc · sconto oltre soglia, senza contropartite ─────────── */
    disc: {
      q: [
        `Lo sconto su {client} è oltre la soglia che puoi dare in autonomia. Dimmi cosa compensa il margine che cediamo: durata, volumi, pagamento, una referenza. Una cosa sola, ma concreta.`,
        `Ho davanti la scheda di prezzo: {acv} netti, con uno sconto che pesa sul margine. Ogni punto che regaliamo non torna indietro. Che cosa ci torna in cambio?`,
        `Uno sconto fuori soglia si può fare, {nome}, a una condizione: c’è una contropartita scritta. Qual è? Se la risposta è “il rapporto di fiducia”, passiamo oltre e ne parliamo con Giulia.`,
        `Hai chiamato {claim}, e va bene. Ma il prezzo che porti a quella chiamata l’hai calcolato o l’hai regalato? Dimmi cosa abbiamo ottenuto in cambio.`,
      ],
      honest: [
        `Lo sconto l’ho dato per far chiudere in fretta, senza chiedere niente in cambio. Lo vedo adesso: ho tolto margine e non ho comprato nulla. Riapro il prezzo con Giulia per rientrare nella soglia.`,
        `Ho anticipato il prezzo prima di capire cosa potevamo ottenere. Nessuna durata più lunga, nessun anticipo di pagamento. Abbasso la categoria, e sistemo l’offerta con il Deal Desk entro venerdì.`,
        `È un mio errore: ho confuso lo sconto con la strategia. Ho abbassato il prezzo senza chiedermi cosa ottenevamo. Ripartiamo da una contropartita vera, e la chiamata scende finché l’offerta non rientra.`,
        `Ho ceduto per paura di perdere il contratto, e non è una buona ragione. Con questo prezzo la chiamata non reggeva. Riscrivo l’offerta con uno scambio vero, passando dal Deal Desk, per rientrare nella soglia.`,
      ],
      bluff: [
        `Lo sconto è legato a una durata di tre anni, ed è scritta nei documenti. Il prezzo che vedi è quello che compensa quella durata, senza voci extra né condizioni nascoste. Per me la chiamata regge.`,
        `Ho già sentito Giulia del Deal Desk, e mi ha detto che si può fare perché durata e volumi compensano il margine. Manca solo la conferma formale, che arriva a giorni. Intanto la chiamata resta dov’è.`,
        `È condizionato: c’è un volume minimo garantito e una referenza pubblica, tutto scritto nell’offerta che ho mandato ieri. Il Deal Desk la vede oggi e non ha ancora sollevato rilievi. Per questo non tocco la chiamata.`,
        `È uno scambio equilibrato: noi diamo il prezzo, il contratto ci dà durata e volumi. Il CRM è più prudente di me, ma i conti li ho fatti con attenzione. Il margine complessivo regge anche così.`,
      ],
      vague: [
        `Per un cliente di questa dimensione è uno sconto normale, in linea con quello che si fa sul mercato. Non crea problemi a nessuno e non vedo perché dovremmo farne un caso. Per me la chiamata resta com’è.`,
        `Era necessario per restare competitivi, e sul mercato sono sconti che si fanno. Parliamo di un cliente importante, non c’è niente di strano. Quindi il prezzo finale è in linea e la chiamata può restare così.`,
        `Lo sconto sblocca la decisione, e questo è quello che conta. I dettagli li sistemiamo dopo, quando la decisione sarà presa. Adesso irrigidire la trattativa sarebbe solo tempo perso per tutti.`,
      ],
      react: {
        honest: [
          `Meglio saperlo prima: il margine regalato è il più difficile da recuperare. Domani mattina alle 9 chiamo Giulia del Deal Desk: tu ci porti le condizioni che puoi davvero offrire e ottenere, e rifacciamo l’offerta con uno scambio vero.`,
          `Facciamo così: mi mandi entro mercoledì le condizioni attuali del prezzo, Giulia le guarda e ti propone tre contropartite realistiche. Poi scegli quale inserire nell’offerta.`,
          `Bene che tu lo dica ora. Fino a giovedì nessuna conversazione sul prezzo con il cliente. Giovedì alle 10 ci sono io, c’è Giulia, e studiamo cosa chiedere in cambio dello sconto.`,
        ],
        bluffCaught: [
          `Ho aperto la richiesta di prezzo: nessun accordo pluriennale registrato, nessuna condizione di pagamento, nessun volume garantito. Lo sconto è nudo, e il Deal Desk non ha ricevuto niente da te. La categoria si sposta al livello che i dati sostengono, e prima di parlare di nuovo di prezzo passi da Giulia.`,
          `Capisco la tentazione di raccontare la contropartita prima di averla. Ma il Deal Desk non risulta coinvolto, e senza di loro lo sconto non è approvato, mentre il cliente intanto lo aspetta. Porto la chiamata su {client} dove la sostengono i dati, e mercoledì sistemiamo insieme l’offerta.`,
          `Mi hai descritto uno scambio, ma sul foglio prezzi vedo solo lo sconto. Dov’è l’altra metà? Finché non c’è, il forecast con questo prezzo non regge. La chiamata scende dove la portano i fatti, e ne parliamo giovedì in deal review.`,
        ],
        bluffPassed: [
          `Può essere. Però nell’offerta non vedo le condizioni: entro mercoledì voglio il documento con lo sconto e, accanto, quello che il cliente ha concesso. Se non c’è, il prezzo non esce.`,
          `Va bene, per ora lascio. Giulia ti scrive domani per verificare i dettagli dell’accordo: rispondile entro sera con le carte. Se salta fuori un “non l’ho ancora formalizzato”, ne riparliamo.`,
          `Non mi convince che dello sconto ci sia traccia e della contropartita no. Intanto tengo la chiamata, ma venerdì mattina li voglio sulla stessa pagina.`,
        ],
        vague: [
          `Il mercato non c’entra: la domanda è cosa ci ha dato il cliente in cambio. Dimmi una cosa che posso indicare sul contratto. Intanto la scalo di un gradino.`,
          `Un cliente accetta volentieri qualunque sconto, e per questo non vale come prova. Voglio sapere cosa hai ottenuto: un fatto, scritto. La chiamata scende di una categoria finché non c’è.`,
          `I dettagli sono il posto dove sta il margine. Uno sconto senza contropartita non si sistema dopo: si perde per sempre. Dammi un fatto e rivedo la categoria; intanto la metto un gradino sotto.`,
        ],
      },
    },

    /* ─────────── cap · un tetto strutturale tiene bassa la probabilità ─────────── */
    cap: {
      q: [
        `Nel CRM su {client} c’è un tetto: un blocco che tiene la probabilità sotto una soglia, qualunque cosa faccia il resto. Sai qual è? E soprattutto: cosa fai, concretamente, per toglierlo?`,
        `Una cosa mi dà fastidio. Hai chiamato {claim}, ma la probabilità che vedo io è molto più bassa, e qualcosa in questa trattativa la blocca. Dimmi tu cos’è, prima che lo dica io.`,
        `Ci sono trattative dove tutto sembra a posto tranne una cosa, e quella cosa decide, {nome}. In {client}, qual è? Se non la nomini tu, la nomina il cliente il giorno della firma.`,
        `Ci sono blocchi che la simpatia non scioglie. C’è qualcosa che hai detto, promesso o dato per scontato nei rapporti con {client}, o qualcosa che ti manca, e che ora fa da tappo? Se sì, quando lo sistemi e con chi?`,
      ],
      honest: [
        `Lo so qual è, e per questo la chiamata non regge. Finché non lo tolgo, la probabilità resta sotto quel tetto anche se il resto va bene. Porto la chiamata più in basso e il primo passo è sbloccarlo.`,
        `Ho un blocco serio e ho provato a non guardarlo. Non si risolve con l’ottimismo, e nemmeno con il tempo. Abbasso la chiamata, e già questa settimana scrivo cosa serve per toglierlo, chi lo fa e per quando.`,
        `C’è un problema strutturale e l’ho minimizzato. Ho chiamato troppo in alto, come se non ci fosse, e non ha senso. Errore mio o di percorso, non è risolto: parto dal passo più piccolo e lo scrivo oggi.`,
        `Conosco il problema che ci blocca e l’ho lasciato nelle note invece di affrontarlo. Non ho scuse. La chiamata scende, e lo porto al tavolo giusto prima della chiusura, con una data per ogni passo.`,
      ],
      bluff: [
        `Non vedo un vero blocco: è una questione di tempo, il quadro è allineato e quel punto si risolve in pochi giorni. Ne abbiamo già riparlato in team, lo tengo sotto controllo. Per me la chiamata resta dov’è.`,
        `Il problema di cui parli è già risolto: è stato chiarito nei canali ufficiali e non è più un ostacolo. È il CRM a non essere aggiornato. Lo sistemo oggi stesso e ti mando la conferma scritta.`,
        `È un passaggio formale. Il punto critico è stato chiarito per iscritto e la lettura ufficiale è quella che ci serve: la probabilità reale è più alta di quella a sistema. Resto sulla chiamata, senza dubbi.`,
        `Quel limite è superato: il punto è stato chiuso la settimana scorsa e nessuno lo contesta più. La sostanza è chiusa e lo posso dimostrare con le carte, se serve. Per questo la chiamata regge.`,
      ],
      vague: [
        `Non mi preoccupa: è una cosa che si sistema strada facendo. Il tema è sotto controllo, ne abbiamo parlato con serenità tra di noi e non vedo rischi seri all’orizzonte. Lascio la chiamata dov’è.`,
        `Sul punto che intendi c’è un confronto in corso. Si risolve, non è la prima volta che capita in situazioni così, e c’è interesse a chiudere. Il CRM sarà più prudente, ma mi fido di come andrà a finire.`,
        `Non c’è un vero ostacolo, solo qualche dettaglio da chiarire. Appena il resto si sblocca, tutto torna a posto da solo, come è già successo altre volte. Serve solo un po’ di pazienza, e quella non mi manca.`,
      ],
      react: {
        honest: [
          `Un tetto nominato è mezzo tetto tolto. Giovedì alle 15 ci sediamo in tre, tu, io e Davide, e scriviamo per ogni ostacolo chi fa cosa entro quando. Se serve un livello più alto, la richiesta la firmo io, nei canali previsti.`,
          `Chi nomina il problema ha già fatto metà del lavoro. Domani sera ti mando tre nomi di colleghi che hanno risolto blocchi simili. Scegline uno, parlaci entro venerdì e dimmi cosa ti suggerisce.`,
          `Il tetto è un’informazione, non una condanna. Lunedì alle 9 parliamo con Giulia del Deal Desk e con Ilaria Corti, se serve, e vediamo se il blocco si toglie con una clausola o con un passaggio formale. Vieni con le domande pronte.`,
        ],
        bluffCaught: [
          `Ti rispondo con i dati: il blocco risulta ancora attivo nel CRM, e non c’è nessuna nota di superamento. Se lo avessi risolto con il cliente, avrebbe lasciato una mail o un verbale. Finché il tetto c’è, la probabilità non sale oltre la soglia. La chiamata scende dove la sostengono i dati, e domani lo affrontiamo.`,
          `Dire che un blocco non c’è più non lo toglie. Nel CRM il vincolo è attivo e il campo non viene toccato da settimane. Finché c’è, la probabilità resta ferma sotto la soglia. Porto la chiamata su {client} al livello che i dati sostengono, e in deal review rimettiamo mano al problema con chi può aiutarti.`,
          `Capisco che sia più comodo minimizzare. Ma nella scheda il blocco è marcato come strutturale, e niente indica che sia stato superato. Non ti sto rimproverando, ti dico cosa vedo: da oggi la categoria scende dove la portano i fatti, finché non c’è una prova.`,
        ],
        bluffPassed: [
          `Ok, vediamo. Voglio però la prova che si è sbloccato: una mail, una nota, qualcosa del cliente. Mandamela entro mercoledì. Fino ad allora tengo la chiamata, ma a matita.`,
          `Ok, per ora resta. Però un tetto strutturale che sparisce in una riunione mi sembra troppo comodo: venerdì ti chiedo di mostrarmi come è cambiato il campo nel CRM e cosa c’è scritto.`,
          `Metto una scadenza: giovedì il blocco o è tolto o è scritto come tolto. Intanto lascio com’è; se a quella data non troviamo niente, la chiamata scende senza discussione.`,
        ],
        vague: [
          `I trimestri si perdono sui blocchi che nessuno nomina. Il blocco ha un nome e voglio sentirtelo dire: qual è, e chi lo può togliere? Fino ad allora la chiamata perde un gradino.`,
          `Un blocco non si risolve con le buone sensazioni. Voglio sapere quando è stato l’ultimo passaggio sul punto e quando è il prossimo, e chi lo segue. Dammi una data e vediamo; intanto scende di un gradino.`,
          `Un’ipotesi non è un piano. Dimmi di quale tetto stiamo parlando e cosa succede se non si toglie. Per adesso la scalo di una categoria.`,
        ],
      },
    },

    /* ─────────── meters · il cruscotto (fiducia, valore, urgenza, controllo) è basso ─────────── */
    meters: {
      q: [
        `Il MEDDPICC di {client} sembra pieno, ma guardo i quattro numeri del cruscotto: fiducia, valore, urgenza, controllo. Qualcuno è basso. Le due cose insieme non mi tornano: mi spieghi come stanno in piedi?`,
        `Caselle spuntate e trattativa sana non sono la stessa cosa. Su {client} le caselle ci sono, ma il cliente ti dà poca fiducia, vede poco valore o non ha fretta. Qual è il numero più debole e cosa fai nei prossimi giorni?`,
        `Se domani {client} dovesse decidere con la pancia e non con la scheda, chi voterebbe per noi, {nome}? I miei indicatori dicono che non è del tutto chiaro.`,
        `La scheda è bella, i segnali no. Uno dei quattro indicatori, tra fiducia, valore, urgenza e controllo, è sotto il livello richiesto per {claim}. Quale? E qual è la tua mossa per rialzarlo entro venerdì?`,
      ],
      honest: [
        `Le lettere sono piene ma il quadro no: ho spuntato le caselle senza verificare il clima. Alcuni indicatori sono bassi e non l’ho voluto vedere. Mi sposto più in basso e riordino le priorità da lunedì.`,
        `Ho riempito il MEDDPICC per completezza, non per verità. Nei fatti il cliente è meno avanti di come l’ho raccontato. Il foglio va corretto, e già da mercoledì lavoro proprio sull’indicatore più basso.`,
        `I numeri del cruscotto sono sinceri e io non li guardavo. Ci sono lettere piene ma poche azioni, e il processo non lo guido come dovrei. Ho chiamato troppo presto, e riprendo il controllo da lunedì.`,
        `Sì, c’è una distanza tra scheda e realtà. Le caselle sono piene, ma di decisioni vere non ne ho in mano nessuna. Quindi abbasso la chiamata, e scelgo la leva da toccare per prima entro venerdì sera.`,
      ],
      bluff: [
        `I numeri sono migliori di come appaiono: il cruscotto non cattura gli ultimi due passaggi, andati molto bene. Fiducia e valore sono saliti da quando ho compilato la scheda. Ecco perché ho chiamato così.`,
        `Quelli sono segnali di un momento, non di una tendenza. Il cliente ha avuto una settimana difficile, ma il progetto è saldo e il controllo del processo ce l’ho io. Per me la chiamata regge.`,
        `Il quadro è più solido di quanto dica un indicatore. Di recente le cose sono migliorate, fiducia e urgenza sono salite. Il CRM è rimasto indietro, ma lo recupero in giornata e ti mando la scheda aggiornata.`,
        `Valore e urgenza sono chiari, lo vedo dai documenti e dalle risposte ufficiali. Il controllo del processo ce l’ho in mano. Il CRM è più prudente di me, ma il cruscotto resta più cauto della realtà.`,
      ],
      vague: [
        `Il quadro è positivo e il clima è collaborativo. I numeri sono quello che sono, ma il contesto è buono e questo, alla fine, conta di più: le persone pesano più dei punteggi. Per me la chiamata è giusta.`,
        `Non darei troppo peso agli indicatori: sono una fotografia di un momento. Il progetto sta andando nella direzione giusta e lo sento. Alla fine decidono le persone, e qui le persone sono dalla nostra parte.`,
        `Per me la situazione è sotto controllo. Il cliente si muove nei tempi giusti, anche se i numeri non lo dicono. Non ho segnali che mi facciano cambiare idea, e non vedo perché toccare la chiamata.`,
      ],
      react: {
        honest: [
          `Una scheda piena è la parte facile; la parte vera è il comportamento del cliente. Mercoledì alle 9 facciamo una videochiamata di quaranta minuti, tu, io e Davide: scegliamo la leva che sposta di più e la lavoriamo fino alla chiusura.`,
          `Il cruscotto non mente, la scheda a volte sì. Ti propongo un esercizio: entro giovedì mi scrivi una riga per ciascuno dei quattro indicatori, con la cosa che farai per migliorarlo. Poi la rivediamo insieme.`,
          `Ho visto trimestri salvati da un solo chiarimento chiesto nel posto giusto. Lunedì mattina prepariamo insieme la richiesta per {client}, da far partire nei canali previsti, e tu scrivi cosa chiedere. Ci serve una domanda precisa, non un altro giro di slide.`,
        ],
        bluffCaught: [
          `Mi hai descritto un quadro migliore dei numeri. Io leggo fiducia, valore, urgenza e controllo sotto la soglia richiesta per {claim}, e gli ultimi aggiornamenti non dicono niente di diverso. Nessun incontro registrato spiega una risalita. Ti riclassifico al livello che i dati sostengono.`,
          `Il cruscotto non è un parere. Si muove con quello che fai e che scrivi. Se fosse salito, ci sarebbe un’attività in scheda a spiegarlo; non c’è. La chiamata si ferma dove la sostengono i dati, e martedì in deal review lavoriamo sugli indicatori uno per uno.`,
          `Ho preso i quattro indicatori e li ho confrontati con la tua descrizione: non corrispondono. Se ci fosse stata una svolta, il CRM la mostrerebbe. La categoria si sposta dove la portano i fatti, e giovedì rifacciamo i conti insieme.`,
        ],
        bluffPassed: [
          `Va bene, ma lunedì riapro il cruscotto: se fiducia o urgenza non si sono mosse, riparliamo della categoria. Tienimi pronta una prova di qualcosa che è cambiato, anche solo una mail.`,
          `Va bene. Mi sembra una versione ottimista, ma la tengo. Entro venerdì voglio vedere almeno uno dei quattro indicatori in salita, con la nota che spiega perché.`,
          `Segno tutto. Tengo la chiamata e fisso una verifica a mercoledì: quello che mi racconti deve stare nel CRM, con data e partecipanti. Altrimenti, per me, non è avvenuto.`,
        ],
        vague: [
          `Il rapporto buono è una cosa, la trattativa sana è un’altra. Se i numeri sono bassi ci sarà un motivo: dimmi quale dei quattro, e cosa lo spiega. Per ora la riduco di un livello.`,
          `Gli indicatori sono la fotografia che mando al CRO. Se non ti fidi, dimmi cosa guardi tu: un fatto, una data. Poi ne riparliamo. Intanto la scalo di una categoria.`,
          `Il tempo giusto io lo misuro in date. Che giorno succede la prossima cosa, e chi la fa? Quando c’è, rivediamo la chiamata; intanto scende di un gradino.`,
        ],
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
