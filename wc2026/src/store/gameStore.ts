import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, GamePhase, Difficulty, TeamTactics, MatchResult } from '../types';
import { generateTournamentTeams } from '../data/teams';
import { generateGroupMatches, generateR32Matches, generateNextKnockoutRound, getNextPlayerMatch, simulateAIMatches, isTournamentComplete } from '../engine/tournament';
import { simulateFullMatch, applyMatchToTeams } from '../engine/match';
import { generatePressQuestions, pickDramaEvent } from '../engine/drama';

interface GameStore extends GameState {
  setDifficulty: (d: Difficulty) => void;
  setManagerName: (n: string) => void;
  selectTeam: (teamId: string) => void;
  startTournament: () => void;
  setPhase: (p: GamePhase) => void;
  goToPreMatch: () => void;
  goToPostMatch: (result: MatchResult, matchId: string) => void;
  advanceAfterMatch: () => void;
  updateTactics: (tactics: Partial<TeamTactics>) => void;
  togglePlayerInXI: (playerId: string) => void;
  simulateCurrentMatch: () => void;
  makeSubstitution: (outId: string, inId: string) => void;
  changeTacticsMidMatch: (changes: Partial<TeamTactics>) => void;
  resolveDrama: (choiceId: string) => void;
  answerPress: (questionIdx: number, optionIdx: number) => void;
  dismissNotification: () => void;
  saveGame: () => void;
  loadGame: () => boolean;
  newGame: () => void;
  applyMoraleDelta: (teamId: string, delta: number) => void;
  addLog: (entry: string) => void;
}

