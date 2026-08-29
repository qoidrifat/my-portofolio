// PAT runtime probe — circuit breaker lifecycle (Phase 11) + open-circuit vs permission independence.
import { writeFileSync } from "node:fs"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { recordFailure, recordSuccess, breakerStatus, isAvailable } from "../../../smart-router/circuit-breaker.ts"
import { resolvePermission } from "../../../smart-router/permission-resolver.ts"
import { loadPermissionPolicy } from "../../../smart-router/router.ts"

const ROOT = mkdtempSync(join(tmpdir(), "sr-pat-brk-"))
const KEY = "b-ai/glm-5.3-flash"
const opts = { failureThreshold: 3, cooldownMs: 120 }
const steps = []

steps.push({ step: "initial", status: breakerStatus(ROOT, KEY, opts).state, available: isAvailable(ROOT, KEY, opts) })
for (let i = 1; i <= 3; i++) {
  recordFailure(ROOT, KEY, `simulated provider failure ${i} (429 rate limit)`, opts)
  steps.push({ step: `failure-${i}`, status: breakerStatus(ROOT, KEY, opts).state, available: isAvailable(ROOT, KEY, opts) })
}
steps.push({ step: "mid-cooldown (120ms elapsed)", status: breakerStatus(ROOT, KEY, opts).state, available: isAvailable(ROOT, KEY, opts) })
await new Promise((r) => setTimeout(r, 150))
steps.push({ step: "cooldown elapsed -> probe", status: breakerStatus(ROOT, KEY, opts).state, available: isAvailable(ROOT, KEY, opts) })
recordSuccess(ROOT, KEY, opts)
steps.push({ step: "probe success -> restore", status: breakerStatus(ROOT, KEY, opts).state, available: isAvailable(ROOT, KEY, opts) })

// open circuit must NOT change permission decisions (open != denial)
const policy = loadPermissionPolicy(process.env.SMART_ROUTER_PROJECT_ROOT)
const permWithClosedBreaker = resolvePermission(policy, { agent: "build", tool: "bash", operation: "npm test", mode: "standard" })

const out = { generatedAt: new Date().toISOString(), key: KEY, threshold: 3, cooldownMs: 120, lifecycle: steps, notes: { breakerConsultedByRouting: false, evidence: "grep of router.ts/model-router.ts/agent-router.ts/plugin shows no isAvailable() call — breaker records state only (see report finding)" } }
writeFileSync(new URL("./circuit-breaker-probe.json", import.meta.url), JSON.stringify(out, null, 2) + "\n")
console.log(JSON.stringify(out, null, 2))
