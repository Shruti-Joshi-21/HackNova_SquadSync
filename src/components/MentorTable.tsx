"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Risk, TeamListItem, Verdict } from "@/lib/types";
import { getAnalysis, getTeams } from "@/lib/data";
import { SEVERITY, Tag, VERDICT } from "@/components/ui";
import { Block, ErrorState } from "@/components/states";

const VERDICT_ORDER: Record<Verdict, number> = { at_risk: 0, slipping: 1, on_track: 2 };

type Row = { team: TeamListItem; top: Risk | null | undefined }; // undefined: largest risk not loaded

// Mentor view: one row per team, the team that needs help first on top.
export default function MentorTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    getTeams()
      .then(async (teams) => {
        teams.sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.riskCount - a.riskCount);
        if (!alive) return;
        setRows(teams.map((team) => ({ team, top: undefined })));
        // The largest risk needs each team's analysis; fill it in as they arrive.
        const tops = await Promise.all(
          teams.map((t) =>
            getAnalysis(t.id)
              .then((a) => a?.risks[0] ?? null)
              .catch(() => null),
          ),
        );
        if (alive) setRows(teams.map((team, i) => ({ team, top: tops[i] })));
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [nonce]);

  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setRows(null);
          setNonce((n) => n + 1);
        }}
      />
    );

  if (!rows)
    return (
      <div className="mt-6 space-y-2" role="status" aria-label="Loading teams">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-11" />
        ))}
      </div>
    );

  if (rows.length === 0)
    return (
      <div className="py-12">
        <p>No teams yet.</p>
        <Link href="/connect" className="mt-2 inline-block text-link hover:underline">
          Connect a repo
        </Link>
      </div>
    );

  return (
    <>
      {/* Narrow screens: one stacked row per team instead of a wide table. */}
      <ul className="mt-6 divide-y divide-border border-y border-border md:hidden">
        {rows.map(({ team, top }) => (
          <li key={team.id}>
            <Link href={`/team/${team.id}`} className="block py-3 hover:bg-surface-2">
              <span className="flex items-baseline gap-3">
                <span className="font-semibold">{team.name}</span>
                <span className={`font-semibold ${VERDICT[team.verdict].text}`}>{VERDICT[team.verdict].word}</span>
                <span className="ml-auto font-mono text-xs text-muted">{team.riskCount} risks</span>
              </span>
              <span className="mt-1 block text-muted">{team.verdictReason}</span>
              {top && (
                <span className="mt-2 flex items-start gap-2">
                  <Tag tone={SEVERITY[top.severity].tone}>{SEVERITY[top.severity].word}</Tag>
                  <span>{top.title}</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden md:block">
        <table className="w-full border-collapse">
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
                    {top === undefined ? (
                      <span className="text-subtle">Loading</span>
                    ) : top ? (
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
    </>
  );
}