const initialState: GameState = {
  phase: 'WELCOME',
  difficulty: 'realistic',
  managerName: '',
  playerTeamId: null,
  teams: {},
  matches: [],
  currentMatchId: null,
  currentRound: 1,
  groupsGenerated: false,
  knockoutGenerated: false,
  mediaHeat: 30,
  managerRep: 50,
  tournamentLog: [],
  pendingDrama: null,
  pendingPress: null,
  notifications: [],
  savedAt: null,
  penaltyShootout: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setDifficulty: (d) => set({ difficulty: d }),
      setManagerName: (n) => set({ managerName: n }),

      selectTeam: (teamId) => {
        const { teams } = get();
        const updatedTeams = { ...teams };
        Object.keys(updatedTeams).forEach(id => {
          updatedTeams[id] = { ...updatedTeams[id], isPlayerTeam: id === teamId };
        });
        const matches = generateGroupMatches(updatedTeams);
        set({
          playerTeamId: teamId,
          teams: updatedTeams,
          matches,
          currentRound: 1,
          groupsGenerated: true,
          tournamentLog: [`Tournament started! Managing ${updatedTeams[teamId]?.name ?? 'your team'}.`],
        });
      },

      startTournament: () => {
        const { playerTeamId, teams, groupsGenerated, matches: existingMatches } = get();
        if (!playerTeamId) return;
        // Generate matches only if not already done by selectTeam
        const matches = groupsGenerated && existingMatches.length > 0 ? existingMatches : generateGroupMatches(teams);
        set({
          matches,
          currentRound: 1,
          groupsGenerated: true,
          phase: 'SQUAD_HUB',
          tournamentLog: [`Tournament started! Managing ${teams[playerTeamId]?.name ?? 'your team'}.`],
        });
      },

      setPhase: (p) => set({ phase: p }),

      goToPreMatch: () => {
        const { matches, playerTeamId, currentRound } = get();
        if (!playerTeamId) return;
        const nextMatch = getNextPlayerMatch(playerTeamId, matches, currentRound);
        if (!nextMatch) {
          set({ phase: 'TOURNAMENT_END' });
          return;
        }
        set({ currentMatchId: nextMatch.id, phase: 'PRE_MATCH' });
      },

      goToPostMatch: (result, matchId) => {
        const { matches, teams, playerTeamId, tournamentLog } = get();
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        const homeTeam = teams[match.homeTeamId];
        const awayTeam = teams[match.awayTeamId];
        if (!homeTeam || !awayTeam) return;
        const { home: newHome, away: newAway } = applyMatchToTeams(homeTeam, awayTeam, result);
        const updatedTeams = { ...teams, [homeTeam.id]: newHome, [awayTeam.id]: newAway };
        const updatedMatches = matches.map(m => m.id === matchId ? { ...m, result, played: true } : m);
        const isWin = playerTeamId === match.homeTeamId
          ? result.homeGoals > result.awayGoals || (result.homePens !== undefined && result.homePens > (result.awayPens ?? 0))
          : result.awayGoals > result.homeGoals || (result.awayPens !== undefined && result.awayPens > (result.homePens ?? 0));
        const logEntry = `${homeTeam.shortName} ${result.homeGoals}-${result.awayGoals} ${awayTeam.shortName}`;
        const heat = isWin ? Math.max(0, get().mediaHeat - 5) : Math.min(100, get().mediaHeat + 10);
        const rep = isWin ? Math.min(100, get().managerRep + 5) : Math.max(0, get().managerRep - 5);
        set({
          teams: updatedTeams,
          matches: updatedMatches,
          phase: 'POST_MATCH',
          tournamentLog: [...tournamentLog, logEntry],
          mediaHeat: heat,
          managerRep: rep,
        });
      },

      advanceAfterMatch: () => {
        const { matches, teams, playerTeamId, currentRound, mediaHeat, tournamentLog } = get();
        if (!playerTeamId) return;

        const pTeam = teams[playerTeamId];
        const avgMorale = pTeam ? pTeam.players.reduce((a, p) => a + p.morale, 0) / Math.max(1, pTeam.players.length) : 60;
        const playerMatch = matches.find(m => m.id === get().currentMatchId);

        // Step 1: Check player elimination in knockout
        let playerEliminated = false;
        if (playerMatch && playerMatch.result && playerMatch.stage !== 'group') {
          const r = playerMatch.result;
          const hWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
          if (playerMatch.homeTeamId === playerTeamId && !hWin) playerEliminated = true;
          if (playerMatch.awayTeamId === playerTeamId && hWin) playerEliminated = true;
        }

        // Step 2: Advance tournament state BEFORE press conference
        let newMatches = [...matches];
        let newRound = currentRound;

        const groupMatches = newMatches.filter(m => m.stage === 'group');
        const allGroupPlayed = groupMatches.length > 0 && groupMatches.every(m => m.played);

        if (allGroupPlayed && !get().knockoutGenerated) {
          // Group stage complete → generate R32
          const r32 = generateR32Matches(teams, newMatches);
          newMatches = [...newMatches, ...r32];
          newRound = 4;
          set({ matches: newMatches, knockoutGenerated: true, currentRound: newRound });
        } else if (get().knockoutGenerated) {
          // Check if a knockout round just finished and needs the next one
          const stages = ['r32', 'r16', 'qf', 'sf'] as const;
          for (const stage of stages) {
            const stageMs = newMatches.filter(m => m.stage === stage);
            if (stageMs.length > 0 && stageMs.every(m => m.played)) {
              const nextStageId = stage === 'r32' ? 'r16' : stage === 'r16' ? 'qf' : stage === 'qf' ? 'sf' : 'final';
              const nextExists = newMatches.some(m => m.stage === nextStageId || (stage === 'sf' && m.stage === 'final'));
              if (!nextExists) {
                const generated = generateNextKnockoutRound(newMatches, stage, teams);
                newMatches = [...newMatches, ...generated];
                newRound = currentRound + 1;
                set({ matches: newMatches, currentRound: newRound });
                break;
              }
            }
          }
        }

        // Step 3: Check tournament completion
        if (isTournamentComplete(newMatches)) {
          set({ phase: 'TOURNAMENT_END' });
          return;
        }

        // Step 4: Player eliminated → end
        if (playerEliminated) {
          set({ phase: 'TOURNAMENT_END' });
          return;
        }

        // Step 5: Press conference / dressing room
        const isWin = playerTeamId === playerMatch?.homeTeamId
          ? (playerMatch?.result?.homeGoals ?? 0) > (playerMatch?.result?.awayGoals ?? 0) ||
            (playerMatch?.result?.homePens !== undefined && (playerMatch?.result?.homePens ?? 0) > (playerMatch?.result?.awayPens ?? 0))
          : (playerMatch?.result?.awayGoals ?? 0) > (playerMatch?.result?.homeGoals ?? 0) ||
            (playerMatch?.result?.awayPens !== undefined && (playerMatch?.result?.awayPens ?? 0) > (playerMatch?.result?.homePens ?? 0));
        const pressQs = generatePressQuestions(playerMatch?.result ?? null, playerMatch?.stage ?? 'group', isWin, mediaHeat);
        const prevEventIds = tournamentLog.filter(l => l.startsWith('drama:')).map(l => l.split(':')[1]);
        const drama = pickDramaEvent(newRound, mediaHeat, avgMorale, prevEventIds);

        if (drama && Math.random() < 0.35) {
          set({ pendingDrama: drama, pendingPress: pressQs, phase: 'DRESSING_ROOM' });
        } else {
          set({ pendingPress: pressQs, phase: 'PRESS_CONFERENCE' });
        }
      },

      updateTactics: (tactics) => {
        const { playerTeamId, teams } = get();
        if (!playerTeamId) return;
        const team = teams[playerTeamId];
        if (!team) return;
        set({ teams: { ...teams, [playerTeamId]: { ...team, tactics: { ...team.tactics, ...tactics } } } });
      },

      togglePlayerInXI: (playerId) => {
        const { playerTeamId, teams } = get();
        if (!playerTeamId) return;
        const team = teams[playerTeamId];
        if (!team) return;
        const currentXI = team.players.filter(p => p.isInStartingXI);
        const player = team.players.find(p => p.id === playerId);
        if (!player) return;
        if (player.isInStartingXI) {
          const updatedPlayers = team.players.map(p => p.id === playerId ? { ...p, isInStartingXI: false } : p);
          set({ teams: { ...teams, [playerTeamId]: { ...team, players: updatedPlayers } } });
        } else if (currentXI.length < 11) {
          const updatedPlayers = team.players.map(p => p.id === playerId ? { ...p, isInStartingXI: true } : p);
          set({ teams: { ...teams, [playerTeamId]: { ...team, players: updatedPlayers } } });
        }
      },

      simulateCurrentMatch: () => {
        const { currentMatchId, matches, teams, playerTeamId, difficulty } = get();
        if (!currentMatchId || !playerTeamId) return;
        const match = matches.find(m => m.id === currentMatchId);
        if (!match) return;
        // Simulate AI matches for same round
        const { updatedMatches: aiMatches, updatedTeams: aiTeams } = simulateAIMatches(matches, teams, match.roundNumber, playerTeamId);
        // Simulate player match (effects will be applied in goToPostMatch)
        const homeTeam = aiTeams[match.homeTeamId];
        const awayTeam = aiTeams[match.awayTeamId];
        if (!homeTeam || !awayTeam) return;
        const result = simulateFullMatch(homeTeam, awayTeam, match.stage, difficulty, true);
        // DON'T apply match effects to player's teams here — goToPostMatch will do it
        const finalMatches = aiMatches.map(m => m.id === currentMatchId ? { ...m, result, played: true } : m);
        set({
          teams: aiTeams, // AI team effects already applied; player match effects deferred
          matches: finalMatches,
          phase: 'LIVE_MATCH',
        });
      },

      makeSubstitution: (outId, inId) => {
        const { playerTeamId, teams } = get();
        if (!playerTeamId) return;
        const team = teams[playerTeamId];
        if (!team) return;
        const updatedPlayers = team.players.map(p => {
          if (p.id === outId) return { ...p, isInStartingXI: false };
          if (p.id === inId) return { ...p, isInStartingXI: true };
          return p;
        });
        set({ teams: { ...teams, [playerTeamId]: { ...team, players: updatedPlayers } } });
      },

      changeTacticsMidMatch: (changes) => {
        const { playerTeamId, teams } = get();
        if (!playerTeamId) return;
        const team = teams[playerTeamId];
        if (!team) return;
        set({ teams: { ...teams, [playerTeamId]: { ...team, tactics: { ...team.tactics, ...changes } } } });
      },

      resolveDrama: (choiceId) => {
        const { pendingDrama, playerTeamId, teams, tournamentLog, mediaHeat } = get();
        if (!pendingDrama || !playerTeamId) return;
        const choice = pendingDrama.choices.find(c => c.id === choiceId);
        if (!choice) return;
        const team = teams[playerTeamId];
        if (!team) return;
        const updatedPlayers = team.players.map(p => ({
          ...p,
          morale: Math.max(20, Math.min(100, p.morale + choice.moraleDelta + (Math.random() * 4 - 2))),
        }));
        const newChemistry = Math.max(30, Math.min(100, team.chemistry + choice.chemistrydelta));
        set({
          teams: { ...teams, [playerTeamId]: { ...team, players: updatedPlayers, chemistry: newChemistry } },
          pendingDrama: null,
          tournamentLog: [...tournamentLog, `drama:${pendingDrama.id}`],
          mediaHeat: Math.max(0, mediaHeat - 5),
          phase: 'PRESS_CONFERENCE',
          // pendingPress was already set by advanceAfterMatch; keep it if set, else generate fallback
        });
      },

      answerPress: (questionIdx, optionIdx) => {
        const { pendingPress, playerTeamId, teams, mediaHeat, managerRep } = get();
        if (!pendingPress) return;
        const question = pendingPress[questionIdx];
        if (!question) return;
        const option = question.options[optionIdx];
        if (!option) return;
        const team = teams[playerTeamId ?? ''];
        if (team) {
          const updatedPlayers = team.players.map(p => ({
            ...p, morale: Math.max(20, Math.min(100, p.morale + option.moraleDelta * 0.3)),
          }));
          set({ teams: { ...teams, [team.id]: { ...team, players: updatedPlayers } } });
        }
        const newHeat = Math.max(0, Math.min(100, mediaHeat + option.pressureDelta));
        const newRep = Math.max(0, Math.min(100, managerRep + option.moraleDelta * 0.2));
        set({ mediaHeat: newHeat, managerRep: newRep });
      },

      dismissNotification: () => {
        const { notifications } = get();
        set({ notifications: notifications.slice(1) });
      },

      saveGame: () => {
        set({ savedAt: new Date().toISOString() });
      },

      loadGame: () => {
        const saved = localStorage.getItem('wc2026_save');
        if (!saved) return false;
        try {
          const state = JSON.parse(saved);
          set(state.state || state);
          return true;
        } catch {
          return false;
        }
      },

      newGame: () => {
        const teams = generateTournamentTeams();
        set({ ...initialState, teams });
      },

      applyMoraleDelta: (teamId, delta) => {
        const { teams } = get();
        const team = teams[teamId];
        if (!team) return;
        const updatedPlayers = team.players.map(p => ({
          ...p, morale: Math.max(20, Math.min(100, p.morale + delta)),
        }));
        set({ teams: { ...teams, [teamId]: { ...team, players: updatedPlayers } } });
      },

      addLog: (entry) => {
        set({ tournamentLog: [...get().tournamentLog, entry] });
      },
    }),
    {
      name: 'wc2026_save',
    }
  )
);
