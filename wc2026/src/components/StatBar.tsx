
interface StatBarProps {
  label: string;
  home: number;
  away: number;
  homeColor?: string;
  awayColor?: string;
  format?: (v: number) => string;
}

export default function StatBar({ label, home, away, homeColor = '#10b981', awayColor = '#ef4444', format }: StatBarProps) {
  const total = home + away || 1;
  const homeW = (home / total) * 100;
  const awayW = (away / total) * 100;
  const fmt = format ?? String;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span className="font-semibold">{fmt(home)}</span>
        <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
        <span className="font-semibold">{fmt(away)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        <div style={{ width: `${homeW}%`, background: homeColor }} className="transition-all duration-500" />
        <div style={{ width: `${awayW}%`, background: awayColor }} className="transition-all duration-500" />
      </div>
    </div>
  );
}
