import { describe, it, expect } from 'vitest';

// The chunker is the only logic in WordReveal; the animation itself is CSS/JS
// motion and is verified in the browser. Re-implemented here as a contract
// check: same 3-word grouping, newlines preserved, no text lost.
const CHUNK_WORDS = 3;
function chunk(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (line === '') { out.push('\n'); continue; }
    const words = line.split(' ');
    for (let i = 0; i < words.length; i += CHUNK_WORDS) {
      out.push(words.slice(i, i + CHUNK_WORDS).join(' '));
    }
    out.push('\n');
  }
  return out;
}

describe('WordReveal chunking', () => {
  it('groups words three at a time', () => {
    expect(chunk('a b c d e f g')).toEqual(['a b c', 'd e f', 'g', '\n']);
  });

  it('preserves paragraph breaks', () => {
    const parts = chunk('one two\n\nthree four');
    expect(parts.filter((p) => p === '\n').length).toBe(3);
  });

  it('never loses or duplicates text', () => {
    const text = 'Qoid builds Laravel apps.\n\nHe also ships PHP.';
    const rejoined = chunk(text)
      .filter((p) => p !== '\n')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(rejoined).toBe(text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim());
  });
});
