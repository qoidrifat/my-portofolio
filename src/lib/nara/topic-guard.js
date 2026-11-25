// @ts-check
// Deterministic topic gate — FR-KB-001 / FR-KB-005.
//
// Rejects clearly out-of-scope questions BEFORE any provider call, so an
// unrelated question costs zero tokens. The model's system prompt is a second
// layer, not the only one: prompt injection cannot widen scope because this
// check never reads instructions from the visitor, only vocabulary overlap.
//
// Intentionally conservative in both directions:
//  - a weak match still passes, letting the model answer or decline politely;
//  - a strong disallowed signal blocks immediately without spending tokens.

import { VOCABULARY } from './knowledge.js';

/** Subject matter that is never in scope, regardless of wording. */
const DISALLOWED_PATTERNS = [
  // Medical, legal, financial advice
  /\b(diagnos\w*|symptom\w*|medication|dosage|prescription)\b/i,
  /\b(lawsuit|legal advice|attorney|sue\b|litigation)\b/i,
  /\b(invest(ing|ment)? advice|stock tip|crypto tip|tax advice)\b/i,
  // Politics, news, current events
  /\b(election|president|politic\w*|government policy)\b/i,
  /\b(today'?s news|headline\w*|war in|latest news)\b/i,
  // Free content generation / general assistant asks
  /\b(write (me )?(a|an) (essay|poem|story|song|script|article))\b/i,
  /\b(translate|summarize) (this|the following)\b/i,
  /\b(write|generate|create) (me )?(a |an )?(python|javascript|java|c\+\+|php|code|program|app|website)\b/i,
  /\b(help me code|debug my code|fix my code|write code for)\b/i,
  // Shopping / recommendations
  /\b(buy|cheapest|discount|promo code|coupon)\b.*\b(iphone|laptop|phone|gadget)\b/i,
  // Jailbreak / policy override attempts
  /\b(ignore|disregard|forget)\b.{0,30}\b(instruction|prompt|rule|guideline)s?\b/i,
  /\b(system prompt|your (instructions|prompt)|reveal.{0,20}(prompt|config|key))\b/i,
  /\b(act as|pretend to be|you are now)\b.{0,30}\b(dan|gpt|assistant without)\b/i,
  /\b(jailbreak|developer mode|do anything now|DAN mode)\b/i,
  /\b(api[ _-]?key|secret key|access token|credentials?)\b/i,
];

/**
 * Words that indicate the visitor is asking about the portfolio itself, even
 * when they do not name a specific project or skill.
 */
const PORTFOLIO_INTENT = [
  'portfolio', 'project', 'projects', 'proyek', 'skill', 'skills', 'keahlian',
  'experience', 'pengalaman', 'work', 'karya', 'technology', 'technologies',
  'tech', 'stack', 'teknologi', 'contact', 'kontak', 'email', 'hire', 'hiring',
  'recruit', 'recruiter', 'cv', 'resume', 'education', 'pendidikan', 'about',
  'tentang', 'profile', 'profil', 'qoid', 'nara', 'developer', 'freelance',
  'available', 'availability', 'collaborate', 'kolaborasi',
];

/** @param {string} text */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @typedef {object} GateResult
 * @property {boolean} allowed
 * @property {'portfolio'|'out_of_scope'|'injection'|'too_short'|'too_long'} reason
 * @property {number} score
 */

/**
 * Decide whether a question is in scope.
 *
 * @param {string} question raw visitor message
 * @param {object} [limits]
 * @param {number} [limits.maxChars] default 2000 (PRD FR-API-004)
 * @param {number} [limits.minChars] default 2
 * @returns {GateResult}
 */
export function checkTopic(question, limits = {}) {
  const { maxChars = 2000, minChars = 2 } = limits;
  const raw = String(question || '');

  if (raw.length > maxChars) {
    return { allowed: false, reason: 'too_long', score: 0 };
  }

  const text = normalize(raw);
  if (text.length < minChars) {
    return { allowed: false, reason: 'too_short', score: 0 };
  }

  for (const re of DISALLOWED_PATTERNS) {
    if (re.test(text)) {
      return { allowed: false, reason: 'injection', score: 0 };
    }
  }

  const words = text.split(' ').filter((w) => w.length > 1);
  let score = 0;
  let vocabHits = 0;
  for (const w of words) {
    if (VOCABULARY.includes(w)) {
      score += 2;
      vocabHits++;
    } else if (PORTFOLIO_INTENT.includes(w)) {
      score += 1;
    }
  }

  // Two discriminators keep incidental word overlap from letting unrelated
  // questions through:
  //  1. An explicit portfolio-intent word (project, skill, contact, CV, ...)
  //     makes the question on-topic regardless of score.
  //  2. Without such a word, the question must actually address the portfolio
  //     subject ("qoid", "nara", "he", "the developer") — not merely contain
  //     a word that also appears in a project description ("weather" appears
  //     in one, "france" in another, "location" is a generic English word).
  const hasIntent = words.some((w) => PORTFOLIO_INTENT.includes(w));
  const subjectHit = ['qoid', 'nara', 'developer', 'engineer', 'his', 'her', 'he'].some(
    (w) => words.includes(w)
  );

  const allowed = hasIntent || (vocabHits > 0 && subjectHit);
  return { allowed, reason: allowed ? 'portfolio' : 'out_of_scope', score };
}

/** Fixed replies kept server-side so the client cannot drift from policy. */
export const OUT_OF_SCOPE_REPLY = {
  en: "Thanks for your question! I'm designed specifically to introduce Qoid's professional background, technical skills, and portfolio projects. I can't assist with topics outside this portfolio, but I'd be happy to help you explore his work.",
  id: 'Maaf, aku dirancang khusus untuk membantu menjelaskan informasi yang tersedia di portfolio ini. Aku belum dapat menjawab pertanyaan di luar profil, proyek, keahlian, dan informasi kontak yang ditampilkan di sini.',
};
