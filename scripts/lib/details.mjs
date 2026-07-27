// Rich per-repo detail collectors: everything the repo page needs so a
// visitor never has to leave for GitHub except to star or clone.

import { ghFetch, ghGraphQL, lastPageFromLink } from "./gh.mjs";

// --- Star history backfill --------------------------------------------------
// GitHub removed public access to stargazer timestamps, so the historical
// curve comes from the GH Archive dataset mirrored on ClickHouse's public
// playground: weekly WatchEvent counts per repo since 2011, queried
// anonymously in one batched request. The cumulative curve is scaled to the
// repo's current star count (the archive misses a small fraction of events);
// our own daily snapshots take over from the backfill's end.
const CLICKHOUSE_URL = "https://play.clickhouse.com/?user=play";

export async function fetchStarHistoryBatch(repos) {
  // repos: [{ id, stars }]
  const result = new Map();
  const chunkSize = 50;
  for (let i = 0; i < repos.length; i += chunkSize) {
    const chunk = repos.filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r.id)).slice(i, i + chunkSize);
    if (!chunk.length) continue;
    const list = chunk.map((r) => `'${r.id}'`).join(",");
    const sql = `SELECT repo_name, toStartOfWeek(created_at) AS week, count() AS c
      FROM github_events
      WHERE event_type = 'WatchEvent' AND repo_name IN (${list})
      GROUP BY repo_name, week ORDER BY repo_name, week
      FORMAT JSONCompact`;
    try {
      const res = await fetch(CLICKHOUSE_URL, { method: "POST", body: sql });
      if (!res.ok) {
        console.warn(`  clickhouse ${res.status}: ${(await res.text()).slice(0, 120)}`);
        continue;
      }
      const json = await res.json();
      const byRepo = new Map();
      for (const [repoName, week, c] of json.data || []) {
        if (!byRepo.has(repoName)) byRepo.set(repoName, []);
        byRepo.get(repoName).push({ week, count: Number(c) });
      }
      for (const r of chunk) {
        const weeks = byRepo.get(r.id);
        if (!weeks?.length) continue;
        const totalEvents = weeks.reduce((s, w) => s + w.count, 0);
        // Scale the archive counts so the curve ends at the true current total.
        const scale = totalEvents > 0 ? r.stars / totalEvents : 1;
        let cum = 0;
        const points = weeks.map((w) => {
          cum += w.count;
          return { date: w.week, stars: Math.max(1, Math.round(cum * scale)) };
        });
        result.set(r.id, {
          points,
          source: "gharchive-clickhouse",
          scale: Number(scale.toFixed(3)),
          sampledAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`  clickhouse batch failed: ${err.message}`);
    }
  }
  return result;
}

// --- Releases ----------------------------------------------------------------
export async function fetchReleases(fullName) {
  const res = await ghFetch(`/repos/${fullName}/releases?per_page=5`);
  if (!Array.isArray(res.data)) return [];
  return res.data.map((r) => ({
    name: r.name || r.tag_name,
    tag: r.tag_name,
    url: r.html_url,
    publishedAt: r.published_at,
    prerelease: r.prerelease,
    body: (r.body || "").slice(0, 1200),
    downloads: (r.assets || []).reduce((s, a) => s + (a.download_count || 0), 0),
    reactions: r.reactions?.total_count || 0,
  }));
}

// --- Recent open issues (excluding PRs) --------------------------------------
export async function fetchRecentIssues(fullName) {
  const res = await ghFetch(
    `/repos/${fullName}/issues?state=open&sort=created&direction=desc&per_page=12`
  );
  if (!Array.isArray(res.data)) return [];
  return res.data
    .filter((i) => !i.pull_request)
    .slice(0, 6)
    .map((i) => ({
      number: i.number,
      title: i.title,
      url: i.html_url,
      createdAt: i.created_at,
      comments: i.comments,
      labels: (i.labels || []).slice(0, 3).map((l) => (typeof l === "string" ? l : l.name)),
      author: i.user?.login || null,
    }));
}

