/* CLOSER · banca testi forecast B: Marta apre la call, invita a compilare il foglio, poi sandbagging, rischio,
   trattative non lavorate, copertura della quota, chiusura della call e giorno di chiusura (CL.FCBANK).
   Chiavi: open, sheet, sandbag, risk, unworked, coverage, wrap, closing (le “gaps” stanno in 33-fc-gaps.js).
   Marta dà del tu, è equa: premia la franchezza, smonta il bluff con i dati del CRM, non sopporta né i numeri
   gonfiati né quelli abbassati per comodità. Le battute di Marta sono solo parlato.

   Regole di scrittura (il motore pesca ogni riga a caso, in modo indipendente dalla risposta scelta):
   - le reazioni di un blocco devono reggere dopo QUALUNQUE variante dello stesso blocco: mai citare parole o dettagli
     di una sola risposta del giocatore; parlano di ciò che dice il CRM, non di ciò che è stato detto;
   - segnaposto per blocco (12-forecast.js): sandbag, risk, unworked → {client} {claim} {truth} {acv} {nome};
     coverage, wrap, open, sheet, closing.intro/fc* → solo {nome}; closing.won/lost/slip → solo {client} e {acv};
     {who} compare solo in risk.name, sempre a inizio frase (il motore lo sostituisce con sc.fc.risk);
   - nelle reazioni {claim} è la categoria DOPO la risoluzione (dopo “correct” coincide con {truth});
   - niente {p}: in modalità “senza rete” la probabilità resta nascosta;
   - {client} mai prima di un punto (nomi come “S.r.l.”) e mai con un participio che concordi con lui;
     {nome} mai a inizio frase (il fallback è “collega”);
   - nessun aggettivo o participio che concordi con il genere del giocatore; le sole forme femminili sono di Marta;
   - le opzioni del giocatore di uno stesso blocco hanno lunghezza e registro simili: la risposta giusta non si
     riconosce dal tono; risk.name conta anche la frase di sc.fc.risk (circa 100-175 caratteri) che il motore aggiunge;
   - closing.won/lost/slip vengono lette di seguito per più trattative: niente “anche”, “ancora”, “un’altra”;
   - le trattative non lavorate (unworked) esistono solo nella call di metà trimestre; dopo un “plan” la scadenza
     è fissata a tre settimane. */
