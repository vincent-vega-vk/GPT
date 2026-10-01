/*
 * Head-less self-test for the SIMSOC 6 remake engine.
 * Exercises the division pyramid, a full season, promotion/relegation, table
 * maths, transfers and save/load so we know the game logic runs without a browser.
 */
const E = require('../js/engine');

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra && !ok ? '  -> ' + extra : ''));
  if (!ok) failures++;
}
function section(t) { console.log('\n' + t); }
// play one user matchday (auto-skips cup days the user isn't in); returns its result
function step(s) {
  E.prepareNextUserMatch(s);
  const m = E.playUserMatch(s);
  if (!m) return null;
  const res = E.commitUserResult(s, m);
  return { comp: m.comp, hg: m.hg, ag: m.ag, res: res };
}

/* ---- new game -------------------------------------------------------- */
section('New game');
const s = E.newGame(20259);
const pyramid = s.clubs.filter(c => c.division >= 0 && s.divisions[c.division].nation === 'ENG');
check('86 clubs across the English pyramid', pyramid.length === 86, pyramid.length);
check('Premier Division has 20 clubs', s.divisions[0].members.length === 20, s.divisions[0].members.length);
check('lower English divisions have 22 clubs', s.divisions.slice(1, 4).every(d => d.members.length === 22));
check('foreign clubs exist for Europe', s.clubs.some(c => c.foreign), s.clubs.length);
check('England has 4 divisions', s.divisions.filter(d => d.nation === 'ENG').length === 4);
check('12 leagues across 8 nations', s.divisions.length === 12 && new Set(s.divisions.map(d => d.nation)).size === 8, s.divisions.length);
check('user club is Romford', E.user(s).name === 'Romford', E.user(s).name);
check('user starts in the Conference (bottom)', s.userDivision === 3 && s.divisions[3].name === 'Conference');
check('user starts with a balance', E.user(s).balance > 0, E.user(s).balance);
const udv = s.divisions[s.userDivision];
check('division fixtures = clubs*(clubs-1)', udv.fixtures.length === 22 * 21, udv.fixtures.length);
check('transfer market populated', s.transferPool.length > 50, s.transferPool.length);
check('default selection has 11 starters', s.selection.xi.length === 11, s.selection.xi.length);
check('default selection has subs', s.selection.subs.length >= 1, s.selection.subs.length);

// every club in the division plays each other exactly once home & once away
let venueOk = true;
udv.members.forEach(i => udv.members.forEach(j => {
  if (i === j) return;
  if (udv.fixtures.filter(f => f.home === i && f.away === j).length !== 1) venueOk = false;
}));
check('balanced home/away schedule', venueOk);
check('cups built (FA, League + European)', !!s.cups.fa && !!s.cups.leaguecup && Object.keys(s.cups).length >= 2, Object.keys(s.cups).join(','));
check('season calendar interleaves cups', s.calendar.length > 42, s.calendar.length);
check('calendar opens on a league day', s.season === 1 && s.day === 0 && s.calendar[0].comp === 'league');

/* ---- ratings --------------------------------------------------------- */
section('Team ratings');
const r = E.userRatings(s);
check('defence rating in range', r.defence > 0 && r.defence < 100, r.defence);
check('attack rating in range', r.attack > 0 && r.attack < 100, r.attack);
check('morale rating in range', r.morale > 0 && r.morale < 100, r.morale);

/* ---- transfers ------------------------------------------------------- */
section('Transfers');
const before = E.user(s).players.length;
const balBefore = E.user(s).balance;
const list = E.marketList(s, { sortBySkill: true });
check('market list sorted by skill', list.length > 1 && list[0].skill >= list[1].skill);
const affordable = list.filter(p => p.value <= E.user(s).balance).sort((a, b) => b.value - a.value)[0];
const res = E.bid(s, affordable.id);
check('bid succeeds', res.ok, res.msg);
check('squad grew by 1', E.user(s).players.length === before + 1);
check('balance reduced', E.user(s).balance === balBefore - affordable.value);
check('player removed from market', !s.transferPool.find(p => p.id === affordable.id));
E.user(s).balance = 9999999;                 // top up so the (randomly priced) signing is affordable
const su = E.signUnlisted(s, 'M');
check('sign unlisted works', su.ok, su.msg);

