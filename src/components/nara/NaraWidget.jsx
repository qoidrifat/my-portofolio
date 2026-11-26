// @ts-check
// NARA floating widget — avatar bubble + speech bubble + chat host.
// Entrance driven by the real intro completion flag (FR-3D-007 / F-01);
// greeting once per session; avatar is the approved NARA face.
//
// Attention design (2026-11-25): the bubble is the single interactive mascot.
// It idles with a slow bob, lifts on hover, wiggles once when a visitor has
// ignored it, offers two tappable questions instead of a one-way greeting, and
// nudges once per content section — capped so it never nags.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { copyFor } from '@/lib/nara/nara-copy';
import NaraAvatar from './NaraAvatar.jsx';
import NaraChatPanel from './NaraChatPanel.jsx';

const BUBBLE_SESSION_KEY = 'nara-bubbles-shown';
const GREETING_SESSION_KEY = 'nara-greeted';
const SECTION_PROMPT_KEY = 'nara-section-prompts';

/** Wobble after this much idle time if the visitor has not interacted yet. */
const ATTENTION_AFTER_MS = 12000;
/** Cap proactive section nudges so the widget never turns into a popup storm. */
const MAX_SECTION_PROMPTS = 2;

function readSessionCount(key) {
  try {
    return Number(sessionStorage.getItem(key) || '0');
  } catch {
    return 0;
  }
}

function writeSessionCount(key, n) {
  try {
    sessionStorage.setItem(key, String(n));
  } catch { /* private browsing */ }
}

