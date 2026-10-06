// Reads traffic from PostHog's query API and writes data/site-stats.json for
// the build (visit count, most-viewed repos this week, per-repo views).
//
// Needs POSTHOG_PERSONAL_API_KEY (a personal API key with "query:read") and
// POSTHOG_PROJECT_ID. Without them it does nothing and exits 0, so the site
// builds without stats. Not committed: it is regenerated on every deploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "site-stats.json");
const HOST = (process.env.POSTHOG_API_HOST || "https://us.posthog.com").replace(/\/$/, "");
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID;

async function hogql(query) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (!Array.isArray(json.results)) throw new Error("PostHog returned no results array");
  return json.results;
}

// /repos/owner/name -> owner/name (ignores anything that is not a profile page)
export function repoIdFromPath(p) {
  const m = /^\/repos\/([\w.-]+)\/([\w.-]+)\/?$/.exec(String(p || ""));
  return m ? `${m[1]}/${m[2]}` : null;
}

export async function collect() {
  const [[pageviews, visits]] = await hogql(
    `SELECT count() AS pageviews, uniq(properties.$session_id) AS visits
     FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY`
  );
  const rows = await hogql(
    `SELECT properties.$pathname AS path, countIf(timestamp >= now() - INTERVAL 7 DAY) AS views7, count() AS views30
     FROM events
     WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY AND properties.$pathname LIKE '/repos/%/%'
     GROUP BY path ORDER BY views7 DESC, views30 DESC LIMIT 500`
  );
  const repoViews30d = {};
  const top = [];
  for (const [p, v7, v30] of rows) {
    const id = repoIdFromPath(p);
    if (!id) continue;
    repoViews30d[id] = (repoViews30d[id] || 0) + Number(v30);
    if (Number(v7) > 0) top.push({ id, views: Number(v7) });
  }
  const merged = new Map();
  for (const t of top) merged.set(t.id, (merged.get(t.id) || 0) + t.views);
  return {
    updatedAt: new Date().toISOString(),
    visits30d: Number(visits) || 0,
    pageviews30d: Number(pageviews) || 0,
    topRepos7d: [...merged].map(([id, views]) => ({ id, views })).sort((a, b) => b.views - a.views).slice(0, 12),
    repoViews30d,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!KEY || !PROJECT) {
    console.log("POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set; skipping site stats.");
    process.exit(0);
  }
  try {
    const stats = await collect();
    fs.writeFileSync(OUT, JSON.stringify(stats));
    console.log(`Site stats: ${stats.visits30d} visits, ${stats.pageviews30d} pageviews (30d), ${stats.topRepos7d.length} top repos`);
  } catch (err) {
    // Stats are decoration: never fail a deploy over them.
    console.warn(`Could not fetch site stats: ${err.message}`);
  }
}
