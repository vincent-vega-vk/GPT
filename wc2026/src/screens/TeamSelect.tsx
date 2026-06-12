import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Team } from '../types';
import clsx from 'clsx';

function ratingBadge(r: number) {
  if (r >= 90) return 'bg-yellow-500 text-black';
  if (r >= 80) return 'bg-emerald-600 text-white';
  if (r >= 70) return 'bg-blue-600 text-white';
  return 'bg-gray-600 text-white';
}

const CONFEDERATIONS = ['All', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

interface TeamCardProps {
  team: Team;
  selected: boolean;
  onSelect: () => void;
}

function TeamCard({ team, selected, onSelect }: TeamCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      className={clsx(
        'relative rounded-xl border-2 transition-all text-left p-3 bg-gray-900',
        selected ? 'border-amber-400 shadow-lg shadow-amber-900/40 scale-105' : 'border-gray-800 hover:border-amber-600',
      )}
    >
      {selected && <div className="absolute -top-2 -right-2 bg-amber-400 text-black text-xs font-bold px-1.5 py-0.5 rounded">SELECTED</div>}
      <div className="text-4xl text-center mb-1">{team.flag}</div>
      <div className="text-sm font-bold text-white text-center leading-tight">{team.name}</div>
      <div className="flex justify-center mt-1">
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', ratingBadge(team.overall))}>{team.overall}</span>
      </div>
      {hovered && (
        <div className="mt-2 border-t border-gray-700 pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Attack</span>
            <span className="text-white font-medium">{team.attack}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Midfield</span>
            <span className="text-white font-medium">{team.midfield}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Defense</span>
            <span className="text-white font-medium">{team.defense}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">GK</span>
            <span className="text-white font-medium">{team.goalkeeper}</span>
          </div>
          <div className="text-xs text-amber-400 font-medium text-center mt-1 capitalize">{team.tacticalIdentity}</div>
          <div className="flex justify-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={i < team.fanExpectations / 2 ? 'text-amber-400' : 'text-gray-700'}>★</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 italic mt-1 leading-tight">{team.footballCulture}</p>
        </div>
      )}
    </button>
  );
}

export default function TeamSelect() {
  const teams = useGameStore(s => s.teams);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const selectTeam = useGameStore(s => s.selectTeam);
  const startTournament = useGameStore(s => s.startTournament);
  const setPhase = useGameStore(s => s.setPhase);
  const [search, setSearch] = useState('');
  const [confFilter, setConfFilter] = useState('All');

  const allTeams = Object.values(teams);
  const filtered = allTeams.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.shortName.toLowerCase().includes(search.toLowerCase());
    const matchConf = confFilter === 'All' || t.confederation === confFilter;
    return matchSearch && matchConf;
  }).sort((a, b) => b.overall - a.overall);

  const selectedTeam = playerTeamId ? teams[playerTeamId] : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-black text-amber-400 mb-1">CHOOSE YOUR NATION</h1>
          <p className="text-gray-500 text-sm">48 teams. One dream. Which nation do you lead to glory?</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500 outline-none w-48"
            />
            <div className="flex gap-1 flex-wrap">
              {CONFEDERATIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setConfFilter(c)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    confFilter === c ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {filtered.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                selected={playerTeamId === team.id}
                onSelect={() => selectTeam(team.id)}
              />
            ))}
          </div>
        </div>
      </div>
      {selectedTeam && (
        <div className="bg-gray-900 border-t border-amber-800/50 px-6 py-4 sticky bottom-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{selectedTeam.flag}</span>
              <div>
                <div className="font-black text-white text-lg">{selectedTeam.name}</div>
                <div className="text-gray-400 text-sm capitalize">{selectedTeam.tacticalIdentity} · Overall {selectedTeam.overall}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('WELCOME')}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                ← Back
              </button>
              <button
                onClick={startTournament}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-base rounded-xl transition-all hover:scale-105 shadow-lg shadow-amber-900/40"
              >
                CONFIRM SELECTION →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
