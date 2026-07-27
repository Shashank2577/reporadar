// Rich per-repo detail collectors: everything the repo page needs so a
// visitor never has to leave for GitHub except to star or clone.

import { ghFetch, ghGraphQL } from "./gh.mjs";

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

// --- Commit activity (52 weeks) ----------------------------------------------
export async function fetchCommitActivity(fullName) {
  const res = await ghFetch(`/repos/${fullName}/stats/commit_activity`);
  if (!Array.isArray(res.data)) return null;
  return res.data.map((w) => ({ week: new Date(w.week * 1000).toISOString().slice(0, 10), commits: w.total }));
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
        pullRequests(states:OPEN){totalCount}
        releases{totalCount}
        hasDiscussionsEnabled
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
    openPRs: r.pullRequests?.totalCount ?? null,
    releaseCount: r.releases?.totalCount ?? null,
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
