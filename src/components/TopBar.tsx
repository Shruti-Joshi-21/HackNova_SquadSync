"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleDownIcon } from "@primer/octicons-react";

type View = "mentor" | "team";

export default function TopBar() {
  const [view, setView] = useState<View>("mentor");

  return (
    <header className="h-12 border-b border-border bg-bg">
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-4 px-6">
        <Link href="/" className="font-semibold text-text">
          SquadSync
        </Link>

        {/* Team switcher: placeholder until teams come from data */}
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded-md border border-border px-3 text-muted hover:bg-surface-2"
        >
          Select team
          <TriangleDownIcon size={16} />
        </button>

        <div className="ml-auto flex h-8 rounded-md border border-border" role="group" aria-label="View">
          {(["mentor", "team"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-3 first:rounded-l-md last:rounded-r-md ${
                view === v ? "bg-surface-2 text-text" : "text-muted hover:text-text"
              }`}
            >
              {v === "mentor" ? "Mentor" : "Team"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
