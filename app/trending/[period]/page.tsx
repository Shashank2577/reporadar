import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllRepos, getLatestTrending } from "@/lib/data";
import { formatDate } from "@/lib/format";
import RepoCard from "@/components/RepoCard";

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];
const LABELS: Record<Period, { title: string; gain: string; heading: string }> = {
  daily: { title: "Trending GitHub Repositories Today", gain: "stars today", heading: "Trending today" },
  weekly: { title: "Trending GitHub Repositories This Week", gain: "stars this week", heading: "Trending this week" },
  monthly: { title: "Trending GitHub Repositories This Month", gain: "stars this month", heading: "Trending this month" },
};

export function generateStaticParams() {
  return PERIODS.map((period) => ({ period }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ period: string }> }): Promise<Metadata> {
  const { period } = await params;
  const l = LABELS[period as Period];
  if (!l) return {};
  return {
    title: l.title,
    description: `${l.title}: ranked list with total stars, stars gained, language, license, and links to full repository profiles with star history.`,
    alternates: { canonical: `/trending/${period}` },
  };
}

export default async function TrendingPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  if (!PERIODS.includes(period as Period)) notFound();
  const l = LABELS[period as Period];
  const trending = getLatestTrending();
  const entries = trending?.periods[period as Period] || [];
  const byId = new Map(getAllRepos().map((r) => [r.id, r]));

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">
        {l.heading}
        {trending ? <span className="text-muted"> — {formatDate(trending.date)}</span> : null}
      </h1>
      <nav className="mt-4 flex gap-2" aria-label="Trending period">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/trending/${p}`}
            aria-current={p === period ? "page" : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
              p === period ? "border-accent bg-accent text-accent-fg" : "border-border hover:bg-surface"
            }`}
          >
            {p}
          </Link>
        ))}
      </nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {entries.map((e) => {
          const repo = byId.get(e.repo);
          if (!repo) return null;
          return <RepoCard key={e.repo} repo={repo} rank={e.rank} gain={e.starsGained} gainLabel={l.gain} />;
        })}
      </div>
      {!entries.length ? (
        <p className="mt-6 text-muted">No trending data collected yet. The pipeline runs twice daily.</p>
      ) : null}
    </div>
  );
}
