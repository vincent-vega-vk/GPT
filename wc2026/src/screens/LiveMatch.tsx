import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { MatchEvent } from '../types';
import StatBar from '../components/StatBar';
import MatchTimeline from '../components/MatchTimeline';
import clsx from 'clsx';

type LivePhase = 'first_half' | 'half_time' | 'second_half' | 'extra_time' | 'penalties' | 'full_time';

interface InterventionModal {
  type: 'halftime' | 'goal_conceded' | 'goal_scored' | 'fatigue' | 'before_et' | 'penalties';
  title: string;
}

export default function LiveMatch() {
  const matches = useGameStore(s => s.matches);
  const currentMatchId = useGameStore(s => s.currentMatchId);
  const teams = useGameStore(s => s.teams);
  const playerTeamId = useGameStore(s => s.playerTeamId);
  const goToPostMatch = useGameStore(s => s.goToPostMatch);
  const changeTacticsMidMatch = useGameStore(s => s.changeTacticsMidMatch);
  const makeSubstitution = useGameStore(s => s.makeSubstitution);

  const match = matches.find(m => m.id === currentMatchId);
  const result = match?.result;
  const homeTeam = match ? teams[match.homeTeamId] : null;
  const awayTeam = match ? teams[match.awayTeamId] : null;

  const [minute, setMinute] = useState(0);
  const [displayedEvents, setDisplayedEvents] = useState<MatchEvent[]>([]);
  const [livePhase, setLivePhase] = useState<LivePhase>('first_half');
  const [intervention, setIntervention] = useState<InterventionModal | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [penSequence, setPenSequence] = useState<string[]>([]);
  const [penIdx, setPenIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitioned = useRef(false);

  const allEvents = result?.events ?? [];
  const hasPens = result?.homePens !== undefined;

  // Calculate live score
  const liveHomeGoals = displayedEvents.filter(e => e.type === 'goal' && e.team === 'home').length;
  const liveAwayGoals = displayedEvents.filter(e => e.type === 'goal' && e.team === 'away').length;

  const [subOut, setSubOut] = useState<string>('');
  const [subIn, setSubIn] = useState<string>('');
  const [showSubModal, setShowSubModal] = useState(false);

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      setMinute(prev => {
        const next = prev + 1;
        // Add events for this minute
        const newEvents = allEvents.filter(e => e.minute === next);
        if (newEvents.length > 0) setDisplayedEvents(de => [...de, ...newEvents]);
        // Check phase transitions
        if (next === 45 && livePhase === 'first_half') {
          stopTimer();
          setLivePhase('half_time');
          setIntervention({ type: 'halftime', title: 'HALF TIME' });
          return 45;
        }
        if (next === 90 && livePhase === 'second_half') {
          if (hasPens && result && result.homeGoals === result.awayGoals) {
            stopTimer();
            setLivePhase('extra_time');
            setIntervention({ type: 'before_et', title: 'EXTRA TIME APPROACHING' });
            return 90;
          }
          stopTimer();
          setLivePhase('full_time');
          return 90;
        }
        if (next === 120 && livePhase === 'extra_time') {
          stopTimer();
          setLivePhase('penalties');
          setIntervention({ type: 'penalties', title: 'PENALTY SHOOTOUT' });
          return 120;
        }
        return next;
      });
    }, 333); // 1 real second = 3 match minutes
  }

  useEffect(() => {
    if (result && !transitioned.current) {
      startTimer();
    }
    return () => stopTimer();
  }, [result]);

  useEffect(() => {
    if (livePhase === 'full_time' && !transitioned.current) {
      transitioned.current = true;
      setTimeout(() => setShowFinal(true), 800);
      setTimeout(() => {
        if (result && currentMatchId) goToPostMatch(result, currentMatchId);
      }, 3000);
    }
  }, [livePhase]);

  // Check for intervention events during play
  const lastEvent = displayedEvents[displayedEvents.length - 1];
  const prevLastEventRef = useRef<MatchEvent | null>(null);
  useEffect(() => {
    if (lastEvent && lastEvent !== prevLastEventRef.current && !intervention) {
      prevLastEventRef.current = lastEvent;
      const isPlayerHome = playerTeamId === match?.homeTeamId;
      if (lastEvent.type === 'goal') {
        const isMyGoal = (isPlayerHome && lastEvent.team === 'home') || (!isPlayerHome && lastEvent.team === 'away');
        const isConceded = !isMyGoal;
        if (isConceded && Math.random() < 0.6) {
          stopTimer();
          setIntervention({ type: 'goal_conceded', title: 'GOAL CONCEDED — React?' });
        }
      }
    }
  }, [displayedEvents]);

  if (!match || !result || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading match...</div>
      </div>
    );
  }

  const isHome = match.homeTeamId === playerTeamId;
  const myTeam = isHome ? homeTeam : awayTeam;
  const myGoals = isHome ? liveHomeGoals : liveAwayGoals;
  const oppGoals = isHome ? liveAwayGoals : liveHomeGoals;

  function dismissIntervention() {
    setIntervention(null);
    if (livePhase === 'half_time') setLivePhase('second_half');
    if (livePhase === 'full_time' || livePhase === 'extra_time') {}
    startTimer();
  }

  function handlePenalties() {
    if (!result?.homePens) return;
    setIntervention(null);
    // Show pens sequentially
    setPenIdx(0);
    setLivePhase('penalties');
    // Build sequence
    const seq: string[] = [];
    const homePens = result.homePens ?? 0;
    const awayPens = result.awayPens ?? 0;
    // Simulate sequence
    for (let i = 0; i < 5; i++) {
      const hScore = i < homePens;
      const aScore = i < awayPens;
      seq.push(`H ${hScore ? '✓' : '✗'}`);
      seq.push(`A ${aScore ? '✓' : '✗'}`);
    }
    setPenSequence(seq);
    // Show each kick with delay
    let idx = 0;
    const penTimer = setInterval(() => {
      idx++;
      setPenIdx(idx);
      if (idx >= seq.length) {
        clearInterval(penTimer);
        setTimeout(() => {
          setLivePhase('full_time');
          setShowFinal(true);
          setTimeout(() => {
            if (result && currentMatchId) goToPostMatch(result, currentMatchId);
          }, 2000);
        }, 1500);
      }
    }, 1500);
  }

  const benchPlayers = myTeam.players.filter(p => !p.isInStartingXI && !p.isInjured);
  const startingPlayers = myTeam.players.filter(p => p.isInStartingXI);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Scoreboard */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center flex-1">
              <div className="text-3xl mb-0.5">{homeTeam.flag}</div>
              <div className="font-black text-white text-sm">{homeTeam.shortName}</div>
            </div>
            <div className="text-center">
              <div className={clsx(
                'text-6xl font-black tabular-nums tracking-tight transition-all',
                liveHomeGoals !== result.homeGoals || liveAwayGoals !== result.awayGoals ? 'text-white' : 'text-amber-400',
              )}>
                {liveHomeGoals} – {liveAwayGoals}
              </div>
              <div className={clsx('text-sm mt-1 font-bold', livePhase === 'full_time' ? 'text-gray-500' : 'text-emerald-400')}>
                {livePhase === 'full_time' ? 'FULL TIME' :
                 livePhase === 'half_time' ? 'HALF TIME' :
                 livePhase === 'penalties' ? 'PENALTIES' :
                 `${minute}'`}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-3xl mb-0.5">{awayTeam.flag}</div>
              <div className="font-black text-white text-sm">{awayTeam.shortName}</div>
            </div>
          </div>
          {hasPens && livePhase === 'penalties' && (
            <div className="mt-2 text-center text-amber-400 text-sm font-bold">
              PENALTIES: {result.homePens ?? 0} – {result.awayPens ?? 0}
            </div>
          )}
        </div>
      </div>
      {/* Penalty sequence */}
      {livePhase === 'penalties' && penSequence.length > 0 && (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <div className="max-w-5xl mx-auto flex gap-2 flex-wrap justify-center">
            {penSequence.slice(0, penIdx).map((p, i) => (
              <span key={i} className={clsx('text-sm font-bold px-2 py-1 rounded',
                p.includes('✓') ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300',
              )}>{p}</span>
            ))}
          </div>
        </div>
      )}
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-auto">
        {/* Timeline */}
        <div className="flex-1 p-4 overflow-auto">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Match Timeline</h3>
          <MatchTimeline
            events={displayedEvents}
            homeTeamName={homeTeam.shortName}
            awayTeamName={awayTeam.shortName}
          />
        </div>
        {/* Live stats */}
        <div className="lg:w-72 xl:w-80 p-4 border-t lg:border-t-0 lg:border-l border-gray-800">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Live Stats</h3>
          <StatBar label="Possession" home={result.stats.homePossession} away={result.stats.awayPossession} format={v => `${v}%`} />
          <StatBar label="Shots" home={result.stats.homeShots} away={result.stats.awayShots} />
          <StatBar label="On Target" home={result.stats.homeShotsOnTarget} away={result.stats.awayShotsOnTarget} />
          <StatBar label="xG" home={result.stats.homeXG} away={result.stats.awayXG} format={v => v.toFixed(2)} />
          <StatBar label="Corners" home={result.stats.homeCorners} away={result.stats.awayCorners} />
          {/* Intervention buttons */}
          <div className="mt-4 space-y-2">
            <button onClick={() => { stopTimer(); setIntervention({ type: 'goal_conceded', title: 'TACTICAL ADJUSTMENT' }); }}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
              ⚙️ Tactical Change
            </button>
            <button onClick={() => { stopTimer(); setShowSubModal(true); }}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
              🔄 Substitution
            </button>
          </div>
        </div>
      </div>
      {/* Full time reveal */}
      {showFinal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className={clsx('text-3xl font-black mb-4', myGoals > oppGoals ? 'text-emerald-400' : myGoals < oppGoals ? 'text-red-400' : 'text-amber-400')}>
              {myGoals > oppGoals ? '🏆 VICTORY!' : myGoals < oppGoals ? '😔 DEFEAT' : '🤝 DRAW'}
            </div>
            <div className="text-8xl font-black text-white">{liveHomeGoals} – {liveAwayGoals}</div>
            <div className="text-gray-400 mt-2">{homeTeam.name} vs {awayTeam.name}</div>
          </div>
        </div>
      )}
      {/* Intervention Modal */}
      {intervention && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border border-amber-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2">{intervention.title}</h3>
            {intervention.type === 'halftime' && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">Half Time. Score: {liveHomeGoals}–{liveAwayGoals}. Make your adjustments.</p>
                <div className="space-y-2">
                  {(['ultra-attacking','attacking','balanced','defensive'] as const).map(m => (
                    <button key={m} onClick={() => { changeTacticsMidMatch({ mentality: m }); }}
                      className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm text-left capitalize">
                      → Set Mentality: {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(intervention.type === 'goal_conceded' || intervention.type === 'goal_scored') && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">What's your response?</p>
                <div className="space-y-2">
                  <button onClick={() => { changeTacticsMidMatch({ mentality: 'attacking' }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">⚡ Push Forward (Attacking)</button>
                  <button onClick={() => { changeTacticsMidMatch({ mentality: 'defensive' }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">🛡️ Sit Deeper (Defensive)</button>
                  <button onClick={() => { changeTacticsMidMatch({ pressingIntensity: 8 }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">💨 Press Higher</button>
                </div>
              </div>
            )}
            {intervention.type === 'before_et' && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-3">Extra time approaches! Set up for the extra 30 minutes.</p>
                <div className="space-y-2">
                  <button onClick={() => { changeTacticsMidMatch({ mentality: 'attacking', tempo: 9 }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">🔥 Go All Out</button>
                  <button onClick={() => { changeTacticsMidMatch({ mentality: 'balanced', defensiveLine: 5 }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">⚖️ Balanced Approach</button>
                  <button onClick={() => { changeTacticsMidMatch({ mentality: 'defensive' }); dismissIntervention(); }}
                    className="w-full px-4 py-2 bg-gray-800 hover:bg-amber-900/30 text-gray-300 rounded-lg text-sm">🔒 Play for Pens</button>
                </div>
              </div>
            )}
            {intervention.type === 'penalties' && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-4">IT GOES TO PENALTIES! Final score: {liveHomeGoals}–{liveAwayGoals}</p>
                <button onClick={handlePenalties}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-lg">
                  🎯 START SHOOTOUT
                </button>
              </div>
            )}
            {intervention.type !== 'penalties' && (
              <button onClick={dismissIntervention}
                className="w-full py-2 mt-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm">
                Continue Match →
              </button>
            )}
          </div>
        </div>
      )}
      {/* Sub Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Substitution</h3>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Remove Player</label>
              <select value={subOut} onChange={e => setSubOut(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                <option value="">-- Select --</option>
                {startingPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Bring On Player</label>
              <select value={subIn} onChange={e => setSubIn(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                <option value="">-- Select --</option>
                {benchPlayers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position}) - {p.rating}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSubModal(false)}
                className="flex-1 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => { if (subOut && subIn) { makeSubstitution(subOut, subIn); setShowSubModal(false); startTimer(); } }}
                disabled={!subOut || !subIn}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold rounded-lg text-sm">
                Confirm Sub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
