// sliceAsOf: the snapshot as it looked on an earlier date. Powers replay
// and "first detectable" dates.
//
// Approximate on purpose, because GitHub only gives today's state:
// - An open branch's filesTouched is its final diff, not the diff on that date.
// - A branch already deleted today gets createdAt from its first commit.
// - A task that is in_review today keeps that status on any date after it started.

import type { Branch, PullRequest, RepoSnapshot, Task } from "../lib/types";
import { ms } from "./util";

export function sliceAsOf(s: RepoSnapshot, asOfISO: string): RepoSnapshot {
  const asOf = ms(asOfISO);
  if (asOf >= ms(s.asOf)) return s;
  const before = (d: string | null | undefined) => d != null && ms(d) <= asOf;

  const commits = s.commits.filter((c) => before(c.date));

  const pullRequests: PullRequest[] = s.pullRequests
    .filter((p) => before(p.createdAt))
    .map((p) => {
      const merged = before(p.mergedAt);
      const closed = before(p.closedAt);
      return {
        ...p,
        state: merged ? "merged" : closed ? "closed" : "open",
        mergedAt: merged ? p.mergedAt : null,
        closedAt: closed ? p.closedAt : null,
        mergeable: merged || closed ? p.mergeable : p.state === "open" ? p.mergeable : "unknown",
        reviews: p.reviews.filter((r) => before(r.submittedAt)),
        taskIds: [...p.taskIds],
      };
    });

  // A branch existed on that date if it had a commit by then and its PR was not finished yet.
  const finished = new Set(pullRequests.filter((p) => p.state !== "open").map((p) => p.branch));
  const mainTimes = commits.filter((c) => c.branch === "main").map((c) => ms(c.date));
  const names = [...new Set(commits.filter((c) => c.branch !== "main").map((c) => c.branch))]
    .filter((name) => !finished.has(name));

  const branches: Branch[] = names.map((name) => {
    const own = commits.filter((c) => c.branch === name);
    const today = s.branches.find((b) => b.name === name);
    const pr = s.pullRequests.find((p) => p.branch === name);
    const createdAt = today?.createdAt ?? own[0].date;
    return {
      name,
      owner: today?.owner ?? pr?.author ?? own[0].author,
      createdAt,
      lastPushAt: own[own.length - 1].date,
      aheadOfMain: own.length,
      behindMain: mainTimes.filter((t) => t > ms(createdAt)).length,
      filesTouched: today?.filesTouched ?? pr?.files ?? [],
      hasOpenPR: pullRequests.some((p) => p.branch === name && p.state === "open"),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const prNumbers = new Set(pullRequests.map((p) => p.number));
  const tasks: Task[] = s.tasks
    .filter((t) => before(t.createdAt))
    .map((t) => {
      const out: Task = { ...t, linkedPRs: t.linkedPRs.filter((n) => prNumbers.has(n)) };
      if (!before(t.doneAt)) delete out.doneAt;
      if (!before(t.startedAt)) delete out.startedAt;
      if (out.doneAt) out.status = "done";
      else if (!out.startedAt) out.status = "todo";
      else if (t.status === "done") {
        const openPR = pullRequests.some((p) => out.linkedPRs.includes(p.number) && p.state === "open");
        out.status = openPR ? "in_review" : "in_progress";
      }
      if (out.linkedPRs.length === 0 && t.linkedPRs.length > 0) {
        out.linkSource = "none";
        out.linkConfidence = 0;
      }
      return out;
    });

  return { ...s, asOf: asOfISO, commits, pullRequests, branches, tasks };
}
