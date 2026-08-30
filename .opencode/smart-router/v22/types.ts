// Smart Router V2.2 — canonical types (Phase A).
// Pure TS, erasable syntax only (node --strip-types / vitest). No runtime logic beyond const tables.
// Normative sources: docs/smart-router/SMART_ROUTER_V2_2_*.md (authority order: ARCHITECTURE §6.0).

import type {
  AgentName,
  Complexity,
  ContextDemand,
  Modality,
  ReasoningDemand,
  RiskLevel,
  VariantStatus,
} from "../types.ts"

// Re-exported so V2.2 modules can import the V2.1 risk vocabulary from the V2.2 types module.
export type { RiskLevel }

// ---------------------------------------------------------------------------
// Class model (DECISION_MATRIX §1.1 — C4 mapping is total over policy classes)
// ---------------------------------------------------------------------------

export const SOURCE_TASK_CLASSES = [
  "crud-simple", "standard-coding", "complex-implementation", "latency-sensitive",
  "ui-implementation", "react-next-architecture", "routine-review", "deep-review",
  "security-review", "complex-debugging", "repo-research", "deep-research",
  "architecture-analysis", "documentation", "testing", "database", "performance",
  "deployment", "tooling", "orchestration", "vision-task",
] as const

export type SourceTaskClass = (typeof SOURCE_TASK_CLASSES)[number]

export const OPTIMIZATION_CLASSES = [
  "routine-coding", "frontend", "complex-debugging", "security-review",
  "routine-review", "deep-review", "deep-research", "repo-research",
] as const

export type OptimizationClass = (typeof OPTIMIZATION_CLASSES)[number]

// ---------------------------------------------------------------------------
// Capability model (ROUTING_MODEL §4.1–§4.4)
// ---------------------------------------------------------------------------

export const CAPABILITY_DIMS = [
  "reasoning", "coding", "debugging", "architecture", "research", "review",
  "agenticToolUse", "contextWindow", "structuredOutput", "vision",
  "fileHandling", "multimodality", "speed",
] as const

export type CapabilityDim = (typeof CAPABILITY_DIMS)[number]

// Evidence promotion ladder (ADR-002; VERIFIED expires after 30 days — EVIDENCE_CONTRACT §5)
export type EvidenceLevel = "UNKNOWN" | "DOCUMENTED" | "STATIC" | "INTEGRATED" | "VERIFIED"

export const EVIDENCE_LEVEL_RANK: Record<EvidenceLevel, number> = {
  UNKNOWN: 0, DOCUMENTED: 1, STATIC: 2, INTEGRATED: 3, VERIFIED: 4,
}

// Requirement tiers (C1 resolution, ROUTING_MODEL §4.4 — canonical)
export type RequirementTier = "MANDATORY" | "REQUIRED_FLOOR" | "OPTIONAL"

export interface CapabilityRequirement {
  dim: CapabilityDim
  tier: RequirementTier
  /** Minimum evidence level for KNOWN-SUPPORTED (e.g. INTEGRATED for the review floor). */
  minLevel: EvidenceLevel
}

// ---------------------------------------------------------------------------
// Task requirement (ROUTING_MODEL §1)
// ---------------------------------------------------------------------------

export interface TaskRequirement {
  sessionId?: string
  routeId?: string
  sourceTaskClass: SourceTaskClass
  optimizationClass: OptimizationClass
  riskClass: RiskLevel
  agent: AgentName
  modality: Modality
  complexity: Complexity
  contextDemand: ContextDemand
  reasoningDemand: ReasoningDemand
  /** Estimated context need in tokens (drives the hard context gate). */
  contextTokens: number
  capabilityRequirements: CapabilityRequirement[]
  latencyPreference: "normal" | "speed"
  qualityPreference: "normal" | "max"
  costProfile: "economy" | "balanced" | "quality"
}

// ---------------------------------------------------------------------------
// Candidate + hard-gate vocabulary (ROUTING_MODEL §2–§3)
// ---------------------------------------------------------------------------

export type PolicyStatus = "ALLOWED" | "DENIED"

export interface Candidate {
  /** "provider/model#variant" — deterministic identifier. */
  candidateId: string
  provider: string
  model: string
  /** null = base model (no variant suffix). */
  variant: string | null
  variantStatus: VariantStatus
  policyStatus: PolicyStatus
  maxContextTokens: number
  /** V2.1 ladder position (seed order; cold-start fallback anchor). */
  ladderRank: number
}

export type HardGate = "D1_POLICY" | "D2_CAPABILITY" | "D3_CONTEXT" | "D4_HEALTH_BREAKER" | "D5_BUDGET"

export interface Exclusion {
  candidateId: string
  gate: HardGate
  reason: string
}

// ---------------------------------------------------------------------------
// Evidence records (EVIDENCE_CONTRACT v1; statuses per §3, invariant per §4)
// ---------------------------------------------------------------------------

