// Smart Router V2.2 — TUI formatting (pure). View model -> themed line tokens.
// UNKNOWN-safe: null/absent values render as "—" or "UNKNOWN" per semantic type,
// never as 0 / free / pass. Width-aware trimming keeps narrow terminals usable.

import type { RouterViewModel, Tone } from "./view-model.ts"

export interface Line {
  text: string
  tone: Tone
}

const DASH = "—"
const UNKNOWN = "UNKNOWN"

export function fmt(v: string | number | null | undefined, fallback = DASH): string {
  if (v === null || v === undefined || v === "") return fallback
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")
  return v
}

export function fmtMs(ms: number | null): string {
  if (ms === null) return DASH
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

export function fmtTokens(n: number | null): string {
  if (n === null) return UNKNOWN
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function fmtCost(effective: number | null, unit: string | null, verified: boolean): string {
  if (effective === null) return UNKNOWN
  if (!verified) return `${effective} ${unit ?? ""}`.trim()
  return `$${effective.toFixed(4)}`
}

export function fmtFreshness(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return DASH // R2-LOW-02: never render NaN
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))}m`
  if (days < 1) return `${Math.round(days * 24)}h`
  return `${Math.round(days)}d`
}

function keyLabel(key: string): string {
  const noProvider = key.includes("/") ? key.slice(key.indexOf("/") + 1) : key
  return noProvider
}

function toneForState(state: string): Tone {
  const s = state.toUpperCase()
  if (s === "OPEN") return "error"
  if (s === "HALF_OPEN") return "warning"
  return "success"
}

function tierTone(tier: string | null): Tone {
  const t = (tier ?? "").toUpperCase()
  if (t === "KNOWN-EVIDENCED" || t === "EVIDENCED") return "success"
  if (t === "UNPROVEN" || t === "") return "muted"
  return "accent"
}

// ---------- compact footer (Phase 4/22) ----------

export function footerLines(vm: RouterViewModel, width: number): Line[] {
  if (vm.mode === "OFF") return [{ text: "Smart Router · OFF", tone: "muted" }]
  const mode = `Smart Router · ${vm.mode}`
  const risk = vm.risk ? `  Risk ${vm.risk.toUpperCase()}` : ""
  if (width < 56) {
    const short = vm.actual ? ` ${vm.actual.split(" · ")[0]}` : ""
    return [{ text: clip(`${mode}${short}`, width), tone: modeTone(vm) }]
  }
  const actual = vm.actual ?? UNKNOWN
  if (width < 80) {
    // LOW-3: risk is never silently dropped — clip() degrades gracefully if too long
    return [{ text: clip(`${mode}  Actual ${actual}${risk}`, width), tone: modeTone(vm) }]
  }
  const shadow = vm.shadow ? (vm.shadow === "UNPROVEN" ? "UNPROVEN" : vm.shadow) : DASH
  const lines: Line[] = [
    { text: clip(`${mode}  Actual ${actual}  Shadow ${shadow}${risk}`, width), tone: modeTone(vm) },
  ]
  if (vm.divergent === true && width >= 100) {
    lines.push({ text: clip(`  Shadow differs from actual — hypothetical only, not dispatched`, width), tone: "warning" })
  }
  return lines
}

function modeTone(vm: RouterViewModel): Tone {
  if (vm.mode === "SHADOW") return "accent"
  if (vm.mode === "OFF") return "muted"
  return "warning"
}

// ---------- panels ----------

export function headerLines(vm: RouterViewModel): Line[] {
  return [
    { text: `SMART ROUTER V2.2          Mode ${vm.mode}   Authority ${vm.authority}   Influence ${vm.influence}`, tone: modeTone(vm) },
  ]
}

export function taskLines(vm: RouterViewModel): Line[] {
  return [
    { text: `TASK         ${fmt(vm.taskClass, UNKNOWN)}`, tone: "default" },
    { text: `RISK         ${vm.risk ? vm.risk.toUpperCase() : UNKNOWN}`, tone: riskTone(vm.risk) },
    { text: `AGENT        ${fmt(vm.agent, UNKNOWN)}`, tone: "default" },
  ]
}

function riskTone(risk: string | null): Tone {
  const r = (risk ?? "").toUpperCase()
  if (r === "CRITICAL" || r === "HIGH") return "warning"
  return "default"
}

export function routeLines(vm: RouterViewModel): Line[] {
  const lines: Line[] = [
    { text: `ACTUAL       ${fmt(vm.actual, UNKNOWN)}`, tone: "default" },
  ]
  if (vm.mode === "SHADOW") {
    lines.push({ text: `SHADOW       ${fmt(vm.shadow, UNKNOWN)}${vm.selectedTier ? `  [${vm.selectedTier}]` : ""}`, tone: tierTone(vm.selectedTier) })
    lines.push({ text: `Would dispatch: NO (shadow only)   Counterfactual outcome: ${vm.divergent ? UNKNOWN : "N/A (same route)"}`, tone: "muted" })
  }
  if (vm.divergent === true) lines.push({ text: `Divergence   YES — V2.2 would differ. Reason: ${fmt(vm.shadowReason)}`, tone: "warning" })
  else if (vm.shadowStatus === "SHADOW_BLOCKED") lines.push({ text: `Shadow blocked: ${fmt(vm.shadowReason)}`, tone: "warning" })
  return lines
}

export function candidateLines(vm: RouterViewModel): Line[] {
  if (vm.candidates.length === 0) return [{ text: "CANDIDATES   —", tone: "muted" }]
  const lines: Line[] = [{ text: "CANDIDATES", tone: "default" }]
  for (const c of vm.candidates) {
    lines.push({
      text: `${c.rank}  ${keyLabel(c.id).padEnd(28)}  ${c.score === null ? DASH : c.score.toFixed(3)}  ${c.tier ?? UNKNOWN}`,
      tone: tierTone(c.tier),
    })
  }
  return lines
}

export function hysteresisLines(vm: RouterViewModel): Line[] {
  const h = vm.hysteresis
  return [
    { text: "ROUTE STABILITY", tone: "default" },
    { text: `Current      ${fmt(h.current, UNKNOWN)}`, tone: "default" },
    { text: `Alternative  ${fmt(h.alternative)}`, tone: "muted" },
    { text: `Margin       ${h.margin === null ? DASH : h.margin.toFixed(3)}`, tone: "default" },
    { text: `Threshold    ${DASH} (engine-internal)`, tone: "muted" },
    { text: `Decision     ${h.decision}`, tone: h.decision === "RETAIN CURRENT" ? "success" : "accent" },
  ]
}

export function healthLines(vm: RouterViewModel): Line[] {
  const lines: Line[] = [{ text: "PROVIDER / MODEL HEALTH (breaker = hard authority)", tone: "default" }]
  for (const b of vm.breaker) {
    lines.push({ text: `${keyLabel(b.key).padEnd(32)}  ${b.state}${b.failures === null ? "" : `  (${b.failures} failures)`}`, tone: toneForState(b.state) })
  }
  return lines
}

/** LOW-6: display-only — engine candidateKey `p/m#variant` renders as `m · variant`. */
function variantLabel(key: string): string {
  return keyLabel(key).replace("#", " · ")
}

