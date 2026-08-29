// Smart Router v2 — post-turn evaluator (directive #67, #68).
// Qualitative quality score (GOOD/UNCERTAIN/INSUFFICIENT/FAILED) — deliberately NOT presented
// as a statistically calibrated metric. Strong signals escalate; weak signals only diagnose (#70, #71).

import type { EvaluationSignals, EvaluationResult, QualityScore, EvaluatorAction } from "./types.ts"

export function evaluate(signals: EvaluationSignals): EvaluationResult {
  const reasons: string[] = []
  const strong: string[] = []
  const weak: string[] = []

  if (signals.reviewBlockers.length) strong.push(`review blocker: ${signals.reviewBlockers[0]}`)
  if (signals.providerErrors.length >= 2) strong.push(`repeated provider failures (${signals.providerErrors.length})`)
  if (signals.repeatedRetries >= 3) strong.push(`repeated retries (${signals.repeatedRetries})`)
  if (signals.testFailures >= 3) strong.push(`multiple failing tests (${signals.testFailures})`)
  if (signals.exceptions.length >= 2) strong.push(`repeated runtime exceptions (${signals.exceptions.length})`)

  if (signals.toolErrors.length === 1) weak.push("single tool error — diagnose first (#71)")
  if (signals.providerErrors.length === 1) weak.push("single provider error — may be transient 429 (#71)")
  if (signals.testFailures === 1) weak.push("one failing test — possibly environment-related (#71)")
  if (signals.contextIssues.length) weak.push(`context issue: ${signals.contextIssues[0]}`)

  reasons.push(...strong, ...weak)

  let action: EvaluatorAction = "continue"
  let quality: QualityScore = "good"

  if (strong.length) {
    quality = "insufficient"
    if (signals.reviewBlockers.length) action = "escalate"
    else if (signals.providerErrors.length >= 2) action = "fallback"
    else action = "escalate"
  } else if (weak.length) {
    quality = "uncertain"
    action = signals.toolErrors.length === 1 || signals.testFailures === 1 ? "retry" : "continue"
  }
  if (signals.testFailures >= 3 && signals.exceptions.length >= 2 && signals.repeatedRetries >= 3) {
    quality = "failed"
    action = "block"
  }
  return { quality, action, reasons }
}