/* ---- play a full season --------------------------------------------- */
section('Play a full season');
let leagueMatches = 0, cupMatches = 0, goalsSeen = 0, guardFS = 0;
while (guardFS++ < 300) {
  const before = s.season;
  const r = step(s);
  if (!r || s.season !== before) break;     // a step can roll the season (end-of-season euro finals)
  if (r.comp === 'league') leagueMatches++; else cupMatches++;
  goalsSeen += r.hg + r.ag;
}
check('user plays 42 league matches in a season', leagueMatches === 42, leagueMatches);
check('user also contests cup ties', cupMatches >= 1, cupMatches);
check('some goals were scored', goalsSeen > 0, goalsSeen);
check('season rolled over to 2', s.season === 2, s.season);

/* ---- table integrity ------------------------------------------------- */
section('League table integrity');
const s3 = E.newGame(2024);
let lm3 = 0, g3 = 0;
while (lm3 < 8 && g3++ < 120) { const r = step(s3); if (r && r.comp === 'league') lm3++; }
const tbl = E.standings(s3);
let pointsOk = true, playedConsistent = true, totF = 0, totA = 0;
tbl.forEach(row => {
  if (row.Pts !== row.W * 3 + row.D) pointsOk = false;
  if (row.P !== row.W + row.D + row.L) playedConsistent = false;
  totF += row.F; totA += row.A;
});
check('points = W*3 + D for every club', pointsOk);
check('P = W + D + L for every club', playedConsistent);
check('goals for == goals against within a division', totF === totA, totF + ' vs ' + totA);
check('every club played the same number of games', new Set(tbl.map(r => r.P)).size === 1, JSON.stringify(tbl.map(r => r.P)));
check('league untouched by cup matchdays (8 played)', tbl[0].P === 8, tbl[0].P);

const scorers = E.topScorers(s3, 10);
check('top scorers list produced', scorers.length > 0, scorers.length);
check('top scorers sorted', scorers.length < 2 || scorers[0].goals >= scorers[1].goals);
const lr = E.lastRoundResults(s3);
check('last-round results produced', lr.games.length === 11, lr.games.length);
check('results carry scorers', lr.games.some(g => g.hg + g.ag === g.scorers.length));

/* ---- club selection -------------------------------------------------- */
section('Club selection');
const cs = E.newGame(555);
check('default user club is Romford', E.user(cs).name === 'Romford', E.user(cs).name);
check('default user is in the Conference', cs.divisions[cs.userDivision].name === 'Conference');
E.setUserClub(cs, 4);
check('setUserClub changes the managed club', cs.userClub === 4 && E.user(cs).isUser === true);
check('setUserClub updates division', cs.userDivision === cs.clubs[4].division);
check('only one club flagged as user', cs.clubs.filter(c => c.isUser).length === 1);
check('manager rating reset on takeover', cs.managerRating === 50, cs.managerRating);
check('selection rebuilt for new club (11 starters)', cs.selection.xi.length === 11, cs.selection.xi.length);
const cs2 = E.newGame(555, 7);
check('newGame honours a chosen club index', cs2.userClub === 7 && cs2.clubs[7].isUser === true);
check('clubOverall in range', E.clubOverall(cs2.clubs[3]) > 0 && E.clubOverall(cs2.clubs[3]) < 100, E.clubOverall(cs2.clubs[3]));
check('difficultyLabel returns text', typeof E.difficultyLabel(1) === 'string' && E.difficultyLabel(1).length > 0);
check('every club has positive funds', cs2.clubs.every(c => c.balance > 0));