export type EvidenceStatus = "VERIFIED" | "PARTIAL" | "UNKNOWN"

export interface Attributed {
  sessionId: string
  routeId: string
  executionId: string
  providerId: string
  modelId: string
  variant: string | null
  taskClass: SourceTaskClass
  optimizationClass: OptimizationClass
  timestamp: string
  provenance: string[]
}

/** Per-dimension value with explicit confidence; UNKNOWN = value null + confidence 0. */
export interface DimensionValue {
  value: number | null
  confidence: number
  sampleSize: number
  lastUpdated: string | null
}

export interface HealthSnapshot {
  breakerState: "OPEN" | "HALF_OPEN" | "CLOSED"
  successRate: number | null
  sampleSize: number
  confidence: number
  lastUpdated: string | null
}

export interface VariantEvidenceRecord {
  providerId: string
  modelId: string
  variant: string | null
  dimensions: Partial<Record<CapabilityDim, DimensionValue>>
  /** true when values were inherited from model/family level (confidence-capped ×0.5, marked). */
  inherited: boolean
  inheritedFrom: "variant" | "model" | "family" | null
}

export interface CostEvidence {
  status: EvidenceStatus
  inputUsage: number | null
  outputUsage: number | null
  pricingSourceId: string | null
  effectiveCost: number | null
  unit: string | null
  confidence: number
}

export interface LatencyEvidence {
  status: EvidenceStatus
  p50Ms: number | null
  p95Ms: number | null
  sampleSize: number
  confidence: number
  /** DESIGN PROPOSAL — not validated until replay-2 (ADR-017). */
  ewmaMs: number | null
}

export interface QualityEvidence {
  /** Registry-tier intrinsic quality (always present for known models). */
  intrinsic: number | null
  /** Observed quality from attributed evaluations (EVIDENCE_CONTRACT §5 gates). */
  observed: number | null
  observedWeight: number
  confidence: number
  sampleSize: number
}

export interface CapabilityEvidenceRecord {
  perDim: Partial<Record<CapabilityDim, { level: EvidenceLevel; value: number | null; confidence: number; verifiedAt: string | null }>>
}

// ---------------------------------------------------------------------------
// Outcomes + evaluation signals (EVALUATION_DESIGN §3.1; I-013/I-016)
// ---------------------------------------------------------------------------

export type ExecutionOutcomeKind = "COMPLETED" | "FAILED" | "ERROR" | "CANCELLED"

export interface ExecutionOutcome extends Attributed {
  outcome: ExecutionOutcomeKind
  errorClass: string | null
  environment: { timeout: boolean; network: boolean; quota: boolean; tooling: boolean; userCancel: boolean }
}

export interface QualityOutcome extends Attributed {
  grade: number
  confidence: number
  evaluatorId: string
  failureClass: string | null
}

export interface EvaluationSignal {
  signalId: string
  executionId: string
  chain: {
    sessionId: string
    routeId: string
    executionId: string
    candidate: { providerId: string; modelId: string; variant: string | null }
    taskClass: SourceTaskClass
    evaluationId: string
  }
  /** false ⇒ stored for audit only, zero statistics effect (I-016). */
  attributionComplete: boolean
  quality: QualityOutcome | null
  execution: ExecutionOutcome | null
}

// --- Failure taxonomy (EVALUATION_DESIGN §3.1 outcome separation; M6) ------------
/** Only MODEL_RELEVANT failures penalize quality/reliability/recent (M6). */
export type FailureCategory = "MODEL_RELEVANT" | "ENVIRONMENT" | "USER" | "UNKNOWN"

/** Aggregation provenance (M1): which level of the variant→model hierarchy produced the value. */
export type AggregateSourceLevel = "VARIANT" | "MODEL" | "FAMILY" | "GLOBAL"

// ---------------------------------------------------------------------------
// Scoring vocabulary (ROUTING_MODEL §10; DECISION_MATRIX weights are normative)
// ---------------------------------------------------------------------------

export const SCORE_DIMENSIONS = ["quality", "capabilityFit", "reliability", "latency", "cost", "context", "recent"] as const

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number]

export type WeightProfile = Record<ScoreDimension, number>

export interface ScoredCandidate {
  candidateId: string
  score: number
  confidence: number
  contributions: Record<ScoreDimension, number>
  /** Raw dimension values used (post neutral-prior substitution), for explanation. */
  values: Record<ScoreDimension, DimensionValue>
  tier: ColdStartTier
}

export type ColdStartTier = "EXCLUDED" | "UNPROVEN" | "KNOWN_EVIDENCED"

export type TieBreakerTier = "T2" | "T3" | "T4" | "T5" | "T6"

export type RouterMode = "OFF" | "SHADOW" | "ADVISORY" | "OPTIMIZED"

