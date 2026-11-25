// @ts-check
// WordReveal — the "answer is arriving" transition.
//
// After the thinking indicator settles, NARA's reply must not snap into place.
// Copy is split into short chunks (3-4 words) and each one fades in from a
// small blur + 4 px lift, staggered. Visually this reads like text being
// written, the pattern used by AI chat demos (e.g. Jitter's "The Prompt: AI
// Chat"), without a typewriter's per-character cost.
//
// Budget note: implemented with framer-motion (already in the bundle) rather
// than lottie-web (~250 KB), because bunde-count sits at its 18 ceiling.
// Transform and opacity only — no layout thrash, works at 4x CPU throttle.

import { motion, useReducedMotion } from 'framer-motion';

/** Chunk size in words. Short enough to feel typed, long enough to stay cheap. */
const CHUNK_WORDS = 3;
/** Delay between chunks. 24 ms × ~40 chunks ≈ 1 s for a typical answer. */
const STAGGER_S = 0.024;
/** Above this many chunks the stagger is shortened so long answers stay snappy. */
const MAX_TOTAL_S = 1.4;
/** Beat between the thinking bubble disappearing and the first words arriving,
 *  so the eye registers the hand-off instead of seeing text pop instantly. */
const SETTLE_S = 0.06;

/**
 * Split text into chunks of 3-4 words, preserving every newline so paragraphs
 * and numbered lists keep their shape.
 * @param {string} text
 * @returns {string[]}
 */
function chunk(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (line === '') {
      out.push('\n');
      continue;
    }
    const words = line.split(' ');
    for (let i = 0; i < words.length; i += CHUNK_WORDS) {
      out.push(words.slice(i, i + CHUNK_WORDS).join(' '));
    }
    out.push('\n');
  }
  return out;
}

/**
 * @param {{ text: string, animate?: boolean, className?: string }} props
 */
export default function WordReveal({ text, animate = true, className = '' }) {
  const reduced = useReducedMotion();
  const chunks = animate && !reduced ? chunk(text) : null;

  if (!chunks) return <span className={className}>{text}</span>;

  // Keep long answers inside MAX_TOTAL_S instead of drifting for seconds.
  const stagger = Math.min(STAGGER_S, MAX_TOTAL_S / Math.max(chunks.length, 1));

  return (
    <span className={className}>
      {chunks.map((part, i) =>
        part === '\n' ? (
          <br key={i} />
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.22, delay: SETTLE_S + i * stagger, ease: 'easeOut' }}
            style={{ display: 'inline' }}
          >
            {part}
            {i < chunks.length - 1 && chunks[i + 1] !== '\n' ? ' ' : null}
          </motion.span>
        )
      )}
    </span>
  );
}