/* ---- promotion / relegation ----------------------------------------- */
section('Divisions & promotion / relegation');
const sd = E.newGame(4242);
const sizes0 = sd.divisions.map(d => d.members.length);
check('English division sizes are 20,22,22,22', JSON.stringify(sizes0.slice(0, 4)) === JSON.stringify([20, 22, 22, 22]), JSON.stringify(sizes0));
check('all club names unique', new Set(sd.clubs.map(c => c.name)).size === sd.clubs.length);
const clubs0 = sd.clubs.length;
for (let guard = 0; guard < 4000 && sd.season < 3; guard++) { step(sd); }
check('advanced past season 1', sd.season >= 2, sd.season);
check('division sizes preserved after promotion/relegation', JSON.stringify(sd.divisions.map(d => d.members.length)) === JSON.stringify(sizes0), JSON.stringify(sd.divisions.map(d => d.members.length)));
check('club count conserved', sd.clubs.length === clubs0, sd.clubs.length);
check('user club sits in its division members', sd.divisions[sd.userDivision].members.includes(sd.userClub));
let consistent = true;
sd.clubs.forEach((c, i) => { if (c.division >= 0 && !sd.divisions[c.division].members.includes(i)) consistent = false; });
check('club.division matches membership for pyramid clubs', consistent);
check('memberships partition the English pyramid (86)', sd.divisions.filter(d => d.nation === 'ENG').reduce((a, d) => a + d.members.length, 0) === 86);
check('Serie A/B keep 18/20 clubs after Italian promotion', sd.divisions[4].members.length === 18 && sd.divisions[5].members.length === 20);

/* ---- player & market mechanics --------------------------------------- */
section('Player & market mechanics');
const pm = E.newGame(9001);
let maxSkill = 0, minSkill = 99, hasAge = true;
pm.clubs.forEach(c => c.players.forEach(p => {
  if (p.skill > maxSkill) maxSkill = p.skill;
  if (p.skill < minSkill) minSkill = p.skill;
  if (!(p.age >= 16 && p.age <= 45)) hasAge = false;
}));
check('skills can reach the 90s', maxSkill >= 90, maxSkill);
check('skills stay within 20..99', maxSkill <= 99 && minSkill >= 20, minSkill + '..' + maxSkill);
check('players have a sensible age', hasAge);

const sq0 = E.user(pm).players.length;
const sellTarget = E.user(pm).players[sq0 - 1];
const sres = E.sellPlayer(pm, sellTarget.id);
check('sellPlayer succeeds immediately', sres.ok, sres.msg);
check('squad shrank by 1 on sale', E.user(pm).players.length === sq0 - 1);
check('sold player gone from squad', !E.user(pm).players.find(p => p.id === sellTarget.id));

const listedOnly = E.marketList(pm, { includeUnlisted: false });
const withUnlisted = E.marketList(pm, { includeUnlisted: true });
check('unlisted filter adds approachable players', withUnlisted.length > listedOnly.length, withUnlisted.length + ' vs ' + listedOnly.length);
const approach = withUnlisted.find(p => p.source !== 'pool' && !p.listed);
check('unlisted entries priced at a premium', !!approach && approach.price > approach.value);
if (approach) {
  const srcClub = pm.clubs[approach.source], had = srcClub.players.length;
  E.user(pm).balance = 99999999;
  const br = E.bid(pm, approach.id);
  check('bid for an unlisted player succeeds', br.ok, br.msg);
  check('unlisted player left his old club', !srcClub.players.find(p => p.id === approach.id) && srcClub.players.length === had - 1);
}

E.user(pm).players.forEach(p => { p.fit = 40; });
const tr = E.train(pm);
check('training works once per week', tr.ok);
check('training raised fitness', E.user(pm).players.every(p => p.fit > 40));
check('training blocked twice in same week', !E.train(pm).ok);

const inj = E.newGame(31337);
for (let k = 0; k < 20; k++) step(inj);
check('injuries occur during the season', inj.clubs.some(c => c.players.some(p => p.injuredFor > 0)));

