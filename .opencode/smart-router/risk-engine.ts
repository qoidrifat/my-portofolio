// Smart Router v2 — risk engine (directive #12). Risk is INDEPENDENT of reasoning demand (#46, #47).

import type { RiskLevel, TaskClassification } from "./types.ts"

const CLASS_RISK: Record<string, RiskLevel> = {
  "crud-simple": "low",
  documentation: "low",
  "latency-sensitive": "low",
  tooling: "low",
  testing: "low",
  "standard-coding": "medium",
  "ui-implementation": "medium",
  "complex-implementation": "medium",
  performance: "medium",
  "routine-review": "medium",
  "repo-research": "medium",
  "deep-research": "medium",
  "vision-task": "medium",
  orchestration: "medium",
  "react-next-architecture": "high",
  "deep-review": "high",
  "complex-debugging": "high",
  "architecture-analysis": "high",
  database: "high",
  deployment: "high",
  "security-review": "critical",
}

const RISK_PROMPT = /\b(production|deploy to prod|live site|database migration|drop table|credentials|api key|secret|firewall|cloud|billing|payment|main branch)\b/i

export function assessTaskRisk(classification: TaskClassification, prompt: string): RiskLevel {
  let risk: RiskLevel = CLASS_RISK[classification.matchedTaskClass] ?? "medium"
  if (RISK_PROMPT.test(String(prompt ?? ""))) {
    risk = risk === "low" ? "medium" : risk === "medium" ? "high" : "critical"
  }
  return risk
}