function hasGreeted() {
  try {
    return sessionStorage.getItem(GREETING_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Storage can be blocked outright (private mode, hardened Android browsers).
 *  An uncaught throw here killed the whole widget on mount. */
function readIntroDone() {
  try {
    return sessionStorage.getItem('qr-intro-played') === '1';
  } catch {
    return true;
  }
}

/**
 * @param {{ activeSection?: string }} props
 */
export default function NaraWidget({ activeSection = 'hero' }) {
  const { lang } = useLanguage();
  const t = copyFor(lang);
  const reduced = useReducedMotion();

  const [introDone, setIntroDone] = useState(readIntroDone);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleKind, setBubbleKind] = useState(/** @type {'greeting'|'section'} */ ('greeting'));
  const [sectionPrompt, setSectionPrompt] = useState(/** @type {{text:string, question:string}|null} */ (null));
  const [chatOpen, setChatOpen] = useState(false);
  const [naraState, setNaraState] = useState('hidden');
  const [wiggle, setWiggle] = useState(false);
  const [hintDone, setHintDone] = useState(false);
  const greetedRef = useRef(hasGreeted());
  const bubbleCountRef = useRef(readSessionCount(BUBBLE_SESSION_KEY));
  const sectionPromptCountRef = useRef(readSessionCount(SECTION_PROMPT_KEY));
  const seenSectionsRef = useRef(/** @type {Set<string>} */ (new Set()));
  const lastInteractionRef = useRef(Date.now());
  const wiggleDoneRef = useRef(false);
  /** Question a chip or section nudge asked NARA to answer on open. */
  const [seed, setSeed] = useState(/** @type {{text:string, nonce:number}|null} */ (null));

  // The portfolio intro flips sessionStorage['qr-intro-played'] right before
  // the app reveals. Poll the flag — cheap, and covers both mount orders.
  useEffect(() => {
    if (introDone) return undefined;
    const id = setInterval(() => {
      try {
        if (sessionStorage.getItem('qr-intro-played') === '1') setIntroDone(true);
      } catch { /* ignore */ }
    }, 400);
    return () => clearInterval(id);
  }, [introDone]);

  // Entrance chain (F-01): appear → greeting bubble → idle. Once per session.
  useEffect(() => {
    if (!introDone) return undefined;
    setNaraState(reduced ? 'idle' : 'appearing');
    const id = setTimeout(() => {
      if (!greetedRef.current) {
        greetedRef.current = true;
        try { sessionStorage.setItem(GREETING_SESSION_KEY, '1'); } catch { /* ignore */ }
        setBubbleKind('greeting');
        setBubbleVisible(bubbleCountRef.current < 2);
      }
      setNaraState('idle');
      return undefined;
    }, reduced ? 0 : 900);
    return () => clearTimeout(id);
  }, [introDone, reduced]);

  // Bubble auto-dismiss (F-06). Section nudges linger a little longer.
  useEffect(() => {
    if (bubbleVisible) {
      const id = setTimeout(() => setBubbleVisible(false), bubbleKind === 'section' ? 11000 : 8000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [bubbleVisible, bubbleKind]);

  // Proactive section nudge: one per section, capped per session, never while
  // the chat is already open or after the visitor has been warned twice.
  useEffect(() => {
    if (!introDone || chatOpen) return undefined;
    if (sectionPromptCountRef.current >= MAX_SECTION_PROMPTS) return undefined;
    const prompt = t.sectionPrompts?.[activeSection];
    if (!prompt || seenSectionsRef.current.has(activeSection)) return undefined;

    const id = setTimeout(() => {
      seenSectionsRef.current.add(activeSection);
      sectionPromptCountRef.current += 1;
      writeSessionCount(SECTION_PROMPT_KEY, sectionPromptCountRef.current);
      setSectionPrompt(prompt);
      setBubbleKind('section');
      setBubbleVisible(true);
    }, 1400);
    return () => clearTimeout(id);
  }, [activeSection, introDone, chatOpen, t]);

  // Attention wobble — once per session, only if the visitor never engaged.
  useEffect(() => {
    if (!introDone || wiggleDoneRef.current || chatOpen || reduced) return undefined;
    const check = setInterval(() => {
      if (wiggleDoneRef.current) return;
      if (Date.now() - lastInteractionRef.current < ATTENTION_AFTER_MS) return;
      wiggleDoneRef.current = true;
      setWiggle(true);
      const stop = setTimeout(() => setWiggle(false), 900);
      clearInterval(check);
      return () => clearTimeout(stop);
    }, 1000);
    return () => clearInterval(check);
  }, [introDone, chatOpen, reduced]);

  // First-run hint: "Ask NARA" beside the face, then it steps aside. A
  // permanent label crowded the mobile corner (it sat over the hero CTA).
  useEffect(() => {
    if (!introDone || chatOpen) return undefined;
    const id = setTimeout(() => setHintDone(true), 9000);
    return () => clearTimeout(id);
  }, [introDone, chatOpen]);

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    wiggleDoneRef.current = true;
    setWiggle(false);
    setHintDone(true);
  }, []);

  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    bubbleCountRef.current += 1;
    writeSessionCount(BUBBLE_SESSION_KEY, bubbleCountRef.current);
    markInteraction();
  }, [markInteraction]);

  const askQuestion = useCallback((question) => {
    markInteraction();
    setBubbleVisible(false);
    setSeed({ text: question, nonce: Date.now() });
    setChatOpen(true);
  }, [markInteraction]);

  const openChat = useCallback(() => {
    markInteraction();
    setChatOpen(true);
    setBubbleVisible(false);
  }, [markInteraction]);

  // The hero mascot hands the conversation over through one window event, so
  // HeroSection never needs a prop drilled down from Layout.
  useEffect(() => {
    /** @param {Event} e */
    const onOpen = (e) => {
      const question = /** @type {CustomEvent} */ (e).detail?.question;
      if (typeof question === 'string' && question) askQuestion(question);
      else openChat();
    };
    window.addEventListener('nara:open', onOpen);
    return () => window.removeEventListener('nara:open', onOpen);
  }, [openChat, askQuestion]);

  // Stable identities: these flow into NaraChatPanel effect deps. Without
  // useCallback the functions are re-created on every render, which re-runs
  // the panel's escape-key effect and could abort an in-flight chat request.
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setNaraState('idle');
    markInteraction();
  }, [markInteraction]);

  const handleChatState = useCallback(/** @param {string} s */ (s) => {
    setNaraState(s === 'thinking' ? 'thinking' : 'idle');
  }, []);

  const isThinking = naraState === 'thinking';
  // A visitor who already dismissed the bubble or opened the chat knows what
  // the face is — the hint only helps on the very first visit.
  const showHint = introDone && !chatOpen && !hintDone && bubbleCountRef.current === 0;

  // Idle bob, lift on hover, wobble once — all skipped under reduced motion.
  const bob = reduced
    ? {}
    : wiggle
      ? { y: 0, rotate: [0, -8, 7, -5, 3, 0], transition: { duration: 0.9, ease: 'easeInOut' } }
      : { y: [0, -5, 0], transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } };

  const bubbleText = bubbleKind === 'section' && sectionPrompt ? sectionPrompt.text : t.bubbleGreeting;
  const bubbleChips = bubbleKind === 'section' && sectionPrompt
    ? [sectionPrompt.question]
    : t.bubbleSuggestions ?? [];

  return (
    <>
      {/* Speech bubble (FR-CHAT-001/002) */}
      <AnimatePresence>
        {bubbleVisible && !chatOpen && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.94 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            role="complementary"
            aria-label="NARA suggestion"
            className={
              'fixed bottom-[6.5rem] right-4 z-[55] w-[min(19rem,calc(100vw-2rem))] ' +
              'rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-2xl backdrop-blur-md ' +
              'sm:bottom-[7.5rem] sm:right-6'
            }
          >
            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Dismiss"
              className="absolute right-1.5 top-1.5 rounded p-0.5 text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>

            <div className="mb-1.5 flex items-center gap-1.5 pr-5">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-ai opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-ai" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">NARA</span>
            </div>

            <p className="pr-4 text-[12.5px] leading-snug text-zinc-200">{bubbleText}</p>

            {/* Two tappable questions — asking is easier than composing one. */}
            {bubbleChips.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {bubbleChips.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => askQuestion(q)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left text-[11.5px] leading-snug text-zinc-300 transition-colors hover:border-accent-ai/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-accent-ai" aria-hidden="true" />
                    {q}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar button — NARA's face, always clearly visible (F-07).
          The container stays put: a continuously bobbing button never holds
          still, which makes it a moving target for visitors and unclickable
          for Playwright ("element is not stable"). The motion moved inside. */}
      <div className="fixed bottom-5 right-4 z-[55] flex items-center gap-2 sm:bottom-6 sm:right-6">
        {/* Name hint — tells the visitor what the face is before they tap. */}
        <AnimatePresence>
          {showHint && (
            <motion.span
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none select-none rounded-full border border-white/10 bg-zinc-900/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 shadow-lg backdrop-blur-sm"
            >
              {t.bubbleLabel}
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={openChat}
          transition={{ type: 'spring', damping: 18, stiffness: 320 }}
          data-testid="nara-launcher"
          aria-label={t.chatTitle + ' — ' + t.chatSubtitle}
          aria-expanded={chatOpen}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={introDone ? (reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }) : { opacity: 0, scale: 0.5 }}
          className={
            'group relative block h-16 w-16 rounded-full focus-visible:outline-none focus-visible:ring-2 ' +
            'focus-visible:ring-accent-web focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-20 sm:w-20'
          }
        >
          {/* Hover glow — the bubble reads as a live object, not an icon. */}
          <span
            className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-br from-[hsl(var(--accent-web))]/40 to-[hsl(var(--accent-ai))]/40 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
          {/* The face breathes; the button around it stays still so the
              click target never moves under the pointer. */}
          <motion.span animate={bob} className="absolute inset-0 block rounded-full">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--accent-web))] to-[hsl(var(--accent-ai))]" aria-hidden="true" />
            <span className="absolute inset-[3px] overflow-hidden rounded-full bg-[#134e4a]">
              <NaraAvatar className="h-full w-full" />
            </span>
          </motion.span>

          {/* Thinking — a sweeping arc plus the corner pulse reads as "working". */}
          {isThinking && (
            <>
              <span
                className="pointer-events-none absolute -inset-[3px] animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_210deg,hsl(var(--accent-ai))_330deg,transparent_360deg)]"
                style={{ animationDuration: '1.1s' }}
                aria-hidden="true"
              />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-ai opacity-70" />
                <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-zinc-950 bg-accent-ai" />
              </span>
            </>
          )}
        </motion.button>
      </div>

      <NaraChatPanel
        open={chatOpen}
        onClose={closeChat}
        onStateChange={handleChatState}
        seed={seed}
        onSeedConsumed={() => setSeed(null)}
      />
    </>
  );
}
