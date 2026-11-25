// @ts-check
// NARA scene — lazy 3D canvas with graceful degradation (FR-3D-008,
// NFR-PERF-001..008). Rendered only after intro completion; WebGL absence or
// context loss parks the widget in a static fallback, never crashes the page.

import { Suspense, lazy, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** @returns {boolean} does this browser provide a usable WebGL context? */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

// The 3D runtime (~797 KB) is fetched only when NARA is actually revealed —
// never during the intro, never in the initial critical path (NFR-PERF-002/003).
const NaraCharacter = lazy(() => import('./NaraCharacter.jsx'));

import NaraFallback from './NaraFallback.jsx';

/** @typedef {{ state: string }} NaraSceneProps */
export default function NaraScene({ state }) {
  const [webglOk, setWebglOk] = useState(true);
  const [glFailed, setGlFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setWebglOk(hasWebGL());
  }, []);

  const show3D = webglOk && !glFailed;

  return (
    <div className="nara-scene relative h-40 w-40 sm:h-48 sm:w-48" aria-hidden="true">
      {show3D ? (
        <Suspense fallback={<NaraFallback state={state} loading />}>
          <CharacterWithErrorBoundary state={state} reducedMotion={Boolean(reducedMotion)} onFail={() => setGlFailed(true)} />
        </Suspense>
      ) : (
        <NaraFallback state={state} />
      )}
    </div>
  );
}

/**
 * Context loss or shader failure must degrade to the static fallback, never
 * take the page down (FR-3D-008).
 *
 * @param {{ state: string, reducedMotion: boolean, onFail: () => void }} props
 */
function CharacterWithErrorBoundary({ state, reducedMotion, onFail }) {
  return (
    <SceneErrorBoundary onFail={onFail}>
      <NaraCharacter state={state} reducedMotion={reducedMotion} />
    </SceneErrorBoundary>
  );
}

import { Component } from 'react';

class SceneErrorBoundary extends Component {
  // @ts-ignore
  constructor(props) {
    super(props);
    // @ts-ignore
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Non-sensitive diagnostic only (SR-008): category, never message details.
    console.warn('[NARA] 3D scene unavailable — using static fallback');
    this.props.onFail?.();
  }

  render() {
    if (this.state.failed) return this.props.onFail ? null : null;
    return this.props.children;
  }
}
