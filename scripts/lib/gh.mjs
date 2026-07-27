// Shared GitHub API helpers for the data pipeline.
// Auth: set GITHUB_TOKEN (provided automatically inside GitHub Actions).

const API = "https://api.github.com";

export function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

export async function ghFetch(url, { raw = false, retries = 2 } = {}) {
  const headers = {
    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "reporadar-pipeline",
  };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, { headers });
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
      const waitMs = Math.min(Math.max(reset - Date.now(), 1000), 60_000);
      if (attempt < retries) {
        console.warn(`Rate limited on ${url}, waiting ${Math.round(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
    if (res.status === 404) return { status: 404, data: null, headers: res.headers };
    if (!res.ok) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw new Error(`GitHub API ${res.status} for ${url}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = raw ? await res.text() : await res.json();
    return { status: res.status, data, headers: res.headers };
  }
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
