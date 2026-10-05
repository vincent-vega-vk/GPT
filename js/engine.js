/* ============================================================
   GEOPOLITICA 2026 — Motore di gioco (stato, economia, guerra,
   diplomazia, mercati, eventi). Nessuna dipendenza dal DOM.
   ============================================================ */
(function (root) {
  const GEO = root.GEO;
  const E = GEO.engine = {};

  // ---------- RNG deterministico -------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  let rng = Math.random;
  E.seedRng = (s) => { rng = mulberry32(s >>> 0); };
  const R = () => rng();
  const RI = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const deep = (o) => JSON.parse(JSON.stringify(o));
  E.clamp = clamp; E.rand = R; E.pick = pick;

  // ---------- Helpers di base ---------------------------------------------
  E.relKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  E.getRel = (s, a, b) => (a === b ? 100 : (s.rel[E.relKey(a, b)] ?? 0));
  E.setRel = (s, a, b, v) => { if (a !== b) s.rel[E.relKey(a, b)] = clamp(Math.round(v), -100, 100); };
  E.changeRel = (s, a, b, d) => E.setRel(s, a, b, E.getRel(s, a, b) + d);
  E.nation = (s, id) => s.nations[id];
  E.ids = (s) => Object.keys(s.nations);
  E.alive = (s) => E.ids(s).filter(id => !s.nations[id].destroyed);
  E.isPlayer = (s, id) => s.player === id;

  E.treatiesOf = (s, id, type) => s.treaties.filter(t => (t.a === id || t.b === id) && (!type || t.type === type));
  E.hasTreaty = (s, a, b, type) => s.treaties.some(t => t.type === type && ((t.a === a && t.b === b) || (t.a === b && t.b === a)));
  E.alliesOf = (s, id) => {
    const set = new Set();
    E.treatiesOf(s, id, 'difesa').forEach(t => set.add(t.a === id ? t.b : t.a));
    const n = E.nation(s, id);
    n.blocs.forEach(bl => { if (GEO.BLOCS[bl]?.defense) E.ids(s).forEach(o => { if (o !== id && s.nations[o].blocs.includes(bl)) set.add(o); }); });
    return [...set];
  };
  E.warOf = (s, a, b) => s.wars.find(w => (w.attackers.includes(a) && w.defenders.includes(b)) || (w.attackers.includes(b) && w.defenders.includes(a)));
  E.atWar = (s, a, b) => !!E.warOf(s, a, b);
  E.warsOf = (s, id) => s.wars.filter(w => w.attackers.includes(id) || w.defenders.includes(id));
  E.enemiesOf = (s, id) => {
    const set = new Set();
    E.warsOf(s, id).forEach(w => (w.attackers.includes(id) ? w.defenders : w.attackers).forEach(x => set.add(x)));
    return [...set];
  };
  E.sanctionsOn = (s, id) => s.sanctions.filter(x => x.to === id);
  E.sanctionsBy = (s, id) => s.sanctions.filter(x => x.from === id);
  E.isSanctioning = (s, from, to, type) => s.sanctions.some(x => x.from === from && x.to === to && (!type || x.type === type));
  E.capital = (n) => n.regions.find(r => r.capital);
  E.controlledRegions = (s, id) => {
    const out = [];
    E.ids(s).forEach(o => s.nations[o].regions.forEach(r => { if ((r.controller || o) === id) out.push({ owner: o, region: r }); }));
    return out;
  };
  E.occupiedShare = (n) => n.regions.filter(r => r.controller && r.controller !== n.id).reduce((a, r) => a + r.share, 0);
  E.effGdp = (s, n) => {
    let g = n.gdp * (1 - E.occupiedShare(n));
    E.ids(s).forEach(o => { if (o !== n.id) s.nations[o].regions.forEach(r => { if (r.controller === n.id) g += s.nations[o].gdp * r.share * 0.6; }); });
    return g;
  };
  E.worldGdp = (s) => E.ids(s).reduce((a, id) => a + s.nations[id].gdp, 0);
  E.avgTech = (n) => Object.values(n.tech).reduce((a, b) => a + b, 0) / Object.keys(n.tech).length;
  E.techMult = (n) => 1 + n.tech.ai * 0.03 + n.tech.hyper * 0.015 + n.tech.space * 0.02 + n.tech.cyber * 0.01;
  E.milPower = (n) => (n.army * 1.0 + n.navy * 0.5 + n.air * 0.8) * (0.5 + n.readiness / 200) * E.techMult(n) + Math.min(n.missiles, 1500) * 0.01;
  E.canReach = (s, from, to) => {
    const a = s.nations[from], b = s.nations[to];
    if (a.neighbors.includes(to) || b.neighbors.includes(from)) return { ok: true, mult: 1 };
    if ((a.seaNeighbors || []).includes(to) || (b.seaNeighbors || []).includes(from)) return { ok: a.navy >= 15, mult: 0.85 };
    // Occupazione contigua: se controlli una regione di un vicino del bersaglio
    const contig = E.ids(s).some(o => o !== from && (s.nations[o].neighbors.includes(to) || b.neighbors.includes(o)) && s.nations[o].regions.some(r => r.controller === from));
    if (contig) return { ok: true, mult: 0.9 };
    if (a.navy >= 35) return { ok: true, mult: 0.6, naval: true };
    return { ok: false, mult: 0 };
  };
  E.score = (s, n) => {
    const allies = E.alliesOf(s, n.id).length;
    const regions = E.controlledRegions(s, n.id).length;
    return Math.round(Math.sqrt(E.effGdp(s, n)) * 2 + E.milPower(n) * 0.35 + E.avgTech(n) * 9 + n.stability * 0.25 + allies * 2.5 + regions * 1.5 + Math.pow(n.nukes, 0.3) * 2);
  };
  E.ranking = (s) => E.alive(s).map(id => ({ id, score: E.score(s, s.nations[id]) })).sort((a, b) => b.score - a.score);
  E.rankOf = (s, id) => E.ranking(s).findIndex(r => r.id === id) + 1;
  E.budgetQ = (s, n) => E.effGdp(s, n) * 0.025; // bilancio discrezionale trimestrale (10% PIL annuo)
  E.dateLabel = (s) => `T${s.quarter} ${s.year}`;

  E.news = (s, text, kind = 'info', actors = []) => {
    s.news.unshift({ turn: s.turn, date: E.dateLabel(s), text, kind, actors });
    if (s.news.length > 400) s.news.length = 400;
  };

  // ---------- Nuova partita ----------------------------------------------
  E.newGame = (opts) => {
    const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    E.seedRng(seed);
    const s = {
      version: GEO.VERSION, seed, turn: 1, year: 2026, quarter: 4, maxTurns: opts.length || 40,
      player: opts.player, difficulty: opts.difficulty || 'normale',
      nations: {}, rel: {}, treaties: [], wars: [], sanctions: [], news: [], pending: [], pendingEvents: [],
      orders: [], market: null, portfolio: { holdings: {}, realized: 0 }, un: [], fallout: 0, gameOver: null,
      scoreHist: {}, intel: [], log: [],
    };
    GEO.NATIONS.forEach(src => {
      const n = deep(src);
      n.regions = src.regions.map(r => ({ name: r[0], share: r[1], capital: !!r[2], controller: r[3] || null }));
      n.readiness = 60; n.approval = 55; n.reputation = 70; n.exhaustion = 0; n.techProg = {}; n.lastGrowth = n.growth; n.prevStability = n.stability;
      n.budget = deep(GEO.AI_BUDGETS[n.persona]); n.spendMult = 1.0; n.researchFocus = 'ai'; n.tribute = null; n.suzerain = null;
      n.gdp0 = n.gdp; n.army0 = n.army; n.pop0 = n.pop;
      n.portfolioValue = 0;
      s.nations[n.id] = n;
    });
    // tecnologie migliori → focus iniziale IA variabile
    E.ids(s).forEach(id => { const n = s.nations[id]; const t = Object.entries(n.tech).sort((a, b) => a[1] - b[1]); n.researchFocus = pick(t.slice(0, 4)).map(x => x)[0]; });
    GEO.RELATIONS_SEED.forEach(([a, b, v]) => E.setRel(s, a, b, v));
    // relazioni implicite da blocchi
    const ids = E.ids(s);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = s.nations[ids[i]], b = s.nations[ids[j]], k = E.relKey(a.id, b.id);
      if (s.rel[k] === undefined) {
        let v = 0; a.blocs.forEach(bl => { if (b.blocs.includes(bl)) v += 15; });
        if (a.regime === b.regime) v += 5;
        if (a.regime !== b.regime && (a.regime === 'autocrazia' || b.regime === 'autocrazia')) v -= 8;
        s.rel[k] = clamp(v + RI(-5, 5), -100, 100);
      }
    }
    GEO.TREATIES_SEED.forEach(t => s.treaties.push({ ...t, since: 0, expires: null }));
    GEO.WARS_SEED.forEach(w => s.wars.push({ ...deep(w), gains: {}, lastAction: 0 }));
    GEO.SANCTIONS_SEED.forEach(([from, to, type]) => s.sanctions.push({ from, to, type: type || 'economiche', since: 0 }));
    // Mercati
    s.market = { indexes: {}, sectors: {}, commodities: {}, world: { price: 100, hist: [100] }, shocks: {} };
    ids.forEach(id => s.market.indexes[id] = { price: 100, hist: [100] });
    Object.keys(GEO.SECTORS).forEach(k => s.market.sectors[k] = { price: 100, hist: [100] });
    Object.keys(GEO.COMMODITIES).forEach(k => s.market.commodities[k] = { price: GEO.COMMODITIES[k].base, hist: [GEO.COMMODITIES[k].base] });
    s.worldGdp0 = E.worldGdp(s);
    s.supply0 = {}; Object.keys(GEO.COMMODITIES).forEach(c => s.supply0[c] = E.commoditySupply(s, c));
    // Bonus difficoltà
    const d = GEO.DIFFICULTY[s.difficulty];
    const p = s.nations[s.player]; p.treasury = Math.round(p.treasury * d.playerBonus); p.budget = { military: 0.3, research: 0.22, welfare: 0.25, infra: 0.15, diplomacy: 0.08 };
    ids.forEach(id => { if (id !== s.player) { const n = s.nations[id]; n.treasury = Math.round(n.treasury * d.aiBonus); } });
    E.news(s, `Scenario iniziato: ${E.dateLabel(s)}. Governi ${p.flag} ${p.name}. Difficoltà: ${d.label}.`, 'sys');
    E.news(s, 'La guerra russo-ucraina continua a bassa intensità. Tensioni nello Stretto di Taiwan, in Medio Oriente e tra India e Pakistan.', 'war');
    E.updateScores(s);
    return s;
  };

  E.updateScores = (s) => { E.ids(s).forEach(id => { (s.scoreHist[id] = s.scoreHist[id] || []).push(E.score(s, s.nations[id])); }); };

  // ---------- Materie prime ---------------------------------------------
  E.commoditySupply = (s, c) => {
    let sup = 0;
    E.ids(s).forEach(id => {
      const n = s.nations[id]; let p = n.res[c] || 0; if (!p) return;
      if (E.warsOf(s, id).length) p *= 0.75;
      // sanzioni dalle grandi economie riducono l'offerta sul mercato globale
      const sanctShare = E.sanctionsOn(s, id).filter(x => x.type === 'economiche' || x.type === 'onu').reduce((a, x) => a + s.nations[x.from].gdp, 0) / E.worldGdp(s);
      p *= (1 - sanctShare * 0.5);
      p *= (1 - E.occupiedShare(n) * 0.5);
      sup += p;
    });
    return sup;
  };
  E.netImport = (s, n, c) => { // quota di PIL esposta all'import della materia prima
    const need = { oil: 0.025, gas: 0.012, grain: 0.008, chips: 0.01, rare: 0.004 }[c];
    const prod = (n.res[c] || 0) / 10; // 0..1
    const energyShield = c === 'oil' || c === 'gas' ? n.tech.energy * 0.05 : 0;
    return clamp(need * (1 - prod) * (1 - energyShield), -0.02, 0.05);
  };

  // ---------- Diplomazia -------------------------------------------------
  const PROP = {};
  E.PROPOSAL_TYPES = PROP;
  PROP.commercio = { label: 'Accordo commerciale', desc: '+crescita per entrambi, +relazioni. Richiede relazioni ≥ 10.' };
  PROP.nonaggressione = { label: 'Patto di non aggressione', desc: 'Nessuna guerra per 12 turni. Rompere il patto costa reputazione.' };
  PROP.alleanza = { label: 'Alleanza difensiva', desc: 'Se uno dei due è attaccato, l’altro entra in guerra. Richiede relazioni ≥ 40.' };
  PROP.pace = { label: 'Proposta di pace', desc: 'Termina la guerra: pace bianca (ritiro) o pace con annessioni.' };
  PROP.ultimatum = { label: 'Ultimatum', desc: 'Pretendi una regione o un tributo. Funziona solo con grande superiorità militare.' };
  PROP.entrata_guerra = { label: 'Richiesta di intervento', desc: 'Chiedi a un alleato di entrare in guerra al tuo fianco.' };

  E.evaluateProposal = (s, from, to, type, terms = {}) => {
    const a = s.nations[from], b = s.nations[to];
    const rel = E.getRel(s, from, to);
    const P = GEO.PERSONAS[b.persona];
    const powA = E.milPower(a), powB = E.milPower(b);
    const rep = a.reputation / 100;
    if (b.destroyed) return { ok: false, reason: 'Lo stato non esiste più.' };
    switch (type) {
      case 'commercio': {
        if (E.atWar(s, from, to)) return { ok: false, reason: 'Siamo in guerra.' };
        if (E.isSanctioning(s, from, to) || E.isSanctioning(s, to, from)) return { ok: false, reason: 'Prima revocate le sanzioni.' };
        if (E.hasTreaty(s, from, to, 'commercio')) return { ok: false, reason: 'Accordo già in vigore.' };
        const th = 10 - P.greed * 15 + (1 - rep) * 20;
        return rel >= th ? { ok: true } : { ok: false, reason: `Le relazioni sono troppo fredde (${rel}, servono ≥ ${Math.round(th)}).` };
      }
      case 'nonaggressione': {
        if (E.atWar(s, from, to)) return { ok: false, reason: 'Siamo in guerra: proponete una pace.' };
        if (E.hasTreaty(s, from, to, 'nonaggressione')) return { ok: false, reason: 'Patto già in vigore.' };
        const hasClaim = b.claims && b.claims[from];
        const th = -20 + (hasClaim ? 40 : 0) + (1 - rep) * 30 + (P.aggression > 0.7 ? 15 : 0);
        return rel >= th ? { ok: true } : { ok: false, reason: hasClaim ? 'Abbiamo rivendicazioni territoriali su di voi.' : `Non ci fidiamo (${rel}, servono ≥ ${Math.round(th)}).` };
      }
      case 'alleanza': {
        if (E.atWar(s, from, to)) return { ok: false, reason: 'Siamo in guerra.' };
        if (E.hasTreaty(s, from, to, 'difesa')) return { ok: false, reason: 'Già alleati.' };
        const enemiesA = E.enemiesOf(s, from);
        const conflict = E.alliesOf(s, to).some(x => enemiesA.includes(x)) || enemiesA.some(e => E.getRel(s, to, e) > 50);
        if (conflict) return { ok: false, reason: 'Siete in guerra con un nostro amico.' };
        const sharedEnemy = E.ids(s).some(x => E.getRel(s, from, x) < -50 && E.getRel(s, to, x) < -50);
        const th = 45 - (sharedEnemy ? 15 : 0) - (powA > powB * 2 ? 10 : 0) + (1 - rep) * 30 + (P.aggression > 0.7 ? 10 : 0) + (b.persona === 'isolazionista' ? 25 : 0);
        return rel >= th ? { ok: true } : { ok: false, reason: `Non abbastanza fiducia (${rel}, servono ≥ ${Math.round(th)}).` };
      }
      case 'pace': {
        const w = E.warOf(s, from, to); if (!w) return { ok: false, reason: 'Non siamo in guerra.' };
        const gainsA = (w.gains[from] || 0), gainsB = (w.gains[to] || 0);
        const occByA = b.regions.filter(r => r.controller === from).length, occByB = a.regions.filter(r => r.controller === to).length;
        const dur = s.turn - w.since;
        const losingB = occByA > occByB || b.army < b.army0 * 0.5 || b.exhaustion > 50;
        const winningB = occByB > occByA && b.exhaustion < 40;
        if (terms.kind === 'annessione') { // chi propone tiene le regioni occupate
          if (occByA === 0) return { ok: false, reason: 'Non occupate nulla da annettere.' };
          if (winningB) return { ok: false, reason: 'Stiamo vincendo: nessuna cessione.' };
          const accept = losingB && (b.exhaustion > 30 || b.stability < 40 || E.capital(b).controller === from || R() < 0.3 + P.risk * -0.2 + dur * 0.02);
          return accept ? { ok: true } : { ok: false, reason: 'Non cederemo territorio senza combattere.' };
        }
        if (terms.kind === 'tributo') {
          const accept = losingB && b.exhaustion > 25;
          return accept ? { ok: true } : { ok: false, reason: 'Non pagheremo tributi.' };
        }
        // pace bianca: ognuno restituisce le regioni occupate
        if (winningB && b.exhaustion < 30 && P.aggression > 0.4) return { ok: false, reason: 'Stiamo vincendo: continuiamo.' };
        if (b.claims && b.claims[from] && occByB > 0 && P.aggression > 0.5 && b.exhaustion < 50) return { ok: false, reason: 'Non rinunceremo alle nostre rivendicazioni.' };
        const accept = dur >= 2 && (b.exhaustion > 15 || losingB || R() < 0.4);
        return accept ? { ok: true } : { ok: false, reason: 'La guerra è appena iniziata, nessuna pace.' };
      }
      case 'ultimatum': {
        const ratio = (powA + E.alliesOf(s, from).reduce((x, id) => x + E.milPower(s.nations[id]) * 0.3, 0)) / (powB + E.alliesOf(s, to).reduce((x, id) => x + E.milPower(s.nations[id]) * 0.5, 0));
        const nukeShield = b.nukes > 0 && a.nukes === 0;
        if (nukeShield) return { ok: false, reason: 'Abbiamo l’arma nucleare: non ci intimidite.' };
        const need = terms.kind === 'regione' ? 3.0 : 2.0;
        const accept = ratio >= need && b.stability < 65 && R() < 0.6 + (1 - P.risk) * 0.3;
        return accept ? { ok: true } : { ok: false, reason: ratio >= need ? 'Preferiamo rischiare la guerra.' : `Non siete abbastanza forti (rapporto ${ratio.toFixed(1)}, serve ≥ ${need}).` };
      }
      case 'entrata_guerra': {
        const target = terms.target; if (!target) return { ok: false, reason: 'Nessun bersaglio.' };
        if (E.atWar(s, to, target)) return { ok: false, reason: 'Già in guerra.' };
        const allied = E.alliesOf(s, from).includes(to);
        const relT = E.getRel(s, to, target);
        const tgt = s.nations[target];
        const deter = tgt.nukes > 0 && b.nukes === 0 ? 0.5 : 1;
        const p = (allied ? 0.5 : 0.1) + P.loyalty * 0.3 + (relT < -40 ? 0.3 : 0) - (relT > 20 ? 0.5 : 0) + (rel > 70 ? 0.2 : 0);
        return R() < p * deter ? { ok: true } : { ok: false, reason: allied ? 'Il trattato è difensivo: non seguiremo una guerra di aggressione.' : 'Non è la nostra guerra.' };
      }
    }
    return { ok: false, reason: 'Proposta sconosciuta.' };
  };

  E.applyProposal = (s, from, to, type, terms = {}) => {
    const a = s.nations[from], b = s.nations[to];
    switch (type) {
      case 'commercio': s.treaties.push({ type: 'commercio', a: from, b: to, since: s.turn, expires: null }); E.changeRel(s, from, to, 10); E.news(s, `${a.flag} ${a.name} e ${b.flag} ${b.name} firmano un accordo commerciale.`, 'dip', [from, to]); break;
      case 'nonaggressione': s.treaties.push({ type: 'nonaggressione', a: from, b: to, since: s.turn, expires: s.turn + 12 }); E.changeRel(s, from, to, 6); E.news(s, `${a.flag} ${a.name} e ${b.flag} ${b.name} siglano un patto di non aggressione (12 turni).`, 'dip', [from, to]); break;
      case 'alleanza': s.treaties.push({ type: 'difesa', a: from, b: to, since: s.turn, expires: null }); E.changeRel(s, from, to, 15); E.news(s, `🤝 ${a.flag} ${a.name} e ${b.flag} ${b.name} stringono un'alleanza difensiva.`, 'dip', [from, to]); break;
      case 'pace': E.makePeace(s, from, to, terms.kind || 'bianca'); break;
      case 'ultimatum': {
        if (terms.kind === 'regione') { const r = b.regions.find(x => x.name === terms.region && !x.capital); if (r) { r.controller = from; E.news(s, `${b.flag} ${b.name} cede ${r.name} a ${a.flag} ${a.name} sotto ultimatum.`, 'war', [from, to]); b.stability -= 8; } }
        else { const amt = Math.round(E.effGdp(s, b) * 0.03); b.treasury -= amt; a.treasury += amt; E.news(s, `${b.flag} ${b.name} paga un tributo di ${amt} mld a ${a.flag} ${a.name}.`, 'war', [from, to]); b.stability -= 4; }
        E.changeRel(s, from, to, -30); break;
      }
      case 'entrata_guerra': E.joinWar(s, to, from, terms.target); break;
    }
  };

  E.propose = (s, from, to, type, terms = {}) => {
    const r = E.evaluateProposal(s, from, to, type, terms);
    const a = s.nations[from];
    if (r.ok) E.applyProposal(s, from, to, type, terms);
    else {
      if (type === 'ultimatum') { E.changeRel(s, from, to, -25); E.news(s, `${s.nations[to].flag} ${s.nations[to].name} respinge l'ultimatum di ${a.flag} ${a.name}: "${r.reason}"`, 'war', [from, to]); }
      else if (from === s.player) E.changeRel(s, from, to, -2);
    }
    return r;
  };

  // Azioni unilaterali
  E.sanction = (s, from, to, type = 'economiche') => {
    if (E.isSanctioning(s, from, to, type)) return false;
    s.sanctions.push({ from, to, type, since: s.turn });
    E.changeRel(s, from, to, -20);
    s.treaties = s.treaties.filter(t => !(t.type === 'commercio' && ((t.a === from && t.b === to) || (t.a === to && t.b === from))));
    const a = s.nations[from], b = s.nations[to];
    E.news(s, `${a.flag} ${a.name} impone sanzioni ${type === 'tech' ? 'tecnologiche (embargo chip)' : 'economiche'} a ${b.flag} ${b.name}.`, 'dip', [from, to]);
    E.alliesOf(s, to).forEach(x => E.changeRel(s, from, x, -4));
    return true;
  };
  E.liftSanctions = (s, from, to) => { const before = s.sanctions.length; s.sanctions = s.sanctions.filter(x => !(x.from === from && x.to === to)); if (s.sanctions.length < before) { E.changeRel(s, from, to, 12); E.news(s, `${s.nations[from].flag} ${s.nations[from].name} revoca le sanzioni a ${s.nations[to].flag} ${s.nations[to].name}.`, 'dip', [from, to]); } };
  E.sendAid = (s, from, to, amount, kind = 'economici') => {
    const a = s.nations[from], b = s.nations[to];
    if (a.treasury < amount || amount <= 0) return false;
    a.treasury -= amount;
    if (kind === 'militari') { b.army = clamp(b.army + amount / 8, 0, 110); b.missiles += Math.floor(amount / 4); b.readiness = clamp(b.readiness + 3, 0, 100); E.enemiesOf(s, to).forEach(e => E.changeRel(s, from, e, -10)); }
    else { b.treasury += amount; b.stability = clamp(b.stability + amount / (E.effGdp(s, b) * 0.02), 0, 100); }
    E.changeRel(s, from, to, clamp(Math.round(amount / (E.effGdp(s, b) * 0.01)), 2, 20));
    E.news(s, `${a.flag} ${a.name} invia ${amount} mld di aiuti ${kind} a ${b.flag} ${b.name}.`, 'dip', [from, to]);
    return true;
  };
  E.breakTreaty = (s, from, to, type) => {
    const before = s.treaties.length;
    s.treaties = s.treaties.filter(t => !(t.type === type && ((t.a === from && t.b === to) || (t.a === to && t.b === from))));
    if (s.treaties.length < before) { s.nations[from].reputation = clamp(s.nations[from].reputation - 15, 0, 100); E.changeRel(s, from, to, -25); E.news(s, `${s.nations[from].flag} ${s.nations[from].name} straccia il trattato (${type}) con ${s.nations[to].flag} ${s.nations[to].name}.`, 'dip', [from, to]); }
  };
  E.espionage = (s, from, to, tech) => {
    const a = s.nations[from], b = s.nations[to];
    const p = clamp(0.35 + a.tech.cyber * 0.04 + a.tech.space * 0.02 - b.tech.quantum * 0.04 - b.tech.cyber * 0.02, 0.05, 0.9);
    const caught = R() < clamp(0.3 - a.tech.cyber * 0.015 + b.tech.cyber * 0.02, 0.05, 0.7);
    let res = { success: false, caught };
    if (R() < p && b.tech[tech] > a.tech[tech]) { a.techProg[tech] = (a.techProg[tech] || 0) + E.techCost(a.tech[tech]) * 0.5; res.success = true; }
    if (caught) { E.changeRel(s, from, to, -20); E.news(s, `🕵️ ${b.flag} ${b.name} scopre una rete di spie di ${a.flag} ${a.name} nei laboratori di ${GEO.TECHS[tech].name}.`, 'dip', [from, to]); }
    return res;
  };
  E.destabilize = (s, from, to) => {
    const a = s.nations[from], b = s.nations[to];
    const eff = 3 + a.tech.cyber * 0.4;
    b.stability = clamp(b.stability - eff, 0, 100);
    const caught = R() < clamp(0.4 - a.tech.cyber * 0.02 + b.tech.cyber * 0.02, 0.1, 0.8);
    if (caught) { E.changeRel(s, from, to, -30); a.reputation = clamp(a.reputation - 5, 0, 100); E.news(s, `${b.flag} ${b.name} accusa ${a.flag} ${a.name} di finanziare proteste e disinformazione.`, 'dip', [from, to]); }
    return { caught, eff };
  };
  E.cyberAttack = (s, from, to) => {
    const a = s.nations[from], b = s.nations[to];
    const p = clamp(0.3 + a.tech.cyber * 0.06 - b.tech.cyber * 0.03 - b.tech.quantum * 0.05, 0.05, 0.9);
    const success = R() < p;
    const caught = R() < clamp(0.5 - a.tech.cyber * 0.02 + b.tech.space * 0.03, 0.15, 0.9);
    if (success) { b.gdp *= 0.994; b.stability = clamp(b.stability - 2, 0, 100); b.readiness = clamp(b.readiness - 6, 0, 100); b.missiles = Math.max(0, b.missiles - 10); }
    if (caught) { E.changeRel(s, from, to, -25); E.news(s, `💻 Cyberattacco ${success ? 'riuscito' : 'fallito'} di ${a.flag} ${a.name} contro ${b.flag} ${b.name}: attribuzione pubblica.`, 'war', [from, to]); }
    else if (success) E.news(s, `💻 Un cyberattacco anonimo paralizza infrastrutture in ${b.flag} ${b.name}.`, 'war', [to]);
    return { success, caught };
  };

  // ---------- Guerra -----------------------------------------------------
  E.declareWar = (s, from, to, opts = {}) => {
    if (E.atWar(s, from, to)) return null;
    const a = s.nations[from], b = s.nations[to];
    const hadNap = E.hasTreaty(s, from, to, 'nonaggressione');
    s.treaties = s.treaties.filter(t => !((t.a === from && t.b === to) || (t.a === to && t.b === from)));
    const casus = (a.claims && a.claims[to]) || E.isSanctioning(s, to, from) || opts.casus;
    const w = { attackers: [from], defenders: [to], since: s.turn, score: 0, gains: {}, label: `${a.name} – ${b.name}`, lastAction: s.turn, aggressor: from, casus: !!casus };
    s.wars.push(w);
    E.setRel(s, from, to, -100);
    if (hadNap) a.reputation = clamp(a.reputation - 25, 0, 100);
    if (!casus) a.reputation = clamp(a.reputation - 12, 0, 100);
    a.readiness = clamp(a.readiness + 15, 0, 100); b.readiness = clamp(b.readiness + 20, 0, 100);
    E.news(s, `⚔️ ${a.flag} ${a.name} DICHIARA GUERRA a ${b.flag} ${b.name}!${hadNap ? ' Violato il patto di non aggressione.' : ''}`, 'war', [from, to]);
    // Reazioni: alleati del difensore
    E.alliesOf(s, to).forEach(al => {
      if (al === from || E.atWar(s, al, from)) return;
      const n = s.nations[al];
      if (al === s.player) { E.queueProposal(s, { from: to, type: 'entrata_guerra', terms: { target: from }, text: `${b.flag} ${b.name} invoca il trattato di difesa: entrerai in guerra contro ${a.flag} ${a.name}?` }); return; }
      const P = GEO.PERSONAS[n.persona];
      const deter = a.nukes > 500 && n.nukes === 0 ? 0.5 : 1;
      const informal = s.treaties.some(t => t.informal && ((t.a === al && t.b === to) || (t.a === to && t.b === al)));
      const p = (0.55 + P.loyalty * 0.4) * deter * (informal ? 0.6 : 1);
      if (R() < p) E.joinWar(s, al, to, from);
      else E.news(s, `${n.flag} ${n.name} non onora l'impegno di difesa verso ${b.flag} ${b.name}.`, 'dip', [al]);
    });
    // Reazioni: altri stati sanzionano l'aggressore senza casus belli
    if (!casus) E.ids(s).forEach(o => {
      if (o === from || o === to || o === s.player) return;
      const n = s.nations[o];
      if (E.getRel(s, o, to) > 20 && E.getRel(s, o, from) < 20 && n.regime === 'democrazia' && R() < 0.6) E.sanction(s, o, from);
    });
    E.unVote(s, from, to, 'aggressione');
    return w;
  };
  E.joinWar = (s, who, side, enemy) => {
    const w = E.warOf(s, side, enemy); if (!w) return;
    const isAtt = w.attackers.includes(side);
    const arr = isAtt ? w.attackers : w.defenders;
    if (arr.includes(who)) return;
    arr.push(who);
    const n = s.nations[who];
    (isAtt ? w.defenders : w.attackers).forEach(e => { E.setRel(s, who, e, Math.min(E.getRel(s, who, e), -70)); s.treaties = s.treaties.filter(t => !((t.a === who && t.b === e) || (t.a === e && t.b === who))); });
    n.readiness = clamp(n.readiness + 10, 0, 100);
    E.news(s, `🪖 ${n.flag} ${n.name} entra in guerra a fianco di ${s.nations[side].flag} ${s.nations[side].name} contro ${s.nations[enemy].flag} ${s.nations[enemy].name}.`, 'war', [who, side, enemy]);
  };
  E.makePeace = (s, from, to, kind) => {
    const w = E.warOf(s, from, to); if (!w) return;
    const a = s.nations[from], b = s.nations[to];
    const restore = (x, y) => { s.nations[y].regions.forEach(r => { if (r.controller === x) r.controller = null; }); };
    if (kind === 'bianca') { restore(from, to); restore(to, from); }
    else if (kind === 'annessione') { restore(to, from); b.stability -= 6; a.stability += 4; }
    else if (kind === 'tributo') { restore(from, to); restore(to, from); b.tribute = { to: from, turns: 8, pct: 0.02 }; }
    // Rimuovi la coppia dalla guerra; se non restano coppie, chiudi
    const removeFrom = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); };
    if (w.attackers.length === 1 && w.defenders.length === 1) { s.wars = s.wars.filter(x => x !== w); }
    else if (w.attackers.includes(from) && w.defenders.includes(to)) { if (w.attackers.length === 1) removeFrom(w.defenders, to); else removeFrom(w.attackers, from); }
    else { if (w.defenders.length === 1) removeFrom(w.attackers, to); else removeFrom(w.defenders, from); }
    if (!w.attackers.length || !w.defenders.length) s.wars = s.wars.filter(x => x !== w);
    E.setRel(s, from, to, -40);
    s.treaties.push({ type: 'nonaggressione', a: from, b: to, since: s.turn, expires: s.turn + 8 });
    a.exhaustion = Math.max(0, a.exhaustion - 20); b.exhaustion = Math.max(0, b.exhaustion - 20);
    const lbl = { bianca: 'pace bianca (ritiro reciproco)', annessione: `pace con annessioni a favore di ${a.name}`, tributo: `pace con tributo a ${a.name}` }[kind];
    E.news(s, `🕊️ ${a.flag} ${a.name} e ${b.flag} ${b.name} firmano la ${lbl}.`, 'dip', [from, to]);
    s.market.shocks.DEF = (s.market.shocks.DEF || 0) - 0.05;
  };
  E.capitulate = (s, loserId, winnerId) => {
    const L = s.nations[loserId], W = s.nations[winnerId];
    E.news(s, `🏳️ ${L.flag} ${L.name} CAPITOLA davanti a ${W.flag} ${W.name}! Le regioni occupate sono annesse.`, 'war', [loserId, winnerId]);
    // Tutti i nemici fanno pace; vincitore tiene le occupazioni
    E.enemiesOf(s, loserId).forEach(e => { if (e === winnerId) E.makePeace(s, winnerId, loserId, 'annessione'); else E.makePeace(s, e, loserId, 'bianca'); });
    L.stability = clamp(L.stability - 20, 5, 100); L.army = Math.max(5, L.army * 0.4); L.missiles = Math.floor(L.missiles * 0.2); L.readiness = 30;
    L.suzerain = winnerId; L.tribute = { to: winnerId, turns: 12, pct: 0.03 };
    s.treaties.push({ type: 'nonaggressione', a: loserId, b: winnerId, since: s.turn, expires: s.turn + 20 });
    s.treaties = s.treaties.filter(t => !(t.a === loserId || t.b === loserId) || t.type === 'nonaggressione');
    const capLost = E.capital(L).controller === winnerId;
    if (capLost) { E.capital(L).controller = null; L.regime = W.regime; L.persona = 'difensivo'; E.setRel(s, loserId, winnerId, 30); E.news(s, `Governo fantoccio installato a ${E.capital(L).name}: ${L.name} è ora uno stato satellite di ${W.name}.`, 'war', [loserId, winnerId]); }
    E.ids(s).forEach(o => { if (o !== winnerId && o !== loserId && s.nations[o].regime === 'democrazia') E.changeRel(s, o, winnerId, -15); });
    W.stability = clamp(W.stability + 6, 0, 100); W.approval = clamp(W.approval + 10, 0, 100);
    if (loserId === s.player) s.gameOver = { type: 'sconfitta', text: `Il tuo paese è stato sconfitto e ridotto a stato satellite di ${W.flag} ${W.name}.` };
  };

  E.resolveInvasion = (s, o) => {
    const att = s.nations[o.from], def = s.nations[o.target];
    const w = E.warOf(s, o.from, o.target); if (!w) return;
    const reach = E.canReach(s, o.from, o.target); if (!reach.ok) return;
    const region = def.regions.find(r => r.name === o.region && (r.controller || o.target) === o.target);
    if (!region) return;
    // La capitale è attaccabile solo quando l'attaccante controlla almeno metà delle altre regioni
    if (region.capital) { const others = def.regions.filter(r => !r.capital); const held = others.filter(r => r.controller === o.from).length; if (others.length && held < Math.ceil(others.length / 2)) { if (o.from === s.player) E.news(s, `${att.flag} ${att.name} non riesce ad aprire un fronte verso ${region.name}: serve prima il controllo di ${Math.ceil(others.length / 2)} regioni di ${def.name}.`, 'war', [o.from, o.target]); return; } }
    // Supporto alleati
    const side = w.attackers.includes(o.from) ? w.attackers : w.defenders;
    const oside = w.attackers.includes(o.from) ? w.defenders : w.attackers;
    const sup = (arr, excl, tgt) => arr.filter(x => x !== excl).reduce((a, x) => { const n = s.nations[x]; const r = E.canReach(s, x, tgt); return a + (r.ok ? n.army * 0.25 * r.mult * (n.readiness / 100) : n.air * 0.1); }, 0);
    const defRegions = Math.max(1, def.regions.filter(r => !r.controller || r.controller === def.id).length);
    const attPow = (att.army * (att.readiness / 100) * E.techMult(att) * (1 + att.air / 180) + sup(side, o.from, o.target)) * reach.mult * (o.allIn ? 1.25 : 1);
    const defPow = (def.army * (def.readiness / 100) * E.techMult(def) * (1 + def.air / 180) * 1.5 / Math.sqrt(defRegions) * (0.7 + def.stability / 200) + sup(oside, o.target, o.from)) * (region.capital ? 1.6 : 1);
    const ratio = attPow / Math.max(1, defPow);
    const pCap = clamp((ratio - 1) * 0.35, 0.03, 0.6);
    const roll = R();
    const captured = roll < pCap;
    const attLoss = (1.2 + 2.5 / Math.max(0.3, ratio)) * (o.allIn ? 1.4 : 1), defLoss = 1.2 * Math.min(3, ratio);
    att.army = Math.max(3, att.army - attLoss); def.army = Math.max(3, def.army - defLoss);
    att.readiness = clamp(att.readiness - 4, 0, 100); def.readiness = clamp(def.readiness - 3, 0, 100);
    att.exhaustion += 4; def.exhaustion += 3;
    att.gdp *= 0.997; def.gdp *= 0.994;
    w.lastAction = s.turn;
    if (captured) {
      region.controller = o.from; w.gains[o.from] = (w.gains[o.from] || 0) + 1; w.gains[o.target] = (w.gains[o.target] || 0) - 1;
      def.stability = clamp(def.stability - 6, 0, 100); att.stability = clamp(att.stability + 2, 0, 100); att.approval = clamp(att.approval + 4, 0, 100);
      E.news(s, `🔥 ${att.flag} ${att.name} conquista ${region.name} (${def.flag} ${def.name}). Rapporto di forze ${ratio.toFixed(2)}.`, 'war', [o.from, o.target]);
      if (region.capital) E.capitulate(s, o.target, o.from);
      else if (def.regions.every(r => r.controller && r.controller !== def.id)) E.capitulate(s, o.target, o.from);
    } else {
      def.approval = clamp(def.approval + 2, 0, 100);
      E.news(s, `🛡️ ${def.flag} ${def.name} respinge l'offensiva di ${att.flag} ${att.name} su ${region.name} (rapporto ${ratio.toFixed(2)}).`, 'war', [o.from, o.target]);
    }
    return { captured, ratio, pCap };
  };

  E.resolveStrike = (s, o) => {
    const att = s.nations[o.from], def = s.nations[o.target];
    const count = Math.min(o.count, att.missiles); if (count <= 0) return;
    if (!E.atWar(s, o.from, o.target)) E.declareWar(s, o.from, o.target);
    att.missiles -= count;
    const intercept = clamp(def.tech.defense * 0.08 + def.tech.space * 0.01 - att.tech.hyper * 0.05, 0.02, 0.92);
    let hits = 0; for (let i = 0; i < count; i++) if (R() > intercept) hits++;
    def.gdp *= Math.pow(1 - 0.0012, hits); def.army = Math.max(3, def.army - hits * 0.25); def.readiness = clamp(def.readiness - hits * 0.4, 0, 100);
    def.stability = clamp(def.stability - hits * 0.2, 0, 100); def.missiles = Math.max(0, def.missiles - Math.floor(hits * 0.3));
    def.exhaustion += hits * 0.3;
    E.news(s, `🚀 ${att.flag} ${att.name} lancia ${count} missili balistici su ${def.flag} ${def.name}: ${hits} a segno, ${count - hits} intercettati (${Math.round(intercept * 100)}% difesa).`, 'war', [o.from, o.target]);
    s.market.shocks.DEF = (s.market.shocks.DEF || 0) + 0.02;
    return { hits, intercept };
  };

  E.resolveNuke = (s, o, isRetaliation = false) => {
    const att = s.nations[o.from], def = s.nations[o.target];
    const count = Math.min(o.count, att.nukes); if (count <= 0) return;
    if (!E.atWar(s, o.from, o.target)) E.declareWar(s, o.from, o.target);
    att.nukes -= count;
    const intercept = clamp(def.tech.defense * 0.04 - att.tech.hyper * 0.02, 0, 0.5);
    let hits = 0; for (let i = 0; i < count; i++) if (R() > intercept) hits++;
    def.gdp *= Math.pow(1 - 0.03, hits); def.pop *= Math.pow(1 - 0.005, hits); def.army = Math.max(3, def.army - hits * 2.5); def.readiness = clamp(def.readiness - hits * 3, 0, 100);
    def.stability = clamp(def.stability - hits * 4, 0, 100); def.missiles = Math.floor(def.missiles * Math.pow(0.9, hits));
    if (hits >= 6) { const cap = E.capital(def); if (cap && !cap.controller && R() < 0.3) { E.news(s, `☢️ La capitale di ${def.name} è stata annientata.`, 'nuke', [o.target]); } }
    s.fallout += hits * 0.12;
    E.news(s, `☢️☢️☢️ ${att.flag} ${att.name} ${isRetaliation ? 'RISPONDE CON UN ATTACCO NUCLEARE' : 'LANCIA UN ATTACCO NUCLEARE'} contro ${def.flag} ${def.name}: ${hits} testate esplodono. Il mondo trattiene il fiato.`, 'nuke', [o.from, o.target]);
    s.market.shocks.world = (s.market.shocks.world || 0) - 0.08 * Math.min(hits, 5); s.market.shocks.GOLD = (s.market.shocks.GOLD || 0) + 0.15;
    if (!isRetaliation) {
      att.stability = clamp(att.stability - 10, 0, 100); att.approval = clamp(att.approval - 15, 0, 100); att.reputation = clamp(att.reputation - 40, 0, 100);
      E.ids(s).forEach(oid => { if (oid === o.from) return; const ally = E.alliesOf(s, o.from).includes(oid); E.changeRel(s, oid, o.from, ally ? -30 : -55); if (oid !== o.target && s.nations[oid].regime === 'democrazia' && !ally && oid !== s.player) E.sanction(s, oid, o.from); });
      E.unVote(s, o.from, o.target, 'nucleare');
      // Rappresaglia
      if (def.nukes > 0 && def.id !== s.player) {
        const n = Math.min(def.nukes, Math.max(3, hits * 2));
        E.resolveNuke(s, { from: o.target, target: o.from, count: n }, true);
      } else if (def.nukes > 0 && def.id === s.player) {
        E.queueProposal(s, { from: o.from, type: 'rappresaglia_nucleare', terms: { count: Math.min(def.nukes, Math.max(3, hits * 2)) }, text: `☢️ ${att.flag} ${att.name} ti ha attaccato con armi nucleari. Il comando strategico chiede l'autorizzazione alla rappresaglia nucleare (${Math.min(def.nukes, Math.max(3, hits * 2))} testate).` });
      } else {
        // Ombrello nucleare degli alleati
        const umb = E.alliesOf(s, o.target).find(x => s.nations[x].nukes > 50 && x !== o.from);
        if (umb && umb !== s.player && R() < 0.5) { E.news(s, `${s.nations[umb].flag} ${s.nations[umb].name} attiva l'ombrello nucleare a difesa di ${def.name}.`, 'nuke', [umb]); if (!E.atWar(s, umb, o.from)) E.joinWar(s, umb, o.target, o.from); E.resolveNuke(s, { from: umb, target: o.from, count: Math.min(s.nations[umb].nukes, hits) }, true); }
      }
    }
    return { hits };
  };

  // ---------- ONU --------------------------------------------------------
  E.unVote = (s, aggressor, victim, kind) => {
    const P5 = ['USA', 'CHN', 'RUS', 'FRA', 'GBR'];
    let yes = 0, no = 0; const voters = E.alive(s).filter(id => id !== aggressor);
    voters.forEach(id => { const r = E.getRel(s, id, aggressor), rv = E.getRel(s, id, victim); if (kind === 'nucleare' ? r < 60 : (rv > r + 10 || (s.nations[id].regime === 'democrazia' && r < 10))) yes++; else no++; });
    const veto = P5.filter(p => p === aggressor || (p !== victim && E.getRel(s, p, aggressor) > 50 && kind !== 'nucleare'));
    const passed = yes > no && veto.length === 0;
    const text = `🇺🇳 Consiglio di Sicurezza: risoluzione contro ${s.nations[aggressor].flag} ${s.nations[aggressor].name} (${kind}) — ${yes} favorevoli, ${no} contrari${veto.length ? ', VETO di ' + veto.map(v => s.nations[v].name).join(', ') : ''}. ${passed ? 'APPROVATA: sanzioni ONU.' : 'Respinta.'}`;
    s.un.unshift({ turn: s.turn, aggressor, victim, kind, yes, no, veto, passed });
    E.news(s, text, 'un', [aggressor, victim]);
    if (passed) voters.forEach(id => { if (E.getRel(s, id, aggressor) < 30 && id !== s.player) E.sanction(s, id, aggressor, 'onu'); });
    if (passed) s.nations[aggressor].reputation = clamp(s.nations[aggressor].reputation - 10, 0, 100);
  };

  // ---------- Proposte in sospeso per il giocatore --------------------------
  E.queueProposal = (s, p) => { p.id = (s.pidSeq = (s.pidSeq || 0) + 1); s.pending.push(p); };
  E.answerProposal = (s, id, accept) => {
    const i = s.pending.findIndex(p => p.id === id); if (i < 0) return;
    const p = s.pending.splice(i, 1)[0];
    const from = p.from, me = s.player;
    if (!accept) {
      if (p.type === 'entrata_guerra') { E.changeRel(s, me, from, -20); E.alliesOf(s, me).forEach(x => E.changeRel(s, me, x, -5)); s.nations[me].reputation = clamp(s.nations[me].reputation - 10, 0, 100); E.news(s, `Rifiuti di intervenire a fianco di ${s.nations[from].name}: gli alleati dubitano della tua affidabilità.`, 'dip', [me]); }
      else if (p.type === 'ultimatum') { E.changeRel(s, me, from, -15); E.news(s, `Respingi l'ultimatum di ${s.nations[from].flag} ${s.nations[from].name}.`, 'war', [me, from]); if (R() < 0.6 * GEO.PERSONAS[s.nations[from].persona].aggression) E.declareWar(s, from, me); }
      else if (p.type !== 'rappresaglia_nucleare') E.changeRel(s, me, from, -3);
      return;
    }
    switch (p.type) {
      case 'commercio': case 'nonaggressione': case 'alleanza': E.applyProposal(s, from, me, p.type); break;
      case 'pace': E.makePeace(s, from, me, p.terms.kind); break;
      case 'entrata_guerra': E.joinWar(s, me, from, p.terms.target); break;
      case 'ultimatum': E.applyProposal(s, from, me, 'ultimatum', p.terms); break;
      case 'aiuti': E.sendAid(s, me, from, p.terms.amount, p.terms.kind); break;
      case 'rappresaglia_nucleare': E.resolveNuke(s, { from: me, target: from, count: p.terms.count }, true); break;
    }
  };

  // ---------- Ordini militari del giocatore ---------------------------------
  E.addOrder = (s, o) => { s.orders = s.orders.filter(x => !(x.type === o.type && x.target === o.target && x.region === o.region)); s.orders.push(o); };
  E.removeOrder = (s, i) => s.orders.splice(i, 1);

  // ---------- Mercati ----------------------------------------------------
  E.assetPrice = (s, key) => {
    const [k, id] = key.split(':');
    if (k === 'N') return s.market.indexes[id].price; if (k === 'S') return s.market.sectors[id].price; if (k === 'C') return s.market.commodities[id].price; if (k === 'W') return s.market.world.price; return 0;
  };
  E.assetName = (s, key) => { const [k, id] = key.split(':'); if (k === 'N') return `Indice ${s.nations[id].flag} ${s.nations[id].name}`; if (k === 'S') return `${GEO.SECTORS[id].icon} ${GEO.SECTORS[id].name}`; if (k === 'C') return `${GEO.COMMODITIES[id].icon} ${GEO.COMMODITIES[id].name}`; return '🌍 Indice mondiale'; };
  E.trade = (s, key, amount) => { // amount>0 compra, <0 vende (in mld)
    const p = s.nations[s.player]; const price = E.assetPrice(s, key);
    const h = s.portfolio.holdings[key] || { units: 0, cost: 0 };
    if (amount > 0) { if (p.treasury < amount) return { ok: false, reason: 'Tesoro insufficiente.' }; p.treasury -= amount; h.units += amount / price; h.cost += amount; }
    else { const units = Math.min(h.units, -amount / price); if (units <= 0) return { ok: false, reason: 'Nessuna posizione.' }; const val = units * price; const costPart = h.cost * (units / h.units); s.portfolio.realized += val - costPart; h.units -= units; h.cost -= costPart; p.treasury += val; }
    if (h.units < 1e-9) delete s.portfolio.holdings[key]; else s.portfolio.holdings[key] = h;
    return { ok: true };
  };
  E.portfolioValue = (s) => Object.entries(s.portfolio.holdings).reduce((a, [k, h]) => a + h.units * E.assetPrice(s, k), 0);

  const push = (obj, v) => { obj.price = Math.max(obj.price * (1 + v), 1); obj.hist.push(+obj.price.toFixed(2)); if (obj.hist.length > 200) obj.hist.shift(); };
  E.marketStep = (s, worldGrowth) => {
    const M = s.market; const noise = (sd) => (R() + R() + R() - 1.5) * sd * 1.6;
    const nWars = s.wars.length;
    const gw = 0.006 + (worldGrowth - 2.6) * 0.012 - s.fallout * 0.02 + (M.shocks.world || 0) + noise(0.025);
    push(M.world, gw);
    E.ids(s).forEach(id => {
      const n = s.nations[id];
      let r = 0.008 + (n.lastGrowth - 2.5) * 0.02 + (n.stability - n.prevStability) * 0.004 + gw * 0.6 + noise(0.045);
      if (E.warsOf(s, id).length) r -= 0.03;
      r -= E.sanctionsOn(s, id).length * 0.006;
      if (n.destroyed) r = -0.5;
      if (n.justLeveled) r += 0.03;
      push(M.indexes[id], r);
    });
    // materie prime
    const demand = E.worldGdp(s) / s.worldGdp0;
    Object.keys(GEO.COMMODITIES).forEach(c => {
      const sup = E.commoditySupply(s, c), sup0 = s.supply0[c];
      const target = GEO.COMMODITIES[c].base * Math.pow(demand * sup0 / Math.max(0.1, sup), 1.6) * (1 + (M.shocks[c] || 0));
      const cur = M.commodities[c].price; const r = (target / cur - 1) * 0.35 + noise(0.03);
      push(M.commodities[c], r);
    });
    const chg = (c) => { const h = M.commodities[c].hist; return h.length > 1 ? h[h.length - 1] / h[h.length - 2] - 1 : 0; };
    const techAvg = E.ids(s).reduce((a, id) => a + s.nations[id].tech.ai + s.nations[id].tech.semis, 0) / E.ids(s).length;
    const techDelta = techAvg - (s.techAvgPrev ?? techAvg); s.techAvgPrev = techAvg;
    const sec = {
      TECH: 0.005 + gw * 0.8 + techDelta * 0.12 - chg('chips') * 0.2 + (M.shocks.TECH || 0) + noise(0.05),
      ENERGY: chg('oil') * 0.6 + chg('gas') * 0.3 + (M.shocks.ENERGY || 0) + noise(0.04),
      DEF: nWars * 0.012 + (s.newWars || 0) * 0.04 + (M.shocks.DEF || 0) + noise(0.03),
      AGRI: chg('grain') * 0.5 + gw * 0.3 + (M.shocks.AGRI || 0) + noise(0.03),
      FIN: 0.01 + gw * 1.4 + (M.shocks.FIN || 0) + noise(0.05),
      GOLD: -gw * 0.6 + nWars * 0.006 + s.fallout * 0.03 + (M.shocks.GOLD || 0) + noise(0.03),
    };
    Object.keys(sec).forEach(k => push(M.sectors[k], sec[k]));
    // gli shock sono consumati una volta sola
    M.shocks = {};
    s.newWars = 0;
  };

  // ---------- Tecnologia -------------------------------------------------
  E.techCost = (lvl) => 40 * Math.pow(lvl + 1, 1.5);
  E.hasChipAccess = (s, n) => {
    if (n.tech.semis >= 8) return true;
    return E.ids(s).some(id => id !== n.id && s.nations[id].tech.semis >= 8 && E.getRel(s, id, n.id) >= 10 && !E.isSanctioning(s, id, n.id, 'tech') && !E.isSanctioning(s, id, n.id, 'onu') && !E.atWar(s, id, n.id));
  };
  E.researchPoints = (s, n, spend) => Math.pow(Math.max(0, spend), 0.7) * 4 * (1 + E.avgTech(n) / 5) * (1 + n.tech.quantum * 0.05) * (n.stability < 40 ? 0.8 : 1);
  E.techStep = (s, n, spend) => {
    const rp = E.researchPoints(s, n, spend);
    n.lastRP = rp; n.justLeveled = false;
    if (n.tech[n.researchFocus] >= 10) { const nxt = Object.entries(n.tech).filter(x => x[1] < 10).sort((a, b) => a[1] - b[1])[0]; if (nxt) { n.researchFocus = nxt[0]; if (n.id === s.player) E.news(s, `Ricerca: focus spostato automaticamente su ${GEO.TECHS[nxt[0]].name}.`, 'tech', [n.id]); } }
    const focus = n.researchFocus;
    const add = (t, pts) => {
      if (n.tech[t] >= 10) return;
      if (t === 'ai' && n.tech.ai >= n.tech.semis + 3 && !E.hasChipAccess(s, n)) { n.chipBlocked = true; return; }
      n.techProg[t] = (n.techProg[t] || 0) + pts;
      const cost = E.techCost(n.tech[t]);
      if (n.techProg[t] >= cost) { n.techProg[t] -= cost; n.tech[t] = Math.min(10, n.tech[t] + 1); n.justLeveled = true; if (n.id === s.player || n.tech[t] >= 9) E.news(s, `${GEO.TECHS[t].icon} ${n.flag} ${n.name} raggiunge il livello ${n.tech[t]} in ${GEO.TECHS[t].name}.`, 'tech', [n.id]); }
    };
    n.chipBlocked = false;
    add(focus, rp * 0.8);
    const others = Object.keys(n.tech).filter(t => t !== focus);
    others.forEach(t => add(t, rp * 0.2 / others.length));
    // Programma nucleare (Iran e simili)
    if (n.nuclearProgram !== undefined && n.nukes === 0) {
      n.nuclearProgram += 0.02 + (n.budget.military > 0.4 ? 0.02 : 0);
      if (n.nuclearProgram >= 1) { n.nukes = 5; n.nuclearProgram = undefined; E.news(s, `☢️ ${n.flag} ${n.name} testa la sua prima bomba atomica! Equilibri regionali stravolti.`, 'nuke', [n.id]); E.ids(s).forEach(o => { if (E.getRel(s, o, n.id) < 0) E.changeRel(s, o, n.id, -15); }); }
    }
  };

  // ---------- Economia per nazione --------------------------------------
  E.economyStep = (s, n, worldGrowth) => {
    const g0 = n.growth;
    let g = g0;
    const eff = E.effGdp(s, n);
    const B = n.budget;
    g += (B.infra - 0.18) * 3;
    g += (n.tech.ai - 5) * 0.08 + (n.tech.energy - 5) * 0.02;
    g += Math.min(1.2, E.treatiesOf(s, n.id, 'commercio').length * 0.15);
    const wg = E.worldGdp(s);
    const sanctPenalty = E.sanctionsOn(s, n.id).reduce((a, x) => a + (x.type === 'tech' ? 0.3 : (s.nations[x.from].gdp / wg) * 7), 0);
    g -= Math.min(4.5, sanctPenalty);
    const wars = E.warsOf(s, n.id);
    if (wars.length) g -= wars.some(w => w.defenders.includes(n.id)) ? 2.2 : 1.2;
    g += (n.stability - 50) * 0.02;
    if (n.debt > 100) g -= Math.min(1.2, (n.debt - 100) * 0.006);
    if (B.military > 0.4) g -= (B.military - 0.4) * 4;
    g -= s.fallout * 0.8;
    g += (worldGrowth - 2.6) * 0.25;
    Object.keys(GEO.COMMODITIES).forEach(c => { const ratio = s.market.commodities[c].price / GEO.COMMODITIES[c].base; const ni = E.netImport(s, n, c); g -= ni * (ratio - 1) * 60; });
    if (n.spendMult > 1) g += (n.spendMult - 1) * 2.5; // stimolo in deficit
    if (n.tribute) g -= 1.0;
    g = clamp(g, -12, 12);
    n.lastGrowth = g;
    n.gdp *= (1 + g / 400);
    n.pop *= 1 + ((n.regime === 'democrazia' ? 0.4 : 0.6) + (n.stability > 60 ? 0.1 : -0.1)) / 400;
    // Bilancio
    const budgetQ = E.budgetQ(s, n) * n.spendMult;
    const milSpend = budgetQ * B.military, resSpend = budgetQ * B.research;
    n.lastBudget = { total: budgetQ, military: milSpend, research: resSpend, welfare: budgetQ * B.welfare, infra: budgetQ * B.infra, diplomacy: budgetQ * B.diplomacy };
    // Debito e tesoro
    n.debt += (n.spendMult - 1) * 2.5 - g * 0.04; n.debt = clamp(n.debt, 0, 400);
    if (n.spendMult < 1) n.treasury += E.budgetQ(s, n) * (1 - n.spendMult);
    // Entrate da export di materie prime
    let exportInc = 0;
    Object.keys(GEO.COMMODITIES).forEach(c => { const p = n.res[c] || 0; if (p >= 5) exportInc += (p - 3) * (s.market.commodities[c].price / GEO.COMMODITIES[c].base) * { oil: 5, gas: 3, grain: 1.5, chips: 6, rare: 2 }[c]; });
    n.treasury += exportInc + eff * 0.001; n.lastExport = exportInc;
    if (n.tribute) { const amt = eff * n.tribute.pct; n.treasury -= amt; s.nations[n.tribute.to].treasury += amt; if (--n.tribute.turns <= 0) n.tribute = null; }
    // Rendimento del fondo sovrano IA (astratto)
    if (n.id !== s.player) n.treasury *= 1 + (s.market.world.hist.length > 1 ? (s.market.world.price / s.market.world.hist[s.market.world.hist.length - 2] - 1) * 0.3 : 0);
    // Militare
    const milShare = milSpend * 4 / Math.max(1, eff);
    const delta = (milShare - 0.03) * 100;
    const grow = (v, max) => clamp(v + delta * (1 - v / 120) * (delta > 0 ? 1 : 0.6), 3, max);
    const rebuild = wars.length ? 1.3 : 1;
    n.army = grow(n.army, n.id === 'USA' || n.id === 'CHN' ? 110 : 100) ; n.navy = clamp(n.navy + delta * 0.4 * (1 - n.navy / 120), 0, 100); n.air = clamp(n.air + delta * 0.5 * (1 - n.air / 120), 0, 100);
    if (delta > 0 && wars.length) n.army = clamp(n.army + delta * 0.3 * rebuild, 3, 110);
    n.missiles += Math.floor(milSpend * 0.04 * (1 + n.tech.hyper * 0.1));
    if (n.nukes > 0 && n.budget.military > 0.35 && n.id !== 'PRK') n.nukes += n.nukes < 300 ? 2 : 0;
    const readyTarget = wars.length ? 95 : 55 + B.military * 50;
    n.readiness += (readyTarget - n.readiness) * 0.2;
    // Esaurimento bellico
    n.exhaustion = clamp(wars.length ? n.exhaustion + 1.5 : n.exhaustion - 4, 0, 100);
    // Stabilità
    const occ = E.occupiedShare(n);
    const occupying = E.controlledRegions(s, n.id).filter(x => x.owner !== n.id).length;
    let target = 52 + (B.welfare - 0.25) * 70 + (g - 2) * 2 - n.exhaustion * 0.3 - occ * 50 - occupying * 2 + (n.regime === 'autocrazia' ? 6 : 0) + (n.tech.bio - 5) * 0.8 - Math.max(0, n.debt - 130) * 0.05 + (n.approval - 50) * 0.12;
    if (E.sanctionsOn(s, n.id).length > 5) target -= 6;
    n.prevStability = n.stability;
    n.stability = clamp(n.stability + (target - n.stability) * 0.15 + (R() - 0.5) * 2, 0, 100);
    n.approval = clamp(n.approval + ((52 + (g - 2) * 3 + (B.welfare - 0.25) * 40 - n.exhaustion * 0.3) - n.approval) * 0.2, 0, 100);
    // Crisi del debito
    if (n.debt > 160 && (n.stability < 50 || g < 0) && R() < Math.min(0.15, (n.debt - 160) * 0.003)) { n.gdp *= 0.97; n.stability -= 8; n.spendMult = 0.85; E.news(s, `💥 Crisi del debito in ${n.flag} ${n.name}: fuga di capitali, austerità forzata.`, 'eco', [n.id]); s.market.indexes[n.id].price *= 0.85; }
    // Rivoluzione / collasso
    if (n.stability < 12 && R() < 0.25 && !n.destroyed) {
      n.stability = 35; n.gdp *= 0.94; n.army *= 0.7; n.regime = n.regime === 'democrazia' ? 'ibrido' : 'democrazia'; n.persona = pick(['difensivo', 'opportunista', 'falco']);
      E.news(s, `🔥 Collasso dello stato in ${n.flag} ${n.name}: il governo cade, nuovo regime (${n.regime}).`, 'eco', [n.id]);
      if (n.id === s.player) s.gameOver = { type: 'sconfitta', text: 'Il tuo governo è stato rovesciato da una rivolta popolare.' };
    }
    E.techStep(s, n, resSpend);
  };

  // ---------- Relazioni: deriva ----------------------------------------------
  E.relationsStep = (s) => {
    const ids = E.alive(s);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = s.nations[ids[i]], b = s.nations[ids[j]];
      const k = E.relKey(a.id, b.id); const cur = s.rel[k] ?? 0;
      if (E.atWar(s, a.id, b.id)) { s.rel[k] = -100; continue; }
      let target = 0;
      a.blocs.forEach(bl => { if (b.blocs.includes(bl)) target += 12; });
      if (E.hasTreaty(s, a.id, b.id, 'difesa')) target += 30; if (E.hasTreaty(s, a.id, b.id, 'commercio')) target += 15; if (E.hasTreaty(s, a.id, b.id, 'nonaggressione')) target += 5;
      if (E.isSanctioning(s, a.id, b.id) || E.isSanctioning(s, b.id, a.id)) target -= 35;
      if ((a.claims && a.claims[b.id]) || (b.claims && b.claims[a.id])) target -= 40;
      if (a.regime !== b.regime && (a.regime === 'autocrazia' || b.regime === 'autocrazia')) target -= 8; else target += 4;
      const ea = E.enemiesOf(s, a.id), eb = E.enemiesOf(s, b.id);
      if (ea.some(x => eb.includes(x))) target += 15;
      if (ea.includes(b.id)) target -= 100;
      if (ea.some(x => E.alliesOf(s, b.id).includes(x))) target -= 20;
      target = clamp(target, -90, 90);
      s.rel[k] = clamp(Math.round(cur + (target - cur) * 0.04 + (R() - 0.5) * 3), -100, 100);
    }
    s.treaties = s.treaties.filter(t => { if (t.expires && t.expires <= s.turn) { E.news(s, `Il patto di non aggressione tra ${s.nations[t.a].name} e ${s.nations[t.b].name} è scaduto.`, 'dip', [t.a, t.b]); return false; } return true; });
    E.ids(s).forEach(id => { const n = s.nations[id]; n.reputation = clamp(n.reputation + 0.5, 0, 100); });
    // Sanzioni ONU si sciolgono dopo 12 turni
    s.sanctions = s.sanctions.filter(x => !(x.type === 'onu' && s.turn - x.since > 12));
  };

  // ---------- Eventi -------------------------------------------------------
  const weightedPick = (list) => { const tot = list.reduce((a, e) => a + e.weight, 0); let r = R() * tot; for (const e of list) { r -= e.weight; if (r <= 0) return e; } return list[list.length - 1]; };
  E.eventsStep = (s) => {
    const p = s.nations[s.player];
    p.atWar = E.warsOf(s, s.player).length > 0;
    if (R() < 0.38) {
      const list = GEO.EVENTS.filter(e => e.scope === 'player' && (!e.cond || e.cond(p)) && !(s.lastPlayerEvents || []).includes(e.id));
      if (list.length) { const ev = weightedPick(list); const suspect = E.ids(s).filter(x => x !== s.player && E.getRel(s, s.player, x) < -30); const sId = suspect.length ? pick(suspect) : pick(E.ids(s).filter(x => x !== s.player)); s.pendingEvents.push({ id: ev.id, suspect: sId }); s.lastPlayerEvents = [ev.id, ...(s.lastPlayerEvents || [])].slice(0, 4); }
    }
    if (R() < 0.22) {
      const list = GEO.EVENTS.filter(e => e.scope === 'global');
      const ev = weightedPick(list); E.applyGlobalEvent(s, ev);
    }
    if (R() < 0.45) {
      const list = GEO.EVENTS.filter(e => e.scope === 'nation');
      const cands = E.alive(s).filter(id => id !== s.player);
      const n = s.nations[pick(cands)];
      const ok = list.filter(e => !e.cond || e.cond(n));
      if (ok.length) { const ev = weightedPick(ok); E.applyFx(s, n, ev.fx, { suspect: null }); E.news(s, `📰 ${ev.title}: ${ev.text.replace('{n}', n.flag + ' ' + n.name)}`, 'event', [n.id]); }
    }
  };
  E.applyGlobalEvent = (s, ev) => {
    const G = ev.global; E.news(s, `🌍 ${ev.title}: ${ev.text}`, 'event');
    if (G.marketShock) s.market.shocks.world = (s.market.shocks.world || 0) + G.marketShock / 100;
    if (G.gdpPct) E.ids(s).forEach(id => s.nations[id].gdp *= 1 + G.gdpPct / 100);
    if (G.gdpPctByBio) E.ids(s).forEach(id => { const n = s.nations[id]; const hit = -2.5 + n.tech.bio * 0.2; n.gdp *= 1 + hit / 100; n.stability = clamp(n.stability - (3 - n.tech.bio * 0.25), 0, 100); });
    if (G.sector) Object.entries(G.sector).forEach(([k, v]) => s.market.shocks[k] = (s.market.shocks[k] || 0) + v / 100);
    if (G.commodity) Object.entries(G.commodity).forEach(([k, v]) => s.market.shocks[k] = (s.market.shocks[k] || 0) + v / 100);
    if (G.techProgTop) Object.entries(G.techProgTop).forEach(([t, v]) => E.ids(s).forEach(id => { const n = s.nations[id]; if (n.tech[t] >= 7) n.techProg[t] = (n.techProg[t] || 0) + v; }));
    if (G.stabilityImporters) E.ids(s).forEach(id => { const n = s.nations[id]; if ((n.res.grain || 0) < 4) n.stability = clamp(n.stability + G.stabilityImporters, 0, 100); });
    if (G.relAllShift) Object.keys(s.rel).forEach(k => { if (s.rel[k] < 0 && s.rel[k] > -100) s.rel[k] = clamp(s.rel[k] + G.relAllShift, -100, 100); });
  };
  E.applyFx = (s, n, fx, ctx) => {
    if (!fx) return;
    const id = n.id;
    if (fx.stability) n.stability = clamp(n.stability + fx.stability, 0, 100);
    if (fx.approval) n.approval = clamp(n.approval + fx.approval, 0, 100);
    if (fx.debt) n.debt = clamp(n.debt + fx.debt, 0, 400);
    if (fx.growth) n.growth += fx.growth;
    if (fx.treasury) n.treasury += fx.treasury;
    if (fx.gdpPct) n.gdp *= 1 + fx.gdpPct / 100;
    if (fx.military) { n.army = clamp(n.army + fx.military, 0, 110); }
    if (fx.missiles) n.missiles += fx.missiles;
    if (fx.res) Object.entries(fx.res).forEach(([k, v]) => n.res[k] = clamp((n.res[k] || 0) + v, 0, 10));
    if (fx.relAll) E.ids(s).forEach(o => { if (o !== id) E.changeRel(s, id, o, fx.relAll); });
    if (fx.relDem) E.ids(s).forEach(o => { if (o !== id && s.nations[o].regime === 'democrazia') E.changeRel(s, id, o, fx.relDem); });
    if (fx.relSuspect && ctx.suspect) E.changeRel(s, id, ctx.suspect, fx.relSuspect);
    if (fx.cyberHit && ctx.suspect) E.cyberAttack(s, id, ctx.suspect);
    if (fx.techProg) Object.entries(fx.techProg).forEach(([t, v]) => n.techProg[t] = (n.techProg[t] || 0) + v);
    if (fx.techProgAll) Object.keys(n.tech).forEach(t => n.techProg[t] = Math.max(0, (n.techProg[t] || 0) + fx.techProgAll));
    if (fx.persona) n.persona = fx.persona;
    if (fx.regime) n.regime = fx.regime;
    if (fx.sector) Object.entries(fx.sector).forEach(([k, v]) => s.market.shocks[k] = (s.market.shocks[k] || 0) + v / 100);
    if (fx.enemyMissiles) E.enemiesOf(s, id).forEach(e => { s.nations[e].missiles = Math.max(0, s.nations[e].missiles + fx.enemyMissiles); if (fx.enemyStability) s.nations[e].stability = clamp(s.nations[e].stability + fx.enemyStability, 0, 100); });
    if (fx.risk === 'scandalo2' && R() < 0.5) { n.stability -= 6; n.approval -= 10; E.news(s, 'L’insabbiamento viene scoperto: lo scandalo esplode.', 'event', [id]); }
    if (fx.risk === 'esposizione' && R() < 0.35) { E.ids(s).forEach(o => { if (o !== id && !E.atWar(s, o, id)) E.changeRel(s, id, o, -5); }); E.news(s, 'L’operazione di sabotaggio viene attribuita pubblicamente al tuo governo.', 'event', [id]); }
  };
  E.resolveEvent = (s, idx, optionIdx) => {
    const pe = s.pendingEvents.splice(idx, 1)[0]; if (!pe) return;
    const ev = GEO.EVENTS.find(e => e.id === pe.id); const opt = ev.options[optionIdx]; const p = s.nations[s.player];
    E.applyFx(s, p, opt.fx, { suspect: pe.suspect });
    E.news(s, `📌 ${ev.title}: hai scelto "${opt.label}".`, 'event', [s.player]);
  };

  // ---------- Intelligence --------------------------------------------------
  E.intelReport = (s) => {
    const p = s.nations[s.player]; const out = [];
    const lvl = p.tech.space + p.tech.cyber * 0.5;
    E.alive(s).forEach(id => {
      if (id === s.player) return; const n = s.nations[id];
      const threat = GEO.AI && GEO.AI.warIntent ? GEO.AI.warIntent(s, n, s.player) : 0;
      if (threat > 0.01 && lvl >= 6) out.push({ id, text: `${n.flag} ${n.name}: intenzioni ostili (${threat > 0.05 ? 'ALTE' : 'moderate'}).`, level: threat });
      if (lvl >= 9 && n.plannedOrder && n.plannedOrder.target === s.player) out.push({ id, text: `${n.flag} ${n.name} prepara ${n.plannedOrder.type === 'invade' ? 'un’offensiva su ' + n.plannedOrder.region : 'un attacco missilistico'}.`, level: 1 });
    });
    return out;
  };

  // ---------- Fine turno ---------------------------------------------------
  E.endTurn = (s) => {
    if (s.gameOver) return;
    const AI = GEO.AI;
    const p = s.nations[s.player];
    s.pending = s.pending.filter(x => x.type === 'rappresaglia_nucleare'); // le proposte non risposte decadono
    s.turnLog = [];
    // 1. IA decide
    const aiOrders = [];
    E.alive(s).forEach(id => { if (id !== s.player) AI.turn(s, s.nations[id], aiOrders); });
    // 2. Risoluzione militare simultanea
    const all = [...s.orders.map(o => ({ ...o, from: s.player })), ...aiOrders];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    all.filter(o => o.type === 'mobilize').forEach(o => { const n = s.nations[o.from]; n.readiness = clamp(n.readiness + 20, 0, 100); n.treasury -= o.cost || 0; });
    all.filter(o => o.type === 'cyber').forEach(o => E.cyberAttack(s, o.from, o.target));
    all.filter(o => o.type === 'strike').forEach(o => { if (!s.nations[o.target].destroyed) E.resolveStrike(s, o); });
    all.filter(o => o.type === 'nuke').forEach(o => E.resolveNuke(s, o));
    all.filter(o => o.type === 'invade').forEach(o => { if (E.atWar(s, o.from, o.target)) E.resolveInvasion(s, o); });
    s.orders = [];
    // 3. Economia, tecnologia, militare
    const wg = E.worldGdp(s);
    const worldGrowth = E.ids(s).reduce((a, id) => a + s.nations[id].gdp * s.nations[id].lastGrowth, 0) / wg;
    s.worldGrowth = worldGrowth;
    E.alive(s).forEach(id => E.economyStep(s, s.nations[id], worldGrowth));
    // 4. Mercati
    E.marketStep(s, worldGrowth);
    // 5. Relazioni, trattati
    E.relationsStep(s);
    // 6. IA: pace e diplomazia post-combattimento
    E.alive(s).forEach(id => { if (id !== s.player) AI.diplomacy(s, s.nations[id]); });
    // 7. Eventi
    E.eventsStep(s);
    s.fallout = Math.max(0, s.fallout * 0.93);
    // 8. Guerre stagnanti si spengono
    s.wars.forEach(w => { if (s.turn - w.lastAction > 8 && R() < 0.3) { const a = w.attackers[0], d = w.defenders[0]; E.makePeace(s, a, d, 'bianca'); } });
    // 9. Avanza il tempo
    s.turn++; s.quarter++; if (s.quarter > 4) { s.quarter = 1; s.year++; }
    E.updateScores(s);
    s.intel = E.intelReport(s);
    E.checkVictory(s);
    return s;
  };

  E.checkVictory = (s) => {
    if (s.gameOver) return;
    const rank = E.ranking(s); const me = rank.find(r => r.id === s.player); const top = rank[0], second = rank[1];
    const p = s.nations[s.player];
    const wgdp = E.worldGdp(s);
    const allyGdp = E.alliesOf(s, s.player).reduce((a, id) => a + s.nations[id].gdp, 0) + p.gdp;
    if (top.id === s.player && top.score > second.score * 1.6 && s.turn > 8) s.gameOver = { type: 'vittoria', text: `🏆 Vittoria egemonica: la tua potenza supera di oltre il 60% quella del secondo classificato (${s.nations[second.id].flag} ${s.nations[second.id].name}).` };
    else if (Object.values(p.tech).every(v => v >= 9)) s.gameOver = { type: 'vittoria', text: '🏆 Vittoria tecnologica: domini tutte le aree della ricerca.' };
    else if (allyGdp / wgdp > 0.62 && s.turn > 8) s.gameOver = { type: 'vittoria', text: '🏆 Vittoria diplomatica: la tua rete di alleanze controlla oltre il 62% del PIL mondiale.' };
    else if (s.turn > s.maxTurns) {
      const pos = rank.findIndex(r => r.id === s.player) + 1;
      s.gameOver = { type: pos === 1 ? 'vittoria' : 'fine', text: pos === 1 ? `🏆 Fine della partita: sei la prima potenza mondiale con ${me.score} punti!` : `Fine della partita: ti classifichi ${pos}° con ${me.score} punti. Vince ${s.nations[top.id].flag} ${s.nations[top.id].name} (${top.score}).` };
    }
  };

  // ---------- Serializzazione -------------------------------------------------
  E.serialize = (s) => JSON.stringify(s);
  E.deserialize = (json) => { const s = JSON.parse(json); E.seedRng(s.seed + s.turn * 7919); return s; };

})(typeof globalThis !== 'undefined' ? globalThis : window);
