// Updates per-repo profile JSON files in data/repos/.
// - Adds today's star/fork snapshot (this is how star history accumulates).
// - Records trending appearances (rank + period + stars gained).
// - Fetches expensive facts (first commit, commit count, contributors,
//   languages, README excerpt) only when missing or stale, to stay well
//   inside API rate limits.
//
// Each run processes: today's trending repos (always, so fresh signal is
// never delayed) plus one shard of a round-robin rotation over every
// tracked repo. The shard size auto-scales with the tracked population so
// coverage stays at roughly "every repo touched at least once per day"
// whether there are 40 tracked repos or 3,000 — this is what lets the same
// script run hourly, at midday, and in the morning/evening reports without
// hand-tuning. The rotation position persists in data/.pipeline-cursor.json.
// New trending repos are added up to MAX_TRACKED; past that ceiling the
// corpus stops growing but nothing already tracked is ever dropped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, lastPageFromLink, todayUTC, repoSlug, apiUsage, budgetExhausted, mapLimit, checkRateLimit } from "./lib/gh.mjs";
import {
  fetchStarHistoryBatch,
  fetchReleases,
  fetchRecentIssues,
  fetchCommitStats,
  fetchPunchCard,
  fetchCodeFrequency,
  fetchParticipation,
  fetchRecentCommits,
  fetchRecentPulls,
  fetchWorkflowRuns,
  fetchRepoShape,
  fetchFileTree,
  fetchManifestDependencies,
  fetchCommunity,
  fetchGraphQLExtras,
  fetchReadmeHtml,
} from "./lib/details.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
// Population ceiling: total distinct repos ever tracked. New trending repos
// stop being added once this is hit; already-tracked repos keep rotating.
const MAX_TRACKED = Number(process.env.MAX_TRACKED || 3000);
const FACTS_TTL_DAYS = 7;
// Deep facts cost ~18 API calls per repo. This is a high ceiling on purpose —
// the real governor is the dynamic rate-limit floor below, computed fresh
// each run, not this number.
const FACTS_LIMIT = Number(process.env.FACTS_LIMIT || 300);
// How many of a repo's ~18 independent facts calls run concurrently, and how
// many repos in the shard are processed concurrently. Both are capped well
// under GitHub's secondary/abuse-detection rate limit (~10 concurrent
// requests per token is the commonly cited safe ceiling).
const FACTS_CONCURRENCY = Number(process.env.FACTS_CONCURRENCY || 6);
const REPO_CONCURRENCY = Number(process.env.REPO_CONCURRENCY || 6);
// Target using this fraction of whatever REST budget is actually left when
// the run starts (checked fresh via /rate_limit, which is free) — not a
// fixed call count. GitHub's hourly window resets on a rolling basis from
// whenever it started, not the wall-clock hour, so re-checking live is what
// makes "reach 90% every hour" correct regardless of when the cron fires
// relative to that window.
const TARGET_UTILIZATION = Number(process.env.TARGET_UTILIZATION || 0.9);
// Absolute safety floor regardless of utilization target — never fully zero
// out the budget, so a retry or another job in the same window doesn't 403.
const MIN_RATE_FLOOR = Number(process.env.MIN_RATE_FLOOR || 20);
// Highest-star tracked repos always get refreshed this run (budget
// permitting), on top of whatever's trending today — these are the pages
// most visitors actually look at, so they shouldn't wait on the round-robin.
const RENOWNED_COUNT = Number(process.env.RENOWNED_COUNT || 100);
// Bump to force a full facts refetch for every tracked repo on the next run.
const FACTS_VERSION = 3;

// Round-robin coverage: how many scheduled runs per day touch the shard
// rotation (hourly + morning + evening = ~26). Sized with margin below 24 so
// every tracked repo gets at least one snapshot per day even if a few runs
// fail or the population briefly spikes.
const COVERAGE_RUNS_PER_DAY = Number(process.env.COVERAGE_RUNS_PER_DAY || 20);
const MIN_SHARD_SIZE = Number(process.env.MIN_SHARD_SIZE || 40);
const CURSOR_FILE = path.join(ROOT, "data", ".pipeline-cursor.json");

let factsDone = 0;
// Set at the start of main() from a live /rate_limit check; module-level so
// fetchFacts (called deep in the queue loop) can see it without threading it
// through every call.
let rateFloor = MIN_RATE_FLOOR;

