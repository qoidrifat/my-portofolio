/**
 * Mascot Expression & Interaction Constants
 * Defines all 8 core autonomous expressions plus contextual interaction states.
 */

export const MASCOT_EXPRESSIONS = {
  NEUTRAL: 'neutral',
  HAPPY: 'happy',
  CURIOUS: 'curious',
  THINKING: 'thinking',
  SURPRISED: 'surprised',
  PLAYFUL: 'playful',
  SLEEPY: 'sleepy',
  EXCITED: 'excited',
  GREETING: 'greeting',
  CELEBRATING: 'celebrating',
  GUIDE: 'guide',
  IDLE: 'neutral', // Backward-compatibility alias
};

/**
 * 8 Core expressions available for autonomous procedural scheduling
 */
export const AUTONOMOUS_EXPRESSIONS = [
  MASCOT_EXPRESSIONS.NEUTRAL,
  MASCOT_EXPRESSIONS.HAPPY,
  MASCOT_EXPRESSIONS.CURIOUS,
  MASCOT_EXPRESSIONS.THINKING,
  MASCOT_EXPRESSIONS.SURPRISED,
  MASCOT_EXPRESSIONS.PLAYFUL,
  MASCOT_EXPRESSIONS.SLEEPY,
  MASCOT_EXPRESSIONS.EXCITED,
];

export const MASCOT_TIMINGS = {
  EXPRESSION_INTERVAL_MS: 3000,
  BLINK_MIN_MS: 2800,
  BLINK_MAX_MS: 5200,
  DOUBLE_BLINK_CHANCE: 0.18,
  WELCOME_DELAY_MS: 1200,
  WELCOME_DURATION_MS: 3000,
  CELEBRATION_DURATION_MS: 2400,
  MAX_GAZE_DISTANCE_PX: 850,
  MAX_PUPIL_OFFSET_X: 7.5,
  MAX_PUPIL_OFFSET_Y: 5.5,
  MAX_HEAD_TILT_DEG: 4.5,
};

export const MASCOT_COPY = {
  en: {
    greeting: "Hey there! I'm Qoid's digital companion.",
    prompt: 'Curious about what we build?',
    actions: {
      projects: 'Explore Projects',
      about: 'Meet the Developer',
      contact: 'Get in Touch',
    },
    ariaLabel: 'Interactive companion mascot. Click or press Enter to chat.',
    closeLabel: 'Close dialog',
  },
  id: {
    greeting: 'Halo! Saya pendamping digital Qoid.',
    prompt: 'Ingin menjelajahi karya yang kami bangun?',
    actions: {
      projects: 'Jelajahi Proyek',
      about: 'Profil Pengembang',
      contact: 'Hubungi Qoid',
    },
    ariaLabel: 'Maskot pendamping interaktif. Klik atau tekan Enter untuk berinteraksi.',
    closeLabel: 'Tutup dialog',
  },
};
