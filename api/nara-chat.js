// @ts-check
// Vercel function — POST /api/nara/chat (PRD §26).
// Flow: validate → gate → context → rate limit → budget → provider → validate
// → reconcile. Every failure path fails closed and never leaks internals.
//
// Note on routing: vercel.json's catch-all rewrite `/(.*) -> /index.html`
// applies only to paths with no filesystem/function match; Vercel Functions
// take precedence, so /api/nara-chat is served by this file. Verified against
// the deployed routing table in the release-candidate phases.

import { renderContextForPrompt, selectContext, KNOWLEDGE } from '../../src/lib/nara/knowledge.js';
import { checkTopic } from '../../src/lib/nara/topic-guard.js';
import { systemPrompt } from '../../server/nara/prompt-policy.js';
import { validateResponse } from '../../server/nara/response-validator.js';
import { chatCompletion } from '../../server/nara/deploy-provider.js';
import { checkAndReserve, reconcileUsage, releaseReservation } from '../../server/nara/rate-limiter.js';

export const config = { runtime: 'nodejs18.x' };

const MAX_BODY_BYTES = 8 * 1024;

/** Normalize every error to a safe category + safe visitor message. */
const SAFE_ERRORS = {
  provider_timeout: { status: 503, kind: 'error' },
  provider_network: { status: 503, kind: 'error' },
  provider_auth: { status: 503, kind: 'error' },
  provider_credits: { status: 503, kind: 'budget_exhausted' },
  provider_rate_limited: { status: 503, kind: 'rate_limited' },
  provider_capacity: { status: 503, kind: 'error' },
  provider_invalid_response: { status: 502, kind: 'error' },
  provider_empty_response: { status: 502, kind: 'error' },
  api_key_missing: { status: 503, kind: 'error' },
  storage_unavailable: { status: 503, kind: 'error' },
};

/** @param {string} category @param {'en'|'id'} language */
function safeMessage(category, language) {
  const en = {
    error: 'NARA is unavailable right now. Please try again in a moment.',
    rate_limited: 'NARA is taking a short break to stay fast for everyone. Please try again in a few minutes.',
    budget_exhausted: "NARA has reached this month's usage limit. Thank you for understanding!",
  };
  const id = {
    error: 'NARA sedang tidak tersedia. Coba lagi sebentar lagi.',
    rate_limited: 'NARA butuh jeda singkat agar tetap cepat untuk semua orang. Coba lagi dalam beberapa menit.',
    budget_exhausted: 'NARA sudah mencapai batas pemakaian bulan ini. Terima kasih atas pengertiannya!',
  };
  return (language === 'id' ? id : en)[SAFE_ERRORS[category]?.kind ?? 'error'];
}

export default async function handler(req, res) {
  const started = Date.now();
  const origin = req.headers.origin || '';
  const language = req.headers['x-nara-lang'] === 'id' ? 'id' : 'en';

  // Same-origin protection (SR-003). The known portfolio origins only.
  const allowed = ['https://qoidlab.my.id', 'https://my-portofolio-qoidrifat.vercel.app'];
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && !allowed.includes(origin) && !isLocal) {
    return res.status(403).json({ ok: false, status: 'forbidden' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, status: 'method_not_allowed' });
  }

  // SR-002: content type + size before any parsing.
  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('application/json')) {
    return res.status(415).json({ ok: false, status: 'unsupported_media_type' });
  }

  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BODY_BYTES) {
    return res.status(413).json({ ok: false, status: 'payload_too_large' });
  }

  let body;
  try {
    body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(raw);
  } catch {
    return res.status(400).json({ ok: false, status: 'invalid_json' });
  }

  const message = typeof body.message === 'string' ? body.message : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : '';
  if (!message || !sessionId) {
    return res.status(400).json({ ok: false, status: 'invalid_request' });
  }

  // FR-KB-001/005: deterministic gate BEFORE anything else.
  const gate = checkTopic(message);
  if (gate.reason === 'too_long') {
    return res.status(413).json({ ok: false, status: 'message_too_long' });
  }
  if (gate.reason === 'too_short') {
    return res.status(400).json({ ok: false, status: 'message_too_short' });
  }
  if (!gate.allowed) {
    // Zero provider cost for out-of-scope questions.
    const reply = language === 'id'
      ? 'Maaf, aku dirancang khusus untuk membantu menjelaskan informasi yang tersedia di portfolio ini. Aku belum dapat menjawab pertanyaan di luar profil, proyek, keahlian, dan informasi kontak yang ditampilkan di sini.'
      : "Thanks for your question! I'm designed specifically to introduce Qoid's professional background, technical skills, and portfolio projects. I can't assist with topics outside this portfolio, but I'd be happy to help you explore his work.";
    return res.status(200).json({ ok: true, status: 'out_of_scope', scope: 'refusal', message: reply });
  }

  // FR-RATE-001: trusted server-side IP only. Vercel sets x-forwarded-for from
  // its own edge; a client cannot forge the first hop behind the platform LB.
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  const ip = forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

  // FR-RATE-002..010 + SR-010: all limits, atomically, fail closed.
  const gateResult = await checkAndReserve({ ip, sessionId });
  if (!gateResult.ok) {
    const map = {
      ip_burst: 429, ip_daily: 429, session_daily: 429,
      global_daily: 429, monthly_requests: 429,
      monthly_budget: 402, concurrent: 429, storage_unavailable: 503,
    };
    const code = map[gateResult.status] ?? 503;
    const kind =
      gateResult.status === 'monthly_budget' ? 'budget_exhausted'
      : gateResult.status === 'storage_unavailable' ? 'error'
      : 'rate_limited';
    return res.status(code).json({
      ok: false,
      status: gateResult.status,
      message: safeMessage(kind === 'error' ? 'storage_unavailable' : gateResult.status === 'monthly_budget' ? 'provider_credits' : 'provider_rate_limited', language),
    });
  }

  // FR-KB-002: only facts relevant to the question.
  const context = renderContextForPrompt({ question: message });
  const factsProvided = /## RELEVANT PROJECTS/.test(context);

  try {
    const provider = await chatCompletion({
      system: systemPrompt(language),
      context,
      question: message,
      language,
      history: Array.isArray(body.conversation) ? body.conversation.slice(-2) : [],
    });

    // FR-RATE-008: reconcile with provider-reported usage, release the lock.
    await reconcileUsage({
      sessionId,
      promptTokens: provider.usage.promptTokens,
      completionTokens: provider.usage.completionTokens,
    });

    // FR-KB-006: validate before returning (SR-006).
    const validated = validateResponse(provider.content, {
      language,
      questionScore: gate.score,
      factsProvided,
    });

    return res.status(200).json({
      ok: true,
      status: validated.status,
      scope: 'portfolio',
      message: validated.message,
      usage: { remainingSessionMessages: gateResult.remaining ?? null },
    });
  } catch (e) {
    // Release the reservation: the request failed mid-flight.
    await releaseReservation(sessionId);
    const category = e?.message && SAFE_ERRORS[e.message] ? e.message : 'provider_invalid_response';
    const meta = SAFE_ERRORS[category] ?? { status: 502, kind: 'error' };
    return res.status(meta.status).json({
      ok: false,
      status: category,
      message: safeMessage(category, language),
    });
  }
}
