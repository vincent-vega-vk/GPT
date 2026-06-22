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
const pyramid = s.clubs.filter(c => c.division >= 0);
check('86 clubs across the pyramid', pyramid.length === 86, pyramid.length);
check('Premier Division has 20 clubs', s.divisions[0].members.length === 20, s.divisions[0].members.length);
check('lower divisions have 22 clubs', s.divisions.slice(1).every(d => d.members.length === 22));
check('foreign clubs exist for Europe', s.clubs.some(c => c.foreign), s.clubs.length);
check('4 divisions', s.divisions.length === 4, s.divisions.length);
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
check('default user is in the Conference', cs.userDivision === cs.divisions.length - 1);
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
check('division sizes are 20,22,22,22', JSON.stringify(sizes0) === JSON.stringify([20, 22, 22, 22]), JSON.stringify(sizes0));
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
check('memberships partition the pyramid (86)', sd.divisions.reduce((a, d) => a + d.members.length, 0) === 86);

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
const approach = withUnlisted.find(p => p.source !== 'pool');
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
