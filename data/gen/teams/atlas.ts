// Team Atlas: the healthy team. Steady merges, small PRs, reviews spread out.
// Member D writes the docs and is judged on that work.

import type { RepoSnapshot, Team } from "../../../src/lib/types";
import { Builder } from "../builder";
import { int, shuffle } from "../prng";
import { Area, Ship, Story, added, changed, review } from "../story";
import { DAY, HOUR, t } from "../time";

const team: Team = {
  id: "atlas",
  name: "Team Atlas",
  projectStart: "2026-09-07T00:00:00Z",
  deadline: "2026-11-01T18:30:00Z",
  people: [
    { id: "p1", displayName: "Member A", githubLogin: "osprey-io", taskAssignee: "Osprey", role: "code", colorIndex: 0 },
    { id: "p2", displayName: "Member B", githubLogin: "marten-k", taskAssignee: "Marten", role: "code", colorIndex: 1 },
    { id: "p3", displayName: "Member C", githubLogin: "ibis-dev", taskAssignee: "Ibis", role: "code", colorIndex: 2 },
    { id: "p4", displayName: "Member D", githubLogin: "finch-writes", taskAssignee: "Finch", role: "docs", colorIndex: 3 },
  ],
};

const areas: Record<string, Area> = {
  p1: {
    folder: "src/board",
    files: ["board.js", "column.js", "card.js", "drag.js", "store.js"],
    things: ["task board", "column layout", "card editor", "drag and drop", "board store", "card labels", "archive view"],
  },
  p2: {
    folder: "src/calendar",
    files: ["calendar.js", "event.js", "reminders.js", "week.js", "ics.js"],
    things: ["month view", "event form", "reminders", "week view", "calendar export", "recurring events", "time zones"],
  },
  p3: {
    folder: "src/api",
    files: ["server.js", "groups.js", "members.js", "auth.js", "db.js"],
    things: ["groups API", "member invites", "login API", "database setup", "rate limits", "input checks"],
  },
  p4: {
    folder: "docs",
    files: ["README.md", "setup.md", "api.md", "user-guide.md", "architecture.md"],
    things: ["setup guide", "API reference", "user guide", "architecture notes"],
  },
};

export function atlas(): RepoSnapshot {
  const b = new Builder(2202, team, "2026-10-23T12:00:00Z");
  const s = new Story(b, "ATL");
  const r = b.r;
  const people = ["p1", "p2", "p3", "p4"];

  // About 3 to 4 merges every week, from everyone.
  const perWeek = [3, 4, 4, 3, 4, 4, 3];
  const authors = shuffle(r, [
    ...Array(7).fill("p1"), ...Array(7).fill("p2"), ...Array(7).fill("p3"), ...Array(4).fill("p4"),
  ]);
  const dayOffsets = [1, 3, 5, 2, 4];
  const ships: Ship[] = [];
  let n = 0;
  perWeek.forEach((count, week) => {
    const offsets = week === 6 ? [0, 1, 3] : dayOffsets.slice(0, count).sort();
    for (const offset of offsets) {
      const who = authors[n++];
      const others = people.filter((p) => p !== who);
      const first = others[n % others.length];
      const second = others[(n + 1) % others.length];
      ships.push({
        author: who,
        area: areas[who],
        mergedAt: t("2026-09-07") + (week * 7 + offset) * DAY + int(r, -6, 4) * HOUR,
        size: who === "p4" ? int(r, 30, 120) : int(r, 40, 240),
        reviewers: r() < 0.3 ? [first, second] : [first],
        openHours: int(r, 6, 30),
      });
    }
  });
  for (const ship of ships) s.ship(ship);

  // Docs work without a PR.
  s.task({ title: "Interview notes", assignee: "p4", status: "done", createdAt: t("2026-09-08"), startedAt: t("2026-09-09"), doneAt: t("2026-09-12") });
  s.task({ title: "Test plan", assignee: "p4", status: "done", createdAt: t("2026-10-01"), startedAt: t("2026-10-05"), doneAt: t("2026-10-09") });
  s.task({ title: "Release notes draft", assignee: "p4", status: "done", createdAt: t("2026-10-16"), startedAt: t("2026-10-19"), doneAt: t("2026-10-21") });

  // Open work: small, recent, in separate folders.
  const exportKey = s.nextKey();
  const exportPR = b.pr({
    author: "p1", title: `${exportKey} Board export`, branch: "feature/board-export",
    createdAt: t("2026-10-22T09:00:00Z"), branchCreatedAt: t("2026-10-21T10:00:00Z"), lastPushAt: t("2026-10-22T16:00:00Z"),
    files: [added("src/board/export.js", 90)], commits: 3,
    reviews: [review("p3", t("2026-10-22T13:00:00Z"), "commented")], mergeable: "clean",
  });
  s.task({ id: exportKey, title: "Board export", assignee: "p1", status: "in_review", createdAt: t("2026-10-19"), startedAt: t("2026-10-21T10:00:00Z"), dueAt: t("2026-10-26"), prs: [exportPR], linkSource: "pr-text" });

  const filtersKey = s.nextKey();
  b.branch({
    name: `feature/${filtersKey}-filters`, owner: "p2", createdAt: t("2026-10-21T07:00:00Z"),
    lastPushAt: t("2026-10-23T09:00:00Z"), files: [added("src/calendar/filters.js", 70)], commits: 3,
  });
  s.task({ id: filtersKey, title: "Calendar filters", assignee: "p2", status: "in_progress", createdAt: t("2026-10-19"), startedAt: t("2026-10-21T07:00:00Z"), dueAt: t("2026-10-27"), linkSource: "branch-name" });

  const datesKey = s.nextKey();
  b.branch({
    name: `fix/${datesKey}-date-format`, owner: "p3", createdAt: t("2026-10-22T05:00:00Z"),
    lastPushAt: t("2026-10-22T11:00:00Z"), files: [changed("src/api/dates.js", 10, 24, 4)], commits: 2,
  });
  s.task({ id: datesKey, title: "Date format bug", assignee: "p3", status: "in_progress", createdAt: t("2026-10-21"), startedAt: t("2026-10-22T05:00:00Z"), dueAt: t("2026-10-24"), linkSource: "branch-name" });

  s.task({ title: "Final demo video", assignee: "p4", status: "todo", createdAt: t("2026-10-12"), dueAt: t("2026-10-31") });

  return b.build();
}
