// Smart Router V2.2 — host wiring (this file is THE V2.1↔V2.2 runtime bridge).
// Wires the v22 engine + instrumentation into the OpenCode plugin lifecycle as an
// OBSERVATIONAL ONLY · FAIL-OPEN · NON-BLOCKING sidecar (INSTRUMENTATION_SPEC §2, I-021):
//   chat.message   → t0 + attribution + V2.2 SHADOW computation (never executed)
//   chat.params    → t1 (provider dispatch moment, host-exposed)
//   event:
//     message.part.updated → t2 (first response observed from the host event bus)
//     message.updated      → t3 + T2 execution outcome + T4 usage/cost (host tokens/cost)
//     session.error        → T2 ERROR with environment classification
//     session.idle         → t3 fallback
//   dispose        → T1 evaluation attribution (+ T3 fallback for unfinished windows)
//
// ZERO PRODUCTION INFLUENCE (REPLAY_CONTRACT §3): the shadow computation never mutates the
// route, permission output, breaker state, or dispatch. Every method swallows its own errors
// (fail-open); the degraded counter is the only observable side effect of a failure.
// PRIVACY: only ids, enums, timings and token/cost numbers are persisted — never prompt or
// file content, never raw error text (name/slug only).

import { randomUUID } from "node:crypto"
import { join } from "node:path"
import type { EvaluationResult, ModelRegistry, RouteDecision } from "../types.ts"
import type { RoutingTaskEntry } from "../agent-router.ts"
import { loadRoutingPolicy } from "../router.ts"
import { breakerStatus } from "../circuit-breaker.ts"
import { appendJsonl as appendAiJsonl } from "../logger.ts"
import type { HealthInput } from "./gates.ts"
import type { ReplayRecord, RouterMode } from "./types.ts"
import { CLASS_MAPPING } from "./policy-data.ts"
import { buildRequirement } from "./requirement.ts"
import { discoverCandidates } from "./discovery.ts"
import { noopProviders, runEngine, type EvidenceProviders } from "./engine.ts"
import { emptyHysteresisState } from "./hysteresis.ts"
import { emitEvaluation, emitExecutionOutcome, type AttributionInput } from "./wire.ts"
import { emitT3, emitT4, emitT5 } from "./telemetry.ts"
import { EvaluationStore, joinStorePath } from "./evaluation-store.ts"
import { providersFromEvidenceStore } from "./evidence-snapshot.ts"
import { HysteresisStateStore, hysteresisKey } from "./hysteresis-store.ts"

const SHADOW_DECISIONS_LOG = "evidence/v22/shadow-decisions.jsonl"
const SHADOW_DELTAS_LOG = "evidence/v22/shadow-deltas.jsonl"
const HYSTERESIS_STATE_PATH = ".opencode/ai/evidence/v22/hysteresis-state.jsonl"
const MAX_TRACKS = 100

interface Attribution {
  sessionId: string
  routeId: string | null
  providerId: string | null
  /** qualified "provider/model" live dispatch id */
  model: string | null
  variant: string | null
  taskClass: string | null
  optimizationClass: string | null
  agent: string
}

interface SessionTrack {
  executionId: string
  t0: number | null
  t1: number | null
  t2: number | null
  t3: number | null
  t3Emitted: boolean
  outcomeEmitted: boolean
  usageEmitted: boolean
  attribution: Attribution | null
}

export interface HostChatMessageInput {
  sessionId: string
  agent: string
  /** live dispatch model from the host, qualified "provider/model" (may differ from route) */
  liveModel: string | null
  liveVariant: string | null
  route: { decision: RouteDecision }
  /** host-provided epoch ms; defaults to Date.now() */
  ts?: number
}

export interface HostV22 {
  readonly mode: RouterMode
  onChatMessage(input: HostChatMessageInput): void
  onChatParams(sessionId: string | null | undefined): void
  onEvent(event: unknown): void
  onDispose(evaluation: EvaluationResult): void
}

