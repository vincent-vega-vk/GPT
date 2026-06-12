import type { Team, Match, MatchStage } from '../types';
import { simulateFullMatch, applyMatchToTeams } from './match';

let matchIdCounter = 0;
function nextMatchId() { return `m${++matchIdCounter}`; }

export function generateGroupMatches(teams: Record<string, Team>): Match[] {
  const matches: Match[] = [];
  const groups = new Map<string, string[]>();
  for (const t of Object.values(teams)) {
    if (!groups.has(t.groupId)) groups.set(t.groupId, []);
    groups.get(t.groupId)!.push(t.id);
  }
  for (const [groupId, teamIds] of groups.entries()) {
    if (teamIds.length < 4) continue;
    const [t1, t2, t3, t4] = teamIds;
    // Round 1
    matches.push({ id: nextMatchId(), homeTeamId: t1, awayTeamId: t2, stage: 'group', groupId, roundNumber: 1, result: null, played: false });
    matches.push({ id: nextMatchId(), homeTeamId: t3, awayTeamId: t4, stage: 'group', groupId, roundNumber: 1, result: null, played: false });
    // Round 2
    matches.push({ id: nextMatchId(), homeTeamId: t1, awayTeamId: t3, stage: 'group', groupId, roundNumber: 2, result: null, played: false });
    matches.push({ id: nextMatchId(), homeTeamId: t2, awayTeamId: t4, stage: 'group', groupId, roundNumber: 2, result: null, played: false });
    // Round 3
    matches.push({ id: nextMatchId(), homeTeamId: t1, awayTeamId: t4, stage: 'group', groupId, roundNumber: 3, result: null, played: false });
    matches.push({ id: nextMatchId(), homeTeamId: t2, awayTeamId: t3, stage: 'group', groupId, roundNumber: 3, result: null, played: false });
  }
  return matches;
}

export function getGroupStandings(groupId: string, teams: Record<string, Team>, _matches: Match[]): Team[] {
  const groupTeams = Object.values(teams).filter(t => t.groupId === groupId);
  return groupTeams.sort((a, b) => {
    if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
    if (b.groupGD !== a.groupGD) return b.groupGD - a.groupGD;
    if (b.groupGF !== a.groupGF) return b.groupGF - a.groupGF;
    return a.name.localeCompare(b.name);
  });
}

export function getQualifiedTeams(teams: Record<string, Team>, _matches: Match[]): { top2: string[]; best8thirds: string[] } {
  const groups = [...new Set(Object.values(teams).map(t => t.groupId))].sort();
  const top2: string[] = [];
  const thirds: Team[] = [];
  for (const g of groups) {
    const standings = getGroupStandings(g, teams, _matches);
    if (standings.length >= 2) {
      top2.push(standings[0].id, standings[1].id);
      if (standings[2]) thirds.push(standings[2]);
    }
  }
  const best8thirds = thirds
    .sort((a, b) => {
      if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
      if (b.groupGD !== a.groupGD) return b.groupGD - a.groupGD;
      return b.groupGF - a.groupGF;
    })
    .slice(0, 8)
    .map(t => t.id);
  return { top2, best8thirds };
}

export function generateR32Matches(teams: Record<string, Team>, _groupMatches: Match[]): Match[] {
  const { top2, best8thirds } = getQualifiedTeams(teams, _groupMatches);
  // const groups = [...new Set(Object.values(teams).map(t => t.groupId))].sort();
  const matches: Match[] = [];
  const r32Teams: string[] = [...top2, ...best8thirds];
  // Pair them: 1A vs 2B, 1B vs 2A, etc. (simplified pairing)
  for (let i = 0; i < r32Teams.length; i += 2) {
    if (r32Teams[i] && r32Teams[i + 1]) {
      matches.push({
        id: nextMatchId(),
        homeTeamId: r32Teams[i],
        awayTeamId: r32Teams[i + 1],
        stage: 'r32',
        roundNumber: 4,
        result: null,
        played: false,
      });
    }
  }
  return matches;
}

export function generateNextKnockoutRound(
  matches: Match[],
  stage: MatchStage,
  _teams: Record<string, Team>
): Match[] {
  const prevStage = matches.filter(m => m.stage === stage && m.played);
  const winners: string[] = prevStage.map(m => {
    if (!m.result) return m.homeTeamId;
    const r = m.result;
    const hWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
    return hWin ? m.homeTeamId : m.awayTeamId;
  });
  const nextStage: MatchStage = stage === 'r32' ? 'r16' : stage === 'r16' ? 'qf' : stage === 'qf' ? 'sf' : 'final';
  const nextMatches: Match[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i] && winners[i + 1]) {
      nextMatches.push({
        id: nextMatchId(),
        homeTeamId: winners[i],
        awayTeamId: winners[i + 1],
        stage: nextStage,
        roundNumber: nextStage === 'r16' ? 5 : nextStage === 'qf' ? 6 : nextStage === 'sf' ? 7 : 8,
        result: null,
        played: false,
      });
    }
  }
  // 3rd place match for sf losers
  if (stage === 'sf') {
    const losers = prevStage.map(m => {
      if (!m.result) return m.awayTeamId;
      const r = m.result;
      const hWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
      return hWin ? m.awayTeamId : m.homeTeamId;
    });
    if (losers.length === 2 && losers[0] && losers[1]) {
      nextMatches.push({
        id: nextMatchId(),
        homeTeamId: losers[0],
        awayTeamId: losers[1],
        stage: '3rd',
        roundNumber: 8,
        result: null,
        played: false,
      });
    }
  }
  return nextMatches;
}

export function getNextPlayerMatch(playerTeamId: string, matches: Match[], _currentRound: number): Match | null {
  const upcoming = matches.filter(m =>
    !m.played &&
    (m.homeTeamId === playerTeamId || m.awayTeamId === playerTeamId)
  );
  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.roundNumber - b.roundNumber);
  return upcoming[0];
}

export function getStageLabel(stage: MatchStage): string {
  switch (stage) {
    case 'group': return 'Group Stage';
    case 'r32': return 'Round of 32';
    case 'r16': return 'Round of 16';
    case 'qf': return 'Quarter Final';
    case 'sf': return 'Semi Final';
    case '3rd': return '3rd Place Playoff';
    case 'final': return 'THE FINAL';
    default: return 'Match';
  }
}

export function isTournamentComplete(matches: Match[]): boolean {
  const final = matches.filter(m => m.stage === 'final');
  return final.length > 0 && final.every(m => m.played);
}

export function simulateAIMatches(
  matches: Match[],
  teams: Record<string, Team>,
  _roundNumber: number,
  playerTeamId: string
): { updatedMatches: Match[]; updatedTeams: Record<string, Team> } {
  const updatedTeams = { ...teams };
  const updatedMatches = matches.map(m => {
    if (m.played || m.roundNumber !== _roundNumber) return m;
    if (m.homeTeamId === playerTeamId || m.awayTeamId === playerTeamId) return m;
    const homeTeam = updatedTeams[m.homeTeamId];
    const awayTeam = updatedTeams[m.awayTeamId];
    if (!homeTeam || !awayTeam) return m;
    const result = simulateFullMatch(homeTeam, awayTeam, m.stage, 'realistic', false);
    const { home: newHome, away: newAway } = applyMatchToTeams(homeTeam, awayTeam, result);
    updatedTeams[homeTeam.id] = newHome;
    updatedTeams[awayTeam.id] = newAway;
    return { ...m, result, played: true };
  });
  return { updatedMatches, updatedTeams };
}
