import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getGroupStandings } from '../engine/tournament';
import clsx from 'clsx';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function GroupTables() {
  const teams = useGameStore(s => s.teams);
  const matches = useGameStore(s => s.matches);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const setPhase = useGameStore(s => s.setPhase);
  const goToPreMatch = useGameStore(s => s.goToPreMatch);
  const [activeGroup, setActiveGroup] = useState(() => {
    const pt = playerTeamId ? teams[playerTeamId] : null;
    return pt?.groupId ?? 'A';
  });

  const playerGroup = playerTeamId ? teams[playerTeamId]?.groupId : null;
  // const groupMatches = matches.filter(m => m.stage === 'group');
  // const allGroupsPlayed = groupMatches.every(m => m.played);
  const knockoutStarted = matches.some(m => m.stage === 'r32');

  function renderGroup(groupId: string) {
    const standings = getGroupStandings(groupId, teams, matches);
    const isPlayerGroup = playerGroup === groupId;
    return (
      <div key={groupId} className={clsx(
        'bg-gray-900 border rounded-xl overflow-hidden',
        isPlayerGroup ? 'border-amber-600/60' : 'border-gray-800',
      )}>
        <div className={clsx('px-4 py-2 border-b flex justify-between items-center', isPlayerGroup ? 'border-amber-700 bg-amber-900/20' : 'border-gray-800 bg-gray-800/50')}>
          <h3 className={clsx('font-black text-base', isPlayerGroup ? 'text-amber-400' : 'text-white')}>Group {groupId}</h3>
          {isPlayerGroup && <span className="text-xs text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded">YOUR GROUP</span>}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left px-3 py-1.5">Team</th>
              <th className="px-1 py-1.5 text-center">P</th>
              <th className="px-1 py-1.5 text-center">W</th>
              <th className="px-1 py-1.5 text-center">D</th>
              <th className="px-1 py-1.5 text-center">L</th>
              <th className="px-1 py-1.5 text-center">GF</th>
              <th className="px-1 py-1.5 text-center">GA</th>
              <th className="px-1 py-1.5 text-center">GD</th>
              <th className="px-1 py-1.5 text-center font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => {
              const wins = Math.round((team.groupPoints - (team.groupMatchesPlayed - Math.round((team.groupPoints % 3) / 3))) / 3);
              const gamesPlayed = team.groupMatchesPlayed;
              const pts = team.groupPoints;
              const draws = pts - wins * 3;
              const losses = gamesPlayed - wins - draws;
              const isQualified = i < 2;
              const isMaybeThird = i === 2;
              const isPlayer = team.id === playerTeamId;
              return (
                <tr key={team.id} className={clsx(
                  'border-b border-gray-800/50 last:border-0',
                  isQualified ? 'bg-emerald-900/10' : isMaybeThird ? 'bg-amber-900/10' : '',
                  isPlayer && 'bg-blue-900/20',
                )}>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('text-xs font-bold w-4', isQualified ? 'text-emerald-400' : isMaybeThird ? 'text-amber-400' : 'text-gray-600')}>{i + 1}</span>
                      <span>{team.flag}</span>
                      <span className={clsx('font-medium', isPlayer ? 'text-amber-300' : 'text-white')}>{team.shortName}</span>
                    </div>
                  </td>
                  <td className="text-center text-gray-400 py-1.5">{gamesPlayed}</td>
                  <td className="text-center text-gray-400 py-1.5">{Math.max(0, wins)}</td>
                  <td className="text-center text-gray-400 py-1.5">{Math.max(0, draws)}</td>
                  <td className="text-center text-gray-400 py-1.5">{Math.max(0, losses)}</td>
                  <td className="text-center text-gray-400 py-1.5">{team.groupGF}</td>
                  <td className="text-center text-gray-400 py-1.5">{team.groupGA}</td>
                  <td className={clsx('text-center py-1.5', team.groupGD > 0 ? 'text-emerald-400' : team.groupGD < 0 ? 'text-red-400' : 'text-gray-400')}>
                    {team.groupGD > 0 ? '+' : ''}{team.groupGD}
                  </td>
                  <td className="text-center font-black text-white py-1.5">{pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex gap-2 px-3 py-2 text-xs text-gray-600 border-t border-gray-800/50">
          <span className="w-2.5 h-2.5 bg-emerald-500/30 rounded-sm mt-0.5 shrink-0"></span> Qualified
          <span className="w-2.5 h-2.5 bg-amber-500/30 rounded-sm mt-0.5 shrink-0 ml-2"></span> Possible 3rd
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">GROUP TABLES</h1>
            <p className="text-sm text-gray-500">FIFA World Cup 2026 · Groups A–L</p>
          </div>
          <div className="flex gap-2">
            {knockoutStarted && (
              <button onClick={() => setPhase('KNOCKOUT_BRACKET')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
                View Bracket →
              </button>
            )}
            <button onClick={goToPreMatch} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-sm">
              Next Match →
            </button>
          </div>
        </div>
        {/* Group filter */}
        <div className="max-w-7xl mx-auto mt-3 flex flex-wrap gap-1">
          {GROUPS.map(g => {
            const hasTeams = Object.values(teams).some(t => t.groupId === g);
            if (!hasTeams) return null;
            return (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={clsx('px-3 py-1 rounded text-xs font-bold transition-all',
                  activeGroup === g ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  playerGroup === g && activeGroup !== g && 'border border-amber-700',
                )}>
                {g}
              </button>
            );
          })}
          <button onClick={() => setActiveGroup('ALL')}
            className={clsx('px-3 py-1 rounded text-xs font-bold transition-all',
              activeGroup === 'ALL' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
            )}>
            All
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeGroup === 'ALL' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {GROUPS.filter(g => Object.values(teams).some(t => t.groupId === g)).map(g => renderGroup(g))}
            </div>
          ) : (
            <div className="max-w-lg">
              {renderGroup(activeGroup)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
