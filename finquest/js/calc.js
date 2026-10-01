/* FinQuest — generatori di esercizi di calcolo finanziario.
   Ogni generatore: (r, d) => { q, a, f, w:[valori errati tipici], e, u } oppure { mcq:{q, correct, wrong, e} }
   r = RNG, d = difficoltà 0..1 */
(function (root) {
  const FQ = (root.FQ = root.FQ || {});
  const U = FQ.U;
  const K = (FQ.Calc = {});

  // formattatori: [funzione, unità mostrata nel campo, decimali per la tolleranza]
  const F = {
    eur0: [(x) => U.eur(Math.round(x)), '€', 0],
    eur2: [(x) => U.eur(x, 2), '€', 2],
    pct1: [(x) => U.nf(x, 1) + '%', '%', 1],
    pct2: [(x) => U.nf(x, 2) + '%', '%', 2],
    sp1: [(x) => U.signPct(x, 1), '%', 1],
    num1: [(x) => U.nf(x, 1), '', 1],
    num2: [(x) => U.nf(x, 2), '', 2],
    int: [(x) => U.nf(Math.round(x), 0), '', 0],
    x1: [(x) => U.nf(x, 1) + 'x', 'x', 1],
    bp: [(x) => U.nf(Math.round(x), 0) + ' pb', 'pb', 0],
    yrs: [(x) => U.nf(x, 1) + ' anni', 'anni', 1],
    mln: [(x) => U.nf(x, x < 100 ? 1 : 0) + ' mln €', 'mln €', 1],
    mld: [(x) => U.nf(x, 1) + ' mld €', 'mld €', 1],
    pip: [(x) => U.nf(Math.round(x), 0) + ' pip', 'pip', 0],
    usd: [(x) => U.nf(x, 2) + ' $', '$', 2],
    eurs: [(x) => (x > 0 ? '+' : x < 0 ? '−' : '') + U.eur(Math.abs(x), 2), '€', 2],
  };
  K.F = F;

  const G = (K.gen = {});
  const pick = (r, a) => r.pick(a);

  G.pct = (r, d) => {
    const A = r.step(20, 200, d < 0.4 ? 10 : 1);
    const ch = pick(r, [-40, -25, -20, -15, -10, -5, 5, 8, 10, 12, 15, 20, 25, 30, 50]) + (d > 0.5 ? r.int(-3, 3) / 2 : 0);
    const B = U.round(A * (1 + ch / 100), 2);
    const a = ((B - A) / A) * 100;
    return { q: `Un titolo passa da ${U.eur(A, 2)} a ${U.eur(B, 2)}. Qual è la variazione percentuale?`, a, f: 'sp1', w: [((B - A) / B) * 100, -a, B - A], e: `(${U.nf(B, 2)} − ${U.nf(A, 2)}) ÷ ${U.nf(A, 2)} × 100 = ${U.signPct(a, 1)}. Si divide sempre per il valore di partenza.` };
  };

  G.pp = (r, d) => {
    const X = pick(r, [1000, 5000, 10000, 20000]), i = pick(r, [2, 3, 4, 5]), n = pick(r, [5, 10, 15, 20]);
    const a = X / (1 + i / 100) ** n;
    return { q: `Tieni ${U.eur(X)} fermi sotto il materasso per ${n} anni con inflazione media del ${i}% annuo. Quanto vale il loro potere d’acquisto in euro di oggi?`, a, f: 'eur0', w: [X * (1 + i / 100) ** n, X - X * i / 100, X * (1 - (2 * i * n) / 100)], e: `${U.eur(X)} ÷ (1 + ${i}%)^${n} ≈ ${U.eur(Math.round(a))}. Il valore nominale resta uguale, quello reale scende.` };
  };

  G.budget = (r, d) => {
    const N = r.step(1200, 3200, 100);
    const which = pick(r, [['bisogni (necessità)', 0.5], ['desideri', 0.3], ['risparmio e investimenti', 0.2]]);
    const a = N * which[1];
    return { q: `Il tuo stipendio netto è ${U.eur(N)}. Con la regola 50/30/20, quanto destini ogni mese a ${which[0]}?`, a, f: 'eur0', w: [N * 0.5, N * 0.3, N * 0.2, N * 0.1].filter((x) => x !== a), e: `50% bisogni, 30% desideri, 20% risparmio: ${U.eur(N)} × ${which[1] * 100}% = ${U.eur(a)}. È una linea guida, da adattare.` };
  };

  G.goal = (r, d) => {
    const G0 = r.step(1200, 12000, 600), M = pick(r, [6, 8, 10, 12, 18, 24]);
    const a = G0 / M;
    return { q: `Vuoi mettere da parte ${U.eur(G0)} in ${M} mesi (senza contare interessi). Quanto devi risparmiare al mese?`, a, f: 'eur0', w: [G0 / (M / 12) / 12 * 1.5, G0 / 12, G0 * M / 100], e: `${U.eur(G0)} ÷ ${M} mesi = ${U.eur(a, 0)} al mese. Automatizza il bonifico appena arriva lo stipendio.` };
  };

  G.emerg = (r, d) => {
    const S = r.step(900, 2500, 50), M = pick(r, [3, 4, 6]);
    const a = S * M;
    return { q: `Le tue spese essenziali sono ${U.eur(S)} al mese. Vuoi un fondo di emergenza pari a ${M} mesi. Di quanto hai bisogno?`, a, f: 'eur0', w: [S * 12, S * (M + 2), S * M / 2], e: `${U.eur(S)} × ${M} = ${U.eur(a)}. Va tenuto liquido e facilmente accessibile, non investito in strumenti volatili.` };
  };

  G.simple = (r, d) => {
    const C0 = r.step(1000, 20000, 500), i = pick(r, [1, 1.5, 2, 2.5, 3, 4, 5]), n = r.int(2, 8);
    const I = C0 * i / 100 * n;
    if (r.chance(0.5)) return { q: `Investi ${U.eur(C0)} all’interesse semplice del ${U.nf(i, 1)}% annuo per ${n} anni. Quanti interessi ricevi in totale?`, a: I, f: 'eur0', w: [C0 * (1 + i / 100) ** n - C0, C0 * i / 100, C0 + I], e: `Interesse semplice = capitale × tasso × anni = ${U.eur(C0)} × ${U.nf(i, 1)}% × ${n} = ${U.eur(I)}.` };
    return { q: `Depositi ${U.eur(C0)} al ${U.nf(i, 1)}% annuo semplice per ${n} anni. Quanto avrai alla fine (capitale + interessi)?`, a: C0 + I, f: 'eur0', w: [I, C0 * (1 + i / 100) ** n * 1.03, C0 + C0 * i / 100], e: `Montante = capitale × (1 + tasso × anni) = ${U.eur(C0)} × (1 + ${U.nf(i / 100 * n, 3)}) = ${U.eur(C0 + I)}.` };
  };

  G.compound = (r, d) => {
    if (d > 0.55 && r.chance(0.5)) {
      const P = pick(r, [50, 100, 150, 200, 300]), i = pick(r, [4, 5, 6, 7]), n = pick(r, [10, 15, 20, 25, 30]);
      const m = i / 100 / 12, N = n * 12;
      const a = P * (((1 + m) ** N - 1) / m);
      return { q: `Versi ${U.eur(P)} al mese per ${n} anni, con un rendimento del ${i}% annuo (capitalizzazione mensile). Quanto avrai circa alla fine?`, a, f: 'eur0', w: [P * N, P * N * (1 + i / 100 * n), a * 1.4], e: `Valore futuro di una rendita: rata × ((1+i)^N − 1) ÷ i ≈ ${U.eur(Math.round(a))}, di cui versati ${U.eur(P * N)}. Il resto è interesse composto.` };
    }
    const C0 = r.step(1000, 20000, 1000), i = pick(r, [2, 3, 4, 5, 6, 7, 8]), n = pick(r, [5, 10, 15, 20]);
    const a = C0 * (1 + i / 100) ** n;
    return { q: `Investi ${U.eur(C0)} al ${i}% annuo composto per ${n} anni. Quanto vale l’investimento alla fine?`, a, f: 'eur0', w: [C0 * (1 + i / 100 * n), C0 * (1 + i / 100) ** (n - 1), C0 * i / 100 * n], e: `${U.eur(C0)} × (1 + ${i}%)^${n} ≈ ${U.eur(Math.round(a))}. Con l’interesse semplice avresti ${U.eur(C0 * (1 + i / 100 * n))}.` };
  };

  G.r72 = (r, d) => {
    const i = pick(r, [2, 3, 4, 6, 8, 9, 12]);
    const a = 72 / i;
    return { q: `Con un rendimento del ${i}% annuo composto, in quanti anni circa raddoppia il capitale? (regola del 72)`, a, f: 'yrs', w: [100 / i, i * 2, 50 / i], e: `Regola del 72: 72 ÷ ${i} ≈ ${U.nf(a, 1)} anni. È un’approssimazione che funziona bene per tassi tra 2% e 15%.` };
  };

  G.realret = (r, d) => {
    const n = pick(r, [3, 4, 5, 6, 7, 8]), i = pick(r, [1, 2, 3, 4, 5]);
    if (d > 0.5) {
      const a = ((1 + n / 100) / (1 + i / 100) - 1) * 100;
      return { q: `Rendimento nominale ${n}%, inflazione ${i}%. Qual è il rendimento reale esatto (formula di Fisher)?`, a, f: 'pct2', w: [n + i, (n - i) * 1.25, n / i], e: `(1 + ${n}%) ÷ (1 + ${i}%) − 1 = ${U.pct(a, 2)}. L’approssimazione ${n} − ${i} = ${n - i}% è vicina ma leggermente più alta.` };
    }
    const a = n - i;
    return { q: `Un investimento rende il ${n}% nominale, l’inflazione è al ${i}%. Qual è il rendimento reale approssimato?`, a, f: 'pct1', w: [n + i, n * i, i], e: `Rendimento reale ≈ nominale − inflazione = ${n}% − ${i}% = ${a}%. È ciò che aumenta davvero il tuo potere d’acquisto.` };
  };

  G.cpi = (r, d) => {
    const A = U.round(r.range(100, 120), 1), i = r.int(10, 80) / 10;
    const B = U.round(A * (1 + i / 100), 1);
    const a = ((B - A) / A) * 100;
    return { q: `L’indice dei prezzi al consumo passa da ${U.nf(A, 1)} a ${U.nf(B, 1)} in un anno. Qual è il tasso di inflazione?`, a, f: 'pct1', w: [B - A, ((B - A) / B) * 100 * 1.4, a * 2], e: `(${U.nf(B, 1)} − ${U.nf(A, 1)}) ÷ ${U.nf(A, 1)} = ${U.pct(a, 1)}. L’inflazione è la variazione % dell’indice, non la differenza in punti.` };
  };

  G.loan = (r, d) => {
    const P = r.step(5000, 30000, 1000), i = pick(r, [4, 5, 6, 7, 8, 9]), n = pick(r, [3, 4, 5]);
    const m = i / 100 / 12, N = n * 12;
    const rata = (P * m) / (1 - (1 + m) ** -N);
    if (r.chance(0.5) || d < 0.3) return { q: `Prestito di ${U.eur(P)} al ${i}% annuo (TAN), rimborsato in ${n} anni con rate mensili costanti. Quanto paghi di interessi in totale, circa?`, a: rata * N - P, f: 'eur0', w: [P * i / 100 * n, P * i / 100, (rata * N - P) * 2], e: `Rata ≈ ${U.eur(rata, 2)} × ${N} rate = ${U.eur(Math.round(rata * N))}; meno il capitale = ${U.eur(Math.round(rata * N - P))} di interessi. Confronta sempre il TAEG, che include anche le spese.` };
    return { q: `Prestito di ${U.eur(P)} al ${i}% annuo in ${n} anni, rate mensili costanti (ammortamento alla francese). Qual è circa la rata mensile?`, a: rata, f: 'eur2', w: [P / N, (P * (1 + i / 100 * n)) / N * 1.1, rata * 1.3], e: `Rata = P × i ÷ (1 − (1+i)^−N) con i mensile = ${U.nf(i / 12, 3)}% e N = ${N}: ≈ ${U.eur(rata, 2)}.` };
  };

  G.bollo = (r, d) => {
    const X = r.step(5000, 100000, 2500);
    const a = X * 0.002;
    return { q: `Hai ${U.eur(X)} in un dossier titoli. L’imposta di bollo è dello 0,2% annuo. Quanto paghi all’anno?`, a, f: 'eur0', w: [X * 0.02, X * 0.0002, 34.2], e: `${U.eur(X)} × 0,2% = ${U.eur(a)}. Si paga ogni anno sul valore degli strumenti, a prescindere dai guadagni.` };
  };

  G.wret = (r, d) => {
    const w1 = pick(r, [20, 30, 40, 50, 60, 70, 80]);
    const r1 = pick(r, [6, 7, 8, 9]), r2 = pick(r, [2, 3, 4]);
    const a = (w1 * r1 + (100 - w1) * r2) / 100;
    return { q: `Portafoglio: ${w1}% azioni con rendimento atteso ${r1}% e ${100 - w1}% obbligazioni con rendimento atteso ${r2}%. Rendimento atteso del portafoglio?`, a, f: 'pct1', w: [(r1 + r2) / 2 === a ? r1 : (r1 + r2) / 2, r1 + r2, r1 * w1 / 100], e: `Media ponderata: ${w1}% × ${r1}% + ${100 - w1}% × ${r2}% = ${U.pct(a, 1)}. Il rischio, invece, non è una semplice media: dipende dalle correlazioni.` };
  };

  G.mcap = (r, d) => {
    const N = r.step(20, 900, 10), P = U.round(r.range(2, 80), d < 0.4 ? 0 : 2);
    const a = N * P;
    return { q: `Un’azienda ha ${U.nf(N)} milioni di azioni in circolazione, quotate ${U.eur(P, d < 0.4 ? 0 : 2)}. Qual è la capitalizzazione di mercato?`, a, f: 'mln', w: [a / 10, a * 10, N + P], e: `Capitalizzazione = azioni × prezzo = ${U.nf(N)} mln × ${U.nf(P, 2)} € = ${U.nf(a, 0)} mln €.` };
  };

  G.fx = (r, d) => {
    const rate = U.round(r.range(1.02, 1.22), 2);
    const X = r.step(500, 10000, 500);
    if (r.chance(0.5)) return { q: `Il cambio EUR/USD è ${U.nf(rate, 2)} (1 € = ${U.nf(rate, 2)} $). Quanti dollari ottieni con ${U.eur(X)}?`, a: X * rate, f: 'usd', w: [X / rate, X, X * (rate - 1)], e: `${U.nf(X)} € × ${U.nf(rate, 2)} = ${U.nf(X * rate, 2)} $.` };
    return { q: `Il cambio EUR/USD è ${U.nf(rate, 2)}. Quanti euro servono per comprare un’azione che costa ${U.nf(X / 10, 0)} $?`, a: X / 10 / rate, f: 'eur2', w: [(X / 10) * rate, X / 10, (X / 10) / rate * 1.2], e: `${U.nf(X / 10)} $ ÷ ${U.nf(rate, 2)} = ${U.eur(X / 10 / rate, 2)}.` };
  };

  G.ordercost = (r, d) => {
    if (d > 0.5 && r.chance(0.5)) {
      const fee = pick(r, [5, 7, 9, 10, 12]), X = pick(r, [500, 1000, 1500, 2000]);
      const a = (2 * fee / X) * 100;
      return { q: `Investi ${U.eur(X)} e paghi ${U.eur(fee)} di commissione sia in acquisto sia in vendita. Quanto deve salire il titolo solo per coprire i costi?`, a, f: 'pct2', w: [fee / X * 100, 2 * fee / 100, a * 2], e: `Costi totali ${U.eur(2 * fee)} ÷ ${U.eur(X)} = ${U.pct(a, 2)}. Sulle piccole cifre le commissioni fisse pesano moltissimo.` };
    }
    const F0 = pick(r, [0, 2, 3, 5]), c = pick(r, [0.1, 0.15, 0.19, 0.2, 0.25]), Nn = r.step(10, 300, 10), P = r.step(5, 60, 1);
    const a = F0 + (c / 100) * Nn * P;
    return { q: `Il broker applica ${U.eur(F0)} fissi + ${U.nf(c, 2)}% sul controvalore. Compri ${Nn} azioni a ${U.eur(P)}. Quanto paghi di commissioni?`, a, f: 'eur2', w: [F0 + c * Nn * P / 10, (c / 100) * Nn * P, F0 + c * Nn], e: `Controvalore = ${Nn} × ${P} = ${U.eur(Nn * P)}; commissioni = ${U.eur(F0)} + ${U.nf(c, 2)}% × ${U.eur(Nn * P)} = ${U.eur(a, 2)}.` };
  };

  G.spread = (r, d) => {
    const mid = U.round(r.range(5, 60), 2), sp = pick(r, [0.01, 0.02, 0.05, 0.1, 0.2]);
    const bid = U.round(mid - sp / 2, 3), ask = U.round(mid + sp / 2, 3);
    if (r.chance(0.5)) {
      const Nn = r.step(100, 2000, 100);
      const a = Nn * (ask - bid);
      return { q: `Bid ${U.nf(bid, 3)} €, ask ${U.nf(ask, 3)} €. Compri ${U.nf(Nn)} azioni e le rivendi subito. Quanto perdi a causa dello spread (senza commissioni)?`, a, f: 'eur2', w: [a / 2, Nn * ask / 100, a * 10], e: `Compri all’ask e vendi al bid: ${U.nf(Nn)} × (${U.nf(ask, 3)} − ${U.nf(bid, 3)}) = ${U.eur(a, 2)}. Lo spread è un costo nascosto.` };
    }
    const a = ((ask - bid) / ((ask + bid) / 2)) * 100;
    return { q: `Bid ${U.nf(bid, 3)} €, ask ${U.nf(ask, 3)} €. Qual è lo spread in percentuale del prezzo medio?`, a, f: 'pct2', w: [(ask - bid) * 100, a * 10, a / 2], e: `(ask − bid) ÷ prezzo medio = ${U.nf(ask - bid, 3)} ÷ ${U.nf((ask + bid) / 2, 3)} = ${U.pct(a, 2)}. Titoli liquidi hanno spread più stretti.` };
  };

  G.limitfill = (r, d) => {
    const P = r.step(20, 80, 1);
    const kind = pick(r, d < 0.4 ? ['buylim', 'selllim'] : ['buylim', 'selllim', 'stop', 'stop']);
    if (kind === 'buylim') {
      const L = P - r.int(1, 3), touched = r.chance(0.5);
      const low = touched ? L - r.int(0, 1) - 0.4 : L + 0.6;
      return { mcq: { q: `Il titolo vale ${P} €. Inserisci un ordine di acquisto con limite ${L} €. Durante la seduta il minimo è ${U.nf(low, 2)} € e la chiusura ${P} €. Cosa succede?`, correct: touched ? `Eseguito a ${L} € o meno` : 'Non eseguito: il prezzo non è sceso al limite', wrong: [touched ? 'Non eseguito: il prezzo non è sceso al limite' : `Eseguito a ${L} € o meno`, `Eseguito al prezzo di chiusura di ${P} €`], e: 'Un ordine limite di acquisto si esegue solo al prezzo limite o a uno migliore (più basso). Protegge il prezzo, ma non garantisce l’esecuzione.' } };
    }
    if (kind === 'selllim') {
      const L = P + r.int(1, 3), touched = r.chance(0.5);
      const hi = touched ? L + 0.4 : L - 0.6;
      return { mcq: { q: `Possiedi un titolo a ${P} €. Metti un ordine di vendita con limite ${L} €. Il massimo della seduta è ${U.nf(hi, 2)} €. Cosa succede?`, correct: touched ? `Venduto a ${L} € o più` : 'Non venduto: il prezzo non ha raggiunto il limite', wrong: [touched ? 'Non venduto: il prezzo non ha raggiunto il limite' : `Venduto a ${L} € o più`, `Venduto subito a ${P} €`], e: 'Un limite di vendita si esegue al prezzo indicato o a uno migliore (più alto).' } };
    }
    const S = P - r.int(2, 4), gap = S - r.int(2, 3);
    return { mcq: { q: `Hai uno stop loss (ordine stop a mercato) a ${S} €. Dopo una brutta notizia il titolo apre direttamente a ${gap} €. A che prezzo vieni venduto, circa?`, correct: `Intorno a ${gap} €: lo stop diventa ordine al mercato`, wrong: [`Esattamente a ${S} €, garantito`, 'Non vieni venduto perché il prezzo non è passato da ' + S + ' €'], e: 'Lo stop si attiva quando il prezzo tocca o supera il livello e diventa un ordine al mercato: con un gap l’esecuzione può essere molto peggiore. Uno stop-limit evita il prezzo peggiore, ma rischia di non essere eseguito.' } };
  };

  G.index = (r, d) => {
    const w = pick(r, [60, 70, 75, 80]);
    const x = pick(r, [2, 3, 4, 5, 6]), y = pick(r, [2, 4, 5, 8, 10]);
    const a = (w * x - (100 - w) * y) / 100;
    return { q: `Un indice ponderato per capitalizzazione contiene due titoli: A pesa il ${w}%, B il ${100 - w}%. Oggi A sale del ${x}% e B scende del ${y}%. Variazione dell’indice?`, a, f: 'sp1', w: [(x - y) / 2, x - y, (w * x + (100 - w) * y) / 100], e: `${w}% × (+${x}%) + ${100 - w}% × (−${y}%) = ${U.signPct(a, 1)}. Nei pesi per capitalizzazione contano molto le società grandi.` };
  };

  G.divy = (r, d) => {
    const P = r.step(8, 80, 1), D = U.round(P * pick(r, [0.015, 0.02, 0.03, 0.04, 0.05, 0.06]), 2);
    const a = (D / P) * 100;
    return { q: `Un’azione costa ${U.eur(P)} e paga un dividendo annuo di ${U.eur(D, 2)}. Qual è il dividend yield?`, a, f: 'pct1', w: [(P / D), D * 10, a * 2], e: `Dividendo ÷ prezzo = ${U.nf(D, 2)} ÷ ${P} = ${U.pct(a, 1)}. Un rendimento molto alto può segnalare un prezzo crollato o un dividendo a rischio.` };
  };

  G.payout = (r, d) => {
    const E = U.round(r.range(1, 6), 2), pr = pick(r, [30, 40, 50, 60, 75, 90]);
    const D = U.round(E * pr / 100, 2);
    const a = (D / E) * 100;
    return { q: `Utile per azione ${U.eur(E, 2)}, dividendo per azione ${U.eur(D, 2)}. Qual è il payout ratio?`, a, f: 'pct1', w: [(E / D) * 100, 100 - a, a / 2], e: `Payout = dividendo ÷ utile = ${U.nf(D, 2)} ÷ ${U.nf(E, 2)} = ${U.pct(a, 1)}. Sopra il 100% l’azienda distribuisce più di quanto guadagna.` };
  };

  G.split = (r, d) => {
    const P = r.step(60, 600, 20), S = pick(r, [2, 3, 4, 5, 10]), Nn = r.step(10, 100, 10);
    const np = U.round(P / S, 2);
    return { mcq: { q: `Hai ${Nn} azioni a ${U.eur(P)}. La società fa uno split ${S}:1. Cosa possiedi subito dopo (in teoria)?`, correct: `${Nn * S} azioni a ${U.eur(np, 2)}`, wrong: [`${Nn} azioni a ${U.eur(np, 2)}`, `${Nn * S} azioni a ${U.eur(P)}`, `${Math.round(Nn / S)} azioni a ${U.eur(P * S)}`], e: `Lo split moltiplica le azioni per ${S} e divide il prezzo per ${S}: il valore totale (${U.eur(Nn * P)}) non cambia.` } };
  };

  G.eps = (r, d) => {
    const Nn = r.step(50, 500, 10), E = U.round(r.range(0.5, 6), 2);
    const Ut = U.round(Nn * E, 0);
    const a = Ut / Nn;
    return { q: `Utile netto ${U.nf(Ut)} mln €, azioni in circolazione ${U.nf(Nn)} mln. Qual è l’utile per azione (EPS)?`, a, f: 'eur2', w: [Nn / Ut, a * 10, a / 2], e: `EPS = utile netto ÷ numero di azioni = ${U.nf(Ut)} ÷ ${U.nf(Nn)} = ${U.eur(a, 2)}.` };
  };

  G.pe = (r, d) => {
    const E = U.round(r.range(0.8, 6), 2), pe = r.int(6, 35);
    const P = U.round(E * pe, 2);
    if (d > 0.55 && r.chance(0.5)) {
      const tgt = r.int(10, 20);
      return { q: `Un’azienda ha EPS di ${U.eur(E, 2)}. Se il mercato le assegnasse un P/E di ${tgt}, quale sarebbe il prezzo coerente?`, a: E * tgt, f: 'eur2', w: [tgt / E, E + tgt, E * tgt / 10], e: `Prezzo = P/E × EPS = ${tgt} × ${U.nf(E, 2)} = ${U.eur(E * tgt, 2)}.` };
    }
    const a = P / E;
    return { q: `Un’azione quota ${U.eur(P, 2)} e ha un utile per azione di ${U.eur(E, 2)}. Qual è il P/E?`, a, f: 'x1', w: [E / P * 100, a * 2, P - E], e: `P/E = prezzo ÷ EPS = ${U.nf(P, 2)} ÷ ${U.nf(E, 2)} ≈ ${U.nf(a, 1)}. Paghi circa ${U.nf(a, 0)} euro per ogni euro di utile annuo.` };
  };

  G.votes = (r, d) => {
    const T = pick(r, [1, 2, 4, 5, 10]) * 1e6, Nn = r.step(10000, 200000, 5000);
    const a = (Nn / T) * 100;
    return { q: `Possiedi ${U.nf(Nn)} azioni ordinarie di una società con ${U.nf(T)} azioni ordinarie totali. Che percentuale dei voti in assemblea hai?`, a, f: 'pct2', w: [a * 10, a / 10, Nn / 1000], e: `${U.nf(Nn)} ÷ ${U.nf(T)} = ${U.pct(a, 2)}. Un’azione ordinaria = un voto (salvo azioni a voto maggiorato o speciali).` };
  };

  G.totret = (r, d) => {
    const P0 = r.step(10, 100, 1), ch = pick(r, [-10, -5, 0, 4, 6, 8, 12]), D = U.round(P0 * pick(r, [0.02, 0.03, 0.04, 0.05]), 2);
    const P1 = U.round(P0 * (1 + ch / 100), 2);
    const a = ((P1 - P0 + D) / P0) * 100;
    return { q: `Compri un’azione a ${U.eur(P0)}. Dopo un anno vale ${U.eur(P1, 2)} e hai incassato un dividendo di ${U.eur(D, 2)}. Qual è il rendimento totale lordo?`, a, f: 'sp1', w: [((P1 - P0) / P0) * 100, (D / P0) * 100, ((P1 - P0 - D) / P0) * 100], e: `(prezzo finale − iniziale + dividendi) ÷ iniziale = (${U.nf(P1, 2)} − ${P0} + ${U.nf(D, 2)}) ÷ ${P0} = ${U.signPct(a, 1)}.` };
  };

  G.cagr = (r, d) => {
    const A = r.step(5000, 20000, 1000), n = pick(r, [3, 5, 8, 10]), g = pick(r, [3, 4, 5, 6, 7, 8, 10]);
    const B = Math.round(A * (1 + g / 100) ** n / 10) * 10;
    const a = ((B / A) ** (1 / n) - 1) * 100;
    return { q: `Un investimento passa da ${U.eur(A)} a ${U.eur(B)} in ${n} anni. Qual è il rendimento medio annuo composto (CAGR)?`, a, f: 'pct1', w: [((B / A - 1) / n) * 100, (B / A - 1) * 100, a * 1.5], e: `CAGR = (finale ÷ iniziale)^(1/${n}) − 1 = ${U.pct(a, 1)}. La media semplice (${U.pct(((B / A - 1) / n) * 100, 1)}) sovrastima perché ignora la capitalizzazione.` };
  };

  G.coupon = (r, d) => {
    const N = pick(r, [1000, 5000, 10000, 20000, 50000]), c = pick(r, [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    if (r.chance(0.5)) return { q: `Obbligazione con valore nominale ${U.eur(N)} e cedola annua del ${U.nf(c, 1)}%, pagata semestralmente. Quanto incassi lordo a ogni stacco?`, a: N * c / 200, f: 'eur2', w: [N * c / 100, N * c / 400, c * 100 / 2], e: `Cedola annua = ${U.eur(N)} × ${U.nf(c, 1)}% = ${U.eur(N * c / 100, 2)}; semestrale = metà, ${U.eur(N * c / 200, 2)}.` };
    return { q: `Hai ${U.eur(N)} nominali di un’obbligazione con cedola annua del ${U.nf(c, 1)}%. Quanto incassi lordo in un anno?`, a: N * c / 100, f: 'eur2', w: [N * c / 200, N * c / 1000, c * 100], e: `${U.eur(N)} × ${U.nf(c, 1)}% = ${U.eur(N * c / 100, 2)} lordi all’anno. La cedola si calcola sul nominale, non sul prezzo.` };
  };

  G.cy = (r, d) => {
    const c = pick(r, [2, 3, 4, 5, 6]), P = r.step(80, 115, 1);
    const a = (c / P) * 100;
    return { q: `Un’obbligazione paga una cedola del ${c}% sul nominale di 100 e quota ${P}. Qual è il rendimento corrente (cedola ÷ prezzo)?`, a, f: 'pct2', w: [c, (c / 100) * P, c * P / 1000], e: `${c} ÷ ${P} × 100 = ${U.pct(a, 2)}. Prezzo ${P < 100 ? 'sotto' : P > 100 ? 'sopra' : 'alla'} pari: rendimento corrente ${P < 100 ? 'più alto' : P > 100 ? 'più basso' : 'uguale'} della cedola.` };
  };

  G.bondprice = (r, d) => {
    const D = pick(r, [2, 3, 5, 7, 8, 10, 15]), dy = pick(r, [0.25, 0.5, 0.75, 1, 1.5]) * (r.chance(0.7) ? 1 : -1);
    const a = -D * dy;
    return { q: `Un’obbligazione ha duration modificata ${D}. I tassi di mercato ${dy > 0 ? 'salgono' : 'scendono'} di ${U.nf(Math.abs(dy), 2)} punti percentuali. Variazione approssimata del prezzo?`, a, f: 'sp1', w: [-a, -dy, a / 10], e: `ΔPrezzo ≈ −duration × Δtassi = −${D} × ${dy > 0 ? '+' : '−'}${U.nf(Math.abs(dy), 2)}% = ${U.signPct(a, 1)}. Prezzi e rendimenti si muovono in direzione opposta.` };
  };

  G.ytm = (r, d) => {
    const P = U.round(r.range(96, 99.6), 2);
    const six = r.chance(0.5);
    const a = ((100 - P) / P) * (six ? 2 : 1) * 100;
    return { q: `Compri un BOT a ${six ? '6' : '12'} mesi a ${U.nf(P, 2)} e a scadenza ricevi 100. Qual è il rendimento lordo annualizzato, circa?`, a, f: 'pct2', w: [100 - P, ((100 - P) / P) * 100 * (six ? 1 : 2), (100 - P) / 100 * 100 * 0.7], e: `Guadagno ${U.nf(100 - P, 2)} su ${U.nf(P, 2)} = ${U.pct(((100 - P) / P) * 100, 2)}${six ? ' in 6 mesi, × 2 per annualizzare' : ' in 12 mesi'} ≈ ${U.pct(a, 2)}. Il BOT non ha cedola: il rendimento è lo scarto di emissione.` };
  };

  G.tax = (r, d) => {
    const v = pick(r, ['az', 'btp', 'net']);
    const G0 = r.step(500, 20000, 100);
    if (v === 'btp') return { q: `Ricevi ${U.eur(G0)} lordi di interessi da titoli di Stato italiani. Quanto paghi di imposta (aliquota agevolata)?`, a: G0 * 0.125, f: 'eur2', w: [G0 * 0.26, G0 * 0.2, G0 * 0.1], e: `Titoli di Stato italiani e white list: 12,5% → ${U.eur(G0 * 0.125, 2)}. Le aliquote possono cambiare con la normativa.` };
    if (v === 'net') return { q: `Vendi un ETF azionario con una plusvalenza lorda di ${U.eur(G0)}. Aliquota 26%. Quanto ti resta netto?`, a: G0 * 0.74, f: 'eur2', w: [G0 * 0.26, G0 * 0.875, G0], e: `${U.eur(G0)} × (1 − 26%) = ${U.eur(G0 * 0.74, 2)}. Le minusvalenze compensabili possono ridurre l’imponibile (con regole precise).` };
    return { q: `Vendi azioni con una plusvalenza di ${U.eur(G0)}. Con aliquota del 26%, quanta imposta paghi?`, a: G0 * 0.26, f: 'eur2', w: [G0 * 0.125, G0 * 0.74, G0 * 0.2], e: `${U.eur(G0)} × 26% = ${U.eur(G0 * 0.26, 2)}. Si tassa solo il guadagno realizzato, non il capitale.` };
  };

  G.bps = (r, d) => {
    const y2 = U.round(r.range(1.5, 3.5), 2), sp = r.int(60, 260);
    const y1 = U.round(y2 + sp / 100, 2);
    const a = (y1 - y2) * 100;
    return { q: `Il BTP decennale rende ${U.pct(y1, 2)}, il Bund decennale ${U.pct(y2, 2)}. Qual è lo spread in punti base?`, a, f: 'bp', w: [a / 100, a / 10, (y1 + y2) * 100], e: `(${U.nf(y1, 2)} − ${U.nf(y2, 2)}) = ${U.nf(y1 - y2, 2)} punti percentuali = ${Math.round(a)} pb (1 punto base = 0,01%).` };
  };

  G.eloss = (r, d) => {
    const E = r.step(10000, 100000, 5000), p = pick(r, [1, 2, 3, 5, 8, 10]), R = pick(r, [20, 30, 40, 50]);
    const a = E * (p / 100) * (1 - R / 100);
    return { q: `Esposizione ${U.eur(E)}, probabilità di default ${p}%, recupero atteso in caso di default ${R}%. Qual è la perdita attesa?`, a, f: 'eur0', w: [E * p / 100, E * (1 - R / 100), E * p / 100 * R / 100], e: `Perdita attesa = esposizione × PD × (1 − recupero) = ${U.eur(E)} × ${p}% × ${100 - R}% = ${U.eur(a)}.` };
  };

  G.ter = (r, d) => {
    if (d > 0.4 && r.chance(0.6)) {
      const C0 = pick(r, [10000, 20000, 50000]), g = pick(r, [5, 6, 7]), n = pick(r, [20, 25, 30]);
      const lo = pick(r, [0.2, 0.25, 0.3]), hi = pick(r, [1.5, 1.8, 2, 2.2]);
      const a = C0 * ((1 + (g - lo) / 100) ** n - (1 + (g - hi) / 100) ** n);
      return { q: `${U.eur(C0)} per ${n} anni con rendimento lordo del ${g}% annuo. Differenza finale circa tra un ETF con costi ${U.nf(lo, 2)}% e un fondo con costi ${U.nf(hi, 1)}%?`, a, f: 'eur0', w: [C0 * (hi - lo) / 100 * n, C0 * (hi - lo) / 100, a * 2], e: `Valori finali: ${U.eur(Math.round(C0 * (1 + (g - lo) / 100) ** n))} contro ${U.eur(Math.round(C0 * (1 + (g - hi) / 100) ** n))}. I costi si compongono come i rendimenti: differenza ≈ ${U.eur(Math.round(a))}.` };
    }
    const C0 = r.step(5000, 100000, 5000), t = pick(r, [0.07, 0.2, 0.5, 1, 1.5, 2]);
    return { q: `Hai ${U.eur(C0)} in un fondo con TER del ${U.nf(t, 2)}% annuo. Quanto paghi di costi di gestione in un anno, circa?`, a: C0 * t / 100, f: 'eur0', w: [C0 * t / 1000, C0 * t / 10, t * 100], e: `${U.eur(C0)} × ${U.nf(t, 2)}% = ${U.eur(C0 * t / 100)}. Il TER viene prelevato dal valore del fondo, non lo vedi addebitato.` };
  };

  G.rebal = (r, d) => {
    const tgt = pick(r, [50, 60, 70]);
    const T = r.step(20000, 100000, 10000);
    const drift = pick(r, [8, 10, 12, 15]);
    const A = (T * (tgt + drift)) / 100, B = T - A;
    const a = A - (T * tgt) / 100;
    return { q: `Obiettivo ${tgt}% azioni / ${100 - tgt}% obbligazioni. Oggi hai ${U.eur(A)} in azioni e ${U.eur(B)} in obbligazioni. Quanti euro di azioni vendere (per comprare obbligazioni) per tornare all’obiettivo?`, a, f: 'eur0', w: [a * 2, A * (100 - tgt) / 100, A - B], e: `Totale ${U.eur(T)} × ${tgt}% = ${U.eur(T * tgt / 100)} target; ${U.eur(A)} − ${U.eur(T * tgt / 100)} = ${U.eur(a)} da spostare.` };
  };

  G.pac = (r, d) => {
    const amt = pick(r, [100, 200, 300]);
    let ps;
    for (let k = 0; k < 30; k++) { ps = [r.step(8, 20, 1), r.step(8, 20, 1), r.step(8, 20, 1)]; if (new Set(ps).size === 3) break; }
    const q = ps.map((p) => amt / p);
    const a = (amt * 3) / U.sum(q);
    return { q: `PAC: investi ${U.eur(amt)} al mese. Le quote costano ${ps.map((p) => U.eur(p)).join(', ')} nei tre mesi. Qual è il prezzo medio di carico?`, a, f: 'eur2', w: [U.mean(ps), Math.max(...ps), Math.min(...ps)], e: `Quote comprate: ${q.map((x) => U.nf(x, 2)).join(' + ')} = ${U.nf(U.sum(q), 2)}. ${U.eur(amt * 3)} ÷ ${U.nf(U.sum(q), 2)} = ${U.eur(a, 2)}: sotto la media dei prezzi (${U.eur(U.mean(ps), 2)}), perché compri più quote quando costano meno.` };
  };

  G.sma = (r, d) => {
    const p = Array.from({ length: 5 }, () => r.step(40, 60, d < 0.5 ? 1 : 0.5));
    const a = U.mean(p);
    return { q: `Chiusure degli ultimi 5 giorni: ${p.map((x) => U.nf(x, 1)).join(' · ')} €. Quanto vale la media mobile semplice a 5 giorni?`, a, f: 'eur2', w: [p[4], (p[0] + p[4]) / 2, U.sum(p) / 4], e: `Somma ${U.nf(U.sum(p), 1)} ÷ 5 = ${U.eur(a, 2)}. Domani si toglie la chiusura più vecchia e si aggiunge la nuova.` };
  };

  G.fib = (r, d) => {
    const A = r.step(40, 100, 10), B = A + r.step(20, 80, 10), lv = pick(r, [38.2, 50, 61.8]);
    const a = B - (B - A) * lv / 100;
    return { q: `Un titolo sale da ${U.eur(A)} a ${U.eur(B)}. A che prezzo si trova il ritracciamento del ${U.nf(lv, 1)}%?`, a, f: 'eur2', w: [A + (B - A) * lv / 100, B * (1 - lv / 100), (A + B) / 2 + (lv === 50 ? 10 : 0)], e: `Massimo − (massimo − minimo) × ${U.nf(lv, 1)}% = ${B} − ${B - A} × ${U.nf(lv / 100, 3)} = ${U.eur(a, 2)}. È una zona da osservare, non un livello magico.` };
  };

  G.rr = (r, d) => {
    const E = r.step(20, 100, 1), risk = pick(r, [1, 2, 2.5, 4, 5]), k = pick(r, [1.5, 2, 2.5, 3, 4]);
    const S = U.round(E - risk, 2), T = U.round(E + risk * k, 2);
    return { q: `Entri a ${U.eur(E, 2)}, stop loss a ${U.eur(S, 2)}, obiettivo a ${U.eur(T, 2)}. Quante volte il guadagno potenziale supera la perdita potenziale (rapporto rendimento/rischio)?`, a: k, f: 'x1', w: [1 / k, k + 1, (T - S) / risk], e: `Guadagno ${U.nf(T - E, 2)} € ÷ rischio ${U.nf(E - S, 2)} € = ${U.nf(k, 1)}. Con ${U.nf(k, 1)}:1 basta avere ragione in meno della metà dei casi per non perdere.` };
  };

  G.possize = (r, d) => {
    const C0 = pick(r, [5000, 10000, 20000, 30000, 50000]), rp = pick(r, [0.5, 1, 1.5, 2]), E = r.step(20, 120, 1), dist = pick(r, [1, 2, 2.5, 4, 5]);
    const S = E - dist;
    const a = Math.floor((C0 * rp / 100) / dist);
    return { q: `Capitale ${U.eur(C0)}, vuoi rischiare al massimo l’${U.nf(rp, 1)}% per operazione. Entri a ${U.eur(E)} con stop a ${U.eur(S, 2)}. Quante azioni puoi comprare al massimo?`, a, f: 'int', u: 'azioni', w: [Math.floor(C0 / E), Math.floor(C0 * rp / 100 / E), a * 2], e: `Rischio massimo = ${U.eur(C0 * rp / 100)}; rischio per azione = ${U.eur(dist, 2)}; ${U.nf(C0 * rp / 100)} ÷ ${U.nf(dist, 2)} = ${a} azioni.` };
  };

  G.lev = (r, d) => {
    const L = pick(r, [2, 5, 10, 20, 30]), x = pick(r, [1, 2, 3, 5]) * (r.chance(0.5) ? 1 : -1);
    const a = L * x;
    return { q: `Apri una posizione con leva ${L}:1. Il sottostante si muove del ${U.signPct(x, 0)}. Qual è il risultato in percentuale sul margine versato (senza costi)?`, a, f: 'sp1', w: [x, x / L, -a], e: `Con leva ${L}:1 il risultato sul margine è ${L} × ${U.signPct(x, 0)} = ${U.signPct(a, 0)}. ${a <= -100 ? 'Il margine è azzerato: scatta la chiusura forzata.' : 'La leva moltiplica in entrambe le direzioni.'}` };
  };

  G.short = (r, d) => {
    const Nn = r.step(50, 500, 50), P1 = r.step(20, 80, 1), ch = pick(r, [-20, -10, -5, 5, 10, 25]);
    const P2 = U.round(P1 * (1 + ch / 100), 2);
    const a = Nn * (P1 - P2);
    return { q: `Vendi allo scoperto ${Nn} azioni a ${U.eur(P1)} e le ricompri a ${U.eur(P2, 2)}. Profitto o perdita (senza costi)?`, a, f: 'eurs', w: [-a, Nn * P2 - Nn * P1 * 0.5, a / 2], e: `Short: guadagni se il prezzo scende. ${Nn} × (${P1} − ${U.nf(P2, 2)}) = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a), 2)}.${a < 0 ? ' Al rialzo la perdita teorica non ha limite.' : ''}` };
  };

  G.fut = (r, d) => {
    const m = pick(r, [1, 5, 10, 25, 50]), A = r.step(20000, 40000, 100), pts = r.step(-600, 600, 50) || 150;
    const a = m * pts;
    return { q: `Future su indice con moltiplicatore ${m} € per punto. Compri a ${U.nf(A)} punti e chiudi a ${U.nf(A + pts)}. P&L per contratto?`, a, f: 'eurs', w: [-a, pts, a * 10], e: `${m} € × (${U.nf(A + pts)} − ${U.nf(A)}) = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a))}. I margini giornalieri regolano subito guadagni e perdite.` };
  };

  G.call = (r, d) => {
    const K0 = r.step(40, 120, 5), p = r.step(1, 8, 0.5), S = K0 + r.step(-15, 25, 1);
    const a = Math.max(S - K0, 0) - p;
    return { q: `Hai comprato una call con strike ${U.eur(K0)} pagando un premio di ${U.eur(p, 2)}. A scadenza il sottostante vale ${U.eur(S)}. Profitto o perdita per azione?`, a, f: 'eurs', w: [S - K0, Math.max(S - K0, 0) + p, -p === a ? S - K0 - p - 1 : -p], e: `Valore a scadenza = max(${S} − ${K0}; 0) = ${U.eur(Math.max(S - K0, 0))}; meno premio ${U.eur(p, 2)} = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a), 2)}. La perdita massima è il premio.` };
  };

  G.put = (r, d) => {
    const K0 = r.step(40, 120, 5), p = r.step(1, 8, 0.5), S = K0 + r.step(-25, 15, 1);
    const a = Math.max(K0 - S, 0) - p;
    return { q: `Hai comprato una put con strike ${U.eur(K0)} pagando ${U.eur(p, 2)} di premio. A scadenza il sottostante vale ${U.eur(S)}. Profitto o perdita per azione?`, a, f: 'eurs', w: [K0 - S, Math.max(K0 - S, 0) + p, -p === a ? K0 - S - p + 1 : -p], e: `Valore = max(${K0} − ${S}; 0) = ${U.eur(Math.max(K0 - S, 0))}; meno premio = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a), 2)}. Una put protegge dai ribassi come un’assicurazione.` };
  };

  G.optbe = (r, d) => {
    const K0 = r.step(40, 150, 5), p = r.step(1, 10, 0.5), call = r.chance(0.5);
    const a = call ? K0 + p : K0 - p;
    return { q: `${call ? 'Call' : 'Put'} con strike ${U.eur(K0)} e premio ${U.eur(p, 2)}. Qual è il prezzo di pareggio (break-even) a scadenza?`, a, f: 'eur2', w: [call ? K0 - p : K0 + p, K0, K0 + 2 * p], e: call ? `Call: strike + premio = ${K0} + ${U.nf(p, 2)} = ${U.eur(a, 2)}.` : `Put: strike − premio = ${K0} − ${U.nf(p, 2)} = ${U.eur(a, 2)}.` };
  };

  G.delta = (r, d) => {
    const de = pick(r, [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]), mv = pick(r, [1, 2, 3, 4, 5]) * (r.chance(0.6) ? 1 : -1);
    const a = de * mv;
    return { q: `Una call ha delta ${U.nf(de, 2)}. Il sottostante ${mv > 0 ? 'sale' : 'scende'} di ${U.eur(Math.abs(mv))}. Di quanto varia circa il prezzo dell’opzione?`, a, f: 'eurs', w: [mv, mv / de, -a], e: `ΔOpzione ≈ delta × Δsottostante = ${U.nf(de, 2)} × ${mv > 0 ? '+' : '−'}${Math.abs(mv)} = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a), 2)}. Il delta cambia a sua volta (gamma).` };
  };

  G.pip = (r, d) => {
    const A = U.round(r.range(1.04, 1.18), 4), p = r.step(10, 120, 5) * (r.chance(0.5) ? 1 : -1);
    const B = U.round(A + p / 10000, 4);
    if (d > 0.5 && r.chance(0.5)) {
      const lots = pick(r, [0.1, 0.5, 1, 2]);
      const a = p * 10 * lots;
      return { q: `EUR/USD passa da ${U.nf(A, 4)} a ${U.nf(B, 4)}. Hai comprato ${U.nf(lots, 1)} lotti standard (100.000 € ciascuno). Profitto o perdita in dollari?`, a, f: 'usd', w: [p * lots, p * 100 * lots, -a], e: `${Math.abs(p)} pip × 10 $ per pip per lotto × ${U.nf(lots, 1)} = ${a >= 0 ? '+' : '−'}${U.nf(Math.abs(a), 2)} $.` };
    }
    return { q: `EUR/USD passa da ${U.nf(A, 4)} a ${U.nf(B, 4)}. Di quanti pip si è mosso?`, a: Math.abs(p), f: 'pip', w: [Math.abs(p) / 10, Math.abs(p) * 10, Math.abs(p) + 10], e: `Per EUR/USD un pip è la quarta cifra decimale (0,0001): ${U.nf(Math.abs(B - A), 4)} = ${Math.abs(p)} pip.` };
  };

  G.fxret = (r, d) => {
    const x = pick(r, [5, 8, 10, 12, 15, 20]), y = pick(r, [3, 5, 8, 10]) * (r.chance(0.7) ? 1 : -1);
    const a = ((1 + x / 100) * (1 - y / 100) - 1) * 100;
    return { q: `Un’azione USA sale del ${x}% in dollari, ma nello stesso periodo il dollaro ${y > 0 ? 'perde' : 'guadagna'} il ${Math.abs(y)}% contro l’euro. Rendimento in euro circa?`, a, f: 'sp1', w: [x, x + y, ((1 + x / 100) * (1 + y / 100) - 1) * 100], e: `(1 + ${x}%) × (1 ${y > 0 ? '−' : '+'} ${Math.abs(y)}%) − 1 ≈ ${U.signPct(a, 1)}. Il cambio può aggiungere o togliere rendimento.` };
  };

  G.gdp = (r, d) => {
    const n = U.round(r.range(1, 7), 1), i = U.round(r.range(0.5, 4), 1);
    const a = n - i;
    return { q: `Il PIL nominale cresce del ${U.pct(n, 1)}, il deflatore dei prezzi del ${U.pct(i, 1)}. Crescita reale approssimata?`, a, f: 'sp1', w: [n + i, n, i - n], e: `Crescita reale ≈ nominale − inflazione = ${U.nf(n, 1)} − ${U.nf(i, 1)} = ${U.signPct(a, 1)}.` };
  };

  G.unemp = (r, d) => {
    const Fl = r.step(20, 30, 0.5), u = U.round(r.range(4, 12), 1);
    const D0 = U.round(Fl * u / 100, 2);
    const a = (D0 / Fl) * 100;
    return { q: `Forza lavoro ${U.nf(Fl, 1)} milioni di persone, disoccupati ${U.nf(D0, 2)} milioni. Tasso di disoccupazione?`, a, f: 'pct1', w: [(D0 / (Fl + D0)) * 100 * 1.3, D0 * 10, a * 2], e: `Disoccupati ÷ forza lavoro (occupati + disoccupati) = ${U.nf(D0, 2)} ÷ ${U.nf(Fl, 1)} = ${U.pct(a, 1)}. Chi non cerca lavoro non è nella forza lavoro.` };
  };

  G.margin = (r, d) => {
    const R = r.step(100, 2000, 10), m = pick(r, [3, 5, 8, 10, 12, 15, 20, 25]);
    const Ut = U.round(R * m / 100, 1);
    if (d > 0.5 && r.chance(0.5)) {
      const eb = pick(r, [15, 20, 25, 30, 35]);
      const EB = U.round(R * eb / 100, 1);
      return { q: `Ricavi ${U.nf(R)} mln €, EBITDA ${U.nf(EB, 1)} mln €. Qual è il margine EBITDA?`, a: (EB / R) * 100, f: 'pct1', w: [(R / EB), (EB / R) * 1000 / 100 * 2, 100 - eb], e: `EBITDA ÷ ricavi = ${U.nf(EB, 1)} ÷ ${U.nf(R)} = ${U.pct(eb, 1)}. Misura la redditività operativa prima di ammortamenti, interessi e tasse.` };
    }
    return { q: `Ricavi ${U.nf(R)} mln €, utile netto ${U.nf(Ut, 1)} mln €. Qual è il margine netto?`, a: (Ut / R) * 100, f: 'pct1', w: [R / Ut, m * 2, 100 - m], e: `Utile netto ÷ ricavi = ${U.nf(Ut, 1)} ÷ ${U.nf(R)} = ${U.pct(m, 1)}: su 100 € di vendite restano ${m} € di utile.` };
  };

  G.debteq = (r, d) => {
    const E = r.step(100, 1000, 10), k = pick(r, [0.3, 0.5, 0.8, 1, 1.5, 2, 3]);
    const D0 = U.round(E * k, 0);
    return { q: `Debiti finanziari ${U.nf(D0)} mln €, patrimonio netto ${U.nf(E)} mln €. Rapporto debito/patrimonio (D/E)?`, a: D0 / E, f: 'num2', w: [E / D0, (D0 + E) / E, D0 / (D0 + E)], e: `${U.nf(D0)} ÷ ${U.nf(E)} = ${U.nf(D0 / E, 2)}. Più è alto, più l’azienda dipende dai creditori: va confrontato con il settore.` };
  };

  G.icr = (r, d) => {
    const I = r.step(5, 60, 1), k = pick(r, [1.5, 2, 3, 5, 8, 12]);
    const EB = I * k;
    return { q: `EBIT ${U.nf(EB)} mln €, interessi passivi ${U.nf(I)} mln €. Quante volte l’EBIT copre gli interessi?`, a: k, f: 'x1', w: [I / EB, k * 2, k - 1], e: `Copertura = EBIT ÷ interessi = ${U.nf(EB)} ÷ ${U.nf(I)} = ${U.nf(k, 1)}. Valori bassi (sotto 2-3) segnalano fragilità se gli utili calano.` };
  };

  G.roe = (r, d) => {
    const E = r.step(200, 2000, 50), roe = pick(r, [5, 8, 10, 12, 15, 18, 22, 25]);
    const Ut = U.round(E * roe / 100, 0);
    return { q: `Utile netto ${U.nf(Ut)} mln €, patrimonio netto ${U.nf(E)} mln €. Qual è il ROE?`, a: (Ut / E) * 100, f: 'pct1', w: [E / Ut, (Ut / E) * 100 / 2, (Ut / (E * 2)) * 100 + 5], e: `ROE = utile netto ÷ patrimonio netto = ${U.pct((Ut / E) * 100, 1)}. Attenzione: un ROE alto può dipendere da molto debito.` };
  };

  G.pb = (r, d) => {
    const B = U.round(r.range(5, 40), 2), k = pick(r, [0.6, 0.8, 1, 1.5, 2, 3, 5]);
    const P = U.round(B * k, 2);
    return { q: `Un’azione quota ${U.eur(P, 2)}; il patrimonio netto per azione è ${U.eur(B, 2)}. Qual è il P/B?`, a: P / B, f: 'x1', w: [B / P, P - B, (P / B) * 2], e: `P/B = prezzo ÷ patrimonio per azione = ${U.nf(P / B, 1)}. Sotto 1 il mercato valuta l’azienda meno del suo patrimonio contabile.` };
  };

  G.evebitda = (r, d) => {
    const Cp = r.step(500, 5000, 100), D0 = r.step(-200, 2000, 100), EB = r.step(80, 800, 10);
    const a = (Cp + D0) / EB;
    return { q: `Capitalizzazione ${U.nf(Cp)} mln €, debito netto ${U.nf(D0)} mln €, EBITDA ${U.nf(EB)} mln €. Quanto vale EV/EBITDA?`, a, f: 'x1', w: [Cp / EB, (Cp - D0) / EB, EB / (Cp + D0) * 100], e: `EV = capitalizzazione + debito netto = ${U.nf(Cp + D0)} mln; ÷ EBITDA ${U.nf(EB)} = ${U.nf(a, 1)}x. Confronta aziende con debiti diversi meglio del P/E.` };
  };

  G.fcf = (r, d) => {
    const O = r.step(50, 800, 10), Kp = r.step(20, 600, 10);
    const a = O - Kp;
    return { q: `Flusso di cassa operativo ${U.nf(O)} mln €, investimenti in capitale fisso (capex) ${U.nf(Kp)} mln €. Quanto è il free cash flow?`, a, f: 'mln', w: [O + Kp, O, Kp - O], e: `FCF = cassa operativa − capex = ${U.nf(O)} − ${U.nf(Kp)} = ${U.nf(a)} mln €. È la cassa disponibile per dividendi, riacquisti o riduzione del debito.` };
  };

  G.dcf = (r, d) => {
    if (d > 0.55 && r.chance(0.5)) {
      const F0 = r.step(10, 200, 5), rr = pick(r, [7, 8, 9, 10]), g = pick(r, [1, 2, 3]);
      const a = F0 / ((rr - g) / 100);
      return { q: `Free cash flow atteso il prossimo anno ${U.nf(F0)} mln €, crescita perpetua ${g}%, tasso di sconto ${rr}%. Valore dell’azienda con il modello di Gordon?`, a, f: 'mln', w: [F0 / (rr / 100), F0 / ((rr + g) / 100), F0 * (rr - g)], e: `Valore = FCF ÷ (r − g) = ${U.nf(F0)} ÷ ${U.nf((rr - g) / 100, 2)} = ${U.nf(a)} mln €. Piccole variazioni di r o g cambiano molto il risultato.` };
    }
    const F0 = r.step(1000, 20000, 500), rr = pick(r, [3, 5, 6, 8, 10]), n = pick(r, [3, 5, 8, 10]);
    const a = F0 / (1 + rr / 100) ** n;
    return { q: `Riceverai ${U.eur(F0)} tra ${n} anni. Con un tasso di sconto del ${rr}% annuo, quanto valgono oggi?`, a, f: 'eur0', w: [F0 * (1 + rr / 100) ** n, F0 * (1 - rr / 100 * n), F0 / (1 + rr / 100)], e: `Valore attuale = ${U.eur(F0)} ÷ (1 + ${rr}%)^${n} ≈ ${U.eur(Math.round(a))}. Un euro domani vale meno di un euro oggi.` };
  };

  G.dd = (r, d) => {
    const x = pick(r, [10, 20, 25, 30, 40, 50, 60, 75]);
    const a = (x / (100 - x)) * 100;
    return { q: `Un portafoglio perde il ${x}%. Di quanto deve salire per tornare al valore iniziale?`, a, f: 'pct1', u: '%', w: [x, x * 1.5 === a ? x * 2 : x * 1.5, 100 - x], e: `Recupero = ${x} ÷ (100 − ${x}) = +${U.nf(a, 1)}%. Più la perdita è profonda, più il recupero è difficile: −50% richiede +100%.` };
  };

  G.sharpe = (r, d) => {
    const R = pick(r, [5, 6, 7, 8, 9, 10, 12]), rf = pick(r, [1, 2, 3]), s = pick(r, [4, 5, 8, 10, 12, 15, 20]);
    const a = (R - rf) / s;
    return { q: `Rendimento annuo ${R}%, tasso privo di rischio ${rf}%, volatilità ${s}%. Qual è lo Sharpe ratio?`, a, f: 'num2', w: [R / s, (R + rf) / s, s / (R - rf)], e: `Sharpe = (rendimento − risk free) ÷ volatilità = (${R} − ${rf}) ÷ ${s} = ${U.nf(a, 2)}. Misura il rendimento extra per unità di rischio.` };
  };

  G.ev = (r, d) => {
    const w = pick(r, [30, 35, 40, 45, 50, 55, 60]), Gn = r.step(100, 400, 20), L0 = r.step(60, 300, 20);
    const a = (w / 100) * Gn - (1 - w / 100) * L0;
    return { q: `Una strategia vince il ${w}% delle volte con guadagno medio ${U.eur(Gn)} e perde il resto delle volte con perdita media ${U.eur(L0)}. Valore atteso per operazione?`, a, f: 'eurs', w: [Gn - L0, (w / 100) * Gn, (Gn + L0) / 2 * (w / 100)], e: `${w}% × ${Gn} − ${100 - w}% × ${L0} = ${a >= 0 ? '+' : '−'}${U.eur(Math.abs(a), 2)}. Conta il valore atteso, non la percentuale di vittorie.` };
  };

  G.rsicalc = (r, d) => {
    const A = U.round(r.range(0.5, 2.5), 2), B = U.round(r.range(0.5, 2.5), 2);
    const rs = A / B, a = 100 - 100 / (1 + rs);
    return { q: `Su 14 periodi il guadagno medio è ${U.nf(A, 2)} e la perdita media ${U.nf(B, 2)}. Quanto vale l’RSI? (RSI = 100 − 100 ÷ (1 + RS), RS = guadagno medio ÷ perdita media)`, a, f: 'num1', w: [rs * 50, 100 / (1 + rs), (A / (A + B)) * 100 + 8], e: `RS = ${U.nf(A, 2)} ÷ ${U.nf(B, 2)} = ${U.nf(rs, 2)}; RSI = 100 − 100 ÷ ${U.nf(1 + rs, 2)} = ${U.nf(a, 1)}.` };
  };

  G.macdcalc = (r, d) => {
    const e12 = U.round(r.range(40, 120), 2), diff = U.round(r.range(-3, 3), 2) || 0.8;
    const e26 = U.round(e12 - diff, 2);
    if (d > 0.5 && r.chance(0.5)) {
      const sig = U.round(diff - r.range(-1, 1), 2);
      const a = diff - sig;
      return { q: `MACD = ${U.nf(diff, 2)}, linea di segnale = ${U.nf(sig, 2)}. Quanto vale l’istogramma (MACD − segnale)?`, a, f: 'num2', w: [sig - diff, diff + sig, diff], e: `Istogramma = ${U.nf(diff, 2)} − ${U.nf(sig, 2)} = ${U.nf(a, 2)}. ${a > 0 ? 'Positivo: momentum in rafforzamento.' : 'Negativo: momentum in indebolimento.'}` };
    }
    return { q: `EMA a 12 periodi = ${U.nf(e12, 2)}, EMA a 26 periodi = ${U.nf(e26, 2)}. Quanto vale la linea MACD?`, a: e12 - e26, f: 'num2', w: [e26 - e12, (e12 + e26) / 2 - e26 + 1, e12 / e26], e: `MACD = EMA12 − EMA26 = ${U.nf(e12 - e26, 2)}. ${e12 > e26 ? 'Positiva: la media veloce sta sopra la lenta.' : 'Negativa: la media veloce sta sotto la lenta.'}` };
  };

  G.measured = (r, d) => {
    const Nk = r.step(40, 100, 5), h = r.step(5, 20, 1);
    const top = r.chance(0.6);
    const a = top ? Nk - h : Nk + h;
    return { q: top ? `Testa e spalle: la testa è a ${U.eur(Nk + h)}, la neckline a ${U.eur(Nk)}. Dopo la rottura al ribasso, qual è l’obiettivo teorico di prezzo?` : `Testa e spalle rovesciato: la testa è a ${U.eur(Nk - h)}, la neckline a ${U.eur(Nk)}. Dopo la rottura al rialzo, obiettivo teorico?`, a, f: 'eur2', w: [top ? Nk + h : Nk - h, Nk, top ? Nk - 2 * h : Nk + 2 * h], e: `Proiezione dell’altezza della figura (${h} €) dal punto di rottura: ${Nk} ${top ? '−' : '+'} ${h} = ${U.eur(a)}. È un riferimento indicativo, spesso non raggiunto.` };
  };

  G.ponzi = (r, d) => {
    const m = pick(r, [2, 3, 4, 5, 8, 10]);
    const a = ((1 + m / 100) ** 12 - 1) * 100;
    return { q: `Un “consulente” sui social promette il ${m}% al mese garantito. Che rendimento annuo composto implica?`, a, f: 'pct1', w: [m * 12, m, a / 2], e: `(1 + ${m}%)^12 − 1 ≈ ${U.pct(a, 0)} all’anno, garantito: nessun investimento legittimo lo offre. Promesse così sono un campanello d’allarme di truffa.` };
  };

  // ---------- costruzione dell'esercizio ----------
  // mode: 'mcq' (opzioni numeriche) o 'num' (inserimento libero)
  K.make = function (key, r, d, mode) {
    const g = G[key] || G.pct;
    const o = g(r, d);
    if (o.mcq) {
      const opts = r.shuffle([o.mcq.correct, ...o.mcq.wrong]);
      return { type: 'mcq', prompt: o.mcq.q, options: opts, answer: opts.indexOf(o.mcq.correct), exp: o.mcq.e, tag: 'calc', key };
    }
    const [fmt, unit, dec] = F[o.f];
    if (mode === 'num') {
      const step = 10 ** -dec;
      const tol = Math.max(Math.abs(o.a) * 0.015, step * 0.51, o.f === 'int' ? 0.5 : 0);
      return { type: 'num', prompt: o.q, answer: o.a, tol, unit: o.u || unit, fmt: o.f, display: fmt(o.a), exp: o.e, tag: 'calc', key };
    }
    // scarta distrattori troppo vicini alla risposta
    const near = (x) => Math.abs(x - o.a) <= Math.max(Math.abs(o.a) * 0.04, 10 ** -dec);
    const w = (o.w || []).filter((x) => isFinite(x) && !near(x));
    const no = FQ.Charts.numOpts(r, o.a, fmt, w);
    const opts = r.shuffle([no.correct, ...no.wrong]);
    return { type: 'mcq', prompt: o.q, options: opts, answer: opts.indexOf(no.correct), exp: o.e, tag: 'calc', key, mono: true };
  };
  K.KEYS = Object.keys(G);
})(typeof window !== 'undefined' ? window : globalThis);
