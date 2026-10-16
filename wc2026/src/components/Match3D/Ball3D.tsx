import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Match3DEvent } from '../../types';

const TRAIL_LENGTH = 12;

interface Ball3DProps {
  currentEvent: Match3DEvent | null;
  currentMinute: number;
}

export default function Ball3D({ currentEvent }: Ball3DProps) {
  const ballRef = useRef<THREE.Mesh>(null!);
  const targetRef = useRef(new THREE.Vector3(52.5, 0.3, 34));
  const trailRef = useRef<THREE.Points>(null!);
  const trailPositions = useRef<Float32Array>(new Float32Array(TRAIL_LENGTH * 3));
  const trailIndex = useRef(0);
  const prevBallPos = useRef(new THREE.Vector3(52.5, 0.3, 34));
  const bounceRef = useRef(0);

  // Compute target from event
  useEffect(() => {
    if (!currentEvent) return;
    const [tx, tz] = currentEvent.ballTo;
    const ty = currentEvent.type === 'goal' ? 1.2
      : currentEvent.type === 'shot' ? 1.8
      : currentEvent.type === 'freekick' ? 4
      : currentEvent.type === 'corner' ? 5
      : currentEvent.type === 'clearance' ? 6
      : 0.3;
    targetRef.current.set(tx, ty, tz);
    bounceRef.current = Math.random() * Math.PI;
  }, [currentEvent]);

  useFrame((_, delta) => {
    if (!ballRef.current) return;
    const ball = ballRef.current;
    const target = targetRef.current;

    // Smooth lerp to target
    ball.position.lerp(target, Math.min(1, delta * 3.5));

    // Bounce animation (vertical oscillation while moving)
    bounceRef.current += delta * 8;
    const moving = ball.position.distanceTo(prevBallPos.current) > 0.01;
    if (moving && ball.position.y < 2) {
      ball.position.y += Math.max(0, Math.sin(bounceRef.current) * 0.15);
    }

    // Spin the ball
    ball.rotation.x += delta * 4;
    ball.rotation.z += delta * 2;

    // Update trail
    if (ball.position.distanceTo(prevBallPos.current) > 0.2) {
      const idx = (trailIndex.current % TRAIL_LENGTH) * 3;
      trailPositions.current[idx] = ball.position.x;
      trailPositions.current[idx + 1] = ball.position.y;
      trailPositions.current[idx + 2] = ball.position.z;
      trailIndex.current++;
      if (trailRef.current?.geometry) {
        trailRef.current.geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(trailPositions.current, 3)
        );
        trailRef.current.geometry.attributes.position.needsUpdate = true;
      }
      prevBallPos.current.copy(ball.position);
    }

    // Drop toward ground if above target
    if (ball.position.y > target.y + 0.1) {
      ball.position.y -= delta * 2;
    }
  });

  return (
    <group>
      {/* Ball */}
      <mesh ref={ballRef} position={[52.5, 0.3, 34]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="white" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Ball shadow */}
      <mesh position={[52.5, 0.01, 34]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 12]} />
        <meshBasicMaterial color="black" transparent opacity={0.25} />
      </mesh>

      {/* Trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailPositions.current, 3]}
          />
        </bufferGeometry>
        <pointsMaterial color="#ffff88" size={0.2} transparent opacity={0.4} />
      </points>
    </group>
  );
}
