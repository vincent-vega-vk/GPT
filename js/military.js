/* ============================================================
   GEOPOLITICA 2026 — Motore militare in stile Diplomacy.
   Grafo di province e mari, aggiudicazione simultanea degli ordini
   (algoritmo di Lucas Kruijswijk con regola di Szykman), turno
   militare con ritirate, occupazioni, aggiustamenti e accordi con le IA.
   Contratto: docs/military-engine.md. Nessuna dipendenza dal DOM.
   ============================================================ */
(function (root) {
  'use strict';
  const GEO = root.GEO = root.GEO || {};
  const M = GEO.military = {};
  const Eng = () => GEO.engine;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uniq = (arr) => [...new Set(arr)];
  const num = (v) => (Number.isFinite(+v) ? Math.round(+v) : 0);
  const cloneUnits = (arr) => (arr || []).map(u => ({ ...u }));

  const PHASES = ['strike', 'nuke', 'air', 'move', 'battle', 'retreat', 'capture', 'adjust', 'diplomacy'];
  M.PHASES = PHASES;
  M.AGREEMENTS = {
    support_move: 'supporto a un movimento',
    support_hold: 'supporto al mantenimento',
    dmz: 'zona smilitarizzata',
    access: 'accesso militare',
  };
  // Schieramenti navali realistici preferiti all'inizio della partita (§7)
  M.FLEET_PREF = {
    USA: ['S.PHS', 'S.CMD', 'S.PGF', 'S.WAT', 'S.EPA'], RUS: ['S.BLK', 'S.BAL', 'S.BAR', 'S.OKH'], CHN: ['S.SCS', 'S.ECS', 'S.YEL'],
    GBR: ['S.NTH', 'S.NAT'], FRA: ['S.WMD', 'S.ATE'], JPN: ['S.SOJ'], IND: ['S.ARS', 'S.BOB'], ITA: ['S.CMD'], TUR: ['S.AEG'], IRN: ['S.PGF', 'S.ARS'],
  };

  // =====================================================================
  // 1. GRAFO
  // =====================================================================
  const hasA = (nd, id) => !!nd && (nd._a ? nd._a.has(id) : (nd.armyAdj || []).includes(id));
  const hasF = (nd, id) => !!nd && (nd._f ? nd._f.has(id) : (nd.fleetAdj || []).includes(id));

  // nodes = { id: { kind, armyAdj, fleetAdj, ...metadati opzionali (nation, idx, name, lon, lat, sc, capital) } }
  function makeGraph(src) {
    const map = new Map();
    Object.keys(src || {}).forEach(id => {
      const s = src[id]; if (!s) return;
      map.set(id, Object.assign({}, s, { id, kind: s.kind === 'sea' || s.kind === 'coast' ? s.kind : 'land', armyAdj: (s.armyAdj || []).slice(), fleetAdj: (s.fleetAdj || []).slice() }));
    });
    // adiacenze simmetriche, senza riferimenti a nodi inesistenti
    map.forEach((nd, id) => {
      nd.armyAdj.forEach(o => { const t = map.get(o); if (t && o !== id && !t.armyAdj.includes(id)) t.armyAdj.push(id); });
      nd.fleetAdj.forEach(o => { const t = map.get(o); if (t && o !== id && !t.fleetAdj.includes(id)) t.fleetAdj.push(id); });
    });
    map.forEach((nd, id) => {
      nd.armyAdj = uniq(nd.armyAdj.filter(o => o !== id && map.has(o) && map.get(o).kind !== 'sea' && nd.kind !== 'sea'));
      nd.fleetAdj = uniq(nd.fleetAdj.filter(o => o !== id && map.has(o)));
      Object.defineProperty(nd, '_a', { value: new Set(nd.armyAdj), enumerable: false });
      Object.defineProperty(nd, '_f', { value: new Set(nd.fleetAdj), enumerable: false });
    });
    const ids = [...map.keys()];
    return { node: (id) => (id == null ? null : map.get(id) || null), has: (id) => map.has(id), ids: () => ids, size: map.size, nodes: map, cache: {} };
  }

  // Regole del §1: esercito su adj ∪ corridors; flotta tra mari adiacenti, mare ↔ coste,
  // e tra province costiere solo se adiacenti E con almeno un mare in comune.
  function buildFromProvinces(P, S) {
    const nodes = {}; const coastsOf = {};
    Object.keys(P).forEach(id => (P[id].seas || []).forEach(z => { if (S[z]) (coastsOf[z] = coastsOf[z] || []).push(id); }));
    Object.keys(P).forEach(id => {
      const p = P[id]; const seas = uniq((p.seas || []).filter(z => S[z])); const coastal = seas.length > 0;
      const army = [...(p.adj || []), ...(p.corridors || [])].filter(x => P[x] && x !== id);
      const fleet = coastal ? [...seas, ...(p.adj || []).filter(q => P[q] && q !== id && (P[q].seas || []).some(z => seas.includes(z)))] : [];
      nodes[id] = { kind: coastal ? 'coast' : 'land', armyAdj: army, fleetAdj: fleet, nation: p.nation, idx: p.idx, name: p.name, lon: p.lon, lat: p.lat, sc: !!p.sc, capital: !!p.capital, seas, corridorVia: p.corridorVia || null };
    });
    Object.keys(S).forEach(id => {
      const z = S[id];
      nodes[id] = { kind: 'sea', armyAdj: [], fleetAdj: [...(z.adj || []).filter(x => S[x]), ...(coastsOf[id] || [])], name: z.name, lon: z.lon, lat: z.lat };
    });
    return makeGraph(nodes);
  }

  const EMPTY = makeGraph({});
  let customGraph = null, builtGraph = null, builtP = null, builtS = null;
  function G() {
    if (customGraph) return customGraph;
    if (GEO.PROVINCES && GEO.SEAS) {
      if (builtP !== GEO.PROVINCES || builtS !== GEO.SEAS) { builtGraph = buildFromProvinces(GEO.PROVINCES, GEO.SEAS); builtP = GEO.PROVINCES; builtS = GEO.SEAS; }
      return builtGraph;
    }
    return EMPTY;
  }
  const node = (id) => G().node(id);
  M.graph = G;
  M.ready = () => G().size > 0;
  M.setMap = (nodes) => { customGraph = makeGraph(nodes || {}); return customGraph; };
  M.resetMap = () => { customGraph = null; builtP = builtS = null; return G(); };
  M.buildGraph = buildFromProvinces;

  M.provInfo = (id) => node(id);
  M.provName = (id) => {
    const nd = node(id); if (nd && nd.name) return nd.name;
    const p = (GEO.PROVINCES && GEO.PROVINCES[id]) || (GEO.SEAS && GEO.SEAS[id]);
    return p && p.name ? p.name : String(id);
  };
  M.provPos = (id) => {
    const nd = node(id); if (nd && typeof nd.lon === 'number' && typeof nd.lat === 'number') return [nd.lon, nd.lat];
    const p = (GEO.PROVINCES && GEO.PROVINCES[id]) || (GEO.SEAS && GEO.SEAS[id]);
    return p && typeof p.lon === 'number' ? [p.lon, p.lat] : null;
  };
  // province di una nazione (ordinate per indice di regione)
  M.provincesOf = (nation) => {
    const g = G(); if (!g.cache.nat) {
      const idx = {}; g.ids().forEach(id => { const nd = g.node(id); if (nd.nation && nd.kind !== 'sea') (idx[nd.nation] = idx[nd.nation] || []).push(id); });
      Object.values(idx).forEach(a => a.sort((x, y) => (g.node(x).idx || 0) - (g.node(y).idx || 0)));
      g.cache.nat = idx;
    }
    return g.cache.nat[nation] || [];
  };
  M.seas = () => G().ids().filter(id => G().node(id).kind === 'sea');
  // vicini combinati (terra + mare) per distanze e raggi d'azione
  function nbAll(id) {
    const g = G(); const c = g.cache.all || (g.cache.all = new Map());
    let v = c.get(id); if (!v) { const nd = g.node(id); v = nd ? uniq([...nd.armyAdj, ...nd.fleetAdj]) : []; c.set(id, v); }
    return v;
  }
  // BFS multi-sorgente: Map id -> distanza
  function distances(sources, nb, maxD) {
    const d = new Map(); const q = [];
    sources.forEach(x => { if (!d.has(x) && node(x)) { d.set(x, 0); q.push(x); } });
    for (let h = 0; h < q.length; h++) {
      const x = q[h]; const dx = d.get(x); if (maxD != null && dx >= maxD) continue;
      for (const y of nb(x)) if (!d.has(y)) { d.set(y, dx + 1); q.push(y); }
    }
    return d;
  }
  M.distances = (sources, mode, maxD) => distances(sources, mode === 'A' ? (x => node(x).armyAdj) : mode === 'F' ? (x => node(x).fleetAdj) : nbAll, maxD);

  // =====================================================================
  // 2. AGGIUDICAZIONE (funzione pura e deterministica, §5)
  // =====================================================================
  const FAIL = 0, OK = 1;
  const UNRESOLVED = 0, GUESSING = 1, RESOLVED = 2;
  const NO_ROUTE = null;

  M.adjudicate = function adjudicate(units, orders, ctx) {
    ctx = ctx || {};
    units = units || [];
    const g = ctx.graph || G();
    const nodeOf = (id) => (id == null ? null : g.node(id));
    const atWarF = typeof ctx.atWar === 'function' ? ctx.atWar : null;
    const friendly = typeof ctx.friendly === 'function' ? ((a, b) => a === b || !!ctx.friendly(a, b))
      : atWarF ? ((a, b) => a === b || !atWarF(a, b)) : ((a, b) => a === b);
    const canEnter = typeof ctx.canEnter === 'function' ? ctx.canEnter : () => true;
    const canSupport = typeof ctx.canSupport === 'function' ? ctx.canSupport : () => true;
    const denyReason = typeof ctx.denyReason === 'function' ? ctx.denyReason : null;
    const garrisonF = typeof ctx.garrison === 'function' ? ctx.garrison : () => null;
    const name = typeof ctx.provName === 'function' ? ctx.provName : (id) => { const nd = nodeOf(id); return nd && nd.name ? nd.name : M.provName(id); };
    const airSrc = ctx.airBonus;
    const airOf = (u) => { if (u.suppressed || !airSrc) return 0; const v = typeof airSrc === 'function' ? airSrc(u.id, u) : airSrc[u.id]; return Math.max(0, num(v)); };

    let omap = orders || {};
    if (Array.isArray(omap)) { const o2 = {}; omap.forEach(o => { if (o && o.unit != null) o2[o.unit] = o; }); omap = o2; }

    const n = units.length; const U = units;
    const locIdx = new Map();
    for (let i = 0; i < n; i++) if (!locIdx.has(U[i].loc)) locIdx.set(U[i].loc, i);
    const ord = new Array(n);
    const invalidEv = [];
    const invalid = (i, reason, keep) => {
      ord[i] = keep || { type: 'hold' }; ord[i].invalid = true; ord[i].reason = reason;
      invalidEv.push({ phase: 'move', type: 'invalid', unit: U[i].id, owner: U[i].owner, reason });
    };

    // ---- validazione (§4) ----
    for (let i = 0; i < n; i++) {
      const u = U[i]; const o = omap[u.id]; const here = nodeOf(u.loc);
      if (locIdx.get(u.loc) !== i) { invalid(i, `Un'altra unità occupa già ${name(u.loc)}`); continue; }
      if (!here) { invalid(i, `Posizione sconosciuta (${u.loc})`); continue; }
      if (!o || !o.type || o.type === 'hold') { ord[i] = { type: 'hold' }; continue; }
      if (o.type === 'move') {
        const to = o.to; const dn = nodeOf(to);
        if (!dn) { invalid(i, 'Destinazione sconosciuta'); continue; }
        if (to === u.loc) { invalid(i, `L'unità si trova già in ${name(to)}`); continue; }
        let mv;
        if (u.type === 'F') {
          if (!hasF(here, to)) { invalid(i, dn.kind === 'land' ? `Una flotta non può entrare in una provincia interna (${name(to)})` : `${name(to)} non è raggiungibile dalla flotta in ${name(u.loc)}`); continue; }
          mv = { type: 'move', to, convoyed: false };
        } else {
          if (dn.kind === 'sea') { invalid(i, `Un esercito non può entrare in mare (${name(to)})`); continue; }
          const adjacent = hasA(here, to);
          if (adjacent && !o.viaConvoy) mv = { type: 'move', to, convoyed: false };
          else if (here.kind === 'coast' && dn.kind === 'coast') mv = { type: 'move', to, convoyed: true, adjacent };
          else if (adjacent) mv = { type: 'move', to, convoyed: false };
          else { invalid(i, `${name(to)} non è adiacente a ${name(u.loc)} e non è raggiungibile via mare`); continue; }
        }
        if (!canEnter(u.owner, to, u)) { invalid(i, (denyReason && denyReason(u.owner, to, 'move', u)) || `Ingresso non consentito in ${name(to)}`); continue; }
        ord[i] = mv; continue;
      }
      if (o.type === 'support') {
        const target = o.target; const to = (o.to == null || o.to === target) ? null : o.to;
        if (!nodeOf(target)) { invalid(i, 'Provincia da sostenere sconosciuta'); continue; }
        if (target === u.loc) { invalid(i, "Un'unità non può sostenere se stessa"); continue; }
        if (to != null && !nodeOf(to)) { invalid(i, 'Destinazione del supporto sconosciuta'); continue; }
        const dest = to == null ? target : to;
        if (dest === u.loc) { invalid(i, 'Non si può sostenere un movimento verso la propria provincia'); continue; }
        if (!(u.type === 'F' ? hasF(here, dest) : hasA(here, dest))) { invalid(i, `L'unità in ${name(u.loc)} non può raggiungere ${name(dest)}: supporto impossibile`); continue; }
        if (!canSupport(u.owner, dest, to == null ? 'hold' : 'move', u)) { invalid(i, (denyReason && denyReason(u.owner, dest, 'support', u)) || `Supporto non consentito verso ${name(dest)}`); continue; }
        ord[i] = { type: 'support', target, to }; continue;
      }
      if (o.type === 'convoy') {
        if (u.type !== 'F' || here.kind !== 'sea') { invalid(i, 'Solo una flotta in mare può convogliare'); continue; }
        const fn = nodeOf(o.from), tn = nodeOf(o.to);
        if (!fn || !tn || fn.kind !== 'coast' || tn.kind !== 'coast' || o.from === o.to) { invalid(i, 'Il convoglio richiede una partenza e un arrivo costieri distinti'); continue; }
        ord[i] = { type: 'convoy', from: o.from, to: o.to }; continue;
      }
      invalid(i, `Ordine sconosciuto (${o.type})`);
    }

    // ---- catene di convoglio statiche: solo le flotte su un percorso possibile ----
    const convoyByKey = new Map();
    for (let i = 0; i < n; i++) if (ord[i].type === 'convoy' && !ord[i].invalid) { const k = ord[i].from + '|' + ord[i].to; if (!convoyByKey.has(k)) convoyByKey.set(k, []); convoyByKey.get(k).push(i); }
    const reachSet = (start, fleets) => {
      const seen = new Set(); const q = [];
      fleets.forEach(f => { if (hasF(nodeOf(start), U[f].loc) || hasF(nodeOf(U[f].loc), start)) { seen.add(f); q.push(f); } });
      for (let h = 0; h < q.length; h++) { const a = nodeOf(U[q[h]].loc); fleets.forEach(f => { if (!seen.has(f) && hasF(a, U[f].loc)) { seen.add(f); q.push(f); } }); }
      return seen;
    };
    for (let i = 0; i < n; i++) {
      const o = ord[i]; if (o.type !== 'move' || !o.convoyed) continue;
      const fleets = convoyByKey.get(U[i].loc + '|' + o.to) || [];
      const fw = reachSet(U[i].loc, fleets), bw = reachSet(o.to, fleets);
      const useful = fleets.filter(f => fw.has(f) && bw.has(f));
      if (useful.length) { o.useful = useful; continue; }
      if (o.adjacent) { ord[i] = { type: 'move', to: o.to, convoyed: false }; continue; }
      // ordine legale ma senza convoglio: l'esercito resta fermo come movimento fallito (non riceve supporto al mantenimento)
      o.noPath = true; o.useful = [];
      invalid(i, `Nessuna catena di flotte convoglia l'esercito da ${name(U[i].loc)} a ${name(o.to)}`, o);
    }

    // ---- abbinamento di supporti e convogli ----
    const sup = Array.from({ length: n }, () => []);
    const convArmy = new Int32Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      const o = ord[j]; if (o.type !== 'support' || o.invalid) continue;
      const k = locIdx.get(o.target);
      if (k === undefined) { o.void = `Nessuna unità da sostenere in ${name(o.target)}`; continue; }
      const match = o.to == null ? ord[k].type !== 'move' : (ord[k].type === 'move' && ord[k].to === o.to);
      if (!match) { o.void = o.to == null ? `L'unità in ${name(o.target)} non tiene la posizione` : `L'unità in ${name(o.target)} non si muove verso ${name(o.to)}`; continue; }
      sup[k].push(j);
    }
    for (let f = 0; f < n; f++) {
      const o = ord[f]; if (o.type !== 'convoy' || o.invalid) continue;
      const k = locIdx.get(o.from);
      if (k === undefined || U[k].type !== 'A' || ord[k].type !== 'move' || !ord[k].convoyed || ord[k].to !== o.to) { o.void = `Nessun esercito da convogliare da ${name(o.from)} a ${name(o.to)}`; continue; }
      convArmy[f] = k;
    }
    const into = new Map();
    for (let i = 0; i < n; i++) if (ord[i].type === 'move') { const d = ord[i].to; if (!into.has(d)) into.set(d, []); into.get(d).push(i); }
    const h2h = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const o = ord[i]; if (o.type !== 'move' || o.convoyed) continue;
      const k = locIdx.get(o.to);
      if (k !== undefined && ord[k].type === 'move' && !ord[k].convoyed && ord[k].to === U[i].loc) h2h[i] = k;
    }
    // bonus calcolati una volta sola (determinismo, contesto chiamato al minimo)
    const mB = new Int32Array(n), hB = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const air = airOf(U[i]);
      mB[i] = ord[i].type === 'move' ? Math.max(1, 1 + num(ctx.attackBonus ? ctx.attackBonus(U[i], ord[i].to) : 0) + air) : 1;
      hB[i] = ord[i].type !== 'move' ? Math.max(1, 1 + num(ctx.holdBonus ? ctx.holdBonus(U[i]) : 0) + air) : 1;
    }
    const garCache = new Map();
    const garAt = (D) => {
      if (locIdx.has(D)) return null;
      if (!garCache.has(D)) { const gr = garrisonF(D); garCache.set(D, gr && gr.owner != null && num(gr.strength) > 0 ? { owner: gr.owner, strength: num(gr.strength) } : null); }
      return garCache.get(D);
    };

    // ---- risolutore con ipotesi (Kruijswijk) ----
    const state = new Uint8Array(n), res = new Uint8Array(n), szyk = new Uint8Array(n);
    const dep = [];
    let backups = 0;

    function R(i) {
      if (state[i] === RESOLVED) return res[i] === OK;
      // ogni consultazione di un'ipotesi va registrata (anche se già in lista), altrimenti chi la consulta
      // risulterebbe indipendente dalle ipotesi e verrebbe risolto con un valore provvisorio
      if (state[i] === GUESSING) { dep.push(i); return res[i] === OK; }
      const old = dep.length;
      res[i] = FAIL; state[i] = GUESSING;
      const first = decide(i);
      if (dep.length === old) {
        if (state[i] !== RESOLVED) { res[i] = first; state[i] = RESOLVED; }
        return res[i] === OK;
      }
      if (dep[old] !== i) { dep.push(i); res[i] = first; return first === OK; }
      // il risultato dipende dalla nostra stessa ipotesi: prova l'altra
      while (dep.length > old) state[dep.pop()] = UNRESOLVED;
      res[i] = OK; state[i] = GUESSING;
      const second = decide(i);
      if (first === second) {
        while (dep.length > old) state[dep.pop()] = UNRESOLVED;
        res[i] = first; state[i] = RESOLVED; return first === OK;
      }
      backupRule(old);
      return R(i);
    }
    // Ciclo con due soluzioni o nessuna: movimento circolare oppure paradosso di convoglio (Szykman).
    function backupRule(old) {
      const cyc = uniq(dep.slice(old));
      dep.length = old;
      backups++;
      let progress = false;
      if (cyc.some(x => ord[x].type === 'convoy')) {
        // Szykman: gli eserciti convogliati attraverso le flotte del ciclo non si muovono e non tagliano supporti
        cyc.forEach(x => { if (ord[x].type === 'convoy' && convArmy[x] >= 0 && !szyk[convArmy[x]]) { szyk[convArmy[x]] = 1; progress = true; } });
        if (progress) { cyc.forEach(x => { if (state[x] !== RESOLVED) state[x] = UNRESOLVED; }); return; }
      }
      // movimento circolare: tutti i movimenti del ciclo riescono
      cyc.forEach(x => { if (ord[x].type === 'move' && state[x] !== RESOLVED) { res[x] = OK; state[x] = RESOLVED; progress = true; } else if (state[x] !== RESOLVED) state[x] = UNRESOLVED; });
      if (!progress || backups > 4 * n + 50) { const x = cyc[0]; res[x] = FAIL; state[x] = RESOLVED; cyc.forEach(y => { if (state[y] !== RESOLVED) state[y] = UNRESOLVED; }); }
    }

    // percorso di convoglio (array di mari) o null; per i movimenti diretti []
    function route(i, wantRoute) {
      const o = ord[i]; if (!o.convoyed) return [];
      if (o.noPath || szyk[i]) return NO_ROUTE;
      const origin = nodeOf(U[i].loc); const useful = o.useful;
      const prev = new Map(); const q = [];
      for (const f of useful) if ((hasF(origin, U[f].loc) || hasF(nodeOf(U[f].loc), U[i].loc)) && R(f)) { prev.set(f, -1); q.push(f); }
      for (let h = 0; h < q.length; h++) {
        const f = q[h]; const fn = nodeOf(U[f].loc);
        if (hasF(fn, o.to)) {
          if (!wantRoute) return true;
          const r = []; for (let x = f; x !== -1; x = prev.get(x)) r.unshift(U[x].loc); return r;
        }
        for (const k of useful) if (!prev.has(k) && hasF(fn, U[k].loc) && R(k)) { prev.set(k, f); q.push(k); }
      }
      return NO_ROUTE;
    }
    const pathOk = (i) => route(i, false) !== NO_ROUTE;

    function supCount(k, excl) {
      let c = 0; const L = sup[k];
      for (let t = 0; t < L.length; t++) { const j = L[t]; if (excl != null && friendly(U[j].owner, excl)) continue; if (R(j)) c++; }
      return c;
    }
    function attackStr(i) {
      if (!pathOk(i)) return 0;
      const D = ord[i].to; const k = locIdx.get(D); const me = U[i].owner;
      if (k === undefined) {
        const gr = garAt(D);
        if (gr && !friendly(gr.owner, me)) return mB[i] + supCount(i, gr.owner);
        return mB[i] + supCount(i, null);
      }
      if (ord[k].type === 'move' && h2h[i] !== k && R(k)) return mB[i] + supCount(i, null);
      if (friendly(U[k].owner, me)) return 0; // non si sloggia un'unità amica
      return mB[i] + supCount(i, U[k].owner); // i supporti amici del difensore non contano
    }
    const defendStr = (k) => mB[k] + supCount(k, null);
    function holdStr(D, me) {
      const k = locIdx.get(D);
      if (k === undefined) { const gr = garAt(D); return gr && !friendly(gr.owner, me) ? gr.strength : 0; }
      if (ord[k].type === 'move') return R(k) ? 0 : 1;
      return hB[k] + supCount(k, null);
    }
    function preventStr(c) {
      if (!pathOk(c)) return 0;
      const p = h2h[c]; if (p >= 0 && R(p)) return 0;
      return mB[c] + supCount(c, null);
    }
    function decideMove(i) {
      const a = attackStr(i); if (a <= 0 || szyk[i]) return FAIL;
      const D = ord[i].to; const p = h2h[i];
      if (p >= 0) { if (a <= defendStr(p)) return FAIL; }
      else if (a <= holdStr(D, U[i].owner)) return FAIL;
      const L = into.get(D);
      for (let t = 0; t < L.length; t++) { const c = L[t]; if (c !== i && a <= preventStr(c)) return FAIL; }
      return OK;
    }
    // un esercito convogliato non taglia il supporto a un attacco contro una flotta del proprio convoglio
    function againstOwnConvoy(j, m) {
      if (ord[j].to == null) return false;
      const f = locIdx.get(ord[j].to); return f !== undefined && convArmy[f] === m;
    }
    function decideSupport(j) {
      if (U[j].suppressed) return FAIL;
      const L = into.get(U[j].loc); if (!L) return OK;
      const dest = ord[j].to == null ? ord[j].target : ord[j].to; const me = U[j].owner;
      for (const m of L) {
        if (friendly(U[m].owner, me) || U[m].loc === dest) continue;
        if (ord[m].convoyed && againstOwnConvoy(j, m)) continue;
        if (pathOk(m)) return FAIL; // taglio
      }
      for (const m of L) if (!friendly(U[m].owner, me) && R(m)) return FAIL; // sloggiato
      return OK;
    }
    function decideConvoy(f) {
      const L = into.get(U[f].loc); if (!L) return OK;
      for (const m of L) if (!friendly(U[m].owner, U[f].owner) && R(m)) return FAIL;
      return OK;
    }
    function decide(i) {
      const t = ord[i].type;
      return t === 'move' ? decideMove(i) : t === 'support' ? decideSupport(i) : decideConvoy(i);
    }
    const isDecision = (i) => { const o = ord[i]; return o.type === 'move' || ((o.type === 'support' || o.type === 'convoy') && !o.invalid && !o.void); };

    for (let i = 0; i < n; i++) if (isDecision(i)) R(i);
    // dopo eventuali reset di Szykman tutte le decisioni devono risultare risolte
    for (let pass = 0; pass < 3; pass++) { let again = false; for (let i = 0; i < n; i++) if (isDecision(i) && state[i] !== RESOLVED) { R(i); again = true; } if (!again) break; }

    // ---- risultati ----
    const moved = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (ord[i].type === 'move' && R(i)) moved[i] = 1;
    const dislodgedBy = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) if (!moved[i]) { const L = into.get(U[i].loc); if (L) for (const m of L) if (moved[m]) { dislodgedBy[i] = m; break; } }
    const holdStrOf = (k) => (ord[k].type === 'move' ? (moved[k] ? 0 : 1) : hB[k] + supCount(k, null));

    const results = {}, strengths = {}, dislodged = [], moves = [], events = [], battles = [], bounces = [], retreatEv = [];
    for (let i = 0; i < n; i++) {
      const u = U[i], o = ord[i]; let r;
      if (dislodgedBy[i] >= 0) r = 'dislodged';
      else if (o.invalid) r = 'invalid';
      else if (o.type === 'move') r = moved[i] ? 'ok' : (pathOk(i) ? 'bounced' : 'void');
      else if (o.type === 'support') r = o.void ? 'void' : (R(i) ? 'ok' : 'cut');
      else if (o.type === 'convoy') r = o.void ? 'void' : 'ok';
      else r = 'ok';
      results[u.id] = r;
      strengths[u.id] = o.type === 'move' ? (attackStr(i) || preventStr(i)) : holdStrOf(i);
      if (o.type === 'move') {
        const rt = o.convoyed ? (route(i, true) || (o.useful.length ? o.useful.map(f => U[f].loc) : [])) : null;
        const ev = { phase: 'move', type: 'move', unit: u.id, owner: u.owner, utype: u.type, from: u.loc, to: o.to, ok: !!moved[i] };
        if (o.convoyed) ev.convoy = rt;
        events.push(ev);
        if (moved[i]) { const mv = { unitId: u.id, from: u.loc, to: o.to }; if (o.convoyed) mv.convoy = rt; moves.push(mv); }
        else if (pathOk(i)) bounces.push({ phase: 'battle', type: 'bounce', unit: u.id, owner: u.owner, from: u.loc, to: o.to });
      } else if (o.type === 'support') {
        events.push({ phase: 'move', type: 'support', unit: u.id, owner: u.owner, utype: u.type, from: u.loc, target: o.target, to: o.to == null ? o.target : o.to, hold: o.to == null, cut: !o.void && !R(i), void: !!o.void });
      } else if (o.type === 'convoy') {
        events.push({ phase: 'move', type: 'convoy', unit: u.id, owner: u.owner, utype: u.type, at: u.loc, from: o.from, to: o.to, ok: !o.void && R(i), void: !!o.void });
      } else events.push({ phase: 'move', type: 'hold', unit: u.id, owner: u.owner, utype: u.type, at: u.loc });
      if (dislodgedBy[i] >= 0) {
        const m = dislodgedBy[i];
        dislodged.push({ unitId: u.id, by: U[m].id, from: U[m].loc, loc: u.loc, viaConvoy: !!ord[m].convoyed });
        retreatEv.push({ phase: 'retreat', type: 'dislodge', unit: u.id, owner: u.owner, utype: u.type, at: u.loc, by: U[m].id, from: U[m].loc });
      }
    }
    // battaglie: province con movimenti contrastati
    for (const [D, all] of into) {
      let movers = all.filter(m => pathOk(m)); if (!movers.length) continue;
      const k = locIdx.get(D); let def = -1;
      if (k !== undefined) {
        if (!moved[k]) def = k;
        else if (h2h[k] >= 0 && movers.includes(h2h[k])) { movers = movers.filter(m => m !== h2h[k]); if (!movers.length) continue; }
      }
      const headToHead = def >= 0 && h2h[def] >= 0 && movers.includes(h2h[def]);
      if (headToHead && movers.length === 1 && !moved[movers[0]] && dislodgedBy[def] < 0 && def > movers[0]) continue; // pareggio frontale già registrato
      let gr = k === undefined ? garAt(D) : null;
      if (gr && !movers.some(m => !friendly(gr.owner, U[m].owner))) gr = null;
      const win = movers.find(m => moved[m]);
      if (movers.length === 1 && def < 0 && !gr && win !== undefined) continue; // movimento semplice
      if (movers.length === 1 && def >= 0 && friendly(U[def].owner, U[movers[0]].owner)) continue; // rimbalzo su unità amica
      const st = {};
      movers.forEach(m => { st[U[m].id] = attackStr(m) || preventStr(m); });
      if (def >= 0) st[U[def].id] = headToHead ? defendStr(def) : holdStrOf(def);
      const ev = { phase: 'battle', type: 'battle', at: D, attackers: movers.map(m => U[m].id), defender: def >= 0 ? U[def].id : null, winner: win !== undefined ? U[win].id : (def >= 0 && dislodgedBy[def] < 0 ? U[def].id : null), strengths: st };
      if (headToHead) ev.headToHead = true;
      if (gr) { ev.garrison = { owner: gr.owner, strength: gr.strength }; ev.garrisonHeld = win === undefined; }
      battles.push(ev);
    }
    const occupiedAfter = new Set(); for (let i = 0; i < n; i++) occupiedAfter.add(moved[i] ? ord[i].to : U[i].loc);
    const standoffs = [...into.keys()].filter(D => !occupiedAfter.has(D) && !garAt(D) && into.get(D).some(m => !moved[m] && pathOk(m)));
    return {
      results, dislodged, moves, events: [...invalidEv, ...events, ...battles, ...bounces, ...retreatEv], standoffs, strengths,
      garrisonsTaken: [...into.keys()].filter(D => garAt(D) && into.get(D).some(m => moved[m] && !friendly(garAt(D).owner, U[m].owner))),
      orders: Object.fromEntries(U.map((u, i) => [u.id, Object.assign({}, ord[i], { useful: undefined })])),
    };
  };

  // =====================================================================
  // 3. STATO DI GIOCO: helper
  // =====================================================================
  function ensure(s) {
    if (!Array.isArray(s.units)) s.units = [];
    if (typeof s.unitSeq !== 'number') s.unitSeq = s.units.reduce((a, u) => Math.max(a, +String(u.id).replace(/\D/g, '') || 0), 0);
    if (!s.milOrders || typeof s.milOrders !== 'object') s.milOrders = {};
    if (!Array.isArray(s.airOrders)) s.airOrders = [];
    if (!Array.isArray(s.agreements)) s.agreements = [];
    if (!Array.isArray(s.milPreEvents)) s.milPreEvents = [];
    return s;
  }
  M.ensure = (s) => { ensure(s); if (!s.units.length && !s.milInit && M.ready()) M.init(s); return s; };

  const atWarS = (s, a, b) => { if (!a || !b || a === b) return false; const E = Eng(); if (E && E.atWar) return E.atWar(s, a, b); return (s.wars || []).some(w => (w.attackers.includes(a) && w.defenders.includes(b)) || (w.attackers.includes(b) && w.defenders.includes(a))); };
  const alliesS = (s, a) => { const E = Eng(); if (!s.nations || !s.nations[a]) return []; if (E && E.alliesOf) return E.alliesOf(s, a); return (s.treaties || []).filter(t => t.type === 'difesa' && (t.a === a || t.b === a)).map(t => (t.a === a ? t.b : t.a)); };
  const governs = (s, id) => { const E = Eng(); return E && E.playerGoverns ? E.playerGoverns(s, id) : id === s.player; };
  const rand = () => { const E = Eng(); return E && E.rand ? E.rand() : Math.random(); };
  const natLabel = (s, id) => { const n = s.nations && s.nations[id]; return n ? `${n.flag || ''} ${n.name}`.trim() : String(id); };
  const news = (s, text, kind, actors) => { const E = Eng(); if (E && E.news && Array.isArray(s.news)) E.news(s, text, kind, actors); };
  const alive = (s) => Object.keys(s.nations || {}).filter(id => !s.nations[id].destroyed);

  function regionOf(s, id) {
    const nd = node(id); if (!nd || nd.kind === 'sea' || !nd.nation || !s.nations) return null;
    const n = s.nations[nd.nation]; return n && n.regions ? n.regions[nd.idx] || null : null;
  }
  M.region = regionOf;
  M.controller = (s, id) => { const nd = node(id); if (!nd || nd.kind === 'sea' || !nd.nation) return null; const r = regionOf(s, id); return (r && r.controller) || nd.nation; };
  const irradiated = (s, id) => { const r = regionOf(s, id); return !!(r && r.irradiatedUntil && r.irradiatedUntil > s.turn); };
  M.irradiated = irradiated;
  M.unitsOf = (s, id) => (s.units || []).filter(u => u.owner === id);
  M.unitAt = (s, prov) => (s.units || []).find(u => u.loc === prov) || null;
  M.unitById = (s, id) => (s.units || []).find(u => u.id === id) || null;
  const shareOf = (s, id) => { const r = regionOf(s, id); return r ? r.share || 0 : 0; };
  const capitalProv = (nation) => M.provincesOf(nation).find(p => node(p).capital) || M.provincesOf(nation)[0] || null;
  M.capitalOf = capitalProv;

  M.caps = (s, id) => {
    const n = s.nations && s.nations[id];
    if (!n || n.destroyed) return { army: 0, fleet: 0, air: 0, A: 0, F: 0, total: 0 };
    const coastal = M.ready() ? M.provincesOf(id).some(p => node(p).kind === 'coast') : true;
    const army = clamp(Math.round((n.army || 0) / 15), 1, 8);
    const fleet = coastal ? clamp(Math.round((n.navy || 0) / 20), 0, 6) : 0;
    const air = clamp(Math.round((n.air || 0) / 25), 0, 4);
    return { army, fleet, air, A: army, F: fleet, total: army + fleet };
  };

  function newUnit(s, owner, type, loc) { const u = { id: 'U' + (++s.unitSeq), owner, type, loc }; s.units.push(u); return u; }
  function lossOf(s, u) {
    const n = s.nations && s.nations[u.owner]; if (!n) return;
    if (u.type === 'F') n.navy = Math.max(0, (n.navy || 0) - 10); else n.army = Math.max(3, (n.army || 0) - 7);
  }
  function removeUnit(s, u, combat) { const i = s.units.indexOf(u); if (i >= 0) s.units.splice(i, 1); if (combat) lossOf(s, u); }

  // Contesto di aggiudicazione costruito dallo stato (regole §4 e §5)
  function gameCtx(s, airBonus) {
    const warC = new Map(), allyC = new Map();
    const atWar = (a, b) => { if (!a || !b || a === b) return false; const k = a < b ? a + '|' + b : b + '|' + a; let v = warC.get(k); if (v === undefined) { v = atWarS(s, a, b); warC.set(k, v); } return v; };
    const allies = (a) => { let v = allyC.get(a); if (!v) { v = new Set(alliesS(s, a)); allyC.set(a, v); } return v; };
    const isAlly = (a, b) => !!a && !!b && a !== b && (allies(a).has(b) || allies(b).has(a));
    const access = (a, b) => (s.agreements || []).some(g => g.kind === 'access' && g.status !== 'revoked' && g.from === a && g.to === b && s.turn >= g.turn && s.turn < g.until);
    const occ = new Map((s.units || []).map(u => [u.loc, u]));
    const canEnter = (owner, prov) => {
      const nd = node(prov); if (!nd) return false;
      if (nd.kind === 'sea') return true;
      if (irradiated(s, prov)) return false;
      const c = M.controller(s, prov);
      return !c || c === owner || atWar(owner, c) || isAlly(owner, c) || access(owner, c);
    };
    const canSupport = (owner, dest, kind) => {
      if (irradiated(s, dest)) return false;
      if (kind === 'hold') return true;
      const u = occ.get(dest); const X = u ? u.owner : M.controller(s, dest);
      return !X || X === owner || atWar(owner, X) || isAlly(owner, X);
    };
    const denyReason = (owner, prov, kind) => {
      if (irradiated(s, prov)) return `${M.provName(prov)} è una zona irradiata: nessuna unità può entrarvi${kind === 'support' ? ' né ricevere supporti' : ''}`;
      const u = occ.get(prov); const X = kind === 'support' && u ? u.owner : M.controller(s, prov);
      if (kind === 'support') return `Supporto verso ${M.provName(prov)} non consentito: non siete in guerra con ${natLabel(s, X)}`;
      return `${M.provName(prov)} è territorio di ${natLabel(s, X)}, nazione neutrale: serve una guerra, un'alleanza o un accesso militare`;
    };
    const holdBonus = (u) => {
      const nd = node(u.loc); if (!nd || !nd.nation || nd.nation !== u.owner) return 0;
      const n = s.nations[u.owner]; let b = 0;
      if (nd.capital && M.controller(s, u.loc) === u.owner) b++;
      if (n && n.vision === 'fortress') b++;
      return b;
    };
    const garrison = (prov) => {
      const nd = node(prov); if (!nd || !nd.capital || !nd.nation) return null;
      const owner = nd.nation; const n = s.nations[owner];
      if (!n || n.destroyed || M.controller(s, prov) !== owner || irradiated(s, prov)) return null;
      const E = Eng(); const wars = E && E.warsOf ? E.warsOf(s, owner).length : (s.wars || []).filter(w => w.attackers.includes(owner) || w.defenders.includes(owner)).length;
      if (!wars) return null;
      return { owner, strength: 1 + ((n.perks && n.perks.guard) || n.vision === 'fortress' ? 1 : 0) };
    };
    return { graph: G(), atWar, friendly: (a, b) => a === b || !atWar(a, b), isAlly, canEnter, canSupport, denyReason, holdBonus, attackBonus: () => 0, airBonus: airBonus || {}, garrison, provName: M.provName };
  }
  M.context = gameCtx;

  // =====================================================================
  // 4. SCHIERAMENTO INIZIALE (§7)
  // =====================================================================
  M.init = (s) => {
    ensure(s);
    s.units = []; s.unitSeq = 0; s.milOrders = {}; s.airOrders = []; s.milPreEvents = []; s.lastResolution = null; s.milInit = true;
    if (!M.ready() || !s.nations) return s;
    const ids = alive(s); const taken = new Set();
    const free = (p) => !taken.has(p) && !irradiated(s, p);
    const place = (owner, type, loc) => { taken.add(loc); return newUnit(s, owner, type, loc); };
    const home = (id) => M.provincesOf(id).filter(p => M.controller(s, p) === id);
    const sortHome = (id, arr) => arr.slice().sort((a, b) => (node(b).capital - node(a).capital) || (shareOf(s, b) - shareOf(s, a)) || ((node(a).idx || 0) - (node(b).idx || 0)));
    const left = {};
    // 1) eserciti: prima i territori occupati (presidio), poi le province di casa sul fronte di guerra,
    //    poi la capitale e le altre per quota di PIL
    ids.forEach(id => {
      const c = M.caps(s, id); let k = c.army;
      const occupied = M.provincesOf ? M.controlled(s, id).filter(p => node(p).nation !== id) : [];
      const enemies = new Set(ids.filter(o => o !== id && atWarS(s, id, o)));
      const onFront = (p) => node(p).armyAdj.some(q => enemies.has(M.controller(s, q)));
      const homeSorted = sortHome(id, home(id)).sort((a, b) => (onFront(b) - onFront(a)) || (node(b).capital - node(a).capital));
      for (const p of [...occupied, ...homeSorted]) { if (!k) break; if (free(p)) { place(id, 'A', p); k--; } }
      left[id] = { A: k, F: c.fleet };
    });
    // 2) schieramenti navali realistici
    ids.forEach(id => (M.FLEET_PREF[id] || []).forEach(z => { if (left[id].F > 0 && node(z) && node(z).kind === 'sea' && free(z)) { place(id, 'F', z); left[id].F--; } }));
    // 3) altre flotte: porti di casa liberi, poi mari adiacenti, poi mari entro due passi
    ids.forEach(id => {
      if (left[id].F <= 0) return;
      const ports = sortHome(id, home(id).filter(p => node(p).kind === 'coast'));
      for (const p of ports) { if (left[id].F <= 0) break; if (free(p)) { place(id, 'F', p); left[id].F--; } }
      if (left[id].F > 0) {
        const d = distances(ports, nbAll, 3); const seas = [...d.keys()].filter(z => node(z).kind === 'sea').sort((a, b) => d.get(a) - d.get(b) || (a < b ? -1 : 1));
        for (const z of seas) { if (left[id].F <= 0) break; if (free(z)) { place(id, 'F', z); left[id].F--; } }
      }
    });
    // 4) eserciti in eccesso: presenza avanzata presso gli alleati, prima sui fronti caldi
    const E = Eng();
    ids.forEach(id => {
      if (left[id].A <= 0) return;
      const hostile = new Set(ids.filter(o => o !== id && (atWarS(s, id, o) || (E && E.getRel ? E.getRel(s, id, o) < -30 : false))));
      const cands = [];
      alliesS(s, id).forEach(al => M.provincesOf(al).forEach(p => {
        if (!free(p) || M.controller(s, p) !== al) return;
        const front = node(p).armyAdj.some(q => hostile.has(M.controller(s, q))) ? 2 : 0;
        cands.push({ p, score: front + shareOf(s, p) });
      }));
      cands.sort((a, b) => b.score - a.score || (a.p < b.p ? -1 : 1));
      for (const c of cands) { if (left[id].A <= 0) break; if (free(c.p)) { place(id, 'A', c.p); left[id].A--; } }
    });
    return s;
  };

  // =====================================================================
  // 5. INTERFACCIA: mosse e supporti legali
  // =====================================================================
  function convoyReach(s, u, ctx) {
    // mari raggiungibili attraverso flotte proprie o alleate, a partire dalla costa dell'esercito
    const out = new Map(); const nd = node(u.loc); if (!nd || nd.kind !== 'coast' || u.type !== 'A') return out;
    const fleetAt = new Map((s.units || []).filter(f => f.type === 'F' && (f.owner === u.owner || ctx.isAlly(f.owner, u.owner))).map(f => [f.loc, f]));
    const seen = new Set(); const q = [];
    nd.fleetAdj.forEach(z => { if (node(z).kind === 'sea' && fleetAt.has(z)) { seen.add(z); q.push(z); } });
    for (let h = 0; h < q.length; h++) node(q[h]).fleetAdj.forEach(z => { if (!seen.has(z) && node(z).kind === 'sea' && fleetAt.has(z)) { seen.add(z); q.push(z); } });
    seen.forEach(z => node(z).fleetAdj.forEach(p => { if (node(p).kind === 'coast' && p !== u.loc && !out.has(p)) out.set(p, z); }));
    return out;
  }
  M.legalMoves = (s, unitId, opts) => {
    const u = M.unitById(s, unitId); if (!u || !M.ready()) return [];
    const nd = node(u.loc); if (!nd) return [];
    const ctx = gameCtx(s); const out = [];
    (u.type === 'A' ? nd.armyAdj : nd.fleetAdj).forEach(p => { if (ctx.canEnter(u.owner, p)) out.push(opts && opts.detailed ? { to: p, convoy: false } : p); });
    if (u.type === 'A') convoyReach(s, u, ctx).forEach((z, p) => { if (!nd._a.has(p) && ctx.canEnter(u.owner, p)) out.push(opts && opts.detailed ? { to: p, convoy: true } : p); });
    return out;
  };
  M.legalSupports = (s, unitId) => {
    const u = M.unitById(s, unitId); if (!u || !M.ready()) return [];
    const nd = node(u.loc); if (!nd) return [];
    const ctx = gameCtx(s); const at = new Map(s.units.map(x => [x.loc, x])); const out = [];
    (u.type === 'A' ? nd.armyAdj : nd.fleetAdj).forEach(D => {
      if (irradiated(s, D)) return;
      const X = at.get(D);
      if (X && !ctx.atWar(u.owner, X.owner)) out.push({ kind: 'hold', unit: X.id, target: D });
      if (!ctx.canSupport(u.owner, D, 'move')) return;
      nbAll(D).forEach(src => {
        const Y = at.get(src); if (!Y || Y === u || ctx.atWar(u.owner, Y.owner)) return;
        const yn = node(src); if (!(Y.type === 'A' ? hasA(yn, D) : hasF(yn, D))) return;
        if (X && X.owner === Y.owner) return;
        if (ctx.canEnter(Y.owner, D)) out.push({ kind: 'move', unit: Y.id, target: src, to: D });
      });
    });
    return out;
  };
  M.legalConvoys = (s, unitId) => {
    const f = M.unitById(s, unitId); if (!f || f.type !== 'F' || !node(f.loc) || node(f.loc).kind !== 'sea') return [];
    const ctx = gameCtx(s); const out = [];
    nbAll(f.loc).forEach(p => {
      const a = M.unitAt(s, p); if (!a || a.type !== 'A' || (a.owner !== f.owner && !ctx.isAlly(a.owner, f.owner))) return;
      convoyReach(s, a, ctx).forEach((z, to) => { if (ctx.canEnter(a.owner, to)) out.push({ unit: a.id, from: p, to }); });
    });
    return out;
  };
  M.convoyRoute = (s, unitId, to) => { const u = M.unitById(s, unitId); if (!u) return null; const r = convoyReach(s, u, gameCtx(s)); return r.has(to) ? r.get(to) : null; };
  M.describeOrder = (s, unitId, o) => {
    const u = M.unitById(s, unitId); const t = u ? (u.type === 'F' ? 'F' : 'A') : '?'; const at = u ? M.provName(u.loc) : '?'; const P = M.provName;
    if (!o || o.type === 'hold') return `${t} ${at} tiene`;
    if (o.type === 'move') return `${t} ${at} → ${P(o.to)}`;
    if (o.type === 'support') return o.to == null || o.to === o.target ? `${t} ${at} sostiene ${P(o.target)}` : `${t} ${at} sostiene ${P(o.target)} → ${P(o.to)}`;
    if (o.type === 'convoy') return `${t} ${at} convoglia ${P(o.from)} → ${P(o.to)}`;
    return `${t} ${at}: ordine sconosciuto`;
  };
  M.setOrder = (s, unitId, order) => { ensure(s); if (order == null) delete s.milOrders[unitId]; else s.milOrders[unitId] = Object.assign({ unit: unitId }, order); return s.milOrders; };

  // =====================================================================
  // 6. RAGGIUNGIBILITÀ (sostituisce E.canReach)
  // =====================================================================
  const ctlCache = new WeakMap();
  function controlIndex(s) {
    const g = G(); const land = g.cache.land || (g.cache.land = g.ids().filter(id => g.node(id).kind !== 'sea' && g.node(id).nation));
    const c = ctlCache.get(s);
    if (c && c.g === g) { let same = true; for (let i = 0; i < land.length; i++) if (M.controller(s, land[i]) !== c.snap[i]) { same = false; break; } if (same) return c.idx; }
    const snap = land.map(p => M.controller(s, p)); const idx = new Map();
    land.forEach((p, i) => { const k = snap[i]; if (!idx.has(k)) idx.set(k, new Set()); idx.get(k).add(p); });
    ctlCache.set(s, { g, snap, idx });
    return idx;
  }
  M.controlled = (s, id) => [...(controlIndex(s).get(id) || [])];
  M.canReach = (s, from, to) => {
    const a = s.nations && s.nations[from], b = s.nations && s.nations[to];
    if (!a || !b) return { ok: false, mult: 0 };
    if (!M.ready()) { // senza grafo: vecchia regola per nazioni
      if ((a.neighbors || []).includes(to) || (b.neighbors || []).includes(from)) return { ok: true, mult: 1 };
      if ((a.seaNeighbors || []).includes(to) || (b.seaNeighbors || []).includes(from)) return { ok: (a.navy || 0) >= 15, mult: 0.85 };
      if ((a.navy || 0) >= 35) return { ok: true, mult: 0.6, naval: true };
      return { ok: false, mult: 0 };
    }
    const idx = controlIndex(s); const A = idx.get(from), B = idx.get(to);
    if (!A || !B) return { ok: false, mult: 0 };
    for (const p of A) for (const q of node(p).armyAdj) if (B.has(q)) return { ok: true, mult: 1 };
    const fleets = (s.units || []).some(u => u.owner === from && u.type === 'F');
    if (fleets) for (const q of B) if (node(q).kind === 'coast') return { ok: true, mult: 0.6, naval: true };
    return { ok: false, mult: 0 };
  };

  // =====================================================================
  // 7. ORDINI PRELIMINARI: missili e testate (chiamati dal motore)
  // =====================================================================
  function preSnapshot(s) { ensure(s); if (s.milPreTurn !== s.turn || !Array.isArray(s.milPreUnits)) { s.milPreUnits = cloneUnits(s.units); s.milPreTurn = s.turn; s.milPreEvents = s.milPreEvents.filter(e => e.turn === s.turn); } }
  M.applyStrike = (s, o, hits) => {
    preSnapshot(s); hits = Math.max(0, num(hits));
    const prov = o.prov || capitalProv(o.target);
    const ev = { phase: 'strike', type: 'strike', turn: s.turn, from: o.from, target: o.target, prov, count: o.count, hits };
    const u = o.prov ? M.unitAt(s, o.prov) : null;
    if (u && u.owner !== o.from && (u.owner === o.target || atWarS(s, o.from, u.owner))) {
      if (hits >= 40) { removeUnit(s, u, true); ev.destroyed = u.id; ev.destroyedUnit = { ...u }; }
      else if (hits >= 10) { u.suppressed = true; ev.suppressed = u.id; }
    }
    s.milPreEvents.push(ev);
    return ev;
  };
  M.applyNuke = (s, o, hits) => {
    preSnapshot(s); hits = Math.max(0, num(hits));
    const provs = [];
    if (o.prov && hits > 0) { const r = regionOf(s, o.prov); if (r) r.irradiatedUntil = Math.max(r.irradiatedUntil || 0, s.turn + 5); provs.push(o.prov); }
    if (hits > 0 && o.target) M.provincesOf(o.target).forEach(p => { const r = regionOf(s, p); if (r && r.irradiatedUntil === s.turn + 5 && !provs.includes(p)) provs.push(p); });
    if (!provs.length) provs.push(o.prov || capitalProv(o.target));
    const out = [];
    provs.forEach(p => {
      const destroyed = [], destroyedUnits = [];
      const u = hits > 0 ? M.unitAt(s, p) : null;
      if (u) { removeUnit(s, u, true); destroyed.push(u.id); destroyedUnits.push({ ...u }); }
      const ev = { phase: 'nuke', type: 'nuke', turn: s.turn, from: o.from, target: o.target, prov: p, hits, destroyed, destroyedUnits };
      s.milPreEvents.push(ev); out.push(ev);
    });
    return out;
  };

  // =====================================================================
  // 8. ACCORDI IN STILE DIPLOMACY (§8)
  // =====================================================================
  const activeAg = (s, g) => g.status !== 'revoked' && s.turn >= g.turn && s.turn < g.until;
  function supporterFor(s, ai, dest, excludeLoc, ctx) {
    const cands = M.unitsOf(s, ai).filter(u => u.loc !== dest && u.loc !== excludeLoc && (u.type === 'A' ? hasA(node(u.loc), dest) : hasF(node(u.loc), dest)));
    return cands.find(u => ctx.canSupport(ai, dest, 'move')) || null;
  }
  M.requestAgreement = (s, from, to, kind, params) => {
    ensure(s); params = params || {};
    const E = Eng(); const A = s.nations && s.nations[from], B = s.nations && s.nations[to];
    if (!A || !B || from === to) return { ok: false, reason: 'Nazione non valida.' };
    if (B.destroyed) return { ok: false, reason: 'Lo stato non esiste più.' };
    if (from === s.player && !governs(s, from)) return { ok: false, reason: 'Non sei al governo: non puoi negoziare accordi militari.' };
    if (governs(s, to)) return { ok: false, reason: "Gli accordi militari si chiedono alle nazioni guidate dall'IA." };
    if (!M.AGREEMENTS[kind]) return { ok: false, reason: 'Tipo di accordo sconosciuto.' };
    if (atWarS(s, from, to)) return { ok: false, reason: 'Siamo in guerra.' };
    if (s.agreements.some(g => activeAg(s, g) && g.from === from && g.to === to && g.kind === kind && JSON.stringify(g.params) === JSON.stringify(params))) return { ok: false, reason: 'Accordo già in vigore.' };
    const ctx = gameCtx(s);
    const rel = E && E.getRel ? E.getRel(s, to, from) : 0;
    const P = (GEO.PERSONAS && GEO.PERSONAS[B.persona]) || { loyalty: 0.5, aggression: 0.5 };
    const enemiesOf = (x) => alive(s).filter(o => atWarS(s, x, o));
    const common = enemiesOf(from).some(e => atWarS(s, to, e) || (E && E.getRel ? E.getRel(s, to, e) < -40 : false));
    const ally = ctx.isAlly(from, to);
    const score = rel + (common ? 25 : 0) + (ally ? 20 : 0) + (P.loyalty - 0.5) * 20;
    let need = 0, unit = null;
    if (kind === 'support_move') {
      const pu = M.unitAt(s, params.unitFrom); const dest = params.to;
      if (!pu || pu.owner !== from) return { ok: false, reason: 'Non hai unità nella provincia indicata.' };
      if (!node(dest) || !(pu.type === 'A' ? hasA(node(pu.loc), dest) || convoyReach(s, pu, ctx).has(dest) : hasF(node(pu.loc), dest))) return { ok: false, reason: `La tua unità non può raggiungere ${M.provName(dest)}.` };
      const occ = M.unitAt(s, dest); const victim = occ ? occ.owner : M.controller(s, dest);
      if (victim === to) return { ok: false, reason: 'Non sosterremo un attacco contro di noi.' };
      if (victim && victim !== from && !ctx.atWar(to, victim) && !ctx.isAlly(to, victim)) return { ok: false, reason: `Non siamo in guerra con ${natLabel(s, victim)}: non possiamo sostenere quell'attacco.` };
      unit = supporterFor(s, to, dest, pu.loc, ctx);
      if (!unit) return { ok: false, reason: `Non abbiamo unità in grado di raggiungere ${M.provName(dest)}.` };
      need = 35 - P.aggression * 10;
    } else if (kind === 'support_hold') {
      const pu = M.unitAt(s, params.prov);
      if (!pu || pu.owner !== from) return { ok: false, reason: 'Non hai unità nella provincia indicata.' };
      unit = M.unitsOf(s, to).find(u => u.loc !== params.prov && (u.type === 'A' ? hasA(node(u.loc), params.prov) : hasF(node(u.loc), params.prov))) || null;
      if (!unit) return { ok: false, reason: `Non abbiamo unità adiacenti a ${M.provName(params.prov)}.` };
      need = 20;
    } else if (kind === 'dmz') {
      if (!node(params.prov)) return { ok: false, reason: 'Provincia sconosciuta.' };
      need = P.aggression * 30 - 10;
    } else if (kind === 'access') {
      need = 40 + (B.persona === 'isolazionista' ? 25 : 0) - (ally ? 15 : 0);
    }
    if (score < need) return { ok: false, reason: rel < 0 ? `Non ci fidiamo di voi (relazioni ${rel}).` : `L'accordo non ci conviene (relazioni ${rel}${common ? ', nemico comune' : ''}).` };
    s.agreementSeq = (s.agreementSeq || 0) + 1;
    const g = { id: s.agreementSeq, from, to, kind, params: { ...params }, turn: s.turn, until: s.turn + (kind === 'access' ? 8 : 1), unit: unit ? unit.id : null };
    s.agreements.push(g);
    return { ok: true, reason: `${natLabel(s, to)} accetta: ${M.AGREEMENTS[kind]}${kind === 'access' ? ' per 8 turni' : ' per questo turno'}.`, agreement: g };
  };
  const honorProb = (s, ai, other) => {
    const E = Eng(); const n = s.nations[ai]; const P = (GEO.PERSONAS && GEO.PERSONAS[n.persona]) || { loyalty: 0.5 };
    const rel = E && E.getRel ? E.getRel(s, ai, other) : 50;
    return clamp(0.55 + P.loyalty * 0.4 + (rel - 50) / 200, 0.05, 0.98);
  };
  M.honorProbability = honorProb;
  // decide se l'IA onora gli accordi e adegua i suoi ordini; restituisce i controlli da fare dopo l'aggiudicazione
  function processAgreements(s, orders, ctx, events) {
    const checks = [];
    s.agreements.filter(g => activeAg(s, g)).forEach(g => {
      const ai = g.to; const n = s.nations[ai];
      if (!n || n.destroyed || governs(s, ai) || atWarS(s, g.from, ai)) return;
      if (g.kind === 'access') {
        const using = s.units.some(u => u.owner === g.from && (M.controller(s, u.loc) === ai || (orders[u.id] && orders[u.id].type === 'move' && M.controller(s, orders[u.id].to) === ai)));
        if (!using) return;
        const honor = rand() < honorProb(s, ai, g.from);
        if (!honor) { g.status = 'revoked'; checks.push({ g, honor: false, broken: true }); }
        return;
      }
      const honor = rand() < honorProb(s, ai, g.from); let possible = true;
      if (honor) {
        if (g.kind === 'support_move') {
          let u = g.unit && M.unitById(s, g.unit);
          if (!u || u.owner !== ai || !(u.type === 'A' ? hasA(node(u.loc), g.params.to) : hasF(node(u.loc), g.params.to))) u = supporterFor(s, ai, g.params.to, g.params.unitFrom, ctx);
          if (u) orders[u.id] = { unit: u.id, type: 'support', target: g.params.unitFrom, to: g.params.to }; else possible = false;
        } else if (g.kind === 'support_hold') {
          let u = g.unit && M.unitById(s, g.unit);
          if (!u || u.owner !== ai || !(u.type === 'A' ? hasA(node(u.loc), g.params.prov) : hasF(node(u.loc), g.params.prov))) u = M.unitsOf(s, ai).find(x => x.loc !== g.params.prov && (x.type === 'A' ? hasA(node(x.loc), g.params.prov) : hasF(node(x.loc), g.params.prov)));
          if (u) orders[u.id] = { unit: u.id, type: 'support', target: g.params.prov }; else possible = false;
        } else if (g.kind === 'dmz') {
          M.unitsOf(s, ai).forEach(u => { const o = orders[u.id]; if (o && o.type === 'move' && o.to === g.params.prov) orders[u.id] = { unit: u.id, type: 'hold' }; });
        }
      }
      checks.push({ g, honor, possible });
    });
    return checks;
  }
  function checkAgreements(s, checks, orders, events) {
    const E = Eng();
    checks.forEach(({ g, honor, possible, broken }) => {
      const ai = g.to; let kept = !broken;
      if (!broken) {
        const mine = M.unitsOf(s, ai);
        if (g.kind === 'support_move') kept = mine.some(u => { const o = orders[u.id]; return o && o.type === 'support' && o.target === g.params.unitFrom && o.to === g.params.to; });
        else if (g.kind === 'support_hold') kept = mine.some(u => { const o = orders[u.id]; return o && o.type === 'support' && o.target === g.params.prov && (o.to == null || o.to === o.target); });
        else if (g.kind === 'dmz') kept = !Object.keys(orders).some(id => { const u = M.unitById(s, id); const o = orders[id]; return u && u.owner === ai && o && o.type === 'move' && o.to === g.params.prov; });
      }
      if (kept) { events.push({ phase: 'diplomacy', type: 'agreement', from: ai, to: g.from, kind: g.kind, honored: true }); return; }
      if (!broken && honor && possible === false) { events.push({ phase: 'diplomacy', type: 'agreement', from: ai, to: g.from, kind: g.kind, honored: false, impossible: true }); return; }
      const text = `${natLabel(s, ai)} non rispetta l'accordo (${M.AGREEMENTS[g.kind]}${g.params.prov ? ' su ' + M.provName(g.params.prov) : g.params.to ? ' verso ' + M.provName(g.params.to) : ''}) con ${natLabel(s, g.from)}.`;
      events.push({ phase: 'diplomacy', type: 'betrayal', from: ai, to: g.from, kind: g.kind, text });
      if (E && E.changeRel) E.changeRel(s, ai, g.from, -30);
      news(s, `🗡️ Tradimento: ${text}`, 'dip', [ai, g.from]);
    });
  }

  // =====================================================================
  // 9. ORDINI AEREI
  // =====================================================================
  function resolveAir(s, airOrders, orders, ctx, events) {
    const bonus = {}; const byOwner = {};
    const valid = [];
    airOrders.forEach(o => {
      if (!o || !o.owner || !s.nations[o.owner]) return;
      byOwner[o.owner] = (byOwner[o.owner] || 0) + 1;
      if (byOwner[o.owner] > M.caps(s, o.owner).air) { events.push({ phase: 'air', type: 'invalid', owner: o.owner, reason: 'Stormi aerei insufficienti per questo ordine' }); return; }
      valid.push(o);
    });
    const covers = valid.filter(o => o.mode === 'cover' && node(o.prov));
    valid.forEach(o => {
      if (o.mode === 'cover') {
        if (!node(o.prov)) { events.push({ phase: 'air', type: 'invalid', owner: o.owner, reason: 'Provincia da coprire sconosciuta' }); return; }
        events.push({ phase: 'air', type: 'air', owner: o.owner, mode: 'cover', prov: o.prov });
        return;
      }
      if (o.mode !== 'support') { events.push({ phase: 'air', type: 'invalid', owner: o.owner, reason: 'Ordine aereo sconosciuto' }); return; }
      const u = M.unitById(s, o.unit);
      if (!u) { events.push({ phase: 'air', type: 'invalid', owner: o.owner, reason: 'Unità da sostenere inesistente' }); return; }
      if (u.owner !== o.owner && !ctx.isAlly(o.owner, u.owner)) { events.push({ phase: 'air', type: 'invalid', owner: o.owner, unit: u.id, reason: 'Il supporto aereo è riservato alle unità proprie e alleate' }); return; }
      const ord = orders[u.id]; const dest = ord && ord.type === 'move' ? ord.to : null; const over = dest || u.loc;
      const friendlyProv = (p) => { const c = M.controller(s, p); return c === o.owner || ctx.isAlly(o.owner, c); };
      const near = [u.loc, dest].filter(Boolean).some(p => [...distances([p], nbAll, 2).keys()].some(friendlyProv));
      if (!near) { events.push({ phase: 'air', type: 'invalid', owner: o.owner, unit: u.id, reason: `${M.provName(over)} è fuori dal raggio degli stormi (2 passi da un territorio amico)` }); return; }
      const cancelled = !!u.suppressed || covers.some(c => ctx.atWar(c.owner, o.owner) && (c.prov === u.loc || c.prov === dest));
      events.push({ phase: 'air', type: 'air', owner: o.owner, mode: 'support', unit: u.id, prov: over, cancelled, reason: cancelled ? (u.suppressed ? 'unità soppressa dai missili' : 'copertura aerea nemica') : undefined });
      if (!cancelled) bonus[u.id] = (bonus[u.id] || 0) + 1;
    });
    return bonus;
  }

  // =====================================================================
  // 10. TURNO MILITARE (§6)
  // =====================================================================
  function retreatTarget(s, u, d, occupied, standoffs, ctx) {
    const nd = node(u.loc); if (!nd) return null;
    const cap = capitalProv(u.owner); const dCap = cap ? distances([cap], nbAll) : new Map();
    const cands = (u.type === 'A' ? nd.armyAdj : nd.fleetAdj).filter(p => !occupied.has(p) && !standoffs.has(p) && (p !== d.from || d.viaConvoy) && ctx.canEnter(u.owner, p));
    const score = (p) => { const pn = node(p); if (pn.kind === 'sea') return 1; const c = M.controller(s, p); if (c === u.owner) return pn.nation === u.owner ? 4 : 3; if (ctx.isAlly(u.owner, c)) return 2; return 0; };
    cands.sort((a, b) => score(b) - score(a) || (dCap.get(a) ?? 99) - (dCap.get(b) ?? 99) || (a < b ? -1 : 1));
    return cands[0] || null;
  }
  function buildSites(s, id, type, occupied) {
    const homeSc = M.provincesOf(id).filter(p => node(p).sc && M.controller(s, p) === id && !irradiated(s, p));
    const order = (arr) => arr.slice().sort((a, b) => (node(b).capital - node(a).capital) || (shareOf(s, b) - shareOf(s, a)) || ((node(a).idx || 0) - (node(b).idx || 0)));
    if (type === 'A') return order(homeSc).filter(p => !occupied.has(p));
    const ports = order(homeSc.filter(p => node(p).kind === 'coast'));
    const freePorts = ports.filter(p => !occupied.has(p));
    if (freePorts.length) return freePorts;
    return uniq(ports.flatMap(p => node(p).fleetAdj.filter(z => node(z).kind === 'sea' && !occupied.has(z))));
  }
  function frontDistances(s, id, ctx) {
    const enemies = alive(s).filter(o => ctx.atWar(id, o));
    let src = [];
    if (enemies.length) { const idx = controlIndex(s); enemies.forEach(e => (idx.get(e) || []).forEach(p => src.push(p))); s.units.forEach(u => { if (enemies.includes(u.owner)) src.push(u.loc); }); }
    if (!src.length) return { d: distances(M.provincesOf(id), nbAll), invert: false };
    return { d: distances(src, nbAll), invert: false };
  }

  M.resolveTurn = (s, extra) => {
    ensure(s);
    const pre = s.milPreTurn === s.turn ? s.milPreEvents.slice() : [];
    const before = s.milPreTurn === s.turn && Array.isArray(s.milPreUnits) ? s.milPreUnits : cloneUnits(s.units);
    s.milPreEvents = []; s.milPreUnits = null; s.milPreTurn = null;
    if (!M.ready() || !s.nations) { s.milOrders = {}; s.airOrders = []; return null; }
    const E = Eng(); const player = s.player;
    s.units = s.units.filter(u => s.nations[u.owner] && !s.nations[u.owner].destroyed && node(u.loc));
    const byId = new Map(s.units.map(u => [u.id, u]));
    // 1. ordini
    const orders = {}; let air = [];
    const playerOn = governs(s, player);
    if (playerOn) {
      Object.entries(s.milOrders || {}).forEach(([id, o]) => { const u = byId.get(id); if (u && u.owner === player && o) orders[id] = Object.assign({}, o, { unit: id }); });
      air = air.concat((s.airOrders || []).map(o => Object.assign({}, o, { owner: o.owner || player })).filter(o => o.owner === player));
    }
    const AIM = GEO.militaryAI;
    if (AIM && typeof AIM.orders === 'function') {
      let ai = null; try { ai = AIM.orders(s); } catch (err) { ai = null; if (root.console) console.error('militaryAI.orders', err); }
      if (ai) {
        Object.entries(ai.orders || {}).forEach(([id, o]) => { const u = byId.get(id); if (u && !governs(s, u.owner) && o) orders[id] = Object.assign({}, o, { unit: id }); });
        air = air.concat((ai.air || []).filter(o => o && o.owner && !governs(s, o.owner)));
      }
    }
    if (extra) {
      const ex = extra.orders || extra.air ? extra : { orders: extra };
      Object.entries(ex.orders || {}).forEach(([id, o]) => { if (byId.has(id) && o) orders[id] = Object.assign({}, o, { unit: id }); });
      air = air.concat(ex.air || []);
    }
    const events = pre.slice();
    let ctx = gameCtx(s);
    // 2. accordi con il giocatore
    const checks = processAgreements(s, orders, ctx, events);
    ctx = gameCtx(s); // un accesso revocato cambia le regole di ingresso
    // ordini aerei
    const airBonus = resolveAir(s, air, orders, ctx, events);
    ctx.airBonus = airBonus;
    // 3. aggiudicazione
    const res = M.adjudicate(s.units, orders, ctx);
    events.push(...res.events);
    // guerre attive: segna l'attività per evitare la pace per stagnazione
    if (E && E.warOf) s.units.forEach(u => { const o = res.orders[u.id]; if (!o || o.type !== 'move' || o.invalid) return; const occ = M.unitAt(s, o.to); const X = occ ? occ.owner : M.controller(s, o.to); if (X && ctx.atWar(u.owner, X)) { const w = E.warOf(s, u.owner, X); if (w) w.lastAction = s.turn; } });
    // 4. applicazione: movimenti, ritirate
    res.moves.forEach(m => { const u = byId.get(m.unitId); if (u) u.loc = m.to; });
    const dislodgedIds = new Set(res.dislodged.map(d => d.unitId));
    const occupied = new Set(s.units.filter(u => !dislodgedIds.has(u.id)).map(u => u.loc));
    const standoffs = new Set(res.standoffs);
    const destroyed = [];
    res.dislodged.forEach(d => {
      const u = byId.get(d.unitId); if (!u) return;
      const to = retreatTarget(s, u, d, occupied, standoffs, ctx);
      if (to) { events.push({ phase: 'retreat', type: 'retreat', unit: u.id, owner: u.owner, utype: u.type, from: u.loc, to }); u.loc = to; occupied.add(to); }
      else { events.push({ phase: 'retreat', type: 'destroy', unit: u.id, owner: u.owner, utype: u.type, at: u.loc, reason: 'Nessuna ritirata possibile', by: d.by }); destroyed.push(u); }
    });
    destroyed.forEach(u => removeUnit(s, u, true));
    // 5. occupazioni
    const capitulations = [];
    s.units.forEach(u => {
      if (u.type !== 'A') return;
      const nd = node(u.loc); if (!nd || nd.kind === 'sea' || !nd.nation) return;
      const r = regionOf(s, u.loc); if (!r) return;
      const ctrl = M.controller(s, u.loc); if (ctrl === u.owner) return;
      if (!ctx.atWar(u.owner, ctrl)) return;
      const owner = nd.nation;
      let newCtrl = u.owner;
      if (owner === u.owner) newCtrl = owner;
      else if (owner !== ctrl && ctx.isAlly(u.owner, owner) && !s.nations[owner].destroyed) newCtrl = owner; // liberazione di un alleato
      r.controller = newCtrl === owner ? null : newCtrl;
      events.push({ phase: 'capture', type: 'capture', prov: u.loc, from: ctrl, to: newCtrl, capital: !!nd.capital, unit: u.id });
      const w = E && E.warOf ? E.warOf(s, u.owner, ctrl) : null;
      if (w) { w.gains[u.owner] = (w.gains[u.owner] || 0) + 1; w.gains[ctrl] = (w.gains[ctrl] || 0) - 1; w.lastAction = s.turn; }
      const loser = s.nations[ctrl], win = s.nations[u.owner];
      if (loser) loser.stability = clamp((loser.stability || 0) - (nd.capital ? 8 : 4), 0, 100);
      if (win) win.approval = clamp((win.approval || 0) + 3, 0, 100);
      if (newCtrl === owner && owner !== u.owner) news(s, `🏳️ ${natLabel(s, u.owner)} libera ${M.provName(u.loc)} e la restituisce a ${natLabel(s, owner)}.`, 'war', [u.owner, owner, ctrl]);
      else if (newCtrl === owner) news(s, `🏳️ ${natLabel(s, owner)} libera ${M.provName(u.loc)} dall'occupazione di ${natLabel(s, ctrl)}.`, 'war', [owner, ctrl]);
      else news(s, `🔥 ${natLabel(s, u.owner)} occupa ${M.provName(u.loc)} (${natLabel(s, owner)}).`, 'war', [u.owner, ctrl]);
      if (ctrl === player && s.alerts) s.alerts.push({ title: '🔥 Provincia perduta', text: `${natLabel(s, u.owner)} ha occupato ${M.provName(u.loc)}. Riorganizza la difesa o cerca la pace.` });
      if (nd.capital && owner === ctrl && newCtrl === u.owner) capitulations.push([owner, u.owner]);
    });
    alive(s).forEach(id => { // occupazione totale
      const provs = M.provincesOf(id); if (!provs.length || capitulations.some(c => c[0] === id)) return;
      if (provs.every(p => M.controller(s, p) !== id)) { const by = M.controller(s, capitalProv(id)); if (by && by !== id && ctx.atWar(by, id)) capitulations.push([id, by]); }
    });
    capitulations.forEach(([loser, winner]) => {
      if (!s.nations[loser] || !ctx.atWar(loser, winner)) return;
      const enemiesBefore = alive(s).filter(o => atWarS(s, loser, o));
      if (E && E.capitulate) E.capitulate(s, loser, winner);
      M.onCapitulate(s, loser, winner);
      enemiesBefore.forEach(e => { if (!atWarS(s, loser, e)) M.onPeace(s, loser, e); });
    });
    // 6. aggiustamenti
    ctx = gameCtx(s);
    alive(s).forEach(id => {
      const c = M.caps(s, id); const mine = s.units.filter(u => u.owner === id);
      let nA = mine.filter(u => u.type === 'A').length, nF = mine.length - nA;
      if (nA > c.army || nF > c.fleet) {
        const { d } = frontDistances(s, id, ctx);
        const far = (type) => mine.filter(u => u.type === type && s.units.includes(u)).sort((a, b) => (d.get(b.loc) ?? 999) - (d.get(a.loc) ?? 999) || (+String(b.id).slice(1) - +String(a.id).slice(1)));
        far('A').slice(0, Math.max(0, nA - c.army)).forEach(u => { events.push({ phase: 'adjust', type: 'disband', unit: u.id, owner: id, utype: 'A', at: u.loc }); removeUnit(s, u, false); nA--; });
        far('F').slice(0, Math.max(0, nF - c.fleet)).forEach(u => { events.push({ phase: 'adjust', type: 'disband', unit: u.id, owner: id, utype: 'F', at: u.loc }); removeUnit(s, u, false); nF--; });
      }
      const occ = new Set(s.units.map(u => u.loc));
      for (let builds = 0; builds < 2; builds++) {
        const dA = c.army - nA, dF = c.fleet - nF; if (dA <= 0 && dF <= 0) break;
        const pref = dA >= dF ? ['A', 'F'] : ['F', 'A'];
        let done = false;
        for (const t of pref) {
          if ((t === 'A' ? dA : dF) <= 0) continue;
          const site = buildSites(s, id, t, occ)[0]; if (!site) continue;
          const u = newUnit(s, id, t, site); occ.add(site); if (t === 'A') nA++; else nF++;
          events.push({ phase: 'adjust', type: 'build', unit: u.id, owner: id, utype: t, at: site });
          done = true; break;
        }
        if (!done) break;
      }
    });
    // tradimenti degli accordi
    checkAgreements(s, checks, orders, events);
    // perdite di rilievo per il giocatore
    const lost = destroyed.filter(u => u.owner === player).length;
    if (lost) news(s, `💥 Le tue forze perdono ${lost} ${lost === 1 ? 'unità distrutta' : 'unità distrutte'} senza via di ritirata.`, 'war', [player]);
    // pulizia
    s.units.forEach(u => { delete u.suppressed; });
    s.agreements = s.agreements.filter(g => g.status !== 'revoked' && g.until > s.turn + 1);
    s.milOrders = {}; s.airOrders = [];
    const rank = (e) => { const i = PHASES.indexOf(e.phase); return i < 0 ? PHASES.length : i; };
    const sorted = events.map((e, i) => [e, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
    s.lastResolution = {
      turn: s.turn, before, after: cloneUnits(s.units), orders, air,
      events: sorted, results: res.results, dislodged: res.dislodged, moves: res.moves, standoffs: res.standoffs, strengths: res.strengths,
    };
    return s.lastResolution;
  };

  // =====================================================================
  // 11. PACE E CAPITOLAZIONE (§7)
  // =====================================================================
  function nearestFree(s, u, ok) {
    const occ = new Set(s.units.filter(x => x !== u).map(x => x.loc));
    const seen = new Set([u.loc]); let layer = [u.loc];
    while (layer.length) {
      const next = [];
      for (const x of layer) for (const y of nbAll(x)) if (!seen.has(y)) { seen.add(y); next.push(y); }
      next.sort();
      const hit = next.find(p => { const pn = node(p); if (occ.has(p) || irradiated(s, p)) return false; if (u.type === 'A' && pn.kind === 'sea') return false; if (u.type === 'F' && pn.kind === 'land') return false; return ok(p); });
      if (hit) return hit;
      layer = next;
    }
    return null;
  }
  M.onPeace = (s, a, b) => {
    if (!M.ready() || !Array.isArray(s.units)) return [];
    const out = [];
    [[a, b], [b, a]].forEach(([x, y]) => s.units.filter(u => u.owner === x).forEach(u => {
      const nd = node(u.loc); if (!nd || nd.kind === 'sea') return;
      const c = M.controller(s, u.loc); if (c === x) return;
      if (nd.nation !== y && c !== y) return;
      const to = nearestFree(s, u, p => node(p).kind === 'sea' || M.controller(s, p) === x);
      if (to) { out.push({ unit: u.id, from: u.loc, to }); u.loc = to; }
      else { out.push({ unit: u.id, from: u.loc, to: null }); removeUnit(s, u, false); }
    }));
    return out;
  };
  M.onCapitulate = (s, loser, winner) => {
    if (!M.ready() || !Array.isArray(s.units)) return;
    s.units.filter(u => u.owner === loser && u.type === 'A').forEach(u => { const nd = node(u.loc); if (!nd || nd.nation !== loser || M.controller(s, u.loc) !== loser) removeUnit(s, u, false); });
    if (winner) M.onPeace(s, winner, loser);
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
