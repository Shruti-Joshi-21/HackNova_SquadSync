// Team Nexus: the demo team. Every planted risk from TASKS.md lives here.
// A carries the work, C never reviews, D is a designer who is fine,
// most code lands in the last 3 days, and two open branches collide on routes.js.

import type { RepoSnapshot, Team } from "../../../src/lib/types";
import { Builder } from "../builder";
import { int } from "../prng";
import { Area, Ship, Story, added, changed, removed, review, scaleLate } from "../story";
import { DAY, HOUR, t } from "../time";

const A = "p1";
const B = "p2";
const C = "p3";
const D = "p4";

const team: Team = {
  id: "nexus",
  name: "Team Nexus",
  projectStart: "2026-09-07T00:00:00Z",
  deadline: "2026-11-01T18:30:00Z",
  people: [
    { id: A, displayName: "Member A", githubLogin: "kestrel-dev", taskAssignee: "Kestrel", role: "code", colorIndex: 0 },
    { id: B, displayName: "Member B", githubLogin: "heron-codes", taskAssignee: "Heron", role: "code", colorIndex: 1 },
    { id: C, displayName: "Member C", githubLogin: "lynx-404", taskAssignee: "Lynx", role: "code", colorIndex: 2 },
    { id: D, displayName: "Member D", githubLogin: "wren-draws", taskAssignee: "Wren", role: "design", colorIndex: 3 },
  ],
};

const catalog: Area = {
  folder: "src/catalog",
  files: ["list.js", "item.js", "filters.js", "api.js", "cache.js", "sort.js"],
  things: ["product list", "item page", "category filters", "catalog API", "price sorting", "image upload",
    "seller profile", "listing form", "stock badge", "related items", "catalog cache", "item reviews"],
};
const cart: Area = {
  folder: "src/cart",
  files: ["cart.js", "checkout.js", "totals.js", "coupon.js", "store.js", "summary.js"],
  things: ["cart drawer", "checkout form", "order totals", "coupon codes", "saved carts", "order summary", "address form"],
};
const auth: Area = {
  folder: "src/auth",
  files: ["login.js", "session.js", "signup.js", "reset.js", "guard.js", "token.js"],
  things: ["login form", "session refresh", "signup flow", "password reset", "route guard", "email verification"],
};

