// Smart Router V2.2 — canonical policy data (Phase B).
// Sole normative source: docs/smart-router/SMART_ROUTER_V2_2_DECISION_MATRIX.md (§1, §1.1, §2, header).
// This file TRANSCRIBES that document; any divergence is a bug — consistency validators guard it.

import type {
  CapabilityDim,
  EvidenceLevel,
  OptimizationClass,
  RequirementTier,
  RiskLevel,
  ScoreDimension,
  SourceTaskClass,
  WeightProfile,
} from "./types.ts"

// --- C4 mapping (§1.1): 21 source classes → 8 optimization classes; total + deterministic ---

export interface ClassMappingEntry {
  optimizationClass: OptimizationClass
  /** vision-task: no profile — hard gate (BLOCKED), not a mapping. */
  blocked?: true
}

export const CLASS_MAPPING: Record<SourceTaskClass, ClassMappingEntry> = {
  "crud-simple": { optimizationClass: "routine-coding" },
  "standard-coding": { optimizationClass: "routine-coding" },
  "complex-implementation": { optimizationClass: "routine-coding" },
  "latency-sensitive": { optimizationClass: "routine-coding" },
  documentation: { optimizationClass: "routine-coding" },
  testing: { optimizationClass: "routine-coding" },
  tooling: { optimizationClass: "routine-coding" },
  database: { optimizationClass: "routine-coding" }, // HIGH + independent-review preserved via risk overlay
  deployment: { optimizationClass: "routine-coding" }, // HIGH + independent-review preserved via risk overlay
  "ui-implementation": { optimizationClass: "frontend" },
  "react-next-architecture": { optimizationClass: "frontend" },
  performance: { optimizationClass: "complex-debugging" },
  "complex-debugging": { optimizationClass: "complex-debugging" },
  "security-review": { optimizationClass: "security-review" },
  "routine-review": { optimizationClass: "routine-review" },
  "deep-review": { optimizationClass: "deep-review" },
  "deep-research": { optimizationClass: "deep-research" },
  "architecture-analysis": { optimizationClass: "deep-research" },
  orchestration: { optimizationClass: "deep-research" },
  "repo-research": { optimizationClass: "repo-research" },
  "vision-task": { optimizationClass: "routine-coding", blocked: true },
}

// --- Weight profiles (§1 row "Weight profile (q, cap, rel, lat, cost, ctx, recent)") ---

export const WEIGHT_PROFILES: Record<OptimizationClass, WeightProfile> = {
  "routine-review": { quality: 0.15, capabilityFit: 0.15, reliability: 0.15, latency: 0.20, cost: 0.20, context: 0.10, recent: 0.05 },
  "deep-review": { quality: 0.35, capabilityFit: 0.20, reliability: 0.15, latency: 0.05, cost: 0.05, context: 0.15, recent: 0.05 },
  "security-review": { quality: 0.40, capabilityFit: 0.15, reliability: 0.25, latency: 0.05, cost: 0.05, context: 0.05, recent: 0.05 },
  "complex-debugging": { quality: 0.30, capabilityFit: 0.25, reliability: 0.15, latency: 0.10, cost: 0.05, context: 0.10, recent: 0.05 },
  "repo-research": { quality: 0.15, capabilityFit: 0.15, reliability: 0.15, latency: 0.10, cost: 0.15, context: 0.25, recent: 0.05 },
  "deep-research": { quality: 0.40, capabilityFit: 0.20, reliability: 0.15, latency: 0.02, cost: 0.03, context: 0.15, recent: 0.05 },
  "routine-coding": { quality: 0.15, capabilityFit: 0.20, reliability: 0.15, latency: 0.20, cost: 0.20, context: 0.05, recent: 0.05 },
  frontend: { quality: 0.15, capabilityFit: 0.20, reliability: 0.10, latency: 0.20, cost: 0.20, context: 0.10, recent: 0.05 },
}

// --- Capability floors (§1 row "Capability floor (hard)") — REQUIRED_FLOOR tier per C1 ---

export interface CapabilityFloor {
  dim: CapabilityDim
  tier: RequirementTier
  minLevel: EvidenceLevel
}

