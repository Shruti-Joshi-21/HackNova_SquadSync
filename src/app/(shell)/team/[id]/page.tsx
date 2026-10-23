import Link from "next/link";
import { getAnalysis } from "@/lib/data";
import Summary from "@/components/team/Summary";
import WorkPanel from "@/components/team/WorkPanel";
import ReviewPanel from "@/components/team/ReviewPanel";
import TimelinePanel from "@/components/team/TimelinePanel";
import Risks from "@/components/team/Risks";

export default async function TeamPage({ params }: PageProps<"/team/[id]">) {
  const { id } = await params;
  const a = await getAnalysis(id);

  if (!a) {
    return (
      <div className="py-12">
        <p>No data for this team yet.</p>
        <Link href="/" className="mt-2 inline-block text-link hover:underline">
          Back to all teams
        </Link>
      </div>
    );
  }

  const weeks = a.timeline.length;
  const week = Math.min(weeks, Math.floor(a.schedule.daysUsed / 7) + 1);
  const names = new Map(a.team.people.map((p) => [p.id, p.displayName]));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">{a.team.name}</h1>
        <span className="text-muted">
          Week {week} of {weeks}
        </span>
        <span className="text-muted">{a.schedule.daysLeft} days left</span>
      </header>

      <Summary a={a} />

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
    </div>
  );
}
