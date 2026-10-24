"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { TeamListItem } from "@/lib/types";
import { getTeams } from "@/lib/data";

// Wordmark, team switcher and the Mentor / Team toggle. The toggle follows the
// URL: "/mentor" is the mentor view, "/team/[id]" is the team view. "/" is the landing page.
export default function TopBar({ wide = false }: { wide?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamListItem[]>([]);

  useEffect(() => {
    let alive = true;
    getTeams()
      .then((t) => alive && setTeams(t))
      .catch(() => {}); // the switcher just stays empty; pages show their own errors
    return () => {
      alive = false;
    };
  }, []);
  const currentTeam = pathname.match(/^\/team\/([^/]+)/)?.[1] ?? "";
  const view = currentTeam ? "team" : "mentor";
  const teamHref = `/team/${currentTeam || teams[0]?.id || ""}`;

  return (
    <header className="h-12 border-b border-border bg-bg">
      <div className={`mx-auto flex h-full items-center gap-4 px-6 lg:px-10 ${wide ? "max-w-[1800px]" : "max-w-[1440px]"}`}>
        <Link href="/" className="font-semibold text-text">
          SquadSync
        </Link>

        <label className="sr-only" htmlFor="team-switcher">
          Team
        </label>
        <select
          id="team-switcher"
          value={currentTeam}
          onChange={(e) => e.target.value && router.push(`/team/${e.target.value}`)}
          className="h-8 rounded-md border border-border bg-bg px-2 text-muted hover:bg-surface-2"
        >
          <option value="">Select team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <nav className="ml-auto flex h-8 rounded-md border border-border" aria-label="View">
          <Link
            href="/mentor"
            aria-current={view === "mentor" ? "page" : undefined}
            className={`flex items-center rounded-l-md px-3 ${view === "mentor" ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}
          >
            Mentor
          </Link>
          <Link
            href={teamHref}
            aria-current={view === "team" ? "page" : undefined}
            className={`flex items-center rounded-r-md px-3 ${view === "team" ? "bg-surface-2 text-text" : "text-muted hover:text-text"}`}
          >
            Team
          </Link>
        </nav>
      </div>
    </header>
  );
}
