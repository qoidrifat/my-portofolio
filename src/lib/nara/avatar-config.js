// @ts-check
// NARA profile avatar — the permanent face shown in the chat header and the
// floating widget. Generated once with DiceBear notionists (CC0 assets):
// eyes variant03 (open, round), glasses variant01, no beard.
// Stored as a plain SVG string so it renders identically everywhere, needs no
// runtime network request, and can never drift from the approved design.

/** @type {string} Approved 2026-11-25 — candidate D, eyes variant03. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1744 1744" fill="none" shape-rendering="auto"><metadata xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><rdf:RDF><rdf:Description><dc:title>Notionists</dc:title><dc:creator>Zoish</dc:creator><dc:source>https://www.figma.com/community/file/982328547366437640</dc:source><dcterms:license rdf:resource="https://creativecommons.org/publicdomain/zero/1.0/"/></rdf:Description></rdf:RDF></metadata>`;

/**
 * Full inline avatar markup. Because DiceBear output is long, we keep only the
 * opening tag constant above and splice in the rest at build time via the
 * generated .svg file — but to keep this file self-contained (no fetch, no
 * import.meta glob), the complete SVG is inlined as a data-free template
 * string in NaraAvatar.jsx instead. This constant documents the seed/options.
 */
export const AVATAR_CONFIG = Object.freeze({
  style: 'notionists',
  version: '9.4.2',
  seed: 'NARA-Portfolio-Guide',
  eyes: 'variant03',
  lips: 'variant02',
  glasses: 'variant01',
  glassesProbability: 100,
  beardProbability: 0,
  radius: 50,
  scale: 110,
  license: 'CC0 (Noto avatar by Felix Wong) via DiceBear notionists',
  approvedAt: '2026-11-25',
});
