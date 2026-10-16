import { useGameStore } from '../store/gameStore';
import type { GamePhase } from '../types';
import clsx from 'clsx';

const PHASE_LABELS: Partial<Record<GamePhase, string>> = {
  WELCOME: 'Welcome',
  TEAM_SELECT: 'Choose Your Nation',
  SQUAD_HUB: 'Squad Hub',
  TACTICAL_BOARD: 'Tactical Board',
  PRE_MATCH: 'Pre-Match',
  LIVE_MATCH: 'Live Match',
  POST_MATCH: 'Post-Match Analysis',
  PRESS_CONFERENCE: 'Press Conference',
  DRESSING_ROOM: 'Dressing Room',
  BETWEEN_MATCHES: 'Manager HQ',
  GROUP_TABLES: 'Group Tables',
  KNOCKOUT_BRACKET: 'Tournament Bracket',
  TOURNAMENT_END: 'Tournament End',
};

interface LayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
}

export default function Layout({ children, showBack, onBack, className }: LayoutProps) {
  const phase = useGameStore(s => s.phase);
  const notifications = useGameStore(s => s.notifications);
  const dismiss = useGameStore(s => s.dismissNotification);
  return (
    <div className={clsx('min-h-screen bg-gray-950 text-white flex flex-col', className)}>
      {phase !== 'WELCOME' && (
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3">
          {showBack && onBack && (
            <button onClick={onBack} className="text-gray-400 hover:text-amber-400 transition-colors text-sm flex items-center gap-1">
              ← Back
            </button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-gray-500 uppercase tracking-widest">{PHASE_LABELS[phase] ?? phase}</span>
          <div className="flex-1" />
        </header>
      )}
      {notifications.length > 0 && (
        <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 flex items-center justify-between">
          <span className="text-amber-200 text-sm">{notifications[0]}</span>
          <button onClick={dismiss} className="text-amber-400 hover:text-white ml-4 text-sm">✕</button>
        </div>
      )}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
