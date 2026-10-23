import type { Analysis } from "@/lib/types";
import Summary from "./Summary";
import WorkPanel from "./WorkPanel";
import ReviewPanel from "./ReviewPanel";
import TimelinePanel from "./TimelinePanel";
import Risks from "./Risks";

// Everything on the team page below the header, drawn from one Analysis.
// `replay` is the replay strip, placed under the verdict as in DESIGN.md.
export default function TeamBody({ a, replay }: { a: Analysis; replay?: React.ReactNode }) {
  const names = new Map(a.team.people.map((p) => [p.id, p.displayName]));

  return (
    <>
      <Summary a={a} />

      {replay}

      <div className="grid gap-4 lg:grid-cols-3">
        <WorkPanel a={a} />
        <ReviewPanel a={a} />
        <TimelinePanel a={a} />
      </div>

      <Risks a={a} />

      <section>
        <h2 className="font-semibold">Not flagged</h2>
        <p className="mt-1 text-xs text-muted">Differences that look odd at first but are normal for this team.</p>
        {a.notFlagged.length === 0 ? (
          <p className="mt-2 text-muted">Nobody to list.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {a.notFlagged.map((n) => (
              <li key={n.personId} className="flex flex-wrap gap-x-3 px-2 py-3">
                <span className="w-36 shrink-0">{names.get(n.personId) ?? n.personId}</span>
                <span className="text-muted">{n.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
