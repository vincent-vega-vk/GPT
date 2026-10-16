import { useMemo } from 'react';
import * as THREE from 'three';

// Pitch: 105m x 68m. Origin at (0,0,0) = bottom-left corner.
// x axis = along pitch length, z axis = across width, y = up.
const W = 105;
const D = 68;
const GL = 7.32;   // goal width
const GH = 2.44;   // goal height
const GD = 0.5;    // goal depth
const PA_W = 40.32; // penalty area width
const PA_D = 16.5;  // penalty area depth
const GA_W = 18.32; // goal area width
const GA_D = 5.5;
const SPOT = 11;    // penalty spot distance

function Line({ points, color = 'white', lineWidth = 1.2 }: {
  points: [number, number, number][];
  color?: string;
  lineWidth?: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    points.forEach(([x, y, z]) => { verts.push(x, y, z); });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [points]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={lineWidth} />
    </lineSegments>
  );
}

function LineLoop({ points, color = 'white' }: { points: [number, number, number][]; color?: string }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const closed = [...points, points[0]];
    closed.forEach(([x, y, z]) => { verts.push(x, y, z); });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [points]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

function Circle({ cx, cz, r, y = 0.02, segments = 64, color = 'white' }: {
  cx: number; cz: number; r: number; y?: number; segments?: number; color?: string;
}) {
  const geometry = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
    }
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    pts.forEach(([x, yy, z]) => { verts.push(x, yy, z); });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [cx, cz, r, y, segments]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

function Goal({ x, side }: { x: number; side: -1 | 1 }) {
  const half = GL / 2;
  const postMat = <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.3} />;
  const r = 0.06;
  return (
    <group>
      {/* Left post */}
      <mesh position={[x, GH / 2, D / 2 - half]}>
        <cylinderGeometry args={[r, r, GH, 8]} />
        {postMat}
      </mesh>
      {/* Right post */}
      <mesh position={[x, GH / 2, D / 2 + half]}>
        <cylinderGeometry args={[r, r, GH, 8]} />
        {postMat}
      </mesh>
      {/* Crossbar */}
      <mesh position={[x, GH, D / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, GL + r * 2, 8]} />
        {postMat}
      </mesh>
      {/* Back posts */}
      <mesh position={[x + side * GD, GH / 2, D / 2 - half]}>
        <cylinderGeometry args={[r, r, GH, 8]} />
        {postMat}
      </mesh>
      <mesh position={[x + side * GD, GH / 2, D / 2 + half]}>
        <cylinderGeometry args={[r, r, GH, 8]} />
        {postMat}
      </mesh>
      {/* Top back bar */}
      <mesh position={[x + side * GD, GH, D / 2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, GL + r * 2, 8]} />
        {postMat}
      </mesh>
      {/* Side bars */}
      <mesh position={[x + side * GD / 2, GH, D / 2 - half]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[r, r, GD, 8]} />
        {postMat}
      </mesh>
      <mesh position={[x + side * GD / 2, GH, D / 2 + half]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[r, r, GD, 8]} />
        {postMat}
      </mesh>
    </group>
  );
}

export default function Pitch3D() {
  const y = 0.02; // slightly above ground to avoid z-fighting

  return (
    <group>
      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, D / 2]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#2d6a2d" />
      </mesh>

      {/* Darker grass stripes */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[i * 15 + 7.5, 0.001, D / 2]}>
          <planeGeometry args={[15, D]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2d6a2d' : '#338a33'} />
        </mesh>
      ))}

      {/* Outer boundary */}
      <LineLoop
        points={[[0, y, 0], [W, y, 0], [W, y, D], [0, y, D]]}
      />

      {/* Halfway line */}
      <Line points={[[W / 2, y, 0], [W / 2, y, D]]} />

      {/* Center circle */}
      <Circle cx={W / 2} cz={D / 2} r={9.15} y={y} />

      {/* Center spot */}
      <Circle cx={W / 2} cz={D / 2} r={0.4} y={y} segments={16} />

      {/* Penalty areas */}
      {/* Left PA */}
      <LineLoop points={[
        [0, y, (D - PA_W) / 2],
        [PA_D, y, (D - PA_W) / 2],
        [PA_D, y, (D + PA_W) / 2],
        [0, y, (D + PA_W) / 2],
      ]} />
      {/* Right PA */}
      <LineLoop points={[
        [W, y, (D - PA_W) / 2],
        [W - PA_D, y, (D - PA_W) / 2],
        [W - PA_D, y, (D + PA_W) / 2],
        [W, y, (D + PA_W) / 2],
      ]} />

      {/* Goal areas */}
      <LineLoop points={[
        [0, y, (D - GA_W) / 2],
        [GA_D, y, (D - GA_W) / 2],
        [GA_D, y, (D + GA_W) / 2],
        [0, y, (D + GA_W) / 2],
      ]} />
      <LineLoop points={[
        [W, y, (D - GA_W) / 2],
        [W - GA_D, y, (D - GA_W) / 2],
        [W - GA_D, y, (D + GA_W) / 2],
        [W, y, (D + GA_W) / 2],
      ]} />

      {/* Penalty spots */}
      <Circle cx={SPOT} cz={D / 2} r={0.4} y={y} segments={16} />
      <Circle cx={W - SPOT} cz={D / 2} r={0.4} y={y} segments={16} />

      {/* Penalty arcs (partial circles outside PA) */}
      {useMemo(() => {
        const arcLeft: [number, number, number][] = [];
        const arcRight: [number, number, number][] = [];
        for (let i = 0; i <= 40; i++) {
          const a = (-0.6 + (i / 40) * 1.2) + Math.PI;
          const x = SPOT + Math.cos(a) * 9.15;
          const z = D / 2 + Math.sin(a) * 9.15;
          if (x > PA_D) arcLeft.push([x, y, z]);
        }
        for (let i = 0; i <= 40; i++) {
          const a = (-0.6 + (i / 40) * 1.2);
          const x = (W - SPOT) + Math.cos(a) * 9.15;
          const z = D / 2 + Math.sin(a) * 9.15;
          if (x < W - PA_D) arcRight.push([x, y, z]);
        }
        return (
          <>
            {arcLeft.length > 1 && <Line points={arcLeft} />}
            {arcRight.length > 1 && <Line points={arcRight} />}
          </>
        );
      }, [])}

      {/* Corner arcs */}
      {[
        { cx: 0, cz: 0, start: 0, end: Math.PI / 2 },
        { cx: 0, cz: D, start: -Math.PI / 2, end: 0 },
        { cx: W, cz: 0, start: Math.PI / 2, end: Math.PI },
        { cx: W, cz: D, start: Math.PI, end: 3 * Math.PI / 2 },
      ].map(({ cx, cz, start, end }, i) => {
        const pts: [number, number, number][] = [];
        for (let s = 0; s <= 20; s++) {
          const a = start + (s / 20) * (end - start);
          pts.push([cx + Math.cos(a), y, cz + Math.sin(a)]);
        }
        return <Line key={i} points={pts} />;
      })}

      {/* Goals */}
      <Goal x={0} side={1} />
      <Goal x={W} side={-1} />
    </group>
  );
}
