// The numbers the dashboard draws. Pure functions of a snapshot.

import type { PullRequest, RepoSnapshot, ReviewMatrix, Schedule, Task, WeekSummary } from "../lib/types";
import { usualRange } from "./baseline";
import { CONFIG, Weights, isDocsDesignPath, isLockfile } from "./config";
import { DAY, HOUR, iso, median, ms, sum } from "./util";

export interface Contribution {
  personId: string;
  tasks: number;
  code: number;
  reviews: number;
  docsDesign: number;
  quickReplies: number;
  composite: number;
  /** Raw counts behind the shares, used as evidence. */
  counts: { tasks: number; codeLines: number; reviews: number; docsDesign: number; quickReplies: number };
}

export const points = (t: Task) => t.points ?? 1;
export const doneTasks = (s: RepoSnapshot) => s.tasks.filter((t) => t.status === "done");
export const mergedPRs = (s: RepoSnapshot) => s.pullRequests.filter((p) => p.state === "merged" && p.mergedAt);
export const prLines = (p: PullRequest) => p.additions + p.deletions;

/** Lines of real code in a PR: no lockfiles, no docs or design files, capped per PR. */
export function codeLines(p: PullRequest): number {
  const lines = sum(
    p.files.filter((f) => !isLockfile(f.path) && !isDocsDesignPath(f.path)),
    (f) => f.additions + f.deletions,
  );
  return Math.min(lines, CONFIG.workload.codeLinesCapPerPR);
}

/** Distinct reviewers of a PR other than its author, each with their first review time. */
export function reviewersOf(p: PullRequest): Map<string, number> {
  const first = new Map<string, number>();
  for (const r of p.reviews) {
    if (r.reviewer === p.author) continue;
    const at = ms(r.submittedAt);
    if (!first.has(r.reviewer) || at < first.get(r.reviewer)!) first.set(r.reviewer, at);
  }
  return first;
}

/** A finished task is docs or design work when its owner has that role or all its code is docs or design files. */
function isDocsDesignTask(s: RepoSnapshot, t: Task): boolean {
  const role = s.team.people.find((p) => p.id === t.assignee)?.role;
  if (role === "design" || role === "docs") return true;
  const files = s.pullRequests.filter((p) => t.linkedPRs.includes(p.number)).flatMap((p) => p.files);
  return files.length > 0 && files.every((f) => isDocsDesignPath(f.path));
}

export function contribution(s: RepoSnapshot, weights: Weights): Contribution[] {
  const ids = s.team.people.map((p) => p.id);
  const zero = () => Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>;
  const tasks = zero();
  const code = zero();
  const reviews = zero();
  const docsDesign = zero();
  const quick = zero();

  for (const t of doneTasks(s)) {
    if (t.assignee === null || !(t.assignee in tasks)) continue;
    tasks[t.assignee] += points(t);
    if (isDocsDesignTask(s, t)) docsDesign[t.assignee] += points(t);
  }
  for (const p of mergedPRs(s)) {
    if (p.author in code) code[p.author] += codeLines(p);
  }
  for (const p of s.pullRequests) {
    for (const [reviewer, at] of reviewersOf(p)) {
      if (!(reviewer in reviews)) continue;
      reviews[reviewer] += 1;
      if (at - ms(p.createdAt) <= CONFIG.review.quickReplyHours * HOUR) quick[reviewer] += 1;
    }
  }

  const parts = { tasks, code, reviews, docsDesign, quickReplies: quick };
  const totals = Object.fromEntries(
    Object.entries(parts).map(([k, v]) => [k, sum(Object.values(v), (x) => x)]),
  ) as Record<keyof Weights, number>;
  const share = (k: keyof Weights, id: string) => (totals[k] > 0 ? parts[k][id] / totals[k] : 0);
  // A part with almost no events (no docs work at all, or one review in the
  // whole project) gives its weight to the others, so one event cannot make
  // someone look like they carry the team. Combined shares still add up to 100%.
  const keys = (Object.keys(weights) as (keyof Weights)[]).filter((k) => totals[k] >= CONFIG.workload.minPartEvents);
  const activeWeight = sum(keys, (k) => weights[k]);

  return ids.map((id) => ({
    personId: id,
    tasks: share("tasks", id),
    code: share("code", id),
    reviews: share("reviews", id),
    docsDesign: share("docsDesign", id),
    quickReplies: share("quickReplies", id),
    composite: activeWeight > 0 ? sum(keys, (k) => weights[k] * share(k, id)) / activeWeight : 0,
    counts: {
      tasks: tasks[id],
      codeLines: code[id],
      reviews: reviews[id],
      docsDesign: docsDesign[id],
      quickReplies: quick[id],
    },
  }));
}

