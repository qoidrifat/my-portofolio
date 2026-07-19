import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { profile } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// PortfolioTerminal — macOS Sonoma-style premium terminal for the intro
//
// Design language: Apple HIG + macOS Sonoma + Linear Motion + Vercel Minimalism.
// The terminal plays a workstation-boot narrative:
//
//   > boot portfolio
//   ✔ Initializing Workspace   ✔ Connecting GitHub   ✔ Loading Projects
//   ✔ Loading Experience       ✔ Loading AI Stack
//   System Ready.
//   > whoami
//   Qoid Rif'at — Full Stack Developer • AI Enthusiast
//   Launching Portfolio...
//
// Premium motion principles:
//   • Human typing simulation — per-character rhythm: spaces faster, capitals
//     slower, word-start hesitation, extra pauses after periods, ±7ms jitter.
//   • Task lifecycle per check line: ○ (queued, gray) → label typed → macOS
//     spinner (500ms) → ✔ morph (scale 0.8 → 1.05 → 1) → color settle.
//   • Cursor: ▌ block. Solid while typing, soft sinusoidal blink while idle
//     (700ms per half-cycle), frozen at the very end. Micro-step transform on
//     each keystroke — translateX only, never `left`.
//   • Feedback is motion-only: shadow bumps on success, an 80ms glow on
//     Experience, a soft pulse on AI Stack, +2% brightness at launch.
//
// Architecture:
//   • usePremiumTyping() — reusable async-timeline hook. One controller per
//     run; every sleep registers its timer; cancellation rejects with a
//     sentinel so no timer survives unmount and no state is set after cancel.
//   • Single `ui` state object — each timeline event patches atomically.
//   • TERMINAL_TOTAL_MS is COMPUTED from the same pacing tables the engine
//     uses, so the parent watchdog scales automatically with any change.
//   • GPU-only animation properties (transform, opacity, filter). The line
//     "scroll bump" uses WAAPI on a ref — no remounts, no layout.
//   • The body reserves its full final height up front — zero layout shift.
//   • `staticMode` renders the finished state instantly (reduced motion).
//
// The PARENT (PortfolioIntro) owns entrance/exit transforms and skip handling;
// this component owns only the internal typing/check sequence.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Typing speeds (ms per character, before human modifiers) ────────────────
const SPEED = {
  CMD    : 34,   // shell commands (28–40ms band after jitter)
  TASK   : 25,   // check labels (22–28ms band)
  READY  : 35,   // "System Ready."
  LAUNCH : 30,   // "Launching Portfolio..."
};

// ── Pacing constants (milliseconds) ─────────────────────────────────────────
const PACE = {
  PROMPT_HOLD    : 600,   // blinking cursor at empty prompt before typing
  CMD_SETTLE     : 300,   // cursor keeps blinking after a command is typed
  CHECK_LEAD     : 120,   // ○ fades in before its label starts typing
  TASK_PAUSE     : 250,   // label typed → spinner starts
  SPIN_MS        : 500,   // one full macOS spinner rotation
  MORPH_OVERLAP  : 180,   // next line may start while ✔ morph (260ms) finishes
  DOT_GAP        : 140,   // network dots on the GitHub line: . .. ...
  READY_LEAD     : 250,   // last check → System Ready.
  READY_SETTLE   : 300,   // cursor blink after System Ready.
  WHOAMI_LEAD    : 120,   // prompt appears → whoami starts typing
  NAME_LEAD      : 180,   // whoami typed → name reveal
  NAME_MS        : 420,   // name reveal duration
  NAME_OVERLAP   : 260,   // subtitle starts while name reveal finishes
  SUBTITLE_STAGGER : 10,  // per-character reveal delay (8–12ms band)
  SUBTITLE_CHAR_MS : 200, // each character's fade duration
  LAUNCH_LEAD    : 350,   // subtitle rendered → launch typing
  LAUNCH_HOLD    : 500,   // launch typed → cursor freezes
  FINISH_TAIL    : 120,   // brightness bump lands before onComplete
  WORD_START     : 30,    // hesitation on the first char after a space
  DOT_PAUSE_MID  : 80,    // pause after a mid-ellipsis period
  DOT_PAUSE_END  : 120,   // pause after the final period
};

