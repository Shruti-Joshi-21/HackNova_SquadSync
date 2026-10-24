# LOG-A: Laptop A (interface)

Only this owner edits this file. Newest entry on top.

## Done

- Side panel links (Sat 24 Oct, about 06:20 IST): every link in /embed is
  now a plain `<a target="_blank">`, so it opens a new browser tab instead of
  loading the app inside the panel. New link "Split a PRD into a plan" to
  /plan. "Open the full dashboard" goes to `/connect?repo=owner/name`, and
  ConnectForm fills the repo from `?repo=` (the connect page wraps the form in
  Suspense for useSearchParams). Checked: the repo is pre-filled.

- Side panel matches the web app (Sat 24 Oct, about 06:55). Edited
  `src/app/embed/page.tsx` (Samiksha's path) at Shruti's request, so both
  views stay the same. It now uses `Tag`, `SEVERITY`, `CONFIDENCE_WORD` and
  `VERDICT` from ui.tsx and `EXPLAIN` from team/explain.ts instead of its own
  copies. An open risk shows the summary, "In plain words", the scene, the
  evidence table, "What this does not mean" and "What to do". Body text is
  the app's 15px. Links open in a new tab, since the panel is an iframe on
  github.com. Checked at 400px on our repo: no sideways scroll.
- For C: please pull before touching src/app/embed/page.tsx again.

- Quieter tags and smoother replay (Sat 24 Oct, about 06:45):
  - `Tag` in ui.tsx: status shows as coloured text with a plain grey border,
    no tinted background (was a tinted fill). Applies to severity, verdict
    reasons, "No reviews", "Outside usual range" and the plan page.
  - Replay: while the next day loads, the page keeps the last loaded day,
    faded to 60%, instead of jumping back to today and forward again. The
    slider itself never fades. "Loading that day" has a fixed-height line so
    nothing shifts. Checked: moving back 5 weeks goes At risk, then On track,
    with no flash of today in between.
- For C (embed): /embed has its own tag styles (`bg-danger-bg` and so on in
  src/app/embed/page.tsx), so the side panel still shows filled tags. To
  match the app, use coloured text with `border border-border` and no
  background. The 15px text and 13px small text from globals.css do reach the
  side panel.

- Layout and type pass, asked for by Shruti (Sat 24 Oct, about 06:30):
  - Wider pages: content and top bar go up to 1440px with 40px gutters on
    large screens (was 1200px, 24px).
  - Larger type: body 15px (was 14px); small text 13px (Tailwind text-xs
    redefined in globals.css); the 11px labels now use text-xs.
  - Team page: verdict and schedule sit in one bordered block (7/5 columns),
    the panels are 1 column on phones, 2 on tablets and small laptops (the
    timeline spans the full width) and 3 from 1280px. More spacing
    throughout. Shorter captions on all three panels. Risks show the first 5
    with "Show all 12 risks". The "first warning" label sits under the week
    labels so they no longer overlap.
  - /connect is one centred card ("Check a repo"), full-width inputs and
    button, shorter help text. There is an empty background layer
    (`data-bg="connect"`) ready for the landing page's animation.
  - Checked at 1024px and 390px: no sideways scroll, card centred.
- DESIGN CHANGE (not a contract change): DESIGN.md says 1200px max width and
  14px base. This pass uses 1440px and 15px at Shruti's request. DESIGN.md
  should be updated to match.

- Task board sample and plain-English evidence (Sat 24 Oct, about 06:10):
  - `public/sample-tasks.csv`: 19 tasks from our real board for
    Shruti-Joshi-21/HackNova_SquadSync, with real names. /connect links to it
    ("Download a sample CSV") and lists the expected columns. Tested on the
    live API: 19 tasks read, all three names matched to logins, no warnings.
  - Evidence drawer now explains each risk for someone who has never used
    Git (`src/components/team/explain.ts`, one entry per RiskKind): "In plain
    words", "Why it matters", "The rule we used" (the engine's rule), "The
    evidence" with "Where this comes from", "How serious and how sure" (what
    High / Medium / Low and Certain / Likely / Possible mean), "What this does
    not mean" (normal differences, so a flag is not read as blame), and "What
    to do". Evidence values link to GitHub when the risk carries a URL.
  - "Who checked whose work" has a one-line guide to reading the heatmap.
