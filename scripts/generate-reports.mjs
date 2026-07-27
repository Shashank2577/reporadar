// Generates Markdown reports in content/reports/ from the collected data.
//   node scripts/generate-reports.mjs daily     -> content/reports/daily/<date>.md
//   node scripts/generate-reports.mjs weekly    -> content/reports/weekly/<iso-week>.md
//   node scripts/generate-reports.mjs monthly   -> content/reports/monthly/<yyyy-mm>.md
//
// Reports are data-driven and deterministic. Editorial sections are wrapped in
// jules markers so a scheduled Jules task can enrich them in a PR without
// touching the generated data tables.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { todayUTC, isoWeek } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
const REPORTS_DIR = path.join(ROOT, "content", "reports");

const mode = process.argv[2] || "daily";
const date = todayUTC();

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function loadRepos() {
  if (!fs.existsSync(REPO_DIR)) return new Map();
  const map = new Map();
  for (const f of fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))) {
    const p = readJson(path.join(REPO_DIR, f));
    if (p?.id) map.set(p.id, p);
  }
  return map;
}

function snapshotOn(profile, d) {
  return (profile.snapshots || []).findLast((s) => s.date <= d);
}

function starDelta(profile, fromDate, toDate) {
  const a = snapshotOn(profile, fromDate);
  const b = snapshotOn(profile, toDate);
  if (!a || !b || a.date === b.date) return null;
  return b.stars - a.stars;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function fmt(n) {
  return typeof n === "number" ? n.toLocaleString("en-US") : "n/a";
}

function repoLink(id) {
  return `[${id}](/repos/${id})`;
}

// Detect unusual star jumps: today's gain vs the trailing 7-day daily average.
function detectJumps(repos) {
  const jumps = [];
  for (const p of repos.values()) {
    const today = starDelta(p, daysAgo(1), date);
    const weekly = starDelta(p, daysAgo(8), daysAgo(1));
    if (today === null) continue;
    const avg = weekly !== null && weekly > 0 ? weekly / 7 : null;
    if ((avg !== null && today > Math.max(avg * 3, 50)) || (avg === null && today > 300)) {
      jumps.push({ profile: p, today, avg });
    }
  }
  return jumps.sort((a, b) => b.today - a.today).slice(0, 10);
}

function pickFeatured(entries, repos, previouslyFeatured) {
  for (const e of entries) {
    if (!previouslyFeatured.has(e.repo) && repos.has(e.repo)) return repos.get(e.repo);
  }
  return entries.length ? repos.get(entries[0].repo) || null : null;
}

function previouslyFeaturedSet(kind) {
  const dir = path.join(REPORTS_DIR, kind);
  const set = new Set();
  if (!fs.existsSync(dir)) return set;
  for (const f of fs.readdirSync(dir)) {
    const m = fs.readFileSync(path.join(dir, f), "utf8").match(/^featured:\s*"?([^"\n]+)"?$/m);
    if (m) set.add(m[1].trim());
  }
  return set;
}