export function reviewMatrix(s: RepoSnapshot): ReviewMatrix {
  const matrix: Record<string, Record<string, number>> = {};
  for (const r of s.team.people) {
    matrix[r.id] = {};
    for (const a of s.team.people) matrix[r.id][a.id] = 0;
  }
  const waits: number[] = [];
  for (const p of s.pullRequests) {
    const reviewers = reviewersOf(p);
    for (const reviewer of reviewers.keys()) {
      if (matrix[reviewer]?.[p.author] !== undefined) matrix[reviewer][p.author] += 1;
    }
    if (reviewers.size > 0) waits.push((Math.min(...reviewers.values()) - ms(p.createdAt)) / HOUR);
  }
  const m = median(waits);
  return {
    matrix,
    mergedWithoutReview: mergedPRs(s).filter((p) => reviewersOf(p).size === 0).map((p) => p.number),
    medianHoursToFirstReview: m === null ? null : Math.round(m * 10) / 10,
  };
}

export function timeline(s: RepoSnapshot): WeekSummary[] {
  const start = ms(s.team.projectStart);
  const asOf = ms(s.asOf);
  const weeks = Math.ceil((ms(s.team.deadline) - start) / (7 * DAY));
  const rows = Array.from({ length: weeks }, (_, i) => {
    const from = start + i * 7 * DAY;
    const merged = mergedPRs(s).filter((p) => ms(p.mergedAt!) >= from && ms(p.mergedAt!) < from + 7 * DAY);
    return { weekIndex: i, from, mergedLines: sum(merged, prLines), mergedPRs: merged.length };
  });
  const past = rows.filter((r) => r.from <= asOf);
  const usual = usualRange(past.map((r) => r.mergedLines)).median || sum(past, (r) => r.mergedLines) / Math.max(1, past.length);
  return rows.map((r) => ({
    weekIndex: r.weekIndex,
    label: `W${r.weekIndex + 1}`,
    mergedLines: r.mergedLines,
    mergedPRs: r.mergedPRs,
    status:
      r.from > asOf ? "future"
      : usual > 0 && r.mergedLines > usual * CONFIG.timeline.dangerRatio ? "danger"
      : usual > 0 && r.mergedLines > usual * CONFIG.timeline.warningRatio ? "warning"
      : "ok",
  }));
}

/** Share of merged lines (additions + deletions) merged in the last 3 days. */
export function lateMergeShare(s: RepoSnapshot): number {
  const merged = mergedPRs(s);
  const total = sum(merged, prLines);
  if (total === 0) return 0;
  const cutoff = ms(s.asOf) - CONFIG.late.windowDays * DAY;
  return sum(merged.filter((p) => ms(p.mergedAt!) >= cutoff), prLines) / total;
}

export function schedule(s: RepoSnapshot): Schedule {
  const start = ms(s.team.projectStart);
  const deadline = ms(s.team.deadline);
  const asOf = ms(s.asOf);
  const tasksTotal = sum(s.tasks, points);
  const tasksDone = sum(doneTasks(s), points);
  const recent = sum(
    doneTasks(s).filter((t) => t.doneAt && ms(t.doneAt) > asOf - CONFIG.deadline.paceDays * DAY),
    points,
  );
  const perDay = recent / CONFIG.deadline.paceDays;
  const left = tasksTotal - tasksDone;
  const finish = left === 0 ? asOf : perDay > 0 ? asOf + (left / perDay) * DAY : null;
  return {
    daysTotal: Math.ceil((deadline - start) / DAY),
    daysUsed: Math.max(0, Math.floor((asOf - start) / DAY)),
    daysLeft: Math.max(0, Math.floor((deadline - asOf) / DAY)),
    tasksTotal,
    tasksDone,
    projectedFinish: finish === null ? null : iso(Math.round(finish / 60_000) * 60_000),
    daysLate: finish === null ? 0 : Math.max(0, Math.ceil((finish - deadline) / DAY)),
  };
}
