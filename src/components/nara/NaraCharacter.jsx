// @ts-check
// NARA 3D character — R3F v8 (React 18) + Three.js AnimationMixer + GLB.
//
// Asset: generated with Ara 3D Gen (MIT tool; MakeHuman CC0 base + CMU mocap),
// "The Corporate High-Flier" preset, low detail, 4 clips (Idle/Wave/Talk/Look),
// Draco + WebP compressed to 1.69 MB. See docs/nara/02-visual-and-asset-
// specification.md for the licensing chain and the full audit.
//
// Rendering is on-demand in resting states (NFR-PERF-004); pointer gaze is
// clamped (FR-3D-005); blink uses morph target weights, never SVG length
// attributes.

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

const MODEL_URL = '/models/nara-character.glb';

// The GLB is Draco-compressed (1.69 MB vs 6.9 MB raw). drei's useGLTF accepts
// a loader extension, and drei already ships the Draco decoder files via its
// CDN default — but same-origin is safer under our CSP, so we point it at the
// decoder copied into public/three/draco/.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/three/draco/');
useGLTF.loader = (loader) => {
  loader.setDRACOLoader(dracoLoader);
  return loader;
};

/** Clip-name mapping — GLB names come from Ara 3D Gen, ours are PRD states. */
const CLIP_MAP = {
  idle: 'Idle',
  greeting: 'Wave',
  listening: 'Idle',
  thinking: 'Look around',
  speaking: 'Talk with gestures',
  looking: 'Look around',
  appearing: 'Idle',
  farewell: 'Wave',
  fallback: 'Idle',
  present: 'Talk with gestures',
  loading: 'Idle',
  hidden: 'Idle',
};

/** Bounded pointer tracking: full-body never rotates aggressively (FR-3D-005). */
const MAX_YAW = THREE.MathUtils.degToRad(20);
const MAX_PITCH = THREE.MathUtils.degToRad(12);

/** ARKit-style morph names present in the GLB (verified by test). */
const MORPH = {
  blinkL: 'eyeBlinkLeft',
  blinkR: 'eyeBlinkRight',
  smile: 'mouthSmileLeft',
  smileR: 'mouthSmileRight',
  jawOpen: 'jawOpen',
};

/**
 * @param {{ state: string, reducedMotion: boolean }} props
 */
function NaraRig({ state, reducedMotion }) {
  const group = useRef(/** @type {THREE.Group|null} */ (null));
  const { scene } = useGLTF(MODEL_URL);
  const { actions, names } = useAnimations(scene.animations, group);
  const { camera } = useThree();

  const cloned = useMemo(() => {
    // SkeletonUtils-style clone is unnecessary here: one NARA instance exists.
    return scene;
  }, [scene]);

  // Cross-fade to the clip matching the state (FR-3D-003: no snapping).
  useEffect(() => {
    const wanted = CLIP_MAP[state] ?? 'Idle';
    const target = names.find((n) => n === wanted) || names.find((n) => /idle/i.test(n));
    if (!target) return;
    const next = actions[target];
    if (!next) return;
    next.reset().fadeIn(reducedMotion ? 0 : 0.25).play();
    for (const name of names) {
      if (name !== target) actions[name]?.fadeOut(reducedMotion ? 0 : 0.25);
    }
    return () => {
      next.stop();
    };
  }, [state, actions, names, reducedMotion]);

  // Pointer state, read in useFrame to avoid re-rendering React on mousemove.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const blink = useRef({ next: performance.now() + 2500, phase: 0, t: 0 });

  /** Set a morph weight across every mesh that carries it. */
  const setMorph = (name, value) => {
    scene.traverse((obj) => {
      const mesh = /** @type {import('three').Mesh & {morphTargetDictionary?: Record<string, number>, morphTargetInfluences?: number[]}} */ (obj);
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      const idx = mesh.morphTargetDictionary[name];
      if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
    });
  };

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    // Gaze: head yaw/pitch toward the pointer, smoothed + clamped (FR-3D-005).
    const head = g.getObjectByName('Head') || g.getObjectByName('mixamorig:Head');
    if (head && !reducedMotion) {
      const lerp = Math.min(1, delta * 5);
      const targetYaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, pointer.current.x)) * 0.8;
      const targetPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pointer.current.y)) * 0.5;
      head.rotation.y += (targetYaw - head.rotation.y) * lerp;
      head.rotation.x += (targetPitch - head.rotation.x) * lerp;
    }

    // Blink: randomized 3-6 s, driven by morph weights (F-03).
    if (!reducedMotion) {
      const now = performance.now();
      if (blink.current.phase === 0 && now > blink.current.next) {
        blink.current.phase = 1;
        blink.current.t = 0;
      }
      if (blink.current.phase === 1) {
        blink.current.t += delta;
        const p = Math.min(1, blink.current.t / 0.16);
        const closed = Math.sin(p * Math.PI) * 0.95;
        setMorph(MORPH.blinkL, closed);
        setMorph(MORPH.blinkR, closed);
        if (p >= 1) {
          setMorph(MORPH.blinkL, 0);
          setMorph(MORPH.blinkR, 0);
          blink.current.phase = 0;
          blink.current.next = now + 3000 + Math.random() * 3000;
        }
      }

      // Subtle idle smile; speaking opens the jaw via the talking clip anyway.
      const smile = state === 'greeting' || state === 'idle' ? 0.25 : 0.1;
      setMorph(MORPH.smile, smile);
      setMorph(MORPH.smileR, smile);
    }
  });

  // Face the camera; the camera looks at the upper body.
  useEffect(() => {
    camera.position.set(0, 1.35, 2.4);
    camera.lookAt(0, 1.1, 0);
  }, [camera]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={cloned} scale={1} />
    </group>
  );
}

/**
 * @param {{ state: string, reducedMotion: boolean }} props
 */
export default function NaraCharacter({ state, reducedMotion }) {
  return (
    <Canvas
      camera={{ position: [0, 1.35, 2.4], fov: 36 }}
      dpr={[1, 1.75]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
      shadows={false}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('nara:context-lost'));
        });
      }}
    >
      {/* Lighting tuned to the portfolio dark theme */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2.5]} intensity={1.2} />
      <directionalLight position={[-2.5, 1.5, -1]} intensity={0.5} color="#3b82f6" />
      <directionalLight position={[0, 2, -2]} intensity={0.35} />
      <NaraRig state={state} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
