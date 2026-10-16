import { useGameStore } from '../store/gameStore';
import { getNextPlayerMatch, getStageLabel } from '../engine/tournament';
import clsx from 'clsx';

export default function BetweenMatches() {
  const teams = useGameStore(s => s.teams);
  const matches = useGameStore(s => s.matches);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const currentRound = useGameStore(s => s.currentRound);
  const managerRep = useGameStore(s => s.managerRep);
  const mediaHeat = useGameStore(s => s.mediaHeat);
  const tournamentLog = useGameStore(s => s.tournamentLog);
  const goToPreMatch = useGameStore(s => s.goToPreMatch);
  const setPhase = useGameStore(s => s.setPhase);
  const managerName = useGameStore(s => s.managerName);

  const playerTeam = playerTeamId ? teams[playerTeamId] : null;
  const nextMatch = playerTeamId ? getNextPlayerMatch(playerTeamId, matches, currentRound) : null;
  const nextOpponent = nextMatch
    ? teams[nextMatch.homeTeamId === playerTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId]
    : null;

  const injuries = playerTeam?.players.filter(p => p.isInjured) ?? [];
  const suspended = playerTeam?.players.filter(p => p.isSuspended) ?? [];
  const avgFitness = playerTeam ? Math.round(playerTeam.players.reduce((a, p) => a + p.fitness, 0) / playerTeam.players.length) : 0;
  const avgMorale = playerTeam ? Math.round(playerTeam.players.reduce((a, p) => a + p.morale, 0) / playerTeam.players.length) : 0;

  const recentNews = [...tournamentLog].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">MANAGER HQ</h1>
            <p className="text-sm text-gray-500">Manager: {managerName}{playerTeam ? ` · ${playerTeam.name} ${playerTeam.flag}` : ''}</p>
          </div>
          {nextMatch && (
            <button onClick={goToPreMatch} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-base shadow-lg shadow-amber-900/40">
              NEXT MATCH →
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Next Match */}
          {nextOpponent && nextMatch && (
            <div className="bg-gray-900 border border-amber-700/50 rounded-xl p-5">
              <h2 className="text-xs text-amber-400 uppercase tracking-widest mb-3">Next Match</h2>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl">{playerTeam?.flag}</div>
                  <div className="text-xs text-gray-400 mt-1">{playerTeam?.shortName}</div>
                </div>
                <div className="flex-1 text-center text-gray-600 font-black text-lg">VS</div>
                <div className="text-center">
                  <div className="text-4xl">{nextOpponent.flag}</div>
                  <div className="text-xs text-gray-400 mt-1">{nextOpponent.shortName}</div>
                </div>
              </div>
              <div className="text-center mt-3">
                <span className="text-xs bg-gray-800 px-3 py-1 rounded-full text-amber-400 font-bold uppercase">{getStageLabel(nextMatch.stage)}</span>
              </div>
            </div>
          )}
          {/* Team Status */}
          {playerTeam && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-xs text-amber-400 uppercase tracking-widest mb-3">Team Status</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Morale</span>
                    <span className={clsx('font-bold', avgMorale > 70 ? 'text-emerald-400' : avgMorale > 50 ? 'text-amber-400' : 'text-red-400')}>{avgMorale}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded overflow-hidden">
                    <div style={{ width: `${avgMorale}%`, background: avgMorale > 70 ? '#10b981' : '#f59e0b' }} className="h-full rounded" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Fitness</span>
                    <span className={clsx('font-bold', avgFitness > 80 ? 'text-emerald-400' : 'text-yellow-400')}>{avgFitness}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded overflow-hidden">
                    <div style={{ width: `${avgFitness}%`, background: '#3b82f6' }} className="h-full rounded" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Chemistry</span>
                    <span className="font-bold text-blue-400">{playerTeam.chemistry}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded overflow-hidden">
                    <div style={{ width: `${playerTeam.chemistry}%`, background: '#8b5cf6' }} className="h-full rounded" />
                  </div>
                </div>
              </div>
              {injuries.length > 0 && <div className="mt-3 text-xs text-red-400">🤕 Injured: {injuries.map(p => p.name).join(', ')}</div>}
              {suspended.length > 0 && <div className="mt-1 text-xs text-yellow-400">🟨 Suspended: {suspended.map(p => p.name).join(', ')}</div>}
              <div className="mt-3 flex gap-2 flex-wrap">
                <div className="text-xs text-gray-500">
                  Form: {playerTeam.form.map(f => f === 1 ? '🟢' : f === 0 ? '🟡' : '🔴').join('')}
                </div>
              </div>
            </div>
          )}
          {/* Manager Rep */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-xs text-amber-400 uppercase tracking-widest mb-3">Manager Status</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Reputation</span>
                  <span className="font-bold text-amber-400">{managerRep}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div style={{ width: `${managerRep}%` }} className="h-full rounded bg-amber-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Media Heat</span>
                  <span className={clsx('font-bold', mediaHeat > 70 ? 'text-red-400' : 'text-emerald-400')}>{mediaHeat}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div style={{ width: `${mediaHeat}%`, background: mediaHeat > 70 ? '#ef4444' : '#f59e0b' }} className="h-full rounded" />
                </div>
              </div>
            </div>
          </div>
          {/* News feed */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-2 xl:col-span-3">
            <h2 className="text-xs text-amber-400 uppercase tracking-widest mb-3">Recent News</h2>
            {recentNews.length === 0 && <p className="text-gray-600 text-sm">No news yet.</p>}
            <div className="space-y-2">
              {recentNews.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-600 text-xs mt-0.5 shrink-0">{i === 0 ? '🆕' : '•'}</span>
                  <span className={i === 0 ? 'text-gray-200' : 'text-gray-500'}>{log}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Action Buttons */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-2 xl:col-span-3">
            <h2 className="text-xs text-amber-400 uppercase tracking-widest mb-3">Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setPhase('SQUAD_HUB')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">👕 View Squad</button>
              <button onClick={() => setPhase('TACTICAL_BOARD')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">⚙️ Tactics</button>
              <button onClick={() => setPhase('GROUP_TABLES')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">📊 Group Tables</button>
              <button onClick={() => setPhase('KNOCKOUT_BRACKET')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">🏆 Bracket</button>
              {nextMatch && (
                <button onClick={goToPreMatch} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-sm">⚽ Next Match →</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
