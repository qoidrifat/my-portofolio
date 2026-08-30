// Smart Router V2.2 — native OpenCode TUI plugin (observability only).
// READ-ONLY presentation layer over existing Smart Router runtime artifacts.
// NEVER mutates routes, permissions, breaker, scoring, or V2.2 shadow state.
// Fail-open: any UI/data failure degrades the panel, never the host TUI.
//
// Contract notes (installed runtime is authoritative):
// - TUI plugin module shape: TuiPluginModule { id?, tui } (@opencode-ai/plugin/tui).
// - Slots: session_prompt_right / home_footer via api.slots.register (Solid JSX).
// - Slash commands: legacy api.command.register with slash names (TuiCommand, kept for
//   v1 compat on this runtime); modern keymap.registerLayer exists but its slash-command
//   mapping is not documented in the installed types, so commands use the documented
//   legacy surface. No keybinds are registered (no native collision risk).
// - Realtime: api.event.on (typed host events) with 150ms debounce -> snapshot refresh.
//   MEDIUM-2: tool.execute.before is NOT in the TUI event bus (verified installed SDK v2
//   Event union) — HOST-LIMITED. Realtime security instead uses (a) typed tool-lifecycle
//   events (session.next.tool.*) and (b) ONE bounded fs.watch on permission-decisions.jsonl
//   (the file hard-denies are written to), debounced via the same refresh path. No polling.
// - Evidence: MEDIUM-3 — aggregates come from the real EvaluationStore implementation
//   (bounded signal tail; store.record(flush=false) never persists). The UI never re-aggregates.
// - Capability registry: real buildRegistry() SSOT (same as server plugin), read-only.

import type { TuiPlugin, TuiPluginModule, TuiThemeCurrent } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import { appendFileSync, existsSync, readFileSync, watch } from "node:fs"
import { join } from "node:path"
import { buildRegistry } from "../smart-router/capability.ts"
import type { ModelRegistry } from "../smart-router/types.ts"
import { EvaluationStore } from "../smart-router/v22/evaluation-store.ts"
import type { StoreStats } from "../smart-router/v22/evaluation-store.ts"
import type { EvaluationSignal } from "../smart-router/v22/types.ts"
import {
  buildViewModel,
  parsePermissionTail,
  type AdapterInput,
  type RouterViewModel,
  type Row,
  type Tone,
} from "../smart-router/v22/tui/view-model.ts"
import {
  candidateLines,
  capabilityLines,
  dashboardLines,
  evidenceLines,
  evaluationLines,
  fallbackLines,
  footerLines,
  hysteresisLines,
  healthLines,
  latencyCostLines,
  promotionLines,
  routeLines,
  securityLines,
  taskLines,
  type Line,
} from "../smart-router/v22/tui/format.ts"

const REFRESH_DEBOUNCE_MS = 150
const TAIL = 120

function readTail(root: string, rel: string, n: number): Row[] {
  const p = join(root, rel)
  if (!existsSync(p)) return []
  try {
    const text = readFileSync(p, "utf8")
    const lines = text.split("\n").filter((l) => l.trim().length > 0)
    return lines.slice(-n).map((l) => JSON.parse(l) as Row)
  } catch {
    return []
  }
}

function readJson(root: string, rel: string): Row | null {
  const p = join(root, rel)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Row
  } catch {
    return null
  }
}

/** R2-MED-01: raw file text or null (missing/unreadable) — classification is parsePermissionTail's job. */
function readTextOrNull(root: string, rel: string): string | null {
  const p = join(root, rel)
  if (!existsSync(p)) return null
  try {
    return readFileSync(p, "utf8")
  } catch {
    return null
  }
}

