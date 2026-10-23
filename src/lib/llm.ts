// One door to the language model. Server only: reads LLM_PROVIDER, LLM_API_KEY
// and optional LLM_MODEL from the environment.
//
// complete() never throws. It returns null when there is no key, the call
// fails, or it runs past the time limit, so every caller keeps its template.

export interface CompleteOptions {
  system?: string;
  /** Ask for a JSON answer. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Per attempt. Default 8 s. */
  timeoutMs?: number;
}

export type Complete = (prompt: string, opts?: CompleteOptions) => Promise<string | null>;

// The lite model: fast enough for one-sentence wording and less often overloaded
// than full flash (tested 24 Oct: flash answered 503 "high demand", lite in about 2 s).
// "-latest" is Google's alias for the current lite model. LLM_MODEL overrides it.
export const DEFAULT_MODEL = "gemini-flash-lite-latest";

export function llmAvailable(): boolean {
  return Boolean(process.env.LLM_API_KEY) && (process.env.LLM_PROVIDER ?? "gemini").toLowerCase() === "gemini";
}

export const complete: Complete = async (prompt, opts = {}) => {
  if (!llmAvailable()) return null;
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const started = Date.now();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await gemini(prompt, opts, timeoutMs);
    if (result.text !== null) return result.text;
    // One retry, only for errors worth retrying and only if time allows.
    const left = timeoutMs * 2 - (Date.now() - started);
    if (attempt === 2 || !result.retry || left < 3_000) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
};

async function gemini(prompt: string, opts: CompleteOptions, timeoutMs: number): Promise<{ text: string | null; retry: boolean }> {
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.LLM_API_KEY! },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`LLM ${res.status}`, (await res.text().catch(() => "")).slice(0, 300));
      return { text: null, retry: res.status === 429 || res.status >= 500 };
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return { text: text || null, retry: false };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error(timedOut ? "LLM timed out" : "LLM call failed", timedOut ? "" : err);
    return { text: null, retry: !timedOut };
  }
}
