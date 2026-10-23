// Collects plans for PRs, branches, direct pushes and tasks, then turns them
// into one RepoSnapshot with commits, ahead/behind counts and PR numbers filled in.

import type {
  Branch,
  Commit,
  FileChange,
  LinkSource,
  PullRequest,
  RepoSnapshot,
  Review,
  Task,
  TaskStatus,
  Team,
} from "../../src/lib/types";
import { Rng, hex, mulberry32, pick, split } from "./prng";
import { HOUR, iso, minute, t } from "./time";

export interface PRPlan {
  number?: number; // fixed number; others are filled in by creation order
  author: string;
  title: string;
  branch: string;
  createdAt: number;
  mergedAt?: number;
  closedAt?: number; // closed without merge
  files: FileChange[];
  reviews?: Review[];
  mergeable?: PullRequest["mergeable"];
  commits?: number;
  branchCreatedAt?: number;
  lastPushAt?: number;
  firstCommitMessage?: string;
}

export interface BranchPlan {
  name: string;
  owner: string;
  createdAt?: number;
  /** Place createdAt so exactly this many main commits come after it. */
  behindMain?: number;
  lastPushAt: number;
  files: FileChange[];
  commits?: number;
  firstCommitMessage?: string;
}

export interface DirectPush {
  author: string;
  at: number;
  message: string;
  files: FileChange[];
}

export interface TaskPlan {
  id: string;
  title: string;
  assignee: string | null;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  doneAt?: number;
  dueAt?: number;
  prs?: PRPlan[];
  linkSource: LinkSource;
  linkConfidence?: number;
}

const FOLLOW_UP_MESSAGES = [
  "Fix lint errors",
  "Address review comments",
  "Add tests",
  "Handle empty state",
  "Clean up",
  "Fix typo",
  "Rename variables",
  "Small fixes",
];

interface OpenBranch {
  name: string;
  owner: string;
  createdAt: string;
  files: FileChange[];
  hasOpenPR: boolean;
}

export class Builder {
  readonly r: Rng;
  readonly asOf: number;
  private prs: PRPlan[] = [];
  private branchPlans: BranchPlan[] = [];
  private pushes: DirectPush[] = [];
  private taskPlans: TaskPlan[] = [];

  constructor(seed: number, readonly team: Team, asOf: string) {
    this.r = mulberry32(seed);
    this.asOf = t(asOf);
  }

  pr(p: PRPlan): PRPlan {
    this.prs.push(p);
    return p;
  }

  branch(b: BranchPlan): BranchPlan {
    this.branchPlans.push(b);
    return b;
  }

  directPush(d: DirectPush): void {
    this.pushes.push(d);
  }

  task(p: TaskPlan): TaskPlan {
    this.taskPlans.push(p);
    return p;
  }

