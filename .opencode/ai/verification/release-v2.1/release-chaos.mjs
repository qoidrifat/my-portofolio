// Release v2.1 chaos validation — controlled, reversible failure injection (Phases 4-6).
// Per-model breaker keys; variant-level circuits not supported by design (documented in report).
import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { recordFailure, recordSuccess, resetBreaker, breakerStatus } from "../../../smart-router/circuit-breaker.ts"
import { resolveRoute } from "../../../smart-router/router.ts"

const ROOT = process.env.SMART_ROUTER_PROJECT_ROOT
const PROMPT = "Audit the authentication and authorization architecture for security weaknesses."
const GLM = "b-ai/glm-5.3-flash"
const DS = "b-ai/deepseek-v4-flash"
const QWEN = "b-ai/qwen3.8-flash"
const SESSION = "release-v21-chaos"
const results = { generatedAt: new Date().toISOString(), tests: [] }
const push = (t) => results.tests.push(t)

function route() {
  const r = resolveRoute(ROOT, { prompt: PROMPT, sessionId: SESSION })
  return { status: r.decision.status, model: r.decision.model, variant: r.decision.variant, agent: r.decision.agent, routeId: r.decision.routeId, exclusions: r.decision.warnings.filter((w) => w.includes("circuit-open")) }
}
function exclusionsFromLog() {
  const p = new URL("../../routing/routing-decisions.jsonl", import.meta.url)
  if (!existsSync(p)) return []
  return readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.kind === "breaker-exclusion" && r.sessionId === SESSION).slice(-4)
}

// TEST 1 — primary open
resetBreaker(ROOT, null)
for (let i = 0; i < 3; i++) recordFailure(ROOT, GLM, `chaos t1 failure ${i + 1}`, { failureThreshold: 3 })
push({ test: "1-primary-open", breakerState: breakerStatus(ROOT, GLM).state, route: route(), glmNotDispatched: route().model !== GLM })

// TEST 2 — primary + first fallback open (same model key: GLM#max and GLM#high share per-model circuit)
for (let i = 0; i < 3; i++) recordFailure(ROOT, GLM, `chaos t2 failure ${i + 1}`, { failureThreshold: 3 })
const t2route = route()
push({ test: "2-primary-plus-first-fallback-open", note: "breaker key is per-model: GLM#max and GLM#high share one circuit", breakerState: breakerStatus(ROOT, GLM).state, route: t2route, glmNotDispatched: t2route.model !== GLM })
let live = ""
try {
  live = execFileSync("opencode", ["run", "--model", DS, "--variant", "max", "--agent", "build", "Reply with exactly the single word OK and nothing else."], { encoding: "utf8", shell: true, timeout: 120000 })
} catch (e) { live = "EXEC-ERROR: " + String(e.message).slice(0, 120) }
push({ test: "2b-fallback-live-execution", dispatched: `${DS}#max`, executed: /OK/.test(live), outputTail: String(live).trim().split(/\r?\n/).slice(-2).join(" | ").slice(-160) })

// TEST 3 — multiple fallback failure
resetBreaker(ROOT, GLM)
resetBreaker(ROOT, DS)
for (let i = 0; i < 3; i++) recordFailure(ROOT, GLM, `chaos t3 failure ${i + 1}`, { failureThreshold: 3 })
for (let i = 0; i < 3; i++) recordFailure(ROOT, DS, `chaos t3 failure ${i + 1}`, { failureThreshold: 3 })
const t3 = route()
push({ test: "3-multiple-fallback-open", route: t3, expectedQwen: t3.model === QWEN })

// TEST 4 — all models open
for (let i = 0; i < 3; i++) recordFailure(ROOT, QWEN, `chaos t4 failure ${i + 1}`, { failureThreshold: 3 })
const t4 = route()
push({ test: "4-all-models-open", route: t4, blocked: t4.status === "BLOCKED" && t4.model === null })

// TEST 5 — recovery: reset -> closed -> eligible; controlled half-open probe
resetBreaker(ROOT, null)
const t5a = route()
recordFailure(ROOT, GLM, "chaos t5 f1", { failureThreshold: 3, cooldownMs: 40 })
recordFailure(ROOT, GLM, "chaos t5 f2", { failureThreshold: 3, cooldownMs: 40 })
recordFailure(ROOT, GLM, "chaos t5 f3", { failureThreshold: 3, cooldownMs: 40 })
const openState = breakerStatus(ROOT, GLM).state
await new Promise((r) => setTimeout(r, 60))
const halfOpenState = breakerStatus(ROOT, GLM).state
const halfOpenEligible = route().model === GLM
recordFailure(ROOT, GLM, "chaos t5 probe fail", { failureThreshold: 3, cooldownMs: 40 })
const probeFailState = breakerStatus(ROOT, GLM).state
recordSuccess(ROOT, GLM)
const closedState = breakerStatus(ROOT, GLM).state
const recoveredEligible = route().model === GLM
push({ test: "5-recovery", openState, halfOpenState, halfOpenEligible, probeFailState, closedState, recoveredEligible })

// TEST 6 — rapid fail/recover transitions + state integrity
const transitions = []
for (let cycle = 1; cycle <= 3; cycle++) {
  for (let i = 0; i < 3; i++) recordFailure(ROOT, GLM, `chaos t6 cycle${cycle} f${i + 1}`, { failureThreshold: 3, cooldownMs: 20 })
  transitions.push(breakerStatus(ROOT, GLM).state)
  await new Promise((r) => setTimeout(r, 30))
  transitions.push(breakerStatus(ROOT, GLM).state)
  recordSuccess(ROOT, GLM)
  transitions.push(breakerStatus(ROOT, GLM).state)
}
resetBreaker(ROOT, null)
const t6final = route()
push({ test: "6-rapid-transitions", transitions, stateCorruption: transitions.some((s) => !["open", "half_open", "closed"].includes(s)), finalRoute: t6final, finalHealthy: t6final.model === GLM })

// PHASE 6 — determinism under failure (5 runs, GLM open, DeepSeek closed)
resetBreaker(ROOT, null)
for (let i = 0; i < 3; i++) recordFailure(ROOT, GLM, "chaos determinism failure", { failureThreshold: 3 })
const runs = []
for (let i = 0; i < 5; i++) {
  const r = route()
  runs.push({ taskClass: "security-review", model: r.model, variant: r.variant, agent: r.agent, routeId: r.routeId, status: r.status })
}
resetBreaker(ROOT, null)
push({ test: "determinism-under-failure", runs: runs.length, allIdentical: runs.every((r) => JSON.stringify(r) === JSON.stringify(runs[0])), representative: runs[0] })

push({ test: "attribution-records", records: exclusionsFromLog() })
writeFileSync(new URL("./chaos-results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n")
console.log(JSON.stringify(results.tests.map((t) => ({ test: t.test, ok: t.glmNotDispatched ?? t.expectedQwen ?? t.blocked ?? t.recoveredEligible ?? t.finalHealthy ?? t.allIdentical ?? t.executed ?? "see-record" })), null, 1))
