// Smart Router V2.2 — evaluation feedback store (Phase J; EVALUATION_DESIGN §3.1, ADR-016, I-016).
// Append-only JSONL. Attribution invariant: incomplete chain ⇒ stored for audit, ZERO statistics
// effect. Aggregates are recomputed from the store (reconstructability, ADR-008).
// Wave 2 (H5/M1/M3/M6): out-of-order convergence (T1/T2 merged per executionId), failure
// taxonomy separation, segmented aggregation, variant→model hierarchy, shrinkage + staleness.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { AggregateSourceLevel, EvaluationSignal, ExecutionOutcome, FailureCategory } from "./types.ts"

export const EVALUATION_STORE_DEFAULT = ".opencode/ai/evidence/v22/evaluation-signals.jsonl"

/** M1 hierarchy thresholds (design: variant n ≥ 5, model n ≥ 20). */
export const VARIANT_MIN_N = 5
export const MODEL_MIN_N = 20
/** Confidence shrinkage (EVIDENCE_CONTRACT §Quality): confidence = n / (n + 10). */
export const SHRINKAGE_K = 10
/** Staleness: 14-day half-life on confidence (M1). */
export const STALENESS_HALF_LIFE_DAYS = 14
export const CONFIDENCE_CAP = 0.9

export function isAttributionComplete(signal: EvaluationSignal): boolean {
  const c = signal.chain
  return Boolean(
    signal.attributionComplete !== false &&
    c.sessionId && c.routeId && c.executionId && c.evaluationId &&
    c.candidate.providerId && c.candidate.modelId && c.taskClass,
  )
}

/**
 * M6 failure taxonomy. Only MODEL_RELEVANT failures penalize the model.
 * Environment/user/unknown outcomes are recorded and counted, never attributed as model fault.
 * COMPLETED returns MODEL_RELEVANT as "eligible observation" (success counts toward the model).
 */
export function classifyFailure(exec: ExecutionOutcome): FailureCategory {
  if (exec.outcome === "COMPLETED") return "MODEL_RELEVANT"
  if (exec.environment.userCancel || exec.outcome === "CANCELLED" || exec.errorClass === "user-cancellation") return "USER"
  if (
    exec.environment.timeout || exec.environment.network || exec.environment.quota || exec.environment.tooling
    || exec.errorClass === "provider-auth" || exec.errorClass === "network" || exec.errorClass === "quota" || exec.errorClass === "timeout"
  ) return "ENVIRONMENT"
  if (
    exec.errorClass === "output-length" || exec.errorClass === "reasoning-insufficiency" || exec.errorClass === "coding-failure"
    || exec.errorClass === "security-failure" || exec.errorClass === "test-failure" || (exec.errorClass?.startsWith("model-") ?? false)
  ) return "MODEL_RELEVANT"
  return "UNKNOWN"
}

/** Shrinkage + staleness (Phase 10/11): sparse or stale evidence never gets high confidence. */
export function effectiveConfidence(n: number, latestTimestamp: string | null, nowMs: number): number {
  if (n <= 0) return 0
  const shrinkage = n / (n + SHRINKAGE_K)
  const ageDays = latestTimestamp ? Math.max(0, (nowMs - Date.parse(latestTimestamp)) / 86_400_000) : 0
  const freshness = Math.pow(0.5, ageDays / STALENESS_HALF_LIFE_DAYS)
  return Math.min(CONFIDENCE_CAP, shrinkage * freshness)
}

export interface AggregateStats {
  n: number
  mean: number
  confidence: number
  /** M1 provenance: which hierarchy level produced this aggregate. */
  sourceLevel: AggregateSourceLevel
  freshness: number
  lastUpdated: string | null
}

export interface ReliabilityStats {
  successRate: number
  timeoutRate: number
  sampleSize: number
  confidence: number
  /** M6/Phase 15 — observable denominators. */
  eligible: number
  excludedEnvironment: number
  excludedUser: number
  excludedUnknown: number
}

