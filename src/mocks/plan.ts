import type { PlanModule, ProjectPlan } from "@/lib/types";

// A fixed sample plan for a typical student web app, used until POST /api/plan
// (B7) is live. Owners are spread round-robin over the team size.

const MODULES: Omit<PlanModule, "ownerSlot">[] = [
  {
    id: "auth",
    name: "Sign-in and accounts",
    folders: ["src/auth/**"],
    tasks: ["Sign-up and login forms", "Session handling", "Password reset"],
    dependsOn: [],
  },
  {
    id: "api",
    name: "Data and API",
    folders: ["src/api/**", "src/db/**"],
    tasks: ["Database schema", "CRUD routes", "Input validation"],
    dependsOn: ["auth"],
  },
  {
    id: "screens",
    name: "Main screens",
    folders: ["src/pages/**", "src/components/**"],
    tasks: ["Dashboard", "List and detail views", "Empty and error states"],
    dependsOn: ["api"],
  },
  {
    id: "notify",
    name: "Notifications",
    folders: ["src/notify/**"],
    tasks: ["Email on new item", "In-app alerts"],
    dependsOn: ["api"],
  },
  {
    id: "docs",
    name: "Docs and design",
    folders: ["docs/**", "design/**"],
    tasks: ["Wireframes", "README and setup", "Demo script"],
    dependsOn: [],
  },
];

export function mockPlan(teamSize: number): ProjectPlan {
  const modules = MODULES.map((m, i) => ({ ...m, ownerSlot: i % teamSize }));
  return {
    teamSize,
    modules,
    sharedFiles: [
      { path: "package.json", ownerSlot: 0, rule: "Others ask in a PR comment; the owner adds the package." },
      { path: "src/routes.js", ownerSlot: 1 % teamSize, rule: "Each person adds routes in one PR per week, owner merges." },
      { path: "README.md", ownerSlot: (teamSize - 1) % teamSize, rule: "Send changes as notes; the owner edits." },
    ],
    interfaces: [
      { between: ["auth", "api"], agreeFirst: "Shape of the user object and the session token" },
      { between: ["api", "screens"], agreeFirst: "JSON shape of each API response" },
      { between: ["api", "notify"], agreeFirst: "Event names that trigger a notification" },
    ],
    mergeOrder: ["docs", "auth", "api", "screens", "notify"],
    source: "template",
  };
}
