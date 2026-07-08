import { useState, useEffect, useMemo } from 'react';

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────
const EASE_PREMIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_SNAP    = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const T = {
  LOGO_DURATION    : 1500,   // Stage 1: premium logo intro
  MORPH_START      : 1400,   // logo begins dissolving (slightly before 1.5s for overlap)
  MORPH_DURATION   : 700,    // Stage 2: logo→identity morph
  IDENTITY_SETTLE  : 400,    // Stage 3: identity holds before terminal
  TERMINAL_SLIDE   : 500,    // Stage 4: terminal slides in
  BOOT_DURATION    : 2000,   // Stage 5: terminal typing (~2s)
  EXIT_PAUSE       : 300,    // Stage 6: pause after boot complete
  EXIT_DURATION    : 700,    // Stage 7: shared exit transition (identity→hero)
  FINISH_DELAY     : 100,    // tiny buffer before onFinish
};

// Total (sequential): 1400+700+400+500+2000+300+700+100 = ~6.1s
// With overlaps (morph starts 100ms before logo ends): ~6.5s perceived

const NAME    = "Qoid Rif'at";
const SUBTITLE = 'Full Stack Developer  •  AI Enthusiast';

const bootLines = [
  { text: 'booting portfolio...', prefix: '>', hasCheck: false },
  { text: 'Initializing Projects',        hasCheck: true },
  { text: 'Loading Experience',           hasCheck: true },
  { text: 'Preparing Skills Showcase',    hasCheck: true },
  { text: 'Optimizing Performance',       hasCheck: true },
  { text: 'Portfolio Ready',              hasCheck: true },
];

const isReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────
// BackgroundEffects — ambient gradient, particles (continuous)
// ─────────────────────────────────────────────────────
function BackgroundEffects({ visible }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: `opacity 800ms ${EASE_PREMIUM}` }}
    >
      {/* Deep ambient gradient */}
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/4 rounded-full blur-[250px]" />
      <div className="absolute top-1/4 right-[20%] w-[350px] h-[350px] bg-indigo-500/3 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 left-[15%] w-[300px] h-[300px] bg-cyan-500/2 rounded-full blur-[120px]" />

      {/* Slow floating particles */}
      {!isReduced && <FloatingParticles />}

      {/* Very subtle vignette */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)',
      }} />
    </div>
  );
}

