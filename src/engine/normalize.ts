// One person record per human, one event shape, tasks linked to code.

import type { RepoSnapshot, Team } from "../lib/types";
import { AiMatcher, linkTasks } from "./link";

/**
 * Maps any name used in the data (GitHub login, task-board name, or the id
 * itself) to Person.id. Case-insensitive. Unknown names are kept as they are.
 */
export function identityMap(team: Team): (name: string) => string {
  const byName = new Map<string, string>();
  for (const p of team.people) {
    byName.set(p.id.toLowerCase(), p.id);
    byName.set(p.githubLogin.toLowerCase(), p.id);
    if (p.taskAssignee) byName.set(p.taskAssignee.toLowerCase(), p.id);
  }
  return (name: string) => byName.get(name.trim().toLowerCase()) ?? name;
}

/** Normalise a snapshot: identity match, then task-to-code links. Pure. */
export function normalize(s: RepoSnapshot, ai?: AiMatcher): RepoSnapshot {
  const who = identityMap(s.team);
  const out: RepoSnapshot = {
    ...s,
    commits: s.commits.map((c) => ({ ...c, author: who(c.author) })),
    pullRequests: s.pullRequests.map((p) => ({
      ...p,
      author: who(p.author),
      reviews: p.reviews.map((r) => ({ ...r, reviewer: who(r.reviewer) })),
    })),
    branches: s.branches.map((b) => ({ ...b, owner: who(b.owner) })),
    tasks: s.tasks.map((t) => ({ ...t, assignee: t.assignee === null ? null : who(t.assignee) })),
  };
  return linkTasks(out, ai);
}

/** Entry point named in ARCHITECTURE.md: raw data from any source to a clean snapshot. */
export function buildSnapshot(raw: RepoSnapshot, source: RepoSnapshot["source"], ai?: AiMatcher): RepoSnapshot {
  return normalize({ ...raw, source }, ai);
}