// ── Content (order and text are fixed — do not change) ─────────────────────
const CMD_BOOT    = 'boot portfolio';
const CMD_WHOAMI  = 'whoami';
const READY_TEXT  = 'System Ready.';
const LAUNCH_TEXT = 'Launching Portfolio...';
const SUBTITLE    = 'Full Stack Developer • AI Enthusiast';

// Per-line success feedback: 'bump' (shadow), 'flash' (80ms glow), 'pulse' (soft)
const CHECKS = [
  { label: 'Initializing Workspace', fx: 'bump' },
  { label: 'Connecting GitHub',      fx: 'bump',  dots: true },
  { label: 'Loading Projects',       fx: 'bump',  shimmer: true },
  { label: 'Loading Experience',     fx: 'flash' },
  { label: 'Loading AI Stack',       fx: 'pulse' },
];

// ── Human typing rhythm ─────────────────────────────────────────────────────
// Deterministic core (shared with the duration estimator) + runtime jitter.
function baseCharDelay(ch, prev, base) {
  let d = base;
  if (ch === ' ') d *= 0.55;                        // spaces are faster
  else if (ch >= 'A' && ch <= 'Z') d *= 1.25;       // capitals are slower
  if (prev === ' ') d += PACE.WORD_START;           // word-start hesitation
  return d;
}
const humanCharDelay = (ch, prev, base) =>
  Math.max(12, baseCharDelay(ch, prev, base) + (Math.random() * 14 - 7));

/** Expected typing duration — mirrors humanCharDelay without the jitter. */
function estimateTypeMs(text, base) {
  let ms = 0;
  for (let i = 0; i < text.length; i++) {
    ms += baseCharDelay(text[i], text[i - 1], base);
    if (text[i] === '.') ms += i === text.length - 1 ? PACE.DOT_PAUSE_END : PACE.DOT_PAUSE_MID;
  }
  return Math.round(ms);
}

// ── Computed total duration — exported for the parent's watchdog ────────────
// Every term flows from SPEED/PACE/CHECKS; any content change rescales it.
export const TERMINAL_TOTAL_MS =
  PACE.PROMPT_HOLD + estimateTypeMs(CMD_BOOT, SPEED.CMD) + PACE.CMD_SETTLE +
  CHECKS.reduce((sum, c) =>
    sum + PACE.CHECK_LEAD + estimateTypeMs(c.label, SPEED.TASK) +
    (c.dots ? 3 * PACE.DOT_GAP : 0) + PACE.TASK_PAUSE + PACE.SPIN_MS + PACE.MORPH_OVERLAP,
  0) +
  PACE.READY_LEAD + estimateTypeMs(READY_TEXT, SPEED.READY) + PACE.READY_SETTLE +
  PACE.WHOAMI_LEAD + estimateTypeMs(CMD_WHOAMI, SPEED.CMD) +
  PACE.NAME_LEAD + PACE.NAME_OVERLAP +
  SUBTITLE.length * PACE.SUBTITLE_STAGGER + PACE.SUBTITLE_CHAR_MS +
  PACE.LAUNCH_LEAD + estimateTypeMs(LAUNCH_TEXT, SPEED.LAUNCH) +
  PACE.LAUNCH_HOLD + PACE.FINISH_TAIL;

// ── Reduced motion (module-level snapshot, same pattern as PortfolioIntro) ──
const isReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Grain texture (shared data-URI pattern with BackgroundEffects) ──────────
const NOISE_URI = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const MONO_STACK = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

