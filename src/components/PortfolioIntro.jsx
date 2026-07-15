import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// Timing Constants (milliseconds)
// ─────────────────────────────────────────────────────────────
const T = {
  LOGO_INTRO     : 1500,  // Stage 1 — premium logo appearance
  MORPH_START    : 1350,  // Stage 2 — logo begins transitioning into identity (overlap)
  MORPH_DURATION : 700,   // Stage 2 duration
  IDENTITY_HOLD  : 600,   // Stage 3 — identity holds centered before repositioning
  REPOSITION     : 800,   // Stage 4 — identity translates upward, terminal appears underneath
  TERMINAL_IN    : 600,   // Stage 5 — terminal fade/scale/blur in
  BOOT_LINE1     : 3000,  // Stage 6 — "booting portfolio..." typing duration
  BOOT_LINE2     : 1200,  // Stage 7a — "Initializing Projects" with loading + SUCCESS
  BOOT_LINE3     : 1200,  // Stage 7b — "Loading Experience"
  BOOT_LINE4     : 1200,  // Stage 7c — "Preparing Skills Showcase"
  WELCOME_HOLD   : 800,   // Stage 8 — "Welcome." + pause before exit
  EXIT           : 1000,  // Stage 9 — identity → hero shared transition, terminal dissolves
  FINISH_BUFFER  : 50,    // tiny buffer before onFinish
};

// Calculated cumulative offsets
const _ = {
  IDENTITY     : T.MORPH_START + T.MORPH_DURATION,                                                                          // 2050
  REPOSITION   : T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_HOLD,                                                        // 2650
  TERMINAL     : T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_HOLD + T.REPOSITION - 300,                                    // 3150 (overlap)
  BOOT1_START  : T.MORPH_START + T.MORPH_DURATION + T.IDENTITY_HOLD + T.REPOSITION + T.TERMINAL_IN,                          // 4050
  BOOT2_START  : _.BOOT1_START + T.BOOT_LINE1,                                                                               // 7050
  BOOT3_START  : _.BOOT2_START + T.BOOT_LINE2,                                                                               // 8250
  BOOT4_START  : _.BOOT3_START + T.BOOT_LINE3,                                                                               // 9450
  WELCOME      : _.BOOT4_START + T.BOOT_LINE4,                                                                               // 10650
  EXITING      : _.WELCOME + T.WELCOME_HOLD,                                                                                 // 11450
  DONE         : _.EXITING + T.EXIT,                                                                                         // 12450
};

// ─────────────────────────────────────────────────────────────
// Watchdog Safety Constants
// ─────────────────────────────────────────────────────────────
const WATCHDOG = {
  TOTAL_MS      : 13000, // Hard max: force homepage after 13s (accommodates ~12.5s sequence)
  STAGE_TIMEOUT : 4500,  // Per-stage timeout
  ASSET_TIMEOUT : 5000,
};

// ─────────────────────────────────────────────────────────────
// Premium Easing Curves
// ─────────────────────────────────────────────────────────────
const EASE = {
  PREMIUM    : 'cubic-bezier(0.22, 1, 0.36, 1)',
  SNAP       : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  SMOOTH     : 'cubic-bezier(0.16, 1, 0.3, 1)',
  ANTICIPATE : 'cubic-bezier(0.68, -0.15, 0.27, 1.15)',
};

// ─────────────────────────────────────────────────────────────
// Content Constants
// ─────────────────────────────────────────────────────────────
const NAME     = "Qoid Rif'at";
const SUBTITLE = 'Full Stack Developer  •  AI Enthusiast';

const BOOT_LINES = [
  { text: 'booting portfolio...',  prefix: true  },
  { text: 'Initializing Projects',  prefix: false },
  { text: 'Loading Experience',     prefix: false },
  { text: 'Preparing Skills Showcase',  prefix: false },
];

