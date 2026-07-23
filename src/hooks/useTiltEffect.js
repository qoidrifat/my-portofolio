import { useRef, useCallback } from 'react';

/**
 * useTiltEffect — adds a subtle 3D perspective tilt on mouse hover.
 *
 * Attach the returned { ref, handleMouseMove, handleMouseLeave } to your card
 * element and its onMouseMove / onMouseLeave handlers.
 *
 * @param {object} options
 * @param {number} options.maxTilt     — max rotation in degrees (default 6)
 * @param {number} options.scale       — hover scale multiplier (default 1.01)
 * @param {number} options.perspective — CSS perspective value (default 800)
 * @param {number} options.transitionMs — transition duration for settling (default 300)
 */
export function useTiltEffect({
  maxTilt = 6,
  scale = 1.01,
  perspective = 800,
  transitionMs = 300,
  disabled = false,
} = {}) {
  const ref = useRef(null);
  const cleanupRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
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
    if (cleanupRef.current) clearTimeout(cleanupRef.current);
    cleanupRef.current = setTimeout(() => {
      if (ref.current) {
        ref.current.style.transition = '';
      }
    }, transitionMs);
  }, [perspective, transitionMs, disabled]);

  return { ref, handleMouseMove, handleMouseLeave };
}
