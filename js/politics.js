/* ============================================================
   GEOPOLITICA 2026 — Politica interna, tesoro, capacità nazionali
   Mandati, elezioni, deriva autoritaria, colpi di stato, inflazione,
   progetti, imprese di stato, perk.
   ============================================================ */
(function (root) {
  const GEO = root.GEO; const E = GEO.engine;
  const P = GEO.politics = {};
  const R = () => E.rand(); const clamp = E.clamp; const RI = (a, b) => a + Math.floor(R() * (b - a + 1));

  P.MANDATE = { democrazia: 16, ibrido: 24, autocrazia: null };

  P.init = (s, n, opts = {}) => {
    const len = opts.mandateLen || P.MANDATE[n.regime] || 16;
    n.politics = { mandateLen: n.regime === 'autocrazia' ? null : (n.regime === 'ibrido' ? Math.round(len * 1.5) : len), nextElection: null, lastElection: 0, terms: 1, opposition: n.regime === 'democrazia' ? clamp(90 - n.stability - n.approval * 0.3, 20, 70) : 20, loyalty: clamp(30 + n.stability * 0.5 + (n.regime === 'autocrazia' ? 10 : 0), 20, 90), pressFreedom: { democrazia: 78, ibrido: 42, autocrazia: 12 }[n.regime], mediaControl: false, emergency: false, postponements: 0, rigged: false, euWarnings: 0 };
    if (n.politics.mandateLen) n.politics.nextElection = (n.id === s.player ? 0 : 0) + (opts.stagger ? RI(2, n.politics.mandateLen) : n.politics.mandateLen) + 1;
    n.perks = {}; n.boosts = []; n.inflation = { USA: 2.8, ARG: 35, TUR: 30, VEN: 60, IRN: 35, EGY: 15, NGA: 20, PAK: 10, RUS: 8, GBR: 3, DEU: 2.4, ITA: 1.8, JPN: 2.5, CHN: 1 }[n.id] ?? 3.5;
    n.enterprises = {}; n.popPeak = n.pop; n.gdpPeak = n.gdp; n.popLossTurn = -99; n.lastDividends = 0;
    n.policies = n.policies || GEO.defaultPolicies(n); n.policyCooldown = {}; n.vision = n.vision || null; n.visionSince = 0;
    if (!n.vision && s.player !== n.id) n.vision = P.aiVision(n);
    n.politics.mandateStart = P.snapshot(s, n);
  };
  P.aiVision = (n) => ({ egemone: 'beacon', falco: 'fortress', paziente: 'tech', mercante: 'trade', opportunista: 'hegemon', isolazionista: 'green', difensivo: 'fortress', ambizioso: 'tech', imprevedibile: 'order' }[n.persona] || 'trade');
  P.snapshot = (s, n) => ({ turn: s.turn, gdp: n.gdp, stab: n.stability, appr: n.approval, debt: n.debt, pop: n.pop, score: E.score(s, n), infl: n.inflation });

  // ---------- Modificatori da politiche e visione ---------------------------
  const MULT = ['research', 'milEff', 'shock', 'sanct', 'co2', 'soe', 'deter', 'aiResearch', 'invadeNeighbors', 'warRepMult'];
  P.mods = (s, n) => {
    const m = { research: 1, milEff: 1, shock: 1, sanct: 1, co2: 1, soe: 1, deter: 1, aiResearch: 1, invadeNeighbors: 1, warRepMult: 1, techProg: {} };
    const apply = (fx) => { Object.entries(fx || {}).forEach(([k, v]) => { if (k === 'techProg') Object.entries(v).forEach(([t, x]) => m.techProg[t] = (m.techProg[t] || 0) + x); else if (MULT.includes(k)) m[k] *= v; else if (typeof v === 'number') m[k] = (m[k] || 0) + v; else m[k] = v; }); };
    Object.entries(n.policies || {}).forEach(([cat, opt]) => { const d = GEO.POLICIES[cat] && GEO.POLICIES[cat].options[opt]; if (d) apply(d.fx); });
    if (n.vision && GEO.VISIONS[n.vision]) { const fx = { ...GEO.VISIONS[n.vision].fx }; if (fx.warRep !== undefined) { fx.warRepMult = fx.warRep; delete fx.warRep; } apply(fx); }
    if (n.nukes === 0 && m.deter > 1 && (n.policies || {}).nucleare === 'primo_colpo') m.deter = 1;
    return m;
  };
  P.ideology = (n) => {
    const p = n.policies || {}; let lib = { democrazia: 1, ibrido: 0, autocrazia: -1 }[n.regime] || 0, market = 0;
    lib += { diritto: 1, ordine: -1, religione: -0.5 }[p.istituzioni] || 0; lib += p.digitale === 'aperta' ? 0.3 : p.digitale === 'sovranita' ? -0.3 : 0; lib += { aperta: 0.3, chiusa: -0.3 }[p.immigrazione] || 0;
    market += { mercato: 1, stato: -1 }[p.economia] || 0; market += { tasse_basse: 0.5, tasse_alte: -0.5 }[p.fisco] || 0; market += { libero_scambio: 0.5, autarchia: -1 }[p.commercio] || 0;
    return { lib, market };
  };
  P.setPolicy = (s, nid, cat, opt) => {
    const n = s.nations[nid]; const C = GEO.POLICIES[cat]; const d = C && C.options[opt]; if (!d) return { ok: false, reason: 'Opzione sconosciuta.' };
    if (n.policies[cat] === opt) return { ok: false, reason: 'Già in vigore.' };
    if (d.req && !d.req(n, s)) return { ok: false, reason: 'Requisiti non soddisfatti.' };
    if ((n.policyCooldown[cat] || 0) > s.turn) return { ok: false, reason: `Riforma possibile dal turno ${n.policyCooldown[cat]}.` };
    const cost = nid === s.player ? Math.max(3, Math.round(E.effGdp(s, n) * 0.003)) : 0; if (n.treasury < cost) return { ok: false, reason: `Servono ${cost} mld.` };
    n.treasury -= cost; const old = C.options[n.policies[cat]]; n.policies[cat] = opt; n.policyCooldown[cat] = s.turn + 8; n.mods = P.mods(s, n);
    n.stability = clamp(n.stability - 3, 0, 100); n.approval = clamp(n.approval - 2, 0, 100);
    E.news(s, `${C.icon} ${n.flag} ${n.name} cambia politica (${C.name}): da "${old ? old.name : '—'}" a "${d.name}".`, 'event', [nid]);
    if (nid === s.player) E.history(s, `Riforma: ${C.name} → ${d.name}`, 'policy');
    return { ok: true };
  };
  P.setVision = (s, nid, key) => {
    const n = s.nations[nid]; if (!GEO.VISIONS[key]) return { ok: false, reason: 'Visione sconosciuta.' };
    if (n.vision === key) return { ok: false, reason: 'Già in vigore.' };
    if (n.vision && s.turn - n.visionSince < 24) return { ok: false, reason: `Potrai cambiare visione dal turno ${n.visionSince + 24}.` };
    const cost = n.vision ? Math.max(5, Math.round(E.effGdp(s, n) * 0.01)) : 0; if (n.treasury < cost) return { ok: false, reason: `Servono ${cost} mld.` };
    n.treasury -= cost; n.vision = key; n.visionSince = s.turn; n.mods = P.mods(s, n);
    E.news(s, `${GEO.VISIONS[key].icon} ${n.flag} ${n.name} proclama la sua visione nazionale: ${GEO.VISIONS[key].name}.`, 'event', [nid]); E.history(s, `Visione nazionale: ${GEO.VISIONS[key].name}`, 'policy');
    return { ok: true };
  };

  // ---------- Opposizione, esilio, rientro -----------------------------------
  P.enterOpposition = (s, n) => {
    const pol = n.politics; s.playerStatus = 'opposizione'; s.statusUntil = s.turn + Math.max(6, Math.round(pol.mandateLen / 2)); s.political = 2;
    n.savedPersona = n.persona; n.persona = E.pick(['mercante', 'opportunista', 'egemone', 'difensivo', 'ambizioso']); n.rivalName = E.pick(['Fronte Nazionale', 'Alleanza Progressista', 'Partito del Popolo', 'Unione Democratica', 'Movimento Riformista', 'Coalizione Civica']);
    n.budget = { ...GEO.AI_BUDGETS[n.persona] }; pol.opposition = 45; pol.mediaControl = false; pol.emergency = false; pol.rigged = false;
    s.alerts.push({ title: '🗳️ Sei all’opposizione', text: `${n.rivalName} governa ora il paese. Per ${s.statusUntil - s.turn} turni non controlli bilancio, esercito e diplomazia: il nuovo governo segue la propria linea. Nel pannello Potere accumuli capitale politico e lavori per tornare: campagna, mozioni di sfiducia, piazza, coalizioni. Alle prossime elezioni servirà un sostegno superiore al consenso del governo.` });
    E.history(s, `Il tuo partito passa all'opposizione: governa ${n.rivalName}`, 'politics');
  };
  P.enterExile = (s, n, reason) => {
    const pol = n.politics; s.playerStatus = 'esilio'; s.statusUntil = s.turn + 8; s.political = 1;
    n.savedPersona = n.persona; n.persona = 'falco'; n.budget = { ...GEO.AI_BUDGETS.falco }; n.rivalName = reason === 'golpe' ? 'Giunta militare' : 'Governo rivoluzionario';
    if (reason === 'golpe') { n.regime = 'autocrazia'; pol.mandateLen = null; pol.nextElection = null; pol.loyalty = 60; pol.pressFreedom = 10; }
    pol.opposition = 35;
    s.alerts.push({ title: reason === 'golpe' ? '⚔️ Rovesciato da un colpo di stato' : '🔥 Rovesciato dalla rivolta', text: `Sei in esilio: ${n.rivalName} controlla il paese per almeno 8 turni. Dal pannello Potere puoi tessere una rete clandestina, chiedere pressioni internazionali e, quando il sostegno sarà alto, tentare l'insurrezione o aspettare che il regime crolli.` });
    E.history(s, `${reason === 'golpe' ? 'Colpo di stato' : 'Rivolta'}: il tuo governo cade, vai in esilio`, 'politics');
  };
  P.returnToPower = (s, n, how) => {
    const pol = n.politics; s.playerStatus = 'governo'; s.statusUntil = null;
    if (n.savedPersona) { n.persona = n.savedPersona; n.savedPersona = null; }
    n.budget = { military: 0.3, research: 0.22, welfare: 0.25, infra: 0.15, diplomacy: 0.08 };
    if (how === 'insurrezione' || how === 'crollo') { n.regime = 'democrazia'; pol.mandateLen = pol.mandateLen || 16; pol.loyalty = 55; }
    if (pol.mandateLen) pol.nextElection = s.turn + (how === 'coalizione' ? 8 : pol.mandateLen);
    pol.terms++; n.approval = clamp(n.approval + 8, 0, 100); pol.opposition = 35; pol.mandateStart = P.snapshot(s, n); n.rivalName = null;
    s.alerts.push({ title: '🎉 Di nuovo al potere', text: { elezioni: 'Hai vinto le elezioni e torni a guidare il paese.', coalizione: 'Un accordo di coalizione ti riporta al governo con un mandato ridotto di 8 turni.', insurrezione: 'L\'insurrezione ha rovesciato il regime: guidi la transizione.', crollo: 'Il regime è crollato sotto il suo stesso peso: il popolo ti richiama.' }[how] });
    E.history(s, `Ritorno al potere (${how})`, 'politics');
  };
  P.OPP_ACTIONS = {
    campagna_opp: { name: 'Campagna permanente', icon: '📣', pts: 2, desc: 'Sostegno +6.', status: 'opposizione' },
    mozione: { name: 'Mozione di sfiducia', icon: '🗳️', pts: 3, desc: 'Se il consenso del governo è < 42: 45% di probabilità di elezioni anticipate immediate.', status: 'opposizione', req: (n) => n.approval < 42 },
    piazza: { name: 'Mobilitazione di piazza', icon: '✊', pts: 2, desc: 'Sostegno +5, stabilità del paese −4, consenso del governo −3. Rischio di repressione.', status: 'opposizione' },
    coalizione: { name: 'Accordo di coalizione', icon: '🤝', pts: 4, desc: 'Richiede sostegno ≥ 58: torni al governo subito con un mandato ridotto.', status: 'opposizione', req: (n) => n.politics.opposition >= 58 },
    rete: { name: 'Rete clandestina', icon: '🕯️', pts: 2, desc: 'Sostegno +6, lealtà del regime −3.', status: 'esilio' },
    appello: { name: 'Appello internazionale', icon: '🌍', pts: 2, desc: 'Le democrazie sanzionano il regime (50% ciascuna) e la sua stabilità cala di 3.', status: 'esilio' },
    insurrezione: { name: 'Insurrezione', icon: '🔥', pts: 4, desc: 'Richiede sostegno ≥ 60. Successo = (sostegno − stabilità del regime)/100 + 0,3. Se fallisce: +8 turni di esilio e sostegno −20.', status: 'esilio', req: (n) => n.politics.opposition >= 60 },
  };
  P.doOppAction = (s, key) => {
    const n = s.nations[s.player]; const pol = n.politics; const a = P.OPP_ACTIONS[key];
    if (!a || a.status !== s.playerStatus) return { ok: false, reason: 'Azione non disponibile.' };
    if (a.req && !a.req(n)) return { ok: false, reason: 'Requisiti non soddisfatti.' };
    if (s.political < a.pts) return { ok: false, reason: `Servono ${a.pts} punti di capitale politico (ne hai ${s.political}).` };
    s.political -= a.pts;
    switch (key) {
      case 'campagna_opp': pol.opposition = clamp(pol.opposition + 6, 0, 100); break;
      case 'mozione': if (R() < 0.45) { E.news(s, `🗳️ Mozione di sfiducia approvata in ${n.flag} ${n.name}: elezioni anticipate!`, 'event', [n.id]); P.oppositionElection(s, n); } else E.news(s, `La mozione di sfiducia in ${n.flag} ${n.name} è respinta.`, 'event', [n.id]); break;
      case 'piazza': pol.opposition = clamp(pol.opposition + 5, 0, 100); n.stability = clamp(n.stability - 4, 0, 100); n.approval = clamp(n.approval - 3, 0, 100); if (R() < 0.25) { pol.opposition = clamp(pol.opposition - 4, 0, 100); E.news(s, `La polizia reprime le manifestazioni in ${n.flag} ${n.name}.`, 'event', [n.id]); } break;
      case 'coalizione': P.returnToPower(s, n, 'coalizione'); break;
      case 'rete': pol.opposition = clamp(pol.opposition + 6, 0, 100); pol.loyalty = clamp(pol.loyalty - 3, 0, 100); break;
      case 'appello': n.stability = clamp(n.stability - 3, 0, 100); E.ids(s).forEach(o => { if (o !== n.id && s.nations[o].regime === 'democrazia' && R() < 0.5) E.sanction(s, o, n.id); }); break;
      case 'insurrezione': { const pr = (pol.opposition - n.stability) / 100 + 0.3; if (R() < pr) { n.stability = clamp(n.stability - 10, 0, 100); n.gdp *= 0.97; P.returnToPower(s, n, 'insurrezione'); } else { s.statusUntil = s.turn + 8; pol.opposition = clamp(pol.opposition - 20, 0, 100); n.stability = clamp(n.stability - 6, 0, 100); E.news(s, `L'insurrezione in ${n.flag} ${n.name} è schiacciata nel sangue.`, 'event', [n.id]); } break; }
    }
    return { ok: true };
  };
  P.oppositionElection = (s, n) => {
    const pol = n.politics; const p = clamp(0.5 + (pol.opposition - 50) / 60 + (50 - n.approval) / 60, 0.05, 0.95);
    if (R() < p) P.returnToPower(s, n, 'elezioni'); else { s.statusUntil = s.turn + 6; pol.opposition = clamp(pol.opposition - 8, 0, 100); n.approval = clamp(n.approval + 3, 0, 100); E.news(s, `🗳️ ${n.flag} ${n.name}: ${n.rivalName} vince le elezioni, resti all'opposizione.`, 'event', [n.id]); s.alerts.push({ title: '🗳️ Elezioni perse', text: `${n.rivalName} si conferma al governo. Nuova finestra elettorale tra 6 turni. Sostegno attuale: ${Math.round(pol.opposition)}.` }); }
  };
  P.statusStep = (s) => {
    const n = s.nations[s.player]; const pol = n.politics; if (!pol) return;
    if (s.playerStatus === 'governo') return;
    s.political = Math.min(10, (s.political || 0) + 2);
    if (s.playerStatus === 'opposizione') {
      const oppT = 40 + (50 - n.approval) * 0.8 + Math.max(0, n.inflation - 3) * 1.2 + n.exhaustion * 0.2; pol.opposition = clamp(pol.opposition + (oppT - pol.opposition) * 0.15, 0, 100);
      if (s.turn >= s.statusUntil) P.oppositionElection(s, n);
    } else if (s.playerStatus === 'esilio') {
      const supT = 35 + (45 - n.stability) * 0.8 + E.sanctionsOn(s, n.id).length * 1.5; pol.opposition = clamp(pol.opposition + (supT - pol.opposition) * 0.15, 0, 100);
      if (s.turn >= s.statusUntil) { if (n.stability < 35 && R() < 0.5 || n.stability < 20) P.returnToPower(s, n, 'crollo'); else s.statusUntil = s.turn + 4; }
    }
  };
  P.rebel = (s) => {
    const n = s.nations[s.player]; if (!n.suzerain) return { ok: false, reason: 'Non sei uno stato satellite.' };
    const suz = n.suzerain; const sz = s.nations[suz]; n.suzerain = null; n.tribute = null; s.treaties = s.treaties.filter(t => !((t.a === n.id && t.b === suz) || (t.a === suz && t.b === n.id)));
    E.setRel(s, n.id, suz, -100); n.stability = clamp(n.stability + 8, 0, 100); n.approval = clamp(n.approval + 10, 0, 100); n.readiness = clamp(n.readiness + 20, 0, 100);
    E.news(s, `✊ ${n.flag} ${n.name} si ribella alla tutela di ${sz.flag} ${sz.name}!`, 'war', [n.id, suz]); E.history(s, `Ribellione contro ${sz.name}`, 'war');
    if (E.milPower(sz) > E.milPower(n) * 0.8 && R() < 0.7) E.declareWar(s, suz, n.id, { casus: true });
    return { ok: true };
  };

  // ---------- Bilancio del mandato -------------------------------------------
  P.mandateSummary = (s, n) => {
    const a = n.politics.mandateStart || P.snapshot(s, n); const b = P.snapshot(s, n);
    const d = (x, y, dec = 0, suf = '') => { const v = y - x; return `<span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toLocaleString('it-IT', { maximumFractionDigits: dec })}${suf}</span>`; };
    return `<table><tr><th></th><th class="right">Inizio</th><th class="right">Ora</th><th class="right">Δ</th></tr>
      <tr><td>PIL (mld)</td><td class="right">${Math.round(a.gdp)}</td><td class="right">${Math.round(b.gdp)}</td><td class="right">${d(a.gdp, b.gdp)}</td></tr>
      <tr><td>Stabilità</td><td class="right">${Math.round(a.stab)}</td><td class="right">${Math.round(b.stab)}</td><td class="right">${d(a.stab, b.stab)}</td></tr>
      <tr><td>Consenso</td><td class="right">${Math.round(a.appr)}</td><td class="right">${Math.round(b.appr)}</td><td class="right">${d(a.appr, b.appr)}</td></tr>
      <tr><td>Debito %</td><td class="right">${Math.round(a.debt)}</td><td class="right">${Math.round(b.debt)}</td><td class="right">${d(a.debt, b.debt)}</td></tr>
      <tr><td>Inflazione %</td><td class="right">${(a.infl || 0).toFixed(1)}</td><td class="right">${b.infl.toFixed(1)}</td><td class="right">${d(a.infl || 0, b.infl, 1)}</td></tr>
      <tr><td>Popolazione (M)</td><td class="right">${a.pop.toFixed(1)}</td><td class="right">${b.pop.toFixed(1)}</td><td class="right">${d(a.pop, b.pop, 1)}</td></tr>
      <tr><td>Punteggio</td><td class="right">${a.score}</td><td class="right">${b.score}</td><td class="right">${d(a.score, b.score)}</td></tr></table>`;
  };


  // ---------- Costi e acquisti --------------------------------------------
  P.cost = (s, n, def) => Math.max(def.min || 5, Math.round(E.effGdp(s, n) * def.costPct / 100));
  P.canBuyPerk = (s, n, key) => { const d = GEO.PERKS[key]; if (n.perks[key]) return { ok: false, reason: 'Già acquisita.' }; if (d.req && !d.req(n, s)) return { ok: false, reason: 'Requisiti non soddisfatti.' }; const c = P.cost(s, n, d); if (n.treasury < c) return { ok: false, reason: `Servono ${c} mld.` }; return { ok: true, cost: c }; };
  P.buyPerk = (s, nid, key) => {
    const n = s.nations[nid]; const r = P.canBuyPerk(s, n, key); if (!r.ok) return r;
    n.treasury -= r.cost; n.perks[key] = s.turn; const d = GEO.PERKS[key];
    if (key === 'navy') n.navy = clamp(n.navy + 20, 0, 100);
    if (key === 'guard') n.politics.loyalty = clamp(n.politics.loyalty + 15, 0, 100);
    if (key === 'surveillance') { n.stability = clamp(n.stability + 6, 0, 100); n.politics.pressFreedom = clamp(n.politics.pressFreedom - 20, 0, 100); E.ids(s).forEach(o => { if (o !== nid && s.nations[o].regime === 'democrazia') E.changeRel(s, nid, o, -10); }); }
    if (key === 'nuclearprog') { n.nuclearProgram = 0.05; if (R() < 0.5) { E.news(s, `☢️ L'intelligence rivela un programma nucleare militare segreto in ${n.flag} ${n.name}.`, 'nuke', [nid]); E.ids(s).forEach(o => { if (o !== nid && E.getRel(s, o, nid) < 10) { E.changeRel(s, o, nid, -20); if (s.nations[o].regime === 'democrazia' && R() < 0.4 && o !== s.player) E.sanction(s, o, nid); } }); } }
    E.news(s, `${d.icon} ${n.flag} ${n.name} acquisisce: ${d.name}.`, nid === s.player ? 'eco' : 'tech', [nid]);
    return { ok: true };
  };
  P.canRunProject = (s, n, key) => { const d = GEO.PROJECTS[key]; if (d.req && !d.req(n, s)) return { ok: false, reason: 'Non disponibile ora.' }; const c = P.cost(s, n, d); if (n.treasury < c) return { ok: false, reason: `Servono ${c} mld.` }; if ((n.projectCooldown || {})[key] > s.turn) return { ok: false, reason: `Disponibile dal turno ${n.projectCooldown[key]}.` }; return { ok: true, cost: c }; };
  P.runProject = (s, nid, key) => {
    const n = s.nations[nid]; const r = P.canRunProject(s, n, key); if (!r.ok) return r;
    const d = GEO.PROJECTS[key]; n.treasury -= r.cost;
    if (d.fx) P.applyFx(s, n, d.fx);
    if (d.boost) n.boosts.push({ ...d.boost, until: s.turn + d.boost.turns, key });
    if (d.special === 'rebuild') { const lost = Math.max(0, n.gdpPeak - n.gdp); n.gdp += lost * 0.3; n.popLossTurn = Math.min(n.popLossTurn, s.turn - 5); n.regions.forEach(rg => { if (rg.irradiatedUntil) rg.irradiatedUntil = Math.min(rg.irradiatedUntil, s.turn + 1); }); }
    if (d.special === 'relief') { n.pop += (n.popPeak - n.pop) * 0.2; }
    n.projectCooldown = n.projectCooldown || {}; n.projectCooldown[key] = s.turn + (key === 'campaign' || key === 'bribe' || key === 'tighten' ? 2 : 6);
    E.news(s, `${d.icon} ${n.flag} ${n.name} finanzia: ${d.name} (${r.cost} mld).`, 'eco', [nid]);
    return { ok: true };
  };
  P.applyFx = (s, n, fx) => {
    if (fx.stability) n.stability = clamp(n.stability + fx.stability, 0, 100);
    if (fx.approval) n.approval = clamp(n.approval + fx.approval, 0, 100);
    if (fx.army) n.army = clamp(n.army + fx.army, 0, 110);
    if (fx.air) n.air = clamp(n.air + fx.air, 0, 100);
    if (fx.missiles) n.missiles += fx.missiles;
    if (fx.readiness) n.readiness = clamp(n.readiness + fx.readiness, 0, 100);
    if (fx.inflation) n.inflation = clamp(n.inflation + fx.inflation, 0, 80);
    if (fx.loyalty) n.politics.loyalty = clamp(n.politics.loyalty + fx.loyalty, 0, 100);
    if (fx.opposition) n.politics.opposition = clamp(n.politics.opposition + fx.opposition, 0, 100);
    if (fx.pressFreedom) n.politics.pressFreedom = clamp(n.politics.pressFreedom + fx.pressFreedom, 0, 100);
    if (fx.indexPct) s.market.indexes[n.id].price *= 1 + fx.indexPct / 100;
    if (fx.techProg) Object.entries(fx.techProg).forEach(([t, v]) => n.techProg[t] = (n.techProg[t] || 0) + v);
  };
  P.payDebt = (s, nid, amount) => { const n = s.nations[nid]; amount = Math.min(amount, n.treasury); if (amount <= 0) return { ok: false, reason: 'Tesoro insufficiente.' }; const pts = amount / E.effGdp(s, n) * 100; n.treasury -= amount; n.debt = clamp(n.debt - pts, 0, 400); E.news(s, `💳 ${n.flag} ${n.name} ripaga ${Math.round(amount)} mld di debito (−${pts.toFixed(1)} punti).`, 'eco', [nid]); return { ok: true, pts }; };
  P.investSOE = (s, nid, sector, amount) => { const n = s.nations[nid]; if (amount <= 0 || n.treasury < amount) return { ok: false, reason: 'Tesoro insufficiente.' }; n.treasury -= amount; n.enterprises[sector] = (n.enterprises[sector] || 0) + amount; return { ok: true }; };
  P.divestSOE = (s, nid, sector, amount) => { const n = s.nations[nid]; const cap = n.enterprises[sector] || 0; amount = Math.min(amount, cap); if (amount <= 0) return { ok: false, reason: 'Nessuna partecipazione.' }; n.enterprises[sector] = cap - amount; if (n.enterprises[sector] < 0.01) delete n.enterprises[sector]; n.treasury += amount * (n.perks.swf ? 1 : 0.95); return { ok: true }; };
  P.soeStep = (s, n) => {
    let div = 0;
    Object.entries(n.enterprises).forEach(([k, cap]) => { const h = s.market.sectors[k].hist; const ch = h.length > 1 ? clamp(h[h.length - 1] / h[h.length - 2] - 1, -0.1, 0.1) : 0; let y = 0.012 + ch * 0.6; if (E.warsOf(s, n.id).length && k !== 'DEF') y -= 0.01; if (n.inflation > 15) y -= 0.005; y *= n.perks.swf ? 1.5 : 1; div += cap * y; if (y < -0.03) n.enterprises[k] = cap * (1 + y * 0.5); });
    n.treasury += div; n.lastDividends = div;
  };

  // ---------- Azioni di regime --------------------------------------------
  P.ACTIONS = {
    media: { name: 'Controllo dei media', icon: '📺', costPct: 0.3, desc: 'Consenso +4 subito e +3 a turno, opposizione frenata. Libertà di stampa −30, relazioni con le democrazie −10, richiamo UE.', req: (n) => n.perks.propaganda && !n.politics.mediaControl, reqText: 'Richiede Apparato di propaganda.' },
    postpone: { name: 'Rinvio delle elezioni', icon: '⏳', costPct: 0, desc: 'Elezioni rinviate di 8 turni. Stabilità −6, reputazione −10, democrazie −12, opposizione +15. Al secondo rinvio la democrazia diventa regime ibrido.', req: (n, s) => n.regime !== 'autocrazia' && n.politics.nextElection && n.politics.nextElection - s.turn <= 8, reqText: 'Solo entro 8 turni dalle elezioni.' },
    emergency: { name: 'Stato di emergenza', icon: '🚨', costPct: 0, desc: 'Sospende le elezioni finché attivo. Stabilità +5, poi consenso −3 a turno e libertà di stampa −15. Revocabile.', req: (n, s) => n.regime !== 'autocrazia' && (E.warsOf(s, n.id).length > 0 || n.stability < 40 || n.politics.emergency), reqText: 'Solo in guerra o con stabilità < 40.' },
    constitution: { name: 'Riforma costituzionale', icon: '📜', costPct: 0.4, desc: 'Abolisce i limiti di mandato: regime ibrido, elezioni ogni 24 turni con forte vantaggio. Democrazie −15, libertà di stampa −15, opposizione +10.', req: (n) => n.regime === 'democrazia' && (n.approval >= 50 || n.politics.mediaControl), reqText: 'Richiede consenso ≥ 50 o controllo dei media.' },
    rig: { name: 'Brogli elettorali', icon: '🗳️', costPct: 0.5, desc: 'Vittoria garantita alle prossime elezioni se non scoperti (≈55%, +20% con Servizi segreti). Se scoperti: sconfitta, stabilità −15, democrazie −25.', req: (n, s) => n.regime !== 'autocrazia' && n.perks.propaganda && n.politics.nextElection && n.politics.nextElection - s.turn <= 3 && !n.politics.rigged, reqText: 'Propaganda + entro 3 turni dal voto.' },
    purge: { name: 'Purga e partito unico', icon: '⛓️', costPct: 0.5, desc: 'Diventi autocrazia: niente più elezioni. Stabilità −12, consenso −10, libertà di stampa a 10, democrazie −30, reputazione −20, espulsione dall’UE, sanzioni probabili. Da ora conta la lealtà delle élite.', req: (n) => n.perks.surveillance && n.regime !== 'autocrazia', reqText: 'Richiede Stato di sorveglianza.' },
    democratize: { name: 'Transizione democratica', icon: '🕊️', costPct: 0.2, desc: 'Elezioni libere tra 4 turni. Democrazie +25, libertà di stampa a 70, molte sanzioni occidentali revocate. Dovrai vincere le elezioni.', req: (n) => n.regime !== 'democrazia', reqText: 'Solo per regimi non democratici.' },
  };
  P.doAction = (s, nid, key) => {
    const n = s.nations[nid]; const d = P.ACTIONS[key]; const pol = n.politics;
    if (!d.req(n, s)) return { ok: false, reason: d.reqText };
    const cost = Math.round(E.effGdp(s, n) * d.costPct / 100); if (n.treasury < cost) return { ok: false, reason: `Servono ${cost} mld.` };
    n.treasury -= cost;
    const dem = (v) => E.ids(s).forEach(o => { if (o !== nid && s.nations[o].regime === 'democrazia') E.changeRel(s, nid, o, v); });
    switch (key) {
      case 'media': pol.mediaControl = true; pol.pressFreedom = clamp(pol.pressFreedom - 30, 0, 100); n.approval = clamp(n.approval + 4, 0, 100); dem(-10); pol.euWarnings++; E.news(s, `📺 ${n.flag} ${n.name}: il governo prende il controllo delle TV e dei giornali.`, 'event', [nid]); break;
      case 'postpone': pol.nextElection += 8; pol.postponements++; n.stability = clamp(n.stability - 6, 0, 100); n.reputation = clamp(n.reputation - 10, 0, 100); pol.opposition = clamp(pol.opposition + 15, 0, 100); dem(-12); if (pol.postponements >= 2 && n.regime === 'democrazia') { n.regime = 'ibrido'; pol.mandateLen = 24; E.news(s, `⚠️ ${n.flag} ${n.name} rinvia di nuovo le elezioni: osservatori internazionali declassano il paese a regime ibrido.`, 'event', [nid]); } else E.news(s, `⏳ ${n.flag} ${n.name} rinvia le elezioni di 8 turni.`, 'event', [nid]); break;
      case 'emergency': pol.emergency = !pol.emergency; if (pol.emergency) { n.stability = clamp(n.stability + 5, 0, 100); pol.pressFreedom = clamp(pol.pressFreedom - 15, 0, 100); dem(-5); E.news(s, `🚨 ${n.flag} ${n.name} proclama lo stato di emergenza: elezioni sospese.`, 'event', [nid]); } else E.news(s, `${n.flag} ${n.name} revoca lo stato di emergenza.`, 'event', [nid]); break;
      case 'constitution': n.regime = 'ibrido'; pol.mandateLen = 24; pol.nextElection = s.turn + 24; pol.pressFreedom = clamp(pol.pressFreedom - 15, 0, 100); pol.opposition = clamp(pol.opposition + 10, 0, 100); dem(-15); pol.euWarnings++; E.news(s, `📜 ${n.flag} ${n.name} riscrive la costituzione: aboliti i limiti di mandato.`, 'event', [nid]); break;
      case 'rig': pol.rigged = true; E.news(s, `${n.flag} ${n.name}: i servizi preparano "aggiustamenti" al conteggio dei voti.`, 'sys', [nid]); break;
      case 'purge': P.becomeAutocracy(s, n, 'purga'); break;
      case 'democratize': n.regime = 'democrazia'; pol.mandateLen = 16; pol.nextElection = s.turn + 4; pol.pressFreedom = 70; pol.mediaControl = false; pol.emergency = false; pol.opposition = 45; n.approval = clamp(n.approval + 5, 0, 100); dem(25); s.sanctions = s.sanctions.filter(x => !(x.to === nid && x.type === 'economiche' && s.nations[x.from].regime === 'democrazia' && E.getRel(s, x.from, nid) > -40)); E.news(s, `🕊️ ${n.flag} ${n.name} annuncia elezioni libere: transizione democratica.`, 'event', [nid]); break;
    }
    return { ok: true };
  };
  P.becomeAutocracy = (s, n, how) => {
    const pol = n.politics; const nid = n.id;
    n.regime = 'autocrazia'; pol.mandateLen = null; pol.nextElection = null; pol.rigged = false;
    n.stability = clamp(n.stability - 12, 0, 100); n.approval = clamp(n.approval - 10, 0, 100); pol.loyalty = 55; pol.pressFreedom = 10; n.reputation = clamp(n.reputation - 20, 0, 100);
    E.ids(s).forEach(o => { if (o === nid) return; const m = s.nations[o]; if (m.regime === 'democrazia') { E.changeRel(s, nid, o, -30); if (R() < 0.5 && o !== s.player && E.effGdp(s, m) > 500) E.sanction(s, o, nid); } else E.changeRel(s, nid, o, 8); });
    E.news(s, `⛓️ ${n.flag} ${n.name}: ${how === 'purga' ? 'purga dell’opposizione, partito unico, fine delle elezioni' : 'presa del potere'}. Il paese è ora un'autocrazia.`, 'event', [nid]);
    P.checkEU(s, n, true);
  };
  P.checkEU = (s, n, force) => {
    if (!n.blocs.includes('EU')) return;
    if (n.regime === 'autocrazia' || force || (n.politics.euWarnings >= 3 && R() < 0.3)) {
      n.blocs = n.blocs.filter(b => b !== 'EU'); n.gdp *= 0.97; E.news(s, `🇪🇺 L'Unione Europea sospende ${n.flag} ${n.name}: fondi bloccati, mercato unico chiuso (PIL −3%).`, 'dip', [n.id]);
      E.ids(s).forEach(o => { if (o !== n.id && s.nations[o].blocs.includes('EU')) E.changeRel(s, n.id, o, -20); });
    } else if (n.politics.euWarnings >= 2 && !n.politics.euWarned) { n.politics.euWarned = true; E.news(s, `🇪🇺 Bruxelles avvia la procedura per violazione dello stato di diritto contro ${n.flag} ${n.name}.`, 'dip', [n.id]); }
  };

  // ---------- Elezioni ------------------------------------------------------
  P.winProb = (s, n) => {
    const pol = n.politics; const g = n.lastGrowth;
    let p = 0.5 + (n.approval - 50) / 60 + (g - 2) * 0.03 - (pol.opposition - 40) / 150 + (n.perks.propaganda ? 0.06 : 0) + (pol.mediaControl ? 0.18 : 0) + (n.regime === 'ibrido' ? 0.2 : 0) - (n.stability < 40 ? 0.1 : 0) - (n.inflation > 8 ? (n.inflation - 8) * 0.01 : 0) - (n.exhaustion > 30 ? 0.08 : 0);
    p += (E.mods(n).election || 0);
    return clamp(p, 0.03, 0.97);
  };
  P.election = (s, n) => {
    const pol = n.politics; const nid = n.id; const isP = nid === s.player;
    let p = P.winProb(s, n); let share = clamp(Math.round(38 + p * 28 + (R() - 0.5) * 8), 15, 85);
    let won = R() < p; let rigNote = '';
    if (pol.rigged) {
      const ok = R() < 0.55 + (n.perks.intel ? 0.2 : 0) + (n.perks.surveillance ? 0.15 : 0);
      pol.rigged = false;
      if (ok) { won = true; share = Math.max(share, 52); rigNote = ' (voto "aggiustato")'; if (R() < 0.25 - (n.perks.intel ? 0.15 : 0)) { n.stability = clamp(n.stability - 10, 0, 100); E.ids(s).forEach(o => { if (o !== nid && s.nations[o].regime === 'democrazia') E.changeRel(s, nid, o, -20); }); E.news(s, `🗳️ Osservatori internazionali denunciano brogli in ${n.flag} ${n.name}.`, 'event', [nid]); } }
      else { won = false; n.stability = clamp(n.stability - 15, 0, 100); pol.pressFreedom = clamp(pol.pressFreedom - 20, 0, 100); E.ids(s).forEach(o => { if (o !== nid && s.nations[o].regime === 'democrazia') E.changeRel(s, nid, o, -25); }); rigNote = ' — i brogli sono stati SCOPERTI'; }
    }
    pol.lastElection = s.turn; pol.nextElection = s.turn + pol.mandateLen; pol.postponements = 0;
    const summary = isP ? P.mandateSummary(s, n) : '';
    if (won) { pol.terms++; n.approval = clamp(n.approval + 4, 0, 100); pol.opposition = clamp(pol.opposition - 10, 0, 100); E.news(s, `🗳️ ${n.flag} ${n.name}: il governo vince le elezioni con il ${share}%${rigNote}. Inizia il mandato n. ${pol.terms}.`, 'event', [nid]); if (isP) { s.alerts.push({ title: '🗳️ Elezioni vinte', text: `Hai vinto con il ${share}% dei voti${rigNote}. Nuovo mandato di ${pol.mandateLen} turni.<h4>Bilancio del mandato</h4>${summary}` }); E.history(s, `Elezioni vinte con il ${share}% — mandato n. ${pol.terms}`, 'politics'); pol.mandateStart = P.snapshot(s, n); } }
    else {
      E.news(s, `🗳️ ${n.flag} ${n.name}: il governo PERDE le elezioni (${share}%)${rigNote}. Cambio di guardia.`, 'event', [nid]);
      if (isP) { s.alerts.push({ title: '🗳️ Elezioni perse', text: `Hai ottenuto il ${share}% dei voti${rigNote}.<h4>Bilancio del mandato</h4>${summary}` }); E.history(s, `Elezioni perse con il ${share}%`, 'politics'); P.enterOpposition(s, n); }
      else P.newGovernment(s, n);
    }
  };
  P.newGovernment = (s, n) => {
    const pool = n.regime === 'democrazia' ? ['mercante', 'difensivo', 'egemone', 'ambizioso', 'opportunista', 'isolazionista'] : ['falco', 'opportunista', 'paziente', 'difensivo'];
    n.persona = E.pick(pool.filter(x => x !== n.persona)); n.approval = 55; n.politics.opposition = 35; n.politics.loyalty = 60;
    E.ids(s).forEach(o => { if (o !== n.id) E.changeRel(s, n.id, o, RI(-12, 12)); });
    if (n.politics.mediaControl && R() < 0.6) { n.politics.mediaControl = false; n.politics.pressFreedom = clamp(n.politics.pressFreedom + 20, 0, 100); }
  };

  // ---------- Passo per turno --------------------------------------------
  P.step = (s, n) => {
    const pol = n.politics; const nid = n.id; const isP = nid === s.player;
    // boost scaduti
    n.boosts = n.boosts.filter(b => b.until > s.turn);
    // inflazione
    const oilRatio = s.market.commodities.oil.price / GEO.COMMODITIES.oil.base;
    let target = 2.2 + (n.spendMult - 1) * 22 + Math.max(0, oilRatio - 1) * 5 * (n.perks.reserves ? 0.3 : 1) + Math.max(0, n.lastGrowth - 5) * 0.4 + E.warsOf(s, nid).length * 1.5 + (n.debt > 150 ? 2 : 0) + (n.lastGrowth < -2 ? 2 : 0);
    target += (E.mods(n).infl || 0);
    if (n.perks.centralbank) target = 2 + (target - 2) * 0.5;
    n.inflation = clamp(n.inflation + (target - n.inflation) * 0.25, 0, 80);
    // stampa e media
    if (pol.mediaControl) { n.approval = clamp(n.approval + 3, 0, 100); pol.opposition = clamp(pol.opposition - 2, 0, 100); }
    if (pol.emergency) { n.approval = clamp(n.approval - 3, 0, 100); if (pol.nextElection) pol.nextElection = Math.max(pol.nextElection, s.turn + 1); }
    pol.pressFreedom = clamp(pol.pressFreedom + ({ democrazia: 0.5, ibrido: 0, autocrazia: -0.3 }[n.regime]) - (pol.mediaControl ? 0.5 : 0) + (E.mods(n).press || 0), 0, 100);
    if (n.regime === 'democrazia') {
      const oppT = 40 + (50 - n.approval) * 0.6 + Math.max(0, n.inflation - 3) * 1.2 + n.exhaustion * 0.2 - (n.perks.surveillance ? 10 : 0) - (pol.mediaControl ? 10 : 0) + (n.stability < 40 ? 8 : 0) + (E.mods(n).opposition || 0);
      if (nid === s.player && s.playerStatus !== 'governo') return P.afterStep(s, n);
      pol.opposition = clamp(pol.opposition + (oppT - pol.opposition) * 0.2, 0, 100);
      if (pol.nextElection && s.turn >= pol.nextElection && !pol.emergency) P.election(s, n);
      // golpe militare in democrazie al collasso
      if (n.stability < 20 && n.budget.military > 0.33 && R() < 0.1) { if (n.perks.guard) E.news(s, `${n.flag} ${n.name}: tentativo di golpe sventato dalla Guardia pretoriana.`, 'event', [nid]); else { E.history(s, `Golpe militare in ${n.flag} ${n.name}`, 'event'); if (isP) P.enterExile(s, n, 'golpe'); else { P.becomeAutocracy(s, n, 'golpe'); n.persona = 'falco'; } } }
    } else {
      if (n.regime === 'ibrido' && pol.nextElection && s.turn >= pol.nextElection && !pol.emergency) P.election(s, n);
      if (nid === s.player && s.playerStatus !== 'governo') return P.afterStep(s, n);
      const loyT = 50 + (E.mods(n).loyalty || 0) + (n.budget.military - 0.3) * 100 + (n.lastGrowth - 2) * 2 - Math.min(12, E.sanctionsOn(s, nid).length * 1.5) - n.exhaustion * 0.3 + (n.perks.guard ? 15 : 0) + (n.treasury > E.effGdp(s, n) * 0.05 ? 5 : 0) - (n.stability < 40 ? 10 : 0) - (n.inflation > 15 ? 8 : 0) + (E.occupiedShare(n) > 0.2 ? -15 : 0);
      pol.loyalty = clamp(pol.loyalty + (loyT - pol.loyalty) * 0.2, 0, 100);
      if (pol.loyalty < 25 && R() < 0.25) {
        if (n.perks.guard) { pol.loyalty = clamp(pol.loyalty + 20, 0, 100); n.stability = clamp(n.stability - 5, 0, 100); E.news(s, `🛡️ ${n.flag} ${n.name}: un colpo di stato militare fallisce, la Guardia pretoriana resta fedele.`, 'event', [nid]); if (isP) s.alerts.push({ title: '🛡️ Golpe sventato', text: 'La Guardia pretoriana ha fermato i congiurati. Le élite restano inquiete: aumenta la spesa militare o compra la loro lealtà.' }); }
        else { E.news(s, `⚔️ COLPO DI STATO in ${n.flag} ${n.name}: i generali rovesciano il governo.`, 'event', [nid]); E.history(s, `Colpo di stato in ${n.flag} ${n.name}`, 'event'); if (isP) P.enterExile(s, n, 'golpe'); else { n.persona = E.pick(['falco', 'opportunista', 'paziente']); pol.loyalty = 60; n.stability = clamp(n.stability - 8, 0, 100); E.ids(s).forEach(o => { if (o !== nid) E.changeRel(s, nid, o, RI(-15, 10)); }); } }
      }
    }
    P.afterStep(s, n);
  };
  P.afterStep = (s, n) => {
    const isP = n.id === s.player;
    P.checkEU(s, n, false);
    P.soeStep(s, n);
    // Ripopolamento dopo 5 turni dalla perdita
    n.popPeak = Math.max(n.popPeak || n.pop, n.pop); n.gdpPeak = Math.max(n.gdpPeak || n.gdp, n.gdp);
    if (n.pop < n.popPeak * 0.995 && s.turn - n.popLossTurn >= 5) { const fast = n.boosts.some(b => b.popRecover); const rate = fast ? 0.3 : 0.18; const before = n.pop; n.pop += (n.popPeak - n.pop) * rate; n.recovering = true; if (isP && before < n.popPeak * 0.9) E.news(s, `👶 Ripopolamento in corso: +${((n.pop - before)).toFixed(1)} M abitanti (immigrazione, ritorno dei profughi, baby boom).`, 'eco', [nid]); } else n.recovering = false;
    n.regions.forEach(r => { if (r.irradiatedUntil && r.irradiatedUntil <= s.turn) { delete r.irradiatedUntil; if (isP) E.news(s, `☢️ ${r.name} è di nuovo abitabile.`, 'eco', [nid]); } });
  };

  // ---------- IA: uso del tesoro ---------------------------------------------
  P.aiStep = (s, n) => {
    const eff = E.effGdp(s, n);
    if (n.debt > 110 && n.treasury > eff * 0.03) P.payDebt(s, n.id, n.treasury * 0.5);
    if (n.stability < 40 && P.canRunProject(s, n, 'housing').ok && R() < 0.5) P.runProject(s, n.id, 'housing');
    if (E.warsOf(s, n.id).length && P.canRunProject(s, n, 'rearm').ok && R() < 0.4) P.runProject(s, n.id, 'rearm');
    if (n.inflation > 12 && P.canRunProject(s, n, 'tighten').ok) P.runProject(s, n.id, 'tighten');
    if (n.regime !== 'democrazia' && n.politics.loyalty < 40 && P.canRunProject(s, n, 'bribe').ok) P.runProject(s, n.id, 'bribe');
    if (n.regime === 'democrazia' && n.politics.nextElection && n.politics.nextElection - s.turn <= 3 && n.approval < 52 && P.canRunProject(s, n, 'campaign').ok) P.runProject(s, n.id, 'campaign');
    if (s.turn % 4 === (n.id.charCodeAt(0) % 4)) {
      const pref = { egemone: ['missileshield', 'intel', 'navy', 'techhub'], falco: ['specialforces', 'missileshield', 'guard', 'triad'], paziente: ['techhub', 'surveillance', 'missileshield', 'navy'], mercante: ['techhub', 'centralbank', 'swf', 'reserves'], opportunista: ['guard', 'propaganda', 'intel', 'reserves'], isolazionista: ['centralbank', 'reserves', 'guard'], difensivo: ['missileshield', 'cybershield', 'intel', 'specialforces'], ambizioso: ['techhub', 'navy', 'intel', 'propaganda'], imprevedibile: ['guard', 'surveillance', 'triad', 'specialforces'] }[n.persona] || [];
      const want = (n.regime === 'autocrazia' ? ['guard', 'surveillance', 'propaganda'] : []).concat(pref).find(k => !n.perks[k] && P.canBuyPerk(s, n, k).ok && n.treasury > P.cost(s, n, GEO.PERKS[k]) * 2);
      if (want) P.buyPerk(s, n.id, want);
    }
    // Politiche IA: reazioni lente al contesto
    if (s.turn % 6 === (n.id.charCodeAt(1) % 6)) {
      const want = [];
      if (E.warsOf(s, n.id).length && n.army < 60 && n.policies.difesa !== 'leva') want.push(['difesa', 'leva']);
      if (n.inflation > 10 && n.policies.fisco !== 'tasse_alte') want.push(['fisco', 'tasse_alte']);
      if (n.stability < 35) want.push(n.regime === 'democrazia' ? ['welfare', 'universale'] : ['istituzioni', 'ordine']);
      if (E.sanctionsOn(s, n.id).length > 5 && n.policies.commercio === 'libero_scambio') want.push(['commercio', 'protezionismo']);
      if (n.debt > 140 && n.policies.welfare === 'universale') want.push(['welfare', 'base']);
      if (s.climate && s.climate.temp > 1.7 && n.policies.energia === 'fossile' && n.regime === 'democrazia') want.push(['energia', 'transizione']);
      const w = want.find(([c, o]) => n.policies[c] !== o && (!GEO.POLICIES[c].options[o].req || GEO.POLICIES[c].options[o].req(n, s)));
      if (w) P.setPolicy(s, n.id, w[0], w[1]);
    }
    // IA autoritaria: una democrazia con leader opportunista/falco e consenso in calo può derivare
    if (n.regime === 'democrazia' && ['falco', 'opportunista'].includes(n.persona) && n.politics.nextElection - s.turn <= 4 && P.winProb(s, n) < 0.4 && R() < 0.15) { if (n.perks.propaganda) { n.politics.rigged = true; } else if (n.stability > 35) { P.doAction(s, n.id, 'postpone'); } }
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
