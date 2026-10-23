# SquadSync extension

A Chromium Manifest V3 extension that opens a side panel beside a GitHub
repository page and shows the SquadSync analysis for that repo.

## How it works

- `background.js` sets the side panel to open when the toolbar icon is clicked.
- `sidepanel.js` reads the active tab's URL, extracts `owner/repo` from
  `github.com/<owner>/<repo>/...`, and sets an iframe to
  `<app url>/embed?repo=<owner>/<repo>`.
- `options.html` lets you set the deployed app URL (defaults to the production
  Vercel URL). Change it here for local development.
- If the active tab is not a GitHub repository page, the panel shows one line
  of text instead of the iframe.

## Load unpacked in Edge

1. Open `edge://extensions`.
2. Turn on Developer mode (top right).
3. Click "Load unpacked".
4. Select the `extension/` folder.
5. Pin the SquadSync icon to the toolbar.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click "Load unpacked" and select the `extension/` folder.

## Test

1. Open any `github.com/<owner>/<repo>` page.
2. Click the SquadSync toolbar icon. The side panel opens and loads the embed
   view for that repo.
3. Navigate to a non-repo GitHub page (for example the GitHub homepage). The
   panel should show a one-line message instead of the iframe.
4. Open options (right-click the icon, "Options", or via the extensions page)
   and change the app URL to `http://localhost:3000` while developing locally.

## Notes

- No remote scripts are loaded. All code ships inside the extension.
- The extension holds no secrets. Private repo access is handled server-side
  by the deployed app.