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
import { ThinkingBlock, StreamingText, ThoughtFor } from './ThinkingStream.jsx';
import { ACCENT_HEX, SURFACE } from './theme.js';

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
/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onStateChange?: (s: string) => void,
 *   seed?: { text: string, nonce: number } | null,
 *   onSeedConsumed?: () => void,
 * }} props
 */
export default function NaraChatPanel({ open, onClose, onStateChange, seed = null, onSeedConsumed }) {
  const { lang } = useLanguage();
  /** @type {any} */
  const langT = lang;
  const t = copyFor(/** @type {'en'|'id'} */ (langT));
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState(/** @type {Msg[]} */ ([]));
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  /** Duration of the most recent thinker, shown as "Thought for Ns". */
  const [lastThoughtSeconds, setLastThoughtSeconds] = useState(0);
  /** Real reasoning tokens reported by the provider for the current question. */
  const [reasoningTokens, setReasoningTokens] = useState(0);
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

  // Elapsed seconds for the thinking timer. The reasoning count itself comes
  // from the provider, so the indicator never invents progress.
  useEffect(() => {
    if (!busy) {
      setThinkingSeconds(0);
      return undefined;
    }
    setThinkingSeconds(0);
    setReasoningTokens(0);
    const secId = setInterval(() => setThinkingSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(secId);
  }, [busy]);

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
    const thinkingStartedAt = performance.now();

    /** @type {Msg[]} */
    const history = [...messages, { role: 'user', content: value }];
    setMessages(history);

    try {
      const result = await sendChat(value, /** @type {'en'|'id'} */ (langT), history.slice(0, -1));
      reportState(result.status);
      setReasoningTokens(result.reasoningTokens ?? 0);
      setLastThoughtSeconds(Math.max(1, Math.round((performance.now() - thinkingStartedAt) / 1000)));

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

  // A bubble chip or section nudge already knows the question — send it as if
  // the visitor had typed it. nonce makes each seed fire exactly once.
  const consumedSeedRef = useRef(-1);
  useEffect(() => {
    if (!open || !seed || seed.nonce === consumedSeedRef.current) return;
    consumedSeedRef.current = seed.nonce;
    onSeedConsumed?.();
    submit(seed.text);
  }, [open, seed]);

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

            {messages.map((m, i) => {
              // Only the newest assistant reply streams. Older messages are
              // already read; replaying the reveal on every re-render would
              // restart the typewriter whenever parent state changed.
              const isFresh = m.role === 'assistant' && i === messages.length - 1 && m.kind === 'normal';
              const isUser = m.role === 'user';
              const isNotice = m.kind === 'rate_limited' || m.kind === 'budget' || m.kind === 'error' || m.kind === 'out_of_scope';

              // Surfaces and type from the reference: right-aligned #1C1C20 pill
              // for the prompt, plain #F2F2F4 text for the answer (no card).
              if (isUser) {
                return (
                  <div key={i} className="flex justify-end">
                    <div
                      className="max-w-[85%] rounded-[10px] rounded-br-[4px] px-2.5 py-1.5 text-[12px] font-medium leading-[1.4]"
                      style={{ background: SURFACE.userBubble, color: SURFACE.userBubbleText }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              }

              if (isNotice) {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[88%] border-l-2 border-amber-500/40 pl-2.5 text-[12px] leading-[1.45] text-[#C9C9CE]">
                      {m.content}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="flex justify-start">
                  <div
                    className="max-w-[92%] text-[12.5px] font-medium leading-[1.45]"
                    style={{ color: SURFACE.answerText }}
                  >
                    {isFresh && (
                      <ThoughtFor
                        seconds={lastThoughtSeconds}
                        reasoningTokens={reasoningTokens}
                        accent={ACCENT_HEX}
                        reduced={reduced}
                      />
                    )}
                    {isFresh ? (
                      <StreamingText text={m.content} accent={ACCENT_HEX} animate={!reduced} />
                    ) : (
                      <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking — shimmered label, rolling seconds, reasoning lines rising. */}
            {busy && (
              <div role="status" aria-live="polite">
                <ThinkingBlock
                  label={t.thinkingWord ?? 'Thinking'}
                  steps={t.thinkingSteps ?? []}
                  seconds={thinkingSeconds}
                  accent={ACCENT_HEX}
                />
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