function attributionFromRoute(sessionId: string, agent: string, decision: RouteDecision): Attribution {
  const taskClass = decision.input?.matched_task_class ?? null
  const known = taskClass !== null && Object.prototype.hasOwnProperty.call(CLASS_MAPPING, taskClass)
  const model = decision.model ?? null
  const providerId = model ? (model.split("/")[0] ?? null) : null
  return {
    sessionId,
    routeId: decision.routeId ?? null,
    providerId,
    model,
    variant: decision.variant ?? null,
    taskClass: known ? taskClass : null,
    optimizationClass: known ? CLASS_MAPPING[taskClass as keyof typeof CLASS_MAPPING].optimizationClass : null,
    agent: agent || (decision.agent as string) || "build",
  }
}

function attributionInput(a: Attribution | null, sessionId: string | null): AttributionInput {
  if (!a) return { sessionId, routeId: null, providerId: null, model: null, variant: null, taskClass: null, optimizationClass: null }
  return {
    sessionId: a.sessionId,
    routeId: a.routeId,
    providerId: a.providerId,
    model: a.model,
    variant: a.variant,
    taskClass: a.taskClass,
    optimizationClass: a.optimizationClass,
  }
}

/** Environment classification from a structured host error object (name only — no text stored). */
function classifyHostError(err: unknown): { outcome: "ERROR" | "CANCELLED"; errorClass: string; env: { timeout?: boolean; network?: boolean; quota?: boolean; userCancel?: boolean } } {
  const name = (err as { name?: string } | undefined)?.name ?? "UnknownError"
  const message = String((err as { data?: { message?: string } } | undefined)?.data?.message ?? "")
  if (name === "MessageAbortedError") return { outcome: "CANCELLED", errorClass: "user-cancellation", env: { userCancel: true } }
  if (name === "ProviderAuthError") return { outcome: "ERROR", errorClass: "provider-auth", env: { network: true } }
  if (name === "ApiError") {
    const code = (err as { data?: { statusCode?: number } } | undefined)?.data?.statusCode
    if (code === 429 || code === 402) return { outcome: "ERROR", errorClass: "quota", env: { quota: true } }
    return { outcome: "ERROR", errorClass: `api-${code ?? "unknown"}`, env: { network: true } }
  }
  if (name === "MessageOutputLengthError") return { outcome: "ERROR", errorClass: "output-length", env: {} }
  if (/timeout|timed out/i.test(message)) return { outcome: "ERROR", errorClass: "timeout", env: { timeout: true } }
  return { outcome: "ERROR", errorClass: "unknown", env: {} }
}

