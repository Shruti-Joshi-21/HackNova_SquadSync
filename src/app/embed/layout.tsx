import type { ReactNode } from "react";

// Narrow, no top bar: this view sits inside the extension's side panel or a
// bare iframe. If the root layout renders the shared top bar for every
// route, Laptop A needs to move it into a route group so /embed can opt out.
// See LOG-C "Needs from others".
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}