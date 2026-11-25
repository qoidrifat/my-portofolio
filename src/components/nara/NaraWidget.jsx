// @ts-check
// NARA floating widget — avatar + bubble + chat host. Mounted from Layout.
// Entrance is driven by the real intro completion flag (FR-3D-007), greeting
// runs once per session (F-01), and the 3D runtime is fetched only when the
// character is revealed (NFR-PERF-002/003).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { copyFor } from '@/lib/nara/nara-copy';
import NaraScene from './NaraScene.jsx';
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

export default function NaraWidget() {
  const { lang } = useLanguage();
  const t = copyFor(/** @type {'en'|'id'} */ (lang));
  const reduced = useReducedMotion();

  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem('qr-intro-played') === '1'
  );
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [naraState, setNaraState] = useState(/** @type {string} */ ('hidden'));
  const greetedRef = useRef(hasGreeted());
  const bubbleCountRef = useRef(readSessionCount(BUBBLE_SESSION_KEY));

  // The portfolio intro flips sessionStorage['qr-intro-played'] right before
  // the app reveals (App.jsx). Polling is avoided; a storage event plus the
  // initial read covers the two mount orders (intro vs revisit).
  useEffect(() => {
    if (introDone) return undefined;
    const id = setInterval(() => {
      try {
        if (sessionStorage.getItem('qr-intro-played') === '1') setIntroDone(true);
      } catch { /* ignore */ }
    }, 400);
    return () => clearInterval(id);
  }, [introDone]);

  // Entrance chain driven by introDone — never by a guessed timeout.
  useEffect(() => {
    if (!introDone) return undefined;
    setNaraState(reduced ? 'idle' : 'appearing');
    const id = setTimeout(() => {
      if (greetedRef.current) {
        setNaraState('idle');
        return undefined;
      }
      greetedRef.current = true;
      try { sessionStorage.setItem(GREETING_SESSION_KEY, '1'); } catch { /* ignore */ }
      setNaraState('greeting');
      setBubbleVisible(bubbleCountRef.current < 2);
      return undefined;
    }, reduced ? 0 : 1400);
    return () => clearTimeout(id);
  }, [introDone, reduced]);

  // Greeting finishes -> idle, and the bubble auto-dismisses.
  useEffect(() => {
    if (naraState === 'greeting') {
      const id = setTimeout(() => setNaraState('idle'), reduced ? 600 : 3600);
      return () => clearTimeout(id);
    }
    if (bubbleVisible) {
      const id = setTimeout(() => setBubbleVisible(false), 8000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [naraState, bubbleVisible, reduced]);

  /** Dismissed bubbles never reappear this session (F-06). */
  const dismissBubble = useCallback(() => {
    setBubbleVisible(false);
    bubbleCountRef.current += 1;
    writeSessionCount(BUBBLE_SESSION_KEY, bubbleCountRef.current);
  }, []);

  function openChat() {
    setChatOpen(true);
    setBubbleVisible(false);
    if (naraState === 'idle' || naraState === 'looking') setNaraState('listening');
  }

  function closeChat() {
    setChatOpen(false);
    setNaraState('idle');
  }

  /** @param {string} s */
  function handleChatState(s) {
    if (s === 'thinking') setNaraState('thinking');
    else if (s === 'success' || s === 'out_of_scope') setNaraState('speaking');
  }

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
              'fixed bottom-[13.5rem] right-4 z-[55] max-w-[240px] sm:bottom-40 sm:right-40 ' +
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

      {/* Avatar (F-07: opens chat only on intentional interaction) */}
      <motion.button
        type="button"
        onClick={openChat}
        aria-label={t.chatTitle + ' — ' + t.chatSubtitle}
        aria-expanded={chatOpen}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={introDone ? (reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }) : { opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={
          'fixed bottom-5 right-5 z-[55] block h-32 w-32 sm:bottom-6 sm:right-6 sm:h-44 sm:w-44 ' +
          'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
        }
      >
        <NaraScene state={naraState} />
      </motion.button>

      <NaraChatPanel open={chatOpen} onClose={closeChat} onStateChange={handleChatState} />
    </>
  );
}
