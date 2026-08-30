// Smart Router V2.2 — TUI presentation adapter (pure, read-only).
// Converts already-parsed Smart Router runtime records into a UI view model.
// NEVER recalculates routing, never mutates anything, never fabricates values:
// absent data stays null and renders as UNKNOWN/"—". Contract-faithful (Phase 41).
// MEDIUM-1: session-specific records are filtered by the host-supplied sessionId —
// no global-latest fallback for sessions. MEDIUM-3: evidence values come ONLY from
// the authoritative EvaluationStore aggregation (StoreStats) — this file formats,
// it never aggregates quality/confidence/freshness itself.

import type { ModelRegistry } from "../../types.ts"
import type { StoreStats } from "../evaluation-store.ts"
import { parseCandidateId, resolveObservedQuality } from "../evidence-snapshot.ts"

export type Tone = "default" | "muted" | "success" | "warning" | "error" | "accent"

export interface Row {
  [key: string]: unknown
}

export interface CandidateVM {
  rank: number
  id: string
  score: number | null
  tier: string | null
  confidence: number | null
}

export interface EvidenceVM {
  candidateKey: string
  quality: number | null
  confidence: number | null
  samples: number | null
  source: string | null
  freshnessDays: number | null
  status: string
}

export interface BreakerVM {
  key: string
  state: string
  failures: number | null
}

export interface SecurityDenyVM {
  timestamp: string
  rule: string
  preview: string | null
}

/** R2-MED-01: provenance of the hard-deny evidence source (read-only observation). */
export type SecuritySourceStatus = "valid" | "unavailable" | "invalid"

/**
 * R2-MED-01: classify the raw permissions file content. Pure — file IO stays in the
 * plugin. `null` text = source missing/unreadable. Any malformed JSONL line (including
 * a partial trailing line during a write) marks the whole tail "invalid": a dropped
 * deny row must never become false "no deny" confidence.
 */
export function parsePermissionTail(text: string | null, n: number): { rows: Row[]; status: SecuritySourceStatus } {
  if (text === null) return { rows: [], status: "unavailable" }
  const lines = text.split("\n").filter((l) => l.trim().length > 0).slice(-n)
  const rows: Row[] = []
  for (const l of lines) {
    try {
      rows.push(JSON.parse(l) as Row)
    } catch {
      return { rows, status: "invalid" }
    }
  }
  return { rows, status: "valid" }
}

export interface HysteresisVM {
  applied: boolean | null
  current: string | null
  alternative: string | null
  margin: number | null
  decision: string
}

export interface RouterViewModel {
  mode: string
  authority: string
  influence: string
  taskClass: string | null
  risk: string | null
  agent: string | null
  actual: string | null
  actualModelId: string | null
  shadow: string | null
  shadowStatus: string | null
  shadowReason: string | null
  selectedTier: string | null
  selectedScore: number | null
  selectedConfidence: number | null
  divergent: boolean | null
  wouldDispatch: false
  candidates: CandidateVM[]
  hysteresis: HysteresisVM
  breaker: BreakerVM[]
  evidence: EvidenceVM[]
  evidenceScope: string | null
  latency: { ttfrMs: number | null; completionMs: number | null; decisionMs: number | null }
  cost: { input: number | null; output: number | null; effective: number | null; unit: string | null; verified: boolean }
  evaluation: { executionId: string | null; hasT2: boolean; hasT1: boolean; attributionComplete: boolean | null; outcome: string | null; status: string }
  security: { permissionMode: string | null; source: SecuritySourceStatus; hardDeny: boolean; denies: SecurityDenyVM[]; clamps: number; advisories: number }
  capabilities: CapabilityVM[] | null
  fallback: { model: string; variant: string | null; status: string }[]
  fallbackStatus: string
  promotion: { g3: string; g4: string; authorized: false }
  updatedAt: string | null
}

