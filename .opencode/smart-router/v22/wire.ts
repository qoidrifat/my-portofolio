// Smart Router V2.2 — wire (additive V2.1 touch points, Phase U).
// Wraps telemetry emitters so V2.1 code paths get fail-open instrumentation:
// any V2.2 error is swallowed and the degraded counter increments (I-021).
// V2.1 behavior is unchanged — emitters are observational only.

import type { EvaluationResult } from "../types.ts"
import type { ExecutionOutcome, ExecutionOutcomeKind } from "./types.ts"
import { bumpDegraded, emitT1, emitT2 } from "./telemetry.ts"
import { parseQualifiedModel, type EvaluationStore } from "./evaluation-store.ts"

export interface AttributionInput {
  sessionId?: string | null
  routeId?: string | null
  executionId?: string | null
  providerId?: string | null
  model?: string | null
  variant?: string | null
  taskClass?: string | null
  optimizationClass?: string | null
}

type SourceTaskClass = string
type OptimizationClass = string

function attributionOrAudit(a: AttributionInput, executionId: string): {
  sessionId: string
  routeId: string
  executionId: string
  providerId: string
  modelId: string
  variant: string | null
  taskClass: SourceTaskClass
  optimizationClass: OptimizationClass
  attributionComplete: boolean
} {
  // Incomplete attribution (I-016): record is written but marked audit-only —
  // the evaluation store excludes it from all statistics.
  const complete = Boolean(a.sessionId && a.routeId && a.model && a.taskClass && a.optimizationClass)
  return {
    sessionId: a.sessionId ?? "unknown",
    routeId: a.routeId ?? "unknown",
    executionId,
    providerId: a.providerId ?? "unknown",
    modelId: a.model ?? "unknown",
    variant: a.variant ?? null,
    taskClass: (a.taskClass ?? "unknown") as SourceTaskClass,
    optimizationClass: (a.optimizationClass ?? "unknown") as OptimizationClass,
    attributionComplete: complete,
  }
}

// H5 bridge helper: real attribution only — "unknown" placeholders stay telemetry-only audit
// rows and never enter the evidence store (I-016).
function attributable(
  base: { sessionId: string; routeId: string; taskClass: string },
  id: { providerId: string; modelId: string },
): boolean {
  return Boolean(
    base.sessionId !== "unknown" && base.routeId !== "unknown" && id.providerId !== "unknown"
    && id.modelId !== "unknown" && base.taskClass !== "unknown",
  )
}

// CRITICAL-1 (adversarial review): canonical store identity. Telemetry keeps the
// provider-qualified modelId (Attributed flat schema — observability contract, pinned by the
// host-integration tests); store records carry the UNQUALIFIED modelId so candidateKey matches
// the engine candidateId vocabulary `providerId/modelId#variant` (never "provider/provider/model").
function storeIdentity(a: AttributionInput): { providerId: string; modelId: string } {
  const canonical = parseQualifiedModel(a.model)
  return {
    providerId: a.providerId ?? canonical.providerId ?? "unknown",
    modelId: canonical.modelId || "unknown",
  }
}

// T1: evaluation-side signal. V2.1 evaluate() has no attribution context — caller passes
// whatever the session knows (session.lastDecision). QualityOutcome grade maps
// GOOD→1.0 UNCERTAIN→0.6 INSUFFICIENT→0.2 FAILED→0.0 (EVALUATION_DESIGN §5, display-only).
const GRADE: Record<string, number> = { good: 1.0, uncertain: 0.6, insufficient: 0.2, failed: 0.0 }

// Wave 2 (H5): optional evaluation-store sink closes the evidence loop — telemetry stays
// observational, the store receives the same signal. Ids are deterministic per executionId so a
// re-emitted evaluation is the SAME signal (store dedup by signalId, first wins).
export function emitEvaluation(
  root: string,
  attribution: AttributionInput,
  evaluation: EvaluationResult,
  latency: { t0?: string | null; t3?: string | null },
  sink?: EvaluationStore,
): void {
  try {
    const executionId = attribution.executionId ?? `exec-${crypto.randomUUID()}`
    const base = attributionOrAudit(attribution, executionId)
    const storeId = storeIdentity(attribution)
    const evaluationId = `EVAL-${executionId}`
    const signalId = `SIG-EVAL-${executionId}`
    const signal = {
      signalId,
      executionId,
      chain: {
        sessionId: base.sessionId,
        routeId: base.routeId,
        executionId,
        candidate: { providerId: storeId.providerId, modelId: storeId.modelId, variant: base.variant },
        taskClass: base.taskClass as never,
        evaluationId,
      },
      attributionComplete: base.attributionComplete,
      quality: {
        grade: GRADE[evaluation.quality] ?? 0.5,
        confidence: base.attributionComplete ? 0.6 : 0.0,
        evaluatorId: "v2.1-evaluator",
        failureClass: evaluation.reasons[0] ?? null,
      },
      execution: null,
    }
    // T1 telemetry keeps the provider-qualified identity (Attributed flat schema); the store
    // signal keeps the canonical unqualified modelId (candidateKey == engine candidateId).
    emitT1(root, { ...signal, chain: { ...signal.chain, candidate: { providerId: base.providerId, modelId: base.modelId, variant: base.variant } }, timestamp: new Date().toISOString(), t0: latency.t0 ?? null, t3: latency.t3 ?? null } as never)
    if (sink && attributable(base, storeId)) sink.record(signal as never)
  } catch {
    bumpDegraded()
  }
}

// T2: execution-side outcome. Environment classification is recorded, but the
// evaluation store does the I-013 separation when computing success windows.
export function emitExecutionOutcome(
  root: string,
  attribution: AttributionInput,
  outcome: ExecutionOutcomeKind,
  errorClass?: string | null,
  environment?: { timeout?: boolean; network?: boolean; quota?: boolean; tooling?: boolean; userCancel?: boolean },
  sink?: EvaluationStore,
): void {
  try {
    const executionId = attribution.executionId ?? `exec-${crypto.randomUUID()}`
    const base = attributionOrAudit(attribution, executionId)
    const storeId = storeIdentity(attribution)
    const exec: ExecutionOutcome = {
      sessionId: base.sessionId,
      routeId: base.routeId,
      executionId,
      providerId: storeId.providerId,
      modelId: storeId.modelId,
      variant: base.variant,
      taskClass: base.taskClass as never,
      optimizationClass: base.optimizationClass as never,
      outcome,
      errorClass: errorClass ?? null,
      environment: { timeout: false, network: false, quota: false, tooling: false, userCancel: false, ...environment },
      timestamp: new Date().toISOString(),
      provenance: ["wire"],
    }
    // T2 telemetry keeps the provider-qualified identity (Attributed flat schema); the store
    // execution carries the canonical unqualified modelId (candidateKey == engine candidateId).
    emitT2(root, { ...base, outcome: exec.outcome, errorClass: exec.errorClass, environment: exec.environment, timestamp: exec.timestamp } as never)
    if (sink && attributable(base, storeId)) sink.recordExecution(exec)
  } catch {
    bumpDegraded()
  }
}
