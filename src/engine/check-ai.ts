// npx tsx src/engine/check-ai.ts
// Checks that code rejects bad AI answers, using a fake model (no key needed).

import type { Complete } from "../lib/llm";
import { aiTaskLinks, analyzeWithAi, checkSentence, wordRisks } from "./ai";
import { loadSnapshot } from "./cli";
import { analyze } from "./index";
import { normalize } from "./normalize";

let failures = 0;
function expect(ok: boolean, label: string): void {
  console.log(`  [${ok ? "x" : " "}] ${label}`);
  if (!ok) failures++;
}

async function main() {
  const nexus = analyze(loadSnapshot("nexus"));
  const names = nexus.team.people.map((p) => p.displayName);
  const pr31 = nexus.risks.find((r) => r.id === "late_integration-pr-31")!;
  const workload = nexus.risks.find((r) => r.id === "workload_imbalance-p1")!;

  console.log("\nSentence checks");
  expect(checkSentence("PR #31 by Member B has been open for 9 days and has 1,240 changed lines.", pr31, names), "accepts a sentence with only evidence numbers");
  expect(!checkSentence("PR #31 by Member B has been open for 12 days and has 1,240 changed lines.", pr31, names), "rejects an invented number (12 days)");
  expect(!checkSentence("PR #31 is old. Member B should merge it soon.", pr31, names), "rejects two sentences");
  expect(!checkSentence("PR #31 by Member D has been open for 9 days.", pr31, names), "rejects a person not in the evidence");
  expect(!checkSentence("PR #31 has been open for 9 days!", pr31, names), "rejects an exclamation mark");
  expect(checkSentence("Member A finished 46% of the team's tasks, well above the even share of 25%.", workload, names), "accepts numbers from the template");

  console.log("\nWording with a fake model");
  const fake: Complete = async () => JSON.stringify({
    sentences: {
      "late_integration-pr-31": "PR #31 by Member B has stayed open for 9 days with 1,240 changed lines, so merging it gets harder.",
      "workload_imbalance-p1": "Member A finished 90% of the tasks.",
      "not-a-risk": "Ignored.",
    },
  });
  const worded = await wordRisks(nexus, fake);
  const w31 = worded.risks.find((r) => r.id === pr31.id)!;
  const wA = worded.risks.find((r) => r.id === workload.id)!;
  expect(w31.summarySource === "ai" && w31.summary.includes("stayed open"), "good sentence is used and tagged ai");
  expect(wA.summarySource === "template" && wA.summary === workload.summary, "invented 90% falls back to the template");
  expect(worded.risks.filter((r) => r.summarySource === "ai").length === 1, "risks the model skipped keep their template");

  const broken: Complete = async () => "not json at all";
  const none: Complete = async () => null;
  expect((await wordRisks(nexus, broken)).risks.every((r) => r.summarySource === "template"), "broken JSON keeps every template");
  expect((await wordRisks(nexus, none)).risks.every((r) => r.summarySource === "template"), "no answer (no key, timeout) keeps every template");

  console.log("\nTask matching with a fake model");
  const snap = normalize(loadSnapshot("nexus"));
  // A task whose id no branch, PR title or commit mentions, as on many real boards.
  const t = { ...snap.tasks.find((x) => x.status !== "todo")!, id: "NEX-777" };
  const original = snap.tasks.find((x) => x.status !== "todo")!.id;
  // An open PR by the task's own assignee, plus one by someone else.
  const open = snap.pullRequests.filter((p) => p.state === "open" && p.author === t.assignee);
  const other = snap.pullRequests.find((p) => p.state === "open" && p.author !== t.assignee)!;
  // Make one task and one PR look unlinked, as on a live repo.
  const s2 = {
    ...snap,
    tasks: snap.tasks.map((x) => (x.id === original ? { ...x, id: t.id, linkedPRs: [], linkSource: "none" as const, linkConfidence: 0 } : x)),
    pullRequests: snap.pullRequests.map((p) => (p.number === open[0].number ? { ...p, taskIds: [] } : p)),
  };
  const matcher: Complete = async () => JSON.stringify({
    links: [
      { taskId: t.id, prNumber: open[0].number, confidence: 0.82 },
      { taskId: "NEX-999", prNumber: open[0].number, confidence: 0.9 },
      { taskId: t.id, prNumber: 9999, confidence: 0.9 },
      { taskId: t.id, prNumber: open[0].number, confidence: 0.5 },
    ],
  });
  const links = await aiTaskLinks(s2, matcher);
  expect(links.length === 1 && links[0].confidence === 0.82, "keeps the one valid link, drops unknown ids and low confidence");
  const s3 = { ...s2, pullRequests: s2.pullRequests.map((p) => (p.number === other.number ? { ...p, taskIds: [] } : p)) };
  const cross: Complete = async () => JSON.stringify({ links: [{ taskId: t.id, prNumber: other.number, confidence: 0.95 }] });
  expect((await aiTaskLinks(s3, cross)).length === 0, "a link to a PR by someone other than the assignee is dropped");
  const low: Complete = async () => JSON.stringify({ links: [{ taskId: t.id, prNumber: open[0].number, confidence: 0.6 }] });
  expect((await aiTaskLinks(s2, low)).length === 0, "0.6 exactly is not used (must be above 0.6)");
  const out = await analyzeWithAi(s2, matcher, { match: true });
  const linked = out.snapshot.tasks.find((x) => x.id === t.id)!;
  expect(linked.linkSource === "ai" && linked.linkConfidence === 0.82 && linked.linkedPRs.includes(open[0].number), "the task is linked with linkSource ai and its confidence");

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll AI checks pass.");
}

main();
