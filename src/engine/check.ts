// npx tsx src/engine/check.ts
// Asserts that the engine finds the planted story in each synthetic team.

import type { Analysis } from "../lib/types";
import { loadSnapshot } from "./cli";
import { analyze } from "./index";

let failures = 0;
function expect(ok: boolean, label: string): void {
  console.log(`  [${ok ? "x" : " "}] ${label}`);
  if (!ok) failures++;
}

const CONFLICT_KINDS = ["same_file_overlap", "same_line_overlap", "pr_conflicting", "modify_delete_conflict", "add_add_conflict", "lockfile_overlap"];

const has = (a: Analysis, kind: string, personId?: string) =>
  a.risks.some((r) => r.kind === kind && (!personId || r.people.includes(personId)));

const teams = Object.fromEntries(
  ["nexus", "atlas", "orbit", "zenith"].map((id) => [id, analyze(loadSnapshot(id))]),
) as Record<string, Analysis>;

for (const a of Object.values(teams)) {
  console.log(`\n${a.team.name}: ${a.verdict}, ${a.risks.length} risks`);
  for (const r of a.risks) {
    const words = r.title.split(/\s+/).length;
    if (!r.rule || r.evidence.length === 0 || !r.action || !r.summary || words > 8 || !r.firstDetectableAt) {
      expect(false, `risk ${r.id} has rule, evidence, action, summary and a title of 8 words or fewer`);
    }
    if (/commit count|more commits|fewer commits|commits than/i.test(`${r.title} ${r.summary}`)) {
      expect(false, `risk ${r.id} does not compare people by commits`);
    }
  }
  for (const r of a.risks) {
    if (CONFLICT_KINDS.includes(r.kind) && !r.confidence) expect(false, `conflict risk ${r.id} has a confidence`);
    const sc = r.scene;
    if (!sc) continue;
    const lanes = new Set(sc.lanes.map((l) => l.id));
    const nodes = new Set(sc.nodes.map((n) => n.id));
    const ok =
      sc.nodes.every((n) => lanes.has(n.lane) && n.step >= 1 && n.step <= sc.steps && n.slot >= 0 && n.slot <= 10) &&
      sc.edges.every((e) => nodes.has(e.from) && nodes.has(e.to) && e.step <= sc.steps) &&
      nodes.size === sc.nodes.length && sc.lanes[sc.lanes.length - 1].kind === "main" && sc.caption.length > 0;
    if (!ok) expect(false, `scene of ${r.id} is well formed`);
  }
  const total = a.shares.reduce((s, x) => s + x.composite, 0);
  expect(Math.abs(total - 1) < 0.001, `combined shares add up to 100% (${(total * 100).toFixed(1)}%)`);
  const sorted = a.risks.every((r, i) => i === 0 || ["high", "medium", "low"].indexOf(a.risks[i - 1].severity) <= ["high", "medium", "low"].indexOf(r.severity));
  expect(sorted, "risks are sorted by severity");
}

const nexus = teams.nexus;
console.log("\nNexus");
expect(has(nexus, "workload_imbalance", "p1"), "workload risk on Member A");
expect(has(nexus, "review_gap", "p3"), "review gap on Member C");
expect(has(nexus, "late_integration"), "late-integration risk");
expect(nexus.verdict === "slipping" || nexus.verdict === "at_risk", `verdict slipping or at_risk (${nexus.verdict})`);
expect(nexus.notFlagged.some((n) => n.personId === "p4"), "Member D is in notFlagged");
expect(!has(nexus, "workload_imbalance", "p4") && !nexus.shares.find((s) => s.personId === "p4")!.flagged, "Member D is not flagged for workload");
expect(nexus.reviews.mergedWithoutReview.length === 3, "3 PRs merged without review");
expect(Math.abs(nexus.lateMergeShare - 0.58) < 0.01, "late merge share about 58%");
expect(nexus.risks.some((r) => r.id === "late_integration-pr-31"), "PR #31 flagged as old");

console.log("\nNexus conflict radar");
const routes = nexus.risks.find((r) => r.kind === "same_line_overlap" && r.evidence.some((e) => e.value.includes("routes.js")));
expect(!!routes, "likely same-line overlap on routes.js");
expect(routes?.confidence === "likely" && !!routes.scene && routes.scene.nodes.some((n) => n.state === "conflict"), "it is likely and its scene ends in a conflict node");
expect(routes?.people.includes("p1") === true && routes.people.includes("p3"), "it names Member A and Member C");
expect(has(nexus, "modify_delete_conflict"), "modify_delete_conflict on apiClient.js");
expect(has(nexus, "lockfile_overlap"), "lockfile_overlap");
expect(has(nexus, "direct_push_to_main"), "direct_push_to_main");
expect(nexus.risks.some((r) => r.kind === "branch_drift" && r.evidence.some((e) => e.value === "14")), "branch_drift at 14 behind");
expect(has(nexus, "stale_branch"), "stale branch for the task with no push for 6 days");
expect(["late_integration-share", "review_gap-unreviewed"].every((id) => !!nexus.risks.find((r) => r.id === id)?.scene), "late merge and no-review risks have scenes");
expect(nexus.risks.every((r) => /^[a-z0-9_-]+$/i.test(r.id) && r.id.length <= 48), "risk ids are short and URL-safe");
expect(new Set(nexus.risks.map((r) => r.id)).size === nexus.risks.length, "no duplicate risks");

console.log("\nAtlas");
expect(teams.atlas.risks.every((r) => r.severity !== "high"), "no high risks");
expect(!teams.atlas.risks.some((r) => ["same_line_overlap", "pr_conflicting", "modify_delete_conflict", "add_add_conflict"].includes(r.kind)), "none of the high-severity conflict kinds");
expect(teams.atlas.verdict === "on_track", `verdict on_track (${teams.atlas.verdict})`);

console.log("\nOrbit");
expect(has(teams.orbit, "workload_imbalance"), "workload risk");
expect(has(teams.orbit, "workload_imbalance", "p1"), "workload risk on Member A");

console.log("\nZenith");
expect(has(teams.zenith, "late_integration"), "late-integration risk");

console.log("\nReplay");
const early = analyze(loadSnapshot("nexus"), { asOf: "2026-10-01T12:00:00Z" });
expect(early.asOf === "2026-10-01T12:00:00Z", "asOf is honoured");
expect(!has(early, "late_integration", undefined) || early.lateMergeShare < nexus.lateMergeShare, "the late burst is not there on 1 Oct");
expect(early.schedule.tasksDone < nexus.schedule.tasksDone, "fewer tasks done on 1 Oct");
const first = nexus.risks.find((r) => r.id === "workload_imbalance-p1")!;
expect(first.firstDetectableAt < nexus.asOf, `Member A's workload was detectable before today (${first.firstDetectableAt.slice(0, 10)})`);
const atFirst = analyze(loadSnapshot("nexus"), { asOf: first.firstDetectableAt });
expect(has(atFirst, "workload_imbalance", "p1"), "replay on that date shows the same risk");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll engine checks pass.");
