"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import GitGraph from "@/components/GitGraph";
import { CONFIDENCE_WORD, SEVERITY, Tag, VERDICT } from "@/components/ui";
import { EXPLAIN } from "@/components/team/explain";
import { connectRepo, parseRepo } from "@/lib/data";
import type { Analysis, Risk } from "@/lib/types";

// Tags, verdict words and the plain-English notes come from the same files as
// the web app's team page, so the side panel always matches it.

function RiskRow({ risk, colorByPerson }: { risk: Risk; colorByPerson: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const why = EXPLAIN[risk.kind];
  return (
    <div className="border-b border-border py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="mt-0.5 flex shrink-0 gap-1">
          <Tag tone={SEVERITY[risk.severity].tone}>{SEVERITY[risk.severity].word}</Tag>
          {risk.confidence && <Tag tone="neutral">{CONFIDENCE_WORD[risk.confidence]}</Tag>}
        </span>
        <span className="flex-1 font-semibold text-text">{risk.title}</span>
        {open ? (
          <ChevronUpIcon size={14} className="mt-0.5 shrink-0 text-subtle" />
        ) : (
          <ChevronDownIcon size={14} className="mt-0.5 shrink-0 text-subtle" />
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-4 pl-1">
          <div>
            <p>{risk.summary}</p>
            {risk.summarySource === "ai" && (
              <p className="mt-1">
                <Tag tone="neutral">written by AI from these numbers</Tag>
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold">In plain words</p>
            <p className="mt-0.5">{why.meaning}</p>
          </div>

          {risk.scene && (
            <div className="overflow-x-auto">
              <GitGraph scene={risk.scene} colorByPerson={colorByPerson} />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold">The evidence</p>
            <dl className="mt-1 divide-y divide-border border-y border-border text-xs">
              {risk.evidence.map((e, i) => (
                <div key={i} className="flex justify-between gap-3 py-1.5">
                  <dt className="text-muted">{e.label}</dt>
                  <dd className="text-right font-mono">{e.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="text-xs font-semibold">What this does not mean</p>
            <p className="mt-0.5 text-muted">{why.notProof}</p>
          </div>

          <div>
            <p className="text-xs font-semibold">What to do</p>
            <p className="mt-0.5">{risk.action}</p>
          </div>
        </div>
      )}
    </div>
  );
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; analysis: Analysis };

function EmbedContent() {
  const params = useSearchParams();
  const repo = params.get("repo");
  const parsedRepo = repo ? parseRepo(repo) : null;

  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!parsedRepo) return;

    let cancelled = false;

    // The embed view has no deadline input yet. Using 30 days from now as a
    // placeholder until connectRepo (B5) is live and a settings surface
    // exists. See LOG-C "Needs from others".
    const placeholderDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    connectRepo({ repo: parsedRepo, deadline: placeholderDeadline }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setFetchState({ status: "ok", analysis: result.analysis });
      } else {
        setFetchState({ status: "error", message: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [parsedRepo]);

  if (!repo) {
    return <p className="text-muted">Open a GitHub repository page to see its analysis.</p>;
  }

  if (!parsedRepo) {
    return <p className="text-muted">That does not look like a GitHub repository.</p>;
  }

  if (fetchState.status === "loading") {
    return <p className="text-muted">Reading the repo, about 10 seconds.</p>;
  }

  if (fetchState.status === "error") {
    return (
      <div className="space-y-2">
        <p className="text-muted">{fetchState.message}</p>
        <Link href="/" target="_blank" className="text-link hover:underline">
          Open the sample teams
        </Link>
      </div>
    );
  }

  const { analysis } = fetchState;
  const colorByPerson = Object.fromEntries(analysis.team.people.map((p) => [p.id, p.colorIndex]));
  const topRisks = analysis.risks.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <p className={`text-2xl font-semibold ${VERDICT[analysis.verdict].text}`}>{VERDICT[analysis.verdict].word}</p>
        <p className="mt-1">{analysis.verdictReason}</p>
      </div>

      <div>
        <p className="font-semibold">
          Top risks <span className="font-normal text-muted">{analysis.risks.length} in all</span>
        </p>
        <p className="text-xs text-muted">Most serious first. Open one to see the proof.</p>
        {topRisks.length === 0 ? (
          <p className="mt-2 text-muted">No risks found. The team&apos;s numbers are inside the usual ranges.</p>
        ) : (
          <div>
            {topRisks.map((risk) => (
              <RiskRow key={risk.id} risk={risk} colorByPerson={colorByPerson} />
            ))}
          </div>
        )}
      </div>

      <Link href="/connect" target="_blank" className="text-link hover:underline">
        Open the full dashboard
      </Link>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <div className="min-h-screen w-full bg-bg px-4 py-4" style={{ maxWidth: 420 }}>
      <p className="mb-4 font-semibold text-text">SquadSync</p>
      <Suspense fallback={<p className="text-muted">Loading.</p>}>
        <EmbedContent />
      </Suspense>
    </div>
  );
}
