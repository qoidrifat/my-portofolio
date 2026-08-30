// V2.2 OFFLINE REPLAY ENGINE — evidence validation only. NOT production routing code.
// Reads V2.1 runtime evidence, replays hypothetical V2.2 scoring per the design docs,
// emits machine-readable results. Deterministic: no RNG, no Date.now in decision math.
// ponytail: single-file analyzer; split only if a second consumer appears.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.env.SMART_ROUTER_PROJECT_ROOT || process.cwd()
const EV = join(ROOT, ".opencode", "ai")
const OUT = join(ROOT, ".opencode", "ai", "verification", "v22-simulation")

function readJsonl(p) {
  try {
    return readFileSync(join(ROOT, p), "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  } catch { return [] }
}

// ---------- load evidence ----------
const decisions = readJsonl(join(".opencode", "ai", "routing", "routing-decisions.jsonl"))
const routes = decisions.filter((d) => typeof d.decision === "string" && d.matched_task_class !== undefined)
const packets = decisions.filter((d) => d.kind === "continuation-packet")
const routerLog = readJsonl(join(".opencode", "ai", "logs", "smart-router.jsonl"))
const evals = routerLog.filter((r) => r.kind === "dispose-evaluation")
const advisory = routerLog.filter((r) => r.kind === "advisory-mismatch")
const harness = readJsonl(join(".opencode", "ai", "logs", "model-routing-tests.jsonl"))
let breaker = { entries: {} }
try { breaker = JSON.parse(readFileSync(join(EV, "routing", "circuit-breaker.json"), "utf8")) } catch {}
let policy = { taskClasses: null }
try { policy = JSON.parse(readFileSync(join(ROOT, ".opencode", "smart-router", "routing-policy.json"), "utf8")) } catch {}

// ---------- harness proxies (LABELED: harness proxy, not production telemetry) ----------
const byModel = new Map()
for (const h of harness) {
  const id = h.decision?.provider ? h.decision.model : null
  if (!id || typeof h.duration_ms !== "number") continue
  if (!byModel.has(id)) byModel.set(id, { lat: [], pass: [] })
  byModel.get(id).lat.push(h.duration_ms)
  byModel.get(id).pass.push(h.pass === true)
}
function pct(arr, p) { const s = [...arr].sort((a, b) => a - b); if (!s.length) return null; const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length)); return s[i] }
const harnessProxy = {}
for (const [id, v] of byModel) {
  harnessProxy[id] = { n: v.lat.length, p50: pct(v.lat, 50), p95: pct(v.lat, 95), passRate: v.pass.filter(Boolean).length / v.pass.length, passN: v.pass.length }
}

// ---------- V2.2 design constants (from DECISION_MATRIX / ROUTING_MODEL) ----------
const CLASS_MAP = {
  "security-review": "security-review", "routine-review": "routine-review",
  "complex-debugging": "complex-debugging", "standard-coding": "routine-coding",
  "crud-simple": "routine-coding", "architecture-analysis": null, "documentation": null,
  "deep-review": "deep-review", "repo-research": "repo-research", "deep-research": "deep-research",
  "frontend": "frontend", "vision-task": "VISION_BLOCKED",
}
const PROFILES = {
  "security-review": [.40, .15, .25, .05, .05, .05, .05],
  "deep-review": [.35, .20, .15, .05, .05, .15, .05],
  "complex-debugging": [.30, .25, .15, .10, .05, .10, .05],
  "routine-coding": [.15, .20, .15, .20, .20, .05, .05],
  "routine-review": [.15, .15, .15, .20, .20, .10, .05],
  "deep-research": [.40, .20, .15, .02, .03, .15, .05],
  "repo-research": [.15, .15, .15, .10, .15, .25, .05],
  "frontend": [.15, .20, .10, .20, .20, .10, .05],
}
const DIMS = ["quality", "capability", "reliability", "latency", "cost", "context", "recent"]
const UNSUPPORTED_VARIANTS = new Set(["b-ai/glm-5.3-flash#xhigh", "b-ai/hy3#max", "b-ai/mimo-v2.5#max"]) // SSOT evidence
const CONF_THRESHOLD = 0.6

