// @ts-check
// NARA floating chat panel — F-07/F-08/F-12, FR-CHAT-001..010, F-15.
// Desktop floating panel, mobile bottom sheet, keyboard accessible, text-only
// model output (SR-006: never rendered as HTML).

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { copyFor } from '@/lib/nara/nara-copy';
import NaraAvatar from './NaraAvatar.jsx';
import { sendChat } from '@/lib/nara/chat-client';

/** @typedef {{ role: 'user'|'assistant', content: string, kind?: 'normal'|'rate_limited'|'budget'|'error'|'out_of_scope' }} Msg */

const SUGGESTIONS = Object.freeze({
  en: Object.freeze([
    "Tell me about Qoid's experience.",
    'What projects has Qoid built?',
    'What technologies does Qoid work with?',
    'How can I contact Qoid?',
  ]),
  id: Object.freeze([
    'Siapa developer di balik portfolio ini?',
    'Apa fokus utama dan keahlian developer?',
    'Ceritakan proyek yang paling menarik.',
    'Teknologi apa yang sering digunakan?',
  ]),
});

/**
 * @param {{ open: boolean, onClose: () => void, onStateChange?: (s: string) => void }} props
 */
export default function NaraChatPanel({ open, onClose, onStateChange }) {
  // LanguageContext types lang as 'en' | 'id'; NaraChatPanel receives it as a
  // plain string from the generic widget boundary.
  /** @type {import('@/lib/LanguageContext').LANGS[number]['id']} */
  const langT = /** @type {any} */ (useLanguage().lang);
  const lang = langT;
  const t = copyFor(/** @type {'en'|'id'} */ (lang));
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState(/** @type {Msg[]} */ ([]));
  const [busy, setBusy] = useState(false);
  // Real-time thinking feedback: steps advance on a timer while the provider
  // works, so the visitor sees genuine progress instead of a static spinner.
  const [thinkingStep, setThinkingStep] = useState(0);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [input, setInput] = useState('');
  const listRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
  const abortRef = useRef(/** @type {AbortController|null} */ (null));

  // Focus management (F-15): focus the input when opened, return nothing on
  // close (the avatar button keeps focus, which is the correct host).
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), reduced ? 0 : 250);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, reduced]);

  // Escape closes (F-15), and unmount never leaves a dangling request (F-14).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      abortRef.current?.abort();
    };
  }, [open, onClose]);

  // Real-time thinking progression. The interval advances through the step
  // list every ~1.6 s and keeps a live elapsed-seconds counter. Cleared on
  // unmount and whenever busy flips false, so nothing ticks in the background.
  useEffect(() => {
    if (!busy) {
      setThinkingStep(0);
      setThinkingSeconds(0);
      return undefined;
    }
    setThinkingStep(0);
    setThinkingSeconds(0);
    const stepId = setInterval(() => {
      setThinkingStep((prev) => Math.min(prev + 1, (t.thinkingSteps?.length ?? 1) - 1));
    }, 1600);
    const secId = setInterval(() => setThinkingSeconds((prev) => prev + 1), 1000);
    return () => { clearInterval(stepId); clearInterval(secId); };
  }, [busy, t]);

  // Keep the newest message visible.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, busy, reduced]);

  function reportState(s) {
    onStateChange?.(s);
  }

  /** @param {string} text */
  async function submit(text) {
    const value = text.trim();
    if (!value || busy) return;
    setInput('');
    setBusy(true);
    reportState('thinking');

    /** @type {Msg[]} */
    const history = [...messages, { role: 'user', content: value }];
    setMessages(history);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendChat(value, /** @type {'en'|'id'} */ (lang), history.slice(0, -1), controller.signal);
      reportState(result.status);

      /** @type {Msg} */
      let reply;
      switch (result.status) {
        case 'success':
          reply = { role: 'assistant', content: result.message, kind: 'normal' };
          break;
        case 'out_of_scope':
          reply = { role: 'assistant', content: result.message, kind: 'out_of_scope' };
          break;
        case 'rate_limited':
          reply = { role: 'assistant', content: t.errorRateLimited, kind: 'rate_limited' };
          break;
        case 'budget_exhausted':
          reply = { role: 'assistant', content: t.errorBudget, kind: 'budget' };
          break;
        default:
          reply = { role: 'assistant', content: t.errorGeneric, kind: 'error' };
      }
      setMessages((prev) => [...prev, reply]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  /** @param {React.FormEvent} e */
  function onSubmit(e) {
    e.preventDefault();
    submit(input);
  }

  const showSuggestions = messages.length === 0;
  const suggestions = SUGGESTIONS[lang] ?? SUGGESTIONS.en;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={t.chatTitle + ' — ' + t.chatSubtitle}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={
            'fixed z-[60] flex flex-col overflow-hidden ' +
            'border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl ' +
            // Mobile: bottom sheet. Desktop: floating panel anchored right.
            'inset-x-0 bottom-0 h-[82dvh] rounded-t-2xl ' +
            'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[70vh] sm:w-[380px] sm:rounded-2xl'
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--accent-web))] to-[hsl(var(--accent-ai))] p-[2.5px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-zinc-100">
                  <NaraAvatar className="h-full w-full" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-white">{t.chatTitle}</p>
                <p className="text-[11px] leading-tight text-zinc-500">{t.chatSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="mx-auto max-w-[92%] rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-zinc-300">
              {t.chatIntro}
            </p>

            {showSuggestions && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t.suggestionsHeading}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      disabled={busy}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-accent-web/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    'max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ' +
                    (m.role === 'user'
                      ? 'bg-accent-web/15 text-white'
                      : m.kind === 'rate_limited' || m.kind === 'budget'
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : m.kind === 'error'
                          ? 'border border-red-500/30 bg-red-500/10 text-red-200'
                          : m.kind === 'out_of_scope'
                            ? 'border border-white/10 bg-white/[0.04] text-zinc-400'
                            : 'border border-white/10 bg-white/[0.05] text-zinc-200')
                  }
                >
                  {/* SR-006: rendered as text content, never as HTML. */}
                  {m.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] rounded-xl border border-accent-web/25 bg-accent-web/[0.07] px-3 py-2.5 text-[13px]"
                  role="status"
                  aria-live="polite"
                >
                  <span className="flex items-center gap-2 text-accent-web">
                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-web opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-web" />
                    </span>
                    <span className="font-medium">
                      {t.thinkingSteps?.[thinkingStep] ?? t.thinking}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-zinc-500">
                      {t.thinkingElapsed(thinkingSeconds)}
                    </span>
                  </span>
                  {/* progress dots — one per remaining step */}
                  <span className="mt-1.5 flex gap-1" aria-hidden="true">
                    {(t.thinkingSteps ?? []).map((_, i) => (
                      <span
                        key={i}
                        className={
                          'h-1 flex-1 rounded-full transition-colors duration-500 ' +
                          (i <= thinkingStep ? 'bg-accent-web' : 'bg-zinc-700')
                        }
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <label htmlFor="nara-input" className="sr-only">
                {t.inputLabel}
              </label>
              <input
                ref={inputRef}
                id="nara-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                maxLength={500}
                autoComplete="off"
                disabled={busy}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:border-accent-web/40 focus:outline-none focus:ring-1 focus:ring-accent-web/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t.send}
                className="rounded-xl bg-accent-web/20 p-2.5 text-accent-web transition-colors hover:bg-accent-web/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
