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
          o(3, `Capisco. Cari rispetto a cosa? Se mi dice con cosa ci sta confrontando e quanto vale per voi risolvere il problema, vediamo se il confronto è tra cose uguali.`, `Prima chiarisci. Il “troppo caro” è quasi sempre un sintomo: valore non percepito o confronto non omogeneo.`),
          o(2, `Il prezzo riflette il valore che portiamo: guardi i risultati dei nostri clienti.`, `Spostarsi sul valore è giusto, ma senza capire il confronto rischi di parlare a vuoto.`),
          o(1, `Posso farle il 10% di sconto se firma questa settimana.`, `Sconto immediato: hai appena confermato che il prezzo era gonfiato.`),
          o(0, `Chi costa meno poi si paga in altro modo, creda a me.`, `Denigrazione implicita senza prove: suona difensivo e non risponde.`),
        ],
      },
      {
        id: 'pensarci', who: `Direttore Operations`, ctx: `Fine di una demo`, line: `Dobbiamo pensarci. Ci sentiamo il prossimo trimestre.`,
        opts: [
          o(3, `Certo. Per aiutarla a decidere con serenità: cosa dovrebbe essere chiaro perché la decisione sia un sì o un no? E cosa cambierà fra un trimestre che oggi manca?`, `Fai emergere l’obiezione reale e il motivo del rinvio, senza pressione.`),
          o(2, `Capisco. Le mando un riepilogo e fissiamo una call fra due settimane.`, `Mantieni il contatto, ma non scopri cosa blocca davvero.`),
          o(1, `Guardi che l’offerta scade a fine mese.`, `Scadenza artificiale: crea pressione senza ragione e perde credibilità.`),
          o(0, `Va bene, aspetto una sua chiamata.`, `Hai ceduto il controllo: “ti chiamo io” quasi mai arriva.`),
        ],
      },
      {
        id: 'incumbent', who: `CIO`, ctx: `Primo incontro`, line: `Usiamo già un altro fornitore e funziona.`,
        opts: [
          o(3, `Bene, significa che avete un processo maturo. Cosa funziona meglio, e cosa vorreste che facesse e oggi non fa? Se non c’è nulla, non vi faccio perdere tempo.`, `Riconosci l’incumbent e cerchi il gap: o c’è un problema da risolvere o chiudi con onestà.`),
          o(2, `Sì, ma il nostro prodotto è più moderno e ha più funzioni.`, `Differenziazione generica: le funzioni non sono un problema del cliente.`),
          o(1, `Sono sorpreso: so che quel fornitore ha avuto diversi problemi di recente.`, `Denigrare l’incumbent mette il cliente sulla difensiva.`),
          o(0, `Capisco, allora non la disturbo.`, `Rinunci al primo ostacolo. Il “funziona” è l’inizio della discovery, non la fine.`),
        ],
      },
      {
        id: 'budget', who: `Direttore Finanziario`, ctx: `Call di qualificazione`, line: `Non abbiamo budget quest’anno.`,
        opts: [
          o(3, `Capisco. Quanto vi costa oggi tenere il problema com’è? Se il costo supera l’investimento il budget a volte si trova; se no, ha ragione lei, e ci risentiamo.`, `Sposti dal budget al costo dell’inazione, senza forzare e senza arrenderti.`),
          o(2, `Posso proporle un pagamento dilazionato o un avvio ridotto.`, `Soluzione commerciale utile, ma prima verifica se il problema vale l’investimento.`),
          o(1, `Il budget si trova sempre se c’è la volontà.`, `Suona come una forzatura e non ascolta.`),
          o(0, `Peccato, quando avrete budget richiamatemi.`, `Perdi la conversazione e il timing.`),
        ],
      },
      {
        id: 'deck', who: `Responsabile Acquisti`, ctx: `Telefonata a freddo`, line: `Mandami solo una presentazione via mail.`,
        opts: [
          o(3, `Volentieri. Per mandarle solo ciò che le serve, mi aiuta capire in due minuti qual è la sfida principale e chi altro la vedrà? Così la presentazione risponde alle sue domande, non alle mie.`, `Concedi, ma personalizzi e scopri il processo.`),
          o(2, `Certo, gliela invio oggi. Posso chiamarla giovedì per un feedback?`, `Mantieni il follow-up, ma mandi materiale generico.`),
          o(1, `Le presentazioni da sole non spiegano il valore: meglio fare una demo.`, `Insisti su ciò che vuoi tu, ignorando ciò che chiede.`),
          o(0, `Ok, le mando il deck standard.`, `Il deck standard finisce nel cestino. Hai perso la chance di capire.`),
        ],
      },
      {
        id: 'it', who: `Responsabile Operations`, ctx: `Riunione di progetto`, line: `Dobbiamo coinvolgere l’IT, e l’IT è contrario.`,
        opts: [
          o(3, `Giusto coinvolgerli presto. Cosa temono di più? Se mi aiuta a capire le loro preoccupazioni, preparo con il nostro team tecnico una sessione dedicata ai loro criteri.`, `Trasformi l’IT da ostacolo a stakeholder con criteri da soddisfare.`),
          o(2, `Mandiamo loro una scheda tecnica con architettura e sicurezza.`, `Utile ma impersonale: non risponde a paure specifiche.`),
          o(1, `L’IT di solito si oppone ai cambiamenti: non è un problema.`, `Liquidare le preoccupazioni crea una resistenza silenziosa.`),
          o(0, `Posso parlare direttamente con il CEO per superare l’IT?`, `Scavalcare l’IT avvelena il progetto prima di cominciare.`),
        ],
      },
      {
        id: 'competitor', who: `Direttore Acquisti`, ctx: `Negoziazione`, line: `Il vostro concorrente ci ha fatto il 30% in meno.`,
        opts: [
          o(3, `Grazie per avermelo detto. Mi aiuta capire cosa include la loro offerta: perimetro, implementazione, supporto, scalabilità? Mettiamoli affiancati e vediamo se il confronto è tra cose uguali.`, `Confronto “apples to apples” invece di inseguire il prezzo.`),
          o(2, `Posso arrivare al 15% in meno con un impegno più lungo.`, `Give-get corretto, ma prima di dare qualcosa verifica il confronto.`),
          o(1, `Quel prezzo non è sostenibile: nasconde costi aggiuntivi.`, `Affermazione senza prova: sembra un attacco.`),
          o(0, `Allineiamoci al loro prezzo e non ne parliamo più.`, `Hai distrutto margine e credibilità in una frase.`),
        ],
      },
      {
        id: 'roi', who: `CFO`, ctx: `Incontro esecutivo`, line: `Non vedo il ritorno sull’investimento.`,
        opts: [
          o(3, `È un’obiezione giusta. Costruisco con voi il ritorno sui vostri numeri: quanto costa oggi il problema, quanto ne recuperiamo, in quanto tempo. Lei valida le ipotesi, io faccio i conti.`, `Co-creazione del business case con i dati del cliente.`),
          o(2, `Le mostro il ROI medio dei nostri clienti: diciotto mesi.`, `Dato utile ma generico: il cliente vuole i propri numeri.`),
          o(1, `Il ritorno c’è, si fidi: abbiamo oltre cinquecento clienti.`, `Appello all’autorità: non risponde.`),
          o(0, `Il ROI non è tutto: contano anche i benefici qualitativi.`, `Eviti la domanda, e il cliente lo nota.`),
        ],
      },
      {
        id: 'rischio', who: `Direttore Generale`, ctx: `Pre-contratto`, line: `Non vi conosciamo. Siete un fornitore nuovo per noi.`,
        opts: [
          o(3, `Ha ragione a chiederlo. Cosa le darebbe tranquillità: referenze di aziende simili, un pilota limitato con criteri chiari, o garanzie contrattuali sul servizio? Preparo quello che serve di più.`, `Riduci il rischio percepito con opzioni concrete, non con parole.`),
          o(2, `Siamo presenti in quaranta Paesi e abbiamo migliaia di clienti.`, `Dimensione non è affidabilità su quel progetto specifico.`),
          o(1, `Nessuno è mai stato licenziato per aver scelto noi.`, `Slogan: non risolve il rischio concreto.`),
          o(0, `Se non ci conosce, non possiamo farci niente.`, `Chiudi la porta.`),
        ],
      },
      {
        id: 'referenza', who: `Responsabile Qualità`, ctx: `Valutazione`, line: `Voglio parlare con un cliente che l’ha già implementato.`,
        opts: [
          o(3, `Ottima idea, è il modo giusto di decidere. Mi dice cosa vorrebbe chiedergli, così scelgo il cliente più simile a voi per settore e dimensione? Preparo anche un breve brief per rendere la chiamata utile.`, `Segnale d’acquisto: trasformi la richiesta in un passo concreto.`),
          o(2, `Certo, le metto in contatto con un cliente la prossima settimana.`, `Giusto il sì, ma senza scegliere il profilo né preparare il passo.`),
          o(1, `Facciamo prima un’altra demo, poi vediamo le referenze.`, `Rimandi la prova sociale: segno di insicurezza.`),
          o(0, `Le referenze sono riservate.`, `Rifiuto che sembra occultamento.`),
        ],
      },
      {
        id: 'riorg', who: `VP Operations`, ctx: `Chiamata di follow-up`, line: `Non è il momento: stiamo facendo una riorganizzazione.`,
        opts: [
          o(3, `Capisco, una riorganizzazione assorbe energie. Cosa cambia per voi nei prossimi mesi in termini di priorità e responsabilità? Magari proprio il cambiamento rende più urgente avere processi chiari.`, `Esplori e verifichi se la riorganizzazione è un motivo vero o una scusa.`),
          o(2, `Nessun problema, ci risentiamo fra tre mesi.`, `Educato ma passivo: rischi di perdere il contatto con il nuovo organigramma.`),
          o(1, `Proprio per questo vi serve il nostro prodotto.`, `Troppo diretto: non ascolti.`),
          o(0, `Peccato, sempre i tempi sbagliati!`, `Lamentela: nessun valore aggiunto.`),
        ],
      },
      {
        id: 'sconto', who: `Titolare`, ctx: `Chiusura`, line: `Dammi lo sconto adesso e firmo oggi.`,
        opts: [
          o(3, `Mi fa piacere che sia pronto a firmare. Per darle un prezzo migliore devo portare qualcosa al mio responsabile: durata più lunga, firma entro domani, una referenza. Cosa può darmi?`, `Give-get: ogni concessione ha una contropartita.`),
          o(2, `Posso arrivare al 5% se firma oggi.`, `Sconto limitato con scadenza, ma senza contropartita reale.`),
          o(1, `Chiedo al mio responsabile e le dico se riesce a fare il 15%.`, `Mostri disponibilità illimitata: sconto senza scambio.`),
          o(0, `Va bene, 20% e firmiamo adesso.`, `Hai regalato margine e insegnato a spingere.`),
        ],
      },
      {
        id: 'gara', who: `Responsabile Acquisti`, ctx: `Pre-gara`, line: `Gli acquisti ci obbligano a fare una gara con tre offerte.`,
        opts: [
          o(3, `Capisco, è una procedura. Mi aiuta capire i criteri di valutazione e i tempi? Se posso contribuire con elementi utili e neutrali, volentieri: non voglio influenzare la gara, solo aiutarvi a valutare bene.`, `Correttezza più informazione: ti posizioni come partner, non come lobbista.`),
          o(2, `Mi mandi la richiesta di offerta e la compilo con attenzione.`, `Corretto, ma passivo: non conosci i criteri.`),
          o(1, `Possiamo parlare con chi prepara la gara, così scriviamo requisiti adatti?`, `Rischio etico e legale: tentativo di indirizzare.`),
          o(0, `Possiamo evitarla con un affidamento diretto se firmate entro il mese?`, `Proposta di eludere la procedura: linea rossa.`),
        ],
      },
      {
        id: 'passato', who: `Direttore IT`, ctx: `Kick-off`, line: `Il progetto con il fornitore precedente è andato male. Non voglio rifare lo stesso errore.`,
        opts: [
          o(3, `Mi dispiace, e la ringrazio per la franchezza. Cosa è andato storto esattamente, e cosa dovrebbe essere diverso questa volta? Poi costruiamo il piano e le garanzie attorno a quello.`, `Empatia più diagnosi: il cliente ti sta dicendo i suoi criteri di successo.`),
          o(2, `Noi siamo diversi: abbiamo un team di implementazione molto strutturato.`, `Promessa generica senza capire il problema.`),
          o(1, `Ogni progetto è unico, non possiamo garantire nulla.`, `Realismo mal dosato: il cliente cerca rassicurazione concreta.`),
          o(0, `Il vostro fornitore probabilmente non ha seguito le best practice.`, `Colpevolizzi senza conoscere i fatti.`),
        ],
      },
      {
        id: 'tempo', who: `Direttore Commerciale`, ctx: `Telefonata`, line: `Non ho tempo per una demo.`,
        opts: [
          o(3, `Rispetto il suo tempo. Se le chiedessi dieci minuti per capire se ha senso un approfondimento, su quale tema vorrebbe che fossero ben spesi? Se non c’è fit, lo dico io per primo.`, `Rispetti il tempo, offri un impegno minimo e un’uscita onesta.`),
          o(2, `La demo dura solo venti minuti, le mando l’invito.`, `Insisti sul tuo formato senza motivarlo.`),
          o(1, `Capisco, però è importante vederla: tutti i nostri clienti lo fanno.`, `Pressione sociale: non ti apre alcun accesso.`),
          o(0, `Va bene, la richiamo fra sei mesi.`, `Perdi il lead.`),
        ],
      },
      {
        id: 'decide', who: `Responsabile Processi`, ctx: `Discovery`, line: `Non sono io a decidere.`,
        opts: [
          o(3, `Grazie per la sincerità. Come si prende di solito una decisione come questa? Chi ne farà parte, e cosa vorranno sapere? Se vuole, preparo con lei un riassunto che le sia utile per presentarlo internamente.`, `Mappi il processo e trasformi la persona in champion invece che in ostacolo.`),
          o(2, `Mi dice chi decide? Lo contatto io direttamente.`, `Utile, ma rischia di scavalcare la persona.`),
          o(1, `Allora forse sto parlando con la persona sbagliata.`, `Squalifichi chi potrebbe aiutarti.`),
          o(0, `Mi faccia parlare subito con il suo capo.`, `Scavalcamento diretto: perdi un alleato.`),
        ],
      },
    ],
    rounds: 8,
    seconds: 25,
    grade: (pct) => {
      if (pct >= 0.9) return { name: `Cintura nera`, line: `Ascolti prima di rispondere, e le tue domande aprono porte. Insegna agli altri.` };
      if (pct >= 0.75) return { name: `Cintura marrone`, line: `Hai quasi sempre il riflesso giusto: chiarire, riformulare, proporre. Ti manca un po’ di costanza.` };
      if (pct >= 0.55) return { name: `Cintura blu`, line: `Il metodo c’è, ma sotto pressione cadi nello sconto o nel pitch. Rallenta di un secondo.` };
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
