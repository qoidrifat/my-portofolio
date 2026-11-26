// @ts-check
// NARA copy — EN/ID strings, single source for all user-facing text.
// The out-of-scope refusal lives server-side (topic-guard.js) so the client
// cannot drift from policy; these strings cover presentation only.

export const COPY = Object.freeze({
  en: Object.freeze({
    bubbleGreeting: "Hey! I'm NARA, your guide to this portfolio. Want to look at the projects and tech?",
    bubbleSuggestions: [
      'What are the strongest projects?',
      'What tech does Qoid use daily?',
    ],
    bubbleLabel: 'Ask NARA',
    // Proactive nudges, one per section, shown at most a few times a session.
    sectionPrompts: {
      journey: {
        text: "I can walk you through the timeline — roles, years, and what changed.",
        question: "What is Qoid's experience timeline?",
      },
      projects: {
        text: 'Curious about a project? I know the stack and the numbers behind it.',
        question: 'Tell me about the most interesting project.',
      },
      skills: {
        text: 'Want the skills broken down by years and depth?',
        question: "What are Qoid's strongest technical skills?",
      },
      github: {
        text: 'These cards update live. Ask me which repo to open first.',
        question: 'Which repositories should I look at first?',
      },
      contact: {
        text: 'Want to reach Qoid? I can tell you the fastest way.',
        question: 'How can I contact Qoid?',
      },
    },
    chatTitle: 'NARA',
    chatSubtitle: 'Portfolio Guide',
    chatIntro: "Hi! I'm NARA. I can answer questions about Qoid's skills, experience, and projects — that's my whole scope.",
    inputPlaceholder: 'Ask about skills, projects, experience…',
    inputLabel: 'Ask NARA a question about the portfolio',
    send: 'Send',
    close: 'Close NARA chat',
    suggestionsHeading: 'Try asking',
    thinking: 'NARA is thinking…',
    thinkingWord: 'Thinking',
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
      'Apa proyek paling menarik di sini?',
      'Teknologi apa yang dipakai sehari-hari?',
    ],
    bubbleLabel: 'Tanya NARA',
    sectionPrompts: {
      journey: {
        text: 'Aku bisa jelaskan garis waktu kariernya — peran, tahun, dan perubahannya.',
        question: 'Bagaimana garis waktu pengalaman Qoid?',
      },
      projects: {
        text: 'Mau bahas sebuah proyek? Aku tahu teknologinya dan angka di belakangnya.',
        question: 'Ceritakan proyek yang paling menarik.',
      },
      skills: {
        text: 'Mau rincian keahlian berdasarkan tahun dan kedalamannya?',
        question: 'Apa keahlian teknis terkuat Qoid?',
      },
      github: {
        text: 'Kartu di sini diperbarui langsung. Tanya aku repo mana yang dibuka dulu.',
        question: 'Repo mana yang sebaiknya aku lihat dulu?',
      },
      contact: {
        text: 'Mau menghubungi Qoid? Aku tahu jalur tercepatnya.',
        question: 'Bagaimana cara menghubungi Qoid?',
      },
    },
    chatTitle: 'NARA',
    chatSubtitle: 'Pemandu Portfolio',
    chatIntro: 'Hai! Aku NARA. Aku bisa menjawab pertanyaan soal keahlian, pengalaman, dan proyek Qoid — itu saja cakupanku.',
    inputPlaceholder: 'Tanya soal skill, proyek, pengalaman…',
    inputLabel: 'Ajukan pertanyaan ke NARA tentang portfolio',
    send: 'Kirim',
    close: 'Tutup obrolan NARA',
    suggestionsHeading: 'Coba tanyakan',
    thinking: 'NARA sedang berpikir…',
    thinkingWord: 'Thinking',
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