export function createHostV22(projectRoot: string, opts: { registry: ModelRegistry | null; mode: RouterMode }): HostV22 {
  const root = projectRoot
  const mode: RouterMode = opts.mode
  const tracks = new Map<string, SessionTrack>()
  let lastSessionId: string | null = null

  // H5/M11 (Wave 2): one evidence store + one hysteresis store per host, loaded once at
  // construction. The store is the T1/T2 sink (closed evidence loop); fail-open throughout.
  const evalStore = new EvaluationStore(joinStorePath(root))
  evalStore.load()
  const hystStore = new HysteresisStateStore(join(root, HYSTERESIS_STATE_PATH))
  hystStore.load()

  const trackOf = (sessionId: string | null | undefined): SessionTrack | null => (sessionId ? (tracks.get(sessionId) ?? null) : null)

  function store(sessionId: string, track: SessionTrack): void {
    tracks.set(sessionId, track)
    if (tracks.size > MAX_TRACKS) {
      const oldest = tracks.keys().next().value
      if (oldest !== undefined && oldest !== sessionId) tracks.delete(oldest)
    }
  }

  // jsonl writers reuse the V2.1 logger (fail-open + secret-redacting); rows are ids/numbers only
  const writeShadowRecord = (record: ReplayRecord): void => appendAiJsonl(root, SHADOW_DECISIONS_LOG, record as unknown as Record<string, unknown>)
  const writeDelta = (row: Record<string, unknown>): void => appendAiJsonl(root, SHADOW_DELTAS_LOG, row)

  // ---- shadow computation (REPLAY_CONTRACT §3: compute + record only; never executed) ----

  function computeShadow(input: HostChatMessageInput, track: SessionTrack): void {
    const a = track.attribution
    const ts = new Date().toISOString()
    const v21Route = {
      providerId: a?.providerId ?? "unknown",
      modelId: a?.model ?? "unknown",
      variant: a?.variant ?? null,
    }
    const v21CandidateId = v21Route.variant ? `${v21Route.modelId}#${v21Route.variant}` : v21Route.modelId

    const policy = loadRoutingPolicy(root)
    const entry: RoutingTaskEntry | null = a?.taskClass
      ? (policy.task_classes.find((t) => t.task_class === a.taskClass) ?? null)
      : null

    let requirement: ReturnType<typeof buildRequirement> | null = null
    if (entry && a?.taskClass) {
      requirement = buildRequirement({
        sourceTaskClass: a.taskClass as Parameters<typeof buildRequirement>[0]["sourceTaskClass"],
        riskClass: ((entry.risk ?? "medium") as Parameters<typeof buildRequirement>[0]["riskClass"]),
        agent: entry.agent,
        modality: entry.modality_required === "vision" ? "vision" : "text",
        complexity: input.route.decision.input?.complexity ?? "medium",
        contextDemand: input.route.decision.input?.contextDemand ?? "medium",
        reasoningDemand: input.route.decision.input?.reasoningDemand ?? "medium",
        latencyPreference: a.taskClass === "latency-sensitive" ? "speed" : "normal",
        qualityPreference: "normal",
        costProfile: input.route.decision.input?.cost_profile ?? "balanced",
        sessionId: a.sessionId,
        routeId: a.routeId ?? undefined,
      })
    }

    if (!entry || !requirement || requirement.kind === "blocked") {
      writeDelta({
        timestamp: ts, recordId: null, sessionId: a?.sessionId ?? input.sessionId, routeId: a?.routeId, executionId: track.executionId,
        status: "SHADOW_BLOCKED", reason: !entry ? `no policy entry for ${a?.taskClass ?? "unknown"}` : (requirement?.kind === "blocked" ? requirement.reason : "requirement unavailable"),
        v21: v21Route, v22: null, divergent: false,
      })
      return
    }

    const discovery = discoverCandidates(opts.registry ?? { effortRankOrder: [], models: [], generatedFrom: [] }, entry)
    // real breaker state is the only live evidence wired into shadow (read-only, D4 gate);
    // quality/segment evidence comes from the evaluation-store snapshot (Wave 2, closed loop,
    // observed-only) — everything else stays evidence-null (no fabrication — ADR-008)
    const evidenceProviders = providersFromEvidenceStore(evalStore, requirement.requirement.sourceTaskClass)
    const providers: EvidenceProviders = {
      ...noopProviders,
      ...evidenceProviders,
      health: (candidateId: string): HealthInput | null => {
        try {
          const key = candidateId.split("#")[0] ?? candidateId
          const b = breakerStatus(root, key)
          return { breakerState: b.state.toUpperCase() as HealthInput["breakerState"], successRate: null, confidence: 0, sampleSize: 0 }
        } catch {
          return null
        }
      },
    }
    const segment = { taskClass: requirement.requirement.sourceTaskClass, risk: requirement.requirement.riskClass }
    // M11 (Wave 2): hysteresis continuity across restarts — persisted state (last-wins) is
    // reused when present; otherwise seeded from the live V2.1 route as before.
    const hKey = hysteresisKey(a?.sessionId ?? input.sessionId, segment)
    const persisted = hystStore.get(hKey)
    const hysteresis = persisted
      ?? { ...emptyHysteresisState(segment), currentRoute: v21Route.modelId !== "unknown" ? v21Route : null, stickSince: ts }
    // H3 (Wave 1): the sticky route's REAL breaker state overrides stickiness (§16 — safety
    // over stability). Read-only, same breaker source as the D4 health provider.
    const stickyRouteBroken = ((): boolean => {
      try {
        if (v21Route.modelId === "unknown") return false
        return breakerStatus(root, v21Route.modelId).state.toUpperCase() === "OPEN"
      } catch {
        return false
      }
    })()

    const result = runEngine({
      mode,
      requirement: requirement.requirement,
      candidates: discovery.candidates,
      providers,
      budgets: { costBudget: null, latencyBudgetP95Ms: null },
      hysteresis,
      stickyRouteBroken,
      now: ts,
      sessionId: a?.sessionId ?? input.sessionId,
      routeId: a?.routeId ?? "unknown",
      attempt: 1,
    })
    if (result.kind === "ok") hystStore.set(hKey, result.stickiness.state)

    const recordId = `rec-${randomUUID()}`
    const decisionId = result.decision.decisionId ?? "unknown"
    const replayRecord: ReplayRecord = {
      schemaVersion: 1,
      recordId,
      sessionId: a?.sessionId ?? input.sessionId,
      routeId: a?.routeId ?? "unknown",
      decisionId,
      attempt: 1,
      timestamp: ts,
      requirement: requirement.requirement,
      v21Route,
      v21CandidateSet: discovery.candidates.map((c) => ({ candidateId: c.candidateId, policyStatus: c.policyStatus, variantStatus: c.variantStatus })),
      v21Exclusions: [],
      evidence: {
        capability: { missing: [{ field: "capability", reason: "no-source" }] },
        health: { missing: [{ field: "health", reason: "breaker-state-only; health aggregates no-source" }] },
        quality: { missing: [{ field: "quality", reason: "no-source" }] },
        latency: { missing: [{ field: "latency", reason: "no-source" }] },
        cost: { missing: [{ field: "cost", reason: "no-source" }] },
        variantEvidence: { missing: [{ field: "variantEvidence", reason: "no-source" }] },
      },
      outcomeRefs: [track.executionId],
      missing: [
        { field: "v21Exclusions", reason: "v2.1 breaker-exclusion list not exposed on RouteDecision" },
        ...(a?.routeId ? [] : [{ field: "routeId", reason: "v2.1 route unresolved" }]),
      ],
    }
    writeShadowRecord(replayRecord)

    const v21LadderHead = result.kind === "ok" ? result.v21LadderHead : ""
    const selected = result.kind === "ok" ? result.decision.selected : null
    const selectedScore = result.kind === "ok" && selected ? (result.decision.scores.find((s) => s.candidateId === selected) ?? null) : null
    const divergent = selected !== null && selected !== v21CandidateId
    writeDelta({
      timestamp: ts,
      recordId,
      decisionId,
      sessionId: a?.sessionId ?? input.sessionId,
      routeId: a?.routeId,
      executionId: track.executionId,
      status: "SHADOW",
      mode,
      taskClass: a?.taskClass,
      optimizationClass: a?.optimizationClass,
      v21: v21Route,
      v21LadderHead,
      v22: {
        selected,
        selectedScore: selectedScore ? Math.round(selectedScore.score * 10000) / 10000 : null,
        selectedConfidence: selectedScore?.confidence ?? null,
        selectedTier: selectedScore?.tier ?? null,
        tieBreaker: result.kind === "ok" ? (result.decision.tieBreaker?.tier ?? null) : null,
        stickinessApplied: result.kind === "ok" ? result.decision.stickinessApplied : false,
        degradedToV21: result.decision.degradedToV21,
        blocked: result.kind === "blocked",
        reason: result.kind === "ok" ? null : result.reason,
        topScores: result.kind === "ok" ? result.decision.scores.slice(0, 3).map((s) => ({ candidateId: s.candidateId, score: Math.round(s.score * 10000) / 10000, tier: s.tier })) : [],
      },
      divergent,
    })
  }

  return {
    mode,

    onChatMessage(input: HostChatMessageInput): void {
      try {
        if (mode === "OFF") return
        const track: SessionTrack = {
          executionId: `exec-${randomUUID()}`,
          t0: typeof input.ts === "number" ? input.ts : Date.now(),
          t1: null,
          t2: null,
          t3: null,
          t3Emitted: false,
          outcomeEmitted: false,
          usageEmitted: false,
          attribution: attributionFromRoute(input.sessionId, input.agent, input.route.decision),
        }
        store(input.sessionId, track)
        lastSessionId = input.sessionId
        computeShadow(input, track)
      } catch {
        // fail-open (I-021): shadow/observation failure never affects the host
      }
    },

    onChatParams(sessionId): void {
      try {
        if (mode === "OFF") return
        const track = trackOf(sessionId)
        if (track && track.t1 === null) track.t1 = Date.now()
      } catch {}
    },

    onEvent(event: unknown): void {
      try {
        if (mode === "OFF") return
        const type = (event as { type?: string } | undefined)?.type ?? ""
        const props = ((event as { properties?: Record<string, unknown> } | undefined)?.properties ?? {}) as Record<string, unknown>

        if (type === "message.part.updated") {
          const part = props.part as { sessionID?: string } | undefined
          const track = trackOf(part?.sessionID)
          if (track && track.t2 === null) track.t2 = Date.now()
          return
        }

        if (type === "message.updated") {
          const info = props.info as
            | { role?: string; sessionID?: string; error?: unknown; time?: { completed?: number }; tokens?: { input?: number; output?: number }; cost?: unknown; modelID?: string; providerID?: string }
            | undefined
          if (!info || info.role !== "assistant") return
          const track = trackOf(info.sessionID)
          if (!track) return
          const a = track.attribution

          if (info.error) {
            if (!track.outcomeEmitted) {
              track.outcomeEmitted = true
              const c = classifyHostError(info.error)
              emitExecutionOutcome(root, { ...attributionInput(a, info.sessionID ?? null), executionId: track.executionId }, c.outcome, c.errorClass, c.env, evalStore)
            }
            if (track.t3 === null) track.t3 = Date.now()
            emitT3Window(track, "terminated-by-error")
            return
          }

          if (typeof info.time?.completed === "number") {
            if (track.t3 === null) track.t3 = info.time.completed
            if (!track.outcomeEmitted) {
              track.outcomeEmitted = true
              emitExecutionOutcome(root, { ...attributionInput(a, info.sessionID ?? null), executionId: track.executionId }, "COMPLETED", null, undefined, evalStore)
            }
            emitT4Usage(track, info)
            emitT3Window(track, null)
          }
          return
        }

        if (type === "session.error") {
          const sessionId = (props.sessionID as string | undefined) ?? null
          const track = trackOf(sessionId)
          if (track && !track.outcomeEmitted) {
            track.outcomeEmitted = true
            const c = classifyHostError(props.error)
            emitExecutionOutcome(root, { ...attributionInput(track.attribution, sessionId), executionId: track.executionId }, c.outcome, c.errorClass, c.env, evalStore)
          } else if (!track) {
            const c = classifyHostError(props.error)
            emitExecutionOutcome(root, { sessionId }, c.outcome, c.errorClass, c.env)
          }
          if (track) {
            if (track.t3 === null) track.t3 = Date.now()
            emitT3Window(track, "terminated-by-error")
          }
          return
        }

        if (type === "session.idle") {
          const track = trackOf(props.sessionID as string | undefined)
          if (track) {
            if (track.t3 === null) track.t3 = Date.now()
            if (!track.outcomeEmitted) {
              track.outcomeEmitted = true
              emitExecutionOutcome(root, { ...attributionInput(track.attribution, (props.sessionID as string) ?? null), executionId: track.executionId }, "COMPLETED", null, undefined, evalStore)
            }
            emitT3Window(track, null)
          }
        }
      } catch {
        // fail-open (I-021)
      }
    },

    onDispose(evaluation: EvaluationResult): void {
      try {
        if (mode === "OFF") return
        const track = trackOf(lastSessionId)
        if (track) {
          const a = track.attribution
          emitEvaluation(
            root,
            { ...attributionInput(a, lastSessionId), executionId: track.executionId },
            evaluation,
            { t0: track.t0 !== null ? new Date(track.t0).toISOString() : null, t3: track.t3 !== null ? new Date(track.t3).toISOString() : null },
            evalStore,
          )
          emitT3Window(track, track.t3 === null ? "no-completion-observed" : null)
          lastSessionId = null
        }
      } catch {
        // fail-open (I-021)
      }
    },
  }

  // ---- T3/T4 emitters (local helpers over telemetry.ts, all fail-open) ----

  function emitT3Window(track: SessionTrack, missingReason: string | null): void {
    try {
      if (track.t3Emitted || track.t0 === null) return
      track.t3Emitted = true
      const a = track.attribution
      const t2Missing = track.t2 === null
      emitT3(root, {
        executionId: track.executionId,
        routeId: a?.routeId ?? "unknown",
        candidate: { providerId: a?.providerId ?? "unknown", modelId: a?.model ?? "unknown", variant: a?.variant ?? null },
        taskClass: (a?.taskClass ?? "unknown") as never,
        outputSizeBucket: null,
        t0: track.t0,
        t1: track.t1,
        t2: track.t2,
        t3: track.t3,
        ttfrMs: track.t2 !== null ? track.t2 - track.t0 : null,
        completionMs: track.t3 !== null ? track.t3 - track.t0 : null,
        timeout: false,
        missingReason: missingReason ?? (t2Missing ? "t2-unobservable" : null),
      })
    } catch {
      // fail-open
    }
  }

  function emitT4Usage(track: SessionTrack, info: { tokens?: { input?: number; output?: number }; cost?: unknown }): void {
    try {
      if (track.usageEmitted) return
      const tokens = info.tokens
      if (!tokens || (typeof tokens.input !== "number" && typeof tokens.output !== "number")) return
      track.usageEmitted = true
      const a = track.attribution
      const cost = typeof info.cost === "number" ? info.cost : null
      emitT4(root, {
        executionId: track.executionId,
        routeId: a?.routeId ?? "unknown",
        candidate: { providerId: a?.providerId ?? "unknown", modelId: a?.model ?? "unknown", variant: a?.variant ?? null },
        inputUsage: typeof tokens.input === "number" ? tokens.input : null,
        outputUsage: typeof tokens.output === "number" ? tokens.output : null,
        pricingSource: cost !== null ? { id: "opencode-host", version: "host-runtime", status: "VERIFIED" } : null,
        effectiveCost: cost,
        unit: cost !== null ? "USD" : null,
      })
    } catch {
      // fail-open
    }
  }
}

// ---- T5 capability probe runner (outside decision path; INSTRUMENTATION_SPEC §2 T5) ----
// Evidence source: the host's own runtime-verified variant registry (method INTEGRATION).
// Vision is NOT probed and stays BLOCKED (I-005) — no registry flag can promote it.

export function runCapabilityProbe(projectRoot: string, registry: ModelRegistry): number {
  let emitted = 0
  try {
    const now = new Date().toISOString()
    for (const m of registry.models) {
      for (const v of m.variants) {
        if (v.status !== "VERIFIED") continue
        try {
          emitT5(projectRoot, {
            probeId: `probe-${randomUUID()}`,
            candidate: { providerId: m.provider, modelId: m.id, variant: v.name },
            dimension: "reasoning",
            method: "INTEGRATION",
            result: "PASS",
            verifiedAt: now,
            probeVersion: "v22-probe-1",
          })
          emitted++
        } catch {
          // per-record fail-open
        }
      }
    }
  } catch {
    // fail-open
  }
  return emitted
}