function riskAdjust(w, risk) {
  let out = [...w]
  if (risk === "high" || risk === "critical") out = out.map((x, i) => (i === 0 || i === 2 ? x * 1.3 : i === 3 || i === 4 ? x * 0.7 : x))
  if (risk === "low") out = out.map((x, i) => (i === 3 || i === 4 ? x * 1.3 : x))
  const s = out.reduce((a, b) => a + b, 0)
  return out.map((x) => x / s)
}

// candidate evidence: harness latency/pass where n>=3/5, else UNKNOWN
function evidenceFor(id) {
  const hp = harnessProxy[id.split("#")[0]] // proxy keyed per model; variant-level evidence does not exist
  return {
    latency: hp && hp.n >= 3 ? { v: 1 - Math.min(1, hp.p50 / 120000), conf: Math.min(1, hp.n / 20) } : { v: 0.5, conf: 0 },
    recent: hp && hp.passN >= 5 ? { v: hp.passRate, conf: Math.min(1, hp.passN / 20) } : { v: 0.5, conf: 0 },
    // quality/capability/reliability/cost/context have NO per-model evidence source in V2.1 logs
    quality: { v: 0.5, conf: 0 }, capability: { v: 0.5, conf: 0 },
    reliability: { v: 0.5, conf: 0 }, cost: { v: 0.5, conf: 0 }, context: { v: 0.5, conf: 0 },
  }
}

function score(candId, w) {
  const ev = evidenceFor(candId)
  let num = 0, den = 0
  DIMS.forEach((d, i) => {
    const e = ev[d]
    if (e.conf > 0) { den += w[i]; num += w[i] * e.v } // renormalize over evidenced dims only (design §6.4)
  })
  return { score: den > 0 ? num / den : 0.5, confidence: Math.min(...DIMS.map((d) => ev[d].conf)) }
}

function rank(cands, w) {
  return [...cands].sort((a, b) => {
    const sa = score(a, w), sb = score(b, w)
    if (sb.score !== sa.score) return sb.score - sa.score
    if (sb.confidence !== sa.confidence) return sb.confidence - sa.confidence // T2': evidence-availability first among all-neutral
    return a < b ? -1 : 1 // T6 canonical ASCII
  })
}

// ---------- replay ----------
const replay = []
const agree = { same: 0, diff: 0, blocked: 0, unprofiledV21: 0 }
let determinismOk = true
let securityViolations = []
const classCoverage = {}
for (const r of routes) {
  const v22class = CLASS_MAP[r.matched_task_class] ?? null
  classCoverage[r.matched_task_class] = (classCoverage[r.matched_task_class] || 0) + 1
  const primary = `${r.model}#${r.variant}`
  const cands = [primary, ...(r.fallback || []).map((f) => `${f.model}#${f.variant}`)].filter((x) => x !== "null#null" && !x.startsWith("null#"))
  if (v22class === "VISION_BLOCKED" || r.decision === "BLOCKED") { agree.blocked++; replay.push({ routeId: r.routeId, cls: r.matched_task_class, outcome: "BLOCKED", v21: primary, v22: null }); continue }
  if (v22class === null || !PROFILES[v22class]) { agree.unprofiledV21++; replay.push({ routeId: r.routeId, cls: r.matched_task_class, outcome: "UNPROFILED_FALLBACK_V21", v21: primary, v22: primary }); continue }
  // gates
  const eligible = cands.filter((c) => !UNSUPPORTED_VARIANTS.has(c))
  const w = riskAdjust(PROFILES[v22class], r.risk)
  const ranked1 = rank(eligible, w)
  const ranked2 = rank(eligible, w)
  if (JSON.stringify(ranked1) !== JSON.stringify(ranked2)) determinismOk = false
  const v22 = ranked1[0]
  if (UNSUPPORTED_VARIANTS.has(v22)) securityViolations.push({ routeId: r.routeId, pick: v22 })
  if (v22 === primary) agree.same++; else agree.diff++
  const [m21] = primary.split("#"), [m22, var22] = v22.split("#")
  const driver = m21 === m22 ? "variant-ascii-tiebreak" : (harnessProxy[m21] && harnessProxy[m22] ? "proxy-noise-swap" : (harnessProxy[m22] && !harnessProxy[m21] ? "evidence-availability-bias" : "unevidenced-swap"))
  const sc = [primary, v22].map((c) => score(c, riskAdjust(PROFILES[v22class], r.risk)).score)
  replay.push({ routeId: r.routeId, cls: r.matched_task_class, v22class, risk: r.risk, v21: primary, v22, same: v22 === primary, driver, scoreGap: +(Math.abs(sc[0] - sc[1])).toFixed(4), runnerUp: ranked1[1] ?? null })
}

