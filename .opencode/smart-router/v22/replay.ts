// Smart Router V2.2 — replay-2 engine (Phase V; REPLAY_CONTRACT).
// Offline-only: consumes ReplayRecords built from V2.1 logs + telemetry, runs the V2.2
// engine in SHADOW, classifies divergence drivers. READ-ONLY wrt evidence stores.
// Honesty rule: outcome label is OBSERVED only when outcomeRefs resolve in the evaluation
// store; otherwise UNKNOWN — never fabricated (REPLAY_CONTRACT §3, G4).

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { runEngine, type EvidenceProviders } from "./engine.ts"
import { emptyHysteresisState } from "./hysteresis.ts"
import { EvaluationStore, joinStorePath } from "./evaluation-store.ts"
import type { ReplayRecord, ReplayOutcomeLabel, RouterMode } from "./types.ts"

export const REPLAY_DRIVERS = [
  "no-divergence",
  "variant-ascii-tiebreak",
  "proxy-noise-swap",
  "evidence-availability-bias",
  "cold-start-artifact",
  "gate-difference",
  "other",
] as const
export type ReplayDriver = (typeof REPLAY_DRIVERS)[number]

export interface ReplayRowResult {
  recordId: string
  routeId: string
  v21CandidateId: string
  v22Selected: string | null
  divergent: boolean
  driver: ReplayDriver
  tieBreaker: string | null
  outcome: ReplayOutcomeLabel
  blocked: boolean
}

export interface ReplaySummary {
  rows: ReplayRowResult[]
  total: number
  divergent: number
  blocked: number
  byDriver: Record<ReplayDriver, number>
  observedOutcomes: number
}

function candidateIdOf(r: ReplayRecord["v21Route"]): string {
  // v21Route.modelId is already provider-qualified ("provider/model") — same format as
  // Candidate.candidateId / host.ts v21CandidateId. Never re-qualify (avoids b-ai/b-ai/...).
  const model = r.modelId.includes("/") ? r.modelId : `${r.providerId}/${r.modelId}`
  return r.variant ? `${model}#${r.variant}` : model
}

function hasRecord(v: unknown): boolean {
  return Boolean(v && typeof v === "object" && !("missing" in (v as object)))
}

function classifyDriver(rec: ReplayRecord, v22Selected: string | null, blocked: boolean, tieBreaker: string | null): ReplayDriver {
  const v21 = candidateIdOf(rec.v21Route)
  if (blocked || v22Selected === null) return "gate-difference"
  if (v22Selected === v21) return "no-divergence"
  if (tieBreaker === "T6_ASCII_FINAL") return "variant-ascii-tiebreak"
  const ev = rec.evidence
  const v21HadEvidence = hasRecord(ev.cost) || hasRecord(ev.latency) || hasRecord(ev.capability)
  if (!v21HadEvidence) return "cold-start-artifact"
  // selected an evidenced candidate other than v21 with no tie/probe artifacts
  return "evidence-availability-bias"
}

/**
 * M9 (Wave 2) fix: ReplayRecord.outcomeRefs hold EXECUTION ids (host emits
 * `outcomeRefs: [track.executionId]`), not signal ids. Resolution matches the executionId
 * against the store's chain.executionId; a signal counts only when it carries an actual
 * execution outcome. OBSERVED only when resolved — otherwise UNKNOWN (never fabricated).
 */
export function resolveOutcome(outcomeRefs: string[], store: EvaluationStore | null, routeId: string): ReplayOutcomeLabel {
  if (!outcomeRefs.length || !store) return { kind: "UNKNOWN", source: null }
  const found = store
    .snapshot()
    .find((s) => outcomeRefs.includes(s.chain.executionId) && s.chain.routeId === routeId && s.execution !== null)
  if (!found) return { kind: "UNKNOWN", source: null }
  return { kind: "OBSERVED", source: found.signalId }
}

function outcomeLabel(rec: ReplayRecord, store: EvaluationStore | null): ReplayOutcomeLabel {
  return resolveOutcome(rec.outcomeRefs, store, rec.routeId)
}

