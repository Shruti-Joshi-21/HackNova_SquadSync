import { ArrowRightIcon } from "@primer/octicons-react";
import type { Analysis, Risk } from "@/lib/types";
import GitGraph from "@/components/GitGraph";
import { SEVERITY, Tag } from "@/components/ui";
import BoxRows from "./BoxRows";
import { boxRowsFor } from "./boxSpec";
import { CONFIDENCE_MEANS, EXPLAIN, NEXT_STEPS, SEVERITY_MEANS } from "./explain";
import { sceneFor } from "./fallbackScene";
import Steps from "./Steps";

// The body of one risk, shared by the team page drawer and the extension side
// panel: the sentence, a picture (box rows for counts, a branch scene for the
// rest), "Do this", and the rule and numbers folded away underneath.
export default function RiskDetail({ risk, a }: { risk: Risk; a: Analysis }) {
  const why = EXPLAIN[risk.kind];
  const boxes = boxRowsFor(risk, a);
  const scene = boxes ? undefined : sceneFor(risk, a);
  const colors = Object.fromEntries(a.team.people.map((p) => [p.id, p.colorIndex]));
  const names = new Map(a.team.people.map((p) => [p.id, p.displayName]));

  return (
    <div className="space-y-6">
      <div>
        <p>{risk.summary}</p>
        {risk.summarySource === "ai" && (
          <p className="mt-1">
            <Tag tone="neutral">written by AI from these numbers</Tag>
          </p>
        )}
      </div>

      {boxes ? <BoxRows key={risk.id} spec={boxes} /> : scene && <GitGraph scene={scene} colorByPerson={colors} />}

      <section className="rounded-md border border-border bg-surface-2 p-4">
        <p className="flex items-center gap-2 text-xs text-muted">
          <ArrowRightIcon size={14} /> Do this
        </p>
        <Steps steps={[risk.action, ...NEXT_STEPS[risk.kind]].map((text) => ({ text }))} />
      </section>

      <details className="group">
        <summary className="cursor-pointer text-link hover:underline">Show the rule and the numbers</summary>
        <div className="mt-3 space-y-4">
          <p>{why.meaning}</p>
          <p className="text-muted">{risk.rule}</p>

          <div>
            <dl className="divide-y divide-border border-y border-border">
              {risk.evidence.map((e, i) => (
                <div key={i} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted">{e.label}</dt>
                  <dd className="text-right font-mono">
                    {e.ref?.url ? (
                      <a href={e.ref.url} target="_blank" rel="noreferrer" className="text-link hover:underline">
                        {e.value}
                      </a>
                    ) : (
                      e.value
                    )}
                  </dd>
                </div>
              ))}
              {risk.people.length > 0 && (
                <div className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted">People</dt>
                  <dd className="text-right">{risk.people.map((id) => names.get(id) ?? id).join(", ")}</dd>
                </div>
              )}
            </dl>
            <p className="mt-1 text-xs text-muted">From {why.source.charAt(0).toLowerCase() + why.source.slice(1)}</p>
          </div>

          <ul className="space-y-1 text-muted">
            <li>
              {SEVERITY[risk.severity].word}: {SEVERITY_MEANS[risk.severity]}
            </li>
            {risk.confidence && <li>{CONFIDENCE_MEANS[risk.confidence]}</li>}
          </ul>
        </div>
      </details>
    </div>
  );
}
