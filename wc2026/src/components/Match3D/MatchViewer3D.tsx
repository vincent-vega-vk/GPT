import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Pitch3D from './Pitch3D';
import Players3D from './Players3D';
import Ball3D from './Ball3D';
import type { Match3DEvent } from '../../types';

// ─── Camera Controller ───────────────────────────────────────────────────────

type CameraMode = 'broadcast' | 'tactical' | 'touchline';

const CAMERA_PRESETS: Record<CameraMode, { pos: [number, number, number]; look: [number, number, number] }> = {
  broadcast: { pos: [52.5, 38, 110], look: [52.5, 0, 34] },
  tactical:  { pos: [52.5, 120, 34], look: [52.5, 0, 34] },
  touchline: { pos: [52.5, 8, 92],   look: [52.5, 0, 34] },
};

function CameraController({ mode, trackBall }: { mode: CameraMode; trackBall: boolean }) {
  const { camera } = useThree();
  const targetPosRef = useRef(new THREE.Vector3(...CAMERA_PRESETS[mode].pos));
  const targetLookRef = useRef(new THREE.Vector3(...CAMERA_PRESETS[mode].look));
  const lookatRef = useRef(new THREE.Vector3(...CAMERA_PRESETS[mode].look));

  useEffect(() => {
    const preset = CAMERA_PRESETS[mode];
    targetPosRef.current.set(...preset.pos);
    targetLookRef.current.set(...preset.look);
  }, [mode]);

  useFrame((state, delta) => {
    // Smoothly move camera to target
    camera.position.lerp(targetPosRef.current, delta * 1.5);
    lookatRef.current.lerp(targetLookRef.current, delta * 2);

    if (trackBall && mode === 'broadcast') {
      // Slightly tilt to follow action
      lookatRef.current.x += (52.5 - lookatRef.current.x) * delta;
    }

    camera.lookAt(lookatRef.current);
    void state;
  });

  return null;
}

// ─── Scoreboard overlay (inside canvas as a plane) ───────────────────────────
// We skip a 3D scoreboard and handle it via HTML overlay outside canvas

// ─── Main Viewer ─────────────────────────────────────────────────────────────

export interface MatchViewer3DProps {
  events: Match3DEvent[];
  homeTeamName: string;
  awayTeamName: string;
  homeColor: string;
  awayColor: string;
  homeFormation: string;
  awayFormation: string;
  currentMinute: number;
  homeGoals: number;
  awayGoals: number;
  isKeyMoment?: boolean;
}

function Scene({
  events, homeColor, awayColor, homeFormation, awayFormation,
  currentMinute, cameraMode,
}: MatchViewer3DProps & { cameraMode: CameraMode }) {
  const [currentEvent, setCurrentEvent] = useState<Match3DEvent | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Track which event is "current" based on minute
  useEffect(() => {
    const ev = [...events].reverse().find(e => e.minute <= currentMinute);
    if (ev && ev.id !== lastEventIdRef.current) {
      lastEventIdRef.current = ev.id;
      setCurrentEvent(ev);
    }
  }, [currentMinute, events]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[60, 80, 40]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-30, 60, -20]} intensity={0.3} color="#a0c8ff" />

      <Pitch3D />
      <Players3D
        homeFormation={homeFormation}
        awayFormation={awayFormation}
        homeColor={homeColor}
        awayColor={awayColor}
        currentEvent={currentEvent}
        currentMinute={currentMinute}
      />
      <Ball3D currentEvent={currentEvent} currentMinute={currentMinute} />
      <CameraController mode={cameraMode} trackBall={true} />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#0a1a0a', 80, 220]} />
    </>
  );
}

export default function MatchViewer3D(props: MatchViewer3DProps) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('broadcast');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cycleCameraMode = useCallback(() => {
    setCameraMode(prev => prev === 'broadcast' ? 'tactical' : prev === 'tactical' ? 'touchline' : 'broadcast');
  }, []);

  // Flash on key moment
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (props.isKeyMoment) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
  }, [props.isKeyMoment]);

  const cameraModeLabel = { broadcast: '📺 Broadcast', tactical: '🗺️ Tactical', touchline: '👔 Touchline' }[cameraMode];

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden border border-gray-700 ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      style={{ height: isFullscreen ? '100vh' : '480px' }}
    >
      {/* Goal flash overlay */}
      {flash && (
        <div className="absolute inset-0 z-20 pointer-events-none animate-ping"
          style={{ background: 'rgba(255,200,0,0.25)', borderRadius: 'inherit' }} />
      )}

      <Canvas
        camera={{ position: [52.5, 38, 110], fov: 48 }}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene {...props} cameraMode={cameraMode} />
        </Suspense>
      </Canvas>

      {/* Scoreboard overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/80 backdrop-blur border border-gray-700 rounded-xl px-5 py-2 shadow-xl">
        <span className="text-sm font-bold text-white">{props.homeTeamName}</span>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: props.homeColor }}
          />
          <span className="text-2xl font-black text-amber-400 tabular-nums min-w-[60px] text-center">
            {props.homeGoals} - {props.awayGoals}
          </span>
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: props.awayColor }}
          />
        </div>
        <span className="text-sm font-bold text-white">{props.awayTeamName}</span>
        <span className="text-xs text-gray-400 ml-2">{props.currentMinute}'</span>
      </div>

      {/* Camera mode button */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-2">
        <button
          onClick={cycleCameraMode}
          className="bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-600 transition-all"
        >
          {cameraModeLabel}
        </button>
        <button
          onClick={() => setIsFullscreen(f => !f)}
          className="bg-black/70 hover:bg-black/90 text-white text-xs px-2 py-1.5 rounded-lg border border-gray-600"
        >
          {isFullscreen ? '⊡' : '⛶'}
        </button>
      </div>

      {/* Loading fallback */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Canvas handles its own rendering */}
      </div>
    </div>
  );
}
