// The two places AI helps, both checked by code:
// 1. Wording: each risk summary rewritten as one plain sentence. Kept only if
//    every number in it appears in the risk's evidence; otherwise the template stays.
// 2. Task matching: links tasks to PRs when no id links them, used only above 0.6.
// The model call is passed in, so this file has no network code of its own.

import type { Analysis, RepoSnapshot, Risk } from "../lib/types";
import type { Complete } from "../lib/llm";
import { CONFIG } from "./config";
import { analyze, AnalyzeOptions } from "./index";
import { AiLink, linkTasks } from "./link";
import { normalize } from "./normalize";

/* ------------------------------------------------------------------ */
/* Wording                                                             */
/* ------------------------------------------------------------------ */

const WORDING_RULES = `You rewrite risk summaries for a student team dashboard read by mentors who are not programmers.
The template is correct but technical. Rewrite it in your own plainer words; do not copy it.
Rules for every sentence:
- Exactly one sentence, at most 30 words, ending with a full stop.
- Say what is happening and, in a few words, why it matters for the team. No advice: the action is shown separately.
- Plain words: explain jargon like "branch", "merge" or "lockfile" through what it means for the team. Keep file names and PR numbers as written.
- Sentence case. No exclamation marks, no questions, no marketing words, no blame.
- Use ONLY numbers that appear in that risk's evidence or template. Never invent, round or compute a new number.
- Refer to people exactly as written, for example "Member A". Never invent names.
Example. Template: "PR #31 by Member B is open for 9 days and 1,240 lines, so it gets harder to merge every day."
Rewrite: "Member B's change in PR #31 has waited 9 days and grown to 1,240 lines, so fitting it into the shared code gets harder each day."
Answer with JSON only: {"sentences": {"<risk id>": "<sentence>"}}.`;

/** Numbers in a text, normalised: "1,240" -> "1240", "46%" -> "46", "2.5" -> "2.5". */
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.0+$/, ""));
}

/** Code's check on an AI sentence. True means it is safe to show. */
export function checkSentence(sentence: string, risk: Risk, names: string[]): boolean {
  const s = sentence.trim();
  if (s.length < 20 || s.length > CONFIG.ai.maxSentenceChars) return false;
  if (!/[.]$/.test(s) || /[!?]/.test(s) || /\p{Extended_Pictographic}/u.test(s)) return false;
  // One sentence: no full stop followed by a space and a capital letter before the end.
  if (/\.\s+[A-Z]/.test(s.slice(0, -1))) return false;
  const facts = [risk.title, risk.summary, ...risk.evidence.flatMap((e) => [e.label, e.value])].join(" ");
  const allowed = new Set(numbersIn(facts));
  if (!numbersIn(s).every((n) => allowed.has(n))) return false;
  // Only people this risk is about, or who appear in its evidence.
  const mentioned = s.match(/Member [A-Z]\b/g) ?? [];
  return mentioned.every((m) => names.includes(m) && facts.includes(m));
}

export async function wordRisks(analysis: Analysis, complete: Complete): Promise<Analysis> {
  if (analysis.risks.length === 0) return analysis;
  const input = analysis.risks.map((r) => ({
    id: r.id,
    title: r.title,
    template: r.summary,
    evidence: r.evidence.map((e) => `${e.label}: ${e.value}`),
  }));
  const answer = await complete(JSON.stringify({ risks: input }, null, 1), {
    system: WORDING_RULES,
    json: true,
    temperature: 0.3,
  });
  const sentences = parseObject(answer)?.sentences;
  if (!sentences || typeof sentences !== "object") return analysis;

  const names = analysis.team.people.map((p) => p.displayName);
  const risks = analysis.risks.map((r) => {
    const s = (sentences as Record<string, unknown>)[r.id];
    if (typeof s !== "string" || !checkSentence(s, r, names)) return r;
    // A near copy of the template is still the template; do not tag it as AI.
    if (sameWords(s, r.summary)) return r;
    return { ...r, summary: s.trim(), summarySource: "ai" as const };
  });
  return { ...analysis, risks };
}