const asString = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null)
// LOW-2: negative numbers are never trusted metrics (cost/latency/scores are >= 0)
const asNum = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null)
const asBool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null)
const UNKNOWN = "UNKNOWN"

/** "provider/model" + variant -> "model · variant"; keeps UNKNOWN semantics, never invents names. */
export function formatRoute(providerModel: string | null, variant: string | null): string | null {
  if (!providerModel) return null
  const model = providerModel.includes("/") ? (providerModel.split("/").slice(1).join("/") || providerModel) : providerModel
  return variant ? `${model} · ${variant}` : model
}

export interface AdapterInput {
  flags: Row | null
  config: Row | null
  deltas: Row[]
  signals: Row[]
  t2: Row[]
  t3: Row[]
  t4: Row[]
  routing: Row[]
  permissions: Row[]
  /**
   * R2-MED-01: provenance of the permissions source. The hard-deny display must
   * distinguish "valid source, zero denies" from "source unavailable/invalid"
   * (unknown) — an unreadable source must never fabricate a false non-deny state.
   */
  permissionsStatus: SecuritySourceStatus
  routerLog: Row[]
  breaker: Row | null
  hysteresis: Row[]
  /** Authoritative aggregates from the EvaluationStore implementation (MEDIUM-3). */
  storeStats: StoreStats | null
  registry: ModelRegistry | null
  nowMs: number
}

/**
 * Session filter (MEDIUM-1): when the host supplies a sessionId, session-specific
 * records MUST match it exactly — never fall back to another session's global-latest row.
 * Undefined/empty sessionId (home footer, dialogs) keeps the global workspace view.
 */
function sessionRowFilter(sessionId: string | undefined): (r: Row) => boolean {
  if (!sessionId) return () => true
  return (r) => r.sessionId === sessionId
}

function sessionHysteresisFilter(sessionId: string | undefined): (r: Row) => boolean {
  if (!sessionId) return () => true
  return (r) => typeof r.key === "string" && r.key.startsWith(`${sessionId}::`)
}

/**
 * Authoritative evidence rows (MEDIUM-3). Every value is copied from EvaluationStore
 * aggregates (taskClass × candidate segmentation, variant→model fallback with the ×0.5
 * inheritance cap, shrinkage+staleness confidence, CONFIDENCE_CAP). This adapter formats;
 * it never recomputes quality, confidence, samples, source, or status thresholds.
 * Route-relevant candidates without authoritative aggregates surface as UNPROVEN —
 * an honest absence, not a fabricated number.
 */
function evidenceFromStats(
  stats: StoreStats | null,
  taskClass: string | null,
  nowMs: number,
  routeCandidateIds: string[],
): EvidenceVM[] {
  if (!stats) return []
  const out = new Map<string, EvidenceVM>()
  const freshnessDaysOf = (lastUpdated: string | null): number | null => {
    if (!lastUpdated) return null
    // R2-LOW-02: presentation-level guard — an unparseable timestamp must never
    // reach the display as NaN. Store freshness semantics stay authoritative.
    const days = (nowMs - Date.parse(lastUpdated)) / 86_400_000
    return Number.isFinite(days) ? Math.max(0, days) : null
  }
  const pushResolved = (candidateId: string, sourceLabel: string | null, quality: number | null, confidence: number | null, samples: number | null, lastUpdated: string | null): void => {
    if (out.has(candidateId)) return
    out.set(candidateId, {
      candidateKey: candidateId,
      quality,
      confidence,
      samples,
      source: sourceLabel,
      freshnessDays: freshnessDaysOf(lastUpdated),
      status: samples !== null ? "KNOWN-EVIDENCED" : "UNPROVEN",
    })
  }
  const resolveWithStats = (candidateId: string): void => {
    const parsed = parseCandidateId(candidateId)
    if (!parsed) return
    const obs = taskClass
      ? resolveObservedQuality(stats, taskClass, parsed.providerId, parsed.modelId, parsed.variant)
      : null
    if (obs) {
      pushResolved(
        candidateId,
        obs.sourceLevel === "MODEL" ? "MODEL (inherited, ×0.5 cap)" : obs.sourceLevel,
        obs.value,
        obs.confidence,
        obs.sampleSize,
        obs.lastUpdated,
      )
    }
  }
  // authoritative segments for the session's task class; global variant aggregates otherwise
  if (taskClass) {
    const prefix = `${taskClass}|`
    for (const key of stats.qualityBySegment.keys()) {
      if (key.startsWith(prefix)) resolveWithStats(key.slice(prefix.length))
    }
    for (const key of stats.qualityByModel.keys()) {
      if (key.startsWith(prefix)) resolveWithStats(key.slice(prefix.length))
    }
  } else {
    for (const [key, a] of stats.qualityByCandidate) {
      pushResolved(key, "VARIANT", a.mean, a.confidence, a.n, a.lastUpdated)
    }
  }
  // route-relevant candidates: show honest UNPROVEN when no authoritative aggregate exists
  for (const id of routeCandidateIds) {
    if (out.has(id)) continue
    const parsed = parseCandidateId(id)
    if (!parsed) continue
    resolveWithStats(id)
    if (!out.has(id)) {
      out.set(id, { candidateKey: id, quality: null, confidence: null, samples: null, source: null, freshnessDays: null, status: "UNPROVEN" })
    }
  }
  return [...out.values()].sort((a, b) => (b.samples ?? 0) - (a.samples ?? 0))
}