export function loadReplayRecords(path: string): ReplayRecord[] {
  if (!existsSync(path)) return []
  const out: ReplayRecord[] = []
  for (const line of readFileSync(path, "utf8").split("\n").filter(Boolean)) {
    try {
      out.push(JSON.parse(line) as ReplayRecord)
    } catch {
      // corrupted replay line → skipped and visible via row-count mismatch (contract §3)
    }
  }
  return out
}

/**
 * Runs replay-2. `providers` supplies the evidence snapshot mapping for the record's
 * v21-selected candidate; other candidates run evidence-null with explicit missing
 * reasons (REPLAY_CONTRACT §2 — no synthetic evidence).
 */
export function runReplay(
  records: ReplayRecord[],
  opts: {
    projectRoot: string
    providers: EvidenceProviders
    mode?: RouterMode
    budgets?: { costBudget: number | null; latencyBudgetP95Ms: number | null }
  },
): ReplaySummary {
  const store = new EvaluationStore(joinStorePath(opts.projectRoot, ".opencode/ai/evidence/v22/evaluation-signals.jsonl"))
  store.load()

  const byDriver = Object.fromEntries(REPLAY_DRIVERS.map((d) => [d, 0])) as Record<ReplayDriver, number>
  const rows: ReplayRowResult[] = []

  for (const rec of records) {
    const candidates = rec.v21CandidateSet.map((c) => ({
      candidateId: c.candidateId,
      provider: c.candidateId.split("/")[0] ?? c.candidateId,
      model: c.candidateId.split("/")[1]?.split("#")[0] ?? c.candidateId,
      variant: c.candidateId.split("#")[1] ?? null,
      variantStatus: c.variantStatus,
      policyStatus: c.policyStatus,
      maxContextTokens: 0,
      ladderRank: 0,
    }))
    const result = runEngine({
      mode: opts.mode ?? "SHADOW",
      requirement: rec.requirement,
      candidates,
      providers: opts.providers,
      budgets: opts.budgets ?? { costBudget: null, latencyBudgetP95Ms: null },
      hysteresis: emptyHysteresisState({ taskClass: rec.requirement.sourceTaskClass, risk: rec.requirement.riskClass }),
      stickyRouteBroken: false,
      now: rec.timestamp,
      sessionId: rec.sessionId,
      routeId: rec.routeId,
      attempt: rec.attempt,
    })

    if (result.kind === "degraded") {
      byDriver.other++
      rows.push({
        recordId: rec.recordId, routeId: rec.routeId, v21CandidateId: candidateIdOf(rec.v21Route),
        v22Selected: null, divergent: false, driver: "other", tieBreaker: null,
        outcome: { kind: "UNKNOWN", source: null }, blocked: false,
      })
      continue
    }
    const blocked = result.kind === "blocked"
    const selected = blocked ? null : result.decision.selected
    const tieBreaker = blocked ? null : (result.decision.tieBreaker ? `T${result.decision.tieBreaker.tier.replace("T", "")}_ASCII_FINAL` : null)
    const v21 = candidateIdOf(rec.v21Route)
    const divergent = !blocked && selected !== v21
    const driver = classifyDriver(rec, selected, blocked, tieBreaker)
    byDriver[driver]++
    rows.push({
      recordId: rec.recordId,
      routeId: rec.routeId,
      v21CandidateId: v21,
      v22Selected: selected,
      divergent,
      driver,
      tieBreaker,
      outcome: outcomeLabel(rec, store),
      blocked,
    })
  }

  return {
    rows,
    total: rows.length,
    divergent: rows.filter((r) => r.divergent).length,
    blocked: rows.filter((r) => r.blocked).length,
    byDriver,
    observedOutcomes: rows.filter((r) => r.outcome.kind === "OBSERVED").length,
  }
}

export function replayStorePath(root: string): string {
  return join(root, ".opencode", "ai", "evidence", "v22", "evaluation-signals.jsonl")
}