const dr = E.newGame(424242);
const skillsBefore = E.user(dr).players.map(p => ({ id: p.id, skill: p.skill }));
let gd = 0; while (dr.season === 1 && gd++ < 250) step(dr);
const changed = skillsBefore.some(b => { const a = E.user(dr).players.find(p => p.id === b.id); return a && a.skill !== b.skill; });
check('player skills drift across a season', changed);

/* ---- cups & honours -------------------------------------------------- */
section('Cups & honours');
const cg = E.newGame(5150);
let s0 = cg.season, gc = 0, sawCup = false;
while (cg.season === s0 && gc++ < 250) { const r = step(cg); if (r && r.comp !== 'league') sawCup = true; }
check('user contested a cup tie', sawCup);
check('honours recorded after a season', cg.honours.length >= 1, cg.honours.length);
check('honours list league 1st/2nd/3rd', cg.honours[0].divisions.every(d => d.first && d.second && d.third));
check('every cup produced a winner', cg.honours[0].cups.length >= 2 && cg.honours[0].cups.every(c => c.winner && c.winner !== '—'), JSON.stringify(cg.honours[0].cups));
check('league/euro cups rebuilt for the new season', ['fa', 'leaguecup', 'champions', 'uefa'].every(id => cg.cups[id] && cg.cups[id].winner == null));

/* ---- finances, history, ex-players, Europe, match box score ---------- */
section('Finances, history, ex-players & Europe');
const fx = E.newGame(2718);
const b0 = E.user(fx).balance;
const tl = E.takeLoan(fx, 500000);
check('takeLoan adds cash and debt', tl.ok && E.user(fx).balance === b0 + 500000 && fx.debt === 500000, tl.msg);
const rl = E.repayLoan(fx, 200000);
check('repayLoan reduces debt', rl.ok && fx.debt === 300000, rl.msg);
const exBefore = fx.exPlayers.length;
E.sellPlayer(fx, E.user(fx).players[E.user(fx).players.length - 1].id);
check('selling records an ex-player', fx.exPlayers.length === exBefore + 1);
check('Champions League has 64 entrants', fx.cups.champions && fx.cups.champions.participants.length === 64, fx.cups.champions && fx.cups.champions.participants.length);
check('Champions League includes foreign clubs', fx.cups.champions.participants.some(ci => fx.clubs[ci].foreign));
E.prepareNextUserMatch(fx);
const m = E.playUserMatch(fx);
check('match carries box-score stats', !!m.stats && typeof m.stats.possHome === 'number');
check('match carries cards & subs arrays', Array.isArray(m.cards) && Array.isArray(m.subs));
check('match has a userSide', m.userSide === 'home' || m.userSide === 'away');
const oppName = m.opponent.name;
E.commitUserResult(fx, m);
check('head-to-head history recorded', E.historyVs(fx, oppName).length >= 1, E.historyVs(fx, oppName).length);
check('round-up captured the matchday', (fx.roundup || []).length >= 1, (fx.roundup || []).length);
check('userLeagueRounds matches division size', E.userLeagueRounds(fx) === (E.userDiv(fx).members.length - 1) * 2);

const rt = E.newGame(909090);
let g2 = 0; while (rt.season < 3 && g2++ < 4000) step(rt);
check('all clubs remain fieldable after seasons', rt.clubs.every(c => c.players.length >= 11));
check('players have a retirement age', rt.clubs[0].players.every(p => p.retireAge >= 35 && p.retireAge <= 40));
check('cup bracket accessor works', (() => { const br = E.cupBracket(rt, E.cupIds(rt)[0]); return !!br && br.rounds.length > 0; })());

