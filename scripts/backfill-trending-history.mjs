// One-time (or re-runnable) historical backfill: reconstructs a day-by-day
// "who gained the most stars that day" ranking for the last N days from the
// GH Archive dataset on ClickHouse's public playground — the same source
// used for star-history backfill. GitHub's own trending page has no
// history/archive API, so this is the only way to see "what was trending"
// before this pipeline started running.
//
// Costs zero GitHub API calls: it only queries ClickHouse (free, anonymous)
// and writes trending files + minimal repo stubs. The existing hourly/
// morning/evening pipeline then picks up full facts for every newly
// discovered repo on its normal rate-limited rotation — no separate fetch
// step needed here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoSlug } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
const REPO_DIR = path.join(ROOT, "data", "repos");
const DAYS = Number(process.argv[2] || process.env.BACKFILL_DAYS || 200);
const PER_DAY = 25;
const CLICKHOUSE_URL = "https://play.clickhouse.com/?user=play";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function fetchDailyLeaderboards(days) {
  const sql = `SELECT toDate(created_at) AS day, repo_name, count() AS c
    FROM github_events
    WHERE event_type = 'WatchEvent' AND created_at >= now() - INTERVAL ${days} DAY AND created_at < today()
    GROUP BY day, repo_name
    ORDER BY day, c DESC
    LIMIT ${PER_DAY} BY day
    FORMAT JSONCompact`;
  const res = await fetch(CLICKHOUSE_URL, { method: "POST", body: sql });
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const byDay = new Map();
  for (const [day, repoName, count] of json.data || []) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repoName)) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({ repo: repoName, starsGained: Number(count) });
  }
  return byDay;
}

async function main() {
  const byDay = await fetchDailyLeaderboards(DAYS);
  console.log(`Reconstructed ${byDay.size} days from GH Archive (last ${DAYS} days requested)`);

  const existingTracked = new Set(
    fs.existsSync(REPO_DIR) ? fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : []
  );

  let daysWritten = 0;
  let daysSkipped = 0;
  let newRepos = 0;
  let historyEntriesAdded = 0;
  const touchedProfiles = new Map(); // slug -> profile object, written once at the end

  for (const [day, entries] of [...byDay.entries()].sort()) {
    entries.sort((a, b) => b.starsGained - a.starsGained);
    const ranked = entries.map((e, i) => ({
      rank: i + 1,
      repo: e.repo,
      description: "",
      language: null,
      starsGained: e.starsGained,
    }));

    const trendingFile = path.join(TRENDING_DIR, `${day}.json`);
    if (!fs.existsSync(trendingFile)) {
      fs.mkdirSync(TRENDING_DIR, { recursive: true });
      fs.writeFileSync(
        trendingFile,
        JSON.stringify(
          { date: day, fetchedAt: new Date().toISOString(), periods: { daily: ranked, weekly: [], monthly: [] } },
          null,
          2
        )
      );
      daysWritten++;
    } else {
      daysSkipped++; // Real scraped data for this day already exists — never overwrite it.
    }

    for (const e of ranked) {
      const slug = repoSlug(e.repo);
      let profile = touchedProfiles.get(slug);
      if (!profile) {
        profile = readJson(path.join(REPO_DIR, `${slug}.json`));
        if (!profile) {
          const [owner, name] = e.repo.split("/");
          profile = { id: e.repo, owner, name, snapshots: [], trendingHistory: [] };
          if (!existingTracked.has(slug)) newRepos++;
        }
        touchedProfiles.set(slug, profile);
      }
      const already = profile.trendingHistory.some((t) => t.date === day && t.period === "daily");
      if (!already) {
        profile.trendingHistory.push({ date: day, period: "daily", rank: e.rank, starsGained: e.starsGained });
        historyEntriesAdded++;
      }
    }
  }

  fs.mkdirSync(REPO_DIR, { recursive: true });
  for (const [slug, profile] of touchedProfiles) {
    profile.trendingHistory.sort((a, b) => a.date.localeCompare(b.date));
    fs.writeFileSync(path.join(REPO_DIR, `${slug}.json`), JSON.stringify(profile, null, 2));
  }

  console.log(
    `Trending files: ${daysWritten} written, ${daysSkipped} already existed (untouched)\n` +
      `Repos: ${touchedProfiles.size} touched, ${newRepos} newly discovered\n` +
      `Trending-history entries added: ${historyEntriesAdded}`
  );
  console.log(
    `Newly discovered repos are minimal stubs (id + trendingHistory only) — the existing hourly/` +
      `morning/evening pipeline will fill in full facts, star history, and AI summaries over its ` +
      `normal rate-limited rotation. Nothing further to run manually.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
