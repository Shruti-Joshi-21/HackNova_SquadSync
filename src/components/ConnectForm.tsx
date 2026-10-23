"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectRepo, parseRepo } from "@/lib/data";

type Errors = { repo?: string; deadline?: string };

function validate(repo: string, deadline: string): Errors {
  const e: Errors = {};
  if (!repo.trim()) e.repo = "Enter a repo link.";
  else if (!parseRepo(repo)) e.repo = "Use owner/name or a github.com link, for example vercel/next.js.";
  if (!deadline) e.deadline = "Pick the project deadline.";
  return e;
}

const inputClass =
  "mt-1 block h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-text placeholder:text-subtle";

// Login-free setup: repo link, deadline, optional task CSV.
export default function ConnectForm() {
  const [repo, setRepo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ href: string; warnings: string[] } | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(repo, deadline);
    setErrors(found);
    setFailure(null);
    setDone(null);
    if (found.repo || found.deadline) return;

    setBusy(true);
    const result = await connectRepo({
      repo: parseRepo(repo)!,
      deadline: `${deadline}T23:59:00Z`,
      tasksCsv: csv?.text,
    });
    setBusy(false);
    if (!result.ok) return setFailure(result.error);
    // connectRepo saved the result in this browser; the team page reads it from there.
    const href = `/team/${encodeURIComponent(result.analysis.teamId)}`;
    // With CSV warnings, stay here so they can be read before opening the team.
    if (result.warnings.length > 0) return setDone({ href, warnings: result.warnings });
    router.push(href);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-[480px] space-y-5">
      <div>
        <label htmlFor="repo" className="font-semibold">
          GitHub repo
        </label>
        <input
          id="repo"
          type="text"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onBlur={() => repo && setErrors((x) => ({ ...x, repo: validate(repo, deadline).repo }))}
          placeholder="owner/name or https://github.com/owner/name"
          aria-invalid={!!errors.repo}
          aria-describedby={errors.repo ? "repo-error" : undefined}
          className={inputClass}
          autoComplete="off"
          spellCheck={false}
        />
        {errors.repo && (
          <p id="repo-error" className="mt-1 text-xs text-danger">
            {errors.repo}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="deadline" className="font-semibold">
          Project deadline
        </label>
        <input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          aria-invalid={!!errors.deadline}
          aria-describedby={errors.deadline ? "deadline-error" : undefined}
          className={`${inputClass} [color-scheme:dark]`}
        />
        {errors.deadline && (
          <p id="deadline-error" className="mt-1 text-xs text-danger">
            {errors.deadline}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="csv" className="font-semibold">
          Task board export <span className="font-normal text-muted">(optional)</span>
        </label>
        <p className="text-xs text-muted">A CSV from Jira, Trello or GitHub Projects. Without it, GitHub issues are used as tasks.</p>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setCsv(f ? { name: f.name, text: await f.text() } : null);
          }}
          className="mt-2 block text-muted file:mr-3 file:h-8 file:rounded-md file:border file:border-border file:bg-bg file:px-3 file:text-text hover:file:bg-surface-2"
        />
        {csv && <p className="mt-1 font-mono text-xs text-muted">{csv.name}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="h-8 rounded-md bg-primary px-4 font-semibold text-fg-on-primary disabled:opacity-60"
      >
        {busy ? "Analysing" : "Analyse"}
      </button>

      {done && (
        <div role="status" className="rounded-md border border-border p-3">
          <p className="font-semibold">Analysed, with notes about the task file</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            {done.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <Link href={done.href} className="mt-2 inline-block text-link hover:underline">
            Open the team page
          </Link>
        </div>
      )}

      {failure && (
        <div role="alert" className="rounded-md border border-border p-3">
          <p>{failure}</p>
          <Link href="/" className="mt-1 inline-block text-link hover:underline">
            Open the sample teams
          </Link>
        </div>
      )}
    </form>
  );
}