// ─────────────────────────────────────────────────────────────
// Reduced Motion Detection
// ─────────────────────────────────────────────────────────────
const isReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Asset Preloading ──
function preloadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;
    const onDone = (success) => {
      if (!resolved) { resolved = true; resolve(success); }
    };
    img.onload  = () => onDone(true);
    img.onerror = () => onDone(false);
    img.onabort = () => onDone(false);
    setTimeout(() => onDone(false), WATCHDOG.ASSET_TIMEOUT);
    img.src = '/logo.webp';
  });
}

// ═══════════════════════════════════════════════════════════════
// BackgroundEffects — continuous ambient gradient + particles + vignette
// ═══════════════════════════════════════════════════════════════
const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none will-change-transform">
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full blur-[300px] opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          animation: isReduced ? 'none' : 'bgBreathe 8s ease-in-out infinite',
        }}
      />
      <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full blur-[180px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
          animation: isReduced ? 'none' : 'bgBreathe2 10s ease-in-out infinite',
        }}
      />
      <div className="absolute bottom-[25%] left-[10%] w-[350px] h-[350px] rounded-full blur-[150px] opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)',
          animation: isReduced ? 'none' : 'bgBreathe3 12s ease-in-out infinite',
        }}
      />
      {!isReduced && <FloatingParticles />}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")`,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
});

