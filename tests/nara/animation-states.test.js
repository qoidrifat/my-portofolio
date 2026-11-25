// @ts-check
// NARA state machine — deterministic transitions, priority enforcement, and
// fail-safe timeouts. PRD §16 and FR-3D-006.
import { describe, it, expect } from 'vitest';
import {
  transition, isAnimatedState, STATE_PRIORITY, STATE_TIMEOUT_MS,
} from '@/lib/nara/animation-states';

describe('NARA state machine — entrance', () => {
  it('starts hidden on mount', () => {
    expect(transition('hidden', 'mount').state).toBe('hidden');
  });

  it('appears only after the real intro completion event (FR-3D-007)', () => {
    // introDone=false must NOT trigger the entrance — no timer-based greeting.
    const r = transition('hidden', 'intro_done', { introDone: false });
    expect(r.state).toBe('hidden');
    expect(r.changed).toBe(false);
  });

  it('appears on intro completion, then greets, then idles', () => {
    const a = transition('hidden', 'intro_done', { introDone: true, greeted: false });
    expect(a.state).toBe('appearing');
    const g = transition(a.state, 'appeared', { greeted: false });
    expect(g.state).toBe('greeting');
    const i = transition(g.state, 'greeted');
    expect(i.state).toBe('idle');
  });

  it('never greets twice in a session', () => {
    const r = transition('hidden', 'intro_done', { introDone: true, greeted: true });
    expect(r.state).toBe('idle');
    expect(r.state).not.toBe('greeting');
    expect(r.state).not.toBe('appearing');
  });
});

describe('NARA state machine — chat states and priority (FR-3D-006)', () => {
  it('open chat -> listening -> thinking -> speaking -> idle', () => {
    let s = 'idle';
    s = transition(s, 'chat_open').state;
    expect(s).toBe('listening');
    s = transition(s, 'request_sent').state;
    expect(s).toBe('thinking');
    s = transition(s, 'response_received').state;
    expect(s).toBe('speaking');
    s = transition(s, 'response_done').state;
    expect(s).toBe('idle');
  });

  it('greeting (priority 7) is not interrupted by chat state (priority 6)', () => {
    const r = transition('greeting', 'request_sent');
    expect(r.state).toBe('greeting');
    expect(r.changed).toBe(false);
  });

  it('idle transitions to thinking when a request is sent', () => {
    expect(transition('idle', 'request_sent').state).toBe('thinking');
  });

  it('chat close returns to idle only from low-priority states', () => {
    expect(transition('speaking', 'chat_close').state).toBe('idle');
    expect(transition('greeting', 'chat_close').state).toBe('greeting');
  });
});

describe('NARA state machine — pointer tracking (FR-3D-005)', () => {
  it('idle -> looking on pointer move', () => {
    expect(transition('idle', 'pointer_move').state).toBe('looking');
  });

  it('looking returns to idle when the pointer leaves', () => {
    expect(transition('looking', 'pointer_leave').state).toBe('idle');
  });

  it('does not track while greeting', () => {
    expect(transition('greeting', 'pointer_move').state).toBe('greeting');
  });

  it('does not appear from pure pointer movement', () => {
    expect(transition('hidden', 'pointer_move').state).toBe('hidden');
  });
});

describe('NARA state machine — reduced motion and fallback (AC-16, AC-17)', () => {
  it('reduced motion skips appearing/greeting and goes straight to idle', () => {
    const r = transition('hidden', 'intro_done', {
      introDone: true, greeted: false, reducedMotion: true,
    });
    expect(r.state).toBe('idle');
  });

  it('missing WebGL parks the widget in fallback permanently', () => {
    for (const ev of ['intro_done', 'chat_open', 'request_sent', 'reset']) {
      const r = transition('idle', ev, { webgl: false });
      expect(r.state).toBe('fallback');
    }
  });

  it('reduced-motion chat open is still visible but static (idle)', () => {
    const r = transition('idle', 'chat_open', { reducedMotion: true });
    expect(r.state).toBe('idle');
  });
});

describe('NARA state machine — fail-safe timeouts (PRD §16)', () => {
  it('any transient state returns to idle on timeout', () => {
    for (const s of ['appearing', 'greeting', 'listening', 'thinking', 'speaking', 'looking']) {
      expect(transition(s, 'timeout').state).toBe('idle');
    }
  });

  it('timeout does not disturb resting states', () => {
    for (const s of ['idle', 'hidden', 'fallback']) {
      expect(transition(s, 'timeout').state).toBe(s);
    }
  });

  it('every transient state declares a timeout so none can stick', () => {
    const transient = Object.keys(STATE_PRIORITY)
      .filter((s) => !['idle', 'hidden', 'fallback', 'loading'].includes(s));
    for (const s of transient) {
      expect(STATE_TIMEOUT_MS[s], `${s} missing a timeout`).toBeGreaterThan(0);
    }
  });
});

describe('NARA state machine — render suspension (NFR-PERF-005)', () => {
  it('resting states need no animation loop', () => {
    expect(isAnimatedState('idle')).toBe(false);
    expect(isAnimatedState('fallback')).toBe(false);
    expect(isAnimatedState('hidden')).toBe(false);
  });

  it('transient states are animated', () => {
    expect(isAnimatedState('greeting')).toBe(true);
    expect(isAnimatedState('speaking')).toBe(true);
    expect(isAnimatedState('thinking')).toBe(true);
  });

  it('priority table is total — every state has a defined priority', () => {
    for (const s of ['hidden', 'loading', 'appearing', 'greeting', 'idle', 'looking',
      'listening', 'thinking', 'speaking', 'farewell', 'fallback']) {
      expect(STATE_PRIORITY[s]).toBeTypeOf('number');
    }
  });
});
