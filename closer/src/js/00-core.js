/* CLOSER · core: namespace, RNG, utilità, storage, costanti di gioco */
(function (g) {
  'use strict';
  const CL = (g.CL = g.CL || {});
  CL.VERSION = '1.0.0';
  CL.scenarios = [];
  /* famiglia = tema professionale; tier 'real' = casi da campo (carriera), 'guided' = casi didattici (allenamento e, in mancanza d'altro, carriera);
     label/teaser = ciò che il giocatore vede PRIMA del verdetto (il title didattico svela la trappola e compare solo a fine trattativa) */
  CL.registerScenario = (s) => {
    s.family = s.family || s.id;
    s.tier = s.tier || 'guided';
    s.label = s.label || s.client || s.title;
    s.teaser = s.teaser || s.brief || s.hook;
    CL.scenarios.push(s);
    return s;
  };

  /* Costruttore compatto di una scelta.
     fx: t=Fiducia v=Valore u=Urgenza c=Controllo r=Rischio d=Sconto(pt) l=Listino(k€)
     ex: mp[] mpx[] set{} integ jolly next(id|fn) */
  CL.ch = (id, q, t, r, fx, ex) => Object.assign({ id, q, t, r, fx: fx || {} }, ex || {});

  CL.clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* valore o funzione dello stato */
  CL.val = (x, d) => (typeof x === 'function' ? x(d) : x);

  /* cast generico disponibile in ogni scena */
  CL.GENERIC_CAST = {
    marta: { name: 'Marta Colombo', role: 'La tua Sales Director', hue: 348 },
    davide: { name: 'Davide Ferri', role: 'Tuo Solution Engineer', hue: 175 },
    collega: { name: 'Collega di team', role: 'Account Executive senior', hue: 60 },
    cliente: { name: 'Il tuo contatto', role: 'Cliente', hue: 210 },
  };
  CL.castOf = (sc, key) => (sc && sc.cast && sc.cast[key]) || CL.GENERIC_CAST[key] || { name: key, role: '', hue: 210 };
  CL.shortName = (s) => String(s || '').replace(/\s*\(.*$/, '');
  CL.playerName = '';
  /* segnaposto nei testi mostrati: {nome} {client} {contact} {buyer} */
  /* "S.p.A.." → "S.p.A." (il punto della ragione sociale più quello della frase); i puntini di sospensione restano */
  CL.tidyDots = (t) => (typeof t === 'string' ? t.replace(/([^.])\.\.(?!\.)/g, '$1.').replace(/(^|[.!?…]\s+)collega\b/g, (m, a) => a + 'Collega') : t);
  CL.fmt = (s, sc) => {
    if (typeof s !== 'string' || s.indexOf('{') < 0) return s;
    const ppl = (sc && sc.fc && sc.fc.people) || {};
    return CL.tidyDots(s.replace(/\{(nome|client|contact|buyer)\}/g, (m, k) => {
      if (k === 'nome') return CL.playerName || 'collega';
      if (k === 'client') return sc ? sc.client : 'il cliente';
      if (k === 'contact') return CL.shortName(ppl.C) || 'il tuo contatto';
      if (k === 'buyer') return CL.shortName(ppl.E) || 'chi decide';
      return m;
    }));
  };

  /* mulberry32 */
  CL.rng = (seed) => {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  CL.shuffle = (arr, rnd) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* storage difensivo: può essere assente o lanciare (finestra privata, iframe) */
  CL.store = {
    key: 'closer.v1',
    read() {
      try { const v = JSON.parse(g.localStorage.getItem(CL.store.key)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
    },
    write(obj) {
      try { g.localStorage.setItem(CL.store.key, JSON.stringify(obj)); return true; } catch (e) { return false; }
    },
    patch(fn) { const o = CL.store.read(); try { fn(o); } catch (e) { /* dati salvati in forma inattesa: si ignorano */ } CL.store.write(o); return o; },
  };

  /* k€ → stringa italiana */
  CL.fmtK = (k) => {
    const n = Math.round(k);
    if (Math.abs(n) >= 1000) return '€' + (n / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    return '€' + n.toLocaleString('it-IT') + 'k';
  };
  CL.pct = (p) => Math.round(p * 100) + '%';

  /* Meter (nomi e descrizioni per UI) */
  CL.METERS = [
    { k: 'trust', fx: 't', label: 'Fiducia', desc: 'Quanto il buying committee ti considera credibile e affidabile.' },
    { k: 'value', fx: 'v', label: 'Valore', desc: 'Quanto il business case è concreto, quantificato e condiviso.' },
    { k: 'urgency', fx: 'u', label: 'Urgenza', desc: 'Quanto costa al cliente non decidere adesso (compelling event).' },
    { k: 'control', fx: 'c', label: 'Controllo', desc: 'Quanto conosci e guidi il processo: chi decide, come, quando.' },
    { k: 'risk', fx: 'r', label: 'Rischio', desc: 'Variabili aperte che possono far deragliare il deal. Più basso è meglio.' },
  ];

  /* MEDDPICC */
  CL.MP = [
    { k: 'M', label: 'Metrics', full: 'Metrics: l’impatto è quantificato e condiviso con il cliente.' },
    { k: 'E', label: 'Eco. Buyer', full: 'Economic Buyer: hai accesso a chi ha davvero il budget e il potere di firma.' },
    { k: 'Dc', label: 'Criteri', full: 'Decision Criteria: sai con quali criteri verrà scelta la soluzione.' },
    { k: 'Dp', label: 'Processo', full: 'Decision Process: sai chi approva, in quali passaggi e con quali tempi.' },
    { k: 'P', label: 'Paper', full: 'Paper Process: conosci e hai avviato l’iter legale, acquisti e firma.' },
    { k: 'I', label: 'Pain', full: 'Identify Pain: il problema è reale, urgente e riconosciuto dal cliente.' },
    { k: 'C', label: 'Champion', full: 'Champion: qualcuno con influenza e credibilità vende internamente per te.' },
    { k: 'Co', label: 'Compet.', full: 'Competition: conosci le alternative, incluso il “non fare nulla”.' },
  ];

  /* Jolly */
  CL.JOLLY = {
    se: { name: 'Sales Engineer', short: 'SE', desc: 'Davide Ferri, il tuo Solution Engineer: demo, architettura, risposte tecniche credibili.', start: 3 },
    exec: { name: 'Executive Sponsor', short: 'Exec', desc: 'Marta, la tua Sales Director, apre porte a livello C. Serve un pari grado, non un sostituto del champion.', start: 2 },
    ref: { name: 'Referenza cliente', short: 'Ref', desc: 'Un cliente soddisfatto parla con il prospect, da pari a pari.', start: 2 },
    desk: { name: 'Deal Desk', short: 'Desk', desc: 'Giulia, del Deal Desk, struttura offerte e approva sconti legati a contropartite.', start: 2 },
    legal: { name: 'Legal fast-track', short: 'Legal', desc: 'Il legale di Nexora lavora le tue clausole in priorità.', start: 1 },
  };

  CL.CONFIG = {
    energy: 12,
    weeks: 13,
    quota: 1700,          // k€ di nuovo ACV
    repStart: 70,
    rate1: 0.06,          // commissione fino al 100% della quota
    rate2: 0.12,          // acceleratore oltre il 100%
    lepDefault: 15,       // soglia di sconto autonoma (%)
  };

  CL.QUALITY = [
    { q: 0, label: 'Errore', cls: 'q0' },
    { q: 1, label: 'Discutibile', cls: 'q1' },
    { q: 2, label: 'Solida', cls: 'q2' },
    { q: 3, label: 'Da closer', cls: 'q3' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
