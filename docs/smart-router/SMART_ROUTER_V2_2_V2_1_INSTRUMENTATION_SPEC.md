# SMART ROUTER V2.2 — V2.1 ADDITIVE INSTRUMENTATION SPEC

Status: **CANONICAL (design revision)** · Implements the capture side of EVIDENCE_CONTRACT v1
Hard rule: **OBSERVATIONAL ONLY · FAIL-OPEN · NON-BLOCKING** — no event may alter routing, permission, breaker, or security behavior (I-021).

---

## 1. Global properties (all events)

```text
transport     synchronous emit, async write (fire-and-forget)
failure       emitter throw / write failure → swallowed + in-memory degraded counter; routing unaffected
storage       .opencode/ai/telemetry/v22/<event>.jsonl   (append-only, one JSON object per line)
envelope      { schemaVersion: 1, event, timestamp (ISO-8601 UTC), eventId, provenance[] }
correlation   sessionId, routeId, executionId, evaluationId (per EVIDENCE_CONTRACT §4)
privacy       IDs, enums, timings, token counts only — no prompt/file content, no secrets
sampling      none (low volume: one event per lifecycle transition)
retention     30 days (sweeper may delete older files; deletion is observational too)
```

## 2. Event definitions

### T1 — evaluation-attributed

```text
trigger       an evaluation verdict is produced for a completed execution (existing V2.1
              dispose-evaluation point, extended with attribution — additive fields only)
schema        { evaluationId, executionId, sessionId, routeId, candidate: {providerId, modelId,
              variant}, taskClass, optimizationClass, riskClass, agent, qualityOutcome:
              {grade, confidence, evaluatorId} | null, failureClass | null, evaluatorVersion }
emits         only when the attribution chain is complete; otherwise T1-with-incomplete=true
              (record stored, statistics excluded — I-016)
affects       nothing (source for the future EvaluationStore)
```

### T2 — execution-outcome

```text
trigger       a routed execution terminates (completion, error, timeout, cancellation)
schema        { executionId, sessionId, routeId, candidate, taskClass, optimizationClass,
              riskClass, agent, outcome: COMPLETED|FAILED|ERROR|CANCELLED, errorClass | null,
              environment: {timeout, network, quota, tooling, userCancel} flags }
mapping rule  timeout/cancellation → EnvironmentOutcome semantics; never auto-quality penalty
affects       nothing
```

### T3 — latency-window

```text
trigger       request lifecycle transitions, when the host exposes them
schema        { executionId, routeId, candidate, taskClass, outputSizeBucket,
              t0, t1, t2, t3 (ms, absolute) | null per unobserved timestamp,
              ttfr | null, completionMs | null, timeout: bool }
host-limit    if t2 (first token) is not observable, record null + reason "t2-unobservable";
              latency evidence for that request is UNKNOWN (never substitute harness duration_ms)
affects       nothing
```

### T4 — cost-usage

```text
trigger       provider usage data is available for a completed execution
schema        { executionId, routeId, candidate, inputUsage, outputUsage (tokens) | null,
              pricingSource: {id, version, status: VERIFIED|PARTIAL|UNKNOWN},
              effectiveCost | null, unit | null }
no-fabricate  no pricing source → status UNKNOWN, effectiveCost null (never 0)
affects       nothing
```

### T5 — capability-probe

```text
trigger       explicit capability verification run (manual or scheduled, outside decision path)
schema        { probeId, candidate, dimension, method: LIVE_RUNTIME|INTEGRATION|STATIC,
              result: PASS|FAIL|UNSUPPORTED|BLOCKED, verifiedAt, probeVersion }
effect        candidate for registry/SSOT update — registry itself remains V2.1-owned;
              probe output never enters the decision path directly
affects       nothing (feeds the 30-day VERIFIED expiry clock, EVIDENCE_CONTRACT §5)
```

## 3. V2.1 touch policy

- Permitted touch points: the existing dispose/evaluation hook (T1), execution termination path (T2), request lifecycle (T3 where observable), provider-usage callback (T4 if host exposes), probe runner (T5).
- Every touch is **additive**: new emitter call wrapped in try/catch, no change to existing control flow, no schema change to V2.1 events (`.opencode/ai/logs/` stays byte-compatible).
- Acceptance: V2.1 test suite green **unchanged** (144/144), plus new emitter failure-injection tests.

## 4. Retention & hygiene

- Sweeper (offline or lazy on write): delete `v22/*.jsonl` files older than 30 days.
- Corrupted line → skipped, counted (`corruptLines`), never blocks the writer.
- Directory missing → created on first write; creation failure → degraded counter only.

## 5. Non-goals

No dashboards, no sampling pipelines, no remote export, no PII, no V2.2 decision writes. Replay-2 consumes these files read-only (REPLAY_CONTRACT).
