/* ============================================================
   GEOPOLITICA 2026 — Intelligenza artificiale delle nazioni
   ============================================================ */
(function (root) {
  const GEO = root.GEO; const E = GEO.engine;
  const AI = GEO.AI = {};
  const R = () => E.rand();
  const clamp = E.clamp;

  // Probabilità per turno che n dichiari guerra a target
  AI.warIntent = (s, n, target) => {
    if (n.destroyed || n.suzerain || E.atWar(s, n.id, target)) return 0;
    const t = s.nations[target]; if (t.destroyed) return 0;
    if (E.hasTreaty(s, n.id, target, 'nonaggressione') || E.hasTreaty(s, n.id, target, 'difesa')) return 0;
    const P = GEO.PERSONAS[n.persona]; const diff = GEO.DIFFICULTY[s.difficulty];
    const rel = E.getRel(s, n.id, target);
    const claim = n.claims && n.claims[target];
    if (!claim && rel > -45) return 0;
    if (t.suzerain === n.id || n.suzerain === target) return 0;
    const reach = E.canReach(s, n.id, target); if (!reach.ok) return 0;
    // Spedizioni oltremare senza rivendicazioni: solo con marina forte e un motivo (sanzioni, alleato del nemico, stato fragile)
    if (reach.naval && !claim) { const motive = E.isSanctioning(s, target, n.id) || E.enemiesOf(s, n.id).some(e => E.alliesOf(s, target).includes(e)) || t.stability < 35; if (n.navy < 60 || !motive || rel > -60) return 0; }
    if (E.warsOf(s, n.id).length >= (P.aggression > 0.7 ? 2 : 1)) return 0;
    // Rapporto di forze con alleati probabili
    const myPow = E.milPower(n) + E.alliesOf(s, n.id).reduce((a, id) => a + E.milPower(s.nations[id]) * 0.25, 0);
    const allies = E.alliesOf(s, target);
    let tgtPow = (E.milPower(t) + allies.reduce((a, id) => a + E.milPower(s.nations[id]) * (s.nations[id].id === s.player ? 0.35 : 0.45), 0)) * (E.mods(t).deter || 1);
    let ratio = myPow * reach.mult / Math.max(1, tgtPow);
    if (t.nukes > 0 && n.nukes === 0 && n.persona !== 'imprevedibile') return 0;
    if (t.nukes > 0 && n.nukes > 0) ratio *= 0.6;
    if (allies.some(id => s.nations[id].nukes > 100) && n.nukes < 100) ratio *= 0.6;
    let p = P.aggression * diff.aiAggr * 0.07 * (reach.naval ? 0.3 : 1);
    p *= claim ? 2.2 : 1;
    p *= rel < -80 ? 1.4 : 1;
    p *= ratio > 2.5 ? 1.6 : ratio > 1.5 ? 1.0 : ratio > 1.15 ? 0.35 : (n.persona === 'imprevedibile' ? 0.05 : 0);
    if (n.stability < 40 && P.aggression > 0.6) p *= 1.3; // guerra diversiva
    if (t.stability < 35) p *= 1.8;
    if (t.politics && t.politics.loyalty < 35) p *= 1.3;
    if (E.isSanctioning(s, target, n.id)) p *= 1.2;
    if (n.exhaustion > 20) p *= 0.4;
    if (n.reputation < 40) p *= 0.8;
    if (target === s.player) p *= s.difficulty === 'facile' ? 0.6 : 1;
    return clamp(p, 0, 0.5);
  };

  AI.turn = (s, n, orders) => {
    if (n.destroyed) return;
    const P = GEO.PERSONAS[n.persona];
    const wars = E.warsOf(s, n.id);
    const atWar = wars.length > 0;
    // --- Bilancio ---
    const base = GEO.AI_BUDGETS[n.persona];
    const b = { ...base };
    if (atWar) { b.military = Math.min(0.6, base.military + 0.2); b.research = base.research * 0.6; b.welfare = base.welfare * 0.8; }
    if (n.stability < 40) { b.welfare += 0.1; b.military -= 0.05; }
    const threat = E.alive(s).some(o => o !== n.id && AI.warIntent(s, s.nations[o], n.id) > 0.02);
    if (threat && !atWar) { b.military += 0.08; b.welfare -= 0.04; b.infra -= 0.04; }
    const tot = Object.values(b).reduce((a, x) => a + x, 0); Object.keys(b).forEach(k => b[k] = Math.max(0.02, b[k] / tot));
    n.budget = b;
    n.spendMult = atWar ? 1.15 : n.debt > 120 ? 0.9 : n.stability < 40 ? 1.1 : 1.0;
    // --- Ricerca: scegli focus ---
    if (s.turn % 4 === 1 || !n.researchFocus) {
      const pref = { egemone: ['ai', 'space', 'defense'], falco: ['hyper', 'cyber', 'defense'], paziente: ['semis', 'ai', 'hyper'], mercante: ['ai', 'semis', 'energy'], opportunista: ['defense', 'energy', 'cyber'], isolazionista: ['energy', 'bio', 'ai'], difensivo: ['defense', 'cyber', 'ai'], ambizioso: ['semis', 'space', 'ai'], imprevedibile: ['hyper', 'cyber', 'defense'] }[n.persona];
      let cands = pref.filter(t => n.tech[t] < 10);
      if (n.tech.ai >= n.tech.semis + 3 && !E.hasChipAccess(s, n)) cands = ['semis'];
      if (atWar) cands = ['defense', 'hyper', ...cands];
      n.researchFocus = cands.find(t => n.tech[t] < 10) || Object.keys(n.tech).find(t => n.tech[t] < 10) || 'ai';
    }
    // --- Dichiarazioni di guerra ---
    if (!atWar || P.aggression > 0.7) {
      const cands = E.alive(s).filter(o => o !== n.id);
      for (const o of cands) { const p = AI.warIntent(s, n, o); if (p > 0 && R() < p) { E.declareWar(s, n.id, o); s.newWars = (s.newWars || 0) + 1; break; } }
    }
    // --- Ordini militari ---
    const warsNow = E.warsOf(s, n.id);
    n.plannedOrder = null;
    if (warsNow.length) {
      const enemies = E.enemiesOf(s, n.id).filter(e => !s.nations[e].destroyed);
      const myPow = E.milPower(n);
      let best = null;
      enemies.forEach(e => {
        const t = s.nations[e]; const reach = E.canReach(s, n.id, e); if (!reach.ok) return;
        const others = t.regions.filter(r => !r.capital); const heldByMe = others.filter(r => r.controller === n.id).length; const capOk = !others.length || heldByMe >= Math.ceil(others.length / 2);
        const regions = t.regions.filter(r => (r.controller || e) === e && (!r.capital || capOk));
        const ratio = myPow * reach.mult / Math.max(1, E.milPower(t) * 1.3);
        regions.forEach(r => { const val = r.share * (r.capital ? 0.6 : 1) * ratio * (n.claims && n.claims[e] && Array.isArray(n.claims[e]) && n.claims[e].includes(r.name) ? 2 : 1); if (!best || val > best.val) best = { val, target: e, region: r.name, ratio }; });
      });
      const willAttack = best && (best.ratio > 0.95 || (P.aggression > 0.7 && best.ratio > 0.7) || (n.claims && n.claims[best.target] && best.ratio > 0.8)) && n.readiness > 45 && n.exhaustion < 75;
      if (willAttack) { orders.push({ type: 'invade', from: n.id, target: best.target, region: best.region }); n.plannedOrder = { type: 'invade', target: best.target, region: best.region }; }
      else if (n.readiness < 70) orders.push({ type: 'mobilize', from: n.id });
      // Missili
      enemies.forEach(e => {
        if (n.missiles >= 60 && R() < 0.6 + P.aggression * 0.3) { const count = Math.min(n.missiles, Math.round(20 + n.missiles * (0.08 + P.aggression * 0.08))); orders.push({ type: 'strike', from: n.id, target: e, count }); if (!n.plannedOrder) n.plannedOrder = { type: 'strike', target: e }; }
        if (n.tech.cyber >= 6 && R() < 0.35) orders.push({ type: 'cyber', from: n.id, target: e });
      });
      // Nucleare: solo se la capitale è minacciata o persona imprevedibile allo stremo
      if (n.nukes > 0) {
        const lostCapital = E.capital(n).controller && E.capital(n).controller !== n.id;
        const lostShare = E.occupiedShare(n);
        const desperate = lostShare > 0.45 || (n.army < n.army0 * 0.3 && lostShare > 0.2);
        const pNuke = desperate ? P.risk * 0.5 : (n.persona === 'imprevedibile' && lostShare > 0.25 ? 0.4 : 0);
        if (pNuke > 0 && R() < pNuke) { const e = enemies.sort((a, b) => E.milPower(s.nations[b]) - E.milPower(s.nations[a]))[0]; orders.push({ type: 'nuke', from: n.id, target: e, count: Math.min(n.nukes, n.persona === 'imprevedibile' ? 5 : 8) }); }
      }
    } else if (threat && n.readiness < 75 && n.treasury > 20) { orders.push({ type: 'mobilize', from: n.id, cost: 10 }); }
  };

  AI.diplomacy = (s, n) => {
    if (n.destroyed) return;
    const P = GEO.PERSONAS[n.persona];
    const me = n.id; const others = E.alive(s).filter(o => o !== me);
    // --- Pace ---
    E.warsOf(s, me).forEach(w => {
      const enemies = (w.attackers.includes(me) ? w.defenders : w.attackers);
      enemies.forEach(e => {
        const t = s.nations[e];
        const occByMe = t.regions.filter(r => r.controller === me).length, occByE = n.regions.filter(r => r.controller === e).length;
        const dur = s.turn - w.since;
        const losing = occByE > occByMe || n.army < n.army0 * 0.45 || n.exhaustion > 60;
        const stalemate = dur > 6 && occByMe === occByE;
        const winningBig = occByMe >= 2 && n.exhaustion > 25;
        let kind = null;
        if (winningBig && R() < 0.5) kind = 'annessione';
        else if ((losing && R() < 0.5) || (stalemate && R() < 0.35) || (n.exhaustion > 70 && R() < 0.6)) kind = 'bianca';
        if (!kind) return;
        if (e === s.player) { if (!s.pending.some(p => p.from === me && p.type === 'pace')) E.queueProposal(s, { from: me, type: 'pace', terms: { kind }, text: `${n.flag} ${n.name} propone una ${kind === 'bianca' ? 'pace bianca (ritiro reciproco dalle regioni occupate)' : 'pace in cui mantiene le regioni che occupa'}.` }); }
        else E.propose(s, me, e, 'pace', { kind });
      });
    });
    // --- Intervento dell'egemone: difende gli amici aggrediti da stati ostili ---
    if ((n.persona === 'egemone' || n.persona === 'ambizioso') && !E.warsOf(s, me).length) {
      for (const w of s.wars) {
        const agg = w.aggressor; if (!agg || agg === me || w.attackers.includes(me) || w.defenders.includes(me)) continue;
        const victim = w.defenders[0]; if (!victim || s.nations[victim].destroyed) continue;
        const relA = E.getRel(s, me, agg), relV = E.getRel(s, me, victim);
        const A = s.nations[agg];
        if (relA < -40 && relV > 25 && E.canReach(s, me, victim).ok) {
          const nukeRisk = A.nukes > 300 ? 0.25 : A.nukes > 0 ? 0.6 : 1;
          const p = 0.22 * nukeRisk * (E.milPower(n) > E.milPower(A) ? 1 : 0.3) * GEO.DIFFICULTY[s.difficulty].aiAggr;
          if (R() < p) { E.news(s, `${n.flag} ${n.name} interviene a difesa di ${s.nations[victim].flag} ${s.nations[victim].name}.`, 'war', [me, victim, agg]); E.joinWar(s, me, victim, agg); break; }
          else if (!E.isSanctioning(s, me, agg) && R() < 0.5) E.sanction(s, me, agg);
        }
      }
    }
    // --- Proposte (una per turno, con probabilità) ---
    if (R() > 0.45) return;
    const rel = (o) => E.getRel(s, me, o);
    const friendly = others.filter(o => rel(o) > 20).sort((a, b) => rel(b) - rel(a));
    const hostile = others.filter(o => rel(o) < -45);
    const threatened = others.some(o => AI.warIntent(s, s.nations[o], me) > 0.015) || E.warsOf(s, me).length > 0;
    const roll = R();
    const target = (o) => E.playerGoverns(s, o);
    if (roll < 0.35 && friendly.length) {
      const o = friendly[Math.floor(R() * Math.min(4, friendly.length))];
      if (!E.hasTreaty(s, me, o, 'commercio') && P.greed > 0.4) { if (target(o)) E.queueProposal(s, { from: me, type: 'commercio', terms: {}, text: `${n.flag} ${n.name} propone un accordo commerciale.` }); else E.propose(s, me, o, 'commercio'); }
    } else if (roll < 0.55 && threatened && friendly.length) {
      const o = friendly[0];
      if (!E.hasTreaty(s, me, o, 'difesa') && rel(o) > 40) { if (target(o)) E.queueProposal(s, { from: me, type: 'alleanza', terms: {}, text: `${n.flag} ${n.name} si sente minacciata e propone un'alleanza difensiva.` }); else E.propose(s, me, o, 'alleanza'); }
    } else if (roll < 0.7 && hostile.length && n.regime === 'democrazia' && E.effGdp(s, n) > 800) {
      const o = E.pick(hostile); if (!E.isSanctioning(s, me, o) && s.nations[o].reputation < 50 && R() < 0.4) E.sanction(s, me, o);
    } else if (roll < 0.8 && P.aggression < 0.4) {
      const o = others.filter(x => rel(x) > -30 && rel(x) < 30 && !E.hasTreaty(s, me, x, 'nonaggressione') && E.canReach(s, x, me).ok && AI.warIntent(s, s.nations[x], me) > 0)[0];
      if (o) { if (target(o)) E.queueProposal(s, { from: me, type: 'nonaggressione', terms: {}, text: `${n.flag} ${n.name} propone un patto di non aggressione.` }); else E.propose(s, me, o, 'nonaggressione'); }
    } else if (roll < 0.88 && P.aggression > 0.45) {
      // Ultimatum a vicino debole
      const weak = others.filter(x => rel(x) < -20 && E.milPower(n) > E.milPower(s.nations[x]) * 3 && E.canReach(s, me, x).ok && !E.hasTreaty(s, me, x, 'nonaggressione') && s.nations[x].nukes === 0 && E.alliesOf(s, x).length < 2);
      if (weak.length && R() < 0.5) { const x = E.pick(weak); const t = s.nations[x]; const region = t.regions.filter(r => !r.capital && (r.controller || x) === x)[0]; if (target(x)) E.queueProposal(s, { from: me, type: 'ultimatum', terms: { kind: 'tributo' }, text: `${n.flag} ${n.name} ti lancia un ultimatum: paga un tributo (3% del PIL) o sarà guerra.` }); else if (region) E.propose(s, me, x, 'ultimatum', { kind: 'regione', region: region.name }); }
    } else if (roll < 0.95 && n.treasury > 150 && P.greed > 0.5) {
      // Aiuti economici per comprare influenza
      const o = others.filter(x => rel(x) > 0 && s.nations[x].stability < 50 && E.effGdp(s, s.nations[x]) < E.effGdp(s, n) * 0.3)[0];
      if (o) E.sendAid(s, me, o, Math.min(100, Math.round(n.treasury * 0.08)));
    } else if (n.tech.cyber >= 6) {
      const o = hostile.filter(x => s.nations[x].tech[n.researchFocus] > n.tech[n.researchFocus])[0];
      if (o && R() < 0.3) E.espionage(s, me, o, n.researchFocus);
    }
    if (E.playerGoverns(s, s.player) && rel(s.player) < -50 && !E.atWar(s, me, s.player) && n.treasury > 20 && R() < 0.08 * GEO.DIFFICULTY[s.difficulty].aiAggr) {
      n.treasury -= 10; const r = E.destabilize(s, me, s.player);
      if (!r.caught && s.nations[s.player].perks.intel) E.news(s, `🕵️ I tuoi servizi segreti intercettano un'operazione di destabilizzazione di ${n.flag} ${n.name}.`, 'dip', [s.player, me]);
    }
    // Richiesta di aiuto al giocatore se amico e in difficoltà
    if (E.playerGoverns(s, s.player) && !E.mods(s.nations[s.player]).noCalls && E.warsOf(s, me).length && rel(s.player) > 40 && n.stability < 50 && R() < 0.15 && !s.pending.some(p => p.from === me && p.type === 'aiuti')) {
      E.queueProposal(s, { from: me, type: 'aiuti', terms: { amount: Math.max(10, Math.round(E.effGdp(s, s.nations[s.player]) * 0.004)), kind: 'militari' }, text: `${n.flag} ${n.name} è in guerra e chiede aiuti militari (${Math.max(10, Math.round(E.effGdp(s, s.nations[s.player]) * 0.004))} mld).` });
    }
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
