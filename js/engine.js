/*
 * SIMSOC 6 (remake) - game engine
 * Pure game logic: a pyramid of divisions with promotion/relegation, fixtures,
 * team strength, match simulation, transfers, manager rating and the season
 * loop. No DOM in here so it can be exercised head-less by the test harness.
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data'));
  } else {
    root.SimSocEngine = factory(root.SimSocData);
  }
})(typeof self !== 'undefined' ? self : this, function (Data) {
  'use strict';

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const fullName = p => p.forename + ' ' + p.surname;
  const PROMOTED = 3;   // clubs promoted / relegated at each division boundary

  /* ---- fixtures: double round-robin (circle method) over a club list ---- */
  function makeFixtures(ids, rng) {
    const n = ids.length;                 // n is even (CLUBS_PER_DIVISION = 22)
    let arr = []; for (let i = 0; i < n; i++) arr.push(i);
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        games.push(r % 2 ? { home: a, away: b } : { home: b, away: a });
      }
      rounds.push(games);
      arr = [arr[0]].concat([arr[n - 1]]).concat(arr.slice(1, n - 1)); // rotate
    }
    const second = rounds.map(g => g.map(x => ({ home: x.away, away: x.home })));
    const all = rounds.concat(second);
    const fixtures = [];
    all.forEach((games, ri) => games.forEach(g => fixtures.push({ round: ri, home: ids[g.home], away: ids[g.away] })));
    return fixtures;
  }

  function blankRow() { return { P: 0, W: 0, D: 0, L: 0, F: 0, A: 0, Pts: 0 }; }
  function blankTable(memberIds, clubs) {
    const t = {}; memberIds.forEach(i => { t[clubs[i].name] = blankRow(); }); return t;
  }

  /* ---- new game -------------------------------------------------------- *
   * Builds the whole pyramid. `userIndex` is a global club index; the default
   * is the first club of the bottom division (Romford in the Conference).
   */
  function newGame(seed, userIndex) {
    seed = seed >>> 0 || 12345;
    const rng = Data.makeRng(seed);
    const defs = Data.DIVISION_DEFS;
    const clubs = [], divisions = [];
    let upperCursor = 0;

    defs.forEach((dd, d) => {
      const size = dd.size || Data.CLUBS_PER_DIVISION;
      const members = [];
      for (let k = 0; k < size; k++) {
        let name, tier;
        if (d === defs.length - 1) {                 // bottom division = Conference list
          const cd = Data.CONFERENCE[k]; name = cd.name; tier = cd.tier;
        } else {
          name = Data.UPPER_CLUBS[upperCursor++];
          tier = clamp(dd.tierBase + Data.ri(rng, -1, 1), 1, 5);
        }
        const club = Data.generateClub(rng, { name, tier });
        club.division = d;
        clubs.push(club); members.push(clubs.length - 1);
      }
      divisions.push({
        name: dd.name, level: d + 1, members,
        fixtures: makeFixtures(members, rng), results: [], table: blankTable(members, clubs)
      });
    });

    // continental clubs (division -1): they only feature in the European cups
    Data.FOREIGN_CLUBS.forEach(name => {
      const club = Data.generateClub(rng, { name: name, tier: Data.ri(rng, 1, 2) });
      club.division = -1; club.foreign = true;
      clubs.push(club);
    });

    // open transfer market: a broad pool of players from other clubs
    const transferPool = [];
    const addFrom = (clubName, euro, count) => {
      for (let k = 0; k < count; k++) {
        const p = Data.generatePlayer(rng, { tier: Data.ri(rng, 1, 5) });
        p.club = clubName; p.european = euro;
        transferPool.push(p);
      }
    };
    Data.ENGLISH_CLUBS.forEach(c => addFrom(c, false, Data.ri(rng, 3, 6)));
    Data.EURO_CLUBS.forEach(c => addFrom(c, true, Data.ri(rng, 2, 4)));

    const state = {
      seed, season: 1, day: 0,
      clubs, divisions,
      userClub: 0, userDivision: defs.length - 1,
      managerRating: 50, transferPool,
      cups: {}, calendar: [], honours: [], euroQual: null,
      history: [], exPlayers: [], career: [], prev: null, debt: 0, debtSince: -1,
      trainedRound: -1, trainedSeason: 0,
      lastResult: null, lastRoundup: null, notices: [], selection: null
    };
    const bottomFirst = divisions[defs.length - 1].members[0];   // Romford
    state.userClub = userIndex == null ? bottomFirst : userIndex;
    state.userDivision = state.clubs[state.userClub].division;
    state.clubs.forEach((c, i) => { c.isUser = (i === state.userClub); });
    state.euroQual = seedEuroQual(state);              // season-1 qualification by strength
    startSeasonCups(state);                            // cups + calendar (user already known -> in the draws)
    state.selection = defaultSelection(state);
    return state;
  }

  const user = s => s.clubs[s.userClub];
  const userDiv = s => s.divisions[s.userDivision];
  const divisionRounds = (s, d) => (s.divisions[d].members.length - 1) * 2;
  const totalRounds = s => s ? Math.max.apply(null, s.divisions.map((dv) => (dv.members.length - 1) * 2)) : (Data.CLUBS_PER_DIVISION - 1) * 2;
  const userLeagueRounds = s => divisionRounds(s, s.userDivision);
  const numDivisions = s => s.divisions.length;
  const divisionName = (s, d) => s.divisions[d].name;

  /* ---- choose / change the managed club -------------------------------- */
  function setUserClub(s, index) {
    index = Math.max(0, Math.min(s.clubs.length - 1, index | 0));
    s.clubs.forEach((c, i) => { c.isUser = (i === index); });
    s.userClub = index;
    s.userDivision = s.clubs[index].division;
    s.managerRating = 50;
    s.selection = defaultSelection(s);
    return s;
  }
  // pick a club at the start of a season (rebuilds that season's cups so the user is always in the domestic draws)
  function chooseClub(s, index) {
    setUserClub(s, index);
    if (s.day === 0) { startSeasonCups(s); s.selection = defaultSelection(s); }
    return s;
  }
  // which clubs would hire you, given your reputation (manager rating)
  function eligibleClubs(s, rating) {
    const minDiv = rating >= 80 ? 0 : rating >= 60 ? 1 : rating >= 40 ? 2 : 3;   // higher rating -> bigger clubs
    return s.clubs.map((c, i) => i).filter(i => s.clubs[i].division >= minDiv && s.clubs[i].division <= s.divisions.length - 1);
  }

  /* ---- selection, formations & XI pickers ----------------------------- */
  const FORMATIONS = { '442': { D: 4, M: 4, A: 2 }, '352': { D: 3, M: 5, A: 2 }, '343': { D: 3, M: 4, A: 3 }, '541': { D: 5, M: 4, A: 1 }, '451': { D: 4, M: 5, A: 1 } };
  function isFit(p) { return (!p.injuredFor || p.injuredFor <= 0) && (!p.suspendedFor || p.suspendedFor <= 0) && p.fit > 0; }
  function availablePlayers(club) { return club.players.filter(isFit); }
  function scoreFn(mode) {
    if (mode === 'fresh') return p => p.fit + p.skill * 0.05;     // freshest legs first
    if (mode === 'mix') return p => p.skill * 0.6 + p.fit * 0.4;  // blend quality + freshness
    return p => p.skill + p.fit * 0.03;                            // best (quality first)
  }
  function pickByPos(players, pos, n, score) {
    return players.filter(p => p.pos === pos).sort((a, b) => score(b) - score(a)).slice(0, n);
  }
  function bestXI(club, opts) {
    opts = opts || {};
    const shape = FORMATIONS[opts.formation] || FORMATIONS['442'];
    const score = scoreFn(opts.mode);
    let a = availablePlayers(club);
    if (a.length < 11) a = club.players.slice();                   // field something even if depleted
    const xi = [].concat(pickByPos(a, 'G', 1, score), pickByPos(a, 'D', shape.D, score), pickByPos(a, 'M', shape.M, score), pickByPos(a, 'A', shape.A, score));
    const ids = new Set(xi.map(p => p.id));
    a.slice().sort((x, y) => score(y) - score(x)).forEach(p => { if (xi.length < 11 && !ids.has(p.id)) { xi.push(p); ids.add(p.id); } });
    const subs = a.filter(p => !ids.has(p.id)).sort((x, y) => score(y) - score(x)).slice(0, 5);
    return { xi: xi.map(p => p.id), subs: subs.map(p => p.id), formation: opts.formation || '442' };
  }
  function defaultSelection(s) {
    const opp = nextOpponent(s);
    const best = bestXI(user(s), { formation: s.selection && s.selection.formation });
    return { xi: best.xi, subs: best.subs, home: opp ? opp.home : true, formation: best.formation };
  }
  function nextOpponent(s) {
    const e = s.calendar[s.day];
    if (!e) return null;
    if (e.comp === 'league') {
      const dv = userDiv(s);
      const fx = dv.fixtures.find(f => f.round === e.round && (f.home === s.userClub || f.away === s.userClub));
      if (!fx) return null;
      const home = fx.home === s.userClub;
      return { comp: 'league', compName: dv.name, club: s.clubs[home ? fx.away : fx.home], home, fixture: fx, division: s.userDivision };
    }
    const cup = s.cups[e.comp];
    if (!cup || !cup.rounds[e.round]) return null;
    const tie = cup.rounds[e.round].ties.find(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub));
    if (!tie) return null;
    const leg = e.leg || 0;
    const host = (!isSingleLeg(cup, e.round) && leg === 1) ? tie.away : tie.home;   // 2nd leg flips the venue
    const home = host === s.userClub;
    const oppIdx = tie.home === s.userClub ? tie.away : tie.home;
    const legLabel = (cup.twoLeg && !isSingleLeg(cup, e.round)) ? (leg === 1 ? ' (2nd leg)' : ' (1st leg)') : '';
    return { comp: e.comp, compName: cup.name + ' — ' + cup.rounds[e.round].name + legLabel, club: s.clubs[oppIdx], home, tie, cup, leg };
  }

  /* ---- club overall strength + difficulty hint (for the chooser) ------- */
  function clubOverall(club) {
    const xi = playersByIds(club, bestXI(club).xi);
    if (!xi.length) return 0;
    return Math.round(xi.reduce((a, p) => a + p.skill, 0) / xi.length);
  }
  function difficultyLabel(tier) {
    return ['', 'Title favourites', 'Promotion hopefuls', 'Mid-table', 'Lower half', 'Relegation battle'][tier] || 'Mid-table';
  }

  /* ---- team strength --------------------------------------------------- */
  function unit(players, posList) {
    const ps = players.filter(p => posList.indexOf(p.pos) >= 0);
    if (!ps.length) return 0;
    let s = 0; ps.forEach(p => { s += p.skill * (0.55 + 0.45 * p.fit / 100); });
    return s / ps.length;
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
  function clubRatings(club) { return ratingsFor(playersByIds(club, bestXI(club).xi), null); }
  function moraleOf(s, club) {
    const dv = s.divisions[club.division], ci = s.clubs.indexOf(club);
    const recent = dv.results.filter(r => r.home === ci || r.away === ci).slice(-5);
    if (!recent.length) return 45;
    let pts = 0;
    recent.forEach(r => {
      const home = r.home === ci, gf = home ? r.hg : r.ag, ga = home ? r.ag : r.hg;
      pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    });
    return clamp(30 + (pts / (recent.length * 3)) * 55, 22, 92);
  }

  /* ---- poisson sampling + scorer selection ----------------------------- */
  function poisson(rng, lambda) {
    const L = Math.exp(-lambda); let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  function weightedScorer(rng, players) {
    const w = { A: 1.0, M: 0.55, D: 0.18, G: 0.02 };
    const weights = players.map(p => Math.max(0.01, p.skill) * w[p.pos]);
    let tot = weights.reduce((a, b) => a + b, 0), r = rng() * tot;
    for (let i = 0; i < players.length; i++) { r -= weights[i]; if (r <= 0) return players[i]; }
    return players[players.length - 1];
  }

  /* ---- simulate one match ---------------------------------------------- */
  function simulateMatch(rng, homeRat, awayRat, homePlayers, awayPlayers) {
    const hOff = homeRat.attack * 0.7 + homeRat.midfield * 0.3 + homeRat.morale * 0.08;
    const aOff = awayRat.attack * 0.7 + awayRat.midfield * 0.3 + awayRat.morale * 0.08;
    const hDef = homeRat.defence * 0.7 + homeRat.midfield * 0.3 + 6;
    const aDef = awayRat.defence * 0.7 + awayRat.midfield * 0.3 + 6;
    const lambdaH = clamp(1.35 * (hOff / aDef) * 1.18, 0.12, 5.5);
    const lambdaA = clamp(1.35 * (aOff / hDef) * 0.92, 0.12, 5.5);
    let hg = clamp(poisson(rng, lambdaH), 0, 9), ag = clamp(poisson(rng, lambdaA), 0, 9);

    const events = [], used = {};
    function addGoals(n, side, players) {
      for (let i = 0; i < n; i++) {
        let minute; do { minute = Data.ri(rng, 1, 90); } while (used[minute]);
        used[minute] = true;
        const scorer = weightedScorer(rng, players.length ? players : [{ id: -1, pos: 'A', skill: 1, forename: 'Unknown', surname: '' }]);
        events.push({ minute, side, scorerId: scorer.id, scorer: fullName(scorer), pos: scorer.pos });
      }
    }
    addGoals(hg, 'home', homePlayers);
    addGoals(ag, 'away', awayPlayers);
    events.sort((a, b) => a.minute - b.minute);
    return { hg, ag, events };
  }

  /* ---- apply a result to a division's table / stats -------------------- */
  function applyResult(s, divIdx, fx, hg, ag, events) {
    const dv = s.divisions[divIdx];
    const homeClub = s.clubs[fx.home], awayClub = s.clubs[fx.away];
    const th = dv.table[homeClub.name], ta = dv.table[awayClub.name];
    th.P++; ta.P++; th.F += hg; th.A += ag; ta.F += ag; ta.A += hg;
    if (hg > ag) { th.W++; ta.L++; th.Pts += 3; }
    else if (hg < ag) { ta.W++; th.L++; ta.Pts += 3; }
    else { th.D++; ta.D++; th.Pts++; ta.Pts++; }
    events.forEach(e => {
      const club = e.side === 'home' ? homeClub : awayClub;
      const p = club.players.find(pl => pl.id === e.scorerId);
      if (p) { p.goalsSeason++; p.goalsTotal++; }
    });
    dv.results.push({ round: fx.round, home: fx.home, away: fx.away, hg, ag, scorers: events.map(e => ({ n: e.scorer, s: e.side, m: e.minute })) });
  }
  function creditApps(club, ids) {
    ids.forEach(id => { const p = club.players.find(pl => pl.id === id); if (p) { p.appsSeason++; p.appsTotal++; } });
  }

  /* ---- play the user's match (drives the animation) -------------------- */
  function playUserMatch(s) {
    const opp = nextOpponent(s);
    if (!opp) return null;
    const rng = Data.makeRng((s.seed ^ (s.season * 131071) ^ (s.day * 2654435761)) >>> 0);
    const uClub = user(s);
    if (availablePlayers(uClub).length < 8) {           // cannot field 8 fit players -> walkover defeat
      const h = opp.home;
      return {
        comp: opp.comp, compName: opp.compName, isCup: opp.comp !== 'league',
        fixture: opp.fixture, tie: opp.tie, cupId: opp.comp, leg: opp.leg || 0,
        home: h, opponent: opp.club, userSide: h ? 'home' : 'away', forfeit: true,
        homeName: h ? uClub.name : opp.club.name, awayName: h ? opp.club.name : uClub.name,
        userPlayers: [], oppPlayers: [], hg: h ? 0 : 3, ag: h ? 3 : 0,
        events: [], cards: [], injuries: [], subs: [],
        stats: { possHome: 50, possAway: 50, shotsHome: 0, shotsAway: 0, sotHome: 0, sotAway: 0, cornersHome: 0, cornersAway: 0, foulsHome: 0, foulsAway: 0 }
      };
    }
    const uPlayers = playersByIds(uClub, s.selection.xi);
    const uRat = ratingsFor(uPlayers, moraleOf(s, uClub));
    const oRat = clubRatings(opp.club);
    const oBest = bestXI(opp.club);
    const oPlayers = playersByIds(opp.club, oBest.xi);
    const oSubs = playersByIds(opp.club, oBest.subs);
    const uSubs = playersByIds(uClub, s.selection.subs);
    const home = opp.home;
    const sim = home ? simulateMatch(rng, uRat, oRat, uPlayers, oPlayers)
                     : simulateMatch(rng, oRat, uRat, oPlayers, uPlayers);
    const extra = buildMatchExtras(s, {
      homePlayers: home ? uPlayers : oPlayers, awayPlayers: home ? oPlayers : uPlayers,
      homeSubs: home ? uSubs : oSubs, awaySubs: home ? oSubs : uSubs,
      hRat: home ? uRat : oRat, aRat: home ? oRat : uRat, hg: sim.hg, ag: sim.ag
    });
    return {
      comp: opp.comp, compName: opp.compName, isCup: opp.comp !== 'league',
      fixture: opp.fixture, tie: opp.tie, cupId: opp.comp, leg: opp.leg || 0,
      home, opponent: opp.club, userSide: home ? 'home' : 'away',
      homeName: home ? uClub.name : opp.club.name,
      awayName: home ? opp.club.name : uClub.name,
      userPlayers: uPlayers, oppPlayers: oPlayers,
      hg: sim.hg, ag: sim.ag, events: sim.events,
      cards: extra.cards, injuries: extra.injuries, subs: extra.subs, stats: extra.stats
    };
  }
  /* ---- extra match colour: bookings, injuries, auto-subs, box score ---- */
  function buildMatchExtras(s, m) {
    const rng = Data.makeRng((s.seed ^ (s.season * 991) ^ (s.day * 131) ^ 0x5bd1e995) >>> 0);
    const pickP = side => { const a = side === 'home' ? m.homePlayers : m.awayPlayers; return a.length ? a[Math.floor(rng() * a.length)] : null; };
    const cards = [];
    for (let i = 0, n = Data.ri(rng, 2, 6); i < n; i++) { const side = rng() < 0.5 ? 'home' : 'away'; const p = pickP(side); cards.push({ minute: Data.ri(rng, 5, 90), side, id: p ? p.id : null, name: p ? fullName(p) : 'Unknown', color: 'Y' }); }
    if (rng() < 0.25) { const side = rng() < 0.5 ? 'home' : 'away'; const p = pickP(side); cards.push({ minute: Data.ri(rng, 25, 90), side, id: p ? p.id : null, name: p ? fullName(p) : 'Unknown', color: 'R' }); }
    cards.sort((a, b) => a.minute - b.minute);
    const injuries = [];
    for (let i = 0, n = Data.ri(rng, 0, 2); i < n; i++) { const side = rng() < 0.5 ? 'home' : 'away'; const p = pickP(side); injuries.push({ minute: Data.ri(rng, 10, 85), side, name: p ? fullName(p) : 'Unknown' }); }
    injuries.sort((a, b) => a.minute - b.minute);
    function subsFor(side, starters, subs) {
      const out = [];
      for (let i = 0, n = Math.min(3, subs.length); i < n && rng() < 0.85; i++) {
        const off = starters[starters.length - 1 - i], on = subs[i];
        if (off && on) out.push({ minute: Data.ri(rng, 58, 82), side, off: fullName(off), on: fullName(on) });
      }
      return out;
    }
    const subs = subsFor('home', m.homePlayers, m.homeSubs).concat(subsFor('away', m.awayPlayers, m.awaySubs)).sort((a, b) => a.minute - b.minute);
    const hAtt = m.hRat.attack + m.hRat.midfield + 1, aAtt = m.aRat.attack + m.aRat.midfield + 1;
    const possHome = clamp(Math.round(50 + (m.hRat.midfield - m.aRat.midfield) * 0.8 + (rng() - 0.5) * 8), 30, 70);
    const shotsHome = Math.max(m.hg, Math.round(m.hg * 2 + 4 + (hAtt / aAtt) * 3 + rng() * 4));
    const shotsAway = Math.max(m.ag, Math.round(m.ag * 2 + 4 + (aAtt / hAtt) * 3 + rng() * 4));
    const stats = {
      possHome: possHome, possAway: 100 - possHome,
      shotsHome: shotsHome, shotsAway: shotsAway,
      sotHome: Math.max(m.hg, Math.round(shotsHome * (0.4 + rng() * 0.2))),
      sotAway: Math.max(m.ag, Math.round(shotsAway * (0.4 + rng() * 0.2))),
      cornersHome: Data.ri(rng, 2, 11), cornersAway: Data.ri(rng, 1, 9),
      foulsHome: Data.ri(rng, 6, 16), foulsAway: Data.ri(rng, 6, 16)
    };
    return { cards: cards, injuries: injuries, subs: subs, stats: stats };
  }

  /* ---- commit the user's match and resolve the rest of the matchday ---- */
  function commitUserResult(s, match) {
    const e = s.calendar[s.day];
    const played = {};
    const markPlayed = (ci, ids) => { played[ci] = ids; };

    if (match.comp === 'league') {
      applyResult(s, s.userDivision, match.fixture, match.hg, match.ag, match.events);
      creditApps(user(s), s.selection.xi);
      markPlayed(s.userClub, s.selection.xi);
      s.divisions.forEach((dv, d) => {
        dv.fixtures.filter(f => f.round === e.round && !(d === s.userDivision && f === match.fixture)).forEach(f => {
          const rng = Data.makeRng((s.seed ^ (s.season * 7727) ^ (e.round * 40503) ^ (d * 7919) ^ (f.home * 131 + f.away * 977)) >>> 0);
          const hr = clubRatings(s.clubs[f.home]), ar = clubRatings(s.clubs[f.away]);
          const hx = bestXI(s.clubs[f.home]).xi, ax = bestXI(s.clubs[f.away]).xi;
          const sim = simulateMatch(rng, hr, ar, playersByIds(s.clubs[f.home], hx), playersByIds(s.clubs[f.away], ax));
          applyResult(s, d, f, sim.hg, sim.ag, sim.events);
          markPlayed(f.home, hx); markPlayed(f.away, ax);
        });
      });
      const uHome = match.fixture.home === s.userClub;
      const ug = uHome ? match.hg : match.ag, og = uHome ? match.ag : match.hg;
      const pos = leaguePosition(s, user(s).name);
      const posTarget = 25 + 60 * (1 - (pos - 1) / (userDiv(s).members.length - 1));
      const target = posTarget + (ug > og ? 8 : ug === og ? 0 : -8);
      s.managerRating = Math.round(clamp(s.managerRating * 0.7 + clamp(target, 5, 99) * 0.3, 1, 99));
      if (uHome) {
        const mult = 1 + (s.divisions.length - 1 - s.userDivision) * 0.7;
        user(s).balance += Math.round(Data.ri(Data.makeRng((s.seed ^ s.day) >>> 0), 8000, 22000) * mult);
      }
      s.lastResult = { comp: match.compName, homeName: match.homeName, awayName: match.awayName, hg: match.hg, ag: match.ag,
        scorers: match.events.map(ev => ({ side: ev.side, name: ev.scorer, minute: ev.minute })) };
    } else {
      const cup = s.cups[match.comp], tie = match.tie, leg = match.leg || 0;
      creditApps(user(s), s.selection.xi);
      const cupPlayed = playCupMatchday(s, match.comp, e.round, leg, { tie: tie, hg: match.hg, ag: match.ag, events: match.events, homeName: match.homeName, awayName: match.awayName });
      Object.keys(cupPlayed).forEach(ci => { played[ci] = cupPlayed[ci]; });
      markPlayed(s.userClub, s.selection.xi);
      const decided = tie.winner != null;
      if (decided) {
        if (tie.winner === s.userClub) {
          s.managerRating = Math.round(clamp(s.managerRating + 2, 1, 99));
          if (cup.winner === s.userClub) s.notices.push('Congratulations — you have won the ' + cup.name + '!');
        } else {
          const byIdx = tie.home === s.userClub ? tie.away : tie.home;
          s.notices.push('Knocked out of the ' + cup.name + ' by ' + s.clubs[byIdx].name + '.');
        }
      }
      const gate = Math.round(Data.ri(Data.makeRng((s.seed ^ s.day ^ 99) >>> 0), 9000, 26000));
      if (match.home) user(s).balance += gate;
      const agg = (decided && !isSingleLeg(cup, e.round)) ? (tie.aggH + '-' + tie.aggA) : null;
      s.lastResult = { comp: match.compName, homeName: match.homeName, awayName: match.awayName, hg: match.hg, ag: match.ag,
        winnerName: decided ? s.clubs[tie.winner].name : null, pens: !!tie.pens, agg: agg,
        scorers: match.events.map(ev => ({ side: ev.side, name: ev.scorer, minute: ev.minute })) };
    }

    // head-to-head history + matchday round-up + finances
    s.history.push({ season: s.season, comp: match.comp, compName: match.compName, oppName: match.opponent.name, home: match.home, hg: match.hg, ag: match.ag, pens: !!(match.tie && match.tie.pens) });
    if (match.comp === 'league') pushRoundup(s, 'League — Matchday ' + (e.round + 1), leagueRoundup(s, e.round));
    else pushRoundup(s, match.compName, cupRoundup(s, s.cups[match.comp], e.round));
    applyFinances(s);

    applyMatchdayEffects(s, played);
    processBookings(s, match);                 // after fitness, so a new suspension isn't served the same day
    advanceDay(s);
    return s.lastResult;
  }
  // yellow-card accumulation (5 -> ban) and red cards -> suspension, for the user's players
  function processBookings(s, match) {
    if (!match.cards || !match.userSide) return;
    const club = user(s);
    match.cards.filter(c => c.side === match.userSide && c.id != null).forEach(c => {
      const p = club.players.find(pl => pl.id === c.id); if (!p) return;
      if (c.color === 'R') { p.suspendedFor = (p.suspendedFor || 0) + 1; s.notices.push(fullName(p) + ' sent off — banned for the next match.'); }
      else { p.yellows = (p.yellows || 0) + 1; if (p.yellows >= 5) { p.yellows -= 5; p.suspendedFor = (p.suspendedFor || 0) + 1; s.notices.push(fullName(p) + ' reaches 5 bookings — banned for the next match.'); } }
    });
  }

  /* ---- advance the calendar one day; roll the season at the end -------- */
  function advanceDay(s) {
    s.day++;
    if (s.day >= s.calendar.length) { endSeason(s); return; }
    const e = s.calendar[s.day];
    if (e.comp === 'league' && e.round % 5 === 0) refreshMarket(s);
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
    if (e.comp === 'league') {     // the user's division may have fewer rounds than the calendar
      return userDiv(s).fixtures.some(f => f.round === e.round && (f.home === s.userClub || f.away === s.userClub));
    }
    const cup = s.cups[e.comp];
    if (!cup || !cup.rounds[e.round]) return false;
    return cup.rounds[e.round].ties.some(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub));
  }
  function autoSimMatchday(s) {
    const e = s.calendar[s.day], played = {};
    if (e.comp === 'league') {
      s.divisions.forEach((dv, d) => dv.fixtures.filter(f => f.round === e.round).forEach(f => {
        const rng = Data.makeRng((s.seed ^ (s.season * 7727) ^ (e.round * 40503) ^ (d * 7919) ^ (f.home * 131 + f.away * 977)) >>> 0);
        const hx = bestXI(s.clubs[f.home]).xi, ax = bestXI(s.clubs[f.away]).xi;
        const sim = simulateMatch(rng, clubRatings(s.clubs[f.home]), clubRatings(s.clubs[f.away]), playersByIds(s.clubs[f.home], hx), playersByIds(s.clubs[f.away], ax));
        applyResult(s, d, f, sim.hg, sim.ag, sim.events);
        played[f.home] = hx; played[f.away] = ax;
      }));
    } else {
      const cp = playCupMatchday(s, e.comp, e.round, e.leg || 0, null);
      Object.keys(cp).forEach(ci => { played[ci] = cp[ci]; });
    }
    if (e.comp === 'league') pushRoundup(s, 'League — Matchday ' + (e.round + 1), leagueRoundup(s, e.round));
    else if (s.cups[e.comp] && s.cups[e.comp].rounds[e.round]) pushRoundup(s, s.cups[e.comp].name + ' — ' + s.cups[e.comp].rounds[e.round].name, cupRoundup(s, s.cups[e.comp], e.round));
    applyMatchdayEffects(s, played);
    advanceDay(s);
  }

  /* ---- per-matchday fitness & injuries (only clubs that played) -------- */
  function applyMatchdayEffects(s, playedMap) {
    const rng = Data.makeRng((s.seed ^ (s.season * 7919) ^ (s.day * 1299721)) >>> 0);
    s.clubs.forEach((c, ci) => {
      const ids = playedMap[ci];
      if (ids) {
        const start = new Set(ids);
        c.players.forEach(p => {
          if (p.injuredFor > 0) { p.injuredFor--; p.injured = p.injuredFor > 0; }
          if (p.suspendedFor > 0) p.suspendedFor--;
          if (start.has(p.id)) {
            p.fit = clamp(p.fit - Data.ri(rng, 6, 14), 10, 100);
            if (rng() < 0.025) {
              p.injuredFor = Data.ri(rng, 2, 7); p.injured = true;
              if (c.isUser) s.notices.push('Injury: ' + fullName(p) + ' is out for ' + p.injuredFor + ' match(es).');
            }
          } else p.fit = clamp(p.fit + Data.ri(rng, 8, 16), 10, 100);
        });
      } else {
        c.players.forEach(p => { if (p.injuredFor > 0) { p.injuredFor--; p.injured = p.injuredFor > 0; } if (p.suspendedFor > 0) p.suspendedFor--; p.fit = clamp(p.fit + Data.ri(rng, 4, 10), 10, 100); });
      }
    });
  }

  /* ---- cups: knockout competitions (European ones are two-legged) ------ */
  const CUP_DEFS = [
    { id: 'fa', name: 'FA Cup', type: 'all' },
    { id: 'leaguecup', name: 'League Cup', type: 'all' },
    { id: 'champions', name: 'Champions League', type: 'euroC', twoLeg: true },
    { id: 'uefa', name: 'UEFA Cup', type: 'euroU', twoLeg: true }
  ];
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
  function buildCupRound(cup, clubIdxs, rng) {
    const list = shuffle(clubIdxs.slice(), rng), ties = [];
    for (let i = 0; i < list.length; i += 2) {
      if (i + 1 < list.length) ties.push({ home: list[i], away: list[i + 1], winner: null, pens: false });
      else ties.push({ home: list[i], away: -1, winner: list[i], pens: false }); // bye
    }
    cup.rounds.push({ name: cupRoundName(list.length, cup.rounds.length), ties: ties });
  }
  function initCup(def, participants, rng) {
    const cup = { id: def.id, name: def.name, type: def.type, twoLeg: !!def.twoLeg, participants: participants.slice(), rounds: [], winner: null, scorers: {}, totalRounds: Math.max(1, Math.ceil(Math.log2(participants.length))) };
    buildCupRound(cup, participants, rng);
    return cup;
  }
  function tallyCupScorers(cup, events, homeName, awayName) {
    if (!events) return;
    cup.scorers = cup.scorers || {};
    events.forEach(e => {
      const club = e.side === 'home' ? homeName : awayName, key = e.scorer + '|' + club;
      if (!cup.scorers[key]) cup.scorers[key] = { name: e.scorer, club: club, goals: 0 };
      cup.scorers[key].goals++;
    });
  }
  // a cup round is one or two "units" (legs); the final is always a single match
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
  function simulateCupLeg(s, cup, tie, leg, single, rng) {
    if (tie.away === -1) { tie.winner = tie.home; return; }
    const host = (!single && leg === 1) ? tie.away : tie.home;
    const visitor = (!single && leg === 1) ? tie.home : tie.away;
    const sim = simulateMatch(rng, clubRatings(s.clubs[host]), clubRatings(s.clubs[visitor]),
      playersByIds(s.clubs[host], bestXI(s.clubs[host]).xi), playersByIds(s.clubs[visitor], bestXI(s.clubs[visitor]).xi));
    recordLeg(tie, leg, single, sim.hg, sim.ag);
    tallyCupScorers(cup, sim.events, s.clubs[host].name, s.clubs[visitor].name);
  }
  // play one cup matchday (a leg). `userInfo` = {tie,hg,ag} for the user's own tie, else null.
  function playCupMatchday(s, comp, round, leg, userInfo) {
    const cup = s.cups[comp], rd = cup.rounds[round], played = {};
    if (!rd) return played;
    const single = isSingleLeg(cup, round);
    rd.ties.forEach(t => {
      if (t.away === -1) { t.winner = t.home; return; }
      if (userInfo && t === userInfo.tie) { recordLeg(t, leg, single, userInfo.hg, userInfo.ag); tallyCupScorers(cup, userInfo.events, userInfo.homeName, userInfo.awayName); }
      else {
        const rng = Data.makeRng((s.seed ^ (s.season * 5417) ^ hashId(comp) ^ (round * 999331) ^ (leg * 7) ^ (t.home * 131 + (t.away + 2) * 977)) >>> 0);
        simulateCupLeg(s, cup, t, leg, single, rng);
      }
      const host = (!single && leg === 1) ? t.away : t.home, vis = (!single && leg === 1) ? t.home : t.away;
      played[host] = bestXI(s.clubs[host]).xi; played[vis] = bestXI(s.clubs[vis]).xi;
    });
    if (single || leg === 1) {                                  // tie concludes on a single leg, or after the 2nd leg
      rd.ties.forEach(t => { if (t.away !== -1 && t.winner == null) finalizeTie(s, t, single); });
      if (cupRoundComplete(cup, round)) advanceCupAfterRound(s, cup, round);
    }
    return played;
  }
  function cupRoundComplete(cup, r) { return cup.rounds[r].ties.every(t => t.winner != null); }
  function advanceCupAfterRound(s, cup, r) {
    if (cup.winner != null) return;
    const winners = cup.rounds[r].ties.map(t => t.winner);
    if (winners.length === 1) { cup.winner = winners[0]; }
    else buildCupRound(cup, winners, Data.makeRng((s.seed ^ (s.season * 61) ^ hashId(cup.id) ^ (r * 7919)) >>> 0));
  }
  // European qualification = ENGLISH (pyramid) clubs only; foreign clubs are added in startSeasonCups
  // season 1: only the strongest PREMIER clubs go to Europe (no lower divisions)
  function seedEuroQual(s) {
    const prem = s.divisions[0].members.slice().sort((a, b) => clubOverall(s.clubs[b]) - clubOverall(s.clubs[a]));
    return { champions: prem.slice(0, 4), uefa: prem.slice(4, 12) };
  }
  // later seasons: top of the Premier qualify by position; FA & League Cup winners take UEFA spots
  function computeEuroQual(s, snaps) {
    const idxByName = {}; s.clubs.forEach((c, i) => { idxByName[c.name] = i; });
    const prem = snaps[0].map(r => idxByName[r.name]);
    const champions = prem.slice(0, 4);
    const champSet = new Set(champions);
    const uefa = [];
    prem.slice(4, 8).forEach(i => { if (!champSet.has(i)) uefa.push(i); });
    ['fa', 'leaguecup'].forEach(id => {                                  // domestic cup winners qualify
      const w = s.cups[id] && s.cups[id].winner;
      if (w != null && !champSet.has(w) && uefa.indexOf(w) < 0) uefa.push(w);
    });
    return { champions: champions, uefa: uefa };
  }
  function startSeasonCups(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 2246822519)) >>> 0);
    s.cups = {};
    const pyramid = s.clubs.map((_, i) => i).filter(i => s.clubs[i].division >= 0);
    const foreign = s.clubs.map((_, i) => i).filter(i => s.clubs[i].foreign)
      .sort((a, b) => clubOverall(s.clubs[b]) - clubOverall(s.clubs[a]));
    let fcur = 0;                                                        // cursor into the foreign pool (no overlap)
    const top64 = pyramid.slice().sort((a, b) => clubOverall(s.clubs[b]) - clubOverall(s.clubs[a])).slice(0, 64);
    if (top64.indexOf(s.userClub) < 0) top64[63] = s.userClub;          // the manager's club always plays
    CUP_DEFS.forEach(def => {
      let parts;
      if (def.type === 'all') parts = top64.slice();                    // FA / League Cup: 64 clubs -> bye-free bracket
      else {
        const eng = (def.type === 'euroC' ? s.euroQual.champions : s.euroQual.uefa) || [];
        const need = Math.max(0, 64 - eng.length);                      // 64-team knockout (Round of 64 -> Final)
        parts = eng.concat(foreign.slice(fcur, fcur + need)); fcur += need;
      }
      if (parts.length >= 2) s.cups[def.id] = initCup(def, parts, rng);
    });
    // one-off curtain-raisers from last season's winners (season 2 onwards)
    const pv = s.prev;
    if (pv) {
      if (pv.premChamp != null && pv.faCup != null) {
        const opp = pv.faCup !== pv.premChamp ? pv.faCup : pv.premRunnerUp;
        if (opp != null && opp !== pv.premChamp) s.cups.shield = initCup({ id: 'shield', name: 'Community Shield', type: 'oneoff' }, [pv.premChamp, opp], rng);
      }
      if (pv.ucl != null && pv.uefa != null && pv.ucl !== pv.uefa) {
        s.cups.supercup = initCup({ id: 'supercup', name: 'European Super Cup', type: 'oneoff' }, [pv.ucl, pv.uefa], rng);
      }
    }
    s.calendar = buildCalendar(s);
  }
  function buildCalendar(s) {
    const entries = [], L = totalRounds(s);
    for (let r = 0; r < L; r++) entries.push({ key: r * 1000, comp: 'league', round: r, leg: 0 });
    Object.keys(s.cups).forEach((id, ci) => {
      const cup = s.cups[id], units = cupUnits(cup), lastRound = cup.totalRounds - 1;
      if (cup.type === 'oneoff') {                  // Community Shield / Super Cup: curtain-raisers
        entries.push({ key: -2000 + ci, comp: id, round: 0, leg: 0 });
      } else if (cup.twoLeg) {                       // European cups: finals AFTER the league (UEFA, then Champions)
        units.forEach((u, k) => {
          if (u.round === lastRound) entries.push({ key: (L + (id === 'uefa' ? 1 : 2)) * 1000, comp: id, round: u.round, leg: 0 });
          else { const b = Math.min(L - 2, Math.floor((k + 1) * (L - 2) / units.length)); entries.push({ key: b * 1000 + 50 + ci * 8 + k, comp: id, round: u.round, leg: u.leg }); }
        });
      } else {                                       // national cups spread through the season
        units.forEach((u, k) => {
          const b = Math.min(L - 1, Math.floor((k + 1) * L / (units.length + 1)));
          entries.push({ key: b * 1000 + 50 + ci * 8 + k, comp: id, round: u.round, leg: u.leg });
        });
      }
    });
    entries.sort((a, b) => a.key - b.key);
    return entries.map(e => ({ comp: e.comp, round: e.round, leg: e.leg }));
  }
  // read-only views for the UI
  function cupsSummary(s) {
    return Object.keys(s.cups).map(id => {
      const c = s.cups[id];
      const live = c.rounds[c.rounds.length - 1];
      return { id: id, name: c.name, winner: c.winner != null ? s.clubs[c.winner].name : null, stage: c.winner != null ? 'Won' : (live ? live.name : '-'), inIt: c.winner == null && live ? live.ties.some(t => t.away !== -1 && t.winner == null && (t.home === s.userClub || t.away === s.userClub)) : false };
    });
  }
  function honours(s) { return s.honours; }
  // per-club tally of trophies won, summed by competition, across all seasons
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
      return Object.assign({ name: c.name, isUser: c.isUser, GD: row.F - row.A }, row);
    }).sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.F - a.F || a.name.localeCompare(b.name));
  }
  function leaguePosition(s, name, divIdx) {
    if (divIdx == null) divIdx = s.userDivision;
    return standings(s, divIdx).findIndex(r => r.name === name) + 1;
  }
  function topScorers(s, n, divIdx) {
    const list = divIdx == null ? s.clubs : s.divisions[divIdx].members.map(i => s.clubs[i]);
    const all = [];
    list.forEach(c => c.players.forEach(p => {
      if (p.goalsSeason > 0) all.push({ name: fullName(p), club: c.name, goals: p.goalsSeason, apps: p.appsSeason });
    }));
    all.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    return all.slice(0, n || 12);
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
    const games = dv.results.filter(r => r.round === round).map(r => ({
      home: s.clubs[r.home].name, away: s.clubs[r.away].name, hg: r.hg, ag: r.ag, scorers: r.scorers
    }));
    return { round, games };
  }

  /* ---- transfers ------------------------------------------------------- */
  const UNLISTED_PREMIUM = 1.6;   // cost to prise an unlisted player from his club
  function marketList(s, filters) {
    filters = filters || {};
    const allow = filters.pos || { G: true, D: true, M: true, A: true };
    const q = filters.search ? filters.search.toLowerCase() : null;
    const match = p => (!q || fullName(p).toLowerCase().indexOf(q) >= 0 || p.surname.toLowerCase().indexOf(q) >= 0)
      && allow[p.pos] && (filters.includeEuropean !== false || !p.european);
    const out = [];
    // free agents / players actively listed on the market
    s.transferPool.forEach(p => { if (match(p)) out.push(Object.assign({}, p, { price: p.value, source: 'pool', fromClub: p.club })); });
    // optionally, unlisted players at other clubs you can approach for a premium
    if (filters.includeUnlisted) {
      s.clubs.forEach((c, ci) => {
        if (ci === s.userClub) return;
        c.players.forEach(p => { if (match(p)) out.push(Object.assign({}, p, { price: Math.round(p.value * UNLISTED_PREMIUM), source: ci, fromClub: c.name })); });
      });
    }
    if (filters.sortBySkill !== false) out.sort((a, b) => b.skill - a.skill);
    else out.sort((a, b) => a.surname.localeCompare(b.surname));
    return out;
  }
  function addToUser(s, p) {
    p.club = user(s).name; p.appsSeason = 0; p.goalsSeason = 0; p.transferListed = false;
    user(s).players.push(p);
  }
  const MAX_SQUAD = 23;
  function bid(s, playerId) {
    if (user(s).players.length >= MAX_SQUAD) return { ok: false, msg: 'Squad is full (max ' + MAX_SQUAD + '). Sell a player first.' };
    // 1) on the open market
    const i = s.transferPool.findIndex(p => p.id === playerId);
    if (i >= 0) {
      const p = s.transferPool[i];
      if (user(s).balance < p.value) return { ok: false, msg: 'Insufficient funds for ' + fullName(p) + '.' };
      user(s).balance -= p.value; s.transferPool.splice(i, 1); addToUser(s, p);
      s.notices.push('Signed ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for £' + p.value.toLocaleString() + '.');
      return { ok: true, player: p, fee: p.value };
    }
    // 2) approach a club for an unlisted player
    for (let ci = 0; ci < s.clubs.length; ci++) {
      if (ci === s.userClub) continue;
      const c = s.clubs[ci], pi = c.players.findIndex(p => p.id === playerId);
      if (pi < 0) continue;
      const p = c.players[pi], fee = Math.round(p.value * UNLISTED_PREMIUM);
      if (c.players.length <= 14) return { ok: false, msg: c.name + " won't sell — their squad is too thin." };
      if (user(s).balance < fee) return { ok: false, msg: 'Need £' + fee.toLocaleString() + ' to prise ' + fullName(p) + ' from ' + c.name + '.' };
      user(s).balance -= fee; c.players.splice(pi, 1); addToUser(s, p);
      s.notices.push('Signed ' + fullName(p) + ' from ' + c.name + ' for £' + fee.toLocaleString() + '.');
      return { ok: true, player: p, fee: fee };
    }
    return { ok: false, msg: 'Player no longer available.' };
  }
  function signUnlisted(s, pos) {
    if (user(s).players.length >= MAX_SQUAD) return { ok: false, msg: 'Squad is full (max ' + MAX_SQUAD + ').' };
    const rng = Data.makeRng((Date.now() ^ s.transferPool.length) >>> 0);
    const p = Data.generatePlayer(rng, { pos: pos || Data.pick(rng, Data.POSITIONS), tier: Data.ri(rng, 2, 5) });
    const fee = Math.round(p.value * 0.6);
    if (user(s).balance < fee) return { ok: false, msg: 'Insufficient funds.' };
    user(s).balance -= fee; addToUser(s, p);
    s.notices.push('Signed unlisted player ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for £' + fee.toLocaleString() + '.');
    return { ok: true, player: p };
  }
  // selling is immediate: the player leaves at once and the fee is banked now
  function sellPlayer(s, playerId) {
    const club = user(s), i = club.players.findIndex(p => p.id === playerId);
    if (i < 0) return { ok: false, msg: 'Player not in your squad.' };
    if (club.players.length <= 12) return { ok: false, msg: 'You must keep at least 12 players.' };
    const p = club.players[i], fee = Math.round(p.value * 0.95);
    club.players.splice(i, 1); club.balance += fee;
    s.exPlayers.push(exRecord(s, p, 'Sold for £' + fee.toLocaleString()));
    p.club = '(free agent)'; p.transferListed = false; s.transferPool.push(p);
    s.notices.push('Sold ' + fullName(p) + ' for £' + fee.toLocaleString() + '.');
    return { ok: true, player: p, fee: fee };
  }
  function setTransferListed(s, playerId, listed) {
    const p = user(s).players.find(pl => pl.id === playerId);
    if (p) p.transferListed = !!listed;
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

  /* ---- keep the transfer market dynamic -------------------------------- */
  function refreshMarket(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 333667) ^ (s.day * 99989)) >>> 0);
    s.transferPool = s.transferPool.filter(() => rng() > 0.35);          // some move on
    const origins = Data.ENGLISH_CLUBS.concat(Data.EURO_CLUBS);
    const add = Data.ri(rng, 8, 16);
    for (let k = 0; k < add; k++) {                                       // fresh listings
      const p = Data.generatePlayer(rng, { tier: Data.ri(rng, 1, 5) });
      p.club = Data.pick(rng, origins); p.european = Data.EURO_CLUBS.indexOf(p.club) >= 0;
      s.transferPool.push(p);
    }
    s.transferPool.forEach(p => { if (rng() < 0.4) p.value = Math.round(p.value * (0.9 + rng() * 0.25)); });
  }

  /* ---- finances: loans, interest and forced sales ---------------------- */
  function loanCap(s) { return 1500000 + (s.divisions.length - 1 - s.userDivision) * 1500000; }
  function takeLoan(s, amount) {
    amount = Math.max(0, Math.round(amount || 0));
    if (amount <= 0) return { ok: false, msg: 'Enter an amount to borrow.' };
    if ((s.debt || 0) + amount > loanCap(s)) return { ok: false, msg: 'Your loan limit is £' + loanCap(s).toLocaleString() + '.' };
    s.debt = (s.debt || 0) + amount; user(s).balance += amount;
    return { ok: true, msg: 'Borrowed £' + amount.toLocaleString() + '. Debt is now £' + s.debt.toLocaleString() + '.' };
  }
  function repayLoan(s, amount) {
    amount = Math.max(0, Math.min(Math.round(amount || 0), s.debt || 0, user(s).balance));
    if (amount <= 0) return { ok: false, msg: 'Nothing to repay, or not enough cash.' };
    s.debt -= amount; user(s).balance -= amount;
    return { ok: true, msg: 'Repaid £' + amount.toLocaleString() + '. Debt is now £' + s.debt.toLocaleString() + '.' };
  }
  function applyFinances(s) {
    if (s.debt > 0) {                                                  // ~2% interest per week, added to the debt
      const interest = Math.max(1, Math.round(s.debt * 0.02));
      s.debt += interest;
      s.notices.push('Loan interest of £' + interest.toLocaleString() + ' added (debt £' + s.debt.toLocaleString() + ').');
    }
    if (user(s).balance < 0) {
      if (s.debtSince < 0) s.debtSince = s.day;
      if ((s.day - s.debtSince) >= 6 || user(s).balance < -250000) forcedSale(s);
    } else s.debtSince = -1;
  }
  function forcedSale(s) {
    const club = user(s);
    if (club.players.length <= 12) return;
    const p = club.players.slice().sort((a, b) => b.value - a.value)[0];
    const fee = Math.round(p.value * 0.9);
    club.players.splice(club.players.indexOf(p), 1); club.balance += fee;
    const repay = Math.min(s.debt || 0, fee); s.debt -= repay; club.balance -= repay;
    p.club = '(free agent)'; p.transferListed = false; s.transferPool.push(p);
    s.exPlayers.push(exRecord(s, p, 'Sold to cover debts'));
    s.notices.push('DEBT: forced to sell ' + fullName(p) + ' for £' + fee.toLocaleString() + ' to service the overdraft.');
    s.debtSince = user(s).balance < 0 ? s.day : -1;
  }
  function exRecord(s, p, reason) {
    return { forename: p.forename, surname: p.surname, pos: p.pos, skill: p.skill, age: p.age, appsTotal: p.appsTotal, goalsTotal: p.goalsTotal, reason: reason, season: s.season };
  }

  /* ---- head-to-head history ------------------------------------------- */
  function historyVs(s, oppName) { return (s.history || []).filter(h => h.oppName === oppName); }

  /* ---- post-matchday round-up (results of everything simulated) -------- */
  function pushRoundup(s, title, groups) { (s.roundup = s.roundup || []).push({ title: title, groups: groups }); }
  function leagueRoundup(s, round) {
    const out = [];
    s.divisions.forEach(dv => {
      const games = dv.results.filter(r => r.round === round).map(r => ({ home: s.clubs[r.home].name, away: s.clubs[r.away].name, score: r.hg + '-' + r.ag }));
      if (games.length) out.push({ group: dv.name, games: games });
    });
    return out;
  }
  // a readable score for a tie (single leg, or both legs + aggregate)
  function tieResultText(cup, ri, t) {
    if (t.away === -1) return { score: 'bye', agg: '' };
    if (isSingleLeg(cup, ri)) return { score: (t.hg != null ? t.hg + '-' + t.ag : ''), agg: '' };
    const l1 = t.l1h != null ? t.l1h + '-' + t.l1a : '–';
    const l2 = t.l2h != null ? t.l2h + '-' + t.l2a : '–';
    return { score: l1 + ' / ' + l2, agg: t.aggH != null ? 'agg ' + t.aggH + '-' + t.aggA : '' };
  }
  function cupRoundup(s, cup, r) {
    const rd = cup.rounds[r]; if (!rd) return [];
    return [{ group: cup.name + ' — ' + rd.name, games: rd.ties.filter(t => t.away !== -1).map(t => {
      const rt = tieResultText(cup, r, t);
      return { home: s.clubs[t.home].name, away: s.clubs[t.away].name, score: rt.score, agg: rt.agg,
        winner: t.winner != null ? s.clubs[t.winner].name : null, pens: !!t.pens };
    }) }];
  }

  /* ---- cup bracket (for the UI) --------------------------------------- */
  function cupIds(s) { return Object.keys(s.cups); }
  function cupBracket(s, id) {
    const cup = s.cups[id]; if (!cup) return null;
    return {
      id: id, name: cup.name, twoLeg: !!cup.twoLeg, winner: cup.winner != null ? s.clubs[cup.winner].name : null,
      rounds: cup.rounds.map((rd, ri) => ({ name: rd.name, ties: rd.ties.map(t => {
        const rt = tieResultText(cup, ri, t);
        return { home: s.clubs[t.home].name, away: t.away === -1 ? '(bye)' : s.clubs[t.away].name,
          score: rt.score, agg: rt.agg, winner: t.winner != null ? s.clubs[t.winner].name : null, pens: !!t.pens };
      }) }))
    };
  }

  /* ---- season rollover: honours, qualification, promotion & relegation -- */
  function endSeason(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 99991)) >>> 0);
    const numDiv = s.divisions.length;
    const snaps = s.divisions.map((_, d) => standings(s, d));
    const oldUserDiv = s.userDivision;
    const userPos = snaps[oldUserDiv].findIndex(r => r.isUser) + 1;

    // record the roll of honour for the finished season
    s.honours.push({
      season: s.season,
      divisions: snaps.map((st, d) => ({ name: s.divisions[d].name, first: st[0] && st[0].name, second: st[1] && st[1].name, third: st[2] && st[2].name })),
      cups: Object.keys(s.cups).map(id => ({ name: s.cups[id].name, winner: s.cups[id].winner != null ? s.clubs[s.cups[id].winner].name : '—' }))
    });
    // the manager's own career log
    const myTrophies = [];
    if (snaps[oldUserDiv][0] && snaps[oldUserDiv][0].isUser) myTrophies.push(s.divisions[oldUserDiv].name + ' title');
    Object.keys(s.cups).forEach(id => { if (s.cups[id].winner === s.userClub) myTrophies.push(s.cups[id].name); });
    s.career.push({ season: s.season, club: user(s).name, division: s.divisions[oldUserDiv].name, position: userPos, trophies: myTrophies });

    // next season's European qualification, from this season's standings
    s.euroQual = computeEuroQual(s, snaps);

    // remember last season's winners for the curtain-raisers (Shield / Super Cup)
    const idxByName = {}; s.clubs.forEach((c, i) => { idxByName[c.name] = i; });
    s.prev = {
      premChamp: snaps[0][0] ? idxByName[snaps[0][0].name] : null,
      premRunnerUp: snaps[0][1] ? idxByName[snaps[0][1].name] : null,
      faCup: s.cups.fa ? s.cups.fa.winner : null,
      ucl: s.cups.champions ? s.cups.champions.winner : null,
      uefa: s.cups.uefa ? s.cups.uefa.winner : null
    };

    // promotion / relegation
    const moves = [];
    for (let d = 0; d < numDiv - 1; d++) {
      snaps[d].slice(snaps[d].length - PROMOTED).forEach(r => moves.push({ name: r.name, to: d + 1 }));   // relegated
      snaps[d + 1].slice(0, PROMOTED).forEach(r => moves.push({ name: r.name, to: d }));                  // promoted
    }
    moves.forEach(m => { const ci = s.clubs.findIndex(c => c.name === m.name); if (ci >= 0) s.clubs[ci].division = m.to; });
    s.divisions.forEach((dv, d) => { dv.members = s.clubs.map((c, i) => (c.division === d ? i : -1)).filter(i => i >= 0); });
    s.userDivision = s.clubs[s.userClub].division;

    let msg = 'Season ' + s.season + ' over. ' + s.divisions[0].name + ' champions: ' + snaps[0][0].name + '. ';
    if (s.userDivision < oldUserDiv) msg += 'PROMOTED! ' + user(s).name + ' go up to ' + s.divisions[s.userDivision].name + '.';
    else if (s.userDivision > oldUserDiv) msg += user(s).name + ' relegated to ' + s.divisions[s.userDivision].name + '.';
    else msg += user(s).name + ' finished ' + ordinal(userPos) + ' in ' + s.divisions[oldUserDiv].name + '.';
    s.notices.push(msg);

    // reset for the new season
    s.season++; s.day = 0; s.trainedRound = -1;
    s.divisions.forEach(dv => { dv.table = blankTable(dv.members, s.clubs); dv.results = []; dv.fixtures = makeFixtures(dv.members, rng); });
    // a year passes: age everyone, retire the veterans, drift skills (very aleatory), regrow squads
    s.clubs.forEach(c => {
      const retained = [];
      c.players.forEach(p => {
        p.age = (p.age || 24) + 1;
        if (p.age >= (p.retireAge || 38)) {                       // retirement (35-40, per player)
          if (c.isUser) s.exPlayers.push(exRecord(s, p, 'Retired aged ' + p.age));
          return;
        }
        p.appsSeason = 0; p.goalsSeason = 0;
        // age bias plus a big random swing — form can rise or fall sharply year to year
        const bias = p.age <= 22 ? 2 : p.age <= 29 ? 0 : p.age <= 32 ? -2 : -4;
        p.skill = clamp((p.skill || 40) + bias + Data.ri(rng, -7, 7), 20, 99);
        Data.recomputeValue(p, rng);
        p.fit = clamp(85 + Data.ri(rng, 0, 15), 10, 100);
        p.injuredFor = rng() < 0.04 ? Data.ri(rng, 1, 4) : 0; p.injured = p.injuredFor > 0;
        retained.push(p);
      });
      c.players = retained;
      while (c.players.length < 18) {                              // promote youth to refill the squad
        const np = Data.generatePlayer(rng, { tier: c.tier || 3, age: Data.ri(rng, 17, 21) });
        np.club = c.name; c.players.push(np);
      }
    });
    refreshMarket(s);
    startSeasonCups(s);          // fresh cups + calendar for the new season
    s.selection = defaultSelection(s);
  }
  function ordinal(n) {
    const sfx = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
  }

  /* ---- save / load ----------------------------------------------------- */
  function serialize(s) { return JSON.stringify(s); }
  function deserialize(str) { return JSON.parse(str); }

  return {
    newGame, setUserClub, chooseClub, eligibleClubs, clubOverall, difficultyLabel, FORMATIONS,
    user, userDiv, totalRounds, userLeagueRounds, divisionRounds, numDivisions, divisionName, nextOpponent, defaultSelection, bestXI,
    availablePlayers, playersByIds, fullName,
    userRatings, clubRatings, ratingsFor, moraleOf,
    simulateMatch, playUserMatch, commitUserResult, prepareNextUserMatch,
    standings, leaguePosition, topScorers, topScorersForCup, lastRoundResults, cupsSummary, honours, honoursTally, cupIds, cupBracket, historyVs,
    marketList, bid, signUnlisted, setTransferListed, sellPlayer, train, refreshMarket,
    takeLoan, repayLoan, loanCap,
    serialize, deserialize, ordinal
  };
});
