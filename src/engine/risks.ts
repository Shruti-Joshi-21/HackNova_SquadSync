// Workload, review, late-integration and deadline rules. Each rule returns
// risks with a plain rule text, real evidence, one action and a template summary.
// Code decides what is true; nothing here calls AI.

import type { ISODate, NotFlagged, PullRequest, RepoSnapshot, Risk, Severity, Verdict } from "../lib/types";
import { judgedOnCode, shareBand } from "./baseline";
import { CONFIG, Weights } from "./config";
import {
  Contribution, contribution, doneTasks, lateMergeShare, mergedPRs, prLines, reviewMatrix, reviewersOf, schedule,
} from "./indicators";
import { sliceAsOf } from "./slice";
import { DAY, day, iso, ms, nameOf, num, pct, plural, sum } from "./util";

export interface Context {
  s: RepoSnapshot;
  weights: Weights;
  shares: Contribution[];
  reviews: ReturnType<typeof reviewMatrix>;
  late: number;
  schedule: ReturnType<typeof schedule>;
}

export function context(s: RepoSnapshot, weights: Weights): Context {
  return {
    s,
    weights,
    shares: contribution(s, weights),
    reviews: reviewMatrix(s),
    late: lateMergeShare(s),
    schedule: schedule(s),
  };
}

/** A risk before its first detectable date is known. */
export interface Draft extends Omit<Risk, "firstDetectableAt" | "summarySource"> {
  /** Does the same condition hold on an earlier day? Used to find firstDetectableAt. */
  still?: (c: Context) => boolean;
  /** Known directly, when no replay is needed. */
  firstDetectableAt?: ISODate;
}

const WEIGHT_TEXT = (w: Weights) =>
  `${pct(w.tasks)} finished tasks, ${pct(w.code)} merged code by size, ${pct(w.reviews)} reviews given, ` +
  `${pct(w.docsDesign)} docs and design, ${pct(w.quickReplies)} quick replies`;

/* ------------------------------------------------------------------ */
/* Workload                                                            */
/* ------------------------------------------------------------------ */

