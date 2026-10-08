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
  const P = (k, stance, note) => ({ who: k, name: CAST[k].name, role: CAST[k].role, hue: CAST[k].hue, stance, note });
  /* storia delle mosse: gli imprevisti sono registrati come “wild:<id>” */
  const picked = (d, node, id) => d.hist.some((h) => h.node === node && h.id === id);
  const steps = (d) => d.hist.filter((h) => !h.wild).length;
  /* un imprevisto è in corso quando il nodo successivo non è ancora stato mostrato: la scena che segue non va anticipata dai widget */
  const stage = (d) => steps(d) - (d.wild ? 1 : 0);
  const cl = (n, a, b) => Math.max(a, Math.min(b, Math.round(n)));
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
        { n: `Silvia te l’aveva detto: “Se vuoi capire il mio problema, vieni di sabato. E non annunciarti”.` },
        { w: 'ilaria', a: `con il tablet in mano, a una cliente`, t: `Il 42 in blu notte? Il sistema dice che ne abbiamo tre. Mi dia un minuto, vado a controllare in magazzino.` },
        { n: `Sparisce dietro una porta con la scritta “Solo personale”. Dalla fessura esce odore di cartone e di plastica da imballo. La cliente guarda l’orologio, poi guarda te.` },
        { w: 'ilaria', a: `tornando a mani vuote, a voce bassa`, t: `Mi dispiace, non c’è. Succede ogni sabato: a sistema ci sono, sugli scaffali no.` },
        { think: `Tre capi a sistema, nessuno sullo scaffale. La cliente se ne va con le mani vuote e nessuno scriverà “vendita persa” da nessuna parte. Moltiplicato per centoquaranta negozi, quanto fa?` },
        { n: `Lunedì mattina, otto e cinquanta. Sulla scrivania il telefono vibra contro il legno: Silvia Conti.`, sfx: 'phone' },
      ],
    },

    /* ───── widget firma: la coalizione, il pilota, la proposta ───── */
    hud: [
      {
        type: 'stakeholders', title: `La coalizione`,
        build: (d) => {
          const f = d.flags, st = stage(d);
          const ev = d.hist.find((h) => h.node === 'wild:evento_vertex');

          /* Silvia: l’alleata, che ha il dolore ma non il budget */
          let silvia;
          if (f.manipulated) silvia = P('silvia', 'skeptic', `Ha visto ridefinire un criterio dopo averlo concordato. Ricontrolla ogni numero che le dai.`);
          else if (picked(d, 'n2', 'd')) silvia = P('silvia', 'neutral', `Le hai chiuso l’unica porta che aveva aperto: da sola con Rossi, non si espone più.`);
          else if (picked(d, 'n4', 'a')) silvia = P('silvia', 'neutral', `Ti ha lasciato mettere le rotture in allegato, ma teme che Longo se ne accorga.`);
          else if (f.honest) silvia = P('silvia', 'ally', `Ha visto il gap e tu non l’hai nascosto. Difende i dati insieme a te.`);
          else if (f.criteriaSet) silvia = P('silvia', 'ally', `Ha portato lei il patto a Longo: il pilota ha una firma, e dietro c’è la sua faccia.`);
          else if (f.quantified) silvia = P('silvia', 'ally', `Ha il dolore e adesso anche il numero: 2,3 milioni di vendite perse.`);
          else if (f.freePilot) silvia = P('silvia', 'ally', `Ha avuto il suo pilota gratuito. Senza soglie scritte, a rischiare è lei.`);
          else if (f.proofOfValue) silvia = P('silvia', 'ally', `La prova sui dati storici l’ha convinta. Rossi, che non ha visto niente girare, no.`);
          else silvia = P('silvia', 'ally', `Ha il dolore, non il budget. Per ora si fida di te.`);

          /* Rossi: lealista di Vertex, può diventare neutrale (e, in fondo al percorso, alleato) */
          let rossi;
          if (picked(d, 'n3', 'a')) rossi = P('rossi', 'hostile', `Ha letto le tue informazioni su Vertex come un attacco personale.`);
          else if (picked(d, 'n1', 'a') && !f.coexist) rossi = P('rossi', 'hostile', `Silvia gli ha riferito che parli male di Vertex: ti ha già classificato.`);
          else if (ev && ev.id === 'c' && !f.coexist) rossi = P('rossi', 'skeptic', `Gli hai chiesto di rinunciare a Lisbona: ha sentito una pressione, non un alleato.`);
          else if (f.coexist && f.criteriaSet && f.honest && st >= 5) rossi = P('rossi', 'ally', `Il suo team guida l’architettura. Davanti a Longo difende il piano come suo.`);
          else if (f.coexist) rossi = P('rossi', 'neutral', ev && (ev.id === 'a' || ev.id === 'b') ? `“Idea che posso difendere.” E ti ha detto di Lisbona prima che lo sapessi da altri.` : `“Questa è un’idea che posso difendere.” Non deve spegnere Vertex: aggiunge ciò che manca.`);
          else if (picked(d, 'n3', 'c')) rossi = P('rossi', 'neutral', `Si è sentito trattato da pari. La paura dei cantieri in stagione, però, resta intatta.`);
          else if (picked(d, 'n3', 'd')) rossi = P('rossi', 'skeptic', `Ha sorriso e ha chiesto le prove che non hai portato.`);
          else if (picked(d, 'n1', 'd') && st < 2) rossi = P('rossi', 'skeptic', `Ti ha dato un quarto d’ora: “abbiamo già una roadmap con Vertex”.`);
          else if (st >= 2) rossi = P('rossi', 'skeptic', `Ha in mano la proroga di Vertex, meno 40%, e ti chiede perché cambiare in piena stagione.`);
          else rossi = P('rossi', 'skeptic', `Nove anni di Vertex, il golf con il loro account: nessun motivo per ascoltarti.`);

          /* Longo: sconosciuto finché non entra nel pilota o nei numeri */
          let longo;
          if (!f.ebEngaged) longo = P('longo', 'unknown', f.quantified ? `Non ti conosce. Il numero di Silvia c’è, ma non è ancora arrivato sulla sua scrivania.` : `Non ti conosce. Nessuno gli ha mai messo davanti quanto costa lo stock a sistema.`);
          else if (f.manipulated) longo = P('longo', 'hostile', `Un criterio concordato è stato ridefinito dopo. Per lui è finita la conversazione.`);
          else if (picked(d, 'n4', 'a')) longo = P('longo', 'skeptic', `Ha trovato l’allegato in due minuti: “Perché mi nascondete il quarto?”.`);
          else if (picked(d, 'n5', 'b')) longo = P('longo', 'ally', `“Se i 770 reggono, la questione non è più il prezzo.” Vuole rivedere i dati con Silvia.`);
          else if (picked(d, 'n5', 'a')) longo = P('longo', 'skeptic', `Per lui i €540.000 erano una cifra di partenza. Adesso tratta sul prezzo.`);
          else if (picked(d, 'n5', 'c')) longo = P('longo', 'neutral', `Il caso gli è piaciuto, ma vuole i suoi numeri, non quelli di un altro.`);
          else if (picked(d, 'n5', 'd')) longo = P('longo', 'neutral', `Non compra un prezzo bloccato: vuole capire che cosa compra.`);
          else if (f.criteriaSet && f.honest) longo = P('longo', 'ally', `Ha firmato i criteri e ha visto il quarto in rosso. “Mi piace che non me lo abbiate nascosto.”`);
          else if (f.criteriaSet) longo = P('longo', 'neutral', `Ha firmato i quattro criteri. Ti conosce da un foglio, non ancora da una conversazione.`);
          else longo = P('longo', 'neutral', `Ti ha dato il tempo di una conversazione, niente di più. Per lui sei ancora un fornitore tra due.`);

          return [silvia, rossi, longo];
        },
      },
      {
        type: 'kpis', title: `Il pilota sul campo`,
        build: (d) => {
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
        build: (d) => {
          const f = d.flags, st = stage(d), kind = pilot(d);
          /* come lo legge il comitato di Lumina: in ogni riga, più alto è meglio per chi compra */
          const proof = st < 2 ? 1 : kind === 'signed' ? (f.honest ? 9 : 8) : kind === 'free' ? 5 : kind === 'sim' ? 4 : st >= 3 ? 2 : 1;
          return {
            labels: [`Nexora`, `Vertex`],
            rows: [
              { k: 'price', label: `Convenienza del prezzo`, max: 10, us: cl(3.5 + Math.min(d.disc, 40) / 8, 1, 10), them: 8 + (st >= 2 ? 1 : 0) + (st >= 5 ? 1 : 0) },
              { k: 'risk', label: `Sicurezza della migrazione`, max: 10, us: cl(10 - d.m.risk / 9, 1, 9), them: 9 },
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
          { w: 'silvia', a: `camminando in fretta`, t: `Quaranta minuti a sentire direttori che dicono “a sistema c’è, a scaffale no”. Il sistema dice che lo stock c’è, i negozi dicono che non c’è, e io in mezzo a fare l’arbitro.` },
          { w: 'silvia', a: `esasperata`, t: `Ogni settimana mi dicono che Vertex “sta per rilasciare” l’aggiornamento giusto. Intanto perdiamo vendite. L’IT dice che va tutto bene.` },
          { think: `Sabato l’ho visto con i miei occhi: tre capi a sistema, zero sullo scaffale. Ma “perdiamo vendite” non è un numero, e con una frase così Longo non muove un euro.` },
          { n: `Sul secondo schermo la riga di Lumina nel CRM: €540k, Best Case, 45%. Quarantacinque su che cosa, esattamente?` },
          { think: `Se attacco Vertex, difendo il budget di Rossi. Se non dico niente, resto un fornitore da presentazione. Serve un numero, e serve che sia suo.` },
        ],
        prompt: `Come imposti l’approccio?`,
        hint: `Un incumbent radicato si batte con un problema che costa, non con una denigrazione. Chi lo paga, e quanto?`,
        tip: `Contro un incumbent non attacchi il fornitore: quantifichi il costo del problema (Metrics) e scopri chi lo sente sulla pelle. Poi costruisci una coalizione attorno a quel costo, includendo l’IT e non contro di lui.`,
        choices: [
          ch('a', 0, `Le dico che Vertex è tecnologia vecchia e che altri retailer l’hanno già abbandonata: non vale la pena aspettare il prossimo rilascio, che tanto non arriverà.`,
            `Hai attaccato il fornitore di chi dovresti convincere. Silvia lo ha riferito a Rossi, che ha letto la mossa come un attacco personale: da qui in avanti ogni tua parola passerà da un filtro.`,
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
              say: `Silvia, partiamo da un numero. Mandami le rotture di stock degli ultimi dodici mesi: vendite perse, categorie, negozi. Ne facciamo insieme una stima di quanto vi costa il problema, e lo costruiamo con i tuoi dati, così nessuno potrà dire che è mio.`,
              react: [
                { n: `Il file arriva in venti minuti: sedici fogli, negozi, categorie, settimane. Silvia ha lasciato in rosso le celle che non tornano.` },
                { w: 'silvia', a: `al telefono, quasi sorpresa`, t: `Due milioni e trecentomila euro di vendite perse in dodici mesi, stimate. E sono soltanto otto categorie: le altre non le ho nemmeno guardate.` },
                { think: `Per la prima volta il costo ha un numero. Ed è il suo, non il mio.` },
              ],
            }),
          ch('c', 3, `Porto Davide a fare una giornata di diagnostica sui dati di inventario di dieci negozi, per capire dove nasce la differenza tra sistema e realtà.`,
            `Hai rinunciato all’argomento più facile, “è colpa di Vertex”, e hai portato a Silvia un dato che nessuno può contestare, Rossi compreso: chi mostra anche i limiti del proprio caso viene creduto più a lungo.`,
            { t: 10, v: 10, u: 6, c: 4, r: -6 }, {
              jolly: 'se', mp: ['M', 'Co'], set: { quantified: true }, next: 'n2',
              say: `Facciamo una cosa concreta: ti porto Davide, il nostro Solution Engineer, per una giornata in dieci negozi. Guarda i dati di inventario e ti dice dove nasce la differenza tra sistema e realtà, anche quando la colpa non è di nessun sistema.`,
              react: [
                { n: `Alle sei di sera Davide è ancora nel magazzino di un negozio, seduto su una cassa di scarpe, con il portatile sulle ginocchia e tre direttori in piedi attorno.` },
                { w: 'davide', a: `girando lo schermo verso Silvia`, t: `Il sessanta per cento delle discrepanze nasce da tre processi: ricezione merce, resi, trasferimenti tra negozi. Due su tre non dipendono da Vertex: ricezione e resi, che nei negozi si fanno ancora a mano.` },
                { w: 'silvia', a: `dopo un silenzio`, t: `Avete detto che metà del problema è nostro.` },
                { think: `Ho appena dato ragione a un pezzo di Rossi davanti a Silvia. Costa, ma è l’unica cosa che nessuno potrà dire di aver truccato.` },
              ],
            }),
          ch('d', 1, `Le chiedo subito un incontro con Rossi: gli presento la soluzione e capisco se è disposto a valutare alternative a Vertex prima del prossimo rinnovo.`,
            `L’incontro è cortese, ma arrivi da Rossi senza un problema quantificato: per lui sei l’ennesima presentazione, e una roadmap già in corso batte sempre una presentazione.`,
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
          { think: `Gratis, tre mesi, “poi vediamo”. Conosco il finale: una pacca sulla spalla e un rinnovo di Vertex.` },
          { think: `Nessuna soglia, nessun nome che firmi, nessun passo dopo. Un pilota così consuma risorse e non impegna nessuno.` },
        ],
        prompt: `Come rispondi alla proposta di pilota?`,
        hint: `Un pilota non è una prova: è un contratto di prova con un esito concordato.`,
        tip: `Un pilota gratuito e aperto raramente si converte. Proponi un pilota a corrispettivo ridotto con obiettivi misurabili scritti, un Economic Buyer che firma i criteri e un percorso di conversione già concordato.`,
        choices: [
          ch('a', 0, `Certo, ci stiamo: venti negozi per tre mesi, a nostre spese e senza vincoli per Lumina. Alla fine guardiamo i numeri insieme e decidiamo, senza fretta e senza pressioni.`,
            `Hai accettato il pilota più facile da dire sì e più difficile da convertire. Senza soglie scritte né un passo successivo, il successo non ha una definizione: ognuno ne darà una propria, e quella di Rossi sarà la più prudente.`,
            { t: 2, v: -2, u: -8, c: -8, r: 12 }, {
              set: { freePilot: true }, next: 'n3',
              say: `Ci stiamo, Silvia. Venti negozi per tre mesi, a nostre spese e senza vincoli per Lumina. Alla fine guardiamo i numeri insieme e decidiamo.`,
              react: [
                { w: 'silvia', a: `sollevata`, t: `Perfetto. Dico ad Alberto di preparare i venti negozi.` },
                { n: `Tre mesi dopo la sala è la stessa e i numeri sono buoni. Sul tabellone i pallini gialli sono diventati verdi, in venti negozi su centoquaranta.` },
                { w: 'rossi', a: `affabile`, t: `Bene, molto bene. Valutiamo con calma.` },
                { think: `Novanta giorni di lavoro regalati. E nessuno ha ancora detto che cosa dovrebbe succedere adesso.` },
              ],
            }),
          ch('b', 3, `Ci sto, ma a corrispettivo ridotto: quattro settimane di allestimento e dodici di test su dodici negozi, con quattro criteri misurabili firmati da Longo e conversione con credito sul pilota.`,
            `Hai spostato il pilota da favore a patto: soglie misurabili, una firma di chi paga e la conversione già scritta. Per Longo, adesso, non è più un esperimento di Silvia ma un impegno suo.`,
            { t: 6, v: 8, u: 4, c: 14, r: -8 }, {
              mp: ['E', 'Dc'], set: { criteriaSet: true, ebEngaged: true }, next: 'n3',
              say: `Ci sto, ma facciamolo come un pilota vero. Quattro settimane di allestimento e dodici di test su dodici negozi, a corrispettivo ridotto, con quattro criteri misurabili che firma Andrea Longo. Se li raggiungiamo, passiamo al contratto completo e quello che ha pagato il pilota diventa credito.`,
              react: [
                { w: 'silvia', a: `ci pensa`, t: `Longo che firma i criteri di un pilota? Non l’ha mai fatto. Ma ha senso, sì. Glielo porto io.` },
                { n: `Dieci giorni dopo ti arriva una scansione: quattro righe, una firma a penna in fondo, “A. Longo”. Accuratezza delle giacenze più 20%, rotture meno 15%, tempi di inventario meno 30%, adozione all’80%.` },
                { think: `Un favore è diventato un patto. E porta la firma di chi paga.` },
              ],
            }),
          ch('c', 2, `Propongo una prova di valore di quattro settimane, offline, sui vostri dati storici: simuliamo le rotture dei negozi con il nostro motore previsionale e le confrontiamo con quelle reali.`,
            `Hai ridotto il rischio e accorciato i tempi, e Silvia è convinta. Ma una simulazione non ha toccato nessun negozio: per Rossi resta un’obiezione aperta, perché in negozio non è girato niente.`,
            { t: 4, v: 8, c: 4, r: -2 }, {
              mp: ['M'], set: { proofOfValue: true }, next: 'n3',
              say: `Propongo una cosa più leggera, Silvia: una prova di valore di quattro settimane, offline, sui vostri dati storici. Con il nostro motore previsionale simuliamo le rotture dei negozi e le confrontiamo con quelle reali. Nessun negozio da toccare.`,
              react: [
                { w: 'silvia', a: `più piano`, t: `Su dati storici. Quindi nessun negozio da toccare. Alberto ne sarà felice.` },
                { n: `Quattro settimane dopo il motore ricostruisce le rotture dell’ultima stagione con un margine d’errore che Silvia definisce “accettabile”, davanti a tutti. Poi si volta verso la finestra.` },
                { think: `Silvia è convinta. Rossi, però, non ha visto girare un solo negozio. L’obiezione è ancora lì.` },
              ],
            }),
          ch('d', 1, `Dico di no a qualsiasi pilota: ai clienti come Lumina proponiamo soltanto il contratto completo, con un piano di implementazione serio e un unico referente per tutti i negozi.`,
            `Una linea di principio comprensibile, ma Silvia aveva portato la proposta come l’unico modo di convincere il CIO. Le chiudi la porta dal suo lato, e la esponi da sola.`,
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
            { n: k === 'signed' ? `Il pilota è in corso da qualche settimana: dodici negozi, quattro criteri firmati.` : k === 'free' ? `Il pilota gratuito è in corso: venti negozi e nessuna soglia scritta.` : k === 'sim' ? `La prova sui dati storici è chiusa. Sul campo, nessun negozio è stato toccato.` : `Un pilota non c’è: solo un’idea che Silvia cerca di vendere da sola.` },
            { n: `Silvia ti ha avvisato per telefono: Vertex ha fiutato il pericolo. Il loro account manager ha offerto a Rossi una proroga del contratto con meno 40% e un aggiornamento “gratuito”.` },
            { w: 'rossi', a: `cordiale e inamovibile`, t: `La proroga di Vertex mi risolve il rinnovo e mi dà più tempo. Perché dovrei introdurre un secondo fornitore in piena stagione?` },
            { w: 'rossi', a: `senza fretta`, t: `Non lo dico per cortesia. Ho centoquaranta negozi che vendono ogni giorno: qualunque cosa tocchi, la tocco con loro dentro.` },
            { think: `Non difende Vertex: difende i suoi weekend. Se gli tolgo il rischio, il resto viene da sé. Se lo attacco, mi chiude la porta.` },
          ];
        },
        prompt: `Come tratti il CIO?`,
        hint: `Il CIO teme rischio e carico di lavoro. Se riduci il suo rischio, diventa neutrale o alleato.`,
        tip: `Un CIO leale all’incumbent non si batte: si disarma riducendo il rischio percepito. Proponi coesistenza (integrazione senza smantellare il core), una migrazione per ondate e un ruolo da protagonista per il suo team.`,
        choices: [
          ch('a', 0, `Gli ricordo le carenze documentate di Vertex: tre release in ritardo e due incidenti. Lo faccio per correttezza verso un cliente che merita di saperlo prima di rinnovare.`,
            `Per te era correttezza, per lui è un dossier sul suo fornitore. Informazioni di fonte non verificata, in un colloquio dove doveva sentirsi al sicuro: hai trasformato la sua prudenza in un motivo personale per non ascoltarti.`,
            { t: -10, c: -4, r: 14 }, {
              integ: -6, next: 'n4',
              say: `Dottor Rossi, per correttezza le dico quello che ho raccolto su Vertex: tre release in ritardo e due incidenti negli ultimi due anni. Meglio che lo sappia da me.`,
              react: [
                { w: 'rossi', a: `senza alzare la voce`, t: `Ha raccolto informazioni sul mio fornitore.` },
                { n: `La penna sul tavolo viene riallineata di un millimetro. Rossi apre il fascicolo di Vertex e comincia a sfogliarlo, come se nella stanza non ci fossi più.` },
                { think: `Fonti non verificate, tono da denuncia. Gli ho consegnato io la scusa per non ascoltarmi mai più.` },
              ],
            }),
          ch('b', 3, `Propongo la coesistenza: Vertex resta il core di amministrazione e fatturazione, noi gestiamo disponibilità e fulfillment omnicanale via API, a ondate, con il suo team alla guida.`,
            `Hai cambiato la domanda: non più “perché cambiare”, ma “come controllo il rischio”. A Rossi non chiedi di spegnere Vertex ma di aggiungere ciò che manca, con il comando in mano al suo team.`,
            { t: 8, v: 6, c: 8, r: -12 }, {
              mp: ['Co', 'Dc'], set: { coexist: true }, next: 'n4',
              say: `Dottor Rossi, non le chiedo di spegnere Vertex. Resta il core per amministrazione e fatturazione. Noi ci mettiamo sopra la disponibilità e il fulfillment omnicanale, con un’integrazione via API, a ondate. L’architettura la guida il suo team.`,
              react: [
                { w: 'rossi', a: `alzando lo sguardo`, t: `Questa è un’idea che posso difendere.` },
                { n: `Per la prima volta la penna si sposta al centro del blocco. Rossi posa la pallina da golf sul fascicolo di Vertex, come un fermacarte.` },
                { think: `Non deve spegnere niente. Deve aggiungere quello che manca. E il comando resta a lui.` },
              ],
            }),
          ch('c', 2, `Chiedo a Marta, la nostra Sales Director, di incontrare Rossi con me per un confronto strategico sulla visione IT di Lumina, sulla roadmap e sull’impegno di Nexora.`,
            `Un confronto tra pari ammorbidisce Rossi, che si sente trattato da interlocutore strategico. Ma la sua paura è operativa, i cantieri nei negozi in piena stagione, e a quella la visione non risponde.`,
            { t: 8, v: 2, c: 4, r: -4 }, {
              jolly: 'exec', next: 'n4',
              say: `Dottor Rossi, vorrei che incontrasse Marta Colombo, la nostra Sales Director. Un confronto a tre sulla visione IT di Lumina e su che cosa Nexora è disposta a mettere in gioco.`,
              react: [
                { n: `Marta arriva il martedì dopo. Rossi la riceve in piedi, con il caffè già in mano, e per quaranta minuti parlano di roadmap, di cloud, di come cambieranno i negozi tra cinque anni.` },
                { w: 'rossi', a: `rilassato`, t: `Finalmente qualcuno che mi chiede dove voglio andare, non che cosa devo comprare.` },
                { w: 'marta', a: `in corridoio, appena uscite`, t: `Gli è piaciuto, e a me anche. Ma il suo problema non è la visione: sono i negozi in stagione. Quella parte è ancora tutta tua.` },
              ],
            }),
          ch('d', 1, `Faccio leva sull’urgenza: la proroga di Vertex è una trappola per tenere Lumina vincolata altri anni, e la finestra per cambiare si chiude adesso, non dopo la stagione.`,
            `Un’affermazione forte senza una prova a sostenerla, davanti a un uomo che Vertex la conosce da nove anni: l’urgenza non basta se non la dimostri, e rischi di sembrare uno che spaventa.`,
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
        when: `Venerdì · 11:00`, view: 'walk', bg: 'retail',
        where: `Magazzino di un negozio · venerdì 11:00`,
        scene: (d) => {
          const k = pilot(d), signed = k === 'signed';
          const res = k === 'signed' ? `Sul tablet, appoggiato a una cassa di scarpe, i quattro criteri firmati da Longo e accanto i risultati: accuratezza giacenze più 24%, tempi di inventario meno 35%, adozione all’85%. Le rotture di stock, però, sono meno 11% contro un target di meno 15%.`
            : k === 'free' ? `Sul tablet, appoggiato a una cassa di scarpe, i numeri dei venti negozi del pilota gratuito. Sono buoni sul campo, ma nessuno ha mai scritto cosa significasse “successo”. Le rotture di stock sono migliorate dell’11%; ciascuno dei presenti ricorda un target diverso.`
              : k === 'sim' ? `Sul tablet, appoggiato a una cassa di scarpe, i risultati della prova sui dati storici: nessun negozio toccato, tutto ricostruito al computer. Sulla carta sono buoni, ma nessuno ha mai scritto cosa significasse “successo”. Le rotture risultano migliorate dell’11%; ciascuno dei presenti ricorda un target diverso.`
                : `Sul tablet, appoggiato a una cassa di scarpe, i numeri che Silvia ha raccolto in sei negozi con i suoi mezzi, senza contratto e senza soglie. Sono buoni sul campo, ma nessuno ha scritto cosa significasse “successo”. Le rotture sono migliorate dell’11%; ciascuno dei presenti ricorda un target diverso.`;
          return [
            { n: `Silvia ha scelto il magazzino di un negozio, non la sala riunioni. “Voglio che li vedi dove nascono”, ti ha scritto. Scaffalature grigie fino al soffitto, il ronzio dei neon, un carrello di scatole ancora da aprire.` },
            { n: res },
            k === 'sim' ? { w: 'davide', a: `a bassa voce`, t: `Il modello ricostruisce bene le rotture dell’ultima stagione. In negozio, però, non abbiamo ancora visto girare niente.` }
              : k === 'none' ? { n: `Un neon sfarfalla sopra la scaffalatura. Da qualche parte un transpallet cigola, e nessuno parla.` }
                : { w: 'davide', a: `a bassa voce, sul tablet`, t: `Le rotture le ho guardate negozio per negozio. Due sono in rosso, gli altri in linea.` },
            { w: 'silvia', a: `in tensione`, t: signed ? `Ho messo i risultati in una slide per Longo. Cosa gli diciamo sulle rotture, che sono sotto target?` : `Ho messo i risultati in una slide per Longo. Cosa gli diciamo sulle rotture, che sono sotto quello che speravamo?` },
            signed ? { think: `Tre su quattro, e il quarto è proprio quello che a Longo interessa di più: le vendite.` }
              : { think: `Nessuna soglia scritta: posso raccontarla come voglio. Ed è proprio per questo che non devo.` },
          ];
        },
        prompt: `Come presenti un risultato misto?`,
        hint: `Tre su quattro raccontato onestamente vale più di quattro su quattro ritoccato.`,
        tip: `Presenta i risultati sempre per criteri concordati, con trasparenza sul gap e un piano per colmarlo. Nascondere un miss è una scorciatoia: il CFO, o il tuo concorrente, lo troverà.`,
        choices: [
          ch('a', 0, `Apro con i criteri raggiunti e lascio le rotture in un allegato in fondo: i dati ci sono tutti, ma la riunione non parte dal punto debole e Longo ci arriva con calma.`,
            `Hai trasformato un risultato misto in un caso di opacità. Un CFO legge sempre l’allegato, e un dato nascosto pesa più del dato stesso: ora qualunque numero tu porti sarà verificato due volte.`,
            { t: -10, v: -4, r: 14 }, {
              integ: -6, next: 'n5',
              say: `Facciamo così, Silvia: in slide mettiamo i risultati sui criteri raggiunti, e le rotture le lasciamo in un allegato in fondo. I dati ci sono tutti, ma non aprono il discorso.`,
              react: [
                { w: 'silvia', a: `esitando`, t: `Non so, Longo legge sempre gli allegati.` },
                { n: `Due giorni dopo, nell’ufficio del CFO, Longo gira la prima slide e trova l’allegato in due minuti. Alza gli occhi.` },
                { w: 'longo', a: `piano`, t: `Perché mi nascondete il quarto?` },
              ],
            }),
          ch('b', 3, `Presento tutti e quattro i criteri, anche quello sotto target: spiego perché (stagionalità, due negozi con layout non ottimizzato) e propongo un piano di sei settimane per colmare il gap.`,
            `Hai mostrato il gap e la sua causa insieme a un piano per chiuderlo. Il rosso sulla slide diventa la prova che gli altri tre numeri sono veri, e il piano entra nel contratto come impegno, non come scusa.`,
            { t: 8, v: 8, c: 8, r: -8 }, {
              mp: ['M'], set: { honest: true }, next: 'n5',
              say: `Silvia, li presentiamo tutti e quattro, rotture comprese. Spieghiamo perché sono sotto: la stagionalità e due negozi con un layout che non avevamo ottimizzato. E mettiamo sul tavolo un piano di sei settimane per colmare il gap prima del roll-out.`,
              react: [
                { n: `Due giorni dopo, nell’ufficio del CFO, la slide ha quattro righe e una è rossa. Longo la guarda a lungo, poi si toglie gli occhiali.` },
                { w: 'longo', a: `asciutto`, t: `Mi piace che non me lo abbiate nascosto.` },
                { think: `Il rosso è diventato la prova che gli altri tre numeri sono veri.` },
              ],
            }),
          ch('c', 2, `Propongo di estendere il pilota di altri due mesi, per colmare il gap sulle rotture prima che Lumina decida: meglio un dato completo che una decisione presa a metà.`,
            `Sembra prudenza, ma dilata i tempi: il rinnovo con Vertex è dietro l’angolo e il tuo trimestre pure. Regali a chi ti sfida il tempo che a te manca.`,
            { t: 2, u: -8, c: -2, r: 4 }, {
              next: 'n5',
              say: `Silvia, estendiamo il pilota di due mesi: il dato sulle rotture ha il tempo di recuperare e Longo decide con i numeri completi.`,
              react: [
                { w: 'silvia', a: `guardando il calendario sul tablet`, t: `Due mesi in più. Ma il rinnovo con Vertex è dietro l’angolo, e Alberto lo sa.` },
                { think: `Sembra prudenza. Ma stiamo regalando a Vertex il tempo che a noi manca.` },
              ],
            }),
          ch('d', 0, `Ridefinisco il criterio: le rotture vanno misurate su un periodo diverso, quello dopo l’allestimento, e su quello il target risulta raggiunto. Cambia la finestra, non i dati.`,
            `Ritoccare un criterio concordato è la scorciatoia più cara che esista: il cliente la legge come manipolazione, e la fiducia costruita fin qui crolla in un colpo solo.`,
            { t: -12, v: -6, c: -6, r: 16 }, {
              integ: -8, set: { manipulated: true }, next: 'n5',
              say: `Silvia, il criterio sulle rotture va misurato su un altro periodo, quello che parte dopo l’allestimento. Su quello il target risulta raggiunto.`,
              react: (d) => [
                { w: 'silvia', a: `lentamente`, t: d.flags.criteriaSet ? `Ma i criteri li abbiamo firmati noi. Con le date dentro.` : `Ma ne avevamo parlato in un altro modo, tutti. Con altre date.` },
                { think: `Ho riscritto una riga che qualcuno aveva firmato. E l’ho fatto davanti a lei.` },
              ],
            }),
        ],
      },

      n5: {
        when: `Lunedì · 10:00`, view: 'meeting', bg: 'office',
        where: `Incontro · ufficio del CFO · lunedì 10:00`,
        scene: (d) => [
          { n: `Lunedì, le dieci in punto. L’ufficio del CFO è al sesto piano ed è l’opposto di quello di Rossi: nessuna teca, un solo monitor e una lavagna bianca con tre cose scritte a pennarello nero: 540, 270 e un punto interrogativo.` },
          { if: (x) => x.flags.criteriaSet, n: `Accanto al monitor, il foglio con i quattro criteri e la firma a penna di Longo. L’ha tirato fuori prima del tuo arrivo.` },
          { if: (x) => x.flags.honest, n: `Sul monitor, accanto al prezzo, la tabella dei risultati del pilota. La riga delle rotture è evidenziata in giallo.` },
          { w: 'longo', a: `diretto`, t: `Ho una domanda semplice: perché dovrei spendere €540.000 l’anno per un nuovo sistema quando Vertex mi offre la proroga a metà prezzo?` },
          { n: `Non alza la voce. Fa ruotare la penna tra le dita, due volte, e aspetta.` },
          { think: `Il suo problema non è il prezzo: è la domanda. Se rispondo sul prezzo, perdo. Se rispondo sul valore senza numeri suoi, perdo più lentamente.` },
          d.flags.quantified
            ? { think: `Ho il file di Silvia: 2,3 milioni di vendite perse in otto categorie. È l’unica cosa su questo tavolo che non l’ha scritta nessun fornitore.` }
            : { think: `Il costo di restare fermi un numero ce l’ha, anche se non è mio: lo stima Silvia. Devo portarglielo con i suoi dati, non con i miei.` },
        ],
        prompt: `Come rispondi al CFO?`,
        hint: `Il confronto non è fra due prezzi, ma fra il costo di restare e il valore di cambiare.`,
        tip: `Contro una proroga scontata sposta la domanda dal prezzo al costo di inazione: cosa perdi restando fermo contro cosa guadagni. Ancora il valore a una data di business, per esempio la stagione.`,
        choices: [
          ch('a', 0, `Gli dico che possiamo avvicinarci al prezzo di Vertex: €270k, così il prezzo smette di essere un tema e passiamo a discutere di come partire e con quali negozi.`,
            `Hai dimezzato il prodotto con una frase. Longo non ha visto un gesto di apertura ma la conferma che il tuo numero iniziale era negoziabile e, insieme, che il prodotto è sostituibile.`,
            { t: -4, v: -12, c: -4, d: 50 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, ci posso arrivare: portiamo il prezzo a €270k e il prezzo smette di essere un tema. Poi parliamo del resto.`,
              react: [
                { w: 'longo', a: `senza battere ciglio`, t: `Quindi i €540.000 erano una cifra di partenza.` },
                { n: `Annota qualcosa nell’angolo del blocco. Sulla lavagna, il punto interrogativo sembra improvvisamente piccolo.` },
                { think: `Ho appena detto che il mio prodotto vale metà di quello che scrivevo. E lui lo ha scritto.` },
              ],
            }),
          ch('b', 3, `Gli propongo di confrontare il costo di restare e quello di cambiare: 2,3 milioni di vendite perse l’anno, un terzo recuperabile (circa 770k), con ritorno in nove mesi.`,
            `Hai riportato la conversazione dal prezzo al valore, con i numeri di Longo e di Silvia e non con i tuoi. Davanti a un costo di restare che ha una cifra, una proroga a metà prezzo smette di essere un risparmio.`,
            { t: 6, v: 14, u: 10, c: 4, r: -6 }, {
              mp: ['E', 'M'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, mettiamo i due costi sullo stesso foglio. Il costo di restare: Silvia stima in 2,3 milioni l’anno le vendite perse per rotture di stock. Con la nostra soluzione ne recuperate circa un terzo, 770 mila euro già nel primo anno: il sistema si ripaga in nove mesi, e i primi negozi sono pronti per il Black Friday. La proroga a metà prezzo non tocca quel problema.`,
              react: [
                { w: 'longo', a: `prendendo la penna`, t: `Se i 770 reggono, la questione non è più il prezzo.` },
                { n: `Si alza, cancella il punto interrogativo dalla lavagna e scrive “770?”. Poi si volta verso di te.` },
                { w: 'longo', t: `Voglio rivedere i dati con Silvia. Domani, qui.` },
                { think: `Ha cambiato il verbo della domanda: da “perché dovrei spendere” a “reggono o non reggono”.` },
              ],
            }),
          ch('c', 2, `Gli porto il caso del nostro cliente più simile a Lumina: meno 22% sui costi logistici in un anno, con una rete di negozi e un magazzino centrale come il suo.`,
            `Un buon caso di riferimento dà contesto e credibilità, ma resta il caso di un altro. Il CFO decide sui propri numeri: ti concede ascolto, non ancora il sì.`,
            { t: 2, v: 5, c: 2 }, {
              mp: ['E'], set: { ebEngaged: true }, next: 'n6',
              say: `Dottor Longo, le porto il caso del cliente che somiglia di più a Lumina: in un anno, meno 22% sui costi logistici. Anche lì una rete di negozi e un magazzino centrale, come il vostro.`,
              react: [
                { w: 'longo', a: `scorrendo la pagina`, t: `Un buon caso. Ma è il caso di un altro. Mostratemi i miei numeri, non quelli di un altro.` },
                { think: `Contesto giusto, pelle sbagliata. Mi manca ancora il suo numero.` },
              ],
            }),
          ch('d', 1, `Gli blocco il prezzo per cinque anni, se firma entro il 31: così non teme rincari, chiude l’anno con una spesa certa e Vertex non può più rilanciare.`,
            `Una garanzia di prezzo risponde a una paura che Longo non ha. Il suo dubbio è sul valore, e un prezzo fermo per cinque anni su un sistema non ancora provato ovunque è più un rischio che un vantaggio.`,
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
          { n: `Venerdì sera, le sei e quaranta. Sei sul binario del regionale, la borsa tra i piedi, quando il telefono vibra tre volte di fila.`, sfx: 'ping' },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ha fatto un’altra offerta.` },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Vertex rilancia a tre giorni dalla decisione: meno 55% e implementazione gratuita. Rossi ha messo tutto sul tavolo di Longo.` },
          { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Longo vuole una risposta da voi entro lunedì. Cosa facciamo?` },
          d.flags.criteriaSet
            ? { think: `Ho quattro criteri firmati da Longo e i risultati del pilota. Posso permettermi di non rincorrere nessuno.` }
            : d.mp.has('M')
              ? { think: `Il numero di Longo c’è, ma non c’è un criterio firmato: dovrò fare molto con le sole parole.` }
              : { think: `Non ho criteri firmati né un numero condiviso. Il rilancio di Vertex è l’unica cosa solida che Longo ha davanti.` },
          { n: `Il tabellone annuncia dodici minuti di ritardo. Hai il tempo per una risposta, non per dieci.` },
        ],
        prompt: `Ultima mossa. Cosa fai?`,
        hint: `L’ultimo rilancio dell’incumbent mette alla prova se il tuo valore regge senza sconti spasmodici.`,
        tip: `Se il valore è stato quantificato e firmato dal CFO non devi inseguire il prezzo: ricordi il costo di restare, offri una struttura flessibile (partenza a ondate) e fissi la decisione sul calendario di business, non su quello commerciale.`,
        choices: [
          ch('a', 0, `Rilancio subito: meno 50% sul primo anno, pur di non perdere il deal. Al Deal Desk penso dopo, a cose fatte, quando Longo avrà accettato e il rilancio di Vertex sarà superato.`,
            `Hai confermato che il prezzo era il tuo punto debole e promesso uno sconto che nessuno ha approvato. Il Deal Desk lo blocca, e torni da Longo con meno di quanto avevi detto: la peggiore combinazione possibile.`,
            { t: -6, v: -10, c: -4, d: 50 }, {
              next: 'END',
              say: `Silvia, rispondo subito: portiamo il primo anno a meno cinquanta per cento. Il Deal Desk lo sistemo dopo.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Wow. Lo giro a Longo adesso.` },
                { n: `Lunedì mattina il Deal Desk ti manda una mail di quattro righe: non è approvabile. Il massimo che può coprire è molto meno.` },
                { think: `Ho promesso quello che non potevo dare, per dimostrare che il prezzo era il mio punto debole. Missione compiuta.` },
              ],
            }),
          ch('b', 3, `Non rincorro il prezzo: ricordo i risultati del pilota e il costo di restare fermi, e propongo 40 negozi prima del Black Friday, gli altri a gennaio, con pagamento legato alle ondate.`,
            `Hai spostato la discussione dal prezzo al calendario di business. Longo ragiona in stagioni, non in sconti: la partenza a ondate dà a Rossi un percorso controllato e a te una data di firma dentro il trimestre.`,
            { t: 6, v: 6, u: 10, c: 12, r: -8, d: 8 }, {
              mp: ['Dp', 'P'], set: { giveGet: true }, next: 'END',
              say: `Silvia, il prezzo non lo rincorro. Digli che i risultati del pilota sono sul tavolo e che restare fermi costa 2,3 milioni l’anno. Proponiamo una partenza a ondate: quaranta negozi prima del Black Friday, gli altri a gennaio, con il pagamento legato alle ondate. E chiediamo la decisione entro venerdì, per rispettare il calendario di stagione.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Ok. Questo posso portarlo a Longo senza vergognarmi.` },
                { n: `Lunedì mattina, nell’ufficio del CFO, la lavagna è stata cancellata. Resta una sola riga: “Black Friday”.` },
                { w: 'longo', a: `senza guardarti`, t: `La stagione è il mio vincolo, non il prezzo.` },
                { think: `Non gli sto vendendo uno sconto. Gli sto dando un calendario.` },
              ],
            }),
          ch('c', 2, `Con il Deal Desk strutturo un’offerta più leggera sul primo anno, con un prezzo che sale in funzione dell’adozione (ramp): il primo anno costa meno e il resto segue i negozi.`,
            `La rampa alleggerisce il primo anno e premia l’adozione, ma lascia aperto il tema del tempo: Longo vuole una risposta lunedì, e una struttura nuova ha bisogno di più giorni per essere letta, approvata e difesa.`,
            { t: 4, v: 4, c: 8, r: -4, d: 10 }, {
              jolly: 'desk', set: { giveGet: true, deskApproved: true }, mp: ['P'], next: 'END',
              say: `Silvia, chiamo Giulia del Deal Desk e strutturiamo un’offerta più leggera sul primo anno, con un prezzo che cresce man mano che i negozi adottano il sistema. Ti rispondo entro stasera.`,
              react: [
                { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Una rampa? Interessante, sì. Mandamela appena la vedi, che la guardo prima di Longo.` },
                { n: `Giulia del Deal Desk richiama dopo cinquanta minuti, quando sei già sul treno. Tre scenari su un foglio, uno solo regge con le soglie di sconto.` },
                { think: `La rampa premia chi adotta e alleggerisce il primo anno. Ma Longo ha chiesto una risposta per lunedì, e questa ne vuole due, di giorni.` },
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
        id: 'black_friday', title: `Il Black Friday parte con due settimane d’anticipo`, w: 2, after: ['n2', 'n3'],
        if: (d) => !!(d.flags.criteriaSet || d.flags.freePilot),
        node: {
          when: `Mercoledì · 17:30`, view: 'walk', bg: 'retail',
          where: `Negozio pilota · mercoledì 17:30`,
          scene: (d) => [
            { n: `Mercoledì sera, in uno dei negozi del pilota. Il marketing ha anticipato il Black Friday e il piano vendita sembra una stazione: file alle casse, bancali nei corridoi, i palmari in ricarica a metà.` },
            { w: 'silvia', a: `al telefono, sopra il rumore`, t: `Il marketing ha anticipato le promozioni di due settimane e nessuno mi ha avvisata. I tuoi ${pilotStores(d)} negozi sono nel picco, e i numeri di queste settimane saranno una giungla. Lo sai anche tu.` },
            { n: `Un addetto passa con un carrello di scatole e non guarda nemmeno il palmare. Sul display dell’apparecchio in carica lampeggia un avviso: “Inventario ciclico in sospeso”.` },
            d.flags.criteriaSet
              ? { think: `Ho quattro criteri firmati. Un picco anticipato è un test più duro di quello previsto, e posso usarlo, se lo racconto io prima che lo racconti qualcun altro.` }
              : { think: `Senza soglie scritte, qualunque numero esca da queste settimane sarà discutibile: se è basso, “è colpa del picco”; se è alto, “era stagione”.` },
          ],
          prompt: `Il picco stressa il pilota. Come lo gestisci?`,
          hint: `Un picco non è un incidente: è il test più onesto che avrai. Come lo trasformi in un dato che regge?`,
          tip: `Quando il mondo sconvolge il tuo pilota, non cambiare il metro: separa le finestre di misura, tieni i dati grezzi e mostra come il sistema si comporta sotto carico. Il picco è un punto a tuo favore, se lo racconti tu per primo.`,
          choices: [
            ch('a', 3, `Chiedo a Silvia di marcare le settimane di picco come finestra separata: misuriamo il pilota nelle due condizioni e mostriamo come si comporta sotto carico.`,
              (d) => (d.flags.criteriaSet
                ? `Con criteri firmati il picco diventa una seconda prova: Longo vedrà gli stessi quattro indicatori in condizioni normali e sotto stress. È l’argomento più forte che potessi desiderare.`
                : `Anche senza soglie scritte, separare le finestre rende i dati leggibili e difendibili. Ti manca la firma di chi paga, ma almeno hai un metro onesto da mostrare.`),
              (d) => (d.flags.criteriaSet ? { t: 5, v: 6, c: 8, r: -6 } : { t: 3, v: 3, c: 4, r: -2 }), {
                next: 'RET',
                say: `Silvia, il metro non lo cambiamo. Segniamo queste due settimane come finestra di picco e teniamo i dati separati: Longo vedrà gli stessi indicatori in condizioni normali e sotto stress. E lo raccontiamo noi, prima che lo faccia qualcun altro.`,
                react: (d) => [
                  d.flags.criteriaSet
                    ? { w: 'silvia', a: `dopo un attimo`, t: `Due finestre, stessi quattro indicatori. Longo il picco non l’ha mai visto: ha sempre visto soltanto la media. Così è più forte di prima.` }
                    : { w: 'silvia', a: `dubbiosa`, t: `Va bene, due finestre. Ma senza soglie scritte non so che cosa dire a Longo su che cosa conti come “bene”.` },
                  { think: d.flags.criteriaSet ? `Il picco anticipato diventa la parte migliore del pilota.` : `Ho un metro onesto. Mi manca ancora qualcuno che lo riconosca come tale.` },
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
                  { w: 'silvia', a: `esasperata`, t: `Mi stai chiedendo di togliere ${pilotStores(d)} negozi dal Black Friday? A due settimane dal picco? Dai.` },
                  { think: `Ho chiesto a Silvia di spendere un favore enorme per proteggere il mio campione. E il campione, così, non dimostra niente.` },
                ],
              }),
            ch('d', 0, `Scarto le due settimane di picco dai dati e le sostituisco con una proiezione nostra, costruita sui giorni normali, più pulita e più rappresentativa.`,
              `Sostituire dati reali con una stima è il modo più rapido di perdere un pilota. Quando qualcuno confronterà i dati grezzi con la tua proiezione, il problema non sarà più il picco ma la tua credibilità.`,
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
        id: 'post_virale', title: `Uno stock-out finisce sui social`, w: 2, after: ['n1', 'n2', 'n3'],
        node: {
          when: `Domenica · 21:15`, view: 'phone', bg: 'night',
          where: `Telefono · domenica 21:15`,
          scene: (d) => [
            { n: `Domenica sera. Il telefono si illumina sul divano: il nome di Silvia, un link e nessun testo.`, sfx: 'ping' },
            { n: `Nel video una ragazza con un sacchetto del flagship mostra l’app di Lumina: “Disponibile in negozio”. Poi inquadra lo scaffale vuoto. Didascalia: “Disponibile in negozio. Ma solo sul sito”. Quarantamila visualizzazioni in tre ore, e salgono.` },
            d.flags.quantified
              ? { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Il CEO me l’ha girato alle nove. Vuole sapere quanto ci costa tutto questo. Il file che abbiamo costruito ce l’ho, ma devo dargli qualcosa che regga entro domattina.` }
              : { chat: { from: 'silvia', app: 'WhatsApp' }, t: `Il CEO me l’ha girato alle nove. Vuole sapere da quanto succede e quanto ci costa. E io un numero non ce l’ho.` },
            d.flags.quantified
              ? { think: `Ho un numero che regge, e l’abbiamo costruito insieme. Stasera può diventare una risposta oppure un’arma. Dipende da come lo uso.` }
              : { think: `È la domanda che le avrei dovuto far fare io da mesi. L’ha fatta il CEO, di domenica sera, a lei sola.` },
          ],
          prompt: `Il problema è diventato pubblico. Cosa fai, stasera?`,
          hint: `Un’occasione si coglie dando una mano. Chi sfrutta l’imbarazzo del cliente, il cliente lo perde.`,
          tip: `Quando il problema del cliente diventa visibile non devi dire “te l’avevo detto”: devi dargli il modo di rispondere. Un dato che regge, consegnato in fretta e senza logo, vale più di cento presentazioni e porta l’urgenza dove serve, sulla scrivania di chi decide.`,
          choices: [
            ch('a', 3, `Aiuto Silvia a preparare in un’ora una pagina per il CEO: che cosa è successo, quanto vale il problema per negozio, che cosa si fa in trenta giorni. Senza logo Nexora.`,
              (d) => (d.flags.quantified
                ? `Hai messo il numero di Silvia in una pagina che il CEO può leggere in due minuti. Non hai venduto niente: le hai dato il modo di rispondere, e l’urgenza è arrivata dove si decide.`
                : `Senza un numero già costruito la pagina è più fragile, ma resta la mossa giusta: la stima per negozio è provvisoria e dichiarata come tale, e l’urgenza arriva dove si decide.`),
              (d) => (d.flags.quantified ? { t: 6, v: 8, u: 12, c: 4, r: -2 } : { t: 4, v: 4, u: 10, c: 2 }), {
                set: { ceoPage: true }, next: 'RET',
                say: `Silvia, ti aiuto a preparare in un’ora una pagina per il CEO: che cosa è successo, quanto vale il problema per negozio e che cosa si può fare nei prossimi trenta giorni. Niente logo Nexora, niente prezzi: è la tua pagina.`,
                react: [
                  { w: 'silvia', a: `alle undici, al telefono`, t: `Da sola non ce la facevo entro domattina. Con te sì. Che cosa ti serve da me?` },
                  { n: `Alle undici e mezza la pagina è chiusa: la foto del post, una stima per negozio, tre azioni in trenta giorni. Nessun logo, nessun prezzo.` },
                  { think: `Non ho venduto niente. Le ho dato il modo di rispondere.` },
                ],
              }),
            ch('b', 2, `Le dico di non commentare il post stasera e di vederci domattina alle otto con i suoi dati e quelli di Davide, prima che il CEO chieda ancora una risposta.`,
              `Prudente e utile, ma più lento: il CEO vuole una risposta entro le nove e la tua proposta arriva alle otto. Dai a Silvia tempo e dati, non ancora una pagina da portare.`,
              { t: 3, v: 2, u: 6, c: 2 }, {
                next: 'RET',
                say: `Silvia, stasera non commentare il post. Vediamoci domattina alle otto con i tuoi dati e quelli di Davide, così alle nove hai qualcosa da dire al CEO.`,
                react: [
                  { w: 'silvia', a: `sospirando`, t: `Alle otto. Il CEO però vuole una risposta prima delle nove.` },
                  { think: `Vado a dormire con il suo problema in tasca. Domattina ho un’ora.` },
                ],
              }),
            ch('c', 0, `Faccio girare il video ai miei contatti in Lumina, Longo compreso, con una riga: “Questo è il problema di cui parlavamo”, così capiscono che non è un caso isolato.`,
              `Usare l’imbarazzo del cliente come argomento di vendita è la strada più rapida per perderlo. Silvia stava difendendo la sua azienda in pubblico, e ha visto la tua mossa nel giro di un’ora.`,
              { t: -8, c: -4, r: 8 }, {
                next: 'RET',
                say: `Faccio girare il video a due o tre persone in Lumina, Longo compreso, con una riga sola: “Questo è il problema di cui parlavamo”.`,
                react: [
                  { w: 'silvia', a: `dopo un’ora, in chat`, t: `Hai mandato il video anche a Longo? Con quella frase? Stasera era mio, il problema.` },
                  { think: `Ho trasformato il suo imbarazzo in un argomento di vendita. E lei se n’è accorta in un’ora.` },
                ],
              }),
            ch('d', 1, `Le scrivo che capisco, che ci sentiamo domani e che per stasera non c’è niente da fare: il weekend è sacro e la questione può aspettare lunedì mattina.`,
              `Rispetti il weekend ma lasci il momento a qualcun altro. Il problema, per una volta, ha un testimone pubblico e il CEO ha una domanda: se nessuno gli porta un dato, ne porterà uno suo.`,
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
          when: `Martedì · 09:30`, view: 'walk', bg: 'retail',
          where: `Magazzino · negozio pilota · martedì 09:30`,
          scene: (d) => [
            { n: `Martedì mattina, magazzino del negozio pilota. Il palmare nuovo è sulla scaffalatura, ancora nella sua custodia, accanto a una tazza di caffè incrostata. Nessuno lo ha toccato da giovedì.` },
            { w: 'brivio', a: `braccia incrociate, sulla porta`, t: `Io ho trent’anni di negozio e un sistema che conosco. Voi mi chiedete di scansionare ogni scatola e di fermarmi due ore a settimana per l’inventario ciclico. Io vendo vestiti, non compilo righe.` },
            { n: `Alle sue spalle due addetti fingono di riordinare i resi. Hai il sospetto che stiano ascoltando tutto, e che ciò che Brivio dice a voce alta lo pensino in dodici.` },
            d.flags.criteriaSet
              ? { think: `L’adozione è uno dei quattro criteri firmati da Longo. Se questo negozio non scansiona, l’ottanta per cento non arriva, e Brivio lo sa meglio di me.` }
              : { think: `Senza un criterio scritto sull’adozione, potrebbe boicottare in silenzio e nessuno gli darebbe torto. Devo capire che cos’ha in testa.` },
          ],
          prompt: `Il direttore di un negozio pilota non collabora. Come reagisci?`,
          hint: `Un boicottaggio è quasi sempre un costo che nessuno ha ascoltato. Chi lo paga, e quanto vale per lui?`,
          tip: `Quando chi dovrebbe usare il sistema lo rifiuta, non ti serve un mandato: ti serve capire quale fatica gli stai chiedendo e togliergliene più di quanta ne aggiungi. L’adozione si costruisce dal negozio, non dalla direzione.`,
          choices: [
            ch('a', 3, `Mi siedo con lui e gli chiedo che cosa gli fa perdere più tempo oggi. Poi gli propongo di scegliere lui i tre punti dell’inventario che il sistema deve togliergli dalle spalle.`,
              (d) => (d.flags.criteriaSet
                ? `Hai trasformato un avversario in coautore: Brivio sceglie i tre punti, e il criterio sull’adozione smette di essere un obbligo e diventa una cosa sua. Con quei criteri firmati, ogni punto ottenuto vale doppio.`
                : `Hai ascoltato prima di chiedere: Brivio sceglie i tre punti e gli addetti vedono che il sistema serve a loro. Senza una soglia scritta il risultato resta locale, ma è un negozio che adotta davvero.`),
              (d) => (d.flags.criteriaSet ? { t: 5, c: 6, r: -5 } : { t: 3, c: 3, r: -2 }), {
                next: 'RET',
                say: `Brivio, mi dica cosa le fa perdere più tempo oggi, in questo magazzino. Poi scelga lei i tre punti dell’inventario che il sistema deve togliervi dalle spalle: partiamo da quelli, il resto viene dopo.`,
                react: [
                  { w: 'brivio', a: `dopo una pausa, scostando una cassa`, t: `I resi. Ogni sera mezz’ora a contare cose che il sistema dovrebbe sapere. Se mi togliete quelli, il palmare lo uso.` },
                  { n: `Prende il palmare dalla custodia, lo accende, lo gira per leggere lo schermo. I due addetti smettono di fingere di riordinare.` },
                  { think: `Non gli ho chiesto di cambiare: gli ho chiesto di scegliere. Ed è diventato un’altra persona.` },
                ],
              }),
            ch('b', 2, `Porto Davide in negozio per una mattina: affianca gli addetti ai palmari e toglie dal tavolo i primi tre attriti, partendo dai numeri di Brivio, senza che sia lui a chiedere.`,
              `Davide risolve gli attriti tecnici e gli addetti ci prendono la mano. Ma il direttore, che era il nodo, resta spettatore: un sostegno efficace ma indiretto.`,
              { t: 3, c: 3, r: -2 }, {
                next: 'RET',
                say: `Brivio, le lascio Davide per una mattina. Sta con i suoi addetti ai palmari e toglie dal tavolo i primi tre attriti, partendo dai vostri numeri.`,
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
                  { w: 'brivio', a: `dopo tre giorni, in chat a Silvia`, t: `Obbligatorio. Va bene. Scanserò quello che serve. Il resto lo faccio come sempre.` },
                  { think: `Ho ottenuto una cifra, non un cambiamento. E ho messo Silvia in mezzo.` },
                ],
              }),
            ch('d', 0, `Gli dico che i dati del suo negozio sono tra i peggiori del gruppo e che Silvia lo sa: se non collabora, finirà nel rapporto che arriva a Longo.`,
              `Una minaccia davanti a due addetti è il modo più rapido di fare un nemico che sa dove sono i punti deboli del sistema. Brivio racconterà la scena ai suoi colleghi prima di sera.`,
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
          scene: (d) => [
            { n: `Giovedì sera, sede di Lumina. Stai uscendo dal piano IT quando Rossi ti ferma in corridoio, la giacca già sul braccio e un cartoncino in mano.` },
            { w: 'rossi', a: `mostrando il cartoncino`, t: `Vertex mi ha invitato al loro evento clienti, a Lisbona, tre giorni a metà mese. Cena con il loro CTO e tavola rotonda sulla roadmap. Ho pensato che dovesse saperlo da me.` },
            { n: `Il cartoncino è di carta pesante, goffrata, con la V di Vertex in rame. Sul retro, a mano: “Alberto, ti aspettiamo. F.”.` },
            d.flags.coexist
              ? { think: `Me lo dice di sua iniziativa. Con la coesistenza sul tavolo, è il suo modo di dirmi che sono ancora in partita.` }
              : { think: `Me lo dice per correttezza o per farmi capire quanto è radicata Vertex? Tre giorni di cene possono pesare più di sei mesi di riunioni.` },
          ],
          prompt: `Il tuo avversario ha invitato il tuo interlocutore a una cena. Come rispondi?`,
          hint: `Rossi te l’ha detto prima di partire: è un segnale. Che cosa gli dai in cambio della sua franchezza?`,
          tip: `Quando il concorrente gioca in casa sua, non competi sull’ospitalità: competi sulla chiarezza. Chi ti ha avvisato non va messo alla prova, va ringraziato, e al ritorno gli si offre un metro oggettivo per leggere ciò che ha sentito.`,
          choices: [
            ch('a', 3, `Gli auguro buon viaggio e gli propongo, al ritorno, un’ora per mettere a confronto ciò che Vertex ha promesso e ciò che Nexora metterebbe per iscritto sui criteri di Lumina.`,
              (d) => (d.flags.criteriaSet
                ? `Hai lasciato a Rossi Lisbona e preso il ritorno: con i criteri firmati hai un metro scritto su cui misurare ogni promessa, e l’ora di confronto diventa un test sui fatti.`
                : `Hai rinunciato a rincorrere la cena e hai chiesto un confronto sui fatti. Senza criteri firmati il metro è meno solido, ma il segnale è chiaro: non temi la comparazione.`),
              (d) => (d.flags.criteriaSet ? { t: 6, c: 6, r: -4 } : { t: 4, c: 3, r: -2 }), {
                set: { rossiOpen: true }, next: 'RET',
                say: `Faccia buon viaggio, dottor Rossi, e grazie per avermelo detto. Al ritorno le chiedo un’ora: mettiamo uno accanto all’altro ciò che Vertex le ha promesso a Lisbona e ciò che noi siamo disposti a scrivere, sui criteri di Lumina.`,
                react: [
                  { w: 'rossi', a: `dopo un attimo`, t: `Di cortesie ne ho sentite tante, ma è la prima che mi chiede di riportare a casa i fatti e non i regali. Va bene.` },
                  { think: `Gli ho lasciato Lisbona e ho chiesto i compiti per casa. Se li fa, sarà il confronto più onesto della trattativa.` },
                ],
              }),
            ch('b', 2, `Lo ringrazio per avermelo detto e gli propongo una cena a Milano con Davide, solo tecnica, per rispondere a tutte le sue domande sull’integrazione prima che parta.`,
              `Un gesto di cortesia e una risposta concreta: non competi con Lisbona ma ti presenti con ciò che Rossi teme, un architetto che risponde. Resta una cena, non un metro di confronto.`,
              { t: 4, c: 2 }, {
                set: { rossiOpen: true }, next: 'RET',
                say: `La ringrazio per avermelo detto, dottor Rossi. Le propongo una cena a Milano con Davide, il nostro Solution Engineer: solo tecnica, tutte le domande che vuole sull’integrazione.`,
                react: [
                  { w: 'rossi', a: `sorridendo`, t: `Una cena di lavoro a Milano contro tre giorni a Lisbona. Non è una gara che vincete, ma è una cena che accetto.` },
                  { think: `Contro Lisbona non vinco. Ma mi presento con ciò che lui teme: qualcuno che risponde.` },
                ],
              }),
            ch('c', 1, `Gli chiedo di rinunciare: partecipare a un evento del concorrente in piena valutazione non mi sembra corretto verso il progetto, né verso il lavoro fatto finora.`,
              `Rossi ti ha dato un’informazione per cortesia e tu l’hai trattata come un favore dovuto. Una richiesta che ha il suono di una condizione irrigidisce un interlocutore già prudente.`,
              { t: -6, c: -2, r: 6 }, {
                next: 'RET',
                say: `Dottor Rossi, le chiedo di non andare: partecipare a un evento del concorrente proprio ora, in piena valutazione, non mi sembra corretto verso il progetto.`,
                react: [
                  { w: 'rossi', a: `gelido, con garbo`, t: `Mi sta chiedendo di dichiarare la mia agenda. Non credo sia nei suoi poteri.` },
                  { think: `Ha avuto la cortesia di avvisarmi, e io gli ho chiesto di rinunciare. Un bel modo di non essere avvisato più.` },
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
            { w: 'longo', a: `senza saluti`, t: `Sono Longo. Nel vostro calcolo manca un numero. Quanto paga Lumina ogni anno in ribassi sulla merce che il sistema non vede: quella che resta ferma in un negozio mentre in un altro la chiedono? Non è nei vostri documenti.` },
            { n: `Dall’altra parte, il rumore di una penna che batte sul vetro di una scrivania. Aspetta.` },
            d.mp.has('M')
              ? { think: `I miei numeri partono dalle vendite perse. L’altra metà della storia, i ribassi, non l’ho mai calcolata: nessuno me l’ha chiesta. Fino a oggi.` }
              : { think: `Non ho il suo numero e non ho nemmeno un metodo per stimarlo. Se improvviso un valore adesso, quel valore diventa una promessa.` },
          ],
          prompt: `Longo ti chiede un dato che non hai. Che risposta gli dai?`,
          hint: `Una cifra inventata al telefono diventa il tuo prossimo problema. Chi ammette un limite e dà una data, resta credibile.`,
          tip: `Davanti a un decisore che chiede un dato che non hai, ammettilo e fissa una data per portarlo, con il metodo. “Non lo so, ma lo costruiamo insieme entro giovedì” vale più di una stima a occhio: con un CFO il credito si guadagna con la precisione.`,
          choices: [
            ch('a', 3, `Gli dico che quel numero non ce l’ho e non voglio stimarlo a occhio. Propongo di costruirlo con il suo controllo di gestione entro giovedì, sui loro dati dei ribassi.`,
              (d) => (d.mp.has('M')
                ? `Hai ammesso il limite e offerto un metodo: Longo vede un fornitore che non bluffa e che lavora con i suoi numeri. Sulla base delle vendite perse già costruite, il nuovo dato si aggancia al calcolo, non lo sostituisce.`
                : `Hai ammesso il limite e offerto un metodo. Non hai ancora una base di Metrics su cui appoggiarlo, ma Longo vede un fornitore che non bluffa e che lavora con i suoi numeri.`),
              (d) => (d.mp.has('M') ? { t: 6, v: 6, c: 6 } : { t: 4, v: 3, c: 3 }), {
                next: 'RET',
                say: `Dottor Longo, quel numero non ce l’ho, e non voglio darle una stima a occhio. Se il suo controllo di gestione mi passa i ribassi degli ultimi due anni per categoria, lo costruiamo insieme e glielo porto giovedì, con il metodo scritto.`,
                react: [
                  { w: 'longo', a: `dopo una pausa`, t: `Giovedì. I ribassi ve li faccio avere domattina, per categoria. Ma voglio vedere il metodo prima del numero.` },
                  { think: `Non lo so, ma so come trovarlo e per quando. È la frase che i CFO si ricordano.` },
                ],
              }),
            ch('b', 2, `Mi prendo la notte: lo richiamo domattina con una stima costruita su un benchmark di settore, dichiarando chiaramente che è una stima e non il suo dato.`,
              `Prendi tempo senza inventare e dichiari la natura della cifra: onesto. Ma un benchmark di settore non è il numero di Longo, e gli prometti qualcosa che dovrai correggere appena arrivano i suoi dati.`,
              { t: 2, v: 2, c: 2 }, {
                next: 'RET',
                say: `Mi prendo la notte, dottor Longo. Domani mattina la richiamo con una stima costruita su un benchmark di settore, e le dico chiaramente che è una stima, non il suo dato.`,
                react: [
                  { w: 'longo', a: `asciutto`, t: `Va bene. Ma una stima di settore non è il mio numero. La voglio con i miei dati, appena li avete.` },
                  { think: `Non ho bluffato, ma ho promesso un numero che non è suo. Dovrò correggermi.` },
                ],
              }),
            ch('c', 0, `Gli do una cifra con sicurezza: il 15% del venduto in ribassi evitabili. L’avrei comunque inserita nel business case, e così non perdo tempo.`,
              `Una cifra improvvisata, detta con sicurezza, diventa un impegno scritto nel blocco di un CFO. Quando il suo controllo di gestione la confronterà con i dati veri, a essere messa in discussione non sarà la stima ma la tua parola.`,
              { t: -6, v: -2, r: 8 }, {
                integ: -3, next: 'RET',
                say: `Dottor Longo, siamo intorno al quindici per cento del venduto. È una cifra prudente, e l’avevo già inserita nel business case.`,
                react: [
                  { w: 'longo', a: `subito`, t: `Mi dica da dove viene quel quindici. Perché il mio ufficio controllo non l’ha mai calcolato.` },
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
        hit: (d) => !((d.flags.criteriaSet && d.mp.has('E')) || (d.mp.has('M') && d.mp.has('E') && d.m.value >= 65)),
        dp: -0.32, dpProt: -0.03,
        hitText: `Alle 08:40 Rossi gira a Longo una lettera di Vertex: contratto triennale a prezzo dimezzato, implementazione gratuita e un direttore di progetto dedicato “da subito, a Milano”. Non hai criteri firmati né un numero di Longo da opporre, e la discussione torna in un minuto su ciò che si legge nella prima riga del foglio: il prezzo. Longo chiede “una settimana per confrontare”, e a fine trimestre una settimana è tutto.`,
        protText: `Alle 08:40 Rossi gira a Longo una lettera di Vertex: contratto triennale a prezzo dimezzato e un direttore di progetto dedicato. Longo la legge con davanti i criteri e i numeri che avete concordato, poi te la inoltra con una riga sola: “Questo non risponde a niente di quello che abbiamo scritto”. Perdi la mattinata, non il trimestre.`,
      },
      {
        id: 'rossi_stallo', title: `Rossi manda tutto in stallo`, kind: 'neg', w: 2,
        hit: (d) => !d.flags.coexist && !d.flags.rossiOpen && !(d.mp.has('Dc') && d.m.control >= 60),
        dp: -0.30, dpProt: -0.03,
        hitText: `Il giorno della firma Rossi dichiara il fermo IT per la stagione: nessuna nuova integrazione fino a gennaio, “per proteggere i negozi”. Non c’è un piano a ondate che gli lasci il comando dell’architettura, quindi la sua obiezione non trova una risposta pronta. Longo non firma contro il parere del suo CIO: rimanda a gennaio.`,
        protText: `Il giorno della firma Rossi dichiara il fermo IT per la stagione. Ma con lui hai costruito un percorso che non lo lascia solo: la prima ondata rientra nel perimetro che ha approvato e il suo team guida l’architettura. Telefona a Longo non per fermare il contratto ma per ricordargli la sequenza. A te scrive due righe: “Si parte come concordato.”`,
      },
      {
        id: 'vertex_incidente', title: `Un incidente di Vertex in cassa`, kind: 'pos', w: 1,
        hit: (d) => !!(d.mp.has('E') && (d.mp.has('M') || d.flags.ceoPage)),
        dp: 0.10, dpProt: 0,
        hitText: `Alle 11:15, in piena mattinata di vendite, il sistema di Vertex si blocca: casse ferme in trentuno negozi per quaranta minuti. Longo ti chiama dall’auto, senza saluti: “Sa quanto costano quaranta minuti come questi? Lei sì”. Il numero ce l’hai tu, e la tua proposta è già sulla sua scrivania.`,
        protText: `Alle 11:15 il sistema di Vertex si blocca: casse ferme in trentuno negozi per quaranta minuti. Per Lumina è una mattina storta; per te sarebbe stata l’occasione giusta, ma non hai né un numero condiviso né una strada diretta verso Longo per usarla. La notizia gli arriva dal suo CIO, con le parole di Vertex.`,
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
        M: `Silvia Conti e Andrea Longo, sulle vendite perse per rotture di stock`,
        I: `Silvia Conti (COO)`,
        Dc: `Alberto Rossi (CIO) e Silvia Conti`,
        Co: `Vertex Systems, in casa da nove anni`,
      },
      risk: `Il rischio vero è che Rossi, con la proroga di Vertex in mano, porti Longo a “valutare con calma” fino a stagione inoltrata, oppure che il pilota resti senza criteri firmati.`,
      custom: [
        {
          id: 'criteri_firmati', if: () => true, has: (d) => !!d.flags.criteriaSet,
          q: `I criteri del pilota li ha firmati Longo, o li avete concordati con Silvia e basta?`,
          evidence: `Li ha firmati Longo: quattro criteri, accuratezza delle giacenze, rotture, tempi di inventario e adozione, con la sua firma in calce. Ho la scansione.`,
          honest: `Li abbiamo concordati con Silvia. Longo li conosce ma non li ha firmati. Finché non ho la sua firma, per me è un Best Case.`,
          bluff: `Sì, firmati da Longo. Sono quattro criteri chiari e ci siamo.`,
          vague: `Longo è informato e i criteri sono in linea con quello che chiedeva Silvia.`,
          react: {
            evidence: `Questo è un fatto. Soglie scritte e la firma di chi paga: è quello che trasforma un pilota in un contratto. Girami la scansione e la agganciamo al CRM.`,
            honest: `Grazie per la chiarezza. Allora il compito di questa settimana è farli firmare a Longo: senza quella riga un pilota è un favore. Ti tengo in Best Case fino ad allora.`,
            bluffCaught: `Nel CRM non c’è nessuna scansione e nessuna nota di Longo. Non mi serve che il deal sia perfetto: mi serve che sia vero.`,
            bluffPassed: `Ok, lo scrivo. Ma voglio la scansione entro venerdì. Se non arriva, lo sposto io.`,
            vague: `“Informato” non è “firmato”. Rifammi la domanda giovedì, con un documento in mano.`,
          },
        },
        {
          id: 'rossi_bordo', if: () => true, has: (d) => !!d.flags.coexist && d.m.trust >= 60,
          q: `Rossi: alleato, neutrale o lealista di Vertex con buone maniere? Mi serve una frase sua, non la tua lettura.`,
          evidence: `Alleato è troppo, ma ha messo il suo team a guidare l’architettura: tre architetti nel piano a ondate, con nome e cognome. Ti giro la sua mail.`,
          honest: `Neutrale, nel migliore dei casi. Ha detto che la coesistenza è “un’idea che può difendere”, ma non ha scritto niente. Lo tratto come Best Case finché non ho una riga sua.`,
          bluff: `È con noi: sull’integrazione ragiona come uno sponsor interno e ci ha già dato l’ok tecnico.`,
          vague: `Rossi è un professionista, e se il progetto è giusto non si metterà di traverso.`,
          react: {
            evidence: `Con nomi e un team assegnato, è un sì vero. Lo segno così e lo ripetiamo davanti a Longo.`,
            honest: `Giusta etichetta: neutrale è un progresso, non un sì. Ti sposto in Best Case e ti aiuto a portarlo al passo dopo.`,
            bluffCaught: `L’ultima nota su Rossi, nel tuo CRM, è “cordiale”. Non vedo nessun “ok tecnico”. Ripartiamo dai fatti.`,
            bluffPassed: `Va bene, lo scrivo. Ma voglio una mail di Rossi con quelle parole, e la voglio prima del giorno della firma.`,
            vague: `“Non si metterà di traverso” è la frase di chi non ha mai visto un CIO bloccare un contratto a una settimana dalla firma. Dammi un fatto.`,
          },
        },
        {
          id: 'ondate_contratto', if: () => true, has: (d) => d.mp.has('Dp') && d.mp.has('P'),
          q: `Il piano a ondate è scritto nel contratto, con date e pagamenti, o è un’intesa a voce?`,
          evidence: `È nel contratto: quaranta negozi prima del Black Friday, gli altri a gennaio, con i pagamenti legati alle ondate. Ho la bozza condivisa con il legale di Lumina.`,
          honest: `È nella mia proposta e Longo l’ha letta. Nel contratto non c’è ancora: lo porto al legale questa settimana. Intanto lo tengo in Best Case.`,
          bluff: `Sì, è già nel contratto: ondate, date e pagamenti sono scritti e il legale ha la bozza.`,
          vague: `Il piano a ondate è condiviso, Longo ne ha parlato e mi pare convinto.`,
          react: {
            evidence: `Date, ondate, pagamenti e il legale che ha già la bozza. È così che si ferma un rinvio prima che nasca.`,
            honest: `Bene che tu lo dica. Una proposta letta non è un contratto: porta la clausola al legale di Lumina e aggiorna il CRM con la data.`,
            bluffCaught: `Ho guardato la bozza nell’area condivisa: dell’ondata non c’è traccia. Parliamone con calma, ma da adesso lo tratto come Best Case.`,
            bluffPassed: `Ok. Mandami la bozza con le ondate scritte entro domani. Se non c’è, ci riaggiorniamo.`,
            vague: `“Longo ne ha parlato” non è una clausola. Se non c’è un paragrafo, il piano non esiste.`,
          },
        },
      ],
    },

    endings: {
      won: `Longo firma il lunedì. Prima del Black Friday i primi quaranta negozi sono sul nuovo sistema; a gennaio gli altri. Il primo sabato di dicembre, al flagship, Ilaria cerca il 42 in blu notte: il sistema dice due, sullo scaffale ce ne sono due. Rossi, in riunione: “La coesistenza ha funzionato meglio di quanto temessi”. Detto da lui, è un applauso.`,
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
