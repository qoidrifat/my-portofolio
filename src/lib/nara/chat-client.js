// @ts-check
// Same-origin chat client — F-12 states, F-14 error handling.
// Never imports provider config: the browser talks only to /api/nara/chat.

/** @typedef {'idle'|'opening'|'ready'|'thinking'|'answering'|'error'|'rate_limited'|'budget_exhausted'|'out_of_scope'|'closed'} ChatState */

const ENDPOINT = '/api/nara/chat';

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
      headers: { 'Content-Type': 'application/json' },
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
  } catch {
    return { status: 'error', message: '' };
  }

  if (!res.ok) return { status: 'error', message: '' };

  return {
    status: data.scope === 'portfolio' ? 'success' : data.status === 'out_of_scope' ? 'out_of_scope' : 'success',
    message: typeof data.message === 'string' ? data.message : '',
    remainingSessionMessages: data.usage?.remainingSessionMessages,
  };
}
