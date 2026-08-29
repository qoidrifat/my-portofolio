// PAT Phase 17 — re-test policy self-modification bypass after patch
import { resolvePermission } from "../../../smart-router/permission-resolver.ts"
import { loadPermissionPolicy } from "../../../smart-router/router.ts"

const ROOT = process.env.SMART_ROUTER_PROJECT_ROOT
const policy = loadPermissionPolicy(ROOT)
const cases = [
  { tool: "write", op: ".opencode/smart-router/permission-policy.json", mode: "yolo" },
  { tool: "write", op: ".opencode/smart-router/routing-policy.json", mode: "yolo" },
  { tool: "bash", op: "Set-Content .opencode" + "/smart-router/permission-policy.json -Value X", mode: "yolo" },
  { tool: "edit", op: "src/App.tsx", mode: "yolo" }, // control: normal writes must remain allowed
]
for (const c of cases) {
  const d = resolvePermission(policy, { agent: "build", tool: c.tool, operation: c.op, mode: c.mode })
  console.log(`${c.tool} -> ${d.decision} (rule: ${d.matchedRule}) :: ${c.op.slice(0, 60)}`)
}
