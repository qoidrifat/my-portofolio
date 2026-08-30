// schema-check.mjs — structural checks over the revised design docs (design-stage schema gate)
// Run: node .opencode/ai/verification/v22-design/schema-check.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const docs = (f) => readFileSync(join(here, "..", "..", "..", "..", "docs", "smart-router", f), "utf8");
const seg = (text, start, end) => {
  const i = text.indexOf(start);
  assert.ok(i >= 0, `section found: ${start}`);
  const j = end ? text.indexOf(end, i) : text.length;
  return j > i ? text.slice(i, j) : text.slice(i);
};

// EVIDENCE_CONTRACT: exactly 20 canonical fields, 9 attribute columns, 3 statuses
{
  const t = docs("SMART_ROUTER_V2_2_EVIDENCE_CONTRACT.md");
  const table = seg(t, "| 1 | sessionId", "## 3. Statuses");
  const rows = table.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.replace(/\\\|/g, " slash-pipe "));
  assert.equal(rows.length, 20, `20 canonical fields, got ${rows.length}`);
  for (const r of rows) {
    const cols = r.split("|").filter((c) => c.trim() !== "").length;
    assert.equal(cols, 11, `row ${r.slice(0, 20)}: 11 columns (# + field + 9 attrs), got ${cols}`);
  }
  for (const s of ["VERIFIED", "PARTIAL", "UNKNOWN"]) assert.ok(t.includes(s), `status ${s}`);
  assert.ok(t.includes("REQUIRES HUMAN APPROVAL"), "calibration defers to human approval");
  assert.ok(t.includes("no model-quality / health / ranking update"), "attribution invariant present");
}

// INSTRUMENTATION_SPEC: 5 events, fail-open, retention, storage path
{
  const t = docs("SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md");
  for (const e of ["T1", "T2", "T3", "T4", "T5"])
    assert.ok(t.includes(`### ${e} —`), `event ${e} defined`);
  assert.ok(t.includes("OBSERVATIONAL ONLY"), "observational banner");
  assert.ok(t.includes("FAIL-OPEN"), "fail-open");
  assert.ok(t.includes("30 days"), "retention 30d");
  assert.ok(t.includes(".opencode/ai/telemetry/v22/"), "telemetry path");
  assert.ok(t.includes("never substitute harness duration_ms"), "latency no-substitution rule");
}

// REPLAY_CONTRACT: ReplayRecord, null+reason, counterfactual, shadow guarantees, coverage approvals
{
  const t = docs("SMART_ROUTER_V2_2_REPLAY_CONTRACT.md");
  assert.ok(t.includes("ReplayRecord"), "ReplayRecord schema");
  assert.ok(t.includes("null` **+ explicit reason**"), "null+reason rule");
  assert.ok(t.includes("MUST NOT claim the alternative would have succeeded"), "counterfactual safety");
  for (const g of ["zero production influence", "zero permission influence", "zero breaker mutation", "zero model dispatch"])
    assert.ok(t.includes(g), `shadow guarantee: ${g}`);
  const approvals = (t.match(/REQUIRES HUMAN APPROVAL/g) || []).length;
  assert.ok(approvals >= 6, `coverage gates require human approval, got ${approvals}`);
  assert.ok(t.includes("OBSERVED"), "outcome labels present");
  assert.ok(t.includes("ESTIMATED") && t.includes("UNKNOWN"), "outcome labels complete");
}

// OBSERVABILITY: envelope JSON parses; correlation IDs; latency windows; T1-T5 ref
{
  const t = docs("SMART_ROUTER_V2_2_OBSERVABILITY_DESIGN.md");
  const m = t.match(/```json\n([\s\S]*?)```/);
  assert.ok(m, "envelope json block");
  const env = JSON.parse(m[1]);
  for (const k of ["schemaVersion", "event", "timestamp", "sessionId", "routeId", "decisionId", "attempt"])
    assert.ok(k in env, `envelope key ${k}`);
  for (const id of ["executionId", "evaluationId"]) assert.ok(new RegExp(`${id}\\s+NEW:`).test(t), `correlation id ${id}`);
  for (const w of ["t0", "t1", "t2", "t3", "TTFR"]) assert.ok(t.includes(w), `latency window ${w}`);
  assert.ok(t.includes("EXCLUDED from latencyFit"), "harness duration excluded");
  assert.ok(t.includes("T1–T5"), "instrumentation ref");
}

// SECURITY_BOUNDARY: I-001..I-021 complete, in order
{
  const t = docs("SMART_ROUTER_V2_2_SECURITY_BOUNDARY.md");
  for (let i = 1; i <= 21; i++) {
    const tag = `I-${String(i).padStart(3, "0")}`;
    assert.ok(t.includes(tag), `invariant ${tag}`);
  }
}

// ADR: 011..020 present, ordered, before section 12
{
  const t = docs("SMART_ROUTER_V2_2_ADR.md");
  const sec12 = t.indexOf("## 12. Final Questions");
  assert.ok(sec12 > 0, "section 12 exists");
  let pos = 0;
  for (let i = 11; i <= 20; i++) {
    const tag = `## ADR-${String(i).padStart(3, "0")}`;
    const p = t.indexOf(tag);
    assert.ok(p > pos, `${tag} present and ordered`);
    assert.ok(p < sec12, `${tag} before section 12`);
    pos = p;
  }
}

// GATE: verdict + G1..G14
{
  const t = docs("SMART_ROUTER_V2_2_IMPLEMENTATION_GATE.md");
  assert.ok(t.includes("## VERDICT: NOT AUTHORIZED"), "verdict");
  for (let i = 1; i <= 14; i++) assert.ok(t.includes(`| G${i} |`), `gate G${i}`);
}

// ARCHITECTURE: authority hierarchy
{
  const t = docs("SMART_ROUTER_V2_2_ARCHITECTURE.md");
  const h = seg(t, "### 6.0", "### 6.1");
  for (const d of ["SECURITY_BOUNDARY", "ROUTING_MODEL", "DECISION_MATRIX", "EVIDENCE_CONTRACT", "OBSERVABILITY_DESIGN", "ADR"])
    assert.ok(h.includes(d), `authority list: ${d}`);
  assert.ok(h.indexOf("SECURITY_BOUNDARY") < h.indexOf("ROUTING_MODEL"), "SECURITY_BOUNDARY tops hierarchy");
}

// EVALUATION_DESIGN: attribution chain + 3-way outcomes + variant key
{
  const t = docs("SMART_ROUTER_V2_2_EVALUATION_DESIGN.md");
  const c = seg(t, "### 3.1", "## 4");
  assert.ok(c.includes("sessionId → routeId → executionId → candidate"), "chain");
  assert.ok(c.includes("MUST NOT update model quality"), "incomplete → no update");
  for (const o of ["Execution", "Quality", "Environment"]) assert.ok(c.includes(o), `outcome class ${o}`);
  assert.ok(t.includes("(provider, model, variant)"), "variant-level primary key");
}

console.log("schema-check: PASS (20 fields, T1-T5, ReplayRecord, envelope, I-001..021, ADR-011..020, G1-G14, hierarchy, attribution)");