/* ---- two-leg Europe, qualification & loan interest ------------------- */
section('Two-leg Europe, qualification & loan interest');
const eu = E.newGame(13131);
check('Champions League is two-legged', eu.cups.champions.twoLeg === true);
check('UEFA Cup is two-legged', eu.cups.uefa.twoLeg === true);
const champEng = eu.cups.champions.participants.filter(ci => !eu.clubs[ci].foreign);
check('season-1 Champions English entrants are all Premier', champEng.length > 0 && champEng.every(ci => eu.clubs[ci].division === 0), JSON.stringify(champEng.map(ci => eu.clubs[ci].division)));
E.takeLoan(eu, 500000);
const debtBefore = eu.debt;
E.prepareNextUserMatch(eu); E.commitUserResult(eu, E.playUserMatch(eu));
check('loan debt grows with interest', eu.debt > debtBefore, debtBefore + ' -> ' + eu.debt);
const eu2 = E.newGame(246810);
let ge = 0; const es0 = eu2.season; while (eu2.season === es0 && ge++ < 400) step(eu2);
check('European knockout starts at Round of 64', eu.cups.champions.rounds[0].name === 'Round of 64', eu.cups.champions.rounds[0].name);
const clRec = eu2.honours[0].cups.find(c => c.name === 'Champions League');
check('Champions League completes with a winner', !!clRec && clRec.winner && clRec.winner !== '—', clRec && clRec.winner);
check('last-season winners tracked for curtain-raisers', eu2.prev && eu2.prev.ucl != null && eu2.prev.uefa != null);
check('European Super Cup created in season 2', !!eu2.cups.supercup, Object.keys(eu2.cups).join(','));
check('Super Cup contestants are the two European winners', !!eu2.cups.supercup && eu2.cups.supercup.participants.length === 2);

/* ---- squad cap, formations, bye-free cups, suspensions, career ------- */
section('Squad cap, formations, bye-free cups, career');
const fc = E.newGame(8642);
E.user(fc).balance = 999999999;
for (let k = 0; k < 40; k++) { const list = E.marketList(fc, { includeUnlisted: true }); const t = list.find(p => p.price <= E.user(fc).balance); if (!t) break; if (!E.bid(fc, t.id).ok) break; }
check('squad capped at 23', E.user(fc).players.length === 23, E.user(fc).players.length);
const anyMkt = E.marketList(fc, { includeUnlisted: true })[0];
check('signing rejected when squad full', !E.bid(fc, anyMkt.id).ok);
const f352 = E.bestXI(E.user(fc), { formation: '352' });
check('Fresh XI returns 11', E.bestXI(E.user(fc), { mode: 'fresh' }).xi.length === 11);
check('formation carried on the selection', f352.formation === '352');
const noBye = ['fa', 'leaguecup', 'champions', 'uefa'].every(id => fc.cups[id].rounds.every(rd => rd.ties.every(t => t.away !== -1)));
check('no byes in any cup round', noBye);
check('low reputation -> only lower-league clubs offered', E.eligibleClubs(fc, 30).length > 0 && E.eligibleClubs(fc, 30).every(i => fc.divisions[fc.clubs[i].division].level >= 3));
check('high reputation -> Premier clubs offered', E.eligibleClubs(fc, 90).some(i => fc.clubs[i].division === 0));
// taking over a new club wipes any debt carried from the old one
fc.debt = 300000; fc.debtSince = fc.day;
E.chooseClub(fc, E.eligibleClubs(fc, 90).find(i => i !== fc.userClub));
check('changing club clears inherited debt', fc.debt === 0 && fc.debtSince === -1, fc.debt);

const ff = E.newGame(33445);
E.prepareNextUserMatch(ff);
E.user(ff).players.forEach((p, i) => { if (i > 2) p.injuredFor = 3; });   // leave only 3 fit
const fm = E.playUserMatch(ff);
check('walkover when fewer than 8 are fit', !!fm && fm.forfeit === true);

const cr = E.newGame(11223);
let gcr = 0, cs0 = cr.season, sawCupScorers = false;
while (cr.season === cs0 && gcr++ < 400) {
  step(cr);
  // cups are rebuilt at the season rollover (scorers reset), so sample mid-season
  if (cr.season === cs0 && (E.topScorersForCup(cr, 'fa').length > 0 || E.topScorersForCup(cr, 'champions').length > 0)) sawCupScorers = true;
}
check('career logged after a season', cr.career.length >= 1 && !!cr.career[0].club, cr.career.length);
check('honours tally produced', E.honoursTally(cr).length > 0);
check('cups keep their own scorer charts', sawCupScorers);