// ponytail: authoritative aggregation over the same bounded signal tail the UI already
// reads (400 rows). record(flush=false) never writes; load() is never called. Upgrade
// path: reuse one full-corpus EvaluationStore instance if shadow corpus grows large.
function loadStoreStats(root: string, nowMs: number, signalTail: Row[]): StoreStats | null {
  try {
    const store = new EvaluationStore(join(root, ".opencode/ai/evidence/v22/evaluation-signals.jsonl"))
    for (const s of signalTail) store.record(s as unknown as EvaluationSignal, false)
    return store.stats(nowMs)
  } catch {
    return null
  }
}

function logTui(root: string, row: Record<string, unknown>): void {
  try {
    appendFileSync(join(root, ".opencode/ai/logs/smart-router-tui.jsonl"), JSON.stringify({ timestamp: new Date().toISOString(), ...row }) + "\n")
  } catch {
    // fail-open
  }
}

function loadSnapshot(root: string, nowMs: number, registry: ModelRegistry | null): AdapterInput | null {
  try {
    const signals = readTail(root, ".opencode/ai/evidence/v22/evaluation-signals.jsonl", 400)
    const permTail = parsePermissionTail(readTextOrNull(root, ".opencode/ai/permissions/permission-decisions.jsonl"), TAIL)
    const input: AdapterInput = {
      flags: readJson(root, ".opencode/smart-router/v22-flags.json"),
      config: readJson(root, ".opencode/smart-router/config.json"),
      deltas: readTail(root, ".opencode/ai/evidence/v22/shadow-deltas.jsonl", TAIL),
      signals,
      t2: readTail(root, ".opencode/ai/telemetry/v22/t2.jsonl", TAIL),
      t3: readTail(root, ".opencode/ai/telemetry/v22/t3.jsonl", TAIL),
      t4: readTail(root, ".opencode/ai/telemetry/v22/t4.jsonl", TAIL),
      routing: readTail(root, ".opencode/ai/routing/routing-decisions.jsonl", TAIL),
      permissions: permTail.rows,
      permissionsStatus: permTail.status,
      routerLog: readTail(root, ".opencode/ai/logs/smart-router.jsonl", TAIL),
      breaker: readJson(root, ".opencode/ai/routing/circuit-breaker.json"),
      hysteresis: readTail(root, ".opencode/ai/evidence/v22/hysteresis-state.jsonl", TAIL),
      storeStats: loadStoreStats(root, nowMs, signals),
      registry,
      nowMs,
    }
    return input
  } catch {
    return null
  }
}

function toneColor(t: TuiThemeCurrent, tone: Tone) {
  switch (tone) {
    case "muted":
      return t.textMuted
    case "success":
      return t.success
    case "warning":
      return t.warning
    case "error":
      return t.error
    case "accent":
      return t.accent
    default:
      return t.text
  }
}

