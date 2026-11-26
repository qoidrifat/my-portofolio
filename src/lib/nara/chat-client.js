// @ts-check
// Same-origin chat client — F-12 states, F-14 error handling.
// Never imports provider config: the browser talks only to /api/nara-chat.

import { logError } from '@/lib/errors';

/** @typedef {'idle'|'opening'|'ready'|'thinking'|'answering'|'error'|'rate_limited'|'budget_exhausted'|'out_of_scope'|'closed'} ChatState */

const ENDPOINT = '/api/nara-chat';

/** Anonymous opaque session id — regenerated per browser session (SR-007). */
function getSessionId() {
  try {
    const key = 'nara-session';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2, 10);
  }
}

/**
 * @typedef {object} ChatResult
 * @property {'success'|'out_of_scope'|'rate_limited'|'budget_exhausted'|'error'} status
 * @property {string} message
 * @property {number} [remainingSessionMessages]
 * @property {number} [reasoningTokens] Real reasoning tokens reported by the provider.
 */

/**
 * @param {string} message
 * @param {'en'|'id'} language
 * @param {Array<{role:'user'|'assistant', content:string}>} [conversation]
 * @param {AbortSignal} [signal]
 * @returns {Promise<ChatResult>}
 */
export async function sendChat(message, language = 'en', conversation = [], signal) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nara-lang': language },
      signal,
      body: JSON.stringify({
        sessionId: getSessionId(),
        message,
        language,
        // Server validates every entry; only the last two turns are sent (F-13).
        conversation: conversation.slice(-2),
      }),
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    // Log the exact reason so a broken endpoint or CORS block is immediately
    // visible in the browser console instead of silently showing 'unavailable'.
    logError('NARA', e, { extra: { step: 'fetch', endpoint: ENDPOINT } });
    return { status: 'error', message: '' };
  }

  if (res.status === 429) {
    const retry = res.headers.get('retry-after');
    return { status: 'rate_limited', message: '', remainingSessionMessages: retry ? Number(retry) : undefined };
  }
  if (res.status === 402) {
    return { status: 'budget_exhausted', message: '' };
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    logError('NARA', e, { status: res.status, extra: { step: 'parse', endpoint: ENDPOINT } });
    return { status: 'error', message: '' };
  }

  if (!res.ok) {
    // Surface the exact HTTP status + server status field for debugging.
    logError('NARA', data?.status || `HTTP ${res.status}`, {
      status: res.status,
      extra: { step: 'api', endpoint: ENDPOINT },
    });
    return { status: 'error', message: '' };
  }

  return {
    status: data.scope === 'portfolio' ? 'success' : data.status === 'out_of_scope' ? 'out_of_scope' : 'success',
    message: typeof data.message === 'string' ? data.message : '',
    remainingSessionMessages: data.usage?.remainingSessionMessages,
    reasoningTokens: Number(data.usage?.reasoningTokens ?? 0),
  };
}
