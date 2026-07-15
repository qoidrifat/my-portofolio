import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { profile, projects } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINEERING INTRODUCTION
//
// Architecture overview:
//
//   PortfolioIntro
//     ├─ ReducedMotionIntro   (prefers-reduced-motion: ~1s, opacity only)
//     └─ CinematicIntro       (full 5–6s cinematic sequence)
//           ├─ BackgroundEffects (ambient gradients + particles + noise)
//           ├─ LogoAnimation     (Stage 1: mask-reveal in)
//           ├─ LogoMorph         (Stage 2: dissolve upward)
//           ├─ IdentityReveal    (Stage 3–4: name + subtitle, reposition)
//           └─ TerminalSequence  (Stage 5–7: glass terminal with typing engine)
//
// Orchestration: single `phase` state machine driven by computed OFFSET constants.
// All timing is derived from the TERMINAL_SCRIPT length — no hardcoded ms values.
// The watchdog is a SAFETY NET only, never a scheduler.
//
// Key principles:
//   • Every timing constant flows from a single source of truth
//   • No self-referencing objects (avoids TDZ)
//   • No interval-driven state (uses chained setTimeout)
//   • GPU-only animation properties (transform, opacity, filter)
//   • Production logging is silent except genuine recovery events
//   • Skip is idempotent — safe to call at any phase
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Timing Constants (milliseconds)
//
// All values are tuned for a 5–6 second total timeline:
//   Logo (800) → Morph (400) → Identity (250) → Reposition (450)
//   → Terminal in (350) → Typing (~1600) → Welcome (300) → Exit (600)
//   ≈ 4750ms total → ~5.3s with overlaps and animation tails.
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  LOGO_HOLD      : 800,
  MORPH_DURATION : 400,
  IDENTITY_HOLD  : 250,
  REPOSITION     : 450,
  TERMINAL_LEAD  : 150,
  TERMINAL_IN    : 350,
  TYPE_SPEED     : 35,
  TYPE_START     : 50,
  OUTPUT_DELAY   : 80,
  LINE_GAP       : 120,
  WELCOME_HOLD   : 300,
  EXIT           : 600,
  SKIP_EXIT      : 350,
  FINISH_BUFFER  : 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Script — real data, no fake loading.
