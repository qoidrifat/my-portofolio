// @ts-check
// Static NARA fallback — shown when WebGL is unavailable, the GLB fails to
// load, or the 3D scene throws (FR-3D-008). Keeps chat fully usable and looks
// intentional rather than broken. Pure CSS, zero 3D runtime.

import { motion, useReducedMotion } from 'framer-motion';

/** @typedef {{ state: string, loading?: boolean }} NaraFallbackProps */

/** Minimal inline mark — deliberate silhouette, not a detailed illustration. */
function NaraMark({ speaking }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" role="presentation">
      <defs>
        <linearGradient id="nara-fb-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent-web))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--accent-ai))" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Head + shoulders silhouette */}
      <circle cx="60" cy="46" r="22" fill="url(#nara-fb-glow)" />
      <path d="M 24 104 C 24 78 40 66 60 66 C 80 66 96 78 96 104 Z" fill="url(#nara-fb-glow)" />
      {/* Eyes — blink via scaleY only; geometry is static (see mascot y1/y2 lesson) */}
      <ellipse cx="52" cy="44" rx="2.5" ry={speaking ? 1.6 : 3.2} fill="#09090b" />
      <ellipse cx="68" cy="44" rx="2.5" ry={speaking ? 1.6 : 3.2} fill="#09090b" />
    </svg>
  );
}

export default function NaraFallback({ state, loading = false }) {
  const reduced = useReducedMotion();
  const speaking = state === 'speaking' || state === 'thinking';

  return (
    <div
      className={
        'relative flex h-full w-full items-center justify-center rounded-full ' +
        'bg-white/[0.03] border border-white/10 backdrop-blur-sm ' +
        (loading ? 'opacity-60' : 'opacity-100')
      }
    >
      {reduced ? (
        <NaraMark speaking={speaking} />
      ) : (
        <motion.div
          className="h-full w-full"
          animate={speaking ? { scale: [1, 1.04, 1] } : { y: [0, -3, 0] }}
          transition={
            speaking
              ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <NaraMark speaking={speaking} />
        </motion.div>
      )}
      {loading && (
        <span className="absolute bottom-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          loading
        </span>
      )}
    </div>
  );
}