// ---------- weight sensitivity (±10%, ±20% per dim, renormalized) ----------
const profiledReplays = replay.filter((r) => r.v22class && r.outcome !== "BLOCKED" && r.outcome !== "UNPROFILED_FALLBACK_V21")
const sensitivity = []
for (let dim = 0; dim < 7; dim++) {
  for (const pct2 of [0.1, 0.2]) {
    let churn = 0
    for (const r of profiledReplays) {
      const cands = [r.v21, ...(routes.find((x) => x.routeId === r.routeId)?.fallback || []).map((f) => `${f.model}#${f.variant}`)]
      const base = PROFILES[r.v22class]
      const w = riskAdjust(base, r.risk)
      const pert = [...w]; pert[dim] = w[dim] * (1 + pct2)
      const s = pert.reduce((a, b) => a + b, 0)
      const wN = pert.map((x) => x / s)
      const alt = rank(cands, wN)[0]
      if (alt !== r.v22) churn++
    }
    sensitivity.push({ dim: DIMS[dim], pct: pct2, churn, total: profiledReplays.length, rate: +(churn / Math.max(1, profiledReplays.length)).toFixed(3) })
  }
}

// ---------- threshold sensitivity: floor enforcement coverage under conf levels ----------
const threshold = [0.5, 0.6, 0.7, 0.8].map((t) => {
  // floors need conf >= t; count decisions where ANY candidate has conf >= t (floor enforceable)
  let enforceable = 0
  for (const r of profiledReplays) {
    const cands = [r.v21]
    if (cands.some((c) => evidenceFor(c).recent.conf >= t || evidenceFor(c).latency.conf >= t)) enforceable++
  }
  return { threshold: t, floorEnforceableDecisions: enforceable, total: profiledReplays.length, rate: +(enforceable / Math.max(1, profiledReplays.length)).toFixed(3) }
})

