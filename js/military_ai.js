/* ============================================================
   GEOPOLITICA 2026 — IA militare (ordini delle nazioni non giocanti)
   Contratto: docs/military-engine.md §9. Restituisce
   { orders: {unitId: ordine}, air: [ordini aerei], strikes: [] }.
   Gli accordi con il giocatore sono applicati dall'engine (processAgreements).
   ============================================================ */
(function (root) {
  'use strict';
  const GEO = root.GEO = root.GEO || {};
  const AIM = GEO.militaryAI = {};
  const R = () => (GEO.engine && GEO.engine.rand ? GEO.engine.rand() : 0.5);

  AIM.orders = (s) => {
    const out = { orders: {}, air: [], strikes: [] };
    const M = GEO.military, E = GEO.engine;
    if (!M || !M.ready || !M.ready() || !s || !s.units || !s.units.length || !E) return out;
    const ctx = M.context(s);
    const at = new Map(s.units.map(u => [u.loc, u]));
    const byOwner = {}; s.units.forEach(u => (byOwner[u.owner] = byOwner[u.owner] || []).push(u));
    const claimed = new Set(); // destinazioni già scelte (evita che due unità amiche rimbalzino)
    const node = (id) => M.provInfo(id);
    const ctrlOf = (p) => { const nd = node(p); return nd && nd.kind !== 'sea' ? M.controller(s, p) : null; };
    const legal = new Map(); const moves = (u) => { if (!legal.has(u.id)) legal.set(u.id, M.legalMoves(s, u.id) || []); return legal.get(u.id); };
    const adjOf = (u, p) => { const nd = node(p); return nd ? (u.type === 'A' ? nd.armyAdj : nd.fleetAdj) : []; };

    Object.keys(byOwner).forEach(id => {
      const n = s.nations[id]; if (!n || n.destroyed || E.playerGoverns(s, id)) return;
      const units = byOwner[id];
      const P = (GEO.PERSONAS && GEO.PERSONAS[n.persona]) || { aggression: 0.5, risk: 0.5 };
      const enemies = E.alive(s).filter(o => o !== id && E.atWar(s, id, o));
      const enemySet = new Set(enemies);
      const free = new Set(units.map(u => u.id));
      const setO = (u, o) => { out.orders[u.id] = o; free.delete(u.id); if (o.type === 'move') claimed.add(o.to); };
      const isFree = (u) => free.has(u.id);
      const wings = M.caps(s, id).air || 0; let wingsLeft = wings;
      const hostileUnitsNear = (p) => { const nd = node(p); if (!nd) return 0; let c = 0; const seen = new Set(); [...(nd.armyAdj || []), ...(nd.fleetAdj || [])].forEach(q => { const x = at.get(q); if (x && !seen.has(x.id) && enemySet.has(x.owner) && adjOf(x, q).includes(p)) { seen.add(x.id); c++; } }); return c; };

      if (enemies.length) {
        // 1) Capitale minacciata e vuota: rientra con l'unità più vicina
        const cap = M.capitalOf(id);
        if (cap && !at.get(cap) && hostileUnitsNear(cap) > 0) {
          const g = units.find(u => isFree(u) && u.type === 'A' && moves(u).includes(cap));
          if (g) setO(g, { type: 'move', to: cap });
        }
        // 2) Bersagli: province nemiche raggiungibili dalle nostre unità
        const targets = new Map();
        units.forEach(u => moves(u).forEach(p => {
          if (claimed.has(p) || M.irradiated(s, p)) return;
          const occ = at.get(p); const nd = node(p); const ctrl = ctrlOf(p);
          if (occ && !enemySet.has(occ.owner)) return; // unità amica o neutrale
          const enemyLand = ctrl && enemySet.has(ctrl);
          if (!occ && !enemyLand) return;
          if (!occ && u.type === 'F' && nd.kind !== 'sea') return; // le flotte non conquistano
          if (!targets.has(p)) targets.set(p, []);
          targets.get(p).push(u);
        }));
        const plans = [];
        targets.forEach((parts, p) => {
          const occ = at.get(p); const nd = node(p); const g = !occ && ctx.garrison ? ctx.garrison(p) : null;
          const supEst = occ ? Math.round(hostileUnitsNear(p) * (0.45 + R() * 0.3)) : 0;
          const def = occ ? 1 + Math.min(2, supEst) + (ctx.holdBonus ? ctx.holdBonus(occ) || 0 : 0) : (g ? g.strength : 0);
          const value = (nd.capital ? 6 : nd.sc ? 3 : 1) + (occ ? 1.5 : 0) + (!occ && !g ? 1 : 0) + (parts.some(u => u.type === 'A') ? 0.5 : 0);
          plans.push({ p, parts, def, value, score: value / (def + 1) + R() * 0.4 });
        });
        plans.sort((a, b) => b.score - a.score);
        const boldness = 0.6 + P.aggression * 0.8; // gli aggressivi accettano più rischi
        plans.forEach(pl => {
          if (claimed.has(pl.p)) return;
          const parts = pl.parts.filter(isFree);
          if (!parts.length) return;
          const need = pl.def + 1;
          const airHelp = Math.min(wingsLeft, need > parts.length ? need - parts.length : 0);
          if (parts.length + airHelp < need) return;
          if (pl.def >= 2 && parts.length + airHelp === need && R() > boldness) return;
          const nd = node(pl.p);
          const mover = parts.find(u => u.type === 'A' && nd.kind !== 'sea') || parts[0];
          setO(mover, { type: 'move', to: pl.p });
          parts.filter(u => u !== mover).slice(0, Math.max(0, need - 1)).forEach(sup => setO(sup, { type: 'support', target: mover.loc, to: pl.p }));
          for (let k = 0; k < airHelp; k++) { out.air.push({ owner: id, type: 'air', mode: 'support', unit: mover.id }); wingsLeft--; }
        });
        // 3) Difesa: chi è minacciato tiene, i vicini liberi lo supportano (priorità a capitale e centri)
        const threatened = units.filter(u => isFree(u) && hostileUnitsNear(u.loc) > 0)
          .sort((a, b) => ((node(b.loc).capital ? 4 : node(b.loc).sc ? 2 : 0) + hostileUnitsNear(b.loc)) - ((node(a.loc).capital ? 4 : node(a.loc).sc ? 2 : 0) + hostileUnitsNear(a.loc)));
        threatened.forEach(t => { if (!isFree(t)) return; setO(t, { type: 'hold' }); });
        threatened.forEach(t => {
          const helpers = units.filter(u => isFree(u) && u !== t && adjOf(u, u.loc).includes(t.loc) && hostileUnitsNear(u.loc) === 0);
          helpers.slice(0, Math.min(2, hostileUnitsNear(t.loc))).forEach(h => setO(h, { type: 'support', target: t.loc }));
          if (wingsLeft > 0 && (node(t.loc).capital || hostileUnitsNear(t.loc) >= 2)) { out.air.push({ owner: id, type: 'air', mode: 'support', unit: t.id }); wingsLeft--; }
        });
        // 4) Convogli oltremare (al massimo uno per turno)
        const fleets = units.filter(u => isFree(u) && u.type === 'F' && node(u.loc).kind === 'sea');
        for (const f of fleets) {
          const opts = (M.legalConvoys(s, f.id) || []).filter(c => { const a = M.unitById(s, c.unit); const occ = at.get(c.to); return a && a.owner === id && isFree(a) && !claimed.has(c.to) && enemySet.has(ctrlOf(c.to)) && !occ; });
          if (opts.length) { const c = opts.sort((a, b) => (node(b.to).sc ? 1 : 0) - (node(a.to).sc ? 1 : 0))[0]; const a = M.unitById(s, c.unit); setO(f, { type: 'convoy', from: c.from, to: c.to }); setO(a, { type: 'move', to: c.to }); break; }
        }
        // 5) Avanzata: le unità libere fanno un passo verso il nemico
        const enemyProvs = []; enemies.forEach(e => M.controlled(s, e).forEach(p => enemyProvs.push(p)));
        const enemyUnitLocs = s.units.filter(u => enemySet.has(u.owner)).map(u => u.loc);
        const distA = M.distances(enemyProvs, 'A', 12);
        const fleetGoals = new Set(); enemyProvs.forEach(p => { const nd = node(p); (nd.seas || []).forEach(z => fleetGoals.add(z)); }); enemyUnitLocs.forEach(l => { if (node(l).kind === 'sea') fleetGoals.add(l); });
        const distF = M.distances([...fleetGoals], 'F', 14);
        units.filter(isFree).forEach(u => {
          if (hostileUnitsNear(u.loc) > 0) { setO(u, { type: 'hold' }); return; }
          const d = u.type === 'A' ? distA : distF; const here = d.has(u.loc) ? d.get(u.loc) : 99;
          if (u.type === 'F' && fleetGoals.has(u.loc)) return; // già in posizione: tiene il mare
          const best = moves(u).filter(p => !claimed.has(p) && !at.get(p) && (u.type === 'F' || node(p).kind !== 'sea') && (d.has(p) ? d.get(p) : 99) < here)
            .sort((a, b) => (d.get(a) ?? 99) - (d.get(b) ?? 99) || (node(b).sc ? 1 : 0) - (node(a).sc ? 1 : 0))[0];
          if (best && !(u.loc === cap && hostileUnitsNear(cap) > 0)) setO(u, { type: 'move', to: best });
        });
      } else {
        // In pace: schiera eserciti verso i confini con vicini ostili
        const hostile = E.alive(s).filter(o => o !== id && (E.getRel(s, id, o) < -55 || (GEO.AI && GEO.AI.warIntent && GEO.AI.warIntent(s, s.nations[o], id) > 0.02)));
        if (!hostile.length) return;
        const hostileSet = new Set(hostile);
        const own = M.controlled(s, id);
        const frontier = own.filter(p => (node(p).armyAdj || []).some(q => hostileSet.has(ctrlOf(q))));
        if (!frontier.length) return;
        const emptyFront = frontier.filter(p => !at.get(p) && !claimed.has(p));
        if (!emptyFront.length) return;
        const d = M.distances(emptyFront, 'A', 6);
        let budget = 2;
        units.filter(u => isFree(u) && u.type === 'A' && !frontier.includes(u.loc) && u.loc !== M.capitalOf(id)).sort((a, b) => (d.get(a.loc) ?? 99) - (d.get(b.loc) ?? 99)).forEach(u => {
          if (budget <= 0) return; const here = d.get(u.loc); if (here === undefined) return;
          const step = moves(u).filter(p => own.includes(p) && !at.get(p) && !claimed.has(p) && (d.get(p) ?? 99) < here)[0];
          if (step) { setO(u, { type: 'move', to: step }); budget--; }
        });
      }
    });
    return out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
