import type { Analysis } from "@/lib/types";
import Summary from "./Summary";
import WorkPanel from "./WorkPanel";
import ReviewPanel from "./ReviewPanel";
import TimelinePanel from "./TimelinePanel";
import Risks from "./Risks";

// Everything on the team page below the header, drawn from one Analysis.
// `replay` is the replay strip, placed under the verdict as in DESIGN.md.
// `dim` fades the data (not the slider) while another day is loading.
export default function TeamBody({ a, replay, dim = false }: { a: Analysis; replay?: React.ReactNode; dim?: boolean }) {
  const names = new Map(a.team.people.map((p) => [p.id, p.displayName]));
  const fade = `transition-opacity duration-200 ${dim ? "opacity-60" : "opacity-100"}`;

  return (
    <>
      <div className={fade}>
        <Summary a={a} />
      </div>

      {replay}

      <div className={`space-y-10 ${fade}`}>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <WorkPanel a={a} />
          <ReviewPanel a={a} />
          <TimelinePanel a={a} />
        </div>

        <Risks a={a} />

        <section>
          <h2 className="text-lg font-semibold">Not flagged</h2>
          <p className="mt-1 text-muted">Looks uneven, but is normal for this team.</p>
          {a.notFlagged.length === 0 ? (
            <p className="mt-3 text-muted">Nobody to list.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {a.notFlagged.map((n) => (
                <li key={n.personId} className="flex flex-wrap gap-x-6 gap-y-1 px-2 py-3">
                  <span className="w-36 shrink-0 font-semibold">{names.get(n.personId) ?? n.personId}</span>
                  <span className="min-w-0 flex-1 basis-64 text-muted">{n.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
