import { useGameStore } from '../store/gameStore';
import type { Match, MatchStage } from '../types';
import { getStageLabel } from '../engine/tournament';
import clsx from 'clsx';

const STAGE_ORDER: MatchStage[] = ['r32', 'r16', 'qf', 'sf', 'final'];

function MatchCard({ match, teams, playerTeamId }: { match: Match; teams: any; playerTeamId: string | null }) {
  const homeTeam = teams[match.homeTeamId];
  const awayTeam = teams[match.awayTeamId];
  if (!homeTeam || !awayTeam) return null;
  const isPlayerMatch = match.homeTeamId === playerTeamId || match.awayTeamId === playerTeamId;
  const r = match.result;
  let homeWin = false, awayWin = false;
  if (r) {
    homeWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
    awayWin = !homeWin;
  }
  return (
    <div className={clsx(
      'rounded-lg border p-2 text-xs min-w-28',
      isPlayerMatch ? 'border-amber-600 bg-amber-900/10' : 'border-gray-700 bg-gray-900',
      !match.played && 'opacity-70',
    )}>
      <div className={clsx('flex items-center gap-1 py-0.5', homeWin && 'opacity-100', !homeWin && match.played && 'opacity-40')}>
        <span>{homeTeam.flag}</span>
        <span className="flex-1 truncate text-white font-medium">{homeTeam.shortName}</span>
        {r && <span className={clsx('font-bold tabular-nums', homeWin ? 'text-white' : 'text-gray-500')}>{r.homeGoals}</span>}
      </div>
      <div className="border-t border-gray-800 my-0.5" />
      <div className={clsx('flex items-center gap-1 py-0.5', awayWin && 'opacity-100', !awayWin && match.played && 'opacity-40')}>
        <span>{awayTeam.flag}</span>
        <span className="flex-1 truncate text-white font-medium">{awayTeam.shortName}</span>
        {r && <span className={clsx('font-bold tabular-nums', awayWin ? 'text-white' : 'text-gray-500')}>{r.awayGoals}</span>}
      </div>
      {r?.homePens !== undefined && (
        <div className="text-center text-gray-500 text-xs mt-0.5">Pens: {r.homePens}–{r.awayPens}</div>
      )}
    </div>
  );
}

export default function KnockoutBracket() {
  const matches = useGameStore(s => s.matches);
  const teams = useGameStore(s => s.teams);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const setPhase = useGameStore(s => s.setPhase);
  const goToPreMatch = useGameStore(s => s.goToPreMatch);

  const knockoutMatches = matches.filter(m => m.stage !== 'group');
  const finalMatch = knockoutMatches.find(m => m.stage === 'final');
  const thirdMatch = knockoutMatches.find(m => m.stage === '3rd');
  let winner = null;
  if (finalMatch?.result) {
    const r = finalMatch.result;
    const homeWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
    winner = homeWin ? teams[finalMatch.homeTeamId] : teams[finalMatch.awayTeamId];
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">TOURNAMENT BRACKET</h1>
            <p className="text-sm text-gray-500">FIFA World Cup 2026</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPhase('GROUP_TABLES')} className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg text-sm">← Groups</button>
            <button onClick={goToPreMatch} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-sm">Next Match →</button>
          </div>
        </div>
      </div>
      {winner && (
        <div className="bg-amber-900/30 border-b border-amber-700 px-6 py-4 text-center">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-xl font-black text-amber-400">{winner.name} are WORLD CHAMPIONS!</div>
          <div className="text-2xl">{winner.flag}</div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-6 min-w-max">
          {STAGE_ORDER.map(stage => {
            const stageName = getStageLabel(stage);
            const stageMatches = knockoutMatches.filter(m => m.stage === stage);
            if (stageMatches.length === 0) return null;
            return (
              <div key={stage} className="flex flex-col gap-4">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-widest text-center mb-2 whitespace-nowrap">{stageName}</div>
                <div className="flex flex-col gap-3">
                  {stageMatches.map(m => (
                    <MatchCard key={m.id} match={m} teams={teams} playerTeamId={playerTeamId} />
                  ))}
                </div>
              </div>
            );
          })}
          {thirdMatch && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center mb-2">3rd Place</div>
              <MatchCard match={thirdMatch} teams={teams} playerTeamId={playerTeamId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