function workload(c: Context): Draft[] {
  const { s } = c;
  const n = s.team.people.length;
  const even = 1 / n;
  const [low, high] = shareBand(n);
  const out: Draft[] = [];
  const done = doneTasks(s);
  const openTasksOf = (id: string) => s.tasks.filter((t) => t.assignee === id && t.status !== "done");

  if (done.length < CONFIG.workload.minDoneTasks) return out;
  const enough = (x: Context) => doneTasks(x.s).length >= CONFIG.workload.minDoneTasks;
  const tooHigh = (x: Contribution) => x.composite > high || x.tasks > high;

  for (const share of c.shares) {
    const person = s.team.people.find((p) => p.id === share.personId)!;
    const name = person.displayName;

    if (judgedOnCode(person.role) && tooHigh(share)) {
      const top = Math.max(share.composite, share.tasks);
      const helper = c.shares
        .filter((x) => x.personId !== person.id && judgedOnCode(s.team.people.find((p) => p.id === x.personId)!.role))
        .sort((a, b) => a.composite - b.composite)[0];
      const helperName = helper ? nameOf(s.team, helper.personId) : "another member";
      const open = openTasksOf(person.id);
      const movable = open.find((t) => t.status === "todo") ?? open[0];
      out.push({
        id: `workload_imbalance-${person.id}`,
        kind: "workload_imbalance",
        severity: top > even * CONFIG.workload.veryHighShare ? "high" : "medium",
        title: share.composite > high ? `${name} carries ${pct(share.composite)} of the work` : `${name} finished ${pct(share.tasks)} of all tasks`,
        summary: `${name} finished ${pct(share.tasks)} of tasks and wrote ${pct(share.code)} of merged code, against an even share of ${pct(even)}.`,
        rule: `Flagged when one person's combined share, or their share of finished tasks, is above ${CONFIG.workload.highShare} times the even share (${pct(high)} in a team of ${n}); high above ${CONFIG.workload.veryHighShare} times. Combined share is ${WEIGHT_TEXT(c.weights)}. Commit count is not used.`,
        evidence: [
          { label: "Finished tasks", value: `${share.counts.tasks} of ${sum(done, () => 1)} (${pct(share.tasks)})`, ref: { type: "person", id: person.id } },
          { label: "Merged code by size", value: pct(share.code) },
          { label: "Reviews given", value: `${share.counts.reviews} (${pct(share.reviews)})` },
          { label: "Combined share", value: `${pct(share.composite)}, usual band ${pct(low)} to ${pct(high)}` },
          { label: "Open tasks assigned", value: String(open.length) },
        ],
        people: [person.id],
        action: movable
          ? `Move "${movable.title}" from ${name} to ${helperName}.`
          : `Pair ${name} with ${helperName} on the next task.`,
        still: (x) => {
          const y = x.shares.find((z) => z.personId === person.id);
          return enough(x) && !!y && tooHigh(y);
        },
      });
    } else if (judgedOnCode(person.role) && share.composite < low && share.counts.docsDesign === 0) {
      const next = openTasksOf(person.id)[0] ?? s.tasks.find((t) => t.status === "todo");
      out.push({
        id: `workload_imbalance-${person.id}`,
        kind: "workload_imbalance",
        severity: "medium",
        title: `${name} has ${pct(share.composite)} of the work`,
        summary: `${name} finished ${plural(share.counts.tasks, "task")} and wrote ${pct(share.code)} of merged code, against an even share of ${pct(even)}.`,
        rule: `Flagged when a code-role member's combined share is below ${CONFIG.workload.lowShare} times the even share (${pct(low)} in a team of ${n}) and they have no docs or design work. Combined share is ${WEIGHT_TEXT(c.weights)}.`,
        evidence: [
          { label: "Finished tasks", value: `${share.counts.tasks} (${pct(share.tasks)})`, ref: { type: "person", id: person.id } },
          { label: "Merged code by size", value: pct(share.code) },
          { label: "Reviews given", value: String(share.counts.reviews) },
          { label: "Combined share", value: `${pct(share.composite)}, usual band ${pct(low)} to ${pct(high)}` },
        ],
        people: [person.id],
        action: next ? `Check in with ${name} and pair them on "${next.title}".` : `Check in with ${name} this week.`,
        still: (x) => {
          const y = x.shares.find((z) => z.personId === person.id);
          return enough(x) && !!y && y.composite < low && y.counts.docsDesign === 0;
        },
      });
    } else if (!judgedOnCode(person.role)) {
      // Design and docs roles are judged on their own work only.
      const quiet = (x: Context) => {
        const since = ms(x.s.asOf) - CONFIG.workload.ownWorkDays * DAY;
        const recent = doneTasks(x.s).some((t) => t.assignee === person.id && t.doneAt && ms(t.doneAt) > since);
        const active = x.s.tasks.some((t) => t.assignee === person.id && (t.status === "in_progress" || t.status === "in_review"));
        return enough(x) && !recent && !active;
      };
      if (quiet(c)) {
        out.push({
          id: `workload_imbalance-${person.id}`,
          kind: "workload_imbalance",
          severity: "medium",
          title: `${name} has no recent ${person.role} work`,
          summary: `${name} has no finished ${person.role} task in ${CONFIG.workload.ownWorkDays} days and nothing in progress.`,
          rule: `A ${person.role} member is judged on their own tasks, not on code. Flagged with no finished task in ${CONFIG.workload.ownWorkDays} days and none in progress.`,
          evidence: [{ label: "Tasks in progress", value: "0", ref: { type: "person", id: person.id } }],
          people: [person.id],
          action: `Agree the next ${person.role} task with ${name}.`,
          still: quiet,
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

function recentMerged(s: RepoSnapshot): { list: PullRequest[]; recent: boolean } {
  const since = ms(s.asOf) - CONFIG.review.recentDays * DAY;
  const recent = mergedPRs(s).filter((p) => ms(p.mergedAt!) >= since);
  return recent.length >= CONFIG.review.minRecentMerged ? { list: recent, recent: true } : { list: mergedPRs(s), recent: false };
}

function unreviewedShare(s: RepoSnapshot): { share: number; missing: PullRequest[]; list: PullRequest[]; recent: boolean } {
  const { list, recent } = recentMerged(s);
  const missing = list.filter((p) => reviewersOf(p).size === 0);
  return { share: list.length > 0 ? missing.length / list.length : 0, missing, list, recent };
}

function reviews(c: Context): Draft[] {
  const { s } = c;
  const out: Draft[] = [];

  // Members who never review.
  const othersMerged = (s2: RepoSnapshot, id: string) => mergedPRs(s2).filter((p) => p.author !== id).length;
  for (const person of s.team.people) {
    if (!judgedOnCode(person.role)) continue;
    const given = c.shares.find((x) => x.personId === person.id)!.counts.reviews;
    const others = othersMerged(s, person.id);
    if (given > 0 || others < CONFIG.review.minOthersMergedForReviewer) continue;
    const waiting = s.pullRequests
      .filter((p) => p.state === "open" && p.author !== person.id)
      .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))[0];
    const total = sum(c.shares, (x) => x.counts.reviews);
    out.push({
      id: `review_gap-${person.id}`,
      kind: "review_gap",
      severity: "medium",
      title: `${person.displayName} has not reviewed any PR`,
      summary: `${person.displayName} gave no reviews while ${plural(others, "PR")} by teammates were merged.`,
      rule: `Flagged when a code-role member gives zero reviews after teammates merged at least ${CONFIG.review.minOthersMergedForReviewer} PRs. Reviews spread knowledge of the code and catch problems early.`,
      evidence: [
        { label: "Reviews given", value: "0", ref: { type: "person", id: person.id } },
        { label: "PRs by teammates merged", value: String(others) },
        { label: "Reviews given by the team", value: String(total) },
      ],
      people: [person.id],
      action: waiting
        ? `Ask ${person.displayName} to review PR #${waiting.number} next.`
        : `Ask ${person.displayName} to review the next PR.`,
      still: (x) =>
        (x.shares.find((y) => y.personId === person.id)?.counts.reviews ?? 0) === 0 &&
        othersMerged(x.s, person.id) >= CONFIG.review.minOthersMergedForReviewer,
    });
  }

  // PRs merged with no review.
  const u = unreviewedShare(s);
  if (u.share > CONFIG.review.unreviewedMedium) {
    const scope = u.recent ? `PRs merged in the last ${CONFIG.review.recentDays} days` : "merged PRs";
    out.push({
      id: "review_gap-unreviewed",
      kind: "review_gap",
      severity: u.share > CONFIG.review.unreviewedHigh ? "high" : "medium",
      title: `${plural(u.missing.length, "PR")} merged without review`,
      summary: `${u.missing.length} of the ${u.list.length} ${scope} had no review.`,
      rule: `Medium when more than ${pct(CONFIG.review.unreviewedMedium)} of recently merged PRs have no review, high above ${pct(CONFIG.review.unreviewedHigh)}. Recent means the last ${CONFIG.review.recentDays} days, or all PRs when fewer than ${CONFIG.review.minRecentMerged} merged in that time.`,
      evidence: [
        { label: "Merged without review", value: `${u.missing.length} of ${u.list.length} (${pct(u.share)})` },
        ...u.missing.map((p) => ({
          label: `PR #${p.number}`,
          value: `by ${nameOf(s.team, p.author)}, ${num(prLines(p))} lines, merged ${day(p.mergedAt!)}`,
          ref: { type: "pr" as const, id: String(p.number) },
        })),
      ],
      people: [...new Set(u.missing.map((p) => p.author))],
      action: "Protect main so every PR needs one approval before merging.",
      still: (x) => unreviewedShare(x.s).share > CONFIG.review.unreviewedMedium,
    });
  }

  // Slow first reviews.
  const wait = c.reviews.medianHoursToFirstReview;
  if (wait !== null && wait > CONFIG.review.firstReviewHoursMedium) {
    out.push({
      id: "review_gap-slow",
      kind: "review_gap",
      severity: "medium",
      title: "Reviews take over 2 days to start",
      summary: `Half of all PRs waited more than ${Math.round(wait)} hours for their first review.`,
      rule: `Medium when the median time from opening a PR to its first review is above ${CONFIG.review.firstReviewHoursMedium} hours.`,
      evidence: [{ label: "Median wait for first review", value: `${Math.round(wait)} hours` }],
      people: [],
      action: "Agree a daily time when everyone reviews open PRs.",
      still: (x) => (x.reviews.medianHoursToFirstReview ?? 0) > CONFIG.review.firstReviewHoursMedium,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Late integration                                                    */
/* ------------------------------------------------------------------ */

function lateIntegration(c: Context): Draft[] {
  const { s } = c;
  const asOf = ms(s.asOf);
  const out: Draft[] = [];

  if (c.late > CONFIG.late.shareMedium) {
    const cutoff = asOf - CONFIG.late.windowDays * DAY;
    const late = mergedPRs(s).filter((p) => ms(p.mergedAt!) >= cutoff).sort((a, b) => prLines(b) - prLines(a));
    const total = sum(mergedPRs(s), prLines);
    out.push({
      id: "late_integration-share",
      kind: "late_integration",
      severity: c.late > CONFIG.late.shareHigh ? "high" : "medium",
      title: `${pct(c.late)} of code merged in last ${CONFIG.late.windowDays} days`,
      summary: `${pct(c.late)} of all merged lines landed in the last ${CONFIG.late.windowDays} days, across ${plural(late.length, "PR")}.`,
      rule: `Medium when more than ${pct(CONFIG.late.shareMedium)} of merged lines land in the last ${CONFIG.late.windowDays} days, high above ${pct(CONFIG.late.shareHigh)}. Late merges leave no time to find integration problems.`,
      evidence: [
        { label: `Lines merged in the last ${CONFIG.late.windowDays} days`, value: `${num(sum(late, prLines))} of ${num(total)}` },
        ...late.slice(0, 3).map((p) => ({
          label: `PR #${p.number}`,
          value: `${num(prLines(p))} lines, merged ${day(p.mergedAt!)}`,
          ref: { type: "pr" as const, id: String(p.number) },
        })),
      ],
      people: [...new Set(late.map((p) => p.author))],
      action: "Merge small pieces every day instead of saving them for the end.",
      still: (x) => x.late > CONFIG.late.shareMedium,
    });
  }

  for (const p of s.pullRequests.filter((x) => x.state === "open")) {
    const ageDays = Math.floor((asOf - ms(p.createdAt)) / DAY);
    const old = ageDays > CONFIG.late.openPRDays;
    const big = prLines(p) > CONFIG.late.bigPRLines;
    if (!old && !big) continue;
    const name = nameOf(s.team, p.author);
    const reasons = [old ? `open for ${ageDays} days` : "", big ? `${num(prLines(p))} lines` : ""].filter(Boolean);
    const lastPush = s.branches.find((b) => b.name === p.branch)?.lastPushAt;
    const firsts = [
      old ? ms(p.createdAt) + CONFIG.late.openPRDays * DAY : Infinity,
      big ? ms(p.createdAt) : Infinity,
    ];
    out.push({
      id: `late_integration-pr-${p.number}`,
      kind: "late_integration",
      severity: "medium",
      title: old ? `PR #${p.number} open for ${ageDays} days` : `PR #${p.number} is ${num(prLines(p))} lines`,
      summary: `PR #${p.number} by ${name} is ${reasons.join(" and ")}, so it gets harder to merge every day.`,
      rule: `Medium when a PR is open more than ${CONFIG.late.openPRDays} days or changes more than ${num(CONFIG.late.bigPRLines)} lines.`,
      evidence: [
        { label: `PR #${p.number} opened`, value: day(p.createdAt), ref: { type: "pr", id: String(p.number) } },
        { label: "Changed lines", value: num(prLines(p)) },
        { label: "Files changed", value: String(p.files.length) },
        { label: "Reviews so far", value: String(p.reviews.length) },
        ...(lastPush ? [{ label: "Last push", value: day(lastPush), ref: { type: "branch" as const, id: p.branch } }] : []),
      ],
      people: [p.author],
      action: big
        ? `Split PR #${p.number} into smaller PRs and merge the first part this week.`
        : `Get PR #${p.number} reviewed and merged, or close it.`,
      firstDetectableAt: iso(Math.min(...firsts)),
    });
  }

  const mainTimes = s.commits.filter((x) => x.branch === "main").map((x) => ms(x.date));
  const lastMain = mainTimes.length > 0 ? Math.max(...mainTimes) : ms(s.team.projectStart);
  const deadline = ms(s.team.deadline);
  const quietDays = Math.floor((asOf - lastMain) / DAY);
  if (quietDays >= CONFIG.late.mainQuietDays && deadline - asOf <= CONFIG.late.nearDeadlineDays * DAY) {
    out.push({
      id: "late_integration-main-quiet",
      kind: "late_integration",
      severity: "medium",
      title: `Nothing reached main for ${quietDays} days`,
      summary: `Main has had no new commit for ${quietDays} days with ${c.schedule.daysLeft} days to the deadline.`,
      rule: `Medium when main gets no commit for ${CONFIG.late.mainQuietDays} days within ${CONFIG.late.nearDeadlineDays} days of the deadline.`,
      evidence: [
        { label: "Last commit on main", value: day(iso(lastMain)) },
        { label: "Open branches", value: String(s.branches.length) },
      ],
      people: [],
      action: "Merge the smallest finished branch today.",
      firstDetectableAt: iso(Math.max(lastMain + CONFIG.late.mainQuietDays * DAY, deadline - CONFIG.late.nearDeadlineDays * DAY)),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Deadline                                                            */
/* ------------------------------------------------------------------ */

function deadline(c: Context): Draft[] {
  const sc = c.schedule;
  const left = sc.tasksTotal - sc.tasksDone;
  if (left === 0) return [];
  const recent = doneTasks(c.s).filter((t) => t.doneAt && ms(t.doneAt) > ms(c.s.asOf) - CONFIG.deadline.paceDays * DAY).length;

  if (sc.projectedFinish === null) {
    if (sc.daysUsed < CONFIG.deadline.paceDays) return [];
    return [{
      id: "deadline_slip",
      kind: "deadline_slip",
      severity: "medium",
      title: `No tasks finished in ${CONFIG.deadline.paceDays} days`,
      summary: `No task was finished in the last ${CONFIG.deadline.paceDays} days and ${plural(left, "task")} are left.`,
      rule: `The finish date is projected from tasks finished in the last ${CONFIG.deadline.paceDays} days. With none finished, it cannot be projected.`,
      evidence: [{ label: "Tasks left", value: String(left) }, { label: "Days left", value: String(sc.daysLeft) }],
      people: [],
      action: "Pick the smallest open task and finish it today.",
      still: (x) => x.schedule.projectedFinish === null && x.schedule.tasksTotal > x.schedule.tasksDone,
    }];
  }
  if (sc.daysLate < CONFIG.deadline.lateMedium) return [];
  const pace = recent / CONFIG.deadline.paceDays;
  const toCut = Math.max(1, Math.ceil(left - pace * sc.daysLeft));
  return [{
    id: "deadline_slip",
    kind: "deadline_slip",
    severity: sc.daysLate >= CONFIG.deadline.lateHigh ? "high" : "medium",
    title: `Projected to finish ${plural(sc.daysLate, "day")} late`,
    summary: `At the pace of the last ${CONFIG.deadline.paceDays} days, the ${left} open tasks finish on ${day(sc.projectedFinish)}, ${plural(sc.daysLate, "day")} after the deadline.`,
    rule: `The finish date is projected from tasks finished in the last ${CONFIG.deadline.paceDays} days. Medium at ${CONFIG.deadline.lateMedium} or more days late, high at ${CONFIG.deadline.lateHigh} or more.`,
    evidence: [
      { label: `Tasks finished in the last ${CONFIG.deadline.paceDays} days`, value: String(recent) },
      { label: "Tasks left", value: String(left) },
      { label: "Projected finish", value: day(sc.projectedFinish) },
      { label: "Deadline", value: day(c.s.team.deadline) },
    ],
    people: [],
    action: `Cut or move ${plural(toCut, "task")} out of scope this week.`,
    still: (x) => x.schedule.daysLate >= CONFIG.deadline.lateMedium,
  }];
}

/* ------------------------------------------------------------------ */
/* Putting it together                                                 */
/* ------------------------------------------------------------------ */

export function drafts(c: Context): Draft[] {
  return [...workload(c), ...reviews(c), ...lateIntegration(c), ...deadline(c)];
}

/**
 * The earliest day from which the condition held every day up to asOf.
 * Walks back one day at a time on sliced snapshots.
 */
export function since(s: RepoSnapshot, weights: Weights, still: (c: Context) => boolean): ISODate {
  const start = ms(s.team.projectStart);
  let first = ms(s.asOf);
  for (let t = first - DAY; t >= start; t -= DAY) {
    if (!still(context(sliceAsOf(s, iso(t)), weights))) break;
    first = t;
  }
  return iso(first);
}

export function finish(c: Context, list: Draft[]): Risk[] {
  return list.map((d) => {
    const { still, firstDetectableAt, ...rest } = d;
    return {
      ...rest,
      summarySource: "template",
      firstDetectableAt: firstDetectableAt ?? (still ? since(c.s, c.weights, still) : c.s.asOf),
    };
  });
}

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function sortRisks(list: Risk[]): Risk[] {
  return [...list].sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.firstDetectableAt.localeCompare(b.firstDetectableAt) || a.id.localeCompare(b.id));
}

export function verdict(list: Risk[]): { verdict: Verdict; verdictReason: string } {
  const high = list.filter((r) => r.severity === "high");
  const medium = list.filter((r) => r.severity === "medium");
  const slip = list.find((r) => r.kind === "deadline_slip");
  if (high.length > 0) return { verdict: "at_risk", verdictReason: high[0].summary };
  if (medium.length >= 2 || slip) return { verdict: "slipping", verdictReason: (slip ?? medium[0]).summary };
  return {
    verdict: "on_track",
    verdictReason: medium.length === 1
      ? `One thing to watch: ${lowerFirst(medium[0].summary)}`
      : "No serious risks, and the current pace meets the deadline.",
  };
}

export function notFlagged(c: Context, list: Risk[]): NotFlagged[] {
  const flagged = new Set(list.filter((r) => r.kind === "workload_imbalance" || r.kind === "review_gap").flatMap((r) => r.people));
  const even = 1 / c.s.team.people.length;
  const [low, high] = shareBand(c.s.team.people.length);
  const out: NotFlagged[] = [];
  for (const share of c.shares) {
    const person = c.s.team.people.find((p) => p.id === share.personId)!;
    if (flagged.has(person.id) || (share.composite >= even && share.code >= even)) continue;
    let reason: string;
    if (!judgedOnCode(person.role)) {
      reason = `Fewer code changes, but owns ${plural(share.counts.docsDesign, `finished ${person.role} task`)}.`;
    } else if (share.reviews >= even) {
      reason = `Less code, but gives ${pct(share.reviews)} of the team's reviews.`;
    } else {
      reason = `Below the even share, but inside the team's usual range (${pct(low)} to ${pct(high)}).`;
    }
    out.push({ personId: person.id, reason });
  }
  return out;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

