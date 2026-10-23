// A task board CSV (Jira, Trello export) as the snapshot's tasks.
// Parsing is Samiksha's parseTasksCsv (csv.ts); this file fits its output to
// the engine: real dates instead of the 1970 placeholder, startedAt for work in
// progress, unique ids, and board names matched to GitHub logins where it is clear.

import type { Person, RepoSnapshot, Task } from "../types";
import { parseTasksCsv } from "./csv";

export const MAX_CSV_CHARS = 500_000;
export const MAX_CSV_TASKS = 500;

const iso = (d: string | number) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Same quote rules as csv.ts, only to read back the raw assignee text. */
function fields(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur.trim()); cur = ""; } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * "Aarya Patil" -> the one person whose login is "aaryapatil", starts with
 * "aarya", or contains "patil". Only when exactly one person fits.
 */
export function matchName(name: string, people: Person[]): string | null {
  const full = norm(name);
  if (!full) return null;
  const parts = name.toLowerCase().split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  const hits = people.filter((p) => {
    const login = norm(p.githubLogin);
    const board = p.taskAssignee ? norm(p.taskAssignee) : "";
    return login === full || board === full || parts.some((part) => login.startsWith(part) || (part.length >= 4 && login.includes(part)));
  });
  return hits.length === 1 ? hits[0].id : null;
}

export function applyTasksCsv(s: RepoSnapshot, csv: string): { snapshot: RepoSnapshot; warnings: string[] } {
  const warnings: string[] = [];
  const { tasks: parsed, skipped } = parseTasksCsv(csv, s.team.people);
  for (const reason of skipped.slice(0, 10)) warnings.push(`CSV ${reason}.`);
  if (skipped.length > 10) warnings.push(`CSV: ${skipped.length - 10} more rows skipped.`);

  // Raw assignee text per row, to match names the parser could not.
  const lines = csv.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  const header = fields(lines[0] ?? "").map((h) => h.toLowerCase());
  const col = header.indexOf("assignee");
  const unmatched = new Set<string>();
  let doneNoDate = 0;
  let doneFuture = 0;

  const start = Date.parse(s.team.projectStart);
  const asOf = Date.parse(s.asOf);
  const clamp = (t: number) => Math.min(Math.max(t, start), asOf);

  const tasks: Task[] = parsed.slice(0, MAX_CSV_TASKS).map((t) => {
    const row = Number(t.id.split("-")[1]);
    let assignee = t.assignee;
    const raw = col >= 0 ? fields(lines[row] ?? "")[col] : "";
    if (!assignee && raw) {
      assignee = matchName(raw, s.team.people);
      if (!assignee) unmatched.add(raw);
    }
    // csv.ts uses 1970 when the board has no created date: use the earliest real date instead.
    const created = Date.parse(t.createdAt);
    const known = [t.doneAt, t.dueAt].filter((d): d is string => Boolean(d)).map(Date.parse);
    const createdAt = created > 0 ? created : Math.min(start, ...known);
    const out: Task = {
      id: t.id,
      title: t.title,
      assignee,
      status: t.status,
      createdAt: iso(clamp(createdAt)),
      linkedPRs: [],
      linkSource: "none",
      linkConfidence: 0,
    };
    // Boards rarely export a start date; creation is the closest we have.
    if (t.status !== "todo") out.startedAt = out.createdAt;
    if (t.doneAt) {
      // A date up to 36 hours ahead is a time zone difference (the board is in IST); later is a typo.
      const done = Date.parse(t.doneAt);
      if (done <= asOf + 36 * 3_600_000) out.doneAt = iso(Math.max(Math.min(done, asOf), Date.parse(out.createdAt)));
      else doneFuture++;
    }
    if (t.status === "done" && !out.doneAt && !t.doneAt) doneNoDate++;
    if (t.dueAt) out.dueAt = iso(t.dueAt);
    if (t.points !== undefined && t.points > 0) out.points = t.points;
    return out;
  });

  if (doneNoDate > 0) {
    warnings.push(`${doneNoDate} done ${doneNoDate === 1 ? "task has" : "tasks have"} no done date, so the recent pace may look slower than it is.`);
  }
  if (doneFuture > 0) {
    warnings.push(`${doneFuture} done ${doneFuture === 1 ? "date is" : "dates are"} in the future, so ${doneFuture === 1 ? "it was" : "they were"} left out.`);
  }
  if (parsed.length > MAX_CSV_TASKS) warnings.push(`Only the first ${MAX_CSV_TASKS} tasks were read.`);
  if (unmatched.size > 0) {
    warnings.push(`No GitHub user found for ${[...unmatched].slice(0, 5).map((n) => `"${n}"`).join(", ")}, so those tasks have no owner.`);
  }
  // The board replaces GitHub issues: a team keeps its tasks in one place.
  const pullRequests = s.pullRequests.map((p) => ({ ...p, taskIds: [] }));
  return { snapshot: { ...s, tasks, pullRequests }, warnings: warnings.slice(0, 15) };
}
