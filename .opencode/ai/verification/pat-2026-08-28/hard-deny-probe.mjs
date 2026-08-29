// PAT runtime probe — hard-deny matrix + env-file guard regression (Phases 5 & 6).
// Invokes the LIVE modules and LIVE policy; writes JSON evidence only.
import { writeFileSync } from "node:fs"
import { resolvePermission } from "../../../smart-router/permission-resolver.ts"
import { loadPermissionPolicy } from "../../../smart-router/router.ts"

const ROOT = process.env.SMART_ROUTER_PROJECT_ROOT || resolve(import.meta.dirname, "..", "..", "..", "..", "..")
const policy = loadPermissionPolicy(ROOT)

const DESTRUCTIVE = [
  "git reset --hard HEAD~1",
  "git clean -fd",
  "git push --force origin main",
  "rm -rf /",
  "netsh advfirewall set allprofiles state off",
  "cat ~/.ssh/id_rsa",
  "printenv",
  "terraform destroy",
]
const ENV_ACTUAL = ["cat .env", "type .env", "Get-Content .env", "rg API_KEY .env.local", "cat .env.local"]
const ENV_BENIGN = [
  'node -e "console.log(process.env.NODE_ENV)"',
  'if (process.env.NODE_ENV === "production") { console.log("prod") }',
  "echo $env:NODE_ENV",
  "node scripts/check-budget.mjs",
]

function probe(op, mode, environment = "local") {
  return resolvePermission(policy, { agent: "build", tool: "bash", operation: op, mode, environment })
}

const result = { generatedAt: new Date().toISOString(), root: ROOT, hardDeny: {}, envGuard: {}, productionEscalation: {} }

for (const mode of ["safe", "standard", "elevated", "yolo"]) {
  result.hardDeny[mode] = DESTRUCTIVE.map((op) => {
    const d = probe(op, mode)
    return { op, decision: d.decision, rule: d.matchedRule, reason: d.reason }
  })
}
result.envGuard.actual = ENV_ACTUAL.map((op) => {
  const d = probe(op, "yolo")
  return { op, decision: d.decision, rule: d.matchedRule }
})
result.envGuard.benign = ENV_BENIGN.map((op) => {
  const d = probe(op, "yolo")
  return { op, decision: d.decision, rule: d.matchedRule, reason: d.reason }
})
for (const mode of ["safe", "standard", "elevated", "yolo"]) {
  const d = probe("git status", mode, "production")
  result.productionEscalation[mode] = { op: "git status", requested: mode, effectiveProfile: d.profile, decision: d.decision }
}

writeFileSync(new URL("./hard-deny-probe.json", import.meta.url), JSON.stringify(result, null, 2) + "\n")
console.log(JSON.stringify(result, null, 2))
