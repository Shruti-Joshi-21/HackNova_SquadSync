// Pasted repo link -> RepoSnapshot (source "github").
//
// What we read: the default branch's commits, recent pull requests with their
// files and reviews, open branches compared with main, and issues as tasks.
// Every list is capped so one paste costs about 100 to 130 requests.

import type { Branch, Commit, FileChange, Person, PullRequest, RepoSnapshot, Review, Task } from "../types";
import { Client, GitHubError, createClient, pool } from "./client";
import { rangesFromPatch } from "./patch";

export const LIMITS = {
  commitPages: 3, // 100 commits per page on the default branch
  maxPRs: 30, // most recently updated PRs that get files and reviews
  maxBranches: 20, // open branches compared with main
  issuePages: 2,
  maxPeople: 12, // SquadSync is for small teams
  directPushDetails: 10, // direct pushes we fetch files for
  concurrency: 6,
  windowDays: 56, // default project length when no start date is given
  directPushDays: 14,
};

/* ---- the parts of GitHub's answers we use ---- */

interface GhUser { login: string; type?: string }
interface GhRepo { full_name: string; default_branch: string; created_at: string }
interface GhCommit {
  sha: string;
  author: GhUser | null;
  committer: GhUser | null;
  commit: { author: { name: string; date: string }; committer: { name: string; date: string }; message: string };
  parents: { sha: string }[];
  files?: GhFile[];
  stats?: { additions: number; deletions: number };
}
interface GhPull {
  number: number;
  title: string;
  body: string | null;
  user: GhUser | null;
  head: { ref: string; repo: { full_name: string } | null };
  base: { ref: string };
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  state: "open" | "closed";
  merge_commit_sha: string | null;
}
interface GhPullDetail extends GhPull { mergeable: boolean | null; mergeable_state?: string }
interface GhFile { filename: string; status: string; additions: number; deletions: number; patch?: string; previous_filename?: string }
interface GhReview { user: GhUser | null; state: string; submitted_at?: string }
interface GhBranch { name: string }
interface GhCompare { ahead_by: number; behind_by: number; commits: GhCommit[]; files?: GhFile[] }
interface GhIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  state_reason?: string | null;
  created_at: string;
  closed_at: string | null;
  assignee: GhUser | null;
  labels: ({ name?: string } | string)[];
  pull_request?: unknown;
}

export interface IngestInput {
  repo: string; // "owner/name" or a github.com URL
  deadline: string;
  projectStart?: string;
}

