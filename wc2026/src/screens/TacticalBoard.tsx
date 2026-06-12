import { useGameStore } from '../store/gameStore';
import type { TacticalStyle, Mentality } from '../types';
import FormationPitch from '../components/FormationPitch';
import clsx from 'clsx';

const STYLES: { value: TacticalStyle; label: string; desc: string }[] = [
  { value: 'tiki-taka', label: 'Tiki-Taka', desc: 'Intricate passing triangles. High possession, patient build-up.' },
  { value: 'possession', label: 'Possession', desc: 'Control tempo with the ball. Wear opponents down.' },
  { value: 'pressing', label: 'Pressing', desc: 'Win ball high up the pitch. Intense and exhausting.' },
  { value: 'gegenpress', label: 'Gegenpress', desc: 'Immediate counter-press after losing ball. Liverpool/Dortmund style.' },
  { value: 'counter', label: 'Counter-Attack', desc: 'Absorb pressure and explode on the break. Direct and efficient.' },
  { value: 'direct', label: 'Direct Football', desc: 'Long balls to target men. Physical and straightforward.' },
  { value: 'low-block', label: 'Low Block', desc: 'Park the bus. 11 men behind the ball. Counter with pace.' },
  { value: 'compact', label: 'Compact', desc: 'Tight defensive shape. Force errors and punish on the counter.' },
  { value: 'wing-play', label: 'Wing Play', desc: 'Wide wingers stretch the pitch. Deliver crosses into the box.' },
  { value: 'vertical', label: 'Vertical Football', desc: 'Fast vertical passes between the lines. Penetrate quickly.' },
];

