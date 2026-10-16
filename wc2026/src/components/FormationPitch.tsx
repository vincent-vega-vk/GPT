import type { Player } from '../types';

const FORMATION_POSITIONS: Record<string, { x: number; y: number; pos: string }[]> = {
  '4-3-3': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 15, y: 72, pos: 'LB' }, { x: 35, y: 72, pos: 'CB' }, { x: 65, y: 72, pos: 'CB' }, { x: 85, y: 72, pos: 'RB' },
    { x: 25, y: 50, pos: 'CM' }, { x: 50, y: 50, pos: 'CM' }, { x: 75, y: 50, pos: 'CM' },
    { x: 15, y: 25, pos: 'LW' }, { x: 50, y: 20, pos: 'ST' }, { x: 85, y: 25, pos: 'RW' },
  ],
  '4-4-2': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 15, y: 72, pos: 'LB' }, { x: 35, y: 72, pos: 'CB' }, { x: 65, y: 72, pos: 'CB' }, { x: 85, y: 72, pos: 'RB' },
    { x: 15, y: 50, pos: 'LM' }, { x: 35, y: 50, pos: 'CM' }, { x: 65, y: 50, pos: 'CM' }, { x: 85, y: 50, pos: 'RM' },
    { x: 35, y: 22, pos: 'ST' }, { x: 65, y: 22, pos: 'ST' },
  ],
  '4-2-3-1': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 15, y: 72, pos: 'LB' }, { x: 35, y: 72, pos: 'CB' }, { x: 65, y: 72, pos: 'CB' }, { x: 85, y: 72, pos: 'RB' },
    { x: 35, y: 55, pos: 'CDM' }, { x: 65, y: 55, pos: 'CDM' },
    { x: 15, y: 35, pos: 'LW' }, { x: 50, y: 35, pos: 'CAM' }, { x: 85, y: 35, pos: 'RW' },
    { x: 50, y: 17, pos: 'ST' },
  ],
  '3-5-2': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 25, y: 72, pos: 'CB' }, { x: 50, y: 72, pos: 'CB' }, { x: 75, y: 72, pos: 'CB' },
    { x: 12, y: 50, pos: 'LM' }, { x: 30, y: 50, pos: 'CM' }, { x: 50, y: 50, pos: 'CDM' }, { x: 70, y: 50, pos: 'CM' }, { x: 88, y: 50, pos: 'RM' },
    { x: 35, y: 22, pos: 'ST' }, { x: 65, y: 22, pos: 'ST' },
  ],
  '3-4-3': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 25, y: 72, pos: 'CB' }, { x: 50, y: 72, pos: 'CB' }, { x: 75, y: 72, pos: 'CB' },
    { x: 15, y: 52, pos: 'LM' }, { x: 38, y: 52, pos: 'CM' }, { x: 62, y: 52, pos: 'CM' }, { x: 85, y: 52, pos: 'RM' },
    { x: 15, y: 22, pos: 'LW' }, { x: 50, y: 18, pos: 'ST' }, { x: 85, y: 22, pos: 'RW' },
  ],
  '4-5-1': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 15, y: 72, pos: 'LB' }, { x: 35, y: 72, pos: 'CB' }, { x: 65, y: 72, pos: 'CB' }, { x: 85, y: 72, pos: 'RB' },
    { x: 10, y: 50, pos: 'LM' }, { x: 30, y: 50, pos: 'CM' }, { x: 50, y: 50, pos: 'CDM' }, { x: 70, y: 50, pos: 'CM' }, { x: 90, y: 50, pos: 'RM' },
    { x: 50, y: 20, pos: 'ST' },
  ],
  '3-4-2-1': [
    { x: 50, y: 90, pos: 'GK' },
    { x: 25, y: 73, pos: 'CB' }, { x: 50, y: 73, pos: 'CB' }, { x: 75, y: 73, pos: 'CB' },
    { x: 12, y: 55, pos: 'LM' }, { x: 35, y: 55, pos: 'CM' }, { x: 65, y: 55, pos: 'CM' }, { x: 88, y: 55, pos: 'RM' },
    { x: 33, y: 32, pos: 'CAM' }, { x: 67, y: 32, pos: 'CAM' },
    { x: 50, y: 15, pos: 'ST' },
  ],
};

const posColors: Record<string, string> = {
  GK: '#ca8a04', CB: '#2563eb', RB: '#3b82f6', LB: '#3b82f6',
  CDM: '#7c3aed', CM: '#8b5cf6', CAM: '#a78bfa', RM: '#10b981',
  LM: '#10b981', RW: '#22c55e', LW: '#22c55e', CF: '#ef4444', ST: '#dc2626',
};

interface FormationPitchProps {
  formation: string;
  players: Player[];
  onPlayerClick?: (id: string) => void;
  compact?: boolean;
}

export default function FormationPitch({ formation, players, onPlayerClick, compact = false }: FormationPitchProps) {
  const slots = FORMATION_POSITIONS[formation] ?? FORMATION_POSITIONS['4-3-3'];
  const starters = players.filter(p => p.isInStartingXI).slice(0, 11);
  const h = compact ? 240 : 380;
  return (
    <div className="relative w-full bg-emerald-900 rounded-xl overflow-hidden border border-emerald-700" style={{ height: h }}>
      {/* Pitch markings */}
      <div className="absolute inset-0">
        <div className="absolute border border-emerald-600/40 rounded" style={{ top: '10%', left: '10%', right: '10%', bottom: '10%' }} />
        <div className="absolute border-b border-emerald-600/40" style={{ top: '50%', left: '10%', right: '10%' }} />
        <div className="absolute border border-emerald-600/40 rounded-full" style={{ top: '35%', left: '35%', right: '35%', bottom: '35%' }} />
        {/* Penalty areas */}
        <div className="absolute border border-emerald-600/40" style={{ top: '10%', left: '30%', right: '30%', height: '18%' }} />
        <div className="absolute border border-emerald-600/40" style={{ bottom: '10%', left: '30%', right: '30%', height: '18%' }} />
      </div>
      {slots.map((slot, i) => {
        const player = starters[i];
        if (!player) return null;
        const left = `${slot.x}%`;
        const top = `${slot.y}%`;
        const color = posColors[player.position] ?? '#6b7280';
        return (
          <button
            key={player.id}
            onClick={() => onPlayerClick?.(player.id)}
            style={{ position: 'absolute', left, top, transform: 'translate(-50%, -50%)' }}
            className="flex flex-col items-center z-10 group"
          >
            <div
              className="rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center font-bold text-white transition-transform group-hover:scale-110"
              style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, background: color, fontSize: compact ? 9 : 11 }}
            >
              {player.rating}
            </div>
            {!compact && (
              <span className="text-white text-xs mt-0.5 bg-black/50 px-1 rounded whitespace-nowrap max-w-16 truncate leading-tight">
                {player.name.split(' ').pop()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