/** "https://github.com/a/b.git", "github.com/a/b/pulls", "a/b" -> { owner: "a", name: "b" } */
export function parseRepo(text: string): { owner: string; name: string } | null {
  const m = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:[/?#].*)?$/.exec(text.trim());
  return m ? { owner: m[1], name: m[2] } : null;
}

const iso = (d: string | Date) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
const isBot = (u: GhUser | null | undefined) => !u || u.type === "Bot" || u.login.endsWith("[bot]");
const enc = encodeURIComponent;

async function pages<T>(gh: Client, path: string, max: number): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= max; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const batch = await gh.get<T[]>(`${path}${sep}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

function toFile(f: GhFile): FileChange {
  const status: FileChange["status"] =
    f.status === "added" || f.status === "removed" || f.status === "renamed" ? f.status : "modified";
  return {
    path: f.filename,
    status,
    ...(status === "renamed" && f.previous_filename ? { previousPath: f.previous_filename } : {}),
    ranges: status === "removed" ? [] : rangesFromPatch(f.patch),
    additions: f.additions,
    deletions: f.deletions,
  };
}

export async function fetchSnapshot(input: IngestInput, gh: Client = createClient()): Promise<RepoSnapshot> {
  const parsed = parseRepo(input.repo);
  if (!parsed) throw new GitHubError(`"${input.repo}" is not a GitHub repo, so use owner/name or a github.com link.`, 400);
  const base = `/repos/${enc(parsed.owner)}/${enc(parsed.name)}`;
  const now = new Date();
  const asOf = iso(now);

  const repo = await gh.get<GhRepo>(base);
  const main = repo.default_branch;
  // No start date given: take the 8 weeks up to the repo's latest commit.
  // Not the repo's creation date: a fork or an imported repo is "created" after
  // its own commits, which would leave nothing to analyse.
  let start: Date;
  if (input.projectStart) {
    start = new Date(input.projectStart);
  } else {
    const latest = await gh
      .get<GhCommit[]>(`${base}/commits?sha=${enc(main)}&per_page=1`)
      .catch(() => [] as GhCommit[]); // an empty repo answers 409
    const last = latest[0] ? Date.parse(latest[0].commit.committer.date) : now.getTime();
    start = new Date(Math.min(last, now.getTime()) - LIMITS.windowDays * 86_400_000);
  }
  const since = iso(start);

  const [mainCommits, pulls, branchList, issues] = await Promise.all([
    pages<GhCommit>(gh, `${base}/commits?sha=${enc(main)}&since=${since}`, LIMITS.commitPages),
    gh.get<GhPull[]>(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`),
    gh.get<GhBranch[]>(`${base}/branches?per_page=100`),
    pages<GhIssue>(gh, `${base}/issues?state=all&since=${since}`, LIMITS.issuePages),
  ]);

  // Pull requests in the project window, newest activity first, capped.
  const recentPulls = pulls
    .filter((p) => !isBot(p.user) && (p.state === "open" || Date.parse(p.created_at) >= start.getTime() || (p.merged_at && Date.parse(p.merged_at) >= start.getTime())))
    .slice(0, LIMITS.maxPRs);

  // Too big a team? Say so before spending requests on PR details.
  const early = new Set([
    ...mainCommits.filter((c) => !isBot(c.author)).map((c) => c.author?.login ?? c.commit.author.name),
    ...recentPulls.map((p) => p.user!.login),
  ]);
  if (early.size > LIMITS.maxPeople) {
    throw new GitHubError(`This repo has ${early.size} or more contributors in the project dates, and SquadSync is built for teams of up to ${LIMITS.maxPeople}.`, 422);
  }

  const details = await pool(recentPulls, LIMITS.concurrency, async (p) => {
    const [files, reviews, detail] = await Promise.all([
      gh.get<GhFile[]>(`${base}/pulls/${p.number}/files?per_page=100`),
      gh.get<GhReview[]>(`${base}/pulls/${p.number}/reviews?per_page=100`),
      p.state === "open" ? gh.get<GhPullDetail>(`${base}/pulls/${p.number}`) : Promise.resolve(null),
    ]);
    return { p, files, reviews, detail };
  });

  // Open work branches: branches of open PRs first, then the rest.
  const openRefs = new Set(recentPulls.filter((p) => p.state === "open" && p.head.repo?.full_name === repo.full_name).map((p) => p.head.ref));
  const candidates = branchList
    .map((b) => b.name)
    .filter((n) => n !== main)
    .sort((a, b) => Number(openRefs.has(b)) - Number(openRefs.has(a)))
    .slice(0, LIMITS.maxBranches);
  const compares = (await pool(candidates, LIMITS.concurrency, async (name) => ({
    name,
    cmp: await gh.get<GhCompare>(`${base}/compare/${enc(main)}...${enc(name)}`),
  }))).filter((x) => x.cmp.ahead_by > 0);

  // Direct pushes: commits on main's first-parent line that are not merges,
  // were not made by GitHub (web-flow commits come from the merge button),
  // and are not a PR's squash commit.
  const byShaMain = new Map(mainCommits.map((c) => [c.sha, c]));
  const firstParent = new Set<string>();
  for (let c = mainCommits[0]; c; c = byShaMain.get(c.parents[0]?.sha)!) {
    firstParent.add(c.sha);
    if (!c.parents[0]) break;
  }
  const mergeShas = new Set(recentPulls.map((p) => p.merge_commit_sha).filter(Boolean));
  const recentCut = now.getTime() - LIMITS.directPushDays * 86_400_000;
  const direct = new Set(
    mainCommits
      .filter((c) => firstParent.has(c.sha) && c.parents.length === 1 && c.committer?.login !== "web-flow" && !mergeShas.has(c.sha) && !isBot(c.author))
      .map((c) => c.sha),
  );
  const toDetail = mainCommits
    .filter((c) => direct.has(c.sha) && Date.parse(c.commit.committer.date) >= recentCut)
    .slice(0, LIMITS.directPushDetails);
  const directDetails = new Map(
    (await pool(toDetail, LIMITS.concurrency, (c) => gh.get<GhCommit>(`${base}/commits/${c.sha}`))).map((c) => [c.sha, c]),
  );

  /* ---- people: everyone with activity, bots left out ---- */
  const seen = new Map<string, { first: number; count: number }>();
  const note = (login: string | undefined, date: string) => {
    if (!login) return;
    const t = Date.parse(date);
    const s = seen.get(login) ?? { first: t, count: 0 };
    s.first = Math.min(s.first, t);
    s.count++;
    seen.set(login, s);
  };
  const commitLogin = (c: GhCommit) => (isBot(c.author) && c.author ? undefined : c.author?.login ?? c.commit.author.name);
  for (const c of mainCommits) note(commitLogin(c), c.commit.author.date);
  for (const { cmp } of compares) for (const c of cmp.commits) note(commitLogin(c), c.commit.author.date);
  for (const { p, reviews } of details) {
    note(p.user?.login, p.created_at);
    for (const r of reviews) if (!isBot(r.user) && r.submitted_at) note(r.user!.login, r.submitted_at);
  }
  if (seen.size === 0) throw new GitHubError("This repo has no commits, pull requests or branches to analyse yet.", 422);
  if (seen.size > LIMITS.maxPeople) {
    throw new GitHubError(`This repo has ${seen.size} contributors in the project dates, and SquadSync is built for teams of up to ${LIMITS.maxPeople}.`, 422);
  }
  const logins = [...seen.entries()].sort((a, b) => a[1].first - b[1].first || a[0].localeCompare(b[0])).map(([l]) => l);
  const people: Person[] = logins.map((login, i) => ({
    id: `p${i + 1}`,
    displayName: `Member ${String.fromCharCode(65 + i)}`,
    githubLogin: login,
    taskAssignee: login,
    role: "mixed",
    colorIndex: i % 5,
  }));
  const idOf = new Map(people.map((p) => [p.githubLogin, p.id]));
  const pid = (login: string | undefined | null) => (login ? idOf.get(login) : undefined);

  /* ---- commits ---- */
  const commits: Commit[] = [];
  const shas = new Set<string>();
  for (const c of mainCommits) {
    const author = pid(commitLogin(c));
    if (!author) continue;
    const d = directDetails.get(c.sha);
    commits.push({
      sha: c.sha,
      author,
      date: iso(c.commit.committer.date),
      message: c.commit.message.split("\n")[0],
      branch: "main",
      additions: d?.stats?.additions ?? 0,
      deletions: d?.stats?.deletions ?? 0,
      files: d?.files?.map((f) => f.filename) ?? [],
      directToMain: direct.has(c.sha),
    });
    shas.add(c.sha);
  }
  for (const { name, cmp } of compares) {
    for (const c of cmp.commits) {
      const author = pid(commitLogin(c));
      if (!author || shas.has(c.sha)) continue;
      shas.add(c.sha);
      commits.push({
        sha: c.sha, author, date: iso(c.commit.committer.date), message: c.commit.message.split("\n")[0],
        branch: name, additions: 0, deletions: 0, files: [], directToMain: false,
      });
    }
  }
  commits.sort((a, b) => a.date.localeCompare(b.date) || a.sha.localeCompare(b.sha));

  /* ---- pull requests ---- */
  const pullRequests: PullRequest[] = [];
  for (const { p, files, reviews, detail } of details) {
    const author = pid(p.user?.login);
    if (!author) continue;
    const changes = files.map(toFile);
    const mapped: Review[] = reviews
      .filter((r) => !isBot(r.user) && r.submitted_at && ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"].includes(r.state))
      .map((r) => ({
        reviewer: pid(r.user!.login)!,
        submittedAt: iso(r.submitted_at!),
        state: r.state === "APPROVED" ? "approved" as const : r.state === "CHANGES_REQUESTED" ? "changes_requested" as const : "commented" as const,
      }))
      .filter((r) => r.reviewer && r.reviewer !== author);
    pullRequests.push({
      number: p.number,
      title: p.title,
      author,
      branch: p.head.ref,
      baseBranch: p.base.ref,
      createdAt: iso(p.created_at),
      mergedAt: p.merged_at ? iso(p.merged_at) : null,
      closedAt: p.closed_at ? iso(p.closed_at) : null,
      state: p.merged_at ? "merged" : p.state === "open" ? "open" : "closed",
      additions: changes.reduce((a, f) => a + f.additions, 0),
      deletions: changes.reduce((a, f) => a + f.deletions, 0),
      files: changes,
      reviews: mapped,
      mergeable: detail?.mergeable === false || detail?.mergeable_state === "dirty" ? "conflicting" : detail?.mergeable === true ? "clean" : "unknown",
      taskIds: [],
    });
  }
  pullRequests.sort((a, b) => a.number - b.number);

  /* ---- branches ---- */
  const branches: Branch[] = compares.flatMap(({ name, cmp }) => {
    const pr = pullRequests.find((p) => p.branch === name && p.state === "open");
    const authors = cmp.commits.map((c) => pid(commitLogin(c))).filter((x): x is string => Boolean(x));
    const owner = pr?.author ?? mostCommon(authors);
    if (!owner || cmp.commits.length === 0) return [];
    const dates = cmp.commits.map((c) => iso(c.commit.committer.date)).sort();
    return [{
      name,
      owner,
      createdAt: dates[0],
      lastPushAt: dates[dates.length - 1],
      aheadOfMain: cmp.ahead_by,
      behindMain: cmp.behind_by,
      filesTouched: (cmp.files ?? []).map(toFile),
      hasOpenPR: Boolean(pr),
    }];
  });

  /* ---- issues as tasks ---- */
  const labelText = (i: GhIssue) => i.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).join(" ").toLowerCase();
  const tasks: Task[] = [];
  for (const i of issues) {
    if (i.pull_request || i.state_reason === "not_planned") continue;
    const id = String(i.number);
    const linked = pullRequests
      .filter((p) => new RegExp(`#${id}\\b`).test(`${p.title} ${details.find((d) => d.p.number === p.number)?.p.body ?? ""}`))
      .map((p) => p.number);
    const openPR = pullRequests.some((p) => linked.includes(p.number) && p.state === "open");
    const status: Task["status"] =
      i.state === "closed" ? "done"
      : openPR || /review/.test(labelText(i)) ? "in_review"
      : /progress|doing|wip/.test(labelText(i)) ? "in_progress"
      : "todo";
    const task: Task = {
      id,
      title: i.title,
      assignee: pid(i.assignee?.login) ?? null,
      status,
      createdAt: iso(i.created_at),
      linkedPRs: linked,
      linkSource: linked.length > 0 ? "pr-text" : "none",
      linkConfidence: linked.length > 0 ? 1 : 0,
    };
    // GitHub has no "started" date; the issue's creation is the closest we have.
    if (status !== "todo") task.startedAt = task.createdAt;
    if (status === "done" && i.closed_at) task.doneAt = iso(i.closed_at);
    tasks.push(task);
    for (const n of linked) pullRequests.find((p) => p.number === n)!.taskIds.push(id);
  }
  tasks.sort((a, b) => Number(a.id) - Number(b.id));

  // The project starts at its first real activity, not at the start of the
  // 8-week reading window: a repo made yesterday must not show "56 days used".
  // First activity is the earlier of the repo's creation and its oldest commit
  // or PR in the window (a fork's commits are older than the fork itself).
  // If the commit list hit its cap, older commits exist, so keep the window start.
  let projectStart = since;
  if (!input.projectStart && mainCommits.length < LIMITS.commitPages * 100) {
    const first = Math.min(
      Date.parse(repo.created_at),
      ...mainCommits.map((c) => Date.parse(c.commit.committer.date)),
      ...recentPulls.map((p) => Date.parse(p.created_at)),
    );
    if (first > start.getTime()) projectStart = iso(new Date(first));
  }

  const deadline = new Date(input.deadline);
  return {
    team: {
      id: `gh-${parsed.owner}-${parsed.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      name: repo.full_name,
      projectStart,
      deadline: iso(deadline),
      people,
    },
    asOf,
    source: "github",
    commits,
    pullRequests,
    branches,
    tasks,
  };
}

function mostCommon(list: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const x of list) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
