import type { Team, MatchResult, MatchEvent, MatchStats, PlayerMatchRating, Difficulty, MatchStage } from '../types';
import { buildMatch3DEvents } from '../components/Match3D/useMatchAnimation';

export function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function getTacticalModifier(team: Team): { atkMod: number; defMod: number; possMod: number } {
  let atkMod = 1, defMod = 1, possMod = 50;
  switch (team.tactics.style) {
    case 'pressing': atkMod = 1.08; defMod = 0.95; possMod = 50; break;
    case 'gegenpress': atkMod = 1.10; defMod = 0.92; possMod = 52; break;
    case 'tiki-taka': atkMod = 1.07; defMod = 1.04; possMod = 62; break;
    case 'possession': atkMod = 1.05; defMod = 1.03; possMod = 58; break;
    case 'low-block': atkMod = 0.85; defMod = 1.18; possMod = 35; break;
    case 'counter': atkMod = 1.08; defMod = 1.00; possMod = 38; break;
    case 'direct': atkMod = 1.06; defMod = 0.95; possMod = 42; break;
    case 'compact': atkMod = 0.90; defMod = 1.12; possMod = 44; break;
    case 'wing-play': atkMod = 1.05; defMod = 0.98; possMod = 50; break;
    case 'vertical': atkMod = 1.06; defMod = 0.96; possMod = 46; break;
  }
  switch (team.tactics.mentality) {
    case 'ultra-attacking': atkMod *= 1.15; defMod *= 0.82; break;
    case 'attacking': atkMod *= 1.08; defMod *= 0.94; break;
    case 'defensive': atkMod *= 0.92; defMod *= 1.10; break;
    case 'ultra-defensive': atkMod *= 0.82; defMod *= 1.18; break;
  }
  const pressing = team.tactics.pressingIntensity;
  atkMod += pressing * 0.01;
  defMod -= pressing * 0.005;
  return { atkMod, defMod, possMod };
}

function getChemMod(team: Team): number { return team.chemistry / 100 * 0.25 + 0.75; }
function getFormMod(team: Team): number {
  const sum = team.form.reduce((a, b) => a + b, 0);
  return 0.9 + (sum + 5) / 50;
}
function getFitnessMod(team: Team): number {
  const starters = team.players.filter(p => p.isInStartingXI);
  if (starters.length === 0) return 0.9;
  const avg = starters.reduce((a, p) => a + p.fitness, 0) / starters.length;
  return avg / 100 * 0.3 + 0.7;
}

function calcXG(homeTeam: Team, awayTeam: Team, stage: MatchStage): { homeXG: number; awayXG: number } {
  const hMod = getTacticalModifier(homeTeam);
  const aMod = getTacticalModifier(awayTeam);
  const homeAtk = homeTeam.attack * hMod.atkMod * getChemMod(homeTeam) * getFormMod(homeTeam) * getFitnessMod(homeTeam);
  const awayDef = awayTeam.defense * aMod.defMod * getChemMod(awayTeam) * getFormMod(awayTeam);
  const awayAtk = awayTeam.attack * aMod.atkMod * getChemMod(awayTeam) * getFormMod(awayTeam) * getFitnessMod(awayTeam);
  const homeDef = homeTeam.defense * hMod.defMod * getChemMod(homeTeam) * getFormMod(homeTeam);
  const stageMult = ['qf', 'sf', 'final'].includes(stage) ? 0.85 : stage === 'r16' ? 0.90 : 1.0;
  const homeXG = clamp((homeAtk / awayDef) * 1.3 * stageMult + 0.1, 0.2, 3.5);
  const awayXG = clamp((awayAtk / homeDef) * 1.1 * stageMult, 0.2, 3.2);
  return { homeXG, awayXG };
}

function getPlayerForEvent(team: Team, type: 'goal' | 'yellow' | 'sub' | 'injury', excludeGK = true): string {
  let pool = team.players.filter(p => p.isInStartingXI && (excludeGK ? p.position !== 'GK' : true));
  if (pool.length === 0) pool = team.players;
  if (type === 'goal') {
    const attackers = pool.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position));
    if (attackers.length > 0 && Math.random() < 0.65) return pick(attackers).name;
  }
  return pick(pool).name;
}