/* ---- the wider world ------------------------------------------------- */
section('The wider world: leagues, cups, calendar');
const Live = require('../js/live');
const w = E.newGame(777);
const isPow2 = n => n >= 2 && (n & (n - 1)) === 0;
check('every league club sits in its division', w.clubs.every((c, i) => c.division < 0 || w.divisions[c.division].members.includes(i)));
check('Scottish Premier plays 36 rounds (four meetings)', E.divisionRounds(w, 11) === 36, E.divisionRounds(w, 11));
check('every nation has its domestic cup', ['coppaitalia', 'copadelrey', 'dfbpokal', 'coupedefrance', 'knvbcup', 'tacaportugal', 'scottishcup'].every(id => !!w.cups[id]));
check('every cup draw is a power of two (no byes)', Object.keys(w.cups).every(id => isPow2(w.cups[id].participants.length)));
check('calendar dates never go backwards', w.calendar.every((e, i) => i === 0 || e.date >= w.calendar[i - 1].date));
check('league matchdays fall on Saturdays', w.calendar.filter(e => e.comp === 'league').every(e => new Date(e.date + 'T12:00:00Z').getUTCDay() === 6));
check('season label is 1996/97', E.seasonLabel(w) === '1996/97', E.seasonLabel(w));
const clNations = new Set(w.cups.champions.participants.map(ci => w.clubs[ci].division >= 0 ? w.divisions[w.clubs[ci].division].nation : w.clubs[ci].nation));
check('Champions League draws clubs from many nations', clNations.size >= 10, clNations.size);
for (let k = 0; k < 6; k++) step(w);
check('foreign leagues are simulated too', w.divisions[4].table[w.clubs[w.divisions[4].members[0]].name].P > 0 && w.divisions[11].table[w.clubs[w.divisions[11].members[0]].name].P > 0);
check('league leaders tables produced', E.leagueLeaders(w, 6).scorers.length > 0);
const fxl = E.clubFixtures(w, w.userClub);
check('club fixture list has every league game, dated and in order', fxl.filter(f => f.comp === 'league').length === 42 && fxl.every((f, i) => i === 0 || f.day >= fxl[i - 1].day));
check('table zones mark relegation in the Conference? (bottom tier: none)', Object.values(E.tableZones(w, 3)).every(z => z !== 'releg'));
check('table zones mark Champions League places in Serie A', E.tableZones(w, 4)[1] === 'cl' && E.tableZones(w, 4)[18] === 'releg');