// ═══════════════════════════════════════════════════════════════════════════════
// usePremiumTyping — reusable async-timeline hook
//
// run(timeline) starts an async sequence with two primitives:
//   sleep(ms)                       — cancellable delay
//   typeText(text, onProgress, base) — human-rhythm char-by-char typing with
//                                      realistic period pauses (ellipsis)
//
// Cancellation: cancel() (also fired on unmount) rejects every pending sleep
// with a sentinel; the timeline aborts at its current await point, so no
// timer leaks and no state is written after teardown.
// ═══════════════════════════════════════════════════════════════════════════════
const CANCELLED = Symbol('timeline-cancelled');

export function usePremiumTyping() {
  const ctlRef = useRef(null);

  const cancel = useCallback(() => {
    const ctl = ctlRef.current;
    if (!ctl) return;
    ctl.cancelled = true;
    ctl.pending.forEach(({ id, reject }) => { clearTimeout(id); reject(CANCELLED); });
    ctl.pending.clear();
    ctlRef.current = null;
  }, []);

  // Unmount safety net — no timer may survive the component.
  useEffect(() => cancel, [cancel]);

  const run = useCallback((timeline) => {
    cancel();
    const ctl = { cancelled: false, pending: new Set() };
    ctlRef.current = ctl;

    const sleep = (ms) => new Promise((resolve, reject) => {
      if (ctl.cancelled) return reject(CANCELLED);
      const entry = { id: 0, reject };
      entry.id = setTimeout(() => { ctl.pending.delete(entry); resolve(); }, ms);
      ctl.pending.add(entry);
    });

    const typeText = async (text, onProgress, base) => {
      for (let i = 0; i < text.length; i++) {
        await sleep(humanCharDelay(text[i], text[i - 1], base));
        onProgress(i + 1);
        // Realistic ellipsis: each period lands, then a beat before the next
        if (text[i] === '.') {
          await sleep(i === text.length - 1 ? PACE.DOT_PAUSE_END : PACE.DOT_PAUSE_MID);
        }
      }
    };

    timeline({ sleep, typeText }).catch((err) => {
      if (err !== CANCELLED && import.meta.env.DEV) {
        console.error('[PortfolioTerminal] timeline error', err);
      }
    });
  }, [cancel]);

  return { run, cancel };
}

// ── Cursor — ▌ block. Solid while typing, sinusoidal blink while idle. ──────
// stepKey retriggers a micro translateX step on each keystroke (transform
// only), so the cursor lands with a subtle mechanical nudge.
const Cursor = memo(function Cursor({ blinking, frozen = false, stepKey = 0 }) {
  return (
    <span
      key={stepKey}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: '0.55em',
        height: '1.12em',
        marginLeft: '2px',
        verticalAlign: 'text-bottom',
        background: frozen ? 'rgba(212,212,216,0.45)' : 'rgba(228,228,231,0.75)',
        borderRadius: '1px',
        transition: 'background 300ms ease',
        animation: isReduced || frozen
          ? 'none'
          : blinking
            ? 'cursorBlinkSoft 1.4s ease-in-out infinite'
            : 'cursorStep 70ms ease-out',
        willChange: blinking ? 'opacity' : 'transform',
      }}
    />
  );
});

// ── Spinner — macOS-style thin arc, one rotation per 500ms, linear ──────────
const Spinner = memo(function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.72em',
        height: '0.72em',
        border: '1.5px solid rgba(255,255,255,0.14)',
        borderTopColor: 'rgba(255,255,255,0.65)',
        borderRadius: '50%',
        verticalAlign: '-0.06em',
        animation: isReduced ? 'none' : `spinnerRotate ${PACE.SPIN_MS}ms linear infinite`,
        willChange: 'transform',
      }}
    />
  );
});

