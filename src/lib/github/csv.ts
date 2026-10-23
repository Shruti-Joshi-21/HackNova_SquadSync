/**
 * Parses a CSV export of a task board (Jira, Trello, etc.) into Task objects.
 *
 * Pure function: no side effects, no imports beyond the data contract.
 * Columns, case-insensitive, any order: title, assignee, status, created,
 * done, due, points. Missing or unknown columns are tolerated.
 */

import type { Task, Person, TaskStatus } from "../types";

const STATUS_MAP: Record<string, TaskStatus> = {
  "to do": "todo",
  "todo": "todo",
  "backlog": "todo",
  "not started": "todo",
  "in progress": "in_progress",
  "doing": "in_progress",
  "in review": "in_review",
  "review": "in_review",
  "done": "done",
  "closed": "done",
  "complete": "done",
  "completed": "done",
};

/** Splits one CSV line into fields, respecting double-quoted values that
 * may contain commas or escaped quotes ("" inside a quoted field). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function parseStatus(value: string | undefined): TaskStatus | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return STATUS_MAP[key] ?? null;
}

function matchAssignee(value: string | undefined, people: Person[]): string | null {
  if (!value) return null;
  const name = value.trim().toLowerCase();
  if (!name) return null;
  const match = people.find(
    (p) =>
      (p.taskAssignee && p.taskAssignee.toLowerCase() === name) ||
      p.githubLogin.toLowerCase() === name
  );
  return match ? match.id : null;
}

export function parseTasksCsv(
  text: string,
  people: Person[]
): { tasks: Task[]; skipped: string[] } {
  const tasks: Task[] = [];
  const skipped: string[] = [];

  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { tasks, skipped };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);

  const idxTitle = colIndex("title");
  const idxAssignee = colIndex("assignee");
  const idxStatus = colIndex("status");
  const idxCreated = colIndex("created");
  const idxDone = colIndex("done");
  const idxDue = colIndex("due");
  const idxPoints = colIndex("points");

  if (idxTitle === -1) {
    skipped.push("header row has no title column, no rows read");
    return { tasks, skipped };
  }

  for (let row = 1; row < lines.length; row++) {
    const fields = splitCsvLine(lines[row]);
    const label = `row ${row}`;

    const title = fields[idxTitle]?.trim();
    if (!title) {
      skipped.push(`${label}: missing title`);
      continue;
    }

    const statusRaw = idxStatus !== -1 ? fields[idxStatus] : undefined;
    const status = parseStatus(statusRaw) ?? "todo";

    const createdAt =
      parseDate(idxCreated !== -1 ? fields[idxCreated] : undefined) ??
      "1970-01-01T00:00:00Z"; // placeholder when the board has no created date

    const doneAt = parseDate(idxDone !== -1 ? fields[idxDone] : undefined);
    const dueAt = parseDate(idxDue !== -1 ? fields[idxDue] : undefined);

    let points: number | undefined;
    if (idxPoints !== -1) {
      const raw = fields[idxPoints];
      const parsed = raw ? Number(raw) : NaN;
      points = isNaN(parsed) ? undefined : parsed;
    }

    const assignee = matchAssignee(
      idxAssignee !== -1 ? fields[idxAssignee] : undefined,
      people
    );

    const task: Task = {
      id: `csv-${row}`,
      title,
      assignee,
      status,
      createdAt,
      doneAt,
      dueAt,
      points,
      linkedPRs: [],
      linkSource: "none",
      linkConfidence: 0,
    };

    tasks.push(task);
  }

  return { tasks, skipped };
}

/*
Example rows (header, then two data rows):

title,assignee,status,created,done,due,points
Set up auth routes,jdoe,In Progress,2026-09-10,,2026-09-20,3
"Write onboarding docs, v1",asmith,Done,2026-09-08,2026-09-15,,2

A row with a missing title is skipped:
,jdoe,To Do,2026-09-10,,,1
*/