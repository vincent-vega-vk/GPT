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
    const per = Data.CLUBS_PER_DIVISION;
    const defs = Data.DIVISION_DEFS;
    const clubs = [], divisions = [];

    defs.forEach((dd, d) => {
      const members = [];
      for (let k = 0; k < per; k++) {
        let name, tier;
        if (d === defs.length - 1) {                 // bottom division = Conference list
          const cd = Data.CONFERENCE[k]; name = cd.name; tier = cd.tier;
        } else {
          name = Data.UPPER_CLUBS[d * per + k];
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
      seed, season: 1, round: 0,
      clubs, divisions,
      userClub: 0, userDivision: defs.length - 1,
      managerRating: 50, transferPool,
      lastResult: null, notices: [], selection: null
    };
    const bottomFirst = (defs.length - 1) * per;       // Romford
    setUserClub(state, userIndex == null ? bottomFirst : userIndex);
    return state;
  }

  const user = s => s.clubs[s.userClub];
  const userDiv = s => s.divisions[s.userDivision];
  const totalRounds = () => (Data.CLUBS_PER_DIVISION - 1) * 2;
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

  /* ---- selection ------------------------------------------------------- */
  function isFit(p) { return (!p.injuredFor || p.injuredFor <= 0) && p.fit > 0; }
  function availablePlayers(club) { return club.players.filter(isFit); }
  function byPos(players, pos) { return players.filter(p => p.pos === pos).sort((a, b) => b.skill - a.skill); }
  function bestXI(club) {
    // never field fewer than 11: if injuries/fatigue bite, fall back to the whole squad
    let a = availablePlayers(club);
    if (a.length < 11) a = club.players.slice();
    const xi = [].concat(byPos(a, 'G').slice(0, 1), byPos(a, 'D').slice(0, 4), byPos(a, 'M').slice(0, 4), byPos(a, 'A').slice(0, 2));
    // top up to 11 from whoever is left (covers thin positions)
    const ids = new Set(xi.map(p => p.id));
    a.slice().sort((x, y) => y.skill - x.skill).forEach(p => { if (xi.length < 11 && !ids.has(p.id)) { xi.push(p); ids.add(p.id); } });
    const subs = a.filter(p => !ids.has(p.id)).sort((x, y) => y.skill - x.skill).slice(0, 5);
    return { xi: xi.map(p => p.id), subs: subs.map(p => p.id) };
  }
  function defaultSelection(s) {
    const opp = nextOpponent(s);
    const best = bestXI(user(s));
    return { xi: best.xi, subs: best.subs, home: opp ? opp.home : true };
  }
  function nextOpponent(s) {
    const dv = userDiv(s);
    const fx = dv.fixtures.find(f => f.round === s.round && (f.home === s.userClub || f.away === s.userClub));
    if (!fx) return null;
    const home = fx.home === s.userClub;
    return { club: s.clubs[home ? fx.away : fx.home], home, fixture: fx, division: s.userDivision };
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
    const rng = Data.makeRng((s.seed ^ (s.season * 131071) ^ (s.round * 2654435761)) >>> 0);
    const uClub = user(s);
    const uPlayers = playersByIds(uClub, s.selection.xi);
    const uRat = ratingsFor(uPlayers, moraleOf(s, uClub));
    const oRat = clubRatings(opp.club);
    const oPlayers = playersByIds(opp.club, bestXI(opp.club).xi);
    const home = opp.home;
    const sim = home ? simulateMatch(rng, uRat, oRat, uPlayers, oPlayers)
                     : simulateMatch(rng, oRat, uRat, oPlayers, uPlayers);
    return {
      fixture: opp.fixture, home, opponent: opp.club,
      homeName: home ? uClub.name : opp.club.name,
      awayName: home ? opp.club.name : uClub.name,
      userPlayers: uPlayers, oppPlayers: oPlayers,
      hg: sim.hg, ag: sim.ag, events: sim.events
    };
  }

  /* ---- commit the user's match and simulate the rest of the round ------ */
  function commitUserResult(s, match) {
    applyResult(s, s.userDivision, match.fixture, match.hg, match.ag, match.events);
    creditApps(user(s), s.selection.xi);

    // simulate every other fixture in this round, across all divisions
    s.divisions.forEach((dv, d) => {
      dv.fixtures.filter(f => f.round === s.round && !(d === s.userDivision && f === match.fixture)).forEach(f => {
        const rng = Data.makeRng((s.seed ^ (s.season * 7727) ^ (s.round * 40503) ^ (d * 7919) ^ (f.home * 131 + f.away * 977)) >>> 0);
        const hr = clubRatings(s.clubs[f.home]), ar = clubRatings(s.clubs[f.away]);
        const hp = playersByIds(s.clubs[f.home], bestXI(s.clubs[f.home]).xi);
        const ap = playersByIds(s.clubs[f.away], bestXI(s.clubs[f.away]).xi);
        const sim = simulateMatch(rng, hr, ar, hp, ap);
        applyResult(s, d, f, sim.hg, sim.ag, sim.events);
      });
    });

    // manager rating from the user's position in their division
    const uHome = match.fixture.home === s.userClub;
    const ug = uHome ? match.hg : match.ag, og = uHome ? match.ag : match.hg;
    const pos = leaguePosition(s, user(s).name);
    const posTarget = 25 + 60 * (1 - (pos - 1) / (userDiv(s).members.length - 1));
    const target = posTarget + (ug > og ? 8 : ug === og ? 0 : -8);
    s.managerRating = Math.round(clamp(s.managerRating * 0.7 + clamp(target, 5, 99) * 0.3, 1, 99));

    // gate receipts (home), scaled by division level
    if (uHome) {
      const mult = 1 + (s.divisions.length - 1 - s.userDivision) * 0.7;
      user(s).balance += Math.round(Data.ri(Data.makeRng((s.seed ^ s.round) >>> 0), 8000, 22000) * mult);
    }

    // fitness drain / recovery + injuries for every club this matchday
    applyMatchdayEffects(s, s.selection.xi);

    s.lastResult = {
      division: userDiv(s).name, homeName: match.homeName, awayName: match.awayName,
      hg: match.hg, ag: match.ag,
      scorers: match.events.map(e => ({ side: e.side, name: e.scorer, minute: e.minute }))
    };

    s.round++;
    if (s.round >= totalRounds()) endSeason(s);
    else {
      s.selection = defaultSelection(s);
      if (s.round % 5 === 0) refreshMarket(s);   // keep the market moving through the season
    }
    return s.lastResult;
  }

  /* ---- per-matchday fitness & injuries (all clubs) --------------------- */
  function applyMatchdayEffects(s, userXiIds) {
    const rng = Data.makeRng((s.seed ^ (s.season * 7919) ^ (s.round * 1299721)) >>> 0);
    const userStart = new Set(userXiIds || []);
    s.clubs.forEach(c => {
      const start = c.isUser ? userStart : new Set(bestXI(c).xi);
      c.players.forEach(p => {
        if (p.injuredFor > 0) { p.injuredFor--; p.injured = p.injuredFor > 0; }
        if (start.has(p.id)) {
          p.fit = clamp(p.fit - Data.ri(rng, 6, 14), 10, 100);
          if (rng() < 0.025) {
            p.injuredFor = Data.ri(rng, 2, 7); p.injured = true;
            if (c.isUser) s.notices.push('Injury: ' + fullName(p) + ' is out for ' + p.injuredFor + ' match(es).');
          }
        } else {
          p.fit = clamp(p.fit + Data.ri(rng, 8, 16), 10, 100);
        }
      });
    });
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
  function bid(s, playerId) {
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
    if (s.trainedRound === s.round && s.trainedSeason === s.season) return { ok: false, msg: 'Your squad has already trained this week.' };
    s.trainedRound = s.round; s.trainedSeason = s.season;
    const rng = Data.makeRng((s.seed ^ s.round ^ (s.season * 5147)) >>> 0);
    let improved = 0;
    user(s).players.forEach(p => {
      p.fit = clamp(p.fit + Data.ri(rng, 5, 12), 10, 100);
      if (p.age <= 23 && rng() < 0.07 && p.skill < 99) { p.skill++; Data.recomputeValue(p, rng); improved++; }
    });
    return { ok: true, improved: improved };
  }

  /* ---- keep the transfer market dynamic -------------------------------- */
  function refreshMarket(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 333667) ^ (s.round * 99989)) >>> 0);
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

  /* ---- season rollover: promotion & relegation ------------------------- */
  function endSeason(s) {
    const rng = Data.makeRng((s.seed ^ (s.season * 99991)) >>> 0);
    const numDiv = s.divisions.length;
    const snaps = s.divisions.map((_, d) => standings(s, d));
    const oldUserDiv = s.userDivision;
    const userPos = snaps[oldUserDiv].findIndex(r => r.isUser) + 1;

    // decide movements based on the season just finished
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
    s.season++; s.round = 0; s.trainedRound = -1;
    s.divisions.forEach(dv => { dv.table = blankTable(dv.members, s.clubs); dv.results = []; dv.fixtures = makeFixtures(dv.members, rng); });
    // a year passes: players age and their skill drifts up or down (often barely)
    s.clubs.forEach(c => c.players.forEach(p => {
      p.appsSeason = 0; p.goalsSeason = 0;
      p.age = (p.age || 24) + 1;
      let drift;
      if (p.age <= 23) drift = Data.ri(rng, -1, 4);
      else if (p.age <= 29) drift = Data.ri(rng, -2, 3);
      else if (p.age <= 32) drift = Data.ri(rng, -4, 1);
      else drift = Data.ri(rng, -6, 0);
      p.skill = clamp((p.skill || 40) + drift, 20, 99);
      Data.recomputeValue(p, rng);
      p.fit = clamp(85 + Data.ri(rng, 0, 15), 10, 100);
      p.injuredFor = rng() < 0.04 ? Data.ri(rng, 1, 4) : 0; p.injured = p.injuredFor > 0;
    }));
    refreshMarket(s);
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
    newGame, setUserClub, clubOverall, difficultyLabel,
    user, userDiv, totalRounds, numDivisions, divisionName, nextOpponent, defaultSelection, bestXI,
    availablePlayers, playersByIds, fullName,
    userRatings, clubRatings, ratingsFor, moraleOf,
    simulateMatch, playUserMatch, commitUserResult,
    standings, leaguePosition, topScorers, lastRoundResults,
    marketList, bid, signUnlisted, setTransferListed, sellPlayer, train, refreshMarket,
    serialize, deserialize, ordinal
  };
});
