import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * useAnimatedCounter — animates counting from 0 to target when element scrolls into view.
 *
 * Returns { count, ref, isAnimating } where ref should be attached to the wrapper element,
 * and count updates smoothly with an ease-out cubic curve.
 *
 * @param {number} target     — final number to count to
 * @param {object} options
 * @param {number} options.duration — animation duration in ms (default 2000)
 * @param {number} options.delay    — delay before animation starts (default 0)
 * @param {boolean} options.once    — only animate once (default true)
 * @param {string} options.formatter — optional: 'integer' (default) or function
 */
export function useAnimatedCounter(target, {
  duration = 2000,
  delay = 0,
  once = true,
  formatter = 'integer',
} = {}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-60px' });
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Only animate once if `once` is true and already animated
    if (once && hasAnimatedRef.current) return;
    if (!isInView) return;

    setIsAnimating(true);
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isInView, target, duration, delay, once]);

  // Format the display value
  const displayValue = typeof formatter === 'function'
    ? formatter(count)
    : formatter === 'integer'
      ? count.toLocaleString()
      : count.toLocaleString();

  return { count, displayValue, ref, isAnimating, isInView };
}
