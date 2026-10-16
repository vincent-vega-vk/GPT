/*
 * SIMSOC 6 (remake) - game engine
 * The whole football world: eight nations' leagues (England's four-tier
 * pyramid, Serie A/B, La Liga, Bundesliga, Division 1, Eredivisie, Primeira
 * Liga, Scottish Premier) with promotion/relegation, every nation's domestic
 * cup plus the two-legged European cups, a dated season calendar, the economy
 * (gates, TV, wages, prize money, loans), contracts, an inbox with actionable
 * messages, a board with objectives, reputation and job offers, a living
 * transfer market with AI deals, and the season loop. No DOM in here so it
 * can be exercised head-less by the test harness. The user's matches are
 * played by the live minute-by-minute engine (live.js).
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data'), require('./live'));
  } else {
    root.SimSocEngine = factory(root.SimSocData, root.SimSocLive);
  }
})(typeof self !== 'undefined' ? self : this, function (Data, Live) {
  'use strict';

  const VERSION = 2;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const fullName = p => p.forename + ' ' + p.surname;
  const fmtMoney = n => '£' + Math.round(n).toLocaleString('en-GB');
  const MAX_SQUAD = 23, MIN_SQUAD = 12;
  const UNLISTED_PREMIUM = 1.6;
  const roundFee = v => (v < 100000 ? Math.round(v / 500) * 500 : Math.round(v / 5000) * 5000);
  const FREE_AGENT = '(free agent)';
  const BRITISH = new Set(['ENG', 'SCO', 'WAL', 'NIR', 'IRL']);
  const FORMATIONS = Live.FORMATIONS;
  const AI_FORMATIONS = ['442', '442', '442', '433', '433', '451', '352', '343', '532', '541'];
  const DIFFICULTY = {
    easy: { label: 'Easy', boost: 1.12, funds: 1.6, patience: 0 },
    normal: { label: 'Normal', boost: 1.06, funds: 1.15, patience: 1 },
    hard: { label: 'Hard', boost: 0.99, funds: 0.8, patience: 1.4 }
  };
  const LEVEL_PRESTIGE = { 1: 72, 2: 54, 3: 38, 4: 22 };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /* ---- fixtures: round-robin (circle method), double or quadruple ------ */
  function makeFixtures(ids, rng, legs) {
    legs = legs || 2;
    const n = ids.length;
    let arr = []; for (let i = 0; i < n; i++) arr.push(i);
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        games.push(r % 2 ? { home: a, away: b } : { home: b, away: a });
      }
      rounds.push(games);
      arr = [arr[0]].concat([arr[n - 1]]).concat(arr.slice(1, n - 1));
    }
    const second = rounds.map(g => g.map(x => ({ home: x.away, away: x.home })));
    let all = rounds.concat(second);
    if (legs === 4) all = all.concat(rounds.map(g => g.map(x => ({ home: x.home, away: x.away }))), second.map(g => g.map(x => ({ home: x.home, away: x.away }))));
    const fixtures = [];
    all.forEach((games, ri) => games.forEach(g => fixtures.push({ round: ri, home: ids[g.home], away: ids[g.away] })));
    return fixtures;
  }
  // spread a league's rounds evenly over the calendar's L league weekends
  function buildSchedule(rounds, L) {
    const sch = new Array(L).fill(-1);
    if (rounds >= L) { for (let u = 0; u < L; u++) sch[u] = u; return sch; }
    for (let k = 0; k < rounds; k++) sch[Math.round(k * (L - 1) / Math.max(1, rounds - 1))] = k;
    return sch;
  }
  function blankRow() { return { P: 0, W: 0, D: 0, L: 0, F: 0, A: 0, Pts: 0 }; }
  function blankTable(memberIds, clubs) {
    const t = {}; memberIds.forEach(i => { t[clubs[i].name] = blankRow(); }); return t;
  }
  function blankFinance() { return { season: { gate: 0, tv: 0, prize: 0, sales: 0, wages: 0, purchases: 0, interest: 0, stadium: 0, attSum: 0, attN: 0 }, last: null, history: [] }; }
  const divisionRounds = (s, d) => (s.divisions[d].members.length - 1) * (s.divisions[d].legs || 2);

  /* ===================================================================== *
   * NEW GAME
   * ===================================================================== */
  function newGame(seed, userIndex, opts) {
    seed = seed >>> 0 || 12345;
    opts = opts || {};
    const rng = Data.makeRng(seed);
    const clubs = [], divisions = [];
    Data.LEAGUES.forEach((LG, d) => {
      const members = [];
      LG.clubs.forEach(cd => {
        const club = Data.generateClub(rng, { name: cd.name, tier: cd.t, base: LG.base, level: LG.level, nation: LG.nation });
        club.division = d; club.foreign = LG.nation !== 'ENG';
        club.formation = Data.pick(rng, AI_FORMATIONS); club.form = [];
        clubs.push(club); members.push(clubs.length - 1);
      });
      divisions.push({
        id: LG.id, name: LG.name, nation: LG.nation, tier: LG.tier, level: LG.level, legs: LG.legs || 2,
        members: members, fixtures: makeFixtures(members, rng, LG.legs || 2), results: [], table: blankTable(members, clubs)
      });
    });
    Data.REST_OF_EUROPE.forEach(r => {
      const club = Data.generateClub(rng, { name: r.name, tier: r.t, base: Data.REST_BASE, level: 2, nation: r.nation });
      club.division = -1; club.foreign = true; club.formation = Data.pick(rng, AI_FORMATIONS); club.form = [];
      club.players = club.players.slice(0, 19);
      clubs.push(club);
    });
    const L = Math.max.apply(null, divisions.map(dv => (dv.members.length - 1) * dv.legs));
    divisions.forEach(dv => { dv.schedule = buildSchedule((dv.members.length - 1) * dv.legs, L); });

    // free agents: the open market
    const transferPool = [];
    for (let k = 0; k < 120; k++) transferPool.push(freeAgent(rng));
    clubs.forEach(c => {                                   // every club starts with a surplus player or two on the list
      if (c.players.length > 19 && rng() < 0.6) c.players.slice().sort((a, b) => a.skill - b.skill)[Data.ri(rng, 0, 3)].transferListed = true;
    });

    const diff = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    const state = {
      version: VERSION, seed: seed, season: 1, day: 0, year: 1996, L: L,
      clubs: clubs, divisions: divisions,
      userClub: 0, userDivision: 3,
      managerRating: 50, reputation: 30, manager: { name: opts.managerName || 'The Gaffer' }, difficulty: diff,
      transferPool: transferPool,
      cups: {}, calendar: [], honours: [], euroQual: null,
      history: [], exPlayers: [], career: [], prev: null, debt: 0, debtSince: -1,
      trainedRound: -1, trainedSeason: 0,
      lastResult: null, roundup: [], notices: [], selection: null,
      tactics: { mentality: 0, pressing: 1, tempo: 1, autoSubs: true, autoPick: true, pickMode: 'best' },
      inbox: [], news: [], msgSeq: 1, offers: [], offerSeq: 1, shortlist: [], transferLog: [],
      board: { confidence: 60, objective: null, warnedDay: -99 }, finance: blankFinance(),
      posHistory: [], record: { P: 0, W: 0, D: 0, L: 0 }, seasonRecord: { P: 0, W: 0, D: 0, L: 0 },
      pendingReview: null, sacked: false, awards: [],
      achievements: {}, streak: { w: 0, unbeaten: 0, cs: 0 }, nationsManaged: [], stadiumSeason: 0
    };
    const bottomFirst = divisions[3].members[0];   // Romford
    const ui = userIndex == null ? bottomFirst : userIndex;
    state.userClub = clubs[ui] && clubs[ui].division >= 0 ? ui : bottomFirst;
    state.userDivision = clubs[state.userClub].division;
    clubs.forEach((c, i) => { c.isUser = (i === state.userClub); });
    user(state).balance = Math.round(user(state).balance * DIFFICULTY[diff].funds);
    state.euroQual = seedEuroQual(state);
    startSeasonCups(state);
    state.selection = defaultSelection(state);
    state.reputation = clamp(clubPrestige(state, state.userClub) - 6, 12, 80);
    onTakeover(state, true);
    news(state, 'The ' + seasonLabel(state) + ' season kicks off across Europe.', 'world');
    return state;
  }
  function freeAgent(rng) {
    const p = Data.generatePlayer(rng, { centre: Data.ri(rng, 36, 66), level: 3 });
    p.club = FREE_AGENT; p.contract = 0;
    return p;
  }

  const user = s => s.clubs[s.userClub];
  const userDiv = s => s.divisions[s.userDivision];
  const totalRounds = s => s ? s.L : 42;
  const userLeagueRounds = s => divisionRounds(s, s.userDivision);
  const numDivisions = s => s.divisions.length;
  const divisionName = (s, d) => s.divisions[d].name;
  const levelOf = (s, ci) => { const c = s.clubs[ci]; return c && c.division >= 0 ? s.divisions[c.division].level : 2; };
  const nationOfClub = (s, ci) => { const c = s.clubs[ci]; return c.division >= 0 ? s.divisions[c.division].nation : c.nation; };

  /* ---- choose / change the managed club -------------------------------- */
  function setUserClub(s, index) {
    index = Math.max(0, Math.min(s.clubs.length - 1, index | 0));
    if (s.clubs[index].division < 0) return s;                 // continental guests have no league to manage in
    s.clubs.forEach((c, i) => { c.isUser = (i === index); });
    s.userClub = index;
    s.userDivision = s.clubs[index].division;
    s.managerRating = 50;
    s.debt = 0; s.debtSince = -1;        // a new club starts you with a clean sheet — no inherited debt
    s.selection = defaultSelection(s);
    return s;
  }
  // take over a club (new game or a new job); at the start of a season the cups are redrawn so you're in them
  function chooseClub(s, index) {
    const before = s.userClub;
    if (before !== index && s.day > 0 && !s.sacked && s.seasonRecord && s.seasonRecord.P > 0) {   // log the stint you are leaving
      const oc = user(s);
      s.career.push({ season: s.season, label: seasonLabel(s), club: oc.name, division: userDiv(s).name, position: leaguePosition(s, oc.name),
        trophies: [], record: Object.assign({}, s.seasonRecord), objective: s.board.objective ? s.board.objective.label : '', met: false, note: 'Left for ' + s.clubs[index].name });
    }
    setUserClub(s, index);
    if (s.day === 0) { startSeasonCups(s); s.selection = defaultSelection(s); }
    s.sacked = false;
    if (before !== s.userClub || s.day === 0) { s.posHistory = []; s.seasonRecord = { P: 0, W: 0, D: 0, L: 0 }; s.finance = blankFinance(); }
    onTakeover(s, false);
    return s;
  }
  function onTakeover(s, first) {
    setObjective(s);
    const nat = userDiv(s).nation;
    s.nationsManaged = s.nationsManaged || [];
    if (s.nationsManaged.indexOf(nat) < 0) s.nationsManaged.push(nat);
    if (!first) {
      if (userDiv(s).tier === 1) unlock(s, 'top-flight');
      if (s.nationsManaged.length >= 2) unlock(s, 'globetrotter');
    }
    s.board.confidence = 60; s.board.warnedDay = -99;
    const c = user(s), dv = userDiv(s), wages = wageBill(s);
    mail(s, {
      cat: 'board', from: 'The Chairman', important: true,
      subject: (first ? 'Welcome to ' : 'Welcome aboard, ') + c.name,
      body: 'Welcome to ' + c.name + ' of the ' + dv.name + '.\n\nThe board\'s objective for this season: ' + s.board.objective.label +
        ' (we expect to finish around ' + ordinal(s.board.objective.expected) + ').\n\nBank balance: ' + fmtMoney(c.balance) +
        '. Wage bill: ' + fmtMoney(wages) + ' a week. Stadium capacity: ' + c.capacity.toLocaleString('en-GB') + '.\n\nGood luck, ' + s.manager.name + '.',
      actions: [{ label: 'View squad', cmd: 'go', args: { route: 'squad' } }, { label: 'Set tactics', cmd: 'go', args: { route: 'tactics' } }]
    });
  }
  // which clubs would hire you, given your reputation
  function eligibleClubs(s, rating) {
    const pr = prestigeMap(s);
    return s.clubs.map((c, i) => i)
      .filter(i => s.clubs[i].division >= 0 && i !== s.userClub && pr[i] <= rating + 12)
      .sort((a, b) => pr[b] - pr[a]);
  }

  /* ---- selection, formations & XI pickers ----------------------------- */
  function isFit(p) { return (!p.injuredFor || p.injuredFor <= 0) && (!p.suspendedFor || p.suspendedFor <= 0) && p.fit > 0; }
  function availablePlayers(club) { return club.players.filter(isFit); }
  function scoreFn(mode) {
    if (mode === 'ai') return p => p.skill * (0.55 + 0.45 * p.fit / 100);   // effective strength today: AI clubs rotate tired legs
    if (mode === 'fresh') return p => p.fit + p.skill * 0.05;     // freshest legs first
    if (mode === 'mix') return p => p.skill * 0.6 + p.fit * 0.4;  // blend quality + freshness
    return p => p.skill + p.fit * 0.03;                            // best (quality first)
  }
  function bestXI(club, opts) {
    opts = opts || {};
    const formation = FORMATIONS[opts.formation] ? opts.formation : (FORMATIONS[club.formation] && !club.isUser ? club.formation : '442');
    const roles = FORMATIONS[formation];
    const score = scoreFn(opts.mode || (club.isUser ? null : 'ai'));
    let a = availablePlayers(club);
    if (a.length < 11) a = club.players.slice();                   // field something even if depleted
    const byPos = { G: [], D: [], M: [], A: [] };
    a.forEach(p => byPos[p.pos].push(p));
    Object.keys(byPos).forEach(k => byPos[k].sort((x, y) => score(y) - score(x)));
    const used = new Set(), xi = new Array(roles.length).fill(null);
    roles.forEach((r, i) => { const c = byPos[r].find(p => !used.has(p.id)); if (c) { xi[i] = c; used.add(c.id); } });
    roles.forEach((r, i) => {
      if (xi[i]) return;
      const rest = a.filter(p => !used.has(p.id)).sort((x, y) => score(y) * Live.suit(y.pos, r) - score(x) * Live.suit(x.pos, r));
      if (rest[0]) { xi[i] = rest[0]; used.add(rest[0].id); }
    });
    const remaining = a.filter(p => !used.has(p.id)).sort((x, y) => score(y) - score(x));
    const subs = [];
    const gk = remaining.find(p => p.pos === 'G'); if (gk) subs.push(gk);
    remaining.forEach(p => { if (subs.length < 5 && subs.indexOf(p) < 0) subs.push(p); });
    return { xi: xi.filter(Boolean).map(p => p.id), subs: subs.map(p => p.id), formation: formation };
  }
  function defaultSelection(s) {
    const opp = nextOpponent(s);
    const prev = s.selection || {};
    const formation = FORMATIONS[prev.formation] ? prev.formation : '442';
    const t = s.tactics || {};
    if (t.autoPick === false && prev.xi && prev.xi.length) return repairSelection(s, prev, opp);
    const best = bestXI(user(s), { formation: formation, mode: t.pickMode });
    return { xi: best.xi, subs: best.subs, home: opp ? opp.home : true, formation: best.formation };
  }
  // keep a hand-picked team, replacing anyone who is now unavailable (injured, banned or gone)
  function repairSelection(s, sel, opp) {
    const club = user(s), roles = FORMATIONS[sel.formation] || FORMATIONS['442'];
    const byId = {}; club.players.forEach(p => { byId[p.id] = p; });
    const used = new Set();
    const xi = sel.xi.slice(0, 11).map(id => (byId[id] && isFit(byId[id]) ? id : null));
    xi.forEach(id => { if (id != null) used.add(id); });
    const pool = availablePlayers(club).filter(p => !used.has(p.id));
    for (let i = 0; i < roles.length; i++) {
      if (xi[i] != null) continue;
      const r = roles[i];
      const c = pool.filter(p => !used.has(p.id)).sort((x, y) => y.skill * Live.suit(y.pos, r) - x.skill * Live.suit(x.pos, r))[0];
      if (c) { xi[i] = c.id; used.add(c.id); }
    }
    const subs = (sel.subs || []).filter(id => byId[id] && isFit(byId[id]) && !used.has(id));
    pool.filter(p => !used.has(p.id) && subs.indexOf(p.id) < 0).sort((x, y) => y.skill - x.skill).forEach(p => { if (subs.length < 5) subs.push(p.id); });
    return { xi: xi.filter(id => id != null), subs: subs.slice(0, 5), home: opp ? opp.home : true, formation: sel.formation };
  }
  function nextOpponent(s) {
    const e = s.calendar[s.day];
    if (!e) return null;
    if (e.comp === 'league') {
      const dv = userDiv(s), r = dv.schedule[e.round];
      if (r < 0) return null;
      const fx = dv.fixtures.find(f => f.round === r && (f.home === s.userClub || f.away === s.userClub));
      if (!fx) return null;
      const home = fx.home === s.userClub;
      return { comp: 'league', compName: dv.name, club: s.clubs[home ? fx.away : fx.home], clubIndex: home ? fx.away : fx.home,
        home: home, fixture: fx, division: s.userDivision, date: e.date, matchday: r + 1 };
    }
    const cup = s.cups[e.comp];
    if (!cup || !cup.rounds[e.round]) return null;
    const tie = cup.rounds[e.round].ties.find(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub));
    if (!tie) return null;
    const leg = e.leg || 0;
    const single = isSingleLeg(cup, e.round);
    const host = (!single && leg === 1) ? tie.away : tie.home;   // 2nd leg flips the venue
    const home = host === s.userClub;
    const oppIdx = tie.home === s.userClub ? tie.away : tie.home;
    const legLabel = (cup.twoLeg && !single) ? (leg === 1 ? ' (2nd leg)' : ' (1st leg)') : '';
    const neutral = single && cup.rounds[e.round].name === 'Final' && cup.type !== 'oneoff';
    return { comp: e.comp, compName: cup.name + ' — ' + cup.rounds[e.round].name + legLabel, club: s.clubs[oppIdx], clubIndex: oppIdx,
      home: home, tie: tie, cup: cup, leg: leg, single: single, neutral: neutral, date: e.date, round: e.round };
  }

  /* ---- club overall strength + prestige ------------------------------- */
  function clubOverall(club) {
    const xi = playersByIds(club, bestXI(club).xi);
    if (!xi.length) return 0;
    return Math.round(xi.reduce((a, p) => a + p.skill, 0) / xi.length);
  }
  function difficultyLabel(tier) {
    return ['', 'Title favourites', 'Promotion hopefuls', 'Mid-table', 'Lower half', 'Relegation battle'][tier] || 'Mid-table';
  }
  function prestigeMap(s) {
    const map = {}, ov = {};
    const o = ci => (ov[ci] != null ? ov[ci] : (ov[ci] = clubOverall(s.clubs[ci])));
    s.divisions.forEach(dv => {
      const ranked = dv.members.slice().sort((a, b) => o(b) - o(a));
      ranked.forEach((ci, k) => { map[ci] = Math.round(LEVEL_PRESTIGE[dv.level] + (1 - k / Math.max(1, ranked.length - 1)) * 18); });
    });
    s.clubs.forEach((c, i) => { if (map[i] == null) map[i] = 50; });
    return map;
  }
  function clubPrestige(s, ci) { return prestigeMap(s)[ci]; }
  function quickPrestige(s, ci) { const lv = levelOf(s, ci); return LEVEL_PRESTIGE[lv] + (5 - (s.clubs[ci].tier || 3)) * 4.5; }

  /* ---- team strength --------------------------------------------------- */
  function unit(players, posList) {
    const ps = players.filter(p => posList.indexOf(p.pos) >= 0);
    if (!ps.length) return 0;
    let t = 0; ps.forEach(p => { t += p.skill * (0.55 + 0.45 * p.fit / 100); });
    return t / ps.length;
  }
  function ratingsFor(players, morale) {
    return {
      defence: Math.round(unit(players, ['G', 'D'])),
      midfield: Math.round(unit(players, ['M'])),
      attack: Math.round(unit(players, ['A'])),
      morale: Math.round(morale == null ? 45 : morale)
    };
  }
  function playersByIds(club, ids) {
    const map = {}; club.players.forEach(p => { map[p.id] = p; });
    return ids.map(id => map[id]).filter(Boolean);
  }
  function userRatings(s) { return ratingsFor(playersByIds(user(s), s.selection.xi), moraleOf(s, user(s))); }
  function clubRatings(club, morale) { return ratingsFor(playersByIds(club, bestXI(club).xi), morale); }
  function moraleOf(s, club) {
    const recent = (club.form || []).slice(-5);
    if (!recent.length) return 45;
    let pts = 0; recent.forEach(r => { pts += r === 'W' ? 3 : r === 'D' ? 1 : 0; });
    return clamp(30 + (pts / (recent.length * 3)) * 55, 22, 92);
  }
  function clubForm(s, ci) { return (s.clubs[ci].form || []).slice(-5); }

  /* ---- quick Poisson match (the rest of the world) --------------------- */
  function poisson(rng, lambda) {
    const Lm = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > Lm);
    return k - 1;
  }
  const SCORE_W = { A: 1.0, M: 0.55, D: 0.18, G: 0.02 }, ASSIST_W = { A: 0.65, M: 1, D: 0.3, G: 0.03 };
  function weightedPick(rng, players, wmap, exclude) {
    const list = players.filter(p => p !== exclude);
    if (!list.length) return null;
    const weights = list.map(p => Math.max(0.01, p.skill) * (wmap[p.pos] || 0.1));
    let tot = weights.reduce((a, b) => a + b, 0), r = rng() * tot;
    for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function simulateMatch(rng, homeRat, awayRat, homePlayers, awayPlayers, neutral) {
    const hOff = homeRat.attack * 0.7 + homeRat.midfield * 0.3 + homeRat.morale * 0.08;
    const aOff = awayRat.attack * 0.7 + awayRat.midfield * 0.3 + awayRat.morale * 0.08;
    const hDef = homeRat.defence * 0.7 + homeRat.midfield * 0.3 + 6;
    const aDef = awayRat.defence * 0.7 + awayRat.midfield * 0.3 + 6;
    const lambdaH = clamp(1.35 * Math.pow(hOff / aDef, 1.55) * (neutral ? 1.05 : 1.18), 0.12, 5.5);
    const lambdaA = clamp(1.35 * Math.pow(aOff / hDef, 1.55) * (neutral ? 1.05 : 0.92), 0.12, 5.5);
    const hg = clamp(poisson(rng, lambdaH), 0, 9), ag = clamp(poisson(rng, lambdaA), 0, 9);
    const events = [], used = {};
    function addGoals(n, side, players) {
      for (let i = 0; i < n; i++) {
        let minute; do { minute = Data.ri(rng, 1, 90); } while (used[minute]);
        used[minute] = true;
        const ps = players.length ? players : [{ id: -1, pos: 'A', skill: 1, forename: 'Unknown', surname: '' }];
        const scorer = weightedPick(rng, ps, SCORE_W);
        const assister = rng() < 0.78 ? weightedPick(rng, ps, ASSIST_W, scorer) : null;
        events.push({ minute: minute, side: side, scorerId: scorer.id, scorer: fullName(scorer), pos: scorer.pos,
          assistId: assister ? assister.id : null, assister: assister ? fullName(assister) : null });
      }
    }
    addGoals(hg, 'home', homePlayers);
    addGoals(ag, 'away', awayPlayers);
    events.sort((a, b) => a.minute - b.minute);
    return { hg: hg, ag: ag, events: events };
  }
  // match ratings for a quick-simulated XI
  function quickRatings(rng, players, gf, ga, events, side) {
    const out = {};
    if (!players.length) return out;
    const avg = players.reduce((a, p) => a + p.skill, 0) / players.length;
    players.forEach(p => {
      let r = 6.4 + (gf > ga ? 0.35 : gf < ga ? -0.25 : 0.05) + (p.skill - avg) / 50 + (rng() - 0.5) * 1.0;
      events.forEach(e => { if (e.side === side) { if (e.scorerId === p.id) r += 1.0; if (e.assistId === p.id) r += 0.5; } });
      if (ga === 0 && (p.pos === 'G' || p.pos === 'D')) r += p.pos === 'G' ? 0.45 : 0.3;
      if (ga >= 3 && (p.pos === 'G' || p.pos === 'D')) r -= 0.4;
      out[p.id] = clamp(Math.round(r * 10) / 10, 4, 10);
    });
    return out;
  }

  /* ---- crediting players & tables ------------------------------------- */
  function creditPlayers(club, ids, ratings) {
    const set = new Set(ids);
    club.players.forEach(p => {
      if (!set.has(p.id)) return;
      p.appsSeason++; p.appsTotal++;
      const r = ratings && ratings[p.id];
      if (r != null) { p.rSum = (p.rSum || 0) + r; p.rN = (p.rN || 0) + 1; (p.form = p.form || []).push(r); if (p.form.length > 5) p.form.shift(); }
    });
  }
  function creditGoals(homeClub, awayClub, events, league) {
    events.forEach(e => {
      const club = e.side === 'home' ? homeClub : awayClub;
      const sc = club.players.find(pl => pl.id === e.scorerId);
      if (sc) { sc.goalsSeason++; sc.goalsTotal++; if (league) sc.lgGoals = (sc.lgGoals || 0) + 1; }
      if (e.assistId != null) {
        const as = club.players.find(pl => pl.id === e.assistId);
        if (as) { as.assistsSeason = (as.assistsSeason || 0) + 1; as.assistsTotal = (as.assistsTotal || 0) + 1; if (league) as.lgAssists = (as.lgAssists || 0) + 1; }
      }
    });
  }
  function pushForm(club, gf, ga) {
    (club.form = club.form || []).push(gf > ga ? 'W' : gf === ga ? 'D' : 'L');
    if (club.form.length > 6) club.form.shift();
  }
  function applyResult(s, divIdx, fx, hg, ag, events, extra) {
    const dv = s.divisions[divIdx];
    const homeClub = s.clubs[fx.home], awayClub = s.clubs[fx.away];
    const th = dv.table[homeClub.name], ta = dv.table[awayClub.name];
    th.P++; ta.P++; th.F += hg; th.A += ag; ta.F += ag; ta.A += hg;
    if (hg > ag) { th.W++; ta.L++; th.Pts += 3; }
    else if (hg < ag) { ta.W++; th.L++; ta.Pts += 3; }
    else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
    pushForm(homeClub, hg, ag); pushForm(awayClub, ag, hg);
    creditGoals(homeClub, awayClub, events, true);
    if (extra && extra.apps) {
      creditPlayers(homeClub, extra.apps.home || [], extra.ratings);
      creditPlayers(awayClub, extra.apps.away || [], extra.ratings);
    }
    dv.results.push({ round: fx.round, home: fx.home, away: fx.away, hg: hg, ag: ag,
      scorers: events.map(e => ({ n: e.scorer, s: e.side, m: e.minute })) });
  }
  function creditApps(club, ids) { creditPlayers(club, ids, null); }

  /* ---- simulate a league fixture / day -------------------------------- */
  function xiFor(s, ci, cache) {
    if (cache && cache[ci]) return cache[ci];
    const club = s.clubs[ci], b = bestXI(club), ps = playersByIds(club, b.xi);
    const v = { ids: b.xi, players: ps, rat: ratingsFor(ps, moraleOf(s, club)) };
    if (cache) cache[ci] = v;
    return v;
  }
  function simulateFixture(s, d, f, cache) {
    const rng = Data.makeRng((s.seed ^ (s.season * 7727) ^ (f.round * 40503) ^ (d * 7919) ^ (f.home * 131 + f.away * 977)) >>> 0);
    const h = xiFor(s, f.home, cache), a = xiFor(s, f.away, cache);
    const sim = simulateMatch(rng, h.rat, a.rat, h.players, a.players);
    const ratings = Object.assign(quickRatings(rng, h.players, sim.hg, sim.ag, sim.events, 'home'),
      quickRatings(rng, a.players, sim.ag, sim.hg, sim.events, 'away'));
    return { hg: sim.hg, ag: sim.ag, events: sim.events, hx: h.ids, ax: a.ids, ratings: ratings };
  }
  function simulateLeagueDay(s, unitIdx, skipFixture, played) {
    const cache = {};
    played = played || {};
    s.divisions.forEach((dv, d) => {
      const r = dv.schedule[unitIdx];
      if (r == null || r < 0) return;
      dv.fixtures.forEach(f => {
        if (f.round !== r || f === skipFixture) return;
        if (skipFixture && f.home === skipFixture.home && f.away === skipFixture.away && f.round === skipFixture.round && d === s.userDivision) return;
        const sim = simulateFixture(s, d, f, cache);
        applyResult(s, d, f, sim.hg, sim.ag, sim.events, { apps: { home: sim.hx, away: sim.ax }, ratings: sim.ratings });
        played[f.home] = sim.hx; played[f.away] = sim.ax;
        if (dv.level === 1 && Math.abs(sim.hg - sim.ag) >= 5) {
          news(s, s.clubs[f.home].name + ' ' + sim.hg + '-' + sim.ag + ' ' + s.clubs[f.away].name + ' — a thrashing in the ' + dv.name + '!', 'result');
        }
      });
    });
    return played;
  }
  // the other games of the user's league round, simulated exactly as they will be committed (live score ticker)
  function previewOtherResults(s) {
    const e = s.calendar[s.day];
    if (!e || e.comp !== 'league') return [];
    const d = s.userDivision, dv = userDiv(s), r = dv.schedule[e.round];
    if (r < 0) return [];
    const cache = {}, out = [];
    dv.fixtures.forEach(f => {
      if (f.round !== r || f.home === s.userClub || f.away === s.userClub) return;
      const sim = simulateFixture(s, d, f, cache);
      out.push({ home: s.clubs[f.home].name, away: s.clubs[f.away].name, homeIdx: f.home, awayIdx: f.away,
        goals: sim.events.map(ev => ({ minute: ev.minute, side: ev.side, scorer: ev.scorer })), hg: sim.hg, ag: sim.ag });
    });
    return out;
  }

  /* ===================================================================== *
   * THE USER'S MATCH
   * ===================================================================== */
  function aiMentality(s, aiClub, userClub, aiHome) {
    const a = clubOverall(aiClub), u = clubOverall(userClub);
    let m = 0;
    if (a - u >= 6) m = 1; else if (u - a >= 6) m = -1;
    if (!aiHome && m === 0 && u > a) m = -1;
    return m;
  }
  function kitsFor(uc, oc) {
    const hex = c => parseInt(c.slice(1), 16);
    const dist = (a, b) => { const x = hex(a), y = hex(b); return Math.abs((x >> 16) - (y >> 16)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255)); };
    let ok = oc.kit || ['#ffffff', '#111111'];
    if (dist(uc.kit[0], ok[0]) < 140) ok = [ok[1], ok[0]];
    if (dist(uc.kit[0], ok[0]) < 140) ok = ['#f2f2f2', '#222222'];
    return { user: uc.kit, opp: ok };
  }
  function liveSetup(s) {
    const opp = nextOpponent(s);
    if (!opp) return null;
    const uc = user(s);
    if (availablePlayers(uc).length < 8) return { forfeit: forfeitMatch(s, opp) };
    if (!s.selection || s.selection.xi.length !== 11) s.selection = defaultSelection(s);
    const uXI = playersByIds(uc, s.selection.xi), uBench = playersByIds(uc, s.selection.subs);
    const oc = opp.club, ob = bestXI(oc);
    const kits = kitsFor(uc, oc);
    const t = s.tactics;
    const userCfg = { name: uc.name, kit: kits.user, players: uXI, bench: uBench, formation: s.selection.formation,
      mentality: t.mentality, pressing: t.pressing, tempo: t.tempo, morale: moraleOf(s, uc), isUser: true,
      autoSubs: t.autoSubs !== false, boost: DIFFICULTY[s.difficulty].boost };
    const oppCfg = { name: oc.name, kit: kits.opp, players: playersByIds(oc, ob.xi), bench: playersByIds(oc, ob.subs),
      formation: ob.formation, mentality: aiMentality(s, oc, uc, !opp.home), morale: moraleOf(s, oc) };
    let tie = null;
    if (opp.comp !== 'league') {
      if (opp.single) tie = { single: true };
      else if (opp.leg === 1) tie = { firstLeg: { hg: opp.tie.l1h || 0, ag: opp.tie.l1a || 0 } };
    }
    const seed = (s.seed ^ (s.season * 131071) ^ (s.day * 2654435761)) >>> 0;
    return {
      meta: { comp: opp.comp, compName: opp.compName, fixture: opp.fixture, tie: opp.tie, leg: opp.leg || 0, home: opp.home,
        oppIndex: opp.clubIndex, neutral: !!opp.neutral, date: opp.date, seed: seed },
      cfg: { seed: seed, home: opp.home ? userCfg : oppCfg, away: opp.home ? oppCfg : userCfg, neutral: !!opp.neutral, tie: tie }
    };
  }
  function forfeitMatch(s, opp) {
    const uClub = user(s), h = opp.home;
    return {
      comp: opp.comp, compName: opp.compName, isCup: opp.comp !== 'league',
      fixture: opp.fixture, tie: opp.tie, cupId: opp.comp, leg: opp.leg || 0,
      home: h, opponent: opp.club, userSide: h ? 'home' : 'away', forfeit: true,
      homeName: h ? uClub.name : opp.club.name, awayName: h ? opp.club.name : uClub.name,
      userPlayers: [], oppPlayers: [], hg: h ? 0 : 3, ag: h ? 3 : 0,
      events: [], cards: [], injuries: [], subs: [], ratings: {}, apps: { home: [], away: [] },
      stats: { possHome: 50, possAway: 50, shotsHome: 0, shotsAway: 0, sotHome: 0, sotAway: 0, cornersHome: 0, cornersAway: 0, foulsHome: 0, foulsAway: 0, xgHome: 0, xgAway: 0 }
    };
  }
  function createLiveMatch(s, opts) {
    const st = liveSetup(s);
    if (!st) return null;
    if (st.forfeit) return st;
    const live = Live.create(Object.assign({}, st.cfg, opts || {}));
    return { live: live, meta: st.meta, cfg: st.cfg };
  }
  function liveToMatch(s, meta, live) {
    const r = live.result(), uc = user(s), oc = s.clubs[meta.oppIndex];
    const home = meta.home;
    const st = live.state();
    return {
      comp: meta.comp, compName: meta.compName, isCup: meta.comp !== 'league',
      fixture: meta.fixture, tie: meta.tie, cupId: meta.comp, leg: meta.leg,
      home: home, opponent: oc, userSide: home ? 'home' : 'away',
      homeName: home ? uc.name : oc.name, awayName: home ? oc.name : uc.name,
      userPlayers: playersByIds(uc, s.selection.xi), oppPlayers: playersByIds(oc, (home ? st.away : st.home).lineup.filter(x => x.cameOn === 0).map(x => x.id)),
      hg: r.hg, ag: r.ag, events: r.events, cards: r.cards, injuries: r.injuries, subs: r.subs, stats: r.stats,
      ratings: r.ratings, apps: r.apps, potm: r.potm, shootout: r.shootout, extraTime: r.extraTime, feed: r.feed
    };
  }
  // play the user's match in one go (quick result / tests)
  function playUserMatch(s) {
    const st = liveSetup(s);
    if (!st) return null;
    if (st.forfeit) return st.forfeit;
    const live = Live.create(Object.assign({}, st.cfg, { autoTalk: true }));
    live.runToEnd();
    return liveToMatch(s, st.meta, live);
  }
  // match preview: the opposition report and the assistant's tactical advice
  function matchPreview(s, samples) {
    const st = liveSetup(s);
    if (!st || st.forfeit) return st ? { forfeit: true } : null;
    const opp = nextOpponent(s), oc = opp.club, oi = opp.clubIndex, uc = user(s);
    const userKey = opp.home ? 'home' : 'away';
    const n = samples || 70;
    const byMentality = [];
    for (let m = -2; m <= 2; m++) {
      const cfg = JSON.parse(JSON.stringify({ seed: st.cfg.seed, neutral: st.cfg.neutral }));
      cfg.home = Object.assign({}, st.cfg.home); cfg.away = Object.assign({}, st.cfg.away);
      cfg[userKey] = Object.assign({}, cfg[userKey], { mentality: m });
      const pr = Live.predict(cfg, n);
      const value = opp.comp === 'league' ? 3 * pr.win + pr.draw : pr.win + pr.draw * 0.5;
      byMentality.push({ mentality: m, label: Live.MENTALITY[m + 2], win: pr.win, draw: pr.draw, loss: pr.loss, value: value });
    }
    const best = byMentality.slice().sort((a, b) => b.value - a.value)[0];
    const current = byMentality[s.tactics.mentality + 2];
    const ob = bestXI(oc), oXI = playersByIds(oc, ob.xi);
    const oRat = ratingsFor(oXI, moraleOf(s, oc)), uRat = userRatings(s);
    const scorers = oc.players.filter(p => p.goalsSeason > 0).sort((a, b) => b.goalsSeason - a.goalsSeason).slice(0, 3);
    const key = oXI.slice().sort((a, b) => b.skill - a.skill).slice(0, 3);
    const tips = [];
    if (oRat.attack > uRat.defence + 5) tips.push('Their attack (' + oRat.attack + ') is sharper than our defence (' + uRat.defence + ') — a deeper line could help.');
    if (uRat.attack > oRat.defence + 5) tips.push('Our forwards should get change out of their back line (' + oRat.defence + ').');
    if (oRat.midfield > uRat.midfield + 5) tips.push('They will probably dominate midfield; consider an extra man in the middle (4-5-1 / 3-5-2).');
    if (uRat.midfield > oRat.midfield + 5) tips.push('We should control midfield — high pressing could squeeze them.');
    const tired = playersByIds(uc, s.selection.xi).filter(p => p.fit < 70);
    if (tired.length >= 2) tips.push(tired.length + ' of our starters are short of fitness — "Pick Fresh XI" might be wise.');
    if (!tips.length) tips.push('An even contest on paper. Small margins will decide it.');
    const dv = oc.division >= 0 ? s.divisions[oc.division] : null;
    return {
      opponent: oc.name, oppIndex: oi, home: opp.home, neutral: !!opp.neutral, comp: opp.compName, compId: opp.comp, date: opp.date,
      oppForm: clubForm(s, oi), userForm: clubForm(s, s.userClub),
      oppPos: dv ? leaguePosition(s, oc.name, oc.division) : null, oppDivision: dv ? dv.name : 'Europe',
      userPos: leaguePosition(s, uc.name), oppFormation: ob.formation, oppManager: oc.manager,
      oppRatings: oRat, userRatings: uRat,
      oppScorers: scorers.map(p => ({ id: p.id, name: fullName(p), goals: p.goalsSeason })),
      oppKey: key.map(p => ({ id: p.id, name: fullName(p), pos: p.pos, skill: p.skill })),
      byMentality: byMentality, recommended: best, current: current, tips: tips,
      attendance: attendance(s, opp.home ? s.userClub : oi, opp.home ? oi : s.userClub, opp.comp === 'league' ? 'league' : (s.cups[opp.comp] && s.cups[opp.comp].type.indexOf('euro') === 0 ? 'euro' : 'cup')),
      h2h: historyVs(s, oc.name)
    };
  }

  /* ---- commit the user's match and resolve the rest of the matchday ---- */
  function commitUserResult(s, match) {
    const e = s.calendar[s.day];
    const played = {};
    const uc = user(s), oc = match.opponent, oi = s.clubs.indexOf(oc);
    const uHome = match.home;
    const homeIdx = uHome ? s.userClub : oi, awayIdx = uHome ? oi : s.userClub;
    const apps = match.apps && (match.apps.home.length || match.apps.away.length) ? match.apps
      : (match.forfeit ? { home: [], away: [] } : { home: uHome ? s.selection.xi : bestXI(oc).xi, away: uHome ? bestXI(oc).xi : s.selection.xi });
    const ug = uHome ? match.hg : match.ag, og = uHome ? match.ag : match.hg;
    let posNow = null;

    if (match.comp === 'league') {
      applyResult(s, s.userDivision, match.fixture, match.hg, match.ag, match.events, { apps: apps, ratings: match.ratings || {} });
      simulateLeagueDay(s, e.round, match.fixture, played);
      posNow = leaguePosition(s, uc.name);
      const posTarget = 25 + 60 * (1 - (posNow - 1) / (userDiv(s).members.length - 1));
      const target = posTarget + (ug > og ? 8 : ug === og ? 0 : -8);
      s.managerRating = Math.round(clamp(s.managerRating * 0.7 + clamp(target, 5, 99) * 0.3, 1, 99));
      if (uHome && !match.forfeit) gateReceipts(s, s.userClub, oi, 'league', 1);
      s.lastResult = { comp: match.compName, homeName: match.homeName, awayName: match.awayName, hg: match.hg, ag: match.ag,
        scorers: match.events.map(ev => ({ side: ev.side, name: ev.scorer, minute: ev.minute })) };
      s.posHistory.push({ md: s.divisions[s.userDivision].table[uc.name].P, pos: posNow });
      boardAfterLeague(s, ug, og, posNow);
    } else {
      const cup = s.cups[match.comp], tie = match.tie, leg = match.leg || 0;
      const hc = s.clubs[homeIdx], ac = s.clubs[awayIdx];
      creditGoals(hc, ac, match.events, false);
      creditPlayers(hc, apps.home, match.ratings); creditPlayers(ac, apps.away, match.ratings);
      const cupPlayed = playCupMatchday(s, match.comp, e.round, leg,
        { tie: tie, hg: match.hg, ag: match.ag, events: match.events, homeName: match.homeName, awayName: match.awayName, shootout: match.shootout });
      Object.keys(cupPlayed).forEach(ci => { played[ci] = cupPlayed[ci]; });
      const decided = tie.winner != null;
      if (decided) {
        if (tie.winner === s.userClub) {
          s.managerRating = Math.round(clamp(s.managerRating + 2, 1, 99));
          s.board.confidence = clamp(s.board.confidence + 1.5, 0, 100);
          prizeMoney(s, cup, e.round);
          if (cup.winner === s.userClub) {
            notify(s, 'Congratulations — you have won the ' + cup.name + '!', { cat: 'competition', from: 'The Chairman', subject: cup.name + ' winners!' });
            s.board.confidence = clamp(s.board.confidence + 12, 0, 100);
            s.reputation = clamp(s.reputation + (cup.type.indexOf('euro') === 0 ? 8 : 3), 0, 100);
          }
        } else {
          const byIdx = tie.home === s.userClub ? tie.away : tie.home;
          notify(s, 'Knocked out of the ' + cup.name + ' by ' + s.clubs[byIdx].name + '.', { cat: 'competition', from: 'Assistant Manager' });
          if (levelOf(s, byIdx) > levelOf(s, s.userClub)) s.board.confidence = clamp(s.board.confidence - 4, 0, 100);
        }
      }
      if (!match.forfeit) {
        const kind = cup.type.indexOf('euro') === 0 ? 'euro' : 'cup';
        gateReceipts(s, homeIdx, awayIdx, kind, uHome ? (kind === 'euro' ? 1 : 0.55) : (kind === 'euro' ? 0 : 0.45));
      }
      const agg = (decided && !isSingleLeg(cup, e.round)) ? (leg === 1 ? tie.aggA + '-' + tie.aggH : tie.aggH + '-' + tie.aggA) : null;   // home side of THIS leg first
      s.lastResult = { comp: match.compName, homeName: match.homeName, awayName: match.awayName, hg: match.hg, ag: match.ag,
        winnerName: decided ? s.clubs[tie.winner].name : null, pens: !!tie.pens, agg: agg,
        scorers: match.events.map(ev => ({ side: ev.side, name: ev.scorer, minute: ev.minute })) };
    }
    played[homeIdx] = apps.home.length ? apps.home : (played[homeIdx] || []);
    played[awayIdx] = apps.away.length ? apps.away : (played[awayIdx] || []);

    // records
    const rec = ug > og ? 'W' : ug === og ? 'D' : 'L';
    [s.record, s.seasonRecord].forEach(r => { r.P++; r[rec]++; });
    afterUserMatch(s, match, ug, og, homeIdx, awayIdx);
    if (match.potm && match.potm.id != null) {
      const potmClub = match.potm.side === 'home' ? s.clubs[homeIdx] : s.clubs[awayIdx];
      const pp = potmClub.players.find(p => p.id === match.potm.id); if (pp) pp.potm = (pp.potm || 0) + 1;
    }
    s.history.push({ season: s.season, comp: match.comp, compName: match.compName, oppName: oc.name, home: match.home, hg: match.hg, ag: match.ag,
      pens: !!(match.tie && match.tie.pens), date: e.date });
    if (match.comp === 'league') pushRoundup(s, leagueRoundupTitle(s, e), leagueRoundup(s, e.round));
    else pushRoundup(s, match.compName, cupRoundup(s, s.cups[match.comp], e.round));

    applyMatchdayEffects(s, played, { [homeIdx]: true, [awayIdx]: true });
    // injuries & bookings from the live match (after the fitness pass so they aren't served the same day)
    (match.injuries || []).forEach(iv => {
      const club = iv.side === 'home' ? s.clubs[homeIdx] : s.clubs[awayIdx];
      const p = club.players.find(pl => pl.id === iv.id);
      if (p) { p.injuredFor = Math.max(p.injuredFor || 0, iv.games || 2); p.injured = true;
        if (club.isUser) notify(s, 'Injury: ' + fullName(p) + ' is out for ' + p.injuredFor + ' match(es).', { cat: 'medical', from: 'Club Doctor' }); }
    });
    processBookings(s, match, homeIdx, awayIdx);
    advanceDay(s);
    return s.lastResult;
  }
  // yellow-card accumulation (5 -> ban) and red cards -> suspension, for both clubs in the match
  function processBookings(s, match, homeIdx, awayIdx) {
    if (!match.cards || !match.userSide) return;
    if (homeIdx == null) { const oi = s.clubs.indexOf(match.opponent); homeIdx = match.home ? s.userClub : oi; awayIdx = match.home ? oi : s.userClub; }
    match.cards.filter(c => c.id != null).forEach(c => {
      const club = c.side === 'home' ? s.clubs[homeIdx] : s.clubs[awayIdx];
      const p = club && club.players.find(pl => pl.id === c.id); if (!p) return;
      if (c.color === 'R') {
        p.suspendedFor = (p.suspendedFor || 0) + (c.second ? 1 : 2);
        if (club.isUser) notify(s, fullName(p) + ' sent off — banned for the next ' + (c.second ? 'match' : '2 matches') + '.', { cat: 'medical', from: 'Assistant Manager', subject: 'Suspension: ' + fullName(p) });
      } else {
        p.yellows = (p.yellows || 0) + 1;
        if (p.yellows >= 5) {
          p.yellows -= 5; p.suspendedFor = (p.suspendedFor || 0) + 1;
          if (club.isUser) notify(s, fullName(p) + ' reaches 5 bookings — banned for the next match.', { cat: 'medical', from: 'Assistant Manager', subject: 'Suspension: ' + fullName(p) });
        }
      }
    });
  }

  /* ---- advance the calendar one day; roll the season at the end -------- */
  function advanceDay(s) {
    const e = s.calendar[s.day];
    if (e && e.comp === 'league') weeklyTick(s, e.round);
    s.day++;
    expireOffers(s);
    if (s.day >= s.calendar.length) { endSeason(s); return; }
    const ne = s.calendar[s.day];
    if (ne.comp === 'league' && ne.round > 0 && ne.round % 5 === 0) refreshMarket(s);
    s.selection = defaultSelection(s);
  }

  /* ---- skip matchdays the user isn't involved in, then return his match  */
  function prepareNextUserMatch(s) {
    s.roundup = [];                 // collect everything simulated before the user's next game
    let guard = 0;
    while (guard++ < 2000 && !matchdayHasUserMatch(s)) autoSimMatchday(s);
    s.selection = defaultSelection(s);
    return nextOpponent(s);
  }
  function matchdayHasUserMatch(s) {
    const e = s.calendar[s.day];
    if (!e) return false;
    if (e.comp === 'league') {
      const dv = userDiv(s), r = dv.schedule[e.round];
      return r >= 0 && dv.fixtures.some(f => f.round === r && (f.home === s.userClub || f.away === s.userClub));
    }
    const cup = s.cups[e.comp];
    if (!cup || !cup.rounds[e.round]) return false;
    return cup.rounds[e.round].ties.some(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub));
  }
  function autoSimMatchday(s) {
    const e = s.calendar[s.day];
    let played = {};
    if (e.comp === 'league') {
      played = simulateLeagueDay(s, e.round, null, {});
      pushRoundup(s, leagueRoundupTitle(s, e), leagueRoundup(s, e.round));
    } else {
      played = playCupMatchday(s, e.comp, e.round, e.leg || 0, null);
      const cup = s.cups[e.comp];
      if (cup && cup.rounds[e.round]) pushRoundup(s, cup.name + ' — ' + cup.rounds[e.round].name + legSuffix(cup, e), cupRoundup(s, cup, e.round));
    }
    applyMatchdayEffects(s, played);
    advanceDay(s);
  }
  function legSuffix(cup, e) { return cup.twoLeg && !isSingleLeg(cup, e.round) ? (e.leg ? ' (2nd leg)' : ' (1st leg)') : ''; }

  /* ---- per-matchday fitness & injuries (only clubs that played) -------- */
  function applyMatchdayEffects(s, playedMap, liveClubs) {
    const rng = Data.makeRng((s.seed ^ (s.season * 7919) ^ (s.day * 1299721)) >>> 0);
    liveClubs = liveClubs || {};
    s.clubs.forEach((c, ci) => {
      const ids = playedMap[ci];
      if (ids) {
        const start = new Set(ids);
        c.players.forEach(p => {
          if (p.injuredFor > 0) { p.injuredFor--; p.injured = p.injuredFor > 0; }
          if (p.suspendedFor > 0) p.suspendedFor--;
          if (start.has(p.id)) {
            p.fit = clamp(p.fit - Data.ri(rng, 5, 11), 10, 100);
            if (!liveClubs[ci] && rng() < 0.022) {                 // the live engine produces its own injuries
              p.injuredFor = Data.ri(rng, 1, 6); p.injured = true;
              if (c.isUser) notify(s, 'Injury: ' + fullName(p) + ' is out for ' + p.injuredFor + ' match(es).', { cat: 'medical', from: 'Club Doctor' });
            }
          } else p.fit = clamp(p.fit + Data.ri(rng, 9, 16), 10, 100);
        });
      } else {
        // bans are served in matches the club plays, so only injuries heal on a day off
        c.players.forEach(p => { if (p.injuredFor > 0) { p.injuredFor--; p.injured = p.injuredFor > 0; } p.fit = clamp(p.fit + Data.ri(rng, 6, 12), 10, 100); });
      }
    });
  }

  /* ===================================================================== *
   * CUPS
   * ===================================================================== */
  function hashId(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) | 0; return h >>> 0; }
  function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function cupRoundName(entering, idx) {
    if (entering === 2) return 'Final';
    if (entering <= 4) return 'Semi-finals';
    if (entering <= 8) return 'Quarter-finals';
    if (entering === 16) return 'Round of 16';
    if (entering === 32) return 'Round of 32';
    if (entering === 64) return 'Round of 64';
    return 'Round ' + (idx + 1);
  }
  function buildCupRound(cup, clubIdxs, rng, natOf) {
    const list = shuffle(clubIdxs.slice(), rng), ties = [];
    // European draws keep clubs from the same nation apart until the quarter-finals
    if (natOf && cup.nation === 'EUR' && list.length > 8) {
      for (let i = 0; i + 1 < list.length; i += 2) {
        if (natOf(list[i]) !== natOf(list[i + 1])) continue;
        for (let j = i + 2; j < list.length; j++) {
          const partnerOfJ = list[j % 2 ? j - 1 : j + 1];
          if (natOf(list[j]) !== natOf(list[i]) && natOf(list[i + 1]) !== natOf(partnerOfJ)) { const t = list[i + 1]; list[i + 1] = list[j]; list[j] = t; break; }
        }
      }
    }
    for (let i = 0; i < list.length; i += 2) {
      if (i + 1 < list.length) ties.push({ home: list[i], away: list[i + 1], winner: null, pens: false });
      else ties.push({ home: list[i], away: -1, winner: list[i], pens: false }); // bye (never with power-of-two draws)
    }
    cup.rounds.push({ name: cupRoundName(list.length, cup.rounds.length), ties: ties });
  }
  function initCup(def, participants, rng, natOf) {
    const cup = { id: def.id, name: def.name, type: def.type, nation: def.nation || null, twoLeg: !!def.twoLeg,
      participants: participants.slice(), rounds: [], winner: null, scorers: {},
      totalRounds: Math.max(1, Math.ceil(Math.log2(participants.length))) };
    buildCupRound(cup, participants, rng, natOf);
    return cup;
  }
  function tallyCupScorers(cup, events, homeName, awayName) {
    if (!events) return;
    cup.scorers = cup.scorers || {};
    events.forEach(e => {
      const club = e.side === 'home' ? homeName : awayName, key = e.scorer + '|' + club;
      if (!cup.scorers[key]) cup.scorers[key] = { name: e.scorer, club: club, goals: 0, id: e.scorerId };
      cup.scorers[key].goals++;
    });
  }
  function cupUnits(cup) {
    const u = [];
    for (let r = 0; r < cup.totalRounds; r++) {
      const finalRound = r === cup.totalRounds - 1;
      if (cup.twoLeg && !finalRound) { u.push({ round: r, leg: 0 }); u.push({ round: r, leg: 1 }); }
      else u.push({ round: r, leg: 0 });
    }
    return u;
  }
  function isSingleLeg(cup, round) { return !cup.twoLeg || round === cup.totalRounds - 1; }
  function recordLeg(tie, leg, single, hg, ag) {
    if (single) { tie.hg = hg; tie.ag = ag; }
    else if (leg === 0) { tie.l1h = hg; tie.l1a = ag; }
    else { tie.l2h = hg; tie.l2a = ag; }
  }
  function pensWinner(s, tie) {
    if (tie.forcedPens != null) { tie.pens = true; return tie.forcedPens; }
    const hr = clubRatings(s.clubs[tie.home]), ar = clubRatings(s.clubs[tie.away]);
    const hs = hr.attack + hr.midfield + hr.defence + 1, as = ar.attack + ar.midfield + ar.defence + 1;
    const rng = Data.makeRng((s.seed ^ s.day ^ (tie.home * 73) ^ (tie.away * 19)) >>> 0);
    tie.pens = true;
    return rng() < hs / (hs + as) ? tie.home : tie.away;
  }
  function finalizeTie(s, tie, single) {
    if (tie.away === -1) { tie.winner = tie.home; return; }
    if (single) {
      if (tie.hg > tie.ag) tie.winner = tie.home;
      else if (tie.ag > tie.hg) tie.winner = tie.away;
      else tie.winner = pensWinner(s, tie);
    } else {
      const aggH = (tie.l1h || 0) + (tie.l2a || 0), aggA = (tie.l1a || 0) + (tie.l2h || 0);
      tie.aggH = aggH; tie.aggA = aggA;
      if (aggH > aggA) tie.winner = tie.home;
      else if (aggA > aggH) tie.winner = tie.away;
      else if ((tie.l2a || 0) > (tie.l1a || 0)) tie.winner = tie.home;   // away-goals rule
      else if ((tie.l1a || 0) > (tie.l2a || 0)) tie.winner = tie.away;
      else tie.winner = pensWinner(s, tie);
    }
  }
  function simulateCupLeg(s, cup, tie, leg, single, rng, cache, neutral) {
    if (tie.away === -1) { tie.winner = tie.home; return; }
    const host = (!single && leg === 1) ? tie.away : tie.home;
    const visitor = (!single && leg === 1) ? tie.home : tie.away;
    const h = xiFor(s, host, cache), a = xiFor(s, visitor, cache);
    const sim = simulateMatch(rng, h.rat, a.rat, h.players, a.players, neutral);
    recordLeg(tie, leg, single, sim.hg, sim.ag);
    tallyCupScorers(cup, sim.events, s.clubs[host].name, s.clubs[visitor].name);
    creditGoals(s.clubs[host], s.clubs[visitor], sim.events, false);
    const ratings = Object.assign(quickRatings(rng, h.players, sim.hg, sim.ag, sim.events, 'home'), quickRatings(rng, a.players, sim.ag, sim.hg, sim.events, 'away'));
    creditPlayers(s.clubs[host], h.ids, ratings); creditPlayers(s.clubs[visitor], a.ids, ratings);
  }
  // play one cup matchday (a leg). `userInfo` = {tie,hg,ag,...} for the user's own tie, else null.
  function playCupMatchday(s, comp, round, leg, userInfo) {
    const cup = s.cups[comp], played = {};
    if (!cup) return played;
    const rd = cup.rounds[round];
    if (!rd) return played;
    const single = isSingleLeg(cup, round);
    const neutral = single && rd.name === 'Final' && cup.type !== 'oneoff';
    const cache = {};
    rd.ties.forEach(t => {
      if (t.away === -1) { t.winner = t.home; return; }
      if (userInfo && t === userInfo.tie) {
        recordLeg(t, leg, single, userInfo.hg, userInfo.ag);
        tallyCupScorers(cup, userInfo.events, userInfo.homeName, userInfo.awayName);
        if (userInfo.shootout) {
          const host = (!single && leg === 1) ? t.away : t.home, vis = (!single && leg === 1) ? t.home : t.away;
          t.forcedPens = userInfo.shootout.winner === 'home' ? host : vis;
          t.shootout = userInfo.shootout.home + '-' + userInfo.shootout.away;
        }
      } else {
        const rng = Data.makeRng((s.seed ^ (s.season * 5417) ^ hashId(comp) ^ (round * 999331) ^ (leg * 7) ^ (t.home * 131 + (t.away + 2) * 977)) >>> 0);
        simulateCupLeg(s, cup, t, leg, single, rng, cache, neutral);
      }
      const host = (!single && leg === 1) ? t.away : t.home, vis = (!single && leg === 1) ? t.home : t.away;
      played[host] = xiFor(s, host, cache).ids; played[vis] = xiFor(s, vis, cache).ids;
    });
    if (single || leg === 1) {
      rd.ties.forEach(t => { if (t.away !== -1 && t.winner == null) finalizeTie(s, t, single); });
      if (cupRoundComplete(cup, round)) advanceCupAfterRound(s, cup, round);
    }
    return played;
  }
  function cupRoundComplete(cup, r) { return cup.rounds[r].ties.every(t => t.winner != null); }
  function advanceCupAfterRound(s, cup, r) {
    if (cup.winner != null) return;
    const winners = cup.rounds[r].ties.map(t => t.winner);
    if (winners.length === 1) {
      cup.winner = winners[0];
      news(s, s.clubs[cup.winner].name + ' win the ' + cup.name + '!', 'trophy');
    } else {
      buildCupRound(cup, winners, Data.makeRng((s.seed ^ (s.season * 61) ^ hashId(cup.id) ^ (r * 7919)) >>> 0), ci => nationOfClub(s, ci));
      const nr = cup.rounds[cup.rounds.length - 1];
      const t = nr.ties.find(x => x.home === s.userClub || x.away === s.userClub);
      if (t) {
        const opp = s.clubs[t.home === s.userClub ? t.away : t.home];
        mail(s, { cat: 'competition', from: cup.name, subject: cup.name + ' draw: ' + nr.name,
          body: 'You have been drawn ' + (t.home === s.userClub ? 'at home to ' : 'away to ') + opp.name + ' in the ' + nr.name + ' of the ' + cup.name + '.',
          actions: [{ label: 'View draw', cmd: 'go', args: { route: 'cup/' + cup.id } }] });
      }
    }
  }
  function prizeMoney(s, cup, round) {
    const base = cup.type === 'euroC' ? 250000 : cup.type === 'euroU' ? 110000 : cup.type === 'oneoff' ? 50000 : 12000;
    const amt = Math.round(base * Math.pow(cup.type === 'domestic' ? 1.6 : 1.5, round) / 1000) * 1000;
    user(s).balance += amt; book(s, 'prize', amt);
    return amt;
  }

  // European places for each nation. Season 1: by squad strength.
  function topDivisionOf(s, nat) { return s.divisions.findIndex(dv => dv.nation === nat && dv.tier === 1); }
  function seedEuroQual(s) {
    const champions = [], uefa = [];
    Data.NATION_ORDER.forEach(nat => {
      const rules = Data.NATION_RULES[nat], d = topDivisionOf(s, nat);
      const ov = {}; s.divisions[d].members.forEach(ci => { ov[ci] = clubOverall(s.clubs[ci]); });
      const ranked = s.divisions[d].members.slice().sort((a, b) => ov[b] - ov[a]);
      champions.push.apply(champions, ranked.slice(0, rules.cl));
      uefa.push.apply(uefa, ranked.slice(rules.cl, rules.cl + rules.uefa + rules.cups.length));
    });
    return { champions: champions, uefa: uefa };
  }
  // later seasons: league positions decide, domestic cup winners take UEFA Cup places
  function computeEuroQual(s, snaps) {
    const idxByName = clubIndexMap(s);
    const champions = [], uefa = [];
    Data.NATION_ORDER.forEach(nat => {
      const rules = Data.NATION_RULES[nat], d = topDivisionOf(s, nat);
      const table = snaps[d].map(r => idxByName[r.name]);
      const cl = table.slice(0, rules.cl); champions.push.apply(champions, cl);
      const clSet = new Set(cl), mine = [];
      rules.cups.forEach(cd => { const w = s.cups[cd.id] && s.cups[cd.id].winner; if (w != null && !clSet.has(w) && mine.indexOf(w) < 0) mine.push(w); });
      const want = rules.uefa + rules.cups.length;
      for (let k = rules.cl; k < table.length && mine.length < want; k++) if (mine.indexOf(table[k]) < 0) mine.push(table[k]);
      uefa.push.apply(uefa, mine.slice(0, want));
    });
    return { champions: champions, uefa: uefa };
  }
  function isPow2(n) { return n >= 2 && (n & (n - 1)) === 0; }
  function startSeasonCups(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 2246822519)) >>> 0);
    s.cups = {};
    const strength = {};
    const str = ci => (strength[ci] != null ? strength[ci] : (strength[ci] = clubOverall(s.clubs[ci])));
    const userNat = nationOfClub(s, s.userClub);
    const domestic = nat => {
      const natClubs = s.clubs.map((c, i) => i).filter(i => s.clubs[i].division >= 0 && s.divisions[s.clubs[i].division].nation === nat)
        .sort((a, b) => str(b) - str(a));
      Data.NATION_RULES[nat].cups.forEach(cd => {
        const parts = natClubs.slice(0, cd.size);
        if (nat === userNat && parts.indexOf(s.userClub) < 0) parts[parts.length - 1] = s.userClub;   // the manager's club always plays
        if (isPow2(parts.length)) s.cups[cd.id] = initCup({ id: cd.id, name: cd.name, type: 'domestic', nation: nat }, parts, rng);
      });
    };
    predictTables(s, str);
    domestic('ENG');
    // European cups: 64-team knockouts, topped up from the rest of Europe
    const rest = s.clubs.map((c, i) => i).filter(i => s.clubs[i].division < 0)
      .map(i => ({ i: i, v: str(i) + rng() * 8 })).sort((a, b) => b.v - a.v).map(x => x.i);
    let rcur = 0;
    const clIn = new Set();
    [['champions', 'Champions League', 'euroC'], ['uefa', 'UEFA Cup', 'euroU']].forEach(([id, name, type]) => {
      const q = ((id === 'champions' ? s.euroQual.champions : s.euroQual.uefa) || []).filter((ci, k, arr) => arr.indexOf(ci) === k && !clIn.has(ci));
      const parts = q.slice(0, 64);
      if (id === 'champions') parts.forEach(ci => clIn.add(ci));
      while (parts.length < 64 && rcur < rest.length) parts.push(rest[rcur++]);
      if (isPow2(parts.length)) s.cups[id] = initCup({ id: id, name: name, type: type, twoLeg: true, nation: 'EUR' }, parts, rng, ci => nationOfClub(s, ci));
    });
    Data.NATION_ORDER.slice(1).forEach(domestic);
    // one-off curtain-raisers from last season's winners (season 2 onwards)
    const pv = s.prev;
    if (pv) {
      if (pv.premChamp != null && pv.faCup != null) {
        const opp = pv.faCup !== pv.premChamp ? pv.faCup : pv.premRunnerUp;
        if (opp != null && opp !== pv.premChamp) s.cups.shield = initCup({ id: 'shield', name: 'Community Shield', type: 'oneoff', nation: 'ENG' }, [pv.premChamp, opp], rng);
      }
      if (pv.ucl != null && pv.uefa != null && pv.ucl !== pv.uefa) {
        s.cups.supercup = initCup({ id: 'supercup', name: 'European Super Cup', type: 'oneoff', nation: 'EUR' }, [pv.ucl, pv.uefa], rng);
      }
    }
    s.calendar = buildCalendar(s);
  }

  /* ---- the dated calendar ---------------------------------------------- */
  function seasonStartDate(year) {
    const d = new Date(Date.UTC(year, 7, 17));
    while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function buildCalendar(s) {
    const entries = [], L = totalRounds(s);
    for (let r = 0; r < L; r++) entries.push({ key: r * 1000, comp: 'league', round: r, leg: 0 });
    Object.keys(s.cups).forEach((id, ci) => {
      const cup = s.cups[id], units = cupUnits(cup), lastRound = cup.totalRounds - 1;
      if (cup.type === 'oneoff') {
        entries.push({ key: -2000 + ci, comp: id, round: 0, leg: 0 });
      } else if (cup.twoLeg) {
        units.forEach((u, k) => {
          if (u.round === lastRound) entries.push({ key: (L + (id === 'uefa' ? 1 : 2)) * 1000, comp: id, round: u.round, leg: 0 });
          else { const b = Math.min(L - 2, Math.floor((k + 1) * (L - 2) / units.length)); entries.push({ key: b * 1000 + 50 + ci * 8 + k, comp: id, round: u.round, leg: u.leg }); }
        });
      } else {
        units.forEach((u, k) => {
          const b = Math.min(L - 1, Math.floor((k + 1) * L / (units.length + 1)));
          entries.push({ key: b * 1000 + 50 + ci * 8 + k, comp: id, round: u.round, leg: u.leg });
        });
      }
    });
    entries.sort((a, b) => a.key - b.key);
    // dates: league on Saturdays, cup ties midweek (Tue/Wed/Thu), curtain-raisers the week before
    const start = seasonStartDate(s.year);
    const used = {};
    const PREF = { euroC: 4, euroU: 5, domestic: 3, oneoff: 0 };
    return entries.map(e => {
      const week = e.key < 0 ? -1 : Math.floor(e.key / 1000);
      let off = 0;
      if (e.comp !== 'league') {
        const cup = s.cups[e.comp];
        const nat = cup.nation === 'EUR' || cup.nation === 'ENG' ? 'X' : cup.nation;
        if (cup.type === 'oneoff') off = cup.id === 'shield' ? 1 : 5;   // Sunday Shield, Thursday Super Cup, before the opening Saturday
        else {
          const k = week + '|' + nat; used[k] = used[k] || [];
          const order = [PREF[cup.type] || 3, 3, 4, 5, 2];
          off = order.find(o => used[k].indexOf(o) < 0); if (off == null) off = PREF[cup.type] || 3;
          used[k].push(off);
        }
      }
      const d = new Date(start.getTime()); d.setUTCDate(d.getUTCDate() + week * 7 + off);
      return { comp: e.comp, round: e.round, leg: e.leg, date: isoDate(d) };
    }).map((e, i) => ({ e: e, i: i })).sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.i - b.i)).map(x => x.e);
  }
  function formatDate(iso, long) {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00Z');
    return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + (long === false ? '' : ' ' + d.getUTCFullYear());
  }
  function currentDate(s) {
    const e = s.calendar[s.day] || s.calendar[s.calendar.length - 1];
    return e ? e.date : isoDate(seasonStartDate(s.year));
  }
  function seasonLabel(s, season) {
    const y = s.year - (s.season - (season || s.season));
    return y + '/' + String((y + 1) % 100).padStart(2, '0');
  }
  function dayIndexMap(s) {
    const m = {};
    s.calendar.forEach((e, i) => { m[e.comp + '|' + e.round + '|' + (e.leg || 0)] = i; });
    return m;
  }

  /* ---- read-only views for the UI ------------------------------------- */
  function cupsSummary(s) {
    return Object.keys(s.cups).map(id => {
      const c = s.cups[id];
      const live = c.rounds[c.rounds.length - 1];
      return { id: id, name: c.name, nation: c.nation, type: c.type, winner: c.winner != null ? s.clubs[c.winner].name : null,
        stage: c.winner != null ? 'Won' : (live ? live.name : '-'),
        inIt: c.winner == null && live ? live.ties.some(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub)) : false,
        userIn: c.participants.indexOf(s.userClub) >= 0 };
    });
  }
  function honours(s) { return s.honours; }
  function honoursTally(s) {
    const t = {};
    const add = (club, comp) => {
      if (!club || club === '—') return;
      if (!t[club]) t[club] = { club: club, total: 0 };
      t[club][comp] = (t[club][comp] || 0) + 1; t[club].total++;
    };
    (s.honours || []).forEach(h => {
      h.divisions.forEach(d => add(d.first, d.name + ' title'));
      h.cups.forEach(c => add(c.winner, c.name));
    });
    return Object.keys(t).map(k => t[k]).sort((a, b) => b.total - a.total || a.club.localeCompare(b.club));
  }

  /* ---- standings / scorers / results ----------------------------------- */
  function standings(s, divIdx) {
    if (divIdx == null) divIdx = s.userDivision;
    const dv = s.divisions[divIdx];
    return dv.members.map(i => {
      const c = s.clubs[i], row = dv.table[c.name];
      return Object.assign({ name: c.name, idx: i, isUser: c.isUser, GD: row.F - row.A, form: (c.form || []).slice(-5),
        pred: dv.prediction ? dv.prediction.indexOf(i) + 1 : null }, row);
    }).sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.F - a.F || a.name.localeCompare(b.name));
  }
  function leaguePosition(s, name, divIdx) {
    if (divIdx == null) divIdx = s.userDivision;
    return standings(s, divIdx).findIndex(r => r.name === name) + 1;
  }
  // table zones (promotion, Europe, relegation) for colouring
  function tableZones(s, d) {
    const dv = s.divisions[d], n = dv.members.length, rules = Data.NATION_RULES[dv.nation];
    const tiers = s.divisions.filter(x => x.nation === dv.nation).length;
    const z = {};
    if (dv.tier > 1 && rules.swap) for (let i = 1; i <= rules.swap; i++) z[i] = 'promo';
    if (dv.tier === 1) {
      for (let i = 1; i <= rules.cl; i++) z[i] = 'cl';
      for (let i = rules.cl + 1; i <= rules.cl + rules.uefa; i++) z[i] = 'uefa';
    }
    if (dv.tier < tiers && rules.swap) for (let i = n - rules.swap + 1; i <= n; i++) z[i] = 'releg';
    return z;
  }
  function topScorers(s, n, divIdx) {
    const list = divIdx == null ? s.clubs : s.divisions[divIdx].members.map(i => s.clubs[i]);
    const all = [];
    list.forEach(c => c.players.forEach(p => {
      const g = p.lgGoals || 0;
      if (g > 0) all.push({ id: p.id, name: fullName(p), club: c.name, goals: g, apps: p.appsSeason });
    }));
    all.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    return all.slice(0, n || 12);
  }
  function leagueLeaders(s, d, n) {
    const dv = s.divisions[d], rows = [];
    const playedMax = Math.max(1, ...dv.members.map(i => dv.table[s.clubs[i].name].P));
    dv.members.forEach(ci => s.clubs[ci].players.forEach(p => rows.push({ p: p, club: s.clubs[ci].name, ci: ci })));
    const mk = (r, v) => ({ id: r.p.id, name: fullName(r.p), club: r.club, clubIdx: r.ci, pos: r.p.pos, value: v, apps: r.p.appsSeason });
    const scorers = rows.filter(r => r.p.lgGoals > 0).sort((a, b) => b.p.lgGoals - a.p.lgGoals).slice(0, n || 15).map(r => mk(r, r.p.lgGoals));
    const assists = rows.filter(r => r.p.lgAssists > 0).sort((a, b) => b.p.lgAssists - a.p.lgAssists).slice(0, n || 15).map(r => mk(r, r.p.lgAssists));
    const minN = Math.max(2, Math.floor(playedMax * 0.4));
    const ratings = rows.filter(r => r.p.rN >= minN).sort((a, b) => b.p.rSum / b.p.rN - a.p.rSum / a.p.rN).slice(0, n || 15)
      .map(r => mk(r, Math.round(r.p.rSum / r.p.rN * 100) / 100));
    const potm = rows.filter(r => r.p.potm > 0).sort((a, b) => b.p.potm - a.p.potm).slice(0, n || 15).map(r => mk(r, r.p.potm));
    // team stats
    const teams = standings(s, d).map(r => ({ name: r.name, idx: r.idx, F: r.F, A: r.A, P: r.P,
      gpg: r.P ? Math.round(r.F / r.P * 100) / 100 : 0, cpg: r.P ? Math.round(r.A / r.P * 100) / 100 : 0, form: r.form }));
    return { scorers: scorers, assists: assists, ratings: ratings, potm: potm, teams: teams };
  }
  function topScorersForCup(s, cupId, n) {
    const cup = s.cups[cupId]; if (!cup || !cup.scorers) return [];
    return Object.keys(cup.scorers).map(k => cup.scorers[k]).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, n || 16);
  }
  function lastRoundResults(s, divIdx) {
    if (divIdx == null) divIdx = s.userDivision;
    const dv = s.divisions[divIdx];
    if (!dv.results.length) return { round: null, games: [] };
    const round = Math.max.apply(null, dv.results.map(r => r.round));
    return roundResults(s, divIdx, round);
  }
  function roundResults(s, divIdx, round) {
    const dv = s.divisions[divIdx];
    const games = dv.results.filter(r => r.round === round).map(r => ({
      home: s.clubs[r.home].name, away: s.clubs[r.away].name, homeIdx: r.home, awayIdx: r.away, hg: r.hg, ag: r.ag, scorers: r.scorers
    }));
    const fixtures = games.length ? [] : dv.fixtures.filter(f => f.round === round).map(f => ({ home: s.clubs[f.home].name, away: s.clubs[f.away].name, homeIdx: f.home, awayIdx: f.away }));
    return { round: round, games: games, fixtures: fixtures, total: divisionRounds(s, divIdx) };
  }
  // every fixture of a club this season: league + cups, dated, with results where played
  function clubFixtures(s, ci) {
    const out = [], dmap = dayIndexMap(s), c = s.clubs[ci];
    if (c.division >= 0) {
      const dv = s.divisions[c.division];
      dv.fixtures.forEach(f => {
        if (f.home !== ci && f.away !== ci) return;
        const u = dv.schedule.indexOf(f.round), day = dmap['league|' + u + '|0'];
        const res = dv.results.find(r => r.round === f.round && r.home === f.home && r.away === f.away);
        const home = f.home === ci, opp = home ? f.away : f.home;
        out.push({ day: day, date: s.calendar[day] && s.calendar[day].date, comp: 'league', compName: dv.name, short: 'League',
          home: home, opp: opp, oppName: s.clubs[opp].name, played: !!res, gf: res ? (home ? res.hg : res.ag) : null, ga: res ? (home ? res.ag : res.hg) : null,
          scorers: res ? res.scorers.filter(x => x.s === (home ? 'home' : 'away')).map(x => x.n + ' ' + x.m + "'") : [] });
      });
    }
    Object.keys(s.cups).forEach(id => {
      const cup = s.cups[id];
      cup.rounds.forEach((rd, ri) => rd.ties.forEach(t => {
        if (t.home !== ci && t.away !== ci) return;
        if (t.away === -1) return;
        const single = isSingleLeg(cup, ri), legs = single ? [0] : [0, 1];
        legs.forEach(leg => {
          const day = dmap[id + '|' + ri + '|' + leg];
          const host = (!single && leg === 1) ? t.away : t.home;
          const home = host === ci, opp = t.home === ci ? t.away : t.home;
          let hg = null, ag = null;
          if (single) { hg = t.hg; ag = t.ag; } else if (leg === 0) { hg = t.l1h; ag = t.l1a; } else { hg = t.l2h; ag = t.l2a; }
          const played = hg != null;
          out.push({ day: day, date: s.calendar[day] && s.calendar[day].date, comp: id, compName: cup.name + ' — ' + rd.name + (single ? '' : (leg ? ' (2nd leg)' : ' (1st leg)')),
            short: cup.name, home: home, opp: opp, oppName: s.clubs[opp].name, played: played,
            gf: played ? (home ? hg : ag) : null, ga: played ? (home ? ag : hg) : null, scorers: [],
            note: played && (single || leg === 1) && t.winner != null ? (t.winner === ci ? 'through' : 'out') + (t.pens ? ' (pens' + (t.shootout ? ' ' + t.shootout : '') + ')' : '') : '' });
        });
      }));
    });
    return out.filter(x => x.day != null).sort((a, b) => a.day - b.day);
  }

  /* ===================================================================== *
   * TRANSFERS
   * ===================================================================== */
  function marketList(s, filters) {
    filters = filters || {};
    const allow = filters.pos || { G: true, D: true, M: true, A: true };
    const q = filters.search ? filters.search.toLowerCase() : null;
    const ok = (p, euro) => (!q || fullName(p).toLowerCase().indexOf(q) >= 0)
      && allow[p.pos] && (filters.includeEuropean !== false || !euro)
      && (filters.minSkill == null || p.skill >= filters.minSkill) && (filters.maxAge == null || p.age <= filters.maxAge)
      && (filters.minAge == null || p.age >= filters.minAge) && (!filters.nat || p.nat === filters.nat);
    const out = [];
    s.transferPool.forEach(p => {
      if (filters.league != null && filters.league !== 'free') return;
      if (ok(p, !BRITISH.has(p.nat))) out.push(Object.assign({}, p, { price: p.value, source: 'pool', fromClub: p.club || FREE_AGENT, european: !BRITISH.has(p.nat), listed: true }));
    });
    if (filters.league !== 'free') s.clubs.forEach((c, ci) => {
      if (ci === s.userClub) return;
      if (filters.league != null && filters.league !== '' && String(c.division) !== String(filters.league)) return;
      c.players.forEach(p => {
        const listed = !!p.transferListed;
        if (!listed && !filters.includeUnlisted) return;
        if (!ok(p, c.foreign)) return;
        out.push(Object.assign({}, p, { price: listed ? p.value : roundFee(p.value * UNLISTED_PREMIUM), source: ci, fromClub: c.name, european: c.foreign, listed: listed }));
      });
    });
    const res = filters.maxPrice != null ? out.filter(p => p.price <= filters.maxPrice) : out;
    if (filters.sort === 'price') res.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'age') res.sort((a, b) => a.age - b.age || b.skill - a.skill);
    else if (filters.sort === 'pot') res.sort((a, b) => b.pot - a.pot || b.skill - a.skill);
    else if (filters.sortBySkill !== false) res.sort((a, b) => b.skill - a.skill);
    else res.sort((a, b) => a.surname.localeCompare(b.surname));
    return res;
  }
  function addToUser(s, p, fee, fromName) {
    p.club = user(s).name; p.transferListed = false;
    p.contract = Math.max(p.contract || 0, p.age >= 31 ? 1 : 3);
    p.wage = Data.wageFor(p, userDiv(s).level);
    p.suspendedFor = 0; p.yellows = 0;
    user(s).players.push(p);
    s.transferLog.unshift({ season: s.season, date: currentDate(s), dir: 'in', name: fullName(p), id: p.id, from: fromName, fee: fee });
    if (fee > 0) news(s, user(s).name + ' sign ' + fullName(p) + ' from ' + fromName + ' for ' + fmtMoney(fee) + '.', 'transfer');
    if (fee >= 1000000) unlock(s, 'big-spender');
  }
  function bid(s, playerId) {
    if (user(s).players.length >= MAX_SQUAD) return { ok: false, msg: 'Squad is full (max ' + MAX_SQUAD + '). Sell a player first.' };
    const i = s.transferPool.findIndex(p => p.id === playerId);
    if (i >= 0) {
      const p = s.transferPool[i];
      if (user(s).balance < p.value) return { ok: false, msg: 'Insufficient funds for ' + fullName(p) + '.' };
      user(s).balance -= p.value; book(s, 'purchases', p.value);
      s.transferPool.splice(i, 1); addToUser(s, p, p.value, p.club || FREE_AGENT);
      notify(s, 'Signed ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for ' + fmtMoney(p.value) + '.', { cat: 'transfer', from: 'Chief Scout' });
      return { ok: true, player: p, fee: p.value };
    }
    for (let ci = 0; ci < s.clubs.length; ci++) {
      if (ci === s.userClub) continue;
      const c = s.clubs[ci], pi = c.players.findIndex(p => p.id === playerId);
      if (pi < 0) continue;
      const p = c.players[pi], fee = p.transferListed ? p.value : roundFee(p.value * UNLISTED_PREMIUM);
      if (c.players.length <= 14) return { ok: false, msg: c.name + " won't sell — their squad is too thin." };
      if (user(s).balance < fee) return { ok: false, msg: 'Need ' + fmtMoney(fee) + ' to prise ' + fullName(p) + ' from ' + c.name + '.' };
      user(s).balance -= fee; book(s, 'purchases', fee); c.balance += fee;
      c.players.splice(pi, 1); addToUser(s, p, fee, c.name);
      notify(s, 'Signed ' + fullName(p) + ' from ' + c.name + ' for ' + fmtMoney(fee) + '.', { cat: 'transfer', from: 'Chief Scout' });
      return { ok: true, player: p, fee: fee };
    }
    return { ok: false, msg: 'Player no longer available.' };
  }
  function signUnlisted(s, pos) {
    if (user(s).players.length >= MAX_SQUAD) return { ok: false, msg: 'Squad is full (max ' + MAX_SQUAD + ').' };
    const rng = Data.makeRng((Date.now() ^ s.transferPool.length ^ (s.day * 977)) >>> 0);
    const p = Data.generatePlayer(rng, { pos: pos || Data.pick(rng, Data.POSITIONS), centre: Data.ri(rng, 35, 62), level: userDiv(s).level });
    const fee = roundFee(p.value * 0.6);
    if (user(s).balance < fee) return { ok: false, msg: 'Insufficient funds.' };
    user(s).balance -= fee; book(s, 'purchases', fee); addToUser(s, p, fee, 'an unknown club');
    notify(s, 'Signed unlisted player ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for ' + fmtMoney(fee) + '.', { cat: 'transfer', from: 'Chief Scout' });
    return { ok: true, player: p };
  }
  function removeFromUser(s, p, reason) {
    const club = user(s), i = club.players.indexOf(p);
    if (i >= 0) club.players.splice(i, 1);
    s.exPlayers.push(exRecord(s, p, reason));
    if (s.selection) { s.selection.xi = s.selection.xi.filter(id => id !== p.id); s.selection.subs = s.selection.subs.filter(id => id !== p.id); }
  }
  // selling is immediate: the player leaves at once and the fee is banked now
  function sellPlayer(s, playerId) {
    const club = user(s), p = club.players.find(x => x.id === playerId);
    if (!p) return { ok: false, msg: 'Player not in your squad.' };
    if (club.players.length <= MIN_SQUAD) return { ok: false, msg: 'You must keep at least ' + MIN_SQUAD + ' players.' };
    const fee = roundFee(p.value * 0.95);
    removeFromUser(s, p, 'Sold for ' + fmtMoney(fee));
    club.balance += fee; book(s, 'sales', fee);
    // most sales go to a club that can afford him, otherwise to the market
    const buyer = findBuyer(s, p, fee);
    if (buyer != null) { s.clubs[buyer].players.push(p); p.club = s.clubs[buyer].name; s.clubs[buyer].balance -= fee; p.wage = Data.wageFor(p, levelOf(s, buyer)); }
    else { p.club = FREE_AGENT; s.transferPool.push(p); }
    p.transferListed = false;
    s.transferLog.unshift({ season: s.season, date: currentDate(s), dir: 'out', name: fullName(p), id: p.id, to: p.club, fee: fee });
    notify(s, 'Sold ' + fullName(p) + (buyer != null ? ' to ' + p.club : '') + ' for ' + fmtMoney(fee) + '.', { cat: 'transfer', from: 'Chief Executive' });
    return { ok: true, player: p, fee: fee };
  }
  function findBuyer(s, p, fee) {
    const rng = Data.makeRng((s.seed ^ p.id ^ (s.day * 31)) >>> 0);
    const cand = s.clubs.map((c, i) => i).filter(i => i !== s.userClub && s.clubs[i].division >= 0 && s.clubs[i].balance > fee * 1.2 && s.clubs[i].players.length < 24);
    if (!cand.length) return null;
    const fits = cand.filter(i => Math.abs(clubOverall(s.clubs[i]) - p.skill) <= 10);
    const list = fits.length ? fits : cand;
    return list[Math.floor(rng() * list.length)];
  }
  function setTransferListed(s, playerId, listed) {
    const p = user(s).players.find(pl => pl.id === playerId);
    if (p) p.transferListed = !!listed;
  }
  function toggleShortlist(s, playerId) {
    const i = s.shortlist.indexOf(playerId);
    if (i >= 0) s.shortlist.splice(i, 1); else s.shortlist.push(playerId);
    return i < 0;
  }
  // contracts
  function renewalTerms(s, p) {
    const wage = Math.round(Data.wageFor(p, userDiv(s).level) * (1.1 + (p.age <= 23 && p.pot > p.skill + 5 ? 0.15 : 0)) / 10) * 10;
    const years = p.age >= 32 ? 1 : p.age >= 29 ? 2 : 3;
    return { wage: Math.max(wage, p.wage || 0), years: years };
  }
  function renewContract(s, playerId) {
    const p = user(s).players.find(x => x.id === playerId);
    if (!p) return { ok: false, msg: 'Player not in your squad.' };
    const t = renewalTerms(s, p);
    p.wage = t.wage; p.contract = t.years;
    notify(s, fullName(p) + ' signs a new ' + t.years + '-year deal at ' + fmtMoney(t.wage) + ' a week.', { cat: 'transfer', from: 'Chief Executive' });
    return { ok: true, msg: fullName(p) + ' has signed a new ' + t.years + '-year contract (' + fmtMoney(t.wage) + '/wk).' };
  }
  function releasePlayer(s, playerId) {
    const club = user(s), p = club.players.find(x => x.id === playerId);
    if (!p) return { ok: false, msg: 'Player not in your squad.' };
    if (club.players.length <= MIN_SQUAD) return { ok: false, msg: 'You must keep at least ' + MIN_SQUAD + ' players.' };
    const comp = Math.round((p.wage || 0) * 12 * Math.max(0, p.contract || 0));
    if (club.balance < comp) return { ok: false, msg: 'Releasing him would cost ' + fmtMoney(comp) + ' in compensation.' };
    club.balance -= comp; book(s, 'wages', comp);
    removeFromUser(s, p, 'Released');
    p.club = FREE_AGENT; p.contract = 0; s.transferPool.push(p);
    notify(s, fullName(p) + ' released' + (comp ? ' (compensation ' + fmtMoney(comp) + ')' : '') + '.', { cat: 'transfer', from: 'Chief Executive' });
    return { ok: true, msg: fullName(p) + ' has been released.' };
  }

  /* ---- training: lift fitness (and nudge youngsters), once per week ----- */
  function train(s) {
    if (s.trainedRound === s.day && s.trainedSeason === s.season) return { ok: false, msg: 'Your squad has already trained this week.' };
    s.trainedRound = s.day; s.trainedSeason = s.season;
    const rng = Data.makeRng((s.seed ^ s.day ^ (s.season * 5147)) >>> 0);
    let improved = 0;
    user(s).players.forEach(p => {
      p.fit = clamp(p.fit + Data.ri(rng, 5, 12), 10, 100);
      if (p.age <= 23 && rng() < 0.07 && p.skill < 99) { p.skill++; Data.recomputeValue(p, rng); improved++; }
    });
    return { ok: true, improved: improved };
  }

  /* ---- keep the transfer market (and the AI clubs) moving -------------- */
  function refreshMarket(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 333667) ^ (s.day * 99989)) >>> 0);
    s.transferPool = s.transferPool.filter(p => p.club !== FREE_AGENT || rng() > 0.3);
    const add = Data.ri(rng, 10, 18);
    for (let k = 0; k < add; k++) s.transferPool.push(freeAgent(rng));
    if (s.transferPool.length > 220) s.transferPool.splice(0, s.transferPool.length - 220);
    s.transferPool.forEach(p => { if (rng() < 0.4) p.value = Math.round(p.value * (0.9 + rng() * 0.25) / 500) * 500; });
    // AI clubs list a surplus player or two
    s.clubs.forEach((c, ci) => {
      if (ci === s.userClub) return;
      c.players.forEach(p => { if (p.transferListed && rng() < 0.3) p.transferListed = false; });
      if (c.players.length > 19 && rng() < 0.35) {
        const worst = c.players.slice().sort((a, b) => a.skill - b.skill)[Data.ri(rng, 0, 3)];
        if (worst) worst.transferListed = true;
      }
    });
    aiTransfers(s, rng);
  }
  function aiTransfers(s, rng) {
    const deals = Data.ri(rng, 4, 9);
    const leagueClubs = s.clubs.map((c, i) => i).filter(i => s.clubs[i].division >= 0 && i !== s.userClub);
    for (let k = 0; k < deals; k++) {
      const bi = leagueClubs[Math.floor(rng() * leagueClubs.length)], buyer = s.clubs[bi];
      if (buyer.players.length >= 25) continue;
      const avg = clubOverall(buyer), bl = levelOf(s, bi), bn = nationOfClub(s, bi);
      // small clubs shop at home and below; the elite shop all over Europe
      const sellers = leagueClubs.filter(si => si !== bi && levelOf(s, si) >= bl - (bl >= 3 ? 0 : 1) && (bl <= 2 || nationOfClub(s, si) === bn));
      if (!sellers.length) continue;
      const pos = Data.pick(rng, ['D', 'M', 'A', 'M', 'A', 'G']);
      // targets: listed or weaker clubs' players who'd improve the XI
      let best = null, bestFrom = null;
      for (let t = 0; t < 40; t++) {
        const si = sellers[Math.floor(rng() * sellers.length)];
        const sc = s.clubs[si];
        if (sc.players.length <= 17) continue;
        const cand = sc.players.filter(p => p.pos === pos && p.skill >= avg - 1 && p.skill <= avg + 9);
        const p = cand[Math.floor(rng() * cand.length)];
        if (!p) continue;
        const fee = p.transferListed ? p.value : roundFee(p.value * 1.25);
        if (fee > buyer.balance * 0.6) continue;
        if (!best || p.skill > best.skill) { best = p; bestFrom = si; }
      }
      if (!best) continue;
      const from = s.clubs[bestFrom], fee = best.transferListed ? best.value : roundFee(best.value * 1.25);
      from.players.splice(from.players.indexOf(best), 1);
      buyer.players.push(best); best.club = buyer.name; best.transferListed = false;
      buyer.balance -= fee; from.balance += fee;
      best.wage = Data.wageFor(best, levelOf(s, bi)); best.contract = Data.ri(rng, 2, 4);
      if (fee >= 400000 || levelOf(s, bi) === 1 || buyer.division === s.userDivision) {
        news(s, buyer.name + ' sign ' + fullName(best) + ' from ' + from.name + ' for ' + fmtMoney(fee) + '.', 'transfer');
      }
    }
    // thin squads sign free agents
    s.clubs.forEach((c, ci) => {
      if (ci === s.userClub || c.players.length >= 18) return;
      while (c.players.length < 18 && s.transferPool.length) {
        const j = s.transferPool.reduce((bj, p, i, arr) => (p.club === FREE_AGENT && (bj < 0 || p.skill > arr[bj].skill) ? i : bj), -1);
        if (j < 0) break;
        const p = s.transferPool.splice(j, 1)[0];
        p.club = c.name; p.contract = 2; p.wage = Data.wageFor(p, levelOf(s, ci)); c.players.push(p);
      }
    });
  }
  // an AI club bids for one of your players (you decide in the inbox)
  function maybeIncomingBid(s, rng) {
    if (rng() > 0.13) return;
    const club = user(s);
    if (club.players.length <= 14) return;
    const cand = club.players.slice().sort((a, b) => b.value - a.value).slice(0, 8);
    const p = cand[Math.floor(rng() * cand.length)];
    if (!p || s.offers.some(o => o.playerId === p.id && !o.done)) return;
    const myLevel = userDiv(s).level;
    const bidders = s.clubs.map((c, i) => i).filter(i => i !== s.userClub && s.clubs[i].division >= 0 && levelOf(s, i) <= myLevel && s.clubs[i].balance > p.value * 1.1);
    if (!bidders.length) return;
    const bi = bidders[Math.floor(rng() * bidders.length)];
    const amount = Math.round(p.value * (0.95 + rng() * 0.55) / 5000) * 5000;
    const offer = { id: s.offerSeq++, playerId: p.id, club: bi, amount: amount, expires: s.day + 4, done: false };
    s.offers.push(offer);
    mail(s, {
      cat: 'transfer', from: s.clubs[bi].name, important: true,
      subject: 'Bid for ' + fullName(p) + ': ' + fmtMoney(amount),
      body: s.clubs[bi].name + ' have offered ' + fmtMoney(amount) + ' for ' + fullName(p) + ' (' + Data.POS_NAME[p.pos] + ', skill ' + p.skill +
        ', valued at ' + fmtMoney(p.value) + '). The offer stands for a few days.',
      actions: [{ label: 'Accept ' + fmtMoney(amount), cmd: 'acceptBid', args: { offer: offer.id } }, { label: 'Reject', cmd: 'rejectBid', args: { offer: offer.id } },
        { label: 'View player', cmd: 'go', args: { route: 'player/' + p.id } }]
    });
  }
  function expireOffers(s) {
    s.offers.forEach(o => {
      if (!o.done && s.day > o.expires) {
        o.done = true; o.result = 'expired';
        s.inbox.forEach(m => { if (m.actions && m.actions.some(a => a.args && a.args.offer === o.id) && !m.resolved) m.resolved = 'Offer lapsed'; });
      }
    });
    if (s.offers.length > 40) s.offers = s.offers.filter(o => !o.done).concat(s.offers.filter(o => o.done).slice(-10));
  }
  function acceptBid(s, offerId) {
    const o = s.offers.find(x => x.id === offerId);
    if (!o || o.done) return { ok: false, msg: 'That offer is no longer on the table.' };
    const club = user(s), p = club.players.find(x => x.id === o.playerId);
    if (!p) { o.done = true; return { ok: false, msg: 'The player is no longer at the club.' }; }
    if (club.players.length <= MIN_SQUAD) return { ok: false, msg: 'You must keep at least ' + MIN_SQUAD + ' players.' };
    const buyer = s.clubs[o.club];
    removeFromUser(s, p, 'Sold to ' + buyer.name + ' for ' + fmtMoney(o.amount));
    club.balance += o.amount; book(s, 'sales', o.amount); buyer.balance -= o.amount;
    buyer.players.push(p); p.club = buyer.name; p.transferListed = false; p.wage = Data.wageFor(p, levelOf(s, o.club));
    o.done = true; o.result = 'accepted';
    s.transferLog.unshift({ season: s.season, date: currentDate(s), dir: 'out', name: fullName(p), id: p.id, to: buyer.name, fee: o.amount });
    news(s, buyer.name + ' sign ' + fullName(p) + ' from ' + club.name + ' for ' + fmtMoney(o.amount) + '.', 'transfer');
    return { ok: true, msg: fullName(p) + ' joins ' + buyer.name + ' for ' + fmtMoney(o.amount) + '.' };
  }

  /* ===================================================================== *
   * FINANCES
   * ===================================================================== */
  function book(s, key, amount) { if (!s.finance) s.finance = blankFinance(); s.finance.season[key] = (s.finance.season[key] || 0) + amount; }
  function wageBill(s) { return user(s).players.reduce((a, p) => a + (p.wage || 0), 0); }
  function attendance(s, hi, ai, kind) {
    const hc = s.clubs[hi];
    const form = (hc.form || []).slice(-5);
    const fp = form.length ? form.reduce((a, r) => a + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / (form.length * 3) : 0.5;
    const rng = Data.makeRng((s.seed ^ (s.day * 7) ^ hi ^ (ai << 8)) >>> 0);
    let fill = 0.48 + 0.28 * fp + 0.18 * (quickPrestige(s, ai) / 100) + (kind === 'cup' ? 0.08 : kind === 'euro' ? 0.22 : 0) + (rng() - 0.5) * 0.08;
    return Math.round((hc.capacity || 5000) * clamp(fill, 0.3, 1));
  }
  function gateReceipts(s, hi, ai, kind, share) {
    if (!share) return 0;
    const lv = levelOf(s, hi);
    const att = attendance(s, hi, ai, kind);
    const price = (Data.ECON[lv] || Data.ECON[2]).ticket * (kind === 'euro' ? 1.4 : 1);
    const amt = Math.round(att * price * share);
    user(s).balance += amt; book(s, 'gate', amt);
    s.lastGate = { attendance: att, amount: amt };
    if (hi === s.userClub && kind === 'league') { book(s, 'attSum', att); book(s, 'attN', 1); }
    return amt;
  }
  function weeklyTick(s, unitIdx) {
    const rng = Data.makeRng((s.seed ^ (s.season * 10007) ^ (unitIdx * 7919) ^ 0x2545F491) >>> 0);
    const c = user(s), lv = userDiv(s).level;
    const wages = wageBill(s), tv = (Data.ECON[lv] || Data.ECON[2]).tv;
    c.balance += tv - wages; book(s, 'tv', tv); book(s, 'wages', wages);
    // loan interest: ~2% a week, added to the debt
    if (s.debt > 0) {
      const interest = Math.max(1, Math.round(s.debt * 0.02));
      s.debt += interest; book(s, 'interest', interest);
      s.notices.push('Loan interest of ' + fmtMoney(interest) + ' added (debt ' + fmtMoney(s.debt) + ').');
    }
    if (c.balance < 0) {
      if (s.debtSince < 0) s.debtSince = s.day;
      if ((s.day - s.debtSince) >= 6 || c.balance < -Math.max(250000, (Data.ECON[lv] || Data.ECON[2]).loan * 0.3)) forcedSale(s);
      else if (s.day - s.debtSince === 0) mail(s, { cat: 'board', from: 'Chief Executive', important: true, subject: 'The account is overdrawn',
        body: 'We are ' + fmtMoney(-c.balance) + ' overdrawn. Sell players or take a loan, or the board will be forced to sell your most valuable asset.',
        actions: [{ label: 'Finances', cmd: 'go', args: { route: 'finances' } }] });
      s.board.confidence = clamp(s.board.confidence - 0.8, 0, 100);
    } else s.debtSince = -1;
    s.finance.history.push({ season: s.season, day: s.day, date: currentDate(s), balance: c.balance });
    if (c.balance >= 1000000) unlock(s, 'millionaire');
    if (s.finance.history.length > 260) s.finance.history.shift();

    maybeIncomingBid(s, rng);
    if (unitIdx > 0 && unitIdx % 4 === 3) monthlyAwards(s, unitIdx);
    if (unitIdx === Math.round(s.L * 0.68)) contractReminder(s);
    if (unitIdx === 20 || unitIdx === 32) maybeJobOffer(s, rng);
    aiManagerChanges(s, unitIdx, rng);
    boardWarning(s);
  }
  function forcedSale(s) {
    const club = user(s);
    if (club.players.length <= MIN_SQUAD) return;
    const p = club.players.slice().sort((a, b) => b.value - a.value)[0];
    const fee = Math.round(p.value * 0.9);
    removeFromUser(s, p, 'Sold to cover debts');
    club.balance += fee; book(s, 'sales', fee);
    const repay = Math.min(s.debt || 0, fee); s.debt -= repay; club.balance -= repay;
    p.club = FREE_AGENT; p.transferListed = false; s.transferPool.push(p);
    notify(s, 'DEBT: forced to sell ' + fullName(p) + ' for ' + fmtMoney(fee) + ' to service the overdraft.', { cat: 'board', from: 'Chief Executive', important: true });
    s.debtSince = user(s).balance < 0 ? s.day : -1;
  }
  function loanCap(s) { return (Data.ECON[userDiv(s).level] || Data.ECON[2]).loan; }
  function takeLoan(s, amount) {
    amount = Math.max(0, Math.round(amount || 0));
    if (amount <= 0) return { ok: false, msg: 'Enter an amount to borrow.' };
    if ((s.debt || 0) + amount > loanCap(s)) return { ok: false, msg: 'Your loan limit is ' + fmtMoney(loanCap(s)) + '.' };
    s.debt = (s.debt || 0) + amount; user(s).balance += amount;
    return { ok: true, msg: 'Borrowed ' + fmtMoney(amount) + '. Debt is now ' + fmtMoney(s.debt) + '.' };
  }
  function repayLoan(s, amount) {
    amount = Math.max(0, Math.min(Math.round(amount || 0), s.debt || 0, user(s).balance));
    if (amount <= 0) return { ok: false, msg: 'Nothing to repay, or not enough cash.' };
    s.debt -= amount; user(s).balance -= amount;
    return { ok: true, msg: 'Repaid ' + fmtMoney(amount) + '. Debt is now ' + fmtMoney(s.debt) + '.' };
  }
  function financeSummary(s) {
    const f = s.finance || blankFinance(), se = f.season;
    const income = se.gate + se.tv + se.prize + se.sales, spend = se.wages + se.purchases + (se.stadium || 0);
    return { balance: user(s).balance, debt: s.debt || 0, loanCap: loanCap(s), wageBill: wageBill(s), season: se,
      income: income, spend: spend, interest: se.interest, history: f.history.filter(h => h.season === s.season), last: f.last,
      tvWeekly: (Data.ECON[userDiv(s).level] || Data.ECON[2]).tv, capacity: user(s).capacity, lastGate: s.lastGate || null, stadium: stadiumOffer(s) };
  }
  function exRecord(s, p, reason) {
    return { id: p.id, forename: p.forename, surname: p.surname, nat: p.nat, pos: p.pos, skill: p.skill, age: p.age, appsTotal: p.appsTotal, goalsTotal: p.goalsTotal, reason: reason, season: s.season };
  }

  /* ===================================================================== *
   * ACHIEVEMENTS
   * ===================================================================== */
  const ACHIEVEMENTS = [
    ['first-win', 'Off the mark', 'Win your first competitive match.'],
    ['thrashing', 'Thrashing', 'Win a match by five goals or more.'],
    ['hat-trick', 'Hat-trick hero', 'One of your players scores three in a match.'],
    ['winning-run', 'On a roll', 'Win five matches in a row.'],
    ['clean-sheets', 'The wall', 'Keep four clean sheets in a row.'],
    ['unbeaten-10', 'Unbeatable', 'Go ten matches unbeaten.'],
    ['giant-killer', 'Giant killer', 'Knock a club from a higher level out of a cup.'],
    ['european-night', 'European night', 'Win a European tie.'],
    ['cup-winner', 'Silverware', 'Win a cup.'],
    ['promotion', 'Going up!', 'Win promotion.'],
    ['champions', 'Champions', 'Win a league title.'],
    ['european-champion', 'Kings of Europe', 'Win the Champions League.'],
    ['golden-boot', 'Golden boot', 'One of your players finishes as his league\'s top scorer.'],
    ['manager-of-month', 'Manager of the Month', 'Win a Manager of the Month award.'],
    ['top-flight', 'The big time', 'Manage a club in a top division.'],
    ['globetrotter', 'Globetrotter', 'Manage clubs in two different nations.'],
    ['big-spender', 'Big spender', 'Sign a player for £1m or more.'],
    ['millionaire', 'In the black', 'Have £1m in the bank.'],
    ['stadium', 'Bricks and mortar', 'Expand your stadium.'],
    ['centurion', 'Centurion', 'Manage 100 matches.']
  ];
  function unlock(s, id) {
    if (!s.achievements) s.achievements = {};
    if (s.achievements[id]) return false;
    const a = ACHIEVEMENTS.find(x => x[0] === id); if (!a) return false;
    s.achievements[id] = { date: currentDate(s), season: s.season };
    s.notices.push('Achievement unlocked: ' + a[1] + '!');
    mail(s, { cat: 'competition', from: 'SIMSOC', subject: 'Achievement unlocked: ' + a[1], body: a[2], actions: [{ label: 'My career', cmd: 'go', args: { route: 'career' } }] });
    return true;
  }
  function achievementsView(s) {
    return ACHIEVEMENTS.map(a => ({ id: a[0], title: a[1], desc: a[2], got: (s.achievements || {})[a[0]] || null }));
  }
  function afterUserMatch(s, match, ug, og, homeIdx, awayIdx) {
    const st = s.streak || (s.streak = { w: 0, unbeaten: 0, cs: 0 });
    if (match.forfeit) { st.w = 0; st.unbeaten = 0; st.cs = 0; return; }
    st.w = ug > og ? st.w + 1 : 0; st.unbeaten = ug >= og ? st.unbeaten + 1 : 0; st.cs = og === 0 ? st.cs + 1 : 0;
    if (ug > og) unlock(s, 'first-win');
    if (ug - og >= 5) unlock(s, 'thrashing');
    if (st.w >= 5) unlock(s, 'winning-run');
    if (st.unbeaten >= 10) unlock(s, 'unbeaten-10');
    if (st.cs >= 4) unlock(s, 'clean-sheets');
    const counts = {};
    (match.events || []).forEach(e => { if (e.side === match.userSide) counts[e.scorerId] = (counts[e.scorerId] || 0) + 1; });
    if (Object.keys(counts).some(k => counts[k] >= 3)) unlock(s, 'hat-trick');
    if (s.record.P >= 100) unlock(s, 'centurion');
    if (match.comp !== 'league') {
      const cup = s.cups[match.comp], tie = match.tie;
      if (tie && tie.winner === s.userClub) {
        const opp = tie.home === s.userClub ? tie.away : tie.home;
        if (levelOf(s, opp) < levelOf(s, s.userClub)) unlock(s, 'giant-killer');
        if (cup.nation === 'EUR' && cup.type !== 'oneoff') unlock(s, 'european-night');
        if (cup.winner === s.userClub) { unlock(s, 'cup-winner'); if (cup.id === 'champions') unlock(s, 'european-champion'); }
      }
    }
  }

  /* ---- media predictions & the stadium ------------------------------- */
  function predictTables(s, str) {
    s.divisions.forEach(dv => { dv.prediction = dv.members.slice().sort((a, b) => str(b) - str(a)); });
  }
  const SEAT_COST = { 1: 900, 2: 450, 3: 220, 4: 110 }, CAP_MAX = { 1: 85000, 2: 50000, 3: 28000, 4: 14000 };
  function stadiumOffer(s) {
    const c = user(s), lv = userDiv(s).level, max = CAP_MAX[lv] || 30000;
    const add = Math.min(Math.max(500, Math.round(c.capacity * 0.2 / 100) * 100), Math.max(0, max - c.capacity));
    const cost = Math.round(add * (SEAT_COST[lv] || 300) / 1000) * 1000;
    const se = (s.finance && s.finance.season) || {};
    const avg = se.attN ? Math.round(se.attSum / se.attN) : null;
    let reason = '';
    if (s.stadiumSeason === s.season) reason = 'The builders are already on site this season.';
    else if (add <= 0) reason = 'The ground is as big as the board will allow at this level.';
    else if (s.board.confidence < 40) reason = 'The board won\'t back building work while confidence is this low.';
    else if (c.balance < cost) reason = 'You need ' + fmtMoney(cost) + ' in the bank.';
    return { capacity: c.capacity, add: add, cost: cost, max: max, avgAttendance: avg, ok: !reason, reason: reason };
  }
  function expandStadium(s) {
    const o = stadiumOffer(s);
    if (!o.ok) return { ok: false, msg: o.reason };
    const c = user(s);
    c.balance -= o.cost; book(s, 'stadium', o.cost);
    c.capacity += o.add; s.stadiumSeason = s.season;
    unlock(s, 'stadium');
    news(s, c.name + ' expand their ground to ' + c.capacity.toLocaleString('en-GB') + ' seats.', 'club');
    return { ok: true, msg: 'Work is done: capacity is now ' + c.capacity.toLocaleString('en-GB') + '.' };
  }

  /* ===================================================================== *
   * INBOX, NEWS, BOARD, REPUTATION
   * ===================================================================== */
  function mail(s, m) {
    const msg = { id: s.msgSeq++, date: currentDate(s), season: s.season, day: s.day, cat: m.cat || 'assistant', from: m.from || 'Assistant Manager',
      subject: m.subject || (m.body || '').slice(0, 60), body: m.body || '', read: false, important: !!m.important, actions: m.actions || null, resolved: null };
    s.inbox.unshift(msg);
    if (s.inbox.length > 140) {
      const keep = s.inbox.filter((x, i) => i < 100 || (x.actions && !x.resolved));
      s.inbox = keep.slice(0, 140);
    }
    return msg;
  }
  function notify(s, text, opts) {
    s.notices.push(text);
    opts = opts || {};
    mail(s, { cat: opts.cat || 'assistant', from: opts.from, subject: opts.subject || text, body: opts.body || text, important: opts.important, actions: opts.actions });
  }
  function news(s, text, tag) {
    s.news.unshift({ date: currentDate(s), season: s.season, text: text, tag: tag || 'world' });
    if (s.news.length > 80) s.news.length = 80;
  }
  function unreadCount(s) { return s.inbox.filter(m => !m.read).length; }
  function markRead(s, id) { const m = s.inbox.find(x => x.id === id); if (m) m.read = true; }
  function inboxAction(s, msgId, idx) {
    const m = s.inbox.find(x => x.id === msgId);
    if (!m || !m.actions || !m.actions[idx]) return { ok: false, msg: 'Nothing to do.' };
    const a = m.actions[idx], args = a.args || {};
    if (a.cmd === 'go') return { ok: true, route: args.route };
    if (m.resolved) return { ok: false, msg: 'Already dealt with: ' + m.resolved };
    let r = { ok: false, msg: 'Unknown action.' };
    if (a.cmd === 'acceptBid') r = acceptBid(s, args.offer);
    else if (a.cmd === 'rejectBid') { const o = s.offers.find(x => x.id === args.offer); if (o && !o.done) { o.done = true; o.result = 'rejected'; } r = { ok: true, msg: 'Bid rejected.' }; }
    else if (a.cmd === 'renew') r = renewContract(s, args.player);
    else if (a.cmd === 'release') r = releasePlayer(s, args.player);
    else if (a.cmd === 'acceptJob') {
      if (args.expires != null && s.day > args.expires) r = { ok: false, msg: 'The offer has lapsed.' };
      else { const from = user(s).name; chooseClub(s, args.club); r = { ok: true, msg: 'You leave ' + from + ' to take over at ' + user(s).name + '!', route: 'home' };
        news(s, s.manager.name + ' leaves ' + from + ' to become the new manager of ' + user(s).name + '.', 'manager'); }
    } else if (a.cmd === 'declineJob') r = { ok: true, msg: 'You turn the job down.' };
    if (r.ok) m.resolved = a.label;
    if (a.cmd === 'renew' && r.ok) m.resolved = null;          // a reminder can cover several players
    m.read = true;
    return r;
  }
  // board objective for the season, from the squad's rank in the division
  function setObjective(s) {
    const d = s.userDivision, dv = userDiv(s), n = dv.members.length, rules = Data.NATION_RULES[dv.nation];
    const ov = {}; dv.members.forEach(ci => { ov[ci] = clubOverall(s.clubs[ci]); });
    const ranked = dv.members.slice().sort((a, b) => ov[b] - ov[a]);
    const rank = ranked.indexOf(s.userClub) + 1;
    const slack = s.difficulty === 'easy' ? 3 : s.difficulty === 'hard' ? 1 : 2;
    const tiers = s.divisions.filter(x => x.nation === dv.nation).length;
    const canDrop = dv.tier < tiers && rules.swap;
    const target = clamp(Math.min(rank + slack, canDrop ? n - rules.swap : n), 1, n);
    let label;
    if (target <= 1) label = 'Win the ' + dv.name;
    else if (dv.tier > 1 && rules.swap && target <= rules.swap) label = 'Win promotion';
    else if (dv.tier === 1 && target <= rules.cl) label = 'Qualify for the Champions League';
    else if (dv.tier === 1 && target <= rules.cl + rules.uefa) label = 'Qualify for Europe';
    else if (target <= Math.ceil(n / 2)) label = 'Finish in the top half';
    else if (canDrop) label = 'Avoid relegation';
    else label = 'Finish as high as possible';
    s.board.objective = { target: target, expected: rank, label: label, division: d };
  }
  function boardAfterLeague(s, gf, ga, pos) {
    const obj = s.board.objective; if (!obj) return;
    const n = userDiv(s).members.length;
    const expPts = 2.0 - 1.4 * (obj.target - 1) / Math.max(1, n - 1);
    const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
    const patience = DIFFICULTY[s.difficulty].patience;
    let delta = (pts - expPts) * 2.0;
    const dv = userDiv(s), noDrop = dv.tier === s.divisions.filter(x => x.nation === dv.nation).length;
    if (noDrop && delta < 0) delta *= 0.5;                     // nowhere to fall: the board is more forgiving
    const played = userDiv(s).table[user(s).name].P;
    if (played >= 8) { if (pos > obj.target + 4) delta -= 1.2 * patience; else if (pos <= obj.target) delta += 0.6; }
    if (delta < 0) delta *= patience || 0.3;
    s.board.confidence = clamp(s.board.confidence + delta, 0, 100);
    if (s.board.confidence < 10 && played >= 10 && DIFFICULTY[s.difficulty].patience > 0) sackManager(s);
  }
  function boardWarning(s) {
    if (s.sacked) return;
    if (s.board.confidence < 28 && s.day - s.board.warnedDay > 20) {
      s.board.warnedDay = s.day;
      mail(s, { cat: 'board', from: 'The Chairman', important: true, subject: 'The board is concerned',
        body: 'Results are well below expectations (objective: ' + s.board.objective.label + '). The board\'s patience is wearing thin — we need an improvement quickly.' });
    }
  }
  function sackManager(s) {
    if (s.sacked) return;
    s.sacked = true;
    s.reputation = clamp(s.reputation - 8, 5, 100);
    const c = user(s);
    s.career.push({ season: s.season, label: seasonLabel(s), club: c.name, division: userDiv(s).name, position: leaguePosition(s, c.name), trophies: [],
      record: Object.assign({}, s.seasonRecord), objective: s.board.objective ? s.board.objective.label : '', met: false, note: 'Sacked' });
    news(s, c.name + ' sack ' + s.manager.name + ' after a poor run of results.', 'manager');
    mail(s, { cat: 'board', from: 'The Chairman', important: true, subject: 'You have been relieved of your duties',
      body: 'After a run of poor results the board has decided to make a change. Thank you for your efforts.\n\nThe job centre lists the clubs that would consider you.',
      actions: [{ label: 'Job centre', cmd: 'go', args: { route: 'jobs' } }] });
  }
  function maybeJobOffer(s, rng) {
    if (s.sacked) return;
    const pr = prestigeMap(s), mine = pr[s.userClub];
    const cand = Object.keys(pr).map(Number).filter(i => s.clubs[i].division >= 0 && i !== s.userClub && pr[i] > mine + 4 && pr[i] <= s.reputation + 12);
    if (!cand.length || rng() > 0.55) return;
    const ci = cand[Math.floor(rng() * cand.length)], c = s.clubs[ci];
    mail(s, { cat: 'board', from: c.name, important: true, subject: c.name + ' want you as their manager',
      body: c.name + ' (' + s.divisions[c.division].name + ') have approached you about their vacant manager\'s job. Taking it means leaving ' + user(s).name + ' immediately.',
      actions: [{ label: 'Accept the job', cmd: 'acceptJob', args: { club: ci, expires: s.day + 8 } }, { label: 'Decline', cmd: 'declineJob', args: {} },
        { label: 'View club', cmd: 'go', args: { route: 'club/' + ci } }] });
  }
  function aiManagerChanges(s, unitIdx, rng) {
    if (unitIdx < 10 || unitIdx > s.L - 6 || rng() > 0.35) return;
    const d = Math.floor(rng() * s.divisions.length), dv = s.divisions[d];
    const st = standings(s, d), last = st[st.length - 1];
    if (!last || last.isUser) return;
    const c = s.clubs[last.idx];
    if ((c.form || []).slice(-4).filter(r => r === 'L').length < 3) return;
    const old = c.manager;
    const nm = Data.nameFor(rng, dv.nation === 'ENG' ? 'ENG' : dv.nation);
    c.manager = nm.forename + ' ' + nm.surname;
    news(s, c.name + ' (' + dv.name + ') sack ' + old + '; ' + c.manager + ' takes charge.', 'manager');
  }
  function contractReminder(s) {
    const exp = user(s).players.filter(p => (p.contract || 0) <= 1);
    if (!exp.length) return;
    mail(s, { cat: 'transfer', from: 'Chief Executive', important: true, subject: exp.length + ' contract(s) expire this summer',
      body: 'These players are out of contract at the end of the season and will leave on a free unless you renew:\n' +
        exp.map(p => '• ' + fullName(p) + ' (' + p.pos + ', ' + p.age + ', skill ' + p.skill + ') — asks ' + fmtMoney(renewalTerms(s, p).wage) + '/wk').join('\n'),
      actions: exp.slice(0, 6).map(p => ({ label: 'Renew ' + p.surname, cmd: 'renew', args: { player: p.id } })).concat([{ label: 'Squad', cmd: 'go', args: { route: 'squad' } }]) });
  }
  function monthlyAwards(s, unitIdx) {
    const d = s.userDivision, dv = userDiv(s), r = dv.schedule[unitIdx];
    if (r < 3) return;
    const from = r - 3;
    const pts = {};
    dv.results.filter(x => x.round >= from && x.round <= r).forEach(x => {
      pts[x.home] = (pts[x.home] || 0) + (x.hg > x.ag ? 3 : x.hg === x.ag ? 1 : 0);
      pts[x.away] = (pts[x.away] || 0) + (x.ag > x.hg ? 3 : x.hg === x.ag ? 1 : 0);
    });
    const best = Object.keys(pts).map(Number).sort((a, b) => pts[b] - pts[a] || a - b)[0];
    if (best == null) return;
    const label = 'Manager of the Month (' + dv.name + ')';
    if (best === s.userClub) {
      s.awards.push({ season: s.season, date: currentDate(s), award: label });
      unlock(s, 'manager-of-month');
      s.reputation = clamp(s.reputation + 1.5, 0, 100);
      s.board.confidence = clamp(s.board.confidence + 3, 0, 100);
      mail(s, { cat: 'competition', from: 'League Office', important: true, subject: 'You are ' + label + '!',
        body: pts[best] + ' points from the last four games. Congratulations!' });
    }
    news(s, label + ': ' + (best === s.userClub ? s.manager.name : s.clubs[best].manager) + ' of ' + s.clubs[best].name + ' (' + pts[best] + ' pts).', 'award');
  }

  /* ---- head-to-head history ------------------------------------------- */
  function historyVs(s, oppName) { return (s.history || []).filter(h => h.oppName === oppName); }

  /* ---- post-matchday round-up ----------------------------------------- */
  function pushRoundup(s, title, groups) { (s.roundup = s.roundup || []).push({ title: title, groups: groups }); }
  function leagueRoundupTitle(s, e) { return formatDate(e.date) + ' — league matchday'; }
  function leagueRoundup(s, unitIdx) {
    const out = [];
    s.divisions.forEach((dv, d) => {
      const r = dv.schedule[unitIdx];
      if (r < 0) return;
      const games = dv.results.filter(x => x.round === r).map(x => ({ home: s.clubs[x.home].name, away: s.clubs[x.away].name, homeIdx: x.home, awayIdx: x.away, score: x.hg + '-' + x.ag }));
      if (games.length) out.push({ group: dv.name + ' — Matchday ' + (r + 1), nation: dv.nation, division: d, games: games });
    });
    return out;
  }
  function tieResultText(cup, ri, t) {
    if (t.away === -1) return { score: 'bye', agg: '' };
    if (isSingleLeg(cup, ri)) return { score: (t.hg != null ? t.hg + '-' + t.ag : ''), agg: '' };
    const l1 = t.l1h != null ? t.l1h + '-' + t.l1a : '–';
    const l2 = t.l2h != null ? t.l2h + '-' + t.l2a : '–';
    return { score: l1 + ' / ' + l2, agg: t.aggH != null ? 'agg ' + t.aggH + '-' + t.aggA : '' };
  }
  function cupRoundup(s, cup, r) {
    const rd = cup.rounds[r]; if (!rd) return [];
    return [{ group: cup.name + ' — ' + rd.name, nation: cup.nation, cup: cup.id, games: rd.ties.filter(t => t.away !== -1).map(t => {
      const rt = tieResultText(cup, r, t);
      return { home: s.clubs[t.home].name, away: s.clubs[t.away].name, homeIdx: t.home, awayIdx: t.away, score: rt.score, agg: rt.agg,
        winner: t.winner != null ? s.clubs[t.winner].name : null, pens: !!t.pens };
    }) }];
  }

  /* ---- cup bracket (for the UI) --------------------------------------- */
  function cupIds(s) { return Object.keys(s.cups); }
  function cupBracket(s, id) {
    const cup = s.cups[id]; if (!cup) return null;
    return {
      id: id, name: cup.name, nation: cup.nation, type: cup.type, twoLeg: !!cup.twoLeg, winner: cup.winner != null ? s.clubs[cup.winner].name : null,
      totalRounds: cup.totalRounds,
      rounds: cup.rounds.map((rd, ri) => ({ name: rd.name, ties: rd.ties.map(t => {
        const rt = tieResultText(cup, ri, t);
        return { home: s.clubs[t.home].name, away: t.away === -1 ? '(bye)' : s.clubs[t.away].name, homeIdx: t.home, awayIdx: t.away,
          score: rt.score, agg: rt.agg, winner: t.winner != null ? s.clubs[t.winner].name : null, pens: !!t.pens, shootout: t.shootout || null };
      }) }))
    };
  }

  /* ===================================================================== *
   * SEASON ROLLOVER
   * ===================================================================== */
  function endSeason(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 99991)) >>> 0);
    const snaps = s.divisions.map((_, d) => standings(s, d));
    const oldUserDiv = s.userDivision, uc = user(s);
    const userPos = snaps[oldUserDiv].findIndex(r => r.isUser) + 1;
    const idxByName = clubIndexMap(s);

    // awards per league: golden boot + player of the season
    const awards = s.divisions.map((dv, d) => {
      const lead = leagueLeaders(s, d, 1);
      return { division: dv.name, nation: dv.nation, boot: lead.scorers[0] ? { name: lead.scorers[0].name, club: lead.scorers[0].club, goals: lead.scorers[0].value } : null,
        player: lead.ratings[0] ? { name: lead.ratings[0].name, club: lead.ratings[0].club, rating: lead.ratings[0].value } : null };
    });
    // the roll of honour
    s.honours.push({
      season: s.season, label: seasonLabel(s),
      divisions: snaps.map((st, d) => ({ name: s.divisions[d].name, nation: s.divisions[d].nation, first: st[0] && st[0].name, second: st[1] && st[1].name, third: st[2] && st[2].name })),
      cups: Object.keys(s.cups).map(id => ({ id: id, name: s.cups[id].name, nation: s.cups[id].nation, winner: s.cups[id].winner != null ? s.clubs[s.cups[id].winner].name : '—' })),
      awards: awards
    });
    // the manager's own career log (unless he was sacked mid-season and never took a new job)
    const myTrophies = [];
    if (snaps[oldUserDiv][0] && snaps[oldUserDiv][0].isUser) myTrophies.push(s.divisions[oldUserDiv].name + ' title');
    Object.keys(s.cups).forEach(id => { if (s.cups[id].winner === s.userClub) myTrophies.push(s.cups[id].name); });
    const obj = s.board.objective;
    const met = obj ? userPos <= obj.target : false;
    if (!s.sacked) s.career.push({ season: s.season, label: seasonLabel(s), club: uc.name, division: s.divisions[oldUserDiv].name, position: userPos, trophies: myTrophies,
      record: Object.assign({}, s.seasonRecord), objective: obj ? obj.label : '', met: met });

    // league prize money
    const n = snaps[oldUserDiv].length, lv = s.divisions[oldUserDiv].level;
    const prize = Math.round((Data.ECON[lv] || Data.ECON[2]).prize * 10 * (n - userPos + 1) / n / 1000) * 1000;
    uc.balance += prize; book(s, 'prize', prize);

    s.euroQual = computeEuroQual(s, snaps);
    s.prev = {
      premChamp: snaps[0][0] ? idxByName[snaps[0][0].name] : null,
      premRunnerUp: snaps[0][1] ? idxByName[snaps[0][1].name] : null,
      faCup: s.cups.fa ? s.cups.fa.winner : null,
      ucl: s.cups.champions ? s.cups.champions.winner : null,
      uefa: s.cups.uefa ? s.cups.uefa.winner : null
    };

    // promotion / relegation, nation by nation
    const moves = [];
    Data.NATION_ORDER.forEach(nat => {
      const swap = Data.NATION_RULES[nat].swap;
      const tiers = s.divisions.map((dv, d) => d).filter(d => s.divisions[d].nation === nat).sort((a, b) => s.divisions[a].tier - s.divisions[b].tier);
      if (!swap) return;
      for (let k = 0; k < tiers.length - 1; k++) {
        const up = tiers[k], down = tiers[k + 1];
        snaps[up].slice(snaps[up].length - swap).forEach(r => moves.push({ name: r.name, to: down }));
        snaps[down].slice(0, swap).forEach(r => moves.push({ name: r.name, to: up }));
      }
    });
    moves.forEach(m => { const ci = idxByName[m.name]; if (ci != null) s.clubs[ci].division = m.to; });
    s.divisions.forEach((dv, d) => { dv.members = s.clubs.map((c, i) => (c.division === d ? i : -1)).filter(i => i >= 0); });
    s.userDivision = s.clubs[s.userClub].division;
    const promoted = s.divisions[s.userDivision].nation === s.divisions[oldUserDiv].nation && s.divisions[s.userDivision].tier < s.divisions[oldUserDiv].tier;
    const relegated = s.divisions[s.userDivision].tier > s.divisions[oldUserDiv].tier;

    // board verdict + reputation
    let verdict;
    if (!s.sacked) {
      let dRep = (obj ? (obj.target - userPos) * 0.9 : 0) + myTrophies.length * 4 + (promoted ? 6 : 0) - (relegated ? 6 : 0);
      dRep += (clubPrestige(s, s.userClub) - s.reputation) * 0.08;
      s.reputation = clamp(s.reputation + clamp(dRep, -10, 14), 5, 100);
      if (met || promoted || myTrophies.length) { s.board.confidence = clamp(Math.max(s.board.confidence, 62) + 12, 0, 100); verdict = 'The board is delighted: objective "' + (obj ? obj.label : '') + '" achieved.'; }
      else if (obj && userPos <= obj.target + 3) { s.board.confidence = clamp(Math.max(s.board.confidence, 45), 0, 100); verdict = 'The board is satisfied with a respectable season.'; }
      else { s.board.confidence = clamp(s.board.confidence - 15, 0, 100); verdict = 'The board is disappointed with the season.'; }
    }

    if (!s.sacked) {
      if (snaps[oldUserDiv][0] && snaps[oldUserDiv][0].isUser) unlock(s, 'champions');
      if (promoted) unlock(s, 'promotion');
      const boot = awards[oldUserDiv] && awards[oldUserDiv].boot;
      if (boot && boot.club === uc.name) unlock(s, 'golden-boot');
      if (s.divisions[s.userDivision].tier === 1) unlock(s, 'top-flight');
    }
    let msg = 'Season ' + seasonLabel(s) + ' over. ' + s.divisions[0].name + ' champions: ' + snaps[0][0].name + '. ';
    if (promoted) msg += 'PROMOTED! ' + uc.name + ' go up to ' + s.divisions[s.userDivision].name + '.';
    else if (relegated) msg += uc.name + ' relegated to ' + s.divisions[s.userDivision].name + '.';
    else msg += uc.name + ' finished ' + ordinal(userPos) + ' in ' + s.divisions[oldUserDiv].name + '.';
    s.notices.push(msg);
    s.pendingReview = {
      season: s.season, label: seasonLabel(s), club: uc.name, division: s.divisions[oldUserDiv].name, position: userPos,
      objective: obj ? obj.label : '', target: obj ? obj.target : null, met: met, promoted: promoted, relegated: relegated,
      trophies: myTrophies, verdict: verdict || '', record: Object.assign({}, s.seasonRecord), prize: prize, sacked: s.sacked,
      champions: snaps.map((st, d) => ({ division: s.divisions[d].name, nation: s.divisions[d].nation, club: st[0] && st[0].name })),
      cups: Object.keys(s.cups).map(id => ({ name: s.cups[id].name, nation: s.cups[id].nation, winner: s.cups[id].winner != null ? s.clubs[s.cups[id].winner].name : '—' })),
      awards: awards.filter(a => a.nation === s.divisions[oldUserDiv].nation || s.divisions.find(x => x.name === a.division).level === 1),
      reputation: Math.round(s.reputation)
    };
    news(s, snaps[0][0].name + ' are crowned ' + s.divisions[0].name + ' champions.', 'trophy');
    snaps.forEach((st, d) => { if (d !== 0 && s.divisions[d].tier === 1 && st[0]) news(s, st[0].name + ' win the ' + s.divisions[d].name + '.', 'trophy'); });

    // reset for the new season
    s.season++; s.year++; s.day = 0; s.trainedRound = -1;
    s.divisions.forEach(dv => { dv.table = blankTable(dv.members, s.clubs); dv.results = []; dv.fixtures = makeFixtures(dv.members, rng, dv.legs); });
    s.L = Math.max.apply(null, s.divisions.map(dv => (dv.members.length - 1) * dv.legs));
    s.divisions.forEach(dv => { dv.schedule = buildSchedule((dv.members.length - 1) * dv.legs, s.L); });
    s.clubs.forEach(c => { c.form = []; });
    // a year passes: age everyone, retire the veterans, develop (very aleatory), contracts run down
    const expired = [], youth = [];
    s.clubs.forEach((c, ci) => {
      const retained = [];
      const lvl = c.division >= 0 ? s.divisions[c.division].level : 2;
      c.players.forEach(p => {
        p.age = (p.age || 24) + 1;
        if (p.age >= (p.retireAge || 38)) {
          if (c.isUser) s.exPlayers.push(exRecord(s, p, 'Retired aged ' + p.age));
          return;
        }
        p.appsSeason = 0; p.goalsSeason = 0; p.lgGoals = 0; p.assistsSeason = 0; p.lgAssists = 0; p.rSum = 0; p.rN = 0; p.potm = 0; p.form = [];
        p.yellows = 0; p.suspendedFor = 0;
        let dlt;
        if (p.age <= 23) dlt = Data.ri(rng, 0, 4) + Math.round(((p.pot || p.skill) - p.skill) * 0.3 * rng());
        else if (p.age <= 29) dlt = Data.ri(rng, -2, 3);
        else if (p.age <= 32) dlt = Data.ri(rng, -4, 1);
        else dlt = Data.ri(rng, -6, 0);
        dlt += Data.ri(rng, -4, 4);                          // form can rise or fall sharply year to year
        p.skill = clamp((p.skill || 40) + dlt, 20, 99);
        p.pot = Math.max(p.skill, p.age >= 28 ? p.skill : (p.pot || p.skill));
        Data.recomputeValue(p, rng);
        p.fit = clamp(85 + Data.ri(rng, 0, 15), 10, 100);
        p.injuredFor = rng() < 0.04 ? Data.ri(rng, 1, 4) : 0; p.injured = p.injuredFor > 0;
        p.contract = (p.contract || 1) - 1;
        if (p.contract <= 0) {
          if (c.isUser) { expired.push(p); s.exPlayers.push(exRecord(s, p, 'Contract expired')); p.club = FREE_AGENT; p.contract = 0; s.transferPool.push(p); return; }
          if (p.age <= 32 && rng() < 0.8) { p.contract = Data.ri(rng, 1, 3); p.wage = Data.wageFor(p, lvl); }
          else { p.club = FREE_AGENT; p.contract = 0; s.transferPool.push(p); return; }
        }
        p.transferListed = false;
        retained.push(p);
      });
      c.players = retained;
      const centre = c.division >= 0 ? Data.clubCentre(s.divisions[c.division].level === 1 ? 66 : s.divisions[c.division].level === 2 ? 56 : s.divisions[c.division].level === 3 ? 48 : 40, c.tier || 3) : 52;
      const nat = c.division >= 0 ? s.divisions[c.division].nation : c.nation;
      if (c.isUser) {
        const intake = Math.min(Data.ri(rng, 2, 3), Math.max(0, MAX_SQUAD - c.players.length));
        for (let k = 0; k < intake; k++) {
          const np = Data.generatePlayer(rng, { centre: centre - 8, age: Data.ri(rng, 16, 18), nation: nat, level: lvl });
          np.pot = Math.min(99, np.skill + Data.ri(rng, 12, 34)); np.contract = 3; Data.recomputeValue(np, rng); np.wage = Data.wageFor(np, lvl);
          np.club = c.name; c.players.push(np); youth.push(np);
        }
      }
      while (c.players.length < (c.isUser ? 16 : 20)) {               // promote youth to refill the squad
        const np = Data.generatePlayer(rng, { centre: centre - 3, age: Data.ri(rng, 17, 21), nation: nat, level: lvl });
        np.club = c.name; np.contract = 2; c.players.push(np);
        if (c.isUser) youth.push(np);
      }
    });
    refreshMarket(s);
    startSeasonCups(s);
    s.offers.forEach(o => { o.done = true; });
    s.seasonRecord = { P: 0, W: 0, D: 0, L: 0 }; s.posHistory = [];
    s.finance.last = s.finance.season; s.finance.season = blankFinance().season;
    setObjective(s);
    if (!s.sacked) {
      mail(s, { cat: 'board', from: 'The Chairman', important: true, subject: 'Season review & new objective',
        body: (verdict || '') + '\n\nFinal position: ' + ordinal(userPos) + ' in the ' + s.divisions[oldUserDiv].name + '. League prize money: ' + fmtMoney(prize) +
          '.\n\nFor ' + seasonLabel(s) + ' the board expects: ' + s.board.objective.label + '.',
        actions: [{ label: 'Season review', cmd: 'go', args: { route: 'review' } }] });
    }
    if (expired.length) mail(s, { cat: 'transfer', from: 'Chief Executive', subject: expired.length + ' player(s) left on free transfers',
      body: expired.map(p => '• ' + fullName(p)).join('\n') });
    if (youth.length) mail(s, { cat: 'scout', from: 'Youth Coach', subject: 'Youth intake: ' + youth.length + ' new prospects',
      body: youth.map(p => '• ' + fullName(p) + ' (' + p.pos + ', ' + p.age + ') — skill ' + p.skill + ', potential ' + p.pot).join('\n'),
      actions: [{ label: 'View squad', cmd: 'go', args: { route: 'squad' } }] });
    if (!s.sacked) maybeJobOffer(s, rng);
    news(s, 'The ' + seasonLabel(s) + ' season begins.', 'world');
    s.selection = defaultSelection(s);
  }
  function ordinal(n) {
    const sfx = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
  }

  /* ===================================================================== *
   * LOOKUPS & PLAYER VIEWS
   * ===================================================================== */
  function clubIndexMap(s) {
    if (s._idx && s._idx.n === s.clubs.length) return s._idx.map;
    const map = {}; s.clubs.forEach((c, i) => { map[c.name] = i; });
    Object.defineProperty(s, '_idx', { value: { n: s.clubs.length, map: map }, enumerable: false, writable: true, configurable: true });
    return map;
  }
  function clubIndexByName(s, name) { const m = clubIndexMap(s); return m[name] != null ? m[name] : -1; }
  function findPlayer(s, id) {
    for (let ci = 0; ci < s.clubs.length; ci++) { const p = s.clubs[ci].players.find(x => x.id === id); if (p) return { p: p, clubIndex: ci, club: s.clubs[ci] }; }
    const fp = s.transferPool.find(x => x.id === id); if (fp) return { p: fp, clubIndex: -1, club: null };
    return null;
  }
  // FM-style 1..20 attributes derived from skill, position and a per-player fingerprint (not stored)
  const ATTRS = {
    G: ['Handling', 'Reflexes', 'Aerial Reach', 'One on Ones', 'Kicking', 'Command of Area', 'Positioning', 'Agility', 'Composure', 'Concentration'],
    F: ['Finishing', 'Passing', 'Dribbling', 'Tackling', 'Heading', 'Pace', 'Stamina', 'Vision', 'Positioning', 'Composure', 'Work Rate', 'Strength']
  };
  const BIAS = {
    D: { Finishing: -4, Dribbling: -2, Tackling: 3, Heading: 2.5, Positioning: 2.5, Strength: 1.5, Vision: -1.5 },
    M: { Passing: 3, Vision: 3, 'Work Rate': 2, Stamina: 1.5, Heading: -1.5, Tackling: 0.5 },
    A: { Finishing: 4, Dribbling: 2, Pace: 2, Composure: 1.5, Tackling: -4, Positioning: -1, 'Work Rate': -1 },
    G: {}
  };
  function attributes(p) {
    const list = p.pos === 'G' ? ATTRS.G : ATTRS.F, base = 1 + (p.skill - 20) / 79 * 19, out = [];
    list.forEach(a => {
      const h = Data.hashStr(p.id + ':' + a), noise = ((h % 1000) / 1000 - 0.5) * 5;
      let v = base + ((BIAS[p.pos] || {})[a] || 0) + noise;
      if ((a === 'Pace' || a === 'Agility') && p.age >= 30) v -= (p.age - 29) * 0.7;
      if (a === 'Composure' || a === 'Concentration') v += (p.age - 25) * 0.15;
      out.push({ name: a, value: clamp(Math.round(v), 1, 20) });
    });
    return out;
  }
  function playerView(s, id) {
    const f = findPlayer(s, id);
    if (!f) {
      const ex = s.exPlayers.slice().reverse().find(x => x.id === id);
      return ex ? { ex: ex } : null;
    }
    const p = f.p;
    return {
      p: p, clubIndex: f.clubIndex, club: f.club ? f.club.name : (p.club || FREE_AGENT), mine: f.clubIndex === s.userClub,
      attrs: attributes(p), avgRating: p.rN ? Math.round(p.rSum / p.rN * 100) / 100 : null,
      askingPrice: f.clubIndex === s.userClub ? null : (f.clubIndex < 0 || p.transferListed ? p.value : roundFee(p.value * UNLISTED_PREMIUM)),
      shortlisted: s.shortlist.indexOf(id) >= 0, renewal: f.clubIndex === s.userClub ? renewalTerms(s, p) : null,
      offers: s.offers.filter(o => o.playerId === id && !o.done)
    };
  }
  function nationsView(s) {
    return Data.NATION_ORDER.map(nat => ({
      code: nat, name: Data.NATION_RULES[nat].name,
      divisions: s.divisions.map((dv, d) => d).filter(d => s.divisions[d].nation === nat),
      cups: Object.keys(s.cups).filter(id => s.cups[id].nation === nat)
    })).concat([{ code: 'EUR', name: 'Europe', divisions: [], cups: Object.keys(s.cups).filter(id => s.cups[id].nation === 'EUR') }]);
  }

  /* ---- save / load (compact player encoding) ------------------------- */
  const PF = ['id', 'forename', 'surname', 'nat', 'pos', 'skill', 'pot', 'age', 'fit', 'retireAge', 'injuredFor', 'yellows', 'suspendedFor',
    'appsSeason', 'goalsSeason', 'lgGoals', 'assistsSeason', 'lgAssists', 'rSum', 'rN', 'form', 'potm', 'appsTotal', 'goalsTotal', 'assistsTotal',
    'transferListed', 'contract', 'value', 'wage', 'club'];
  function packPlayer(p) { return PF.map(f => (p[f] === undefined ? null : p[f])); }
  function unpackPlayer(a) {
    if (!Array.isArray(a)) return a;
    const p = {}; PF.forEach((f, i) => { p[f] = a[i]; });
    p.injured = p.injuredFor > 0; if (!p.form) p.form = [];
    ['lgGoals', 'assistsSeason', 'lgAssists', 'rSum', 'rN', 'potm', 'assistsTotal', 'yellows', 'suspendedFor'].forEach(k => { if (p[k] == null) p[k] = 0; });
    return p;
  }
  function serialize(s) {
    return JSON.stringify(s, (k, v) => ((k === 'players' || k === 'transferPool') && Array.isArray(v) ? v.map(p => (Array.isArray(p) ? p : packPlayer(p))) : v));
  }
  function deserialize(str) {
    const s = JSON.parse(str);
    let maxId = 0;
    const fix = arr => arr.map(x => { const p = unpackPlayer(x); if (p.id > maxId) maxId = p.id; return p; });
    (s.clubs || []).forEach(c => { c.players = fix(c.players || []); });
    s.transferPool = fix(s.transferPool || []);
    Data.setNextId(maxId + 1);
    return s;
  }
  function isCompatible(s) { return !!s && s.version === VERSION; }

  return {
    VERSION, newGame, setUserClub, chooseClub, eligibleClubs, clubOverall, clubPrestige, prestigeMap, difficultyLabel, FORMATIONS, DIFFICULTY,
    user, userDiv, totalRounds, userLeagueRounds, divisionRounds, numDivisions, divisionName, nextOpponent, defaultSelection, bestXI, repairSelection,
    availablePlayers, isFit, playersByIds, fullName,
    userRatings, clubRatings, ratingsFor, moraleOf, clubForm,
    simulateMatch, playUserMatch, createLiveMatch, liveToMatch, matchPreview, previewOtherResults, commitUserResult, prepareNextUserMatch,
    standings, leaguePosition, tableZones, topScorers, leagueLeaders, topScorersForCup, lastRoundResults, roundResults, clubFixtures,
    cupsSummary, honours, honoursTally, cupIds, cupBracket, historyVs,
    marketList, bid, signUnlisted, setTransferListed, sellPlayer, toggleShortlist, renewContract, renewalTerms, releasePlayer, train, refreshMarket,
    takeLoan, repayLoan, loanCap, financeSummary, wageBill, attendance,
    mail, notify, news, unreadCount, markRead, inboxAction, acceptBid,
    formatDate, currentDate, seasonLabel, clubIndexByName, findPlayer, playerView, attributes, nationsView, levelOf,
    achievementsView, ACHIEVEMENTS, stadiumOffer, expandStadium,
    serialize, deserialize, isCompatible, ordinal, MAX_SQUAD, MIN_SQUAD, FREE_AGENT
  };
});
