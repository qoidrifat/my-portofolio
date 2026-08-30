# SMART ROUTER V2.2 — REPLAY CONTRACT

Status: **CANONICAL (design revision)** · Authority: EVIDENCE_CONTRACT for field semantics; OBSERVABILITY_DESIGN for event envelopes
Scope: offline replay tooling ONLY — never touches production routing, breaker, permissions, or dispatches.

---

## 1. ReplayRecord

One record per replayed decision. Enough to reconstruct the V2.1 decision and evaluate a hypothetical V2.2 route.

```text
ReplayRecord {
    schemaVersion          int
    recordId               string
    // decision identity
    sessionId, routeId, decisionId, attempt
    timestamp              ISO-8601
    taskClass              enum (21 source)
    optimizationClass      enum (8, via C4 mapping)
    riskClass, agent
    // V2.1 actual
    v21Route               { providerId, modelId, variant }
    v21CandidateSet        [ { candidateId, policyStatus, variantStatus } ]   (ladder + primary)
    v21Exclusions          [ { candidateId, gate, reason } ]                  (if recorded)
    // evidence snapshot at decision time
    evidence {
        capability         per-candidate per-dim {value, evidenceLevel, confidence} | null + reason
        health             { breakerState, successRate, sampleSize, confidence } | null + reason
        quality            { intrinsic, observed, confidence, n } | null + reason
        latency            { p50, p95, sampleSize, bucket } | null + reason
        cost               { status: VERIFIED|PARTIAL|UNKNOWN, effectiveCost } | null + reason
        variantEvidence    per-candidate VariantEvidence snapshot | null + reason
    }
    // outcomes (post-hoc, optional)
    outcomeRefs            [executionId]  → T2/T1 records; absent → counterfactual UNKNOWN
    missing                [ { field, reason } ]   (explicit missing-data manifest)
}
```

Missing-data rule: absent evidence = `null` **+ explicit reason** (e.g., `"no-source"`, `"stale"`, `"t2-unobservable"`). Never invented defaults; the only priors permitted are the scoring model's own (neutral 0.5 + confidence 0).

## 2. Replay-2 procedure

```text
input    ReplayRecords built from V2.1 logs + T1–T5 telemetry (read-only)
step 1   validate schema integrity (schema-check) — 100% required
step 2   validate correlation integrity (every outcome ref resolves; every record chains) — 100%
step 3   apply hypothetical V2.2 routing (gates D2–D5 → cold-start tiers → scoring → tie-break,
         hysteresis state replayed per segment)
step 4   compare V2.2 pick vs V2.1 pick; classify divergence driver
step 5   determinism: run steps 3–4 twice; byte-identical results required
output   replay2-results.json + divergence/driver/coverage tables
```

Counterfactual safety (I-020): replay MAY compute the alternative **route**; it MUST NOT claim the alternative would have succeeded. Outcome labels: `OBSERVED` (T1/T2 record exists for that route), `ESTIMATED` (explicitly flagged model-based estimate, never feeds gate decisions), `UNKNOWN` (default). Fabricated counterfactual success is forbidden.

## 3. Shadow mode specification (design only — implemented behind flags, default OFF)

```text
V2.1  → actual decision (executed, authoritative)
V2.2  → hypothetical decision (computed, never executed)
output per decision: { selectedRoute, candidateScores, confidence,
                       excludedCandidates + reasons, delta vs V2.1, mode: SHADOW }
```

Shadow guarantees (testable):

```text
zero production influence    V2.1 decision, permission, breaker, dispatch identical with shadow ON or OFF
zero permission influence    shadow never calls the permission resolver beyond the read-only preview
zero breaker mutation        shadow reads breaker state; never records success/failure to it
zero model dispatch          shadow never triggers generation; it only computes + logs
```

Shadow records are the evidence source for promotion gates; they do not by themselves authorize promotion.

## 4. Acceptance criteria for replay-2 (gate input)

Structural (hard, non-negotiable):

```text
schema integrity            100%
correlation integrity       100%
determinism                 100% (double-run identical)
security invariant violations 0   (OPEN selected, vision routed, unsupported variant, …)
```

Coverage gates (G3–G7):

```text
evaluation attribution coverage    REQUIRES HUMAN APPROVAL
model/variant attribution coverage REQUIRES HUMAN APPROVAL
latency evidence coverage          REQUIRES HUMAN APPROVAL
cost evidence coverage             REQUIRES HUMAN APPROVAL
capability evidence coverage       REQUIRES HUMAN APPROVAL
quality sample coverage            REQUIRES HUMAN APPROVAL
```

Rationale: no defensible numeric target exists before a baseline collection window measures achievable coverage (EVIDENCE_CONTRACT §7). Inventing thresholds here would repeat the tune-until-it-passes failure mode the design forbids. The human approval sets targets from the measured baseline; the structural gates above run regardless.

## 5. Storage & hygiene

`.opencode/ai/verification/v22-simulation/` (gitignored, offline). Replay outputs are versioned (`replay2-results.json` + run timestamp). Replays never write into `.opencode/ai/logs/`, telemetry, or any production store.
