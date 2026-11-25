// @ts-check
// NARA animation states — FR-3D-006 priority, deterministic and testable.
//
// Priority order from the PRD (highest wins):
//   reduced-motion > explicit visitor interaction > chat state >
//   welcome/farewell > contextual gesture > idle
//
// The controller is a pure reducer: given (current state, event, context), it
// returns the next state. No timers, no effects — so every transition is
// unit-testable and cannot leak high-frequency React updates.

/**
 * @typedef {'hidden'|'loading'|'appearing'|'greeting'|'idle'|'looking'|'listening'|'thinking'|'speaking'|'farewell'|'fallback'} NaraState
 */

/** @type {Record<NaraState, number>} higher wins when multiple events fire */
export const STATE_PRIORITY = Object.freeze({
  fallback: 0,
  hidden: 0,
  loading: 1,
  idle: 2,
  appearing: 3,
  looking: 4,
  farewell: 5,
  listening: 6,
  thinking: 6,
  speaking: 6,
  greeting: 7,
});

/** States the character may rest in. */
export const RESTING_STATES = Object.freeze(['idle', 'fallback', 'hidden']);

/** How long transient states may hold before the fail-safe returns to idle. */
export const STATE_TIMEOUT_MS = Object.freeze({
  greeting: 3600, // 2-3 wave cycles
  appearing: 1200,
  farewell: 2000,
  listening: 30000, // user typing pause
  thinking: 15000, // provider timeout
  speaking: 12000,
  looking: 4000,
});

/**
 * @param {NaraState} current
 * @param {string} event
 * @param {{ reducedMotion?: boolean, webgl?: boolean, introDone?: boolean, greeted?: boolean }} ctx
 * @returns {{ state: NaraState, changed: boolean }}
 */
export function transition(current, event, ctx = {}) {
  const { reducedMotion = false, webgl = true, introDone = false, greeted = false } = ctx;

  // Global overrides: reduced motion collapses everything expressive to idle,
  // missing WebGL parks the widget in fallback permanently.
  if (!webgl) return { state: 'fallback', changed: current !== 'fallback' };
  if (reducedMotion) {
    if (event === 'appear' || event === 'chat_open' || event === 'reset') {
      return { state: 'idle', changed: current !== 'idle' };
    }
  }

  switch (event) {
    case 'mount':
      return { state: 'hidden', changed: current !== 'hidden' };

    case 'intro_done':
      if (!introDone) return { state: current, changed: false };
      if (greeted) return { state: 'idle', changed: current !== 'idle' };
      return {
        state: reducedMotion ? 'idle' : 'appearing',
        changed: current !== (reducedMotion ? 'idle' : 'appearing'),
      };

    case 'appeared':
      if (greeted || reducedMotion) return { state: 'idle', changed: current !== 'idle' };
      return { state: 'greeting', changed: current !== 'greeting' };

    case 'greeted':
      return { state: 'idle', changed: current !== 'idle' };

    case 'pointer_move':
      if (current === 'hidden' || current === 'fallback' || current === 'loading') {
        return { state: current, changed: false };
      }
      if (STATE_PRIORITY.looking > (STATE_PRIORITY[current] ?? 0)) {
        return { state: 'looking', changed: current !== 'looking' };
      }
      return { state: current, changed: false };

    case 'pointer_leave':
      if (current === 'looking') return { state: 'idle', changed: true };
      return { state: current, changed: false };

    case 'chat_open':
      return { state: 'listening', changed: current !== 'listening' };

    case 'user_typing':
      if (STATE_PRIORITY[current] <= STATE_PRIORITY.listening) {
        return { state: 'listening', changed: current !== 'listening' };
      }
      return { state: current, changed: false };

    case 'request_sent':
      if (STATE_PRIORITY[current] <= STATE_PRIORITY.thinking) {
        return { state: 'thinking', changed: current !== 'thinking' };
      }
      return { state: current, changed: false };

    case 'response_received':
      if (STATE_PRIORITY[current] <= STATE_PRIORITY.speaking) {
        return { state: 'speaking', changed: current !== 'speaking' };
      }
      return { state: current, changed: false };

    case 'response_done':
    case 'chat_close':
      if (STATE_PRIORITY[current] <= STATE_PRIORITY.speaking) {
        return { state: 'idle', changed: current !== 'idle' };
      }
      return { state: current, changed: false };

    case 'reset':
      return { state: reducedMotion || !webgl ? (webgl ? 'idle' : 'fallback') : 'idle', changed: true };

    case 'timeout':
      // Fail-safe: any transient state eventually returns to idle.
      if (!RESTING_STATES.includes(current)) {
        return { state: 'idle', changed: true };
      }
      return { state: current, changed: false };

    default:
      return { state: current, changed: false };
  }
}

/**
 * Pure helper: does this state need an animation frame loop?
 * Used to suspend rendering when the tab is hidden (NFR-PERF-005) and to keep
 * idle demand-rendered instead of continuously looping (NFR-PERF-004).
 *
 * @param {NaraState} state
 * @returns {boolean}
 */
export function isAnimatedState(state) {
  return !RESTING_STATES.includes(state);
}
