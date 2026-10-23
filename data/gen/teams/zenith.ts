// Team Zenith: the last-minute integrator. Long-lived branches, almost
// everything merged in the last 3 days, almost no reviews, one PR conflicting.

import type { RepoSnapshot, Team } from "../../../src/lib/types";
import { Builder } from "../builder";
import { int } from "../prng";
import { Area, Ship, Story, added, changed } from "../story";
import { t } from "../time";

const team: Team = {
  id: "zenith",
  name: "Team Zenith",
  projectStart: "2026-09-07T00:00:00Z",
  deadline: "2026-11-01T18:30:00Z",
  people: [
    { id: "p1", displayName: "Member A", githubLogin: "puffin-maps", taskAssignee: "Puffin", role: "code", colorIndex: 0 },
    { id: "p2", displayName: "Member B", githubLogin: "gecko-api", taskAssignee: "Gecko", role: "code", colorIndex: 1 },
    { id: "p3", displayName: "Member C", githubLogin: "bison-app", taskAssignee: "Bison", role: "code", colorIndex: 2 },
  ],
};

const areas: Record<string, Area> = {
  p1: {
    folder: "src/map",
    files: ["map.js", "markers.js", "layers.js", "geo.js", "tiles.js"],
    things: ["map view", "bus stop markers", "route layers", "location lookup", "offline tiles"],
  },
  p2: {
    folder: "src/api",
    files: ["server.js", "routes.js", "timetable.js", "cache.js", "alerts.js"],
    things: ["timetable API", "route search", "delay alerts", "response cache", "feed import"],
  },
  p3: {
    folder: "src/app",
    files: ["app.js", "store.js", "screens.js", "settings.js", "nav.js"],
    things: ["home screen", "app store", "favourites", "settings screen", "navigation"],
  },
};

export function zenith(): RepoSnapshot {
  const b = new Builder(4404, team, "2026-10-23T12:00:00Z");
  const s = new Story(b, "ZEN");
  const r = b.r;

  const ships: Ship[] = [
    { author: "p1", area: areas.p1, mergedAt: t("2026-09-25T10:00:00Z"), size: int(r, 100, 200), reviewers: ["p2"] },
    { author: "p2", area: areas.p2, mergedAt: t("2026-10-09T14:00:00Z"), size: int(r, 100, 200), reviewers: [] },
  ];
  const late = [
    "2026-10-20T14:00:00Z", "2026-10-20T20:00:00Z", "2026-10-21T06:00:00Z", "2026-10-21T11:00:00Z",
    "2026-10-21T17:00:00Z", "2026-10-22T04:00:00Z", "2026-10-22T09:00:00Z", "2026-10-22T15:00:00Z",
    "2026-10-23T03:00:00Z", "2026-10-23T08:00:00Z",
  ];
  const cycle = ["p3", "p1", "p2"];
  late.forEach((when, i) => {
    const who = cycle[i % 3];
    ships.push({
      author: who,
      area: areas[who],
      mergedAt: t(when),
      size: int(r, 300, 900),
      reviewers: [],
      openHours: int(r, 24, 90),
      branchDays: int(r, 10, 25),
      extraTasks: i === 1 || i === 2 ? 1 : 0,
    });
  });
  for (const ship of ships) s.ship(ship);

  // GitHub already says this PR conflicts with main.
  const offlineKey = s.nextKey();
  const offline = b.pr({
    author: "p3", title: `${offlineKey} Offline mode`, branch: "feature/offline-mode",
    createdAt: t("2026-10-21T13:00:00Z"), branchCreatedAt: t("2026-10-02T09:00:00Z"), lastPushAt: t("2026-10-22T22:00:00Z"),
    files: [added("src/app/offline.js", 380), changed("src/app/store.js", 20, 150, 129)], commits: 8,
    mergeable: "conflicting",
  });
  s.task({ id: offlineKey, title: "Offline mode", assignee: "p3", status: "in_review", createdAt: t("2026-09-28"), startedAt: t("2026-10-02T09:00:00Z"), dueAt: t("2026-10-20"), prs: [offline], linkSource: "pr-text" });

  const plannerKey = s.nextKey();
  b.branch({
    name: `feature/${plannerKey}-trip-planner`, owner: "p1", createdAt: t("2026-10-01T08:00:00Z"),
    lastPushAt: t("2026-10-22T20:00:00Z"), files: [added("src/map/planner.js", 260)], commits: 6,
  });
  s.task({ id: plannerKey, title: "Trip planner", assignee: "p1", status: "in_progress", createdAt: t("2026-09-26"), startedAt: t("2026-10-01T08:00:00Z"), dueAt: t("2026-10-24"), linkSource: "branch-name" });

  s.task({ title: "Push alerts", assignee: "p2", status: "in_progress", createdAt: t("2026-10-05"), startedAt: t("2026-10-10"), dueAt: t("2026-10-25") });
  s.task({ title: "Accessibility labels", assignee: "p3", status: "todo", createdAt: t("2026-10-08"), dueAt: t("2026-10-29") });
  s.task({ title: "App icon", assignee: "p1", status: "todo", createdAt: t("2026-10-10"), dueAt: t("2026-10-30") });
  s.task({ title: "Error screens", assignee: "p2", status: "todo", createdAt: t("2026-10-12"), dueAt: t("2026-10-30") });
  s.task({ title: "Final report", assignee: null, status: "todo", createdAt: t("2026-10-15"), dueAt: t("2026-11-01") });

  return b.build();
}
