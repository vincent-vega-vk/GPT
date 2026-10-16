import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getStageLabel } from '../engine/tournament';
import StatBar from '../components/StatBar';
import clsx from 'clsx';

const TEAM_TALK_OPTIONS = [
  { id: 'motivating', label: '🔥 Passionate', desc: 'Fire them up. Win this for the nation!', moraleDelta: 8 },
  { id: 'calm', label: '😌 Calm & Focused', desc: 'Keep it simple. Execute the game plan.', moraleDelta: 4 },
  { id: 'aggressive', label: '😤 Aggressive', desc: 'Get in their faces from the first whistle.', moraleDelta: 6 },
  { id: 'tactical', label: '📋 Tactical Briefing', desc: 'Detail the specific tactical instructions.', moraleDelta: 5 },
];

function ratingBar(v: number, max = 100) {
  const pct = (v / max) * 100;
  const color = v >= 85 ? 'bg-yellow-500' : v >= 75 ? 'bg-emerald-500' : v >= 65 ? 'bg-blue-500' : 'bg-gray-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
        <div className={clsx('h-full rounded transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right">{v}</span>
    </div>
  );
}

export default function PreMatch() {
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const teams = useGameStore(s => s.teams);
  const matches = useGameStore(s => s.matches);
  const currentMatchId = useGameStore(s => s.currentMatchId);
  const simulateCurrentMatch = useGameStore(s => s.simulateCurrentMatch);
  const setPhase = useGameStore(s => s.setPhase);
  const applyMoraleDelta = useGameStore(s => s.applyMoraleDelta);
  const [teamTalk, setTeamTalk] = useState<string | null>(null);
  const [talkDone, setTalkDone] = useState(false);

  const match = matches.find(m => m.id === currentMatchId);
  const playerTeam = playerTeamId ? teams[playerTeamId] : null;
  if (!match || !playerTeam) return <div className="p-6 text-gray-400">No match found.</div>;

  const isHome = match.homeTeamId === playerTeamId;
  const opponent = teams[isHome ? match.awayTeamId : match.homeTeamId];
  if (!opponent) return null;

  const myOverall = playerTeam.overall;
  const oppOverall = opponent.overall;
  const diff = myOverall - oppOverall;
  const winPct = Math.max(10, Math.min(80, 50 + diff * 1.5));
  const losePct = Math.max(10, Math.min(80, 50 - diff * 1.5));
  const drawPct = 100 - winPct - losePct;

  const dangerMen = [...opponent.players]
    .filter(p => p.isInStartingXI)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  function handleKickoff() {
    if (teamTalk && !talkDone) {
      const opt = TEAM_TALK_OPTIONS.find(o => o.id === teamTalk);
      if (opt) applyMoraleDelta(playerTeam!.id, opt.moraleDelta);
      setTalkDone(true);
    }
    simulateCurrentMatch();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-amber-400 uppercase tracking-widest mb-3">{getStageLabel(match.stage)}</div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-5xl mb-1">{playerTeam.flag}</div>
              <div className="font-black text-white text-lg">{playerTeam.name}</div>
              <div className="text-gray-500 text-sm">{myOverall} OVR</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600 text-2xl font-black">VS</div>
              <div className="text-xs text-gray-600 mt-1">{isHome ? 'HOME' : 'AWAY'}</div>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-1">{opponent.flag}</div>
              <div className="font-black text-white text-lg">{opponent.name}</div>
              <div className="text-gray-500 text-sm">{oppOverall} OVR</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opponent Scout */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-4">🔍 Scouting Report: {opponent.name}</h2>
            <div className="space-y-3 mb-4">
              <div><div className="text-xs text-gray-500 mb-1">Attack</div>{ratingBar(opponent.attack)}</div>
              <div><div className="text-xs text-gray-500 mb-1">Midfield</div>{ratingBar(opponent.midfield)}</div>
              <div><div className="text-xs text-gray-500 mb-1">Defense</div>{ratingBar(opponent.defense)}</div>
              <div><div className="text-xs text-gray-500 mb-1">Goalkeeper</div>{ratingBar(opponent.goalkeeper)}</div>
            </div>
            <div className="border-t border-gray-800 pt-3">
              <div className="text-xs text-gray-500 mb-2">Style: <span className="text-amber-400 capitalize font-medium">{opponent.tacticalIdentity}</span></div>
              <p className="text-xs text-gray-400 italic mb-3">"{opponent.footballCulture}"</p>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Danger Men</div>
              {dangerMen.map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800 last:border-0">
                  <span className="text-xs bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded font-bold">{p.rating}</span>
                  <span className="text-sm text-white flex-1">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.position}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Match Prediction + Team Talk */}
          <div className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-4">📊 Match Prediction</h2>
              <StatBar label="Win %" home={winPct} away={100 - winPct} homeColor="#10b981" awayColor="#ef4444" format={v => `${v}%`} />
              <StatBar label="Draw %" home={drawPct} away={100 - drawPct} homeColor="#f59e0b" awayColor="#374151" format={v => `${v}%`} />
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400">
                  <span className="text-amber-400 font-bold">Key Battle: </span>
                  Your <span className="text-white">{playerTeam.tactics.style}</span> vs their <span className="text-white">{opponent.tacticalIdentity}</span>.
                  {diff > 5 && " You have the quality advantage — don't waste it."}
                  {diff < -5 && " This will be a tough test. The underdog tag could work in your favour."}
                  {Math.abs(diff) <= 5 && " This is a 50/50. Tactical discipline will be decisive."}
                </p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-4">🗣️ Pre-Match Team Talk</h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {TEAM_TALK_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setTeamTalk(opt.id)}
                    className={clsx('p-3 rounded-lg text-left border transition-all',
                      teamTalk === opt.id ? 'border-amber-500 bg-amber-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    )}>
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{opt.desc}</div>
                    <div className="text-xs text-emerald-400 mt-1">+{opt.moraleDelta} morale</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={() => setPhase('TACTICAL_BOARD')} className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg text-sm">
            ← Review Tactics
          </button>
          <button onClick={handleKickoff}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-900/40">
            ⚽ KICK OFF
          </button>
        </div>
      </div>
    </div>
  );
}
