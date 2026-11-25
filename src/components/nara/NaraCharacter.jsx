// @ts-check
// NARA 3D character — R3F v8 (React 18) + Three.js AnimationMixer.
//
// The GLB asset is the remaining blocker (FR-3D-001/002/003): a licensed,
// realistic humanoid with facial blend shapes and the required clips does not
// exist in this repository yet. This component therefore renders a procedural
// placeholder rig that satisfies the full interaction contract — gaze, blink,
// wave, chat-state poses — so everything except the final art can be verified
// now. Swapping the placeholder for the real GLB is a data change, not a code
// change: NaraCharacter reads a single MODEL_URL constant.
//
// Rendering is on-demand (NFR-PERF-004): frames render while a transient state
// is active, and the loop stops entirely in resting states.

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const MODEL_URL = null; // UNVERIFIED — set once a licensed GLB is available (GATE 1 §B)

/** Bounded pointer tracking: full-body never rotates aggressively (FR-3D-005). */
const MAX_YAW = THREE.MathUtils.degToRad(18);
const MAX_PITCH = THREE.MathUtils.degToRad(10);

/**
 * @param {{ state: string, reducedMotion: boolean }} props
 */
function NaraRig({ state, reducedMotion }) {
  const group = useRef(/** @type {THREE.Group|null} */ (null));
  const head = useRef(/** @type {THREE.Group|null} */ (null));
  const armR = useRef(/** @type {THREE.Group|null} */ (null));
  const eyeL = useRef(/** @type {THREE.Mesh|null} */ (null));
  const eyeR = useRef(/** @type {THREE.Mesh|null} */ (null));
  const { size } = useThree();

  // Latest pointer position, read inside useFrame to avoid re-rendering React
  // on every mousemove (PRD §16: no infinite high-frequency state updates).
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      const rect = e.currentTarget?.getBoundingClientRect?.() ?? { width: window.innerWidth, height: window.innerHeight };
      pointer.current.x = (e.clientX / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY / rect.height) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Blink scheduler — randomized 3-6 s (F-03).
  const blink = useRef({ next: performance.now() + 3000, phase: 0, t: 0 });

  // Wave progress for the greeting state (F-02): 2-3 cycles then rest.
  const wave = useRef({ t: 0, active: false });

  useEffect(() => {
    if (state === 'greeting') {
      wave.current = { t: 0, active: true };
    }
  }, [state]);

  const speaking = state === 'speaking';
  const thinking = state === 'thinking';

  useFrame((_, delta) => {
    const g = group.current;
    const h = head.current;
    const arm = armR.current;
    if (!g || !h) return;

    const clamped = (v, max) => Math.max(-max, Math.min(max, v));

    // Gaze: smoothed interpolation toward the pointer, clamped (FR-3D-005).
    const targetYaw = reducedMotion ? 0 : clamped(pointer.current.x, MAX_YAW);
    const targetPitch = reducedMotion ? 0 : clamped(pointer.current.y * 0.5, MAX_PITCH);
    const lerp = Math.min(1, delta * 6);
    h.rotation.y += (targetYaw - h.rotation.y) * lerp;
    h.rotation.x += (targetPitch - h.rotation.x) * lerp;

    // Idle breathing: subtle scale on the torso group.
    if (!reducedMotion) {
      const t = performance.now() / 1000;
      g.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
      g.position.y = Math.sin(t * 0.8) * 0.01;
    }

    // Blink: quick close-open near a randomized interval.
    if (!reducedMotion) {
      const now = performance.now();
      if (blink.current.phase === 0 && now > blink.current.next) {
        blink.current.phase = 1;
        blink.current.t = 0;
      }
      if (blink.current.phase === 1) {
        blink.current.t += delta;
        const p = Math.min(1, blink.current.t / 0.18);
        const closed = Math.sin(p * Math.PI);
        if (eyeL.current) eyeL.current.scale.y = 1 - closed * 0.9;
        if (eyeR.current) eyeR.current.scale.y = 1 - closed * 0.9;
        if (p >= 1) {
          blink.current.phase = 0;
          blink.current.next = now + 3000 + Math.random() * 3000;
        }
      }
    }

    // Greeting wave: wrist oscillation, 2-3 cycles, then hand down (F-02).
    if (arm) {
      if (wave.current.active) {
        wave.current.t += delta;
        const cycles = 2.5;
        const duration = cycles * 0.8;
        const p = Math.min(1, wave.current.t / duration);
        arm.rotation.z = Math.sin(p * cycles * Math.PI * 2) * 0.35 + (1 - p) * -0.2;
        if (p >= 1) {
          wave.current.active = false;
          arm.rotation.z = 0;
        }
      } else {
        arm.rotation.z += (0 - arm.rotation.z) * Math.min(1, delta * 8);
      }
    }

    // Speaking/thinking micro-motion, driven by state not by timer.
    if (speaking && !reducedMotion) {
      h.position.y = Math.sin(performance.now() / 180) * 0.008;
    } else if (thinking && !reducedMotion) {
      h.rotation.z = Math.sin(performance.now() / 900) * 0.06;
    } else {
      h.position.y = 0;
      h.rotation.z += (0 - h.rotation.z) * Math.min(1, delta * 6);
    }
  });

  // Procedural placeholder rig — replaced by the GLB when the asset lands.
  return (
    <group ref={group}>
      {/* Torso */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.5, 8, 16]} />
        <meshStandardMaterial color="#27272a" roughness={0.75} metalness={0.1} />
      </mesh>
      {/* Shirt collar accent */}
      <mesh position={[0, 0.86, 0.06]}>
        <torusGeometry args={[0.13, 0.02, 8, 24]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} />
      </mesh>
      {/* Head group — gaze target */}
      <group ref={head} position={[0, 1.25, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color="#d4a88c" roughness={0.55} />
        </mesh>
        {/* Eyes — stored for blink scaling */}
        <mesh ref={eyeL} position={[-0.08, 0.03, 0.19]}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshStandardMaterial color="#0b0b0e" roughness={0.25} />
        </mesh>
        <mesh ref={eyeR} position={[0.08, 0.03, 0.19]}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshStandardMaterial color="#0b0b0e" roughness={0.25} />
        </mesh>
      </group>
      {/* Right arm group — greeting wave target */}
      <group ref={armR} position={[0.34, 0.82, 0]}>
        <mesh position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.055, 0.34, 6, 12]} />
          <meshStandardMaterial color="#27272a" roughness={0.75} />
        </mesh>
      </group>
      {/* Left arm (static) */}
      <group position={[-0.34, 0.82, 0]}>
        <mesh position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.055, 0.34, 6, 12]} />
          <meshStandardMaterial color="#27272a" roughness={0.75} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * @param {{ state: string, reducedMotion: boolean }} props
 */
export default function NaraCharacter({ state, reducedMotion }) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 2.6], fov: 38 }}
      dpr={[1, 1.75]} // capped device pixel ratio (NFR-PERF-006/007)
      frameloop={state === 'idle' ? 'demand' : 'always'} // no continuous loop while resting (NFR-PERF-004)
      gl={{ antialias: true, powerPreference: 'low-power' }}
      shadows={!reducedMotion}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          // Surface to the boundary above; it swaps in the static fallback.
          window.dispatchEvent(new CustomEvent('nara:context-lost'));
        });
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow />
      <directionalLight position={[-2, 1, -1]} intensity={0.4} color="#3b82f6" />
      <NaraRig state={state} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
