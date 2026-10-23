# LOG-A: Laptop A (interface)

Only this owner edits this file. Newest entry on top.

## Done

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

A2: GitGraph scene component and /dev/scenes gallery (likely moves to 22:30).

## Needs from others

None.

## Decisions

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
