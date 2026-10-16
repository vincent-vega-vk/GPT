import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player, Position } from '../types';
import PlayerCard from '../components/PlayerCard';
import FormationPitch from '../components/FormationPitch';
import clsx from 'clsx';

const POSITION_GROUPS: { label: string; positions: Position[] }[] = [
  { label: 'Goalkeepers', positions: ['GK'] },
  { label: 'Defenders', positions: ['CB', 'RB', 'LB'] },
  { label: 'Midfielders', positions: ['CDM', 'CM', 'CAM', 'RM', 'LM'] },
  { label: 'Forwards', positions: ['RW', 'LW', 'CF', 'ST'] },
];

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-5-1', '3-4-2-1'];

export default function SquadHub() {
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const teams = useGameStore(s => s.teams);
  const togglePlayerInXI = useGameStore(s => s.togglePlayerInXI);
  const updateTactics = useGameStore(s => s.updateTactics);
  const setPhase = useGameStore(s => s.setPhase);
  const goToPreMatch = useGameStore(s => s.goToPreMatch);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const team = playerTeamId ? teams[playerTeamId] : null;
  if (!team) return <div className="p-6 text-gray-400">No team selected.</div>;

  const xi = team.players.filter(p => p.isInStartingXI);
  const xiCount = xi.length;
  const xiValid = xiCount === 11;

  const avgMorale = Math.round(team.players.reduce((a, p) => a + p.morale, 0) / team.players.length);
  const avgFitness = Math.round(team.players.reduce((a, p) => a + p.fitness, 0) / team.players.length);
  const injuredCount = team.players.filter(p => p.isInjured).length;
  const suspendedCount = team.players.filter(p => p.isSuspended).length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">SQUAD HUB</h1>
            <p className="text-sm text-gray-500">{team.name} · {team.flag}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPhase('TACTICAL_BOARD')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
              Tactics ⚙️
            </button>
            <button
              onClick={goToPreMatch}
              disabled={!xiValid}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold rounded-lg text-sm"
            >
              {xiValid ? 'To Pre-Match →' : `Select XI (${xiCount}/11)`}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-4 flex-wrap">
          <div className="text-sm text-gray-400">Chemistry: <span className="text-amber-400 font-bold">{team.chemistry}</span></div>
          <div className="text-sm text-gray-400">Avg Morale: <span className={clsx('font-bold', avgMorale > 70 ? 'text-emerald-400' : 'text-red-400')}>{avgMorale}</span></div>
          <div className="text-sm text-gray-400">Avg Fitness: <span className={clsx('font-bold', avgFitness > 80 ? 'text-emerald-400' : 'text-yellow-400')}>{avgFitness}%</span></div>
          {injuredCount > 0 && <div className="text-sm text-red-400">🤕 {injuredCount} injured</div>}
          {suspendedCount > 0 && <div className="text-sm text-yellow-400">🟨 {suspendedCount} suspended</div>}
        </div>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Formation Pitch */}
        <div className="lg:w-80 xl:w-96 p-4 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-2 uppercase tracking-widest">Formation</label>
            <div className="flex flex-wrap gap-1">
              {FORMATIONS.map(f => (
                <button
                  key={f}
                  onClick={() => updateTactics({ formation: f })}
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    team.tactics.formation === f ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <FormationPitch
            formation={team.tactics.formation}
            players={team.players}
            onPlayerClick={id => {
              const p = team.players.find(pl => pl.id === id);
              setSelectedPlayer(p ?? null);
            }}
          />
          {!xiValid && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">
              ⚠️ Select exactly 11 players for the Starting XI ({xiCount}/11)
            </div>
          )}
        </div>
        {/* Right: Player List */}
        <div className="flex-1 overflow-auto p-4">
          {selectedPlayer && (
            <div className="mb-4 p-4 bg-amber-900/20 border border-amber-700 rounded-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-amber-400">{selectedPlayer.name}</h3>
                  <p className="text-sm text-gray-400">{selectedPlayer.role} · Age {selectedPlayer.age} · Rating {selectedPlayer.rating}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedPlayer.personality} | Big Match: {selectedPlayer.bigMatchMentality}/10 | Injury Risk: {selectedPlayer.injuryRisk}/10</p>
                  <p className="text-xs text-gray-500">Goals: {selectedPlayer.goals} | Assists: {selectedPlayer.assists} | Yellow Cards: {selectedPlayer.yellowCards}</p>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => togglePlayerInXI(selectedPlayer.id)}
                  disabled={selectedPlayer.isInjured || selectedPlayer.isSuspended}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                    selectedPlayer.isInStartingXI ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white',
                    (selectedPlayer.isInjured || selectedPlayer.isSuspended) && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {selectedPlayer.isInStartingXI ? '- Remove from XI' : '+ Add to Starting XI'}
                </button>
              </div>
            </div>
          )}
          {POSITION_GROUPS.map(group => {
            const groupPlayers = team.players.filter(p => group.positions.includes(p.position));
            if (groupPlayers.length === 0) return null;
            return (
              <div key={group.label} className="mb-5">
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">{group.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {groupPlayers.map(p => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      onClick={() => setSelectedPlayer(p)}
                      selected={selectedPlayer?.id === p.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
