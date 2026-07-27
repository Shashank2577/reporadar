// Fetches github.com/trending (daily, weekly, monthly) and writes
// data/trending/<date>.json. GitHub has no official trending API, so this
// parses the public trending page HTML. It degrades gracefully: if a period
// fails to parse, it falls back to the GitHub Search API (recently created
// repos sorted by stars).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, todayUTC } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "data", "trending");

async function fetchTrendingPage(period) {
  const res = await fetch(`https://github.com/trending?since=${period}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; reporadar-pipeline)" },
  });
  if (!res.ok) throw new Error(`trending page ${period}: HTTP ${res.status}`);
  return res.text();
}

function parseTrendingHtml(html) {
  const entries = [];
  // Each repo is an <article class="Box-row"> block.
  const articles = html.split(/<article class="Box-row"/).slice(1);
  for (const chunk of articles) {
    const nameMatch = chunk.match(/href="\/([^"\/]+\/[^"?]+)"[^>]*data-view-component="true"/);
    const hrefMatch = nameMatch || chunk.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/);
    if (!hrefMatch) continue;
    const fullName = hrefMatch[1].trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) continue;
    // Sponsor/login links inside the row are not repositories.
    if (/^(sponsors|login|features|topics|trending)\//.test(fullName)) continue;

    const descMatch = chunk.match(/<p class="col-9[^"]*">\s*([\s\S]*?)\s*<\/p>/);
    const description = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";

    const langMatch = chunk.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : null;

    // "1,234 stars today" / "... stars this week" / "... stars this month"
    const gainMatch = chunk.match(/([\d,]+)\s+stars?\s+(?:today|this week|this month)/);
    const starsGained = gainMatch ? Number(gainMatch[1].replace(/,/g, "")) : null;

    entries.push({ repo: fullName, description, language, starsGained });
  }
  return entries;
}

async function searchFallback(period) {
  const days = period === "daily" ? 7 : period === "weekly" ? 30 : 90;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data } = await ghFetch(
    `/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=25`
  );
  return (data?.items || []).map((r) => ({
    repo: r.full_name,
    description: r.description || "",
    language: r.language,
    starsGained: null,
  }));
}

async function main() {
  const date = todayUTC();
  const result = { date, fetchedAt: new Date().toISOString(), periods: {} };

  for (const period of ["daily", "weekly", "monthly"]) {
    let entries = [];
    try {
      const html = await fetchTrendingPage(period);
      entries = parseTrendingHtml(html);
    } catch (err) {
      console.warn(`Trending scrape failed for ${period}: ${err.message}`);
    }
    if (entries.length === 0) {
      console.warn(`Falling back to search API for ${period}`);
      try {
        entries = await searchFallback(period);
      } catch (err) {
        console.warn(`Search fallback failed for ${period}: ${err.message}`);
      }
    }
    result.periods[period] = entries.map((e, i) => ({ rank: i + 1, ...e }));
    console.log(`${period}: ${entries.length} repos`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${date}.json`), JSON.stringify(result, null, 2));
  console.log(`Wrote data/trending/${date}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
