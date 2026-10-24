import type { Analysis } from "@/lib/types";
import { Panel, Tag, pct } from "@/components/ui";

// Who did the work: combined share per person against the even share and the
// team's usual band, with the parts it is made of written underneath.
export default function WorkPanel({ a }: { a: Analysis }) {
  const people = new Map(a.team.people.map((p) => [p.id, p]));
  const even = 1 / Math.max(1, a.team.people.length);
  const max = Math.max(0.6, ...a.shares.map((s) => s.composite)) * 1.05;
  const x = (v: number) => `${(v / max) * 100}%`;
  const [lo, hi] = a.shares[0]?.teamUsualRange ?? [0, 0];

  return (
    <Panel title="Who did the work">
      <p className="mb-5 text-xs text-muted">
        Tasks, code, reviews and docs together, not commit count. The white line is an even share ({pct(even)}).
      </p>
      <ul className="space-y-5">
        {a.shares.map((s) => {
          const p = people.get(s.personId);
          return (
            <li key={s.personId}>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">{p?.displayName ?? s.personId}</span>
                <span className="text-xs text-subtle">{s.role}</span>
                {s.flagged && <Tag tone="warning">Outside usual range</Tag>}
                <span className="ml-auto font-semibold">{pct(s.composite)}</span>
              </div>
              <div className="relative mt-1.5 h-3 rounded-sm bg-surface-2">
                <div className="absolute inset-y-0 bg-border" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
                <div
                  className="absolute inset-y-0.5 left-0 rounded-sm"
                  style={{ width: x(s.composite), background: `var(--g${(p?.colorIndex ?? 0) % 5})` }}
                />
                <div className="absolute -inset-y-0.5 w-px bg-text" style={{ left: x(even) }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Tasks {pct(s.tasks)} · Code {pct(s.code)} · Reviews {pct(s.reviews)} · Docs {pct(s.docsDesign)}
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
