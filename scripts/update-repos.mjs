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
import { ghFetch, lastPageFromLink, todayUTC, repoSlug, apiUsage, budgetExhausted } from "./lib/gh.mjs";
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
// Deep facts cost ~18 API calls per repo, so cap how many refresh per run.
// GITHUB_TOKEN inside Actions allows 1,000 REST calls per hour per repository
// (5,000/hour observed in practice); a shard run stays far under either.
const FACTS_LIMIT = Number(process.env.FACTS_LIMIT || 25);
// Stop starting new work when the remaining rate-limit budget gets this low.
const RATE_FLOOR = Number(process.env.RATE_FLOOR || 80);
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

async function fetchFacts(fullName, profile) {
  // First-commit date + total commit count via the Link-header pagination trick.
  try {
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
  } catch (err) {
    console.warn(`  commits: ${err.message}`);
  }

  try {
    const langs = await ghFetch(`/repos/${fullName}/languages`);
    if (langs.data) profile.languages = langs.data;
  } catch (err) {
    console.warn(`  languages: ${err.message}`);
  }

  try {
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
  } catch (err) {
    console.warn(`  contributors: ${err.message}`);
  }

  try {
    const readme = await ghFetch(`/repos/${fullName}/readme`, { raw: true });
    if (typeof readme.data === "string") {
      profile.readmeExcerpt = readme.data
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .slice(0, 12000);
    }
  } catch (err) {
    console.warn(`  readme: ${err.message}`);
  }

  try {
    profile.readmeHtml = await fetchReadmeHtml(fullName, profile.defaultBranch);
  } catch (err) {
    console.warn(`  readme html: ${err.message}`);
  }

  try {
    profile.releases = await fetchReleases(fullName);
  } catch (err) {
    console.warn(`  releases: ${err.message}`);
  }

  try {
    profile.recentIssues = await fetchRecentIssues(fullName);
  } catch (err) {
    console.warn(`  issues: ${err.message}`);
  }

  try {
    const stats = await fetchCommitStats(fullName);
    if (stats) {
      profile.commitActivity = stats.weeks;
      profile.contributionDays = stats.days;
    }
  } catch (err) {
    console.warn(`  commit stats: ${err.message}`);
  }

  // Each of these is independent; a failure on one must not lose the others.
  const optional = [
    ["punchCard", fetchPunchCard],
    ["codeFrequency", fetchCodeFrequency],
    ["participation", fetchParticipation],
    ["recentCommits", fetchRecentCommits],
    ["recentPulls", fetchRecentPulls],
    ["workflowRuns", fetchWorkflowRuns],
  ];
  for (const [key, fn] of optional) {
    try {
      const value = await fn(fullName);
      if (value) profile[key] = value;
    } catch (err) {
      console.warn(`  ${key}: ${err.message}`);
    }
  }

  try {
    Object.assign(profile, await fetchRepoShape(fullName));
  } catch (err) {
    console.warn(`  repo shape: ${err.message}`);
  }

  try {
    const tree = await fetchFileTree(fullName);
    if (tree) {
      profile.fileTree = tree;
      const deps = await fetchManifestDependencies(fullName, tree);
      if (deps) profile.manifestDependencies = deps;
    }
  } catch (err) {
    console.warn(`  file tree: ${err.message}`);
  }

  try {
    profile.community = await fetchCommunity(fullName);
  } catch (err) {
    console.warn(`  community: ${err.message}`);
  }

  try {
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
  } catch (err) {
    console.warn(`  graphql extras: ${err.message}`);
  }

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
  if (factsStale && factsDone < FACTS_LIMIT && !budgetExhausted(RATE_FLOOR)) {
    await fetchFacts(fullName, profile);
    factsDone++;
  }

  fs.mkdirSync(REPO_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(profile, null, 2));
  return true;
}

async function main() {
  const date = todayUTC();
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

  // Every repo we already track, in a stable order (deterministic across
  // runs regardless of when each was last touched — that's what makes the
  // round-robin cursor below meaningful instead of chasing a moving target).
  const trackedIds = fs.existsSync(REPO_DIR)
    ? fs
        .readdirSync(REPO_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => readJson(path.join(REPO_DIR, f)))
        .filter(Boolean)
        .map((p) => p.id)
        .sort()
    : [];

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

  // Always process today's trending repos (fresh signal matters immediately)
  // plus this run's shard of the rotation (guarantees eventual coverage).
  const queue = [...new Set([...trendingMap.keys(), ...newTrending, ...shard])];
  console.log(
    `Population: ${totalForShard} tracked | shard size: ${shardSize} (cursor ${cursor}->${nextCursor}) | ` +
      `queue this run: ${queue.length} (${trendingMap.size} trending today, ${newTrending.length} newly added)`
  );

  let ok = 0;
  let skipped = 0;
  for (const fullName of queue) {
    if (budgetExhausted(RATE_FLOOR)) {
      skipped = queue.length - ok - skipped;
      console.warn(`Rate-limit floor reached; ${skipped} repos deferred to the next run`);
      break;
    }
    try {
      process.stdout.write(`- ${fullName}\n`);
      if (await updateRepo(fullName, trendingMap.get(fullName) || null, date)) ok++;
    } catch (err) {
      console.warn(`  failed: ${err.message}`);
    }
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
