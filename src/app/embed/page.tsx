"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react";
import GitGraph from "@/components/GitGraph";
import { CONFIDENCE_WORD, SEVERITY, Tag, VERDICT } from "@/components/ui";
import RiskDetail from "@/components/team/RiskDetail";
import Steps from "@/components/team/Steps";
import { thisWeekSteps } from "@/components/team/ThisWeek";
import { overviewScene } from "@/components/team/overview";
import { connectRepo, parseRepo } from "@/lib/data";
import type { Analysis, Risk } from "@/lib/types";

// Tags, verdict words and the plain-English notes come from the same files as
// the web app's team page, so the side panel always matches it.

function RiskRow({ risk, a }: { risk: Risk; a: Analysis }) {
  const [open, setOpen] = useState(false);
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
        <div className="mt-3 pl-1">
          <RiskDetail risk={risk} a={a} />
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
        <NewTab href="/mentor">Open the sample teams</NewTab>
      </div>
    );
  }

  const { analysis } = fetchState;
  const colorByPerson = Object.fromEntries(analysis.team.people.map((p) => [p.id, p.colorIndex]));
  // The side panel has no deadline field, so it analyses with a stand-in deadline.
  // Leave out everything that depends on it: the deadline risk and "days left".
  const risks = analysis.risks.filter((r) => r.kind !== "deadline_slip");
  const topRisks = risks.slice(0, 3);
  const overview = overviewScene({ ...analysis, risks }, false);
  const thisWeek = thisWeekSteps(risks);

  return (
    <div className="space-y-6">
      <div>
        <p className={`text-2xl font-semibold ${VERDICT[analysis.verdict].text}`}>{VERDICT[analysis.verdict].word}</p>
        <p className="mt-1">{analysis.verdictReason}</p>
      </div>

      {overview && (
        <div>
          <p className="font-semibold">
            Overview{" "}
            <span className="font-normal text-muted">
              {risks.length} risks across {overview.branches} branches
            </span>
          </p>
          <div className="mt-2 overflow-x-auto">
            <GitGraph scene={overview.scene} colorByPerson={colorByPerson} />
          </div>
        </div>
      )}

      {thisWeek.length > 0 && (
        <div>
          <p className="font-semibold">Do these this week</p>
          <Steps steps={thisWeek} />
        </div>
      )}

      <div>
        <p className="font-semibold">
          Top risks <span className="font-normal text-muted">{risks.length} in all</span>
        </p>
        <p className="text-xs text-muted">
          Most serious first. Open one to see the proof. Deadline checks need a deadline: set it in the full dashboard.
        </p>
        {topRisks.length === 0 ? (
          <p className="mt-2 text-muted">No risks found. The team&apos;s numbers are inside the usual ranges.</p>
        ) : (
          <div>
            {topRisks.map((risk) => (
              <RiskRow key={risk.id} risk={risk} a={analysis} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <NewTab href={`/connect?repo=${encodeURIComponent(parsedRepo)}`}>Open the full dashboard</NewTab>
        <NewTab href="/plan">Split a PRD into a plan</NewTab>
      </div>
    </div>
  );
}

// The side panel is an iframe beside GitHub. A plain link would load the app
// inside the panel, so every link out opens a new browser tab instead.
function NewTab({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
      {children}
    </a>
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