const MENTALITIES: { value: Mentality; label: string; icon: string; desc: string }[] = [
  { value: 'ultra-attacking', label: 'Ultra Attack', icon: '🔥', desc: '+15% attack, -15% defense' },
  { value: 'attacking', label: 'Attacking', icon: '⚡', desc: '+8% attack, -6% defense' },
  { value: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Equal emphasis on both phases' },
  { value: 'defensive', label: 'Defensive', icon: '🛡️', desc: '-8% attack, +10% defense' },
  { value: 'ultra-defensive', label: 'Ultra Def', icon: '🔒', desc: '-15% attack, +15% defense' },
];

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-5-1', '3-4-2-1'];

function SliderField({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-sm font-bold text-amber-400">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-amber-500 cursor-pointer"
      />
    </div>
  );
}

export default function TacticalBoard() {
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const teams = useGameStore(s => s.teams);
  const updateTactics = useGameStore(s => s.updateTactics);
  const setPhase = useGameStore(s => s.setPhase);

  const team = playerTeamId ? teams[playerTeamId] : null;
  if (!team) return <div className="p-6 text-gray-400">No team selected.</div>;

  const t = team.tactics;
  const avgDef = Math.round((team.defense + team.goalkeeper) / 2);
  const highLineRisk = t.defensiveLine >= 7 && avgDef < 78;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">TACTICAL BOARD</h1>
            <p className="text-sm text-gray-500">{team.name} · {team.flag} · {t.formation}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPhase('SQUAD_HUB')} className="px-4 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg text-sm">← Squad</button>
            <button onClick={() => setPhase('PRE_MATCH')} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg text-sm">Pre-Match →</button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto gap-0">
        {/* Left: Pitch & Formation */}
        <div className="lg:w-72 xl:w-80 p-4 border-b lg:border-b-0 lg:border-r border-gray-800">
          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Formation</label>
          <div className="flex flex-wrap gap-1 mb-3">
            {FORMATIONS.map(f => (
              <button key={f} onClick={() => updateTactics({ formation: f })}
                className={clsx('px-2 py-1 rounded text-xs font-medium', t.formation === f ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>{f}</button>
            ))}
          </div>
          <FormationPitch formation={t.formation} players={team.players} compact />
        </div>
        {/* Middle: Sliders */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Mentality */}
          <div className="mb-6">
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Mentality</label>
            <div className="grid grid-cols-5 gap-2">
              {MENTALITIES.map(m => (
                <button key={m.value} onClick={() => updateTactics({ mentality: m.value })}
                  className={clsx('p-2 rounded-lg text-center text-xs transition-all border',
                    t.mentality === m.value ? 'border-amber-500 bg-amber-900/30 text-amber-300' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                  )}>
                  <div className="text-xl mb-1">{m.icon}</div>
                  <div className="font-bold">{m.label}</div>
                  <div className="text-gray-500 text-xs leading-tight mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Style */}
          <div className="mb-6">
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Playing Style</label>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              {STYLES.map(s => (
                <button key={s.value} onClick={() => updateTactics({ style: s.value })}
                  className={clsx('p-2 rounded-lg text-left text-xs transition-all border',
                    t.style === s.value ? 'border-amber-500 bg-amber-900/30' : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  )}>
                  <div className={clsx('font-bold mb-0.5', t.style === s.value ? 'text-amber-400' : 'text-white')}>{s.label}</div>
                  <div className="text-gray-500 leading-tight">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <SliderField label="Pressing Intensity" value={t.pressingIntensity} onChange={v => updateTactics({ pressingIntensity: v })} />
            <SliderField label="Defensive Line" value={t.defensiveLine} onChange={v => updateTactics({ defensiveLine: v })} />
            <SliderField label="Tempo" value={t.tempo} onChange={v => updateTactics({ tempo: v })} />
            <SliderField label="Attacking Width" value={t.attackingWidth} onChange={v => updateTactics({ attackingWidth: v })} />
          </div>
          {/* Build up style */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Build-Up Style</label>
            <div className="flex gap-2">
              {(['short', 'mixed', 'long'] as const).map(b => (
                <button key={b} onClick={() => updateTactics({ buildUpStyle: b })}
                  className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                    t.buildUpStyle === b ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}>{b}</button>
              ))}
            </div>
          </div>
          {/* Warnings */}
          {highLineRisk && (
            <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg p-3">
              <p className="text-red-300 text-sm">⚠️ High defensive line with average defenders — exposed to through balls in the 75th+ minute.</p>
            </div>
          )}
          {t.pressingIntensity >= 8 && (
            <div className="mt-2 bg-yellow-900/30 border border-yellow-800 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">⚡ Extreme pressing will drain fitness rapidly — ensure subs are ready from minute 60.</p>
            </div>
          )}
        </div>
        {/* Right: Analysis */}
        <div className="lg:w-64 xl:w-72 p-4 border-t lg:border-t-0 lg:border-l border-gray-800 bg-gray-900/50">
          <h3 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-widest">Analysis</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">Attack Rating</div>
              <div className="h-2 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-emerald-500 rounded" style={{ width: `${team.attack}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{team.attack} / 100</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Midfield Rating</div>
              <div className="h-2 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-blue-500 rounded" style={{ width: `${team.midfield}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{team.midfield} / 100</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Defense Rating</div>
              <div className="h-2 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-purple-500 rounded" style={{ width: `${team.defense}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{team.defense} / 100</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-amber-400 font-bold mb-1">Style Notes</p>
            <p className="text-xs text-gray-400">
              {t.style === 'tiki-taka' && 'Your passing triangles will overwhelm pressing sides but struggle against compact low-blocks.'}
              {t.style === 'gegenpress' && 'Counter-pressing creates immediate chances but fatigues players rapidly in the second half.'}
              {t.style === 'low-block' && 'Defensive setup will frustrate big teams but you must be clinical on the counter.'}
              {t.style === 'counter' && 'Your rapid transitions are lethal when you can absorb early pressure.'}
              {t.style === 'possession' && 'Patient build-up controls tempo but requires technical quality throughout.'}
              {!['tiki-taka','gegenpress','low-block','counter','possession'].includes(t.style) && `Your ${t.style} approach can be effective. Ensure the squad has the quality to execute it.`}
            </p>
          </div>
          <div className="mt-3 p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-amber-400 font-bold mb-1">Tactical ID</p>
            <p className="text-xs text-gray-400 capitalize">{team.tacticalIdentity} (natural style)</p>
            <p className="text-xs text-gray-500 mt-1">Chemistry bonus when matching natural style</p>
          </div>
        </div>
      </div>
    </div>
  );
}