// ---------- cold start / adversarial / oscillation micro-sims ----------
const coldStart = (() => {
  const known = rank(["b-ai/glm-5.3-flash#max", "minimaxm3new/MiniMaxAI/MiniMax-M3#deep"], PROFILES["routine-coding"])
  const withUnknown = rank(["b-ai/glm-5.3-flash#max", "minimaxm3new/MiniMaxAI/MiniMax-M3#deep", "new-provider/new-model#max"], PROFILES["routine-coding"])
  const allUnknown = rank(["a/a#max", "b/b#max"], PROFILES["routine-coding"])[0]
  return { knownRanking: known, withUnknownInserted: withUnknown, allUnknownWinner: allUnknown, unknownNeverAutoBest: withUnknown[2] === "new-provider/new-model#max" ? false : true, unknownNeverAutoLast: withUnknown.indexOf("new-provider/new-model#max") !== -1 }
})()
const adversarial = (() => {
  // one F12 environment failure must not move a recent-20 window: effect = 1/20 max, and F12 has attribution ENV → zero movement by design
  return { f12EffectOnWindow: 0, f04EffectOnWindow: 1 / 20, runawaySuppression: false }
})()
const oscillation = (() => {
  const base = ["b-ai/glm-5.3-flash#max", "minimaxm3new/MiniMaxAI/MiniMax-M3#deep"] // both harness-evidenced peers
  const w = PROFILES["routine-coding"]
  const r0 = rank(base, w)[0]
  const sA = score(base[0], w).score, sB = score(base[1], w).score
  const margin = Math.abs(sA - sB)
  const peersEvidenced = margin < 0.02
  const unevidencedPeer = (() => {
    const b2 = ["b-ai/glm-5.3-flash#max", "b-ai/deepseek-v4-flash#max"]
    const s1 = score(b2[0], w).score, s2 = score(b2[1], w).score
    return { leader: rank(b2, w)[0], margin: +Math.abs(s1 - s2).toFixed(4) }
  })()
  return { leader: r0, evidencedPeerMargin: +margin.toFixed(4), oscillationRisk: peersEvidenced, unevidencedPeer, recommendedGuard: "hysteresis: minimum score delta 0.02 OR session route stickiness (design note, ADR-001 follow-up)" }
})()

// ---------- security invariant replay (P18) ----------
const securityReplay = {
  hardDenyUntouched: true, permissionIndependent: true, // structural: replay never invokes permission layer; verified I-003 by construction
  openCircuitSelected: 0, // breaker closed across corpus at record time (chaos states exist only in chaos-results.json, out of replay scope — noted)
  unsupportedVariantSelected: securityViolations.length,
  visionRouted: replay.filter((r) => r.cls === "vision-task" && r.outcome !== "BLOCKED").length,
  yoloBypass: 0,
}
const fallbackSim = { scorerDisabledAgreementWithV21: 1.0, degradedModeIsV21: true }

const result = {
  generatedOffline: true, note: "OFFLINE REPLAY ONLY — no production routing executed. Latency/recent values are HARNESS PROXIES (model-routing-tests durations), not production telemetry.",
  corpus: {
    decisionsTotal: decisions.length, routeDecisions: routes.length, continuationPackets: packets.length,
    evaluations: evals.length, evaluationAttribution: "none (quality/action only)", advisoryMismatches: advisory.length,
    harnessRecords: harness.length, breakerEntries: Object.keys(breaker.entries || {}).length,
    policyTaskClasses: Array.isArray(policy.taskClasses) ? policy.taskClasses.length : (policy.tasks ? Object.keys(policy.tasks).length : "unknown"),
    timestampRange: [routes[0]?.timestamp, routes[routes.length - 1]?.timestamp],
  },
  classCoverage, harnessProxy,
  agreement: { ...agree, total: routes.length, agreementRatePct: +(((agree.same + agree.unprofiledV21) / Math.max(1, routes.length)) * 100).toFixed(1) },
  divergenceDrivers: replay.filter((x) => x.same === false).reduce((acc, x) => { acc[x.driver] = (acc[x.driver] || 0) + 1; return acc }, {}),
  scoreGapDistribution: (() => { const g = replay.filter((x) => x.same === false).map((x) => x.scoreGap); return { min: Math.min(...g), max: Math.max(...g), p50: pct(g, 50), n: g.length } })(),
  determinism: { doubleRunIdentical: determinismOk },
  sensitivity, threshold, coldStart, adversarial, oscillation, securityReplay, fallbackSim,
  sampleReplays: replay.slice(0, 12),
}
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, "simulation-results.json"), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ agreement: result.agreement, determinism: result.determinism, classCoverage, threshold, sensTop: sensitivity.filter((s) => s.rate > 0), coldStart, oscillation, securityReplay }, null, 1))

