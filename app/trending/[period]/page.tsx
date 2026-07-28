import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllRepos, getLatestTrending, toBrowserRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import RepoBrowser from "@/components/RepoBrowser";
import Blankslate from "@/components/Blankslate";
import { itemListJsonLd } from "@/lib/site";

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

  const items = entries
    .map((e) => {
      const repo = byId.get(e.repo);
      if (!repo) return null;
      return toBrowserRepo(repo, { rank: e.rank, gain: e.starsGained, gainLabel: l.gain });
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div data-pagefind-body>
      {items.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(l.title, items.map((r) => r.id))) }}
        />
      ) : null}
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
      <div className="mt-6">
        {items.length ? (
          <RepoBrowser repos={items} />
        ) : (
          <Blankslate heading="No trending data for this period yet" actionLabel="See the reports archive" actionHref="/reports">
            The pipeline collects trending lists twice a day; this list fills in on the next run.
          </Blankslate>
        )}
      </div>
    </div>
  );
}
