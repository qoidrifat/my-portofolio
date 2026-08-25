// @ts-check
import { useRef, useCallback } from 'react';

/**
 * @typedef {Object} TiltEffectOptions
 * @property {number} [maxTilt=6] - max rotation in degrees
 * @property {number} [scale=1.01] - hover scale multiplier
 * @property {number} [perspective=800] - CSS perspective value
 * @property {number} [transitionMs=300] - transition duration for settling
 * @property {boolean} [disabled=false] - disable the effect
 */

/**
 * @typedef {Object} TiltEffectResult
 * @property {import('react').RefObject<HTMLElement | null>} ref
 * @property {(e: import('react').MouseEvent<HTMLElement>) => void} handleMouseMove
 * @property {() => void} handleMouseLeave
 */

/**
 * useTiltEffect — adds a subtle 3D perspective tilt on mouse hover.
 *
 * Attach the returned { ref, handleMouseMove, handleMouseLeave } to your card
 * element and its onMouseMove / onMouseLeave handlers.
 *
 * @param {TiltEffectOptions} [options]
 * @returns {TiltEffectResult}
 */
export function useTiltEffect({
  maxTilt = 6,
  scale = 1.01,
  perspective = 800,
  transitionMs = 300,
  disabled = false,
} = {}) {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  const cleanupRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const handleMouseMove = useCallback((/** @type {import('react').MouseEvent<HTMLElement>} */ e) => {
    if (disabled || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate tilt: further from center = more rotation
    const tiltX = ((y - centerY) / centerY) * -maxTilt;
    const tiltY = ((x - centerX) / centerX) * maxTilt;

    // Apply GPU-accelerated transform
    ref.current.style.transform = [
      `perspective(${perspective}px)`,
      `rotateX(${tiltX.toFixed(1)}deg)`,
      `rotateY(${tiltY.toFixed(1)}deg)`,
      `scale3d(${scale}, ${scale}, ${scale})`,
    ].join(' ');
  }, [maxTilt, scale, perspective, disabled]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || !ref.current) return;
    // Smooth return to neutral
    ref.current.style.transition = `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    ref.current.style.transform = [
      `perspective(${perspective}px)`,
      'rotateX(0deg)',
      'rotateY(0deg)',
      'scale3d(1, 1, 1)',
    ].join(' ');

    // Remove transition after settle to preserve hover performance
    if (cleanupRef.current !== null) clearTimeout(cleanupRef.current);
    cleanupRef.current = setTimeout(() => {
      if (ref.current) {
        ref.current.style.transition = '';
      }
    }, transitionMs);
  }, [perspective, transitionMs, disabled]);

  return { ref, handleMouseMove, handleMouseLeave };
}
