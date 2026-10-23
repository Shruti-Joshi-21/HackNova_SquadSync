"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import GitGraph from "@/components/GitGraph";
import { connectRepo, parseRepo } from "@/lib/data";
import type { Analysis, Confidence, Risk, Severity, Verdict } from "@/lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  on_track: "On track",
  slipping: "Slipping",
  at_risk: "At risk",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  on_track: "text-success",
  slipping: "text-warning",
  at_risk: "text-danger",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_CLASS: Record<Severity, string> = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warning-bg text-warning",
  low: "bg-surface-2 text-muted",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  possible: "Possible",
  likely: "Likely",
  certain: "Certain",
};

function Tag({ className, children }: { className: string; children: string }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${className}`}>{children}</span>;
}

function RiskRow({ risk, colorByPerson }: { risk: Risk; colorByPerson: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-2 text-left">
        <span className="mt-0.5 flex shrink-0 gap-1">
          <Tag className={SEVERITY_CLASS[risk.severity]}>{SEVERITY_LABEL[risk.severity]}</Tag>
          {risk.confidence && <Tag className="bg-surface-2 text-muted">{CONFIDENCE_LABEL[risk.confidence]}</Tag>}
        </span>
        <span className="flex-1 text-sm text-text">{risk.title}</span>
        {open ? (
          <ChevronUpIcon size={14} className="mt-0.5 shrink-0 text-subtle" />
        ) : (
          <ChevronDownIcon size={14} className="mt-0.5 shrink-0 text-subtle" />
        )}
      </button>

      {open && (
        <div className="mt-2 space-y-3 pl-1">
          <p className="text-xs text-muted">{risk.rule}</p>

          {risk.scene && (
            <div className="overflow-x-auto">
              <GitGraph scene={risk.scene} colorByPerson={colorByPerson} />
            </div>
          )}

          <ul className="space-y-1">
            {risk.evidence.map((e, i) => (
              <li key={i} className="text-xs text-muted">
                <span className="text-text">{e.label}</span>: {e.value}
              </li>
            ))}
          </ul>

          <p className="text-xs text-text">{risk.action}</p>

          {risk.summarySource === "ai" && (
            <p className="text-xs text-subtle">written by AI from these numbers</p>
          )}
        </div>
      )}
    </div>
  );
}

type EmbedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; analysis: Analysis };

function EmbedContent() {
  const params = useSearchParams();
  const repo = params.get("repo");

  const [state, setState] = useState<EmbedState>({ status: "idle" });

  useEffect(() => {
    if (!repo) {
      setState({ status: "idle" });
      return;
    }
    const parsed = parseRepo(repo);
    if (!parsed) {
      setState({ status: "error", message: "That does not look like a GitHub repository." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    // The embed view has no deadline input yet. Using 30 days from now as a
    // placeholder until connectRepo (B5) is live and a settings surface
    // exists. See LOG-C "Needs from others".
    const placeholderDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    connectRepo({ repo: parsed, deadline: placeholderDeadline }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ok", analysis: result.analysis });
      } else {
        setState({ status: "error", message: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [repo]);

  if (state.status === "idle") {
    return <p className="text-sm text-muted">Open a GitHub repository page to see its analysis.</p>;
  }

  if (state.status === "loading") {
    return <p className="text-sm text-muted">Reading the repository.</p>;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">{state.message}</p>
        <Link href="/connect" className="text-sm text-link">
          Try a sample team
        </Link>
      </div>
    );
  }

  const { analysis } = state;
  const colorByPerson = Object.fromEntries(analysis.team.people.map((p) => [p.id, p.colorIndex]));
  const topRisks = analysis.risks.slice(0, 3);

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-2xl font-semibold ${VERDICT_CLASS[analysis.verdict]}`}>
          {VERDICT_LABEL[analysis.verdict]}
        </p>
        <p className="mt-1 text-sm text-muted">{analysis.verdictReason}</p>
      </div>

      <div>
        <p className="mb-1 text-xs text-subtle">Top risks</p>
        {topRisks.length === 0 ? (
          <p className="text-sm text-muted">No risks flagged.</p>
        ) : (
          <div>
            {topRisks.map((risk) => (
              <RiskRow key={risk.id} risk={risk} colorByPerson={colorByPerson} />
            ))}
          </div>
        )}
      </div>

      <Link href="/connect" className="text-sm text-link">
        Open full view
      </Link>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <div className="min-h-screen w-full bg-bg px-4 py-4" style={{ maxWidth: 420 }}>
      <p className="mb-3 text-sm font-semibold text-text">SquadSync</p>
      <Suspense fallback={<p className="text-sm text-muted">Loading.</p>}>
        <EmbedContent />
      </Suspense>
    </div>
  );
}