/* ---- live match engine ----------------------------------------------- */
section('Live match engine');
const lv = E.newGame(4321);
E.prepareNextUserMatch(lv);
const lm1 = E.createLiveMatch(lv), lm2 = E.createLiveMatch(lv);
lm1.live.runToEnd(); lm2.live.runToEnd();
check('same seed + same decisions = same match', JSON.stringify(lm1.live.score) === JSON.stringify(lm2.live.score) && lm1.live.feed.length === lm2.live.feed.length);
const lmH = E.createLiveMatch(lv).live;
let g45 = 0; while (!lmH.halfTime && g45++ < 60) lmH.step();
check('the match stops for the half-time team talk', lmH.halfTime && lmH.minute === 45, lmH.minute);
const talk = lmH.teamTalk('encourage');
check('team talk gives feedback and resumes', talk.ok && !lmH.halfTime && typeof talk.text === 'string');
const st3 = lmH.state(), userKey = st3.home.isUser ? 'home' : 'away';
const offP = st3[userKey].lineup.find(x => x.role !== 'G' && !x.off), onP = st3[userKey].bench[0];
lmH.setAutoSubs(userKey, false);
check('manual substitution works', lmH.substitute(userKey, offP.id, onP.id).ok);
check('the sub is on and the player off', lmH.state()[userKey].lineup.find(x => x.id === onP.id) && lmH.state()[userKey].lineup.find(x => x.id === offP.id).off);
lmH.runToEnd();
const r3 = lmH.result();
check('ratings in 3..10 and a man of the match', Object.values(r3.ratings).every(v => v >= 3 && v <= 10) && !!r3.potm);
check('box score adds up', r3.stats.possHome + r3.stats.possAway === 100 && r3.stats.sotHome >= r3.hg && r3.stats.sotAway >= r3.ag);
check('commentary feed produced', r3.feed.length > 10 && r3.feed.some(f => f.type === 'ft'));
// tactics matter: an attacking side shoots more than a defensive one
const D = require('../js/data');
const trng = D.makeRng(5);
const mkTeam = sk => Live.FORMATIONS['442'].map(r => D.generatePlayer(trng, { pos: r, skill: sk, fit: 95, age: 26 }));
let shotsAtt = 0, shotsDef = 0;
for (let i = 0; i < 150; i++) {
  const ta = mkTeam(60), tb = mkTeam(60);
  const a = Live.create({ seed: 50 + i, silent: true, autoTalk: true, home: { name: 'A', players: ta, mentality: 2 }, away: { name: 'B', players: tb } }).runToEnd().result();
  const d = Live.create({ seed: 50 + i, silent: true, autoTalk: true, home: { name: 'A', players: ta, mentality: -2 }, away: { name: 'B', players: tb } }).runToEnd().result();
  shotsAtt += a.stats.shotsHome; shotsDef += d.stats.shotsHome;
}
check('very attacking creates more shots than very defensive', shotsAtt > shotsDef * 1.25, shotsAtt + ' vs ' + shotsDef);
let shootouts = 0;
for (let i = 0; i < 120 && !shootouts; i++) {
  const r = Live.create({ seed: 900 + i, silent: true, autoTalk: true, tie: { single: true }, home: { name: 'A', players: mkTeam(55) }, away: { name: 'B', players: mkTeam(55) } }).runToEnd().result();
  if (r.shootout) { shootouts++; check('drawn knockout goes to extra time and penalties', r.extraTime && (r.shootout.winner === 'home' || r.shootout.winner === 'away')); }
}
check('a shoot-out happened in a drawn single-leg tie', shootouts > 0);
const pv = E.matchPreview(lv, 30);
check('match preview: five mentality options', pv.byMentality.length === 5 && pv.byMentality.every(x => Math.abs(x.win + x.draw + x.loss - 1) < 1e-9));
check('assistant recommends a mentality', !!pv.recommended && typeof pv.recommended.label === 'string' && pv.tips.length > 0);
check('formation layouts have 11 slots', Object.keys(Live.FORMATIONS).every(f => Live.layout(f).length === 11));

/* ---- live ticker = committed results --------------------------------- */
section('Live score ticker & commit');
const tk = E.newGame(2468);
E.prepareNextUserMatch(tk);
const preview = E.previewOtherResults(tk);
const ePrev = tk.calendar[tk.day];
const tkm = E.playUserMatch(tk); E.commitUserResult(tk, tkm);
const dvT = tk.divisions[tk.userDivision], rT = dvT.schedule[ePrev.round];
const committed = dvT.results.filter(x => x.round === rT && x.home !== tk.userClub && x.away !== tk.userClub);
check('other-scores ticker predicts the committed results', preview.length === committed.length && preview.every(p => committed.some(c => c.home === p.homeIdx && c.hg === p.hg && c.ag === p.ag)));
check('player match ratings recorded', E.user(tk).players.some(p => p.rN > 0));

