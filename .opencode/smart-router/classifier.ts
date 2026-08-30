// Smart Router v2 — Stage-1 deterministic heuristic classifier (directive #93).
// No LLM call: cheap keyword/regex scoring over the task taxonomy (directive #8).
// Stage-2 (reasoning classifier) is a documented escalation path, not implemented inline —
// in OpenCode 1.18.23 the plugin API exposes no request-time model mutation, so ambiguous
// prompts are surfaced via /router explain and /auto dispatch instead (directive #26, #61).

import type { TaskClassification, TaskLabel, Complexity, ContextDemand, ReasoningDemand, Confidence, Modality } from "./types.ts"

interface ClassRule {
  cls: string
  labels: TaskLabel[]
  patterns: RegExp[]
  modality?: Modality
}

// Order matters: first strong match wins (priority = security > vision > architecture > ... > crud).
const RULES: ClassRule[] = [
  { cls: "security-review", labels: ["security", "code-review"], patterns: [/\b(security|vulnerab\w*|owasp|xss|sqli|threat model|secret leak|credential leak|pentest|hardening)\b/i] },
  { cls: "vision-task", labels: ["research"], patterns: [/\b(image|screenshot|photo|picture|\.png|\.jpe?g|visual inspect|look at this (mock|design))\b/i], modality: "vision" },
  { cls: "architecture-analysis", labels: ["architecture", "research"], patterns: [/\b(architecture|architectural|re-?structure|system design|design system|scal(e|ing) strategy|module boundaries|cross-system integration)\b/i] },
  { cls: "deep-research", labels: ["research"], patterns: [/\b(deep research|investigat|state of the art|comparative (analysis|study)|literature|feasibility study)\b/i] },
  { cls: "repo-research", labels: ["research"], patterns: [/\b(explore (the )?(repo|codebase)|understand (the )?codebase|map (the )?(code|repo)|where is .* implemented|how does .* work in this (repo|codebase))\b/i] },
  { cls: "complex-debugging", labels: ["debugging"], patterns: [/\b(debug|root cause|stack trace|intermittent|heisenbug|why (does|is).*(fail|broken)|regression hunt|race condition|memory leak)\b/i] },
  { cls: "deep-review", labels: ["code-review", "security"], patterns: [/\b(thorough review|adversarial review|blocker review|pre-merge deep review|audit this (diff|pr|change))\b/i] },
  { cls: "routine-review", labels: ["code-review"], patterns: [/\b(quick review|review (this|the) (diff|pr|patch|implementation|code|changes)|code review|check my (diff|pr))\b/i] },
  { cls: "react-next-architecture", labels: ["frontend", "architecture"], patterns: [/\b(react (architecture|patterns)|next\.?js architecture|state management (architecture|choice|strategy)|component architecture|design tokens strategy)\b/i] },
  { cls: "ui-implementation", labels: ["frontend", "coding"], patterns: [/\b(implement (the )?(ui|component|page|screen)|tailwind|css|styling|responsive|accessibility fix|layout|design to code)\b/i] },
  { cls: "orchestration", labels: ["orchestration"], patterns: [/\b(orchestrat|delegate to (sub)?agent|dispatch (the )?(task|work)|multi-agent|parallel agents)\b/i] },
  { cls: "deployment", labels: ["deployment", "infrastructure"], patterns: [/\b(deploy|deployment|ci\/cd|github actions|dockeri[sz]e|release pipeline|vercel|netlify)\b/i] },
  { cls: "database", labels: ["database"], patterns: [/\b(migration|schema (change|design|migration)|sql|index (strategy|optimi[sz]ation)|database (design|refactor))\b/i] },
  { cls: "performance", labels: ["performance"], patterns: [/\b(performance|optimi[sz]e|bundle size|lighthouse|latency|memory usage|slow (page|build|query))\b/i] },
  { cls: "testing", labels: ["testing"], patterns: [/\b(write (unit )?tests?|test coverage|vitest|jest|e2e test|playwright|test plan)\b/i] },
  { cls: "crud-simple", labels: ["simple", "coding"], patterns: [/\b(typo|rename (this|the)|change (the )?(string|text|copy|color)|update (the )?readme (line|link)|small (tweak|fix|change)|simple (change|edit)|bump version|format(ting)? only)\b/i] },
  { cls: "documentation", labels: ["documentation"], patterns: [/\b(document(ation)?|readme|jsdoc|api docs|changelog|adr)\b/i] },
  { cls: "tooling", labels: ["tooling"], patterns: [/\b(cli tool|eslint config|script for|automation script|build tooling|husky|prettier config)\b/i] },
  { cls: "standard-coding", labels: ["coding"], patterns: [/\b(implement|add (a |an )?(feature|function|endpoint|component)|refactor|fix (the |this )?(bug|error|issue)|write (a )?(function|module|class)|api endpoint|integrat)\b/i] },
]

