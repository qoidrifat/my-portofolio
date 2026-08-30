# SMART ROUTER V2.2 — OBSERVABILITY DESIGN

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Companion to `SMART_ROUTER_V2_2_ARCHITECTURE.md` §9.4 (storage layout).

Principle inherited from V2.1: **every event must be reconstructable, and no event log is a covert data exfiltration channel.**

---

## 1. Event Catalog (11 events)

All events: JSONL, one record per line, `schemaVersion` + `timestamp` + correlation IDs mandatory. Extension of the existing `.opencode/ai/logs/` pattern; V2.1 event schemas remain byte-compatible.

| Event | Emitted when | Key fields (beyond envelope) |
|---|---|---|
| candidate-discovered | discovery enumerates registry | candidateCount, candidates[] (ids only) |
| candidate-excluded | any gate drops a candidate | candidateId, gate (POLICY/CAPABILITY/HEALTH/BUDGET), reason (enum + short text) |
| capability-evaluated | capabilityFit computed per candidate | candidateId, per-dim fit + evidenceLevel, confidence |
| health-evaluated | HealthSnapshot read/applied | candidateId, breakerState, sampleSize, confidence, successRate |
| candidate-scored | scoring per candidate | candidateId, dimension values + weights + contribution, score, confidence |
| candidate-selected | selector picks winner | candidateId, score, confidence, tieBreakerUsed (bool + which tier) |
| score-breakdown | with selection (or on demand) | full sorted candidate table (id, score, dominantFactors) |
| fallback-triggered | re-route after failure | failedCandidateId, failureClass, attempt n/3, action (Table C mapping) |
| evaluation-recorded | EvidenceRecorder persists EvaluationSignal | signalId, failureClass, attribution, confidence |
| health-updated | evidence batch updates a segment | segmentKey, n, successRate, window bounds |
| route-recomputed | any re-run of gates+scoring | trigger (failure/degradation/registry-change), new selection |

### 1.1 Additive Instrumentation Events (T1–T5 — canonical definitions in INSTRUMENTATION_SPEC)

Five observational event types extend this catalog without touching V2.1 behavior (fail-open, non-blocking): `T1 evaluation-attributed`, `T2 execution-outcome`, `T3 latency-window`, `T4 cost-usage`, `T5 capability-probe`. Storage `.opencode/ai/telemetry/v22/`, retention 30 days. They never influence routing, permission, breaker, or security (I-021); schemas and triggers are defined in `SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md`, evidence semantics in EVIDENCE_CONTRACT.

Envelope:

```json
{ "schemaVersion": 1, "event": "candidate-scored", "timestamp": "...",
  "sessionId": "...", "routeId": "R-...", "decisionId": "D-...", "attempt": 1 }
```

## 2. Decision Schema (one per routing decision)

```text
RouteDecision {
    decisionId            D-<hash>   (hash of canonical inputs — reproducibility anchor)
    sessionId, routeId, attempt
    requirement           TaskRequirement (full)
    candidateSet          [candidateIds]
    excluded              [ { candidateId, gate, reason } ]
    scores                [ { candidateId, score, confidence, breakdown } ]  (sorted desc)
    selected              candidateId
    tieBreaker            null | { tier: "T2".."T6" }
    mode                  OFF | SHADOW | ADVISORY | OPTIMIZED
    degradedToV21         bool      (engine fallback occurred)
}
```

## 3. RouteExplanation Schema (user-facing digest of the decision)

```text
RouteExplanation {
    selectedCandidate        { provider, model, variant }
    candidateScores          [ { candidateId, score, confidence } ]           (sorted)
    excludedCandidates       [ { candidateId, hardExclusionReason } ]         (gate-ordered)
    softScoreBreakdown       { per-dimension value × weight × contribution for top N (N=3) }
    dominantFactors          top 2 contributing dimensions with plain-language reason
                             ("quality .82 with weight .40 dominated; runner-up .74")
    tieBreaker               which tier decided, if any
    confidence               candidateConfidence of winner
    evidenceUsed             { health: {sampleSize, confidence} | "none",
                               capability: [evidence levels],
                               cost: provenance, latency: bucket + n }
    whyNotRunnerUp           concrete delta ("score gap .09 driven by quality weight .40 × Δ.08
                             and context Δ .35")
}
```

