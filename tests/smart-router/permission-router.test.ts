// Smart Router v2 — permission intelligence tests (directive #77): profiles, hard deny, production/Git/Secret guards.

import { describe, it, expect } from "vitest"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { resolvePermission } from "../../.opencode/smart-router/permission-resolver.ts"
import type { PermissionPolicy } from "../../.opencode/smart-router/permission-resolver.ts"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const policy: PermissionPolicy = JSON.parse(readFileSync(resolve(ROOT, ".opencode/smart-router/permission-policy.json"), "utf8"))

function ask(agent: string, op: string, mode: "safe" | "standard" | "elevated" | "yolo", env: "local" | "staging" | "production" = "local") {
  return resolvePermission(policy, { agent, tool: "bash", operation: op, mode, environment: env })
}

describe("hard denies outrank everything (#16)", () => {
  const destructive = [
    "git reset --hard",
    "git reset --hard HEAD~3",
    "git clean -fd",
    "git push --force origin main",
    "git push -f origin main",
    "git branch -D feature/x",
    "git filter-branch --tree-filter 'x' HEAD",
    "git checkout .",
    "cat ~/.ssh/id_rsa",
    "printenv",
    "terraform destroy",
    "netsh advfirewall firewall add rule name=x dir=in action=allow",
    "rm -rf /",
  ]
  for (const op of destructive) {
    it(`YOLO cannot bypass: ${op}`, () => {
      expect(ask("build", op, "yolo").decision).toBe("deny")
    })
  }
})

describe("YOLO allows safe work with minimal prompts (#14, #78)", () => {
  it("normal file edit", () => {
    const d = resolvePermission(policy, { agent: "build", tool: "edit", operation: "src/App.tsx", mode: "yolo" })
    expect(d.decision).toBe("allow")
  })
  it("tests/build", () => {
    expect(ask("build", "npm run test", "yolo").decision).toBe("allow")
    expect(ask("build", "npm run build", "yolo").decision).toBe("allow")
  })
  it("git status/diff/log", () => {
    expect(ask("build", "git status", "yolo").decision).toBe("allow")
    expect(ask("build", "git diff HEAD", "yolo").decision).toBe("allow")
  })
  it("git commit is policy-controlled ALLOW under YOLO (#15)", () => {
    expect(ask("build", "git commit -m 'x'", "yolo").decision).toBe("allow")
    expect(ask("build", "git commit -m 'x'", "standard").decision).toBe("ask")
  })
})

describe("confirmation gates: ASK even under YOLO (#15)", () => {
  it("git push", () => expect(ask("build", "git push origin main", "yolo").decision).toBe("ask"))
  it("deployment", () => expect(ask("build", "vercel --prod", "yolo").decision).toBe("ask"))
  it("package install at STANDARD", () => expect(ask("build", "npm install left-pad", "standard").decision).toBe("ask"))
  it("package install at ELEVATED allowed (#15)", () => expect(ask("build", "npm install left-pad", "elevated").decision).toBe("allow"))
})

describe("profiles", () => {
  it("SAFE: read-only, file write becomes ASK", () => {
    const d = resolvePermission(policy, { agent: "build", tool: "write", operation: "notes.md", mode: "safe" })
    expect(d.decision).toBe("ask")
    expect(ask("build", "git status", "safe").decision).toBe("allow")
  })
  it("STANDARD: edit + safe shell allowed", () => {
    expect(ask("build", "node scripts/build.mjs", "standard").decision).toBe("allow")
    const w = resolvePermission(policy, { agent: "build", tool: "edit", operation: "src/x.ts", mode: "standard" })
    expect(w.decision).toBe("allow")
  })
})

describe("per-agent read-only force (#17)", () => {
  it("researcher/reviewer cannot write", () => {
    const w = resolvePermission(policy, { agent: "reviewer", tool: "edit", operation: "src/x.ts", mode: "yolo" })
    expect(w.decision).toBe("deny")
    expect(w.matchedRule).toBe("agent-readonly")
  })
  it("reviewer can still run read-only shell and tests", () => {
    expect(ask("reviewer", "git diff main..HEAD", "standard").decision).toBe("allow")
    expect(ask("reviewer", "npm run test", "standard").decision).toBe("allow")
  })
})

describe("production guard (#52, #105, #106)", () => {
  it("YOLO is downgraded to SAFE in production (never auto-YOLO for prod)", () => {
    expect(ask("build", "npm install left-pad", "yolo", "production").decision).toBe("ask")
  })
  it("deploy still requires confirmation in production", () => {
    expect(ask("build", "vercel --prod", "elevated", "production").decision).toBe("ask")
  })
})

describe("secret guard (#50)", () => {
  it("credential access denied even in YOLO", () => {
    expect(ask("build", "cat .env && echo done", "yolo").decision !== "allow").toBe(true)
  })
})

describe("policy self-modification guard (PAT Phase 17)", () => {
  it("YOLO cannot rewrite the security policy via a write/edit tool", () => {
    const d = resolvePermission(policy, { agent: "build", tool: "write", operation: ".opencode/smart-router/permission-policy.json", mode: "yolo" })
    expect(d.decision).toBe("deny")
    expect(d.matchedRule).toBe("policy-self-modify")
  })
  it("YOLO cannot rewrite the routing policy via shell", () => {
    expect(ask("build", "Set-Content .opencode/smart-router/routing-policy.json -Value '{}'", "yolo").decision).toBe("deny")
  })
})
