// @ts-check
// NARA copy — EN/ID strings, single source for all user-facing text.
// The out-of-scope refusal lives server-side (topic-guard.js) so the client
// cannot drift from policy; these strings cover presentation only.

export const COPY = Object.freeze({
  en: Object.freeze({
    bubbleGreeting: "Hey! I'm NARA, your guide to this portfolio. Want to look at the projects and tech?",
    bubbleSuggestions: [
      'Curious about the projects? I can show you around.',
      'Looking for a Full-Stack Developer? Let me walk you through the work.',
      'Want to know more about the technical stack?',
    ],
    chatTitle: 'NARA',
    chatSubtitle: 'Portfolio Guide',
    chatIntro: "Hi! I'm NARA. I can answer questions about Qoid's skills, experience, and projects — that's my whole scope.",
    inputPlaceholder: 'Ask about skills, projects, experience…',
    inputLabel: 'Ask NARA a question about the portfolio',
    send: 'Send',
    close: 'Close NARA chat',
    suggestionsHeading: 'Try asking',
    thinking: 'NARA is thinking…',
    thinkingSteps: [
      'Reading your question…',
      'Checking the portfolio facts…',
      'Comparing with published projects…',
      'Composing an answer…',
    ],
    thinkingElapsed: (s) => `${s}s`,
    errorGeneric: 'NARA is unavailable right now. Please try again in a moment.',
    errorRateLimited: 'NARA is taking a short break to stay fast for everyone. Please try again in a few minutes.',
    errorBudget: "NARA has reached this month's usage limit. Thank you for understanding!",
    errorOutOfScope: "I can only answer questions about this portfolio — skills, projects, and how to reach Qoid.",
    retry: 'Retry',
  }),
  id: Object.freeze({
    bubbleGreeting: 'Hai! Aku NARA, pemandu portfolio ini. Mau mengenal proyek dan teknologi yang digunakan di sini?',
    bubbleSuggestions: [
      'Sedang mencari tahu proyek yang pernah dikembangkan?',
      'Aku bisa bantu menjelaskan teknologi yang digunakan di sini.',
      'Mau tahu bagaimana salah satu project ini dibangun?',
    ],
    chatTitle: 'NARA',
    chatSubtitle: 'Pemandu Portfolio',
    chatIntro: 'Hai! Aku NARA. Aku bisa menjawab pertanyaan soal keahlian, pengalaman, dan proyek Qoid — itu saja cakupanku.',
    inputPlaceholder: 'Tanya soal skill, proyek, pengalaman…',
    inputLabel: 'Ajukan pertanyaan ke NARA tentang portfolio',
    send: 'Kirim',
    close: 'Tutup obrolan NARA',
    suggestionsHeading: 'Coba tanyakan',
    thinking: 'NARA sedang berpikir…',
    thinkingSteps: [
      'Membaca pertanyaan kamu…',
      'Memeriksa fakta portfolio…',
      'Membandingkan dengan proyek yang ada…',
      'Menyusun jawaban…',
    ],
    thinkingElapsed: (s) => `${s} dtk`,
    errorGeneric: 'NARA sedang tidak tersedia. Coba lagi sebentar lagi.',
    errorRateLimited: 'NARA butuh jeda singkat agar tetap cepat untuk semua orang. Coba lagi dalam beberapa menit.',
    errorBudget: "NARA sudah mencapai batas pemakaian bulan ini. Terima kasih atas pengertiannya!",
    errorOutOfScope: 'Aku hanya bisa menjawab tentang portfolio ini — keahlian, proyek, dan cara menghubungi Qoid.',
    retry: 'Coba lagi',
  }),
});

/**
 * @param {string} lang
 * @returns {Record<string, any>}
 */
export function copyFor(lang) {
  return COPY[/** @type {'en'|'id'} */ (lang)] ?? COPY.en;
}