Explanation is derived *from* the logged decision; it never contains information unavailable in the event stream (auditability = reconstructability, ARCHITECTURE G-04).

## 4. Health & Evaluation Events

- `health-updated` carries the full window bookkeeping (n, bounds) so any reader can recompute the aggregate from the append-only source.
- `evaluation-recorded` mirrors EvaluationSignal identity (signalId, class, attribution, confidence) — the signal body itself lives in `evaluation-signals.jsonl`, the event log references it (separation: audit stream vs evidence stream).

## 5. Correlation IDs

```text
sessionId     V2.1 session (existing)
routeId       V2.1 route decision (existing, e.g. R-62959dea92)
decisionId    NEW: hash over (requirement canonicalization + candidate set + evidence state hash + policy hash)
executionId   NEW: one execution of a selected route (links T2/T3/T4 records to a decision)
evaluationId  NEW: one evaluator verdict (links T1 to its executionId)
attempt       1..3 continuation chain position
signalId      per EvaluationSignal
```

Canonical attribution chain (EVALUATION_DESIGN §3.1): `sessionId → routeId → executionId → candidate(provider, model, variant) → taskClass → evaluationId`. A record missing any link is incomplete → no quality update (I-016).

Latency evidence contract (EVIDENCE_CONTRACT §Latency — canonical): inference latency is measured on the t0 request-start → t1 provider dispatch → t2 first-response/token → t3 completion window, yielding TTFR, completion latency, and timeout flags; the V2.1 harness `duration_ms` (decision-path timing) is EXCLUDED from latencyFit and must never be mixed with inference latency. Ranking metric: p50 primary, p95 for budget gates; EWMA α=.3 and recent-20 windowing are DESIGN PROPOSALS until replay-2 validates them.

`decisionId` makes determinism testable in production: two decisions with identical inputs must produce identical `decisionId`. Evidence state hash = ordered hash of the store records consulted (freshness-bounded), so a changed window legitimately changes the ID.

## 6. Reconstruction Flow (audit)

To answer "why was model X chosen at time T":

1. Locate `sessionId` → filter event log → find `candidate-selected` (+ `RouteDecision`).
2. `excluded[]` explains every non-selected candidate (gate + reason).
3. `scores[]` + breakdowns explain the ranking; `tieBreaker` resolves exact ties.
4. `evidenceUsed` points at the exact store records (ids/timestamps) consulted.
5. Post-execution: `evaluation-recorded` → signal → outcome; `fallback-triggered` chain via `routeId`+`attempt`.
6. All of the above from files only — no hidden in-memory state is required (ARCHITECTURE: L3 pure, L4 append-only).

## 7. Privacy / Security Considerations

| Concern | Rule |
|---|---|
| Prompt content | never logged by V2.2 events; classification metadata + token counts only (V2.1's 120-char preview rule unchanged where it exists) |
| File paths / code snippets | never in V2.2 events; only evidence counts (e.g., `evidence.testsFailed: 2`) |
| Secrets | redaction rules from V2.1 logger apply to all new stores; secret-pattern scan is part of release gate |
| Evaluator free text | `insufficiencyReason` truncated (200 chars) + treated as untrusted display text |
| Tamper evidence | stores are append-only JSONL; record rejection (schema/bounds) is itself logged as an event |
| Volume control | per-decision events bounded: discovery summary + per-candidate score lines only for top 3 + excluded list; no per-candidate event storm on 13-model registries |
| Log rotation | size-threshold rotation, keep N rotations (same policy as V2.1 logs); rotation events logged |

## 8. Degraded-Mode Observability

When V2.2 is degraded (engine fallback, store unavailable), the degradation itself MUST be observable: `scoring-degraded` / `evidence-store-unavailable` events carry the error class (no stack traces with paths in the log; full detail to local stderr only). A decision that silently "looks like V2.1" without a degradation event is a spec violation — operators must always be able to distinguish "V2.2 agreed" from "V2.2 was not consulted".
