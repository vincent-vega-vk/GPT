import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateTournamentTeams } from '../data/teams';
import type { Difficulty } from '../types';

export default function Welcome() {
  const [view, setView] = useState<'main' | 'newgame' | 'settings'>('main');
  const [name, setName] = useState('');
  const [diff, setDiff] = useState<Difficulty>('realistic');
  const setPhase = useGameStore(s => s.setPhase);
  const setManagerName = useGameStore(s => s.setManagerName);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  // const selectTeam = useGameStore(s => s.selectTeam);
  // const phase = useGameStore(s => s.phase);
  const savedAt = useGameStore(s => s.savedAt);
  const loadGame = useGameStore(s => s.loadGame);

  useEffect(() => {
    const store = useGameStore.getState();
    if (Object.keys(store.teams).length === 0) {
      const teams = generateTournamentTeams();
      useGameStore.setState({ teams });
    }
  }, []);

  function handleStart() {
    if (!name.trim()) return;
    setManagerName(name.trim());
    setDifficulty(diff);
    setPhase('TEAM_SELECT');
  }

  const diffOptions: { value: Difficulty; label: string; desc: string; color: string }[] = [
    { value: 'casual', label: 'Casual', desc: 'More forgiving. Ideal for first-timers. Your team gets boosts.', color: 'border-emerald-500 bg-emerald-900/20' },
    { value: 'realistic', label: 'Realistic', desc: 'Balanced simulation. True to the beautiful game.', color: 'border-amber-500 bg-amber-900/20' },
    { value: 'brutal', label: 'Brutal', desc: 'The AI is merciless. Every decision matters. Pain awaits.', color: 'border-red-500 bg-red-900/20' },
  ];

  if (view === 'newgame') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <button onClick={() => setView('main')} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <h2 className="text-2xl font-bold text-amber-400">New Manager Profile</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-amber-500 outline-none text-lg"
              onKeyDown={e => e.key === 'Enter' && handleStart()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-3">Difficulty</label>
            <div className="space-y-2">
              {diffOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDiff(opt.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${diff === opt.value ? opt.color : 'border-gray-800 bg-gray-900 hover:border-gray-600'}`}
                >
                  <div className="font-bold text-white">{opt.label}</div>
                  <div className="text-sm text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={!name.trim()}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg rounded-xl transition-colors"
          >
            SELECT YOUR NATION →
          </button>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <button onClick={() => setView('main')} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <h2 className="text-2xl font-bold text-amber-400">Settings</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-3">Difficulty</label>
            <div className="space-y-2">
              {diffOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDiff(opt.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${diff === opt.value ? opt.color : 'border-gray-800 bg-gray-900'}`}
                >
                  <div className="font-bold text-white">{opt.label}</div>
                  <div className="text-sm text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <p className="text-gray-500 text-sm">More settings coming soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-gray-950 to-emerald-900/20 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 41px)',
      }} />
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">
        <div className="flex gap-4 text-4xl mb-6">🇺🇸🇨🇦🇲🇽</div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2" style={{
          background: 'linear-gradient(135deg, #fbbf24, #d97706, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: 'none',
        }}>
          WORLD CUP
        </h1>
        <div className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-2">2026</div>
        <div className="text-gray-400 uppercase tracking-widest text-sm mb-2">Football Manager</div>
        <p className="text-gray-500 text-sm max-w-sm mb-10">
          Lead one of 48 nations to glory. Tactics, drama, penalties, press conferences. Every decision matters.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setView('newgame')}
            className="py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-900/50"
          >
            ⚽ NEW GAME
          </button>
          {savedAt && (
            <button
              onClick={() => { loadGame(); }}
              className="py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold text-base rounded-xl border border-gray-700 transition-all"
            >
              📁 CONTINUE SAVE
            </button>
          )}
          <button
            onClick={() => setView('settings')}
            className="py-4 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-base rounded-xl border border-gray-800 transition-all"
          >
            ⚙️ SETTINGS
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-8">USA · Canada · Mexico · 48 Teams · 6 Host Cities</p>
      </div>
    </div>
  );
}
