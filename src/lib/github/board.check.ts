// npx tsx src/lib/github/board.check.ts
// Checks the task CSV wrapper on a messy board export, then runs the engine on it.

import { readFileSync } from "node:fs";
import { analyze } from "../../engine";
import type { RepoSnapshot } from "../types";
import { applyTasksCsv, matchName } from "./board";

let failures = 0;
function expect(ok: boolean, label: string): void {
  console.log(`  [${ok ? "x" : " "}] ${label}`);
  if (!ok) failures++;
}

const nexus = JSON.parse(readFileSync("data/snapshots/nexus.json", "utf8")) as RepoSnapshot;
const people = nexus.team.people; // logins kestrel-dev, heron-codes, lynx-404, wren-draws

console.log("\nName matching");
expect(matchName("Kestrel Dev", people) === "p1", '"Kestrel Dev" -> kestrel-dev');
expect(matchName("heron", people) === "p2", '"heron" -> heron-codes');
expect(matchName("LYNX", people) === "p3", '"LYNX" -> lynx-404');
expect(matchName("Someone Else", people) === null, '"Someone Else" -> nobody (no guess)');
expect(matchName("dev", people) === null, '"dev" is too vague, nobody');

const csv = [
  "Title,Assignee,Status,Created,Done,Due,Points",
  "Search endpoint,Kestrel Dev,In Progress,2026-10-10,,2026-10-25,3",
  "\"Checkout, with coupons\",Heron,Done,2026-09-20,2026-10-20,,2",
  "Old task with no dates,lynx-404,Done,,,,",
  "Mystery work,Someone Else,To Do,2026-10-01,,,",
  ",Kestrel Dev,To Do,2026-10-01,,,",
  "Wireframes,Wren,Doing,,,2026-10-28,",
].join("\n");

console.log("\nApplying the CSV");
const { snapshot, warnings } = applyTasksCsv(nexus, csv);
for (const w of warnings) console.log(`      warning: ${w}`);
const byTitle = (t: string) => snapshot.tasks.find((x) => x.title === t)!;
expect(snapshot.tasks.length === 5, `5 tasks read, the blank title skipped (${snapshot.tasks.length})`);
expect(byTitle("Search endpoint").assignee === "p1" && byTitle("Search endpoint").status === "in_progress", "board name matched and status mapped");
expect(byTitle("Search endpoint").startedAt === byTitle("Search endpoint").createdAt, "work in progress gets a startedAt");
expect(byTitle("Checkout, with coupons").doneAt === "2026-10-20T00:00:00Z" && byTitle("Checkout, with coupons").points === 2, "quoted comma, done date and points kept");
expect(snapshot.tasks.every((t) => t.createdAt >= nexus.team.projectStart), "no 1970 placeholder dates");
expect(byTitle("Mystery work").assignee === null, "unknown person stays unassigned");
expect(warnings.some((w) => w.includes("Someone Else")), "unknown person is named in a warning");
expect(warnings.some((w) => w.includes("no done date")), "done without a date is warned about once");
expect(warnings.some((w) => w.includes("missing title")), "skipped row is reported");
expect(snapshot.pullRequests.every((p) => p.taskIds.length === 0), "old issue links are cleared from PRs");
expect(new Set(snapshot.tasks.map((t) => t.id)).size === snapshot.tasks.length, "task ids are unique");

console.log("\nEngine on the CSV snapshot");
const a = analyze(snapshot);
expect(a.schedule.tasksTotal === 3 + 2 + 1 + 1 + 1 && a.schedule.tasksDone === 3, `schedule counts points (total ${a.schedule.tasksTotal}, done ${a.schedule.tasksDone})`);
expect(a.risks.length > 0 && a.risks.every((r) => r.evidence.length > 0), `analysis runs (${a.risks.length} risks)`);

const empty = applyTasksCsv(nexus, "assignee,status\nKestrel,Done");
expect(empty.snapshot.tasks.length === 0 && empty.warnings.some((w) => w.includes("no title column")), "a CSV without a title column gives a clear warning");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll board checks pass.");
