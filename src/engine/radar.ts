// Conflict radar: reads open branches, open PRs and recent commits and warns
// before a merge goes wrong. Never claims more than the data shows:
// "possible" = same file, "likely" = overlapping lines, "certain" = GitHub says so.

import type { Branch, FileChange, RepoSnapshot, Task } from "../lib/types";
import { CONFIG, isLockfile } from "./config";
import { branchMentions } from "./link";
import type { Context, Draft } from "./risks";
import * as scene from "./scenes";
import { DAY, day, iso, ms, nameOf, num, plural } from "./util";

const R = CONFIG.radar;

/** URL-safe id part: "feature/NEX-132-settings" -> "nex-132-settings", "routes.js" -> "routes-js". */
function slug(text: string): string {
  return text.replace(/^(feature|fix|feat)\//, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Overlapping (or nearly touching) line ranges, as one merged range. */
function overlap(a: [number, number][], b: [number, number][]): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [a1, a2] of a) {
    for (const [b1, b2] of b) {
      if (a1 <= b2 + R.lineGap && b1 <= a2 + R.lineGap) {
        lo = Math.min(lo, Math.max(a1, b1));
        hi = Math.max(hi, Math.min(a2, b2));
      }
    }
  }
  if (lo === Infinity) return null;
  return lo <= hi ? [lo, hi] : [hi, lo];
}

/** When a branch first touched a path: its earliest commit that lists the file. */
function firstTouch(s: RepoSnapshot, b: Branch, path: string): number {
  const hit = s.commits.find((c) => c.branch === b.name && c.files.includes(path));
  return ms(hit?.date ?? b.createdAt);
}

/** The path a file had on main: renames and deletes count against the old path. */
const oldPath = (f: FileChange) => (f.status === "renamed" && f.previousPath ? f.previousPath : f.path);

