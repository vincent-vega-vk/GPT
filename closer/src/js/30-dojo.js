/* Dojo delle obiezioni · risposte graduate 3 (da closer) → 0 (da evitare) */
(function (g) {
  'use strict';
  const CL = g.CL;
  const o = (g_, t, why) => ({ g: g_, t, why });

  CL.dojo = {
    pool: [
      {
        id: 'prezzo', who: `Responsabile Acquisti`, ctx: `Call di negoziazione`, line: `Siete troppo cari.`,
        opts: [
          o(3, `Cari rispetto a cosa, e con quale offerta ci confronta? Vediamo insieme se il confronto è tra cose uguali.`, `Prima chiarisci. Il “troppo caro” è quasi sempre un sintomo: valore non percepito o confronto non omogeneo.`),
          o(2, `Il prezzo riflette il valore che portiamo: i nostri clienti rientrano dell’investimento in meno di due anni.`, `Spostarsi sul valore è giusto, ma senza capire il confronto rischi di parlare a vuoto.`),
          o(1, `Posso venirle incontro con il 10% di sconto se firma entro venerdì. Le sembra un buon punto di partenza?`, `Sconto immediato: hai appena confermato che il prezzo era gonfiato.`),
          o(0, `Non teme i costi che oggi non vede? Chi costa meno poi si fa pagare in altro modo, tra assistenza e migrazioni.`, `Denigrazione implicita senza prove: suona difensivo e non risponde.`),
        ],
      },
      {
        id: 'pensarci', who: `Direttore Operations`, ctx: `Fine di una demo`, line: `Dobbiamo pensarci. Ci sentiamo il prossimo trimestre.`,
        opts: [
          o(3, `Certo. Mi dica cosa deve essere chiaro perché la scelta sia un sì o un no, e cosa cambia da qui a un trimestre.`, `Fai emergere l’obiezione reale e il motivo del rinvio, senza pressione.`),
          o(2, `Nessun problema. Intanto le mando un riepilogo e fissiamo una call di venti minuti fra due settimane. Va bene?`, `Mantieni il contatto, ma non scopri cosa blocca davvero.`),
          o(1, `Capisco, ma vorrebbe davvero rinunciare alle condizioni attuali? L’offerta in corso vale solo fino a fine mese.`, `Scadenza artificiale: crea pressione senza ragione e perde credibilità.`),
          o(0, `Va bene, nessun problema. Aspetto una sua chiamata quando avrete le idee più chiare e il tempo di valutare.`, `Hai ceduto il controllo: “ti chiamo io” quasi mai arriva.`),
        ],
      },
      {
        id: 'incumbent', who: `CIO`, ctx: `Primo incontro`, line: `Usiamo già un altro fornitore e funziona.`,
        opts: [
          o(3, `Bene, avete un processo maturo. Cosa vorreste che facesse e oggi non fa? Se non manca nulla, mi fermo qui.`, `Riconosci il fornitore attuale e cerchi cosa manca: o c’è un problema da risolvere o chiudi con onestà.`),
          o(2, `Certo. Il nostro prodotto è più moderno e ha più funzioni: le va di vederne due o tre? Bastano venti minuti.`, `Differenziazione generica: le funzioni non sono un problema del cliente.`),
          o(1, `Mi sorprende. So che quel fornitore ha avuto diversi problemi di recente, anche con clienti del vostro settore.`, `Denigrare il fornitore attuale mette il cliente sulla difensiva.`),
          o(0, `Capisco, se funziona non serve insistere. Mi faccia sapere se in futuro dovesse servirle altro, d’accordo?`, `Rinunci al primo ostacolo. Il “funziona” è l’inizio della discovery, non la fine.`),
        ],
      },
      {
        id: 'budget', who: `Direttore Finanziario`, ctx: `Call di qualificazione`, line: `Non abbiamo budget quest’anno.`,
        opts: [
          o(3, `Quanto vi costa oggi il problema? Se supera l’investimento il budget a volte si trova; se no, ha ragione lei.`, `Sposti dal budget al costo dell’inazione, senza forzare e senza arrenderti.`),
          o(2, `Posso proporle un pagamento in dodici rate o un avvio su un solo reparto. Per voi la spesa sarebbe minima.`, `Soluzione commerciale utile, ma prima verifica se il problema vale l’investimento.`),
          o(1, `Con tutto il rispetto, il budget si trova sempre se c’è la volontà: è questione di priorità, più che di cifre.`, `Suona come una forzatura e non ascolta.`),
          o(0, `Peccato. Aspettiamo il prossimo esercizio: mi richiama lei quando avrete il budget approvato, d’accordo?`, `Perdi la conversazione e il momento giusto.`),
        ],
      },
      {
        id: 'deck', who: `Responsabile Acquisti`, ctx: `Telefonata a freddo`, line: `Mi mandi solo una presentazione via mail.`,
        opts: [
          o(3, `Volentieri. Le preparo quattro pagine su misura: mi dica qual è la sfida principale e chi altro le vedrà.`, `Concedi, ma personalizzi e scopri il processo.`),
          o(2, `Certo, gliela invio oggi. Posso chiamarla giovedì mattina per sentire cosa ne pensa e rispondere a ogni dubbio?`, `Fissi il ricontatto, ma mandi materiale generico.`),
          o(1, `Le presentazioni da sole dicono poco. Non è meglio vedere il prodotto dal vivo? Bastano venti minuti giovedì.`, `Insisti su ciò che vuoi tu, ignorando ciò che chiede.`),
          o(0, `Ok, le mando oggi la presentazione standard, con tutte le funzioni e i prezzi di listino. Va bene così?`, `La presentazione standard finisce nel cestino. Hai perso l’occasione di capire.`),
        ],
      },
      {
        id: 'it', who: `Responsabile Operations`, ctx: `Riunione di progetto`, line: `Dobbiamo coinvolgere l’IT, e l’IT è contrario.`,
        opts: [
          o(3, `Cosa temono di più? Coinvolgerli presto è giusto: preparo con i nostri tecnici una sessione sui loro criteri.`, `Trasformi l’IT da ostacolo a interlocutore, con criteri da soddisfare.`),
          o(2, `Certo. Preparo una scheda di tre pagine per l’IT, con architettura e sicurezza. La inoltra lei o scrivo io?`, `Utile ma impersonale: non risponde a paure specifiche.`),
          o(1, `L’IT di solito è contrario a ogni novità. È normale: non è un vero ostacolo e possiamo andare avanti sul piano.`, `Liquidare le preoccupazioni crea una resistenza silenziosa.`),
          o(0, `Parlo direttamente con il CEO. Se lui è convinto, l’IT si adeguerà e il progetto parte senza altri ritardi.`, `Scavalcare l’IT avvelena il progetto prima di cominciare.`),
        ],
      },
      {
        id: 'competitor', who: `Direttore Acquisti`, ctx: `Negoziazione`, line: `Il vostro concorrente ci ha fatto il 30% in meno.`,
        opts: [
          o(3, `Grazie, è utile saperlo. Confrontiamo le offerte: cosa copre la loro tra perimetro, implementazione e supporto?`, `Confronto tra cose omogenee invece di inseguire il prezzo.`),
          o(2, `Posso scendere del 15%. Le interessa come punto di partenza? In cambio vi chiedo di passare da due a tre anni.`, `Scambio corretto, ma prima di dare qualcosa verifica il confronto.`),
          o(1, `Senza voler insinuare: ha verificato il perimetro? Un prezzo così basso nasconde spesso costi aggiuntivi.`, `Affermazione senza prova: sembra un attacco.`),
          o(0, `Capisco. Mi dica il loro prezzo e ci allineiamo subito: chiudiamo la trattativa oggi e non ne parliamo più.`, `Hai distrutto margine e credibilità in una frase.`),
        ],
      },
      {
        id: 'roi', who: `CFO`, ctx: `Incontro esecutivo`, line: `Non vedo il ritorno sull’investimento.`,
        opts: [
          o(3, `Partiamo dai vostri numeri: costo attuale, recupero e tempi. Lei valida le ipotesi, io i conti entro venerdì.`, `Costruisci il caso economico insieme al cliente, partendo dai suoi dati.`),
          o(2, `Le mostro il ROI medio dei nostri clienti del settore. Il rientro è di diciotto mesi su una trentina di casi.`, `Dato utile ma generico: il cliente vuole i propri numeri.`),
          o(1, `Capisco. Il ritorno c’è, si fidi: abbiamo oltre cinquecento clienti. Resterebbero con noi, se non fosse così?`, `Appello all’autorità: non risponde.`),
          o(0, `Non considera i benefici qualitativi? Il ROI non è tutto: contano anche meno errori e più serenità nel team.`, `Eviti la domanda, e il cliente lo nota.`),
        ],
      },
      {
        id: 'rischio', who: `Direttore Generale`, ctx: `Pre-contratto`, line: `Non vi conosciamo. Siete un fornitore nuovo per noi.`,
        opts: [
          o(3, `Ha ragione. Cosa la rassicurerebbe di più: due referenze simili, un pilota di tre mesi o garanzie di servizio?`, `Riduci il rischio percepito con opzioni concrete, non con parole.`),
          o(2, `Siamo presenti in quaranta Paesi con migliaia di clienti: tra loro ci sono diversi gruppi quotati in Borsa.`, `Dimensione non è affidabilità su quel progetto specifico.`),
          o(1, `Si dice che nessuno sia mai stato licenziato per aver scelto noi. Non le basta come garanzia per cominciare?`, `Slogan: non risolve il rischio concreto.`),
          o(0, `Capisco, ma se non ci conosce non possiamo farci niente: un fornitore nuovo parte sempre così. Ne riparliamo?`, `Chiudi la porta senza offrire nulla per ridurre il rischio.`),
        ],
      },
      {
        id: 'referenza', who: `Responsabile Qualità`, ctx: `Valutazione`, line: `Voglio parlare con un cliente che l’ha già implementato.`,
        opts: [
          o(3, `Ottima idea. Scelgo il cliente più simile a voi per settore e preparo una scaletta. Cosa vorrebbe chiedergli?`, `Segnale d’acquisto: trasformi la richiesta in un passo concreto.`),
          o(2, `Certo, la metto in contatto con un nostro cliente. Le va bene la prossima settimana? Mi indichi due date.`, `Giusto il sì, ma senza scegliere il profilo né preparare il passo.`),
          o(1, `Prima facciamo un’altra demo, così avrà un quadro completo. Poi vediamo anche le referenze, con più calma.`, `Rimandi la prova sociale: segno di insicurezza.`),
          o(0, `Le referenze sono riservate per contratto: posso però mandarle due casi di studio scritti e i dati di soddisfazione.`, `Rifiuto che sembra occultamento: due casi scritti non valgono la voce di un cliente.`),
        ],
      },
      {
        id: 'riorg', who: `VP Operations`, ctx: `Chiamata di follow-up`, line: `Non è il momento: stiamo facendo una riorganizzazione.`,
        opts: [
          o(3, `Capisco. Mi racconti cosa cambia in azienda: a volte una riorganizzazione rende urgente avere processi chiari.`, `Esplori e verifichi se la riorganizzazione è un motivo vero o una scusa.`),
          o(2, `Nessun problema, ci risentiamo fra tre mesi a riorganizzazione conclusa. Le scrivo io per la data, va bene?`, `Educato ma passivo: rischi di perdere il contatto con il nuovo organigramma.`),
          o(1, `Con meno risorse non le pare che convenga automatizzare? Proprio per questo vi serve il nostro prodotto.`, `Troppo diretto: non ascolti.`),
          o(0, `Peccato, sempre i tempi sbagliati! Quando la riorganizzazione sarà finita, posso richiamarla per riparlarne?`, `Lamentela: nessun valore aggiunto.`),
        ],
      },
      {
        id: 'sconto', who: `Titolare`, ctx: `Chiusura`, line: `Mi dia lo sconto adesso e firmo oggi.`,
        opts: [
          o(3, `Per scendere di prezzo mi serve una contropartita: un contratto da tre anni o una referenza. Cosa può darmi?`, `Scambio: ogni concessione ha una contropartita.`),
          o(2, `Va bene, posso fare il 5% se firma oggi: è il massimo che posso concedere senza chiedere altre autorizzazioni.`, `Sconto limitato con scadenza, ma senza contropartita reale.`),
          o(1, `Le basterebbe il 15% per firmare oggi? Chiedo al mio responsabile e le dico subito se riusciamo ad arrivarci.`, `Mostri disponibilità illimitata: sconto senza scambio.`),
          o(0, `Va bene, facciamo il 20% e firmiamo adesso. Preparo subito il contratto con la nuova cifra e glielo invio.`, `Hai regalato margine e insegnato a spingere.`),
        ],
      },
      {
        id: 'gara', who: `Responsabile Acquisti`, ctx: `Pre-gara`, line: `Gli acquisti ci obbligano a fare una gara con tre offerte.`,
        opts: [
          o(3, `Quali sono i criteri e i tempi della gara? Posso dare elementi neutrali, senza influenzare la valutazione.`, `Correttezza più informazione: ti posizioni come partner, non come lobbista.`),
          o(2, `Certo. Mi mandi la richiesta di offerta e la compilo con molta cura. Entro quando devo consegnarla, e a chi?`, `Corretto, ma passivo: non conosci i criteri.`),
          o(1, `Mi metto in contatto con chi prepara la gara. Contribuisco a scrivere requisiti adatti alle vostre esigenze.`, `Rischio etico e legale: tentativo di indirizzare.`),
          o(0, `Potremmo evitare la gara con un affidamento diretto, le sembra una via praticabile? Basterebbe firmare entro il mese.`, `Proposta di eludere la procedura: linea rossa.`),
        ],
      },
      {
        id: 'passato', who: `Direttore IT`, ctx: `Kick-off`, line: `Il progetto con il fornitore precedente è andato male. Non voglio rifare lo stesso errore.`,
        opts: [
          o(3, `Mi dispiace, e grazie della franchezza. Cosa è andato storto, e cosa deve cambiare stavolta? Partiamo da lì.`, `Empatia più diagnosi: il cliente ti sta dicendo i suoi criteri di successo.`),
          o(2, `Noi siamo diversi. Abbiamo un team di implementazione strutturato, con un referente unico. Le dà sicurezza?`, `Promessa generica senza capire il problema.`),
          o(1, `Capisco. Ogni progetto è unico e non possiamo garantire nulla, ma faremo il possibile per evitare errori.`, `Realismo mal dosato: il cliente cerca rassicurazione concreta.`),
          o(0, `Il fornitore precedente non seguiva le buone pratiche, vero? Succede spesso nei progetti di questa dimensione.`, `Colpevolizzi senza conoscere i fatti.`),
        ],
      },
      {
        id: 'tempo', who: `Direttore Commerciale`, ctx: `Telefonata`, line: `Non ho tempo per una demo.`,
        opts: [
          o(3, `Rispetto il suo tempo. Su quale tema userebbe volentieri dieci minuti? Se non ne vale la pena, lo dico io.`, `Rispetti il tempo, offri un impegno minimo e un’uscita onesta.`),
          o(2, `La demo dura solo venti minuti e la faccio io in persona. Le va bene giovedì alle dieci? Le mando l’invito.`, `Insisti sul tuo formato senza motivarlo.`),
          o(1, `Capisco, ma è importante vederla: tutti i nostri clienti hanno iniziato da lì. Non vorrebbe scoprire perché?`, `Pressione sociale: non ti apre alcun accesso.`),
          o(0, `Va bene, la richiamo fra sei mesi, quando magari avrà più tempo. Intanto le lascio il mio numero diretto.`, `Perdi il contatto e ogni controllo sui tempi.`),
        ],
      },
      {
        id: 'decide', who: `Responsabile Processi`, ctx: `Discovery`, line: `Non sono io a decidere.`,
        opts: [
          o(3, `Mi racconti come si decide di solito e chi partecipa: preparo con lei una pagina di sintesi per i colleghi.`, `Mappi il processo e trasformi la persona in un sostenitore interno invece che in un ostacolo.`),
          o(2, `Mi dica chi decide. Lo contatto io direttamente con una breve mail domani, così non le faccio perdere tempo.`, `Utile, ma rischia di scavalcare la persona.`),
          o(1, `Allora forse sto parlando con la persona sbagliata. Con chi dovrei sentirmi per sbloccare la valutazione?`, `Squalifichi chi potrebbe aiutarti.`),
          o(0, `Mi faccia parlare subito con il suo capo, così risolviamo in mezz’ora. Può organizzare un incontro per domani?`, `Scavalcamento diretto: perdi un alleato.`),
        ],
      },
    ],
    rounds: 8,
    seconds: 25,
    grade: (pct) => {
      if (pct >= 0.9) return { name: `Cintura nera`, line: `Ascolti prima di rispondere, e le tue domande aprono porte. Insegna agli altri.` };
      if (pct >= 0.75) return { name: `Cintura marrone`, line: `Hai quasi sempre il riflesso giusto: chiarire, riformulare, proporre. Ti manca un po’ di costanza.` };
      if (pct >= 0.55) return { name: `Cintura blu`, line: `Il metodo c’è, ma sotto pressione cadi nello sconto o nel discorso preconfezionato. Rallenta di un secondo.` };
      if (pct >= 0.35) return { name: `Cintura verde`, line: `Reagisci più che rispondere. Prova la sequenza: ascolta, chiarisci, poi riformula.` };
      return { name: `Cintura bianca`, line: `Ogni obiezione è una domanda travestita. Parti da lì.` };
    },
  };

  /* costruisce un round: n obiezioni casuali, opzioni mescolate */
  CL.dojo.build = (rnd, n) => {
    const picks = CL.shuffle(CL.dojo.pool, rnd).slice(0, n || CL.dojo.rounds);
    return picks.map((q) => ({ id: q.id, who: q.who, ctx: q.ctx, line: q.line, opts: CL.shuffle(q.opts, rnd) }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