const PARTICLE_COUNT = 28;
const FloatingParticles = memo(function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 12,
      duration: 16 + Math.random() * 16,
      opacity: 0.08 + Math.random() * 0.25,
      drift: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 12),
    })),
  []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full will-change-transform"
          style={{
            left: `${p.left}%`, bottom: '-6px', width: `${p.size}px`, height: `${p.size}px`,
            background: 'rgba(147,197,253,0.4)', boxShadow: '0 0 4px rgba(147,197,253,0.15)',
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ${p.delay}s cubic-bezier(0.25,0.46,0.45,0.94) infinite`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// LogoAnimation — Stage 1
// ═══════════════════════════════════════════════════════════════
const LogoAnimation = memo(function LogoAnimation({ active }) {
  if (!active) return null;
  return (
    <div className="flex flex-col items-center absolute" style={{ pointerEvents: 'none' }}>
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-14 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            animation: isReduced ? 'none' : 'glowPulse 4s ease-in-out infinite',
          }}
        />
        <div className="will-change-transform will-change-opacity will-change-filter"
          style={isReduced ? {} : {
            animation: 'logoPremiumIntro 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            opacity: 0, transform: 'scale(0.78) rotate(-22deg)', filter: 'blur(12px)',
          }}
        >
          <img src="/logo.webp" alt={NAME}
            className="relative w-[76px] h-auto md:w-[92px]"
            style={{ animation: isReduced ? 'none' : 'logoFloat 4s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// LogoMorph — Stage 2: Logo → Identity transition
// ═══════════════════════════════════════════════════════════════
const LogoMorph = memo(function LogoMorph({ active }) {
  return (
    <div className="flex flex-col items-center absolute will-change-transform will-change-opacity will-change-filter"
      style={{
        opacity: active ? 1 : 0,
        filter: active ? 'blur(0px)' : 'blur(12px)',
        transform: active ? 'scale(0.7) translateY(-28px)' : 'scale(1) translateY(0)',
        transition: isReduced ? 'none' : `opacity ${T.MORPH_DURATION}ms ${EASE.PREMIUM}, filter ${T.MORPH_DURATION}ms ${EASE.PREMIUM}, transform ${T.MORPH_DURATION}ms ${EASE.PREMIUM}`,
        pointerEvents: 'none',
      }}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-10 rounded-full opacity-20" />
        <img src="/logo.webp" alt="" className="w-[48px] h-auto md:w-[56px]" style={{ opacity: 0.6 }} />
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// IdentityReveal — Stage 3-4: Name + Subtitle, reposition, hero exit
// ═══════════════════════════════════════════════════════════════
const IdentityReveal = memo(function IdentityReveal({ visible, repositioned, exiting }) {
  // visible: boolean — initially appears centered
  // repositioned: boolean — identity moves up 70px to make room for terminal
  // exiting: boolean — identity stays visible, moves to hero title position

  const yOffset = repositioned ? '-70px' : exiting ? '0' : '0';
  const nameScale = exiting ? 'clamp(3rem, 9vw, 5.5rem)' : 'clamp(2rem, 6vw, 3.5rem)';
  const subtitleOpacity = exiting ? 0 : 1;
  const subtitleScale = exiting ? 0.8 : 1;

  return (
    <div className="flex flex-col items-center select-none will-change-transform will-change-opacity"
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? 'blur(0px)' : 'blur(8px)',
        transform: visible
          ? `translateY(${yOffset}) scale(1)`
          : 'translateY(20px) scale(0.95)',
        transition: isReduced ? 'none' : (
          exiting
            ? `opacity ${T.EXIT}ms ${EASE.SMOOTH}, filter ${T.EXIT}ms ${EASE.SMOOTH}, transform ${T.EXIT}ms ${EASE.PREMIUM}`
            : repositioned
              ? `transform ${T.REPOSITION}ms ${EASE.PREMIUM}`
              : `opacity 700ms ${EASE.PREMIUM}, filter 700ms ${EASE.PREMIUM}, transform 700ms ${EASE.SNAP}`
        ),
        pointerEvents: 'none',
        textShadow: exiting ? '0 0 60px rgba(59,130,246,0.12)' : 'none',
      }}
    >
      <h1 className="text-center leading-none tracking-tight"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 250,
          fontSize: nameScale,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          transition: isReduced ? 'none' : `font-size ${T.EXIT}ms ${EASE.PREMIUM}`,
        }}
      >
        {NAME}
      </h1>
      <p className="text-center mt-4 md:mt-5 will-change-transform will-change-opacity"
        style={{
          opacity: subtitleOpacity,
          transform: `scale(${subtitleScale})`,
          transition: isReduced ? 'none' : `opacity ${T.REPOSITION}ms ${EASE.PREMIUM}, transform ${T.REPOSITION}ms ${EASE.PREMIUM}`,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          fontSize: 'clamp(0.8rem, 1.8vw, 1.05rem)',
          color: 'rgba(161, 161, 170, 0.75)',
          letterSpacing: '0.02em',
        }}
      >
        {SUBTITLE}
      </p>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// SuccessBadge — green SUCCESS pill that appears after each boot line
// ═══════════════════════════════════════════════════════════════
const SuccessBadge = memo(function SuccessBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
      style={{
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.2)',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'rgba(52,211,153,0.9)',
        textShadow: '0 0 12px rgba(52,211,153,0.15)',
        animation: isReduced ? 'none' : 'successBadgeIn 350ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        opacity: 0,
        transform: 'scale(0.85)',
      }}
    >
      SUCCESS
    </span>
  );
});

// ── Loading dots ──
const LoadingDots = memo(function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] ml-1"
      style={{ animation: isReduced ? 'none' : 'loadingPulse 1.4s ease-in-out infinite' }}
    >
      <span className="w-[3px] h-[3px] rounded-full bg-blue-400/60" />
      <span className="w-[3px] h-[3px] rounded-full bg-blue-400/60" />
      <span className="w-[3px] h-[3px] rounded-full bg-blue-400/60" />
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════
// TerminalSequence — Stage 5-8: Glass terminal + boot sequence + SUCCESS
// ═══════════════════════════════════════════════════════════════
const TerminalSequence = memo(function TerminalSequence({
  visible, exiting, bootLine, typedProgress, cursorVisible, welcomeVisible, line2Done, line3Done, line4Done,
}) {
  const lineStatus = (idx) => {
    if (idx === 0) {
      if (bootLine > 0) return 'done';      // line 1 done → show checkmark
      if (bootLine === 0) return 'typing';   // currently typing
      return 'pending';
    }
    const doneMap = { 1: line2Done, 2: line3Done, 3: line4Done };
    if (doneMap[idx]) return 'done';
    if (bootLine > idx) return 'loading';
    if (bootLine === idx) return 'loading';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-center select-none absolute will-change-transform will-change-opacity will-change-filter"
      style={{
        opacity: exiting ? 0 : visible ? 1 : 0,
        filter: exiting ? 'blur(12px)' : visible ? 'blur(0px)' : 'blur(14px)',
        transform: exiting
          ? 'translateY(30px) scale(0.88)'
          : visible
            ? 'translateY(0) scale(1)'
            : 'translateY(28px) scale(0.94)',
        transition: isReduced ? 'none' : (exiting
          ? `opacity 800ms ${EASE.PREMIUM}, filter 800ms ${EASE.PREMIUM}, transform 800ms ${EASE.PREMIUM}`
          : `opacity 600ms ${EASE.PREMIUM}, filter 600ms ${EASE.PREMIUM}, transform 600ms ${EASE.SNAP}`
        ),
        pointerEvents: 'none',
        marginTop: 'clamp(110px, 13vh, 150px)',
      }}
    >
      <div className="relative overflow-hidden"
        style={{
          width: 'min(440px, 84vw)',
          borderRadius: '22px',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(9, 9, 11, 0.5)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Terminal header dots */}
        <div className="flex items-center gap-[7px] px-5 pt-3.5 pb-2.5">
          <div className="w-[9px] h-[9px] rounded-full bg-red-500/35" />
          <div className="w-[9px] h-[9px] rounded-full bg-yellow-500/35" />
          <div className="w-[9px] h-[9px] rounded-full bg-green-500/35" />
        </div>

        {/* Terminal content */}
        <div className="px-5 pb-5 pt-1.5"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 'clamp(0.6rem, 1.15vw, 0.8rem)',
            lineHeight: '2',
            color: 'rgba(212, 212, 216, 0.82)',
          }}
        >
          {BOOT_LINES.map((line, idx) => {
            const status = lineStatus(idx);

            return (
              <div key={idx} className="flex items-start gap-2.5" style={{ minHeight: '1.9em' }}>
                {/* Prefix / checkmark area */}
                <span className="shrink-0 flex items-center justify-center" style={{ width: '1.4em', textAlign: 'center' }}>
                  {line.prefix ? (
                    <span style={{ color: 'rgba(96,165,250,0.55)' }}>&gt;</span>
                  ) : status === 'done' ? (
                    <CheckMark />
                  ) : null}
                </span>

                {/* Text content */}
                <span className="flex items-center gap-2 will-change-transform will-change-opacity">
                  {idx === 0 && status === 'typing' ? (
                    // Line 1: typing animation
                    <>
                      <span style={{ color: 'rgba(212,212,216,0.82)' }}>
                        {line.text.slice(0, typedProgress)}
                      </span>
                      {cursorVisible && (
                        <span className="inline-block align-middle"
                          style={{
                            width: '2px', height: '1.1em',
                            background: 'rgba(96,165,250,0.55)',
                            boxShadow: '0 0 6px rgba(59,130,246,0.25)',
                            opacity: cursorVisible ? 1 : 0,
                            transition: 'opacity 60ms linear',
                          }}
                        />
                      )}
                    </>
                  ) : idx === 0 && status === 'done' ? (
                    <span style={{ color: 'rgba(161,161,170,0.75)' }}>{line.text}</span>
                  ) : status === 'loading' ? (
                    // Lines 2-4: text + loading dots
                    <span style={{ color: 'rgba(161,161,170,0.75)' }}>
                      {line.text}
                      <LoadingDots />
                    </span>
                  ) : status === 'done' ? (
                    // Lines 2-4: completed
                    <>
                      <span style={{ color: 'rgba(161,161,170,0.75)' }}>{line.text}</span>
                      <SuccessBadge />
                    </>
                  ) : null}
                </span>
              </div>
            );
          })}

          {/* "Welcome." line */}
          {welcomeVisible && (
            <div className="flex items-center gap-2 mt-2">
              <span className="shrink-0" style={{ width: '1.4em', textAlign: 'center', color: 'rgba(96,165,250,0.55)' }}>&gt;</span>
              <span style={{
                color: 'rgba(59,130,246,0.65)',
                fontWeight: 500,
                animation: isReduced ? 'none' : 'fadeInUp 700ms cubic-bezier(0.22,1,0.36,1) forwards',
                opacity: 0,
                transform: 'translateY(6px)',
              }}>
                Welcome.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Animated CheckMark ──
const CheckMark = memo(function CheckMark() {
  return (
    <span className="inline-flex items-center justify-center"
      style={{
        animation: isReduced ? 'none' : 'checkPremium 400ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        opacity: 0, transform: 'scale(0)',
        color: 'rgba(52,211,153,0.8)',
        textShadow: '0 0 8px rgba(52,211,153,0.2)',
        fontWeight: 700,
        fontSize: '0.85em',
      }}
    >
      &#10003;
    </span>
  );
});

// ── Recovery Logger ──
const LOG_PREFIX = '[IntroWatchdog]';
function logRecovery(eventType, details = {}) {
  const payload = { event: eventType, timestamp: Date.now(), ...details };
  if (import.meta.env.DEV) {
    console.warn(`%c${LOG_PREFIX} ⚠️ ${eventType}`, 'color: #f59e0b; font-weight: bold;', details);
  } else {
    console.warn(LOG_PREFIX, payload);
  }
}

// ═══════════════════════════════════════════════════════════════
// PortfolioIntro — Main Orchestrator
// ═══════════════════════════════════════════════════════════════
export default function PortfolioIntro({ onFinish, onExitStart }) {
  const [phase, setPhase] = useState('logo');
  // logo | morph | identity | reposition | terminal | boot | welcome | exiting | done

  const [typedProgress, setTypedProgress] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  // Track which boot lines are done
  const [bootLine, setBootLine] = useState(0);    // 0=typing line1, 1=line2 loading, 2=line3, 3=line4, 4=done
  const [line2Done, setLine2Done] = useState(false);
  const [line3Done, setLine3Done] = useState(false);
  const [line4Done, setLine4Done] = useState(false);

  // ── Refs for watchdog ──
  const phaseRef        = useRef(phase);
  const watchdogId      = useRef(null);
  const stageWatchdog   = useRef(null);
  const mountedRef      = useRef(true);
  const finishedRef     = useRef(false);
  const onFinishRef     = useRef(onFinish);
  const onExitStartRef  = useRef(onExitStart);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { onExitStartRef.current = onExitStart; }, [onExitStart]);

  // ── Force recovery ──
  const forceRecovery = useCallback((reason) => {
    if (finishedRef.current || !mountedRef.current) return;
    finishedRef.current = true;
    logRecovery('FORCE_RECOVERY', { reason, phase: phaseRef.current });
    try { onExitStartRef.current?.(); } catch (e) { /* ignore */ }
    setOverlayOpacity(0);
    setPhase('done');
    Promise.resolve().then(() => {
      try { onFinishRef.current?.(); } catch (e) { /* ignore */ }
    });
  }, []);

  const safeSetPhase = useCallback((nextPhase, source) => {
    if (finishedRef.current) return;
    logRecovery('PHASE_TRANSITION', { from: phaseRef.current, to: nextPhase, source });
    setPhase(nextPhase);
  }, []);

  // ── Phase timeline ──
  useEffect(() => {
    const t1  = setTimeout(() => safeSetPhase('morph',       'timeline'), T.MORPH_START);
    const t2  = setTimeout(() => safeSetPhase('identity',    'timeline'), _.IDENTITY);
    const t3  = setTimeout(() => safeSetPhase('reposition',  'timeline'), _.REPOSITION);
    const t4  = setTimeout(() => safeSetPhase('terminal',    'timeline'), _.TERMINAL);
    const t5  = setTimeout(() => safeSetPhase('boot',        'timeline'), _.BOOT1_START);
    const t6  = setTimeout(() => safeSetPhase('welcome',     'timeline'), _.WELCOME);
    const t7  = setTimeout(() => safeSetPhase('exiting',     'timeline'), _.EXITING);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7);
    };
  }, [safeSetPhase]);

  // ── Overlay fade on exit ──
  useEffect(() => {
    if (phase !== 'exiting') return;
    try { onExitStart?.(); } catch (e) { /* ignore */ }
    // Fade the overlay (background + terminal), but identity stays visible
    // via its own independent container outside this opacity
    setOverlayOpacity(0);
    const t = setTimeout(() => {
      setPhase('done');
    }, T.EXIT);
    return () => clearTimeout(t);
  }, [phase, onExitStart]);

  // ── onFinish when done ──
  useEffect(() => {
    if (phase !== 'done') return;
    finishedRef.current = true;
    const t = setTimeout(() => {
      try { onFinish?.(); } catch (e) { /* ignore */ }
    }, T.FINISH_BUFFER);
    return () => clearTimeout(t);
  }, [phase, onFinish]);

  // ── ASSET VALIDATION ──
  useEffect(() => {
    let cancelled = false;
    preloadLogo().then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        logRecovery('ASSET_FAIL', { asset: '/logo.webp' });
        forceRecovery('logo.webp failed to load');
      }
    });
    return () => { cancelled = true; };
  }, [forceRecovery]);

  // ── WATCHDOG 1: Total timeout ──
  useEffect(() => {
    watchdogId.current = setTimeout(() => {
      if (!finishedRef.current) {
        logRecovery('TOTAL_TIMEOUT', { phase: phaseRef.current, limit: `${WATCHDOG.TOTAL_MS}ms` });
        forceRecovery('total watchdog timeout');
      }
    }, WATCHDOG.TOTAL_MS);
    return () => { if (watchdogId.current) clearTimeout(watchdogId.current); };
  }, [forceRecovery]);

  // ── WATCHDOG 2: Per-stage ──
  useEffect(() => {
    if (finishedRef.current) return;
    const expected = (() => {
      switch (phase) {
        case 'logo':       return T.LOGO_INTRO + 1000;
        case 'morph':      return T.MORPH_DURATION + 1000;
        case 'identity':   return T.IDENTITY_HOLD + 1000;
        case 'reposition': return T.REPOSITION + 1000;
        case 'terminal':   return T.TERMINAL_IN + 1000;
        case 'boot':       return T.BOOT_LINE1 + T.BOOT_LINE2 + T.BOOT_LINE3 + T.BOOT_LINE4 + 2000;
        case 'welcome':    return T.WELCOME_HOLD + 1000;
        case 'exiting':    return T.EXIT + 1000;
        default:           return WATCHDOG.STAGE_TIMEOUT;
      }
    })();
    stageWatchdog.current = setTimeout(() => {
      if (finishedRef.current) return;
      logRecovery('STAGE_TIMEOUT', { phase: phaseRef.current, waited: `${expected}ms` });
      const nextPhase = {
        logo: 'morph', morph: 'identity', identity: 'reposition',
        reposition: 'terminal', terminal: 'boot', boot: 'welcome',
        welcome: 'exiting', exiting: 'done',
      }[phaseRef.current];
      if (nextPhase === 'exiting') {
        try { onExitStartRef.current?.(); } catch (e) { /* ignore */ }
        setOverlayOpacity(0); setPhase('exiting');
        setTimeout(() => {
          finishedRef.current = true; setPhase('done');
          Promise.resolve().then(() => { try { onFinishRef.current?.(); } catch (e) { /* ignore */ } });
        }, 700);
      } else if (nextPhase === 'done') {
        forceRecovery(`stage timeout at ${phaseRef.current}`);
      } else if (nextPhase) {
        safeSetPhase(nextPhase, 'stage-watchdog');
      }
    }, Math.min(expected, WATCHDOG.STAGE_TIMEOUT));
    return () => { if (stageWatchdog.current) clearTimeout(stageWatchdog.current); };
  }, [phase, forceRecovery, safeSetPhase]);

  // ── Boot line typing engine ──
  useEffect(() => {
    if (phase !== 'boot') return;

    // Phase 1: Type line 1 ("booting portfolio...") at slower, premium pace
    let charIdx = 0;
    const line1 = BOOT_LINES[0].text; // "booting portfolio..." — 18 chars
    let timer;

    const typeNext = () => {
      if (charIdx <= line1.length) {
        setBootLine(0);
        setTypedProgress(charIdx);
        charIdx++;
        // Slower typing for premium feel (~120-180ms per char)
        const nearEnd = line1.length - charIdx < 3 ? 160 : 120;
        const jitter = Math.random() * 40;
        timer = setTimeout(typeNext, nearEnd + jitter);
      } else {
        // Line 1 done — pause 200ms, then start line 2
        setBootLine(1);
        setTypedProgress(line1.length);

        timer = setTimeout(() => {
          // Line 2: Loading for 1.2s, then SUCCESS
          setLine2Done(true);
          setBootLine(2);

          timer = setTimeout(() => {
            // Line 3: Loading for 1.2s, then SUCCESS
            setLine3Done(true);
            setBootLine(3);

            timer = setTimeout(() => {
              // Line 4: Loading for 1.2s, then SUCCESS
              setLine4Done(true);
              setBootLine(4);
              setWelcomeVisible(true);
            }, T.BOOT_LINE4);
          }, T.BOOT_LINE3);
        }, 200); // 200ms pause after line 1 (per spec)
      }
    };

    // Initial delay before typing starts
    timer = setTimeout(typeNext, 200);

    // Cursor blink
    const blinkId = setInterval(() => setCursorVisible((p) => !p), 480);

    return () => {
      clearTimeout(timer);
      clearInterval(blinkId);
    };
  }, [phase]);

  // ── Cursor stops during exit ──
  useEffect(() => {
    if (phase === 'exiting' || phase === 'done') {
      setCursorVisible(false);
    }
  }, [phase]);

  // ── Mount ref cleanup ──
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      finishedRef.current = true;
    };
  }, []);

  // ── Derived state flags ──
  const isMorphing     = phase === 'morph';
  const isIdentityVis  = phase === 'identity' || phase === 'reposition' || phase === 'terminal' || phase === 'boot' || phase === 'welcome';
  const isRepositioned = phase === 'reposition' || phase === 'terminal' || phase === 'boot' || phase === 'welcome';
  const isTerminalVis  = phase === 'reposition' || phase === 'terminal' || phase === 'boot' || phase === 'welcome';
  const isTerminalFullyIn = phase === 'terminal' || phase === 'boot' || phase === 'welcome';
  const isExiting      = phase === 'exiting' || phase === 'done';

  const logoActive   = phase === 'logo' || isMorphing;
  const morphActive  = isMorphing;

  return (
    <>
      {/* ── Background + Terminal layer (fades via overlayOpacity during exit) ── */}
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-zinc-950 will-change-transform will-change-opacity"
        style={{
          zIndex: 9999,
          opacity: overlayOpacity,
          transition: `opacity ${T.EXIT}ms ${EASE.PREMIUM}`,
          pointerEvents: 'none',
        }}
      >
        <BackgroundEffects />

        {/* Stage 1: Logo Intro */}
        {logoActive && !morphActive && <LogoAnimation active={true} />}

        {/* Stage 2: Logo → Identity */}
        {morphActive && <LogoMorph active={true} />}

        {/* Stage 5-8: Terminal */}
        {(isTerminalVis || isExiting) && (
          <TerminalSequence
            visible={isTerminalFullyIn}
            exiting={isExiting}
            bootLine={bootLine}
            typedProgress={typedProgress}
            cursorVisible={cursorVisible}
            welcomeVisible={welcomeVisible}
            line2Done={line2Done}
            line3Done={line3Done}
            line4Done={line4Done}
          />
        )}
      </div>

      {/* ── Identity layer (independent — stays visible during exit for shared element transition) ── */}
      {(isMorphing || isIdentityVis || isExiting) && (
        <div className="fixed will-change-transform"
          style={{
            top: '50%',
            left: '50%',
            zIndex: 10000,
            pointerEvents: 'none',
            transform: isExiting
              ? 'translate(-50%, calc(-50% - 33vh))'
              : 'translate(-50%, -50%)',
            transition: isReduced ? 'none' : `transform ${T.EXIT}ms ${EASE.PREMIUM}`,
          }}
        >
          <IdentityReveal
            visible={true}
            repositioned={isRepositioned && !isExiting}
            exiting={isExiting}
          />
        </div>
      )}
    </>
  );
}
