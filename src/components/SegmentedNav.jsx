// @ts-check
// Segmented navigation control — mechanics ported from the reference
// segmented-control.html.
//
// The reference does not swap state at a threshold. It keeps one continuous
// position value `x` (0..n-1), moves it with a normalised spring, and derives
// everything from it:
//   - the indicator offset: left = pad + x * segmentWidth
//   - the active weight of each label: |x - i| < 0.5
// The result is a glide instead of a jump, and the label weight crossfades
// during the travel rather than at the end.

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { spring, clamp } from '@/lib/motion/curves';

/** Seconds for the indicator to travel one segment. */
const TRAVEL_S = 0.62;

/**
 * Continuous position that eases toward `target` with the reference spring.
 * Returns a fractional index; the caller derives geometry from it.
 *
 * @param {number} target
 * @param {boolean} reduced
 * @returns {number}
 */
function useGlide(target, reduced) {
  const [x, setX] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      setX(target);
      return undefined;
    }
    cancelAnimationFrame(rafRef.current);
    fromRef.current = x;
    startRef.current = performance.now();

    const tick = (/** @type {number} */ now) => {
      const p = clamp((now - startRef.current) / (TRAVEL_S * 1000));
      // Distance-scaling: a two-segment jump should still feel like one gesture,
      // so the spring eases the whole move rather than per-segment.
      const next = fromRef.current + (target - fromRef.current) * spring(p);
      setX(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
     
    // gesture start on purpose; depending on it would restart every frame.
  }, [target, reduced]);

  return x;
}

/**
 * @typedef {{ name: string, label: string, href: string, active: boolean }} SegmentItem
 */

/**
 * @param {{
 *   items: SegmentItem[],
 *   onSelect: (href: string) => void,
 *   className?: string,
 * }} props
 */
export default function SegmentedNav({ items, onSelect, className = '' }) {
  const reduced = useReducedMotion() ?? false;
  const activeIndex = Math.max(0, items.findIndex((it) => it.active));
  const x = useGlide(activeIndex, reduced);
  const n = items.length;
  const trackRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const [segW, setSegW] = useState(0);

  // The indicator is positioned in pixels, so its width must be measured after
  // layout (labels vary per language) instead of assumed from a percentage.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => setSegW(el.clientWidth / n);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  const pad = 3;
  const indicatorW = Math.max(0, segW - 2 * pad);

  return (
    <div
      className={
        'relative rounded-[12px] p-[3px] ' +
        'bg-white/[0.04] border border-white/10 backdrop-blur-md ' + className
      }
    >
      <div ref={trackRef} className="relative flex items-stretch">
        {/* Indicator: one continuous left offset, never a width animation. */}
        <span
          aria-hidden="true"
          data-nara-indicator=""
          className="pointer-events-none absolute top-0 h-full rounded-[9px] bg-white/[0.10]"
          style={{
            left: pad + x * segW,
            width: indicatorW,
            transition: reduced ? 'none' : 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,.18), 0 3px 10px rgba(0,0,0,.16)',
          }}
        />
        {items.map((it, i) => {
          // Weight follows distance from the continuous position, exactly like
          // the reference: active inside half a segment, otherwise muted.
          const near = Math.abs(x - i) < 0.5;
          return (
            <button
              key={it.href}
              type="button"
              onClick={() => onSelect(it.href)}
              aria-current={it.active ? 'page' : undefined}
              className="relative z-10 flex-1 whitespace-nowrap rounded-[9px] px-3 py-2 text-sm"
              style={{
                fontWeight: near ? 600 : 480,
                color: near ? '#FFFFFF' : 'rgba(161,161,170,0.9)',
                transition: 'color 260ms ease-out, font-weight 0ms',
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
