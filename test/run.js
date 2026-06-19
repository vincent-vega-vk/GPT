/*
 * Head-less self-test for the SIMSOC 6 remake engine.
 * Exercises a full season (and into a second) and asserts invariants so we
 * know the game logic actually runs without a browser.
 */
const E = require('../js/engine');

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra && !ok ? '  -> ' + extra : ''));
  if (!ok) failures++;
}
function section(t) { console.log('\n' + t); }

/* ---- new game -------------------------------------------------------- */
section('New game');
const s = E.newGame(20259);
check('22 clubs in the league', s.clubs.length === 22, s.clubs.length);
check('user club is Romford', E.user(s).name === 'Romford', E.user(s).name);
check('user starts with a balance', E.user(s).balance > 0, E.user(s).balance);
check('fixtures = clubs*(clubs-1)', s.fixtures.length === 22 * 21, s.fixtures.length);
check('transfer market populated', s.transferPool.length > 50, s.transferPool.length);
check('default selection has 11 starters', s.selection.xi.length === 11, s.selection.xi.length);
check('default selection has subs', s.selection.subs.length >= 1, s.selection.subs.length);

// every club plays exactly twice per opponent (home & away)
let venueOk = true;
for (let i = 0; i < s.clubs.length; i++) {
  for (let j = 0; j < s.clubs.length; j++) {
    if (i === j) continue;
    const ha = s.fixtures.filter(f => f.home === i && f.away === j).length;
    if (ha !== 1) venueOk = false;
  }
}
check('balanced home/away schedule', venueOk);

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
// buy the most expensive player we can afford
const affordable = list.filter(p => p.value <= E.user(s).balance).sort((a, b) => b.value - a.value)[0];
const res = E.bid(s, affordable.id);
check('bid succeeds', res.ok, res.msg);
check('squad grew by 1', E.user(s).players.length === before + 1);
check('balance reduced', E.user(s).balance === balBefore - affordable.value);
check('player removed from market', !s.transferPool.find(p => p.id === affordable.id));

const su = E.signUnlisted(s, 'M');
check('sign unlisted works', su.ok, su.msg);

/* ---- play a full season --------------------------------------------- */
section('Play a full season');
let matchesPlayed = 0, goalsSeen = 0, maxRound = E.totalRounds(s);
while (s.season === 1 && s.round < maxRound) {
  const m = E.playUserMatch(s);
  if (!m) break;
  check('match has a result', typeof m.hg === 'number' && typeof m.ag === 'number', m && (m.hg + '-' + m.ag));
  goalsSeen += m.hg + m.ag;
  E.commitUserResult(s, m);
  matchesPlayed++;
}
check('played 42 league rounds', matchesPlayed === 42, matchesPlayed);
check('some goals were scored', goalsSeen > 0, goalsSeen);

/* ---- table integrity ------------------------------------------------- */
section('League table integrity (final standings of season 1 reset)');
// After 42 rounds the season rolls over; verify the table was consistent at
// the moment of completion by re-simulating with a checker on a fresh game.
const s2 = E.newGame(777);
let playedRounds = 0;
while (s2.season === 1) {
  const m = E.playUserMatch(s2);
  E.commitUserResult(s2, m);
  playedRounds++;
  if (s2.season !== 1) break;
}
check('season rolled over after full schedule', s2.season === 2, s2.season);

// Re-check table maths mid-season on another fresh game.
const s3 = E.newGame(2024);
for (let k = 0; k < 10; k++) { E.commitUserResult(s3, E.playUserMatch(s3)); }
const tbl = E.standings(s3);
let pointsOk = true, playedConsistent = true, goalSumOk = true;
let totF = 0, totA = 0;
tbl.forEach(row => {
  if (row.Pts !== row.W * 3 + row.D) pointsOk = false;
  if (row.P !== row.W + row.D + row.L) playedConsistent = false;
  totF += row.F; totA += row.A;
});
check('points = W*3 + D for every club', pointsOk);
check('P = W + D + L for every club', playedConsistent);
check('goals for == goals against league-wide', totF === totA, totF + ' vs ' + totA);
check('every club played the same number of games', new Set(tbl.map(r => r.P)).size === 1, JSON.stringify(tbl.map(r => r.P)));

const scorers = E.topScorers(s3, 10);
check('top scorers list produced', scorers.length > 0, scorers.length);
check('top scorers sorted', scorers.length < 2 || scorers[0].goals >= scorers[1].goals);

/* ---- club selection -------------------------------------------------- */
section('Club selection');
const cs = E.newGame(555);
check('default user is club 0 (Romford)', cs.userIndex === 0 && E.user(cs).name === 'Romford');
E.setUserClub(cs, 4);
check('setUserClub changes the managed club', cs.userIndex === 4 && E.user(cs).isUser === true);
check('only one club flagged as user', cs.clubs.filter(c => c.isUser).length === 1);
check('manager rating reset on takeover', cs.managerRating === 50, cs.managerRating);
check('selection rebuilt for new club (11 starters)', cs.selection.xi.length === 11, cs.selection.xi.length);
const cs2 = E.newGame(555, 7);
check('newGame honours a chosen userIndex', cs2.userIndex === 7 && cs2.clubs[7].isUser === true);
check('clubOverall in range', E.clubOverall(cs2.clubs[3]) > 0 && E.clubOverall(cs2.clubs[3]) < 100, E.clubOverall(cs2.clubs[3]));
check('difficultyLabel returns text', typeof E.difficultyLabel(1) === 'string' && E.difficultyLabel(1).length > 0);
check('every club has positive funds', cs2.clubs.every(c => c.balance > 0));

/* ---- save / load ----------------------------------------------------- */
section('Save / load');
const snap = E.serialize(s3);
const loaded = E.deserialize(snap);
check('round trip preserves season', loaded.season === s3.season);
check('round trip preserves round', loaded.round === s3.round);
check('round trip preserves balance', loaded.clubs[0].balance === s3.clubs[0].balance);

/* ---- summary --------------------------------------------------------- */
section(failures === 0 ? 'ALL CHECKS PASSED' : (failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);
