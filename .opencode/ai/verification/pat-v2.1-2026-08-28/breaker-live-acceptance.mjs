// PAT v2.1 runtime acceptance — closed-loop breaker→routing (Workstream A live E2E).
// Scenario: controlled breaker OPEN on primary -> router excludes -> fallback selected ->
// fallback executes live -> breaker reset -> primary eligible again -> logs reconstruct.
import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { recordFailure, resetBreaker, breakerStatus } from "../../../smart-router/circuit-breaker.ts"
import { resolveRoute } from "../../../smart-router/router.ts"

const ROOT = process.env.SMART_ROUTER_PROJECT_ROOT
const PROMPT = "Audit the authentication and authorization architecture for security weaknesses."
const GLM = "b-ai/glm-5.3-flash"
const DS = "b-ai/deepseek-v4-flash"
const SESSION = "pat-v21-live-brk"
const steps = []

const before = resolveRoute(ROOT, { prompt: PROMPT, sessionId: SESSION })
steps.push({ step: "1-baseline-route", model: before.decision.model, variant: before.decision.variant, status: before.decision.status, routeId: before.decision.routeId })

for (let i = 1; i <= 3; i++) recordFailure(ROOT, GLM, `controlled acceptance probe: simulated provider failure ${i}`, { failureThreshold: 3, cooldownMs: 300000 })
steps.push({ step: "2-breaker-forced-open", key: GLM, state: breakerStatus(ROOT, GLM).state, available: breakerStatus(ROOT, GLM).state !== "open" })

const after = resolveRoute(ROOT, { prompt: PROMPT, sessionId: SESSION })
steps.push({
  step: "3-route-with-open-circuit",
  model: after.decision.model,
  variant: after.decision.variant,
  status: after.decision.status,
  circuitOpenWarnings: after.decision.warnings.filter((w) => w.includes("circuit-open")),
  primaryExcluded: after.decision.model !== GLM,
})

const out = execFileSync("opencode", ["run", "--model", DS, "--variant", "max", "--agent", "build", "In exactly one short sentence, define defense in depth."], { encoding: "utf8", shell: true, timeout: 120000 })
steps.push({ step: "4-fallback-execution", dispatchedModel: DS, dispatchedVariant: "max", outputTail: String(out).trim().split(/\r?\n/).slice(-3).join(" | ").slice(-300) })

resetBreaker(ROOT, GLM)
steps.push({ step: "5-breaker-reset", key: GLM, state: breakerStatus(ROOT, GLM).state })
const restored = resolveRoute(ROOT, { prompt: PROMPT, sessionId: SESSION })
steps.push({ step: "6-route-after-reset", model: restored.decision.model, variant: restored.decision.variant, status: restored.decision.status, primaryEligibleAgain: restored.decision.model === GLM })

// log reconstruction: breaker-exclusion records written during step 3
const logPath = new URL("../../routing/routing-decisions.jsonl", import.meta.url)
const exclusions = existsSync(logPath)
  ? readFileSync(logPath, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.kind === "breaker-exclusion" && r.sessionId === SESSION).slice(-1)
  : []
steps.push({ step: "7-log-reconstruction", breakerExclusionRecord: exclusions[0] ?? null })

writeFileSync(new URL("./breaker-live-acceptance.json", import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), scenario: "primary-open -> excluded -> fallback -> execution -> reset -> recovery", steps }, null, 2) + "\n")
console.log(JSON.stringify(steps, null, 2))