// Each command's typing duration is computed from its actual text length,
// so the OFFSET constants are always in sync with the typing engine.
// ─────────────────────────────────────────────────────────────────────────────
const TERMINAL_SCRIPT = [
  { cmd: 'whoami',   output: `${profile.name} — Full Stack Developer · AI Enthusiast` },
  { cmd: 'stack',    output: 'React · Laravel · Python · TensorFlow · Node.js' },
  { cmd: 'projects', output: `${projects.length} case studies loaded` },
  { cmd: 'status',   output: 'READY', badge: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// Derived Timeline Offsets — every value is COMPUTED, never hardcoded.
// The bootMs is calculated from the actual script text, scaling automatically
// if commands are added, removed, or changed.
// ─────────────────────────────────────────────────────────────────────────────
const OFFSET = (() => {
  const morph      = T.LOGO_HOLD;                                   // 800
  const identity   = morph + T.MORPH_DURATION;                      // 1200
  const reposition = identity + T.IDENTITY_HOLD;                    // 1450
  const terminal   = reposition + T.REPOSITION - T.TERMINAL_LEAD;   // 1750
  const boot       = terminal + T.TERMINAL_IN;                      // 2100
  const bootMs     = TERMINAL_SCRIPT.reduce(
    (sum, line) => sum + T.TYPE_START + line.cmd.length * T.TYPE_SPEED + T.OUTPUT_DELAY + T.LINE_GAP,
    0
  );                                                                 // ~1580
  return {
    morph, identity, reposition, terminal, boot, bootMs,
    expectedWelcome : boot + bootMs,                                // ~3680
    expectedDone    : boot + bootMs + T.WELCOME_HOLD + T.EXIT,      // ~4580
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// Watchdog Safety Constants
//
// The watchdog is a SAFETY NET, not a scheduler. It only activates when the
// intro is genuinely stuck (dropped timer, background-tab throttling, crash).
//
// Strategy:
//   • One global timeout at expectedDone + generous margin.
//     If the intro hasn't completed by this point, force-exit.
//   • No per-stage watchdog — the phase-transition effects are simpler and
//     more reliable without stage-level supervision. The total timeout
//     covers all failure modes without risking false-positive interruptions.
//
// The STALL_MARGIN accounts for Chrome background-tab throttling (1s min) plus
// general runtime variability. At 3s it's generous enough for any reasonable
// delay but tight enough that a truly stuck intro recovers quickly.
// ─────────────────────────────────────────────────────────────────────────────
const STALL_MARGIN   = 3000;
const ASSET_TIMEOUT  = 5000;
const WATCHDOG_TOTAL = OFFSET.expectedDone + STALL_MARGIN;

/** Exported so App.jsx can derive its nuclear fail-safe from the real timeline. */
export const INTRO_MAX_MS = WATCHDOG_TOTAL;
export const INTRO_SESSION_KEY = 'qr-intro-played';

export function hasIntroPlayed() {
  if (import.meta.env.DEV && import.meta.env.VITE_INTRO_REPLAY === 'true') return false;
  try { return sessionStorage.getItem(INTRO_SESSION_KEY) === '1'; } catch { return false; }
}

function markIntroPlayed() {
  try { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); } catch { /* private browsing */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium Easing Curves
// ─────────────────────────────────────────────────────────────────────────────
const EASE = {
  PREMIUM : 'cubic-bezier(0.22, 1, 0.36, 1)',
  SNAP    : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  SMOOTH  : 'cubic-bezier(0.16, 1, 0.3, 1)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Content Constants
// ─────────────────────────────────────────────────────────────────────────────
const NAME     = profile.name;
const SUBTITLE = 'Full Stack Developer  •  AI Enthusiast';

const PHASE_ORDER = ['logo', 'morph', 'identity', 'reposition', 'terminal', 'boot', 'welcome', 'exiting', 'done'];
const phaseIndex = (p) => PHASE_ORDER.indexOf(p);

/** How far the identity rises (px) when it repositions above the terminal. */
const REPOSITION_RISE = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Reduced Motion Detection — evaluated once
// ─────────────────────────────────────────────────────────────────────────────
const isReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Production-safe logging ─────────────────────────────────────────────────
// DEV: verbose, styled console output for debugging.
// PROD: COMPLETELY SILENT — no console.log/warn/error unless a genuine
// error recovery event occurs (logo load failure, watchdog force-exit).
function logIntro(event, details, { prodError = false } = {}) {
  if (import.meta.env.DEV) {
    console.info(`%c[Intro] ${event}`, 'color: #3b82f6; font-weight: 600;', details ?? '');
  } else if (prodError) {
    console.error(`[Intro] ${event}`, JSON.stringify(details ?? {}));
  }
}

// ── Asset Preloading ─────────────────────────────────────────────────────────
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
    setTimeout(() => onDone(false), ASSET_TIMEOUT);
    img.src = '/logo.webp';
  });
}

// ── FLIP measurement ────────────────────────────────────────────────────────
// Reads the hero name's viewport position so the intro identity can animate
// to exactly where the hero H1 is on the page.
function measureHeroTarget() {
  const el = typeof document !== 'undefined' && document.getElementById('hero-name');
  if (!el) return null;
  let top = 0;
  let node = el;
  while (node instanceof HTMLElement) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  top -= window.scrollY;
  const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
  if (!fontSize || !el.offsetHeight) return null;
  return { top, height: el.offsetHeight, fontSize };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BackgroundEffects — ambient gradient + particles + noise vignette
//
// Performance characteristics:
//   • 3 gradient orbs with moderate blur (60–120px) — composited via GPU
//   • ≤12 particles on mobile / ≤18 on desktop — CSS-only animations
//   • SVG noise overlay at 0.015 opacity — single composite layer
//   • All animations use transform/opacity only
// ═══════════════════════════════════════════════════════════════════════════════
const BackgroundEffects = memo(function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-zinc-950" />
      {/* Ambient blue glow — center */}
      <div
        className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(120px)',
          animation: isReduced ? 'none' : 'bgBreathe 8s ease-in-out infinite',
          willChange: 'opacity, transform',
        }}
      />
      {/* Ambient indigo glow — top-right */}
      <div
        className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: isReduced ? 'none' : 'bgBreathe2 10s ease-in-out infinite',
          willChange: 'opacity, transform',
        }}
      />
      {/* Ambient cyan glow — bottom-left */}
      <div
        className="absolute bottom-[25%] left-[10%] w-[350px] h-[350px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: isReduced ? 'none' : 'bgBreathe3 12s ease-in-out infinite',
          willChange: 'opacity, transform',
        }}
      />
      {!isReduced && <FloatingParticles />}
      {/* Vignette overlay */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
});

