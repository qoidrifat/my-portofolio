import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import MascotCharacter from './MascotCharacter';
import MascotSpeechBubble from './MascotSpeechBubble';
import { MASCOT_EXPRESSIONS, MASCOT_COPY, MASCOT_TIMINGS } from './mascot.constants';
import { useLanguage } from '@/lib/LanguageContext';
import { useMascotEngine } from './useMascotEngine';

const floatVariants = {
  idle: {
    y: [0, -7, 0],
    rotate: [0, 0.5, -0.5, 0],
    transition: { duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
  },
  reduced: { y: 0, rotate: 0 },
};

/**
 * PortfolioMascot — Cubie-style subterranean emergence + non-stop autonomous character.
 */
export default function PortfolioMascot({
  externalExpression = null,
  size = 230,
  className = '',
}) {
  const isReduced = useReducedMotion();
  const { lang } = useLanguage();
  const copy = MASCOT_COPY[lang] || MASCOT_COPY.en;
  const containerRef = useRef(null);

  const [overrideExpression, setOverrideExpression] = useState(null);
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const revertTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(revertTimerRef.current);
  }, []);

  const triggerTemporaryExpression = useCallback((exp, durationMs = 2600) => {
    clearTimeout(revertTimerRef.current);
    setOverrideExpression(exp);
    revertTimerRef.current = setTimeout(() => {
      setOverrideExpression(null);
    }, durationMs);
  }, []);

  // Initial welcome greeting on emergence
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerTemporaryExpression(
        MASCOT_EXPRESSIONS.GREETING,
        MASCOT_TIMINGS.WELCOME_DURATION_MS
      );
    }, 1400);
    return () => clearTimeout(timer);
  }, [triggerTemporaryExpression]);

  // Unified engine: cursor tracking + non-stop autonomous expression scheduler + organic blinking
  const { lookX, lookY, headTilt, autonomousExpression, isBlinking } = useMascotEngine(
    containerRef,
    { isReduced }
  );

  // Expression runs continuously without pause
  const currentExpression = isBubbleOpen
    ? MASCOT_EXPRESSIONS.GUIDE
    : overrideExpression || externalExpression || autonomousExpression;

  const handleToggleBubble = () => {
    setIsBubbleOpen((prev) => {
      const next = !prev;
      if (next) triggerTemporaryExpression(MASCOT_EXPRESSIONS.HAPPY, 1200);
      return next;
    });
  };

  const handleActionSelect = () => {
    triggerTemporaryExpression(
      MASCOT_EXPRESSIONS.CELEBRATING,
      MASCOT_TIMINGS.CELEBRATION_DURATION_MS
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
    >
      {/* ── Subterranean Portal & Light Elevator (Cubie Reference) ── */}
      <div className="absolute -bottom-4 w-52 h-44 flex flex-col items-center justify-end pointer-events-none select-none z-0">
        {/* Vertical light column ascending from the underground chamber */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scaleX: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-5 w-32 h-40 bg-gradient-to-t from-accent-web/30 via-accent-web/10 to-transparent blur-md"
        />

        {/* Floating cyber energy sparks rising from the pit */}
        {!isReduced && (
          <div className="absolute bottom-5 w-28 h-36 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [15, -125], opacity: [0, 0.85, 0], scale: [0.6, 1.2, 0.4] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }}
                style={{ left: `${16 + i * 22}%` }}
                className="absolute bottom-0 w-1.5 h-3 rounded-full bg-accent-web/75 shadow-[0_0_8px_hsl(var(--accent-web))]"
              />
            ))}
          </div>
        )}

        {/* Isometric Ground Portal Aperture */}
        <div className="relative w-36 h-12 flex items-center justify-center">
          <div className="w-32 h-10 rounded-[50%] bg-zinc-950 border border-accent-web/40 shadow-[0_0_20px_hsl(var(--accent-web)/0.35),inset_0_4px_12px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
            <div className="w-20 h-5 rounded-[50%] bg-accent-web/45 blur-sm" />
          </div>
        </div>
      </div>

      {/* ── Mascot Container: Emerges upward from underground on mount ── */}
      <motion.div
        initial={isReduced ? false : { y: 90, opacity: 0, scale: 0.7 }}
        animate={isReduced ? false : { y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 110, mass: 0.9 }}
        className="relative z-10"
      >
        <motion.div
          variants={floatVariants}
          animate={isReduced ? 'reduced' : 'idle'}
          className="relative"
        >
          <button
            type="button"
            onClick={handleToggleBubble}
            aria-haspopup="dialog"
            aria-expanded={isBubbleOpen}
            aria-label={copy.ariaLabel}
            className="group relative block rounded-full p-2 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950"
          >
            <div
              className="absolute inset-0 rounded-full bg-accent-web/12 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 blur-xl pointer-events-none"
              aria-hidden="true"
            />

            <MascotCharacter
              expression={currentExpression}
              isBlinking={isBlinking}
              isReduced={isReduced}
              size={size}
              lookX={lookX}
              lookY={lookY}
              headTilt={headTilt}
            />
          </button>

          <MascotSpeechBubble
            isOpen={isBubbleOpen}
            onClose={() => {
              setIsBubbleOpen(false);
              setOverrideExpression(null);
            }}
            onActionSelect={handleActionSelect}
            isReduced={isReduced}
          />
        </motion.div>
      </motion.div>

      {/* Permanent status slot — keeps container dimensions 100% constant regardless of open/close */}
      <div className="h-7 mt-3 flex items-center justify-center select-none z-10 pointer-events-none">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/5 text-[11px] font-mono text-zinc-400 backdrop-blur-sm transition-opacity duration-150 ${
            isBubbleOpen ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="capitalize">{currentExpression}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-500">Tap to chat</span>
        </div>
      </div>
    </div>
  );
}
