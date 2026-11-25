// @ts-check
// Response validator — FR-KB-006. A prompt-only restriction is not sufficient;
// every model reply is checked before it reaches the visitor (SR-006).

/** @returns {string} the fixed out-of-scope reply for the language */
function refusal(language) {
  return language === 'id'
    ? 'Maaf, aku dirancang khusus untuk membantu menjelaskan informasi yang tersedia di portfolio ini. Aku belum dapat menjawab pertanyaan di luar profil, proyek, keahlian, dan informasi kontak yang ditampilkan di sini.'
    : "Thanks for your question! I'm designed specifically to introduce Qoid's professional background, technical skills, and portfolio projects. I can't assist with topics outside this portfolio, but I'd be happy to help you explore his work.";
}

const INTERNAL_LEAKS = [
  /system prompt/i,
  /APPROVED PORTFOLIO FACTS/i,
  /DEPLOY_API_KEY/i,
  /api-cdn\.deploy\.com/i,
  /sk-[A-Za-z0-9]{16,}/,
  /you are nara[,.] the virtual portfolio guide/i,
];

/**
 * @typedef {object} ValidatedResponse
 * @property {'ok'|'refused'|'sanitized'} status
 * @property {string} message
 */

/**
 * @param {string} raw model output
 * @param {{ language: 'en'|'id', questionScore: number, factsProvided: boolean }} ctx
 * @returns {ValidatedResponse}
 */
export function validateResponse(raw, ctx) {
  let text = String(raw ?? '').trim();

  // 1. Hard length cap (FR-API-004: 200 output tokens ≈ 800 chars).
  if (text.length > 1200) text = `${text.slice(0, 1197)}…`;

  // 2. Internal leakage → refuse entirely; do not attempt to repair.
  if (INTERNAL_LEAKS.some((re) => re.test(text))) {
    return { status: 'refused', message: refusal(ctx.language) };
  }

  // 3. Strip markdown headings/code fences — plain text only (SR-006).
  const before = text;
  text = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-z]*\n?/g, '').trim())
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
  const sanitized = before !== text;

  // 4. Low-confidence lexical gate + no relevant facts provided → the model has
  //    nothing to ground on. Return the fixed refusal rather than speculation.
  if (ctx.questionScore === 0 && !ctx.factsProvided) {
    return { status: 'refused', message: refusal(ctx.language) };
  }

  return { status: sanitized ? 'sanitized' : 'ok', message: text };
}
