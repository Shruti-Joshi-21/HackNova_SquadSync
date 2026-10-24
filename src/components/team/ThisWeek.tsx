import type { Risk } from "@/lib/types";
import { Tag } from "@/components/ui";
import { PREVENTS } from "./explain";
import Steps, { type Step } from "./Steps";

const MAX = 3;

/**
 * The three most serious risks' actions, each with what it prevents. Risks are
 * already sorted most serious first. Clashes that have not happened yet
 * (possible or likely) are marked "Before it happens".
 */
export function thisWeekSteps(risks: Risk[]): Step[] {
  return risks
    .filter((r) => r.severity !== "low")
    .slice(0, MAX)
    .map((r) => ({
      text: r.action,
      note: `Prevents ${PREVENTS[r.kind]}.`,
      tag: r.confidence && r.confidence !== "certain" ? <Tag tone="neutral">Before it happens</Tag> : undefined,
    }));
}

// "Do these this week": the prevention steps, near the top of the team page.
export default function ThisWeek({ risks }: { risks: Risk[] }) {
  const steps = thisWeekSteps(risks);
  if (steps.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-semibold">Do these this week</h2>
      <p className="mt-1 text-muted">Three steps that stop the biggest problems before they cost time.</p>
      <div className="mt-3 max-w-[80ch]">
        <Steps steps={steps} />
      </div>
    </section>
  );
}