export interface RecentStats {
  n: number
  rate: number
  confidence: number
  eligible: number
  excludedEnvironment: number
  excludedUser: number
  excludedUnknown: number
}

export interface StoreStats {
  total: number
  attributed: number
  incomplete: number
  /** Merged execution groups with conflicting chains — audit-only, never aggregated. */
  conflicts: number
  qualityByCandidate: Map<string, AggregateStats>
  /** M3 canonical: key `${taskClass}|${candidateKey}` — no cross-class contamination. */
  qualityBySegment: Map<string, AggregateStats>
  /** M1 model-level fallback: key `${taskClass}|${providerId}/${modelId}`. */
  qualityByModel: Map<string, AggregateStats>
  recentSuccessByCandidate: Map<string, RecentStats>
  recentSuccessBySegment: Map<string, RecentStats>
  reliabilityByCandidate: Map<string, ReliabilityStats>
  failureBreakdown: { modelRelevant: number; environment: number; user: number; unknown: number; completed: number }
}

interface QualityEntry {
  value: number
  timestamp: string
}

interface RecentBucket {
  win: boolean[]
  eligible: number
  env: number
  user: number
  unknown: number
  last: string
}

interface ReliabilityBucket {
  success: number
  timeout: number
  eligible: number
  env: number
  user: number
  unknown: number
  last: string
}

interface MergedExecution {
  chain: EvaluationSignal["chain"] | null
  complete: boolean
  conflict: boolean
  quality: EvaluationSignal["quality"]
  execution: EvaluationSignal["execution"]
  size: number
}

/** In-memory store; `flush` persists. Pure aggregate computation over stored signals. */
export class EvaluationStore {
  private signals: EvaluationSignal[] = []
  private readonly filePath: string
  constructor(filePath: string = resolve(EVALUATION_STORE_DEFAULT)) {
    this.filePath = filePath
  }

  load(): void {
    this.signals = []
    if (!existsSync(this.filePath)) return
    const lines = readFileSync(this.filePath, "utf8").split("\n").filter(Boolean)
    for (const line of lines) {
      try {
        this.signals.push(JSON.parse(line) as EvaluationSignal)
      } catch {
        // corrupted line → skipped; evidence loss degrades future ranking, never safety (ADR-010)
      }
    }
  }

  /** Read-only view for offline consumers (replay-2). Never mutates the store. */
  snapshot(): readonly EvaluationSignal[] {
    return this.signals
  }

  /**
   * Appends one signal. Incomplete attribution is stored but excluded from statistics (I-016).
   * H7 (Wave 1): a signal is an event identity — the same signalId recorded twice is a duplicate
   * event and is ignored (first wins; append-only file never sees the duplicate row).
   * Wave 2 (Phase 5): idempotency is enforced by signalId identity, not file-line uniqueness.
   */
  record(signal: EvaluationSignal, flush = true): { stored: boolean; attributed: boolean } {
    if (this.signals.some((s) => s.signalId === signal.signalId)) return { stored: false, attributed: false }
    const attributed = isAttributionComplete(signal)
    this.signals.push(signal)
    if (flush) this.persist(signal)
    return { stored: true, attributed }
  }