function pairs(s: RepoSnapshot): Draft[] {
  const out: Draft[] = [];
  const open = s.branches;
  const who = (b: Branch) => nameOf(s.team, b.owner);

  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i];
      const b = open[j];
      for (const fa of a.filesTouched) {
        const fb = b.filesTouched.find((f) => oldPath(f) === oldPath(fa) || f.path === fa.path);
        if (!fb) continue;
        const path = oldPath(fa);
        const name = scene.base(path);
        const people = [...new Set([a.owner, b.owner])];
        const firstDetectableAt = iso(Math.max(firstTouch(s, a, fa.path), firstTouch(s, b, fb.path)));
        const evidence = [
          { label: `${a.name} (${who(a)})`, value: `${fa.status} ${path}, ${scene.rangeText(fa.ranges)}`, ref: { type: "branch" as const, id: a.name } },
          { label: `${b.name} (${who(b)})`, value: `${fb.status} ${path}, ${scene.rangeText(fb.ranges)}`, ref: { type: "branch" as const, id: b.name } },
        ];
        const pairKey = `${slug(name)}-${[a.owner, b.owner].sort().join("-")}`;

        const gone = (f: FileChange) => f.status === "removed" || f.status === "renamed";
        if (isLockfile(path)) {
          out.push({
            id: `lockfile_overlap-${pairKey}`,
            kind: "lockfile_overlap",
            severity: "low",
            confidence: "possible",
            title: `Two branches change ${name}`,
            summary: `${who(a)} and ${who(b)} both change ${name} on open branches, and lockfiles do not merge well by hand.`,
            rule: "Flagged when two open branches change the same lockfile (package-lock.json, yarn.lock or pnpm-lock.yaml).",
            evidence,
            people,
            action: `Merge one branch, then run the install again on the other to regenerate ${name}. Do not merge it by hand.`,
            scene: scene.twoBranches(a, b, name, name, "warning", name,
              `Both branches change ${name}. Regenerate it after the first merge; do not merge it by hand.`),
            firstDetectableAt,
          });
        } else if (gone(fa) !== gone(fb)) {
          const [editor, remover] = gone(fa) ? [b, a] : [a, b];
          const removed = gone(fa) ? fa : fb;
          const verb = removed.status === "renamed" ? "renames" : "deletes";
          out.push({
            id: `modify_delete_conflict-${pairKey}`,
            kind: "modify_delete_conflict",
            severity: "high",
            confidence: "likely",
            title: `${name} edited on one branch, ${removed.status === "renamed" ? "renamed" : "deleted"} on another`,
            summary: `${who(remover)}'s branch ${verb} ${name} while ${who(editor)}'s branch still edits it, so the second merge will stop.`,
            rule: "Flagged when one open branch changes a file that another open branch deletes or renames. Git cannot pick one side by itself.",
            evidence,
            people,
            action: `${nameOf(s.team, editor.owner)} and ${nameOf(s.team, remover.owner)} agree where the code in ${name} should live before either merges.`,
            scene: scene.modifyDelete(editor, remover, path,
              `One branch edits ${name}, another ${verb} it. Git cannot decide which to keep.`),
            firstDetectableAt,
          });
        } else if (fa.status === "added" && fb.status === "added") {
          out.push({
            id: `add_add_conflict-${pairKey}`,
            kind: "add_add_conflict",
            severity: "high",
            confidence: "likely",
            title: `Two branches both add ${name}`,
            summary: `${who(a)} and ${who(b)} each create ${path} on open branches, so the second merge will conflict.`,
            rule: "Flagged when two open branches add a new file at the same path.",
            evidence,
            people,
            action: `Pick one owner for ${path}; the other rebases onto it.`,
            scene: scene.twoBranches(a, b, `add ${name}`, `add ${name}`, "conflict", name,
              `Both branches add ${name}. Git cannot combine two new files with one name.`),
            firstDetectableAt,
          });
        } else if (!gone(fa)) {
          const lines = overlap(fa.ranges, fb.ranges);
          if (lines) {
            const span = lines[0] === lines[1] ? `line ${lines[0]}` : `lines ${lines[0]} to ${lines[1]}`;
            out.push({
              id: `same_line_overlap-${pairKey}`,
              kind: "same_line_overlap",
              severity: "high",
              confidence: "likely",
              title: `Two branches edit ${name} ${scene.rangeText([lines])}`,
              summary: `${who(a)} and ${who(b)} both change ${path} ${span} on open branches.`,
              rule: `Likely conflict: two open branches change overlapping lines of the same file (ranges closer than ${R.lineGap} lines count). Read from each branch's diff against main.`,
              evidence: [...evidence, { label: "Overlap", value: span, ref: { type: "file", id: path } }],
              people,
              action: `Merge one branch first; the other rebases and resolves ${name} ${span} before opening or merging its PR.`,
              scene: scene.twoBranches(a, b, scene.rangeText(fa.ranges), scene.rangeText(fb.ranges), "conflict", name,
                `Both branches change ${name} ${span}. The second merge will conflict.`),
              firstDetectableAt,
            });
          } else {
            out.push({
              id: `same_file_overlap-${pairKey}`,
              kind: "same_file_overlap",
              severity: "low",
              confidence: "possible",
              title: `Two branches change ${name}`,
              summary: `${who(a)} and ${who(b)} both change ${path}, on different lines.`,
              rule: "Possible conflict: two open branches change the same file. Their line ranges do not overlap, so Git can probably combine them.",
              evidence,
              people,
              action: `Merge one branch first and let the other pull main before merging.`,
              scene: scene.twoBranches(a, b, scene.rangeText(fa.ranges), scene.rangeText(fb.ranges), "warning", name,
                `Both branches touch ${name} on different lines. Git can probably combine these.`),
              firstDetectableAt,
            });
          }
        }
      }
    }
  }
  return out;
}

function conflictingPRs(s: RepoSnapshot): Draft[] {
  return s.pullRequests
    .filter((p) => p.state === "open" && p.mergeable === "conflicting")
    .map((p) => ({
      id: `pr_conflicting-${p.number}`,
      kind: "pr_conflicting" as const,
      severity: "high" as const,
      confidence: "certain" as const,
      title: `PR #${p.number} already conflicts with main`,
      summary: `GitHub reports that PR #${p.number} by ${nameOf(s.team, p.author)} cannot merge into main as it is.`,
      rule: "Certain: GitHub's own mergeable check says this PR conflicts with main.",
      evidence: [
        { label: `PR #${p.number}`, value: p.title, ref: { type: "pr" as const, id: String(p.number) } },
        { label: "Branch", value: p.branch, ref: { type: "branch" as const, id: p.branch } },
        { label: "Changed lines", value: num(p.additions + p.deletions) },
      ],
      people: [p.author],
      action: `${nameOf(s.team, p.author)} merges main into ${p.branch} and resolves the conflicts today.`,
      scene: scene.prConflicting(p, p.author, `GitHub already reports PR #${p.number} as conflicting with main.`),
      firstDetectableAt: p.createdAt,
    }));
}