// ── Floating particles ─────────────────────────────
const PARTICLE_COUNT = 28;
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1.5 + Math.random() * 2,
      delay: Math.random() * 10,
      duration: 14 + Math.random() * 14,
      opacity: 0.1 + Math.random() * 0.3,
      dir: Math.random() > 0.5 ? 1 : -1,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(147, 197, 253, 0.5)',
            boxShadow: '0 0 3px rgba(147, 197, 253, 0.2)',
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
            '--drift': `${12 * p.dir}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// LogoAnimation — premium intro
// ─────────────────────────────────────────────────────
function LogoAnimation({ phase }) {
  const isLeaving = phase === 'morph' || phase === 'identity' || phase === 'boot' || phase === 'exiting' || phase === 'done';

  return (
    <div
      className="flex flex-col items-center"
      style={{
        opacity: isLeaving ? 0 : 1,
        filter: isLeaving ? 'blur(8px)' : 'blur(0px)',
        transform: isLeaving ? 'scale(0.82) translateY(-14px)' : 'scale(1) translateY(0)',
        transition: isReduced
          ? 'none'
          : `opacity ${T.MORPH_DURATION}ms ${EASE_PREMIUM}, filter ${T.MORPH_DURATION}ms ${EASE_PREMIUM}, transform ${T.MORPH_DURATION}ms ${EASE_PREMIUM}`,
        pointerEvents: 'none',
        position: 'absolute',
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* Soft glow behind logo */}
        <div
          className="absolute -inset-12 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
            animation: isReduced || isLeaving ? 'none' : 'glowPulse 4s ease-in-out infinite',
          }}
        />

        {/* Logo with premium rotation intro */}
        <div
          style={
            isReduced || isLeaving
              ? {}
              : {
                  animation: 'logoIntro 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  opacity: 0,
                  transform: 'scale(0.82) rotate(-18deg)',
                  filter: 'blur(10px)',
                }
          }
        >
          <img
            src="/logo.webp"
            alt={NAME}
            className="relative h-[72px] w-auto md:h-[88px]"
            style={{
              animation: isReduced || isLeaving ? 'none' : 'logoFloat 4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// IdentityReveal — name + subtitle
// ─────────────────────────────────────────────────────
function IdentityReveal({ visible, exiting }) {
  return (
    <div
      className="flex flex-col items-center select-none"
      style={{
        opacity: exiting ? 1 : visible ? 1 : 0,
        filter: exiting ? 'blur(0px)' : 'blur(0px)',
        transform: exiting
          ? 'translateY(-38vh) scale(1.25)'
          : visible
            ? 'translateY(0) scale(1)'
            : 'translateY(18px) scale(1)',
        transition: isReduced
          ? 'none'
          : exiting
            ? `transform 900ms ${EASE_PREMIUM}, opacity 700ms ${EASE_PREMIUM}`
            : `opacity 700ms ${EASE_PREMIUM}, transform 700ms ${EASE_PREMIUM}`,
        pointerEvents: 'none',
        position: 'absolute',
        willChange: exiting ? 'transform, opacity' : 'auto',
      }}
    >
      {/* Name */}
      <h1
        className="text-center leading-none tracking-tight"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 300,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: '#ffffff',
          letterSpacing: '-0.02em',
          textShadow: exiting ? '0 0 40px rgba(59,130,246,0.15)' : 'none',
        }}
      >
        {NAME}
      </h1>

      {/* Subtitle */}
      <p
        className="text-center mt-3 md:mt-4"
        style={{
          opacity: exiting ? 0 : 1,
          transform: exiting ? 'translateY(-8px)' : 'translateY(0)',
          transition: isReduced
            ? 'none'
            : `opacity 500ms ${EASE_PREMIUM}, transform 500ms ${EASE_PREMIUM}`,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          fontSize: 'clamp(0.8rem, 1.8vw, 1.05rem)',
          color: 'rgba(161, 161, 170, 0.8)',
          letterSpacing: '0.01em',
        }}
      >
        {SUBTITLE}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// TerminalSequence — glass card with boot commands
// ─────────────────────────────────────────────────────
function TerminalSequence({ visible, exiting, activeLine, lineTypedChars, showCursor, showWelcome }) {
  return (
    <div
      className="flex items-center justify-center select-none"
      style={{
        opacity: exiting ? 0 : visible ? 1 : 0,
        filter: exiting ? 'blur(8px)' : visible ? 'blur(0px)' : 'blur(10px)',
        transform: exiting
          ? 'translateY(20px) scale(0.92)'
          : visible
            ? 'translateY(0) scale(1)'
            : 'translateY(20px) scale(0.95)',
        transition: isReduced
          ? 'none'
          : exiting
            ? `opacity 700ms ${EASE_PREMIUM}, filter 700ms ${EASE_PREMIUM}, transform 700ms ${EASE_PREMIUM}`
            : `opacity 500ms ${EASE_PREMIUM}, filter 500ms ${EASE_PREMIUM}, transform 500ms ${EASE_SNAP}`,
        pointerEvents: 'none',
        position: 'absolute',
        // Positioned below identity — identity is centered, terminal sits below
        marginTop: 'clamp(120px, 14vh, 160px)',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(420px, 80vw)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(9, 9, 11, 0.6)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Terminal header dots */}
        <div className="flex items-center gap-[6px] px-4 pt-3 pb-2">
          <div className="w-[8px] h-[8px] rounded-full bg-red-500/40" />
          <div className="w-[8px] h-[8px] rounded-full bg-yellow-500/40" />
          <div className="w-[8px] h-[8px] rounded-full bg-green-500/40" />
        </div>

        {/* Terminal content */}
        <div
          className="px-4 pb-4 pt-1"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
            lineHeight: '1.8',
            color: 'rgba(212, 212, 216, 0.85)',
          }}
        >
          {bootLines.map((line, idx) => {
            const isActive = idx === activeLine;
            const isDone = idx < activeLine;
            const isBootLine = idx === 0;

            return (
              <div key={idx} className="flex items-start gap-2 min-h-[1.8em]">
                {/* Checkmark or prompt */}
                <span className="shrink-0" style={{ width: '1.2em', textAlign: 'center' }}>
                  {isBootLine ? (
                    <span style={{ color: 'rgba(96, 165, 250, 0.6)' }}>&gt;</span>
                  ) : isDone ? (
                    <CheckMark />
                  ) : isActive && lineProgress > 0 ? (
                    <span style={{ color: 'rgba(96, 165, 250, 0.3)' }}>&gt;</span>
                  ) : null}
                </span>

                {/* Text */}
                <span>
                  {isDone ? (
                    <span style={{ color: 'rgba(161, 161, 170, 0.8)' }}>{line.text}</span>
                  ) : isActive ? (
                    <>
                      <span style={{ color: 'rgba(212, 212, 216, 0.85)' }}>
                        {line.text.slice(0, lineTypedChars)}
                      </span>
                      {showCursor && (
                        <span
                          className="inline-block ml-[1px] align-middle"
                          style={{
                            width: '2px',
                            height: '1.1em',
                            background: 'rgba(96, 165, 250, 0.6)',
                            boxShadow: '0 0 4px rgba(59,130,246,0.3)',
                            opacity: showCursor ? 1 : 0,
                            transition: 'opacity 60ms',
                          }}
                        />
                      )}
                    </>
                  ) : null}
                </span>
              </div>
            );
          })}

          {/* "Welcome." line — fades in after all lines done */}
          {showWelcome && (
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{
                  color: 'rgba(59, 130, 246, 0.7)',
                  opacity: showWelcome ? 1 : 0,
                  transition: 'opacity 600ms ease',
                  fontWeight: 500,
                }}
              >
                Welcome.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Animated checkmark ──────────────────────────────
function CheckMark() {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        animation: isReduced ? 'none' : 'checkPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        opacity: 0,
        transform: 'scale(0)',
        color: 'rgba(52, 211, 153, 0.85)',
        textShadow: '0 0 6px rgba(52, 211, 153, 0.3)',
        fontWeight: 700,
        fontSize: '0.85em',
      }}
    >
      &#10003;
    </span>
  );
}

// ─────────────────────────────────────────────────────
// PortfolioIntro — main orchestrator
// ─────────────────────────────────────────────────────
export default function LoadingScreen({ onFinish }) {
  const [phase, setPhase] = useState('logo'); // logo | morph | identity | boot | pause | exiting | done
  const [activeLine, setActiveLine] = useState(0);
  const [lineTypedChars, setLineTypedChars] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  // ── Phase transitions (timeline based, all overlapping) ──
  useEffect(() => {
    if (isReduced) {
      // Skip to done immediately for reduced motion
      setPhase('done');
      return;
    }

    const t1 = setTimeout(() => setPhase('morph'), T.MORPH_START);
    const t2 = setTimeout(() => setPhase('identity'), T.MORPH_START + T.MORPH_DURATION);
    const t3 = setTimeout(() => setPhase('boot'), T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_SETTLE);
    const t4 = setTimeout(() => setPhase('pause'), T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_SETTLE + T.TERMINAL_SLIDE + T.BOOT_DURATION);
    const t5 = setTimeout(() => setPhase('exiting'), T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_SETTLE + T.TERMINAL_SLIDE + T.BOOT_DURATION + T.EXIT_PAUSE);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5);
    };
  }, []);

  // ── Overlay fade when exiting ──
  useEffect(() => {
    if (phase !== 'exiting') return;
    // Start overlay fade immediately
    const t = setTimeout(() => setOverlayOpacity(0), 50);
    // Phase to done
    const t2 = setTimeout(() => setPhase('done'), T.EXIT_DURATION);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [phase]);

  // ── Call onFinish when done ──
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => onFinish?.(), T.FINISH_DELAY);
    return () => clearTimeout(t);
  }, [phase, onFinish]);

  // ── Terminal boot typing engine ──
  useEffect(() => {
    if (phase !== 'boot' || isReduced) return;

    let lineIdx = 0;
    let charIdx = 0;
    let timer;

    const typeLine = () => {
      const line = bootLines[lineIdx];
      if (!line) {
        // All lines done — show welcome
        setShowWelcome(true);
        return;
      }

      if (charIdx <= line.text.length) {
        setActiveLine(lineIdx);
        setLineTypedChars(charIdx);
        charIdx++;

        // Variable speed: start slow, faster mid, slight pause near end
        const nearEnd = line.text.length - charIdx < 4;
        const start = charIdx < 3;
        const base = nearEnd ? 75 : start ? 110 : 55;
        const jitter = Math.random() * 25;
        timer = setTimeout(typeLine, base + jitter);
      } else {
        // Line complete — pause before next line
        const pause = lineIdx === 0 ? 280 : 150 + Math.random() * 100;
        charIdx = 0;
        lineIdx++;
        timer = setTimeout(typeLine, pause);
      }
    };

    // Initial delay before typing starts (terminal slide-in time + buffer)
    timer = setTimeout(typeLine, 350);

    // Cursor blink
    const blink = setInterval(() => setShowCursor(p => !p), 480);

    return () => { clearTimeout(timer); clearInterval(blink); };
  }, [phase]);

  // ── Cursor stops during exit ──
  useEffect(() => {
    if (phase === 'exiting' || phase === 'done') {
      setShowCursor(false);
    }
  }, [phase]);

  const isMorphing     = phase === 'morph';
  const isIdentity     = phase === 'identity';
  const isBoot         = phase === 'boot';
  const isPause        = phase === 'pause';
  const isExiting      = phase === 'exiting';
  const isDone         = phase === 'done';

  const identityVisible = isMorphing || isIdentity || isBoot || isPause || isExiting || isDone;
  const terminalVisible = isBoot || isPause || isExiting || isDone;

  // If reduced motion, render nothing
  if (isReduced) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-zinc-950"
      style={{
        opacity: overlayOpacity,
        transition: `opacity ${T.EXIT_DURATION}ms ${EASE_PREMIUM}`,
        pointerEvents: 'none',
      }}
    >
      {/* Background — always continuous */}
      <BackgroundEffects visible={true} />

      {/* Stage 1: Logo */}
      {(phase === 'logo' || isMorphing) && <LogoAnimation phase={phase} />}

      {/* Stage 2→3: Identity (overlaps with logo disolving) */}
      {identityVisible && (
        <IdentityReveal visible={identityVisible} exiting={isExiting || isDone} />
      )}

      {/* Stage 4→5: Terminal (slides below identity) */}
      {terminalVisible && (
        <TerminalSequence
          visible={terminalVisible}
          exiting={isExiting || isDone}
          activeLine={activeLine}
          lineTypedChars={lineTypedChars}
          showCursor={showCursor}
          showWelcome={showWelcome}
        />
      )}
    </div>
  );
}