export function nexus(): RepoSnapshot {
  const b = new Builder(1101, team, "2026-10-23T12:00:00Z");
  const s = new Story(b, "NEX");
  const r = b.r;
  const at = (day: string, hour: number) => t(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  const reviewerFor = (author: string) => {
    // C never reviews. D reviews now and then.
    const pool = [A, A, A, B, B, B, D].filter((p) => p !== author);
    return pool[Math.floor(r() * pool.length)];
  };
  const areaOf: Record<string, Area> = { [A]: catalog, [B]: cart, [C]: auth };

  // Merged history. 14 early merges, then 7 in the last 3 days.
  const early: [string, string][] = [
    ["2026-09-11", A], ["2026-09-15", B], ["2026-09-18", A], ["2026-09-22", C], ["2026-09-24", A],
    ["2026-09-26", B], ["2026-09-29", A], ["2026-10-01", C], ["2026-10-03", B], ["2026-10-06", A],
    ["2026-10-08", D], ["2026-10-10", C], ["2026-10-12", A], ["2026-10-15", B],
  ];
  const ships: (Ship & { design?: boolean })[] = early.map(([day, who]) => ({
    author: who,
    area: areaOf[who] ?? catalog,
    mergedAt: at(day, int(r, 5, 15)),
    size: who === D ? 204 : int(r, 80, 320),
    reviewers: [reviewerFor(who)],
    extraTasks: day === "2026-09-24" || day === "2026-10-06" || day === "2026-09-26" ? 1 : 0,
    design: who === D,
  }));

  // Late merges: long-open PRs that all land at the end. Three skip review.
  const late: [number, string, number, boolean][] = [
    [at("2026-10-20", 15), A, 120, true],
    [at("2026-10-21", 9), C, 150, true],
    [at("2026-10-21", 14), A, 48, true],
    [at("2026-10-22", 6), B, 200, true],
    [at("2026-10-22", 13), A, 30, false],
    [at("2026-10-23", 5), C, 96, false],
    [at("2026-10-23", 9), A, 20, false],
  ];
  for (const [mergedAt, who, openHours, reviewed] of late) {
    ships.push({
      author: who,
      area: areaOf[who],
      mergedAt,
      size: int(r, 150, 400),
      reviewers: reviewed ? [reviewerFor(who)] : [],
      openHours,
    });
  }

  // About 58% of merged lines land in the last 3 days.
  scaleLate(ships, b.asOf - 3 * DAY, 0.58);

  for (const ship of ships) {
    if (ship.design) {
      // D's one PR: design tokens and a style guide. Few commits on purpose.
      const key = s.nextKey();
      const createdAt = ship.mergedAt - 20 * HOUR;
      const pr = b.pr({
        author: D,
        title: `${key} Design tokens and style guide`,
        branch: "design/tokens",
        createdAt,
        mergedAt: ship.mergedAt,
        files: [added("design/tokens.json", 64), added("docs/style-guide.md", 88), added("src/styles/theme.css", 52)],
        reviews: [review(A, createdAt + 6 * HOUR)],
        commits: 2,
        branchCreatedAt: createdAt - 26 * HOUR,
      });
      s.task({
        id: key, title: "Design tokens and style guide", assignee: D, status: "done",
        createdAt: createdAt - 4 * DAY, startedAt: createdAt - 26 * HOUR, doneAt: ship.mergedAt + HOUR,
        prs: [pr], linkSource: "pr-text",
      });
    } else {
      s.ship(ship);
    }
  }

  // D's design work that never touches code.
  s.task({
    title: "Wireframes for checkout", assignee: D, status: "done", createdAt: t("2026-09-10"),
    startedAt: t("2026-09-14"), doneAt: t("2026-09-20"),
  });
  s.task({
    title: "Colour and type choices", assignee: D, status: "done", createdAt: t("2026-09-21"),
    startedAt: t("2026-09-28"), doneAt: t("2026-10-02"),
  });
  s.task({
    title: "Empty state designs", assignee: D, status: "in_progress", createdAt: t("2026-10-14"),
    startedAt: t("2026-10-19"), dueAt: t("2026-10-27"),
  });

  // A closed PR that was abandoned. Normal, not a risk.
  b.pr({
    author: C, title: "Try websocket notifications", branch: "spike/websockets",
    createdAt: t("2026-09-30T08:00:00Z"), closedAt: t("2026-10-02T10:00:00Z"),
    files: [added("src/notify/socket.js", 140)], commits: 2,
  });

  // Direct push to main while branches are open. It touches routes.js too.
  b.directPush({
    author: A, at: t("2026-10-19T05:30:00Z"), message: "Hotfix login redirect",
    files: [changed("src/server/routes.js", 64, 68, 3)],
  });

  // PR #31: B's payments work, open 9 days, 1,240 changed lines.
  // It deletes apiClient.js, which C's open branch still edits.
  const paymentsKey = s.nextKey();
  const payments = b.pr({
    number: 31,
    author: B,
    title: `${paymentsKey} Card payments flow`,
    branch: "feature/payments",
    createdAt: t("2026-10-14T10:00:00Z"),
    branchCreatedAt: t("2026-10-13T20:00:00Z"),
    lastPushAt: t("2026-10-21T16:00:00Z"),
    commits: 9,
    files: [
      added("src/payments/checkout.js", 420),
      added("src/payments/webhook.js", 260),
      added("src/payments/refunds.js", 180),
      added("src/lib/http.js", 90),
      changed("src/cart/checkout.js", 40, 110, 39),
      changed("src/cart/totals.js", 12, 71, 40),
      removed("src/lib/apiClient.js", 80),
    ],
    reviews: [review(A, t("2026-10-16T11:00:00Z"), "changes_requested")],
    mergeable: "clean",
  });
  s.task({
    id: paymentsKey, title: "Card payments", assignee: B, status: "in_review",
    createdAt: t("2026-10-09"), startedAt: t("2026-10-13T20:00:00Z"), dueAt: t("2026-10-20"),
    prs: [payments], linkSource: "pr-text",
  });
  s.task({
    title: "Refunds", assignee: B, status: "in_review", createdAt: t("2026-10-09"),
    startedAt: t("2026-10-15"), dueAt: t("2026-10-22"), prs: [payments], linkSource: "ai", linkConfidence: 0.74,
  });

  // A's open search PR: routes.js lines 56 to 75, and package-lock.json.
  const searchKey = s.nextKey();
  const search = b.pr({
    author: A,
    title: `${searchKey} Search endpoint`,
    branch: "feature/search",
    createdAt: t("2026-10-21T10:00:00Z"),
    branchCreatedAt: t("2026-10-20T08:00:00Z"),
    lastPushAt: t("2026-10-22T15:00:00Z"),
    commits: 5,
    files: [
      added("src/search/index.js", 140),
      added("src/search/query.js", 85),
      changed("src/server/routes.js", 56, 75, 6),
      changed("package-lock.json", 1200, 1260, 12),
    ],
    mergeable: "unknown",
  });
  s.task({
    id: searchKey, title: "Search", assignee: A, status: "in_review", createdAt: t("2026-10-16"),
    startedAt: t("2026-10-20T08:00:00Z"), dueAt: t("2026-10-25"), prs: [search], linkSource: "pr-text",
  });

  // C's open branch, no PR yet: routes.js lines 60 to 82, apiClient.js, package-lock.json.
  const notifyKey = s.nextKey();
  b.branch({
    name: `feature/${notifyKey}-notifications`,
    owner: C,
    createdAt: t("2026-10-19T09:00:00Z"),
    lastPushAt: t("2026-10-22T18:00:00Z"),
    commits: 6,
    files: [
      added("src/notify/push.js", 150),
      added("src/notify/inbox.js", 110),
      changed("src/server/routes.js", 60, 82, 5),
      changed("src/lib/apiClient.js", 30, 52, 8),
      changed("package-lock.json", 1190, 1240, 9),
    ],
  });
  s.task({
    id: notifyKey, title: "Notifications", assignee: C, status: "in_progress", createdAt: t("2026-10-15"),
    startedAt: t("2026-10-19T09:00:00Z"), dueAt: t("2026-10-26"), linkSource: "branch-name",
  });

  // B's settings branch: 14 commits behind main, never synced.
  const settingsKey = s.nextKey();
  b.branch({
    name: `feature/${settingsKey}-settings`,
    owner: B,
    behindMain: 14,
    lastPushAt: t("2026-10-21T19:00:00Z"),
    commits: 7,
    files: [added("src/settings/profile.js", 130), added("src/settings/prefs.js", 70)],
  });
  s.task({
    id: settingsKey, title: "Account settings", assignee: B, status: "in_progress", createdAt: t("2026-09-28"),
    startedAt: t("2026-10-01"), dueAt: t("2026-10-24"), linkSource: "branch-name",
  });

  // C's email receipts: task in progress, no push for 6 days.
  const emailKey = s.nextKey();
  b.branch({
    name: `feature/${emailKey}-email-receipts`,
    owner: C,
    createdAt: t("2026-10-13T07:00:00Z"),
    lastPushAt: t("2026-10-17T10:00:00Z"),
    commits: 3,
    files: [added("src/email/receipt.js", 90), added("src/email/template.html", 60)],
  });
  s.task({
    id: emailKey, title: "Email receipts", assignee: C, status: "in_progress", createdAt: t("2026-10-08"),
    startedAt: t("2026-10-12"), dueAt: t("2026-10-21"), linkSource: "branch-name",
  });

  // Not started yet.
  const todo: [string, string | null, string][] = [
    ["Order history page", B, "2026-10-28"],
    ["Admin dashboard", A, "2026-10-29"],
    ["Rate limiting", null, "2026-10-30"],
    ["Accessibility pass", D, "2026-10-30"],
    ["Seller analytics", A, "2026-10-31"],
    ["Deploy to production", null, "2026-11-01"],
    ["Final report", null, "2026-11-01"],
  ];
  todo.forEach(([title, who, due], i) => {
    s.task({ title, assignee: who, status: "todo", createdAt: t("2026-10-05") + i * 2 * DAY, dueAt: t(due) });
  });

  return b.build();
}
