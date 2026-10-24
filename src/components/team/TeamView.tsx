"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/types";
import { getAnalysis } from "@/lib/data";
import { ErrorState, TeamSkeleton } from "@/components/states";
import TeamBody from "./TeamBody";
import ReplayStrip from "./ReplayStrip";

const AUTO_MS = 60_000;
const REPLAY_DEBOUNCE_MS = 250;

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; a: Analysis; at: Date };

// Last result per team, so moving between pages does not flash the skeleton.
const memory = new Map<string, { a: Analysis; at: Date }>();

// Loads the team from the API, with Refresh and an optional 60-second auto-refresh.
export default function TeamView({ id }: { id: string }) {
  const [state, setState] = useState<State>(() => {
    const m = memory.get(id);
    return m ? { status: "ready", ...m } : { status: "loading" };
  });
  const [nonce, setNonce] = useState(0); // bumped to re-call the API
  const [refreshing, setRefreshing] = useState(false);
  const [auto, setAuto] = useState(false);

  // Replay: the marker moves at once; the API is called 250ms after it stops.
  const [marker, setMarker] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [replay, setReplay] = useState<{ day: string; a?: Analysis; error?: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAsOf(marker), REPLAY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [marker]);

  useEffect(() => {
    if (!asOf) return;
    let alive = true;
    getAnalysis(id, asOf)
      .then((a) => alive && setReplay({ day: asOf, a: a ?? undefined, error: a ? undefined : "No data for that day." }))
      .catch((err: Error) => alive && setReplay({ day: asOf, error: err.message }));
    return () => {
      alive = false;
    };
  }, [id, asOf]);

  useEffect(() => {
    let alive = true;
    getAnalysis(id)
      .then((a) => {
        if (!alive) return;
        if (!a) return setState({ status: "missing" });
        const entry = { a, at: new Date() };
        memory.set(id, entry);
        setState({ status: "ready", ...entry });
      })
      .catch((err: Error) => {
        // Keep showing the last good result if a refresh fails.
        if (alive && !memory.has(id)) setState({ status: "error", message: err.message });
      })
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
  }, [id, nonce]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setNonce((n) => n + 1), AUTO_MS);
    return () => clearInterval(t);
  }, [auto]);

  const refresh = () => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  };

  if (state.status === "loading") return <TeamSkeleton />;
  if (state.status === "error")
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          setState({ status: "loading" });
          refresh();
        }}
      />
    );
  if (state.status === "missing")
    return (
      <div className="py-12">
        <p>No data for this team yet.</p>
        <Link href="/" className="mt-2 inline-block text-link hover:underline">
          Back to all teams
        </Link>
      </div>
    );

  const latest = state.a;
  // Replay needs ?asOf= on GET /api/analyze/[id], which only the sample teams have.
  // Pasted repos get ids starting "gh-" from B5's ingest.
  const canReplay = !id.startsWith("gh-");
  const replayPending = marker !== null && replay?.day !== marker;
  // While the next day loads, keep showing the last day that loaded (dimmed),
  // so the page never jumps back to today and then forward again.
  const a = marker !== null && replay?.a ? replay.a : latest;
  const weeks = a.timeline.length;
  const week = Math.min(weeks, Math.floor(a.schedule.daysUsed / 7) + 1);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold">{a.team.name}</h1>
        <span className="text-muted">
          Week {week} of {weeks} · {a.schedule.daysLeft} days left
        </span>

        <div className="ml-auto flex items-center gap-3 text-xs text-muted">
          <span aria-live="polite">
            {refreshing ? "Refreshing" : `Updated ${state.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
          </span>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[var(--text)]" />
            Every minute
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="h-8 rounded-md border border-border px-3 text-sm text-text hover:bg-surface-2 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </header>

      <TeamBody
        a={a}
        dim={replayPending}
        replay={
          canReplay && (
          <div>
            <ReplayStrip latest={latest} value={marker} onChange={setMarker} />
            <p className="h-5 text-xs text-muted" aria-live="polite">
              {replayPending ? "Loading that day" : ""}
            </p>
            {marker !== null && replay?.day === marker && replay.error && (
              <p className="text-xs text-danger">{replay.error}</p>
            )}
          </div>
          )
        }
      />
    </div>
  );
}