  private persist(signal: EvaluationSignal): void {
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      appendFileSync(this.filePath, JSON.stringify(signal) + "\n", "utf8")
    } catch {
      // fail-open: evidence loss degrades future ranking, never safety (ADR-010)
    }
  }

  /**
   * Signal separation: Execution/Quality/Environment outcomes (EVALUATION_DESIGN §3.1).
   * H7 (Wave 1) — attribution lifecycle fix: an execution outcome has NO evaluation yet, so the
   * record stays attribution-INCOMPLETE (zero statistics effect) until a non-empty `evaluationId`
   * links it to its evaluation. No evaluationId is ever fabricated.
   * Wave 2: `attributionComplete` is chain-derived (evaluationId excluded — it arrives with the
   * later T1 signal), so out-of-order convergence can complete the attribution.
   */
  recordExecution(outcome: ExecutionOutcome, flush = true, evaluationId = ""): { stored: boolean; attributed: boolean } {
    const signal: EvaluationSignal = {
      signalId: `SIG-${outcome.executionId}`,
      executionId: outcome.executionId,
      chain: {
        sessionId: outcome.sessionId,
        routeId: outcome.routeId,
        executionId: outcome.executionId,
        candidate: { providerId: outcome.providerId, modelId: outcome.modelId, variant: outcome.variant },
        taskClass: outcome.taskClass,
        evaluationId,
      },
      attributionComplete: Boolean(
        outcome.sessionId && outcome.routeId && outcome.providerId && outcome.modelId && outcome.taskClass,
      ),
      quality: null,
      execution: outcome,
    }
    return this.record(signal, flush)
  }

  /**
   * Wave 2 (Phase 6) — out-of-order convergence. Signals for the SAME executionId merge into
   * one view: a late T1 evaluation completes the earlier T2 execution outcome (and vice versa).
   * Explicitly audit-flagged signals (`attributionComplete === false`) never merge — they are
   * standalone audit rows. Chains that disagree on a non-empty field are conflicts: audit-only.
   */
  private mergedExecutions(): MergedExecution[] {
    const groups = new Map<string, EvaluationSignal[]>()
    for (const s of this.signals) {
      if (s.attributionComplete === false) continue // explicit audit veto — never merges, never counts
      const key = s.chain.executionId || s.executionId
      if (!key) continue
      const g = groups.get(key) ?? []
      g.push(s)
      groups.set(key, g)
    }
    const out: MergedExecution[] = []
    for (const [executionId, group] of groups) {
      let conflict = false
      const chain: EvaluationSignal["chain"] = {
        sessionId: "", routeId: "", executionId,
        candidate: { providerId: "", modelId: "", variant: null },
        taskClass: "" as EvaluationSignal["chain"]["taskClass"],
        evaluationId: "",
      }
      const fill = (current: string, incoming: string | undefined): string => {
        if (incoming === undefined || incoming === "") return current
        if (current !== "" && incoming !== current) {
          conflict = true
          return current
        }
        return incoming
      }
      for (const s of group) {
        chain.sessionId = fill(chain.sessionId, s.chain.sessionId)
        chain.routeId = fill(chain.routeId, s.chain.routeId)
        chain.candidate.providerId = fill(chain.candidate.providerId, s.chain.candidate.providerId)
        chain.candidate.modelId = fill(chain.candidate.modelId, s.chain.candidate.modelId)
        if (chain.candidate.variant === null) chain.candidate.variant = s.chain.candidate.variant
        else if (s.chain.candidate.variant !== null && s.chain.candidate.variant !== chain.candidate.variant) conflict = true
        chain.taskClass = fill(chain.taskClass, s.chain.taskClass) as EvaluationSignal["chain"]["taskClass"]
        chain.evaluationId = fill(chain.evaluationId, s.chain.evaluationId)
      }
      const complete = !conflict
        && Boolean(chain.sessionId && chain.routeId && chain.executionId && chain.evaluationId
          && chain.candidate.providerId && chain.candidate.modelId && chain.taskClass)
      out.push({
        chain: conflict ? null : chain,
        complete,
        conflict,
        quality: group.find((s) => s.quality)?.quality ?? null,
        execution: group.find((s) => s.execution)?.execution ?? null,
        size: group.length,
      })
    }
    return out
  }

  private static aggregate(entries: QualityEntry[], sourceLevel: AggregateSourceLevel, nowMs: number): AggregateStats | null {
    if (entries.length === 0) return null
    const n = entries.length
    const latest = entries.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp
    const shrinkage = n / (n + SHRINKAGE_K)
    const ageDays = latest ? Math.max(0, (nowMs - Date.parse(latest)) / 86_400_000) : 0
    const freshness = Math.pow(0.5, ageDays / STALENESS_HALF_LIFE_DAYS)
    const wSum = entries.length * freshness
    const mean = entries.reduce((s, e) => s + e.value * freshness, 0) / wSum
    return { n, mean, confidence: Math.min(CONFIDENCE_CAP, shrinkage * freshness), sourceLevel, freshness, lastUpdated: latest || null }
  }

  stats(nowMs: number = Date.now()): StoreStats {
    const total = this.signals.length
    let conflicts = 0
    let attributed = 0
    let completeSignals = 0
    const failureBreakdown = { modelRelevant: 0, environment: 0, user: 0, unknown: 0, completed: 0 }

    const qualityGlobal = new Map<string, QualityEntry[]>()
    const qualitySegment = new Map<string, QualityEntry[]>()
    const qualityModel = new Map<string, QualityEntry[]>()
    const recentGlobal = new Map<string, RecentBucket>()
    const recentSegment = new Map<string, RecentBucket>()
    const reliability = new Map<string, ReliabilityBucket>()

    for (const m of this.mergedExecutions()) {
      if (m.conflict) {
        conflicts++
        continue
      }
      if (!m.complete) continue // incomplete group — audit only, zero statistics effect (I-016)
      attributed++
      completeSignals += m.size
      const chain = m.chain!
      const variantKey = candidateKey(chain.candidate)
      const modelKey = `${chain.candidate.providerId}/${chain.candidate.modelId}`
      const segmentKey = `${chain.taskClass}|${variantKey}`
      const modelSegmentKey = `${chain.taskClass}|${modelKey}`

      if (m.quality) {
        const entry: QualityEntry = { value: m.quality.grade, timestamp: (m.execution?.timestamp ?? m.quality.timestamp) || "" }
        const push = (map: Map<string, QualityEntry[]>, k: string): void => {
          const arr = map.get(k) ?? []
          arr.push(entry)
          map.set(k, arr)
        }
        push(qualityGlobal, variantKey)
        push(qualitySegment, segmentKey)
        push(qualityModel, modelSegmentKey)
      }

      if (m.execution) {
        const category = classifyFailure(m.execution)
        if (category === "MODEL_RELEVANT") {
          if (m.execution.outcome === "COMPLETED") failureBreakdown.completed++
          else failureBreakdown.modelRelevant++
        } else if (category === "ENVIRONMENT") failureBreakdown.environment++
        else if (category === "USER") failureBreakdown.user++
        else failureBreakdown.unknown++

        // M6: environment/user/unknown outcomes never penalize the model.
        const eligible = category === "MODEL_RELEVANT"
        const bucket = (map: Map<string, RecentBucket>, k: string): void => {
          const r = map.get(k) ?? { win: [], eligible: 0, env: 0, user: 0, unknown: 0, last: "" }
          if (eligible) {
            r.win.push(m.execution!.outcome === "COMPLETED")
            r.eligible++
          } else if (category === "ENVIRONMENT") r.env++
          else if (category === "USER") r.user++
          else r.unknown++
          r.last = m.execution!.timestamp
          map.set(k, r)
        }
        bucket(recentGlobal, variantKey)
        bucket(recentSegment, segmentKey)

        const rel = reliability.get(variantKey) ?? { success: 0, timeout: 0, eligible: 0, env: 0, user: 0, unknown: 0, last: "" }
        if (eligible) {
          rel.eligible++
          if (m.execution!.outcome === "COMPLETED") rel.success++
          if (m.execution!.environment.timeout) rel.timeout++
        } else if (category === "ENVIRONMENT") rel.env++
        else if (category === "USER") rel.user++
        else rel.unknown++
        rel.last = m.execution!.timestamp
        reliability.set(variantKey, rel)
      }
    }

    const qualityByCandidate = new Map<string, AggregateStats>()
    for (const [k, arr] of qualityGlobal) {
      if (arr.length < VARIANT_MIN_N) continue
      const a = EvaluationStore.aggregate(arr, "VARIANT", nowMs)
      if (a) qualityByCandidate.set(k, a)
    }
    const qualityBySegment = new Map<string, AggregateStats>()
    for (const [k, arr] of qualitySegment) {
      if (arr.length < VARIANT_MIN_N) continue
      const a = EvaluationStore.aggregate(arr, "VARIANT", nowMs)
      if (a) qualityBySegment.set(k, a)
    }
    const qualityByModel = new Map<string, AggregateStats>()
    for (const [k, arr] of qualityModel) {
      if (arr.length < MODEL_MIN_N) continue
      const a = EvaluationStore.aggregate(arr, "MODEL", nowMs)
      if (a) qualityByModel.set(k, a)
    }

    const toRecent = (r: RecentBucket, nowMs: number): RecentStats => {
      const window = r.win.slice(-20)
      const rate = window.length > 0 ? window.filter(Boolean).length / window.length : 0
      return {
        n: window.length,
        rate,
        confidence: effectiveConfidence(window.length, r.last || null, nowMs),
        eligible: r.eligible,
        excludedEnvironment: r.env,
        excludedUser: r.user,
        excludedUnknown: r.unknown,
      }
    }
    const recentSuccessByCandidate = new Map<string, RecentStats>()
    for (const [k, r] of recentGlobal) {
      if (r.win.slice(-20).length < VARIANT_MIN_N) continue
      recentSuccessByCandidate.set(k, toRecent(r, nowMs))
    }
    const recentSuccessBySegment = new Map<string, RecentStats>()
    for (const [k, r] of recentSegment) {
      if (r.win.slice(-20).length < VARIANT_MIN_N) continue
      recentSuccessBySegment.set(k, toRecent(r, nowMs))
    }

    const reliabilityByCandidate = new Map<string, ReliabilityStats>()
    for (const [k, r] of reliability) {
      if (r.eligible < VARIANT_MIN_N) continue
      reliabilityByCandidate.set(k, {
        successRate: r.success / r.eligible,
        timeoutRate: r.timeout / r.eligible,
        sampleSize: r.eligible,
        confidence: effectiveConfidence(r.eligible, r.last || null, nowMs),
        eligible: r.eligible, excludedEnvironment: r.env, excludedUser: r.user, excludedUnknown: r.unknown,
      })
    }

    return {
      total,
      attributed,
      // signals with zero statistics effect: audit rows + incomplete/conflict-group signals
      incomplete: total - completeSignals,
      conflicts,
      qualityByCandidate,
      qualityBySegment,
      qualityByModel,
      recentSuccessByCandidate,
      recentSuccessBySegment,
      reliabilityByCandidate,
      failureBreakdown,
    }
  }

  all(): readonly EvaluationSignal[] {
    return this.signals
  }
}

export function candidateKey(c: { providerId: string; modelId: string; variant: string | null }): string {
  return c.variant ? `${c.providerId}/${c.modelId}#${c.variant}` : `${c.providerId}/${c.modelId}`
}

/**
 * Canonical identity parse (CRITICAL-1, adversarial review). Host attribution carries the
 * provider-qualified model ("provider/model"); the store's candidate-key vocabulary is
 * `{providerId, modelId, variant}` where modelId is UNQUALIFIED (candidateKey must equal the
 * engine candidateId `providerId/modelId#variant`). Splits the FIRST "/" only; absent
 * provider, leading or trailing slash ⇒ providerId null.
 */
export function parseQualifiedModel(model: string | null | undefined): { providerId: string | null; modelId: string } {
  const raw = model ?? ""
  const sep = raw.indexOf("/")
  if (sep <= 0 || sep === raw.length - 1) return { providerId: null, modelId: raw }
  return { providerId: raw.slice(0, sep), modelId: raw.slice(sep + 1) }
}

export function joinStorePath(root: string, rel: string = EVALUATION_STORE_DEFAULT): string {
  return join(root, rel)
}
