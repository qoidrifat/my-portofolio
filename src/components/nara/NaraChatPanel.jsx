// @ts-check
// NARA floating chat panel — desktop floating panel / mobile bottom sheet.
//
// Design notes:
// - No AbortController: aborting an in-flight request from a cleanup effect
//   caused a race where every parent re-render (thinking-state change, new
//   onClose identity) re-ran the cleanup and killed the request the visitor
//   had just sent. The request now always completes — the visitor sees either
//   the answer or the error message, never silence.
// - The model output is rendered as text only (SR-006) — never as HTML.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { copyFor } from '@/lib/nara/nara-copy';
import { sendChat } from '@/lib/nara/chat-client';
import { logError } from '@/lib/errors';
import NaraAvatar from './NaraAvatar.jsx';

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

/** Real-time thinking steps — advance while the provider works. */
const THINKING_INTERVAL_MS = 2400;

/**
 * @param {{ open: boolean, onClose: () => void, onStateChange?: (s: string) => void }} props
 */
export default function NaraChatPanel({ open, onClose, onStateChange }) {
  const { lang } = useLanguage();
  /** @type {any} */
  const langT = lang;
  const t = copyFor(/** @type {'en'|'id'} */ (langT));
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState(/** @type {Msg[]} */ ([]));
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  // Real-time thinking feedback: steps advance on a timer while the provider works.
  const [thinkingStep, setThinkingStep] = useState(0);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const listRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  // Focus the input when opened (F-15).
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), reduced ? 0 : 250);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, reduced]);

  // Escape closes (F-15).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Real-time thinking progression — advances every 2.4 s with a live counter.
  // Cleared whenever busy flips false, so nothing ticks in the background.
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
    }, THINKING_INTERVAL_MS);
    const secId = setInterval(() => setThinkingSeconds((prev) => prev + 1), 1000);
    return () => { clearInterval(stepId); clearInterval(secId); };
  }, [busy, t]);

  // Keep the newest message visible.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, busy, reduced]);

  /** @param {string} s */
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

    try {
      const result = await sendChat(value, /** @type {'en'|'id'} */ (langT), history.slice(0, -1));
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
    } catch (e) {
      // A thrown client (abort, storage, unexpected parse) must still end with
      // a visible reply — silence reads as "NARA never answered".
      logError('NARA', e, { extra: { step: 'submit' } });
      reportState('error');
      setMessages((prev) => [...prev, { role: 'assistant', content: t.errorGeneric, kind: 'error' }]);
    } finally {
      setBusy(false);
    }
  }

  /** @param {React.FormEvent} e */
  function onSubmit(e) {
    e.preventDefault();
    submit(input);
  }

  const showSuggestions = messages.length === 0;
  const suggestions = SUGGESTIONS[langT] ?? SUGGESTIONS.en;

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-label={t.chatTitle + ' — ' + t.chatSubtitle}
          style={{ zIndex: 60 }}
          className={
            'fixed z-[60] flex flex-col overflow-hidden ' +
            'border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl ' +
            'inset-x-0 bottom-0 h-[82dvh] rounded-t-2xl ' +
            'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[70vh] sm:w-[380px] sm:rounded-2xl'
          }
        >
          {/* Header — NARA avatar clearly visible next to the name */}
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
                  {m.content}
                </div>
              </div>
            ))}

            {/* Real-time thinking — high-contrast, avatar visible, live progress */}
            {busy && (
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--accent-web))] to-[hsl(var(--accent-ai))] p-[2px]" aria-hidden="true">
                  <div className="h-full w-full overflow-hidden rounded-full bg-zinc-100">
                    <NaraAvatar className="h-full w-full" />
                  </div>
                </div>
                <div
                  className="max-w-[80%] rounded-2xl rounded-tl-md border border-white/15 bg-zinc-800/95 px-4 py-3 shadow-lg"
                  role="status"
                  aria-live="polite"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[13.5px] font-semibold leading-snug text-zinc-100">
                      {t.thinkingSteps?.[thinkingStep] ?? t.thinking}
                    </span>
                  </span>
                  <span className="mt-2.5 flex items-center gap-2.5" aria-hidden="true">
                    <span className="flex flex-1 gap-1">
                      {(t.thinkingSteps ?? []).map((_, i) => (
                        <span
                          key={i}
                          className={
                            'h-1.5 flex-1 rounded-full transition-all duration-500 ' +
                            (i < thinkingStep ? 'bg-emerald-400' : i === thinkingStep ? 'bg-emerald-400/60' : 'bg-zinc-600')
                          }
                        />
                      ))}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                      {t.thinkingElapsed(thinkingSeconds)}
                    </span>
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
        </div>
      )}
    </AnimatePresence>
  );
}
