# LOG-A: Laptop A (interface)

Only this owner edits this file. Newest entry on top.

## Done

- A3 (Fri 23 Oct, about 23:55): team page `/team/[id]`. Data comes from
  `getAnalysis(id)` / `getTeams()` in `src/lib/data.ts` (`USE_MOCKS = true`).
  Mocks: `src/mocks/analyses/*.json` are REAL output of B2's engine
  (`npx tsx src/engine/cli.ts <team>` run on aarya-branch, not merged), for
  nexus, atlas, orbit and zenith. `src/mocks/analyses.ts` adds scenes to
  late_integration-share and review_gap-unreviewed, plus 3 hand-written Nexus
  conflict risks (same-line routes.js, branch drift, direct push) until B3.
  Page: header (week x of y, days left), verdict word and sentence, two-bar
  schedule with the gap, three panels (Who did the work, Who checked whose
  work, When code landed), risks list, evidence drawer from the right (rule,
  scene, evidence, people, action, AI tag), and "Not flagged". Components are
  in `src/components/team/`, with shared tags and panels in `src/components/ui.tsx`.
  Empty state for an unknown team, and loading.tsx.
- A2 (Fri 23 Oct, about 23:40): `src/components/GitGraph.tsx` draws a
  GraphScene as SVG. Props: `scene`, `colorByPerson` (Person.id to colorIndex;
  without it, branch lanes take colours by order). Branch lanes are stacked
  above main, each with a mono pill label. Curves bend over one slot (git-flow
  style). All 7 node states are drawn with plain stroked paths. It plays once
  when 40% of it is in view, one step per 500ms; edges draw in, and a conflict
  node pulses, turns red and draws its cross. Replay button. Reduced motion
  shows the final frame. It measures its own width (360 to 700px) so text stays
  at 11 to 12px; below 52px per slot, only conflict and warning nodes keep
  their labels. role="img" plus a hidden step-by-step description.
  `src/styles/gitgraph.css` holds the keyframes. `src/mocks/scenes.ts` has 8
  mock scenes (PROJECT.md scenes 1 to 8) plus `mockColors`. `/dev/scenes`
  lists them. Checked by eye at desktop width and at 390px.
- A1 (Fri 23 Oct, about 18:10): Next.js 16.4 scaffold (TypeScript, App Router,
  src dir, Tailwind v4, ESLint, npm, alias @/*). Installed geist and
  @primer/octicons-react. `src/styles/tokens.css` holds the DESIGN.md tokens
  (dark default); `src/app/globals.css` maps them into Tailwind (bg-surface,
  border-border, text-muted, text-success, bg-g0 ...). Geist Sans and Mono via
  the geist package, body 14px / 1.5. App shell: `src/components/TopBar.tsx`
  (48px bar, wordmark, team switcher placeholder, Mentor/Team toggle). Placeholder
  pages: /, /team/[id], /connect, /plan, /dev/scenes, /embed. `npm run build`
  and `npm run lint` pass.

## In progress

Nothing yet.

## Next

A4: mentor list `/` (uses `getTeams()`) and `/connect`.

## Notes for B (scenes)

- B3 scenes: keep slots small (max about 9) and put labels only on the nodes
  that matter. Node `step` starts at 1; lanes appear at step 0.
- Merges into main bend at the end, branch-offs bend at the start, so an edge
  from a branch node to a main node reads as a merge.

## Needs from others

- From B: the "When code landed" panel should list open PRs by age, but
  `Analysis` has no open PR list. For now it shows open-PR risks
  (`late_integration-pr-*`). If B can add the list, it needs a CONTRACT CHANGE.
- From B (B3): real scenes on the risks. Once they arrive, the hand-written
  Nexus conflict risks in `src/mocks/analyses.ts` can go.

## Decisions

- Deployed app URL (for the extension): https://hack-nova-squad-sync.vercel.app
  (Vercel deploys `main`). A1 merged to main via PR #1.
- Branch names in use: Shruti `shruti-branch`, Aarya `aarya-branch`
  (not laptop-a / laptop-b / phase2-* as TASKS.md says).

- Pages with the top bar live in the route group `src/app/(shell)/`. `/embed`
  sits outside it, so the side panel has no top bar. URLs are unchanged.
- Turned off `cacheComponents` and `partialPrefetching` from the Next 16
  template, to avoid Suspense requirements on params and search params. Simpler
  for a hackathon.
- Tailwind colour names: bg, surface, surface-2, border, border-strong, text,
  muted, subtle, primary, fg-on-primary, link, success(-bg), danger(-bg),
  warning(-bg), g0..g4, g-main.
- Kept AGENTS.md from create-next-app: Next 16 differs from older docs, and the
  guides are in node_modules/next/dist/docs/.
- No frame-denying headers, so the extension can embed /embed.

## Contract changes

None.
