import type { Analysis } from "@/lib/types";
import { Panel, Tag } from "@/components/ui";

// Who checked whose work: reviewer rows, author columns, count in each cell.
export default function ReviewPanel({ a }: { a: Analysis }) {
  const people = a.team.people;
  const m = a.reviews.matrix;
  const max = Math.max(1, ...people.flatMap((r) => people.map((c) => m[r.id]?.[c.id] ?? 0)));
  const given = (id: string) => people.reduce((n, c) => n + (m[id]?.[c.id] ?? 0), 0);
  const noReviews = new Set(
    a.risks.filter((r) => r.kind === "review_gap" && r.people.length === 1).flatMap((r) => r.people),
  );

  return (
    <Panel title="Who checked whose work">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="pb-2 text-left font-normal text-subtle">Reviewer / author</th>
            {people.map((c) => (
              <th key={c.id} className="pb-2 text-center font-normal text-muted">
                {c.displayName.replace("Member ", "")}
              </th>
            ))}
            <th className="pb-2 text-right font-normal text-subtle">Total</th>
          </tr>
        </thead>
        <tbody>
          {people.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-1.5 pr-2 whitespace-nowrap">{r.displayName}</td>
              {people.map((c) => {
                const n = m[r.id]?.[c.id] ?? 0;
                const self = r.id === c.id;
                return (
                  <td key={c.id} className="p-0.5 text-center font-mono">
                    <div
                      className={`rounded-sm py-1 ${self ? "text-subtle" : ""}`}
                      style={
                        !self && n > 0
                          ? { background: `color-mix(in srgb, var(--g0) ${15 + (n / max) * 45}%, transparent)` }
                          : undefined
                      }
                    >
                      {self ? "-" : n}
                    </div>
                  </td>
                );
              })}
              <td className="pl-2 text-right font-mono">
                {noReviews.has(r.id) ? <Tag tone="warning">No reviews</Tag> : given(r.id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-muted">Merged without review</dt>
          <dd className="font-mono">
            {a.reviews.mergedWithoutReview.length === 0
              ? "none"
              : a.reviews.mergedWithoutReview.map((n) => `#${n}`).join(", ")}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Median time to first review</dt>
          <dd className="font-mono">
            {a.reviews.medianHoursToFirstReview === null ? "no reviews yet" : `${a.reviews.medianHoursToFirstReview} h`}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