// ---------------------------------------------------------------------------
// Stability / hysteresis (ROUTING_MODEL §16; ADR-015 — H PROVISIONAL 0.02)
// ---------------------------------------------------------------------------

export interface SegmentKey {
  taskClass: SourceTaskClass
  risk: RiskLevel
}

export interface HysteresisState {
  segment: SegmentKey
  currentRoute: { providerId: string; modelId: string; variant: string | null } | null
  stickSince: string | null
  /** Consecutive evaluations with Δscore > H. */
  exceedCount: number
  /** Consecutive evaluations with Δscore > 2H (strong-exceed streak). */
  exceedStrongCount: number
  /** ISO timestamp when the current strong-exceed streak started (24 h window). */
  exceedStrongSince: string | null
  /** Instability counter: 2 consecutive EnvironmentOutcomes ⇒ drop stickiness. */
  environmentOutcomeStreak: number
}

// ---------------------------------------------------------------------------
// Route decision V2.2 (OBSERVABILITY_DESIGN §2)
// ---------------------------------------------------------------------------

export interface RouteDecisionV22 {
  decisionId: string
  sessionId: string
  routeId: string
  attempt: number
  requirement: TaskRequirement
  candidateSet: string[]
  excluded: Exclusion[]
  scores: ScoredCandidate[]
  selected: string | null
  tieBreaker: { tier: TieBreakerTier } | null
  mode: RouterMode
  /** true when engine degraded and V2.1 result was returned instead. */
  degradedToV21: boolean
  stickinessApplied: boolean
}

// ---------------------------------------------------------------------------
// Instrumentation T1–T5 (V2_1_INSTRUMENTATION_SPEC; observational, fail-open)
// ---------------------------------------------------------------------------

export const TELEMETRY_DIR = ".opencode/ai/telemetry/v22"

export interface TelemetryEnvelope {
  schemaVersion: 1
  event: "T1" | "T2" | "T3" | "T4" | "T5"
  timestamp: string
  eventId: string
  provenance: string[]
}

export type T1EvaluationAttributed = TelemetryEnvelope & { event: "T1" } & EvaluationSignal
export type T2ExecutionOutcomeEvent = TelemetryEnvelope & { event: "T2" } & ExecutionOutcome

export interface T3LatencyWindow extends TelemetryEnvelope {
  event: "T3"
  executionId: string
  routeId: string
  candidate: { providerId: string; modelId: string; variant: string | null }
  taskClass: SourceTaskClass
  outputSizeBucket: string | null
  /** Absolute epoch ms per EVIDENCE_CONTRACT §5; null + reason when unobservable. */
  t0: number | null
  t1: number | null
  t2: number | null
  t3: number | null
  ttfrMs: number | null
  completionMs: number | null
  timeout: boolean
  missingReason: string | null
}

export interface T4CostUsage extends TelemetryEnvelope {
  event: "T4"
  executionId: string
  routeId: string
  candidate: { providerId: string; modelId: string; variant: string | null }
  inputUsage: number | null
  outputUsage: number | null
  pricingSource: { id: string; version: string; status: EvidenceStatus } | null
  effectiveCost: number | null
  unit: string | null
}

export interface T5CapabilityProbe extends TelemetryEnvelope {
  event: "T5"
  probeId: string
  candidate: { providerId: string; modelId: string; variant: string | null }
  dimension: CapabilityDim
  method: "LIVE_RUNTIME" | "INTEGRATION" | "STATIC"
  result: "PASS" | "FAIL" | "UNSUPPORTED" | "BLOCKED"
  verifiedAt: string
  probeVersion: string
}

// ---------------------------------------------------------------------------
// Replay (REPLAY_CONTRACT §1 — evidence null + explicit reason)
// ---------------------------------------------------------------------------

export interface MissingDatum {
  field: string
  reason: string
}

export interface ReplayEvidenceSnapshot {
  capability: (CapabilityEvidenceRecord & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
  health: (HealthSnapshot & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
  quality: (QualityEvidence & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
  latency: (LatencyEvidence & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
  cost: (CostEvidence & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
  variantEvidence: (VariantEvidenceRecord & { missing: MissingDatum[] }) | { missing: MissingDatum[] }
}

export interface ReplayRecord {
  schemaVersion: 1
  recordId: string
  sessionId: string
  routeId: string
  decisionId: string
  attempt: number
  timestamp: string
  requirement: TaskRequirement
  v21Route: { providerId: string; modelId: string; variant: string | null }
  v21CandidateSet: Array<{ candidateId: string; policyStatus: PolicyStatus; variantStatus: VariantStatus }>
  v21Exclusions: Exclusion[]
  evidence: ReplayEvidenceSnapshot
  outcomeRefs: string[]
  missing: MissingDatum[]
}

export interface ReplayOutcomeLabel {
  kind: "OBSERVED" | "ESTIMATED" | "UNKNOWN"
  source: string | null
}
