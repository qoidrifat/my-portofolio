import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// GitHub search 422 guard: `+` between qualifiers must not survive as %2B.
const SRC = readFileSync('src/hooks/useGithubRepos.js', 'utf8');

describe('github search query building', () => {
  it('separates qualifiers with a space, never a literal +', () => {
    const calls = SRC.match(/fetchSearchCount\(`[^`]*`\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).not.toContain('+type:');
  });

  it('encodes the space as %20, matching the live 200 response', () => {
    expect(encodeURIComponent('author:qoidrifat type:pr')).toBe('author%3Aqoidrifat%20type%3Apr');
    expect(encodeURIComponent('author:qoidrifat+type:pr')).toBe('author%3Aqoidrifat%2Btype%3Apr');
  });
});
