// Smart Router v2.1 — release hardening: chaos-security + shell indirection classification (Phases 7, 12).
// Chaos-security: breaker state must never change security authority.
// Indirection: classify resolver decisions; a regex bypass is only HIGH if it yields unauthorized
// execution despite all layers (host auto-approves unmatched bash -> ASK-classified indirection executes).

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { resolvePermission } from "../../.opencode/smart-router/permission-resolver.ts"
import type { PermissionPolicy } from "../../.opencode/smart-router/permission-resolver.ts"
import { resolveRoute } from "../../.opencode/smart-router/router.ts"
import { recordFailure, resetBreaker } from "../../.opencode/smart-router/circuit-breaker.ts"

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const policy = JSON.parse(readFileSync(join(PROJECT, ".opencode/smart-router/permission-policy.json"), "utf8")) as PermissionPolicy

function ask(op: string, mode: "safe" | "standard" | "elevated" | "yolo", env: "local" | "staging" | "production" = "local", agent = "build") {
  return resolvePermission(policy, { agent, tool: "bash", operation: op, mode, environment: env })
}

describe("chaos-security: breaker state cannot weaken security authority", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sr-rel-sec-"))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("YOLO + primary open -> fallback selected, hard deny still absolute", () => {
    for (let i = 0; i < 3; i++) recordFailure(root, "b-ai/glm-5.3-flash", "release chaos failure", { failureThreshold: 3 })
    const { decision } = resolveRoute(root, { prompt: "Audit the authentication and authorization architecture for security weaknesses.", sessionId: "rel-yolo-brk" })
    expect(decision.model).toBe("b-ai/deepseek-v4-flash") // breaker affected availability only
    expect(decision.agent).toBe("reviewer")
    expect(ask("git reset --hard", "yolo").decision).toBe("deny") // breaker did not affect security
    expect(ask("git clean -fd", "yolo").decision).toBe("deny")
    resetBreaker(root, null)
  })

  it("research agent + open circuit -> fallback route keeps read-only force", () => {
    for (let i = 0; i < 3; i++) recordFailure(root, "b-ai/glm-5.3-flash", "release chaos failure", { failureThreshold: 3 })
    const { decision } = resolveRoute(root, { prompt: "Do deep research on the repository structure and write a summary.", sessionId: "rel-res-brk" })
    expect(decision.agent).toBe("research")
    expect(decision.model).toBe("b-ai/deepseek-v4-flash")
    expect(ask("Set-Content ./notes.txt -Value x", "yolo", "local", "research").decision).toBe("deny")
    resetBreaker(root, null)
  })
})

describe("shell indirection classification (Phase 12, controlled probes, no execution)", () => {
  it("direct literal -> BLOCK", () => {
    expect(ask("git reset --hard", "yolo").decision).toBe("deny")
  })
  it("literal-preserving indirection still BLOCKed (variable / substitution / nested / wrapper)", () => {
    expect(ask("$c = 'git reset --hard'; Invoke-Expression $c", "yolo").decision).toBe("deny")
    expect(ask("$(git reset --hard)", "yolo").decision).toBe("deny")
    expect(ask('bash -c "git reset --hard"', "yolo").decision).toBe("deny")
    expect(ask('node -e "child_process.exec(\'git reset --hard\')"', "yolo").decision).toBe("deny")
  })
  it("literal-free obfuscation (alias / encoded / script) -> ASK, never ALLOW", () => {
    expect(ask("Set-Alias gr git; gr reset --hard", "yolo").decision).toBe("ask")
    const b64 = Buffer.from("git reset --hard").toString("base64")
    const enc = `powershell -EncodedCommand ${b64}`
    expect(enc.includes("git reset --hard")).toBe(false) // probe really is literal-free
    expect(ask(enc, "yolo").decision).toBe("ask")
    expect(ask("./scripts/reset-hard.ps1", "yolo").decision).toBe("ask")
  })
  it("classification is mode-independent for the deny layer (ASK never degrades to ALLOW under YOLO)", () => {
    for (const mode of ["safe", "standard", "elevated", "yolo"] as const) {
      expect(ask("./scripts/reset-hard.ps1", mode).decision).not.toBe("allow")
    }
  })
})
