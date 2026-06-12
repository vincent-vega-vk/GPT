import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Match3DEvent } from '../../types';
import { getFormationPositions } from './useMatchAnimation';

const LERP_SPEED = 0.04;
const IDLE_RANGE = 1.2;

interface PlayerMeshProps {
  position: [number, number];
  color: string;
  isActive: boolean;
  index: number;
  label: string;
}

function PlayerMesh({ position, color, isActive, index, label: _label }: PlayerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(position[0], 0.5, position[1]));
  const idleRef = useRef({ dx: (Math.random() - 0.5) * IDLE_RANGE, dz: (Math.random() - 0.5) * IDLE_RANGE, timer: Math.random() * 3 });

  useEffect(() => {
    targetRef.current.set(position[0], 0.5, position[1]);
  }, [position]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    // Idle timer
    idleRef.current.timer -= delta;
    if (idleRef.current.timer < 0) {
      idleRef.current.dx = (Math.random() - 0.5) * IDLE_RANGE;
      idleRef.current.dz = (Math.random() - 0.5) * IDLE_RANGE;
      idleRef.current.timer = 2 + Math.random() * 3;
    }

    const tx = targetRef.current.x + (isActive ? 0 : idleRef.current.dx);
    const tz = targetRef.current.z + (isActive ? 0 : idleRef.current.dz);

    mesh.position.x += (tx - mesh.position.x) * LERP_SPEED * 60 * delta;
    mesh.position.z += (tz - mesh.position.z) * LERP_SPEED * 60 * delta;

    // Pulse for active player
    if (isActive && ringRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.006) * 0.3;
      ringRef.current.scale.setScalar(scale);
    }

    // Jersey number offset (to keep stable)
    const idx = index;
    void idx;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[position[0], 0.5, position[1]]}>
        {/* Body */}
        <capsuleGeometry args={[0.55, 0.9, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Activity ring */}
      {isActive && (
        <mesh ref={ringRef} position={[position[0], 0.05, position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 16]} />
          <meshBasicMaterial color="yellow" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

interface Players3DProps {
  homeFormation: string;
  awayFormation: string;
  homeColor: string;
  awayColor: string;
  currentEvent: Match3DEvent | null;
  currentMinute: number;
}

export default function Players3D({
  homeFormation,
  awayFormation,
  homeColor,
  awayColor,
  currentEvent,
}: Players3DProps) {
  const [homePosns, setHomePosns] = useState(() => getFormationPositions(homeFormation, true));
  const [awayPosns, setAwayPosns] = useState(() => getFormationPositions(awayFormation, false));
  const [activePlayer, setActivePlayer] = useState<{ team: 'home' | 'away'; index: number } | null>(null);

  // Update formation positions when formations change
  useEffect(() => {
    setHomePosns(getFormationPositions(homeFormation, true));
  }, [homeFormation]);

  useEffect(() => {
    setAwayPosns(getFormationPositions(awayFormation, false));
  }, [awayFormation]);

  // React to events
  useEffect(() => {
    if (!currentEvent) return;

    const isHome = currentEvent.team === 'home';
    const team = isHome ? 'home' : 'away';
    const [bx, bz] = currentEvent.ballTo;

    // Move primary player toward ball
    if (isHome) {
      const newPosns = [...homePosns];
      // Find closest player to ball target
      const closest = newPosns.reduce((best, pos, i) => {
        if (i === 0) return best; // skip GK unless it's a save
        const dist = Math.hypot(pos[0] - bx, pos[1] - bz);
        return dist < best.dist ? { i, dist } : best;
      }, { i: 1, dist: Infinity });

      const activeIdx = closest.i;
      setActivePlayer({ team, index: activeIdx });

      // Adjust position based on event
      if (['goal', 'shot', 'chance'].includes(currentEvent.type)) {
        const updated = newPosns.map((p, i) => {
          if (i >= 8 && i <= 10) return [p[0] + 5, p[1]] as [number, number]; // attackers surge
          return p;
        });
        setHomePosns(updated);
        setTimeout(() => setHomePosns(getFormationPositions(homeFormation, true)), 3000);
      }
    } else {
      const newPosns = [...awayPosns];
      const closest = newPosns.reduce((best, pos, i) => {
        if (i === 0) return best;
        const dist = Math.hypot(pos[0] - bx, pos[1] - bz);
        return dist < best.dist ? { i, dist } : best;
      }, { i: 1, dist: Infinity });

      setActivePlayer({ team, index: closest.i });

      if (['goal', 'shot', 'chance'].includes(currentEvent.type)) {
        const updated = newPosns.map((p, i) => {
          if (i >= 8 && i <= 10) return [p[0] - 5, p[1]] as [number, number];
          return p;
        });
        setAwayPosns(updated);
        setTimeout(() => setAwayPosns(getFormationPositions(awayFormation, false)), 3000);
      }
    }

    // Clear active highlight after 2s
    const t = setTimeout(() => setActivePlayer(null), 2000);
    return () => clearTimeout(t);
  }, [currentEvent]);

  return (
    <group>
      {/* Home players */}
      {homePosns.map((pos, i) => (
        <PlayerMesh
          key={`home-${i}`}
          position={pos}
          color={homeColor}
          isActive={activePlayer?.team === 'home' && activePlayer.index === i}
          index={i}
          label={`${i + 1}`}
        />
      ))}
      {/* Away players */}
      {awayPosns.map((pos, i) => (
        <PlayerMesh
          key={`away-${i}`}
          position={pos}
          color={awayColor}
          isActive={activePlayer?.team === 'away' && activePlayer.index === i}
          index={i}
          label={`${i + 1}`}
        />
      ))}
    </group>
  );
}
