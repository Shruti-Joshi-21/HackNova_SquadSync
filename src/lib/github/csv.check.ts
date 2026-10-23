import { parseTasksCsv } from "./csv";
import type { Person } from "../types";

const people: Person[] = [
  {
    id: "p1",
    displayName: "Member A",
    githubLogin: "jdoe",
    taskAssignee: "jdoe",
    role: "code",
    colorIndex: 0,
  },
];

const csv = `title,assignee,status,created,done,due,points
Set up auth routes,jdoe,In Progress,2026-09-10,,2026-09-20,3
"Write onboarding docs, v1",jdoe,Done,2026-09-08,2026-09-15,,2
,jdoe,To Do,2026-09-10,,,1`;

const result = parseTasksCsv(csv, people);

console.assert(result.tasks.length === 2, "expected 2 valid tasks, got " + result.tasks.length);
console.assert(result.skipped.length === 1, "expected 1 skipped row, got " + result.skipped.length);
console.assert(result.tasks[0].assignee === "p1", "expected assignee matched to p1");
console.assert(result.tasks[0].status === "in_progress", "expected status in_progress");
console.assert(result.tasks[1].title === "Write onboarding docs, v1", "expected quoted comma preserved");
console.assert(result.tasks[1].status === "done", "expected status done");

console.log("csv.ts checks passed");