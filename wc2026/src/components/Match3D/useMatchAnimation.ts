import { useMemo } from 'react';
import type { Match3DEvent } from '../../types';

export type PlayerPos = { x: number; z: number };
export type TeamPositions = PlayerPos[]; // 11 players

const W = 105;
const D = 68;

// Formation position templates (home team, attacking right: x increases toward opp goal)
const FORMATIONS: Record<string, [number, number][]> = {
  '4-3-3': [
    [7, 34],
    [22, 58], [20, 44], [20, 24], [22, 10],
    [45, 52], [43, 34], [45, 16],
    [72, 60], [78, 34], [72, 8],
  ],
  '4-4-2': [
    [7, 34],
    [22, 58], [20, 44], [20, 24], [22, 10],
    [48, 60], [42, 44], [42, 24], [48, 8],
    [72, 50], [72, 18],
  ],
  '4-2-3-1': [
    [7, 34],
    [22, 58], [20, 44], [20, 24], [22, 10],
    [38, 44], [38, 24],
    [60, 60], [58, 34], [60, 8],
    [78, 34],
  ],
  '3-5-2': [
    [7, 34],
    [20, 52], [18, 34], [20, 16],
    [42, 62], [40, 50], [38, 34], [40, 18], [42, 6],
    [72, 44], [72, 24],
  ],
  '3-4-3': [
    [7, 34],
    [20, 50], [18, 34], [20, 18],
    [42, 58], [40, 42], [40, 26], [42, 10],
    [72, 60], [76, 34], [72, 8],
  ],
  '5-3-2': [
    [7, 34],
    [20, 64], [20, 50], [18, 34], [20, 18], [20, 4],
    [45, 50], [43, 34], [45, 18],
    [72, 44], [72, 24],
  ],
  '5-4-1': [
    [7, 34],
    [20, 64], [20, 50], [18, 34], [20, 18], [20, 4],
    [48, 58], [42, 44], [42, 24], [48, 10],
    [72, 34],
  ],
  '4-1-4-1': [
    [7, 34],
    [22, 58], [20, 44], [20, 24], [22, 10],
    [35, 34],
    [55, 60], [50, 46], [50, 22], [55, 8],
    [78, 34],
  ],
  '4-3-1-2': [
    [7, 34],
    [22, 58], [20, 44], [20, 24], [22, 10],
    [40, 52], [38, 34], [40, 16],
    [58, 34],
    [72, 44], [72, 24],
  ],
  '3-4-2-1': [
    [7, 34],
    [20, 52], [18, 34], [20, 16],
    [40, 62], [38, 44], [38, 24], [40, 6],
    [60, 50], [60, 18],
    [78, 34],
  ],
};

export function getFormationPositions(formation: string, isHome: boolean): [number, number][] {
  const template = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  if (isHome) return template;
  return template.map(([x, z]) => [W - x, D - z] as [number, number]);
}

// Compute target positions based on event type
export function getEventPositions(
  event: Match3DEvent,
  homePosns: [number, number][],
  awayPosns: [number, number][],
  _homeTeamId: string,
): { home: [number, number][]; away: [number, number][]; ballPos: [number, number, number] } {
  const home = homePosns.map(p => [...p] as [number, number]);
  const away = awayPosns.map(p => [...p] as [number, number]);
  const [bx, bz] = event.ballTo;
  const ballY = event.type === 'shot' || event.type === 'goal' ? 1.5 : event.type === 'clearance' || event.type === 'header' ? 3 : 0.3;

  const isHomeTeam = event.team === 'home';

  switch (event.type) {
    case 'goal':
    case 'shot': {
      // Attacking players surge forward
      const attack = isHomeTeam ? home : away;
      for (let i = 8; i < 11; i++) {
        attack[i][0] += isHomeTeam ? 5 : -5;
        attack[i][1] += (Math.random() - 0.5) * 8;
      }
      // Defensive players react
      const def = isHomeTeam ? away : home;
      for (let i = 1; i < 5; i++) {
        def[i][0] += isHomeTeam ? -3 : 3;
      }
      break;
    }
    case 'counter': {
      // Fast break: strikers race forward
      const attack = isHomeTeam ? home : away;
      for (let i = 8; i < 11; i++) {
        attack[i][0] += isHomeTeam ? 10 : -10;
      }
      break;
    }
    case 'corner': {
      // Crowd box
      const attack = isHomeTeam ? home : away;
      const def = isHomeTeam ? away : home;
      for (let i = 1; i < 11; i++) {
        if (i > 4) { attack[i][0] = isHomeTeam ? 85 + Math.random() * 10 : 10 + Math.random() * 10; attack[i][1] = 20 + Math.random() * 28; }
        if (i >= 1 && i <= 5) { def[i][0] = isHomeTeam ? 80 + Math.random() * 10 : 15 + Math.random() * 10; def[i][1] = 18 + Math.random() * 32; }
      }
      break;
    }
    case 'yellow':
    case 'red':
    case 'foul': {
      // Cluster around foul position
      const team = isHomeTeam ? home : away;
      team[5][0] = bx; team[5][1] = bz;
      break;
    }
    default:
      break;
  }

  return { home, away, ballPos: [bx, ballY, bz] };
}

