// Writes the static JSON the MCP endpoint (functions/api/mcp.ts) reads at
// request time. Pages Functions have no filesystem, so instead of bundling
// the 130+ MB data set, the MCP endpoint fetches these small files from the
// deployed site's own static assets. Runs after `next build`, into out/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = path.join(ROOT, "out", "mcp-data");

function writeJson(rel, value) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

fs.rmSync(OUT, { recursive: true, force: true });

// Repos: only the fields the MCP tools return, sorted by stars.
const repoDir = path.join(ROOT, "data", "repos");
const repos = [];
for (const f of fs.readdirSync(repoDir).filter((f) => f.endsWith(".json"))) {
  let r;
  try {
    r = JSON.parse(fs.readFileSync(path.join(repoDir, f), "utf8"));
  } catch {
    continue;
  }
  if (!r?.id) continue;
  repos.push({
    id: r.id,
    description: r.description,
    stars: r.stars || 0,
    forks: r.forks || 0,
    language: r.language,
    license: r.license,
    topics: r.topics,
    oneLiner: r.aiSummary?.oneLiner,
    whatItDoes: r.aiSummary?.whatItDoes,
    useCases: r.aiSummary?.useCases,
    whoIsItFor: r.aiSummary?.whoIsItFor,
    gettingStarted: r.aiSummary?.gettingStarted,
    category: r.aiSummary?.category,
  });
}
repos.sort((a, b) => b.stars - a.stars);
writeJson("repos.json", repos);

// Trending: one file per day plus a newest-first index.
const trendingDir = path.join(ROOT, "data", "trending");
const dates = fs
  .readdirSync(trendingDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort((a, b) => b.localeCompare(a));
for (const d of dates) {
  fs.mkdirSync(path.join(OUT, "trending"), { recursive: true });
  fs.copyFileSync(path.join(trendingDir, `${d}.json`), path.join(OUT, "trending", `${d}.json`));
}
writeJson("trending/index.json", dates);

// Reports: one file per report plus a newest-first index per kind.
const index = { daily: [], weekly: [], monthly: [] };
for (const kind of Object.keys(index)) {
  const dir = path.join(ROOT, "content", "reports", kind);
  if (!fs.existsSync(dir)) continue;
  const reports = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        kind,
        title: String(data.title || f),
        date: String(data.date || ""),
        description: String(data.description || ""),
        featured: String(data.featured || ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        body: content,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
  for (const r of reports) writeJson(`reports/${kind}/${r.slug}.json`, r);
  index[kind] = reports.map((r) => r.slug);
}
writeJson("reports/index.json", index);

console.log(`MCP data: ${repos.length} repos, ${dates.length} trending days, ${Object.values(index).flat().length} reports`);