function buildEvents(
  homeTeam: Team, awayTeam: Team,
  homeGoals: number, awayGoals: number,
  hasET: boolean, _hasPens: boolean
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const totalMins = hasET ? 120 : 90;
  // const addMinutes: number[] = [];
  const spreadGoals = (count: number, side: 'home' | 'away', maxMin: number) => {
    const mins: number[] = [];
    for (let _i = 0; _i < count; _i++) {
      const minute = rnd(1, maxMin);
      mins.push(minute);
      const team = side;
      const playerName = getPlayerForEvent(side === 'home' ? homeTeam : awayTeam, 'goal');
      const isOwnGoal = Math.random() < 0.05;
      events.push({ minute, type: isOwnGoal ? 'owngoal' : 'goal', team, playerName, detail: isOwnGoal ? '(OG)' : undefined });
    }
  };
  spreadGoals(homeGoals, 'home', totalMins);
  spreadGoals(awayGoals, 'away', totalMins);
  // Yellows
  const homeYellows = rnd(0, 3);
  const awayYellows = rnd(0, 3);
  for (let i = 0; i < homeYellows; i++) {
    events.push({ minute: rnd(10, 90), type: 'yellow', team: 'home', playerName: getPlayerForEvent(homeTeam, 'yellow') });
  }
  for (let i = 0; i < awayYellows; i++) {
    events.push({ minute: rnd(10, 90), type: 'yellow', team: 'away', playerName: getPlayerForEvent(awayTeam, 'yellow') });
  }
  // Red card if 2 yellows
  if (homeYellows >= 2 && Math.random() < 0.3) {
    events.push({ minute: rnd(60, 90), type: 'red', team: 'home', playerName: getPlayerForEvent(homeTeam, 'yellow') });
  }
  if (awayYellows >= 2 && Math.random() < 0.3) {
    events.push({ minute: rnd(60, 90), type: 'red', team: 'away', playerName: getPlayerForEvent(awayTeam, 'yellow') });
  }
  // Subs
  for (const min of [60, 70, 80]) {
    if (Math.random() < 0.8) {
      events.push({ minute: min, type: 'substitution', team: 'home', playerName: getPlayerForEvent(homeTeam, 'sub'), detail: 'tactical change' });
    }
    if (Math.random() < 0.8) {
      events.push({ minute: min, type: 'substitution', team: 'away', playerName: getPlayerForEvent(awayTeam, 'sub'), detail: 'tactical change' });
    }
  }
  // Injury
  if (Math.random() < 0.12) {
    events.push({ minute: rnd(20, 85), type: 'injury', team: Math.random() < 0.5 ? 'home' : 'away', playerName: getPlayerForEvent(homeTeam, 'injury') });
  }
  // Momentum
  events.push({ minute: rnd(30, 75), type: 'momentum', team: Math.random() < 0.5 ? 'home' : 'away', playerName: '', detail: pick(['Wave of pressure', 'VAR check', 'Brilliant save', 'Chance wasted', 'Post hit!', 'Free kick danger']) });
  events.sort((a, b) => a.minute - b.minute);
  // addMinutes.push(totalMins);
  return events;
}

function buildPlayerRatings(team: Team, goals: number, isWin: boolean, isBig: boolean): PlayerMatchRating[] {
  const starters = team.players.filter(p => p.isInStartingXI).slice(0, 11);
  const goalScorers = new Set<string>();
  const actions = ['Won headers', 'Key tackle', 'Brilliant run', 'Clinical finish', 'Safe hands', 'Sharp pass', 'Great cross', 'Dangerous set piece', 'Pressing hero', 'Covered excellently'];
  let goalsLeft = goals;
  const ratings: PlayerMatchRating[] = starters.map((p, _i) => {
    let base = 6.5;
    if (isWin) base += 0.8;
    if (isBig) base += 0.3;
    base += (Math.random() - 0.5) * 2;
    const scored = goalsLeft > 0 && !['GK', 'CB'].includes(p.position) && Math.random() < 0.35;
    let pg = 0, pa = 0;
    if (scored && goalsLeft > 0) { pg = 1; goalsLeft--; base += 1.5; goalScorers.add(p.id); }
    if (!scored && Math.random() < 0.2 && goalsLeft > 0) { pa = 1; base += 0.8; }
    return {
      playerId: p.id, playerName: p.name, position: p.position,
      rating: clamp(parseFloat(base.toFixed(1)), 4.5, 10), goals: pg, assists: pa,
      keyAction: pick(actions),
    };
  });
  return ratings;
}

function buildStats(homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number): MatchStats {
  const hMod = getTacticalModifier(homeTeam);
  const aMod = getTacticalModifier(awayTeam);
  const totalPoss = hMod.possMod + aMod.possMod;
  const homePoss = Math.round(hMod.possMod / totalPoss * 100);
  const homeShots = rnd(Math.max(homeGoals, 4), Math.max(homeGoals * 4, 14));
  const awayShots = rnd(Math.max(awayGoals, 3), Math.max(awayGoals * 4, 12));
  const homeSoT = Math.max(homeGoals, rnd(homeGoals, Math.ceil(homeShots * 0.5)));
  const awaySoT = Math.max(awayGoals, rnd(awayGoals, Math.ceil(awayShots * 0.5)));
  return {
    homePossession: homePoss, awayPossession: 100 - homePoss,
    homeShots, awayShots, homeShotsOnTarget: homeSoT, awayShotsOnTarget: awaySoT,
    homeXG: parseFloat((homeGoals + Math.random() * 0.8).toFixed(2)),
    awayXG: parseFloat((awayGoals + Math.random() * 0.8).toFixed(2)),
    homeCorners: rnd(2, 10), awayCorners: rnd(1, 8),
  };
}