export function evidenceLines(vm: RouterViewModel): Line[] {
  if (vm.evidence.length === 0) return [{ text: `EVIDENCE     none yet (no authoritative aggregates${vm.evidenceScope ? ` for ${vm.evidenceScope}` : ""})`, tone: "muted" }]
  const scope = vm.evidenceScope ? ` (scope: ${vm.evidenceScope})` : ""
  const lines: Line[] = [{ text: `EVIDENCE${scope}`, tone: "default" }]
  for (const e of vm.evidence.slice(0, 8)) {
    const quality = e.quality === null ? DASH : e.quality.toFixed(2)
    const conf = e.confidence === null ? DASH : e.confidence.toFixed(2)
    const source = e.source === "MODEL (inherited, ×0.5 cap)" ? "  [model-level]" : ""
    lines.push({
      text: `${variantLabel(e.candidateKey).padEnd(32)}  Q ${quality}  conf ${conf}  n ${fmt(e.samples)}  ${e.status}${e.freshnessDays === null ? "" : `  ${fmtFreshness(e.freshnessDays)}`}${source}`,
      tone: e.status === "KNOWN-EVIDENCED" ? "success" : "muted",
    })
  }
  return lines
}

export function latencyCostLines(vm: RouterViewModel): Line[] {
  return [
    { text: "LATENCY / COST (last observed turn)", tone: "default" },
    { text: `TTFR         ${fmtMs(vm.latency.ttfrMs)}`, tone: "default" },
    { text: `Completion   ${fmtMs(vm.latency.completionMs)}`, tone: "default" },
    { text: `Input        ${fmtTokens(vm.cost.input)}   Output ${fmtTokens(vm.cost.output)}`, tone: "default" },
    { text: `Effective    ${fmtCost(vm.cost.effective, vm.cost.unit, vm.cost.verified)}${vm.cost.verified ? "  (host-verified)" : ""}`, tone: "default" },
  ]
}

