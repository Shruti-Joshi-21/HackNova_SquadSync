import type { Analysis } from "@/lib/types";
import GitGraph from "@/components/GitGraph";
import { VERDICT, shortDate } from "@/components/ui";
import { overviewScene } from "./overview";

const PACE_DAYS = 7; // the engine projects the finish from tasks done in the last 7 days

// The hero: verdict, sentence and schedule on the left; on the right, the
// overview picture of every branch at risk. Each risk keeps its own picture in its drawer.
export default function Summary({ a }: { a: Analysis }) {
  const v = VERDICT[a.verdict];
  const s = a.schedule;
  const timeUsed = s.daysTotal ? s.daysUsed / s.daysTotal : 0;
  const tasksDone = s.tasksTotal ? s.tasksDone / s.tasksTotal : 0;
  const top = overviewScene(a);
  const colors = Object.fromEntries(a.team.people.map((p) => [p.id, p.colorIndex]));

  return (
    <section className="grid gap-8 rounded-md border border-border bg-surface p-6 lg:grid-cols-12 lg:gap-12">
      <div className={top ? "lg:col-span-5" : "lg:col-span-7"}>
        <p className={`text-[32px] leading-tight font-semibold ${v.text}`}>{v.word}</p>
        <p className="mt-2 max-w-[60ch] text-base">{a.verdictReason}</p>

        {top && <Schedule className="mt-8" timeUsed={timeUsed} tasksDone={tasksDone} a={a} />}
      </div>

      {top ? (
        <div className="min-w-0 lg:col-span-7">
          <p className="font-semibold">
            Overview{" "}
            <span className="font-normal text-muted">
              {a.risks.length} risks across {top.branches} branches. Open a risk below for its own picture.
            </span>
          </p>
          <div className="mt-3">
            <GitGraph scene={top.scene} colorByPerson={colors} />
          </div>
        </div>
      ) : (
        <Schedule className="lg:col-span-5" timeUsed={timeUsed} tasksDone={tasksDone} a={a} />
      )}
    </section>
  );
}

function Schedule({ a, timeUsed, tasksDone, className = "" }: { a: Analysis; timeUsed: number; tasksDone: number; className?: string }) {
  const s = a.schedule;
  // Only claim a pace when there is something to measure: tasks, and a week of history.
  const noTasks = s.tasksTotal === 0;
  const tooEarly = s.daysUsed < PACE_DAYS;
  return (
    <div className={`space-y-4 ${className}`}>
      <ScheduleBar label="Time used" value={timeUsed} detail={`${s.daysUsed} of ${s.daysTotal} days`} />
      {!noTasks && (
        <ScheduleBar label="Tasks done" value={tasksDone} detail={`${s.tasksDone} of ${s.tasksTotal} tasks`} />
      )}
      <p className="text-muted">
        {noTasks
          ? "No tasks found, so there is no finish date to project. Add a task board on Connect."
          : tooEarly
            ? `Too early to project a finish date: it needs ${PACE_DAYS} days of activity.`
            : s.projectedFinish
              ? s.daysLate > 0
                ? `At this pace: done ${shortDate(s.projectedFinish)}, ${s.daysLate} days late.`
                : `At this pace: done ${shortDate(s.projectedFinish)}, on time.`
              : `No task was finished in the last ${PACE_DAYS} days, so there is no pace to project.`}
      </p>
    </div>
  );
}

function ScheduleBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span>{label}</span>
        <span>
          <span className="font-semibold">{Math.round(value * 100)}%</span>
          <span className="ml-2 text-xs text-muted">{detail}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-sm bg-surface-2">
        <div className="h-2 rounded-sm bg-g-main" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}
