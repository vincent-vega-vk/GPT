import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

export default function DressingRoom() {
  const pendingDrama = useGameStore(s => s.pendingDrama);
  const resolveDrama = useGameStore(s => s.resolveDrama);
  const setPhase = useGameStore(s => s.setPhase);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const teams = useGameStore(s => s.teams);
  const [chosen, setChosen] = useState<string | null>(null);
  const [effect, setEffect] = useState<{ text: string; moraleDelta: number } | null>(null);

  const team = playerTeamId ? teams[playerTeamId] : null;

  if (!pendingDrama) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">👕</div>
          <h2 className="text-xl font-bold text-white mb-2">Dressing Room</h2>
          <p className="text-gray-400 mb-4">The squad is settled.</p>
          <button onClick={() => setPhase('PRESS_CONFERENCE')} className="px-6 py-2 bg-amber-600 text-black font-bold rounded-lg">Continue</button>
        </div>
      </div>
    );
  }

  const avgMorale = team ? Math.round(team.players.reduce((a, p) => a + p.morale, 0) / team.players.length) : 70;

  function handleChoice(choiceId: string) {
    const choice = pendingDrama?.choices.find(c => c.id === choiceId);
    if (!choice) return;
    setChosen(choiceId);
    setEffect({ text: choice.effect, moraleDelta: choice.moraleDelta });
    setTimeout(() => resolveDrama(choiceId), 1500);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-black text-amber-400">DRESSING ROOM</h1>
        <p className="text-sm text-gray-500">A situation requires your attention.</p>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto p-6 gap-6">
        {/* Drama Event */}
        <div className="flex-1 max-w-2xl">
          <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 mb-5">
            <div className="text-xs text-red-400 uppercase tracking-widest mb-2">⚠️ {pendingDrama.type.replace(/_/g, ' ')}</div>
            <h2 className="text-2xl font-black text-white mb-3">{pendingDrama.title}</h2>
            <p className="text-gray-300 leading-relaxed">{pendingDrama.description}</p>
          </div>
          {/* Choices */}
          {!chosen && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Your Response</p>
              {pendingDrama.choices.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleChoice(c.id)}
                  className="w-full text-left p-4 bg-gray-900 border border-gray-800 hover:border-amber-600 rounded-xl transition-all"
                >
                  <div className="text-white font-medium mb-1">{c.text}</div>
                  <div className="text-xs text-gray-500 italic mb-2">"{c.effect}"</div>
                  <div className="flex gap-3 text-xs">
                    <span className={clsx(c.moraleDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {c.moraleDelta >= 0 ? '+' : ''}{c.moraleDelta} Morale
                    </span>
                    <span className={clsx(c.chemistrydelta >= 0 ? 'text-blue-400' : 'text-orange-400')}>
                      {c.chemistrydelta >= 0 ? '+' : ''}{c.chemistrydelta} Chemistry
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Effect feedback */}
          {effect && (
            <div className="mt-4 p-5 bg-emerald-900/20 border border-emerald-700 rounded-xl">
              <div className="text-emerald-400 font-bold text-sm mb-1">Decision Made</div>
              <p className="text-gray-300 text-sm italic mb-2">"{effect.text}"</p>
              <div className={clsx('text-lg font-black', effect.moraleDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {effect.moraleDelta >= 0 ? '↑' : '↓'} Squad Morale {Math.abs(effect.moraleDelta)}
              </div>
            </div>
          )}
        </div>
        {/* Morale bars */}
        {team && (
          <div className="lg:w-64 shrink-0">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Squad Morale</h3>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <div className="text-center mb-3">
                <div className="text-4xl font-black text-amber-400">{avgMorale}</div>
                <div className="text-xs text-gray-500">Average Morale</div>
              </div>
              <div className="h-3 bg-gray-800 rounded overflow-hidden">
                <div className="h-full rounded transition-all" style={{ width: `${avgMorale}%`, background: avgMorale > 70 ? '#10b981' : avgMorale > 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-auto">
              {team.players.filter(p => p.isInStartingXI).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 truncate flex-1">{p.name.split(' ').pop()}</span>
                  <div className="w-16 h-1.5 bg-gray-800 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${p.morale}%`, background: p.morale > 70 ? '#10b981' : '#f59e0b' }} />
                  </div>
                  <span className="text-gray-500 w-6 text-right">{p.morale}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
