// Referential integrity checks for a RepoSnapshot. Returns a list of problems.
// Run alone: npx tsx data/gen/validate.ts (checks every file in data/snapshots).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { RepoSnapshot } from "../../src/lib/types";

export function validate(s: RepoSnapshot): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${s.team.id}: ${msg}`);
  const ms = (d: string) => Date.parse(d);
  const asOf = ms(s.asOf);
  const start = ms(s.team.projectStart);
  const people = new Set(s.team.people.map((p) => p.id));
  const isPerson = (id: string, where: string) => {
    if (!people.has(id)) fail(`${where}: unknown person "${id}"`);
  };
  const inWindow = (d: string, where: string) => {
    if (Number.isNaN(ms(d))) fail(`${where}: bad date "${d}"`);
    else if (ms(d) < start || ms(d) > asOf) fail(`${where}: date ${d} is outside project start to asOf`);
  };

  if (s.source !== "synthetic") fail(`source is "${s.source}"`);
  if (people.size !== s.team.people.length) fail("person ids are not unique");
  if (new Set(s.team.people.map((p) => p.displayName)).size !== people.size) fail("display names are not unique");
  for (const p of s.team.people) {
    if (p.colorIndex < 0 || p.colorIndex > 4) fail(`${p.id}: colorIndex ${p.colorIndex} out of 0..4`);
  }
  if (ms(s.team.deadline) <= asOf) fail("deadline is not after asOf");

  // Commits
  const shas = new Set<string>();
  for (const c of s.commits) {
    const where = `commit ${c.sha.slice(0, 7)}`;
    if (shas.has(c.sha)) fail(`${where}: duplicate sha`);
    shas.add(c.sha);
    isPerson(c.author, where);
    inWindow(c.date, where);
    if (c.directToMain && c.branch !== "main") fail(`${where}: directToMain but branch is ${c.branch}`);
    if (c.files.length === 0) fail(`${where}: no files`);
  }
  for (let i = 1; i < s.commits.length; i++) {
    if (s.commits[i].date < s.commits[i - 1].date) fail("commits are not sorted by date");
  }

  // Pull requests
  const prNumbers = new Set<number>();
  for (const pr of s.pullRequests) {
    const where = `PR #${pr.number}`;
    if (prNumbers.has(pr.number)) fail(`${where}: duplicate number`);
    prNumbers.add(pr.number);
    isPerson(pr.author, where);
    inWindow(pr.createdAt, where);
    if (pr.state === "merged") {
      if (!pr.mergedAt || pr.closedAt !== pr.mergedAt) fail(`${where}: merged needs mergedAt equal to closedAt`);
      else {
        inWindow(pr.mergedAt, where);
        if (pr.mergedAt <= pr.createdAt) fail(`${where}: merged before it was created`);
      }
    } else if (pr.state === "closed") {
      if (pr.mergedAt || !pr.closedAt) fail(`${where}: closed needs closedAt and no mergedAt`);
      else if (pr.closedAt <= pr.createdAt) fail(`${where}: closed before it was created`);
    } else if (pr.mergedAt || pr.closedAt) fail(`${where}: open but has mergedAt or closedAt`);
    if (pr.state !== "open" && pr.mergeable !== "unknown") fail(`${where}: mergeable should be unknown once finished`);

    const adds = pr.files.reduce((a, f) => a + f.additions, 0);
    const dels = pr.files.reduce((a, f) => a + f.deletions, 0);
    if (adds !== pr.additions) fail(`${where}: additions ${pr.additions} but files add up to ${adds}`);
    if (dels !== pr.deletions) fail(`${where}: deletions ${pr.deletions} but files add up to ${dels}`);
    for (const f of pr.files) {
      if (f.status === "removed" && (f.ranges.length > 0 || f.additions > 0)) fail(`${where}: removed ${f.path} has ranges or additions`);
      for (const [a, b] of f.ranges) {
        if (a < 1 || b < a) fail(`${where}: bad range [${a}, ${b}] in ${f.path}`);
      }
    }

    for (const rv of pr.reviews) {
      isPerson(rv.reviewer, `${where} review`);
      if (rv.reviewer === pr.author) fail(`${where}: author reviewed their own PR`);
      if (rv.submittedAt <= pr.createdAt) fail(`${where}: review before the PR was created`);
      const end = pr.mergedAt ?? pr.closedAt;
      if (end && rv.submittedAt > end) fail(`${where}: review after the PR was finished`);
      if (ms(rv.submittedAt) > asOf) fail(`${where}: review after asOf`);
    }
    if (pr.state === "merged" && !s.commits.some((c) => c.branch === "main" && c.message.endsWith(`(#${pr.number})`))) {
      fail(`${where}: merged but no squash commit on main`);
    }
  }

  // Branches
  const mainTimes = s.commits.filter((c) => c.branch === "main").map((c) => ms(c.date));
  const branchNames = new Set<string>();
  for (const b of s.branches) {
    const where = `branch ${b.name}`;
    if (branchNames.has(b.name)) fail(`${where}: duplicate name`);
    branchNames.add(b.name);
    isPerson(b.owner, where);
    inWindow(b.createdAt, where);
    inWindow(b.lastPushAt, where);
    if (b.lastPushAt < b.createdAt) fail(`${where}: last push before it was created`);
    const own = s.commits.filter((c) => c.branch === b.name);
    if (own.length !== b.aheadOfMain) fail(`${where}: aheadOfMain ${b.aheadOfMain} but has ${own.length} commits`);
    const behind = mainTimes.filter((m) => m > ms(b.createdAt) && m <= asOf).length;
    if (behind !== b.behindMain) fail(`${where}: behindMain ${b.behindMain} but main has ${behind} newer commits`);
    if (own.length > 0 && own[own.length - 1].date !== b.lastPushAt) fail(`${where}: lastPushAt does not match its last commit`);
    const pr = s.pullRequests.find((p) => p.branch === b.name && p.state === "open");
    if (b.hasOpenPR !== Boolean(pr)) fail(`${where}: hasOpenPR is ${b.hasOpenPR} but open PR is ${pr ? "there" : "missing"}`);
  }
  for (const pr of s.pullRequests) {
    if (pr.state === "open" && !branchNames.has(pr.branch)) fail(`PR #${pr.number}: open but branch ${pr.branch} is missing`);
  }

  // Tasks
  const taskIds = new Set<string>();
  for (const task of s.tasks) {
    const where = `task ${task.id}`;
    if (taskIds.has(task.id)) fail(`${where}: duplicate id`);
    taskIds.add(task.id);
    if (task.assignee !== null) isPerson(task.assignee, where);
    inWindow(task.createdAt, where);
    if (task.startedAt) {
      inWindow(task.startedAt, where);
      if (task.startedAt < task.createdAt) fail(`${where}: started before it was created`);
    }
    if (task.status === "done") {
      if (!task.doneAt) fail(`${where}: done without doneAt`);
      else {
        inWindow(task.doneAt, where);
        if (task.startedAt && task.doneAt < task.startedAt) fail(`${where}: done before it started`);
      }
    } else if (task.doneAt) fail(`${where}: has doneAt but status is ${task.status}`);
    if (task.status !== "todo" && !task.startedAt) fail(`${where}: ${task.status} without startedAt`);
    if (task.linkConfidence < 0 || task.linkConfidence > 1) fail(`${where}: linkConfidence out of 0..1`);
    if (task.linkSource === "none" && task.linkedPRs.length > 0) fail(`${where}: linkSource none but has linked PRs`);
    for (const n of task.linkedPRs) {
      const pr = s.pullRequests.find((p) => p.number === n);
      if (!pr) fail(`${where}: links to missing PR #${n}`);
      else if (!pr.taskIds.includes(task.id)) fail(`${where}: PR #${n} does not link back`);
    }
    if (task.linkSource === "branch-name" && task.linkedPRs.length === 0 && !s.branches.some((b) => b.name.includes(task.id))) {
      fail(`${where}: linked by branch name but no branch has its id`);
    }
  }
  for (const pr of s.pullRequests) {
    for (const id of pr.taskIds) {
      if (!taskIds.has(id)) fail(`PR #${pr.number}: links to missing task ${id}`);
    }
  }

  return errors;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("data/gen/validate.ts")) {
  const dir = join(process.cwd(), "data", "snapshots");
  const errors = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => validate(JSON.parse(readFileSync(join(dir, f), "utf8")) as RepoSnapshot));
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log("All snapshots are valid.");
}
