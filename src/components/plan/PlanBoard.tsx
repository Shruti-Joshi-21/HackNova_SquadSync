"use client";

import { useState } from "react";
import { GitMergeIcon } from "@primer/octicons-react";
import type { ProjectPlan } from "@/lib/types";
import GitGraph from "@/components/GitGraph";
import { Tag } from "@/components/ui";
import { checkPlanShape, mergeOrderScene, slotName } from "./checks";

// The plan as pictures: a team map, the merge order, shared files with
// agreements, and the module you click. Panels grow with their content (no
// scrollbars inside). With no plan yet, only a short prompt is shown.

const lane = (slot: number) => `var(--g${slot % 5})`;
const tint = (slot: number, pct: number) => `color-mix(in srgb, var(--g${slot % 5}) ${pct}%, transparent)`;

/** Before the first split: one icon and one line, no boxes. */
export function EmptyBoard() {
  return (
    <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border px-6 text-center">
      <span className="text-subtle">
        <GitMergeIcon size={40} />
      </span>
      <p className="text-text">Paste a PRD first, choose the team size, then press Split the work.</p>
    </div>
  );
}

export default function PlanBoard({ plan, note }: { plan: ProjectPlan; note?: string }) {
  const [selected, setSelected] = useState(plan.mergeOrder[0] ?? plan.modules[0]?.id);
  const byId = new Map(plan.modules.map((m) => [m.id, m]));
  const current = byId.get(selected) ?? plan.modules[0];
  const checks = checkPlanShape(plan);
  const passed = checks.filter((c) => c.ok).length;
  const colors = Object.fromEntries(Array.from({ length: plan.teamSize }, (_, s) => [`slot-${s}`, s % 5]));

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <Tag tone="neutral">{plan.source === "ai" ? "written by AI, checked by code" : "template plan"}</Tag>
        {note && <span className="text-muted">{note}</span>}
        <span className="ml-auto flex items-center gap-2 text-muted" title={checks.map((c) => `${c.ok ? "Pass" : "Check"}: ${c.label}`).join("\n")}>
          <span className="flex gap-1" aria-hidden>
            {checks.map((c) => (
              <span key={c.label} className={`h-2.5 w-2.5 rounded-full ${c.ok ? "bg-success" : "bg-warning"}`} />
            ))}
          </span>
          {passed} of {checks.length} checks pass
        </span>
      </div>

      {passed < checks.length && (
        <ul className="text-xs text-warning">
          {checks.filter((c) => !c.ok).map((c) => (
            <li key={c.label}>
              {c.label}
              {c.detail && <span className="text-muted">: {c.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto]">
        <Box title="Who owns what" hint="Click a module">
          <TeamMap plan={plan} selected={current?.id} onSelect={setSelected} />
        </Box>

        <Box title="Merge order" hint="Each module joins main in turn">
          {/* Keyed so a new plan replays from the start. */}
          <GitGraph key={`${plan.teamSize}-${plan.mergeOrder.join()}`} scene={mergeOrderScene(plan)} colorByPerson={colors} />
        </Box>

        <Box title="Shared files and agreements">
          <SharedAndAgreements plan={plan} />
        </Box>

        <Box title={current ? current.name : "Module"} accent={current ? lane(current.ownerSlot) : undefined}>
          {current && <ModuleDetail plan={plan} id={current.id} onSelect={setSelected} />}
        </Box>
      </div>
    </div>
  );
}

function Box({ title, hint, accent, children }: { title: string; hint?: string; accent?: string; children?: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-md border border-border bg-surface px-4 py-3">
      <div className="mb-2 flex items-baseline gap-2">
        {accent && <span className="h-2.5 w-2.5 shrink-0 self-center rounded-full" style={{ background: accent }} aria-hidden />}
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </div>
      {/* Grows with its content: no scrollbar inside a panel. */}
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** One row per person: their colour, their share of the tasks, their modules. */
function TeamMap({ plan, selected, onSelect }: { plan: ProjectPlan; selected?: string; onSelect: (id: string) => void }) {
  const total = plan.modules.reduce((n, m) => n + Math.max(1, m.tasks.length), 0) || 1;
  const even = 1 / plan.teamSize;
  return (
    <ul className="space-y-2">
      {Array.from({ length: plan.teamSize }, (_, slot) => {
        const mine = plan.modules.filter((m) => m.ownerSlot === slot);
        const share = mine.reduce((n, m) => n + Math.max(1, m.tasks.length), 0) / total;
        return (
          <li key={slot} className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3">
            <div className="pt-1">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: lane(slot) }} aria-hidden />
                {slotName(slot)}
              </div>
              <div
                className="relative mt-2 h-1.5 rounded-full bg-surface-2"
                title={`${Math.round(share * 100)}% of the tasks; an even share is ${Math.round(even * 100)}%`}
              >
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, share * 100)}%`, background: lane(slot) }} />
                <div className="absolute -top-1 h-3.5 w-px bg-muted" style={{ left: `${even * 100}%` }} aria-hidden />
              </div>
              <div className="mt-1 text-xs text-subtle">{Math.round(share * 100)}% of tasks</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {mine.length === 0 && <span className="pt-1 text-sm text-subtle">No module yet</span>}
              {mine.map((m) => {
                const on = m.id === selected;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m.id)}
                    aria-pressed={on}
                    className="min-w-[150px] max-w-full rounded-md border px-3 py-1.5 text-left transition-colors"
                    style={{
                      borderColor: on ? lane(slot) : "var(--border)",
                      background: tint(slot, on ? 18 : 8),
                    }}
                  >
                    <span className="block text-sm font-semibold leading-snug">{m.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted">{m.folders.join("  ")}</span>
                    <span className="mt-1 block text-xs text-subtle">
                      {m.tasks.length} {m.tasks.length === 1 ? "task" : "tasks"}
                      {m.dependsOn.length > 0 && ` · needs ${m.dependsOn.length}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SharedAndAgreements({ plan }: { plan: ProjectPlan }) {
  const byId = new Map(plan.modules.map((m) => [m.id, m]));
  const chip = (id: string) => {
    const m = byId.get(id);
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ background: m ? lane(m.ownerSlot) : "var(--g-main)" }} aria-hidden />
        {m?.name ?? id}
      </span>
    );
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-subtle">One owner each</h3>
        <ul className="space-y-2">
          {plan.sharedFiles.map((f) => (
            <li key={f.path}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{f.path}</span>
                <span className="text-subtle" aria-hidden>
                  →
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: lane(f.ownerSlot) }} aria-hidden />
                  {slotName(f.ownerSlot)}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{f.rule}</p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide text-subtle">Agree these first</h3>
        <ul className="space-y-2">
          {plan.interfaces.map((i) => (
            <li key={i.between.join("-")}>
              <div className="flex flex-wrap items-center gap-1.5">
                {chip(i.between[0])}
                <span className="text-subtle" aria-hidden>
                  ⇄
                </span>
                {chip(i.between[1])}
              </div>
              <p className="mt-0.5 text-xs text-muted">{i.agreeFirst}</p>
            </li>
          ))}
          {plan.interfaces.length === 0 && <li className="text-xs text-subtle">Nothing to agree up front.</li>}
        </ul>
      </div>
    </div>
  );
}

function ModuleDetail({ plan, id, onSelect }: { plan: ProjectPlan; id: string; onSelect: (id: string) => void }) {
  const byId = new Map(plan.modules.map((m) => [m.id, m]));
  const m = byId.get(id)!;
  const position = plan.mergeOrder.indexOf(id) + 1;
  const neededBy = plan.modules.filter((x) => x.dependsOn.includes(id));
  const agreements = plan.interfaces.filter((i) => i.between.includes(id));
  const link = (other: string) => {
    const o = byId.get(other);
    return (
      <button
        key={other}
        type="button"
        onClick={() => onSelect(other)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-surface-2"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: o ? lane(o.ownerSlot) : "var(--g-main)" }} aria-hidden />
        {o?.name ?? other}
      </button>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: lane(m.ownerSlot) }} aria-hidden />
            {slotName(m.ownerSlot)}
          </span>
          {position > 0 && (
            <span className="text-muted">
              merges {position} of {plan.mergeOrder.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.folders.map((f) => (
            <span key={f} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">
              {f}
            </span>
          ))}
        </div>
        <div>
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-subtle">Needs first</h3>
          <div className="flex flex-wrap gap-1.5">
            {m.dependsOn.length > 0 ? m.dependsOn.map(link) : <span className="text-xs text-muted">Nothing. It can start now.</span>}
          </div>
        </div>
        {neededBy.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs uppercase tracking-wide text-subtle">Others wait for it</h3>
            <div className="flex flex-wrap gap-1.5">{neededBy.map((x) => link(x.id))}</div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="mb-1.5 text-xs uppercase tracking-wide text-subtle">Tasks</h3>
          <ul className="space-y-1.5">
            {m.tasks.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-sm border-2" style={{ borderColor: lane(m.ownerSlot) }} aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        {agreements.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs uppercase tracking-wide text-subtle">Agree with others</h3>
            <ul className="space-y-1 text-xs text-muted">
              {agreements.map((a) => (
                <li key={a.between.join("-")}>{a.agreeFirst}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
