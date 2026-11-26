// @ts-check
// Motion curves lifted verbatim from the reference component (claude-chat.html
// / segmented-control.html), so the ported animations move with the exact same
// physics instead of an approximation.
//
// Keeping these as pure functions (not framer-motion springs) is deliberate:
// the reference drives a continuous position value `x` through `spring()`, and
// reproducing that shape requires the same formula, not a similar-feeling
// spring config.

/** @param {number} x @param {number} a @param {number} b */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** @param {number} a @param {number} b @param {number} p */
export const mix = (a, b, p) => a + (b - a) * p;

/** Exponential ease-out. */
export const expo = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : (1 - Math.pow(2, -10 * p)) / (1 - Math.pow(2, -10)));

/** Cubic smoothstep — the reference's `smooth`. */
export const smooth = (p) => {
  const q = clamp(p);
  return q * q * (3 - 2 * q);
};

/** Under-damped spring, normalised to land exactly on 1. */
const sprRaw = (p) =>
  1 - Math.exp(-6.5 * p) * (Math.cos(9.86 * p) + (6.5 / 9.86) * Math.sin(9.86 * p));

/** @param {number} p elapsed fraction 0..1 */
export const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : sprRaw(p) / sprRaw(1));

/** Critically-damped settle — no overshoot. */
const softRaw = (q) => 1 - Math.exp(-7 * q) * (1 + 7 * q);
/** @param {number} p */
export const soft = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : softRaw(p) / softRaw(1));

/** @param {number} p */
export const ease3 = (p) => {
  const q = clamp(p);
  return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
};

/** @param {number} p */
export const io = (p) => {
  const q = clamp(p);
  return q < 0.5 ? 16 * q ** 5 : 1 - Math.pow(-2 * q + 2, 5) / 2;
};

/** @param {number} k @param {number} n */
export const md = (k, n) => ((k % n) + n) % n;

/** @param {number} t @param {number} a @param {number} b */
export const seg = (t, a, b) => clamp((t - a) / (b - a));

/** `#RRGGBB` -> `rgba(...)`. */
export const rgba = (/** @type {string} */ hex, /** @type {number} */ a) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
  return `rgba(${v.join(',')},${a})`;
};

/** Blend two `#RRGGBB` colours. */
export const hexmix = (/** @type {string} */ a, /** @type {string} */ b, /** @type {number} */ p) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(mix(v, pb[i], p))).join(',')})`;
};
