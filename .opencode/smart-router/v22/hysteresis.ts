// Smart Router V2.2 — route stability / hysteresis (Phase I; ROUTING_MODEL §16, ADR-015).
// H is a calibration parameter: PROVISIONAL 0.02; current evidence only bounds H > ≈0.006.
// Calibration: p75 of replay-2 evidenced-peer margin distribution + HUMAN APPROVAL (I: no invented thresholds).

import type { HysteresisState, ScoredCandidate, SegmentKey } from "./types.ts"

export const HYSTERESIS_H_PROVISIONAL = 0.02
/** Evidence lower bound from SIMULATION_RESULTS (evidenced-peer margin .0058); H must exceed it. */
export const HYSTERESIS_H_EVIDENCE_FLOOR = 0.006
export const RESET_CONSECUTIVE_EXCEED = 3
export const RESET_STRONG_EXCEED_FACTOR = 2
export const RESET_STRONG_WINDOW_HOURS = 24
export const ENVIRONMENT_OUTCOME_DROP_STREAK = 2

export function emptyHysteresisState(segment: SegmentKey): HysteresisState {
  return { segment, currentRoute: null, stickSince: null, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null, environmentOutcomeStreak: 0 }
}

export interface StickinessDecision {
  /** true when the sticky route is retained despite a higher-scoring challenger. */
  retained: boolean
  reason: string
  state: HysteresisState
}

/**
 * Apply session stickiness for one decision. Inputs are pure; state transitions are explicit.
 * Breaker OPEN on the sticky route overrides stickiness (caller passes stickyRouteBroken=true).
 */
export function applyStickiness(
  state: HysteresisState,
  winner: { candidateId: string; route: { providerId: string; modelId: string; variant: string | null }; score: ScoredCandidate["score"] },
  stickyCandidateScore: number | null,
  opts: { stickyRouteBroken: boolean; now: string; h?: number },
): StickinessDecision {
  const H = opts.h ?? HYSTERESIS_H_PROVISIONAL

  if (opts.stickyRouteBroken) {
    return { retained: false, reason: "sticky route breaker OPEN/HALF_OPEN — safety overrides stickiness", state: { ...state, currentRoute: winner.route, stickSince: state.stickSince ?? opts.now, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
  }

  if (!state.currentRoute) {
    // first decision in segment
    return { retained: false, reason: "no sticky route", state: { ...state, currentRoute: winner.route, stickSince: opts.now, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
  }

  if (stickyCandidateScore === null) {
    // sticky route absent from the eligible set (excluded/gated) — adopt the winner
    return { retained: false, reason: "sticky route not eligible", state: { ...state, currentRoute: winner.route, stickSince: opts.now, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
  }

  const delta = winner.score - stickyCandidateScore
  if (delta > H * RESET_STRONG_EXCEED_FACTOR) {
    // strong exceed: replacement only after the streak persists ≥ 24 h (ROUTING_MODEL §16)
    const strongCount = state.exceedStrongCount + 1
    const since = state.exceedStrongSince ?? opts.now
    const persistedMs = Date.parse(opts.now) - Date.parse(since)
    if (persistedMs >= RESET_STRONG_WINDOW_HOURS * 3_600_000) {
      return { retained: false, reason: `Δscore ${delta} > 2H sustained ≥ 24 h — reset`, state: { ...state, currentRoute: winner.route, stickSince: opts.now, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
    }
    return { retained: true, reason: `Δscore ${delta} > 2H (strong streak ${strongCount}, since ${since})`, state: { ...state, exceedStrongCount: strongCount, exceedStrongSince: since, exceedCount: state.exceedCount + 1 } }
  }
  if (delta > H) {
    const exceedCount = state.exceedCount + 1
    if (exceedCount >= RESET_CONSECUTIVE_EXCEED) {
      return { retained: false, reason: `${RESET_CONSECUTIVE_EXCEED} consecutive evaluations > H — reset`, state: { ...state, currentRoute: winner.route, stickSince: opts.now, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
    }
    return { retained: true, reason: `Δscore ${delta} ≤ 2H (exceed streak ${exceedCount})`, state: { ...state, exceedCount, exceedStrongCount: 0, exceedStrongSince: null } }
  }
  return { retained: true, reason: `Δscore ${delta} ≤ H — sticky`, state: { ...state, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null } }
}

/** EnvironmentOutcome bookkeeping: 2 consecutive ⇒ drop stickiness (segment instability). */
export function noteEnvironmentOutcome(state: HysteresisState): HysteresisState {
  const streak = state.environmentOutcomeStreak + 1
  if (streak >= ENVIRONMENT_OUTCOME_DROP_STREAK) {
    return { ...state, currentRoute: null, stickSince: null, exceedCount: 0, environmentOutcomeStreak: 0 }
  }
  return { ...state, environmentOutcomeStreak: streak }
}

export function noteHealthyOutcome(state: HysteresisState): HysteresisState {
  return { ...state, environmentOutcomeStreak: 0 }
}