// Spread facts refreshes across days so they never all come due at once.
function jitterDays(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h % 5;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

// A deep facts refresh makes ~18 independent API calls per repo. Running
// them one at a time was pure wasted wall-clock — none of them depend on
// each other's results (the one real dependency, file tree -> manifest
// dependencies, is kept sequential within its own task). This does not use
// any more of the rate-limit budget than the sequential version; it just
// stops paying round-trip latency serially. Concurrency across these tasks
// is capped by mapLimit below to stay well under GitHub's per-token
// secondary rate limit.
async function fetchFacts(fullName, profile) {
  const tasks = [
    async () => {
      const first = await ghFetch(`/repos/${fullName}/commits?per_page=1`);
      if (first.status !== 404 && Array.isArray(first.data) && first.data.length > 0) {
        const lastPage = lastPageFromLink(first.headers);
        profile.commitCount = lastPage;
        if (lastPage > 1) {
          const oldest = await ghFetch(`/repos/${fullName}/commits?per_page=1&page=${lastPage}`);
          const c = Array.isArray(oldest.data) ? oldest.data[0] : null;
          profile.firstCommitAt = c?.commit?.author?.date || profile.createdAt;
        } else {
          profile.firstCommitAt = first.data[0]?.commit?.author?.date || profile.createdAt;
        }
      }
    },
    async () => {
      const langs = await ghFetch(`/repos/${fullName}/languages`);
      if (langs.data) profile.languages = langs.data;
    },
    async () => {
      const contrib = await ghFetch(`/repos/${fullName}/contributors?per_page=10`);
      if (Array.isArray(contrib.data)) {
        profile.contributors = contrib.data.map((c) => ({
          login: c.login,
          url: c.html_url,
          avatarUrl: c.avatar_url,
          contributions: c.contributions,
        }));
      }
      const count = await ghFetch(`/repos/${fullName}/contributors?per_page=1&anon=true`);
      profile.contributorCount = lastPageFromLink(count.headers);
    },
    async () => {
      const readme = await ghFetch(`/repos/${fullName}/readme`, { raw: true });
      if (typeof readme.data === "string") {
        profile.readmeExcerpt = readme.data
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
          .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
          .slice(0, 12000);
      }
    },
    async () => {
      profile.readmeHtml = await fetchReadmeHtml(fullName, profile.defaultBranch);
    },
    async () => {
      profile.releases = await fetchReleases(fullName);
    },
    async () => {
      profile.recentIssues = await fetchRecentIssues(fullName);
    },
    async () => {
      const stats = await fetchCommitStats(fullName);
      if (stats) {
        profile.commitActivity = stats.weeks;
        profile.contributionDays = stats.days;
      }
    },
    async () => {
      const value = await fetchPunchCard(fullName);
      if (value) profile.punchCard = value;
    },
    async () => {
      const value = await fetchCodeFrequency(fullName);
      if (value) profile.codeFrequency = value;
    },
    async () => {
      const value = await fetchParticipation(fullName);
      if (value) profile.participation = value;
    },
    async () => {
      const value = await fetchRecentCommits(fullName);
      if (value) profile.recentCommits = value;
    },
    async () => {
      const value = await fetchRecentPulls(fullName);
      if (value) profile.recentPulls = value;
    },
    async () => {
      const value = await fetchWorkflowRuns(fullName);
      if (value) profile.workflowRuns = value;
    },
    async () => {
      Object.assign(profile, await fetchRepoShape(fullName));
    },
    async () => {
      const tree = await fetchFileTree(fullName);
      if (tree) {
        profile.fileTree = tree;
        const deps = await fetchManifestDependencies(fullName, tree);
        if (deps) profile.manifestDependencies = deps;
      }
    },
    async () => {
      profile.community = await fetchCommunity(fullName);
    },
    async () => {
      const extras = await fetchGraphQLExtras(...fullName.split("/"));
      if (extras) {
        profile.watchers = extras.watchers ?? profile.watchers;
        profile.fundingLinks = extras.fundingLinks;
        profile.openIssuesOnly = extras.openIssuesOnly;
        profile.openPRs = extras.openPRs;
        profile.releaseCount = extras.releaseCount;
        profile.discussionsEnabled = extras.discussionsEnabled;
        profile.discussionCount = extras.discussionCount;
        profile.discussions = extras.discussions;
        profile.closedIssues = extras.closedIssues;
        profile.mergedPRs = extras.mergedPRs;
        profile.environmentCount = extras.environmentCount;
        profile.isFork = extras.isFork;
        profile.isInOrganization = extras.isInOrganization;
        profile.securityPolicyUrl = extras.securityPolicyUrl;
        profile.codeOfConduct = extras.codeOfConduct;
        profile.latestRelease = extras.latestRelease;
        if (extras.commitCount) profile.commitCount = extras.commitCount;
      }
    },
  ];

  const labels = [
    "commits", "languages", "contributors", "readme", "readme html", "releases",
    "issues", "commit stats", "punch card", "code frequency", "participation",
    "recent commits", "recent pulls", "workflow runs", "repo shape", "file tree",
    "community", "graphql extras",
  ];
  await mapLimit(tasks, FACTS_CONCURRENCY, async (task, i) => {
    try {
      await task();
    } catch (err) {
      console.warn(`  ${labels[i]}: ${err.message}`);
    }
  });

  profile.factsVersion = FACTS_VERSION;
  profile.factsUpdatedAt = new Date().toISOString();
}

async function updateRepo(fullName, trendingEntry, date) {
  const file = path.join(REPO_DIR, `${repoSlug(fullName)}.json`);
  const profile = readJson(file) || { id: fullName, snapshots: [], trendingHistory: [] };

  const { status, data: r } = await ghFetch(`/repos/${fullName}`);
  if (status === 404 || !r) {
    console.warn(`  ${fullName}: gone (404), skipping`);
    return false;
  }

  Object.assign(profile, {
    id: r.full_name,
    owner: r.owner?.login,
    ownerAvatarUrl: r.owner?.avatar_url,
    ownerType: r.owner?.type,
    name: r.name,
    description: r.description || trendingEntry?.description || "",
    url: r.html_url,
    homepage: r.homepage || null,
    license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : r.license?.name || null,
    language: r.language,
    topics: r.topics || [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count,
    openIssues: r.open_issues_count,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    defaultBranch: r.default_branch,
    archived: r.archived,
    updatedAt: new Date().toISOString(),
  });

  // Append or replace today's snapshot.
  profile.snapshots = (profile.snapshots || []).filter((s) => s.date !== date);
  profile.snapshots.push({ date, stars: r.stargazers_count, forks: r.forks_count });
  profile.snapshots.sort((a, b) => a.date.localeCompare(b.date));

  if (trendingEntry) {
    profile.trendingHistory = (profile.trendingHistory || []).filter(
      (t) => !(t.date === date && t.period === trendingEntry.period)
    );
    profile.trendingHistory.push({
      date,
      period: trendingEntry.period,
      rank: trendingEntry.rank,
      starsGained: trendingEntry.starsGained,
    });
  }

  const factsStale =
    daysSince(profile.factsUpdatedAt) > FACTS_TTL_DAYS + jitterDays(fullName) ||
    (profile.factsVersion || 1) < FACTS_VERSION;
  if (factsStale && factsDone < FACTS_LIMIT && !budgetExhausted(rateFloor)) {
    await fetchFacts(fullName, profile);
    factsDone++;
  }

  fs.mkdirSync(REPO_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(profile, null, 2));
  return true;
}

async function main() {
  const date = todayUTC();

  const { remaining, limit, resetAt } = await checkRateLimit();
  if (remaining !== null) {
    rateFloor = Math.max(MIN_RATE_FLOOR, Math.round(remaining * (1 - TARGET_UTILIZATION)));
    console.log(
      `Rate limit: ${remaining}/${limit} remaining (resets ${resetAt}) | ` +
        `targeting ${Math.round(TARGET_UTILIZATION * 100)}% -> stop below ${rateFloor} remaining ` +
        `(budget for this run: ~${Math.max(remaining - rateFloor, 0)} calls)`
    );
  } else {
    console.warn(`Could not read live rate limit; falling back to floor ${rateFloor}`);
  }

  const trendingFiles = fs.existsSync(TRENDING_DIR)
    ? fs.readdirSync(TRENDING_DIR).filter((f) => f.endsWith(".json")).sort()
    : [];
  const latest = trendingFiles.length
    ? readJson(path.join(TRENDING_DIR, trendingFiles[trendingFiles.length - 1]))
    : null;

  // Map repo -> best trending entry for today.
  const trendingMap = new Map();
  if (latest) {
    for (const period of ["daily", "weekly", "monthly"]) {
      for (const e of latest.periods?.[period] || []) {
        if (!trendingMap.has(e.repo)) trendingMap.set(e.repo, { ...e, period });
      }
    }
  }

  // Every repo we already track. Loaded once; the rotation needs a stable
  // alphabetical order (deterministic across runs, so the cursor means the
  // same thing every time), while the "renowned" list below needs the same
  // repos ranked by stars instead.
  const trackedProfiles = fs.existsSync(REPO_DIR)
    ? fs
        .readdirSync(REPO_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => readJson(path.join(REPO_DIR, f)))
        .filter(Boolean)
    : [];
  const trackedIds = [...trackedProfiles].map((p) => p.id).sort();
  // The most-starred tracked repos are refreshed every run regardless of
  // where the round-robin cursor is — these are the pages most visitors
  // actually look at, so they shouldn't wait on the rotation.
  const renowned = [...trackedProfiles]
    .sort((a, b) => (b.stars || 0) - (a.stars || 0))
    .slice(0, RENOWNED_COUNT)
    .map((p) => p.id);

  // New trending repos are added up to the population ceiling; once hit,
  // only already-tracked repos keep rotating (the corpus stops growing, it
  // does not start dropping repos).
  const trackedSet = new Set(trackedIds);
  const room = Math.max(MAX_TRACKED - trackedIds.length, 0);
  const newTrending = [...trendingMap.keys()].filter((id) => !trackedSet.has(id)).slice(0, room);
  if (trendingMap.size && newTrending.length < trendingMap.size - [...trendingMap.keys()].filter((id) => trackedSet.has(id)).length) {
    console.warn(`Population ceiling (${MAX_TRACKED}) reached; some new trending repos were not added this run`);
  }

  // Shard size auto-scales with the population so coverage stays roughly
  // "every tracked repo touched at least once per day" without manual
  // retuning as the corpus grows from dozens to thousands.
  const totalForShard = trackedIds.length + newTrending.length;
  const shardSize = Math.max(MIN_SHARD_SIZE, Math.ceil(totalForShard / COVERAGE_RUNS_PER_DAY));

  let cursor = 0;
  try {
    cursor = JSON.parse(fs.readFileSync(CURSOR_FILE, "utf8")).cursor || 0;
  } catch {
    cursor = 0;
  }
  const rotation = [...trackedIds, ...newTrending];
  const shard =
    rotation.length <= shardSize
      ? rotation
      : Array.from({ length: shardSize }, (_, i) => rotation[(cursor + i) % rotation.length]);
  const nextCursor = rotation.length ? (cursor + shardSize) % rotation.length : 0;
  fs.mkdirSync(path.dirname(CURSOR_FILE), { recursive: true });
  fs.writeFileSync(CURSOR_FILE, JSON.stringify({ cursor: nextCursor, updatedAt: new Date().toISOString() }, null, 2));

  // Priority order: today's trending (freshest signal) and the most-starred
  // tracked repos (highest-traffic pages) always go first, then the shard
  // fills in round-robin coverage for the rest. Set union preserves this
  // order and dedupes; the actual cutoff for how much of the queue gets
  // processed is the live rate-limit floor computed above, not this list's
  // length — a small budget still does trending+renowned first, a 90%
  // budget reaches deep into the shard too.
  const queue = [...new Set([...trendingMap.keys(), ...newTrending, ...renowned, ...shard])];
  console.log(
    `Population: ${totalForShard} tracked | shard size: ${shardSize} (cursor ${cursor}->${nextCursor}) | ` +
      `queue this run: ${queue.length} (${trendingMap.size} trending today, ${newTrending.length} newly added, ` +
      `${renowned.length} renowned prioritized)`
  );

  // Repos in the shard are independent of each other, so processing several
  // concurrently (bounded, same reasoning as fetchFacts above) cuts wall-clock
  // time without touching the total call count against the rate limit.
  let ok = 0;
  let floorHit = false;
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < queue.length) {
      if (budgetExhausted(rateFloor)) {
        floorHit = true;
        return;
      }
      const i = nextIndex++;
      const fullName = queue[i];
      try {
        process.stdout.write(`- ${fullName}\n`);
        if (await updateRepo(fullName, trendingMap.get(fullName) || null, date)) ok++;
      } catch (err) {
        console.warn(`  failed: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(REPO_CONCURRENCY, queue.length) }, worker));
  if (floorHit) {
    console.warn(`Rate-limit floor reached; ${queue.length - nextIndex} repos deferred to the next run`);
  }
  console.log(`Updated ${ok}/${queue.length} repos (deep facts refreshed: ${factsDone})`);

  // Batched star-history backfill (one-time per repo) from the GH Archive
  // dataset on ClickHouse's public playground.
  const needBackfill = fs
    .readdirSync(REPO_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: path.join(REPO_DIR, f), profile: readJson(path.join(REPO_DIR, f)) }))
    .filter(({ profile }) => profile && !profile.starHistory?.points?.length);
  if (needBackfill.length) {
    console.log(`Backfilling star history for ${needBackfill.length} repos`);
    const histories = await fetchStarHistoryBatch(
      needBackfill.map(({ profile }) => ({ id: profile.id, stars: profile.stars }))
    );
    let filled = 0;
    for (const { file, profile } of needBackfill) {
      const h = histories.get(profile.id);
      if (!h) continue;
      profile.starHistory = h;
      fs.writeFileSync(file, JSON.stringify(profile, null, 2));
      filled++;
    }
    console.log(`Backfilled ${filled}/${needBackfill.length}`);
  }

  const u = apiUsage();
  console.log(
    `API usage: ${u.rest} REST + ${u.graphql} GraphQL calls | ` +
      `rate limit remaining ${u.remaining ?? "?"}/${u.limit ?? "?"} (resets ${u.resetAt ?? "?"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