/* ------------------------------------------------------------------ */
/* Task matching                                                       */
/* ------------------------------------------------------------------ */

const MATCH_RULES = `You link task-board tasks to the GitHub pull requests that did the work.
Only link a task and a PR when the titles, branch name or files clearly describe the same work.
Each task links to at most one PR, and each PR to at most one task. Leave out anything unsure.
confidence is 0 to 1: 0.9 means the titles say the same thing, 0.6 means probably.
Answer with JSON only: {"links": [{"taskId": "<id>", "prNumber": <number>, "confidence": <0..1>}]}.`;

/** AI links for tasks that no rule could link. Returns only links code accepts. */
export async function aiTaskLinks(s: RepoSnapshot, complete: Complete): Promise<AiLink[]> {
  const name = (id: string | null) => s.team.people.find((p) => p.id === id)?.displayName ?? "nobody";
  const tasks = s.tasks
    .filter((t) => t.linkedPRs.length === 0 && t.status !== "todo")
    .slice(0, CONFIG.ai.maxTasksToMatch);
  const prs = s.pullRequests
    .filter((p) => p.taskIds.length === 0 && p.state !== "closed")
    .slice(-CONFIG.ai.maxPRsToMatch);
  if (tasks.length === 0 || prs.length === 0) return [];

  const answer = await complete(
    JSON.stringify({
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, assignee: name(t.assignee), status: t.status })),
      pullRequests: prs.map((p) => ({
        number: p.number, title: p.title, branch: p.branch, author: name(p.author),
        files: p.files.slice(0, 5).map((f) => f.path),
      })),
    }, null, 1),
    { system: MATCH_RULES, json: true, temperature: 0 },
  );
  const links = parseObject(answer)?.links;
  if (!Array.isArray(links)) return [];

  const taskIds = new Set(tasks.map((t) => t.id));
  const prNumbers = new Set(prs.map((p) => p.number));
  const usedTasks = new Set<string>();
  const usedPRs = new Set<number>();
  const out: AiLink[] = [];
  for (const l of links as Record<string, unknown>[]) {
    const taskId = String(l?.taskId ?? "");
    const prNumber = Number(l?.prNumber);
    const confidence = Number(l?.confidence);
    if (!taskIds.has(taskId) || !prNumbers.has(prNumber)) continue;
    if (!(confidence > CONFIG.ai.minLinkConfidence && confidence <= 1)) continue;
    if (usedTasks.has(taskId) || usedPRs.has(prNumber)) continue;
    usedTasks.add(taskId);
    usedPRs.add(prNumber);
    out.push({ taskId, prNumber, confidence: Math.round(confidence * 100) / 100 });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Together                                                            */
/* ------------------------------------------------------------------ */

export interface AiOptions extends AnalyzeOptions {
  /** Ask AI to link tasks to PRs that rules could not link (live repos). */
  match?: boolean;
  /** Ask AI to reword risk summaries. */
  words?: boolean;
}

/**
 * analyze() plus the AI steps. Each step falls back to code's own result on
 * any failure, so this never fails because of AI.
 */
export async function analyzeWithAi(
  snapshot: RepoSnapshot, complete: Complete, opts: AiOptions = {},
): Promise<{ snapshot: RepoSnapshot; analysis: Analysis }> {
  let s = normalize(snapshot);
  if (opts.match) {
    const links = await aiTaskLinks(s, complete);
    if (links.length > 0) s = linkTasks(s, () => links);
  }
  const analysis = analyze(s, opts);
  return { snapshot: s, analysis: opts.words ? await wordRisks(analysis, complete) : analysis };
}

/** True when two sentences use almost the same words (90% overlap). */
function sameWords(a: string, b: string): boolean {
  const words = (t: string) => t.toLowerCase().match(/[a-z0-9#%]+/g) ?? [];
  const wa = words(a);
  const wb = new Set(words(b));
  return wa.length > 0 && wa.filter((w) => wb.has(w)).length / Math.max(wa.length, wb.size) >= 0.9;
}

function parseObject(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  const json = text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
