/**
 * RocketShip — Animated rockets flying between orbiting planets
 *
 * RocketFleet renders ROCKET_COUNT individual rockets that travel
 * along curved Bezier arcs between random pairs of planets.
 * Each rocket has a simple cone+cylinder mesh with an emissive
 * engine glow (blooms via post-processing) and a fading Trail.
 *
 * Theme-aware via useSceneTheme():
 *   Dark mode  — white/gray rocket with orange engine glow + orange trail
 *   Light mode — dark gray/black rocket with dark outline + gray trail
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { Island } from "@/types/database";
import { useSceneTheme } from "./SceneThemeContext";
import { computeOrbitPosition } from "./hooks/useOrbitalMotion";
import { ROCKET_COUNT, ROCKET_SCALE, ROCKET_SPEED, ROCKET_ARC_HEIGHT } from "./constants";

// ---- Per-rocket mutable state (no re-renders) ----
interface RocketState {
  sourceIndex: number;
  destIndex: number;
  progress: number; // 0..1 along the arc
}

// ---- Quadratic Bezier helpers ----
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _vCtrl = new THREE.Vector3();
const _vMid = new THREE.Vector3();

function bezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  ctrl: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const inv = 1 - t;
  out.set(0, 0, 0);
  out.addScaledVector(p0, inv * inv);
  out.addScaledVector(ctrl, 2 * inv * t);
  out.addScaledVector(p1, t * t);
  return out;
}

function pickRandomDest(current: number, count: number): number {
  if (count <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * count);
  }
  return next;
}

// ---- Individual rocket mesh (simple primitives) ----
// Theme-aware: B&W in light mode, color in dark mode
function RocketMesh({ isDark }: { isDark: boolean }) {
  const s = ROCKET_SCALE;

  // Dark mode: light grays with orange engine glow
  // Light mode: dark grays/black with no emissive
  const noseColor = isDark ? "#DDDDDD" : "#333333";
  const bodyColor = isDark ? "#BBBBBB" : "#444444";
  const finColor = isDark ? "#999999" : "#222222";
  const engineColor = isDark ? "#FF6600" : "#555555";
  const engineEmissive = isDark ? "#FF4400" : "#000000";
  const engineEmissiveIntensity = isDark ? 2.0 : 0.0;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Nose cone */}
      <mesh position={[0, s * 1.2, 0]}>
        <coneGeometry args={[s * 0.35, s * 0.8, 6]} />
        <meshStandardMaterial color={noseColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Body cylinder */}
      <mesh position={[0, s * 0.4, 0]}>
        <cylinderGeometry args={[s * 0.35, s * 0.35, s * 1.2, 8]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Engine glow (emissive for bloom in dark mode) */}
      <mesh position={[0, -s * 0.3, 0]}>
        <sphereGeometry args={[s * 0.25, 8, 8]} />
        <meshStandardMaterial
          color={engineColor}
          emissive={engineEmissive}
          emissiveIntensity={engineEmissiveIntensity}
        />
      </mesh>
      {/* 4 fins */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, -s * 0.1, 0]}
          rotation={[0, (i * Math.PI) / 2, 0]}
        >
          <boxGeometry args={[s * 0.08, s * 0.5, s * 0.5]} />
          <meshStandardMaterial color={finColor} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* Outline hull (light mode only) — BackSide slightly larger black mesh */}
      {!isDark && (
        <>
          <mesh position={[0, s * 1.2, 0]} scale={1.15}>
            <coneGeometry args={[s * 0.35, s * 0.8, 6]} />
            <meshBasicMaterial color="#000000" side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, s * 0.4, 0]} scale={1.15}>
            <cylinderGeometry args={[s * 0.35, s * 0.35, s * 1.2, 8]} />
            <meshBasicMaterial color="#000000" side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, -s * 0.3, 0]} scale={1.15}>
            <sphereGeometry args={[s * 0.25, 8, 8]} />
            <meshBasicMaterial color="#000000" side={THREE.BackSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ---- Single Rocket with Trail ----
function Rocket({
  islands,
  angleRef,
  initialProgress,
}: {
  islands: Island[];
  angleRef: React.MutableRefObject<number>;
  initialProgress: number;
}) {
  const meshRef = useRef<THREE.Group>(null!);
  const isDark = useSceneTheme();

  const state = useRef<RocketState>({
    sourceIndex: Math.floor(Math.random() * islands.length),
    destIndex: 0,
    progress: initialProgress,
  });

  // Initialize dest different from source
  useMemo(() => {
    state.current.destIndex = pickRandomDest(
      state.current.sourceIndex,
      islands.length,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Temp vectors (per-instance to avoid allocation in useFrame)
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const nextVec = useMemo(() => new THREE.Vector3(), []);
  const lookVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const st = state.current;
    const n = islands.length;
    if (n < 2 || !meshRef.current) return;

    // Validate indices
    if (st.sourceIndex >= n) st.sourceIndex = 0;
    if (st.destIndex >= n) st.destIndex = pickRandomDest(st.sourceIndex, n);

    // Get live planet positions
    const [sx, sy, sz] = computeOrbitPosition(
      islands[st.sourceIndex].position_theta,
      islands[st.sourceIndex].position_phi,
      angleRef.current,
    );
    const [dx, dy, dz] = computeOrbitPosition(
      islands[st.destIndex].position_theta,
      islands[st.destIndex].position_phi,
      angleRef.current,
    );

    _v0.set(sx, sy, sz);
    _v1.set(dx, dy, dz);

    // Arc control point: midpoint pushed outward from origin
    _vMid.addVectors(_v0, _v1).multiplyScalar(0.5);
    const midLen = _vMid.length();
    if (midLen > 0.001) {
      _vCtrl.copy(_vMid).normalize().multiplyScalar(ROCKET_ARC_HEIGHT);
      _vCtrl.add(_vMid);
    } else {
      _vCtrl.copy(_vMid).setY(_vMid.y + ROCKET_ARC_HEIGHT);
    }

    // Advance progress
    const straightDist = _v0.distanceTo(_v1);
    const arcLength = Math.max(straightDist * 1.2, 0.1);
    st.progress += (ROCKET_SPEED * dt) / arcLength;

    // Arrived — pick new destination
    if (st.progress >= 1.0) {
      st.sourceIndex = st.destIndex;
      st.destIndex = pickRandomDest(st.sourceIndex, n);
      st.progress = 0;
    }

    // Position on Bezier arc
    bezierPoint(_v0, _v1, _vCtrl, st.progress, posVec);

    // Forward direction (tangent)
    const nextT = Math.min(st.progress + 0.02, 1.0);
    bezierPoint(_v0, _v1, _vCtrl, nextT, nextVec);
    lookVec.copy(nextVec);

    // Update mesh
    meshRef.current.position.copy(posVec);
    meshRef.current.lookAt(lookVec);
  });

  // Trail color: orange in dark mode, dark gray in light mode
  const trailColor = isDark ? "#FF6600" : "#333333";

  return (
    <Trail
      width={ROCKET_SCALE * 3}
      length={6}
      color={trailColor}
      attenuation={(t: number) => t * t}
    >
      <group ref={meshRef}>
        <RocketMesh isDark={isDark} />
      </group>
    </Trail>
  );
}

// ---- Fleet: renders N rockets ----
interface RocketFleetProps {
  islands: Island[];
  angleRef: React.MutableRefObject<number>;
}

export function RocketFleet({ islands, angleRef }: RocketFleetProps) {
  if (islands.length < 2) return null;

  return (
    <>
      {Array.from({ length: ROCKET_COUNT }, (_, i) => (
        <Rocket
          key={i}
          islands={islands}
          angleRef={angleRef}
          initialProgress={i / ROCKET_COUNT}
        />
      ))}
    </>
  );
}
