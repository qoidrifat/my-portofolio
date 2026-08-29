// Smart Router v2 — shared types. Pure TS (erasable syntax only; runs under node --strip-types, Bun, vitest).

export type TaskLabel =
  | "simple" | "coding" | "debugging" | "refactoring" | "frontend" | "backend"
  | "research" | "architecture" | "security" | "testing" | "code-review"
  | "documentation" | "database" | "performance" | "deployment" | "tooling"
  | "orchestration" | "infrastructure" | "unknown"

export type Complexity = "low" | "medium" | "high" | "very_high"
export type ContextDemand = "small" | "medium" | "large" | "very_large"
export type ReasoningDemand = "low" | "medium" | "high" | "max"
export type Modality = "text" | "vision"
export type Confidence = "high" | "medium" | "low"
export type RiskLevel = "low" | "medium" | "high" | "critical"

export type AgentName = "build" | "research" | "frontend" | "reviewer"

export type VariantStatus = "VERIFIED" | "CONFIGURED" | "BLOCKED_UPSTREAM" | "UNSUPPORTED"

export interface TaskClassification {
  taskType: TaskLabel[]
  matchedTaskClass: string
  complexity: Complexity
  contextDemand: ContextDemand
  reasoningDemand: ReasoningDemand
  modality: Modality
  confidence: Confidence
  signals: string[]
}

export interface VariantInfo {
  name: string
  effort: string | null
  status: VariantStatus
}

export interface ModelRegistryEntry {
  id: string // "providerID/modelID"
  provider: string
  available: boolean
  supportsVision: boolean
  maxVerifiedEffort: string | null // null = no verified ceiling known (do not clamp)
  rejectedEfforts: string[]
  variants: VariantInfo[]
}

export interface ModelRegistry {
  effortRankOrder: string[]
  models: ModelRegistryEntry[]
  generatedFrom: string[]
}

export interface FallbackRoute {
  model: string
  variant: string
  status: VariantStatus | "CONFIGURED"
}

export interface PermissionSummary {
  profile: "safe" | "standard" | "elevated" | "yolo"
  risk: RiskLevel
  hardDenies: string[]
  requiresConfirmation: string[]
}

export interface RouteDecisionInput {
  promptExcerpt: string
  taskType: TaskLabel[]
  matched_task_class: string
  complexity: Complexity
  contextDemand: ContextDemand
  reasoningDemand: ReasoningDemand
  modality: Modality
  confidence: Confidence
  latency_preference: "normal" | "speed"
  quality_preference: "normal" | "max"
  cost_profile: "economy" | "balanced" | "quality"
}

export interface RouteDecision {
  routeId: string
  timestamp: string
  sessionId?: string
  input: RouteDecisionInput
  status: "RESOLVED" | "BLOCKED" | "ADVISORY"
  agent: AgentName
  provider: string | null
  model: string | null
  variant: string | null
  variantStatus: VariantStatus | "CONFIGURED" | null
  permission: PermissionSummary
  fallback: FallbackRoute[]
  reason: string
  warnings: string[]
  dispatchCommand?: string
}

export type PermissionDecisionValue = "allow" | "ask" | "deny"

export interface PermissionDecision {
  decision: PermissionDecisionValue
  reason: string
  profile: string
  risk: RiskLevel
  toolClass: string
  matchedRule: string | null
}

export type ToolClass =
  | "read" | "write" | "execute" | "network" | "git" | "credential"
  | "infrastructure" | "deployment"

export type QualityScore = "good" | "uncertain" | "insufficient" | "failed"
export type EvaluatorAction = "continue" | "retry" | "escalate" | "fallback" | "block"

export interface EvaluationSignals {
  toolErrors: string[]
  exceptions: string[]
  testFailures: number
  reviewBlockers: string[]
  repeatedRetries: number
  providerErrors: string[]
  contextIssues: string[]
}

export interface EvaluationResult {
  quality: QualityScore
  action: EvaluatorAction
  reasons: string[]
}

export interface ContinuationPacket {
  task: string
  currentState: string
  completedWork: string[]
  failedWork: string[]
  relevantFiles: string[]
  gitState: string
  previousRoute: { model: string | null; variant: string | null; agent: string }
  newRoute: { model: string | null; variant: string | null; agent: string }
  escalationReason: string
  requiredNextAction: string
  createdAt: string
}
