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
    if (won) { pol.terms++; n.approval = clamp(n.approval + 4, 0, 100); pol.opposition = clamp(pol.opposition - 10, 0, 100); E.news(s, `🗳️ ${n.flag} ${n.name}: il governo vince le elezioni con il ${share}%${rigNote}. Inizia il mandato n. ${pol.terms}.`, 'event', [nid]); if (isP) s.alerts.push({ title: '🗳️ Elezioni vinte', text: `Hai vinto con il ${share}% dei voti${rigNote}. Nuovo mandato di ${pol.mandateLen} turni.` }); }
    else {
      E.news(s, `🗳️ ${n.flag} ${n.name}: il governo PERDE le elezioni (${share}%)${rigNote}. Cambio di guardia.`, 'event', [nid]);
      if (isP) s.gameOver = { type: 'sconfitta', text: `Hai perso le elezioni con il ${share}% dei voti${rigNote}. L'opposizione forma il nuovo governo. Fine del tuo mandato.` };
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
    if (n.perks.centralbank) target = 2 + (target - 2) * 0.5;
    n.inflation = clamp(n.inflation + (target - n.inflation) * 0.25, 0, 80);
    // stampa e media
    if (pol.mediaControl) { n.approval = clamp(n.approval + 3, 0, 100); pol.opposition = clamp(pol.opposition - 2, 0, 100); }
    if (pol.emergency) { n.approval = clamp(n.approval - 3, 0, 100); if (pol.nextElection) pol.nextElection = Math.max(pol.nextElection, s.turn + 1); }
    pol.pressFreedom = clamp(pol.pressFreedom + ({ democrazia: 0.5, ibrido: 0, autocrazia: -0.3 }[n.regime]) - (pol.mediaControl ? 0.5 : 0), 0, 100);
    if (n.regime === 'democrazia') {
      const oppT = 40 + (50 - n.approval) * 0.6 + Math.max(0, n.inflation - 3) * 1.2 + n.exhaustion * 0.2 - (n.perks.surveillance ? 10 : 0) - (pol.mediaControl ? 10 : 0) + (n.stability < 40 ? 8 : 0);
      pol.opposition = clamp(pol.opposition + (oppT - pol.opposition) * 0.2, 0, 100);
      if (pol.nextElection && s.turn >= pol.nextElection && !pol.emergency) P.election(s, n);
      // golpe militare in democrazie al collasso
      if (n.stability < 20 && n.budget.military > 0.33 && R() < 0.1) { if (n.perks.guard) E.news(s, `${n.flag} ${n.name}: tentativo di golpe sventato dalla Guardia pretoriana.`, 'event', [nid]); else { if (isP) s.gameOver = { type: 'sconfitta', text: 'I militari hanno preso il potere con un colpo di stato: sei stato deposto.' }; else { P.becomeAutocracy(s, n, 'golpe'); n.persona = 'falco'; } } }
    } else {
      if (n.regime === 'ibrido' && pol.nextElection && s.turn >= pol.nextElection && !pol.emergency) P.election(s, n);
      const loyT = 50 + (n.budget.military - 0.3) * 100 + (n.lastGrowth - 2) * 2 - Math.min(12, E.sanctionsOn(s, nid).length * 1.5) - n.exhaustion * 0.3 + (n.perks.guard ? 15 : 0) + (n.treasury > E.effGdp(s, n) * 0.05 ? 5 : 0) - (n.stability < 40 ? 10 : 0) - (n.inflation > 15 ? 8 : 0) + (E.occupiedShare(n) > 0.2 ? -15 : 0);
      pol.loyalty = clamp(pol.loyalty + (loyT - pol.loyalty) * 0.2, 0, 100);
      if (pol.loyalty < 25 && R() < 0.25) {
        if (n.perks.guard) { pol.loyalty = clamp(pol.loyalty + 20, 0, 100); n.stability = clamp(n.stability - 5, 0, 100); E.news(s, `🛡️ ${n.flag} ${n.name}: un colpo di stato militare fallisce, la Guardia pretoriana resta fedele.`, 'event', [nid]); if (isP) s.alerts.push({ title: '🛡️ Golpe sventato', text: 'La Guardia pretoriana ha fermato i congiurati. Le élite restano inquiete: aumenta la spesa militare o compra la loro lealtà.' }); }
        else { E.news(s, `⚔️ COLPO DI STATO in ${n.flag} ${n.name}: i generali rovesciano il governo.`, 'event', [nid]); if (isP) s.gameOver = { type: 'sconfitta', text: 'Le élite militari ti hanno rovesciato con un colpo di stato. La lealtà era scesa troppo in basso.' }; else { n.persona = E.pick(['falco', 'opportunista', 'paziente']); pol.loyalty = 60; n.stability = clamp(n.stability - 8, 0, 100); E.ids(s).forEach(o => { if (o !== nid) E.changeRel(s, nid, o, RI(-15, 10)); }); } }
      }
    }
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
    // IA autoritaria: una democrazia con leader opportunista/falco e consenso in calo può derivare
    if (n.regime === 'democrazia' && ['falco', 'opportunista'].includes(n.persona) && n.politics.nextElection - s.turn <= 4 && P.winProb(s, n) < 0.4 && R() < 0.15) { if (n.perks.propaganda) { n.politics.rigged = true; } else if (n.stability > 35) { P.doAction(s, n.id, 'postpone'); } }
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
