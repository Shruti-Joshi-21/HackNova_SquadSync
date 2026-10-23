import Link from "next/link";
import type { Verdict } from "@/lib/types";
import { getAnalysis, getTeams } from "@/lib/data";
import { SEVERITY, Tag, VERDICT } from "@/components/ui";

const VERDICT_ORDER: Record<Verdict, number> = { at_risk: 0, slipping: 1, on_track: 2 };

// Mentor view: one row per team, the team that needs help first on top.
export default async function MentorPage() {
  const teams = await getTeams();
  const rows = await Promise.all(
    teams.map(async (t) => ({ team: t, top: (await getAnalysis(t.id))?.risks[0] ?? null })),
  );
  rows.sort(
    (a, b) =>
      VERDICT_ORDER[a.team.verdict] - VERDICT_ORDER[b.team.verdict] || b.team.riskCount - a.team.riskCount,
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">All teams</h1>
      <p className="mt-1 text-muted">Sorted by who needs help first.</p>

      {rows.length === 0 ? (
        <div className="py-12">
          <p>No teams yet.</p>
          <Link href="/connect" className="mt-2 inline-block text-link hover:underline">
            Connect a repo
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase text-subtle">
                <th className="py-2 pr-4 font-normal">Team</th>
                <th className="py-2 pr-4 font-normal">Verdict</th>
                <th className="py-2 pr-4 font-normal">Reason</th>
                <th className="py-2 pr-4 text-right font-normal">Risks</th>
                <th className="py-2 font-normal">Largest risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ team, top }) => {
                const v = VERDICT[team.verdict];
                return (
                  <tr key={team.id} className="relative border-b border-border align-top hover:bg-surface-2">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {/* The link covers the whole row. */}
                      <Link href={`/team/${team.id}`} className="font-semibold after:absolute after:inset-0">
                        {team.name}
                      </Link>
                    </td>
                    <td className={`py-3 pr-4 font-semibold whitespace-nowrap ${v.text}`}>{v.word}</td>
                    <td className="py-3 pr-4 text-muted">{team.verdictReason}</td>
                    <td className="py-3 pr-4 text-right font-mono">{team.riskCount}</td>
                    <td className="py-3">
                      {top ? (
                        <span className="flex items-start gap-2">
                          <Tag tone={SEVERITY[top.severity].tone}>{SEVERITY[top.severity].word}</Tag>
                          <span>{top.title}</span>
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