const COMPLEXITY_HIGH = /\b(migration|security|authentication|auth(oriz|entic)ation|payment|breaking change|multi-?module|cross-cutting|whole (codebase|repo)|across (all|many) (files|modules)|critical path)\b/i
const COMPLEXITY_TRIVIAL = /\b(typo|rename|format only|small tweak|copy change|one[- ]line|comment only)\b/i
const CONTEXT_LARGE = /\b(whole (repo|codebase|project)|across (the )?(entire )?(repo|codebase)|every page|all (routes|pages|modules)|global refactor)\b/i
const CONTEXT_SMALL = /\b(single file|this file only|one file|this function|this component only)\b/i

export interface ClassifyOverrides {
  taskType?: string
  complexity?: "low" | "medium" | "high"
  modality?: Modality
  latencyPreference?: "normal" | "speed"
  qualityPreference?: "normal" | "max"
}

export function classify(prompt: string, overrides: ClassifyOverrides = {}): TaskClassification {
  const text = String(prompt ?? "")
  const signals: string[] = []

  let matched: ClassRule | null = null
  const labels = new Set<TaskLabel>()
  for (const rule of RULES) {
    const hit = rule.patterns.some((re) => re.test(text))
    if (hit) {
      if (!matched) matched = rule
      for (const l of rule.labels) labels.add(l)
    }
  }

  if (overrides.taskType) {
    // explicit override wins (CLI/parity with the legacy -TaskType parameter)
    matched = RULES.find((r) => r.cls === overrides.taskType) ?? null
    if (!matched) {
      // unknown explicit class degrades to standard-coding with a "defaulted" signal (baseline behavior)
      matched = RULES.find((r) => r.cls === "standard-coding") ?? null
      if (matched) signals.push(`unknown task class '${overrides.taskType}' -> defaulted to 'standard-coding'`)
    }
    labels.clear()
    if (matched) for (const l of matched.labels) labels.add(l)
  }

  const taskType: TaskLabel[] = matched ? [...matched.labels] : ["unknown", "coding"]
  const matchedTaskClass = matched ? matched.cls : "standard-coding"
  if (!matched) signals.push("no strong match -> defaulted to 'standard-coding'")

  const modality: Modality = overrides.modality ?? matched?.modality ?? "text"

  let complexity: Complexity = "medium"
  if (COMPLEXITY_TRIVIAL.test(text) && !COMPLEXITY_HIGH.test(text)) complexity = "low"
  if (COMPLEXITY_HIGH.test(text)) complexity = "high"
  if (labels.size >= 2 && COMPLEXITY_HIGH.test(text)) complexity = "very_high"
  if (overrides.complexity) {
    complexity = overrides.complexity
    signals.push(`complexity override: ${overrides.complexity}`)
  }

  let contextDemand: ContextDemand = "medium"
  if (CONTEXT_LARGE.test(text)) contextDemand = "large"
  if (CONTEXT_SMALL.test(text)) contextDemand = "small"

  const reasoningDemand: ReasoningDemand =
    ["security-review", "architecture-analysis", "deep-research", "complex-debugging", "deep-review"].includes(matchedTaskClass)
      ? "max"
      : ["repo-research", "react-next-architecture", "orchestration"].includes(matchedTaskClass)
        ? "high"
        : matchedTaskClass === "crud-simple" || matchedTaskClass === "documentation" || matchedTaskClass === "latency-sensitive"
          ? "low"
          : "medium"

  const confidence: Confidence = matched && matched.cls !== "standard-coding" ? "high" : matched ? "medium" : "low"

  return { taskType, matchedTaskClass, complexity, contextDemand, reasoningDemand, modality, confidence, signals }
}
