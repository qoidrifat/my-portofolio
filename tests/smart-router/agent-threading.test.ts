// Smart Router v2.1 — agent identity threading tests (Workstream C).
// The SDK Permission type carries no agent field (verified: @opencode-ai/sdk 1.18.25).
// Threading path: chat.message input.agent -> session state -> permission decisions.
// Security contract (C4): threading may only tighten (read-only force); missing session -> "build";
// hard denies remain absolute regardless of threaded agent.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { recordRoute } from "../../.opencode/smart-router/session-state.ts"
import { SmartRouterPlugin } from "../../.opencode/plugins/smart-router.ts"
import type { Plugin } from "@opencode-ai/plugin"

const mockClient = { app: { log: async () => {} } } as unknown as Parameters<Plugin>[0]["client"]

type Hooks = Awaited<ReturnType<typeof SmartRouterPlugin>>

async function loadPlugin(root: string): Promise<Hooks> {
  return (await SmartRouterPlugin({ client: mockClient, directory: root } as Parameters<Plugin>[0])) as Hooks
}

function askHookInput(sessionId: string, type: string, pattern: string) {
  return {
    input: { sessionID: sessionId, type, pattern, title: pattern, id: "perm-1", messageID: "m1", metadata: {}, time: { created: Date.now() } },
    output: { status: "ask" as "ask" | "deny" | "allow" },
  }
}

describe("agent identity threading (session state → permission decisions)", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sr-v21-agent-"))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("reviewer session + write permission -> deny (read-only force reaches the decision)", async () => {
    recordRoute(root, "ses-reviewer", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const h = askHookInput("ses-reviewer", "write", "src/feature.ts")
    await hooks["permission.ask"]!(h.input as never, h.output as never)
    expect(h.output.status).toBe("deny")
  })

  it("research session + bash mutation -> deny", async () => {
    recordRoute(root, "ses-research", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "research" }, {})
    const hooks = await loadPlugin(root)
    const h = askHookInput("ses-research", "bash", "Remove-Item -Recurse ./dist")
    await hooks["permission.ask"]!(h.input as never, h.output as never)
    expect(h.output.status).toBe("deny")
  })

  it("build session + write permission -> not denied by agent force (allow/ask path unchanged)", async () => {
    recordRoute(root, "ses-build", { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep", agent: "build" }, {})
    const hooks = await loadPlugin(root)
    const h = askHookInput("ses-build", "write", "src/feature.ts")
    await hooks["permission.ask"]!(h.input as never, h.output as never)
    expect(h.output.status).not.toBe("deny")
  })

  it("unknown session -> defaults to build (previous hardcoded behavior preserved, never weaker)", async () => {
    const hooks = await loadPlugin(root)
    const h = askHookInput("ses-unknown", "write", "src/feature.ts")
    await hooks["permission.ask"]!(h.input as never, h.output as never)
    expect(h.output.status).not.toBe("deny")
  })

  it("hard deny remains absolute for any threaded agent (reviewer cannot git reset --hard)", async () => {
    recordRoute(root, "ses-rev2", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const h = askHookInput("ses-rev2", "bash", "git reset --hard HEAD~1")
    await hooks["permission.ask"]!(h.input as never, h.output as never)
    expect(h.output.status).toBe("deny")
  })

  it("tool.execute.before guard honors threaded agent (reviewer bash write -> thrown deny)", async () => {
    recordRoute(root, "ses-rev3", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const input = { tool: "bash", sessionID: "ses-rev3", callID: "c1" }
    const output = { args: { command: "echo x > file.txt" } }
    await expect(hooks["tool.execute.before"]!(input as never, output as never)).rejects.toThrow(/read-only/)
  })

  it("tool.execute.before guard: build agent same command -> no throw (control)", async () => {
    recordRoute(root, "ses-build2", { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep", agent: "build" }, {})
    const hooks = await loadPlugin(root)
    const input = { tool: "bash", sessionID: "ses-build2", callID: "c1" }
    const output = { args: { command: "echo x > file.txt" } }
    await expect(hooks["tool.execute.before"]!(input as never, output as never)).resolves.toBeUndefined()
  })
})