export const SmartRouterTuiPlugin: TuiPlugin = async (api) => {
  const root = api.state.path.directory
  // MEDIUM-1: raw snapshots are kept session-agnostic; session views are derived per slot
  // from the SAME snapshot with the host-supplied sessionId (no global-latest fallback).
  const [snapshot, setSnapshot] = createSignal<AdapterInput | null>(null)
  // fail-open (I-SAFE-11): a view-model build error degrades the panel to "…", never the host
  const vm = () => {
    try {
      const input = snapshot()
      return input ? buildViewModel(input) : null
    } catch {
      return null
    }
  }
  const vmForSession = (sessionId: string | undefined): RouterViewModel | null => {
    try {
      const input = snapshot()
      if (!input) return null
      return buildViewModel(input, sessionId && sessionId.length > 0 ? sessionId : undefined)
    } catch {
      return null
    }
  }
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  let registry: ModelRegistry | null = null
  try {
    registry = buildRegistry()
  } catch {
    registry = null
  }

  logTui(root, { kind: "tui-plugin-load", version: api.app.version })

  // MEDIUM-2 evidence: log only deny-count INCREASES (state transition, not every refresh)
  let lastDenyCount = -1
  function refresh(immediate = false): void {
    if (refreshTimer) clearTimeout(refreshTimer)
    const run = () => {
      refreshTimer = null
      const input = loadSnapshot(root, Date.now(), registry)
      const view = input ? buildViewModel(input) : null
      const n = view?.security.denies.length ?? 0
      if (lastDenyCount >= 0 && n > lastDenyCount) {
        logTui(root, { kind: "tui-security-state-change", source: view?.security.source ?? "unavailable", hardDeny: view?.security.hardDeny ?? false, denies: n })
      }
      lastDenyCount = n
      setSnapshot(input)
    }
    if (immediate) {
      refreshTimer = null
      run()
      return
    }
    refreshTimer = setTimeout(run, REFRESH_DEBOUNCE_MS)
  }

  const unsubs: (() => void)[] = []
  // MEDIUM-2, option A: typed tool-lifecycle events (tool.execute.before is NOT exposed to
  // TUI plugins on this runtime — verified installed SDK v2 Event union → HOST-LIMITED).
  for (const type of [
    "message.updated",
    "message.part.updated",
    "session.error",
    "session.idle",
    "permission.asked",
    "permission.replied",
    "session.next.tool.called",
    "session.next.tool.success",
    "session.next.tool.failed",
  ] as const) {
    try {
      unsubs.push(api.event.on(type, () => refresh()))
    } catch {
      // single subscription failure never breaks the others
    }
  }

  // R2-MED-02: ONE logical permissions watcher per host lifecycle, with bounded re-arm.
  // If the permissions directory is absent at init (or the watcher errors), a single
  // low-frequency timer (REARM_RETRY_MS) re-attempts setup until the dir appears. The
  // timer carries no data reads — one existsSync per attempt — and stops once armed.
  // watch() is only ever invoked while permsWatcher is null, so no watcher multiplication.
  const REARM_RETRY_MS = 5000
  let permsWatcher: ReturnType<typeof watch> | null = null
  let rearmTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let loggedUnavailable = false

  const armPermsWatcher = (): void => {
    if (disposed || permsWatcher !== null) return
    try {
      const permsDir = join(root, ".opencode/ai/permissions")
      if (!existsSync(permsDir)) throw new Error("permissions-dir-absent")
      permsWatcher = watch(permsDir, (_event, filename) => {
        if (!filename || String(filename) === "permission-decisions.jsonl") refresh()
      })
      permsWatcher.on("error", () => {
        try {
          permsWatcher?.close()
        } catch {
          // fail-open
        }
        permsWatcher = null
        scheduleRearm()
      })
      unsubs.push(() => {
        permsWatcher?.close()
        permsWatcher = null
      })
      logTui(root, { kind: "tui-security-watch", mode: "file-watch", target: ".opencode/ai/permissions/permission-decisions.jsonl" })
    } catch {
      if (!loggedUnavailable) {
        logTui(root, { kind: "tui-security-watch", mode: "unavailable", rearm: REARM_RETRY_MS })
        loggedUnavailable = true
      }
      scheduleRearm()
    }
  }

  const scheduleRearm = (): void => {
    if (disposed || rearmTimer !== null) return
    rearmTimer = setTimeout(() => {
      rearmTimer = null
      armPermsWatcher()
    }, REARM_RETRY_MS)
  }

  armPermsWatcher()

  refresh(true)
  api.lifecycle.onDispose(() => {
    disposed = true
    for (const u of unsubs) u()
    if (refreshTimer) clearTimeout(refreshTimer)
    if (rearmTimer) clearTimeout(rearmTimer)
  })

  // LOW-1: theme is re-read at each render via T() — the host exposes no theme-change
  // event in the TUI API (HOST-LIMITED for full reactivity), so colors update on every
  // re-render instead of being captured once at plugin init.
  const T = (): TuiThemeCurrent => api.theme.current

  // reactive renderer width: footer adapts to terminal resize (not only on data refresh)
  const [widthSig, setWidthSig] = createSignal(api.renderer?.width ?? 80)
  try {
    const onResize = () => setWidthSig(api.renderer.width)
    api.renderer.on("resize", onResize)
    unsubs.push(() => api.renderer.off("resize", onResize))
  } catch {
    // resize events optional; width then only refreshes on data updates
  }

  // side-channel acceptance telemetry: footer width per slot, logged on change only
  const lastFooterWidth: Record<string, number> = {}
  function logFooterRender(slot: string, width: number): void {
    if (lastFooterWidth[slot] === width) return
    lastFooterWidth[slot] = width
    logTui(root, { kind: "tui-footer-render", slot, width })
  }

  function renderLines(lines: Line[]) {
    return lines.map((l) => (
      <text fg={toneColor(T(), l.tone)}>{l.text}</text>
    ))
  }

  // ---- footer status (P0, always available) ----
  api.slots.register({
    slots: {
      session_prompt_right: (_ctx, props: { session_id: string }) => {
        // MEDIUM-1: session-specific fields are filtered by the host-supplied session id
        const v = vmForSession(props.session_id)
        if (!v) return <text fg={T().textMuted}>Smart Router · …</text>
        const width = Math.min(64, Math.max(24, widthSig() - 40))
        logFooterRender("session_prompt_right", width)
        return <box flexDirection="column">{renderLines(footerLines(v, width))}</box>
      },
      home_footer: () => {
        const v = vm()
        if (!v) return <text fg={T().textMuted}>Smart Router · …</text>
        const width = Math.min(72, widthSig())
        logFooterRender("home_footer", width)
        return <box flexDirection="column">{renderLines(footerLines(v, width))}</box>
      },
    },
  })

  // ---- dialog panels ----
  function openPanel(title: string, lines: (v: RouterViewModel) => Line[], size: "medium" | "large" | "xlarge" = "large"): void {
    logTui(root, { kind: "tui-dialog-open", title, size })
    api.ui.dialog.setSize(size)
    api.ui.dialog.replace(() => {
      const v = vm()
      if (!v) {
        return (
          <box padding={1} flexDirection="column">
            <text fg={T().textMuted}>Smart Router state unavailable — host continues normally.</text>
          </box>
        )
      }
      return (
        <box
          border
          borderStyle="single"
          borderColor={T().border}
          title={` ${title} `}
          titleColor={T().accent}
          padding={1}
          flexDirection="column"
        >
          <box flexDirection="column">{renderLines(lines(v))}</box>
        </box>
      )
    })
  }

  function openDashboard(): void {
    logTui(root, { kind: "tui-dialog-open", title: "SMART ROUTER", size: "xlarge" })
    api.ui.dialog.setSize("xlarge")
    api.ui.dialog.replace(() => {
      const v = vm()
      return (
        <box border borderStyle="single" borderColor={T().border} title=" SMART ROUTER " titleColor={T().accent} padding={1} flexDirection="column">
          {v ? (
            <box flexDirection="column">
              {renderLines(dashboardLines(v).slice(0, 16))}
              <text fg={T().textMuted}>{""}</text>
              <text fg={T().accent}>▸ /router-explain — route explanation</text>
              <text fg={T().accent}>▸ /router-health — provider/model health</text>
              <text fg={T().accent}>▸ /router-shadow — shadow comparison</text>
              <text fg={T().accent}>▸ /router-evidence — evidence</text>
              <text fg={T().accent}>▸ /router-security — security</text>
              <text fg={T().textMuted}>V2.2 is shadow-only. All routing authority remains with V2.1.</text>
            </box>
          ) : (
            <text fg={T().textMuted}>Smart Router state unavailable — host continues normally.</text>
          )}
        </box>
      )
    })
  }

  function openExplain(): void {
    openPanel("ROUTE EXPLANATION", (v) => [
      ...taskLines(v),
      { text: "", tone: "muted" },
      ...routeLines(v),
      { text: "", tone: "muted" },
      ...candidateLines(v),
      { text: "", tone: "muted" },
      ...hysteresisLines(v),
      { text: "", tone: "muted" },
      ...evaluationLines(v),
      { text: "", tone: "muted" },
      ...fallbackLines(v),
    ], "xlarge")
  }

  function openHealth(): void {
    openPanel("PROVIDER / MODEL HEALTH", (v) => [...healthLines(v), { text: "", tone: "muted" }, ...capabilityLines(v)])
  }

  function openShadow(): void {
    openPanel("SHADOW COMPARISON", (v) => [
      { text: `V2.1 ACTUAL          ${v.actual ?? "UNKNOWN"}`, tone: "default" },
      { text: `V2.2 HYPOTHETICAL    ${v.shadow ?? "UNKNOWN"}${v.selectedTier ? `  [${v.selectedTier}]` : ""}`, tone: v.divergent ? "warning" : "muted" },
      { text: `Divergence           ${v.divergent === true ? "YES" : v.divergent === false ? "NO" : "—"}`, tone: v.divergent ? "warning" : "success" },
      { text: `Driver               ${v.shadowReason ?? "—"}`, tone: "muted" },
      { text: "Would dispatch       NO (shadow only)", tone: "success" },
      { text: `Counterfactual       ${v.divergent ? "UNKNOWN" : "N/A (same route)"}`, tone: "muted" },
      { text: "", tone: "muted" },
      { text: `Influence            ${v.influence}   Promotion NOT AUTHORIZED`, tone: "warning" },
    ])
  }

  function openEvidence(): void {
    openPanel("EVIDENCE", (v) => [...evidenceLines(v), { text: "", tone: "muted" }, ...latencyCostLines(v), { text: "", tone: "muted" }, ...promotionLines(v)], "xlarge")
  }

  function openSecurity(): void {
    openPanel("SECURITY", (v) => securityLines(v))
  }

  function openFallback(): void {
    openPanel("FALLBACK / ESCALATION", (v) => fallbackLines(v))
  }

  function openStatus(): void {
    openPanel("STATUS", (v) => [...taskLines(v), { text: "", tone: "muted" }, ...routeLines(v), { text: "", tone: "muted" }, ...evaluationLines(v)])
  }

  // ---- slash commands (legacy TuiCommand surface — supported on this runtime) ----
  const commands = [
    { title: "Smart Router dashboard", value: "smart-router.dashboard", slash: { name: "router" }, onSelect: () => exec("router", openDashboard) },
    { title: "Smart Router status", value: "smart-router.status", slash: { name: "router-status" }, onSelect: () => exec("router-status", openStatus) },
    { title: "Explain current route", value: "smart-router.explain", slash: { name: "router-explain" }, onSelect: () => exec("router-explain", openExplain) },
    { title: "Provider / model health", value: "smart-router.health", slash: { name: "router-health" }, onSelect: () => exec("router-health", openHealth) },
    { title: "Shadow comparison", value: "smart-router.shadow", slash: { name: "router-shadow" }, onSelect: () => exec("router-shadow", openShadow) },
    { title: "Evidence", value: "smart-router.evidence", slash: { name: "router-evidence" }, onSelect: () => exec("router-evidence", openEvidence) },
    { title: "Security", value: "smart-router.security", slash: { name: "router-security" }, onSelect: () => exec("router-security", openSecurity) },
  ]
  function exec(slashName: string, open: () => void): void {
    logTui(root, { kind: "tui-command-execute", command: slashName })
    refresh(true)
    open()
  }
  try {
    api.command?.register(() =>
      commands.map((c) => ({ ...c, description: "Read-only Smart Router observability", category: "Smart Router" })),
    )
  } catch {
    // command registration is optional; footer still works
  }
}

export const SmartRouterTui: TuiPluginModule = {
  id: "smart-router-tui",
  tui: SmartRouterTuiPlugin,
}

export default SmartRouterTui