- For C (DEMO.md): new optional step on /connect: download the sample CSV, upload it
  with our repo, open the team page.

- Fixes after B7, B8 and C merged (Sat 24 Oct, about 05:40):
  - package-lock.json synced with `npm install` (Aarya found `npm ci` failing on
    missing @emnapi packages). `npm ci --dry-run` now passes.
  - /connect shows the CSV `warnings` from POST /api/analyze/github (B8). With
    warnings the form stays put and lists them with "Open the team page";
    without warnings it opens the team page as before. `ConnectResult` success
    now has `warnings: string[]`.
  - /plan: a 400 from POST /api/plan (for example a PRD over 20,000 characters)
    now shows the route's sentence under the PRD box. The sample plan is only
    used when the route cannot be reached or fails, with the note "The
    splitter did not answer, so this is a sample plan." (the old note said the
    API was not live).
  - Checked in the browser: a too-long PRD shows B7's message; a normal PRD
    gets the route's plan with no false note. The CSV warnings list was not
    checked by eye (needs the GitHub token locally); check it on the deploy.
  - Not done (optional): "Plan versus reality" on /plan via POST /api/plan/check.

- Fix after B5 merged (Sat 24 Oct, about 01:45): `connectRepo()` now shows the
  route's own `{ error }` for every status, including 404 "Repository not
  found". The "not connected" message is only for a 404 or 405 with no JSON,
  which means the route is missing. The replay strip is hidden for pasted
  repos (ids starting "gh-"), because only the sample teams support ?asOf=.
  Checked: a missing repo shows B5's message, and pasting our own repo opens
  /team/gh-shruti-joshi-21-hacknova-squadsync with 10 risks, which survives a reload.
- A9 part 1 (Sat 24 Oct, about 01:30): checked /, /team/nexus, /plan and
  /connect at 390px. No page scrolls sideways. Mentor list: below md it is
  now stacked rows (name, verdict, risk count, reason, largest risk); the
  table stays at md and up. Evidence drawer: focus goes back to the risk row
  that opened it, and the close handler is stable so the focus effect runs
  once. The /plan ownership table still scrolls inside its own box on phones,
  on purpose (5 columns).
- A6 (Sat 24 Oct, about 01:20): replay strip under the verdict
  (`src/components/team/ReplayStrip.tsx`). One segment per week from today's
  timeline, coloured by status (future weeks dashed). There is a tick and the
  label "first warning, <date>" at the earliest firstDetectableAt of today's
  risks. The marker can be dragged (pointer capture) or moved by keyboard
  (role slider: arrows move one week, Home/End). Moves snap to whole days.
  TeamView calls `getAnalysis(id, "YYYY-MM-DD")` 250ms after the marker
  stops, and the whole page shows that day. "Viewing 16 Oct" and "Back to
  today" appear while replaying. Checked: Nexus on 16 Oct shows 7 risks and a
  27-day projected slip.
- A5 (Sat 24 Oct, about 01:10): pages now use the live API (B4). `data.ts`
  runs in the browser: `getTeams()` calls GET /api/teams and `getAnalysis(id, asOf?)`
  calls GET /api/analyze/[id]. It returns null on 404 and throws a plain message
  otherwise. `NEXT_PUBLIC_USE_MOCKS=true` switches back to the mocks.
  `connectRepo()` POSTs /api/analyze/github (B5). A 404 means "not connected
  yet". On success it saves {input, analysis} in localStorage
  (`squadsync.repos`) and /connect opens `/team/<teamId>`; getAnalysis
  re-analyses saved repos from the stored input and falls back to the last
  good result. The team page is now a client component
  (`src/components/team/TeamView.tsx`) with a skeleton, an error with Retry,
  Refresh, an "Every minute" auto-refresh, "Updated hh:mm", and an in-memory
  cache between pages. The mentor list (`MentorTable.tsx`) and the top-bar
  switcher fetch teams on the client. Checked against the real Nexus output:
  12 risks, and B3's scenes draw in the drawer.