/* ---- economy, contracts, inbox, board -------------------------------- */
section('Economy, contracts, inbox & board');
const ec = E.newGame(1357);
check('players carry wages and contracts', E.user(ec).players.every(p => p.wage > 0 && p.contract >= 1));
check('welcome message from the chairman', ec.inbox.some(m => m.cat === 'board') && E.unreadCount(ec) > 0);
check('board sets an objective', !!ec.board.objective && typeof ec.board.objective.label === 'string', JSON.stringify(ec.board.objective));
const bal0 = E.user(ec).balance;
step(ec);
check('wages are paid weekly', ec.finance.season.wages > 0);
check('TV money arrives weekly', ec.finance.season.tv > 0);
check('balance history recorded', ec.finance.history.length >= 1);
const rp = E.user(ec).players[0]; rp.contract = 1;
const rr = E.renewContract(ec, rp.id);
check('contract renewal extends the deal', rr.ok && rp.contract >= 1 && rp.contract > 1 || rp.age >= 32, rr.msg);
const attrs = E.attributes(rp);
check('attributes are 1..20 and deterministic', attrs.every(a => a.value >= 1 && a.value <= 20) && JSON.stringify(attrs) === JSON.stringify(E.attributes(rp)));
// an incoming bid can be accepted
const bidP = E.user(ec).players.slice().sort((a, b) => b.value - a.value)[0];
const buyerIdx = ec.divisions[0].members[0];
ec.clubs[buyerIdx].balance = 1e9;
ec.offers.push({ id: 999, playerId: bidP.id, club: buyerIdx, amount: bidP.value * 2, expires: ec.day + 3, done: false });
const balB = E.user(ec).balance;
const ab = E.acceptBid(ec, 999);
check('accepting a bid sells the player to that club', ab.ok && !E.user(ec).players.includes(bidP) && ec.clubs[buyerIdx].players.includes(bidP) && E.user(ec).balance === balB + bidP.value * 2, ab.msg);
check('inbox action routes', E.inboxAction(ec, ec.inbox[ec.inbox.length - 1].id, 0).ok);
// contracts run out at the end of the season
const cx = E.newGame(8080);
const leaver = E.user(cx).players[5]; leaver.contract = 1; const leaverId = leaver.id;
let gcx = 0; while (cx.season === 1 && gcx++ < 400) step(cx);
check('unrenewed contracts expire in the summer', !E.user(cx).players.some(p => p.id === leaverId) && cx.exPlayers.some(x => x.id === leaverId && /Contract/.test(x.reason)));
check('youth intake arrives in the summer', cx.inbox.some(m => /Youth intake/.test(m.subject)));
check('a season review is waiting', !!cx.pendingReview && cx.pendingReview.season === 1);
check('awards recorded per league', cx.honours[0].awards.length === cx.divisions.length);
const ser2 = E.serialize(cx);
check('save stays compact (< 2.5 MB)', ser2.length < 2.5e6, Math.round(ser2.length / 1024) + ' KB');
const back = E.deserialize(ser2);
check('compact save round-trips players', back.clubs[5].players[0].surname === cx.clubs[5].players[0].surname && back.clubs[5].players[0].form instanceof Array);
// the sack
const sk = E.newGame(6060, null, { difficulty: 'hard' });
let gsk = 0; while (!sk.sacked && sk.season === 1 && gsk++ < 120) { sk.board.confidence = 0; step(sk); }
check('a manager with no board support gets sacked', sk.sacked === true);
check('the job centre still has clubs for you', E.eligibleClubs(sk, sk.reputation).length > 0);
E.chooseClub(sk, E.eligibleClubs(sk, sk.reputation)[0]);
check('taking a new job clears the sack', sk.sacked === false && E.user(sk).isUser);

/* ---- save / load ----------------------------------------------------- */
section('Save / load');
const snap = E.serialize(s3);
const loaded = E.deserialize(snap);
check('round trip preserves season', loaded.season === s3.season);
check('round trip preserves calendar day', loaded.day === s3.day);
check('round trip preserves user balance', loaded.clubs[loaded.userClub].balance === E.user(s3).balance);
check('round trip preserves divisions', loaded.divisions.length === s3.divisions.length);
check('round trip preserves cups', Object.keys(loaded.cups).length === Object.keys(s3.cups).length);

/* ---- summary --------------------------------------------------------- */
section(failures === 0 ? 'ALL CHECKS PASSED' : (failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