// --- Commit activity: weekly totals and per-day counts ------------------------
// One call to stats/commit_activity yields both the weekly bar chart and the
// per-day series behind GitHub's green-square contribution graph.
export async function fetchCommitStats(fullName) {
  const res = await ghFetch(`/repos/${fullName}/stats/commit_activity`);
  if (!Array.isArray(res.data)) return null;
  const weeks = [];
  const days = [];
  for (const w of res.data) {
    const weekStart = new Date(w.week * 1000);
    weeks.push({ week: weekStart.toISOString().slice(0, 10), commits: w.total });
    (w.days || []).forEach((count, i) => {
      const d = new Date(weekStart.getTime() + i * 86400000);
      days.push({ date: d.toISOString().slice(0, 10), count });
    });
  }
  return { weeks, days };
}

// --- Punch card: commits by weekday and hour ----------------------------------
export async function fetchPunchCard(fullName) {
  const res = await ghFetch(`/repos/${fullName}/stats/punch_card`);
  if (!Array.isArray(res.data)) return null;
  // [[day, hour, commits], ...]
  return res.data.map(([day, hour, commits]) => ({ day, hour, commits }));
}

// --- Code frequency: weekly additions and deletions ---------------------------
export async function fetchCodeFrequency(fullName) {
  const res = await ghFetch(`/repos/${fullName}/stats/code_frequency`);
  if (!Array.isArray(res.data)) return null;
  return res.data.slice(-52).map(([week, additions, deletions]) => ({
    week: new Date(week * 1000).toISOString().slice(0, 10),
    additions,
    deletions: Math.abs(deletions),
  }));
}

// --- Participation: owner vs community commits (52 weeks) ---------------------
export async function fetchParticipation(fullName) {
  const res = await ghFetch(`/repos/${fullName}/stats/participation`);
  if (!res.data?.all) return null;
  const all = res.data.all.reduce((s, n) => s + n, 0);
  const owner = (res.data.owner || []).reduce((s, n) => s + n, 0);
  return { all, owner, community: Math.max(all - owner, 0) };
}

// --- Recent commits (activity feed) -------------------------------------------
export async function fetchRecentCommits(fullName) {
  const res = await ghFetch(`/repos/${fullName}/commits?per_page=10`);
  if (!Array.isArray(res.data)) return [];
  return res.data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: (c.commit?.message || "").split("\n")[0].slice(0, 140),
    url: c.html_url,
    date: c.commit?.author?.date || null,
    author: c.author?.login || c.commit?.author?.name || null,
    avatarUrl: c.author?.avatar_url || null,
  }));
}

// --- Recent pull requests -----------------------------------------------------
export async function fetchRecentPulls(fullName) {
  const res = await ghFetch(
    `/repos/${fullName}/pulls?state=all&sort=updated&direction=desc&per_page=8`
  );
  if (!Array.isArray(res.data)) return [];
  return res.data.map((p) => ({
    number: p.number,
    title: p.title.slice(0, 140),
    url: p.html_url,
    state: p.merged_at ? "merged" : p.state,
    updatedAt: p.updated_at,
    author: p.user?.login || null,
    draft: Boolean(p.draft),
  }));
}

// --- CI: latest Actions workflow runs -----------------------------------------
export async function fetchWorkflowRuns(fullName) {
  const res = await ghFetch(`/repos/${fullName}/actions/runs?per_page=10`);
  const runs = res.data?.workflow_runs;
  if (!Array.isArray(runs)) return null;
  // Latest run per workflow name.
  const seen = new Map();
  for (const r of runs) {
    if (seen.has(r.name)) continue;
    seen.set(r.name, {
      name: r.name,
      status: r.conclusion || r.status,
      url: r.html_url,
      branch: r.head_branch,
      updatedAt: r.updated_at,
    });
  }
  return [...seen.values()].slice(0, 6);
}

// --- Top-level file tree ------------------------------------------------------
// Powers a GitHub-style file browser on the repo page.
export async function fetchFileTree(fullName) {
  const res = await ghFetch(`/repos/${fullName}/contents/`);
  if (!Array.isArray(res.data)) return null;
  return res.data
    .map((f) => ({ name: f.name, type: f.type, size: f.size || 0, url: f.html_url }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1))
    .slice(0, 40);
}