function driftRisks(s: RepoSnapshot): Draft[] {
  const main = s.commits.filter((c) => c.branch === "main").map((c) => ms(c.date)).sort((a, b) => a - b);
  return s.branches
    .filter((b) => b.behindMain > R.driftMedium)
    .map((b) => {
      const high = b.behindMain > R.driftHigh;
      const after = main.filter((t) => t > ms(b.createdAt));
      const crossed = after[R.driftMedium] ?? ms(s.asOf);
      return {
        id: `branch_drift-${slug(b.name)}`,
        kind: "branch_drift" as const,
        severity: high ? ("high" as const) : ("medium" as const),
        title: `${scene.base(b.name)} is ${b.behindMain} commits behind main`,
        summary: `${b.name} by ${nameOf(s.team, b.owner)} has missed ${plural(b.behindMain, "commit")} on main since it started on ${day(b.createdAt)}.`,
        rule: `Medium when a branch is more than ${R.driftMedium} commits behind main, high above ${R.driftHigh}. The longer it waits, the more it has to reconcile at once.`,
        evidence: [
          { label: "Commits behind main", value: String(b.behindMain), ref: { type: "branch" as const, id: b.name } },
          { label: "Commits ahead of main", value: String(b.aheadOfMain) },
          { label: "Branch started", value: day(b.createdAt) },
          { label: "Last push", value: day(b.lastPushAt) },
        ],
        people: [b.owner],
        action: `${nameOf(s.team, b.owner)} merges main into ${b.name} today, then keeps doing it every day.`,
        scene: scene.drift(b, high ? "conflict" : "warning",
          `${b.name} is ${b.behindMain} commits behind main. A late merge pulls in all of them at once.`),
        firstDetectableAt: iso(crossed),
      };
    });
}

function directPushes(s: RepoSnapshot): Draft[] {
  const asOf = ms(s.asOf);
  return s.commits
    .filter((c) => c.directToMain && ms(c.date) >= asOf - R.directPushDays * DAY)
    .flatMap((c) => {
      const openThen = s.branches.filter((b) => b.createdAt < c.date);
      if (openThen.length === 0) return [];
      // Prefer an open branch that changes the same files: that merge is the one at risk.
      const sharing = s.branches.filter((b) => b.filesTouched.some((f) => c.files.includes(f.path)));
      const shown = sharing[0] ?? openThen[0];
      const shared = shown.filesTouched.find((f) => c.files.includes(f.path));
      return [{
        id: `direct_push_to_main-${c.sha.slice(0, 7)}`,
        kind: "direct_push_to_main" as const,
        severity: "medium" as const,
        title: "A commit went straight to main",
        summary: `${nameOf(s.team, c.author)} pushed "${c.message}" to main on ${day(c.date)} with no PR, while ${openThen.length} other ${openThen.length === 1 ? "branch was" : "branches were"} open.`,
        rule: "Flagged when a commit lands on main without a PR while other branches are open. Nobody reviewed it, and open branches now have to absorb it.",
        evidence: [
          { label: `Commit ${c.sha.slice(0, 7)}`, value: c.message, ref: { type: "commit" as const, id: c.sha } },
          { label: "Files", value: c.files.join(", ") },
          ...sharing.map((b) => ({ label: `Also changed on ${b.name}`, value: c.files.filter((p) => b.filesTouched.some((f) => f.path === p)).join(", "), ref: { type: "branch" as const, id: b.name } })),
          { label: "Branches open at the time", value: String(openThen.length) },
        ],
        people: [c.author],
        action: "Protect main so changes go through a PR, and let open branches pull main now.",
        scene: scene.directPush(c, shown, shared ? "conflict" : "warning", shared ? scene.base(shared.path) : "merge",
          shared
            ? `A commit went straight to main and changed ${scene.base(shared.path)}, which ${shown.name} also changes.`
            : `A commit went straight to main while ${shown.name} was open.`),
        firstDetectableAt: c.date,
      }];
    });
}

