// Checks that each team really tells its story (the planted risks in TASKS.md).
// These are data checks only; the engine decides what is a risk.

import type { RepoSnapshot } from "../../src/lib/types";

export interface Check {
  label: string;
  ok: boolean;
  value: string;
}

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(d);
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

function doneShare(s: RepoSnapshot, personId: string): number {
  const done = s.tasks.filter((t) => t.status === "done");
  return done.filter((t) => t.assignee === personId).length / done.length;
}

/** Share of merged lines (additions + deletions) merged in the last 3 days. */
export function lateShare(s: RepoSnapshot): number {
  const cutoff = ms(s.asOf) - 3 * DAY;
  const merged = s.pullRequests.filter((p) => p.mergedAt);
  const lines = (list: typeof merged) => list.reduce((a, p) => a + p.additions + p.deletions, 0);
  return lines(merged.filter((p) => ms(p.mergedAt!) >= cutoff)) / lines(merged);
}

function overlaps(a: [number, number][], b: [number, number][]): boolean {
  return a.some(([a1, a2]) => b.some(([b1, b2]) => a1 <= b2 && b1 <= a2));
}

function reviewsGiven(s: RepoSnapshot, personId: string): number {
  return s.pullRequests.flatMap((p) => p.reviews).filter((r) => r.reviewer === personId).length;
}

function unreviewedMerges(s: RepoSnapshot): number {
  return s.pullRequests.filter((p) => p.state === "merged" && p.reviews.length === 0).length;
}