- A7 (Sat 24 Oct, about 00:50): `/plan` PRD splitter page
  (`src/components/plan/PlanSplitter.tsx`). Left: PRD textarea, team size 2 to
  6, "Split the work". Right: ownership table (module, owner, folders, tasks,
  depends on), shared files, "Agree these first", merge order as a GitGraph
  scene (one lane per owner, each module merges into main in turn), and
  "Checked by code" with 5 checks run in the browser (`checks.ts`): one owner
  per module, no folder owned twice, shared files single owner, merge order
  respects dependsOn, everyone owns a module. `makePlan()` in data.ts calls
  POST /api/plan and falls back to `src/mocks/plan.ts` (a fixed template)
  with a note while B7 is not live. The latest plan is saved in localStorage
  (`squadsync.plan`) and restored on load.
- A4 (Sat 24 Oct, about 00:15): mentor list `/` is one table (team, verdict,
  reason, risk count, largest risk), sorted at risk, then slipping, then on
  track, then by risk count; each row links to `/team/[id]`. The top bar now
  takes `teams` from the (shell) layout: the team switcher is a native select
  that navigates, and Mentor / Team are links that follow the URL. `/connect`
  (`src/components/ConnectForm.tsx`): repo (owner/name or any github.com URL),
  deadline (date), optional CSV (file name shown), inline validation, primary
  "Analyse". It calls `connectRepo()` in `src/lib/data.ts`, which returns an
  error for now. data.ts also exports `parseRepo()` and the `ConnectInput` /
  `ConnectResult` types. C6 (embed) can use both.
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

All A tasks are done (A1 to A7). Next: the A9 polish pass at 05:30, then demo
rehearsal.

## Notes for B (scenes)

- B3 scenes: keep slots small (max about 9) and put labels only on the nodes
  that matter. Node `step` starts at 1; lanes appear at step 0.
- Merges into main bend at the end, branch-offs bend at the start, so an edge
  from a branch node to a main node reads as a merge.

## Needs from others

Demo run on the live site (Sat 24 Oct, 01:40). Mentor list, Nexus page (loads
in about 1 s), scenes in the drawer, Not flagged and replay all work. Open items:
- B: on 18 Sept the Nexus sentence starts "One thing to watch: member C ..."
  with a lowercase "member". It should be "Member C".
- B: no team is "Slipping", but PROJECT.md's demo story step 1 expects one.
  Either tune a team or change the script line (C, DEMO.md).
- C (DEMO.md): the first warning on Nexus is 18 Sept, about 5 weeks before
  "today", not "three weeks ago". On that day replay shows On track with
  "member C gave no reviews", a good moment to say aloud.
- Done since: B5, B7, B8 merged; C6 embed and the extension URL merged.

- From B: the "When code landed" panel should list open PRs by age, but
  `Analysis` has no open PR list. For now it shows open-PR risks
  (`late_integration-pr-*`). If B can add the list, it needs a CONTRACT CHANGE.
- From B (B7): POST /api/plan returning a ProjectPlan as JSON (status 200).
  The page picks it up with no change on A's side.
- For B5: POST /api/analyze/github should return `{ snapshot, analysis }` with
  a URL-safe `analysis.teamId` (it becomes `/team/<teamId>`), and `{ error }`
  with a plain sentence on failure (for example a rate limit with its reset time).
- For C6 (embed): `getAnalysis()` now runs in the browser only, so call it from
  a client component.

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
