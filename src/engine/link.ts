// Task-to-code links. Order: branch name, PR text, commit text.
// AI matching is only a fallback for tasks no rule could link (wired in B6).

import type { LinkSource, PullRequest, RepoSnapshot, Task } from "../lib/types";

export interface AiLink {
  taskId: string;
  prNumber: number;
  confidence: number; // 0..1
}

/** Hook for the AI fallback. Gets only the tasks and PRs that rules could not link. */
export type AiMatcher = (tasks: Task[], prs: PullRequest[]) => AiLink[];

/** True when text mentions the task: "NEX-104" anywhere, or "#12" for numeric ids. */
export function mentions(text: string, taskId: string): boolean {
  const escaped = taskId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = /^\d+$/.test(taskId) ? `#${escaped}\\b` : `\\b${escaped}\\b`;
  return new RegExp(pattern, "i").test(text);
}

/**
 * Links tasks that have no links yet. Tasks that already carry links
 * (synthetic data, a CSV with PR numbers) are left as they are.
 */
export function linkTasks(s: RepoSnapshot, ai?: AiMatcher): RepoSnapshot {
  const tasks = s.tasks.map((t) => ({ ...t, linkedPRs: [...t.linkedPRs] }));
  const prs = s.pullRequests.map((p) => ({ ...p, taskIds: [...p.taskIds] }));

  const link = (task: Task, pr: PullRequest, source: LinkSource, confidence: number) => {
    if (!task.linkedPRs.includes(pr.number)) task.linkedPRs.push(pr.number);
    if (!pr.taskIds.includes(task.id)) pr.taskIds.push(task.id);
    task.linkSource = source;
    task.linkConfidence = confidence;
  };

  const unlinked = () => tasks.filter((t) => t.linkedPRs.length === 0 && (t.linkSource === "none" || t.linkSource === "ai"));

  for (const task of unlinked()) {
    const byBranch = prs.filter((p) => mentions(p.branch, task.id));
    const byTitle = prs.filter((p) => mentions(p.title, task.id));
    const byCommit = prs.filter((p) =>
      s.commits.some((c) => c.branch === p.branch && mentions(c.message, task.id)));
    if (byBranch.length > 0) byBranch.forEach((p) => link(task, p, "branch-name", 1));
    else if (byTitle.length > 0) byTitle.forEach((p) => link(task, p, "pr-text", 1));
    else if (byCommit.length > 0) byCommit.forEach((p) => link(task, p, "commit-text", 1));
  }

  if (ai) {
    const rest = unlinked();
    const free = prs.filter((p) => p.taskIds.length === 0);
    if (rest.length > 0 && free.length > 0) {
      for (const m of ai(rest, free)) {
        const task = tasks.find((t) => t.id === m.taskId);
        const pr = prs.find((p) => p.number === m.prNumber);
        // Code checks the AI answer: both ids must exist and confidence must be sane.
        if (task && pr && m.confidence > 0 && m.confidence <= 1) link(task, pr, "ai", m.confidence);
      }
    }
  }

  for (const t of tasks) t.linkedPRs.sort((a, b) => a - b);
  return { ...s, tasks, pullRequests: prs };
}