function getTacticalVerdict(homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number): string {
  const verdicts: string[] = [];
  if (homeGoals > awayGoals) {
    verdicts.push(`${homeTeam.shortName}'s ${homeTeam.tactics.style} approach proved superior, unlocking ${awayTeam.shortName}'s shape with precision.`);
    if (homeTeam.tactics.style === 'gegenpress') verdicts.push(`The relentless pressing disrupted ${awayTeam.shortName}'s build-up and forced costly errors.`);
    if (homeTeam.tactics.mentality === 'attacking') verdicts.push(`Going forward with intent, ${homeTeam.shortName} created space with dynamic movement.`);
  } else if (awayGoals > homeGoals) {
    verdicts.push(`${awayTeam.shortName} executed their ${awayTeam.tactics.style} blueprint to perfection, punishing ${homeTeam.shortName} on the counter.`);
    if (awayTeam.tactics.style === 'low-block') verdicts.push(`The compact defensive shape frustrated ${homeTeam.shortName} and hit them with deadly efficiency.`);
  } else {
    verdicts.push(`A tactical stalemate — both sides cancelled each other out in an evenly-contested encounter.`);
  }
  return verdicts[0];
}

function getMediaReaction(homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number, isPlayerHome: boolean): string {
  if (isPlayerHome && homeGoals > awayGoals) {
    return pick([`Masterclass! Your ${homeTeam.shortName} are flying.`, `Clinical and composed — the manager gets the tactics spot on.`, `${homeTeam.shortName} march on in style.`]);
  } else if (isPlayerHome && homeGoals < awayGoals) {
    return pick([`Dark day for ${homeTeam.shortName}. Tactical questions mount.`, `Shock defeat. The manager faces searching questions.`, `${homeTeam.shortName} crumble under pressure.`]);
  } else if (!isPlayerHome && awayGoals < homeGoals) {
    return pick([`${awayTeam.shortName} defeated — is the tournament dream over?`, `Questions over the tactics as ${awayTeam.shortName} fall short.`, `A night to forget for the away side.`]);
  }
  return pick([`A fair result in a tightly-contested affair.`, `Both teams will take something from this hard-fought draw.`, `Honours even after 90 minutes of intense football.`]);
}

export function generatePenalties(
  _homeTeam: Team, _awayTeam: Team, difficulty: Difficulty,
  isPlayerTeam: 'home' | 'away' | 'neither'
): { homeScore: number; awayScore: number; sequence: string[] } {
  const sequence: string[] = [];
  let homeScore = 0, awayScore = 0;
  const basePct = 0.75;
  const diffBonus = { home: difficulty === 'casual' ? 0.08 : difficulty === 'brutal' ? -0.06 : 0, away: difficulty === 'casual' ? 0.08 : difficulty === 'brutal' ? -0.06 : 0 };
  const homePct = isPlayerTeam === 'home' ? basePct + diffBonus.home : basePct;
  const awayPct = isPlayerTeam === 'away' ? basePct + diffBonus.away : basePct;
  for (let i = 0; i < 5; i++) {
    const hScored = Math.random() < homePct;
    const aScored = Math.random() < awayPct;
    if (hScored) homeScore++;
    if (aScored) awayScore++;
    sequence.push(`H ${hScored ? '✓' : '✗'}`);
    sequence.push(`A ${aScored ? '✓' : '✗'}`);
  }
  // Sudden death
  while (homeScore === awayScore) {
    const hScored = Math.random() < homePct;
    const aScored = Math.random() < awayPct;
    if (hScored) homeScore++;
    if (aScored) awayScore++;
    sequence.push(`H ${hScored ? '✓' : '✗'}`);
    sequence.push(`A ${aScored ? '✓' : '✗'}`);
    if (sequence.length > 30) break;
  }
  return { homeScore, awayScore, sequence };
}