// ── PromptLine — `> command` with optional cursor ───────────────────────────
const PromptLine = memo(function PromptLine({ text, cursor }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="shrink-0" style={{ color: 'rgba(96,165,250,0.55)' }}>&gt;</span>
      <span style={{ color: 'rgba(228,228,231,0.92)' }}>
        {text}
        {cursor}
      </span>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// CheckLine — task lifecycle: ○ queued → label typed → spinner → ✔ morph
//
//   'typing'   ○ gray, label appears char-by-char
//   'waiting'  (GitHub) network dots . .. ... then handoff to spinner
//   'spinning' macOS arc rotates — Projects gets a subtle shimmer here
//   'done'     ✔ morphs in (scale 0.8→1.05→1), text color settles
//              gray → white → soft green → white over 300ms
// ═══════════════════════════════════════════════════════════════════════════════
const CheckLine = memo(function CheckLine({ check, state, staticMode }) {
  const { typed, dots, status } = state;
  if (status === 'hidden') return null;
  const noAnim = staticMode || isReduced;
  const isDone = status === 'done';
  const label = check.label.slice(0, typed);

  return (
    <div
      className="flex items-baseline gap-2.5"
      style={{
        animation: noAnim ? 'none' : 'checkLineIn 200ms cubic-bezier(0.22,1,0.36,1) forwards',
        opacity: noAnim ? 1 : 0,
      }}
    >
      {/* Status icon — fixed-width column so ○ → spinner → ✔ never reflows */}
      <span
        className="shrink-0"
        style={{ width: '1.1em', textAlign: 'left' }}
      >
        {isDone ? (
          <span
            style={{
              display: 'inline-block',
              color: 'rgba(52,211,153,0.9)',
              textShadow: '0 0 10px rgba(52,211,153,0.22)',
              animation: noAnim ? 'none' : 'checkMorphIn 260ms cubic-bezier(0.34,1.56,0.64,1) forwards',
              willChange: 'transform, opacity',
            }}
          >
            ✔
          </span>
        ) : status === 'spinning' ? (
          <Spinner />
        ) : (
          <span style={{ color: 'rgba(113,113,122,0.6)' }}>○</span>
        )}
      </span>

      {/* Label — gray while queued/running, settles to white on success */}
      <span
        className="relative inline-block"
        style={{
          color: isDone ? 'rgba(228,228,231,0.9)' : 'rgba(161,161,170,0.8)',
          animation: isDone && !noAnim ? 'checkTextSettle 300ms ease forwards' : 'none',
        }}
      >
        {label}

        {/* Network dots (GitHub) — appear one by one, fade out on success */}
        {check.dots && dots > 0 && (
          <span
            style={{
              color: 'rgba(161,161,170,0.7)',
              opacity: isDone ? 0 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {Array.from({ length: dots }, (_, i) => (
              <span key={i} style={{ animation: noAnim ? 'none' : 'dotIn 160ms ease-out forwards', opacity: noAnim ? 1 : 0 }}>.</span>
            ))}
          </span>
        )}

        {/* Shimmer (Projects) — barely-there sweep while the task runs */}
        {check.shimmer && !isDone && !noAnim && (
          <span aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ opacity: 0.2 }}>
            <span
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.9) 50%, transparent 70%)',
                transform: 'translateX(-110%)',
                animation: 'shimmerSweep 1.3s ease-in-out infinite',
                willChange: 'transform',
              }}
            />
          </span>
        )}
      </span>
    </div>
  );
});

// ── Initial / completed UI state ────────────────────────────────────────────
const buildState = (done) => ({
  prompt      : true,
  bootTyped   : done ? CMD_BOOT.length : 0,
  checks      : CHECKS.map((c) => ({
    typed : done ? c.label.length : 0,
    dots  : 0,
    status: done ? 'done' : 'hidden',
  })),
  readyShown  : done,
  readyTyped  : done ? READY_TEXT.length : 0,
  whoamiShown : done,
  whoamiTyped : done ? CMD_WHOAMI.length : 0,
  nameShown   : done,
  subtitleShown: done,
  launchShown : done,
  launchTyped : done ? LAUNCH_TEXT.length : 0,
  cursor      : done ? 'launch' : 'boot',   // which line owns the cursor
  cursorBlink : !done,                      // blinking (idle) vs solid (typing)
  frozen      : done,                       // end state: cursor stops, +2% brightness
  fx          : { key: 0, kind: null },     // success feedback overlay retrigger
});