  build(): RepoSnapshot {
    const numbers = this.numberPRs();
    const commits: Commit[] = [];
    const pullRequests: PullRequest[] = [];
    const open: OpenBranch[] = [];

    const ordered = [...this.prs].sort((a, b) => numbers.get(a)! - numbers.get(b)!);
    for (const p of ordered) {
      const num = numbers.get(p)!;
      const additions = sum(p.files, "additions");
      const deletions = sum(p.files, "deletions");
      const start = p.branchCreatedAt ?? p.createdAt - (6 + this.r() * 30) * HOUR;
      const finish = p.mergedAt ?? p.closedAt;
      const end = p.lastPushAt ?? (finish !== undefined ? finish - HOUR : p.createdAt);
      const count = p.commits ?? Math.min(6, 1 + Math.floor(additions / 120));
      const branchCommits = this.commitsFor(
        p.author, p.branch, start, end, count, p.files, additions, deletions,
        p.firstCommitMessage ?? p.title,
      );
      commits.push(...branchCommits);

      if (p.mergedAt !== undefined) {
        // Squash merge: one commit on main that carries the whole PR diff.
        commits.push({
          sha: hex(this.r, 40),
          author: p.author,
          date: iso(p.mergedAt),
          message: `${p.title} (#${num})`,
          branch: "main",
          additions,
          deletions,
          files: p.files.map((f) => f.path),
          directToMain: false,
        });
      }

      const state = p.mergedAt !== undefined ? "merged" : p.closedAt !== undefined ? "closed" : "open";
      pullRequests.push({
        number: num,
        title: p.title,
        author: p.author,
        branch: p.branch,
        baseBranch: "main",
        createdAt: iso(p.createdAt),
        mergedAt: p.mergedAt !== undefined ? iso(p.mergedAt) : null,
        closedAt: finish !== undefined ? iso(finish) : null,
        state,
        additions,
        deletions,
        files: p.files,
        reviews: [...(p.reviews ?? [])].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
        mergeable: state === "open" ? (p.mergeable ?? "clean") : "unknown",
        taskIds: [],
      });

      if (state === "open") {
        open.push({ name: p.branch, owner: p.author, createdAt: iso(start), files: p.files, hasOpenPR: true });
      }
    }

    for (const d of this.pushes) {
      commits.push({
        sha: hex(this.r, 40),
        author: d.author,
        date: iso(d.at),
        message: d.message,
        branch: "main",
        additions: sum(d.files, "additions"),
        deletions: sum(d.files, "deletions"),
        files: d.files.map((f) => f.path),
        directToMain: true,
      });
    }

    // Main is complete now, so branches can be placed against it.
    const mainTimes = commits
      .filter((c) => c.branch === "main")
      .map((c) => t(c.date))
      .sort((a, b) => b - a);

    for (const b of this.branchPlans) {
      let created = b.createdAt;
      if (b.behindMain !== undefined) {
        const newer = mainTimes[b.behindMain - 1];
        const older = mainTimes[b.behindMain];
        if (newer === undefined || older === undefined) throw new Error(`Branch ${b.name}: main is too short`);
        created = minute((newer + older) / 2);
      }
      if (created === undefined) throw new Error(`Branch ${b.name} needs createdAt or behindMain`);
      const additions = sum(b.files, "additions");
      const deletions = sum(b.files, "deletions");
      const count = b.commits ?? Math.min(6, 1 + Math.floor(additions / 120));
      commits.push(
        ...this.commitsFor(
          b.owner, b.name, created, b.lastPushAt, count, b.files, additions, deletions,
          b.firstCommitMessage ?? `Start ${b.name.replace(/^feature\//, "")}`,
        ),
      );
      open.push({ name: b.name, owner: b.owner, createdAt: iso(created), files: b.files, hasOpenPR: false });
    }

    commits.sort((a, b) => a.date.localeCompare(b.date) || a.sha.localeCompare(b.sha));

    const branches: Branch[] = open
      .map((b) => {
        const own = commits.filter((c) => c.branch === b.name);
        const created = t(b.createdAt);
        return {
          name: b.name,
          owner: b.owner,
          createdAt: b.createdAt,
          lastPushAt: own[own.length - 1].date,
          aheadOfMain: own.length,
          behindMain: mainTimes.filter((m) => m > created && m <= this.asOf).length,
          filesTouched: b.files,
          hasOpenPR: b.hasOpenPR,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const tasks: Task[] = this.taskPlans.map((p) => {
      const linkedPRs = (p.prs ?? []).map((pr) => numbers.get(pr)!).sort((a, b) => a - b);
      for (const n of linkedPRs) pullRequests.find((pr) => pr.number === n)!.taskIds.push(p.id);
      const task: Task = {
        id: p.id,
        title: p.title,
        assignee: p.assignee,
        status: p.status,
        createdAt: iso(p.createdAt),
        linkedPRs,
        linkSource: p.linkSource,
        linkConfidence: p.linkConfidence ?? (p.linkSource === "none" ? 0 : 1),
      };
      if (p.startedAt !== undefined) task.startedAt = iso(p.startedAt);
      if (p.doneAt !== undefined) task.doneAt = iso(p.doneAt);
      if (p.dueAt !== undefined) task.dueAt = iso(p.dueAt);
      return task;
    });
    tasks.sort((a, b) => taskNumber(a.id) - taskNumber(b.id));
    for (const pr of pullRequests) pr.taskIds.sort((a, b) => taskNumber(a) - taskNumber(b));

    return {
      team: this.team,
      asOf: iso(this.asOf),
      source: "synthetic",
      commits,
      pullRequests,
      branches,
      tasks,
    };
  }

  /**
   * PR numbers follow creation order. A fixed number (like #31) is honoured;
   * the PRs before it are spread out with gaps, as if issues used the others.
   */
  private numberPRs(): Map<PRPlan, number> {
    const sorted = [...this.prs].sort((a, b) => a.createdAt - b.createdAt);
    const out = new Map<PRPlan, number>();
    let prev = 0;
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].number === undefined) j++;
      const free = j - i;
      if (j < sorted.length) {
        const fixed = sorted[j].number!;
        const room = fixed - prev - 1;
        if (room < free) throw new Error(`PR #${fixed}: ${free} PRs are created before it, only ${room} numbers left`);
        for (let k = 0; k < free; k++) out.set(sorted[i + k], prev + 1 + Math.floor((k * room) / free));
        out.set(sorted[j], fixed);
        prev = fixed;
        i = j + 1;
      } else {
        for (let k = 0; k < free; k++) out.set(sorted[i + k], prev + 1 + k);
        i = j;
      }
    }
    return out;
  }

  private commitsFor(
    author: string, branch: string, start: number, end: number, count: number,
    files: FileChange[], additions: number, deletions: number, firstMessage: string,
  ): Commit[] {
    const n = Math.max(1, count);
    const adds = split(this.r, additions, n);
    const dels = split(this.r, deletions, n);
    const first = start + HOUR;
    const last = Math.max(end, first);
    const out: Commit[] = [];
    for (let i = 0; i < n; i++) {
      const date = n === 1 ? last : first + ((last - first) * i) / (n - 1);
      const own = files.filter((_, k) => k % n === i);
      out.push({
        sha: hex(this.r, 40),
        author,
        date: iso(date),
        message: i === 0 ? firstMessage : pick(this.r, FOLLOW_UP_MESSAGES),
        branch,
        additions: adds[i],
        deletions: dels[i],
        files: (own.length > 0 ? own : [files[i % files.length]]).map((f) => f.path),
        directToMain: false,
      });
    }
    return out;
  }
}

function sum(files: FileChange[], key: "additions" | "deletions"): number {
  return files.reduce((a, f) => a + f[key], 0);
}

function taskNumber(id: string): number {
  return Number(id.split("-")[1]);
}
