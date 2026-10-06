import fs from "node:fs";
import path from "node:path";

// Site traffic, written at build time by scripts/fetch-site-stats.mjs from
// PostHog. Absent until the PostHog read key is configured, so every consumer
// treats it as optional and the UI simply omits the numbers.
export type SiteStats = {
  updatedAt: string;
  visits30d: number;
  pageviews30d: number;
  topRepos7d: { id: string; views: number }[];
  repoViews30d: Record<string, number>;
};

const FILE = path.join(process.cwd(), "data", "site-stats.json");
// Show the real number as soon as there is one. (An earlier threshold of 100
// hid it entirely while traffic was small, which nobody had asked for.)
export const MIN_PUBLIC_VISITS = 1;

let cache: SiteStats | null | undefined;

export function getSiteStats(): SiteStats | null {
  if (cache !== undefined) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, "utf8")) as SiteStats;
  } catch {
    cache = null;
  }
  return cache;
}
