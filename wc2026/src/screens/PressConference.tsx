import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

const JOURNALISTS = [
  { name: 'María García', outlet: 'ESPN FC', avatar: '👩‍💼' },
  { name: 'James Mitchell', outlet: 'BBC Sport', avatar: '👨‍💻' },
  { name: 'Yuki Tanaka', outlet: 'Goal.com', avatar: '👨‍🎤' },
];

export default function PressConference() {
  const pendingPress = useGameStore(s => s.pendingPress);
  const answerPress = useGameStore(s => s.answerPress);
  const setPhase = useGameStore(s => s.setPhase);
  const managerName = useGameStore(s => s.managerName);
  const mediaHeat = useGameStore(s => s.mediaHeat);

  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<number[]>([]);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [typing, setTyping] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [showEffect, setShowEffect] = useState<{ morale: number; press: number } | null>(null);
  const [done, setDone] = useState(false);

  const questions = pendingPress ?? [];
  const q = questions[currentQ];

  useEffect(() => {
    if (!q) return;
    setTyping(true);
    setTypedText('');
    let i = 0;
    const timer = setInterval(() => {
      setTypedText(q.question.slice(0, i + 1));
      i++;
      if (i >= q.question.length) { setTyping(false); clearInterval(timer); }
    }, 20);
    return () => clearInterval(timer);
  }, [currentQ, q?.question]);

  if (!q || done || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎙️</div>
          <h2 className="text-2xl font-black text-amber-400 mb-2">Press Conference Complete</h2>
          <p className="text-gray-400 text-sm mb-6">The media hunger has been satisfied... for now.</p>
          <div className="flex items-center gap-2 justify-center mb-4">
            <span className="text-sm text-gray-500">Media Heat:</span>
            <div className="w-32 h-2 bg-gray-800 rounded overflow-hidden">
              <div className="h-full rounded" style={{ width: `${mediaHeat}%`, background: mediaHeat > 70 ? '#ef4444' : mediaHeat > 40 ? '#f59e0b' : '#10b981' }} />
            </div>
            <span className="text-xs text-gray-500">{mediaHeat}</span>
          </div>
          <button onClick={() => setPhase('BETWEEN_MATCHES')}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black rounded-xl text-lg">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  const journalist = JOURNALISTS[currentQ % JOURNALISTS.length];

  function handleAnswer(optIdx: number) {
    const opt = q.options[optIdx];
    setChosen({ ...chosen, [currentQ]: optIdx });
    setShowEffect({ morale: opt.moraleDelta, press: opt.pressureDelta });
    answerPress(currentQ, optIdx);
    setTimeout(() => {
      setShowEffect(null);
      setAnswered([...answered, currentQ]);
      if (currentQ + 1 >= questions.length) {
        setDone(true);
      } else {
        setCurrentQ(currentQ + 1);
      }
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-amber-400">PRESS CONFERENCE</h1>
            <p className="text-sm text-gray-500">Manager: {managerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Media Heat</span>
            <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${mediaHeat}%`, background: mediaHeat > 70 ? '#ef4444' : mediaHeat > 40 ? '#f59e0b' : '#10b981' }} />
            </div>
            <span className="text-xs font-bold" style={{ color: mediaHeat > 70 ? '#ef4444' : '#10b981' }}>{mediaHeat}</span>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-2 flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={clsx('h-1 rounded flex-1 transition-all',
              i < currentQ ? 'bg-amber-500' : i === currentQ ? 'bg-amber-300' : 'bg-gray-700'
            )} />
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Journalist */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl shrink-0">
              {journalist.avatar}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">{journalist.name} · {journalist.outlet}</div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-none p-4">
                <p className="text-white leading-relaxed min-h-12">
                  {typedText}
                  {typing && <span className="animate-pulse">|</span>}
                </p>
              </div>
            </div>
          </div>
          {/* Answer options */}
          {!typing && !chosen[currentQ] && (
            <div className="space-y-3 ml-16">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full text-left p-4 bg-gray-900 border border-gray-800 hover:border-amber-600 rounded-xl transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-xs font-bold text-amber-500 block mb-1">[{opt.label}]</span>
                      <span className="text-gray-200 text-sm">{opt.text}</span>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <div className={clsx(opt.moraleDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {opt.moraleDelta >= 0 ? '+' : ''}{opt.moraleDelta} morale
                      </div>
                      <div className={clsx(opt.pressureDelta >= 0 ? 'text-orange-400' : 'text-blue-400')}>
                        {opt.pressureDelta >= 0 ? '+' : ''}{opt.pressureDelta} heat
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Effect display */}
          {showEffect && (
            <div className="ml-16 p-4 bg-gray-900 border border-amber-700 rounded-xl flex gap-4 justify-center">
              <span className={clsx('font-bold', showEffect.morale >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {showEffect.morale >= 0 ? '↑' : '↓'} Morale {Math.abs(showEffect.morale)}
              </span>
              <span className={clsx('font-bold', showEffect.press <= 0 ? 'text-blue-400' : 'text-orange-400')}>
                {showEffect.press <= 0 ? '↓' : '↑'} Media Heat {Math.abs(showEffect.press)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
