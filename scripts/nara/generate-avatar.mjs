// @ts-check
// Regenerates src/components/nara/NaraAvatar.jsx from the approved DiceBear
// config. Run: node scripts/nara/generate-avatar.mjs
import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';
import { writeFileSync } from 'fs';

const CONFIG = {
  seed: 'NARA-Portfolio-Guide',
  eyes: ['variant03'],
  lips: ['variant02'],
  glasses: ['variant01'],
  glassesProbability: 100,
  beardProbability: 0,
  radius: 50,
  scale: 110,
};

const svg = createAvatar(notionists, CONFIG)
  .toString()
  .replace(/<metadata[\s\S]*?<\/metadata>/, '');

const component = `// @ts-check
// NARA profile avatar — the permanent face of the assistant.
// Generated ${new Date().toISOString().slice(0,10)} with DiceBear notionists (CC0): eyes variant03
// (open, round), glasses variant01, no beard. Inline SVG — no network
// request, renders identically in every browser. Regenerate via
// scripts/nara/generate-avatar.mjs.

/** @typedef {{ className?: string }} NaraAvatarProps */

const AVATAR_SVG = ${JSON.stringify(svg)};

/**
 * NARA avatar in a circular frame. Used in the chat header (large) and the
 * floating widget (small). Decorative — the accessible name lives on the
 * button/dialog that contains it.
 *
 * @param {NaraAvatarProps} props
 */
export default function NaraAvatar({ className = '' }) {
  return (
    <span
      className={'block overflow-hidden rounded-full ' + className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: AVATAR_SVG }}
    />
  );
}
`;

writeFileSync('src/components/nara/NaraAvatar.jsx', component);
console.log('NaraAvatar.jsx regenerated:', svg.length, 'bytes of SVG');
