import fs from "node:fs";
import path from "node:path";
import { getAllRepos, type RepoProfile } from "@/lib/data";

// Featured projects: approved by a maintainer (see scripts/process-feature-requests.mjs),
// shown for a limited window, and always labelled. They never affect any ranking.
export type FeaturedEntry = {
  id: string;
  since: string;
  until: string;
  pitch: string;
  sponsored: boolean;
  issue?: number;
};
export type FeaturedProject = FeaturedEntry & { repo: RepoProfile };

const FILE = path.join(process.cwd(), "data", "featured.json");
const MAX_SHOWN = 6;

export function getFeatured(today = new Date().toISOString().slice(0, 10)): FeaturedProject[] {
  let entries: FeaturedEntry[] = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    return [];
  }
  const byId = new Map(getAllRepos().map((r) => [r.id.toLowerCase(), r]));
  return entries
    .filter((e) => e.since <= today && today <= e.until)
    .map((e) => ({ ...e, repo: byId.get(e.id.toLowerCase()) }))
    .filter((e): e is FeaturedProject => Boolean(e.repo))
    .sort((a, b) => b.since.localeCompare(a.since))
    .slice(0, MAX_SHOWN);
}
