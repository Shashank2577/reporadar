import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const REPO_DIR = path.join(ROOT, "data", "repos");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
const REPORTS_DIR = path.join(ROOT, "content", "reports");
const BLOG_DIR = path.join(ROOT, "content", "blog");

export type Snapshot = { date: string; stars: number; forks: number };
export type TrendingAppearance = {
  date: string;
  period: "daily" | "weekly" | "monthly";
  rank: number;
  starsGained: number | null;
};
export type Contributor = {
  login: string;
  url: string;
  avatarUrl: string;
  contributions: number;
};
export type UseCase = { title: string; description: string };
export type AiSummary = {
  oneLiner?: string;
  whatItDoes?: string;
  whyItMatters?: string;
  keyFeatures?: string[];
  useCases?: (string | UseCase)[];
  whoIsItFor?: string;
  gettingStarted?: string;
  tags?: string[];
  category?: string;
  source?: string;
  version?: number;
  generatedAt?: string;
};
export type Release = {
  name: string;
  tag: string;
  url: string;
  publishedAt: string;
  prerelease: boolean;
  body: string;
  downloads: number;
  reactions: number;
};
export type RepoIssue = {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  comments: number;
  labels: string[];
  author: string | null;
};
export type Discussion = {
  title: string;
  url: string;
  createdAt: string;
  comments: number;
  category: string | null;
};
export type StarHistory = {
  points: { date: string; stars: number }[];
  source?: string;
  scale?: number;
  partial?: boolean;
  sampledAt: string;
};
export type Community = {
  healthPercentage: number;
  hasCodeOfConduct: boolean;
  hasContributing: boolean;
  hasIssueTemplate: boolean;
  hasPullRequestTemplate: boolean;
};
export type RepoProfile = {
  id: string;
  owner: string;
  ownerAvatarUrl?: string;
  ownerType?: string;
  name: string;
  description: string;
  url: string;
  homepage: string | null;
  license: string | null;
  language: string | null;
  languages?: Record<string, number>;
  topics: string[];
  stars: number;
  forks: number;
  watchers?: number;
  openIssues: number;
  openIssuesOnly?: number;
  openPRs?: number;
  createdAt: string;
  pushedAt: string;
  defaultBranch?: string;
  firstCommitAt?: string;
  commitCount?: number;
  contributorCount?: number;
  contributors?: Contributor[];
  archived?: boolean;
  snapshots: Snapshot[];
  trendingHistory: TrendingAppearance[];
  aiSummary?: AiSummary;
  starHistory?: StarHistory;
  commitActivity?: { week: string; commits: number }[];
  releases?: Release[];
  releaseCount?: number;
  recentIssues?: RepoIssue[];
  discussionsEnabled?: boolean;
  discussionCount?: number;
  discussions?: Discussion[];
  community?: Community;
  fundingLinks?: { platform: string; url: string }[];
  readmeHtml?: string | null;
  updatedAt?: string;
  // Activity and insight surfaces
  contributionDays?: { date: string; count: number }[];
  punchCard?: { day: number; hour: number; commits: number }[];
  codeFrequency?: { week: string; additions: number; deletions: number }[];
  participation?: { all: number; owner: number; community: number };
  recentCommits?: {
    sha: string;
    message: string;
    url: string;
    date: string | null;
    author: string | null;
    avatarUrl: string | null;
  }[];
  recentPulls?: {
    number: number;
    title: string;
    url: string;
    state: string;
    updatedAt: string;
    author: string | null;
    draft: boolean;
  }[];
  workflowRuns?: { name: string; status: string; url: string; branch: string; updatedAt: string }[];
  fileTree?: { name: string; type: string; size: number; url: string }[];
  manifestDependencies?: {
    manifest: string;
    total: number;
    dependencies: { name: string; version: string | null }[];
  };
  branchCount?: number;
  tagCount?: number;
  closedIssues?: number;
  mergedPRs?: number;
  environmentCount?: number;
  isFork?: boolean;
  isInOrganization?: boolean;
  securityPolicyUrl?: string | null;
  codeOfConduct?: { name: string; url: string } | null;
  latestRelease?: { tag: string; publishedAt: string } | null;
};

