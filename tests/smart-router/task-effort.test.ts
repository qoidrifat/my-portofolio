// Task-effort matrix unit tests — reasoning effort dipetakan dari task class.
// Downgrade-only: task rutin diturunkan ke 'high' (hemat + lebih cepat); task berat
// memakai effort session (max). null = biarkan effort session tanpa perubahan.
import { describe, expect, it } from "vitest"
import { effortForTaskClass } from "../../.opencode/smart-router/v22/task-effort.ts"

describe("task-effort matrix", () => {
  it("routine high-throughput tasks downgrade to 'high'", () => {
    for (const cls of ["crud-simple", "documentation", "testing", "tooling", "latency-sensitive", "routine-review"]) {
      expect(effortForTaskClass(cls), cls).toBe("high")
    }
  })

  it("heavy/risk-carrying tasks keep the session effort (null = no override)", () => {
    for (const cls of [
      "standard-coding",
      "complex-implementation",
      "ui-implementation",
      "react-next-architecture",
      "deep-review",
      "security-review",
      "complex-debugging",
      "architecture-analysis",
      "database",
      "performance",
      "deployment",
      "orchestration",
      "repo-research",
      "deep-research",
    ]) {
      expect(effortForTaskClass(cls), cls).toBeNull()
    }
  })

  it("unknown class: null (fail-open, never guesses effort)", () => {
    expect(effortForTaskClass("totally-unknown")).toBeNull()
    expect(effortForTaskClass("")).toBeNull()
  })
})
