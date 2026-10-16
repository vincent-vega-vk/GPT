import type { MatchEvent } from '../types';
import clsx from 'clsx';

const eventIcon: Record<string, string> = {
  goal: '⚽', owngoal: '⚽', yellow: '🟨', red: '🟥',
  substitution: '🔄', injury: '🤕', penalty_miss: '❌', save: '🧤', momentum: '💨',
};

interface MatchTimelineProps {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  maxShow?: number;
}

export default function MatchTimeline({ events, homeTeamName, awayTeamName, maxShow = 50 }: MatchTimelineProps) {
  const visible = [...events].sort((a, b) => b.minute - a.minute).slice(0, maxShow);
  return (
    <div className="space-y-1.5">
      {visible.map((ev, i) => (
        <div key={i} className={clsx(
          'flex items-center gap-2 py-1 px-2 rounded text-sm',
          ev.type === 'goal' && 'bg-emerald-900/40 border border-emerald-700/50',
          ev.type === 'red' && 'bg-red-900/40 border border-red-700/50',
          ev.type === 'yellow' && 'bg-yellow-900/30',
          ev.type === 'momentum' && 'bg-gray-800/50 text-gray-400 italic',
        )}>
          <span className="text-gray-500 text-xs w-8 shrink-0">{ev.minute}'</span>
          <span>{eventIcon[ev.type] ?? '•'}</span>
          <span className={clsx('flex-1', ev.team === 'home' ? 'text-blue-300' : 'text-red-300', ev.type === 'momentum' && 'text-gray-400')}>
            {ev.type === 'momentum' ? ev.detail : (
              <>
                {ev.type === 'goal' && <strong className="text-white">GOAL! </strong>}
                {ev.type === 'owngoal' && <strong className="text-red-400">OWN GOAL! </strong>}
                {ev.playerName && <span>{ev.playerName}</span>}
                {ev.detail && <span className="text-gray-400 ml-1 text-xs">{ev.detail}</span>}
                <span className="text-gray-500 ml-1 text-xs">({ev.team === 'home' ? homeTeamName : awayTeamName})</span>
              </>
            )}
          </span>
        </div>
      ))}
      {visible.length === 0 && <div className="text-gray-600 text-sm text-center py-4">Match has not started</div>}
    </div>
  );
}