// ═══════════════════════════════════════════════════════════════════════════════
// PortfolioTerminal
//
// Props:
//   visible    — parent gate: sequence starts only once true
//   staticMode — reduced-motion: render fully completed, no animation
//   onSystemReady — fired when "System Ready." begins (optional)
//   onComplete — fired after the launch line + hold (parent → welcome phase)
// ═══════════════════════════════════════════════════════════════════════════════
const PortfolioTerminal = memo(function PortfolioTerminal({
  visible = true,
  staticMode = false,
  onSystemReady,
  onComplete,
}) {
  const [ui, setUi] = useState(() => buildState(staticMode));
  const bodyRef = useRef(null);
  const { run, cancel } = usePremiumTyping();

  const onSystemReadyRef = useRef(onSystemReady);
  const onCompleteRef    = useRef(onComplete);
  useEffect(() => {
    onSystemReadyRef.current = onSystemReady;
    onCompleteRef.current = onComplete;
  });

  const patch = useCallback((p) => setUi((u) => ({ ...u, ...p })), []);
  const setCheck = useCallback((i, cp) => setUi((u) => ({
    ...u,
    checks: u.checks.map((c, j) => (j === i ? { ...c, ...cp } : c)),
  })), []);
  const fireFx = useCallback((kind) => setUi((u) => ({
    ...u,
    fx: { key: u.fx.key + 1, kind },
  })), []);

  // "Enter" micro-scroll: ~2px spring nudge via WAAPI on the body — pure
  // transform, no remount, so running line animations are never restarted.
  const bump = useCallback(() => {
    if (isReduced || !bodyRef.current?.animate) return;
    bodyRef.current.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(2px)', offset: 0.35 },
        { transform: 'translateY(-0.5px)', offset: 0.7 },
        { transform: 'translateY(0)' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, []);

  // ── Timeline ──
  useEffect(() => {
    if (staticMode || !visible) return;

    run(async ({ sleep, typeText }) => {
      // ── > boot portfolio ──
      await sleep(PACE.PROMPT_HOLD);
      patch({ cursorBlink: false });
      await typeText(CMD_BOOT, (n) => patch({ bootTyped: n }), SPEED.CMD);
      patch({ cursorBlink: true });
      await sleep(PACE.CMD_SETTLE);
      patch({ cursor: null });
      bump();

      // ── Task checks ──
      for (let i = 0; i < CHECKS.length; i++) {
        setCheck(i, { status: 'typing' });
        await sleep(PACE.CHECK_LEAD);
        await typeText(CHECKS[i].label, (n) => setCheck(i, { typed: n }), SPEED.TASK);
        if (CHECKS[i].dots) {
          for (let d = 1; d <= 3; d++) {
            await sleep(PACE.DOT_GAP);
            setCheck(i, { dots: d });
          }
        }
        await sleep(PACE.TASK_PAUSE);
        setCheck(i, { status: 'spinning' });
        await sleep(PACE.SPIN_MS);
        setCheck(i, { status: 'done' });
        fireFx(CHECKS[i].fx);
        // ✔ morph (260ms) finishes while the next line fades in
        await sleep(PACE.MORPH_OVERLAP);
      }

      // ── System Ready. — typed, then a settled blink ──
      await sleep(PACE.READY_LEAD);
      try { onSystemReadyRef.current?.(); } catch { /* ignore */ }
      patch({ readyShown: true, cursor: 'ready', cursorBlink: false });
      bump();
      await typeText(READY_TEXT, (n) => patch({ readyTyped: n }), SPEED.READY);
      patch({ cursorBlink: true });
      await sleep(PACE.READY_SETTLE);

      // ── > whoami ──
      patch({ whoamiShown: true, cursor: 'whoami', cursorBlink: true });
      bump();
      await sleep(PACE.WHOAMI_LEAD);
      patch({ cursorBlink: false });
      await typeText(CMD_WHOAMI, (n) => patch({ whoamiTyped: n }), SPEED.CMD);
      patch({ cursorBlink: true });
      await sleep(PACE.NAME_LEAD);

      // ── Identity — revealed, never typed ──
      patch({ nameShown: true, cursor: null });
      await sleep(PACE.NAME_OVERLAP);
      patch({ subtitleShown: true });
      await sleep(SUBTITLE.length * PACE.SUBTITLE_STAGGER + PACE.SUBTITLE_CHAR_MS);

      // ── Launching Portfolio... ──
      await sleep(PACE.LAUNCH_LEAD);
      patch({ launchShown: true, cursor: 'launch', cursorBlink: false });
      bump();
      await typeText(LAUNCH_TEXT, (n) => patch({ launchTyped: n }), SPEED.LAUNCH);
      patch({ cursorBlink: true });
      await sleep(PACE.LAUNCH_HOLD);
      patch({ frozen: true, cursorBlink: false });
      fireFx('flash');
      await sleep(PACE.FINISH_TAIL);
      try { onCompleteRef.current?.(); } catch { /* ignore */ }
    });

    return cancel;
  }, [visible, staticMode, run, cancel, patch, setCheck, fireFx, bump]);

  const noAnim = staticMode || isReduced;
  const terminalLive = visible || staticMode;

  // Success feedback overlays — pre-composed box-shadows, opacity-only flashes
  const FX_STYLE = {
    bump : { boxShadow: '0 48px 132px rgba(0,0,0,0.55)', duration: 120, anim: 'fxShadowBump' },
    flash: { boxShadow: '0 0 44px rgba(59,130,246,0.10), inset 0 0 30px rgba(59,130,246,0.05)', duration: 80, anim: 'fxGlowFlash' },
    pulse: { boxShadow: '0 0 54px rgba(99,102,241,0.14), inset 0 0 36px rgba(99,102,241,0.06)', duration: 600, anim: 'fxGlowPulse' },
  };
  const fx = ui.fx.kind ? FX_STYLE[ui.fx.kind] : null;

  // Reserve final height: boot + 5 checks + ready + whoami + name + subtitle
  // + launch = 11 lines @ lineHeight 1.85 (+ spacing). Never shifts layout.
  const RESERVED_LINES = 11;

  return (
    <div
      className="relative overflow-hidden w-full"
      aria-hidden="true"
      style={{
        maxWidth: 'min(620px, calc(100vw - 32px))',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: ui.readyShown ? 'rgba(24,24,28,0.88)' : 'rgba(17,17,20,0.88)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        boxShadow: '0 40px 120px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        // End state: the whole card lifts +2% brightness (filter — GPU)
        filter: ui.frozen && !staticMode ? 'brightness(1.02)' : 'brightness(1)',
        transition: noAnim ? 'none' : 'background 250ms ease, filter 250ms ease',
      }}
    >
      {/* ── Window header: macOS traffic lights + centered title ── */}
      <div className="relative flex items-center px-4 pt-3.5 pb-3">
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span className="rounded-full" style={{ width: 12, height: 12, background: '#ff5f57' }} />
          <span className="rounded-full" style={{ width: 12, height: 12, background: '#febc2e' }} />
          <span
            className="rounded-full"
            style={{
              width: 12,
              height: 12,
              background: '#28c840',
              boxShadow: terminalLive ? '0 0 8px rgba(40,200,64,0.6)' : 'none',
              transition: noAnim ? 'none' : 'box-shadow 400ms ease',
            }}
          />
        </div>
        <span
          className="absolute left-1/2 -translate-x-1/2 select-none"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.01em',
          }}
        >
          Terminal
        </span>
      </div>

      {/* ── Terminal body ── */}
      <div
        ref={bodyRef}
        className="px-5 pb-6 pt-2 md:px-6"
        style={{
          fontFamily: MONO_STACK,
          fontSize: 'clamp(13px, 1.4vw, 15px)',
          lineHeight: 1.85,
          letterSpacing: '0.2px',
          color: 'rgba(212,212,216,0.82)',
          minHeight: `${RESERVED_LINES * 1.85}em`,
          willChange: 'transform',
        }}
      >
        {/* > boot portfolio */}
        {ui.prompt && (
          <PromptLine
            text={CMD_BOOT.slice(0, ui.bootTyped)}
            cursor={ui.cursor === 'boot' && (
              <Cursor blinking={ui.cursorBlink} stepKey={ui.bootTyped} />
            )}
          />
        )}

        {/* Task checks */}
        {CHECKS.map((check, i) => (
          <CheckLine key={check.label} check={check} state={ui.checks[i]} staticMode={staticMode} />
        ))}

        {/* System Ready. — typed */}
        {ui.readyShown && (
          <div style={{ marginTop: '0.35em', color: 'rgba(52,211,153,0.9)', textShadow: '0 0 14px rgba(52,211,153,0.18)' }}>
            {READY_TEXT.slice(0, ui.readyTyped)}
            {ui.cursor === 'ready' && (
              <Cursor blinking={ui.cursorBlink} stepKey={ui.readyTyped} />
            )}
          </div>
        )}

        {/* > whoami */}
        {ui.whoamiShown && (
          <div style={{ marginTop: '0.35em' }}>
            <PromptLine
              text={CMD_WHOAMI.slice(0, ui.whoamiTyped)}
              cursor={ui.cursor === 'whoami' && (
                <Cursor blinking={ui.cursorBlink} stepKey={ui.whoamiTyped} />
              )}
            />
          </div>
        )}

        {/* Identity — elegant reveal (opacity + 4px rise + blur), never typed */}
        {ui.nameShown && (
          <div
            style={{
              paddingLeft: 'calc(0.55em + 0.625rem)',
              animation: noAnim ? 'none' : `nameRevealIn ${PACE.NAME_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              opacity: noAnim ? 1 : 0,
              willChange: noAnim ? 'auto' : 'transform, opacity, filter',
            }}
          >
            <span style={{ color: '#ffffff' }}>{profile.name}</span>
          </div>
        )}

        {/* Subtitle — per-character render reveal, not typing */}
        {ui.subtitleShown && (
          <div style={{ paddingLeft: 'calc(0.55em + 0.625rem)', color: 'rgba(161,161,170,0.75)' }}>
            {noAnim
              ? SUBTITLE
              : SUBTITLE.split('').map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      animation: `subtitleCharIn ${PACE.SUBTITLE_CHAR_MS}ms ease-out ${i * PACE.SUBTITLE_STAGGER}ms forwards`,
                      opacity: 0,
                    }}
                  >
                    {ch === ' ' ? ' ' : ch}
                  </span>
                ))}
          </div>
        )}

        {/* Launching Portfolio... — realistic ellipsis, cursor freezes at the end */}
        {ui.launchShown && (
          <div style={{ marginTop: '0.35em', color: 'rgba(147,197,253,0.85)' }}>
            {LAUNCH_TEXT.slice(0, ui.launchTyped)}
            {(ui.cursor === 'launch' || ui.frozen) && (
              <Cursor blinking={ui.cursorBlink} frozen={ui.frozen} stepKey={ui.launchTyped} />
            )}
          </div>
        )}
      </div>

      {/* ── Success feedback overlay (shadow bump / glow flash / soft pulse) ── */}
      {fx && !noAnim && (
        <div
          key={ui.fx.key}
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '24px',
            boxShadow: fx.boxShadow,
            animation: `${fx.anim} ${fx.duration}ms ease-out forwards`,
            opacity: 0,
          }}
        />
      )}

      {/* ── Scanline — barely perceptible, very slow ── */}
      {!isReduced && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ borderRadius: '24px' }}
        >
          <div
            className="absolute inset-x-0"
            style={{
              top: '-100%',
              height: '200%',
              background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 4px)',
              animation: 'terminalScanline 18s linear infinite',
              willChange: 'transform',
            }}
          />
        </div>
      )}

      {/* ── Grain ── */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          borderRadius: '24px',
          opacity: 0.01,
          backgroundImage: NOISE_URI,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  );
});

export default PortfolioTerminal;