function nexusChecks(s: RepoSnapshot): Check[] {
  const asOf = ms(s.asOf);
  const open = s.branches;
  const routes = open.filter((b) => b.filesTouched.some((f) => f.path.endsWith("routes.js")));
  const routeRanges = routes.map((b) => b.filesTouched.find((f) => f.path.endsWith("routes.js"))!.ranges);
  const pr31 = s.pullRequests.find((p) => p.number === 31);
  const removedPaths = open.flatMap((b) => b.filesTouched.filter((f) => f.status === "removed").map((f) => ({ b, path: f.path })));
  const modDelete = removedPaths.find(({ b, path }) =>
    open.some((o) => o !== b && o.filesTouched.some((f) => f.path === path && f.status === "modified")));
  const direct = s.commits.filter((c) => c.directToMain);
  const directWhileOpen = direct.some((c) => open.some((b) => b.createdAt < c.date));
  const behind = open.map((b) => b.behindMain);
  const lockfile = open.filter((b) => b.filesTouched.some((f) => f.path === "package-lock.json"));
  const stale = s.tasks.filter((t) => t.status === "in_progress").map((t) => {
    const b = open.find((x) => x.name.includes(t.id));
    return b ? (asOf - ms(b.lastPushAt)) / DAY : -1;
  });
  const d = s.team.people.find((p) => p.displayName === "Member D")!;
  const commitsBy = (id: string) => s.commits.filter((c) => c.author === id && !c.message.match(/\(#\d+\)$/)).length;
  const otherCommits = s.team.people.filter((p) => p.id !== d.id).map((p) => commitsBy(p.id));

  return [
    { label: "8 weeks from 2026-09-07, deadline 2026-11-01, asOf 2026-10-23", ok: s.team.projectStart.startsWith("2026-09-07") && s.team.deadline.startsWith("2026-11-01") && s.asOf.startsWith("2026-10-23"), value: `${s.team.projectStart} to ${s.team.deadline}, asOf ${s.asOf}` },
    { label: "Member A finishes about 46% of tasks", ok: Math.abs(doneShare(s, "p1") - 0.46) < 0.02, value: pct(doneShare(s, "p1")) },
    { label: "Member C gives zero reviews", ok: reviewsGiven(s, "p3") === 0, value: String(reviewsGiven(s, "p3")) },
    { label: "3 PRs merged with no review", ok: unreviewedMerges(s) === 3, value: String(unreviewedMerges(s)) },
    { label: "About 58% of merged lines in the last 3 days", ok: Math.abs(lateShare(s) - 0.58) < 0.02, value: pct(lateShare(s)) },
    { label: "PR #31 open 9 days with 1,240 lines", ok: !!pr31 && pr31.state === "open" && Math.floor((asOf - ms(pr31.createdAt)) / DAY) === 9 && pr31.additions + pr31.deletions === 1240, value: pr31 ? `${Math.floor((asOf - ms(pr31.createdAt)) / DAY)} days, ${pr31.additions + pr31.deletions} lines` : "missing" },
    { label: "Open branches of A and C both edit routes.js lines 60 to 75", ok: routes.length === 2 && routes.some((b) => b.owner === "p1") && routes.some((b) => b.owner === "p3") && overlaps(routeRanges[0], routeRanges[1]) && overlaps(routeRanges[0], [[60, 75]]) && overlaps(routeRanges[1], [[60, 75]]), value: routes.map((b, i) => `${b.name} ${JSON.stringify(routeRanges[i])}`).join(", ") },
    { label: "One branch deletes a file another branch edits", ok: !!modDelete, value: modDelete ? `${modDelete.path} removed on ${modDelete.b.name}` : "none" },
    { label: "One direct push to main while a branch is open", ok: direct.length === 1 && directWhileOpen, value: direct.map((c) => `${c.date} ${c.message}`).join(", ") },
    { label: "One branch 14 commits behind main, others 10 or fewer", ok: behind.filter((n) => n === 14).length === 1 && behind.filter((n) => n !== 14).every((n) => n <= 10), value: open.map((b) => `${b.name}: ${b.behindMain}`).join(", ") },
    { label: "One task in progress with no push for 6 days", ok: stale.filter((x) => x >= 6 && x < 7).length === 1 && stale.filter((x) => x >= 5).length === 1, value: stale.map((x) => x.toFixed(1)).join(", ") + " days" },
    { label: "package-lock.json touched on two open branches", ok: lockfile.length === 2, value: lockfile.map((b) => b.name).join(", ") },
    { label: "Member D is design role, fewest commits, owns finished design tasks", ok: d.role === "design" && otherCommits.every((n) => n > commitsBy(d.id)) && s.tasks.filter((t) => t.assignee === d.id && t.status === "done").length >= 3, value: `${commitsBy(d.id)} commits vs ${otherCommits.join(", ")}` },
  ];
}

function atlasChecks(s: RepoSnapshot): Check[] {
  const shares = s.team.people.map((p) => doneShare(s, p.id));
  const biggest = Math.max(...s.pullRequests.map((p) => p.additions + p.deletions));
  const paths = s.branches.flatMap((b) => b.filesTouched.map((f) => f.path));
  return [
    { label: "Finished tasks spread out (largest share 35% or less)", ok: Math.max(...shares) <= 0.35, value: shares.map(pct).join(", ") },
    { label: "Every merged PR was reviewed", ok: unreviewedMerges(s) === 0, value: String(unreviewedMerges(s)) },
    { label: "Late merges are a small share (under 25%)", ok: lateShare(s) < 0.25, value: pct(lateShare(s)) },
    { label: "Small PRs (largest under 400 lines)", ok: biggest < 400, value: String(biggest) },
    { label: "No file shared by two open branches", ok: new Set(paths).size === paths.length, value: `${paths.length} paths` },
    { label: "No branch more than 10 behind main", ok: s.branches.every((b) => b.behindMain <= 10), value: s.branches.map((b) => b.behindMain).join(", ") },
  ];
}

function orbitChecks(s: RepoSnapshot): Check[] {
  const share = doneShare(s, "p1");
  return [
    { label: "Member A finishes about 65% of tasks", ok: Math.abs(share - 0.65) < 0.03, value: pct(share) },
    { label: "Member D (code role) finishes few tasks", ok: doneShare(s, "p4") < 0.1, value: pct(doneShare(s, "p4")) },
  ];
}

function zenithChecks(s: RepoSnapshot): Check[] {
  const reviewed = s.pullRequests.filter((p) => p.state === "merged" && p.reviews.length > 0).length;
  const conflicting = s.pullRequests.filter((p) => p.mergeable === "conflicting").length;
  return [
    { label: "Most merged lines in the last 3 days (75% or more)", ok: lateShare(s) >= 0.75, value: pct(lateShare(s)) },
    { label: "Almost no reviews (1 merged PR reviewed at most)", ok: reviewed <= 1, value: String(reviewed) },
    { label: "One open PR already conflicting", ok: conflicting === 1, value: String(conflicting) },
  ];
}

export function plantedChecks(s: RepoSnapshot): Check[] {
  switch (s.team.id) {
    case "nexus": return nexusChecks(s);
    case "atlas": return atlasChecks(s);
    case "orbit": return orbitChecks(s);
    case "zenith": return zenithChecks(s);
    default: return [];
  }
}
