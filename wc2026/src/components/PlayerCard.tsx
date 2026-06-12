import type { Player } from '../types';
import clsx from 'clsx';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

function ratingColor(r: number) {
  if (r >= 90) return 'bg-yellow-500 text-black';
  if (r >= 80) return 'bg-emerald-500 text-black';
  if (r >= 70) return 'bg-blue-500 text-white';
  return 'bg-gray-600 text-white';
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
    </div>
  );
}

const posColors: Record<string, string> = {
  GK: 'bg-yellow-700', CB: 'bg-blue-700', RB: 'bg-blue-600', LB: 'bg-blue-600',
  CDM: 'bg-purple-700', CM: 'bg-purple-600', CAM: 'bg-purple-500', RM: 'bg-green-700',
  LM: 'bg-green-700', RW: 'bg-green-600', LW: 'bg-green-600', CF: 'bg-red-600', ST: 'bg-red-700',
};

export default function PlayerCard({ player, compact = false, onClick, selected }: PlayerCardProps) {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border transition-all cursor-pointer',
          selected ? 'border-amber-500' : 'border-gray-800 hover:border-gray-600',
          player.isInjured && 'opacity-50',
        )}
      >
        <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded uppercase', posColors[player.position] ?? 'bg-gray-600')}>{player.position}</span>
        <span className="flex-1 text-sm font-medium truncate">{player.name}</span>
        {player.isInjured && <span className="text-red-400 text-xs">INJ</span>}
        {player.isSuspended && <span className="text-yellow-400 text-xs">SUS</span>}
        <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded', ratingColor(player.rating))}>{player.rating}</span>
        {player.isInStartingXI && <span className="text-amber-400 text-xs font-bold">XI</span>}
      </div>
    );
  }
  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg bg-gray-900 border transition-all',
        onClick && 'cursor-pointer hover:border-gray-600',
        selected ? 'border-amber-500' : 'border-gray-800',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded uppercase', posColors[player.position] ?? 'bg-gray-600')}>{player.position}</span>
            <span className="text-sm font-medium">{player.name}</span>
          </div>
          <div className="text-xs text-gray-500">{player.role} · Age {player.age}</div>
        </div>
        <span className={clsx('text-sm font-bold px-2 py-1 rounded', ratingColor(player.rating))}>{player.rating}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">Form</span>
          <Bar value={player.form * 10} color="bg-amber-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">Fit</span>
          <Bar value={player.fitness} color={player.fitness > 70 ? 'bg-emerald-500' : player.fitness > 50 ? 'bg-yellow-500' : 'bg-red-500'} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">Mor</span>
          <Bar value={player.morale} color={player.morale > 70 ? 'bg-blue-500' : 'bg-gray-500'} />
        </div>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {player.isInjured && <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">INJURED</span>}
        {player.isSuspended && <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded">SUSPENDED</span>}
        {player.isInStartingXI && <span className="text-xs bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded">STARTING</span>}
        <span className="text-xs text-gray-500">{player.personality}</span>
      </div>
    </div>
  );
}
