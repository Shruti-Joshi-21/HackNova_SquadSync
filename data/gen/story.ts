// Helpers that each team file uses to write its history in a few lines:
// ship() = one merged PR with its task(s) and reviews.

import type { FileChange, LinkSource, Review, TaskStatus } from "../../src/lib/types";
import { Builder, PRPlan, TaskPlan } from "./builder";
import { int, pick, shuffle, split } from "./prng";
import { DAY, HOUR, iso, t } from "./time";

export interface Area {
  folder: string;
  files: string[];
  things: string[];
}

export function changed(path: string, start: number, end: number, deletions?: number): FileChange {
  const additions = end - start + 1;
  return {
    path,
    status: "modified",
    ranges: [[start, end]],
    additions,
    deletions: deletions ?? Math.round(additions * 0.3),
  };
}

export function added(path: string, lines: number): FileChange {
  return { path, status: "added", ranges: [[1, lines]], additions: lines, deletions: 0 };
}

export function removed(path: string, lines: number): FileChange {
  return { path, status: "removed", ranges: [], additions: 0, deletions: lines };
}

export function review(reviewer: string, at: number, state: Review["state"] = "approved"): Review {
  return { reviewer, submittedAt: iso(at), state };
}

export interface Ship {
  author: string;
  area: Area;
  mergedAt: number;
  size: number; // additions + deletions
  reviewers: string[]; // empty means merged without review
  openHours?: number; // how long the PR was open before merge
  branchDays?: number; // how long the branch lived before the PR was opened
  link?: LinkSource;
  extraTasks?: number; // more finished tasks closed by the same PR
}

const VERBS = ["Add", "Build", "Improve", "Wire up", "Fix", "Refactor"];

export class Story {
  private counter = 100; // board keys start at 101, so they never look like PR numbers
  private thingIndex = new Map<Area, number>();
  private branchNames = new Set<string>();
  private projectStart: number;

  constructor(readonly b: Builder, readonly key: string) {
    this.projectStart = t(b.team.projectStart);
  }

  nextKey(): string {
    this.counter += 1;
    return `${this.key}-${this.counter}`;
  }

  /** Changed files for a PR of the given size inside one area. */
  files(size: number, area: Area): FileChange[] {
    const r = this.b.r;
    const n = Math.max(1, Math.min(area.files.length, Math.round(size / 90), 6));
    const names = shuffle(r, area.files).slice(0, n);
    const parts = split(r, size, n);
    return names.map((name, i) => {
      const path = `${area.folder}/${name}`;
      const part = Math.max(2, parts[i]);
      if (r() < 0.4) return added(path, part);
      const deletions = Math.round(part * 0.25);
      const start = int(r, 1, 180);
      return changed(path, start, start + (part - deletions) - 1, deletions);
    });
  }

  /** One merged PR, its branch commits, reviews and the finished task(s). */
  ship(s: Ship): PRPlan {
    const r = this.b.r;
    const thing = this.thing(s.area);
    const verb = pick(r, VERBS);
    const link = s.link ?? pickLink(r());
    const key = this.nextKey();

    const open = (s.openHours ?? int(r, 6, 40)) * HOUR;
    const createdAt = s.mergedAt - open;
    const branchCreatedAt = Math.max(
      this.projectStart + 2 * HOUR,
      createdAt - (s.branchDays !== undefined ? s.branchDays * DAY : int(r, 6, 40) * HOUR),
    );
    const branch = this.branchName(link === "branch-name" ? `feature/${key}-${slug(thing)}` : `feature/${slug(thing)}`);
    const title = link === "pr-text" ? `${key} ${verb} ${thing}` : `${verb} ${thing}`;

    const reviews: Review[] = [];
    s.reviewers.forEach((who, i) => {
      const at = createdAt + open * (0.15 + 0.2 * i + 0.2 * r());
      if (r() < 0.25) {
        reviews.push(review(who, at, "changes_requested"));
        reviews.push(review(who, createdAt + open * 0.85, "approved"));
      } else {
        reviews.push(review(who, at, r() < 0.15 ? "commented" : "approved"));
      }
    });

    const pr = this.b.pr({
      author: s.author,
      title,
      branch,
      createdAt,
      mergedAt: s.mergedAt,
      files: this.files(s.size, s.area),
      reviews,
      branchCreatedAt,
      firstCommitMessage: link === "commit-text" ? `${key} ${verb} ${thing}` : undefined,
    });

    const confidence = link === "ai" ? int(r, 62, 88) / 100 : 1;
    const done = Math.min(s.mergedAt + int(r, 0, 4) * HOUR, this.b.asOf);
    for (let i = 0; i <= (s.extraTasks ?? 0); i++) {
      this.b.task({
        id: i === 0 ? key : this.nextKey(),
        title: i === 0 ? capital(thing) : `${capital(thing)}: follow-up ${i}`,
        assignee: s.author,
        status: "done",
        createdAt: Math.max(this.projectStart, branchCreatedAt - int(r, 1, 5) * DAY),
        startedAt: branchCreatedAt,
        doneAt: done,
        prs: [pr],
        linkSource: link,
        linkConfidence: confidence,
      });
    }
    return pr;
  }

  /** A task that is not finished yet. */
  task(p: Omit<TaskPlan, "id" | "linkSource"> & { id?: string; linkSource?: LinkSource; status: TaskStatus }): TaskPlan {
    return this.b.task({
      ...p,
      id: p.id ?? this.nextKey(),
      linkSource: p.linkSource ?? (p.prs && p.prs.length > 0 ? "pr-text" : "none"),
    });
  }

  private thing(area: Area): string {
    const i = this.thingIndex.get(area) ?? 0;
    this.thingIndex.set(area, i + 1);
    const base = area.things[i % area.things.length];
    return i < area.things.length ? base : `${base} ${Math.floor(i / area.things.length) + 1}`;
  }

  private branchName(name: string): string {
    let out = name;
    for (let n = 2; this.branchNames.has(out); n++) out = `${name}-${n}`;
    this.branchNames.add(out);
    return out;
  }
}

/** Scale the sizes of late merges so they make up `share` of all merged lines. */
export function scaleLate(ships: Ship[], cutoff: number, share: number): void {
  const early = ships.filter((s) => s.mergedAt < cutoff).reduce((a, s) => a + s.size, 0);
  const late = ships.filter((s) => s.mergedAt >= cutoff);
  const lateTotal = late.reduce((a, s) => a + s.size, 0);
  const factor = (share * early) / ((1 - share) * lateTotal);
  for (const s of late) s.size = Math.round(s.size * factor);
}

function pickLink(x: number): LinkSource {
  if (x < 0.4) return "branch-name";
  if (x < 0.7) return "pr-text";
  if (x < 0.8) return "commit-text";
  return "ai";
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