export function evaluationLines(vm: RouterViewModel): Line[] {
  const e = vm.evaluation
  return [
    { text: "EVALUATION", tone: "default" },
    { text: `Execution    ${e.hasT2 ? "✓" : "✗"}   Evaluation ${e.hasT1 ? "✓" : "pending"}   Attribution ${e.attributionComplete === true ? "✓" : e.attributionComplete === false ? "INCOMPLETE" : "pending"}`, tone: e.hasT1 ? "success" : "muted" },
    { text: `Outcome      ${fmt(e.outcome, UNKNOWN)}   Status: ${e.status}`, tone: e.status === "RECEIVED" ? "success" : e.status.startsWith("PENDING") ? "accent" : "muted" },
    { text: `T1 lifecycle note: arrives on normal plugin/session disposal`, tone: "muted" },
  ]
}

export function securityLines(vm: RouterViewModel): Line[] {
  const s = vm.security
  // R2-MED-01: hard-deny headline must not fabricate a false non-deny state — an
  // unavailable/invalid evidence source renders UNKNOWN, only a valid source can say ARMED.
  const hardDenyLabel = s.hardDeny ? "ACTIVE" : s.source === "valid" ? "ARMED" : "UNKNOWN"
  const lines: Line[] = [
    { text: "SECURITY", tone: "default" },
    { text: `Permission   ${fmt(s.permissionMode, UNKNOWN)}   Hard deny ${hardDenyLabel}   Policy guard ACTIVE   Breaker ACTIVE`, tone: s.source === "valid" ? "default" : "warning" },
    { text: `Violations (hard denies observed): ${s.denies.length}   Effort clamps: ${s.clamps}   Advisories: ${s.advisories}`, tone: s.denies.length > 0 ? "warning" : "success" },
  ]
  if (s.source !== "valid") {
    lines.push({ text: `  deny source ${s.source === "unavailable" ? "UNAVAILABLE" : "CORRUPT"} — hard-deny state unknown`, tone: "warning" })
  }
  for (const d of s.denies.slice(-3)) {
    lines.push({ text: `  ${d.rule}: HARD DENY`, tone: "error" })
  }
  return lines
}

export function fallbackLines(vm: RouterViewModel): Line[] {
  const lines: Line[] = [{ text: `FALLBACK (${vm.fallbackStatus})`, tone: "default" }]
  if (vm.fallback.length === 0) {
    lines.push({ text: "  —", tone: "muted" })
  } else {
    vm.fallback.forEach((f, i) => {
      lines.push({ text: `${i + 1}  ${f.model}${f.variant ? ` · ${f.variant}` : ""}  ${f.status}`, tone: "muted" })
    })
  }
  return lines
}

export function capabilityLines(vm: RouterViewModel): Line[] {
  if (!vm.capabilities) return [{ text: `CAPABILITIES  ${UNKNOWN} (registry unavailable)`, tone: "muted" }]
  const lines: Line[] = [{ text: "CAPABILITIES", tone: "default" }]
  for (const c of vm.capabilities) {
    lines.push({ text: `${c.name.padEnd(12)} ${c.status}`, tone: capabilityTone(c.status) })
  }
  return lines
}

function capabilityTone(status: string): Tone {
  const s = status.toUpperCase()
  if (s === "VERIFIED") return "success"
  if (s === "CONFIGURED") return "accent"
  if (s === "BLOCKED" || s === "BLOCKED_UPSTREAM" || s === "UNSUPPORTED") return "error"
  return "muted"
}

export function promotionLines(vm: RouterViewModel): Line[] {
  return [
    { text: "PROMOTION STATUS", tone: "default" },
    { text: `Implementation READY   Shadow ${vm.mode === "SHADOW" ? "ACTIVE" : vm.mode}   Evidence INSUFFICIENT`, tone: "default" },
    { text: `G3 ${vm.promotion.g3}   G4 ${vm.promotion.g4}`, tone: "muted" },
    { text: "Production promotion: NOT AUTHORIZED", tone: "warning" },
  ]
}

/** Full dashboard (Phase 19) — progressive disclosure root. */
export function dashboardLines(vm: RouterViewModel): Line[] {
  return [
    ...headerLines(vm),
    { text: "", tone: "muted" },
    ...taskLines(vm),
    { text: "", tone: "muted" },
    ...routeLines(vm),
    { text: "", tone: "muted" },
    ...candidateLines(vm),
    { text: "", tone: "muted" },
    ...healthLines(vm),
    { text: "", tone: "muted" },
    ...hysteresisLines(vm),
    { text: "", tone: "muted" },
    ...evidenceLines(vm),
    { text: "", tone: "muted" },
    ...evaluationLines(vm),
    { text: "", tone: "muted" },
    ...securityLines(vm),
    { text: "", tone: "muted" },
    ...fallbackLines(vm),
    { text: "", tone: "muted" },
    ...promotionLines(vm),
  ]
}

export function clip(text: string, width: number): string {
  if (!Number.isFinite(width) || width <= 0) return text
  return text.length <= width ? text : `${text.slice(0, Math.max(1, width - 1))}…`
}
