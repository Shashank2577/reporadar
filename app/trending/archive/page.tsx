import Link from "next/link";
import type { Metadata } from "next";
import { getAllTrendingDates } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Trending Archive",
  description:
    "What was trending on GitHub on any given day, going back over the site's tracked history — reconstructed from public GitHub star-event data.",
  alternates: { canonical: "/trending/archive" },
};

export default function TrendingArchivePage() {
  const dates = getAllTrendingDates();
  const byMonth = new Map<string, string[]>();
  for (const d of dates) {
    const month = d.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(d);
  }

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Trending archive</h1>
      <p className="mt-2 max-w-2xl text-muted">
        What was trending on any specific day, going back through {dates.length} days of history.
        Recent days are the real daily/weekly/monthly scrape from GitHub&apos;s trending page;
        older days are reconstructed from public star-event data (daily ranking only — GitHub
        itself keeps no trending history to scrape).
      </p>
      <div className="mt-6 space-y-6">
        {[...byMonth.entries()].map(([month, days]) => (
          <section key={month}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => (
                <Link
                  key={d}
                  href={`/trending/archive/${d}`}
                  className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-accent hover:bg-border/40"
                >
                  {formatDate(d)}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
