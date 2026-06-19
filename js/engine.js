/*
 * SIMSOC 6 (remake) - game engine
 * Pure game logic: league + fixtures, team strength, match simulation,
 * transfers, manager rating and the season loop. No DOM in here so it can
 * be exercised head-less by the Node test harness.
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

  /* ---- fixtures: double round-robin (circle method) -------------------- */
  function makeFixtures(n, rng) {
    const teams = [];
    for (let i = 0; i < n; i++) teams.push(i);
    if (n % 2) teams.push(-1); // bye marker (n is even here, but be safe)
    const m = teams.length, half = m / 2, rounds = [];
    let arr = teams.slice();
    for (let r = 0; r < m - 1; r++) {
      const games = [];
      for (let i = 0; i < half; i++) {
        const a = arr[i], b = arr[m - 1 - i];
        if (a !== -1 && b !== -1) games.push(r % 2 ? { home: a, away: b } : { home: b, away: a });
      }
      rounds.push(games);
      arr = [arr[0]].concat([arr[m - 1]]).concat(arr.slice(1, m - 1)); // rotate
    }
    // second half: reverse venues
    const second = rounds.map(games => games.map(g => ({ home: g.away, away: g.home })));
    const all = rounds.concat(second);
    // flatten into rounds, tagging round number; shuffle game order within round
    const fixtures = [];
    all.forEach((games, idx) => {
      games.forEach(g => fixtures.push({ round: idx, home: g.home, away: g.away }));
    });
    return fixtures;
  }

  function blankRow() { return { P: 0, W: 0, D: 0, L: 0, F: 0, A: 0, Pts: 0 }; }

  /* ---- new game -------------------------------------------------------- *
   * `userIndex` selects which Conference club the player manages (default 0 =
   * Romford). Use setUserClub() to change it later (e.g. from the chooser).
   */
  function newGame(seed, userIndex) {
    seed = seed >>> 0 || 12345;
    const rng = Data.makeRng(seed);

    const clubs = Data.CONFERENCE.map(def => Data.generateClub(rng, def));

    const table = {};
    clubs.forEach(c => { table[c.name] = blankRow(); });

    // open transfer market: players from a broad pool of other clubs
    const transferPool = [];
    const addFrom = (clubName, euro, count) => {
      for (let k = 0; k < count; k++) {
        const tier = Data.ri(rng, 1, 5);
        const p = Data.generatePlayer(rng, { tier });
        p.club = clubName; p.european = euro;
        transferPool.push(p);
      }
    };
    Data.ENGLISH_CLUBS.forEach(c => addFrom(c, false, Data.ri(rng, 3, 6)));
    Data.EURO_CLUBS.forEach(c => addFrom(c, true, Data.ri(rng, 2, 4)));

    const state = {
      seed,
      season: 1,
      round: 0,                  // index of the fixture round about to be played
      clubs,
      userIndex,
      fixtures: makeFixtures(clubs.length, rng),
      table,
      results: [],
      managerRating: 50,
      transferPool,
      lastResult: null,
      notices: [],
      selection: null
    };
    setUserClub(state, userIndex == null ? 0 : userIndex);
    return state;
  }

  /* ---- choose / change the managed club -------------------------------- */
  function setUserClub(s, index) {
    index = Math.max(0, Math.min(s.clubs.length - 1, index | 0));
    s.clubs.forEach((c, i) => { c.isUser = (i === index); });
    s.userIndex = index;
    s.managerRating = 50;
    s.selection = defaultSelection(s);
    return s;
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

  const user = s => s.clubs[s.userIndex];
  const totalRounds = s => (s.clubs.length - 1) * 2;

  /* ---- selection ------------------------------------------------------- */
  function availablePlayers(club) {
    return club.players.filter(p => !p.injured && p.fit > 0);
  }
  function byPos(players, pos) {
    return players.filter(p => p.pos === pos).sort((a, b) => b.skill - a.skill);
  }
  // best XI in a 1-4-4-2 shape, with up to 5 subs
  function bestXI(club) {
    const a = availablePlayers(club);
    const xi = [].concat(
      byPos(a, 'G').slice(0, 1),
      byPos(a, 'D').slice(0, 4),
      byPos(a, 'M').slice(0, 4),
      byPos(a, 'A').slice(0, 2)
    );
    const xiIds = new Set(xi.map(p => p.id));
    const subs = a.filter(p => !xiIds.has(p.id)).sort((x, y) => y.skill - x.skill).slice(0, 5);
    return { xi: xi.map(p => p.id), subs: subs.map(p => p.id) };
  }
  function defaultSelection(s) {
    const fx = s.fixtures.find(f => f.round === s.round && (f.home === s.userIndex || f.away === s.userIndex));
    const best = bestXI(user(s));
    return { xi: best.xi, subs: best.subs, home: fx ? fx.home === s.userIndex : true };
  }
  function nextOpponent(s) {
    const fx = s.fixtures.find(f => f.round === s.round && (f.home === s.userIndex || f.away === s.userIndex));
    if (!fx) return null;
    const home = fx.home === s.userIndex;
    return { club: s.clubs[home ? fx.away : fx.home], home, fixture: fx };
  }

  /* ---- team strength --------------------------------------------------- */
  function unit(players, posList) {
    const ps = players.filter(p => posList.indexOf(p.pos) >= 0);
    if (!ps.length) return 0;
    let s = 0;
    ps.forEach(p => { s += p.skill * (0.55 + 0.45 * p.fit / 100); });
    return s / ps.length;
  }
  // ratings (0..~99) for a given set of player objects
  function ratingsFor(players, morale) {
    const def = unit(players, ['G', 'D']);
    const mid = unit(players, ['M']);
    const att = unit(players, ['A']);
    return {
      defence: Math.round(def),
      midfield: Math.round(mid),
      attack: Math.round(att),
      morale: Math.round(morale == null ? 45 : morale)
    };
  }
  function playersByIds(club, ids) {
    const map = {}; club.players.forEach(p => { map[p.id] = p; });
    return ids.map(id => map[id]).filter(Boolean);
  }
  function userRatings(s) {
    const sel = s.selection;
    return ratingsFor(playersByIds(user(s), sel.xi), moraleOf(s, user(s)));
  }
  function clubRatings(club) {
    const best = bestXI(club);
    return ratingsFor(playersByIds(club, best.xi), null);
  }
  // morale from recent form of a club
  function moraleOf(s, club) {
    const recent = s.results.filter(r => r.home === idx(s, club) || r.away === idx(s, club)).slice(-5);
    if (!recent.length) return 45;
    let pts = 0;
    recent.forEach(r => {
      const home = r.home === idx(s, club);
      const gf = home ? r.hg : r.ag, ga = home ? r.ag : r.hg;
      pts += gf > ga ? 3 : gf === ga ? 1 : 0;
    });
    return clamp(30 + (pts / (recent.length * 3)) * 55, 22, 92);
  }
  function idx(s, club) { return s.clubs.indexOf(club); }

  /* ---- poisson sampling with seeded rng -------------------------------- */
  function poisson(rng, lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  function weightedScorer(rng, players) {
    const w = { A: 1.0, M: 0.55, D: 0.18, G: 0.02 };
    const weights = players.map(p => Math.max(0.01, p.skill) * w[p.pos]);
    let tot = weights.reduce((a, b) => a + b, 0);
    let r = rng() * tot;
    for (let i = 0; i < players.length; i++) { r -= weights[i]; if (r <= 0) return players[i]; }
    return players[players.length - 1];
  }

  /* ---- simulate one match ---------------------------------------------- *
   * homeRat / awayRat are {defence,midfield,attack,morale}.
   * homePlayers / awayPlayers are the on-pitch players (for scorers & names).
   */
  function simulateMatch(rng, homeRat, awayRat, homePlayers, awayPlayers) {
    const hOff = homeRat.attack * 0.7 + homeRat.midfield * 0.3 + homeRat.morale * 0.08;
    const aOff = awayRat.attack * 0.7 + awayRat.midfield * 0.3 + awayRat.morale * 0.08;
    const hDef = homeRat.defence * 0.7 + homeRat.midfield * 0.3 + 6;
    const aDef = awayRat.defence * 0.7 + awayRat.midfield * 0.3 + 6;

    const lambdaH = clamp(1.35 * (hOff / aDef) * 1.18, 0.12, 5.5); // 1.18 home advantage
    const lambdaA = clamp(1.35 * (aOff / hDef) * 0.92, 0.12, 5.5);

    let hg = poisson(rng, lambdaH);
    let ag = poisson(rng, lambdaA);
    hg = clamp(hg, 0, 9); ag = clamp(ag, 0, 9);

    const events = [];
    const used = {};
    function addGoals(n, side, players) {
      for (let i = 0; i < n; i++) {
        let minute;
        do { minute = Data.ri(rng, 1, 90); } while (used[minute]);
        used[minute] = true;
        const scorer = weightedScorer(rng, players.length ? players : [{ pos: 'A', skill: 1, forename: 'Unknown', surname: '' }]);
        events.push({ minute, side, scorerId: scorer.id, scorer: fullName(scorer), pos: scorer.pos });
      }
    }
    addGoals(hg, 'home', homePlayers);
    addGoals(ag, 'away', awayPlayers);
    events.sort((a, b) => a.minute - b.minute);
    return { hg, ag, events };
  }

  /* ---- apply a result to the table / stats ----------------------------- */
  function applyResult(s, fx, hg, ag, events) {
    const homeClub = s.clubs[fx.home], awayClub = s.clubs[fx.away];
    const th = s.table[homeClub.name], ta = s.table[awayClub.name];
    th.P++; ta.P++; th.F += hg; th.A += ag; ta.F += ag; ta.A += hg;
    if (hg > ag) { th.W++; ta.L++; th.Pts += 3; }
    else if (hg < ag) { ta.W++; th.L++; ta.Pts += 3; }
    else { th.D++; ta.D++; th.Pts++; ta.Pts++; }

    // scorer goals (league-wide top scorers)
    events.forEach(e => {
      const club = e.side === 'home' ? homeClub : awayClub;
      const p = club.players.find(pl => pl.id === e.scorerId);
      if (p) { p.goalsSeason++; p.goalsTotal++; }
    });
    s.results.push({ round: fx.round, home: fx.home, away: fx.away, hg, ag });
  }

  // appearances for a club's on-pitch XI
  function creditApps(club, ids) {
    ids.forEach(id => {
      const p = club.players.find(pl => pl.id === id);
      if (p) { p.appsSeason++; p.appsTotal++; }
    });
  }

  /* ---- play the user's match (called after selection) ------------------ *
   * Returns the match object used to drive the animation; does NOT yet
   * advance the rest of the league (call commitUserResult to finish).
   */
  function playUserMatch(s) {
    const opp = nextOpponent(s);
    if (!opp) return null;
    const rng = Data.makeRng((s.seed ^ (s.round * 2654435761)) >>> 0);
    const uClub = user(s);
    const uPlayers = playersByIds(uClub, s.selection.xi);
    const uRat = ratingsFor(uPlayers, moraleOf(s, uClub));
    const oRat = clubRatings(opp.club);
    const oBest = bestXI(opp.club);
    const oPlayers = playersByIds(opp.club, oBest.xi);

    const home = opp.home;
    const sim = home
      ? simulateMatch(rng, uRat, oRat, uPlayers, oPlayers)
      : simulateMatch(rng, oRat, uRat, oPlayers, uPlayers);

    return {
      fixture: opp.fixture,
      home, opponent: opp.club,
      homeName: home ? uClub.name : opp.club.name,
      awayName: home ? opp.club.name : uClub.name,
      userPlayers: uPlayers, oppPlayers: oPlayers,
      hg: sim.hg, ag: sim.ag, events: sim.events
    };
  }

  /* ---- commit the user's match and simulate the rest of the round ------ */
  function commitUserResult(s, match) {
    const fx = match.fixture;
    applyResult(s, fx, match.hg, match.ag, match.events);
    creditApps(user(s), s.selection.xi);

    // simulate every other fixture in this round
    s.fixtures.filter(f => f.round === s.round && f !== fx).forEach(f => {
      const rng = Data.makeRng((s.seed ^ (s.round * 40503) ^ (f.home * 131 + f.away * 977)) >>> 0);
      const hr = clubRatings(s.clubs[f.home]), ar = clubRatings(s.clubs[f.away]);
      const hp = playersByIds(s.clubs[f.home], bestXI(s.clubs[f.home]).xi);
      const ap = playersByIds(s.clubs[f.away], bestXI(s.clubs[f.away]).xi);
      const sim = simulateMatch(rng, hr, ar, hp, ap);
      applyResult(s, f, sim.hg, sim.ag, sim.events);
    });

    // user result vs expectation -> manager rating
    const uHome = fx.home === s.userIndex;
    const ug = uHome ? match.hg : match.ag, og = uHome ? match.ag : match.hg;
    const pos = leaguePosition(s, user(s).name);
    const posTarget = 25 + 60 * (1 - (pos - 1) / (s.clubs.length - 1));
    let target = posTarget + (ug > og ? 8 : ug === og ? 0 : -8);
    s.managerRating = Math.round(clamp(s.managerRating * 0.7 + clamp(target, 5, 99) * 0.3, 1, 99));

    // gate receipts for the user when at home
    if (uHome) user(s).balance += Data.ri(Data.makeRng((s.seed ^ s.round) >>> 0), 8000, 22000);

    // process the user's transfer-listed players (someone may buy them)
    sellListed(s);

    s.lastResult = {
      homeName: match.homeName, awayName: match.awayName, hg: match.hg, ag: match.ag,
      scorers: match.events.map(e => ({ side: e.side, name: e.scorer, minute: e.minute }))
    };

    s.round++;
    if (s.round >= totalRounds(s)) endSeason(s);
    else s.selection = defaultSelection(s);
    return s.lastResult;
  }

  /* ---- league table helpers ------------------------------------------- */
  function standings(s) {
    return s.clubs.map(c => Object.assign({ name: c.name, isUser: c.isUser, GD: s.table[c.name].F - s.table[c.name].A }, s.table[c.name]))
      .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.F - a.F || a.name.localeCompare(b.name));
  }
  function leaguePosition(s, name) {
    return standings(s).findIndex(r => r.name === name) + 1;
  }
  function topScorers(s, n) {
    const all = [];
    s.clubs.forEach(c => c.players.forEach(p => {
      if (p.goalsSeason > 0) all.push({ name: fullName(p), club: c.name, goals: p.goalsSeason, apps: p.appsSeason });
    }));
    all.sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
    return all.slice(0, n || 12);
  }

  /* ---- transfers ------------------------------------------------------- */
  function marketList(s, filters) {
    filters = filters || {};
    let list = s.transferPool.slice();
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => fullName(p).toLowerCase().indexOf(q) >= 0 || p.surname.toLowerCase().indexOf(q) >= 0);
    }
    const allow = filters.pos || { G: true, D: true, M: true, A: true };
    list = list.filter(p => allow[p.pos]);
    if (filters.includeEuropean === false) list = list.filter(p => !p.european);
    if (filters.sortBySkill !== false) list.sort((a, b) => b.skill - a.skill);
    else list.sort((a, b) => a.surname.localeCompare(b.surname));
    return list;
  }
  function bid(s, playerId) {
    const i = s.transferPool.findIndex(p => p.id === playerId);
    if (i < 0) return { ok: false, msg: 'Player no longer available.' };
    const p = s.transferPool[i];
    if (user(s).balance < p.value) return { ok: false, msg: 'Insufficient funds for ' + fullName(p) + '.' };
    user(s).balance -= p.value;
    s.transferPool.splice(i, 1);
    p.club = user(s).name; p.appsSeason = 0; p.goalsSeason = 0; p.transferListed = false;
    user(s).players.push(p);
    s.notices.push('Signed ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for £' + p.value.toLocaleString() + '.');
    return { ok: true, player: p };
  }
  function signUnlisted(s, pos) {
    const rng = Data.makeRng((Date.now() ^ s.transferPool.length) >>> 0);
    const p = Data.generatePlayer(rng, { pos: pos || Data.pick(rng, Data.POSITIONS), tier: Data.ri(rng, 2, 5) });
    const fee = Math.round(p.value * 0.6);
    if (user(s).balance < fee) return { ok: false, msg: 'Insufficient funds.' };
    user(s).balance -= fee;
    p.club = user(s).name;
    user(s).players.push(p);
    s.notices.push('Signed unlisted player ' + fullName(p) + ' (' + p.pos + ', skill ' + p.skill + ') for £' + fee.toLocaleString() + '.');
    return { ok: true, player: p };
  }
  function setTransferListed(s, playerId, listed) {
    const p = user(s).players.find(pl => pl.id === playerId);
    if (p) p.transferListed = !!listed;
  }
  function sellListed(s) {
    const rng = Data.makeRng((s.seed ^ s.round ^ 7919) >>> 0);
    const keep = [];
    user(s).players.forEach(p => {
      if (p.transferListed && user(s).players.length - (user(s).players.length - keep.length) > 11 && rng() < 0.85) {
        // a club buys him for ~ his value
        const fee = Math.round(p.value * (0.85 + rng() * 0.3));
        user(s).balance += fee;
        s.notices.push('Sold ' + fullName(p) + ' for £' + fee.toLocaleString() + '.');
      } else {
        keep.push(p);
      }
    });
    user(s).players = keep.length >= 11 ? keep : user(s).players; // never drop below a fieldable squad
  }

  /* ---- season rollover ------------------------------------------------- */
  function endSeason(s) {
    const final = standings(s);
    const champ = final[0];
    s.notices.push('Season ' + s.season + ' complete. Champions: ' + champ.name + '. You finished ' +
      ordinal(leaguePosition(s, user(s).name)) + '.');
    // reset for a new season
    s.season++;
    s.round = 0;
    s.results = [];
    s.clubs.forEach(c => {
      s.table[c.name] = blankRow();
      c.players.forEach(p => {
        p.appsSeason = 0; p.goalsSeason = 0;
        p.fit = Math.min(100, p.fit + Data.ri(Data.makeRng((s.seed ^ p.id) >>> 0), 0, 20));
        // slight skill drift with experience/age
      });
    });
    s.fixtures = makeFixtures(s.clubs.length, Data.makeRng((s.seed ^ (s.season * 99991)) >>> 0));
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
    user, totalRounds, nextOpponent, defaultSelection, bestXI,
    availablePlayers, playersByIds, fullName,
    userRatings, clubRatings, ratingsFor, moraleOf,
    simulateMatch, playUserMatch, commitUserResult,
    standings, leaguePosition, topScorers,
    marketList, bid, signUnlisted, setTransferListed,
    serialize, deserialize, ordinal
  };
});
