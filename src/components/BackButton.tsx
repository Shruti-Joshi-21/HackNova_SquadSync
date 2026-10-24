"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@primer/octicons-react";

// "Back" for every page in the app. It keeps a short trail of the pages
// visited inside SquadSync (this tab only), so it never leaves the site.
// Opened from a link or a new tab, it goes to the page's natural parent.

const TRAIL_KEY = "squadsync.trail";

function readTrail(): string[] {
  try {
    const t = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    return Array.isArray(t) ? t.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]) {
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-30)));
  } catch {
    // storage blocked: Back falls back to the parent page
  }
}

/** Record a visit. Going back to the page before the current one shortens the trail instead. */
export function useTrail(pathname: string) {
  useEffect(() => {
    const trail = readTrail();
    if (trail[trail.length - 1] === pathname) return;
    if (trail[trail.length - 2] === pathname) trail.pop();
    else trail.push(pathname);
    writeTrail(trail);
  }, [pathname]);
}

function parentOf(pathname: string): string {
  if (pathname.startsWith("/team/")) return "/mentor";
  return "/";
}

function nameOf(path: string): string {
  if (path === "/") return "Home";
  if (path === "/mentor") return "All teams";
  if (path === "/connect") return "Connect a repo";
  if (path === "/plan") return "Split the work";
  if (path.startsWith("/team/")) return "Team view";
  if (path.startsWith("/dev/")) return "Scenes";
  return "previous page";
}

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  useTrail(pathname);

  // Where Back goes, worked out after the trail is updated (sessionStorage is browser-only).
  useEffect(() => {
    const t = setTimeout(() => {
      const trail = readTrail();
      const prev = trail[trail.length - 1] === pathname ? trail[trail.length - 2] : trail[trail.length - 1];
      setTarget(prev && prev !== pathname ? prev : parentOf(pathname));
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  function goBack() {
    const trail = readTrail();
    if (trail[trail.length - 1] === pathname) trail.pop();
    const prev = trail.pop() ?? parentOf(pathname);
    writeTrail(trail);
    router.push(prev);
  }

  const to = target ?? parentOf(pathname);
  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-4 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
    >
      <ArrowLeftIcon size={16} />
      Back to {nameOf(to)}
    </button>
  );
}
