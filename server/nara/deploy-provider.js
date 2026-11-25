// @ts-check
// Deploy provider client — GATE 3. Configuration verified by live smoke test
// (2026-11-25): endpoint 200, model echoed, usage accounting present.

const BASE_URL = process.env.NARA_DEPLOY_BASE_URL || 'https://api-cdn.deploy.com/api/v1';
const MODEL_ID = process.env.NARA_MODEL_ID || 'zai-org/glm-5.3-flash';

/** @returns {string} */
function key() {
  const k = process.env.DEPLOY_API_KEY;
  if (!k || k.length < 10) throw new Error('api_key_missing');
  return k;
}

/**
 * @typedef {object} ProviderResult
 * @property {string} content
 * @property {{ promptTokens: number, completionTokens: number }} usage
 */

/**
 * One chat completion. Retries: none (PRD FR-API-007). Fails closed.
 *
 * @param {{ system: string, context: string, question: string, language: 'en'|'id', history?: Array<{role:'user'|'assistant', content:string}> }} req
 * @returns {Promise<ProviderResult>}
 */
export async function chatCompletion(req) {
  const messages = [
    { role: 'system', content: req.system },
  ];
  if (req.context) {
    messages.push({ role: 'system', content: `APPROVED PORTFOLIO FACTS:\n\n${req.context}` });
  }
  // History is server-validated upstream; only user/assistant pairs reach here.
  for (const m of req.history ?? []) {
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) });
  }
  messages.push({ role: 'user', content: req.question });

  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key()}`,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        // GLM-5.3-Flash is a reasoning model: reasoning_tokens consume the
        // completion budget BEFORE any visible content. Verified live:
        // 160 tokens produced finish_reason=length with empty content; 800
        // produced finish_reason=stop with a grounded 332-char answer.
        max_completion_tokens: Number(process.env.NARA_MAX_OUTPUT_TOKENS ?? 800),
        temperature: 0.3,
        stream: false,
      }),
      signal: AbortSignal.timeout(Number(process.env.NARA_PROVIDER_TIMEOUT_MS ?? 15000)),
    });
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new Error('provider_timeout');
    throw new Error('provider_network');
  }

  if (res.status === 401) throw new Error('provider_auth');
  if (res.status === 402) throw new Error('provider_credits');
  if (res.status === 429) throw new Error('provider_rate_limited');
  if (res.status >= 500) throw new Error('provider_capacity');
  if (!res.ok) throw new Error('provider_invalid_response');

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('provider_invalid_response');
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('provider_empty_response');
  }

  return {
    content,
    usage: {
      promptTokens: Number(body?.usage?.prompt_tokens ?? 0),
      completionTokens: Number(body?.usage?.completion_tokens ?? 0),
    },
  };
}

/** Model identity used for logging only — never returned to the visitor. */
export const modelId = MODEL_ID;
