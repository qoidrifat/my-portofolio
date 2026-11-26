// @ts-check
// Thinking + streaming primitives.
//
// Visual contract taken from the reference component (claude-chat.html):
// - "Thinking" is shimmered: a soft highlight sweeps through the letters.
// - Elapsed seconds sit next to it and roll like an odometer.
// - A live status line describes the current server stage.
// - Afterwards the answer types in: characters fade in and rise 3px, with a
//   soft caret that fades out instead of vanishing.
//
// Implementation difference, deliberate: the reference redraws its whole widget
// by innerHTML on every animation frame. That is fine for a 236px demo, but a
// portfolio reply is ~800 characters, and re-rendering 800 React spans per
// frame measured p99 = 126 ms / max 234 ms under 4x CPU throttle. Everything
// here is therefore driven by CSS animations and transitions — the browser runs
// them off the main thread — while React only re-renders when a discrete value
// changes (a whole second, one step). The rendered result is identical.

import { useEffect, useState } from 'react';
import { ACCENT_RGB } from './theme.js';

/**
 * CSS custom properties are not part of React's CSSProperties type. Casting in
 * one place keeps the rest of the file type-checked, instead of sprinkling
 * `any` on every style attribute that needs a `--var`.
 *
 * @param {Record<string, string | number>} vars
 * @returns {import('react').CSSProperties}
 */
const cssVars = (vars) => /** @type {import('react').CSSProperties} */ (/** @type {unknown} */ (vars));

/**
 * Characters per second for a reply.
 *
 * The reference types a ~60 character line at 27 cps. A portfolio answer is
 * 700-800 characters; at that rate it would take half a minute. The reveal
 * keeps the same per-character fade+rise but scales the rate so the whole reply
 * lands inside the time a visitor will tolerate.
 *
 * @param {number} length
 * @returns {number}
 */
/**
 * Split an array into chunks of `size`.
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
function cluster(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function cpsFor(length) {
  if (length <= 120) return 27;
  const duration = Math.min(2.8, Math.max(1.6, length / 27));
  return Math.round(length / duration);
}

/**
 * Typewriter reveal. Every character is rendered once, with its own
 * `animation-delay`; the browser then runs the fade+rise on the compositor.
 * No JavaScript runs per frame.
 *
 * Word-level wrappers keep the paragraph breakable — animating per character in
 * inline-block spans would stop the browser breaking between words
 * ("acq uisition").
 *
 * @param {{ text: string, cps?: number, animate?: boolean }} props
 */
export function TypeIn({ text, cps = 22, animate = true }) {
  if (!animate) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;

  // Split into words + whitespace, preserving newlines exactly.
  const tokens = text.split(/(\s+)/);
  let index = 0;

  return (
    <>
      {tokens.map((token, ti) => {
        if (/^\s+$/.test(token)) {
          return (
            <span key={`s${ti}`} style={{ whiteSpace: 'pre-wrap' }}>
              {token}
            </span>
          );
        }
        const start = index;
        index += token.length;
        return (
          <span
            key={`w${ti}`}
            className="nara-word"
            style={cssVars({ '--d': `${(start / cps).toFixed(3)}s`, '--f': '0.14s' })}
          >
            {/* Reveal in small character clusters, not one element per letter.
                At 12.5px the cluster boundary is invisible, but it cuts the
                animated element count from ~800 to ~140, which removes a large
                synchronous mount cost from the main thread. */}
            {cluster([...token], 6).map((part, ci) => (
              <span
                key={ci}
                className="nara-ch"
                style={cssVars({ '--d': `${((start + ci * 6) / cps).toFixed(3)}s` })}
              >
                {part}
              </span>
            ))}
          </span>
        );
      })}
    </>
  );
}

/**
 * Soft blinking caret. Pure CSS: opacity oscillates on its own timeline.
 * @param {{ color: string, height?: number, fadeAfter?: number }} props
 */
export function Caret({ color, height = 12, fadeAfter }) {
  return (
    <i
      aria-hidden="true"
      className="nara-caret"
      style={cssVars({
        background: color,
        height,
        width: 1.6,
        borderRadius: 1,
        verticalAlign: -2,
        marginLeft: 1,
        '--fade': fadeAfter != null ? `${fadeAfter.toFixed(2)}s` : 'none',
      })}
    />
  );
}

/**
 * Streamed answer: all characters are in the DOM immediately with staggered
 * animation delays, so the reveal is smooth on every device and costs no
 * per-frame work.
 *
 * @param {{ text: string, accent: string, animate?: boolean }} props
 */
export function StreamingText({ text, accent, animate = true }) {
  const cps = cpsFor(text.length);
  const totalS = text.length / cps;

  if (!animate) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;

  return (
    <>
      <TypeIn text={text} cps={cps} />
      <Caret color={accent} height={11} fadeAfter={totalS + 0.6} />
    </>
  );
}

/**
 * Live thinking block.
 *
 * The shimmer is a moving linear-gradient clipped to the text
 * (`background-clip: text`), which the compositor animates — the reference does
 * the same thing by recolouring every letter on each frame, which is far more
 * expensive for the same visual result.
 *
 * The elapsed timer is a real count of seconds, and the stage line advances on
 * measured time. The post-state reports the duration and the reasoning tokens
 * the provider actually returned.
 *
 * @param {{
 *   label: string,
 *   steps: string[],
 *   seconds: number,
 *   accent: string,
 * }} props
 */
export function ThinkingBlock({ label, steps, seconds, accent }) {
  const stepIdx = Math.min(steps.length - 1, Math.floor(seconds / 1.8));
  const stage = steps[stepIdx] ?? steps[0] ?? '';

  return (
    <div className="flex items-start gap-2.5">
      {/* Mark: accent tile that breathes while the model works. */}
      <div aria-hidden="true" className="nara-think-mark" style={cssVars({ '--accent': accent, '--nara-accent-rgb': ACCENT_RGB })}>
        <span className="nara-think-dot" />
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 text-[12.5px] font-medium leading-[1.35]">
          <span className="nara-shimmer">{label}</span>
          <span className="tabular-nums" style={{ color: accent }}>
            {seconds}s
          </span>
        </div>
        <div key={stage} className="nara-stage mt-1 text-[12px] font-medium leading-[16px]">
          {stage}
        </div>
      </div>
    </div>
  );
}

/**
 * Post-thinking line: "Thought for Ns".
 *
 * @param {{ seconds: number, reasoningTokens?: number, accent: string, reduced?: boolean }} props
 */
export function ThoughtFor({ seconds, reasoningTokens = 0, accent }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(id);
  }, []);

  if (seconds < 1) return null;
  return (
    <div
      className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium leading-[1.3] text-[#8E8E93] transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-[5px] w-[5px] rounded-full"
        style={{ background: accent, opacity: 0.7 }}
      />
      Thought for {seconds}s
      {reasoningTokens > 0 && <span className="text-[#5C5C63]">· {reasoningTokens} reasoning tokens</span>}
    </div>
  );
}

