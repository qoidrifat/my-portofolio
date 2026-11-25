// @ts-check
import { describe, it, expect } from 'vitest';
import { describeError } from '@/lib/errors';

describe('describeError', () => {
  it('extracts reason + source file:line from an Error', () => {
    const err = new Error('boom');
    err.stack = [
      'Error: boom',
      '    at submit (http://localhost:5173/src/components/nara/NaraChatPanel.jsx:120:9)',
    ].join('\n');
    const r = describeError('NARA', err, { status: 503 });
    expect(r.reason).toBe('boom');
    expect(r.at).toBe('components/nara/NaraChatPanel.jsx:120');
    expect(r.status).toBe(503);
  });

  it('skips helper frames belonging to errors.js', () => {
    const err = new Error('net');
    err.stack = [
      'Error: net',
      '    at logError (http://localhost/src/lib/errors.js:70:3)',
      '    at sendChat (http://localhost/src/lib/nara/chat-client.js:57:5)',
    ].join('\n');
    expect(describeError('NARA', err).at).toBe('lib/nara/chat-client.js:57');
  });

  it('accepts a string reason and survives a missing stack', () => {
    expect(describeError('NARA', 'HTTP 500')).toMatchObject({ reason: 'HTTP 500', at: 'unknown (no stack)' });
  });
});
