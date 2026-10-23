// Team Orbit: strong imbalance. Member A does about 65% of the work,
// Member D (a code role) does almost nothing.

import type { RepoSnapshot, Team } from "../../../src/lib/types";
import { Builder } from "../builder";
import { int, shuffle } from "../prng";
import { Area, Ship, Story, added } from "../story";
import { DAY, HOUR, t } from "../time";

const team: Team = {
  id: "orbit",
  name: "Team Orbit",
  projectStart: "2026-09-07T00:00:00Z",
  deadline: "2026-11-01T18:30:00Z",
  people: [
    { id: "p1", displayName: "Member A", githubLogin: "falcon-x", taskAssignee: "Falcon", role: "code", colorIndex: 0 },
    { id: "p2", displayName: "Member B", githubLogin: "otter-ui", taskAssignee: "Otter", role: "code", colorIndex: 1 },
    { id: "p3", displayName: "Member C", githubLogin: "crane-py", taskAssignee: "Crane", role: "code", colorIndex: 2 },
    { id: "p4", displayName: "Member D", githubLogin: "badger-b", taskAssignee: "Badger", role: "code", colorIndex: 3 },
  ],
};

const areas: Record<string, Area> = {
  p1: {
    folder: "src/game",
    files: ["engine.js", "rules.js", "state.js", "score.js", "rooms.js", "timer.js"],
    things: ["game loop", "move rules", "game state", "scoring", "room lobby", "turn timer", "replay log",
      "spectator mode", "chat", "reconnect", "bot player", "hint system", "save games"],
  },
  p2: {
    folder: "src/ui",
    files: ["board.jsx", "menu.jsx", "modal.jsx", "toast.jsx"],
    things: ["board view", "main menu", "settings modal"],
  },
  p3: {
    folder: "src/server",
    files: ["index.js", "socket.js", "db.js", "auth.js"],
    things: ["socket server", "user accounts", "database models"],
  },
  p4: {
    folder: "tests",
    files: ["rules.test.js", "score.test.js"],
    things: ["rule tests"],
  },
};

export function orbit(): RepoSnapshot {
  const b = new Builder(3303, team, "2026-10-23T12:00:00Z");
  const s = new Story(b, "ORB");
  const r = b.r;

  const perWeek = [2, 3, 3, 3, 3, 4, 2];
  const authors = shuffle(r, [...Array(13).fill("p1"), "p2", "p2", "p2", "p3", "p3", "p3", "p4"]);
  const ships: Ship[] = [];
  let n = 0;
  let extraForA = 2;
  perWeek.forEach((count, week) => {
    const offsets = week === 6 ? [1, 3] : [1, 3, 5, 2].slice(0, count).sort();
    for (const offset of offsets) {
      const who = authors[n++];
      // A reviews everyone else. A's own PRs get a review about half the time.
      const x = r();
      const reviewers = who !== "p1" ? ["p1"] : x < 0.5 ? ["p2"] : x < 0.75 ? ["p3"] : [];
      let extraTasks = 0;
      if (who === "p1" && extraForA > 0) { extraTasks = 1; extraForA--; }
      if (who === "p4") extraTasks = 1;
      ships.push({
        author: who,
        area: areas[who],
        mergedAt: t("2026-09-07") + (week * 7 + offset) * DAY + int(r, -6, 4) * HOUR,
        size: who === "p1" ? int(r, 150, 380) : int(r, 40, 150),
        reviewers,
        extraTasks,
      });
    }
  });
  for (const ship of ships) s.ship(ship);

  const boardKey = s.nextKey();
  const leaderboard = b.pr({
    author: "p1", title: `${boardKey} Leaderboard`, branch: "feature/leaderboard",
    createdAt: t("2026-10-21T08:00:00Z"), branchCreatedAt: t("2026-10-20T06:00:00Z"), lastPushAt: t("2026-10-22T19:00:00Z"),
    files: [added("src/game/leaderboard.js", 210)], commits: 4, mergeable: "clean",
  });
  s.task({ id: boardKey, title: "Leaderboard", assignee: "p1", status: "in_review", createdAt: t("2026-10-17"), startedAt: t("2026-10-20T06:00:00Z"), dueAt: t("2026-10-25"), prs: [leaderboard], linkSource: "pr-text" });

  const matchKey = s.nextKey();
  b.branch({
    name: `feature/${matchKey}-matchmaking`, owner: "p1", createdAt: t("2026-10-18T06:00:00Z"),
    lastPushAt: t("2026-10-23T08:00:00Z"), files: [added("src/server/match.js", 180)], commits: 5,
  });
  s.task({ id: matchKey, title: "Matchmaking", assignee: "p1", status: "in_progress", createdAt: t("2026-10-14"), startedAt: t("2026-10-18T06:00:00Z"), dueAt: t("2026-10-27"), linkSource: "branch-name" });

  const themeKey = s.nextKey();
  b.branch({
    name: `feature/${themeKey}-theme`, owner: "p2", createdAt: t("2026-10-20T10:00:00Z"),
    lastPushAt: t("2026-10-21T15:00:00Z"), files: [added("src/ui/theme.css", 60)], commits: 2,
  });
  s.task({ id: themeKey, title: "Colour theme", assignee: "p2", status: "in_progress", createdAt: t("2026-10-15"), startedAt: t("2026-10-20T10:00:00Z"), dueAt: t("2026-10-26"), linkSource: "branch-name" });

  s.task({ title: "Tournament mode", assignee: "p1", status: "todo", createdAt: t("2026-10-10"), dueAt: t("2026-10-29") });
  s.task({ title: "Server logging", assignee: "p3", status: "todo", createdAt: t("2026-10-13"), dueAt: t("2026-10-30") });
  s.task({ title: "Write final report", assignee: null, status: "todo", createdAt: t("2026-10-15"), dueAt: t("2026-11-01") });

  return b.build();
}