(function (g) {
  'use strict';
  const CL = (g.CL = g.CL || {});
  CL.FCBANK = CL.FCBANK || {};

  Object.assign(CL.FCBANK, {
    /* ─────────── Apertura della call: scena in videochiamata, 2-3 righe ─────────── */
    open: {
      mid: [
        [
          { w: 'marta', a: 'entra in videochiamata, una tazza in mano', t: 'Ci sei? Perfetto. Metà trimestre: il momento in cui le pipeline smettono di essere racconti e diventano numeri.' },
          { w: 'marta', a: 'condivide lo schermo con il CRM', t: 'Il CRO vuole il roll-up del team entro fine settimana. Io voglio dargli un numero che regga. Mi aiuti?' },
        ],
        [
          { w: 'marta', a: 'si sistema le cuffie', t: 'Ciao, {nome}. Ho il tuo CRM aperto da un quarto d’ora e l’ho letto come un romanzo.' },
          { w: 'marta', a: 'sorride appena', t: 'Alcuni capitoli sono bellissimi. Altri sono fantascienza. Facciamo la pipeline review e li separiamo.' },
        ],
        [
          { w: 'marta', a: 'ruota la sedia verso la camera', t: 'Arrivo da una riunione con la finanza: hanno già chiesto come sta il trimestre. Indovina chi risponde.' },
          { w: 'marta', a: 'guarda un secondo fuori campo', t: 'A metà trimestre, di solito, una trattativa su due non è più quella che avevamo raccontato a inizio. Non voglio scoprirlo alla fine: voglio scoprirlo adesso.' },
          { w: 'marta', a: 'torna sullo schermo', t: 'Quindi poche chiacchiere: un foglio e qualche domanda. Io sono dalla tua parte, ma il CRM è dalla parte dei fatti.' },
        ],
        [
          { w: 'marta', a: 'appoggia i gomiti sulla scrivania', t: 'Il CRO mi ha chiesto due volte, in una settimana, se il trimestre tiene. Gli ho risposto che prima ne parlo con ognuno di voi.' },
          { w: 'marta', a: 'alza un sopracciglio', t: 'Regole semplici, {nome}: tu mi dici le cose come stanno, io ti aiuto dove posso. Se mi racconti una storia, il CRM me ne racconta un’altra, e vince il CRM.' },
        ],
      ],
      final: [
        [
          { w: 'marta', a: 'appare in videochiamata, giacca sullo schienale', t: 'Eccoci. Ultima chiamata prima della chiusura. Il CRO ha già bloccato l’agenda: aspetta il numero.' },
          { w: 'marta', a: 'abbassa la voce', t: 'Non voglio un numero bello, voglio un numero vero. Lo porto io al CRO con la mia firma, e la mia firma regge solo se regge la tua.' },
        ],
        [
          { w: 'marta', a: 'si toglie gli occhiali e li appoggia sul tavolo', t: 'Commit call. Quello che metti in Commit finisce sul roll-up con il tuo nome, e davanti al CRO lo difendo io.' },
          { w: 'marta', a: 'guarda lo schermo', t: 'Quindi niente atmosfera, niente “mi ha detto che ci siamo”. Fatti, date, persone. Poi, se serve, una battuta: ne ho una scorta.' },
        ],
        [
          { w: 'marta', a: 'entra in call con il telefono ancora in mano', t: 'Scusa, il CRO mi ha scritto tre volte in dieci minuti. Vuole sapere se il trimestre chiude in verde.' },
          { w: 'marta', a: 'posa il telefono a faccia in giù', t: 'Io una risposta non ce l’ho ancora. Ce l’hai tu, spero. Dopo il foglio ti faccio le domande che farebbe lui.' },
          { w: 'marta', a: 'si appoggia allo schienale', t: 'Meglio da me oggi che da lui domani.' },
        ],
        [
          { w: 'marta', a: 'condivide lo schermo con il roll-up di area', t: 'Qui c’è il numero di tutti i team. Il tuo pezzo conta più di quanto pensi: sposta la riga.' },
          { w: 'marta', a: 'sospira e sorride', t: 'Non cerco un eroe, cerco un forecast. Se sei fuori, dimmelo adesso: da qui in poi ogni sorpresa la devo spiegare io.' },
        ],
      ],
    },

    /* ─────────── Invito a compilare il foglio (Commit, Best Case, Pipeline, Fuori) ─────────── */
    sheet: {
      mid: [
        'Ti apro il foglio. Una casella per trattativa: Commit se firma nel trimestre e ci metti la faccia, Best Case se può chiudere ma manca ancora qualcosa, Pipeline se esiste ma non è prevedibile, Fuori se non firma.',
        'Passiamo ai numeri. Se ce ne sono che non hai ancora toccato, le trovi già compilate con la categoria del CRM: non l’ho scelta io e non è detto che sia quella giusta. Controllale una per una.',
        'Il foglio è pronto: Commit, Best Case, Pipeline, Fuori. Prenditi il tempo che serve, ma ricorda che quello che scrivi lo difendo io davanti al CRO. Un auspicio non è Commit, e un fatto non è Pipeline: metti ogni trattativa dove sta.',
        'Compila pure. Una categoria per trattativa, nessun pari merito. Se sei in dubbio tra due caselle, scegli quella che sapresti difendere davanti a me, non quella che ti fa stare più comodo.',
      ],
      final: [
        'Ultimo foglio del trimestre. Commit, Best Case, Pipeline, Fuori: una casella per trattativa. Quello che scrivi lo porto al CRO così com’è, quindi scrivilo come vorresti rileggerlo il giorno dopo la chiusura.',
        'Ecco il foglio. Stavolta non ci sono settimane per recuperare: la firma arriva o non arriva. Metti ogni trattativa dove la metterebbe un osservatore esterno: né dove la metteresti nei sogni, né dove la metteresti negli incubi.',
        'Compila il foglio. Commit per quello che firma, Best Case per quello che potrebbe, Fuori senza imbarazzo per quello che sai già che non arriva. Nessuno ha mai premiato chi riempie la prima colonna per riflesso, e nessuno chi la svuota per paura.',
        'Foglio finale. Ogni trattativa in sospeso ha bisogno di una categoria, e io di una ragione per ciascuna. Se la ragione non c’è, la categoria non regge, né in su né in giù.',
      ],
    },

    /* ─────────── Sandbagging: hai chiamato più in basso di quanto i dati sostengono ─────────── */
    sandbag: {
      q: [
        `Hai messo {client} in {claim}. I dati della scheda, a casa mia, si chiamano {truth}. Perché tieni così bassa una trattativa da {acv}?`,
        `Un forecast tenuto basso è scorretto quanto uno gonfiato, solo più comodo. {client} sta in {claim}, i dati dicono {truth}. Spiegami da dove viene la differenza.`,
        `Questa è al contrario del solito. {client} in {claim}, con una scheda che ha tutto per essere {truth}. Se la tieni bassa per avere una sorpresa da raccontare, con me non funziona.`,
        `Dimmi se sbaglio, {nome}: {client} in {claim}, {acv} sul tavolo e un CRM che la legge {truth}. Se firma, fai bella figura. Se non firma, avevi avvisato. In entrambi i casi hai coperto te, non me.`,
        `{client}: chiamata {claim}, lettura dei dati {truth}. O mi manca un pezzo che hai solo tu, o stai tenendo una carta nel cassetto. Quale delle due?`,
      ],
      correct: [
        `Hai ragione: l’avevo tenuta bassa per prudenza, ma i dati dicono {truth}. La alzo adesso e ne rispondo, così ci lavori anche tu. Meglio una correzione mia che una tua.`,
        `Ho abbassato per prudenza e non per ragioni: guardando la scheda, {client} sta in {truth}. Preferisco dirtelo io che farmelo dire dal CRM, quindi correggo.`,
        `Non ho un buon motivo per averla tenuta bassa. Volevo stare al riparo, ma i fatti dicono {truth} e tenerli sotto non aiuta nessuno. Alzo la chiamata e scrivo la ragione nel CRM.`,
        `Avevo paura di dover spiegare uno slittamento, e per questo ho abbassato. Ma i fatti per {truth} ci sono. Porto la chiamata lì e ne rispondo, anche davanti al CRO.`,
      ],
      stay: [
        `Preferisco sotto-promettere e sorprendere: se firma, è una buona notizia per tutti; se slitta, non abbiamo promesso niente al CRO. Per ora {client} resta in {claim}.`,
        `La mia lettura è più prudente della scheda: ci sono variabili che il CRM non vede. Finché il contratto non è firmato, per me {client} resta in {claim}.`,
        `I numeri dicono {truth}, ma io li vedo da dentro e non mi convincono del tutto. Il mio compito è non promettere più di quello che consegno: la lascio in {claim}.`,
      ],
      vague: [
        `Non saprei, la vedo in movimento e potrebbe andare in un senso o nell’altro. Non vorrei sbilanciarmi: lascerei la categoria com’è e vediamo come evolve nei prossimi giorni.`,
        `Dipende da un paio di cose che devono ancora chiarirsi. Più che sulla categoria, mi concentrerei sui prossimi passi, e quando c’è qualcosa di certo aggiorno il foglio.`,
        `È una di quelle trattative che si capiscono strada facendo. Una categoria oggi sarebbe una fotografia sfocata: tengo il foglio com’è e ti dico appena mette a fuoco.`,
      ],
      react: {
        correct: [
          `Ecco. Questa è la correzione che mi serve: detta da te e non scoperta da me. {client} va in {truth}, e se ci metti il nome sopra, io ci metto il mio quando parlo con il CRO.`,
          `Apprezzo, e non è scontato: abbassare è comodo, rialzare costa. D’ora in poi, se la scheda e il foglio non coincidono, chiamami tu per primo. Segnato in {truth}.`,
          `Bene. Una chiamata onesta vale più di una chiamata prudente. Adesso che {client} è in {truth}, dimmi cosa serve per portarla a casa: se c’è un ostacolo, lo guardo con te.`,
        ],
        stay: [
          `Capisco il riflesso, ma non lo condivido. Se tieni bassa una trattativa che i dati sostengono, non mi proteggi: mi togli informazioni. Lo segno, e se firma ne riparliamo.`,
          `La prudenza è una virtù finché non diventa un alibi. Il CRM dice {truth}, tu dici {claim}: per ora lascio la tua chiamata, ma la annoto. Se firma, mi spieghi perché non me l’avevi detto.`,
          `Se poi firma, il CRO vede un forecast sbagliato per difetto, e per me pesa quanto uno sbagliato per eccesso. Lo registro, e a fine trimestre rifacciamo il conto.`,
        ],
        vague: [
          `Questa non è una categoria del foglio. Lascio la chiamata com’è, ma la registro come prudenza senza motivo. La prossima volta voglio una ragione, non un’impressione.`,
          `Non mi hai detto né sì né no, e capisco perché: dire sì ti espone. Ma il mio mestiere è difenderti, e per farlo mi serve una posizione. Per ora il foglio resta così; la prossima volta scegli.`,
          `Sento tanta cautela e poca informazione. Lascio com’è, ma annoto che la tua lettura e la mia non coincidono: ne riparliamo con i dati davanti.`,
        ],
      },
    },

    /* ─────────── Rischio: la chiamata torna, ma cosa può farla saltare? ─────────── */
    risk: {
      q: [
        `Il foglio e i dati si parlano: bene. Allora la domanda che faccio a tutti, su {client} come su qualunque altra trattativa: cosa può far saltare la firma? Il rischio più probabile, non il catalogo.`,
        `{client} in {claim}: torna. Adesso fai il mio lavoro al posto mio e dimmi come potrebbe andare male. Se non lo sai tu, lo scopre il CRO.`,
        `Pre-mortem. Immagina di essere a fine trimestre: {client} non ha firmato e io ti chiamo. Qual è stata la ragione principale? Dimmela adesso, e dimmi cosa stai facendo per evitarla.`,
        `Non ti contesto niente, ti chiedo un favore. Indicami dove la tua chiamata su {client} è più fragile, e cosa stai facendo per rinforzarla.`,
        `Mi piace quando le chiamate tornano, e subito mi insospettisco. Qual è la cosa che su {client} ti toglie il sonno? E quanto la senti vicina?`,
      ],
      name: [
        `{who} Ho un passo in agenda per verificarlo; se si blocca, scendo io di categoria.`,
        `{who} Il piano B è nel CRM: se non vedo un segnale, abbasso io la categoria.`,
        `{who} So chi deve fare cosa e per quando; se non si muove, ti chiedo aiuto.`,
        `{who} Mi faccio mettere in copia sul passaggio critico e fisso una data.`,
        `{who} Chiedo al cliente una risposta secca: se non mi convince, scendo di categoria.`,
      ],
      overconf: [
        `Su {client} non vedo nessun rischio concreto: il cliente è allineato, i tempi sono quelli e il percorso è lineare. Resta la parte formale, e da qui alla chiusura non c’è niente che possa saltare, nemmeno a cercarlo.`,
        `Per me nessun rischio da segnalare. Abbiamo fatto tutto quello che c’era da fare e il cliente ha dato segnali chiari a ogni passaggio, anche sui punti scomodi. Se proprio devo cercarne uno, direi la sfortuna, e quella non si pianifica.`,
        `Nessun rischio che valga la pena nominare: sono tutti d’accordo, ho ricontrollato più volte e non c’è un punto aperto. Per me questa firma è questione di giorni, e non voglio inventare una preoccupazione solo per riempire il foglio.`,
      ],
      vague: [
        `Rischi ce ne sono sempre, in qualsiasi trattativa. Il cliente ha i suoi tempi e io faccio la mia parte, ma finché non firmano non si può escludere niente. Mi sembra più onesto non indicare un punto solo, che poi sembrerebbe l’unico.`,
        `Può succedere di tutto: un cambio di priorità, un ritardo interno, un imprevisto. Sono cose che non dipendono da me, quindi le tengo d’occhio e vediamo come va. Difficile dire quale sia la più probabile senza sbagliare mira.`,
        `Diciamo che la variabile principale è il tempo. Se le cose procedono come ora va tutto bene, altrimenti vedremo. Un punto preciso non saprei indicarlo, ma tengo d’occhio come si muove il cliente e ti avviso se cambia qualcosa.`,
      ],
      react: {
        name: [
          `Questa sì che è una risposta: un rischio con un nome e una mossa. Lo copio nella scheda tale e quale. Se qualcosa si muove, scrivimi: ti do una mano dal mio livello.`,
          `Il rischio l’hai guardato in faccia, e ci hai già messo una mossa sopra. Segno la mitigazione nel CRM e, se serve, faccio io la telefonata a chi decide.`,
          `È il tipo di preoccupazione che voglio sentire: specifica, gestita, senza drammi. La chiamata resta dov’è, con una nota in più. Se ti serve un appoggio, dimmelo prima che il problema si veda.`,
        ],
        overconf: [
          `“Nessun rischio” è una frase che in vent’anni di trattative non ho mai visto avverarsi. La scrivo nella scheda tra virgolette, con la data di oggi. Se firma, avrai ragione tu e ti offro il caffè.`,
          `La sicurezza è una bella cosa, ma ogni trattativa ha un punto aperto, e quello che non nomini è quello che ti colpisce. Lascio la chiamata com’è, ma la annoto come “senza rischi dichiarati”.`,
          `Se non c’è un rischio, c’è un punto cieco: o non lo vedi, o non me lo vuoi dire. Nessuna delle due cose mi tranquillizza. Tengo la chiamata e la ricontrollo prima di portarla al CRO.`,
        ],
        vague: [
          `Che qualcosa possa andare storto lo so già, e non mi serve. Mi serve il rischio più probabile, con un nome. Pensaci e mandami una riga.`,
          `Tutto giusto, ma generico. Un rischio senza nome non si gestisce, e se non si gestisce non lo posso difendere. La chiamata resta, con una mia nota a margine: “rischi non specificati”.`,
          `Mi hai descritto il clima, io volevo la mappa. Riprova in una frase: cosa, chi, quando. Poi la domanda la chiudo io.`,
        ],
      },
    },

    /* ─────────── Trattative non lavorate, in Commit o Best Case (solo metà trimestre) ─────────── */
    unworked: {
      q: [
        `{client}: {claim}, {acv}. Nel CRM leggo una categoria alta e nessuna attività con il tuo nome. Zero call, zero mail, zero note. Com’è possibile?`,
        `Mi aiuti con un dubbio? Hai messo {client} in {claim}, ma l’ultima modifica sulla scheda non porta la tua firma. Cos’hai fatto, su questa trattativa?`,
        `Questa mi incuriosisce, {nome}. {client} è nel foglio come {claim}, per {acv}, e io non trovo una riga che dica cosa stai facendo per portarla in firma. Raccontami.`,
        `Una trattativa non lavorata non può stare in {claim}: al massimo è un’ipotesi con un bel numero accanto. {client}, {acv}. Dimmi dove sei con loro, davvero.`,
        `Passo in rassegna il foglio e mi fermo su {client} in {claim}. La scheda è ferma e non risultano contatti con il cliente da settimane. Prima che tiri conclusioni io: qual è la situazione?`,
      ],
      honest: [
        `Non l’ho lavorata. Ho dato priorità alle trattative in corso e questa è rimasta con la categoria che aveva nel CRM, senza che nessuno la guardasse. Non regge: la porto in Pipeline.`,
        `La categoria l’ho ereditata dal CRM senza guardarla. Non ho parlato con nessuno di {client}, quindi Commit o Best Case non hanno senso. La porto in Pipeline.`,
        `Non so dove siamo con {client}: ho seguito le altre e questa è rimasta in disparte. Il foglio dice una cosa che non so dimostrare, quindi la metto in Pipeline.`,
        `In mano non ho niente di concreto. Tra le trattative che ho scelto di seguire questa non c’era, e la categoria non la so difendere. Va in Pipeline finché non ci lavoro.`,
      ],
      bluff: [
        `L’ho lavorata, ma in parallelo: due call con il referente nelle ultime settimane. Non ho ancora aggiornato il CRM, e quello è un mio ritardo. Il quadro è buono, la categoria regge.`,
        `Ci sto lavorando sotto traccia: il cliente preferisce parlare per telefono e non lasciare mail. Ho un buon livello di confidenza, quindi la categoria che vedi è quella giusta.`,
        `Sì, ci sono dentro. Una call a inizio trimestre e qualche messaggio dopo; l’attività non è registrata perché le conversazioni sono state informali. Il percorso è avviato.`,
      ],
      plan: [
        `Non l’ho ancora lavorata, ma non la mollo: entro tre settimane ho un incontro con il referente e una prima bozza di piano condiviso. Intanto non la considero Commit.`,
        `È rimasta indietro. Mi impegno a portarla a un primo incontro e a un piano scritto con il cliente entro tre settimane. Se non succede, la togli tu dal foglio.`,
        `Me ne occupo entro tre settimane: chiamo il referente questa settimana, fisso un incontro e ti riporto cosa ho trovato. Per ora la lascio dov’è, con quella scadenza.`,
      ],
      react: {
        honest: [
          `Meglio una trattativa onesta in Pipeline che una gonfiata nelle caselle alte. Grazie. Se vuoi riprenderla, dimmi quando: ti aiuto a preparare il primo contatto, che di solito è la parte più lenta.`,
          `Detto senza giri, e questo conta. La sposto in Pipeline, che è dove sta. Se tra un paio di settimane trovi due ore per {client}, dimmelo e ne rifacciamo il punto insieme.`,
          `Ok, chiaro. Capita: il CRM è pieno di numeri ereditati che nessuno ha più riguardato. La metto in Pipeline, e se vale la pena tornarci lo decidiamo insieme.`,
        ],
        bluffCaught: [
          `Ho davanti agenda e posta condivisa: su {client} non c’è una call, non c’è una mail. Il CRM è la memoria di tutti, non un diario privato, e una trattativa non lavorata non può stare nelle caselle alte. La metto in Fuori, e facciamo una deal review.`,
          `Provo a seguirti, ma le tracce sono zero: nessun invito, nessun messaggio, nessuna nota. Non mi dà fastidio che non l’abbia lavorata. Mi dà fastidio che tu me l’abbia presentata come lavorata. Va in Fuori, e ci vediamo in deal review.`,
          `Io controllo prima di chiedere, e quello che trovo è silenzio: nessun contatto con {client} negli ultimi mesi. Ti credo quando dici che volevi lavorarla; quando dici che l’hai lavorata, no. La sposto in Fuori e ne parliamo con calma in deal review.`,
        ],
        bluffPassed: [
          `Ok, ti credo. Però nella scheda non c’è niente, e a me serve la traccia. Entro domani mi inoltri la data dell’ultima call e l’argomento. Se non arriva, la scheda la riscrivo io.`,
          `Va bene, per ora la lascio dov’è. Metto una nota a calendario: tra una settimana apro la scheda di {client} e cerco attività vere. Se le trovo, ti devo un caffè. Se no, parliamo.`,
          `Mmm. Accetto, con riserva. Aggiorna oggi il CRM con quello che mi hai detto, data per data: quello che non è scritto, per me, non è successo.`,
        ],
        plan: [
          `D’accordo, ti prendo in parola: tre settimane. Scrivo la data sulla scheda. Un impegno con una scadenza vale più di cento buone intenzioni. Intanto Commit no: al massimo Best Case.`,
          `Va bene, hai tre settimane per un primo incontro e un piano scritto con il cliente. Se mi porti quello, ne riparliamo volentieri. Se la scadenza passa in silenzio, la categoria la decido io.`,
          `Una data e non un “appena posso”: questo mi rassicura. Segno tre settimane sulla scheda, e il CRM ha una memoria più lunga della mia.`,
        ],
      },
    },

    /* ─────────── Copertura della quota: domanda globale (solo {nome} è disponibile) ─────────── */
    coverage: {
      q: [
        `Chiudo con la domanda che il CRO fa sempre a me: la quota è coperta? Prendi il tuo Commit, togli quello che già sai che slitterà, e dimmi cosa rimane.`,
        `Guardiamo il foglio tutto insieme, {nome}. Il Commit da solo arriva alla quota? Se no, dimmi come colmi la differenza e a cosa rinunci per arrivarci.`,
        `Facciamo che per cinque minuti il manager sei tu. Hai il foglio davanti, la quota è quella, il tempo che resta non è infinito. Dove metti l’energia da qui alla chiusura, e dove la togli?`,
        `Una domanda sola, senza trabocchetti: quanto regge il tuo numero? Non voglio un “ce la faremo”. Voglio un piano con dentro anche delle rinunce.`,
      ],
      honest: [
        `Il numero regge solo se le trattative più grosse arrivano in firma. Concentro il tempo su quelle, dove un decisore è davvero coinvolto, e lascio perdere quelle ferme.`,
        `Non do il numero per scontato: dipende da poche trattative, e su quelle metto ogni ora utile. Almeno una la declasso, e te lo dico adesso invece di lasciartelo scoprire dal CRM.`,
        `La copertura c’è solo sulla carta. Per renderla vera smetto di rincorrere le trattative senza un passo concreto e metto le ore su quelle in cui il cliente ha già una data. Le altre le declasso.`,
        `Il margine è più sottile di come appare nel foglio. Taglio dal mio tempo le trattative ferme, ne lavoro a fondo una o due e ti aggiorno quando qualcosa si muove davvero.`,
      ],
      optimistic: [
        `Ce la faccio. Ho abbastanza trattative vive e il cliente è con me: se vanno tutte come previsto, la quota è mia. Non vedo ragioni per toglierne una adesso, sarebbe solo uno spreco.`,
        `La quota è coperta: tra Commit e Best Case i numeri ci sono. Basta che nessun cliente ritardi, e mi sembra improbabile. Non rinuncio a niente: lo sprint finale fa sempre la differenza.`,
        `Sì, arrivo alla quota. Ho margine e ho già visto trimestri messi peggio chiudersi in due giorni. Se mi lasci lavorare su tutte, le porto a casa. Togliere trattative adesso significherebbe solo perdere occasioni.`,
        `La somma torna: tra Commit e Best Case c’è margine anche per uno slittamento. Se qualcosa slitta, il resto compensa. Non vedo la necessità di cambiare il piano adesso, né di togliere tempo a nessuna trattativa.`,
      ],
      vague: [
        `Dipende da come si muovono le cose. Alcune sono avanti, altre meno, vediamo nei prossimi giorni. Le variabili sono troppe per dare una risposta secca, e non vorrei dartene una che poi cambia.`,
        `Direi che siamo in linea con le attese. Qualcosa slitterà e qualcos’altro arriverà prima, di solito va a compensarsi. Per ora non toccherei il piano e non vorrei togliere tempo a nessuna trattativa.`,
        `Sono ottimista, ma preferisco non dire un numero: se poi cambia qualcosa mi chiedi il conto. Intanto lascerei il foglio com’è, e ci aggiorniamo quando le cose si sono chiarite un po’.`,
      ],
      react: {
        honest: [
          `Questa è la risposta di chi fa il mestiere. Rinunciare è la parte più difficile, e infatti la fanno in pochi. Lo metto agli atti, e a ogni aggiornamento lo rileggiamo insieme, rinunce comprese.`,
          `Grazie: un piano con dei tagli dentro vale tre piani con dei buoni propositi. Il CRO preferisce un numero piccolo e vero a uno grande e fragile, e io pure. Andiamo avanti così.`,
          `Bene. Hai messo una rinuncia nel piano senza che nessuno te la strappasse, ed è la cosa più utile che potessi dirmi oggi. Il piano lo scrivo nella scheda con il tuo nome, e lo guardo con te quando serve.`,
        ],
        optimistic: [
          `Dire che si arriva alla quota lo fanno tutti, e non è un piano. Ti faccio una domanda cattiva: se togli la trattativa più grossa, cosa resta? Il numero lo difendo io davanti al CRO, e con questo ragionamento non ci riesco. Lo segno come ottimismo, non come copertura.`,
          `Se tutto va come previsto, la quota è tua. Il problema è che “tutto” non è mai andato come previsto, nemmeno nei miei trimestri migliori. Annoto che hai dichiarato la copertura senza rinunce: a fine trimestre rifacciamo il conto.`,
          `L’ottimismo è una qualità, ma non si somma: nel CRM non esiste la colonna “fiducia”. Ti ascolto, ma la copertura la leggo io dai dati, e per ora i dati non confermano la tua stessa lettura.`,
        ],
        vague: [
          `Non mi hai risposto: mi hai dato il meteo. Voglio una cifra, una rinuncia e una data. Scrivimi tre righe entro domani, e le metto nel CRM con il tuo nome.`,
          `Mi hai dato un’impressione, e le mie attese hanno un numero. Riprova quando hai una cifra: una sola, anche sbagliata, mi serve più di dieci aggettivi.`,
          `Preferisci non sbilanciarti, lo vedo. Ma il mio mestiere è esattamente questo: sbilanciarmi, davanti al CRO, con le tue informazioni. Più mi dai, meglio ti difendo. Per ora ho poco.`,
        ],
      },
    },

    /* ─────────── Chiusura della call (stringhe di Marta, per qualità complessiva) ─────────── */
    wrap: {
      good: [
        `Ecco, questa è una call che mi piace. Quello che hai scritto e quello che dicono i dati si parlano, e dove non si parlavano me l’hai detto tu per primo. Il numero lo porto al CRO senza il tic all’occhio.`,
        `Chiudiamo qui. Non ho dovuto cercare niente: i punti deboli me li hai portati prima che li trovassi io, ed è il modo migliore di avermi dalla tua parte. Il forecast parte com’è.`,
        `Bene. Il foglio regge e le risposte pure. Non ti dico che andrà tutto bene: ti dico che, se va storto, non sarà per colpa di un forecast gonfiato. Grazie, {nome}.`,
        `Contenta. Quando le chiamate hanno una ragione scritta, io dormo tranquilla. Il numero va al CRO così com’è, con il tuo nome accanto.`,
      ],
      mixed: [
        `Allora: metà buona, metà da rivedere. Il numero lo porto, ma con due asterischi che conosco solo io. La prossima volta voglio più date e meno aggettivi.`,
        `Non è andata male e non è andata bene. Alcune risposte erano solide, altre mi hanno lasciato un dubbio. Il forecast resta così, ma sul dubbio ci torniamo.`,
        `Il foglio ha tenuto, le spiegazioni un po’ meno. Porto il numero al CRO con una nota di prudenza. Non è una bocciatura, è un promemoria.`,
        `Il beneficio del dubbio te lo do, ma lo scrivo a matita. Ho preso nota di cosa mi torna e di cosa no: sistemiamo la seconda parte appena possibile.`,
      ],
      bad: [
        `Ti parlo con franchezza, perché il tuo lavoro mi interessa: oggi i numeri e le risposte non si sono incontrati. Il forecast lo porto lo stesso, con meno fiducia di quella che avrei voluto. Si recupera con i fatti, non con le promesse.`,
        `Questa non è stata la nostra call migliore. Troppe chiamate senza prove, troppe risposte generiche. Si sistema: la prossima volta arrivi con tre fatti per ogni trattativa e cambia tutto.`,
        `Ok, chiudiamo. Mi aspettavo più dati e meno speranza. Il numero lo porto al CRO come me l’hai dato, ma ne rispondo io, e non è il mio passatempo preferito. Rileggi le schede: ci conviene a entrambi.`,
        `Non nego di essere delusa, ma non ho smesso di crederci. Dammi una ragione per tornare a fidarmi, e sarà facile. Il foglio parte, con una nota mia accanto.`,
      ],
    },

    /* ─────────── Giorno della chiusura: Marta in chat mentre si aprono le buste ─────────── */
    closing: {
      intro: [
        `Ci siamo. Ho il CRM aperto anch’io e il CRO che mi scrive ogni dieci minuti. Una trattativa alla volta, e respira: ormai sono buste.`,
        `Ultimo giorno. Quello che dovevi fare l’hai fatto, adesso si apre e si legge. Io sono qui: nel bene e nel male, il punto lo facciamo insieme.`,
        `Qualunque sia il risultato, il numero è quello. Apriamo le buste una per volta e ne parliamo dopo, a freddo. A caldo si dicono solo sciocchezze.`,
        `Adesso si guarda cosa dice il mondo, una busta alla volta. Io sono dalla tua parte, qualunque sia il colore del timbro.`,
      ],
      won: [
        `{client} firma: {acv}. Questa la segno in verde e la porto al CRO con il tuo nome accanto.`,
        `Firmato, {acv}. Lo dico adesso e poi torno a fare la dura: su {client} hai fatto un bel lavoro.`,
        `{client} chiude, {acv}. Quando una trattativa arriva in fondo, di solito è perché qualcuno ha fatto prima il lavoro noioso. Tu.`,
        `{acv} a segno con {client}: prenditi trenta secondi per goderti la cosa, poi scrivi nel CRM cosa ha funzionato. La prossima volta lo rifai a occhi chiusi.`,
        `Eccola: {client} firma, {acv}. Adesso l’atterraggio, che è il momento in cui i contratti si perdono per distrazione. Non si molla finché la fattura non è partita.`,
        `Su {client} arriva la firma: {acv}. Niente applausi in call, ma sul roll-up il tuo nome oggi pesa di più.`,
        `Firma con {client}, {acv}. Il CRO l’ha vista prima di me e mi ha scritto una parola sola: “bene”. Da lui è quasi una standing ovation.`,
      ],
      lost: [
        `Su {client} è no. Dispiace, ed è giusto che dispiaccia. Poi si apre il fascicolo: cosa sapevamo a metà trimestre, e cosa abbiamo preferito non sapere.`,
        `Perso: {client}, {acv} che escono dal conto. Fa male e lo so. L’unica cosa che conta adesso è capire cosa ci dice.`,
        `{client} non firma. Non faccio finta che non pesi. Ma un perso capito vale più di una vittoria fortunata: facciamo in modo di capirlo.`,
        `Brutta notizia su {client}, e non cerco colpevoli: cerco la ragione. Quando vuoi mi racconti gli ultimi due mesi dall’inizio, senza abbellire, e io faccio altrettanto con i miei.`,
        `{acv} che oggi non entrano. A volte il mondo ci mette lo zampino, a volte siamo noi a prestargli la penna. Scopriamo quale dei due casi è questo.`,
        `Niente firma da {client}: prima di tutto, respira. Poi, quando te la senti, vediamo insieme che cosa si poteva vedere prima.`,
        `La risposta di {client} è no, e {acv} restano fuori. Non faccio la predica: i dati la fanno meglio di me. Leggiamoli insieme, che è meno brutale.`,
      ],
      slip: [
        `{client} slitta al prossimo trimestre. Non è perso, ma oggi non fa numero. {acv} restano in coda: tieni caldo il contatto.`,
        `Slitta. La trattativa c’è, la firma no. Per il CRO oggi vale zero, per noi è un’opportunità ancora viva: domani chiama il tuo contatto, prima che si raffreddi.`,
        `{client} non firma oggi. Quando una trattativa slitta, di solito era il calendario a essere ottimista, non il cliente. {acv} restano sul tavolo, ma il tavolo è un altro trimestre.`,
        `Tecnicamente è un rinvio, praticamente sono altre settimane di telefonate. {client} sposta, noi teniamo il filo. Mi serve una nuova data, scritta.`,
        `Slitta, quindi per il trimestre non conta: la regola vale per tutti, anche per me. Ma {acv} non sono persi, sono in ritardo. Appena rientrano a calendario li riprendiamo.`,
        `{client} chiede più tempo, e {acv} passano al prossimo trimestre. Per il CRO è un vuoto, per me è un appuntamento. Lo riprendiamo con una data vera, non con un “a breve”.`,
        `Oggi la firma di {client} non c’è: la trattativa è viva, ma il calendario ha vinto. Segno {acv} sul prossimo trimestre. Il tuo compito ora è non lasciarla raffreddare.`,
      ],
      fcGood: [
        `Una cosa va detta: il tuo forecast di questo trimestre ha retto. Le categorie che hai scelto e i risultati hanno quasi sempre coinciso, ed è la cosa più preziosa che mi puoi dare: una previsione di cui fidarmi.`,
        `Riepilogo a freddo: le tue chiamate sono state affidabili. Quello che era Commit ha quasi sempre firmato, il resto non mi ha dato sorprese. Il CRO se n’è accorto, e anch’io.`,
        `Sai cosa preferisco a un trimestre record? Un trimestre in cui il forecast è giusto. Il tuo lo è stato, e accanto al tuo nome, nella mia testa, c’è scritto “affidabile”. Si costruisce piano e si perde in un attimo: tienilo stretto.`,
        `Il forecast è la tua firma, e questo trimestre ha avuto una bella calligrafia. Non sempre si vince, ma quando scrivi Commit io posso smettere di controllare. Ottimo lavoro.`,
      ],
      fcBad: [
        `Parliamoci chiaro: il forecast di questo trimestre non mi ha aiutata. Troppe chiamate e troppi risultati che non si sono incontrati. Non è una condanna, è un dato, e dai dati si riparte.`,
        `Ho dovuto spiegare al CRO più di una differenza tra il foglio e il risultato, e non è mai piacevole. Non ti accuso di mentire: ti dico che la fiducia si ricostruisce con previsioni noiose e precise.`,
        `Il numero che mi hai dato e quello che è arrivato erano lontani. Una parte è colpa del mondo, e l’ho messa da parte. Ma quella che dipende dalle categorie è tua: prendiamoci un’ora e rivediamo come le scegli.`,
        `Il forecast è la cosa che distingue chi vende da chi spera. Questo trimestre c’è stata troppa speranza. Succede. Il prossimo parte da una regola semplice: se non c’è un fatto, non è Commit.`,
      ],
      fcMixed: [
        `Forecast a metà. Alcune chiamate hanno retto, altre no, e la differenza non era la fortuna: dove avevi i fatti ha tenuto, dove avevi le sensazioni no. Il prossimo trimestre partiamo da lì.`,
        `Né bene né male. Ho avuto un paio di sorprese, e in un forecast le sorprese costano: ogni volta che correggo un numero davanti al CRO, perdo credito io. Facciamo in modo di ridurle.`,
        `Le chiamate prudenti hanno retto, quelle ambiziose un po’ meno, e il CRO ha potuto difendere il numero solo in parte. Non è poco, ma con poco sforzo si può fare di meglio.`,
        `Se il forecast fosse un voto, direi un sei. Non si butta niente, ma non lo appendo in ufficio. Meno “vediamo”, più date, e il prossimo sarà un otto.`,
      ],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