export function simulateFullMatch(
  home: Team, away: Team, stage: MatchStage, difficulty: Difficulty, isPlayerMatch: boolean
): MatchResult {
  const { homeXG, awayXG } = calcXG(home, away, stage);
  const diffMod = isPlayerMatch ? (difficulty === 'casual' ? 0.15 : difficulty === 'brutal' ? -0.1 : 0) : 0;
  const adjHomeXG = clamp(homeXG + diffMod, 0.15, 3.8);
  const adjAwayXG = clamp(awayXG - diffMod * 0.5, 0.15, 3.5);
  let homeGoals = poissonRandom(adjHomeXG);
  let awayGoals = poissonRandom(adjAwayXG);
  let homePens: number | undefined, awayPens: number | undefined;
  let hasET = false;
  const isKnockout = stage !== 'group';
  if (isKnockout && homeGoals === awayGoals) {
    hasET = true;
    homeGoals += poissonRandom(adjHomeXG * 0.35);
    awayGoals += poissonRandom(adjAwayXG * 0.35);
    if (homeGoals === awayGoals) {
      const penResult = generatePenalties(home, away, difficulty, isPlayerMatch ? 'home' : 'neither');
      homePens = penResult.homeScore;
      awayPens = penResult.awayScore;
    }
  }
  const events = buildEvents(home, away, homeGoals, awayGoals, hasET, !!homePens);
  const stats = buildStats(home, away, homeGoals, awayGoals);
  const homeRatings = buildPlayerRatings(home, homeGoals, homeGoals > awayGoals, ['qf','sf','final'].includes(stage));
  const awayRatings = buildPlayerRatings(away, awayGoals, awayGoals > homeGoals, ['qf','sf','final'].includes(stage));
  const allRatings = [...homeRatings, ...awayRatings];
  const motm = allRatings.reduce((best, r) => r.rating > best.rating ? r : best, allRatings[0])?.playerName ?? 'Unknown';
  const events3D = buildMatch3DEvents(events, homeGoals, awayGoals);
  return {
    homeGoals, awayGoals, homePens, awayPens,
    events, events3D, stats, homeRatings, awayRatings,
    tacticalVerdict: getTacticalVerdict(home, away, homeGoals, awayGoals),
    mediaReaction: getMediaReaction(home, away, homeGoals, awayGoals, isPlayerMatch),
    motm,
  };
}

export function applyMatchToTeams(home: Team, away: Team, result: MatchResult): { home: Team; away: Team } {
  const hGoals = result.homeGoals;
  const aGoals = result.awayGoals;
  const hWin = hGoals > aGoals || (result.homePens !== undefined && result.homePens > (result.awayPens ?? 0));
  const aWin = aGoals > hGoals || (result.awayPens !== undefined && result.awayPens > (result.homePens ?? 0));
  const isDraw = !hWin && !aWin;
  const newHome = { ...home };
  const newAway = { ...away };
  newHome.form = [...home.form.slice(-4), hWin ? 1 : isDraw ? 0 : -1];
  newAway.form = [...away.form.slice(-4), aWin ? 1 : isDraw ? 0 : -1];
  newHome.groupGF += hGoals; newHome.groupGA += aGoals; newHome.groupGD = newHome.groupGF - newHome.groupGA;
  newAway.groupGF += aGoals; newAway.groupGA += hGoals; newAway.groupGD = newAway.groupGF - newAway.groupGA;
  newHome.groupMatchesPlayed++; newAway.groupMatchesPlayed++;
  if (hWin) newHome.groupPoints += 3;
  else if (isDraw) { newHome.groupPoints += 1; newAway.groupPoints += 1; }
  else newAway.groupPoints += 3;
  const moraleDeltaH = hWin ? 5 : isDraw ? 0 : -7;
  const moraleDeltaA = aWin ? 5 : isDraw ? 0 : -7;
  newHome.players = home.players.map(p => ({
    ...p, fitness: Math.max(50, p.fitness - rnd(3, 8)),
    morale: clamp(p.morale + moraleDeltaH + rnd(-2, 2), 20, 100),
  }));
  newAway.players = away.players.map(p => ({
    ...p, fitness: Math.max(50, p.fitness - rnd(3, 8)),
    morale: clamp(p.morale + moraleDeltaA + rnd(-2, 2), 20, 100),
  }));
  // const yellowMap = new Map<string, string>();
  result.events.forEach(ev => {
    if (ev.type === 'yellow') {
      const teamPlayers = ev.team === 'home' ? newHome.players : newAway.players;
      const player = teamPlayers.find(p => p.name === ev.playerName);
      if (player) {
        player.yellowCards++;
        if (player.yellowCards >= 2) { player.isSuspended = true; }
      }
    }
    if (ev.type === 'red') {
      const teamPlayers = ev.team === 'home' ? newHome.players : newAway.players;
      const player = teamPlayers.find(p => p.name === ev.playerName);
      if (player) { player.isSuspended = true; }
    }
  });
  for (const r of result.homeRatings) {
    const p = newHome.players.find(pl => pl.id === r.playerId);
    if (p) { p.goals += r.goals; p.assists += r.assists; p.matchRatings.push(r.rating); }
  }
  for (const r of result.awayRatings) {
    const p = newAway.players.find(pl => pl.id === r.playerId);
    if (p) { p.goals += r.goals; p.assists += r.assists; p.matchRatings.push(r.rating); }
  }
  return { home: newHome, away: newAway };
}
