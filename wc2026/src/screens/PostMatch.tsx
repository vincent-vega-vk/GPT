import { useGameStore } from '../store/gameStore';
import StatBar from '../components/StatBar';
import { getStageLabel } from '../engine/tournament';
import clsx from 'clsx';

function ratingColor(r: number) {
  if (r >= 8.5) return 'text-yellow-400';
  if (r >= 7) return 'text-emerald-400';
  if (r >= 6) return 'text-gray-300';
  return 'text-red-400';
}

export default function PostMatch() {
  const matches = useGameStore(s => s.matches);
  const currentMatchId = useGameStore(s => s.currentMatchId);
  const teams = useGameStore(s => s.teams);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const advanceAfterMatch = useGameStore(s => s.advanceAfterMatch);
  const managerRep = useGameStore(s => s.managerRep);

  const match = matches.find(m => m.id === currentMatchId);
  const result = match?.result;
  if (!match || !result) return <div className="p-6 text-gray-400">No result.</div>;

  const homeTeam = teams[match.homeTeamId];
  const awayTeam = teams[match.awayTeamId];
  if (!homeTeam || !awayTeam) return null;

  const isHome = match.homeTeamId === playerTeamId;
  const myGoals = isHome ? result.homeGoals : result.awayGoals;
  const oppGoals = isHome ? result.awayGoals : result.homeGoals;
  const myPens = isHome ? result.homePens : result.awayPens;
  const oppPens = isHome ? result.awayPens : result.homePens;
  const isWin = myGoals > oppGoals || (myPens !== undefined && myPens > (oppPens ?? 0));
  const isDraw = myGoals === oppGoals && myPens === undefined;

  const homeGoalEvents = result.events.filter(e => e.type === 'goal' && e.team === 'home');
  const awayGoalEvents = result.events.filter(e => e.type === 'goal' && e.team === 'away');

  // const myRatings = isHome ? result.homeRatings : result.awayRatings;
  // const oppRatings = isHome ? result.awayRatings : result.homeRatings;

  const bannerClass = isWin
    ? 'bg-gradient-to-r from-emerald-900 to-emerald-800 border-emerald-600'
    : isDraw ? 'bg-gradient-to-r from-amber-900 to-amber-800 border-amber-600'
    : 'bg-gradient-to-r from-red-900 to-red-800 border-red-600';

  const resultLabel = isWin ? '🏆 VICTORY' : isDraw ? '🤝 DRAW' : '😔 DEFEAT';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Result Banner */}
      <div className={clsx('px-6 py-5 border-b', bannerClass)}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm uppercase tracking-widest mb-1 text-white/70">{getStageLabel(match.stage)}</div>
          <div className="text-4xl font-black text-white mb-2">{resultLabel}</div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-3xl">{homeTeam.flag}</div>
              <div className="text-white font-bold text-sm">{homeTeam.shortName}</div>
            </div>
            <div className="text-6xl font-black text-white tabular-nums">
              {result.homeGoals}–{result.awayGoals}
            </div>
            <div className="text-center">
              <div className="text-3xl">{awayTeam.flag}</div>
              <div className="text-white font-bold text-sm">{awayTeam.shortName}</div>
            </div>
          </div>
          {result.homePens !== undefined && (
            <div className="text-white/70 text-sm mt-1">(Pens: {result.homePens}–{result.awayPens})</div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Scorers */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-3">Goalscorers</h2>
            <div className="flex gap-8 flex-wrap">
              <div>
                <div className="text-xs text-gray-600 mb-1">{homeTeam.name}</div>
                {homeGoalEvents.length === 0 && <span className="text-gray-600 text-sm">—</span>}
                {homeGoalEvents.map((e, i) => <div key={i} className="text-sm text-white">⚽ {e.playerName} <span className="text-gray-500 text-xs">{e.minute}'</span></div>)}
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">{awayTeam.name}</div>
                {awayGoalEvents.length === 0 && <span className="text-gray-600 text-sm">—</span>}
                {awayGoalEvents.map((e, i) => <div key={i} className="text-sm text-white">⚽ {e.playerName} <span className="text-gray-500 text-xs">{e.minute}'</span></div>)}
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex justify-between text-xs text-gray-500 mb-3">
              <span className="font-bold text-white">{homeTeam.shortName}</span>
              <span className="uppercase tracking-widest">Match Statistics</span>
              <span className="font-bold text-white">{awayTeam.shortName}</span>
            </div>
            <StatBar label="Possession" home={result.stats.homePossession} away={result.stats.awayPossession} format={v => `${v}%`} />
            <StatBar label="Shots" home={result.stats.homeShots} away={result.stats.awayShots} />
            <StatBar label="On Target" home={result.stats.homeShotsOnTarget} away={result.stats.awayShotsOnTarget} />
            <StatBar label="Expected Goals" home={result.stats.homeXG} away={result.stats.awayXG} format={v => v.toFixed(2)} />
            <StatBar label="Corners" home={result.stats.homeCorners} away={result.stats.awayCorners} />
          </div>
          {/* Player Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[{ ratings: result.homeRatings, team: homeTeam }, { ratings: result.awayRatings, team: awayTeam }].map(({ ratings, team }) => (
              <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-3">{team.shortName} Ratings</h2>
                <div className="space-y-1">
                  {ratings.map(r => (
                    <div key={r.playerId} className="flex items-center gap-2 text-sm py-0.5">
                      <span className={clsx('font-bold w-8 text-right', ratingColor(r.rating))}>{r.rating}</span>
                      <span className="text-white flex-1 truncate">{r.playerName}</span>
                      <span className="text-xs text-gray-600">{r.position}</span>
                      {r.goals > 0 && <span className="text-xs text-emerald-400">⚽ {r.goals}</span>}
                      {r.assists > 0 && <span className="text-xs text-blue-400">🅰️ {r.assists}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Tactical Verdict + Media */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-3">📋 Tactical Verdict</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{result.tacticalVerdict}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-3">📰 Media Reaction</h2>
              <p className="text-gray-300 text-sm leading-relaxed italic">"{result.mediaReaction}"</p>
              <div className="mt-3">
                <div className="text-xs text-gray-500">🏅 MOTM: <span className="text-amber-400 font-bold">{result.motm}</span></div>
              </div>
            </div>
          </div>
          {/* Manager Rep */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="text-3xl">{isWin ? '📈' : isDraw ? '📊' : '📉'}</div>
            <div className="flex-1">
              <div className="text-sm text-gray-400">Manager Reputation</div>
              <div className="h-2 bg-gray-800 rounded mt-1 overflow-hidden">
                <div className="h-full bg-amber-500 rounded transition-all" style={{ width: `${managerRep}%` }} />
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{managerRep} / 100</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button onClick={advanceAfterMatch}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-base rounded-xl">
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