// Get the current event index for a given match minute
export function getCurrentEventIndex(events: Match3DEvent[], minute: number): number {
  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].minute <= minute) idx = i;
    else break;
  }
  return idx;
}

// Generate 3D events from match result events
export function buildMatch3DEvents(
  events: { minute: number; type: string; team: 'home' | 'away'; playerName: string; detail?: string }[],
  _homeGoals: number,
  _awayGoals: number,
): Match3DEvent[] {
  const W_half = W / 2;
  const D_half = D / 2;
  let idCounter = 0;

  const result: Match3DEvent[] = [];

  // Kickoff
  result.push({
    id: `ev-${idCounter++}`,
    minute: 0, stoppage: 0,
    type: 'kickoff', team: 'home',
    primaryPlayerName: 'Kickoff',
    ballFrom: [W_half, D_half], ballTo: [W_half + 5, D_half],
    description: 'Kickoff!', isKeyEvent: false,
  });

  // Map existing events to 3D events
  events.forEach(ev => {
    const isHome = ev.team === 'home';
    const teamSide = isHome ? 1 : -1;

    let from: [number, number] = [W_half, D_half];
    let to: [number, number] = [W_half, D_half];
    let type = ev.type as Match3DEvent['type'];

    switch (ev.type) {
      case 'goal':
        from = [isHome ? 70 + Math.random() * 10 : 25 - Math.random() * 10, D_half + (Math.random() - 0.5) * 20];
        to = [isHome ? 103 : 2, D_half + (Math.random() - 0.5) * 5];
        break;
      case 'yellow':
        from = [W_half + teamSide * (Math.random() * 20), D_half + (Math.random() - 0.5) * 20];
        to = [...from] as [number, number];
        break;
      case 'red':
        from = [W_half + teamSide * (Math.random() * 20), D_half + (Math.random() - 0.5) * 20];
        to = [...from] as [number, number];
        break;
      case 'injury':
        from = [W_half + (Math.random() - 0.5) * 40, D_half + (Math.random() - 0.5) * 30];
        to = [...from] as [number, number];
        break;
      case 'substitution':
        from = [W_half, D_half];
        to = [W_half, D_half];
        break;
      case 'save':
        from = [isHome ? 80 : 25, D_half + (Math.random() - 0.5) * 10];
        to = [isHome ? 100 : 5, D_half + (Math.random() - 0.5) * 5];
        type = 'save';
        break;
      case 'momentum':
        from = [W_half, D_half];
        to = [isHome ? W_half + 15 : W_half - 15, D_half];
        type = 'chance';
        break;
      default:
        from = [W_half + teamSide * (Math.random() * 20), D_half + (Math.random() - 0.5) * 20];
        to = [isHome ? from[0] + 10 : from[0] - 10, from[1] + (Math.random() - 0.5) * 5];
    }

    result.push({
      id: `ev-${idCounter++}`,
      minute: ev.minute,
      stoppage: 0,
      type,
      team: ev.team,
      primaryPlayerName: ev.playerName,
      ballFrom: from,
      ballTo: to,
      description: ev.detail || `${ev.playerName} (${ev.type})`,
      isKeyEvent: ['goal', 'red', 'save'].includes(ev.type),
      xG: ev.type === 'goal' ? 0.5 + Math.random() * 0.4 : undefined,
    });
  });

  // Add some passing/dribble events in quiet periods
  const occupiedMinutes = new Set(result.map(e => e.minute));
  [8, 18, 28, 38, 52, 62, 70, 80].forEach(m => {
    if (!occupiedMinutes.has(m)) {
      const isHome = Math.random() > 0.5;
      const teamSide = isHome ? 1 : -1;
      result.push({
        id: `ev-${idCounter++}`,
        minute: m, stoppage: 0,
        type: Math.random() > 0.5 ? 'pass' : 'dribble',
        team: isHome ? 'home' : 'away',
        primaryPlayerName: 'Player',
        ballFrom: [W_half + teamSide * (Math.random() * 15), D_half + (Math.random() - 0.5) * 20],
        ballTo: [W_half + teamSide * (Math.random() * 25), D_half + (Math.random() - 0.5) * 15],
        description: 'Build-up play',
        isKeyEvent: false,
      });
    }
  });

  result.sort((a, b) => a.minute - b.minute || a.stoppage - b.stoppage);
  return result;
}

export function useMemoizedFormationPositions(homeFormation: string, awayFormation: string) {
  return useMemo(() => ({
    home: getFormationPositions(homeFormation, true),
    away: getFormationPositions(awayFormation, false),
  }), [homeFormation, awayFormation]);
}
