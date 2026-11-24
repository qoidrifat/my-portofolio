import { useState, useEffect, useRef, useCallback } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import {
  MASCOT_EXPRESSIONS,
  AUTONOMOUS_EXPRESSIONS,
  MASCOT_TIMINGS,
} from './mascot.constants';

/**
 * useMascotEngine — Real-time cursor tracking, autonomous 3s expression scheduler,
 * and natural organic blinking engine.
 */
export function useMascotEngine(containerRef, { isReduced = false, isInteracting = false } = {}) {
  const [expression, setExpression] = useState(MASCOT_EXPRESSIONS.NEUTRAL);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  const [isInViewport, setIsInViewport] = useState(true);

  // Springs for 60fps cursor tracking
  const rawLookX = useMotionValue(0);
  const rawLookY = useMotionValue(0);
  const rawHeadTilt = useMotionValue(0);

  const springLookX = useSpring(rawLookX, { damping: 22, stiffness: 220 });
  const springLookY = useSpring(rawLookY, { damping: 22, stiffness: 220 });
  const springHeadTilt = useSpring(rawHeadTilt, { damping: 24, stiffness: 180 });

  const prevExpRef = useRef(MASCOT_EXPRESSIONS.NEUTRAL);
  const rafRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const blinkTimerRef = useRef(null);
  const expTimerRef = useRef(null);

  useEffect(() => {
    const onVis = () => setIsTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const el = containerRef?.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([e]) => setIsInViewport(e.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef]);

  const canAnimate = isTabVisible && isInViewport && !isReduced;

  // Real-time cursor gaze tracking
  useEffect(() => {
    if (!canAnimate) {
      rawLookX.set(0);
      rawLookY.set(0);
      rawHeadTilt.set(0);
      return;
    }

    const reset = () => {
      rawLookX.set(0);
      rawLookY.set(0);
      rawHeadTilt.set(0);
    };

    const update = () => {
      rafRef.current = null;
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const dx = pointerRef.current.x - (rect.left + rect.width / 2);
      const dy = pointerRef.current.y - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);

      if (dist > MASCOT_TIMINGS.MAX_GAZE_DISTANCE_PX) {
        reset();
        return;
      }

      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(dist / 260, 1);
      rawLookX.set(Math.cos(angle) * MASCOT_TIMINGS.MAX_PUPIL_OFFSET_X * intensity);
      rawLookY.set(Math.sin(angle) * MASCOT_TIMINGS.MAX_PUPIL_OFFSET_Y * intensity);

      const tilt = Math.max(
        -MASCOT_TIMINGS.MAX_HEAD_TILT_DEG,
        Math.min(MASCOT_TIMINGS.MAX_HEAD_TILT_DEG, (dx / 320) * MASCOT_TIMINGS.MAX_HEAD_TILT_DEG)
      );
      rawHeadTilt.set(tilt);
    };

    const onMove = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', reset);
    document.addEventListener('mouseleave', reset);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', reset);
      document.removeEventListener('mouseleave', reset);
    };
  }, [canAnimate, containerRef, rawHeadTilt, rawLookX, rawLookY]);

  // Continuous autonomous expression scheduler (non-stop seamless rotation)
  useEffect(() => {
    if (!canAnimate) {
      clearTimeout(expTimerRef.current);
      return;
    }

    const schedule = () => {
      expTimerRef.current = setTimeout(() => {
        const pool = AUTONOMOUS_EXPRESSIONS.filter((e) => e !== prevExpRef.current);
        const next = pool[Math.floor(Math.random() * pool.length)];
        prevExpRef.current = next;
        setExpression(next);
        schedule();
      }, MASCOT_TIMINGS.EXPRESSION_INTERVAL_MS);
    };

    schedule();
    return () => clearTimeout(expTimerRef.current);
  }, [canAnimate]);

  // Independent organic blinking
  const blink = useCallback(() => {
    if (isReduced) return;
    setIsBlinking(true);
    setTimeout(() => {
      setIsBlinking(false);
      if (Math.random() < MASCOT_TIMINGS.DOUBLE_BLINK_CHANCE) {
        setTimeout(() => {
          setIsBlinking(true);
          setTimeout(() => setIsBlinking(false), 110);
        }, 160);
      }
    }, 120);
  }, [isReduced]);

  useEffect(() => {
    if (!canAnimate) {
      clearTimeout(blinkTimerRef.current);
      return;
    }

    const scheduleBlink = () => {
      const delay =
        MASCOT_TIMINGS.BLINK_MIN_MS +
        Math.random() * (MASCOT_TIMINGS.BLINK_MAX_MS - MASCOT_TIMINGS.BLINK_MIN_MS);

      blinkTimerRef.current = setTimeout(() => {
        blink();
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimerRef.current);
  }, [canAnimate, blink]);

  return {
    lookX: springLookX,
    lookY: springLookY,
    headTilt: springHeadTilt,
    autonomousExpression: expression,
    isBlinking,
  };
}