export function buildViewModel(input: AdapterInput, sessionId?: string): RouterViewModel {
  const mode = asString(input.flags?.mode) ?? "OFF"
  const matchesSession = sessionRowFilter(sessionId)
  const sessionFilter = (rows: Row[]): Row[] => rows.filter(matchesSession)

  const deltaRows = sessionFilter([...input.deltas]).sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? "")))
  const delta = deltaRows.at(-1) ?? null
  const v21 = (delta?.v21 ?? null) as Row | null
  const v22 = (delta?.v22 ?? null) as Row | null

  const sessionRouting = sessionFilter(input.routing)
  const routingRow = sessionRouting.at(-1) ?? null
  const actualModel = asString(routingRow?.model) ?? asString(v21?.modelId)
  const actual = formatRoute(actualModel, asString(routingRow?.variant) ?? asString(v21?.variant))
  const shadowSelected = asString(v22?.selected)
  // LOW-6: display split `provider/model#variant` into the same `model · variant` notation
  // used for the actual route — display only, the candidate id itself is never rewritten
  const shadowModelPart = shadowSelected?.includes("/") ? shadowSelected.slice(shadowSelected.indexOf("/") + 1) : shadowSelected
  const shadowHash = shadowModelPart ? shadowModelPart.indexOf("#") : -1
  const shadowRoute = shadowSelected
    ? formatRoute(shadowHash >= 0 ? shadowModelPart!.slice(0, shadowHash) : shadowModelPart ?? null, shadowHash >= 0 ? shadowModelPart!.slice(shadowHash + 1) : null)
    : null

  // execution focus: latest execution id across telemetry + store (session-scoped)
  const t2Rows = sessionFilter([...input.t2]).sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? "")))
  const t2Latest = t2Rows.at(-1) ?? null
  const latestExecutionId = asString(t2Latest?.executionId) ?? asString(delta?.executionId)

  const signalRows = sessionId ? input.signals.filter((s) => {
    const chain = (s.chain ?? null) as Row | null
    return (asString(chain?.sessionId) ?? asString(s.sessionId)) === sessionId
  }) : input.signals
  const execSignals = latestExecutionId ? signalRows.filter((s) => s.executionId === latestExecutionId) : []
  const t2Signal = execSignals.find((s) => s.execution !== null && s.execution !== undefined) ?? null
  const t1Signal = execSignals.find((s) => s.quality !== null && s.quality !== undefined) ?? null
  const executionRow = (t2Signal?.execution ?? null) as Row | null
  const evaluationRow = (t1Signal?.quality ?? null) as Row | null

  const outcome = asString(executionRow?.outcome)
  const hasT1 = t1Signal !== null
  const hasT2 = t2Signal !== null || t2Latest !== null
  const evaluationStatus = hasT1 ? "RECEIVED" : hasT2 ? (outcome === "CANCELLED" ? "CANCELLED - AUDIT ONLY" : "PENDING DISPOSE") : "NO EXECUTION YET"

  const candidates: CandidateVM[] = ((v22?.topScores ?? []) as Row[]).map((c, i) => ({
    rank: i + 1,
    id: asString(c.candidateId) ?? UNKNOWN,
    score: asNum(c.score),
    tier: asString(c.tier),
    confidence: null,
  }))

  const lastHyst = input.hysteresis.filter(sessionHysteresisFilter(sessionId)).at(-1) ?? null
  const hystState = (lastHyst?.state ?? null) as Row | null
  const hystCurrent = hystState ? formatRoute(asString((hystState.currentRoute as Row | undefined)?.providerId) ? `${(hystState.currentRoute as Row).providerId}/${(hystState.currentRoute as Row).modelId}` : null, asString((hystState.currentRoute as Row | undefined)?.variant)) : null
  const altCandidate = candidates[1] ?? null
  const top = candidates[0] ?? null
  const margin = top && altCandidate && top.score !== null && altCandidate.score !== null ? Math.abs(top.score - altCandidate.score) : null
  const hysteresis: HysteresisVM = {
    applied: asBool(v22?.stickinessApplied),
    current: hystCurrent ?? (top ? top.id : null),
    alternative: altCandidate ? altCandidate.id : null,
    margin,
    decision: asBool(v22?.stickinessApplied) === true ? "RETAIN CURRENT" : asBool(v22?.stickinessApplied) === false ? "RE-EVALUATED" : UNKNOWN,
  }

  const breakerEntries = ((input.breaker?.entries ?? {}) as Record<string, Row>)
  const relevantKeys = new Set<string>()
  if (actualModel) relevantKeys.add(actualModel)
  if (shadowSelected) relevantKeys.add(shadowSelected)
  for (const k of Object.keys(breakerEntries)) {
    if (String(breakerEntries[k]?.state ?? "").toUpperCase() === "OPEN") relevantKeys.add(k)
  }
  if (relevantKeys.size === 0) relevantKeys.add(Object.keys(breakerEntries)[0] ?? "")
  const breaker: BreakerVM[] = [...relevantKeys].filter(Boolean).map((key) => {
    const e = breakerEntries[key] ?? {}
    return { key, state: String(e.state ?? UNKNOWN).toUpperCase(), failures: asNum(e.failures) }
  })

  // MEDIUM-3: authoritative evidence only — this adapter formats, never aggregates.
  const routeCandidateIds: string[] = []
  if (actualModel) {
    const v = asString(routingRow?.variant)
    routeCandidateIds.push(v ? `${actualModel}#${v}` : actualModel)
  }
  if (shadowSelected) routeCandidateIds.push(shadowSelected)
  const evidence = evidenceFromStats(input.storeStats, asString(routingRow?.matched_task_class) ?? asString(delta?.taskClass), input.nowMs, routeCandidateIds)
  const evidenceScope = asString(routingRow?.matched_task_class) ?? asString(delta?.taskClass) ?? (evidence.length > 0 ? "GLOBAL" : null)

  const t3Latest = [...input.t3].sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""))).at(-1) ?? null
  const t4Latest = [...input.t4].sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""))).at(-1) ?? null
  const latency = {
    ttfrMs: asNum(t3Latest?.ttfrMs),
    completionMs: asNum(t3Latest?.completionMs),
    decisionMs: null,
  }
  const cost = {
    input: asNum(t4Latest?.inputUsage),
    output: asNum(t4Latest?.outputUsage),
    effective: asNum(t4Latest?.effectiveCost),
    unit: asString(t4Latest?.unit),
    verified: ((t4Latest?.pricingSource ?? null) as Row | null)?.status === "VERIFIED",
  }

  const routing = routingRow
  const permissionRows = [...input.permissions].sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? "")))
  const denies: SecurityDenyVM[] = permissionRows
    .filter((r) => r.decision === "deny" || r.decision === "DENY")
    .slice(-5)
    .map((r) => ({ timestamp: asString(r.timestamp) ?? UNKNOWN, rule: asString(r.rule) ?? asString(r.matchedRule) ?? UNKNOWN, preview: asString(r.operationPreview) }))
  const logRows = [...input.routerLog].sort((a, b) => String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? "")))
  const security = {
    permissionMode: asString(routing?.permission) ?? asString(input.config?.permissionMode),
    source: input.permissionsStatus,
    hardDeny: denies.length > 0,
    denies,
    clamps: logRows.filter((r) => r.kind === "effort-clamp").length,
    advisories: logRows.filter((r) => r.kind === "advisory-mismatch").length,
  }

  const fallbackRaw = ((routing?.fallback ?? []) as Row[])
  const fallback = fallbackRaw.map((f) => ({ model: asString(f.model) ?? UNKNOWN, variant: asString(f.variant), status: asString(f.status) ?? UNKNOWN }))

  const capabilities = parseCapabilities(input.registry, actualModel)

  return {
    mode,
    authority: `V2.1 (${asString(input.config?.mode) ?? UNKNOWN})`,
    influence: mode === "SHADOW" || mode === "OFF" ? "ZERO" : mode,
    taskClass: asString(routing?.matched_task_class) ?? asString(delta?.taskClass),
    risk: asString(routing?.risk),
    agent: asString(routing?.agent),
    actual,
    actualModelId: actualModel,
    shadow: shadowRoute ?? (delta ? "UNPROVEN" : null),
    shadowStatus: asString(delta?.status),
    shadowReason: asString(v22?.reason) ?? asString(delta?.reason) ?? asString(routing?.reason),
    selectedTier: asString(v22?.selectedTier),
    selectedScore: asNum(v22?.selectedScore),
    selectedConfidence: asNum(v22?.selectedConfidence),
    divergent: asBool(v22?.divergent) ?? asBool(delta?.divergent),
    wouldDispatch: false,
    candidates,
    hysteresis,
    breaker,
    evidence,
    evidenceScope,
    latency,
    cost,
    evaluation: {
      executionId: latestExecutionId,
      hasT2,
      hasT1,
      attributionComplete: asBool((t1Signal as Row | null)?.attributionComplete),
      outcome,
      status: evaluationStatus,
    },
    security,
    capabilities,
    fallback,
    fallbackStatus: fallback.length > 0 ? "PLANNED" : UNKNOWN,
    promotion: { g3: "MECHANISM VERIFIED", g4: "PARTIAL", authorized: false },
    updatedAt: asString(delta?.timestamp) ?? asString(routing?.timestamp),
  }
}

export interface CapabilityVM {
  name: string
  status: string
}

/** Capability panel from the real SSOT registry (read-only). Vision never promoted (I-005). */
export function parseCapabilities(registry: ModelRegistry | null, modelId: string | null): CapabilityVM[] | null {
  if (!registry || registry.models.length === 0) return null
  const entry = modelId
    ? registry.models.find((m) => m.id === modelId || m.id.endsWith(`/${modelId}`) || modelId.endsWith(`/${m.id}`))
    : undefined
  if (!entry) return null
  const rows: CapabilityVM[] = entry.variants.map((v) => ({ name: v.effort ? `${v.name} (${v.effort})` : v.name, status: v.status }))
  rows.push({ name: "vision", status: entry.supportsVision ? "VERIFIED" : "BLOCKED" })
  rows.push({ name: "max verified effort", status: entry.maxVerifiedEffort ?? "NONE" })
  return rows
}
