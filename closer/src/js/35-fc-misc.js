/* CLOSER · banca testi forecast B: Marta apre la call, invita a compilare il foglio, poi sandbagging, rischio,
   trattative non lavorate, copertura della quota, chiusura della call e giorno di chiusura (CL.FCBANK).
   Chiavi: open, sheet, sandbag, risk, unworked, coverage, wrap, closing (le “gaps” stanno in 33-fc-gaps.js).
   Segnaposto: {client} {title} {who} {claim} {truth} {acv} {p} {nome}. Le battute di Marta sono solo parlato.
   Marta dà del tu, è equa: premia la franchezza, smonta il bluff con i dati del CRM, non sopporta né i numeri
   gonfiati né quelli abbassati per comodità.
   Note d’uso (dal motore, 12-forecast.js):
   · coverage, wrap e closing.fc* vengono formattati senza trattativa: lì vale solo {nome}.
   · closing.won / lost / slip ricevono solo {client} e {acv}.
   · nelle reazioni {claim} è la categoria DOPO la risoluzione (es. dopo “correct” coincide con {truth}).
   · in risk.name {who} diventa la frase di sc.fc.risk (“Il rischio vero è che…”), perciò va messo a inizio frase.
   · le trattative non lavorate (unworked) esistono solo nella call di metà trimestre.
   Convenzione: nessun aggettivo o participio che concordi con il genere del giocatore o del cliente. */
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
          { w: 'marta', a: 'sorride appena', t: 'Alcuni capitoli sono bellissimi. Altri sono narrativa. Facciamo la pipeline review e li separiamo.' },
        ],
        [
          { w: 'marta', a: 'ruota la sedia verso la camera', t: 'Arrivo da una riunione con la finanza: hanno già chiesto come sta il trimestre. Indovina chi risponde.' },
          { w: 'marta', a: 'guarda un secondo fuori campo', t: 'A questo punto una trattativa su due è diversa da come la raccontavamo all’inizio. Non voglio scoprirlo a fine trimestre. Lo voglio scoprire adesso.' },
          { w: 'marta', a: 'torna sullo schermo', t: 'Quindi poche chiacchiere: il foglio e qualche domanda. Io sono dalla tua parte, ma il CRM è dalla parte dei fatti.' },
        ],
        [
          { w: 'marta', a: 'appoggia i gomiti sulla scrivania', t: 'Il CRO mi ha chiesto due volte, in una settimana, se il trimestre tiene. Gli ho risposto che prima ne parlo con ognuno di voi.' },
          { w: 'marta', a: 'alza un sopracciglio', t: 'Regole semplici, {nome}: tu mi dici le cose come stanno, io ti aiuto dove posso. Se mi racconti una storia, il CRM me ne racconta un’altra, e vince il CRM.' },
        ],
      ],
      final: [
        [
          { w: 'marta', a: 'appare in videochiamata, giacca sullo schienale', t: 'Eccoci. Ultima chiamata prima della chiusura. Il CRO ha già bloccato l’agenda: aspetta il numero.' },
          { w: 'marta', a: 'abbassa la voce', t: 'Non voglio un numero bello. Voglio un numero vero: lo firmo io, e la mia firma vale quanto la tua.' },
        ],
        [
          { w: 'marta', a: 'si toglie gli occhiali e li appoggia sul tavolo', t: 'Commit call. Quello che metti in Commit finisce sul roll-up con il tuo nome, e davanti al CRO lo difendo io.' },
          { w: 'marta', a: 'guarda lo schermo', t: 'Quindi niente atmosfera, niente “mi ha detto che ci siamo”. Fatti, date, persone. Poi, se serve, una battuta: ne ho una scorta.' },
        ],
        [
          { w: 'marta', a: 'entra in call con il telefono ancora in mano', t: 'Scusa, il CRO mi ha scritto tre volte in dieci minuti. Vuole sapere se il trimestre chiude in verde.' },
          { w: 'marta', a: 'posa il telefono a faccia in giù', t: 'Io una risposta non ce l’ho ancora. Ce l’hai tu, spero. Compili il foglio e poi ti faccio le domande che farebbe lui.' },
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
        'Passiamo ai numeri. Se ce ne sono che non hai ancora toccato, le trovi già compilate con la categoria del CRM: non è una mia scelta e non è per forza quella giusta. Controllale una per una.',
        'Il foglio è pronto: Commit, Best Case, Pipeline, Fuori. Prenditi il tempo che serve, ma ricorda che quello che scrivi è quello che difendo io davanti al CRO. Se è un auspicio, mettilo un gradino più in basso.',
        'Compila pure. Una categoria per trattativa, nessun pari merito. Se sei in dubbio tra due caselle, scegli quella che sapresti difendere davanti a me. Quella più comoda non conta.',
      ],
      final: [
        'Ultimo foglio del trimestre. Commit, Best Case, Pipeline, Fuori: una casella per trattativa. Quello che scrivi lo porto al CRO così com’è, quindi scrivilo come vorresti rileggerlo il giorno dopo la chiusura.',
        'Ecco il foglio. Stavolta non ci sono settimane per recuperare: la firma arriva o non arriva. Metti ogni trattativa dove la metterebbe un osservatore esterno, non dove la metteresti nei tuoi sogni.',
        'Compila il foglio. Commit solo per quello che firma, Best Case per quello che potrebbe, Fuori senza imbarazzo per quello che sai già che non arriva. Nessuno ha mai premiato chi riempie la prima colonna.',
        'Foglio finale. Ogni trattativa in sospeso ha bisogno di una categoria, e io di una ragione per ciascuna. Se la ragione non c’è, la categoria è quella sotto.',
      ],
    },

    /* ─────────── Sandbagging: hai chiamato più in basso di quanto i dati sostengono ─────────── */
    sandbag: {
      q: [
        `Hai messo {client} in {claim}. La scheda dice {p}, che a casa mia si chiama {truth}. Perché tieni così bassa una trattativa da {acv}?`,
        `Lo dico una volta sola: un forecast tenuto basso è sleale quanto uno gonfiato, solo più comodo. {client} sta in {claim}, i dati dicono {truth}. Spiegami la differenza.`,
        `Questa è al contrario del solito. {client} in {claim}, con una scheda che ha tutto per essere {truth}. Se la tieni bassa per avere una sorpresa da raccontare, con me non funziona.`,
        `{nome}, dimmi se sbaglio: {client} in {claim}, {acv} sul tavolo e un CRM che la legge {truth}. Se firma, fai bella figura. Se non firma, avevi avvisato. In entrambi i casi hai coperto te, non me.`,
        `{client}: chiamata {claim}, lettura dei dati {truth}, {p} nella scheda. O mi manca un pezzo che hai solo tu, o stai tenendo una carta nel cassetto. Quale delle due?`,
      ],
      correct: [
        `Hai ragione. L’avevo tenuta bassa per non scoprirmi, ma i dati dicono {truth} e te lo devo dire io. La alzo adesso, così ci lavori anche tu.`,
        `Colpa mia: ho abbassato per prudenza e non per ragioni. Se guardo la scheda, {client} sta in {truth}. Preferisco dirtelo io che farmelo dire dal CRM.`,
        `Sì, l’ho abbassata e non ho un buon motivo per averlo fatto. {client} va in {truth}. Mi scoccia ammettere che volevo stare al riparo, ma è andata così.`,
        `Ho paura di dover spiegare uno slittamento, e per questo ho abbassato. Ma i fatti per {truth} ci sono, e tenerli sotto non aiuta nessuno. Alzo la chiamata e ne rispondo.`,
      ],
      stay: [
        `Preferisco stare basso. Se firma, è una buona notizia per tutti; se slitta, nessuno deve spiegare niente. Per ora la categoria giusta per {client} è {claim}.`,
        `La mia lettura è più prudente della scheda: ci sono variabili che il CRM non vede. Finché il contratto non è firmato, per me {client} resta in {claim}.`,
        `I numeri dicono {truth}, ma io li vedo da dentro e non mi convincono. Il mio compito è non promettere più di quello che consegno, quindi la lascio in {claim}.`,
      ],
      vague: [
        `Non saprei, la vedo in movimento e potrebbe andare in un senso o nell’altro. Non vorrei sbilanciarmi: lascerei la categoria com’è e vediamo come evolve.`,
        `Dipende da un paio di cose che devono ancora chiarirsi. Più che sulla categoria, mi concentrerei sui prossimi passi, e quando c’è qualcosa di certo aggiorno il foglio.`,
        `È una di quelle trattative che si capiscono strada facendo. Una categoria oggi sarebbe una fotografia sfocata. Tengo il foglio com’è e ti dico appena mette a fuoco.`,
      ],
      react: {
        correct: [
          `Ecco. Questa è la correzione che mi serve: detta da te e non scoperta da me. {client} va in {truth}, e se ci metti il nome sopra, io ci metto il mio quando parlo con il CRO.`,
          `Apprezzo, e non è scontato: abbassare è comodo, rialzare costa. D’ora in poi, se la scheda e il foglio non coincidono, mi chiami tu per primo. Segnato in {truth}.`,
          `Bene. Una chiamata onesta vale più di una chiamata prudente. Adesso che {client} è in {truth}, dimmi cosa serve per portarla a casa: se c’è un ostacolo, lo vedo con te.`,
        ],
        stay: [
          `Capisco il riflesso, ma non lo condivido. Se tieni bassa una trattativa che i dati sostengono, non mi proteggi: mi togli informazioni. Lo segno, e se firma ne riparliamo.`,
          `La prudenza è una virtù finché non diventa un alibi. Il CRM dice {truth}, tu dici {claim}: per ora lascio la tua chiamata, ma la annoto. Se vince, mi spieghi perché non me l’avevi detto.`,
          `Se poi firma, il CRO vede un forecast sbagliato per difetto. Per me è sleale quanto uno sbagliato per eccesso. Lo registro, e a fine trimestre rifacciamo il conto.`,
        ],
        vague: [
          `“Vediamo come evolve” non è una categoria del foglio. Lascio la chiamata com’è, ma la registro come prudenza senza motivo. La prossima volta voglio una ragione, non un’impressione.`,
          `Non mi hai detto né sì né no, e capisco perché: dire sì ti espone. Ma da te voglio esposizione, non cautela. Per ora il foglio resta così; la prossima volta scegli.`,
          `Sento tanta cautela e poca informazione. Lascio com’è, ma segnalo che la tua lettura e la mia non coincidono. Prima della chiusura dobbiamo riparlarne, con i dati davanti.`,
        ],
      },
    },

    /* ─────────── Rischio: la chiamata torna, ma cosa può farla saltare? ─────────── */
    risk: {
      q: [
        `Il foglio e i dati si parlano, per una volta. Allora la domanda che faccio a tutti, su {client} come su qualunque altra: cosa può far saltare la firma? Una cosa sola, la più probabile.`,
        `{client} in {claim}: torna. Adesso fai il mio lavoro al posto mio e dimmi come potrebbe andare male. Se non lo sai tu, lo scopre il CRO.`,
        `Pre-mortem. Immagina di essere a fine trimestre: {client} non ha firmato e io ti chiamo. Qual è stata la ragione? Dimmela adesso, e dimmi cosa stai facendo per evitarla.`,
        `Non ti contesto niente, ti chiedo un favore. Indicami il punto in cui la tua chiamata su {client} è più fragile. Il più fragile, non l’elenco.`,
        `Mi piace quando le chiamate tornano, e subito mi insospettisco. Qual è la cosa che su {client} ti toglie il sonno? E quanto la senti vicina?`,
      ],
      name: [
        `{who} Non aspetto che succeda: ho chiesto per iscritto al mio contatto a che punto siamo e, se la risposta non convince, ti avviso io con il piano B.`,
        `Te lo dico senza giri. {who} Ho un piano B: se il punto non si sblocca, abbasso io la categoria e lo scrivo nel CRM prima che tu debba chiedermelo.`,
        `Ho una lista corta di cose che possono andare storte, e questa è la prima. {who} Mi faccio mettere in copia sul passaggio critico, così lo vedo muoversi.`,
        `{who} Non è una paura generica: ho scritto chi deve fare cosa e per quando, e ogni giorno controllo. Se non si muove, ti chiedo di intervenire più in alto.`,
        `Il punto fragile esiste e lo conosco. {who} Ho in agenda una domanda secca al cliente: se la risposta non mi convince, scendo di categoria senza aspettare.`,
      ],
      overconf: [
        `Nessun rischio concreto: è tutto chiuso e manca solo la firma. Il cliente è allineato, i tempi sono quelli, il percorso è lineare. Da qui alla chiusura non vedo niente che possa saltare, nemmeno cercandolo.`,
        `Non c’è niente che mi preoccupi. Abbiamo fatto tutto quello che c’era da fare e il cliente ha dato segnali chiari a ogni passaggio. Se proprio devo cercare un rischio, direi la sfortuna, e quella non si pianifica.`,
        `Sono tutti d’accordo e il percorso è lineare. Ho ricontrollato più volte e non c’è un punto aperto che valga la pena nominare. Per me questa firma è questione di giorni, e non vedo ragioni per dire altro.`,
      ],
      vague: [
        `Rischi ce ne sono sempre, in qualsiasi trattativa. Il cliente ha i suoi tempi e io faccio la mia parte, ma finché non firmano non si può escludere niente. Mi sembra più onesto non indicare un punto solo.`,
        `Può succedere di tutto: un cambio di priorità, un ritardo interno, un imprevisto. Sono cose che non dipendono da me, quindi le tengo d’occhio e vediamo come va. Difficile dire quale sia la più probabile.`,
        `Diciamo che la variabile principale è il tempo. Se le cose procedono come ora va tutto bene, altrimenti vedremo. Un punto preciso non saprei indicarlo, ma tengo d’occhio come si muove il cliente.`,
      ],
      react: {
        name: [
          `Questa sì che è una risposta: un rischio con un nome, una mossa e una scadenza. Lo copio nella scheda tale e quale. Se qualcosa si muove, scrivimi: ti do una mano dal mio livello.`,
          `Hai già un piano B: vuol dire che il rischio l’hai guardato in faccia. Segno la mitigazione nel CRM e, se serve, faccio io la telefonata a chi decide.`,
          `È il tipo di preoccupazione che voglio sentire: specifica, misurabile, senza drammi. La chiamata resta dov’è, con una nota in più. Se ti serve un appoggio, dimmelo prima che il problema si veda.`,
        ],
        overconf: [
          `“Nessun rischio” è una frase che in vent’anni di trattative non ho mai visto avverarsi. La scrivo nella scheda tra virgolette, con la data di oggi. Se firma, avrai ragione tu e ti offro il caffè.`,
          `La sicurezza è una bella cosa, ma ogni trattativa ha un punto aperto, e quello che non nomini è quello che ti colpisce. Lascio la chiamata com’è, ma la annoto come “senza rischi dichiarati”.`,
          `Se non c’è un rischio, c’è un punto cieco: o non lo vedi, o non me lo vuoi dire. Nessuna delle due mi tranquillizza. Tengo la chiamata e la ricontrollo prima di portarla al CRO.`,
        ],
        vague: [
          `“Può succedere di tutto” è vero, e non mi serve. Mi serve il rischio più probabile, non il catalogo. Pensaci e mandami una riga con il suo nome.`,
          `Tutto giusto, ma generico. Un rischio senza nome non si gestisce, e se non si gestisce non lo posso difendere. La chiamata resta, con una mia nota a margine: “rischi non specificati”.`,
          `Mi hai dato il meteo, io volevo la mappa. Riprova in una frase: cosa, chi, quando. Poi la domanda la chiudo io.`,
        ],
      },
    },

    /* ─────────── Trattative non lavorate, in Commit o Best Case (solo metà trimestre) ─────────── */
    unworked: {
      q: [
        `{client}: {claim}, {acv}. Nel CRM leggo una categoria alta e nessuna attività con il tuo nome. Zero call, zero mail, zero note. Com’è possibile?`,
        `Mi aiuti con un dubbio? Hai messo {client} in {claim}, ma l’ultima modifica sulla scheda non porta la tua firma. Cos’hai fatto, su questa trattativa?`,
        `{nome}, questa mi incuriosisce. {client} è nel foglio come {claim}, per {acv}, e io non trovo una riga che dica cosa stai facendo per portarla in firma. Raccontami.`,
        `Una trattativa non lavorata non può stare in {claim}: al massimo è un’ipotesi con un bel numero accanto. {client}, {acv}. Dimmi dove sei con loro, davvero.`,
        `Passo in rassegna il foglio e mi fermo su {client} in {claim}. La scheda è ferma e nessun contatto risulta sentito da settimane. Prima che tiri conclusioni io: qual è la situazione?`,
      ],
      honest: [
        `Non l’ho lavorata. Ho dato priorità alle trattative in corso e questa è rimasta lì con la categoria che aveva nel CRM. Non regge: la porto in Pipeline.`,
        `È una svista mia: la categoria l’ho ereditata dal CRM senza guardarla. Non ho parlato con nessuno di {client}, quindi Commit o Best Case non hanno senso. Va in Pipeline.`,
        `Hai ragione, e un po’ mi pesa ammetterlo: ho lasciato {client} in disparte per seguire le altre. Non so dove siamo con il cliente. La metto in Pipeline finché non ci lavoro.`,
        `In mano non ho niente di concreto. Tra le trattative che ho scelto di seguire questa non c’era, e il foglio dice una cosa che non so dimostrare. La categoria giusta è Pipeline.`,
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
          `Niente alibi: è già metà della soluzione. La sposto in Pipeline, che è dove sta. Se tra un paio di settimane trovi due ore per {client}, dimmelo e ne rifacciamo il punto insieme.`,
          `Ok, detto con chiarezza. Capita: il CRM è pieno di numeri ereditati che nessuno ha più riguardato. La metto in Pipeline, e se vale la pena tornarci lo decidiamo insieme.`,
        ],
        bluffCaught: [
          `Ho davanti agenda e posta condivisa: su {client} non c’è una call, non c’è una mail. “Non ho ancora aggiornato il CRM” non basta, perché il CRM è la memoria di tutti, non un diario privato. La metto in Fuori, e facciamo una deal review.`,
          `Provo a seguirti, ma le tracce sono zero: nessun invito, nessun messaggio, nessuna nota. Non mi dà fastidio che non l’abbia lavorata. Mi dà fastidio che tu me l’abbia presentata come lavorata. Va in Fuori, e ci vediamo in deal review.`,
          `Io controllo prima di chiedere, e quello che trovo è silenzio: nessun contatto con {client} negli ultimi mesi. Ti credo quando dici che volevi lavorarla; quando dici che l’hai lavorata, no. Fuori dal foglio, e ne parliamo con calma in deal review.`,
        ],
        bluffPassed: [
          `Ok, ti credo. Però nella scheda non c’è niente, e a me serve la traccia. Entro domani mi inoltri la data dell’ultima call e l’argomento. Se non arriva, la scheda la riscrivo io.`,
          `Va bene, per ora la lascio dov’è. Metto una nota a calendario: tra una settimana apro {client} e cerco attività vere. Se le trovo, ti devo un caffè. Se no, parliamo.`,
          `Mmm. Accetto, con riserva. Aggiorna oggi il CRM con quello che mi hai detto, data per data: quello che non è scritto, per me, non è successo.`,
        ],
        plan: [
          `D’accordo, ti prendo in parola: tre settimane. Scrivo la data sulla scheda. Un impegno con una scadenza vale più di cento buone intenzioni. Intanto Commit no: al massimo Best Case.`,
          `Va bene, hai tre settimane per un primo incontro e un piano scritto con il cliente. Se mi porti quello, ne riparliamo volentieri. Se la scadenza passa in silenzio, la categoria la decido io.`,
          `Una data e non un “appena posso”: questo mi rassicura. Segno tre settimane. La data la scrivo io, ma la memoria del CRM è più cattiva della mia.`,
        ],
      },
    },

    /* ─────────── Copertura della quota: domanda globale (solo {nome} è disponibile) ─────────── */
    coverage: {
      q: [
        `Ultima domanda, quella che il CRO fa sempre a me: la quota è coperta? Prendi il tuo Commit, togli quello che già sai che slitterà, e dimmi cosa rimane.`,
        `{nome}, guardiamo il foglio tutto insieme. Il Commit da solo arriva alla quota? Se no, dimmi come colmi la differenza e a cosa rinunci per arrivarci.`,
        `Facciamo che per cinque minuti il manager sei tu. Hai il foglio davanti, la quota è quella, il tempo che resta non è infinito. Dove metti l’energia da qui alla chiusura, e dove la togli?`,
        `Una domanda sola, senza trabocchetti: quanto regge il tuo numero? Non voglio un “ce la faremo”. Voglio un piano con dentro anche delle rinunce.`,
      ],
      honest: [
        `Col Commit di oggi non arrivo alla quota, e non voglio fingere di sì. Il piano: concentro il tempo sulle due o tre trattative con un decisore davvero coinvolto e lascio perdere quelle ferme.`,
        `La mia lettura: la copertura è a metà, forse un po’ di più. Per recuperare devo rinunciare ad almeno una trattativa e togliere tempo dove non c’è una data. Meglio dirtelo adesso.`,
        `Il divario c’è. Lo colmo solo se mi concentro: smetto di rincorrere le trattative senza un passo concreto e metto ogni ora su quelle in cui il cliente ha già una data. Le altre le declasso.`,
        `Non ci arrivo con quello che ho scritto, e lo sai tu quanto lo so io. Taglio due trattative dal mio tempo, ne lavoro a fondo altrettante e ti aggiorno quando qualcosa si muove davvero.`,
      ],
      optimistic: [
        `Ce la faccio. Ho abbastanza trattative vive e il cliente è con me: se vanno tutte come previsto, la quota è mia. Non vedo ragioni per toglierne una adesso, a questo punto sarebbe solo uno spreco.`,
        `La quota è coperta: tra Commit e Best Case i numeri ci sono. Basta che nessun cliente ritardi, e mi sembra improbabile. Non rinuncio a niente: lo sprint finale fa sempre la differenza.`,
        `Sì, arrivo alla quota. Ho margine e ho già visto trimestri messi peggio chiudersi in due giorni. Se mi lasci lavorare su tutte, le porto a casa. Togliere trattative adesso significherebbe solo perdere occasioni.`,
        `La somma torna: Commit più metà del Best Case supera la quota. Se qualcosa slitta, il resto compensa. Non vedo la necessità di cambiare il piano adesso, né di togliere tempo a nessuna trattativa.`,
      ],
      vague: [
        `Dipende da come si muovono le cose. Alcune sono avanti, altre meno, vediamo nei prossimi giorni. Le variabili sono troppe per dare una risposta secca, e non vorrei dartene una che poi cambia.`,
        `Direi che siamo in linea con le attese. Qualcosa slitterà e qualcos’altro arriverà prima, di solito va a compensarsi. Per ora non toccherei il piano e non vorrei togliere tempo a nessuna trattativa.`,
        `Sono ottimista, ma preferisco non dire un numero: se poi cambia qualcosa mi chiedi il conto. Tu intanto tieni il foglio com’è, poi ci aggiorniamo quando le cose si sono chiarite un po’.`,
      ],
      react: {
        honest: [
          `Questa è la risposta di chi fa il mestiere. Rinunciare è la parte più difficile, e infatti la fanno in pochi. Lo metto agli atti, e a ogni aggiornamento lo rileggiamo insieme, rinunce comprese.`,
          `Grazie: un piano con dei tagli dentro vale tre piani con dei buoni propositi. Il CRO preferisce un numero piccolo e vero a uno grande e fragile, e io pure. Andiamo avanti così.`,
          `Bene. Hai detto “rinuncio” senza che te lo chiedessi, che è la cosa più utile che potessi dirmi oggi. Il tuo piano lo scrivo nella scheda con il tuo nome, e lo guardo con te quando serve.`,
        ],
        optimistic: [
          `“Ce la faccio” lo dicono tutti, e non è un piano. Ti faccio una domanda cattiva: se togli la trattativa più grossa, cosa resta? Io il numero lo difendo davanti al CRO, e con questo ragionamento non ci riesco. Lo segno come ottimismo, non come copertura.`,
          `Se tutto va come previsto, la quota è tua. Il problema è che “tutto” non è mai andato come previsto, nemmeno nei miei trimestri migliori. Annoto che hai dichiarato la copertura senza rinunce: a fine trimestre rifacciamo il conto.`,
          `L’ottimismo è una qualità, ma non si somma: nel CRM non c’è una colonna per lo sprint finale. Ti ascolto, ma la copertura la leggo io dai dati, e per ora i dati non danno la tua stessa cifra.`,
        ],
        vague: [
          `Non mi hai risposto: mi hai dato il meteo. Voglio una cifra, una rinuncia e una data. Non adesso: entro domani mi scrivi tre righe, e le metto nel CRM con il tuo nome.`,
          `“In linea con le attese” di chi? Le mie attese hanno un numero, le tue non le conosco. Riprova quando hai una cifra: una sola, anche sbagliata, mi serve più di dieci aggettivi.`,
          `Preferisci non sbilanciarti, lo vedo. Ma il mio mestiere è esattamente questo: sbilanciarmi, davanti al CRO, con le tue informazioni. Più mi dai, meglio ti difendo. Per ora ho poco.`,
        ],
      },
    },

    /* ─────────── Chiusura della call (stringhe di Marta, per qualità complessiva) ─────────── */
    wrap: {
      good: [
        `Ecco, questa è una call che mi piace. Quello che hai scritto e quello che dicono i dati si parlano, e dove non si parlavano me l’hai detto tu per primo. Il numero lo porto al CRO senza il tic all’occhio.`,
        `Chiudiamo qui. Non ho dovuto cercare niente: i buchi me li hai portati prima che li trovassi io, ed è il modo migliore di avermi dalla tua parte. Il forecast parte com’è.`,
        `Bene. Il foglio regge e le risposte pure. Non ti dico che andrà tutto bene: ti dico che se va storto non sarà per colpa di un forecast gonfiato. Grazie.`,
        `Contenta. Quando le chiamate hanno una ragione scritta, io dormo. Il numero va al CRO così com’è, con il tuo nome accanto.`,
      ],
      mixed: [
        `Allora: metà buona, metà da rivedere. Il numero lo porto, ma con due asterischi che conosco solo io. Prossima volta voglio meno “vediamo” e più date.`,
        `Non è andata male e non è andata bene. Alcune risposte erano solide, altre mi hanno lasciato un dubbio. Il forecast resta così, ma sul dubbio ci torniamo.`,
        `Facciamo che il voto è sufficiente, con riserva. Ho preso nota di cosa mi torna e di cosa no; ci sentiamo per sistemare la seconda parte.`,
        `Il foglio ha tenuto, le spiegazioni un po’ meno. Porto il numero al CRO con una nota di prudenza. Non è una bocciatura, è un promemoria.`,
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
        `Da adesso non si cambia più niente: si guarda cosa dice il mondo. Io sono dalla tua parte, in qualunque colore escano.`,
      ],
      won: [
        `{client} firma: {acv}. Questa la segno in verde e la porto al CRO con il tuo nome accanto.`,
        `Firmato, {acv}. Lo dico una volta sola, poi torno a fare la dura: su {client} hai fatto un bel lavoro.`,
        `{client} chiude, {acv}. Quando una trattativa arriva in fondo senza drammi, di solito è perché qualcuno ha fatto il lavoro noioso prima. Tu.`,
        `{acv} in quota con {client}: prenditi trenta secondi per goderti la cosa, poi scrivi nel CRM cosa ha funzionato. La prossima volta lo rifai a occhi chiusi.`,
        `Eccola: {client} firma, {acv}. Adesso l’atterraggio, che è il momento in cui i contratti si perdono per distrazione. Non si molla finché la fattura non è partita.`,
      ],
      lost: [
        `Su {client} è no. Dispiace, ed è giusto che dispiaccia. Poi si apre il fascicolo: cosa sapevamo a metà trimestre, e cosa abbiamo preferito non sapere.`,
        `Perso: {client}, {acv} che escono dal conto. Fa male e lo so. L’unica cosa che conta adesso è capire cosa ci dice.`,
        `{client} non firma. Non faccio finta che non pesi. Ma un perso capito vale più di una vittoria fortunata: facciamo in modo di capirlo.`,
        `Brutta notizia su {client}, e non cerco colpevoli: cerco la ragione. Quando vuoi mi racconti gli ultimi due mesi dall’inizio, senza abbellire, e io faccio altrettanto con i miei.`,
        `{acv} che oggi non entrano. A volte il mondo ci mette lo zampino, a volte siamo noi a prestargli la penna. Scopriamo quale dei due casi è questo.`,
      ],
      slip: [
        `{client} slitta al prossimo trimestre. Non è perso, ma oggi non fa numero. {acv} restano in coda: tienili al caldo.`,
        `Slitta. Il contratto c’è, la firma no. Per il CRO oggi vale zero, per noi è un’opportunità ancora viva: domani chiama il tuo contatto, prima che si raffreddi.`,
        `{client} non firma oggi. Quando una trattativa slitta, di solito era il calendario a essere ottimista, non il cliente. {acv} restano sul tavolo, ma il tavolo è un altro trimestre.`,
        `Tecnicamente è un rinvio, praticamente sono altre settimane di telefonate. {client} sposta, noi teniamo il filo. Mi serve una nuova data, scritta.`,
        `Slitta, e non la conto: la regola vale per tutti, io per prima. Ma {acv} non sono persi, sono in ritardo. Appena rientrano a calendario li riprendiamo.`,
      ],
      fcGood: [
        `Una cosa va detta: il tuo forecast di questo trimestre ha retto. Quello che hai chiamato e quello che è successo hanno quasi sempre coinciso, ed è la cosa più preziosa che mi puoi dare: una previsione di cui fidarmi.`,
        `Riepilogo a freddo: le tue chiamate sono state affidabili. Dove c’era un buco lo hai detto, dove hai scritto Commit è arrivata la firma. Il CRO se n’è accorto, e anch’io.`,
        `Sai cosa preferisco a un trimestre record? Un trimestre in cui il forecast è giusto. Il tuo lo è stato. Accanto al tuo nome, nella mia testa, c’è scritto “affidabile”. È una reputazione che si costruisce piano e si perde in un attimo: tienila stretta.`,
        `Il forecast è la tua firma, e questo trimestre ha avuto una bella calligrafia. Non sempre si vince, ma quando scrivi Commit io posso smettere di controllare. Ottimo lavoro.`,
      ],
      fcBad: [
        `Parliamoci chiaro: il forecast di questo trimestre non mi ha aiutata. Troppe chiamate e troppi risultati che non si sono incontrati. Non è una condanna, è un dato, e dai dati si riparte.`,
        `Ho dovuto spiegare al CRO più di una differenza tra il foglio e il risultato, e non è mai piacevole. Non ti accuso di mentire: ti dico che la fiducia si ricostruisce con previsioni noiose e precise.`,
        `Il numero che mi hai dato e il numero che è arrivato erano lontani. Una parte è colpa del mondo, lo so e l’ho messa da parte. Ma la parte che dipende dalle categorie è tua: prendiamoci un’ora e rivediamo come le scegli.`,
        `Il forecast è la cosa che distingue chi vende da chi spera. Questo trimestre c’è stata troppa speranza. Succede. Il prossimo parte da una regola semplice: se non c’è un fatto, non è Commit.`,
      ],
      fcMixed: [
        `Forecast a metà. Alcune chiamate hanno retto, altre no, e la differenza non era la fortuna: dove avevi i fatti ha tenuto, dove avevi le sensazioni no. Il prossimo trimestre partiamo da lì.`,
        `Né bene né male. Ho avuto un paio di sorprese, e in un forecast le sorprese costano: ogni volta che correggo un numero davanti al CRO, perdo credito io. Facciamo in modo di ridurle.`,
        `Sufficiente, con riserva. Il forecast ha tenuto dove hai fatto domande e ha ceduto dove l’atmosfera ha preso il posto dei fatti. Non è poco, ma con poco sforzo si può fare di meglio.`,
        `Se il forecast fosse un voto, direi un sei. Non si butta niente, ma non lo appendo in ufficio. Meno “vediamo”, più date, e il prossimo sarà un otto.`,
      ],
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
