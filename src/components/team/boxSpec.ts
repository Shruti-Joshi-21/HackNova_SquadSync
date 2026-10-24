import type { Analysis, Risk, RiskKind } from "@/lib/types";

// "Box rows": one square per unit of work (a task, a review, a merged PR), per
// person or per week, against a fair share. Only for risks that compare
// counts; conflict and branch risks keep their GitGraph scene.

export type BoxIcon = "task" | "review" | "merge";

export interface BoxRow {
  label: string;
  avatar?: string; // a letter, for people
  count: number;
  flagged: boolean;
}

export interface BoxSpec {
  icon: BoxIcon;
  rows: BoxRow[];
  fair: number; // fair share per row, rounded
  flagMode: "missing" | "extra"; // a flagged row has too few, or too many
  done: string; // legend: what a filled square is
  problem: string; // legend: what the coloured squares are
}

type Builder = (risk: Risk, a: Analysis) => BoxSpec | null;

const letter = (name: string) => name.replace(/^Member\s+/i, "").charAt(0).toUpperCase();
const person = (a: Analysis, id: string) => a.team.people.find((p) => p.id === id);

// "12 of 26 (46%)" -> 26
const totalOf = (value?: string) => {
  const m = value?.match(/of\s+([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};

const CONFIG: Partial<Record<RiskKind, Builder>> = {
  // Finished tasks per person against an even split.
  workload_imbalance: (risk, a) => {
    const total = totalOf(risk.evidence.find((e) => e.label === "Finished tasks")?.value);
    if (!total || a.shares.length === 0) return null;
    return {
      icon: "task",
      rows: a.shares.map((s) => {
        const p = person(a, s.personId);
        return {
          label: p?.displayName ?? s.personId,
          avatar: p ? letter(p.displayName) : undefined,
          count: Math.round(s.tasks * total),
          flagged: risk.people.includes(s.personId),
        };
      }),
      fair: Math.round(total / a.shares.length),
      flagMode: "extra",
      done: "Task finished",
      problem: "More than a fair share",
    };
  },

  // Reviews each person gave, against an even split. Only for the one-person gap.
  review_gap: (risk, a) => {
    if (risk.people.length !== 1) return null;
    const m = a.reviews.matrix;
    const people = a.team.people;
    const given = (id: string) => people.reduce((n, c) => n + (c.id === id ? 0 : (m[id]?.[c.id] ?? 0)), 0);
    const total = people.reduce((n, p) => n + given(p.id), 0);
    if (total === 0) return null;
    return {
      icon: "review",
      rows: people.map((p) => ({
        label: p.displayName,
        avatar: letter(p.displayName),
        count: given(p.id),
        flagged: p.id === risk.people[0],
      })),
      fair: Math.round(total / people.length),
      flagMode: "missing",
      done: "Review given",
      problem: "Missing review",
    };
  },

  // Merged PRs per week, against an even spread. Only for the late-share risk.
  late_integration: (risk, a) => {
    if (risk.id !== "late_integration-share") return null;
    const weeks = a.timeline.filter((w) => w.status !== "future");
    const total = weeks.reduce((n, w) => n + w.mergedPRs, 0);
    if (weeks.length === 0 || total === 0) return null;
    const last = weeks[weeks.length - 1].weekIndex;
    return {
      icon: "merge",
      rows: weeks.map((w) => ({
        label: `Week ${w.weekIndex + 1}`,
        count: w.mergedPRs,
        flagged: w.weekIndex === last,
      })),
      fair: Math.max(1, Math.round(total / weeks.length)),
      flagMode: "extra",
      done: "PR merged",
      problem: "Piled up at the end",
    };
  },
};

export function boxRowsFor(risk: Risk, a: Analysis): BoxSpec | null {
  return CONFIG[risk.kind]?.(risk, a) ?? null;
}
