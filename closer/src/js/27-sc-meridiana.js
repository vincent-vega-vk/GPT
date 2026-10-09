/* Scenario 8 · Meridiana Energia · paper process: sicurezza, clausole, residenza dati, poteri di firma
   v2: sala di controllo e orologio. Undici giorni, tre binari (Sicurezza, Legale, Firma), una data.
   Nota di calendario: il “giorno” del gioco conta il fine settimana come uno solo (Giorno 6): lunedì 1, mercoledì 3, venerdì 5,
   weekend 6, lunedì 7, mercoledì 9, giovedì 10, venerdì 11 = il 31, giorno della firma. */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    bruni: { name: `Elena Bruni`, role: `Direttrice Operations · champion`, hue: 195 },
    riva: { name: `Matteo Riva`, role: `CISO`, hue: 12 },
    greco: { name: `Sofia Greco`, role: `General Counsel`, hue: 268 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
    giulia: { name: `Giulia Ferraro`, role: `Deal Desk Nexora`, hue: 95 },
    acq: { name: `Luca Ferrero`, role: `Responsabile Acquisti`, hue: 40 },
    barberis: { name: `Renato Barberis`, role: `Direttore Generale`, hue: 225 },
    operti: { name: `Paolo Operti`, role: `Direttore Finanziario`, hue: 330 },
    /* il “contatto” generico degli imprevisti condivisi è Elena */
    cliente: { name: `Elena Bruni`, role: `Direttrice Operations · champion`, hue: 195 },
  };

  /* ───── lettura dello stato (pura, robusta a stato iniziale) ───── */
  const NODE_DAY = { n1: 1, n2: 3, n3: 5, n4: 7, n5: 9, n6: 10 };
  const WILD_DAY = { pentest: 4, incidente: 6, legale_assente: 8, dg_anticipa: 8, firma_down: 10 };
  const WEEK = ['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'weekend', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì'];
  const idx = (d) => parseInt(String(d.node || 'n1').slice(1), 10) || 1;
  const histOf = (d) => (d && Array.isArray(d.hist) ? d.hist : []);
  const seen = (d, n) => histOf(d).some((h) => h.node === n);
  const pickOf = (d, n) => { const h = histOf(d).find((x) => x.node === n); return h ? h.id : null; };
  const wildPick = (d, id) => { const h = histOf(d).find((x) => x.wild === id); return h ? h.id : null; };
  /* un imprevisto generico cade tra due scene: il giorno è quello prima della scena che arriva, non quello della scena che arriva */
  const dayOf = (d) => {
    const w = d.wild, nd = NODE_DAY[d.node] || 1;
    if (w && WILD_DAY[w.id]) return WILD_DAY[w.id];
    return w ? Math.max(1, nd - 1) : nd;
  };
  /* le nove carte della bacheca: lo stato di ciascuna dipende dalle mosse e dalla scena in cui ti trovi */
  const boardOf = (d) => {
    const f = d.flags || {}, p2 = pickOf(d, 'n2'), p6 = pickOf(d, 'n6'), lw = wildPick(d, 'legale_assente');
    const ni = idx(d) - (d.wild ? 1 : 0); /* durante un imprevisto la scena successiva non è ancora arrivata */
    const w = d.wild ? d.wild.id : null;
    const penOpen = !!(d.wildUsed && d.wildUsed['s:pentest']) && !f.findingDeclared && !f.findingHidden;
    const legBlocked = !!f.sideLetter || (ni >= 4 && !f.liabilityOk) || w === 'legale_assente' || lw === 'c' || lw === 'd';
    const cols = [
      {
        title: `Sicurezza`,
        cards: [
          { k: 'sec1', t: `Questionario`, st: f.falseClaim ? 'blocked' : seen(d, 'n3') ? 'done' : (seen(d, 'n2') || f.warroom || ni === 2) ? 'doing' : 'todo' },
          { k: 'sec2', t: `Evidenze e pen test`, st: (f.findingHidden || w === 'pentest' || p2 === 'a') ? 'blocked' : (p2 === 'c' || penOpen) ? 'doing' : p2 ? 'done' : 'todo' },
          { k: 'sec3', t: `Residenza dati`, st: f.concealed ? 'blocked' : f.residencyOk ? 'done' : ni >= 4 ? 'blocked' : 'todo' },
        ],
      },
      {
        title: `Legale`,
        cards: [
          { k: 'leg1', t: `Responsabilità`, st: f.liabilityOk ? 'done' : ni >= 3 ? 'blocked' : 'todo' },
          { k: 'leg2', t: `Altre 13 redline`, st: legBlocked ? 'blocked' : (ni >= 6 && f.liabilityOk) ? 'done' : (f.warroom || f.liabilityOk) ? 'doing' : 'todo' },
          { k: 'leg3', t: `Prezzo bloccato`, st: f.sideLetter ? 'blocked' : f.giveGet ? 'done' : ni >= 6 ? 'blocked' : ni === 5 ? 'doing' : 'todo' },
        ],
      },
      {
        title: `Firma`,
        cards: [
          { k: 'fir1', t: `Delega di firma`, st: f.signOk ? 'done' : ni >= 5 ? 'blocked' : 'todo' },
          { k: 'fir2', t: `Firma digitale`, st: w === 'firma_down' ? 'blocked' : f.checklist ? 'done' : p6 === 'b' ? 'blocked' : (f.signOk && ni >= 6) ? 'doing' : ni >= 6 ? 'blocked' : 'todo' },
          { k: 'fir3', t: `Ordine e anagrafica`, st: f.sideLetter ? 'blocked' : f.checklist ? 'done' : p6 === 'b' ? 'blocked' : (p6 || ni >= 6) ? 'doing' : 'todo' },
        ],
      },
    ];
    /* un guasto alla centrale mette tutto in pausa: le carte in corso tornano ferme finché dura l’emergenza */
    if (w === 'incidente') cols.forEach((c) => c.cards.forEach((x) => { if (x.st === 'doing') x.st = 'todo'; }));
    return cols;
  };
  const NUM = ['nessuna', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
  const countSt = (cols, st) => cols.reduce((a, c) => a + c.cards.filter((x) => x.st === st).length, 0);
  /* la lavagna a parole, per le scene: legge lo stesso stato del widget, così testo e schermo non si contraddicono */
  const boardLine = (d) => {
    const cols = boardOf(d), done = countSt(cols, 'done'), red = countSt(cols, 'blocked');
    const g = done === 0 ? `nessuna carta è verde` : done === 1 ? `una carta su nove è verde` : `${NUM[done]} carte su nove sono verdi`;
    const r = red === 0 ? `nessuna è rossa` : red === 1 ? `una è rossa` : `${NUM[red]} sono rosse`;
    return `Sulla lavagna ${g}, ${r}.`;
  };
  const redInFirstTwo = (d) => boardOf(d).slice(0, 2).reduce((a, c) => a + c.cards.filter((x) => x.st === 'blocked').length, 0);

  CL.registerScenario({
    id: 'meridiana',
    title: `Il Paper Process`,
    client: `Meridiana Energia`,
    sector: `Utility · Torino`,
    hook: `Il “sì” è già arrivato. Mancano 320 domande di sicurezza, 14 redline e una firma che non c’è.`,
    brief: `Piattaforma di gestione asset e manutenzione predittiva: €410k di ACV a listino. Elena Bruni, Direttrice Operations, ha detto sì. Ma tra te e la firma ci sono la Sicurezza, il Legale, gli Acquisti e un Direttore Generale in trasferta. Hai undici giorni.`,
    scout: `Il deal è stato dichiarato “chiuso” da Operations, ma il paper process non è stato mai mappato. Il questionario di sicurezza ha 320 domande, il Legale ha 14 redline e il DG, che ha i poteri di firma, è in viaggio fino al 30.`,
    teaches: [`Paper process`, `Sicurezza e compliance`, `Limitazione di responsabilità`, `Side letter`, `Poteri di firma`],
    list: 410, cost: 2, window: [6, 12], stars: 3, lep: 15, slip: 0.35,
    crm: { cat: `Commit`, prob: 85 },
    cast: CAST,

    /* ───── identità: sala di controllo, orologio ───── */
    theme: {
      id: 'control', label: `Sala di controllo Meridiana · Torino`, bg: 'control',
      accent: '#0f766e', accentDark: '#5eead4', ambience: 'control',
      motto: `Undici giorni, tre binari, una data.`,
    },
    intro: {
      when: `Giorno 1 di 11 · lunedì 09:00`, where: `La sala piccola`, view: 'desk', bg: 'office',
      scene: [
        { n: `Lunedì, le nove. Nella sala piccola che ti hanno prestato fino a fine anno il termosifone batte a intervalli regolari e la lavagna digitale è ancora spenta.` },
        { think: `Il sì di Elena è arrivato venerdì sera. Nel CRM c’è scritto 85%. Nessuno ha mai disegnato la strada che porta alla firma.` },
        { mail: { from: `Elena Bruni · Meridiana Energia`, subj: `Valutazione fornitore: tutto il pacchetto` }, t: `Ti mando tutto in un colpo, così parti dalla verità: il questionario di sicurezza (320 domande), le 14 redline del Legale e il modulo di valutazione del fornitore. Ci sentiamo alle 9:40?`, sfx: 'ping' },
        { n: `L’allegato pesa quarantotto megabyte. Lo apri e scorri: centinaia di righe, tre uffici diversi, nessuna data.` },
        { think: `Tre uffici, tre ritmi. E un solo giorno che conta: venerdì 31.` },
        { n: `Trascini il questionario e le redline sulla lavagna e apri tre colonne: Sicurezza, Legale, Firma. Quest’ultima, per ora, non ha un solo foglio dentro. In alto scrivi la data, sotto il conto dei giorni: lo schermo è diventato un quadro di controllo, con tutte le spie ancora spente.` },
        { n: `Alle 9:38 Teams squilla: Elena Bruni.`, sfx: 'phone' },
      ],
    },

    /* ───── widget firma ───── */
    hud: [
      {
        type: 'board', title: `I tre binari`,
        build: (d) => ({ cols: boardOf(d) }),
      },
      {
        type: 'clock', title: `Il conto alla rovescia`,
        build: (d) => {
          const day = dayOf(d), left = Math.max(1, 11 - day), cols = boardOf(d);
          const count = (st) => cols.reduce((a, c) => a + c.cards.filter((x) => x.st === st).length, 0);
          const done = count('done'), blocked = count('blocked');
          const where = `Giorno ${day} di 11 · ${WEEK[day] || ''}.`;
          const state = d.over ? `La pratica è in firma: da qui decide il calendario.`
            : done === 9 ? `Tutte le carte sono verdi. Resta l’ultimo giorno.`
              : cols.map((c) => `${c.title} ${c.cards.filter((x) => x.st === 'done').length}/${c.cards.length}`).join(' · ') + (blocked ? ` · ${blocked} ${blocked === 1 ? 'bloccata' : 'bloccate'}` : ``);
          return {
            days: left, of: 11, label: `Giorni alla firma`,
            urgent: !d.over && ((left <= 4 && blocked >= 1) || (left <= 2 && done < 9)),
            sub: `${where} ${state}`,
          };
        },
      },
      {
        type: 'checklist', title: `L’ultimo giorno`,
        build: (d) => {
          const f = d.flags || {}, p6 = pickOf(d, 'n6');
          return [
            { k: 'c1', t: `Ordine d’acquisto`, st: f.sideLetter ? 'bad' : f.checklist ? 'done' : p6 === 'b' ? 'bad' : f.giveGet ? 'warn' : 'todo',
              note: f.sideLetter ? (f.checklist ? `Il numero c’è, ma gli Acquisti aspettano ancora la lettera.` : `Fermo: gli Acquisti aspettano la lettera.`) : f.checklist ? `Numero confermato dagli Acquisti.` : p6 === 'b' ? `Non è arrivato.` : f.giveGet ? `Il prezzo è nel contratto: può partire.` : `Chi lo emette? Ancora nessun nome.` },
            { k: 'c2', t: `Anagrafica di fatturazione`, st: f.checklist ? 'done' : p6 ? 'warn' : 'todo',
              note: f.checklist ? `Ragione sociale vecchia, trovata in dieci minuti.` : p6 ? `Non verificata da nessuno.` : `Da controllare con gli Acquisti.` },
            { k: 'c3', t: `Firma digitale testata`, st: f.checklist ? 'done' : p6 === 'b' ? 'bad' : f.signOk ? 'warn' : 'todo',
              note: f.checklist ? `Prova fissata prima dell’apertura, con chi firma.` : p6 === 'b' ? `Non abilitata sul certificato.` : f.signOk ? `La delega c’è, la prova no.` : `Non c’è ancora un firmatario.` },
            { k: 'c4', t: `Contatti di backup`, st: f.checklist ? 'done' : f.signOk ? 'warn' : 'todo',
              note: f.checklist ? `Un secondo nome per ogni voce.` : f.signOk ? `Un secondo procuratore, nient’altro.` : `Un solo nome per ogni voce.` },
          ];
        },
      },
    ],

    start: { t: 48, v: 50, u: 48, c: 22, r: 62, have: ['I', 'M', 'C', 'Dc'] },
    caps: [
      { id: 'false', max: 0.25, if: (d) => d.flags.falseClaim, why: `Hai dichiarato conforme un controllo che non puoi dimostrare. La Sicurezza lo ha già visto: il questionario è diventato un caso.` },
      { id: 'conceal', max: 0.15, if: (d) => d.flags.concealed, why: `Hai nascosto un dettaglio sulla residenza dei dati. Quando un CISO scopre un’omissione, il deal è finito.` },
      { id: 'side', max: 0.30, if: (d) => d.flags.sideLetter, why: `Hai promesso una side letter fuori dal contratto. Il Deal Desk non la approva e il Legale la rifiuta: deal in stallo.` },
      { id: 'liab', max: 0.45, if: (d) => !d.flags.liabilityOk, why: `Il tema della responsabilità non è stato risolto: senza una struttura approvabile, il contratto non esce dal Legale.` },
      { id: 'resid', max: 0.50, if: (d) => !d.flags.residencyOk, why: `Il vincolo sulla residenza dei dati è irrisolto: il CISO non può dare il via libera.` },
    ],

    nodes: {
      n1: {
        when: `Giorno 1 di 11 · lunedì 09:40`, view: 'call',
        where: `Call · Teams · lunedì 09:40`,
        scene: [
          { n: `Accetti la chiamata. Elena Bruni è nel suo ufficio in sede, a Torino. Alle sue spalle una bacheca di sughero con i turni di fine anno, fogli sovrapposti, e il disegno di un bambino con un pilone dell’alta tensione; sulla scrivania, un casco da cantiere usato come fermacarte.` },
          { w: 'bruni', a: `sincera`, t: `Il mio direttore vuole firmare entro il 31. Ma il questionario è di Matteo Riva, il nostro CISO, e le redline di Sofia Greco, la General Counsel: hanno i loro tempi, e non dipendono da me.` },
          { think: `“Non dipendono da me.” Il suo sì è sincero, ma vale quanto il potere che ha sugli altri due uffici: poco.` },
          { w: 'bruni', a: `abbassando la voce`, t: `Siamo a fine anno, tieni conto. Metà palazzo è in ferie, la sala controllo non si ferma comunque. Ma il direttore l’ha detto davanti a tutti: il 31.` },
          { n: `Sulla lavagna, in alto, la data: venerdì 31. Sotto, tre colonne vuote e il conto dei giorni.` },
          { think: `Undici giorni, e il fine settimana ne mangia uno senza muovere niente.` },
        ],
        prompt: `Come ti organizzi?`,
        hint: `Undici giorni, tre binari paralleli, un solo regista: tu.`,
        tip: `Il paper process si governa a ritroso dalla data di firma: un referente per binario (sicurezza, legale, firma e acquisti), una cadenza di sincronizzazione breve e scadenze condivise. Chi aspetta che i documenti camminino da soli perde il trimestre.`,
        choices: [
          ch('a', 1, `Giro la cartella ai nostri Legal e Sicurezza: sono loro a dover rispondere. Io inoltro a Elena i riscontri man mano che arrivano e resto a disposizione.`,
            `Delegare tutto ai tecnici sembra efficiente e non lo è: nessuno possiede la data. Il paper process ha un solo regista, e finché non sei tu i documenti restano dove li hai lasciati.`,
            { c: -8, u: -4, r: 10 }, {
              say: `Elena, giro tutto ai nostri Legal e alla Sicurezza: sono loro a dover rispondere. Appena ho i riscontri te li inoltro.`,
              react: [
                { w: 'bruni', a: `dopo un attimo`, t: `Va bene. Io intanto dico al direttore che sei in mano ai tuoi.` },
                { n: `Il resto della giornata sono due mail inoltrate e nessuna data. Quando arriva mercoledì, il questionario è fermo nella casella di un collega in ferie e le redline non le ha aperte nessuno.` },
                { think: `Ho fatto il postino. E un postino non governa gli orari.` },
              ],
              next: 'n2',
            }),
          ch('b', 3, `Apro una war room: un referente per binario, quindici minuti al giorno con CISO e legale, calendario a ritroso dal 31. A Elena chiedo i tempi interni.`,
            `Hai dato a ogni ufficio un nome e una scadenza, e hai chiesto i tempi veri a chi li conosce. Governare a ritroso dal 31 è ciò che separa un “sì” da una firma.`,
            { t: 4, c: 16, r: -8 }, {
              mp: ['Dp', 'P'], set: { warroom: true },
              say: `Elena, prima di leggere una riga facciamo una cosa. Mi serve un referente per ciascun binario: Sicurezza, Legale e Firma. Quindici minuti al giorno con il vostro CISO e il vostro legale, e un calendario che parte dal 31 e torna indietro. Mi dici anche quanto dura, da voi, ogni passaggio?`,
              react: [
                { w: 'bruni', a: `apre un foglio`, t: `Sicurezza: sei giorni, se Riva è contento. Legale: cinque. La firma… due, se troviamo chi firma.` },
                { n: `In un’ora la lavagna si riempie: tre colonne, tre nomi, una data per ciascuna.` },
                { w: 'bruni', a: `sorridendo`, t: `Finalmente qualcuno che sa come si fa.` },
                { think: `Non ho ancora risposto a una sola domanda. Ma adesso so dove vanno messe.` },
              ],
              next: 'n2',
            }),
          ch('c', 0, `Chiedo a Elena se, per un fornitore già noto come Nexora, questionario e risk assessment si possono saltare o ridurre: il tempo stringe e le certificazioni ci sono.`,
            `Chiedere di saltare un controllo è il modo più rapido di sembrare un fornitore da controllare di più. Per un’utility la sicurezza non è un modulo: è il motivo per cui esiste quel reparto.`,
            { t: -8, c: -4, r: 14 }, {
              say: `Elena, tra noi: serve davvero tutto questo? Siamo un fornitore conosciuto, abbiamo le certificazioni, e il tempo stringe. Il questionario e il risk assessment si possono saltare, o almeno ridurre?`,
              react: [
                { w: 'bruni', a: `a disagio`, t: `Non posso, è la procedura. Se la salto io, il primo a chiedermi perché è Riva.` },
                { n: `Il suo sguardo va per un istante fuori campo, verso la sala di controllo. Quando torna su di te è più freddo.` },
                { think: `Elena non lo dirà a nessuno. Ma in un palazzo così le voci hanno le gambe.` },
              ],
              next: 'n2',
            }),
          ch('d', 2, `Scrivo a tutti i referenti, in copia Elena: ricordo la data del 31 e chiedo risposte rapide su ciascuna sezione della cartella, entro la settimana.`,
            `Hai richiamato l’attenzione di tutti, ma una mail non governa un processo: nessuno ha un compito, un nome e una data. È meglio di niente e molto meno di una cadenza.`,
            { c: 2, r: 2 }, {
              say: `Scrivo subito a tutti i referenti, in copia a te: ricordo che si firma entro il 31 e che servono risposte rapide, sezione per sezione.`,
              react: [
                { n: `La mail parte alle 11:05. Alle 11:40 hai due risposte di cortesia e una risposta automatica: “Fuori ufficio fino al 3 gennaio”.` },
                { think: `Ho acceso una spia. Non ho messo nessuno ai comandi.` },
              ],
              next: 'n2',
            }),
        ],
      },

      n2: {
        when: `Giorno 3 di 11 · mercoledì 10:30`, view: 'meeting',
        where: `Incontro · sede Meridiana · mercoledì 10:30`,
        scene: (d) => {
          const p1 = pickOf(d, 'n1');
          return [
            { n: `Mercoledì, sede di Torino. Matteo Riva, il CISO di Meridiana, ti riceve in una sala vetrata che dà sulla sala di controllo: sotto di voi i turnisti guardano il video-wall in silenzio, ognuno con la sua tazza, e la frequenza di rete segna cinquanta virgola zero zero. Accanto a te c’è Davide, il tuo Solution Engineer. Sul tavolo, un panettone già aperto che nessuno tocca.` },
            p1 === 'a' ? { w: 'riva', a: `senza giri di parole`, t: `In questi giorni dal vostro ufficio non mi è arrivato niente, nemmeno un chiarimento sulla prima sezione. Cominciamo da qui, allora.` }
              : p1 === 'b' ? { w: 'riva', a: `con il calendario stampato davanti`, t: `Ho visto il calendario che avete concordato con Elena. Giovedì per le evidenze regge. Il resto lo vedremo strada facendo.` }
                : p1 === 'c' ? { w: 'riva', a: `asciutto`, t: `In questo palazzo le voci corrono: so che avete chiesto di ridurre il questionario. Glielo dico subito, per non perdere tempo: si fa per intero.` }
                  : { w: 'riva', a: `con la mail stampata davanti`, t: `Ho ricevuto la sua mail con la data. La data la conosco. Mi servono i contenuti.` },
            { w: 'riva', a: `metodico, sfogliando una cartellina`, t: `Le domande sono trecentoventi. Voglio le vostre certificazioni, ISO 27001 e SOC 2, l’ultimo penetration test e una sessione dal vivo con chi conosce l’architettura. Entro giovedì.` },
            { w: 'davide', a: `a mezza voce, senza girarsi`, t: `Per rispondere con precisione servono cinque giorni. Fino a giovedì ne abbiamo due.` },
            { think: `Cinque giorni per farlo bene, due a disposizione. E su un questionario contrattuale ogni “conforme” è una firma.` },
            { w: 'riva', a: `chiudendo la cartellina`, t: `Una precisazione. Quello che mi scrivete in queste caselle non è una cortesia: diventa un allegato del contratto, e lo leggerà chi dovrà difenderlo davanti al Consiglio.` },
          ];
        },
        prompt: `Come affronti il questionario?`,
        hint: `Un errore sulla sicurezza costa più di un ritardo. Una risposta ottimista è un errore.`,
        tip: `Nella sicurezza la precisione vale più della velocità. Condividi evidenze (certificazioni, report, trust center), concorda una sessione dal vivo e non rispondere mai “conforme” a un controllo che non sai dimostrare: in un questionario contrattuale è una dichiarazione che ti vincola.`,
        choices: [
          ch('a', 0, `Rispondo io a tutte le domande in due giorni: “conforme” dove sono ragionevolmente sicuro, “non applicabile” dove la domanda non mi è chiara, e consegno entro giovedì.`,
            `In un questionario contrattuale “conforme” è una dichiarazione che ti vincola, e “non applicabile” detto per comodità ne è la gemella. Il danno non è una riga: è la credibilità di tutte le altre.`,
            { t: -12, v: -4, c: -4, r: 18 }, {
              integ: -10, set: { falseClaim: true },
              say: `Mi prendo io l’intero questionario. Due giorni, risposte mie: dove sono ragionevolmente certo scrivo “conforme”, dove la domanda non è chiara “non applicabile”. Consegno giovedì.`,
              react: [
                { n: `Giovedì, alle due del pomeriggio, mandi il file compilato fino all’ultima riga. Alle tre il telefono squilla.`, sfx: 'phone' },
                { w: 'riva', a: `senza fretta`, t: `Ho trovato due incongruenze in un’ora. Alla riga 214 mi scrivete “conforme” per la cifratura dei backup, e il vostro ingegnere dice che quel controllo non c’è.` },
                { w: 'davide', a: `a bassa voce, dopo la chiamata`, t: `Quella riga non la posso confermare. Se me l’avessi chiesta, ti avrei detto di no.` },
                { think: `“Conforme” l’ho scritto io. Adesso è un impegno che Nexora non può mantenere.` },
              ],
              next: 'n3',
            }),
          ch('b', 3, `Gli porto il pacchetto di evidenze (ISO 27001, SOC 2, pen test, trust center) e propongo novanta minuti dal vivo con chi conosce l’architettura.`,
            `Evidenze subito e una sessione dal vivo con chi l’architettura la conosce: Riva non deve fidarsi di te, può verificare. Nella sicurezza la precisione conquista più della velocità.`,
            { t: 8, v: 4, c: 8, r: -14 }, {
              set: { secOk: true },
              say: `Dottor Riva, le porto subito tutto: ISO 27001, SOC 2, l’ultimo penetration test e il trust center. E le propongo novanta minuti dal vivo con Davide, che l’architettura la conosce: molte domande le chiudiamo in sala, le altre le consegniamo con le evidenze allegate.`,
              react: [
                { w: 'riva', a: `si appoggia allo schienale`, t: `Questo è più utile di un modulo. Novanta minuti, domani alle nove.` },
                { n: `Il giorno dopo, nella sala vetrata, Davide disegna l’architettura su un foglio da lavagna. Riva interrompe poco e annota molto. Alle undici metà delle domande è chiusa.` },
                { think: `Parlano la stessa lingua. Io non devo tradurre: devo solo stare zitto al momento giusto.` },
              ],
              next: 'n3',
            }),
          ch('c', 2, `Gli chiedo di consegnarmi per prime le domande critiche e le altre in seguito: chiudiamo subito ciò che pesa di più e il resto a ondate.`,
            `Il triage fa risparmiare tempo dove pesa di più, ma lascia duecentosessanta domande in coda mentre la data resta ferma. È un buon compromesso che non cambia la pendenza del problema.`,
            { t: 2, c: 4, r: -6 }, {
              set: { secOk: true },
              say: `Dottor Riva, per non farle perdere tempo: mi consegni prima le domande critiche, quelle che per lei pesano di più, e le altre in seguito.`,
              react: [
                { w: 'riva', a: `dopo averci pensato`, t: `Accetto il triage. Le prime sessanta sono quelle che contano: le voglio chiuse in due giorni.` },
                { n: `Annota le sessanta righe su un foglio a parte e le sottolinea. Le altre duecentosessanta restano nel file, e la data in cima alla lavagna non si sposta.` },
              ],
              next: 'n3',
            }),
          ch('d', 3, `Dedico Davide a tempo pieno per due giorni: guida lui la sessione con Riva e garantisce di persona la correttezza di ogni risposta tecnica.`,
            `Mettere in campo il tecnico che conosce l’architettura è la mossa che un CISO rispetta di più: ogni risposta ha un nome e un’evidenza. È un jolly speso bene, dove un errore costerebbe di più.`,
            { t: 10, v: 6, c: 10, r: -18 }, {
              jolly: 'se', set: { secOk: true },
              say: `Dottor Riva, le metto Davide a disposizione per due giorni interi. Guida lui la sessione con lei e garantisce di persona la correttezza di ogni risposta tecnica, con le evidenze allegate.`,
              react: [
                { w: 'davide', a: `alla lavagna`, t: `Partiamo dai controlli di accesso e dalla cifratura. Dove manca qualcosa, lo dico subito.` },
                { w: 'riva', a: `alla seconda domanda`, t: `Questa è sicurezza fatta bene.` },
                { n: `Due domande si chiudono con un’integrazione al contratto, scritta lì sul tavolo, a quattro mani.` },
              ],
              next: 'n3',
            }),
        ],
      },

      n3: {
        when: `Giorno 5 di 11 · venerdì 11:00`, view: 'call',
        where: `Videocall · Teams · venerdì 11:00`,
        scene: (d) => [
          { n: `Venerdì, le undici, vigilia di Natale. Sofia Greco, la General Counsel di Meridiana, compare sullo schermo da uno studio senza finestre: scaffali di codici rilegati, una sola lampada, un blocco con la penna allineata al bordo. Non ci sono saluti.` },
          d.flags.falseClaim ? { w: 'greco', a: `leggendo dal blocco`, t: `Il dottor Riva mi ha segnalato due righe del vostro questionario che non tornano. Le terrò presenti, mentre parliamo di clausole.` } : null,
          { w: 'greco', a: `ferma`, t: `La nostra politica: responsabilità illimitata per violazioni di dati e per danni indiretti. Non si negozia: è un requisito del Consiglio.` },
          { n: `Sul tuo secondo schermo hai aperto la policy di Nexora: limite di responsabilità pari a dodici mesi di canone, con un super-cap pari a tre volte il canone per le violazioni di dati personali.` },
          { think: `Illimitato contro dodici mesi. Due policy, e nessuna delle due l’ha scritta chi è in questa call.` },
          { w: 'greco', a: `senza alzare la voce`, t: `Non è ostinazione. È il mandato che ho ricevuto, e a me non spetta cambiarlo.` },
          { n: `La penna resta ferma sul blocco. Dietro di lei, appeso a una libreria, un solo ornamento di Natale: sembra lì per errore.` },
        ].filter(Boolean),
        prompt: `Come tratti la responsabilità?`,
        hint: `Entrambi hanno un vincolo di policy. Si cerca una struttura, non una vittoria.`,
        tip: `Due policy incompatibili si risolvono con una struttura intermedia: cap standard + super-cap per i rischi più critici + evidenza assicurativa. “Illimitato” non è approvabile, e un “no” secco chiude il tavolo.`,
        choices: [
          ch('a', 0, `Accetto la responsabilità illimitata: la chiusura del trimestre pesa più di una clausola, e con il nostro Legal me la vedo io, a cose fatte.`,
            `Hai promesso una clausola che non puoi dare. Il costo non è la clausola: è che il nostro Legal la blocca, e prima o poi a Greco toccherà sentirsi dire che la tua parola non vale. Due giorni persi e una credibilità da ricostruire.`,
            { t: -4, c: -6, r: 14 }, {
              integ: -6,
              say: `Dottoressa, accettiamo la responsabilità illimitata. Per noi la data conta più della clausola: al nostro Legal ci penso io.`,
              react: [
                { w: 'greco', a: `prende nota`, t: `Bene. Ne prendo atto.` },
                { n: `La risposta del Legal di Nexora arriva in un’ora, senza giri di parole: la clausola non è approvabile, non lo sarà, e non è mai stata in discussione.` },
                { think: `Ho firmato con la voce un assegno che non è mio. Adesso devo trovare chi lo copre.` },
              ],
              next: 'n4',
            }),
          ch('b', 3, `Propongo dei livelli: cap a dodici mesi di canone per l’ordinario, super-cap a 3x per i dati personali, con copia della nostra polizza cyber.`,
            `Hai lasciato a Greco il suo principio, un tetto più alto proprio dove il danno è maggiore, e a Nexora il suo limite, un tetto che la polizza copre davvero. Non hai vinto la clausola: hai reso approvabile il contratto.`,
            { t: 6, v: 4, c: 12, r: -12 }, {
              mp: ['P'], set: { liabilityOk: true },
              say: `Dottoressa, capisco che il mandato sia questo e non le chiedo di aggirarlo. Le propongo una struttura che il Consiglio possa difendere: per la responsabilità ordinaria un cap pari a dodici mesi di canone; per le violazioni di dati personali un super-cap a tre volte il canone; e allego la polizza cyber di Nexora, così il rischio più grave ha una copertura molto più alta.`,
              react: [
                { w: 'greco', a: `dopo una pausa, la penna ferma`, t: `Una struttura difendibile davanti al Consiglio. Alleghi la polizza. E sul super-cap voglio un quattro.` },
                { n: `Mezz’ora dopo il Legal di Nexora risponde: tre e mezzo, non di più.` },
                { w: 'greco', t: `Tre e mezzo. Si chiude.` },
                { think: `Nessuno ha vinto. È l’unica forma in cui questa clausola poteva uscire da qui.` },
              ],
              next: 'n4',
            }),
          ch('c', 3, `Attivo il Legal fast-track: il nostro avvocato parla direttamente con Greco e chiudiamo la clausola in una call di un’ora, oggi stesso.`,
            `Far parlare i due legali direttamente è il modo più rapido di arrivare a un compromesso difendibile: parlano la stessa lingua e non servono interpreti. Ma è un jolly: spendilo dove serve davvero, come qui.`,
            { t: 4, c: 14, r: -14 }, {
              jolly: 'legal', mp: ['P'], set: { liabilityOk: true },
              say: `Dottoressa, il nostro avvocato è disponibile oggi stesso: le propongo una call tra voi due, un’ora, per chiudere la clausola da giurista a giurista.`,
              react: [
                { n: `Alle due del pomeriggio nel riquadro compare l’avvocato di Nexora, con il testo già aperto. Greco lo guarda, poi guarda te, poi riabbassa gli occhi sul blocco.` },
                { w: 'greco', a: `dopo cinquanta minuti`, t: `Super-cap a tre e mezzo, allegato assicurativo. Sono d’accordo.` },
                { think: `Quando due avvocati parlano la stessa lingua, io posso uscire dalla stanza.` },
              ],
              next: 'n4',
            }),
          ch('d', 1, `Rispondo con un no netto: la policy di Nexora non prevede deroghe e non c’è margine di trattativa, né da parte mia né del nostro Legal. Meglio chiarirlo subito.`,
            `Un no secco chiude il tavolo senza lasciare un’alternativa: Greco non ha mandato per cambiare la sua policy, e tu non ne hai proposta un’altra. Hai fermato la trattativa, non l’hai difesa.`,
            { t: -6, c: -6, r: 10 }, {
              say: `Dottoressa, la policy di Nexora non prevede deroghe. Non ho margine su questo punto, e preferisco dirlo subito.`,
              react: [
                { w: 'greco', a: `dopo un silenzio`, t: `Allora il Consiglio non può approvare.` },
                { n: `La call si chiude con un “buon fine settimana” detto da una voce che non lo pensa. Sul tuo blocco, sotto il nome di Greco, resta una riga: nessuna proposta.` },
                { think: `Un no non è una posizione negoziale: è una porta chiusa con me dentro.` },
              ],
              next: 'n4',
            }),
        ],
      },

      n4: {
        enter: { fx: { r: 8 } },
        when: `Giorno 7 di 11 · lunedì 08:20`, view: 'mail', caption: `Non conformità: residenza dei dati`,
        where: `Email · CISO Meridiana · lunedì 08:20`,
        scene: (d) => [
          { n: `Lunedì, otto e venti. Sul telefono una notifica di Teams, in posta una mail con l’oggetto in evidenza. Il mittente è lo stesso: Matteo Riva. In copia, Elena e Sofia Greco.` },
          { chat: { from: 'riva', app: 'Teams' }, t: `Le ho scritto su un punto di conformità. Chiedo conferma di lettura entro la mattinata.`, sfx: 'ping' },
          { mail: { from: `Matteo Riva · CISO Meridiana Energia`, subj: `Non conformità: residenza dei dati` }, t: `C’è un punto che non va: dal vostro addendum risulta che il supporto di secondo livello è erogato da una società in un Paese extra-UE. Non è conforme alla nostra policy sulla residenza dei dati. Attendo il vostro riscontro.` },
          { think: `Ha letto l’addendum riga per riga. Il fine settimana di Natale gli è bastato.` },
          d.flags.falseClaim ? { think: `Dopo la riga 214, ogni sua mail la leggo due volte.` } : null,
          { n: `È vero. Per le ore notturne Nexora si appoggia a un fornitore di supporto fuori dall’Unione: sta a pagina nove, in un paragrafo che finora nessuno aveva messo in evidenza.` },
          { think: `Il punto è reale. Quello che faccio nei prossimi dieci minuti decide se resta un punto o diventa un caso.` },
        ].filter(Boolean),
        prompt: `Come rispondi?`,
        hint: `La verità emerge sempre. Meglio che emerga da te, con una soluzione.`,
        tip: `Quando il cliente trova un problema reale, riconoscilo e porta una soluzione contrattuale. Un’opzione “EU-only” con SLA ridotto è un’offerta commerciale, non una scusa. Un’omissione, invece, trasforma un problema di compliance in uno di integrità.`,
        choices: [
          ch('a', 0, `Ritiro quel documento dal portale e ne carico una versione corretta, senza il riferimento al supporto extra-UE: così la questione si chiude subito.`,
            `Ritirare un documento tracciato è peggio del problema che nasconde: da un tema di compliance sei passato a un tema di integrità, che per un CISO non ha rimedio. Un’omissione si scopre sempre, e costa più della verità.`,
            { t: -16, v: -6, c: -8, r: 20 }, {
              integ: -12, set: { concealed: true },
              say: `Ritiro l’addendum dal portale e ne carico una versione senza il paragrafo sul supporto di secondo livello. A Riva scrivo soltanto: “In allegato la versione aggiornata”.`,
              react: [
                { n: `Alle 10:05 il telefono vibra. Non è una mail: è Riva, che chiama.`, sfx: 'phone' },
                { w: 'riva', a: `piano, scandendo`, t: `Le versioni sono tracciate. Ho davanti la prima e la seconda, e so cosa è cambiato tra l’una e l’altra. Mi state nascondendo qualcosa?` },
                { think: `Il problema era la residenza dei dati. Adesso il problema sono io.` },
              ],
              next: 'n5',
            }),
          ch('b', 3, `Confermo che è così e propongo il supporto “EU-only”: SLA notturno ridotto, primo anno gratis, nessun trasferimento di dati fuori dall’UE senza consenso.`,
            `Riconoscere il problema e portare subito una soluzione contrattuale trasforma un’obiezione in un’opzione commerciale. Riva non cerca fornitori perfetti: cerca fornitori che dicano la verità.`,
            { t: 8, v: 4, c: 8, r: -16 }, {
              integ: 3, set: { residencyOk: true },
              say: `Dottor Riva, ha ragione: per le ore notturne ci appoggiamo a un fornitore fuori dall’UE. Le porto subito una soluzione: un’opzione di supporto “EU-only”, con SLA notturno ridotto, senza costi aggiuntivi nel primo anno, e una clausola che vieta ogni trasferimento di dati fuori dall’UE senza il vostro consenso.`,
              react: [
                { w: 'riva', a: `dopo qualche secondo`, t: `Apprezzo la trasparenza. Un’opzione EU-only, con queste garanzie, rientra nella nostra policy.` },
                { n: `Dall’altra parte della linea senti scorrere una penna: accanto a “residenza dati”, Riva traccia una spunta.` },
                { think: `Il problema l’ha trovato lui. La soluzione l’ho portata io: era l’unica cosa che potevo ancora scegliere.` },
              ],
              next: 'n5',
            }),
          ch('c', 1, `Prometto che entro sei mesi cambieremo il fornitore di supporto, ma per ora non possiamo cambiarlo: chiedo di procedere così, sulla mia parola, per non perdere altro tempo.`,
            `Una promessa futura non risolve un vincolo di oggi: Riva deve approvare ciò che esiste, non ciò che prometti. Hai assunto un impegno che non puoi garantire e lasciato il problema dov’era.`,
            { t: -4, c: -2, r: 8 }, {
              integ: -3,
              say: `Dottor Riva, entro sei mesi cambieremo il fornitore di supporto. Oggi non posso, ma le do la mia parola sull’impegno. Le chiedo di procedere così, per non perdere altro tempo.`,
              react: [
                { w: 'riva', a: `asciutto`, t: `Non posso approvare una promessa. Devo approvare ciò che c’è oggi.` },
                { think: `Sei mesi. Chi me li ha concessi? Nessuno: li ho appena inventati.` },
              ],
              next: 'n5',
            }),
          ch('d', 2, `Gli chiedo un giorno per verificare cosa possiamo garantire davvero, senza anticipare risposte né soluzioni, e poi torno con una proposta.`,
            `Prendere tempo è meno grave che improvvisare, e il giorno dopo la soluzione giusta è sul tavolo. Il costo sono ventiquattro ore sul calendario, in un momento in cui ogni binario conta.`,
            { t: 2, c: 2, r: -6 }, {
              set: { residencyOk: true },
              say: `Dottor Riva, mi dia un giorno: voglio verificare cosa possiamo garantire davvero prima di risponderle, senza anticipare nulla che poi non regga.`,
              react: [
                { w: 'riva', a: `dopo averci pensato`, t: `Un giorno. Non di più.` },
                { n: `Chiudi la mail e chiami Davide e il Legal: per ventiquattro ore la tua unica pratica è questa.` },
              ],
              next: 'n5',
            }),
        ],
      },

      n5: {
        when: `Giorno 9 di 11 · mercoledì 16:10`, view: 'desk',
        where: `La sala piccola · mercoledì 16:10`,
        scene: (d) => [
          { n: `Mercoledì pomeriggio, poco dopo le quattro. Nella sala piccola l’unico orario che conta è quello scritto in alto sulla lavagna. ${boardLine(d)} La colonna Firma, per il resto, è quasi bianca.` },
          d.flags.concealed ? { n: `Dalla Sicurezza è partita una richiesta di rilettura di tutti gli allegati dell’addendum, con te in copia: nessuna spiegazione chiesta, nessun saluto.` } : null,
          ['a', 'b', 'd'].indexOf(wildPick(d, 'dg_anticipa')) >= 0 ? { n: `Per il Direttore Generale la scadenza era stasera: Elena ha la voce di chi deve ancora dirgli che la colonna Firma non è pronta.` } : null,
          { w: 'bruni', a: `in vivavoce, a disagio`, t: `Il nostro Direttore Generale è in trasferta fino al 30: il procuratore con poteri di firma sarebbe lui. E dagli Acquisti chiedono una lettera aggiuntiva per bloccare il prezzo per tre anni, fuori dal contratto principale.` },
          { n: `Mentre lei parla, sul telefono arriva un messaggio di Luca Ferrero, il responsabile degli Acquisti.` },
          { chat: { from: 'acq', app: 'WhatsApp' }, t: `Per il prezzo bloccato basta una lettera a parte, tanto il contratto resta lo stesso. Me la mandi entro stasera? Poi la chiudo con la direzione.`, sfx: 'ping' },
          { think: `Un firmatario che non c’è e una promessa che nessuno controlla. Due modi diversi di perdere il trimestre.` },
          { n: `Sopra la colonna Firma, il conto dei giorni segna due.` },
        ].filter(Boolean),
        prompt: `Come gestisci firma e lettera?`,
        hint: `Chi può firmare davvero? E perché qualcuno vorrebbe una promessa fuori dal contratto?`,
        tip: `Verifica sempre chi ha i poteri di firma (procura, delega, firma digitale qualificata) e prepara la delega in anticipo. Una side letter fuori dal contratto è la promessa più pericolosa: nessuno la controlla, nessuno la approva, e si ritorce contro di te.`,
        choices: [
          ch('a', 0, `Preparo la lettera aggiuntiva con il prezzo bloccato per tre anni e la mando agli Acquisti oggi stesso: è il modo più rapido per chiudere il punto.`,
            `Una lettera fuori contratto è la promessa più pericolosa: nessuno la controlla, nessuno la approva, e ti vincola lo stesso. Il Deal Desk la ferma, e hai perso in credibilità ciò che avevi guadagnato in rapidità.`,
            { t: -4, c: -6, r: 16 }, {
              integ: -10, set: { sideLetter: true },
              say: `Luca, d’accordo: ti preparo la lettera con il prezzo bloccato per tre anni e te la mando oggi. Così chiudiamo.`,
              react: [
                { chat: { from: 'acq', app: 'WhatsApp' }, t: `Perfetto, grazie. Così lo chiudo con la direzione entro stasera.` },
                { n: `Giovedì mattina, nella revisione del Deal Desk, la lettera salta fuori. Giulia Ferraro, del Deal Desk, ti chiama prima ancora che tu abbia finito il caffè.`, sfx: 'phone' },
                { w: 'giulia', a: `netta`, t: `Questa non la firma nessuno. Un prezzo bloccato fuori dal contratto non passa dal Deal Desk, e se è già in mano agli Acquisti ci vincola lo stesso.` },
                { think: `Ho promesso fuori dal perimetro approvato. E adesso lo sanno tutti.` },
              ],
              next: 'n6',
            }),
          ch('b', 3, `Metto il prezzo bloccato per tre anni nel contratto principale, con un tetto all’indicizzazione, e chiedo a Elena se il DG può delegare la firma.`,
            `Hai fatto due cose insieme: portato la richiesta dentro il contratto, dove chi deve approvare può vederla, e verificato chi può davvero firmare. Un firmatario con nome e delega vale più di una data scritta.`,
            { t: 4, u: 4, c: 14, r: -12 }, {
              mp: ['P', 'E'], set: { signOk: true, giveGet: true },
              say: `Elena, facciamo due cose, e in chiaro. Il prezzo bloccato per tre anni lo scriviamo nel contratto principale, con un tetto all’indicizzazione, così lo vede chi deve approvarlo. E tu verifichi entro domani se il direttore può delegare la firma a un secondo procuratore, con firma digitale qualificata, mentre è in trasferta.`,
              react: [
                { w: 'bruni', a: `richiamando, un’ora dopo`, t: `Controllato. C’è una delega valida per il Direttore Finanziario, Paolo Operti, fino a cinquecentomila euro. E la firma digitale qualificata è già attiva sul suo certificato.` },
                { n: `L’importo dell’ordine sta dentro il tetto della delega. Sulla lavagna la carta “Delega di firma” diventa verde.` },
                { think: `Trasparente e approvabile. Per una volta, tutto quello che serve è anche tutto quello che è scritto.` },
              ],
              next: 'n6',
            }),
          ch('c', 1, `Attendo il rientro del DG il 30 e lo faccio firmare lui: nel frattempo lascio da parte sia la lettera sia il tema del prezzo bloccato, per non forzare nessuno.`,
            `Aspettare il rientro del DG porta la firma all’ultimissimo giorno e lega il trimestre a un solo volo: se tarda ventiquattro ore, il trimestre è chiuso. Un piano che dipende da una persona, nel paper process, è un piano senza piano B.`,
            { u: -6, c: -6, r: 10 }, {
              say: `Elena, aspettiamo il direttore: il 30 rientra e firma lui. La lettera e il prezzo li lasciamo fermi fino ad allora, non voglio forzare nessuno.`,
              react: [
                { w: 'bruni', a: `con un sospiro`, t: `Va bene. Ma ti dico già che il 30 sera avrà la casella piena e l’agenda a pezzi.` },
                { think: `Se il volo del 30 tarda, non ho un secondo nome da chiamare.` },
              ],
              next: 'n6',
            }),
          ch('d', 2, `Faccio costruire al Deal Desk una clausola di protezione sul prezzo nel contratto principale, e con Elena cerco chi può firmare al posto del DG.`,
            `Il Deal Desk risolve bene il prezzo, e portare l’attenzione sul firmatario era l’altra metà del problema. Hai perso un giorno, ma il trimestre ha di nuovo un nome sulla firma.`,
            { t: 2, c: 10, r: -8 }, {
              jolly: 'desk', mp: ['E'], set: { giveGet: true, deskApproved: true, signOk: true },
              say: `Elena, il prezzo lo proteggiamo dentro il contratto: ci lavora il Deal Desk. Tu, intanto, scopri chi altro in Meridiana ha il potere di firmare mentre il direttore è via.`,
              react: [
                { w: 'giulia', a: `un’ora dopo`, t: `Ecco il testo: clausola di indicizzazione nel contratto principale, nessuna lettera. Approvata.` },
                { w: 'bruni', a: `il giorno dopo, al telefono`, t: `Ho trovato: il Direttore Finanziario, Paolo Operti, ha una delega. Fino a cinquecentomila.` },
                { think: `Un giorno in più, ma stavolta la firma ha un nome.` },
              ],
              next: 'n6',
            }),
        ],
      },

      n6: {
        when: `Giorno 10 di 11 · giovedì 17:30`, view: 'call', bg: 'night',
        where: `Videocall · Teams · giovedì 17:30`,
        scene: (d) => [
          { n: `Giovedì, le diciassette e trenta: il penultimo giorno del trimestre. Nella sala piccola il vetro è ormai uno specchio scuro con le luci della città: fuori è buio da un’ora. ${boardLine(d)}` },
          d.flags.sideLetter
            ? { think: `La lettera l’ha fermata Giulia, ma a Luca nessuno ha ancora spiegato perché non arriva. L’ordine d’acquisto aspetta proprio quella.` }
            : (d.flags.signOk && d.flags.liabilityOk && d.flags.residencyOk)
              ? { think: `Sulla carta è tutto a posto. Sulla carta: nessuno ha ancora detto chi, domattina, preme il tasto.` }
              : { think: `Non è tutto a posto, e lo so. A un giorno dalla firma conta capire quale buco si chiude e quale resta aperto.` },
          { n: `Elena è collegata dalla sala di controllo, in piedi accanto al banco dei turnisti. Alle sue spalle il video-wall è una scacchiera di luci ambra e verdi, e un orologio a muro segna il cambio turno tra mezz’ora.` },
          { w: 'bruni', a: `con la voce stanca`, t: `Ho ancora dei dubbi: chi invia l’ordine d’acquisto, chi verifica l’anagrafica di fatturazione, e se la firma digitale funziona davvero con il nostro sistema.` },
          { think: `Tre domande, e dietro ciascuna una persona diversa che crede di non essere quella giusta.` },
          { n: `Un turnista le porge il registro di consegne. Elena firma senza guardarlo, con l’altra mano ferma sul telefono.` },
        ],
        prompt: `Come blindi l’ultimo giorno?`,
        hint: `L’ultimo dettaglio dimenticato è quello che ti costa il trimestre.`,
        tip: `A chiusura vicina, una checklist condivisa con i responsabili di ogni voce (ordine d’acquisto, anagrafica, firma digitale testata, contatti di backup) vale più di una buona intenzione. Nessuno esce dalla call senza un impegno scritto.`,
        choices: [
          ch('a', 3, `Convoco subito venti minuti con Elena e un referente per ogni voce: numero d’ordine, anagrafica, firma testata. Nessuno esce senza un impegno scritto.`,
            `Una call finale con un impegno scritto per ogni voce non è un rituale: è l’unico modo di trovare l’errore piccolo prima che diventi un ritardo grande. L’anagrafica sbagliata, scoperta venerdì mattina, sarebbe costata la giornata.`,
            { t: 4, u: 6, c: 12, r: -12 }, {
              mp: ['P', 'Co'], set: { checklist: true },
              say: `Elena, venti minuti, adesso: voi, il Legale, la Sicurezza e gli Acquisti. Una checklist con quattro voci: numero d’ordine, anagrafica di fatturazione, firma digitale testata, contatti di backup. Per ognuna un nome che si prende l’impegno, per iscritto. Nessuno esce dalla call senza.`,
              react: (d) => [
                { n: `Alle 17:50 le finestre sono tutte aperte: Elena dalla sala di controllo, il Legale, la Sicurezza, gli Acquisti. Una per una, ciascuno dice a voce che cosa farà e lo scrive nella chat della call prima di uscire.` },
                { w: 'acq', a: `controllando il gestionale`, t: `L’anagrafica di fatturazione ha ancora la ragione sociale vecchia. Si corregge, ma serve una visura aggiornata.` },
                d.flags.sideLetter ? { w: 'acq', a: `senza alzare lo sguardo`, t: `Il numero d’ordine lo emetto domattina. La lettera sul prezzo, però, la aspetto ancora.` } : null,
                { w: 'bruni', a: `quando la call si chiude`, t: `Vorrei che tutti i fornitori lavorassero così.` },
                d.flags.sideLetter
                  ? { think: `L’errore piccolo l’abbiamo trovato in tempo. Quello grosso, la lettera, l’ho aperto io e resta lì.` }
                  : { think: `Dieci minuti per trovare un errore che, venerdì mattina, ci sarebbe costato la giornata.` },
              ].filter(Boolean),
              next: 'END',
            }),
          ch('b', 1, `Mando una mail di conferma a tutti con i punti da chiudere entro domattina e confido che ciascuno faccia la sua parte, senza altri solleciti.`,
            `Una mail dice a tutti che qualcosa va fatto, non chi lo fa. Il giorno dopo manca l’ordine d’acquisto e la firma non è abilitata: ritardi piccoli che, a fine trimestre, pesano come grandi.`,
            { c: -4, r: 6 }, {
              say: `Elena, vi mando una mail riepilogativa con i punti da chiudere entro domattina. Conto su ciascuno di voi.`,
              react: [
                { w: 'bruni', t: `Ricevuta. Buona serata, e grazie.` },
                { n: `Alle 18:00 il turno cambia e il video-wall si riaccende di altre luci. La tua mail resta nella posta di quattro persone che hanno già staccato.` },
                { think: `A quest’ora quattro caselle di posta sono quattro stanze vuote.` },
              ],
              next: 'END',
            }),
          ch('c', 2, `Preparo una checklist condivisa con tutte le voci dell’ultimo giorno e la invio a tutti, chiedendo di compilarla e di segnalarmi eventuali blocchi entro domattina.`,
            `La checklist ordina il lavoro, ma senza un impegno assunto in tempo reale resta un documento. Funziona a metà: ciò che nessuno si è preso, nessuno lo fa.`,
            { c: 4, r: -2 }, {
              say: `Elena, vi mando una checklist condivisa con tutte le voci dell’ultimo giorno: ordine, anagrafica, firma digitale, backup. Chi può la compila stasera, gli altri domattina, e se qualcosa si blocca mi scrivete subito.`,
              react: [
                { w: 'bruni', a: `scorrendo il file`, t: `Ordinata, grazie. Le mie voci le compilo adesso.` },
                { n: `Alle 20:15 le caselle compilate sono metà. Le altre aspettano ancora un nome.` },
              ],
              next: 'END',
            }),
          ch('d', 0, `Spingo Elena a chiudere comunque stasera: il contratto è a posto, e prima che qualcuno trovi altri problemi è meglio avere la firma in mano.`,
            `Spingere un cliente regolato a firmare in fretta vuol dire dirgli di non guardare bene. Per un’azienda che registra ogni bullone è esattamente il segnale sbagliato.`,
            { t: -6, c: -2, r: 8 }, {
              say: `Elena, chiudiamo stasera. Il contratto è pronto, e ogni ora che passa è un’occasione in più per riaprire qualcosa: facciamo firmare adesso, prima che qualcuno trovi altro da chiedere.`,
              react: [
                { w: 'bruni', a: `irrigidita`, t: `Non voglio firmare nulla che non sia a posto. Se c’è un problema, lo voglio vedere prima della firma, non dopo.` },
                { think: `Ho appena chiesto di firmare in fretta a una persona che, tra mezz’ora, firma un registro di consegne.` },
              ],
              next: 'END',
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'pentest', title: `Il penetration test trova un finding`, w: 2, after: ['n2'],
        node: {
          when: `Giorno 4 di 11 · giovedì 18:10`, view: 'phone', bg: 'night',
          where: `Telefono · Davide Ferri · giovedì 18:10`,
          scene: (d) => {
            const shared = ['b', 'd'].indexOf(pickOf(d, 'n2')) >= 0;
            return [
              { n: `Giovedì, le sei e dieci. Stai chiudendo la giornata quando Davide chiama: ha la voce che usa quando ha letto qualcosa di spiacevole.`, sfx: 'phone' },
              { w: 'davide', a: `al telefono`, t: `È tornato il penetration test di terza parte. Un finding di gravità media sull’endpoint di export dei report: autenticazione debole. Si sistema, la correzione è pronta lunedì. Ma c’è, ed è scritto con il logo del tester.` },
              d.flags.falseClaim
                ? { think: `Riva ha già due incongruenze in mano e un’opinione su di me. Un terzo problema non lo leggerà come un incidente: lo leggerà come un’abitudine.` }
                : shared
                  ? { think: `Riva ha già il report precedente: sa che esiste e come si legge. Se glielo aggiorno io è un aggiornamento. Se lo trova lui è una scoperta.` }
                  : { think: `Con Riva ho concordato le domande critiche, non ancora le evidenze. Questo finding è il primo fatto serio che dovrò scegliere se dargli.` },
              { n: `La scheda è sul secondo schermo: nessuna prova di sfruttamento, tre righe di codice da correggere. È piccolo. È anche nero su bianco.` },
            ];
          },
          prompt: `Il finding è reale e il questionario è in corso. Cosa fai?`,
          hint: `Una vulnerabilità nota e dichiarata è un fatto di gestione. Una vulnerabilità nota e taciuta diventa un fatto di integrità.`,
          tip: `Un finding non è una colpa: è il segno che il processo funziona. Dichiaralo con un piano di correzione e una data, prima che lo trovi il cliente. Il silenzio trasforma un difetto tecnico in un problema di integrità.`,
          choices: [
            ch('a', 3, `Lo dichiaro a Riva stasera: finding, gravità, correzione prevista lunedì, e aggiorno di conseguenza il questionario con quanto emerso.`,
              (d) => (d.flags.falseClaim
                ? `Con la credibilità già incrinata, dichiarare è l’unica mossa che può rimetterla in piedi. Il costo è alto lo stesso, ma Riva rispetta chi gli porta un problema prima che lo trovi da solo.`
                : ['b', 'd'].indexOf(pickOf(d, 'n2')) >= 0
                  ? `Hai fatto ciò che un fornitore serio deve fare: dichiarare un finding con piano e data, su un report che Riva già conosce. Per lui non è una crepa: è la prova che il processo funziona.`
                  : `Dichiarare presto, con una correzione e una data, trasforma un difetto in un fatto di gestione. Con Riva hai costruito ancora poca fiducia, ma così la inizi nel modo giusto.`),
              (d) => (d.flags.falseClaim ? { t: 3, c: 2, r: -2 } : ['b', 'd'].indexOf(pickOf(d, 'n2')) >= 0 ? { t: 6, v: 2, c: 4, r: -6 } : { t: 4, c: 3, r: -4 }), {
                next: 'RET', set: { findingDeclared: true },
                say: `Dottor Riva, le scrivo adesso perché preferisco che lo senta da me. Il penetration test di terza parte ha trovato un finding di gravità media sull’endpoint di export: autenticazione debole, nessuna prova di sfruttamento. La correzione è pronta lunedì, e le mando il questionario aggiornato di conseguenza.`,
                react: (d) => (d.flags.falseClaim
                  ? [
                    { w: 'riva', a: `dopo una lunga pausa`, t: `Grazie per avermelo detto. Dopo le due righe sbagliate del questionario, ne avevo bisogno. Lunedì voglio la correzione e il report di verifica.` },
                    { think: `Non è una riabilitazione. È un punto in cui, per una volta, ha avuto ragione a fidarsi.` },
                  ]
                  : [
                    { w: 'riva', a: `rapido`, t: `Preferisco così. Un finding dichiarato con la data della correzione lo gestisco; uno scoperto, no. Lunedì voglio il report di verifica.` },
                    { think: `Gli ho dato un problema, e un motivo per credere ai prossimi report.` },
                  ]),
              }),
            ch('b', 0, `Non dico nulla finché la correzione non è fatta: lunedì mando il report aggiornato, pulito, senza storia. Un problema chiuso non è più un problema.`,
              (d) => (d.flags.falseClaim
                ? `Dopo una dichiarazione falsa, un finding taciuto è la seconda omissione in pochi giorni: se Riva la trova, non leggerà due errori, ma un metodo.`
                : `Un finding noto e taciuto è un’omissione con una data di inizio: se Riva lo trova da solo, il problema non sarà più sull’endpoint ma su di te. La correzione sistema il codice, non la fiducia.`),
              (d) => (d.flags.falseClaim ? { t: -8, v: -2, r: 12 } : { t: -5, c: -2, r: 8 }), {
                next: 'RET', integ: -4, set: { findingHidden: true },
                say: `Davide, teniamolo per noi finché la correzione non è fatta. Lunedì mando il report aggiornato, pulito: non c’è niente da raccontare di un problema chiuso.`,
                react: [
                  { w: 'davide', a: `lentamente`, t: `Se qualcuno in Meridiana rilancia il test per conto suo, vede il finding prima della correzione. E noi lo sapevamo da giovedì.` },
                  { think: `Ho comprato tre giorni di tranquillità e preso un debito con gli interessi.` },
                ],
              }),
            ch('c', 2, `Chiedo a Davide di accelerare la correzione e di verificarla due volte. Lo comunico a Riva lunedì, insieme al report aggiornato.`,
              `Hai scelto una via di mezzo: il finding verrà dichiarato, ma con tre giorni di silenzio nel mezzo. Se nel frattempo Riva lo trova per conto suo, la sequenza verrà letta nel modo peggiore.`,
              (d) => (d.flags.falseClaim ? { t: -1, c: 1, r: 1 } : { t: 1, c: 2, r: -2 }), {
                next: 'RET',
                say: `Davide, mettici tutto il tempo che serve per correggerlo e verificarlo due volte. A Riva lo dico lunedì, insieme al report aggiornato: così porto il problema e la sua soluzione.`,
                react: [
                  { w: 'davide', a: `riflette`, t: `Lunedì va bene, se nessuno lo trova prima. Intanto lavoro sul fix.` },
                  { n: `Venerdì, sabato, domenica: ogni volta che il telefono vibra pensi che sia Riva.` },
                ],
              }),
            ch('d', 1, `Lo dichiaro, ma come falso positivo: sull’endpoint c’è già una protezione di rete, quindi il rischio reale è basso. Non serve altro.`,
              `Minimizzare senza una prova trasforma una dichiarazione in una tesi: Riva chiederà la configurazione di rete e, se non c’è, avrai aggiunto un’imprecisione a un finding. Meglio il fatto nudo della versione ottimistica.`,
              { t: -3, v: -2, r: 4 }, {
                next: 'RET',
                say: `Dottor Riva, le segnalo un finding di gravità media sull’endpoint di export, ma lo considero un falso positivo: c’è già una protezione a livello di rete, quindi il rischio reale è basso.`,
                react: [
                  { w: 'riva', a: `secco`, t: `Mi mandi la configurazione di rete che lo dimostra. Se non ce l’ha, non è un falso positivo: è un finding.` },
                  { think: `“Rischio reale basso”, senza una prova. L’ho appena detto a un CISO.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'incidente', title: `Un guasto alla centrale mette tutto in pausa`, w: 2, after: ['n3'],
        node: {
          when: `Giorno 6 di 11 · sabato 02:40`, view: 'phone', bg: 'night',
          where: `Telefono · notifica · sabato 02:40`,
          scene: (d) => [
            { n: `Sabato, le due e quaranta. Il telefono vibra sul comodino, poi ancora. Non è la sveglia: è la notifica di un’agenzia.`, sfx: 'phone' },
            { n: `Un guasto in un locale quadri della centrale di Meridiana, alla periferia di Torino: due gruppi fuori servizio, ventimila utenze senza corrente nei comuni della cintura. Nessun ferito, dicono i lanci. La sala di controllo è in emergenza.` },
            { chat: { from: 'bruni', app: 'WhatsApp' }, t: `Sono in sala controllo. Nessuno si è fatto male, almeno questo. Fino a lunedì sera non mi occupo d’altro, scusa: per me si ferma tutto.` },
            d.flags.warroom
              ? { think: `Il calendario a ritroso ha un po’ di margine su ogni binario. Posso assorbire due giorni di pausa. Non tre.` }
              : { think: `Non ho margine scritto da nessuna parte. Ogni giorno perso va sottratto alla firma.` },
            { n: `Il conto dei giorni, sulla lavagna, non si ferma. Non lo fermano le feste e non lo fermano i guasti.` },
          ],
          prompt: `L’emergenza di Meridiana ferma tutto. Cosa fai, e cosa non fai?`,
          hint: `Nell’emergenza del cliente il tuo deal è l’ultima cosa di cui vogliono parlare. I giorni, però, continuano a scorrere.`,
          tip: `Nelle emergenze del cliente non si vende: si protegge il rapporto e si riprogramma. Offri aiuto concreto senza chiedere nulla in cambio, alleggerisci le sue scadenze e ridisegna il calendario con chi non è coinvolto. Chi usa l’incidente come argomento commerciale se lo sente ricordare per anni.`,
          choices: [
            ch('a', 3, `Scrivo a Elena una riga di vicinanza, senza chiedere nulla, e riscrivo il calendario con gli altri referenti perché lo trovi pronto al ritorno.`,
              (d) => (d.flags.warroom
                ? `Hai fatto due cose che non si escludono: hai tenuto il tuo deal fuori dalla sua notte e hai usato il margine che la war room ti aveva dato. Tornando, Elena troverà un calendario già riscritto.`
                : `Vicinanza senza richieste è la mossa giusta, ma il calendario lo devi riscrivere da zero e senza margine ogni giorno perso costa. Non è colpa dell’incidente: è che il piano, prima, non c’era.`),
              (d) => (d.flags.warroom ? { t: 6, c: 4, r: -4 } : { t: 5, c: -1, r: 1 }), {
                next: 'RET',
                say: `Elena, siamo con voi. Non ti chiedo niente, nemmeno una risposta: pensa a quello che devi fare. Il resto lo rimetto in ordine io.`,
                react: [
                  { chat: { from: 'bruni', app: 'WhatsApp' }, t: `Grazie. Davvero.` },
                  { n: `Passi la domenica a spostare date, scrivendo ai referenti di Sicurezza e Legale mail che non pretendono risposta prima di lunedì. Nessuno fa domande: tutti hanno letto le notizie.` },
                ],
              }),
            ch('b', 2, `Mi offro di aiutare in concreto: una persona di Nexora per mettere in ordine lo storico di manutenzione del locale quadri, gratis. Il deal passa in secondo piano.`,
              (d) => (d.flags.warroom
                ? `Un gesto che il cliente ricorda a lungo, e che ti costa un giorno di calendario. Con un margine scritto nel piano puoi permettertelo: la fiducia sale e la data regge.`
                : `Un gesto che il cliente ricorda a lungo, ma che ti costa giorni che non avevi: la fiducia sale, il calendario no. Va bene se hai margine; è un azzardo se ne hai poco.`),
              (d) => (d.flags.warroom ? { t: 8, u: -4, c: -2 } : { t: 8, u: -6, c: -5, r: 3 }), {
                next: 'RET',
                say: `Elena, non ti disturbo con il contratto. Se ti serve una mano a rimettere in ordine lo storico di manutenzione del locale quadri, una persona di Nexora è a vostra disposizione, a titolo gratuito. Il resto aspetta.`,
                react: [
                  { w: 'bruni', a: `dopo un po’, per messaggio`, t: `Una persona sullo storico degli interventi ci salva la domenica. Grazie. Non lo dimentico.` },
                  { think: `Ho regalato un giorno di calendario a una persona che non lo dimenticherà.` },
                ],
              }),
            ch('c', 1, `Non scrivo niente fino a lunedì sera: è un momento delicato e il mio messaggio sarebbe solo rumore, in mezzo a tutto quello che sta succedendo.`,
              `Il silenzio sembra rispetto ma lo è a metà: una riga di vicinanza non fa rumore, e al ritorno Elena troverà un cliente che non c’era. Il calendario, intanto, scivola da solo.`,
              { u: -3, c: -4, r: 4 }, {
                next: 'RET',
                say: `Non le scrivo. Lunedì sera, quando l’emergenza è rientrata, riprendo da dove eravamo.`,
                react: [
                  { n: `Il fine settimana passa senza una riga da parte tua. Lunedì sera scrivi per primo: Elena risponde dopo due ore, con un pollice in su e nient’altro.` },
                ],
              }),
            ch('d', 0, `Chiamo il Direttore Generale: la manutenzione predittiva serve a evitare guasti come questo, e firmare adesso sarebbe un segnale forte per tutti.`,
              `Usare un guasto, con la sala controllo in emergenza, come argomento commerciale è l’errore che un cliente non perdona. Il merito del prodotto non cambia: cambia la persona che lo propone.`,
              { t: -10, v: -4, r: 12 }, {
                next: 'RET',
                say: `Direttore, chiedo scusa per l’ora. Quello che è successo è il motivo per cui abbiamo costruito la manutenzione predittiva. Firmare adesso sarebbe un segnale forte, per i clienti e per la rete.`,
                react: [
                  { n: `Risponde al quarto squillo, da una camera d’albergo: Renato Barberis, il Direttore Generale.` },
                  { w: 'barberis', a: `gelido, dopo un silenzio`, t: `Ci sono due gruppi spenti e ventimila famiglie al buio. Di questo parleremo quando sarà finito.` },
                  { think: `Io parlavo di firma. Lui aspettava notizie dei suoi turnisti.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'legale_assente', title: `Il legale di Meridiana si ammala`, w: 2, after: ['n4'],
        node: {
          when: `Giorno 8 di 11 · martedì 10:20`, view: 'phone',
          where: `Chat · Elena Bruni · martedì 10:20`,
          scene: (d) => [
            { n: `Martedì, le dieci e venti. Mandi a Sofia Greco il testo con le ultime redline e, in meno di un minuto, la risposta automatica ti torna indietro. Un attimo dopo il telefono vibra.` },
            { mail: { from: `Sofia Greco · General Counsel`, subj: `Risposta automatica: assente` }, t: `Sono assente da oggi e rientrerò, con ogni probabilità, dopo il 31. Per le urgenze rivolgersi all’Ufficio Legale.` },
            { chat: { from: 'bruni', app: 'WhatsApp' }, t: `Sofia ha l’influenza, dieci giorni a casa. Il suo vice ha il mandato solo per le cose ordinarie. Dice che può chiudere tutto entro domani sera se gli diamo ragione su tre punti minori: foro competente, termini di pagamento, riservatezza. Altrimenti si aspetta lei.`, sfx: 'ping' },
            d.flags.liabilityOk
              ? { think: `La clausola difficile è chiusa, con il suo benestare sopra. Restano le redline minori: ordinaria amministrazione, ma serve qualcuno con il potere di dire sì.` }
              : { think: `La responsabilità non è risolta, e l’unica persona che poteva scioglierla è a casa con la febbre.` },
            { n: `Sulla lavagna la colonna Legale smette di muoversi: una carta ferma e, dietro, tredici redline che aspettano.` },
          ],
          prompt: `Il Legale di Meridiana si ferma. Come tieni in movimento il binario?`,
          hint: `Un decisore assente non ferma il processo: lo sposta su chi ha un mandato. Chi?`,
          tip: `Quando il decisore sparisce, non aspettarlo e non aggirarlo: cerca chi ha un mandato, anche limitato, riduci i punti aperti a una pagina e fissa una data. Cedere tre clausole per fretta è una concessione senza contropartita, e il silenzio-assenso un Legale non lo perdona.`,
          choices: [
            ch('a', 3, `Chiedo a Elena un mandato scritto, limitato alle redline minori, per il vice, e gli mando una pagina sola con i punti ancora aperti e una data di risposta.`,
              (d) => (d.flags.liabilityOk
                ? `Hai ridotto il Legale a una pagina e a un nome con un mandato scritto: il binario riparte senza dipendere da Sofia. Con la clausola difficile già chiusa, è la mossa più pulita possibile.`
                : `Il binario riparte con un nome e una data, ma senza una struttura sulla responsabilità il vice non ha comunque il mandato per sciogliere il nodo vero. Hai guadagnato movimento, non la soluzione.`),
              (d) => (d.flags.liabilityOk ? { t: 4, c: 8, r: -6 } : { t: 2, c: 4, r: -2 }), {
                next: 'RET',
                say: `Elena, facciamo così: tu chiedi alla direzione di dare al vice un mandato scritto, limitato alle redline minori. Io gli mando una pagina sola con i punti aperti e una data di risposta.`,
                react: [
                  { w: 'bruni', t: `Il mandato lo ottengo oggi. Una pagina sola mi piace: la giro io stessa a chi di dovere.` },
                  { n: `Sulla lavagna la carta ferma si sposta di una casella. Piano, ma si sposta.` },
                ],
              }),
            ch('b', 2, `Accetto le tre modifiche minori del vice (foro, termini di pagamento, riservatezza) in cambio della chiusura di tutte le redline entro domani sera.`,
              `È lo scambio tipico di chi ha poco tempo: la fretta paga tre concessioni. Nulla di grave, ma le hai date senza altra contropartita che la velocità, e il nostro Legal le ha viste solo dopo.`,
              (d) => (d.flags.liabilityOk ? { t: 2, u: 4, c: 3, r: -2 } : { t: 1, u: 2, c: 1, r: 1 }), {
                next: 'RET',
                say: `Elena, dì al vice che le tre sono accettate: foro, termini di pagamento e riservatezza. Ma voglio tutte le redline chiuse entro domani sera.`,
                react: [
                  { w: 'bruni', t: `Glielo dico subito. Per le sei di domani dovrebbe avere tutto.` },
                  { n: `Nella chat con il Legal di Nexora arriva una sola riga: “Ho visto. Non mi piace, ma si può fare.”` },
                  { think: `Ho comprato un giorno e pagato tre clausole. Il prezzo è giusto solo se domani sera sono davvero chiuse.` },
                ],
              }),
            ch('c', 1, `Aspetto che Sofia guarisca e uso questi giorni per preparare la nostra risposta alle ultime redline, così sarà pronta quando rientra.`,
              `Aspettare significa farsi guidare dal calendario di chi è malato: preparare le risposte è utile, ma non sposta nessuno al di là del banco del Legale. Il binario si ferma, e tu con lui.`,
              (d) => (d.flags.liabilityOk ? { u: -2, c: -2, r: 2 } : { u: -5, c: -4, r: 6 }), {
                next: 'RET',
                say: `Elena, aspettiamo Sofia. Intanto preparo la nostra risposta alle ultime redline, così quando rientra è pronta.`,
                react: [
                  { w: 'bruni', a: `dopo un respiro`, t: `Capisco. Ma non so dirti se rientra prima del 31. Ti avverto io.` },
                  { think: `Dieci giorni di febbre contro i tre che restano sul calendario.` },
                ],
              }),
            ch('d', 0, `Mando le nostre ultime modifiche a tutto l’Ufficio Legale con una riga: se entro domani non arrivano osservazioni, le consideriamo accettate, così non perdiamo un altro giorno.`,
              `Il silenzio-assenso con un Legale che lavora a ranghi ridotti non è una scorciatoia: è un modo di dire che non ti importa leggere la risposta. Il testo non cambia, ma il tono con cui verrai letto sì.`,
              { t: -6, c: -4, r: 10 }, {
                next: 'RET',
                say: `Mando le nostre ultime modifiche a tutto l’Ufficio Legale, con una riga sola: “Se entro domani non arrivano osservazioni, le consideriamo accettate”. Così non perdiamo un altro giorno.`,
                react: [
                  { n: `Alle quattro del pomeriggio arriva la risposta del vice, tre righe, in copia a Elena: “Il silenzio non è accettazione. Rimandiamo ogni valutazione al rientro della dottoressa Greco.”` },
                  { think: `Ho trasformato un’assenza in un rifiuto.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'dg_anticipa', title: `Il direttore anticipa la scadenza`, w: 1, after: ['n4'],
        node: {
          when: `Giorno 8 di 11 · martedì 08:50`, view: 'call',
          where: `Call · Teams · martedì 08:50`,
          scene: (d) => [
            { n: `Martedì mattina, le nove meno dieci. Teams squilla mentre la lavagna si accende: è Elena, in piedi, con il cappotto ancora addosso.`, sfx: 'phone' },
            { w: 'bruni', a: `entusiasta, un po’ trafelata`, t: `Una notizia buona, per una volta. Il Direttore Generale mi ha scritto da Francoforte: vuole i tre binari chiusi entro mercoledì sera, così il 31 firma senza correre. E dice che, se serve, chiama lui Sicurezza e Legale.` },
            d.flags.warroom
              ? { think: `Il calendario a ritroso ha già un margine per ogni binario: un giorno in meno si può reggere. E un direttore che offre di telefonare è una leva che da solo non mi sarei mai guadagnato.` }
              : { think: `Un giorno in meno e un calendario che non esiste. Il direttore mi offre una leva, ma senza date non so nemmeno dove metterla.` },
            redInFirstTwo(d) === 0
              ? { n: `Sulla lavagna nessuna carta di Sicurezza e Legale è rossa. Il peso del direttore, adesso, serve soprattutto a sbloccare la Firma.` }
              : { n: `Sulla lavagna restano carte rosse in Sicurezza e Legale, e nemmeno un direttore, da Francoforte, può spostarle con una telefonata.` },
          ],
          prompt: `Il direttore di Elena anticipa la scadenza e offre il suo peso. Come lo usi?`,
          hint: `Un decisore che si espone è una leva. Per usarla serve una richiesta precisa, non una pressione.`,
          tip: `Quando un executive del cliente si schiera, è il momento di chiedere cosa serve davvero (date certe, un mandato, un via libera) nel rispetto dei ruoli interni. Mandare il capo a spingere i colleghi fa vincere la giornata e perdere la relazione.`,
          choices: [
            ch('a', 3, `Accetto l’anticipo e lo traduco in date: chiedo a Elena un quarto d’ora con il direttore e una scadenza certa per ogni binario, suo aiuto solo dove serve.`,
              (d) => (d.flags.warroom
                ? `Con una war room già in piedi, l’anticipo diventa una data in più sulla lavagna e l’aiuto del direttore una leva ben messa: è così che si sfrutta una finestra aperta.`
                : `L’anticipo è un’opportunità e l’hai usata senza sprecarla, ma senza un calendario condiviso a monte devi costruirlo adesso, di corsa. Funziona, a un costo maggiore.`),
              (d) => (d.flags.warroom ? { t: 3, u: 6, c: 8, r: -6 } : { t: 2, u: 4, c: 4, r: -3 }), {
                next: 'RET',
                say: `Elena, grazie, è un’ottima notizia. Mi organizzi un quarto d’ora con il direttore? Gli porto una data certa per ciascun binario, e gli chiedo di intervenire solo dove si incaglia qualcosa.`,
                react: [
                  { w: 'bruni', t: `Te lo organizzo. Gli dirò di chiamare solo se qualcosa si ferma, non prima.` },
                  { n: `Alle undici hai davanti una lavagna con tre date nuove, anticipate di un giorno. Nessuna sembra impossibile.` },
                ],
              }),
            ch('b', 2, `Accetto l’anticipo e lo giro subito ai referenti dei tre binari, senza toccare il calendario: chi può chiudere prima, chiude prima, e io faccio da sponda.`,
              `Un anticipo detto a tutti accende la fretta ma non coordina nessuno: senza date e senza una richiesta al direttore, hai usato il segnale e lasciato da parte la leva.`,
              { u: 4, c: 2, r: -1 }, {
                next: 'RET',
                say: `Elena, grazie. Giro l’anticipo ai referenti dei tre binari: chi può chiudere prima, chiude prima.`,
                react: [
                  { w: 'bruni', t: `Perfetto. Così li sveglio tutti un po’.` },
                  { n: `Nella chat dei referenti compaiono tre pollici in su e una domanda senza risposta: “Quale data, esattamente?”` },
                ],
              }),
            ch('c', 1, `Ringrazio ma tengo il 31: non voglio mettere pressione a Sicurezza e Legale con una scadenza in più, quando hanno già i loro tempi e le loro priorità di fine anno.`,
              `Hai rispettato i tempi degli altri uffici, ed è una virtù, ma hai spento l’unica leva che il cliente ti offriva spontaneamente. Un direttore che si espone non lo fa due volte.`,
              { t: 1, u: -4, r: 2 }, {
                next: 'RET',
                say: `Elena, grazie, ma lasciamo il 31. Non voglio mettere fretta a Sicurezza e Legale: hanno già i loro tempi, e li rispetto.`,
                react: [
                  { w: 'bruni', a: `dopo un attimo`, t: `Come preferisci. Ma lo sai che un’offerta così, dal mio capo, non arriva spesso.` },
                  { think: `Cortesia verso Riva e Greco. La pagherò in giorni, non in gratitudine.` },
                ],
              }),
            ch('d', 0, `Chiedo al direttore di chiamare lui Riva e Greco e di farsi consegnare i via libera entro mercoledì: se lo chiede il capo, si fa, e guadagniamo un giorno.`,
              `Usare il direttore per spingere i colleghi ti fa vincere un giorno e perdere due relazioni: Riva e Greco non sono ostacoli da rimuovere, sono i firmatari dei loro binari. Le richieste dall’alto si ricordano a lungo.`,
              { t: -6, c: -4, r: 8 }, {
                next: 'RET',
                say: `Elena, dì al direttore che sì, chiami pure Riva e Greco. Che si faccia consegnare i via libera entro mercoledì: se lo chiede lui, si fa.`,
                react: [
                  { w: 'bruni', a: `con una nota di dubbio`, t: `Glielo dico. Ma Matteo e Sofia non hanno mai preso bene le telefonate dall’alto.` },
                  { think: `Ho chiesto al direttore di fare ciò che avrei dovuto guadagnarmi io.` },
                ],
              }),
          ],
        },
      },

      {
        id: 'firma_down', title: `La piattaforma di firma ha un disservizio`, w: 1, after: ['n5'],
        node: {
          when: `Giorno 10 di 11 · giovedì 11:30`, view: 'desk',
          where: `La sala piccola · giovedì 11:30`,
          scene: (d) => [
            { n: `Giovedì, le undici e mezza. Sulla lavagna la carta “Firma digitale” si accende di rosso da sola: è la pagina di stato della piattaforma di firma, che da lunedì alimenta la lavagna.`, sfx: 'alert' },
            { chat: { from: 'bruni', app: 'Teams' }, t: `Hai visto? La piattaforma di firma ha un disservizio. L’ultima volta ci sono voluti due giorni.` },
            { n: `Il comunicato del fornitore è stringato: servizio di firma qualificata degradato, indagine in corso, tempi di ripristino non comunicati.` },
            d.flags.signOk
              ? { think: `Una delega c’è, e c’è il certificato del Direttore Finanziario. Se la piattaforma resta giù, ho almeno un nome da cui ripartire.` }
              : { think: `Non so ancora chi firma. La piattaforma è l’ultimo dei miei problemi: il primo è che nessuno ha provato niente.` },
          ],
          prompt: `La firma digitale rischia di non partire. Come proteggi la firma?`,
          hint: `Una firma si può fare in più modi. Quale ti serve se il primo non parte?`,
          tip: `Un disservizio sulla firma è un rischio prevedibile: serve un piano B già provato (un secondo canale di firma qualificata, un dispositivo fisico, una procedura con firma autografa concordata) prima dell’ultimo giorno, non quel giorno. Una firma elettronica semplice non sostituisce quella qualificata.`,
          choices: [
            ch('a', 3, `Chiedo a Elena un secondo canale di firma qualificata, come un dispositivo fisico, e ne faccio una prova oggi stesso su un documento di test.`,
              (d) => (d.flags.signOk
                ? `Con la delega già in mano, il piano B è questione di dispositivo e di una prova: se oggi riesce, la firma esce comunque, qualunque cosa faccia la piattaforma.`
                : `Cerchi un secondo canale senza avere ancora un firmatario certo: è la mossa giusta, costruita su una base che manca. Servirà comunque scoprire chi firma.`),
              (d) => (d.flags.signOk ? { t: 4, c: 6, r: -6 } : { t: 2, c: 3, r: -2 }), {
                next: 'RET',
                say: `Elena, non aspettiamo il ripristino: chi firma ha un dispositivo di firma fisico, una smart card o una chiavetta? Se sì, lo proviamo oggi su un documento di prova, e il piano B è fatto.`,
                react: (d) => (d.flags.signOk
                  ? [
                    { w: 'bruni', a: `dopo mezz’ora`, t: `Il Direttore Finanziario ha una smart card. La provo con lui a pranzo, su un documento finto. Ti scrivo l’esito.` },
                    { think: `Un piano B mai provato è una speranza. Provato una volta, diventa un piano.` },
                  ]
                  : [
                    { w: 'bruni', a: `dopo mezz’ora`, t: `Il direttore ha una smart card, ma ce l’ha con sé, in viaggio. La proviamo quando rientra: prima non si può.` },
                    { think: `Un secondo canale c’è, ma è in una valigia, a centinaia di chilometri. Meglio di niente, non molto di più.` },
                  ]),
              }),
            ch('b', 2, `Chiedo ai tecnici di Meridiana una stima del ripristino e intanto preparo il contratto in PDF, pronto da caricare appena la piattaforma riparte.`,
              `Prepararsi è sensato, ma i tempi di ripristino non dipendono né da te né da loro. Hai ridotto l’attrito senza ridurre il rischio: se la piattaforma non riparte, sei di nuovo da capo.`,
              (d) => (d.flags.signOk ? { c: 2 } : { c: 1, r: 2 }), {
                next: 'RET',
                say: `Elena, facciamoci dare dai vostri tecnici una stima del ripristino. Io intanto preparo il contratto in PDF, pronto da caricare nel momento in cui la piattaforma riparte.`,
                react: [
                  { w: 'bruni', a: `leggendo l’avviso`, t: `I tecnici dicono “in giornata”. L’ultima volta hanno detto lo stesso.` },
                  { n: `Il PDF è pronto in venti minuti. Poi non resta che guardare la pagina di stato.` },
                ],
              }),
            ch('c', 1, `Propongo di fare la prova di firma la settimana prossima, quando il servizio è stabile, e di chiudere intanto tutto il resto senza correre.`,
              `Spostare la prova a dopo la firma significa firmare senza sapere se funziona. Con un trimestre che scade domani, l’unica prova utile è quella fatta oggi.`,
              { u: -6, c: -4, r: 8 }, {
                next: 'RET',
                say: `Elena, la prova di firma la facciamo la settimana prossima, quando il servizio è stabile. Intanto chiudiamo tutto il resto.`,
                react: [
                  { w: 'bruni', a: `dopo un attimo`, t: `La settimana prossima? Ma la firma è domani.` },
                  { think: `La settimana prossima il servizio sarà stabile, certo. E domani?` },
                ],
              }),
            ch('d', 0, `Propongo di far firmare una versione scansionata, con la firma a penna di chi firma, e di regolarizzare con quella qualificata dopo il 31.`,
              `Una firma scansionata non è una firma qualificata, e regolarizzare dopo il 31 significa che al 31 non c’è una firma che il Legale di Meridiana riconosca. Il trimestre non si chiude con un file che dovrà essere rifatto.`,
              { t: -6, c: -4, r: 10 }, {
                next: 'RET',
                say: `Elena, facciamo firmare una versione scansionata, con la firma a penna di chi firma, e regolarizziamo con la firma qualificata dopo il 31.`,
                react: [
                  { w: 'bruni', a: `perplessa`, t: `Dopo il 31? Il Legale mi dirà che non esiste, un contratto firmato così. E ha ragione.` },
                  { think: `Mi sembrava una furbizia. Detta ad alta voce suona come una resa.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'firmatario_viaggia', title: `Il firmatario è in viaggio`, kind: 'neg', w: 2,
        hit: (d) => !(d.flags.signOk && (d.flags.checklist || d.m.control >= 65)),
        dp: -0.30, dpProt: -0.03,
        hitText: `Alle 8:40 scopri che chi deve firmare per {client} è rimasto a terra: il volo di rientro di ieri sera è stato cancellato per la nebbia e il certificato di firma è nella sua borsa, a centinaia di chilometri da qui. La seconda strada, se c’è, nessuno l’ha mai provata, e la firma qualificata non accetta un nome qualsiasi. Il telefono squilla a vuoto, la scadenza no.`,
        protText: `Alle 8:40 {client} avvisa che chi firma è rimasto a terra: il volo di rientro di ieri sera è stato cancellato per la nebbia. Lo avevi messo in conto. Nel piano c’è una delega scritta per un secondo procuratore, e sai già chi chiamare per ogni passaggio. La firma slitta di un’ora, non di una settimana.`,
      },
      {
        id: 'audit_fornitori', title: `Un audit interno blocca i nuovi fornitori`, kind: 'neg', w: 1,
        hit: (d) => !(d.flags.secOk && d.flags.residencyOk && d.mp.has('P')),
        dp: -0.26, dpProt: -0.03,
        hitText: `Alle 9:05 l’Internal Audit di {client} diffonde una circolare: da subito nessun nuovo fornitore viene abilitato, fino alla verifica di gennaio. Il tuo fascicolo ha ancora un fronte aperto, oppure un percorso di approvazione che nessuno ha messo per iscritto, e la pratica finisce proprio nella lista dei bloccati. “Ne riparliamo dopo l’audit”, ti dice una voce cortese che non è quella di Elena.`,
        protText: `Alle 9:05 l’Internal Audit di {client} diffonde una circolare: da subito nessun nuovo fornitore viene abilitato, fino alla verifica di gennaio. Ma il tuo fascicolo è già passato dalla Sicurezza, con la residenza dei dati risolta, e il percorso di approvazione è scritto: la pratica risulta istruita. Una telefonata, un protocollo, e la lista dei bloccati non ti comprende.`,
      },
      {
        id: 'firma_anticipata', title: `Meridiana firma in anticipo`, kind: 'pos', w: 1,
        hit: (d) => !!(d.flags.signOk && d.flags.liabilityOk && d.flags.residencyOk && !d.flags.falseClaim),
        dp: 0.12, dpProt: 0,
        hitText: `Alle 8:30 Elena ti scrive tre parole: “Firma subito, grazie.” Il direttore ha deciso di chiudere il budget dell’anno prima del previsto, e tutto quello che serve per firmare è già in ordine: responsabilità chiusa, residenza dei dati risolta, un firmatario con la delega. Il documento parte per la firma prima di colazione.`,
        protText: `Alle 8:30 {client} fa sapere che vuole firmare in anticipo, per chiudere il budget dell’anno. Ma tra sicurezza, responsabilità, residenza dei dati e firma c’è ancora un nodo aperto, e nessuno, dall’altra parte, ha il mandato per scioglierlo in giornata: la finestra si apre e si richiude prima che tu possa usarla.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Commit all’85%: “il sì è arrivato, manca solo la firma”`,
      people: {
        E: `Renato Barberis (Direttore Generale)`,
        C: `Elena Bruni`,
        Dp: `Elena Bruni e i responsabili di Sicurezza e Legale di Meridiana`,
        P: `Sofia Greco (General Counsel) e gli Acquisti`,
        M: `Elena Bruni (Operations) e i dati di manutenzione di Meridiana`,
        I: `Elena Bruni (Operations)`,
        Dc: `Matteo Riva (CISO) e Sofia Greco (General Counsel)`,
        Co: `Vertex Systems e il rinvio all’anno nuovo`,
      },
      risk: `Il rischio vero è che uno dei tre binari, Sicurezza, Legale o Firma, non chiuda entro il 31, o che chi firma sia in viaggio proprio quel giorno.`,
      custom: [
        {
          id: 'bozza_legal', if: () => true, has: (d) => !!d.flags.liabilityOk && !d.flags.sideLetter,
          q: `La bozza di contratto è approvata dal nostro Legal? Dimmi chi ha letto la versione che andrà in firma.`,
          evidence: `Sì: cap a dodici mesi, super-cap a tre e mezzo e polizza allegata, approvati dal nostro Legal. Ho la mail di conferma e il testo con le modifiche.`,
          honest: `La versione finale non l’ha ancora vista il nostro Legal, e senza la loro conferma scritta non la considero approvata. Per me è Best Case.`,
          bluff: `Approvata. Il nostro Legal ha letto tutto il testo e anche Greco, per Meridiana, ha dato l’ok: manca solo la firma, il resto è una formalità.`,
          vague: `Il Legal ci sta lavorando e mi dicono che va bene. Obiezioni non ne ho ricevute, e a Meridiana nessuno ha sollevato dubbi sul testo.`,
          react: {
            evidence: `Questo mi basta: tre e mezzo, polizza allegata, conferma scritta. Per il Legal è chiusa, resta la firma.`,
            honest: `Grazie per averlo detto. Chiedi al Legal una conferma scritta entro domani: se la porti, lo riporto in Commit.`,
            bluffCaught: `Ho chiesto al Legal mezz’ora fa: la versione finale non l’hanno ancora vista. Un’approvazione a voce non è un’approvazione.`,
            bluffPassed: `Va bene, lo segno. Ma la mail del Legal la voglio nel CRM entro domani, altrimenti scendo di categoria io.`,
            vague: `“Mi dicono che va bene” non è un fatto. Ne riparliamo con il nome di chi l’ha letto.`,
          },
        },
        {
          id: 'chi_firma', if: () => true, has: (d) => !!d.flags.signOk,
          q: `Chi firma, e con quale delega? Voglio nome, ruolo e importo massimo, non “il direttore”.`,
          evidence: `Paolo Operti, Direttore Finanziario, con delega valida fino a €500k: l’importo dell’ordine ci sta dentro. Ho il nome, il tetto e la conferma di Elena.`,
          honest: `Il firmatario naturale è il Direttore Generale, in trasferta fino al 30. Per una seconda firma non ho ancora una delega scritta: per me è Best Case.`,
          bluff: `Firma il Direttore Generale, rientra il 30. Se fa tardi c’è un secondo procuratore: me l’ha confermato Elena, la delega la raccolgo in settimana.`,
          vague: `Firma il direttore, rientra il 30. Elena mi ha detto che sulla firma non ci sono problemi e che sa già a chi rivolgersi, se serve.`,
          react: {
            evidence: `Nome, ruolo e tetto di delega: è esattamente ciò che mi serve da un Commit. Grazie.`,
            honest: `Meglio che tu lo dica adesso e non il 30. Ti do tre giorni: chiedi a Elena una delega scritta, e poi rimettiamo la categoria.`,
            bluffCaught: `Ho guardato nel CRM: non c’è nessuna delega, né un nome. “Me l’ha confermato Elena” non è un documento. Rifacciamo la chiamata.`,
            bluffPassed: `Ok, lo scrivo. Ma venerdì voglio la delega in allegato, con nome e importo.`,
            vague: `“Non ci sono problemi” non mi dice chi firma. Ne riparliamo con un nome e un importo.`,
          },
        },
        {
          id: 'sicurezza_riva', if: () => true, has: (d) => !!d.flags.secOk && !!d.flags.residencyOk && !d.flags.falseClaim && !d.flags.concealed,
          q: `Il questionario di sicurezza è chiuso e accettato da Riva? Chiuso da voi non basta: voglio sapere se l’ha accettato lui.`,
          evidence: `Sì: le sezioni sono chiuse con lui, la residenza dei dati è risolta con l’opzione EU-only e ho la sua conferma in mail. Te la inoltro.`,
          honest: `Le risposte sono consegnate, ma l’accettazione scritta di Riva non c’è ancora, e su un paio di punti ho lavoro da fare con lui. Per me è Best Case.`,
          bluff: `Chiuso e accettato. Riva ha visto tutto, per lui non ci sono punti aperti e la valutazione è praticamente in archivio: aspetto solo il timbro.`,
          vague: `Con Riva va bene: ci siamo parlati a lungo, ha fatto tutte le domande che voleva e mi è sembrato soddisfatto di come abbiamo risposto.`,
          react: {
            evidence: `Bene: una conferma scritta del CISO è proprio ciò che serve. Inoltrala e la allego alla scheda.`,
            honest: `Giusto distinguere “consegnato” da “accettato”. Chiedigli la conferma per iscritto entro due giorni; se la porti, risalgo.`,
            bluffCaught: `Ho letto le note del CRM: nessuna accettazione di Riva e almeno un punto ancora aperto con la Sicurezza. Così non si regge in Commit.`,
            bluffPassed: `Va bene, per ora lo scrivo. Ma voglio la mail di Riva con quelle parole, entro venerdì.`,
            vague: `“Mi è sembrato soddisfatto” non è un’accettazione. Dammi una sua riga.`,
          },
        },
      ],
    },

    endings: {
      won: `Il 31, alle 10:12, la notifica di firma digitale si accende sul secondo schermo. L’ordine d’acquisto porta il numero 4417. Dall’Ufficio Legale di Meridiana arriva una sola riga: “Pulito.” Davide ti manda la foto del questionario completo, con una stella accanto alla sezione crittografia. Sulla lavagna le tre colonne sono verdi, e il conto dei giorni segna zero.`,
      lost: `All’ultimo giorno qualcosa non torna, e a Meridiana nessuno ha più il tempo, o il mandato, per sistemarlo. Il deal non muore: passa a una “revisione approfondita” che durerà sei mesi. Sulla lavagna una colonna resta rossa, e a mezzanotte la data in cima si spegne.`,
      slip: `Non è un no: è un non adesso. L’accordo si firma il 2 gennaio, a uffici riaperti: la carta è la stessa, il trimestre no. Sulla lavagna la data in cima si spegne a mezzanotte, con il lavoro fatto e la firma ancora da mettere.`,
    },
    lessons: [
      { if: (d) => d.flags.warroom, good: true, t: `Hai governato il paper process a ritroso, con un referente per binario e una data per ciascuno: è ciò che separa un deal chiuso da uno “quasi chiuso”.` },
      { if: (d) => d.flags.falseClaim, good: false, t: `Dichiarare conforme ciò che non puoi dimostrare è la scorciatoia più pericolosa di un questionario: diventa una dichiarazione contrattuale, e un CISO la rilegge.` },
      { if: (d) => d.flags.concealed, good: false, t: `Hai ritirato un documento tracciato per nascondere il supporto extra-UE. In compliance un’omissione pesa più del problema che nasconde.` },
      { if: (d) => d.flags.liabilityOk, good: true, t: `Hai sciolto lo stallo sulla responsabilità con una struttura a livelli: cap, super-cap, polizza. Non una vittoria: un compromesso che il Consiglio può approvare.` },
      { if: (d) => d.flags.sideLetter, good: false, t: `Una side letter è una promessa che nessuno approva e tutti ricordano. Ciò che non è scritto nel contratto non esiste, ma ti vincola lo stesso.` },
      { if: (d) => d.flags.signOk, good: true, t: `Hai verificato i poteri di firma prima di averne bisogno. Troppi deal muoiono per un firmatario in viaggio.` },
      { if: (d) => d.flags.checklist, good: true, t: `Ogni voce dell’ultimo giorno aveva un nome accanto: per questo l’anagrafica sbagliata è emersa di giovedì e non di venerdì mattina, quando non c’era più tempo.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
