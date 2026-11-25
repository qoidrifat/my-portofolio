// @ts-check
// NARA floating widget — avatar bubble + speech bubble + chat host.
// Entrance driven by the real intro completion flag (FR-3D-007 / F-01);
// greeting once per session; avatar is the approved NARA face, always visible
// and clearly displayed (no WebGL, no 3D runtime, no model loading).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { copyFor } from '@/lib/nara/nara-copy';
import NaraAvatar from './NaraAvatar.jsx';
import NaraChatPanel from './NaraChatPanel.jsx';

const BUBBLE_SESSION_KEY = 'nara-bubbles-shown';
const GREETING_SESSION_KEY = 'nara-greeted';

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

export default function NaraWidget() {
  const { lang } = useLanguage();
  const t = copyFor(lang);
  const reduced = useReducedMotion();

  const [introDone, setIntroDone] = useState(readIntroDone);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [naraState, setNaraState] = useState('hidden');
  const greetedRef = useRef(hasGreeted());
  const bubbleCountRef = useRef(readSessionCount(BUBBLE_SESSION_KEY));

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
        setBubbleVisible(bubbleCountRef.current < 2);
      }
      setNaraState('idle');
      return undefined;
    }, reduced ? 0 : 900);
    return () => clearTimeout(id);
  }, [introDone, reduced]);

  // Bubble auto-dismiss (F-06).
  useEffect(() => {
    if (bubbleVisible) {
      const id = setTimeout(() => setBubbleVisible(false), 8000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [bubbleVisible]);

  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    bubbleCountRef.current += 1;
    writeSessionCount(BUBBLE_SESSION_KEY, bubbleCountRef.current);
  }, []);

  const openChat = useCallback(() => {
    setChatOpen(true);
    setBubbleVisible(false);
  }, []);

  // Stable identities: these flow into NaraChatPanel effect deps. Without
  // useCallback the functions are re-created on every render, which re-runs
  // the panel's escape-key effect and could abort an in-flight chat request.
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setNaraState('idle');
  }, []);

  const handleChatState = useCallback(/** @param {string} s */ (s) => {
    setNaraState(s === 'thinking' ? 'thinking' : 'idle');
  }, []);

  const isThinking = naraState === 'thinking';

  return (
    <>
      {/* Speech bubble (FR-CHAT-001/002) */}
      <AnimatePresence>
        {bubbleVisible && !chatOpen && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            role="status"
            className={
              'fixed bottom-[7.5rem] right-4 z-[55] max-w-[250px] sm:bottom-24 sm:right-24 ' +
              'rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-md'
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
            <p className="pr-4 text-[12.5px] leading-snug text-zinc-200">{t.bubbleGreeting}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar button — NARA's face, always clearly visible (F-07) */}
      <motion.button
        type="button"
        onClick={openChat}
        aria-label={t.chatTitle + ' — ' + t.chatSubtitle}
        aria-expanded={chatOpen}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        animate={introDone ? (reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }) : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={
          'fixed bottom-5 right-5 z-[55] block h-16 w-16 sm:h-20 sm:w-20 ' +
          'rounded-full focus-visible:outline-none focus-visible:ring-2 ' +
          'focus-visible:ring-accent-web focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
        }
      >
        {/* Gradient ring — the approved NARA face sits inside, fully visible */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--accent-web))] to-[hsl(var(--accent-ai))]" aria-hidden="true" />
        <span className="absolute inset-[3px] overflow-hidden rounded-full bg-zinc-100">
          <NaraAvatar className="h-full w-full" />
        </span>
        {/* Thinking indicator */}
        {isThinking && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-web opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-zinc-950 bg-accent-web" />
          </span>
        )}
      </motion.button>

      <NaraChatPanel open={chatOpen} onClose={closeChat} onStateChange={handleChatState} />
    </>
  );
}
