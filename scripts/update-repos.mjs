// Updates per-repo profile JSON files in data/repos/.
// - Adds today's star/fork snapshot (this is how star history accumulates).
// - Records trending appearances (rank + period + stars gained).
// - Fetches expensive facts (first commit, commit count, contributors,
//   languages, README excerpt) only when missing or stale, to stay well
//   inside API rate limits.
//
// Sources of repos to update: today's trending file + all previously tracked
// repos (bounded by TRACK_LIMIT so the pipeline never grows unbounded).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, lastPageFromLink, todayUTC, repoSlug } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
const TRACK_LIMIT = Number(process.env.TRACK_LIMIT || 400);
const FACTS_TTL_DAYS = 14;

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
        .slice(0, 6000);
    }
  } catch (err) {
    console.warn(`  readme: ${err.message}`);
  }

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

  if (daysSince(profile.factsUpdatedAt) > FACTS_TTL_DAYS) {
    await fetchFacts(fullName, profile);
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

  // Previously tracked repos, most recently trending first.
  const tracked = fs.existsSync(REPO_DIR)
    ? fs
        .readdirSync(REPO_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => readJson(path.join(REPO_DIR, f)))
        .filter(Boolean)
        .sort((a, b) => {
          const la = a.trendingHistory?.at(-1)?.date || "";
          const lb = b.trendingHistory?.at(-1)?.date || "";
          return lb.localeCompare(la);
        })
        .map((p) => p.id)
    : [];

  const queue = [...new Set([...trendingMap.keys(), ...tracked])].slice(0, TRACK_LIMIT);
  console.log(`Updating ${queue.length} repos (${trendingMap.size} trending today)`);

  let ok = 0;
  for (const fullName of queue) {
    try {
      process.stdout.write(`- ${fullName}\n`);
      if (await updateRepo(fullName, trendingMap.get(fullName) || null, date)) ok++;
    } catch (err) {
      console.warn(`  failed: ${err.message}`);
    }
  }
  console.log(`Updated ${ok}/${queue.length} repos`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
