// A small GitHub REST client. Server only: it reads GITHUB_TOKEN from the
// environment. One request per call, no retry loops, clear errors.

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** When the rate limit resets (ISO), for 429 answers. */
    readonly resetAt?: string,
  ) {
    super(message);
  }
}

const API = "https://api.github.com";
const TIMEOUT_MS = 10_000;

export interface Client {
  get<T>(path: string): Promise<T>;
  /** How many requests this client made, for logs. */
  count(): number;
}

export function createClient(token = process.env.GITHUB_TOKEN): Client {
  let requests = 0;
  return {
    count: () => requests,
    async get<T>(path: string): Promise<T> {
      requests++;
      let res: Response;
      try {
        res = await fetch(`${API}${path}`, {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "squadsync",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        throw new GitHubError("GitHub did not answer in time, so try again in a minute.", 504);
      }
      if (res.ok) return (await res.json()) as T;
      throw await toError(res, Boolean(token));
    },
  };
}

async function toError(res: Response, hasToken: boolean): Promise<GitHubError> {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const retryAfter = res.headers.get("retry-after");
  if (res.status === 429 || (res.status === 403 && (remaining === "0" || retryAfter))) {
    const at = reset
      ? new Date(Number(reset) * 1000)
      : new Date(Date.now() + Number(retryAfter ?? 60) * 1000);
    const resetAt = at.toISOString().replace(/\.\d{3}Z$/, "Z");
    const limit = hasToken ? "" : " (60 requests an hour, because the server has no GitHub token)";
    return new GitHubError(`GitHub's rate limit${limit} is used up until ${resetAt.slice(11, 16)} UTC.`, 429, resetAt);
  }
  if (res.status === 401) return new GitHubError("The server's GitHub token is not valid.", 502);
  if (res.status === 404) {
    return new GitHubError("Repository not found, or it is private and the server's token cannot read it.", 404);
  }
  // GitHub's own message can run to several sentences, so it goes to the log only.
  console.error(`GitHub ${res.status}`, await res.text().catch(() => ""));
  return new GitHubError(`GitHub answered with error ${res.status}.`, 502);
}

/** Runs fn over items with at most `limit` requests in flight. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
