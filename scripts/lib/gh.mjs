// Shared GitHub API helpers for the data pipeline.
// Auth: set GITHUB_TOKEN (provided automatically inside GitHub Actions).

const API = "https://api.github.com";

export function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

// Usage accounting so unattended runs can report and self-limit. GITHUB_TOKEN
// inside Actions is capped at 1,000 REST requests per hour per repository; a
// classic PAT gets 5,000.
const usage = { rest: 0, graphql: 0, remaining: null, limit: null, resetAt: null };

export function apiUsage() {
  return { ...usage };
}

// True when the remaining budget is too small to safely start more work.
export function budgetExhausted(floor = 60) {
  return usage.remaining !== null && usage.remaining < floor;
}

// Bounded-concurrency map: runs `fn` over `items` with at most `limit` in
// flight at once. This is the safe form of "run calls in parallel" — the
// total number of API calls made is identical to running sequentially (the
// rate-limit budget doesn't change), it just finishes faster. GitHub applies
// secondary/abuse-detection rate limiting well before ~10 concurrent
// requests from one token, so the default stays comfortably under that.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function ghFetch(url, { raw = false, accept = null, retries = 2 } = {}) {
  const isText = raw || (accept && !accept.includes("json"));
  const headers = {
    Accept: accept || (raw ? "application/vnd.github.raw+json" : "application/vnd.github+json"),
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "reporadar-pipeline",
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, { headers });
    usage.rest++;
    const rem = res.headers.get("x-ratelimit-remaining");
    if (rem !== null) {
      usage.remaining = Number(rem);
      usage.limit = Number(res.headers.get("x-ratelimit-limit"));
      usage.resetAt = new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000).toISOString();
    }
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
      const waitMs = Math.min(Math.max(reset - Date.now(), 1000), 60_000);
      if (attempt < retries) {
        console.warn(`Rate limited on ${url}, waiting ${Math.round(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
    // Stats endpoints return 202 while GitHub computes them in the background.
    if (res.status === 202) {
      if (attempt < retries + 2) {
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      return { status: 202, data: null, headers: res.headers };
    }
    if (res.status === 404) return { status: 404, data: null, headers: res.headers };
    if (!res.ok) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw new Error(`GitHub API ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = isText ? await res.text() : await res.json();
    return { status: res.status, data, headers: res.headers };
  }
}

// GraphQL endpoint: used for data REST does not expose (discussions, funding
// links, exact commit counts).
export async function ghGraphQL(query, variables) {
  const t = token();
  if (!t) return null;
  usage.graphql++;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
      "User-Agent": "reporadar-pipeline",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    console.warn(`GraphQL ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return null;
  }
  const json = await res.json();
  if (json.errors?.length) {
    console.warn(`GraphQL errors: ${json.errors[0]?.message}`);
  }
  return json.data || null;
}

// Parse the `Link` header to get the last page number (used to count items
// cheaply with per_page=1).
export function lastPageFromLink(headers) {
  const link = headers.get("link");
  if (!link) return 1;
  const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return m ? Number(m[1]) : 1;
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function repoSlug(fullName) {
  return fullName.replace("/", "__");
}
