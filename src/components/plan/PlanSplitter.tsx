"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectPlan } from "@/lib/types";
import { makePlan } from "@/lib/data";
import GitGraph from "@/components/GitGraph";
import { Tag } from "@/components/ui";
import { checkPlanShape, mergeOrderScene, slotName } from "./checks";

// Older versions kept the last plan here; it is removed so a refresh starts empty.
const OLD_STORAGE_KEY = "squadsync.plan";

const DEFAULT_TEAM_SIZE = 4;

// PRD in, ownership plan out. Nothing is kept: a refresh or Clear all starts over.
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
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="prd" className="font-semibold">
            Project description or PRD
          </label>
          <textarea
            id="prd"
            value={prd}
            onChange={(e) => setPrd(e.target.value)}
            rows={14}
            placeholder="What the app does, its main screens and features."
            aria-invalid={!!error}
            aria-describedby={error ? "prd-error" : undefined}
            className="mt-1 block w-full rounded-md border border-border bg-surface-2 p-3 text-text placeholder:text-subtle"
          />
          {error && (
            <p id="prd-error" className="mt-1 text-xs text-danger">
              {error}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="size" className="font-semibold">
            Team size
          </label>
          <select
            id="size"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="mt-1 block h-9 rounded-md border border-border bg-surface-2 px-2 text-text"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} people
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="h-8 rounded-md border border-border px-4 text-text hover:bg-surface-2 disabled:opacity-60"
          >
            Clear all
          </button>
        </div>
        <p className="text-xs text-muted">
          A good split gives each person their own folders and one owner per shared file. It reduces merge conflicts; it
          cannot promise none.
        </p>
      </form>

      <div className="min-w-0">
        {result ? (
          <PlanView plan={result.plan} note={result.note} />
        ) : (
          <p className="text-muted">Paste a PRD and press Split the work to see who owns what.</p>
        )}
      </div>
    </div>
  );
}

function PlanView({ plan, note }: { plan: ProjectPlan; note?: string }) {
  const names = new Map(plan.modules.map((m) => [m.id, m.name]));
  const checks = checkPlanShape(plan);
  const passed = checks.filter((c) => c.ok).length;
  const colors = Object.fromEntries(Array.from({ length: plan.teamSize }, (_, s) => [`slot-${s}`, s % 5]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Tag tone="neutral">{plan.source === "ai" ? "written by AI, checked by code" : "template plan"}</Tag>
        {note && <span>{note}</span>}
      </div>

      <section>
        <h2 className="font-semibold">Who owns what</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase text-subtle">
                <th className="py-2 pr-4 font-normal">Module</th>
                <th className="py-2 pr-4 font-normal">Owner</th>
                <th className="py-2 pr-4 font-normal">Folders</th>
                <th className="py-2 pr-4 font-normal">Tasks</th>
                <th className="py-2 font-normal">Depends on</th>
              </tr>
            </thead>
            <tbody>
              {plan.modules.map((m) => (
                <tr key={m.id} className="border-b border-border align-top">
                  <td className="py-2 pr-4 font-semibold">{m.name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ background: `var(--g${m.ownerSlot % 5})` }}
                      aria-hidden
                    />
                    {slotName(m.ownerSlot)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{m.folders.join(", ")}</td>
                  <td className="py-2 pr-4 text-muted">{m.tasks.join(", ")}</td>
                  <td className="py-2 text-muted">{m.dependsOn.map((d) => names.get(d) ?? d).join(", ") || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="font-semibold">Shared files</h2>
          <p className="mt-1 text-xs text-muted">One person edits each of these. Everyone else asks.</p>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {plan.sharedFiles.map((f) => (
              <li key={f.path} className="py-2">
                <div className="flex justify-between gap-4">
                  <span className="font-mono text-xs">{f.path}</span>
                  <span>{slotName(f.ownerSlot)}</span>
                </div>
                <p className="text-xs text-muted">{f.rule}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">Agree these first</h2>
          <p className="mt-1 text-xs text-muted">Settle these shapes before anyone writes code against them.</p>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {plan.interfaces.map((i) => (
              <li key={i.between.join("-")} className="py-2">
                <p>{i.agreeFirst}</p>
                <p className="text-xs text-muted">
                  {names.get(i.between[0]) ?? i.between[0]} and {names.get(i.between[1]) ?? i.between[1]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Merge order</h2>
        {/* Keyed so a new plan replays from the start. */}
        <GitGraph key={`${plan.teamSize}-${plan.mergeOrder.join()}`} scene={mergeOrderScene(plan)} colorByPerson={colors} />
      </section>

      <section>
        <h2 className="font-semibold">Checked by code</h2>
        <p className="mt-1 text-xs text-muted">
          {passed} of {checks.length} checks pass.
        </p>
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {checks.map((c) => (
            <li key={c.label} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
              <span className="w-16 shrink-0">
                <Tag tone={c.ok ? "success" : "warning"}>{c.ok ? "Pass" : "Check"}</Tag>
              </span>
              <span className="flex-1">
                {c.label}
                {!c.ok && c.detail && <span className="block text-xs text-muted">{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