function trendingTable(entries, repos, gainLabel) {
  const rows = entries.slice(0, 15).map((e) => {
    const p = repos.get(e.repo);
    const gain = e.starsGained !== null && e.starsGained !== undefined ? `+${fmt(e.starsGained)}` : "n/a";
    return `| ${e.rank} | ${p ? repoLink(e.repo) : e.repo} | ${p?.language || e.language || "n/a"} | ${fmt(p?.stars)} | ${gain} | ${(e.description || p?.description || "").slice(0, 110)} |`;
  });
  return [
    `| Rank | Repository | Language | Total stars | ${gainLabel} | Description |`,
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function featuredSection(p, label) {
  if (!p) return "No featured repository could be selected for this period.";
  const s = p.aiSummary || {};
  const lines = [
    `**${repoLink(p.id)}** — ${p.description || ""}`,
    "",
    s.whatItDoes || "",
    s.whyItMatters ? `\n${s.whyItMatters}` : "",
    "",
    `- Stars: ${fmt(p.stars)} | Forks: ${fmt(p.forks)} | Language: ${p.language || "n/a"} | License: ${p.license || "Unspecified"}`,
    s.useCases?.length
      ? `- Typical use cases: ${s.useCases.slice(0, 3).map((u) => (typeof u === "string" ? u : u.title)).join("; ")}`
      : "",
    `- [View the full ${label} profile](/repos/${p.id}) or [see it on GitHub](${p.url})`,
  ];
  return lines.filter(Boolean).join("\n");
}

function jumpsSection(jumps) {
  if (!jumps.length) {
    return "No unusual star jumps were detected in this period. Jumps are flagged when a repository gains stars at more than three times its trailing seven-day average.";
  }
  return jumps
    .map(
      (j) =>
        `- ${repoLink(j.profile.id)} gained **+${fmt(j.today)} stars** in the last day` +
        (j.avg ? ` (trailing average: ${fmt(Math.round(j.avg))}/day).` : ".") +
        (j.profile.description ? ` ${j.profile.description.slice(0, 100)}` : "")
    )
    .join("\n");
}

function newEntrants(entries, repos) {
  const fresh = entries.filter((e) => {
    const p = repos.get(e.repo);
    return p && (p.trendingHistory || []).filter((t) => t.period === "daily").length <= 1;
  });
  if (!fresh.length) return "No first-time entrants today.";
  return fresh
    .slice(0, 8)
    .map((e) => {
      const p = repos.get(e.repo);
      return `- ${repoLink(e.repo)} (${p?.language || "n/a"}, ${fmt(p?.stars)} stars) — ${(e.description || "").slice(0, 120)}`;
    })
    .join("\n");
}

function writeReport(kind, slug, frontmatter, body) {
  const dir = path.join(REPORTS_DIR, kind);
  fs.mkdirSync(dir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => (Array.isArray(v) ? `${k}:\n${v.map((x) => `  - "${x}"`).join("\n")}` : `${k}: "${String(v).replace(/"/g, "'")}"`))
    .join("\n");
  fs.writeFileSync(path.join(dir, `${slug}.md`), `---\n${fm}\n---\n\n${body}\n`);
  console.log(`Wrote content/reports/${kind}/${slug}.md`);
}

function main() {
  const repos = loadRepos();
  const trendingFiles = fs.existsSync(TRENDING_DIR)
    ? fs.readdirSync(TRENDING_DIR).filter((f) => f.endsWith(".json")).sort()
    : [];
  const latest = trendingFiles.length
    ? readJson(path.join(TRENDING_DIR, trendingFiles.at(-1)))
    : { periods: {} };

  const readable = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  if (mode === "daily") {
    const entries = latest.periods?.daily || [];
    const featured = pickFeatured(entries, repos, previouslyFeaturedSet("daily"));
    const jumps = detectJumps(repos);
    const body = [
      `<!-- jules:editorial:start -->`,
      `Today's snapshot of what the open-source world is starring. ${entries.length} repositories made the daily trending list.`,
      `<!-- jules:editorial:end -->`,
      "",
      "## Repository of the day",
      "",
      featuredSection(featured, "repository"),
      "",
      "## Trending today",
      "",
      trendingTable(entries, repos, "Stars today"),
      "",
      "## Star jumps detected",
      "",
      jumpsSection(jumps),
      "",
      "## New on the radar",
      "",
      newEntrants(entries, repos),
    ].join("\n");

    writeReport("daily", date, {
      title: `GitHub Trending Report — ${readable}`,
      date,
      type: "daily",
      featured: featured?.id || "",
      description: `Daily GitHub trending report for ${readable}: repository of the day${featured ? ` (${featured.id})` : ""}, top trending repos, star jumps, and new entrants.`,
      tags: ["github-trending", "open-source", "daily-report"],
    }, body);
  }

  if (mode === "weekly") {
    const week = isoWeek(date);
    const entries = latest.periods?.weekly || [];
    const featured = pickFeatured(entries, repos, previouslyFeaturedSet("weekly"));
    // Biggest star gainers this week from our own snapshot history.
    const gainers = [...repos.values()]
      .map((p) => ({ p, gain: starDelta(p, daysAgo(7), date) }))
      .filter((g) => g.gain !== null && g.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 15);

    const gainersTable = [
      "| Repository | Language | Total stars | Stars gained (7d) |",
      "| --- | --- | --- | --- |",
      ...gainers.map((g) => `| ${repoLink(g.p.id)} | ${g.p.language || "n/a"} | ${fmt(g.p.stars)} | +${fmt(g.gain)} |`),
    ].join("\n");

    const body = [
      `<!-- jules:editorial:start -->`,
      `The week in open source: what developers starred, which projects broke out, and where momentum is building.`,
      `<!-- jules:editorial:end -->`,
      "",
      "## Repository of the week",
      "",
      featuredSection(featured, "repository"),
      "",
      "## Trending this week",
      "",
      trendingTable(entries, repos, "Stars this week"),
      "",
      "## Biggest star gainers (tracked repos, last 7 days)",
      "",
      gainers.length ? gainersTable : "Snapshot history is still accumulating; gainers will appear once at least a week of data exists.",
    ].join("\n");

    writeReport("weekly", week, {
      title: `GitHub Trending Weekly Digest — ${week}`,
      date,
      week,
      type: "weekly",
      featured: featured?.id || "",
      description: `Weekly GitHub trending digest for ${week}: repository of the week${featured ? ` (${featured.id})` : ""}, top weekly trending repositories, and the biggest star gainers.`,
      tags: ["github-trending", "open-source", "weekly-digest", "newsletter"],
    }, body);
  }

  if (mode === "monthly") {
    const month = date.slice(0, 7);
    const entries = latest.periods?.monthly || [];
    const featured = pickFeatured(entries, repos, previouslyFeaturedSet("monthly"));
    const body = [
      `<!-- jules:editorial:start -->`,
      `A monthly view of the repositories that defined the last thirty days in open source.`,
      `<!-- jules:editorial:end -->`,
      "",
      "## Repository of the month",
      "",
      featuredSection(featured, "repository"),
      "",
      "## Trending this month",
      "",
      trendingTable(entries, repos, "Stars this month"),
    ].join("\n");

    writeReport("monthly", month, {
      title: `GitHub Trending Monthly Report — ${month}`,
      date,
      month,
      type: "monthly",
      featured: featured?.id || "",
      description: `Monthly GitHub trending report for ${month}: repository of the month${featured ? ` (${featured.id})` : ""} and the top trending repositories of the month.`,
      tags: ["github-trending", "open-source", "monthly-report"],
    }, body);
  }
}

main();
