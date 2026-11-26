// @ts-check
// NARA chat visual tokens.
//
// Layout, spacing, type scale and surface colours are taken verbatim from the
// approved reference component. The single deliberate change is the accent:
// the reference uses another product's brand orange, while this portfolio's
// identity is the web/AI accent pair already defined in index.css. One constant
// to swap if the brand orange is ever wanted back.

/** Reference surfaces, used literally. */
export const SURFACE = Object.freeze({
  bg: '#050506',
  userBubble: '#1C1C20',
  userBubbleText: '#E4E4E8',
  answerText: '#F2F2F4',
  muted: '#8E8E93',
  shimmerBase: '#76767E',
  shimmerHi: '#F0EEE6',
  bodyInk: '#141416',
});

/**
 * NARA accent. Resolved from the live CSS custom property so it follows the
 * active theme, with the reference emerald as the fallback.
 */
export const ACCENT = 'hsl(var(--accent-ai))';

/** Plain hex for code paths that interpolate colours (hexmix needs #RRGGBB). */
export const ACCENT_HEX = '#10b981';

/** Accent as an `r,g,b` triple so callers can build `rgba()` at any alpha. */
export const ACCENT_RGB = '16,185,129';
