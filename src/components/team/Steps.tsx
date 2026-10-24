// A vertical list of steps: a numbered circle, the text beside it, and a line
// down to the next circle. Used for "What to do" and "Do these this week".

export interface Step {
  text: string;
  note?: string; // smaller line under the text
  tag?: React.ReactNode; // small label before the text
  onClick?: () => void; // makes the step a button (for example, open its risk)
}

export default function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-2">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const body = (
          <>
            {s.tag && <span className="mr-2 inline-flex align-middle">{s.tag}</span>}
            <span>{s.text}</span>
            {s.note && <span className="mt-0.5 block text-xs text-muted">{s.note}</span>}
          </>
        );
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {/* The line joins this circle to the next one. */}
            {!last && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-border-strong" />}
            <span
              aria-hidden
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-xs font-semibold"
            >
              {i + 1}
            </span>
            <span className="sr-only">Step {i + 1}: </span>
            {s.onClick ? (
              <button
                type="button"
                onClick={s.onClick}
                className="min-w-0 flex-1 rounded-md pt-1 text-left hover:text-link"
              >
                {body}
              </button>
            ) : (
              <span className="min-w-0 flex-1 pt-1">{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
