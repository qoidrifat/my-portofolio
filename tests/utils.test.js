import { describe, it, expect } from 'vitest';
import { cn, isIframe } from '@/lib/utils';

describe('cn (clsx + tailwind-merge)', () => {
  it('merges conflicting tailwind classes, last wins', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('keeps classes from different groups', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it('filters falsy values (conditional classes)', () => expect(cn('a', false && 'b', null, undefined)).toBe('a'));

  it('handles nested arrays and objects (clsx syntax)', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('isIframe', () => {
  it('is false in test env (jsdom top window)', () => {
    expect(isIframe).toBe(false);
  });
});
