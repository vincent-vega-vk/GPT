import clsx from 'clsx';
import type { Team } from '../types';

interface TeamBadgeProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
}

export default function TeamBadge({ team, size = 'md', showName = false }: TeamBadgeProps) {
  const flagSize = { sm: 'text-lg', md: 'text-3xl', lg: 'text-5xl', xl: 'text-7xl' };
  const nameSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-xl' };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={flagSize[size]}>{team.flag}</span>
      {showName && <span className={clsx('font-semibold text-white', nameSize[size])}>{team.shortName}</span>}
    </div>
  );
}
