// @ts-check
// B9: a failed GitHub Search must surface as "unavailable" (null), never as a
// real-looking 0. The UI formats null as an em dash; 0 would read as a fact.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useGithubPRs, useGithubEvents } from '@/hooks/useGithubRepos';

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => createElement(QueryClientProvider, { client }, children);
};

afterEach(() => vi.unstubAllGlobals());

describe('GitHub Search failure is not reported as 0', () => {
  it('returns null when the Search API answers 422', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    const { result } = renderHook(() => useGithubPRs(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('still returns the real total on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ total_count: 7 }),
      })
    );
    const { result } = renderHook(() => useGithubPRs(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(7);
  });

  it('returns null when the events payload is not an array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'nope' }) })
    );
    const { result } = renderHook(() => useGithubEvents(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
