import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateTournamentTeams } from '../data/teams';
import clsx from 'clsx';

function getManagerLegacy(rep: number, won: boolean): { title: string; desc: string; color: string } {
  if (won) return { title: 'World Champion', desc: 'You lifted the trophy. An immortal achievement.', color: 'text-yellow-400' };
  if (rep >= 80) return { title: 'National Hero', desc: 'The nation is proud. An overachievement remembered forever.', color: 'text-amber-400' };
  if (rep >= 60) return { title: 'Respectable Manager', desc: 'A decent campaign. Met expectations with professionalism.', color: 'text-emerald-400' };
  if (rep >= 40) return { title: 'Under Pressure', desc: 'Mixed results left fans divided. A thorough review awaits.', color: 'text-yellow-500' };
  if (rep >= 20) return { title: 'Disappointing Exit', desc: 'The board is furious. Expectations were not met.', color: 'text-orange-400' };
  return { title: 'Sacked at the World Cup', desc: 'A catastrophic campaign. Your name is mud in the history books.', color: 'text-red-400' };
}

export default function TournamentEnd() {
  const teams = useGameStore(s => s.teams);
  const matches = useGameStore(s => s.matches);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  // const managerName = useGameStore(s => s.managerName);
  const managerRep = useGameStore(s => s.managerRep);
  // const tournamentLog = useGameStore(s => s.tournamentLog);
  // const newGame = useGameStore(s => s.newGame);
  // const setPhase = useGameStore(s => s.setPhase);
  const [copied, setCopied] = useState(false);

  const playerTeam = playerTeamId ? teams[playerTeamId] : null;
  const finalMatch = matches.find(m => m.stage === 'final' && m.played);
  let winner = null;
  if (finalMatch?.result) {
    const r = finalMatch.result;
    const homeWin = r.homeGoals > r.awayGoals || (r.homePens !== undefined && r.homePens > (r.awayPens ?? 0));
    winner = homeWin ? teams[finalMatch.homeTeamId] : teams[finalMatch.awayTeamId];
  }

  const isWinner = winner?.id === playerTeamId;
  const myResults = matches.filter(m => m.played && (m.homeTeamId === playerTeamId || m.awayTeamId === playerTeamId));
  const wins = myResults.filter(m => {
    if (!m.result) return false;
    const r = m.result;
    const isHome = m.homeTeamId === playerTeamId;
    const myGoals = isHome ? r.homeGoals : r.awayGoals;
    const oppGoals = isHome ? r.awayGoals : r.homeGoals;
    return myGoals > oppGoals;
  }).length;

  // Top scorers
  const allPlayers = Object.values(teams).flatMap(t => t.players);
  const topScorers = [...allPlayers].sort((a, b) => b.goals - a.goals).slice(0, 5);

  const legacy = getManagerLegacy(managerRep, isWinner);

  function handlePlayAgain() {
    const freshTeams = generateTournamentTeams();
    useGameStore.setState({
      phase: 'WELCOME',
      difficulty: 'realistic',
      managerName: '',
      playerTeamId: null,
      teams: freshTeams,
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
    });
  }

  function handleShare() {
    const text = `⚽ FIFA World Cup 2026 Manager\n🏳️ Nation: ${playerTeam?.name ?? 'Unknown'}\n📊 Results: ${wins} wins in ${myResults.length} matches\n🏆 ${isWinner ? 'WORLD CHAMPION!' : `Best finish: ${myResults.length} matches played`}\n👔 Manager rating: ${managerRep}/100 — ${legacy.title}\n\nPlay at WC2026 Football Manager!`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Trophy or result header */}
      <div className={clsx(
        'px-6 py-10 text-center border-b',
        isWinner ? 'bg-gradient-to-b from-amber-900/40 to-gray-950 border-amber-700' : 'bg-gradient-to-b from-gray-900 to-gray-950 border-gray-800',
      )}>
        <div className="text-7xl mb-3">{isWinner ? '🏆' : '🌍'}</div>
        <h1 className="text-4xl font-black text-white mb-2">
          {isWinner ? `${playerTeam?.name} ARE WORLD CHAMPIONS!` : 'Tournament Complete'}
        </h1>
        {playerTeam && (
          <div className="text-2xl">{playerTeam.flag}</div>
        )}
        {winner && !isWinner && (
          <div className="mt-3">
            <p className="text-gray-400 text-sm">World Champions:</p>
            <div className="text-3xl mt-1">{winner.flag}</div>
            <p className="text-xl font-black text-amber-400">{winner.name}</p>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Manager Legacy */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Your Legacy</p>
            <h2 className={clsx('text-3xl font-black mb-2', legacy.color)}>{legacy.title}</h2>
            <p className="text-gray-400">{legacy.desc}</p>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <div><div className="text-2xl font-black text-white">{wins}</div><div className="text-gray-500">Wins</div></div>
              <div><div className="text-2xl font-black text-white">{myResults.length}</div><div className="text-gray-500">Matches</div></div>
              <div><div className="text-2xl font-black text-amber-400">{managerRep}</div><div className="text-gray-500">Reputation</div></div>
            </div>
          </div>
          {/* Journey */}
          {myResults.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-3">Tournament Journey</h2>
              <div className="space-y-2">
                {myResults.map((m, i) => {
                  if (!m.result) return null;
                  const r = m.result;
                  const isHome = m.homeTeamId === playerTeamId;
                  const myGoals = isHome ? r.homeGoals : r.awayGoals;
                  const oppGoals = isHome ? r.awayGoals : r.homeGoals;
                  const opp = teams[isHome ? m.awayTeamId : m.homeTeamId];
                  const win = myGoals > oppGoals;
                  const draw = myGoals === oppGoals;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm py-1">
                      <span className={clsx('w-5 h-5 rounded text-xs flex items-center justify-center font-bold',
                        win ? 'bg-emerald-700 text-white' : draw ? 'bg-amber-700 text-white' : 'bg-red-900 text-white',
                      )}>{win ? 'W' : draw ? 'D' : 'L'}</span>
                      <span className="text-gray-400 text-xs capitalize">{m.stage}</span>
                      <span className="text-gray-300 flex items-center gap-1">{playerTeam?.flag} vs {opp?.flag} {opp?.shortName}</span>
                      <span className="font-bold text-white ml-auto">{myGoals}–{oppGoals}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Top Scorers */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm text-amber-400 uppercase tracking-widest mb-3">Golden Boot Race</h2>
            {topScorers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-gray-800 last:border-0 text-sm">
                <span className="text-gray-500 w-4">{i + 1}</span>
                <span className="text-white flex-1">{p.name}</span>
                <span className="text-amber-400 font-bold">⚽ {p.goals}</span>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleShare}
              className="px-5 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-sm">
              {copied ? '✓ Copied!' : '📤 Share Result'}
            </button>
            <button onClick={handlePlayAgain}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-base">
              ⚽ PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
