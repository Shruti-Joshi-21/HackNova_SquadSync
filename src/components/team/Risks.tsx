"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon } from "@primer/octicons-react";
import type { Analysis, Risk } from "@/lib/types";
import GitGraph from "@/components/GitGraph";
import { CONFIDENCE_WORD, SEVERITY, Tag } from "@/components/ui";
import { CONFIDENCE_MEANS, EXPLAIN, NEXT_STEPS, SEVERITY_MEANS } from "./explain";
import Steps from "./Steps";

const FIRST = 5; // the rest sit behind "Show all", so the page is not a wall of text

// Risks list. Clicking a row opens the evidence drawer from the right.
export default function Risks({ a }: { a: Analysis }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? a.risks : a.risks.slice(0, FIRST);
  const close = useCallback(() => setOpenId(null), []); // stable, so the drawer's focus effect runs once
  const open = a.risks.find((r) => r.id === openId) ?? null;
  const names = new Map(a.team.people.map((p) => [p.id, p.displayName]));
  const colors = Object.fromEntries(a.team.people.map((p) => [p.id, p.colorIndex]));

  return (
    <section>
      <h2 className="text-lg font-semibold">
        Risks <span className="font-normal text-muted">{a.risks.length}</span>
      </h2>
      <p className="mt-1 text-muted">Most serious first. Open one to see the proof.</p>
      {a.risks.length === 0 ? (
        <p className="mt-3 text-muted">No risks found. The team&apos;s numbers are inside the usual ranges.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className="flex w-full flex-wrap items-start gap-x-4 gap-y-1 px-2 py-4 text-left transition-colors duration-150 hover:bg-surface-2"
              >
                <span className="flex w-36 shrink-0 gap-1">
                  <Tag tone={SEVERITY[r.severity].tone}>{SEVERITY[r.severity].word}</Tag>
                  {r.confidence && <Tag tone="neutral">{CONFIDENCE_WORD[r.confidence]}</Tag>}
                </span>
                <span className="min-w-0 flex-1 basis-64">
                  <span className="block font-semibold">{r.title}</span>
                  <span className="block text-muted">{r.summary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {a.risks.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll((x) => !x)}
          className="mt-3 h-9 rounded-md border border-border px-3 hover:bg-surface-2"
        >
          {all ? "Show fewer" : `Show all ${a.risks.length} risks`}
        </button>
      )}

      {open && <EvidenceDrawer risk={open} names={names} colors={colors} onClose={close} />}
    </section>
  );
}

function EvidenceDrawer({
  risk,
  names,
  colors,
  onClose,
}: {
  risk: Risk;
  names: Map<string, string>;
  colors: Record<string, number>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const why = EXPLAIN[risk.kind];

  // Focus the drawer on open; on close, give focus back to the row that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [onClose, risk.id]);

  return (
    <>
      <div className="fixed inset-0 z-10 bg-bg/60" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={risk.title}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-20 w-full max-w-[420px] overflow-y-auto border-l border-border bg-surface p-4 outline-none"
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <div className="flex gap-1">
              <Tag tone={SEVERITY[risk.severity].tone}>{SEVERITY[risk.severity].word}</Tag>
              {risk.confidence && <Tag tone="neutral">{CONFIDENCE_WORD[risk.confidence]}</Tag>}
            </div>
            <h2 className="mt-2 text-xl font-semibold">{risk.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            <XIcon size={16} />
          </button>
        </div>

        <p className="mt-2">{risk.summary}</p>
        {risk.summarySource === "ai" && (
          <p className="mt-1">
            <Tag tone="neutral">written by AI from these numbers</Tag>
          </p>
        )}

        <h3 className="mt-6 font-semibold">In plain words</h3>
        <p className="mt-1">{why.meaning}</p>

        <h3 className="mt-6 font-semibold">Why it matters</h3>
        <p className="mt-1">{why.why}</p>

        <h3 className="mt-6 font-semibold">The rule we used</h3>
        <p className="mt-1 text-muted">{risk.rule}</p>

        {risk.scene && (
          <div className="mt-6">
            <GitGraph scene={risk.scene} colorByPerson={colors} />
          </div>
        )}

        <h3 className="mt-6 font-semibold">The evidence</h3>
        <p className="mt-1 text-xs text-muted">Where this comes from: {why.source}</p>
        <dl className="mt-2 divide-y divide-border border-y border-border">
          {risk.evidence.map((e, i) => (
            <div key={i} className="flex justify-between gap-4 py-1.5">
              <dt className="text-muted">{e.label}</dt>
              <dd className="text-right font-mono">
                {e.ref?.url ? (
                  <a href={e.ref.url} target="_blank" rel="noreferrer" className="text-link hover:underline">
                    {e.value}
                  </a>
                ) : (
                  e.value
                )}
              </dd>
            </div>
          ))}
          {risk.people.length > 0 && (
            <div className="flex justify-between gap-4 py-1.5">
              <dt className="text-muted">People</dt>
              <dd className="text-right">{risk.people.map((id) => names.get(id) ?? id).join(", ")}</dd>
            </div>
          )}
        </dl>

        <h3 className="mt-6 font-semibold">How serious and how sure</h3>
        <ul className="mt-1 space-y-1">
          <li>
            {SEVERITY[risk.severity].word}: {SEVERITY_MEANS[risk.severity]}
          </li>
          {risk.confidence && <li>{CONFIDENCE_MEANS[risk.confidence]}</li>}
        </ul>

        <h3 className="mt-6 font-semibold">What this does not mean</h3>
        <p className="mt-1 text-muted">{why.notProof}</p>

        <h3 className="mt-6 font-semibold">What to do</h3>
        <Steps steps={[risk.action, ...NEXT_STEPS[risk.kind]].map((text) => ({ text }))} />
      </div>
    </>
  );
}
