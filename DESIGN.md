# DESIGN.md

The look: GitHub and Vercel. Black, white, gray. It has to feel like the same
family as GitHub's own pages, because the extension sits beside them.

These hex values are a proposed starting set in the Vercel/GitHub range. If the
team has exact codes, change them in `src/styles/tokens.css` only. Never write
a hex value anywhere else.

## Rules that matter most

1. Neutral by default. Colour appears only when it means something.
2. Semantic colour (green, red, amber) means status. Nothing else uses it.
3. Graph colour is for charts and the node-and-edge scenes only.
4. No emojis. Anywhere. Not in UI, copy, commits or docs.
5. Icons come from one library: `@primer/octicons-react` (GitHub's own set).
   Never hand-draw SVG icons, never use random icon SVGs.
6. Use icons sparingly. A label is better than an icon in most places.
7. No gradients, no glow, no glassmorphism, no drop-shadow cards.
8. No card grids of identical boxes with an icon on top. Use rows, tables,
   dividers and whitespace. A "card" is only a bordered region, 1px, 6px radius.
9. Highly saturated colours are banned. Use the values below as they are.
10. Copy is plain and short. Sentence case. No exclamation marks.
11. Charts are drawn in plain SVG by us, not a chart library, so they look
    like GitHub's own graphs and not a template.

## Colour tokens (dark is the default theme)

```css
:root {
  /* surfaces */
  --bg:            #0a0a0a;  /* page */
  --surface:       #111111;  /* panels */
  --surface-2:     #171717;  /* hover, inputs, raised rows */
  --border:        #262626;
  --border-strong: #3a3a3a;

  /* text */
  --text:          #ededed;
  --text-muted:    #a1a1a1;
  --text-subtle:   #7d7d7d;  /* smallest labels only, about 4.8:1 on --bg */

  /* actions */
  --fg-on-primary: #0a0a0a;
  --primary:       #ededed;  /* primary button is light on dark, like Vercel */
  --link:          #58a6ff;  /* links and focus ring only */

  /* semantic, used for status only */
  --success:       #3fb950;
  --success-bg:    rgba(63, 185, 80, 0.12);
  --danger:        #f85149;
  --danger-bg:     rgba(248, 81, 73, 0.12);
  --warning:       #d29922;
  --warning-bg:    rgba(210, 153, 34, 0.12);

  /* graph palette: one per person, charts and scenes only */
  --g0: #6aa3e5;  /* blue */
  --g1: #d1a245;  /* amber */
  --g2: #a18ad8;  /* violet */
  --g3: #cc8fae;  /* rose */
  --g4: #5bb5b0;  /* teal */

  /* the main branch line and neutral graph parts */
  --g-main: #8a8a8a;
}
```

Light theme (build only if time allows, after the demo flow works):
`--bg #ffffff`, `--surface #fafafa`, `--surface-2 #f2f2f2`, `--border #e5e5e5`,
`--border-strong #d4d4d4`, `--text #171717`, `--text-muted #525252`,
`--text-subtle #6b6b6b`, `--primary #171717`, `--link #0969da`,
`--success #1a7f37`, `--danger #cf222e`, `--warning #9a6700`.

Contrast: text colours were checked roughly at 4.5:1 or better against `--bg`.
Never put `--text-subtle` on `--surface-2`.

## Type

- Sans: Geist Sans via the `geist` npm package. Mono: Geist Mono.
- Mono is for numbers in tables, SHAs, file paths and branch names.
- Base size 14px, line-height 1.5. Small labels 12px. Page title 20px, section
  heading 14px at weight 600. Nothing larger than 24px except the single big
  verdict word on the team page (32px).
- Two weights only: 400 and 600.
- No letter-spacing tricks, no all-caps labels except the tiny table headers
  at 11px.

## Layout

- Top bar 48px: wordmark left, team switcher, a "Mentor" and "Team" toggle.
  Wordmark is plain text "SquadSync" in Geist Sans 600. No logo mark.
- Content width: max 1200px, 24px gutters. 8px spacing grid.
- Radius: 6px on controls and panels. No pill-shaped buttons.
- Borders 1px `--border`. No shadows, except a focus ring.
- Panels have a 14px title row, a hairline, then content. No icon beside the title.
- Tables use thin row dividers and no zebra stripes.
- Focus ring: 2px `--link`, offset 2px. Touch targets 36px minimum.

## Components

Button: primary (light fill), secondary (border only), ghost (no border).
Height 32px, 14px text. Never more than one primary per view.

Status tag: 12px text, 4px radius, tinted background (`--success-bg`,
`--danger-bg`, `--warning-bg`) with text in the matching colour. Words only:
"High", "Medium", "Low", "Likely", "Possible", "Certain", "Fine".

Verdict: one word, 32px, 600. The word carries the colour: On track (success),
Slipping (warning), At risk (danger). Below it, one plain sentence.

Evidence drawer: opens from the right (400px) or inline under a risk row. It
always shows, in this order: rule ("why we flagged this"), the picture (the
GitGraph scene), the evidence list, the action. If the sentence was written
by AI, show a small text tag "written by AI from these numbers".

Empty and error states: one sentence and one action, no illustration.

## The GitGraph scene (the signature visual)

Drawn in SVG from a `GraphScene` (see `src/lib/types.ts`). It is the node and
edge picture that shows what will go wrong, in the style of a git-flow
explainer: a horizontal main line, branches curving off it, commits as rings.

- Lane: a horizontal line. Main uses `--g-main`. A branch uses its owner's
  graph colour (`--g0` to `--g4`).
- Lane label: a small rounded pill with the branch name, mono 12px, border only.
- Commit node: 14px ring, 2px stroke in the lane colour, filled dot inside.
- Future node: dashed ring, `--border-strong`.
- Merge node: ring in `--success`, a small check inside.
- Conflict node: filled `--danger-bg`, 2px `--danger` ring, a cross inside.
- Warning node: ring in `--warning`.
- Ghost node: dashed ring with a cross, `--text-subtle` (orphaned commits).
- Unknown node: dashed ring with a question mark (work that may be unpushed).
- Edges: curved path from a branch node to the main line. A normal edge is the
  lane colour. A danger edge is `--danger`, 2px. A dashed edge is expected or
  not yet made.
- Caption: one 12px muted line under the scene.

Animation (plays once when the scene enters view, replay button available):
1. Lanes draw in.
2. Commit nodes appear in order of `step`.
3. The merge edge travels along its path.
4. On a conflict, the target node pulses once (scale 1 to 1.15 to 1, 400ms),
   turns red and the cross draws in.
Durations 200 to 400ms, ease-out. No looping. Respect
`prefers-reduced-motion`: show the final frame with no motion.

Scene catalogue: see PROJECT.md, "Conflict scenes".

## Dashboard panels (Team page)

Order, top to bottom:
1. Header row: team name, week x of y, days left, Mentor/Team toggle.
2. Verdict word and sentence. Beside it, a two-bar schedule: time used versus
   tasks done, with the gap labelled.
3. Replay strip: one segment per week, coloured by status, a draggable marker,
   and a marker at "first warning".
4. Three panels in a row (stack on narrow screens): Who did the work (stacked
   bars for tasks, code, reviews, docs and design, with the even-share line),
   Who checked whose work (review matrix as a heatmap table), When code landed
   (weekly bars with the team's usual band, then open PRs by age).
5. Risks list, then "Not flagged" with the reason for each person.

Heatmap and bars use the graph palette in light tints plus `--danger` for the
cells that matter. Always label values directly. Never rely on colour alone:
the flagged items also carry a text tag.

## Mentor view

One table, not cards: a row per team with verdict word, one-line reason, number
of risks, and the largest risk. Sorted by who needs help first. Click a row to
open the team page.

## Extension side panel

Same tokens, narrow layout (360px to 420px): verdict word and sentence,
the top three risks as rows, "Open full view" link. The GitGraph scene fits
at 360px.

## Do not

- Do not add decorative illustrations, hero sections or marketing copy.
- Do not use more than two accent colours on one screen.
- Do not animate anything except the GitGraph scenes and a 150ms hover fade.
- Do not name things with AI-flavoured words ("insights engine", "smart", "magic").