export const CAPABILITY_FLOORS: Record<OptimizationClass, CapabilityFloor[]> = {
  "routine-review": [{ dim: "review", tier: "REQUIRED_FLOOR", minLevel: "STATIC" }],
  "deep-review": [
    { dim: "review", tier: "REQUIRED_FLOOR", minLevel: "STATIC" },
    { dim: "reasoning", tier: "REQUIRED_FLOOR", minLevel: "STATIC" },
  ],
  "security-review": [
    { dim: "review", tier: "REQUIRED_FLOOR", minLevel: "INTEGRATED" },
    { dim: "reasoning", tier: "REQUIRED_FLOOR", minLevel: "INTEGRATED" },
  ],
  "complex-debugging": [
    { dim: "debugging", tier: "REQUIRED_FLOOR", minLevel: "STATIC" },
    { dim: "coding", tier: "REQUIRED_FLOOR", minLevel: "STATIC" },
    { dim: "agenticToolUse", tier: "REQUIRED_FLOOR", minLevel: "STATIC" },
  ],
  "repo-research": [{ dim: "research", tier: "REQUIRED_FLOOR", minLevel: "STATIC" }],
  "deep-research": [
    { dim: "research", tier: "REQUIRED_FLOOR", minLevel: "INTEGRATED" },
    { dim: "reasoning", tier: "REQUIRED_FLOOR", minLevel: "INTEGRATED" },
  ],
  "routine-coding": [{ dim: "coding", tier: "REQUIRED_FLOOR", minLevel: "STATIC" }],
  frontend: [{ dim: "coding", tier: "REQUIRED_FLOOR", minLevel: "STATIC" }],
}

// --- Health / quality floors (§1) — enforced at D4 with confidence gate ≥ .6 ---

export interface NumericFloor {
  threshold: number
  confidenceGate: 0.6
}

export interface ClassFloors {
  health: NumericFloor | null
  /** security-review: intrinsic ≥ .6 OR observed ≥ .6; deep-research: intrinsic ≥ .6. */
  quality: NumericFloor | null
  qualityObservedAlternative: boolean
}

export const CLASS_FLOORS: Record<OptimizationClass, ClassFloors> = {
  "routine-review": { health: null, quality: null, qualityObservedAlternative: false },
  "deep-review": { health: { threshold: 0.3, confidenceGate: 0.6 }, quality: null, qualityObservedAlternative: false },
  "security-review": {
    health: { threshold: 0.5, confidenceGate: 0.6 },
    quality: { threshold: 0.6, confidenceGate: 0.6 },
    qualityObservedAlternative: true,
  },
  "complex-debugging": { health: { threshold: 0.3, confidenceGate: 0.6 }, quality: null, qualityObservedAlternative: false },
  "repo-research": { health: null, quality: null, qualityObservedAlternative: false },
  "deep-research": { health: { threshold: 0.4, confidenceGate: 0.6 }, quality: { threshold: 0.6, confidenceGate: 0.6 }, qualityObservedAlternative: false },
  "routine-coding": { health: null, quality: null, qualityObservedAlternative: false },
  frontend: { health: null, quality: null, qualityObservedAlternative: false },
}

// --- Risk overlay (§2): reweight + renormalize; never modifies D2/D3 mandatory rules ---

export interface RiskOverlay {
  multipliers: Partial<Record<ScoreDimension, number>>
}

export const RISK_OVERLAY: Record<RiskLevel, RiskOverlay> = {
  low: { multipliers: { cost: 1.3, latency: 1.3 } },
  medium: { multipliers: {} },
  high: { multipliers: { quality: 1.3, reliability: 1.3, cost: 0.7, latency: 0.7 } },
  critical: { multipliers: { quality: 1.5, reliability: 1.5, cost: 0.5, latency: 0.5 } },
}

// --- Display rule (matrix header, C3): full precision internally; 3dp round-half-up for display ---

export function display3(x: number): string {
  const scaled = x * 1000
  const rounded = Math.round(scaled + Number.EPSILON * Math.sign(scaled || 1))
  return (rounded / 1000).toFixed(3)
}

// --- Context demand → token estimate (implementation constant; classifier may pass explicit value) ---
// ponytail: no canonical token mapping exists in the design docs; these defaults only seed the
// D3 gate when the classifier provides no explicit estimate. Upgrade path: classifier emits tokens.

export const CONTEXT_DEMAND_TOKENS = {
  small: 32_000,
  medium: 128_000,
  large: 512_000,
  very_large: 1_000_000,
} as const
