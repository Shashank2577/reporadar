import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllTrendingDates, getTrendingByDate, getAllRepos, toBrowserRepo } from "@/lib/data";
import { formatDate } from "@/lib/format";
import RepoBrowser from "@/components/RepoBrowser";
import Blankslate from "@/components/Blankslate";

export function generateStaticParams() {
  return getAllTrendingDates().map((date) => ({ date }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const readable = formatDate(date);
  return {
    title: `What Was Trending on GitHub — ${readable}`,
    description: `The GitHub repositories trending on ${readable}, ranked by stars gained that day.`,
    alternates: { canonical: `/trending/archive/${date}` },
  };
}

export default async function TrendingArchiveDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const dates = getAllTrendingDates();
  if (!dates.includes(date)) notFound();

  const idx = dates.indexOf(date); // dates are sorted newest-first
  const newer = idx > 0 ? dates[idx - 1] : null;
  const older = idx < dates.length - 1 ? dates[idx + 1] : null;

  const trending = getTrendingByDate(date);
  const byId = new Map(getAllRepos().map((r) => [r.id, r]));
  const daily = trending?.periods.daily || [];
  const items = daily
    .map((e) => {
      const repo = byId.get(e.repo);
      if (!repo) return null;
      return toBrowserRepo(repo, { rank: e.rank, gain: e.starsGained, gainLabel: "stars that day" });
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div data-pagefind-body>
      <p className="text-sm text-muted">
        <Link href="/trending/archive" className="hover:underline">Trending archive</Link>
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Trending on {formatDate(date)}
      </h1>
      <nav className="mt-4 flex justify-between text-sm" aria-label="Archive day navigation">
        {older ? (
          <Link href={`/trending/archive/${older}`} className="text-accent hover:underline">
            ← {formatDate(older)}
          </Link>
        ) : <span />}
        {newer ? (
          <Link href={`/trending/archive/${newer}`} className="text-accent hover:underline">
            {formatDate(newer)} →
          </Link>
        ) : <span />}
      </nav>
      <div className="mt-6">
        {items.length ? (
          <RepoBrowser repos={items} />
        ) : (
          <Blankslate heading="No trending data for this day">
            This date has no recorded trending list.
          </Blankslate>
        )}
      </div>
    </div>
  );
}
