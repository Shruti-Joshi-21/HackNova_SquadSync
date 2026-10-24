import type { Risk } from "@/lib/types";

// "Show the clashing lines": for a conflict risk, each person's changed line
// range in the file, drawn on one ruler, with the lines they both touch in red.
// Built only from the engine's evidence, for example
// "feature/search (Member A)" = "modified src/server/routes.js, L56-75".

interface Change {
  who: string;
  branch: string;
  verb: string; // modified, removed, added
  file: string;
  from: number | null; // null: the whole file
  to: number | null;
}

const LINE = /^(modified|removed|added|renamed)\s+(\S+?),\s*(?:L(\d+)-(\d+)|whole file)/i;

export function clashOf(risk: Risk): Change[] | null {
  const changes: Change[] = [];
  for (const e of risk.evidence) {
    const m = e.value.match(LINE);
    if (!m) continue;
    const who = e.label.match(/\(([^)]+)\)\s*$/)?.[1] ?? "";
    changes.push({
      who,
      branch: e.label.replace(/\s*\([^)]*\)\s*$/, ""),
      verb: m[1].toLowerCase(),
      file: m[2],
      from: m[3] ? Number(m[3]) : null,
      to: m[4] ? Number(m[4]) : null,
    });
  }
  return changes.length >= 2 ? changes.slice(0, 2) : null;
}

export default function LineClash({ changes }: { changes: Change[] }) {
  const ranged = changes.filter((c) => c.from !== null);
  // Ruler: a little room around the changed lines, or 1..100 when only whole files.
  const lo = ranged.length ? Math.max(1, Math.min(...ranged.map((c) => c.from!)) - 15) : 1;
  const hi = ranged.length ? Math.max(...ranged.map((c) => c.to!)) + 15 : 100;
  const x = (line: number) => `${((line - lo) / (hi - lo)) * 100}%`;
  const span = (c: Change) => (c.from === null ? [lo, hi] : [c.from, c.to!]);

  const [a0, a1] = span(changes[0]);
  const [b0, b1] = span(changes[1]);
  const o0 = Math.max(a0, b0);
  const o1 = Math.min(a1, b1);
  const overlap = o1 >= o0;
  const whole = changes.some((c) => c.from === null);

  return (
    <div className="lc-in rounded-md border border-border p-4">
      <p className="font-mono text-xs text-muted">{changes[0].file}</p>

      <div className="relative mt-3 space-y-3">
        {/* The lines both changes touch, drawn behind the bars. */}
        {overlap && (
          <div
            className="lc-overlap absolute inset-y-0 rounded-sm border border-danger bg-danger-bg"
            style={{ left: x(o0), width: `calc(${x(o1)} - ${x(o0)})` }}
            aria-hidden
          />
        )}
        {changes.map((c, i) => {
          const [s, e] = span(c);
          return (
            <div key={i} className="relative">
              <p className="relative text-xs">
                <span className="font-semibold">{c.who || c.branch}</span>{" "}
                <span className="text-muted">
                  {c.verb} {c.from === null ? "the whole file" : `lines ${c.from} to ${c.to}`}
                </span>
              </p>
              <div className="relative mt-1 h-3 rounded-sm bg-surface-2">
                <div
                  className={`lc-bar absolute inset-y-0 rounded-sm ${c.verb === "removed" ? "bg-danger" : "bg-text"}`}
                  style={{ left: x(s), width: `calc(${x(e)} - ${x(s)})`, animationDelay: `${i * 250}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between font-mono text-xs text-subtle" aria-hidden>
        <span>line {lo}</span>
        <span>line {hi}</span>
      </div>

      <p className="mt-3 text-danger">
        {whole
          ? "One side removes the file the other is still editing. Git cannot keep both."
          : overlap
            ? `Both change lines ${o0} to ${o1}. Git cannot merge these by itself.`
            : "The changes are close but do not overlap yet."}
      </p>
    </div>
  );
}
