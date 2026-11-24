// Smart Router v2.1 — agent identity threading tests (Workstream C).
// The SDK Permission type carries no agent field (verified: @opencode-ai/sdk 1.18.25).
// Threading path: prompt admission -> session state -> permission decisions.
// Security contract (C4): threading may only tighten (read-only force); missing session -> "build";
// hard denies remain absolute regardless of threaded agent.
//
// Migrated to the OpenCode v2 plugin API: the plugin registers hooks through the plugin
// context instead of returning a v1 hook object, so the test captures the callbacks.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { recordRoute } from "../../.opencode/smart-router/session-state.ts"
import { SmartRouterPlugin } from "../../.opencode/plugins/smart-router.ts"
import type { SmartRouterContext } from "../../.opencode/plugins/smart-router.ts"

type Hook = (event: never) => void | Promise<void>

interface Captured {
  prompt?: Hook
  context?: Hook
  permission?: Hook
  toolBefore?: Hook
}

const registration = { dispose: async () => {} }

async function loadPlugin(root: string): Promise<Captured> {
  const captured: Captured = {}
  const ctx = {
    location: { directory: root },
    session: {
      get: async () => ({ agent: "build" }),
      hook: async (name: string, callback: Hook) => {
        if (name === "prompt") captured.prompt = callback
        else captured.context = callback
        return registration
      },
    },
    permission: {
      hook: async (_name: string, callback: Hook) => {
        captured.permission = callback
        return registration
      },
    },
    tool: {
      hook: async (name: string, callback: Hook) => {
        if (name === "execute.before") captured.toolBefore = callback
        return registration
      },
    },
    event: { subscribe: () => ({ [Symbol.asyncIterator]: async function* () {} }) },
  }
  await SmartRouterPlugin(ctx as unknown as SmartRouterContext)
  return captured
}

function permissionEvent(sessionID: string, action: string, resource: string) {
  return {
    sessionID,
    action,
    resources: [resource],
    effect: "ask" as "allow" | "ask" | "deny",
  }
}

function shellEvent(sessionID: string, command: string) {
  return { tool: "shell", sessionID, input: { command } }
}

describe("agent identity threading (session state → permission decisions)", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sr-v21-agent-"))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("reviewer session + edit permission -> deny (read-only force reaches the decision)", async () => {
    recordRoute(root, "ses-reviewer", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const event = permissionEvent("ses-reviewer", "edit", "src/feature.ts")
    await hooks.permission!(event as never)
    expect(event.effect).toBe("deny")
  })

  it("research session + shell mutation -> deny", async () => {
    recordRoute(root, "ses-research", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "research" }, {})
    const hooks = await loadPlugin(root)
    const event = permissionEvent("ses-research", "shell", "Remove-Item -Recurse ./dist")
    await hooks.permission!(event as never)
    expect(event.effect).toBe("deny")
  })

  it("build session + edit permission -> not denied by agent force (allow/ask path unchanged)", async () => {
    recordRoute(root, "ses-build", { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep", agent: "build" }, {})
    const hooks = await loadPlugin(root)
    const event = permissionEvent("ses-build", "edit", "src/feature.ts")
    await hooks.permission!(event as never)
    expect(event.effect).not.toBe("deny")
  })

  it("unknown session -> defaults to build (previous hardcoded behavior preserved, never weaker)", async () => {
    const hooks = await loadPlugin(root)
    const event = permissionEvent("ses-unknown", "edit", "src/feature.ts")
    await hooks.permission!(event as never)
    expect(event.effect).not.toBe("deny")
  })

  it("hard deny remains absolute for any threaded agent (reviewer cannot git reset --hard)", async () => {
    recordRoute(root, "ses-rev2", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const event = permissionEvent("ses-rev2", "shell", "git reset --hard HEAD~1")
    await hooks.permission!(event as never)
    expect(event.effect).toBe("deny")
  })

  it("execute.before guard honors threaded agent (reviewer shell write -> thrown deny)", async () => {
    recordRoute(root, "ses-rev3", { model: "b-ai/glm-5.3-flash", variant: "max", agent: "reviewer" }, {})
    const hooks = await loadPlugin(root)
    const event = shellEvent("ses-rev3", "echo x > file.txt")
    await expect(hooks.toolBefore!(event as never)).rejects.toThrow(/read-only/)
  })

  it("execute.before guard: build agent same command -> no throw (control)", async () => {
    recordRoute(root, "ses-build2", { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep", agent: "build" }, {})
    const hooks = await loadPlugin(root)
    const event = shellEvent("ses-build2", "echo x > file.txt")
    await expect(hooks.toolBefore!(event as never)).resolves.toBeUndefined()
  })
})
