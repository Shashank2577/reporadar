import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const REPO_DIR = path.join(ROOT, "data", "repos");
const TRENDING_DIR = path.join(ROOT, "data", "trending");
const REPORTS_DIR = path.join(ROOT, "content", "reports");

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

let repoCache: RepoProfile[] | null = null;

export function getAllRepos(): RepoProfile[] {
  if (repoCache) return repoCache;
  if (!fs.existsSync(REPO_DIR)) return [];
  repoCache = fs
    .readdirSync(REPO_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<RepoProfile>(path.join(REPO_DIR, f)))
    .filter((p): p is RepoProfile => Boolean(p?.id))
    .sort((a, b) => b.stars - a.stars);
  return repoCache;
}

export function getRepo(owner: string, name: string): RepoProfile | null {
  return getAllRepos().find((r) => r.id.toLowerCase() === `${owner}/${name}`.toLowerCase()) || null;
}

export function getLatestTrending(): TrendingDay | null {
  if (!fs.existsSync(TRENDING_DIR)) return null;
  const files = fs.readdirSync(TRENDING_DIR).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) return null;
  return readJson<TrendingDay>(path.join(TRENDING_DIR, files[files.length - 1]));
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

export function reposByTopic(topic: string): RepoProfile[] {
  return getAllRepos().filter(
    (r) =>
      (r.topics || []).includes(topic) || (r.aiSummary?.tags || []).includes(topic)
  );
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
  return {
    id: repo.id,
    description: repo.description || "",
    language: repo.language,
    license: repo.license,
    stars: repo.stars,
    forks: repo.forks,
    tags: [...new Set([...(repo.topics || []), ...(repo.aiSummary?.tags || [])])],
    history: mergedStarHistory(repo).slice(-60),
    ...extra,
  };
}