// Full star curve: backfilled history (from stargazer timestamps) merged with
// our daily snapshots, which take over from the backfill's last point.
export function mergedStarHistory(repo: RepoProfile): { date: string; stars: number }[] {
  const back = repo.starHistory?.points || [];
  const lastBack = back.length ? back[back.length - 1].date : "";
  const snaps = (repo.snapshots || [])
    .filter((s) => s.date > lastBack)
    .map((s) => ({ date: s.date, stars: s.stars }));
  const merged = [...back, ...snaps];
  // Guarantee monotonic non-decreasing dates and dedupe.
  const byDate = new Map<string, number>();
  for (const p of merged) byDate.set(p.date, Math.max(byDate.get(p.date) || 0, p.stars));
  return [...byDate.entries()]
    .map(([date, stars]) => ({ date, stars }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type TrendingEntry = {
  rank: number;
  repo: string;
  description: string;
  language: string | null;
  starsGained: number | null;
};
export type TrendingDay = {
  date: string;
  fetchedAt: string;
  periods: Record<"daily" | "weekly" | "monthly", TrendingEntry[]>;
};

export type Report = {
  slug: string;
  kind: "daily" | "weekly" | "monthly";
  title: string;
  date: string;
  description: string;
  featured: string;
  tags: string[];
  body: string;
};

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

// Fields only the single-repo detail page renders. They make up ~95% of the
// 130+ MB data set, so list/browse pages and the in-memory index drop them;
// getRepo() re-reads the full file for the one page that needs them. Without
// this, every prerender worker held the entire corpus in memory.
const DETAIL_ONLY_FIELDS = [
  "readmeHtml",
  "readmeExcerpt",
  "contributionDays",
  "punchCard",
  "codeFrequency",
  "recentCommits",
  "recentPulls",
  "recentIssues",
  "discussions",
  "releases",
  "fileTree",
  "contributors",
  "manifestDependencies",
] as const;

function slimRepo(profile: RepoProfile): RepoProfile {
  const slim = profile as unknown as Record<string, unknown>;
  for (const key of DETAIL_ONLY_FIELDS) delete slim[key];
  return profile;
}

let repoCache: RepoProfile[] | null = null;
// id -> file of the profile getRepo() serves. A few ids exist in two files
// (upstream renames); like a stars-sorted .find(), the higher-star one wins.
const repoFileById = new Map<string, { file: string; stars: number }>();

export function getAllRepos(): RepoProfile[] {
  if (repoCache) return repoCache;
  if (!fs.existsSync(REPO_DIR)) return [];
  const repos: RepoProfile[] = [];
  for (const f of fs.readdirSync(REPO_DIR)) {
    if (!f.endsWith(".json")) continue;
    const profile = readJson<RepoProfile>(path.join(REPO_DIR, f));
    if (!profile?.id) continue;
    const id = profile.id.toLowerCase();
    const known = repoFileById.get(id);
    if (!known || (profile.stars || 0) > known.stars) repoFileById.set(id, { file: f, stars: profile.stars || 0 });
    repos.push(slimRepo(profile));
  }
  // Newly-discovered stubs (e.g. from the historical trending backfill)
  // don't have `stars` yet until their first facts fetch — treat as 0
  // rather than NaN so they sort predictably to the bottom, not scattered.
  repoCache = repos.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  return repoCache;
}

// Full profile (including detail-only fields), read straight from disk and
// deliberately not cached so it can be garbage-collected after the page renders.
export function getRepo(owner: string, name: string): RepoProfile | null {
  getAllRepos();
  const entry = repoFileById.get(`${owner}/${name}`.toLowerCase());
  if (!entry) return null;
  return readJson<RepoProfile>(path.join(REPO_DIR, entry.file));
}

export function getLatestTrending(): TrendingDay | null {
  if (!fs.existsSync(TRENDING_DIR)) return null;
  const files = fs.readdirSync(TRENDING_DIR).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) return null;
  return readJson<TrendingDay>(path.join(TRENDING_DIR, files[files.length - 1]));
}

export function getAllTrendingDates(): string[] {
  if (!fs.existsSync(TRENDING_DIR)) return [];
  return fs
    .readdirSync(TRENDING_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort((a, b) => b.localeCompare(a));
}

export function getTrendingByDate(date: string): TrendingDay | null {
  return readJson<TrendingDay>(path.join(TRENDING_DIR, `${date}.json`));
}

export function getReports(kind?: Report["kind"]): Report[] {
  const kinds = kind ? [kind] : (["daily", "weekly", "monthly"] as const);
  const reports: Report[] = [];
  for (const k of kinds) {
    const dir = path.join(REPORTS_DIR, k);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      reports.push({
        slug: f.replace(/\.md$/, ""),
        kind: k,
        title: String(data.title || f),
        date: String(data.date || ""),
        description: String(data.description || ""),
        featured: String(data.featured || ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        body: content,
      });
    }
  }
  return reports.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

export function getReport(kind: Report["kind"], slug: string): Report | null {
  return getReports(kind).find((r) => r.slug === slug) || null;
}

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  body: string;
};

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(BLOG_DIR, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: String(data.title || f),
        date: String(data.date || ""),
        description: String(data.description || ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        body: content,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getBlogPost(slug: string): BlogPost | null {
  return getBlogPosts().find((p) => p.slug === slug) || null;
}

// --- Derived views ---------------------------------------------------------

export function starDelta(repo: RepoProfile, days: number): number | null {
  const snaps = repo.snapshots || [];
  if (snaps.length < 2) return null;
  const last = snaps[snaps.length - 1];
  const cutoff = new Date(new Date(last.date).getTime() - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const base = [...snaps].reverse().find((s) => s.date <= cutoff) || snaps[0];
  if (base.date === last.date) return null;
  return last.stars - base.stars;
}

export function topGainers(days: number, limit = 15): { repo: RepoProfile; gain: number }[] {
  return getAllRepos()
    .map((repo) => ({ repo, gain: starDelta(repo, days) ?? 0 }))
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, limit);
}

export function allTopics(): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of getAllRepos()) {
    const tags = new Set([...(r.topics || []), ...(r.aiSummary?.tags || [])]);
    for (const t of tags) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .filter((t) => t.count >= 1)
    .sort((a, b) => b.count - a.count);
}

export function allLanguages(): { language: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of getAllRepos()) {
    if (r.language) counts.set(r.language, (counts.get(r.language) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}

// Only topics with real traction get a page: the long tail (3,800+ topics that
// tag one or two repos) is thin content, and a static export can't render
// pages on demand. The page, the sitemap, and the search index all use this.
export const TOP_TOPICS_LIMIT = 100;

export function topTopics(): { topic: string; count: number }[] {
  return allTopics().slice(0, TOP_TOPICS_LIMIT);
}

export function reposByTopic(topic: string): RepoProfile[] {
  return getAllRepos().filter(
    (r) =>
      (r.topics || []).includes(topic) || (r.aiSummary?.tags || []).includes(topic)
  );
}

import { CATEGORIES } from "@/lib/categories";

export { CATEGORIES };

export function allCategories(): { category: string; title: string; count: number; topRepo: RepoProfile | null }[] {
  const byCategory = new Map<string, RepoProfile[]>();
  for (const r of getAllRepos()) {
    // The model is prompted for one of the fixed keys below but isn't always
    // perfectly compliant; anything outside the known set falls back to
    // "other" so a stray value can never produce a dead category page.
    const c = r.aiSummary?.category && CATEGORIES[r.aiSummary.category] ? r.aiSummary.category : r.aiSummary?.category ? "other" : null;
    if (!c) continue;
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(r);
  }
  return [...byCategory.entries()]
    .map(([category, repos]) => ({
      category,
      title: CATEGORIES[category]?.title || category,
      count: repos.length,
      topRepo: repos[0] || null, // getAllRepos() is already sorted by stars desc
    }))
    .sort((a, b) => b.count - a.count);
}

export function reposByCategory(category: string): RepoProfile[] {
  return getAllRepos().filter((r) => {
    const c = r.aiSummary?.category;
    const normalized = c && CATEGORIES[c] ? c : c ? "other" : null;
    return normalized === category;
  });
}

export function reposByLanguage(language: string): RepoProfile[] {
  return getAllRepos().filter(
    (r) => r.language?.toLowerCase() === language.toLowerCase()
  );
}

export function languageSlug(language: string): string {
  return language.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Slim, client-bundle-friendly shape for list/browse pages — avoids shipping
// the full profile (README HTML, punch card, etc.) to the browser.
export function toBrowserRepo(
  repo: RepoProfile,
  extra?: { rank?: number; gain?: number | null; gainLabel?: string }
) {
  const s = repo.aiSummary;
  return {
    id: repo.id,
    // GitHub's own description, unchanged — this is what the repo actually
    // says about itself and shouldn't be replaced.
    description: repo.description || "",
    // The AI-generated interpretation shown alongside it, not instead of it.
    aiOneLiner: s?.oneLiner,
    aiDetail: s?.source === "llm" ? s.whatItDoes : undefined,
    category: s?.category,
    language: repo.language,
    license: repo.license,
    // Newly-discovered stubs don't have stars/forks until their first facts
    // fetch — default to 0 rather than letting undefined leak into display.
    stars: repo.stars || 0,
    forks: repo.forks || 0,
    tags: [...new Set([...(repo.topics || []), ...(s?.tags || [])])],
    history: mergedStarHistory(repo).slice(-60),
    ...extra,
  };
}
