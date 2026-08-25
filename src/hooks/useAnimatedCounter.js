// @ts-check
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * @typedef {Object} AnimatedCounterOptions
 * @property {number} [duration=2000] - animation duration in ms
 * @property {number} [delay=0] - delay before animation starts
 * @property {boolean} [once=true] - only animate once
 * @property {('integer' | ((count: number) => string))} [formatter='integer'] - display formatter
 */

/**
 * @typedef {Object} AnimatedCounterResult
 * @property {number} count
 * @property {string} displayValue
 * @property {import('react').RefObject<HTMLElement | null>} ref
 * @property {boolean} isAnimating
 * @property {boolean} isInView
 */

/**
 * useAnimatedCounter — animates counting from 0 to target when element scrolls into view.
 *
 * @param {number} target
 * @param {AnimatedCounterOptions} [options]
 * @returns {AnimatedCounterResult}
 */
export function useAnimatedCounter(target, {
  duration = 2000,
  delay = 0,
  once = true,
  formatter = 'integer',
} = {}) {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  const isInView = useInView(ref, { once, margin: '-60px' });
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef(/** @type {number | null} */ (null));
  const timeoutRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Only animate once if `once` is true and already animated
    if (once && hasAnimatedRef.current) return;
    if (!isInView) return;

    setIsAnimating(true);
    /** @type {number | null} */
    let startTime = null;

    const animate = (/** @type {number} */ timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
        setIsAnimating(false);
        hasAnimatedRef.current = true;
      }
    };

    timeoutRef.current = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isInView, target, duration, delay, once]);

  // Format the display value
  const displayValue = typeof formatter === 'function'
    ? formatter(count)
    : count.toLocaleString();

  return { count, displayValue, ref, isAnimating, isInView };
}