// ── Adaptive particle count: ≤12 on mobile, ≤18 on desktop ────────────────
const PARTICLE_COUNT =
  typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 18;

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
        <div
          key={p.id}
          className="absolute rounded-full will-change-transform"
          style={{
            left: `${p.left}%`,
            bottom: '-6px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(147,197,253,0.4)',
            boxShadow: '0 0 4px rgba(147,197,253,0.15)',
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ${p.delay}s cubic-bezier(0.25,0.46,0.45,0.94) infinite`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// LogoAnimation — Stage 1
//
// Premium mask reveal: opacity + blur + scale + gentle rise.
// No rotation — gimmicky spinning undermines engineering credibility.
// Reference quality: Apple keynote, Vercel, Linear.
// ═══════════════════════════════════════════════════════════════════════════════
const LogoAnimation = memo(function LogoAnimation({ active }) {
  if (!active) return null;
  return (
    <div className="flex flex-col items-center absolute" style={{ pointerEvents: 'none' }}>
      <div className="relative flex items-center justify-center">
        {/* Soft glow halo */}
        <div
          className="absolute -inset-14 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Premium reveal — elegant draw/scale-in effect */}
        <div
          style={isReduced ? {} : {
            animation: `logoRevealIn 550ms ${EASE.PREMIUM} forwards`,
            opacity: 0,
            transform: 'scale(0.92) translateY(14px)',
            filter: 'blur(14px)',
            willChange: 'transform, opacity, filter',
          }}
        >
          <img
            src="/logo.webp"
            alt=""
            className="relative w-[76px] h-auto md:w-[92px]"
          />
        </div>
      </div>
    </div>
  );
});

// ── Two-frame mount flip ───────────────────────────────────────────────────
// First paint renders the "from" pose; next frame flips to the "to" pose
// so the CSS transition genuinely plays. Uses rAF + timer fallback.
function useMountFlip() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const timer = setTimeout(() => setMounted(true), 50);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);
  return mounted || isReduced;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LogoMorph — Stage 2: Logo → Identity transition
// Logo dissolves upward (scale + blur) while identity crossfades in beneath.
// ═══════════════════════════════════════════════════════════════════════════════
const LogoMorph = memo(function LogoMorph() {
  const active = useMountFlip();
  return (
    <div
      className="flex flex-col items-center absolute"
      style={{
        opacity: active ? 0 : 1,
        filter: active ? 'blur(6px)' : 'blur(0px)',
        transform: active ? 'scale(0.7) translateY(-28px)' : 'scale(1) translateY(0)',
        transition: isReduced
          ? 'none'
          : `opacity ${T.MORPH_DURATION}ms ${EASE.PREMIUM}, filter ${T.MORPH_DURATION}ms ${EASE.PREMIUM}, transform ${T.MORPH_DURATION}ms ${EASE.PREMIUM}`,
        pointerEvents: 'none',
        willChange: 'transform, opacity, filter',
      }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute -inset-14 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
        />
        <img src="/logo.webp" alt="" className="relative w-[76px] h-auto md:w-[92px]" />
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// IdentityReveal — Stage 3–4 + Exit
//
// Manages the name + subtitle through three visual states:
//   1. Entrance: fades in beneath the dissolving logo
//   2. Reposition: translates upward to make room for terminal
//   3. Exit: FLIP-transforms toward the hero H1 position
//
// All animations use transform/opacity (GPU) — never animates font-size.
// ═══════════════════════════════════════════════════════════════════════════════
const IdentityReveal = memo(function IdentityReveal({ visible, repositioned, exiting, exitMs, exitScale, h1Ref }) {
  const mounted = useMountFlip();
  const shown = visible && mounted;
  const yOffset = repositioned ? `-${REPOSITION_RISE}px` : '0';

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{
        opacity: shown ? 1 : 0,
        filter: shown ? 'blur(0px)' : 'blur(8px)',
        transform: shown
          ? `translateY(${yOffset}) scale(1)`
          : 'translateY(20px) scale(0.95)',
        transition: isReduced
          ? 'none'
          : exiting
            ? `transform ${exitMs}ms ${EASE.PREMIUM}`
            : repositioned
              ? `transform ${T.REPOSITION}ms ${EASE.PREMIUM}`
              : `opacity 600ms ${EASE.PREMIUM}, filter 600ms ${EASE.PREMIUM}, transform 600ms ${EASE.SNAP}`,
        pointerEvents: 'none',
        willChange: 'transform, opacity, filter',
      }}
    >
      <h1
        ref={h1Ref}
        className="text-center leading-none tracking-tight"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 300,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: '#ffffff',
          letterSpacing: '-0.02em',
          // FLIP exit: scale toward the hero name's real size, crossfade out
          transform: exiting ? `scale(${exitScale})` : 'scale(1)',
          opacity: exiting ? 0 : 1,
          transition: isReduced
            ? 'none'
            : exiting
              ? `transform ${exitMs}ms ${EASE.PREMIUM}, opacity ${Math.round(exitMs * 0.6)}ms ${EASE.SMOOTH} ${Math.round(exitMs * 0.4)}ms`
              : 'none',
          textShadow: exiting ? '0 0 60px rgba(59,130,246,0.12)' : 'none',
          willChange: exiting ? 'transform, opacity' : 'auto',
        }}
      >
        {NAME}
      </h1>
      <p
        className="text-center mt-4 md:mt-5"
        style={{
          opacity: exiting ? 0 : 1,
          transform: `scale(${exiting ? 0.8 : 1})`,
          transition: isReduced
            ? 'none'
            : `opacity ${T.REPOSITION}ms ${EASE.PREMIUM}, transform ${T.REPOSITION}ms ${EASE.PREMIUM}`,
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

// ═══════════════════════════════════════════════════════════════════════════════
// StatusBadge — green READY pill (final terminal output)
// Premium pop entrance with spring-like easing.
// ═══════════════════════════════════════════════════════════════════════════════
const StatusBadge = memo(function StatusBadge({ children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
      style={{
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.2)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'rgba(52,211,153,0.9)',
        textShadow: '0 0 12px rgba(52,211,153,0.15)',
        animation: isReduced ? 'none' : 'successBadgeIn 350ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        opacity: 0,
        transform: 'scale(0.85)',
      }}
    >
      {children}
    </span>
  );
});

// ── Cursor — CSS-driven blink (zero React re-renders) ─────────────────────
const Cursor = memo(function Cursor() {
  return (
    <span
      className="inline-block align-middle ml-[1px]"
      style={{
        width: '2px',
        height: '1.1em',
        background: 'rgba(96,165,250,0.55)',
        boxShadow: '0 0 6px rgba(59,130,246,0.25)',
        animation: isReduced ? 'none' : 'cursorBlink 1s linear infinite',
      }}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TerminalSequence — Stage 5–7
//
// Glassmorphic terminal card with authentic typing animation.
// All four terminal commands are displayed simultaneously as they are typed.
//
// Typography:
//   • Font: JetBrains Mono (self-hosted) at 11–13px (clamp 0.6875rem – 0.8125rem)
//   • Line height: 1.9 for comfortable reading
//   • Prompt prefix: `>` in muted blue
//   • Command text: bright white
//   • Output text: muted zinc
//   • Badge output: green READY pill
// ═══════════════════════════════════════════════════════════════════════════════
const TerminalSequence = memo(function TerminalSequence({ visible, exiting, exitMs, term }) {
  return (
    <div
      className="flex items-center justify-center select-none absolute"
      aria-hidden="true"
      style={{
        opacity: exiting ? 0 : visible ? 1 : 0,
        filter: exiting ? 'blur(12px)' : visible ? 'blur(0px)' : 'blur(14px)',
        transform: exiting
          ? 'translateY(30px) scale(0.88)'
          : visible
            ? 'translateY(0) scale(1)'
            : 'translateY(28px) scale(0.94)',
        transition: isReduced
          ? 'none'
          : exiting
            ? `opacity ${exitMs}ms ${EASE.PREMIUM}, filter ${exitMs}ms ${EASE.PREMIUM}, transform ${exitMs}ms ${EASE.PREMIUM}`
            : `opacity ${T.TERMINAL_IN}ms ${EASE.PREMIUM}, filter ${T.TERMINAL_IN}ms ${EASE.PREMIUM}, transform ${T.TERMINAL_IN}ms ${EASE.SNAP}`,
        pointerEvents: 'none',
        marginTop: 'clamp(110px, 13vh, 150px)',
        willChange: 'transform, opacity, filter',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: 'min(460px, 86vw)',
          borderRadius: '22px',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(9, 9, 11, 0.55)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Terminal window controls */}
        <div className="flex items-center gap-[7px] px-5 pt-3.5 pb-2.5">
          <div className="w-[9px] h-[9px] rounded-full bg-red-500/35" />
          <div className="w-[9px] h-[9px] rounded-full bg-yellow-500/35" />
          <div className="w-[9px] h-[9px] rounded-full bg-green-500/35" />
        </div>

        {/* Terminal output */}
        <div
          className="px-5 pb-5 pt-1.5"
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 'clamp(0.6875rem, 1.2vw, 0.8125rem)',
            lineHeight: 1.9,
            color: 'rgba(212, 212, 216, 0.82)',
            minHeight: `${TERMINAL_SCRIPT.length * 2 * 1.9}em`,
          }}
        >
          {TERMINAL_SCRIPT.map((line, idx) => {
            if (idx > term.line) return null;
            const typedText = idx < term.line ? line.cmd : line.cmd.slice(0, term.typed);
            const outputVisible = idx < term.outputs;
            const isActiveLine = idx === term.line && !outputVisible;

            return (
              <div key={idx}>
                {/* Command line */}
                <div className="flex items-start gap-2.5">
                  <span
                    className="shrink-0"
                    style={{ width: '1.4em', textAlign: 'center', color: 'rgba(96,165,250,0.55)' }}
                  >
                    &gt;
                  </span>
                  <span style={{ color: 'rgba(212,212,216,0.85)' }}>
                    {typedText}
                    {isActiveLine && <Cursor />}
                  </span>
                </div>
                {/* Output line */}
                {outputVisible && (
                  <div
                    style={{
                      paddingLeft: 'calc(1.4em + 0.625rem)',
                      color: line.badge ? undefined : 'rgba(161,161,170,0.75)',
                      animation: isReduced ? 'none' : 'fadeInUp 350ms cubic-bezier(0.22,1,0.36,1) forwards',
                      opacity: 0,
                    }}
                  >
                    {line.badge ? <StatusBadge>{line.output}</StatusBadge> : line.output}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// ── Scroll lock hook ────────────────────────────────────────────────────────
// Prevents background scrolling while the intro overlay is active.
// Triple-redundant release:
//   1. Effect cleanup on unmount (normal path)
//   2. App.jsx restores overflow after introDone (second layer)
//   3. Hard deadline in this hook (WATCHDOG_TOTAL + 2s) as final safety net
function useIntroScrollLock() {
  useEffect(() => {
    const unlock = () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const deadline = setTimeout(unlock, WATCHDOG_TOTAL + 2000);
    return () => { clearTimeout(deadline); unlock(); };
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReducedMotionIntro — Accessibility fast path
//
// When the user has `prefers-reduced-motion: reduce`:
//   • Shows name + subtitle immediately
//   • Fades out within ~1 second
//   • No animations, no particles, no cinematic sequence
// ═══════════════════════════════════════════════════════════════════════════════
function ReducedMotionIntro({ onFinish, onExitStart }) {
  const [fading, setFading] = useState(false);
  useIntroScrollLock();

  useEffect(() => {
    const tExit = setTimeout(() => {
      markIntroPlayed();
      try { onExitStart?.(); } catch { /* ignore */ }
      setFading(true);
    }, 600);
    const tDone = setTimeout(() => {
      try { onFinish?.(); } catch { /* ignore */ }
    }, 950);
    return () => { clearTimeout(tExit); clearTimeout(tDone); };
  }, [onFinish, onExitStart]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950"
      style={{ zIndex: 9999, opacity: fading ? 0 : 1, transition: 'opacity 350ms ease' }}
    >
      <span className="sr-only" role="status" aria-live="polite">Loading portfolio…</span>
      <h1
        aria-hidden="true"
        className="text-center leading-none tracking-tight"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 300,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: '#fff',
          letterSpacing: '-0.02em',
        }}
      >
        {NAME}
      </h1>
      <p
        aria-hidden="true"
        className="text-center mt-4"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 400,
          fontSize: 'clamp(0.8rem, 1.8vw, 1.05rem)',
          color: 'rgba(161,161,170,0.75)',
        }}
      >
        {SUBTITLE}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CinematicIntro — Main Orchestrator
//
// Architecture: a single `phase` state machine with event-driven transitions.
//
//   Phase flow:
//     logo ──[timeline]──→ morph ──→ identity ──→ reposition ──→ terminal ──→ boot
//     boot ──[typing done]──→ welcome
//     welcome ──[WELCOME_HOLD]──→ exiting
//     exiting ──[EXIT]──→ done ──[FINISH_BUFFER]──→ onFinish()
//
//   Skip path (any phase):
//     Any phase ──[click/ESC/button]──→ exiting (skip mode) ──[SKIP_EXIT]──→ done
//
//   Watchdog recovery path:
//     Any phase (stalled) ──[global timeout]──→ forceRecovery() ──→ done
//
// Key engineering decisions:
//   • No per-stage watchdog — only one global safety timeout.
//     Eliminates false-positive interruptions and console spam.
//   • All timing constants are derived from TERMINAL_SCRIPT length.
//   • beginExit() is idempotent — safe to call multiple times.
//   • Identity container renders independently from the overlay,
//     enabling a true shared-element FLIP transition.
//   • Scroll lock releases the moment exit begins, not when it finishes.
// ═══════════════════════════════════════════════════════════════════════════════
function CinematicIntro({ onFinish, onExitStart }) {
  const [phase, setPhase] = useState('logo');
  useIntroScrollLock();

  // Terminal state
  const [term, setTerm] = useState({ line: 0, typed: 0, outputs: 0 });
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [exitFast, setExitFast] = useState(false);

  // ── Refs ──
  const phaseRef        = useRef(phase);
  const watchdogId      = useRef(null);
  const mountedRef      = useRef(true);
  const finishedRef     = useRef(false);
  const exitStartedRef  = useRef(false);
  const onFinishRef     = useRef(onFinish);
  const onExitStartRef  = useRef(onExitStart);
  const identityH1Ref   = useRef(null);
  const flipRef         = useRef(null);
  const preExitPhaseRef = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { onExitStartRef.current = onExitStart; }, [onExitStart]);

  // ── Force recovery (emergency only) ──
  const forceRecovery = useCallback((reason) => {
    if (finishedRef.current || !mountedRef.current) return;
    finishedRef.current = true;
    exitStartedRef.current = true;
    preExitPhaseRef.current = phaseRef.current;
    markIntroPlayed();
    logIntro('FORCE_RECOVERY', { reason, phase: phaseRef.current }, { prodError: true });
    try { onExitStartRef.current?.(); } catch { /* ignore */ }
    setOverlayOpacity(0);
    setPhase('done');
    Promise.resolve().then(() => {
      try { onFinishRef.current?.(); } catch { /* ignore */ }
    });
  }, []);

  // ── Safe phase transition ──
  const safeSetPhase = useCallback((nextPhase, source) => {
    if (finishedRef.current || exitStartedRef.current) return;
    logIntro('→', { from: phaseRef.current, to: nextPhase, source });
    setPhase(nextPhase);
  }, []);

  // ── beginExit — idempotent, the ONLY path into 'exiting'. ──
  // Measures the hero name position (FLIP) right before leaving so the
  // intro identity travels to exactly where the hero H1 occupies.
  const beginExit = useCallback((source, fast = false) => {
    if (exitStartedRef.current || finishedRef.current) return;
    exitStartedRef.current = true;
    preExitPhaseRef.current = phaseRef.current;
    markIntroPlayed();
    logIntro('EXIT', { source, fast });

    const target = measureHeroTarget();
    const h1 = identityH1Ref.current;
    if (target && h1) {
      const rect = h1.getBoundingClientRect();
      const currentCenter = rect.top + rect.height / 2;
      const targetCenter  = target.top + target.height / 2;
      const innerReturn = ['reposition', 'terminal', 'boot', 'welcome'].includes(phaseRef.current) ? REPOSITION_RISE : 0;
      const currentFont = parseFloat(window.getComputedStyle(h1).fontSize) || 48;
      flipRef.current = {
        y: targetCenter - currentCenter - innerReturn,
        scale: Math.min(2.5, Math.max(0.5, target.fontSize / currentFont)),
      };
    } else {
      flipRef.current = null;
    }

    setExitFast(fast);
    try { onExitStartRef.current?.(); } catch { /* ignore */ }
    setOverlayOpacity(0);
    setPhase('exiting');
  }, []);

  const skipIntro = useCallback(() => beginExit('skip', true), [beginExit]);

  // ── Skip via Escape key ──
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') skipIntro(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skipIntro]);

  // ── Phase timeline (logo → boot) ──
  useEffect(() => {
    const timers = [
      setTimeout(() => safeSetPhase('morph',      'tl'), OFFSET.morph),
      setTimeout(() => safeSetPhase('identity',   'tl'), OFFSET.identity),
      setTimeout(() => safeSetPhase('reposition', 'tl'), OFFSET.reposition),
      setTimeout(() => safeSetPhase('terminal',   'tl'), OFFSET.terminal),
      setTimeout(() => safeSetPhase('boot',       'tl'), OFFSET.boot),
    ];
    return () => timers.forEach(clearTimeout);
  }, [safeSetPhase]);

  // ── Typing engine — drives boot → welcome on ACTUAL completion ──
  useEffect(() => {
    if (phase !== 'boot') return;
    let cancelled = false;
    let timer;

    const typeLine = (i) => {
      let c = 0;
      const step = () => {
        if (cancelled) return;
        c++;
        setTerm({ line: i, typed: c, outputs: i });
        if (c < TERMINAL_SCRIPT[i].cmd.length) {
          timer = setTimeout(step, T.TYPE_SPEED + (Math.random() * 16 - 8));
        } else {
          timer = setTimeout(() => {
            if (cancelled) return;
            setTerm({ line: i, typed: c, outputs: i + 1 });
            if (i + 1 < TERMINAL_SCRIPT.length) {
              timer = setTimeout(() => { if (!cancelled) typeLine(i + 1); }, T.LINE_GAP);
            } else {
              timer = setTimeout(() => { if (!cancelled) safeSetPhase('welcome', 'boot'); }, T.LINE_GAP);
            }
          }, T.OUTPUT_DELAY);
        }
      };
      timer = setTimeout(step, T.TYPE_START);
    };

    typeLine(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, safeSetPhase]);

  // ── welcome → exiting after hold ──
  useEffect(() => {
    if (phase !== 'welcome') return;
    const t = setTimeout(() => beginExit('timeline'), T.WELCOME_HOLD);
    return () => clearTimeout(t);
  }, [phase, beginExit]);

  // ── exiting → done (releases scroll immediately) ──
  useEffect(() => {
    if (phase !== 'exiting') return;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    const t = setTimeout(() => setPhase('done'), exitFast ? T.SKIP_EXIT : T.EXIT);
    return () => clearTimeout(t);
  }, [phase, exitFast]);

  // ── onFinish when done ──
  useEffect(() => {
    if (phase !== 'done') return;
    if (finishedRef.current) return;
    finishedRef.current = true;
    const t = setTimeout(() => {
      try { onFinishRef.current?.(); } catch { /* ignore */ }
    }, T.FINISH_BUFFER);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Asset validation ──
  useEffect(() => {
    let cancelled = false;
    preloadLogo().then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        logIntro('ASSET_FAIL', { asset: '/logo.webp' }, { prodError: true });
        forceRecovery('logo.webp failed to load');
      }
    });
    return () => { cancelled = true; };
  }, [forceRecovery]);

  // ── WATCHDOG: single total timeout ──
  // The ONLY watchdog. Checks that the entire intro completes within the
  // computed expected time + generous margin for background-tab throttling.
  // No per-stage watchdog — phase transitions are reliable enough that
  // stage-level supervision adds complexity without benefit, and was a
  // source of false-positive interruptions in earlier versions.
  useEffect(() => {
    watchdogId.current = setTimeout(() => {
      if (!finishedRef.current) {
        logIntro('WATCHDOG', { phase: phaseRef.current }, { prodError: true });
        forceRecovery('watchdog timeout');
      }
    }, WATCHDOG_TOTAL);
    return () => { if (watchdogId.current) clearTimeout(watchdogId.current); };
  }, [forceRecovery]);

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
  const isIdentityVis  = ['identity', 'reposition', 'terminal', 'boot', 'welcome'].includes(phase);
  const isRepositioned = ['reposition', 'terminal', 'boot', 'welcome'].includes(phase);
  const isTerminalFullyIn = ['terminal', 'boot', 'welcome'].includes(phase);
  const isExiting      = phase === 'exiting' || phase === 'done';

  const logoActive   = phase === 'logo';
  const exitMs       = exitFast ? T.SKIP_EXIT : T.EXIT;

  const exitTransform = flipRef.current
    ? `translate(-50%, calc(-50% + ${Math.round(flipRef.current.y)}px))`
    : 'translate(-50%, calc(-50% - 33vh))';
  const exitScale = flipRef.current ? flipRef.current.scale : 1.4;

  const identityWasRevealed = phaseIndex(preExitPhaseRef.current ?? phase) >= phaseIndex('identity');

  return (
    <>
      {/* ── Background + Terminal overlay ── */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-zinc-950"
        onClick={isExiting ? undefined : skipIntro}
        style={{
          zIndex: 9999,
          opacity: overlayOpacity,
          transition: `opacity ${exitMs}ms ${EASE.PREMIUM}`,
          pointerEvents: isExiting ? 'none' : 'auto',
          cursor: isExiting ? 'default' : 'pointer',
          willChange: 'opacity',
        }}
      >
        <span className="sr-only" role="status" aria-live="polite">
          Loading {NAME}&apos;s portfolio. Press Escape or click to skip.
        </span>

        <div aria-hidden="true" className="contents">
          <BackgroundEffects />

          {logoActive && <LogoAnimation active={true} />}
          {isMorphing && <LogoMorph />}

          {(isRepositioned || isExiting) && (
            <TerminalSequence
              visible={isTerminalFullyIn}
              exiting={isExiting}
              exitMs={exitMs}
              term={term}
            />
          )}
        </div>

        {/* Skip button — appears IMMEDIATELY, no delay.
            Center-bottom position, semi-transparent, glass-styled.
            Visible at all times so users never feel trapped. */}
        {!isExiting && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
            style={{
              pointerEvents: 'auto',
              animation: isReduced ? 'none' : 'fadeInUp 400ms cubic-bezier(0.22,1,0.36,1) 200ms forwards',
              opacity: isReduced ? 1 : 0,
            }}
          >
            {/* Click hint — subtle arrow + text */}
            <span
              className="text-zinc-600 text-[10px] font-medium uppercase tracking-[0.15em]"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                animation: isReduced ? 'none' : 'fadeInUp 400ms cubic-bezier(0.22,1,0.36,1) 400ms forwards',
                opacity: 0,
              }}
            >
              Tap anywhere to skip
            </span>

            {/* Skip pill */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); skipIntro(); }}
              aria-label="Skip intro animation"
              className="group px-5 py-2.5 rounded-full border border-white/8 bg-white/[0.04] text-zinc-500 hover:text-white hover:bg-white/[0.08] hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500/60 transition-all duration-300 backdrop-blur-sm"
              style={{
                fontSize: '12px',
                letterSpacing: '0.06em',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Skip intro{' '}
              <kbd className="ml-1.5 px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                Esc
              </kbd>
            </button>
          </div>
        )}
      </div>

      {/* ── Identity layer (independent — shared-element exit to hero H1) ── */}
      {(isMorphing || isIdentityVis || (isExiting && identityWasRevealed)) && (
        <div
          className="fixed"
          aria-hidden="true"
          style={{
            top: '50%',
            left: '50%',
            zIndex: 10000,
            pointerEvents: 'none',
            transform: isExiting ? exitTransform : 'translate(-50%, -50%)',
            transition: isReduced ? 'none' : `transform ${exitMs}ms ${EASE.PREMIUM}`,
            willChange: 'transform',
          }}
        >
          <IdentityReveal
            visible={true}
            repositioned={isRepositioned && !isExiting}
            exiting={isExiting}
            exitMs={exitMs}
            exitScale={exitScale}
            h1Ref={identityH1Ref}
          />
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PortfolioIntro — entry point
// ═══════════════════════════════════════════════════════════════════════════════
export default function PortfolioIntro(props) {
  return isReduced
    ? <ReducedMotionIntro {...props} />
    : <CinematicIntro {...props} />;
}
