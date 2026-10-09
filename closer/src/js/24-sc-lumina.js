/* Scenario 5 · Lumina Retail · displacement di un incumbent, pilota con criteri, risultati misti
   v2: negozio e dati sul campo (prima persona, coalizione, pilota, imprevisti, shock, forecast). */
(function (g) {
  'use strict';
  const CL = g.CL, ch = CL.ch;

  const CAST = {
    silvia: { name: `Silvia Conti`, role: `COO · il tuo champion`, hue: 295 },
    rossi: { name: `Alberto Rossi`, role: `CIO · leale a Vertex`, hue: 25 },
    longo: { name: `Andrea Longo`, role: `CFO · Economic Buyer`, hue: 150 },
    davide: { name: `Davide Ferri`, role: `Tuo Solution Engineer`, hue: 175 },
    ilaria: { name: `Ilaria Fumagalli`, role: `Addetta alle vendite · flagship`, hue: 190 },
    brivio: { name: `Paolo Brivio`, role: `Direttore del negozio pilota`, hue: 55 },
  };
  /* gli imprevisti generici fanno parlare “cliente”: in Lumina il contatto è Silvia */
  CAST.cliente = CAST.silvia;
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });
  /* storia delle mosse: gli imprevisti sono registrati come “wild:<id>” */
  const picked = (d, node, id) => d.hist.some((h) => h.node === node && h.id === id);
  const steps = (d) => d.hist.filter((h) => !h.wild).length;
  /* un imprevisto è in corso quando il nodo successivo non è ancora stato mostrato: la scena che segue non va anticipata dai widget */
  const stage = (d) => steps(d) - (d.wild ? 1 : 0);
  const cl = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));
  const num = (v, dflt) => (Number.isFinite(v) ? v : dflt);
  /* copia difensiva dello stato: i widget devono funzionare anche con un deal vuoto o parziale, senza toccarlo */
  const safe = (d) => {
    d = d || {};
    return Object.assign({}, d, {
      flags: d.flags || {}, mp: d.mp && typeof d.mp.has === 'function' ? d.mp : new Set(), m: d.m || {},
      disc: num(d.disc, 0), hist: Array.isArray(d.hist) ? d.hist : [],
    });
  };
  /* posizione di una mossa nella storia (−1 se non è ancora stata giocata): serve a capire quale evento è il più recente */
  const at = (d, node, id) => d.hist.findIndex((h) => h.node === node && (!id || h.id === id));
  /* che cosa è successo sul campo: criteri firmati, pilota gratuito senza soglie, prova su dati storici, niente */
  const pilot = (d) => (d.flags.criteriaSet ? 'signed' : d.flags.freePilot ? 'free' : d.flags.proofOfValue ? 'sim' : 'none');
  const pilotStores = (d) => (d.flags.criteriaSet ? `dodici` : `venti`);

  CL.registerScenario({
    id: 'lumina',
    title: `Il Cavallo di Troia`,
    client: `Lumina Retail Group`,
    sector: `Retail · moda · 140 negozi`,
    hook: `Nove anni di incumbent, un CIO fedele e una COO stufa di scaffali vuoti a sistema.`,
    brief: `Piattaforma omnicanale per inventario e fulfillment: €540k di ACV a listino. Il sistema attuale è di Vertex Systems da nove anni. Silvia Conti, COO, perde vendite ogni settimana per discrepanze di stock. Alberto Rossi, CIO, difende Vertex. Andrea Longo, CFO, firma.`,
    scout: `Silvia ha il dolore ma non il budget. Rossi gioca a golf con l’account di Vertex. Longo non ti conosce. Nessuno ha ancora calcolato quanto costa il problema di stock.`,
    teaches: [`Displacement`, `Pilota con criteri di successo`, `Coesistenza`, `Risultati onesti`, `Costo dell’inazione`],
    list: 540, cost: 3, window: [1, 9], stars: 3, lep: 15, slip: 0.3,
    crm: { cat: `Best Case`, prob: 45 },
    cast: CAST,

    /* ───── identità: il negozio, i dati sul campo ───── */
    theme: {
      id: 'retail', label: `Flagship e negozi · Lumina Retail`, bg: 'retail',
      accent: '#b0185b', accentDark: '#ff7ab0', ambience: 'retail',
      motto: `Cambiare ha un rischio. Restare fermi ha un costo, e di solito nessuno lo ha ancora scritto.`,
    },
    intro: {
      when: `Sabato · 16:20`, where: `Flagship Lumina · piano vendita`, view: 'walk', bg: 'retail',
      scene: [
        { n: `Sabato pomeriggio, le quattro e venti. Il flagship di Lumina trabocca fino alle scale mobili: sacchetti di carta, la fila davanti ai camerini, il bip delle casse che non si ferma mai.` },
        { n: `Silvia Conti, la COO, te l’aveva detto: “Se vuoi capire il mio problema, vieni di sabato. E non annunciarti”.` },
        { w: 'ilaria', a: `con il tablet in mano, a una cliente`, t: `Il 42 in blu notte? Il sistema dice che ne abbiamo tre. Mi dia un minuto, vado a controllare in magazzino.` },
        { n: `Sparisce dietro una porta con la scritta “Solo personale”. Dalla fessura esce odore di cartone e di plastica da imballo. La cliente guarda l’orologio, poi guarda te.` },
        { w: 'ilaria', a: `tornando a mani vuote, a voce bassa`, t: `Mi dispiace, non c’è. Succede ogni sabato: a sistema ci sono, sugli scaffali no.` },
        { think: `Tre a sistema, zero sullo scaffale: è il problema che vendo, visto dal vivo. La cliente esce a mani vuote e nessuno scriverà “vendita persa” da nessuna parte. Per centoquaranta negozi, quanto fa?` },
        { n: `Lunedì mattina, otto e cinquanta. Sulla scrivania il telefono vibra contro il legno: Silvia Conti.`, sfx: 'phone' },
      ],
    },

    /* ───── widget firma: la coalizione, il pilota, la proposta ───── */
    hud: [
      {
        type: 'stakeholders', title: `La coalizione`,
        build: (s) => {
          const d = safe(s);
          const f = d.flags, st = stage(d);
          const ev = d.hist.find((h) => h.node === 'wild:evento_vertex');
          const pv = d.hist.find((h) => h.node === 'wild:post_virale');
          const bf = d.hist.find((h) => h.node === 'wild:black_friday');
          const cf = d.hist.find((h) => h.node === 'wild:cfo_dato');
          const n1a = picked(d, 'n1', 'a'), cold = picked(d, 'n3', 'a'), n4a = picked(d, 'n4', 'a');
          /* un imprevisto pesa più delle mosse precedenti, e meno di quelle che lo seguono */
          const pvLate = !!pv && at(d, 'wild:post_virale') > at(d, 'n2');
          const cfLate = !!cf && at(d, 'wild:cfo_dato') > at(d, 'n5');
          const pvNote = pv && ({
            a: [`ally`, `Avete scritto insieme la pagina per il CEO, senza logo Nexora. Per la prima volta si espone con te, non soltanto accanto a te.`],
            c: [`skeptic`, `Hai girato il suo imbarazzo al CFO come prova a tuo favore. Se n’è accorta prima di te e adesso pesa ogni tua mossa.`],
            d: [`neutral`, `Quando il problema è diventato pubblico non c’eri: la pagina per il CEO l’ha preparata qualcun altro.`],
          })[pv.id];

          /* Silvia: l’alleata, che ha il dolore ma non il budget */
          let silvia;
          if (f.manipulated) silvia = P('silvia', 'skeptic', `Ha visto ridefinire un criterio dopo averlo concordato. Ricontrolla ogni numero che le dai.`);
          else if (n4a) silvia = P('silvia', 'neutral', `Ti ha lasciato mettere le rotture in allegato, ma teme che Longo se ne accorga.`);
          else if (f.honest) silvia = P('silvia', 'ally', `Ha visto il gap e tu non l’hai nascosto. Difende i dati insieme a te.`);
          else if (pvLate && pv.id === 'c') silvia = P('silvia', pvNote[0], pvNote[1]);
          else if (bf && bf.id === 'd') silvia = P('silvia', 'skeptic', `Ha visto due settimane di dati veri sostituite da una proiezione. Ricontrolla ogni numero che le dai.`);
          else if (pvLate && pvNote) silvia = P('silvia', pvNote[0], pvNote[1]);
          else if (picked(d, 'n2', 'd')) silvia = P('silvia', 'neutral', `Le hai chiuso l’unica porta che aveva aperto: da sola con Rossi, non si espone più.`);
          else if (f.criteriaSet) silvia = P('silvia', 'ally', `Ha portato lei il patto a Longo: il pilota ha una firma, e dietro c’è la sua faccia.`);
          else if (f.freePilot) silvia = P('silvia', 'ally', `Ha avuto il suo pilota gratuito. Senza soglie scritte, a rischiare è lei.`);
          else if (f.proofOfValue) silvia = P('silvia', 'ally', `La prova sui dati storici l’ha convinta. Rossi, che non ha visto niente girare, no.`);
          else if (pvNote) silvia = P('silvia', pvNote[0], pvNote[1]);
          else if (f.quantified) silvia = P('silvia', 'ally', `Ha il dolore e adesso anche il numero: 2,3 milioni di vendite perse.`);
          else if (n1a) silvia = P('silvia', 'neutral', `Ha riferito a Rossi le tue parole su Vertex. Ti ascolta ancora, ma con più cautela.`);
          else silvia = P('silvia', 'ally', `Ha il dolore, non il budget. Per ora si fida di te.`);
          /* quando ha messo la faccia con il CEO, oltre che alleata è la tua champion */
          if (d.mp.has('C') && silvia.stance === 'ally') silvia = Object.assign({}, silvia, { stance: 'champion' });

          /* Rossi: lealista di Vertex, può diventare neutrale (e, in fondo al percorso, alleato) */
          let rossi;
          if (ev && ev.id === 'd') rossi = P('rossi', 'hostile', `Ti ha visto a Lisbona, ospite di un cliente di Vertex. Non ti ha salutato e non lo dimentica.`);
          else if ((cold || n1a) && !f.coexist && ev && (ev.id === 'a' || ev.id === 'b')) rossi = P('rossi', 'skeptic', `Ti ha avvisato di Lisbona e ha accettato un confronto sui fatti, ma non ha dimenticato che cosa hai detto di Vertex.`);
          else if (cold) rossi = P('rossi', 'hostile', `Ha letto le tue informazioni su Vertex come un attacco personale.`);
          else if (n1a && !f.coexist && picked(d, 'n3', 'c')) rossi = P('rossi', 'skeptic', `Si è sentito trattato da pari, ma non dimentica che Silvia gli ha riferito come parli di Vertex. La paura dei cantieri in stagione resta intatta.`);
          else if (n1a && !f.coexist) rossi = P('rossi', 'hostile', `Silvia gli ha riferito che parli male di Vertex: ti ha già classificato.`);
          else if (ev && ev.id === 'c' && !f.coexist) rossi = P('rossi', 'skeptic', `Gli hai chiesto di rinunciare a Lisbona: ha sentito una pressione, non un alleato.`);
          else if (ev && ev.id === 'c' && f.coexist) rossi = P('rossi', 'neutral', `Difende ancora il piano a ondate, ma gli hai chiesto di rinunciare a Lisbona: ha sentito una pressione, non un alleato.`);
          else if (f.coexist && f.criteriaSet && f.honest && st >= 5) rossi = P('rossi', 'ally', `Il suo team guida l’architettura. Davanti a Longo difende il piano come suo.`);
          else if (f.coexist) rossi = P('rossi', 'neutral', ev && (ev.id === 'a' || ev.id === 'b') ? `“Idea che posso difendere.” E ti ha detto di Lisbona prima che lo sapessi da altri.` : `“Questa è un’idea che posso difendere.” Non deve spegnere Vertex: aggiunge ciò che manca.`);
          else if (ev && (ev.id === 'a' || ev.id === 'b')) rossi = P('rossi', 'neutral', `Ti ha avvisato di Lisbona e ha accettato un confronto sui fatti: uno spiraglio, non ancora un sì.`);
          else if (picked(d, 'n3', 'c')) rossi = P('rossi', 'neutral', `Si è sentito trattato da pari. La paura dei cantieri in stagione, però, resta intatta.`);
          else if (picked(d, 'n3', 'd')) rossi = P('rossi', 'skeptic', `Ha sorriso e ha chiesto le prove che non hai portato.`);
          else if (picked(d, 'n1', 'd')) rossi = P('rossi', 'skeptic', `Ti ha dato un quarto d’ora: “abbiamo già una roadmap con Vertex”.`);
          else rossi = P('rossi', 'skeptic', `Nove anni di Vertex, il golf con il loro account: nessun motivo per ascoltarti.`);

          /* Longo: sconosciuto finché non entra nel pilota o nei numeri */
          const cfNote = cf && ({
            a: [`ally`, `Ti manda i ribassi per categoria domattina e vuole il metodo prima della cifra. Per lui sei un fornitore che costruisce sui suoi dati.`],
            b: [`neutral`, `Ha accettato una stima dichiarata come tale, ma vuole il suo numero, costruito sui suoi dati.`],
            c: [`skeptic`, `Ha chiesto da dove viene il milione e mezzo: il suo ufficio controllo non l’ha mai calcolato. Adesso la cifra è scritta sul suo blocco.`],
            d: [`skeptic`, `Gli hai detto quali numeri contano e lui ti ha ricordato che decide lui. Vuole tutti e due, ribassi compresi.`],
          })[cf.id];
          let longo;
          if (!f.ebEngaged) {
            if (picked(d, 'n4', 'a')) longo = P('longo', 'skeptic', `Non ti conosce, ma ha già trovato le rotture a pagina 14 e chiesto perché non fossero in prima pagina.`);
            else if (picked(d, 'n4', 'b')) longo = P('longo', 'neutral', `Ha visto il rosso sulla slide e non l’ha trovato nascosto. Conosce i tuoi numeri, non ancora te.`);
            else longo = P('longo', 'unknown', f.quantified ? `Non ti conosce. Il numero di Silvia c’è, ma non è ancora arrivato sulla sua scrivania.` : `Non ti conosce. Nessuno gli ha mai messo davanti quanto costa lo stock a sistema.`);
          } else if (f.manipulated) longo = P('longo', 'hostile', `Un criterio concordato è stato ridefinito dopo. Per lui è finita la conversazione.`);
          else if (cfLate && cfNote) longo = P('longo', cfNote[0], cfNote[1]);
          else if (picked(d, 'n5', 'b')) longo = n4a ? P('longo', 'neutral', `“Se i 770 reggono, la questione non è più il prezzo.” Ma le rotture a pagina 14 non le ha dimenticate.`) : P('longo', 'ally', `“Se i 770 reggono, la questione non è più il prezzo.” Vuole rivedere i dati con Silvia.`);
          else if (picked(d, 'n5', 'a')) longo = P('longo', 'skeptic', `Per lui i €540.000 erano una cifra di partenza. Adesso tratta sul prezzo.`);
          else if (picked(d, 'n5', 'c')) longo = n4a ? P('longo', 'skeptic', `Il caso gli è piaciuto, ma vuole i suoi numeri, non quelli di un altro. E le rotture a pagina 14 pesano ancora.`) : P('longo', 'neutral', `Il caso gli è piaciuto, ma vuole i suoi numeri, non quelli di un altro.`);
          else if (picked(d, 'n5', 'd')) longo = n4a ? P('longo', 'skeptic', `Non compra un prezzo bloccato: vuole capire che cosa compra. E le rotture a pagina 14 pesano ancora.`) : P('longo', 'neutral', `Non compra un prezzo bloccato: vuole capire che cosa compra.`);
          else if (n4a) longo = P('longo', 'skeptic', `Ha trovato le rotture a pagina 14, in allegato, e ha chiesto perché non fossero in prima pagina.`);
          else if (f.criteriaSet && f.honest) longo = P('longo', 'ally', `Ha firmato i criteri e ha visto il quarto in rosso. “Mi piace che non me lo abbiate nascosto.”`);
          else if (f.criteriaSet) longo = P('longo', 'neutral', `Ha firmato i quattro criteri. Ti conosce da un foglio, non ancora da una conversazione.`);
          else longo = P('longo', 'neutral', `Ti ha dato il tempo di una conversazione, niente di più. Per lui sei ancora un fornitore tra due.`);

          return [silvia, rossi, longo];
        },
      },
      {
        type: 'kpis', title: `Il pilota sul campo`,
        build: (s) => {
          const d = safe(s);
          const f = d.flags, kind = pilot(d);
          const st = stage(d);
          /* il picco anticipato lascia il segno sul tracciato, non sul risultato finale */
          const bf = d.hist.find((h) => h.node === 'wild:black_friday');
          const dip = bf && bf.id !== 'a' ? 3 : 0;
          const W = {
            acc: [2, 5, 8, 11, 14, 16, 18, 20, 21, 22, 23, 24],
            rot: [0, 1, 3, 4, 6, 7, 9, 8 - dip, 10 - dip, 11, 11, 11],
            inv: [5, 10, 15, 19, 23, 26, 29, 31 - dip, 33 - dip, 34, 35, 35],
            ado: [18, 34, 47, 58, 66, 72, 77, 80 - dip, 82 - dip, 84, 85, 85],
          };
          /* settimane di test visibili: cinque a pilota avviato, otto se l’imprevisto arriva a metà corsa, dodici a risultati presentati */
          const n = st >= 3 ? 12 : d.wild && steps(d) >= 3 ? 8 : steps(d) >= 2 ? 5 : 0;
          const empty = (k, label, why) => ({ k, label, value: `—`, delta: why, tone: 'neutral' });
          const LAB = { acc: `Accuratezza giacenze`, rot: `Riduzione delle rotture`, inv: `Riduzione tempi di inventario`, ado: `Adozione nei negozi` };
          const SIGN = { acc: `+`, rot: ``, inv: ``, ado: `` };
          const TGT = { acc: 20, rot: 15, inv: 30, ado: 80 };

          if (kind === 'sim' || kind === 'none') {
            /* niente pilota sul campo: solo la stima sulle rotture, simulata o raccolta da Silvia */
            const known = kind === 'sim' ? st >= 2 : st >= 3;
            const rot = known
              ? Object.assign({ k: 'rot', label: kind === 'sim' ? `${LAB.rot} (simulata)` : LAB.rot, value: `11%`, delta: kind === 'sim' ? `sui dati storici` : `prova di Silvia`, tone: 'warn' }, kind === 'sim' ? { spark: [3, 6, 9, 11] } : {})
              : empty('rot', LAB.rot, `da misurare`);
            const why = kind === 'sim' ? `non si simula offline` : `non misurata`;
            return [
              known ? empty('acc', LAB.acc, why) : empty('acc', LAB.acc, `da misurare`),
              rot,
              known ? empty('inv', LAB.inv, why) : empty('inv', LAB.inv, `da misurare`),
              known ? empty('ado', LAB.ado, why) : empty('ado', LAB.ado, `da misurare`),
            ];
          }

          const tile = (k) => {
            if (n === 0) return empty(k, LAB[k], `da misurare`);
            const v = W[k].slice(0, n), last = v[v.length - 1];
            const r = { k, label: LAB[k], value: SIGN[k] + last + `%`, spark: v };
            if (kind === 'signed') {
              r.target = SIGN[k] + TGT[k] + `%`;
              if (st >= 3) {
                const gap = last - TGT[k];
                r.delta = (gap >= 0 ? `+` : `−`) + Math.abs(gap) + ` pt`;
                r.tone = gap >= 0 ? 'good' : 'bad';
              } else { r.delta = `in corso`; r.tone = 'warn'; }
            } else { r.delta = st >= 3 ? `senza soglia` : `in corso`; r.tone = st >= 3 ? 'warn' : 'neutral'; }
            return r;
          };
          const rows = ['acc', 'rot', 'inv', 'ado'].map(tile);
          /* la mossa sulle rotture, dopo la riunione dei risultati, si vede sulla tessera */
          const rot = rows[1];
          if (kind === 'signed' && st >= 4) {
            if (f.manipulated) { rot.delta = `criterio ritoccato`; rot.tone = 'bad'; }
            else if (picked(d, 'n4', 'b')) { rot.delta = `piano a 6 settimane`; rot.tone = 'warn'; }
            else if (picked(d, 'n4', 'c')) { rot.delta = `pilota esteso`; rot.tone = 'warn'; }
            else if (picked(d, 'n4', 'a')) { rot.delta = `−4 pt, in allegato`; rot.tone = 'bad'; }
          }
          return rows;
        },
      },
      {
        type: 'scoreboard', title: `Nexora contro Vertex`,
        build: (s) => {
          const d = safe(s);
          const f = d.flags, st = stage(d), kind = pilot(d);
          /* come lo legge il comitato di Lumina: in ogni riga, più alto è meglio per chi compra */
          const proof = st < 2 ? 1 : kind === 'signed' ? (f.honest ? 9 : 8) : kind === 'free' ? 5 : kind === 'sim' ? 4 : st >= 3 ? 2 : 1;
          return {
            labels: [`Nexora`, `Vertex`],
            rows: [
              { k: 'price', label: `Convenienza del prezzo`, max: 10, us: cl(3.5 + Math.min(d.disc, 40) / 8, 1, 10), them: 8 + (st >= 2 ? 1 : 0) + (st >= 5 ? 1 : 0) },
              { k: 'risk', label: `Sicurezza della migrazione`, max: 10, us: cl(10 - num(d.m.risk, 48) / 9, 1, 9), them: 9 },
              { k: 'omni', label: `Copertura omnicanale`, max: 10, us: cl(6 + (kind === 'signed' ? 3 : kind === 'free' ? 2 : kind === 'sim' ? 1 : 0), 1, 10), them: 4 + (st >= 2 ? 1 : 0) },
              { k: 'proof', label: `Prova sul campo`, max: 10, us: cl(proof - (f.manipulated ? 4 : 0), 1, 10), them: 6 },
            ],
            caption: `Come la legge il comitato di Lumina, riga per riga. Il prezzo da solo non decide.`,
          };
        },
      },
    ],

    start: { t: 32, v: 30, u: 38, c: 25, r: 48, have: ['I'] },
    caps: [
      { id: 'eb', max: 0.30, if: (d) => !d.flags.ebEngaged, why: `Il CFO non è stato coinvolto nel pilota né nei criteri. Senza di lui nessuno firma €540k contro l’incumbent.` },
      { id: 'free', max: 0.35, if: (d) => d.flags.freePilot, why: `Hai accettato un pilota gratuito senza criteri: il rischio di “valutare con calma” fino a nulla è altissimo.` },
      { id: 'cio', max: 0.50, if: (d) => !d.flags.coexist, why: `Il CIO non ha un percorso a basso rischio per introdurre un secondo sistema: terrà la proroga di Vertex.` },
      { id: 'manip', max: 0.20, if: (d) => d.flags.manipulated, why: `Hai ritoccato un criterio concordato. Il cliente lo ha percepito come manipolazione e la fiducia è compromessa.` },
    ],

    nodes: {
      n1: {
        when: `Lunedì · 08:50`, view: 'desk',
        where: `Telefonata · lunedì 08:50`,
        scene: [
          { n: `Rispondi al secondo squillo. Dietro la voce di Silvia senti un corridoio, passi veloci, una porta che sbatte: ha appena lasciato la riunione vendite.` },
          { w: 'silvia', a: `camminando in fretta`, t: `Quaranta minuti a sentire direttori che ripetono “a sistema c’è, a scaffale no”. E io in mezzo, a fare l’arbitro.` },
          { w: 'silvia', a: `esasperata`, t: `Ogni settimana mi dicono che Vertex “sta per rilasciare” l’aggiornamento giusto. Intanto perdiamo vendite. L’IT dice che va tutto bene.` },
          { think: `Sabato l’ho visto con i miei occhi: tre capi a sistema, zero sullo scaffale. Ma “perdiamo vendite” non è un numero, e con una frase così il CFO, Longo, non muove un euro.` },
          { n: `Sul secondo schermo la riga di Lumina nel CRM: €540k, Best Case, 45%. Quarantacinque su che cosa, esattamente?` },
          { think: `“L’IT dice che va tutto bene”: cioè Alberto Rossi, il CIO, che con Vertex lavora da nove anni. Il dolore è di Silvia, il budget è di Longo, il veto è di Rossi. E io ho una telefonata.` },
        ],
        prompt: `Come imposti l’approccio?`,
        hint: `Un incumbent radicato si batte con un problema che costa, non con una denigrazione. Chi lo paga, e quanto?`,
        tip: `Contro un incumbent non attacchi il fornitore: quantifichi il costo del problema (Metrics) e scopri chi lo sente sulla pelle. Poi costruisci una coalizione attorno a quel costo, includendo l’IT e non contro di lui.`,
        choices: [
          ch('a', 0, `Le dico che Vertex è tecnologia vecchia e che altri retailer l’hanno già abbandonata: non vale la pena aspettare il prossimo rilascio, che tanto non arriverà.`,
            `Un attacco al fornitore, per chi lo ha scelto e lo difende, è un attacco a lui. Così Rossi ha una ragione tutta sua per diffidare di te, e Silvia nessun numero con cui rispondergli.`,
            { t: -8, c: -4, r: 12 }, {
              integ: -3, next: 'n2',
              say: `Silvia, te lo dico senza giri: Vertex è tecnologia vecchia. Altri retailer l’hanno già abbandonata, e l’aggiornamento che “sta per arrivare” non arriverà mai.`,
              react: [
                { w: 'silvia', a: `dopo una pausa`, t: `Può darsi. Ne parlo con Alberto, vediamo che cosa dice.` },
                { n: `Il giorno dopo, tramite Silvia, ti arriva la frase di Rossi, riportata alla lettera: “Chi è questo che parla male del mio fornitore?”.` },
                { think: `Ho dato a Rossi un motivo personale per fermarmi. Mi ci sono voluti trenta secondi.` },
              ],
            }),
          ch('b', 3, `Le chiedo i dati sulle rotture di stock degli ultimi dodici mesi: vendite perse, categorie, negozi. Facciamo insieme una stima di quanto costa il problema.`,
            `Hai trasformato una lamentela in un numero, e il numero è suo, non tuo: nessuno potrà dire che l’hai costruito per venderle qualcosa. È il primo mattone del business case.`,
            { t: 6, v: 12, u: 10, c: 4, r: -4 }, {
              mp: ['M'], set: { quantified: true }, next: 'n2',
              say: `Silvia, partiamo da un numero. Mandami le rotture di stock degli ultimi dodici mesi: vendite perse, categorie, negozi. Ne facciamo insieme una stima di quanto vi costa il problema, con i tuoi dati, così nessuno potrà dire che è mio.`,
              react: [
                { n: `Il file arriva in venti minuti: una scheda per categoria, negozi in riga, settimane in colonna. Silvia ha lasciato in rosso le celle che non tornano.` },
                { w: 'silvia', a: `al telefono, quasi sorpresa`, t: `Due milioni e trecentomila euro di vendite perse in dodici mesi, stimate. E sono soltanto otto categorie: le altre non le ho nemmeno guardate.` },
                { think: `Per la prima volta il costo ha un numero. Ed è il suo, non il mio.` },
              ],
            }),
          ch('c', 3, `Porto Davide a fare una giornata di diagnostica sui dati di inventario di dieci negozi: voglio capire dove nasce la differenza tra sistema e scaffale.`,
            `Hai rinunciato all’argomento più facile, “è colpa di Vertex”, e hai portato a Silvia un dato che nessuno può contestare, Rossi compreso: chi mostra anche i limiti del proprio caso viene creduto più a lungo.`,
            { t: 10, v: 10, u: 6, c: 4, r: -6 }, {
              jolly: 'se', mp: ['M', 'Co'], set: { quantified: true }, next: 'n2',
              say: `Facciamo una cosa concreta: ti porto Davide, il nostro Solution Engineer, per una giornata in dieci negozi. Guarda i dati di inventario e ti dice dove nasce la differenza tra sistema e realtà, anche quando la colpa non è di nessun sistema.`,
              react: [
                { n: `Alle sei di sera Davide è ancora nel magazzino di un negozio, seduto su una cassa di scarpe, con il portatile sulle ginocchia e tre direttori in piedi attorno.` },
                { w: 'davide', a: `girando lo schermo verso Silvia`, t: `Il sessanta per cento delle discrepanze nasce da tre processi: ricezione merce, resi, trasferimenti tra negozi. Due su tre non dipendono da Vertex: ricezione e resi, che nei negozi si fanno ancora a mano.` },
                { w: 'silvia', a: `dopo un silenzio`, t: `Quindi mi state dicendo che metà del problema è nostro. Un fornitore che lo ammette prima ancora di vendermi qualcosa non l’avevo mai incontrato.` },
                { think: `Ho appena dato ragione a un pezzo di Rossi davanti a Silvia. Costa, ma è l’unica cosa che nessuno potrà dire di aver truccato.` },
              ],
            }),
          ch('d', 1, `Le chiedo subito un incontro con Rossi: gli presento la soluzione e capisco se è disposto a valutare alternative a Vertex prima del prossimo rinnovo.`,
            `Rossi non sente nessun dolore: lo sente Silvia, e la firma è di Longo. Presentare la soluzione al CIO senza un problema con un numero sopra ti rende una voce in più su una roadmap che lui ha già.`,
            { t: -2, c: -2, r: 4 }, {
              next: 'n2',
              say: `Silvia, mi organizzi un incontro con Alberto Rossi? Gli porto la soluzione e capisco se è disposto a guardare alternative a Vertex.`,
              react: [
                { n: `Rossi ti riceve dopo tre giorni, in una sala con vista sul parcheggio dei fornitori. Il quarto d’ora comincia in orario e finisce in orario.` },
                { w: 'rossi', a: `cordiale`, t: `Una presentazione interessante. Ma, guardi, abbiamo già una roadmap con Vertex.` },
                { think: `Roadmap contro presentazione. Io non ho un problema da mostrargli: ho soltanto un logo.` },
              ],
            }),
        ],
      },

      n2: {
        when: `Mercoledì · 14:00`, view: 'meeting', bg: 'office',
        where: `Riunione · sede Lumina · mercoledì 14:00`,
        scene: [
          { n: `Mercoledì pomeriggio, sede di Lumina. La sala riunioni ha una parete di vetro sull’open space e, di fronte, il tabellone dei centoquaranta negozi: un pallino per ciascuno, verde, giallo o rosso. Troppi gialli.` },
          { w: 'silvia', a: `propositiva`, t: `Con Alberto ho parlato: un pilota è l’unico modo per non litigare. Gratuito, venti negozi, tre mesi. Poi vediamo come va e decidiamo.` },
          { n: `Gira il blocco verso di te. Sulla prima riga ha scritto “20 negozi – 3 mesi – GRATIS” e ha sottolineato l’ultima parola due volte.` },
          { think: `Gratis, tre mesi, “poi vediamo”. Questo finale lo conosco: una pacca sulla spalla e un rinnovo con Vertex.` },
          { think: `E non sarebbe un pilota: sarebbe lavoro mio e di Davide, regalato per novanta giorni.` },
        ],
        prompt: `Come rispondi alla proposta di pilota?`,
        hint: `Un pilota non è una prova: è un contratto di prova con un esito concordato.`,
        tip: `Un pilota gratuito e aperto raramente si converte. Proponi un pilota a corrispettivo ridotto con obiettivi misurabili scritti, un Economic Buyer che firma i criteri e un percorso di conversione già concordato.`,
        choices: [
          ch('a', 0, `Certo, ci stiamo: venti negozi per tre mesi, a nostre spese e senza vincoli per Lumina. Poi guardiamo i numeri insieme e decidiamo quando Lumina è pronta, senza fretta e senza pressioni.`,
            `Hai accettato il pilota più facile da dire sì e più difficile da convertire. Senza soglie scritte né un passo successivo, il successo non ha una definizione: ognuno ne darà una propria, e quella di Rossi sarà la più prudente.`,
            { t: 2, v: -2, u: -8, c: -8, r: 12 }, {
              set: { freePilot: true }, next: 'n3',
              say: `Ci stiamo, Silvia. Venti negozi per tre mesi, a nostre spese e senza vincoli per Lumina. Alla fine guardiamo i numeri insieme e decidiamo.`,
              react: [
                { w: 'silvia', a: `sollevata`, t: `Perfetto. Dico ad Alberto di preparare i venti negozi.` },
                { n: `Sul blocco, sotto “GRATIS”, non c’è altro: nessun nome di chi decide, nessuna cifra, nessuna data dopo il terzo mese.` },
                { think: `Novanta giorni di lavoro regalati. E nessuno ha ancora detto che cosa dovrebbe succedere alla fine.` },
              ],
            }),
          ch('b', 3, `Ci sto, ma a pagamento ridotto: dodici negozi, quattro settimane di allestimento e dodici di test, quattro criteri misurabili firmati da Longo. Se li raggiungiamo, il pilota diventa credito sul contratto.`,
            `Hai spostato il pilota da favore a patto: soglie misurabili, una firma di chi paga e la conversione già scritta. Per Longo, adesso, non è più un esperimento di Silvia ma un impegno suo.`,
            { t: 6, v: 8, u: 4, c: 14, r: -8 }, {
              mp: ['E', 'Dc'], set: { criteriaSet: true, ebEngaged: true }, next: 'n3',
              say: `Ci sto, ma facciamolo come un pilota vero. Quattro settimane di allestimento e dodici di test su dodici negozi, a pagamento ridotto, con quattro criteri misurabili che firma Andrea Longo. Se li raggiungiamo si passa al contratto completo, e quello che ha pagato il pilota diventa credito.`,
              react: [
                { w: 'silvia', a: `ci pensa`, t: `Il CFO che firma i criteri di un pilota? Longo non l’ha mai fatto. Ma ha senso, sì. Glielo porto io.` },
                { n: `Dieci giorni dopo ti arriva una scansione: quattro righe, una firma a penna in fondo, “A. Longo”. Accuratezza delle giacenze più 20%, rotture meno 15%, tempi di inventario meno 30%, adozione all’80%.` },
                { think: `Quattro righe e una firma a penna. Per la prima volta questo pilota ha un proprietario.` },
              ],
            }),
          ch('c', 2, `Propongo una prova di valore di quattro settimane, offline, sui vostri dati storici: con il nostro motore previsionale simuliamo le rotture dei negozi e le confrontiamo con quelle reali, senza toccare niente.`,
            `Hai ridotto il rischio e accorciato i tempi, e Silvia è convinta. Ma una simulazione non ha toccato nessun negozio: per Rossi resta un’obiezione aperta, perché in negozio non è girato niente.`,
            { t: 4, v: 8, c: 4, r: -2 }, {
              mp: ['M'], set: { proofOfValue: true }, next: 'n3',
              say: `Propongo una cosa più leggera, Silvia: una prova di valore di quattro settimane, offline, sui vostri dati storici. Con il nostro motore previsionale simuliamo le rotture dei negozi e le confrontiamo con quelle reali. Nessun negozio da toccare.`,
              react: [
                { w: 'silvia', a: `più piano`, t: `Su dati storici. Quindi nessun negozio da toccare. Alberto ne sarà felice.` },
                { n: `Quattro settimane dopo il motore ricostruisce le rotture dell’ultima stagione con uno scarto che Silvia definisce “accettabile”, davanti a tutti. Rossi annuisce, poi fa una sola domanda: “E in negozio, con i palmari in mano?”.` },
                { think: `Domanda giusta. E io, per rispondergli, non ho niente.` },
              ],
            }),
          ch('d', 1, `Dico di no a qualsiasi pilota: ai clienti come Lumina proponiamo soltanto il contratto completo, con un piano di avvio serio per tutti i negozi e un unico referente da parte nostra.`,
            `Una linea di principio comprensibile, ma Silvia aveva portato la proposta come l’unico modo di convincere il CIO. Rifiutarla significa lasciarla da sola con Rossi, senza niente in mano.`,
            { t: -4, u: -4, c: -2, r: 8 }, {
              next: 'n3',
              say: `Silvia, un pilota non lo facciamo. Possiamo partire subito con il contratto completo, un piano di implementazione serio e un unico referente per i negozi.`,
              react: [
                { w: 'silvia', a: `fredda`, t: `E io come lo spiego a Rossi? “Fidatevi, poi vediamo”? Mi stai chiedendo di esporre me, non te.` },
                { think: `Ho chiuso l’unica porta che era disposta ad aprire. L’ho chiusa dal suo lato.` },
              ],
            }),
        ],
      },

      n3: {
        when: `Giovedì · 16:00`, view: 'meeting', bg: 'office',
        where: `Incontro · ufficio del CIO · giovedì 16:00`,
        scene: (d) => {
          const k = pilot(d);
          return [
            { n: `Quarto piano. L’ufficio di Rossi è ordinatissimo: una sola penna sul tavolo, una pallina da golf firmata dentro una teca e, dalla finestra, il magazzino centrale con i camion in coda alle baie.` },
            { n: k === 'signed' ? `Sono passate alcune settimane. Il pilota è in corso: dodici negozi, quattro criteri firmati.` : k === 'free' ? `Sono passate alcune settimane. Il pilota gratuito è in corso: venti negozi e nessuna soglia scritta.` : k === 'sim' ? `La prova sui dati storici è chiusa da qualche giorno: in negozio, nessuno ha toccato niente.` : `Sono passate alcune settimane. Un pilota non c’è: Silvia l’aveva proposto, e tu hai detto di no.` },
            { n: `Silvia ti ha avvisato per telefono: Vertex ha fiutato il pericolo. Il loro referente commerciale ha offerto a Rossi una proroga del contratto con meno 40% e un aggiornamento “gratuito”.` },
            { w: 'rossi', a: `cordiale e inamovibile`, t: `La proroga di Vertex mi risolve il rinnovo e mi dà più tempo. Perché dovrei introdurre un secondo fornitore in piena stagione?` },
            { w: 'rossi', a: `senza fretta`, t: `Non è una questione di simpatia. Ho centoquaranta negozi che vendono ogni giorno: qualunque cosa tocchi, la tocco con loro dentro.` },
            { think: `Non difende Vertex: difende i suoi weekend. Una migrazione in stagione vuol dire telefonate alle tre di notte, e le riceve lui.` },
          ];
        },
        prompt: `Come tratti il CIO?`,
        hint: `Il CIO teme rischio e carico di lavoro. Se riduci il suo rischio, diventa neutrale o alleato.`,
        tip: `Un CIO leale all’incumbent non si batte: si disarma riducendo il rischio percepito. Proponi coesistenza (integrazione senza smantellare il core), una migrazione per ondate e un ruolo da protagonista per il suo team.`,
        choices: [
          ch('a', 0, `Gli ricordo le carenze di Vertex che ho raccolto: tre release in ritardo e due incidenti. Lo faccio per correttezza verso un cliente che merita di saperlo prima di rinnovare.`,
            `Per te era correttezza, per lui è un dossier sul suo fornitore. Hai portato un elenco di errori, di seconda mano, a chi ha messo la propria firma su Vertex: la conversazione smette di riguardare il rischio e diventa una questione personale.`,
            { t: -10, c: -4, r: 14 }, {
              integ: -6, next: 'n4',
              say: `Dottor Rossi, per correttezza le dico quello che ho raccolto su Vertex: tre release in ritardo e due incidenti negli ultimi due anni. Meglio che lo sappia da me.`,
              react: [
                { w: 'rossi', a: `senza alzare la voce`, t: `Ha raccolto informazioni sul mio fornitore.` },
                { n: `La penna sul tavolo viene riallineata di un millimetro. Rossi apre il fascicolo di Vertex e comincia a sfogliarlo, come se nella stanza non ci fossi più.` },
                { think: `Fonti non verificate, tono da denuncia. Gli ho consegnato io la scusa per non ascoltarmi mai più.` },
              ],
            }),
          ch('b', 3, `Propongo la coesistenza: Vertex resta il core per amministrazione e fatturazione, noi facciamo disponibilità e fulfillment via API, a ondate, con il suo team alla guida.`,
            `Hai cambiato la domanda: non più “perché cambiare”, ma “come controllo il rischio”. A Rossi non chiedi di spegnere Vertex ma di aggiungere ciò che manca, con il comando in mano al suo team.`,
            { t: 8, v: 6, c: 8, r: -12 }, {
              mp: ['Co', 'Dc'], set: { coexist: true }, next: 'n4',
              say: `Dottor Rossi, non le chiedo di spegnere Vertex. Resta il core per amministrazione e fatturazione. Noi ci mettiamo sopra la disponibilità e il fulfillment omnicanale, con un’integrazione via API, a ondate. L’architettura la guida il suo team.`,
              react: [
                { w: 'rossi', a: `alzando lo sguardo`, t: `Questa è un’idea che posso difendere.` },
                { n: `Per la prima volta Rossi lascia la penna e tira verso di sé un foglio bianco. Disegna due rettangoli: Vertex da una parte, tutto il resto dall’altra.` },
                { think: `Sta già scegliendo chi dei suoi mettere nel rettangolo di destra.` },
              ],
            }),
          ch('c', 2, `Chiedo a Marta, la nostra Sales Director, di incontrare Rossi con me per un confronto strategico sulla visione IT di Lumina, sulla roadmap e sull’impegno di Nexora nei prossimi anni.`,
            `Mettere Marta davanti a Rossi ha funzionato sul piano della relazione: si sente trattato da pari. Ma la sua obiezione vera è operativa, toccare i negozi in stagione, e a quella la strategia non risponde: hai speso un Executive Sponsor per ottenere simpatia, non sicurezza.`,
            { t: 8, v: 2, c: 4, r: -4 }, {
              jolly: 'exec', next: 'n4',
              say: `Dottor Rossi, vorrei che incontrasse Marta Colombo, la nostra Sales Director. Un confronto a tre sulla visione IT di Lumina e su che cosa Nexora è disposta a mettere in gioco.`,
              react: [
                { n: `Marta arriva il martedì dopo. Rossi la riceve in piedi, con il caffè già in mano, e per quaranta minuti parlano di roadmap, di cloud, di come cambieranno i negozi tra cinque anni.` },
                { w: 'rossi', a: `rilassato`, t: `Finalmente qualcuno che mi chiede dove voglio andare, non che cosa devo comprare.` },
                { w: 'marta', a: `in corridoio, appena usciti`, t: `A lui è piaciuto parlarne, e a me è piaciuto lui. Una cosa però l’ho notata: in quaranta minuti non ha mai nominato l’avvio nei negozi. Quello resta tuo.` },
              ],
            }),
          ch('d', 1, `Faccio leva sull’urgenza: la proroga di Vertex è una trappola per tenere Lumina vincolata altri anni, e la finestra per cambiare si chiude adesso, non dopo la stagione.`,
            `Un’accusa senza prove, rivolta a chi conosce Vertex da nove anni, non crea urgenza: crea sospetto verso di te. L’urgenza va dimostrata con un costo, non dichiarata.`,
            { t: -4, r: 4 }, {
              next: 'n4',
              say: `Dottor Rossi, con tutto il rispetto: la proroga serve a Vertex per tenervi legati altri anni. E la finestra per cambiare si chiude adesso.`,
              react: [
                { w: 'rossi', a: `sorridendo appena`, t: `Non può dirmelo senza prove, e le prove non le ha portate.` },
                { think: `Ho gridato “al lupo” davanti a uno che il lupo lo conosce da nove anni.` },
              ],
            }),
        ],
      },

      n4: {
        when: `Venerdì · 11:00`, view: 'walk', bg: 'factory',
        where: `Magazzino di un negozio · venerdì 11:00`,
        scene: (d) => {
          const k = pilot(d), signed = k === 'signed';
          const res = k === 'signed' ? `Sul tablet, appoggiato a una cassa di scarpe, i quattro criteri firmati da Longo e accanto i risultati: accuratezza delle giacenze più 24%, tempi di inventario meno 35%, adozione all’85%. Le rotture di stock, però, sono meno 11% contro un target di meno 15%.`
            : k === 'free' ? `Sul tablet, appoggiato a una cassa di scarpe, i numeri dei venti negozi del pilota gratuito. Sono buoni sul campo, ma nessuno ha mai scritto cosa significasse “successo”. Le rotture di stock sono migliorate dell’11%: Silvia ricorda un obiettivo del quindici per cento, Davide uno del venti.`
              : k === 'sim' ? `Sul tablet, appoggiato a una cassa di scarpe, i risultati della prova sui dati storici: nessun negozio toccato, tutto ricostruito al computer. Sulla carta sono buoni, ma nessuno ha mai scritto cosa significasse “successo”. Le rotture risultano migliorate dell’11%: Silvia ricorda un obiettivo del quindici per cento, Davide uno del venti.`
                : `Sul tablet, appoggiato a una cassa di scarpe, i numeri che Silvia ha raccolto da sola in sei negozi, dopo il tuo no al pilota: senza contratto e senza soglie. Sono buoni sul campo, ma nessuno ha scritto cosa significasse “successo”. Le rotture sono migliorate dell’11%: Silvia ricorda un obiettivo del quindici per cento, Davide uno del venti.`;
          return [
            { n: `Silvia ha scelto il magazzino di un negozio, non la sala riunioni. “Voglio che li vedi dove nascono”, ti ha scritto. Scaffalature grigie fino al soffitto, il ronzio dei neon, un carrello di scatole ancora da aprire.` },
            { n: res },
            k === 'sim' ? { w: 'davide', a: `a bassa voce`, t: `Il modello ricostruisce bene le rotture dell’ultima stagione. Sbaglia su due negozi con un layout particolare, e in negozio, però, non abbiamo ancora visto girare niente.` }
              : k === 'none' ? { n: `Un neon sfarfalla sopra la scaffalatura. Da qualche parte un transpallet cigola. Su sei negozi, due hanno numeri più bassi degli altri: Silvia li ha segnati in rosso sul tablet.` }
                : { w: 'davide', a: `a bassa voce, sul tablet`, t: `Negozio per negozio: due sono in rosso, gli altri in linea. I due in rosso hanno gli scaffali disposti in un modo che il sistema non conosce.` },
            { w: 'silvia', a: `in tensione`, t: signed ? `Ho messo i risultati in una slide per Longo. Cosa gli diciamo sulle rotture, che sono sotto target?` : `Ho messo i risultati in una slide per Longo. Cosa gli diciamo sulle rotture, che sono sotto quello che speravamo?` },
            signed ? { think: `Tre su quattro, e il quarto è proprio quello che a Longo interessa di più: le vendite.` }
              : { think: `Nessuna soglia scritta: il risultato lo racconta chi lo presenta per primo.` },
          ];
        },
        prompt: `Come presenti un risultato misto?`,
        hint: `Tre su quattro raccontato onestamente vale più di quattro su quattro ritoccato.`,
        tip: `Presenta i risultati sempre per criteri concordati, con trasparenza sul gap e un piano per colmarlo. Nascondere un miss è una scorciatoia: il CFO, o il tuo concorrente, lo troverà.`,
        choices: [
          ch('a', 0, `Apro con i risultati migliori e lascio le rotture in un allegato in fondo: i dati ci sono tutti, ma la riunione non parte dal punto debole e Longo ci arriva con calma.`,
            `Hai trasformato un risultato misto in un caso di opacità. Un CFO legge sempre l’allegato, e un dato nascosto pesa più del dato stesso: ora qualunque numero tu porti sarà verificato due volte.`,
            { t: -10, v: -4, r: 14 }, {
              integ: -6, next: 'n5',
              say: `Facciamo così, Silvia: in prima slide mettiamo i risultati migliori, e le rotture le lasciamo in un allegato in fondo. I dati ci sono tutti, ma non apriamo il discorso dal punto debole.`,
              react: [
                { w: 'silvia', a: `esitando`, t: `Non so, Longo legge sempre gli allegati.` },
                { mail: { from: `Andrea Longo`, subj: `Risultati · rotture di stock` }, t: `Ho letto la slide fino in fondo. Le rotture di stock sono a pagina 14, in allegato: mi dica perché non erano in prima pagina. Ne parliamo di persona, ho anche una domanda sul prezzo.`, sfx: 'ping' },
                { think: `Pagina 14. Il numero di pagina l’ho scelto io, e lui l’ha letto come una dichiarazione.` },
              ],
            }),
          ch('b', 3, `Presento tutti e quattro i risultati, anche quello sotto obiettivo: spiego perché (stagionalità, due negozi con layout non ottimizzato) e propongo un piano di sei settimane.`,
            `Hai mostrato il gap e la sua causa insieme a un piano per chiuderlo. Il rosso sulla slide diventa la prova che gli altri tre numeri sono veri, e il piano entra nel contratto come impegno, non come scusa.`,
            { t: 8, v: 8, c: 8, r: -8 }, {
              mp: ['M'], set: { honest: true }, next: 'n5',
              say: `Silvia, li presentiamo tutti e quattro, rotture comprese. Spieghiamo perché sono sotto: la stagionalità e due negozi con un layout che non avevamo ottimizzato. E mettiamo sul tavolo un piano di sei settimane per colmare il gap prima dell’estensione a tutti i negozi.`,
              react: [
                { n: `Longo risponde alla slide la sera stessa, in quattro righe.` },
                { mail: { from: `Andrea Longo`, subj: `Risultati · rotture di stock` }, t: `Quattro risultati, anche quello rosso. Mi piace che non me l’abbiate nascosto. Il piano di sei settimane lo voglio nel contratto, con le date. Ne parliamo di persona.`, sfx: 'ping' },
                { think: `Quella riga rossa l’avrei evitata volentieri. Ora è l’unica che nessuno può dire di aver ritoccato.` },
              ],
            }),
          ch('c', 2, `Propongo di prolungare la sperimentazione di altri due mesi, per colmare il gap sulle rotture prima che Lumina decida: meglio un dato completo che una decisione presa a metà.`,
            `Aspettare un dato completo è un ragionamento difendibile, e un CFO apprezza di decidere su numeri interi. Ma due mesi sono tempo regalato a chi ti sfida: Vertex ha la proroga già pronta, tu hai un trimestre che finisce.`,
            { t: 2, u: -8, c: -2, r: 4 }, {
              next: 'n5',
              say: `Silvia, prolunghiamo di due mesi: il dato sulle rotture ha il tempo di recuperare e Longo decide con i numeri completi.`,
              react: [
                { w: 'silvia', a: `guardando il calendario sul tablet`, t: `Due mesi in più. Ma il rinnovo con Vertex è dietro l’angolo, e Alberto lo sa.` },
                { think: `Due mesi in più di Davide nei negozi. E la scadenza di Vertex non si sposta di un giorno.` },
              ],
            }),
          ch('d', 0, `Ridefinisco il criterio: le rotture vanno misurate su un altro periodo, quello dopo le prime settimane di assestamento, e su quello il target risulta raggiunto. Cambia la finestra, non i dati.`,
            `Ritoccare un criterio concordato è la scorciatoia più cara che esista: il cliente la legge come manipolazione, e la fiducia costruita fin qui crolla in un colpo solo.`,
            { t: -12, v: -6, c: -6, r: 16 }, {
              integ: -8, set: { manipulated: true }, next: 'n5',
              say: `Silvia, il criterio sulle rotture va misurato su un altro periodo, quello che parte dopo l’assestamento. Su quello il target risulta raggiunto.`,
              react: (d) => [
                { w: 'silvia', a: `lentamente`, t: d.flags.criteriaSet ? `Ma i criteri li abbiamo firmati noi. Con le date dentro.` : `Ma ne avevamo parlato in un altro modo, tutti. Con altre date.` },
                { think: d.flags.criteriaSet ? `Ho riscritto una riga che qualcuno aveva firmato. E l’ho fatto davanti a lei.` : `Ho riscritto una riga che tutti ricordavano in un altro modo. E l’ho fatto davanti a lei.` },
              ],
            }),
        ],
      },

      n5: {
        when: `Lunedì · 10:00`, view: 'meeting', bg: 'office',
        where: `Incontro · ufficio del CFO · lunedì 10:00`,
        scene: (d) => [
          { n: `Lunedì, le dieci in punto. L’ufficio del CFO è al sesto piano ed è l’opposto di quello di Rossi: nessuna teca, un solo monitor e una lavagna bianca con tre cose scritte a pennarello nero: 540, 270 e un punto interrogativo.` },
          { if: (x) => x.flags.criteriaSet && !x.flags.manipulated, n: `Accanto al monitor, il foglio con i quattro criteri e la firma a penna di Longo. L’ha tirato fuori prima del tuo arrivo.` },
          { if: (x) => x.flags.manipulated, n: `Longo non si alza per salutarti. Davanti a lui, stampata, la slide con la tua nuova finestra di misura delle rotture: una riga evidenziata in giallo, un punto di domanda a margine.` },
          { if: (x) => x.flags.honest, n: `Sul monitor, accanto al prezzo, la tabella dei risultati. La riga delle rotture è evidenziata in giallo.` },
          { if: (x) => x.flags.ceoPage, n: `Sul bordo della scrivania, piegata in due, la pagina che tu e Silvia avete preparato per il CEO. Longo non la nomina, ma non l’ha buttata.` },
          { if: (x) => !x.flags.manipulated, w: 'longo', a: `diretto`, t: `Ho una domanda semplice: perché dovrei spendere €540.000 l’anno per un nuovo sistema quando Vertex mi offre la proroga a metà del vostro prezzo?` },
          { if: (x) => x.flags.manipulated, w: 'longo', a: `gelido, senza guardarti`, t: `Ho una domanda semplice: perché dovrei spendere €540.000 l’anno per un nuovo sistema quando Vertex mi offre la proroga a metà del vostro prezzo?` },
          { n: `Non alza la voce. Si appoggia allo schienale, le mani intrecciate, e aspetta.` },
          { think: `Metà prezzo contro tutto il prezzo: detta così, la domanda ha già una risposta, e non è la mia.` },
          ...(d.flags.quantified
            ? [{ think: `Ho il file di Silvia: 2,3 milioni di vendite perse in otto categorie. È l’unica cifra su questo tavolo che non ha scritto nessun fornitore.` }]
            : [
              { n: `Nell’atrio, prima di salire, Silvia ti ha passato un foglietto con una cifra: 2,3 milioni di vendite perse l’anno, stimate da lei a occhio sulle rotture di otto categorie. Non c’è un file, non c’è un metodo.` },
              { think: `Un numero ce l’ho. Non so se regge davanti a lui.` },
            ]),
        ],
        prompt: `Come rispondi al CFO?`,
        hint: `Il confronto non è fra due prezzi, ma fra il costo di restare e il valore di cambiare.`,
        tip: `Contro una proroga scontata sposta la domanda dal prezzo al costo di inazione: cosa perdi restando fermo contro cosa guadagni. Aggancia il valore a una data di business, per esempio la stagione.`,
        choices: [
          ch('a', 0, `Gli dico che possiamo avvicinarci al prezzo di Vertex: €270k, così il prezzo smette di essere un tema e passiamo a discutere di come partire e con quali negozi.`,
            `Un prezzo che scende del 50% in una frase dice a un CFO due cose: che il listino non valeva niente e che il prodotto si sostituisce con quello che costa meno. Hai perso sul prezzo prima di negoziare, e sul valore non hai detto una parola.`,
            { t: -4, v: -12, c: -4, d: 50 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, ci posso arrivare: portiamo il prezzo a €270k e il prezzo smette di essere un tema. Poi parliamo del resto.`,
              react: [
                { w: 'longo', a: `senza battere ciglio`, t: `Quindi i €540.000 erano una cifra di partenza.` },
                { n: `Annota qualcosa nell’angolo del blocco e non alza gli occhi. Sulla lavagna, il 270 non è più il numero di Vertex: è diventato il tuo.` },
                { think: `Ho appena detto che il mio prodotto vale metà di quello che scrivevo. E lui lo ha scritto.` },
              ],
            }),
          ch('b', 3, `Gli propongo di mettere sullo stesso foglio il costo di restare e quello di cambiare: 2,3 milioni di vendite perse l’anno, un terzo recuperabile, ritorno in nove mesi.`,
            `Hai spostato la domanda dal prezzo al valore, con i numeri di Silvia e non con i tuoi: a Longo non chiedi di fidarsi di un fornitore, ma di verificare una cifra del suo COO. Messa accanto a un costo di restare con una cifra sopra, la proroga a metà prezzo smette di essere un risparmio.`,
            { t: 6, v: 14, u: 10, c: 4, r: -6 }, {
              mp: ['E', 'M'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, mettiamo i due costi sullo stesso foglio. Restare: Silvia stima in 2,3 milioni l’anno le vendite perse per rotture di stock. Con la nostra soluzione ne recuperate circa un terzo, 770 mila euro nel primo anno: ci si ripaga in nove mesi, e i primi negozi sono pronti per il Black Friday. La proroga a metà prezzo su questo non incide.`,
              react: [
                { w: 'longo', a: `dopo un attimo`, t: `Se i 770 reggono, la questione non è più il prezzo.` },
                { n: `Si alza, cancella il punto interrogativo dalla lavagna e scrive “770?”. Poi si volta verso di te.` },
                { w: 'longo', t: `Voglio rivedere i dati con Silvia. Domani, qui.` },
                { think: `Ha cambiato il verbo della domanda: da “perché dovrei spendere” a “reggono o non reggono”.` },
              ],
            }),
          ch('c', 2, `Gli porto il caso del nostro cliente più simile a Lumina: meno 22% sui costi logistici in un anno, con una rete di negozi e un magazzino centrale come il suo.`,
            `Il caso porta credibilità ma non sposta la domanda: Longo chiedeva perché per Lumina, e la risposta può uscire solo da cifre di Lumina. Hai guadagnato ascolto, non ancora un perché.`,
            { t: 2, v: 5, c: 2 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, le porto il caso del cliente che somiglia di più a Lumina: in un anno, meno 22% sui costi logistici. Anche lì una rete di negozi e un magazzino centrale, come il vostro.`,
              react: [
                { w: 'longo', a: `scorrendo la pagina`, t: `Un buon caso. Ma è il caso di un altro. Mostratemi i miei numeri, non quelli di un altro.` },
                { think: `Contesto giusto, pelle sbagliata. Il numero di Lumina ce l’avevo, e non l’ho tirato fuori.` },
              ],
            }),
          ch('d', 1, `Gli blocco il prezzo per cinque anni, se firma entro il 31: così non teme rincari, chiude l’anno con una spesa certa e toglie a Vertex lo spazio per rilanciare ancora.`,
            `Una garanzia di prezzo risponde a una paura che Longo non ha. Il suo dubbio è sul valore: bloccare per cinque anni il prezzo di un sistema non ancora provato ovunque gli sembra un rischio in più, non un vantaggio.`,
            { t: -2, c: -2, d: 5 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, se firma entro il 31 le blocco il prezzo per cinque anni. Nessun rincaro, spesa certa per tutto il periodo.`,
              react: [
                { w: 'longo', a: `quasi divertito`, t: `E perché dovrei firmare per cinque anni un sistema che non ho ancora usato in tutti i negozi?` },
                { think: `Gli ho venduto la stabilità di un prezzo, non il valore di una soluzione. Lui compra il contrario.` },
              ],
            }),
        ],
      },

      n6: {
        when: `Venerdì · 18:40`, view: 'phone', bg: 'night',
        where: `Messaggio · Silvia · venerdì 18:40`,
        scene: (d) => [
          { n: `Venerdì sera, le sei e quaranta. Sei sul binario del regionale, la borsa tra i piedi, quando il telefono comincia a vibrare a ripetizione.`, sfx: 'ping' },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Brutte notizie.` },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Vertex rilancia: meno 55% e implementazione gratuita.` },
          d.flags.coexist
            ? { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Rossi l’ha girato a Longo, ma con una nota sua: “Da valutare accanto al piano a ondate, non al posto”.` }
            : { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Rossi l’ha messo sul tavolo di Longo con una riga sola: “Condizioni migliori e nessun rischio di migrazione”.` },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Longo vuole una risposta da voi entro lunedì. Cosa facciamo?` },
          d.flags.criteriaSet
            ? { think: `Ho quattro criteri firmati da Longo e i risultati del pilota. Ma adesso Longo guarda un’altra pagina: il prezzo di Vertex.` }
            : d.mp.has('M')
              ? { think: `Il numero sulle vendite perse c’è, ma nessun criterio firmato: dovrò fare molto con le sole parole.` }
              : { think: `Non ho criteri firmati né un numero condiviso. Il rilancio di Vertex è l’unica cosa solida che Longo ha davanti.` },
          { n: `Il tabellone annuncia dodici minuti di ritardo. Hai il tempo per una risposta, non per dieci.` },
        ],
        prompt: `Ultima mossa. Cosa fai?`,
        hint: `L’ultimo rilancio dell’incumbent mette alla prova se il tuo valore regge senza sconti spasmodici.`,
        tip: `Se il valore è stato quantificato e firmato dal CFO non devi inseguire il prezzo: ricordi il costo di restare, offri una struttura flessibile (partenza a ondate) e fissi la decisione sul calendario di business, non su quello commerciale.`,
        choices: [
          ch('a', 0, `Rispondo subito alla pari: meno 50% sul primo anno. Longo vuole una risposta entro lunedì, e il Deal Desk lo coinvolgo dopo, a cose fatte, con il rilancio di Vertex già superato.`,
            `Hai confermato che il prezzo era il tuo punto debole e promesso uno sconto che nessuno ha approvato. Il Deal Desk lo blocca, e torni da Longo con meno di quanto avevi detto: la peggiore combinazione possibile.`,
            { t: -6, v: -10, c: -4, d: 50 }, {
              next: 'END',
              say: `Silvia, rispondo subito: portiamo il primo anno a meno cinquanta per cento. Lunedì Longo deve avere una risposta, e il Deal Desk lo sistemo dopo, a cose fatte.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ah, bene. Lo giro a Longo adesso.` },
                { n: `Lunedì mattina, prima ancora del caffè, ti arriva una mail dal Deal Desk.` },
                { mail: { from: `Giulia · Deal Desk`, subj: `Lumina · sconto del 50% sul primo anno` }, t: `Non è approvabile. Senza contropartite scritte il mio limite è il 15%; con contropartite documentate arrivo al 21%. Il 50% non lo firma nessuno. Longo ha già ricevuto la tua cifra?`, sfx: 'ping' },
                { think: `Ho promesso una cifra che non posso firmare. E adesso devo andare a ritirarla.` },
              ],
            }),
          ch('b', 3, `Non rincorro il prezzo: ricordo i risultati e il costo di restare fermi, e propongo 40 negozi prima del Black Friday, gli altri a gennaio, con il pagamento legato alle ondate.`,
            `Hai risposto a un ribasso con ciò che Vertex non può dare: un calendario che parte prima del picco di stagione con rischio contenuto. Il pagamento a ondate protegge Longo, i negozi a gennaio proteggono Rossi, e la tua firma cade dentro il trimestre.`,
            { t: 6, v: 6, u: 10, c: 12, r: -8, d: 8 }, {
              mp: ['Dp', 'P'], set: { giveGet: true }, next: 'END',
              say: `Silvia, il prezzo non lo rincorro. Digli che i risultati sono sul tavolo e che restare fermi costa 2,3 milioni l’anno. Proponiamo una partenza a ondate: quaranta negozi prima del Black Friday, gli altri a gennaio, con il pagamento legato alle ondate. E chiediamo la decisione entro venerdì, per restare dentro il calendario di stagione.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ok. Questo posso portarlo a Longo senza vergognarmi.` },
                { n: `Lunedì mattina, nell’ufficio del CFO, la lavagna è stata cancellata. Resta una sola riga: “Black Friday”.` },
                { w: 'longo', a: `senza guardarti`, t: `La stagione è il mio vincolo, non il prezzo.` },
                { think: `Non gli sto vendendo uno sconto. Gli sto dando un calendario.` },
              ],
            }),
          ch('c', 2, `Con il Deal Desk strutturo un’offerta più leggera sul primo anno, con un prezzo che sale in funzione dell’adozione (rampa): il primo anno costa meno e il resto segue i negozi.`,
            `La rampa alleggerisce il primo anno e premia l’adozione, ma lascia aperto il tema del tempo: una struttura nuova va letta, approvata e difesa da Silvia davanti a Longo, e lui vuole una risposta lunedì.`,
            { t: 4, v: 4, c: 8, r: -4, d: 10 }, {
              jolly: 'desk', set: { giveGet: true, deskApproved: true }, mp: ['P'], next: 'END',
              say: `Silvia, chiamo Giulia del Deal Desk e strutturiamo un’offerta più leggera sul primo anno, con un prezzo che cresce man mano che i negozi adottano il sistema. Ti rispondo entro stasera.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Una rampa? Interessante, sì. Mandamela appena la vedi, che la guardo prima di Longo.` },
                { n: `Giulia, del Deal Desk, richiama dopo cinquanta minuti, quando sei già sul treno. Tre scenari su un foglio, uno solo sta dentro le soglie di sconto.` },
                { think: `Una buona struttura, ma nuova. Tra me e lunedì c’è soltanto un weekend.` },
              ],
            }),
          ch('d', 1, `Aspetto: Vertex è con le spalle al muro e non voglio inseguirla. Se la nostra proposta regge, reggerà anche lunedì, senza bisogno di un’altra mossa da parte nostra.`,
            `Una posizione di principio, ma passiva: un silenzio di tre giorni davanti a un rilancio è un messaggio. Rossi lo userà come prova che puoi essere sostituito, e il weekend deciderà al posto tuo.`,
            { t: -4, u: -8, c: -6, r: 8 }, {
              next: 'END',
              say: `Silvia, non rispondo. Vertex è con le spalle al muro e non la inseguo: se la nostra proposta regge, reggerà anche lunedì.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ok… Ma Alberto sta già dicendo a Longo che voi non rispondete.` },
                { n: `Sabato e domenica il telefono resta muto. Il tabellone del regionale annuncia il tuo treno, poi lo cancella.` },
                { think: `Una posizione di principio. Un silenzio che Rossi può raccontare come vuole.` },
              ],
            }),
        ],
      },
    },

    /* ───── imprevisti dentro la trattativa ───── */
    wild: [
      {
        id: 'black_friday', title: `Le promozioni d’autunno partono due settimane prima`, w: 2, after: ['n2', 'n3'],
        if: (d) => !!(d.flags.criteriaSet || d.flags.freePilot),
        node: {
          when: `Mercoledì · 17:30`, view: 'walk', bg: 'retail',
          where: `Negozio pilota · mercoledì 17:30`,
          scene: (d) => [
            { n: `Qualche settimana dopo l’avvio del pilota, un mercoledì sera, in uno dei negozi. Il marketing ha anticipato la promozione d’autunno e il piano vendita sembra una stazione: file alle casse, bancali nei corridoi, i palmari in ricarica a metà.` },
            { w: 'silvia', a: `accanto a te, sopra il rumore`, t: `Il marketing ha anticipato le promozioni di due settimane e nessuno mi ha avvisata. I ${pilotStores(d)} negozi del pilota sono dentro il picco, e i numeri di queste settimane saranno una giungla. Lo sai anche tu.` },
            { n: `Un addetto passa con un carrello di scatole e non guarda nemmeno il palmare. Sul display dell’apparecchio in carica lampeggia un avviso: “Inventario ciclico in sospeso”.` },
            d.flags.criteriaSet
              ? { think: `Quattro criteri firmati, e adesso un picco che nessuno aveva messo in conto. I numeri di queste due settimane li leggerà Longo.` }
              : { think: `Senza soglie scritte, qualunque numero esca da queste settimane sarà discutibile: se è basso, “è colpa del picco”; se è alto, “era stagione”.` },
          ],
          prompt: `Il picco stressa il pilota. Come lo gestisci?`,
          hint: `Un picco non è un incidente: è il test più onesto che avrai. Come lo trasformi in un dato che regge?`,
          tip: `Quando il mondo sconvolge il tuo pilota, non cambiare il metro: separa le finestre di misura, tieni i dati grezzi e mostra come il sistema si comporta sotto carico. Il picco è un punto a tuo favore, se lo racconti tu per primo.`,
          choices: [
            ch('a', 3, `Chiedo a Silvia di marcare le settimane di picco come finestra separata: misuriamo il pilota in condizioni normali e sotto carico, e teniamo i dati grezzi di entrambe.`,
              (d) => (d.flags.criteriaSet
                ? `Con criteri firmati il picco non è un incidente ma una seconda prova: gli stessi quattro indicatori, letti nei giorni tranquilli e in quelli peggiori. Un risultato che regge sotto stress pesa più di una media.`
                : `Anche senza soglie scritte, separare le finestre rende i dati leggibili e difendibili. Ti manca la firma di chi paga, ma almeno hai un metro onesto da mostrare.`),
              (d) => (d.flags.criteriaSet ? { t: 5, v: 6, c: 8, r: -6 } : { t: 3, v: 3, c: 4, r: -2 }), {
                next: 'RET',
                say: `Silvia, il metro non lo cambiamo. Segniamo queste due settimane come finestra di picco e teniamo i dati separati, uno accanto all’altro. E il picco lo raccontiamo noi, prima che lo faccia qualcun altro.`,
                react: (d) => [
                  d.flags.criteriaSet
                    ? { w: 'silvia', a: `dopo un attimo`, t: `Due finestre, stessi quattro indicatori. Longo ha sempre visto soltanto le medie: il picco non l’ha mai visto. Così il pilota vale di più.` }
                    : { w: 'silvia', a: `dubbiosa`, t: `Va bene, due finestre. Ma senza soglie scritte non so che cosa dire a Longo su che cosa conti come “bene”.` },
                  { think: d.flags.criteriaSet ? `Il picco non l’avevo messo in conto. Adesso è la parte del pilota che nessuno potrà dire addomesticata.` : `Ho un metro onesto. Mi manca ancora qualcuno che lo riconosca come tale.` },
                ],
              }),
            ch('b', 2, `Mando Davide in negozio per tutto il picco: presidia i palmari, raccoglie i dati e risolve i blocchi in diretta, così la misurazione non si ferma un solo giorno.`,
              `Davide in prima linea tiene il pilota in piedi e ti restituisce dati puliti. Ma sposti un tuo tecnico dal piano alla trincea: salvi la misurazione, non ancora la storia da raccontare a Longo.`,
              { t: 4, c: 2, r: -2 }, {
                next: 'RET',
                say: `Silvia, mando Davide in negozio per tutto il picco: tiene i palmari in funzione, raccoglie i dati e risolve i blocchi in diretta.`,
                react: [
                  { w: 'davide', a: `dal negozio, tra una fila e l’altra`, t: `Ho già tre palmari con la batteria a terra e un addetto che scansiona a mano per non fermare la cassa. Resto qui fino a sabato.` },
                  { think: `Il pilota regge. Ma Davide in trincea è Davide che non sta preparando il caso per Longo.` },
                ],
              }),
            ch('c', 1, `Chiedo al marketing, tramite Silvia, di escludere i negozi del pilota dalle promozioni anticipate, così la misurazione resta pulita e il picco non sporca i dati.`,
              `Proteggi i numeri ma isoli il pilota dalla realtà: un risultato ottenuto in negozi senza picco dice poco a chi dovrà usare il sistema proprio nei picchi. E chiedi a Silvia di spendere un favore enorme con il marketing.`,
              { t: -4, c: -4, r: 6 }, {
                next: 'RET',
                say: `Silvia, puoi chiedere al marketing di escludere i negozi del pilota dalle promozioni anticipate? Ci serve una misurazione pulita.`,
                react: (d) => [
                  { w: 'silvia', a: `esasperata`, t: `Mi stai chiedendo di togliere ${pilotStores(d)} negozi dalle promozioni? Con il marketing che ha già stampato i volantini? Dai.` },
                  { think: `Ho chiesto a Silvia di esporsi con il marketing per proteggere il mio campione. E il campione, così, non dimostra niente.` },
                ],
              }),
            ch('d', 0, `Scarto le due settimane di picco dai dati e le sostituisco con una proiezione costruita sui giorni normali: più pulita, più rappresentativa, e il picco non falsa il risultato.`,
              `Sostituire dati reali con una stima fa perdere un pilota in un colpo solo. Quando qualcuno confronterà i dati grezzi con la tua proiezione, il problema non sarà più il picco ma la tua credibilità.`,
              { t: -8, v: -4, r: 10 }, {
                integ: -3, next: 'RET',
                say: `Silvia, quelle due settimane le togliamo dal calcolo e le sostituiamo con una proiezione costruita sui giorni normali. È più pulita e più rappresentativa.`,
                react: [
                  { w: 'silvia', a: `lentamente`, t: `Una proiezione. Al posto dei dati veri.` },
                  { think: `Sto per mettere il mio nome sotto un numero che non è mai successo.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'post_virale', title: `Uno scaffale vuoto finisce sui social`, w: 2, after: ['n1', 'n2', 'n3'],
        node: {
          when: `Domenica · 21:15`, view: 'phone', bg: 'night',
          where: `Messaggi · domenica 21:15`,
          scene: (d) => [
            { n: `Domenica sera. Sul divano, il telefono si illumina: il nome di Silvia, un link e nessun testo.`, sfx: 'ping' },
            { n: `Nel video una ragazza con un sacchetto del flagship mostra l’app di Lumina: “Disponibile in negozio”. Poi inquadra lo scaffale vuoto. Didascalia: “Disponibile in negozio, dice l’app. Dove, esattamente?”. Quarantamila visualizzazioni in tre ore, e salgono.` },
            d.flags.quantified
              ? { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Il CEO me l’ha girato un’ora fa. Vuole sapere quanto ci costa tutto questo, entro le nove di domattina. Il file che abbiamo costruito ce l’ho, ma devo dargli qualcosa che regga.` }
              : { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Il CEO me l’ha girato un’ora fa. Vuole sapere da quanto succede e quanto ci costa, entro le nove di domattina. E io un numero non ce l’ho.` },
            d.flags.quantified
              ? { think: `Ho un numero che regge, e l’abbiamo costruito insieme. Stasera può diventare una risposta oppure un’arma. Dipende da come lo uso.` }
              : { think: `Il CEO ha chiesto a Silvia la cosa che nessuno aveva ancora chiesto: quanto costa. Di domenica sera, a lei sola, e senza un numero.` },
          ],
          prompt: `Il problema è diventato pubblico. Cosa fai, stasera?`,
          hint: `Un’occasione si coglie dando una mano. Chi sfrutta l’imbarazzo del cliente, il cliente lo perde.`,
          tip: `Quando il problema del cliente diventa visibile non devi dire “te l’avevo detto”: devi dargli il modo di rispondere. Un dato che regge, consegnato in fretta e senza logo, vale più di cento presentazioni e porta l’urgenza dove serve, sulla scrivania di chi decide.`,
          choices: [
            ch('a', 3, `Aiuto Silvia a preparare in un’ora una pagina per il CEO: che cosa è successo, quanto vale il problema per negozio, cosa fare in trenta giorni. Senza logo Nexora.`,
              (d) => (d.flags.quantified
                ? `Hai messo il numero di Silvia in una pagina che il CEO può leggere in due minuti. Non hai venduto niente: le hai dato il modo di rispondere, e l’urgenza è arrivata dove si decide.`
                : `Senza un numero già costruito la pagina è più fragile, ma resta la mossa giusta: la stima per negozio è provvisoria e dichiarata come tale, e l’urgenza arriva dove si decide.`),
              (d) => (d.flags.quantified ? { t: 4, v: 4, u: 7, c: 3, r: -2 } : { t: 3, v: 3, u: 7, c: 2 }), {
                set: { ceoPage: true }, mp: ['C'], next: 'RET',
                say: `Silvia, ti aiuto a preparare in un’ora una pagina per il CEO: che cosa è successo, quanto vale il problema per negozio e che cosa si può fare nei prossimi trenta giorni. Niente logo Nexora, niente prezzi: è la tua pagina.`,
                react: [
                  { w: 'silvia', a: `al telefono, dopo un secondo`, t: `Da sola non ce la facevo entro domattina. Con te sì. Che cosa ti serve da me?` },
                  { n: `Alle undici e mezza la pagina è chiusa: la foto del post, una stima per negozio, tre azioni in trenta giorni. Nessun logo, nessun prezzo.` },
                  { think: `Il mio nome non c’è da nessuna parte. È il motivo per cui il CEO la leggerà.` },
                ],
              }),
            ch('b', 2, `Le dico di non commentare il post stasera e di vederci domattina alle otto, con i suoi dati e quelli di Davide, prima che il CEO le chieda un’altra risposta.`,
              `Prudente e utile, ma più lento: il CEO vuole una risposta entro le nove e la tua proposta arriva alle otto. Dai a Silvia tempo e dati, non ancora una pagina da portare.`,
              { t: 3, v: 2, u: 6, c: 2 }, {
                next: 'RET',
                say: `Silvia, stasera non commentare il post. Vediamoci domattina alle otto con i tuoi dati e quelli di Davide, così alle nove hai qualcosa da dire al CEO.`,
                react: [
                  { w: 'silvia', a: `sospirando`, t: `Alle otto. Il CEO però vuole una risposta prima delle nove.` },
                  { think: `Vado a dormire con il suo problema in tasca. Domattina ho un’ora.` },
                ],
              }),
            ch('c', 0, `Faccio girare il video ai miei contatti in Lumina, il CFO compreso, con una riga: “Questo è il problema di cui parlavamo”, così capiscono che non è un caso isolato.`,
              `Usare l’imbarazzo del cliente come argomento di vendita è la strada più rapida per perderlo. Silvia stava difendendo la sua azienda in pubblico, e ha visto la tua mossa nel giro di un’ora.`,
              { t: -8, c: -4, r: 8 }, {
                next: 'RET',
                say: `Faccio girare il video a due o tre persone in Lumina, il CFO compreso, con una riga sola: “Questo è il problema di cui parlavamo”.`,
                react: [
                  { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Longo mi ha girato il tuo messaggio con il video. “Questo è il problema di cui parlavamo”. Stasera era il mio problema, non la tua prova.` },
                  { think: `Ho trasformato il suo imbarazzo in un argomento di vendita. E se n’è accorta prima di me.` },
                ],
              }),
            ch('d', 1, `Le scrivo che capisco, che ci sentiamo domani e che per stasera non c’è niente da fare: il weekend è sacro e la questione può aspettare lunedì mattina.`,
              `Rispetti il weekend ma lasci il momento a qualcun altro. Il problema, per una volta, ha un testimone pubblico e il CEO ha una domanda: se nessuno gli porta un dato, se ne farà dare uno da chi ce l’ha.`,
              { t: -2, u: -4 }, {
                next: 'RET',
                say: `Capisco, Silvia. Ci sentiamo domani con calma: per stasera non c’è niente da fare, e il weekend è sacro.`,
                react: [
                  { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ok. Buonanotte.` },
                  { n: `Domenica notte il video supera le centomila visualizzazioni. Lunedì mattina la pagina per il CEO la prepara qualcun altro.` },
                  { think: `Il weekend sarà sacro, ma il problema non lo sapeva.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'direttore_boicotta', title: `Il direttore del negozio pilota si mette di traverso`, w: 2, after: ['n2', 'n3'],
        if: (d) => !!(d.flags.criteriaSet || d.flags.freePilot),
        node: {
          when: `Martedì · 09:30`, view: 'walk', bg: 'factory',
          where: `Magazzino · negozio pilota · martedì 09:30`,
          scene: (d) => [
            { n: `Martedì mattina, magazzino del negozio pilota. Il palmare nuovo è sulla scaffalatura, ancora nella sua custodia, accanto a una tazza di caffè incrostata. Nessuno lo ha toccato da giovedì.` },
            { w: 'brivio', a: `braccia incrociate, sulla porta`, t: `Io ho trent’anni di negozio e un sistema che conosco. Voi mi chiedete di scansionare ogni scatola e di fermarmi due ore a settimana per l’inventario ciclico. Io vendo vestiti, non compilo righe.` },
            { n: `Alle sue spalle due addetti fingono di riordinare i resi. Hai il sospetto che stiano ascoltando tutto, e che ciò che Brivio dice a voce alta lo pensino in dodici.` },
            d.flags.criteriaSet
              ? { think: `L’adozione è uno dei quattro criteri firmati da Longo. Se questo negozio non scansiona, l’ottanta per cento non arriva, e Brivio lo sa meglio di me.` }
              : { think: `Senza un criterio scritto sull’adozione, potrebbe boicottare in silenzio e nessuno gli darebbe torto.` },
          ],
          prompt: `Il direttore di un negozio pilota non collabora. Come reagisci?`,
          hint: `Un boicottaggio è quasi sempre un costo che nessuno ha ascoltato. Chi lo paga, e quanto vale per lui?`,
          tip: `Quando chi dovrebbe usare il sistema lo rifiuta, non ti serve un mandato: ti serve capire quale fatica gli stai chiedendo e togliergliene più di quanta ne aggiungi. L’adozione si costruisce dal negozio, non dalla direzione.`,
          choices: [
            ch('a', 3, `Mi siedo con lui e gli chiedo che cosa gli fa perdere più tempo. Poi gli lascio scegliere i tre punti dell’inventario che il sistema deve togliergli dalle spalle.`,
              (d) => (d.flags.criteriaSet
                ? `Hai trasformato un avversario in coautore: Brivio sceglie i tre punti, e il criterio sull’adozione smette di essere un obbligo e diventa una cosa sua. Con quei criteri firmati, ogni punto ottenuto vale doppio.`
                : `Hai ascoltato prima di chiedere: Brivio sceglie i tre punti e gli addetti vedono che il sistema serve a loro. Senza una soglia scritta il risultato resta locale, ma è un negozio che adotta davvero.`),
              (d) => (d.flags.criteriaSet ? { t: 5, c: 6, r: -5 } : { t: 3, c: 3, r: -2 }), {
                next: 'RET',
                say: `Brivio, mi dica cosa le fa perdere più tempo oggi, in questo magazzino. Poi scelga lei i tre punti dell’inventario che il sistema deve togliervi dalle spalle: partiamo da quelli, il resto viene dopo.`,
                react: [
                  { w: 'brivio', a: `dopo una pausa, scostando una cassa`, t: `I resi. Ogni sera mezz’ora a contare cose che il sistema dovrebbe sapere. Se mi togliete quelli, il palmare lo uso.` },
                  { n: `Prende il palmare dalla custodia, lo accende, lo gira per leggere lo schermo. I due addetti smettono di fingere di riordinare.` },
                  { think: `Mezz’ora ogni sera sui resi. Un problema vero, e non era in nessun nostro piano.` },
                ],
              }),
            ch('b', 2, `Porto Davide in negozio per una mattina: affianca gli addetti ai palmari e toglie di mezzo i primi tre attriti tecnici: senza chiedere niente a Brivio, i problemi li risolviamo noi.`,
              `Davide risolve gli attriti tecnici e gli addetti ci prendono la mano. Ma il direttore, che era il nodo, resta spettatore: un sostegno efficace ma indiretto.`,
              { t: 3, c: 3, r: -2 }, {
                next: 'RET',
                say: `Brivio, le lascio Davide per una mattina. Sta con i suoi addetti ai palmari e toglie di mezzo i primi tre attriti tecnici.`,
                react: [
                  { w: 'davide', a: `chino sul palmare di un addetto`, t: `Il lettore non legge le etichette sotto il neon. È un problema di angolo, non di sistema. Sistemato.` },
                  { w: 'brivio', a: `senza sciogliere le braccia`, t: `Ho visto. Vedremo se dura.` },
                ],
              }),
            ch('c', 1, `Chiedo a Silvia di comunicare ai direttori dei negozi pilota che l’uso del palmare è obbligatorio: il mandato è della direzione e non si discute oltre.`,
              `Il mandato ottiene la scansione ma non l’adozione: Brivio scansiona il minimo per rispettare l’ordine e il resto dell’inventario torna a mano. Hai risolto il numero e aggravato il clima.`,
              { t: -4, c: 2, r: 6 }, {
                next: 'RET',
                say: `Silvia, scrivi tu ai direttori dei negozi pilota che l’uso del palmare è obbligatorio. Il mandato è della direzione.`,
                react: [
                  { w: 'silvia', a: `dopo tre giorni, girandoti la risposta`, t: `Brivio mi ha scritto: “Obbligatorio. Va bene. Scansiono il minimo che serve, il resto come sempre”.` },
                  { think: `Ho ottenuto una cifra, non un cambiamento. E ho messo Silvia in mezzo.` },
                ],
              }),
            ch('d', 0, `Gli dico che i dati del suo negozio sono tra i peggiori del gruppo e che Silvia lo sa: se non collabora, finirà nel rapporto che arriva a Longo.`,
              `Una minaccia davanti a due addetti fabbrica un nemico che sa dove sono i punti deboli del sistema. Brivio racconterà la scena ai suoi colleghi prima di sera.`,
              { t: -8, c: -4, r: 10 }, {
                next: 'RET',
                say: `Brivio, i dati del suo negozio sono tra i peggiori del gruppo e Silvia lo sa. Se non collabora, finirà nel rapporto che arriva a Longo.`,
                react: [
                  { w: 'brivio', a: `a bassa voce, ma si sente`, t: `Nel rapporto. Bene. Lo scriva pure, ci metta anche i resi di ieri sera.` },
                  { think: `Ho minacciato un direttore davanti ai suoi dipendenti. Entro sera lo sanno tutti i negozi.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'evento_vertex', title: `Vertex invita Rossi a Lisbona`, w: 1, after: ['n3', 'n4'],
        node: {
          when: `Giovedì · 18:10`, view: 'walk', bg: 'office',
          where: `Corridoio · sede Lumina · giovedì 18:10`,
          scene: (d) => {
            const cold = picked(d, 'n3', 'a');
            return [
              { n: `Giovedì sera, sede di Lumina. Stai uscendo dal piano IT quando Rossi ti ferma in corridoio, la giacca già sul braccio e un cartoncino in mano.` },
              cold
                ? { w: 'rossi', a: `senza sorridere, mostrando il cartoncino`, t: `Vertex mi ha invitato al loro evento clienti, a Lisbona, tre giorni a metà mese. Dato che lei ha avuto premura di informarmi sui loro ritardi, ho pensato che dovesse sapere dove andrò a chiedere conto.` }
                : { w: 'rossi', a: `mostrando il cartoncino`, t: `Vertex mi ha invitato al loro evento clienti, a Lisbona, tre giorni a metà mese. Cena con il loro CTO e tavola rotonda sulla roadmap. Ho pensato che dovesse saperlo da me.` },
              { n: `Il cartoncino è di carta pesante, goffrata, con la V di Vertex in rame. Sul retro, a mano: “Alberto, ti aspettiamo. F.”.` },
              d.flags.coexist
                ? { think: `Me lo dice di sua iniziativa. Con la coesistenza sul tavolo, è il suo modo di dirmi che sono ancora in partita.` }
                : cold
                  ? { think: `Me lo dice per farmi sapere che ho un conto aperto, o per vedere come lo prendo. Tre giorni di cene possono pesare più di sei mesi di riunioni.` }
                  : { think: `Me lo dice per correttezza o per farmi capire quanto è radicata Vertex? Tre giorni di cene possono pesare più di sei mesi di riunioni.` },
            ];
          },
          prompt: `Il tuo avversario ha invitato il tuo interlocutore a una cena. Come rispondi?`,
          hint: `Rossi te l’ha detto prima di partire: è un segnale. Che cosa gli dai in cambio della sua franchezza?`,
          tip: `Quando il concorrente gioca in casa sua, non competi sull’ospitalità: competi sulla chiarezza. Chi ti ha avvisato non va messo alla prova, va ringraziato, e al ritorno gli si offre un metro oggettivo per leggere ciò che ha sentito.`,
          choices: [
            ch('a', 3, `Gli auguro buon viaggio e gli propongo, al ritorno, un’ora per confrontare le promesse di Vertex con ciò che Nexora metterebbe per iscritto sui criteri di Lumina.`,
              (d) => (d.flags.criteriaSet
                ? `Hai lasciato a Rossi Lisbona e preso il ritorno: con i criteri firmati hai un metro scritto su cui misurare ogni promessa, e l’ora di confronto diventa un test sui fatti.`
                : `Hai rinunciato a rincorrere la cena e hai chiesto un confronto sui fatti. Senza criteri firmati il metro è meno solido, ma il segnale è chiaro: non temi la comparazione.`),
              (d) => (d.flags.criteriaSet ? { t: 6, c: 6, r: -4 } : { t: 4, c: 3, r: -2 }), {
                set: { rossiOpen: true }, next: 'RET',
                say: `Faccia buon viaggio, dottor Rossi, e grazie per avermelo detto. Al ritorno le chiedo un’ora: mettiamo uno accanto all’altro ciò che Vertex le ha promesso a Lisbona e ciò che noi siamo disposti a scrivere, sui criteri di Lumina.`,
                react: [
                  { w: 'rossi', a: `dopo un attimo`, t: `Di cortesie ne ho sentite tante, ma è la prima che mi chiede di riportare a casa i fatti e non i regali. Va bene.` },
                  { think: `Se al ritorno si siede con un foglio di appunti, avrò un alleato in più. Se arriva a mani vuote, saprò anche questo.` },
                ],
              }),
            ch('b', 2, `Lo ringrazio per avermelo detto e gli propongo una cena a Milano con Davide, solo tecnica, per rispondere a tutte le sue domande sull’integrazione prima che parta.`,
              `Un gesto di cortesia e una risposta concreta: non competi con Lisbona ma ti presenti con ciò che Rossi teme, un architetto che risponde. Resta una cena, non un metro di confronto.`,
              { t: 4, c: 2 }, {
                set: { rossiOpen: true }, next: 'RET',
                say: `La ringrazio per avermelo detto, dottor Rossi. Le propongo una cena a Milano con Davide, il nostro Solution Engineer: solo tecnica, tutte le domande che vuole sull’integrazione.`,
                react: [
                  { w: 'rossi', a: `sorridendo`, t: `Una cena di lavoro a Milano contro tre giorni a Lisbona. Non è una gara che vincete, ma è una cena che accetto.` },
                  { think: `Non è una gara che si vince, la cena contro Lisbona. Si fa solo in modo che, al ritorno, lui abbia qualcosa di mio sul tavolo.` },
                ],
              }),
            ch('c', 1, `Gli chiedo di rinunciare: partecipare a un evento del concorrente in piena valutazione non mi sembra corretto verso il progetto, né verso il lavoro fatto finora.`,
              `Rossi ti ha dato un’informazione e tu l’hai trattata come un impegno da negoziare. Una richiesta che ha il suono di una condizione irrigidisce un interlocutore già prudente, e lo spinge a tacerti le cose la volta dopo.`,
              { t: -6, c: -2, r: 6 }, {
                next: 'RET',
                say: `Dottor Rossi, le chiedo di non andare: partecipare a un evento del concorrente proprio ora, in piena valutazione, non mi sembra corretto verso il progetto.`,
                react: [
                  { w: 'rossi', a: `gelido, con garbo`, t: `Mi sta chiedendo di dichiarare la mia agenda. Non credo sia nei suoi poteri.` },
                  { think: `Ha fatto un passo verso di me e io gli ho chiesto di tornare indietro.` },
                ],
              }),
            ch('d', 0, `Mi faccio girare l’invito da un contatto di un altro cliente di Vertex e vado anch’io a Lisbona, per sentire di persona che cosa promettono ai loro clienti.`,
              `Entrare nell’evento di un concorrente sotto altra veste è una scorciatoia che non regge: ciò che ricavi vale meno della fiducia che bruci, e Rossi lo scopre in dieci minuti.`,
              { t: -4, v: 2, r: 6 }, {
                integ: -4, next: 'RET',
                say: `Chiedo a un contatto di un altro cliente di Vertex di girarmi l’invito. A Lisbona ci vado anch’io, come suo ospite, e ascolto che cosa promettono.`,
                react: [
                  { n: `A Lisbona, la sera della cena, Rossi ti vede entrare in sala dall’altro lato dei tavoli. Non ti saluta.` },
                  { think: `Ho scoperto la roadmap di Vertex. Ho perso la fiducia di Rossi nello stesso istante.` },
                ],
              }),
          ],
        },
      },
      {
        id: 'cfo_dato', title: `Il CFO chiede un numero che non hai`, w: 2, after: ['n4', 'n5'],
        if: (d) => !!(d.flags.ebEngaged || d.mp.has('E')),
        node: {
          when: `Martedì · 18:20`, view: 'phone', bg: 'night',
          where: `Telefono · martedì 18:20`,
          scene: (d) => [
            { n: `Martedì sera, le sei e venti. Sul telefono compare un numero fisso, interno Lumina. Rispondi alla seconda suoneria.`, sfx: 'phone' },
            { w: 'longo', a: `senza saluti`, t: `Sono Longo. Nei vostri documenti manca un numero. Quanto paga Lumina ogni anno in ribassi sulla merce che il sistema non vede: quella che resta ferma in un negozio mentre in un altro la chiedono?` },
            { n: `Dall’altra parte nessun rumore: un ufficio svuotato, un foglio che si gira. Aspetta.` },
            d.mp.has('M')
              ? { think: `I miei numeri partono dalle vendite perse. L’altra metà della storia, i ribassi, non l’ho mai calcolata: nessuno me l’ha chiesta. Fino a oggi.` }
              : { think: `Non ho il suo numero e non ho nemmeno un metodo per stimarlo. Lui aspetta, e un CFO che aspetta sta già giudicando.` },
          ],
          prompt: `Longo ti chiede un dato che non hai. Che risposta gli dai?`,
          hint: `Una cifra inventata al telefono diventa il tuo prossimo problema. Chi ammette un limite e dà una data, resta credibile.`,
          tip: `Davanti a un decisore che chiede un dato che non hai, ammettilo e fissa una data per portarlo, con il metodo. “Non lo so, ma lo costruiamo insieme entro giovedì” vale più di una stima a occhio: con un CFO il credito si guadagna con la precisione.`,
          choices: [
            ch('a', 3, `Gli dico che quel numero non ce l’ho e non voglio stimarlo a occhio: lo costruiamo con il suo controllo di gestione, sui loro dati, entro giovedì.`,
              (d) => (d.mp.has('M')
                ? `Hai ammesso il limite e offerto un metodo: Longo vede un fornitore che non bluffa e che lavora con i suoi numeri. Sulla base delle vendite perse già costruite, il nuovo dato si aggancia al calcolo, non lo sostituisce.`
                : `Hai ammesso il limite e offerto un metodo. Non hai ancora una base di Metrics su cui appoggiarlo, ma Longo vede un fornitore che non bluffa e che lavora con i suoi numeri.`),
              (d) => (d.mp.has('M') ? { t: 6, v: 6, c: 6 } : { t: 4, v: 3, c: 3 }), {
                next: 'RET',
                say: `Dottor Longo, quel numero non ce l’ho, e non voglio darle una stima a occhio. Se il suo controllo di gestione mi passa i ribassi degli ultimi due anni per categoria, lo costruiamo insieme e glielo porto giovedì, con il metodo scritto.`,
                react: [
                  { w: 'longo', a: `dopo una pausa`, t: `Giovedì. I ribassi ve li faccio avere domattina, per categoria. Ma voglio vedere il metodo prima del numero.` },
                  { think: `Non ho la risposta: ho una data e un metodo. Giovedì devo arrivare con tutti e due.` },
                ],
              }),
            ch('b', 2, `Mi prendo la notte: lo richiamo domattina con una stima costruita sui dati di settore, dichiarando chiaramente che è una stima e non il suo numero.`,
              `Prendi tempo senza inventare e dichiari la natura della cifra: onesto. Ma il dato che porterai sarà di altri, non suo, e gli prometti qualcosa che dovrai correggere appena arrivano i suoi.`,
              { t: 2, v: 2, c: 2 }, {
                next: 'RET',
                say: `Mi prendo la notte, dottor Longo. Domani mattina la richiamo con una stima costruita sui dati di settore, e le dico chiaramente che è una stima, non il suo numero.`,
                react: [
                  { w: 'longo', a: `asciutto`, t: `Va bene. Ma una stima di settore non è il mio numero. La voglio con i miei dati, appena li avete.` },
                  { think: `Non ho bluffato, ma ho promesso un numero che non è suo. Dovrò correggermi.` },
                ],
              }),
            ch('c', 0, `Gli do una cifra con sicurezza: un milione e mezzo l’anno di ribassi evitabili. L’avrei comunque inserita nel business case, e così non perdo tempo.`,
              `Una cifra improvvisata, detta con sicurezza, diventa un impegno scritto nel blocco di un CFO. Quando il suo controllo di gestione la confronterà con i dati veri, a essere messa in discussione non sarà la stima ma la tua parola.`,
              { t: -6, v: -2, r: 8 }, {
                integ: -3, next: 'RET',
                say: `Dottor Longo, siamo intorno al milione e mezzo l’anno. È una stima prudente, e l’avrei comunque messa nel business case.`,
                react: [
                  { w: 'longo', a: `subito`, t: `Mi dica da dove viene quel milione e mezzo. Perché il mio ufficio controllo non l’ha mai calcolato.` },
                  { think: `Non viene da nessuna parte. E adesso è scritto sul suo blocco.` },
                ],
              }),
            ch('d', 1, `Gli dico che i ribassi non sono determinanti per la decisione e riporto la conversazione sulle vendite perse, dove i numeri li ho e li ha già visti.`,
              `Hai evitato una domanda che ti metteva a disagio e hai spostato la conversazione dove sei forte. Ma a un CFO non si dice quali numeri contano: la domanda sui ribassi è esattamente ciò che lo preoccupa.`,
              { t: -4, c: -2, r: 4 }, {
                next: 'RET',
                say: `Dottor Longo, i ribassi non sono determinanti per la decisione. Il costo vero sono le vendite perse, e su quelle i numeri ce li abbiamo.`,
                react: [
                  { w: 'longo', a: `freddo`, t: `Decido io che cosa è determinante. Mi servono entrambi.` },
                  { think: `Ho trattato la sua domanda come un fastidio. Per un CFO è l’unica cosa che conta.` },
                ],
              }),
          ],
        },
      },
    ],

    /* ───── shock del giorno di chiusura ───── */
    shocks: [
      {
        id: 'vertex_ultimo', title: `Vertex rilancia il giorno della firma`, kind: 'neg', w: 2,
        hit: (d) => !((d.flags.criteriaSet && !d.flags.manipulated && d.mp.has('E')) || (d.mp.has('M') && d.mp.has('E') && d.m.value >= 65)),
        dp: -0.32, dpProt: -0.03,
        hitText: `Alle 08:40 Rossi gira a Longo una lettera di Vertex: contratto triennale a prezzo dimezzato, implementazione gratuita e un direttore di progetto dedicato “da subito, a Milano”. Longo non ha davanti un metro di cui si fidi, né un numero suo da opporre, e la discussione torna in un minuto su ciò che si legge nella prima riga del foglio: il prezzo. Chiede “una settimana per confrontare”, e a fine trimestre una settimana è tutto.`,
        protText: `Alle 08:40 Rossi gira a Longo una lettera di Vertex: contratto triennale a prezzo dimezzato e un direttore di progetto dedicato. Longo la legge con davanti ciò che avete costruito insieme, poi te la inoltra con una riga sola: “Questo non risponde a niente di quello che ci siamo detti”. Perdi la mattinata, non il trimestre.`,
      },
      {
        id: 'rossi_stallo', title: `Rossi manda tutto in stallo`, kind: 'neg', w: 2,
        hit: (d) => !d.flags.coexist && !d.flags.rossiOpen && !(d.mp.has('Dc') && d.m.control >= 60),
        dp: -0.30, dpProt: -0.03,
        hitText: `Il giorno della firma Rossi dichiara il fermo IT per la stagione: nessuna nuova integrazione fino a gennaio, “per proteggere i negozi”. Con lui non hai costruito nessun percorso che gli lasci il comando dell’architettura, quindi la sua obiezione non trova una risposta pronta. Longo non firma contro il parere del suo CIO: rimanda a gennaio.`,
        protText: `Il giorno della firma Rossi dichiara il fermo IT per la stagione: nessuna nuova integrazione fino a gennaio, “per proteggere i negozi”. Non ti coglie impreparato: l’obiezione di Rossi la conoscevi da settimane e la risposta c’era già. Longo non rinvia per una dichiarazione: convoca Rossi e gli chiede quali negozi toccherebbe davvero, e quando. Perdi un giorno, non il trimestre.`,
      },
      {
        id: 'vertex_incidente', title: `Un incidente di Vertex in cassa`, kind: 'pos', w: 1,
        hit: (d) => !!(d.mp.has('E') && (d.mp.has('M') || d.flags.ceoPage) && !d.flags.manipulated && d.m.trust >= 50),
        dp: 0.10, dpProt: 0,
        hitText: `Alle 11:15, in piena mattinata di vendite, il sistema di Vertex si blocca: casse ferme in trentuno negozi per quaranta minuti. Longo ti chiama dall’auto, senza saluti: “Sa quanto costano quaranta minuti come questi? Lei sì”. Il numero ce l’hai tu, e la tua proposta è già sulla sua scrivania.`,
        protText: `Alle 11:15 il sistema di Vertex si blocca: casse ferme in trentuno negozi per quaranta minuti. Per Lumina è una mattina storta; per te sarebbe stata l’occasione giusta, ma non hai costruito abbastanza di ciò che serviva: una strada diretta verso Longo, un numero che sia già suo, la sua fiducia. La notizia gli arriva dal suo CIO, con le parole di Vertex.`,
      },
    ],

    /* ───── forecast con Marta ───── */
    fc: {
      crm: `Best Case al 45%: “Silvia dice che Longo firma, Rossi si adegua”`,
      people: {
        E: `Andrea Longo (CFO)`,
        C: `Silvia Conti (COO)`,
        Dp: `Andrea Longo, con Silvia Conti e Alberto Rossi`,
        P: `Andrea Longo e il legale di Lumina`,
        M: `Silvia Conti e Andrea Longo`,
        I: `Silvia Conti (COO)`,
        Dc: `Alberto Rossi (CIO) e Silvia Conti`,
        Co: `Vertex Systems, in casa da nove anni`,
      },
      risk: `Il rischio vero è che Rossi, con la proroga di Vertex in mano, convinca Longo a “valutare con calma” fino a stagione inoltrata, e che a quel punto il caso regga solo sulla parola di Silvia.`,
      custom: [
        {
          id: 'criteri_firmati', if: (d) => !!(d.flags.criteriaSet || d.flags.freePilot), has: (d) => !!d.flags.criteriaSet,
          q: `Il metro con cui si giudica il pilota: l’ha firmato Longo, o è un’intesa con Silvia e basta?`,
          evidence: `L’ha firmato lui: quattro criteri con le soglie, accuratezza, rotture, tempi di inventario e adozione, e la sua firma in calce. La scansione è nel CRM.`,
          honest: `Firmato no. Le soglie, dove ci sono, sono un’intesa con Silvia: Longo non ha messo la sua firma su niente. Finché non c’è, per me è un Best Case.`,
          bluff: `Sì, firmato da lui: quattro criteri con le soglie e la sua firma in calce. L’originale ce l’ha Silvia, domani ti mando la scansione.`,
          vague: `Longo è informato di tutto e i criteri sono quelli che chiedeva Silvia. Non ci sono stati dissensi e il clima è buono.`,
          react: {
            evidence: `Soglie scritte e firma di chi paga: è quello che trasforma un pilota in un contratto. Girami la scansione e la aggancio al CRM.`,
            honest: `Grazie per la chiarezza. Allora il compito di questa settimana è farli firmare a Longo: senza quella riga un pilota è un favore. Ti tengo in Best Case fino ad allora.`,
            bluffCaught: `Nel CRM non c’è nessuna scansione e nessuna nota di Longo. Non mi serve che il deal sia perfetto: mi serve che sia vero.`,
            bluffPassed: `Ok, lo scrivo. Ma voglio la scansione entro venerdì. Se non arriva, lo sposto io.`,
            vague: `“Informato” non è “firmato”. Ti rifaccio la domanda giovedì: portami un documento.`,
          },
        },
        {
          id: 'rossi_bordo', if: () => true, has: (d) => !!d.flags.coexist && d.m.trust >= 60,
          q: `Rossi: alleato, neutrale o lealista di Vertex con buone maniere? Mi serve una frase sua, non la tua lettura.`,
          evidence: `Alleato è troppo, ma ha messo il suo team a guidare l’architettura: tre nomi suoi nel gruppo di lavoro. Ti giro la mail con cui li ha indicati.`,
          honest: `Per ora non ho una riga sua che dica che è con noi. È cortese, ascolta, ma di scritto non c’è niente: per ora lo considero ancora un lealista di Vertex con buone maniere.`,
          bluff: `È con noi: sull’integrazione ragiona come uno sponsor interno e ci ha già dato l’ok tecnico. Una mail formale non c’è, ma ne abbiamo parlato più volte.`,
          vague: `Rossi è un professionista, e se il progetto è giusto non si metterà di traverso. Con lui il clima è buono, lo sento spesso.`,
          react: {
            evidence: `Con nomi e un team assegnato, è un sì vero. Lo segno così e lo ripetiamo davanti a Longo.`,
            honest: `Giusta etichetta: neutrale a voce non è un sì. Ti tengo in Best Case e ti aiuto a portarlo al passo dopo.`,
            bluffCaught: `L’ultima nota su Rossi, nel tuo CRM, è “cordiale”. Non vedo nessun “ok tecnico”. Ripartiamo dai fatti.`,
            bluffPassed: `Va bene, lo scrivo. Ma voglio una mail di Rossi con quelle parole, e la voglio prima del giorno della firma.`,
            vague: `“Non si metterà di traverso” è la frase di chi non ha mai visto un CIO bloccare un contratto a una settimana dalla firma. Dammi un fatto.`,
          },
        },
        {
          id: 'ondate_contratto', if: (d) => !!d.flags.giveGet, has: (d) => d.mp.has('Dp') && d.mp.has('P'),
          q: `L’offerta con date e pagamenti è già in una bozza di contratto, o è solo la tua proposta e un’intesa a voce?`,
          evidence: `La bozza c’è: quaranta negozi prima del Black Friday, gli altri a gennaio, pagamenti legati alle ondate. Il legale di Lumina l’ha ricevuta lunedì.`,
          honest: `È la mia proposta, e Longo l’ha letta. Una bozza di contratto con date e pagamenti non c’è ancora: la porto al legale di Lumina questa settimana. Intanto non la spingo oltre il Best Case.`,
          bluff: `La bozza c’è: date e pagamenti sono scritti e il legale di Lumina ce l’ha da lunedì. Manca solo la sua revisione.`,
          vague: `L’offerta è condivisa, Longo ne ha parlato con Silvia e mi pare convinto. Sui tempi del contratto non vedo problemi.`,
          react: {
            evidence: `Date, ondate, pagamenti e il legale che ha già la bozza. È così che si ferma un rinvio prima che nasca.`,
            honest: `Bene che tu lo dica. Una proposta letta non è un contratto: porta la clausola al legale di Lumina e aggiorna il CRM con la data.`,
            bluffCaught: `Ho guardato la cartella condivisa: di una bozza con date e pagamenti non c’è traccia. Parliamone con calma, ma lo sposto di una categoria finché non esiste.`,
            bluffPassed: `Ok. Mandami la bozza con date e pagamenti entro domani. Se non c’è, ci riaggiorniamo.`,
            vague: `“Longo ne ha parlato” non è una clausola. Se non c’è un paragrafo, l’offerta non esiste.`,
          },
        },
      ],
    },

    endings: {
      won: `Longo firma il lunedì. I primi negozi passano sul nuovo sistema prima del Black Friday, gli altri nei mesi dopo. Il primo sabato di dicembre, al flagship, Ilaria cerca il 42 in blu notte: il sistema dice due, sullo scaffale ce ne sono due. Rossi, in riunione, parlando dell’integrazione con Vertex: “È andata meglio di quanto temessi”. Detto da lui, è un applauso.`,
      lost: `Longo accetta la proroga di Vertex. Il nuovo sistema resta un “forse, fra un anno”. Il sabato dopo, al flagship, la fila ai camerini è la stessa e il 42 in blu notte, a sistema, c’è ancora. Silvia ti manda un messaggio: “Mi dispiace. Ci riproviamo”.`,
      slip: `Longo ti scrive due righe: vuole rivedere i dati dopo il Black Friday, a scaffali svuotati e ricaricati. Il deal è vivo, ma slitta al trimestre successivo.`,
    },
    lessons: [
      { if: (d) => d.flags.criteriaSet, good: true, t: `Hai fatto firmare i criteri a Longo prima che il pilota partisse: da favore a patto. È la differenza tra un pilota che si converte e uno che si archivia.` },
      { if: (d) => d.flags.freePilot, good: false, t: `Il pilota gratuito senza criteri è la trappola più diffusa del displacement: consuma risorse, ti costa tre mesi di lavoro e produce soltanto un “valutiamo con calma”.` },
      { if: (d) => d.flags.coexist, good: true, t: `Hai ridotto il rischio del CIO invece di combatterlo: contro un incumbent la coesistenza è la via più rapida, perché non chiede a nessuno di spegnere il proprio sistema.` },
      { if: (d) => d.flags.honest, good: true, t: `Hai mostrato il gap invece di nasconderlo. Un risultato misto raccontato bene vale più di uno perfetto ritoccato: il rosso sulla slide ha reso credibili gli altri tre numeri.` },
      { if: (d) => d.flags.manipulated, good: false, t: `Ritoccare un criterio concordato distrugge ciò che hai costruito. Con i dati del cliente non si scherza mai: la fiducia che si perde in una riga non torna in sei mesi.` },
      { if: (d) => d.flags.quantified, good: true, t: `Hai dato un numero al problema. Quel numero, di Silvia e non tuo, è diventato la tua leva con il CFO.` },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