/** Open tasks that belong to a branch: the task id in the branch name, or a linked PR on it. */
function tasksOf(s: RepoSnapshot, b: Branch): Task[] {
  const prs = s.pullRequests.filter((p) => p.branch === b.name).map((p) => p.number);
  return s.tasks.filter((t) => t.status !== "done" && t.status !== "todo" &&
    (branchMentions(b.name, t.id) || t.linkedPRs.some((n) => prs.includes(n))));
}

function staleWork(s: RepoSnapshot): Draft[] {
  const asOf = ms(s.asOf);
  const out: Draft[] = [];
  for (const b of s.branches) {
    const days = Math.floor((asOf - ms(b.lastPushAt)) / DAY);
    const tasks = tasksOf(s, b);
    if (days < R.staleLow || tasks.length === 0) continue;
    out.push({
      id: `stale_branch-${slug(b.name)}`,
      kind: "stale_branch",
      severity: days >= R.staleMedium ? "medium" : "low",
      title: `No push to ${scene.base(b.name)} for ${days} days`,
      summary: `"${tasks[0].title}" is still open, but ${b.name} has had no push since ${day(b.lastPushAt)}.`,
      rule: `Low when a branch with an open task gets no push for ${R.staleLow} days, medium at ${R.staleMedium}.`,
      evidence: [
        { label: "Last push", value: `${day(b.lastPushAt)}, ${plural(days, "day")} ago`, ref: { type: "branch", id: b.name } },
        ...tasks.map((t) => ({ label: `Task ${t.id}`, value: `${t.title}, ${t.status.replace("_", " ")}`, ref: { type: "task" as const, id: t.id } })),
      ],
      people: [b.owner],
      action: `Ask ${nameOf(s.team, b.owner)} to push what they have, even if it is not finished.`,
      scene: scene.stale(b, days, `${b.name} stopped ${plural(days, "day")} ago while its task is still open.`),
      firstDetectableAt: iso(ms(b.lastPushAt) + R.staleLow * DAY),
    });
  }

  // A task in progress with nothing pushed at all. We cannot see laptops, so this is a proxy.
  for (const t of s.tasks.filter((x) => x.status === "in_progress" && x.startedAt && x.assignee)) {
    const role = s.team.people.find((p) => p.id === t.assignee)?.role;
    if (role === "design" || role === "docs") continue; // their work may never touch Git
    const days = Math.floor((asOf - ms(t.startedAt!)) / DAY);
    const hasBranch = s.branches.some((b) => branchMentions(b.name, t.id));
    const hasPR = t.linkedPRs.some((n) => s.pullRequests.some((p) => p.number === n && p.state !== "closed"));
    if (days < R.unpushedDays || hasBranch || hasPR) continue;
    out.push({
      id: `unpushed_work-${t.id}`,
      kind: "unpushed_work",
      severity: "low",
      title: `"${t.title}" has no pushed code`,
      summary: `${nameOf(s.team, t.assignee!)} started "${t.title}" ${plural(days, "day")} ago, and no branch or PR for it is on GitHub.`,
      rule: `Proxy only: a task in progress for ${R.unpushedDays} days with no branch or PR. SquadSync cannot see files on anyone's laptop, so the work may exist but is not shared.`,
      evidence: [
        { label: `Task ${t.id}`, value: `in progress since ${day(t.startedAt!)}`, ref: { type: "task", id: t.id } },
        { label: "Branch or PR found", value: "none" },
      ],
      people: [t.assignee!],
      action: `Ask ${nameOf(s.team, t.assignee!)} to push a work-in-progress branch for "${t.title}".`,
      scene: scene.unpushed(t, t.assignee!, days, `"${t.title}" started ${plural(days, "day")} ago. Nothing for it has reached GitHub yet.`),
      firstDetectableAt: iso(ms(t.startedAt!) + R.unpushedDays * DAY),
    });
  }
  return out;
}

export function radar(c: Context): Draft[] {
  const s = c.s;
  return [...pairs(s), ...conflictingPRs(s), ...driftRisks(s), ...directPushes(s), ...staleWork(s)];
}
