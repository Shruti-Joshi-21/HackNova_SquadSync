"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectPlan } from "@/lib/types";
import { makePlan } from "@/lib/data";
import PlanBoard, { EmptyBoard } from "./PlanBoard";
import { EXAMPLE_PRD } from "./example";

// Older versions kept the last plan here; it is removed so a refresh starts empty.
const OLD_STORAGE_KEY = "squadsync.plan";

const DEFAULT_TEAM_SIZE = 4;

// PRD in, ownership plan out. Nothing is kept: a refresh or Clear all starts
// over. Before the first split the board's boxes stand empty.
export default function PlanSplitter() {
  const [prd, setPrd] = useState("");
  const [teamSize, setTeamSize] = useState(DEFAULT_TEAM_SIZE);
  const [result, setResult] = useState<{ plan: ProjectPlan; note?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each split gets a number; an answer that arrives after Clear all is ignored.
  const request = useRef(0);

  useEffect(() => {
    try {
      localStorage.removeItem(OLD_STORAGE_KEY);
    } catch {
      // storage blocked: nothing to remove
    }
  }, []);

  function clearAll() {
    request.current++;
    setPrd("");
    setTeamSize(DEFAULT_TEAM_SIZE);
    setResult(null);
    setError(null);
    setBusy(false);
  }

  function fillExample() {
    setPrd(EXAMPLE_PRD);
    setTeamSize(DEFAULT_TEAM_SIZE);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prd.trim().length < 40) {
      setError("Paste the PRD or a short description of the project, at least a few sentences.");
      return;
    }
    setError(null);
    setBusy(true);
    const mine = ++request.current;
    let r: Awaited<ReturnType<typeof makePlan>>;
    try {
      r = await makePlan(prd, teamSize);
    } catch (err) {
      if (mine !== request.current) return;
      setBusy(false);
      setError((err as Error).message); // the route's own sentence, for example a PRD that is too long
      return;
    }
    if (mine !== request.current) return;
    setBusy(false);
    setResult(r);
  }

  const somethingToClear = prd !== "" || teamSize !== DEFAULT_TEAM_SIZE || result !== null || error !== null || busy;

  return (
    // Desktop: at least one screen tall; a bigger plan makes the page (not each box) scroll.
    <div className="grid gap-5 lg:min-h-[calc(100dvh-180px)] lg:grid-cols-[340px_minmax(0,1fr)]">
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="prd" className="font-semibold">
            Project description or PRD
          </label>
          <button type="button" onClick={fillExample} className="text-sm text-link hover:underline">
            Try an example
          </button>
        </div>
        <textarea
          id="prd"
          value={prd}
          onChange={(e) => setPrd(e.target.value)}
          placeholder="What the app does, its main screens and features."
          aria-invalid={!!error}
          aria-describedby={error ? "prd-error" : undefined}
          className="block min-h-[200px] w-full flex-1 resize-none rounded-md border border-border bg-surface-2 p-3 text-text placeholder:text-subtle"
        />
        {error && (
          <p id="prd-error" className="text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="size" className="block text-sm font-semibold">
              Team size
            </label>
            <select
              id="size"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="mt-1 block h-8 rounded-md border border-border bg-surface-2 px-2 text-text"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} people
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-8 rounded-md bg-primary px-4 font-semibold text-fg-on-primary disabled:opacity-60"
          >
            {busy ? "Splitting" : "Split the work"}
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!somethingToClear}
            className="h-8 rounded-md border border-border px-3 text-text hover:bg-surface-2 disabled:opacity-60"
          >
            Clear all
          </button>
        </div>
        <p className="text-xs text-muted">
          A good split gives each person their own folders and one owner per shared file. It reduces merge conflicts; it
          cannot promise none.
        </p>
      </form>

      <div className="flex flex-col" aria-live="polite" aria-busy={busy}>
        {result ? (
          // Keyed so a new plan starts with its own first module selected.
          <PlanBoard key={result.plan.mergeOrder.join() + result.plan.teamSize} plan={result.plan} note={result.note} />
        ) : (
          <EmptyBoard />
        )}
      </div>
    </div>
  );
}