// --- Direct dependencies from the primary manifest ----------------------------
// GitHub's SBOM endpoint is unreliable (timeouts and 404s), and direct
// dependencies are more meaningful to a reader than a transitive list, so the
// primary manifest is parsed instead.
const MANIFESTS = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "Gemfile",
  "composer.json",
  "pubspec.yaml",
];

function parseManifest(name, text) {
  const deps = [];
  try {
    if (name === "package.json") {
      const json = JSON.parse(text);
      for (const [k, v] of Object.entries(json.dependencies || {})) deps.push({ name: k, version: String(v) });
      for (const [k, v] of Object.entries(json.peerDependencies || {})) deps.push({ name: k, version: String(v) });
    } else if (name === "requirements.txt") {
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
        const m = trimmed.match(/^([A-Za-z0-9_.-]+)\s*([=<>~!].*)?$/);
        if (m) deps.push({ name: m[1], version: (m[2] || "").trim() || null });
      }
    } else if (name === "Cargo.toml" || name === "pyproject.toml") {
      const section = name === "Cargo.toml" ? /\[dependencies\]([\s\S]*?)(\n\[|$)/ : /dependencies\s*=\s*\[([\s\S]*?)\]/;
      const block = text.match(section)?.[1] || "";
      for (const line of block.split("\n")) {
        const m = line.trim().match(/^["']?([A-Za-z0-9_.-]+)["']?\s*[=><~^]*\s*["']?([^"',]*)/);
        if (m && m[1] && !m[1].startsWith("#")) deps.push({ name: m[1], version: m[2]?.trim() || null });
      }
    } else if (name === "go.mod") {
      const block = text.match(/require\s*\(([\s\S]*?)\)/)?.[1] || text;
      for (const line of block.split("\n")) {
        const m = line.trim().match(/^([\w./-]+)\s+(v[\w.+-]+)/);
        if (m) deps.push({ name: m[1], version: m[2] });
      }
    } else if (name === "composer.json") {
      const json = JSON.parse(text);
      for (const [k, v] of Object.entries(json.require || {})) deps.push({ name: k, version: String(v) });
    } else if (name === "Gemfile") {
      for (const line of text.split("\n")) {
        const m = line.trim().match(/^gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/);
        if (m) deps.push({ name: m[1], version: m[2] || null });
      }
    } else if (name === "pubspec.yaml") {
      const block = text.match(/^dependencies:\s*\n([\s\S]*?)(^\S|$)/m)?.[1] || "";
      for (const line of block.split("\n")) {
        const m = line.match(/^\s{2}([A-Za-z0-9_]+):\s*(.*)$/);
        if (m) deps.push({ name: m[1], version: m[2]?.trim() || null });
      }
    }
  } catch {
    return [];
  }
  const seen = new Set();
  return deps
    .filter((d) => d.name && d.name.length < 60 && !seen.has(d.name) && seen.add(d.name))
    .slice(0, 40);
}

export async function fetchManifestDependencies(fullName, tree) {
  const present = (tree || []).filter((f) => f.type === "file" && MANIFESTS.includes(f.name));
  for (const file of present) {
    try {
      const res = await ghFetch(`/repos/${fullName}/contents/${file.name}`, { raw: true });
      if (typeof res.data !== "string") continue;
      const deps = parseManifest(file.name, res.data);
      if (deps.length) return { manifest: file.name, dependencies: deps, total: deps.length };
    } catch {
      // Try the next manifest.
    }
  }
  return null;
}

// --- Repository shape: branches, tags, security policy ------------------------
export async function fetchRepoShape(fullName) {
  const out = {};
  try {
    const branches = await ghFetch(`/repos/${fullName}/branches?per_page=1`);
    out.branchCount = lastPageFromLink(branches.headers);
  } catch {
    // Non-fatal.
  }
  try {
    const tags = await ghFetch(`/repos/${fullName}/tags?per_page=1`);
    out.tagCount = lastPageFromLink(tags.headers);
  } catch {
    // Non-fatal.
  }
  return out;
}

// --- Community profile ---------------------------------------------------------
export async function fetchCommunity(fullName) {
  const res = await ghFetch(`/repos/${fullName}/community/profile`);
  if (!res.data) return null;
  const f = res.data.files || {};
  return {
    healthPercentage: res.data.health_percentage,
    hasCodeOfConduct: Boolean(f.code_of_conduct),
    hasContributing: Boolean(f.contributing),
    hasIssueTemplate: Boolean(f.issue_template),
    hasPullRequestTemplate: Boolean(f.pull_request_template),
  };
}

// --- GraphQL extras: discussions, funding, exact counts ------------------------
export async function fetchGraphQLExtras(owner, name) {
  const data = await ghGraphQL(
    `query($owner:String!,$name:String!){
      repository(owner:$owner,name:$name){
        watchers{totalCount}
        fundingLinks{platform url}
        issues(states:OPEN){totalCount}
        closedIssues:issues(states:CLOSED){totalCount}
        pullRequests(states:OPEN){totalCount}
        mergedPRs:pullRequests(states:MERGED){totalCount}
        releases{totalCount}
        environments{totalCount}
        hasDiscussionsEnabled
        isFork
        isInOrganization
        securityPolicyUrl
        codeOfConduct{name url}
        latestRelease{tagName publishedAt}
        discussions(first:5,orderBy:{field:UPDATED_AT,direction:DESC}){
          totalCount
          nodes{title url createdAt comments{totalCount} category{name}}
        }
        defaultBranchRef{target{... on Commit{history{totalCount}}}}
      }
    }`,
    { owner, name }
  );
  const r = data?.repository;
  if (!r) return null;
  return {
    watchers: r.watchers?.totalCount ?? null,
    fundingLinks: (r.fundingLinks || []).map((f) => ({ platform: f.platform, url: f.url })),
    openIssuesOnly: r.issues?.totalCount ?? null,
    closedIssues: r.closedIssues?.totalCount ?? null,
    openPRs: r.pullRequests?.totalCount ?? null,
    mergedPRs: r.mergedPRs?.totalCount ?? null,
    releaseCount: r.releases?.totalCount ?? null,
    environmentCount: r.environments?.totalCount ?? null,
    isFork: Boolean(r.isFork),
    isInOrganization: Boolean(r.isInOrganization),
    securityPolicyUrl: r.securityPolicyUrl || null,
    codeOfConduct: r.codeOfConduct ? { name: r.codeOfConduct.name, url: r.codeOfConduct.url } : null,
    latestRelease: r.latestRelease
      ? { tag: r.latestRelease.tagName, publishedAt: r.latestRelease.publishedAt }
      : null,
    discussionsEnabled: Boolean(r.hasDiscussionsEnabled),
    discussionCount: r.discussions?.totalCount ?? 0,
    discussions: (r.discussions?.nodes || []).map((d) => ({
      title: d.title,
      url: d.url,
      createdAt: d.createdAt,
      comments: d.comments?.totalCount || 0,
      category: d.category?.name || null,
    })),
    commitCount: r.defaultBranchRef?.target?.history?.totalCount ?? null,
  };
}

// --- README as GitHub-rendered HTML --------------------------------------------
// GitHub returns its own sanitized rendered HTML. Relative links and images are
// rewritten to absolute GitHub URLs so they resolve on our pages.
export async function fetchReadmeHtml(fullName, defaultBranch) {
  const res = await ghFetch(`/repos/${fullName}/readme`, {
    accept: "application/vnd.github.html",
  });
  if (typeof res.data !== "string" || !res.data) return null;
  let html = res.data;

  const rawBase = `https://raw.githubusercontent.com/${fullName}/${defaultBranch || "HEAD"}/`;
  const blobBase = `https://github.com/${fullName}/blob/${defaultBranch || "HEAD"}/`;
  html = html
    // Drop GitHub's anchor decorations that 404 off-site.
    .replace(/<a[^>]*class="anchor"[^>]*>.*?<\/a>/gs, "")
    // Absolute-ify relative image sources.
    .replace(/(<img[^>]+src=")(?!https?:|data:)(\.?\/?)([^"]+)"/g, `$1${rawBase}$3"`)
    // Absolute-ify relative hrefs (skip in-page anchors and absolute URLs).
    .replace(/(<a[^>]+href=")(?!https?:|#|mailto:)(\.?\/?)([^"]+)"/g, `$1${blobBase}$3"`);

  // Cap size so profile JSON stays reasonable.
  if (html.length > 90000) html = html.slice(0, 90000) + "\n<p>(README truncated)</p>";
  return html;
}
