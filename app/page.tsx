import Link from "next/link";
import type { Metadata } from "next";
import { getAllRepos, getLatestTrending, getReports, topGainers, starDelta, mergedStarHistory } from "@/lib/data";
import { compactNumber, formatDate } from "@/lib/format";
import RepoCard from "@/components/RepoCard";
import NewsletterForm from "@/components/NewsletterForm";
import StarHistoryChart from "@/components/StarHistoryChart";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `${site.name} — GitHub Trending Repositories, Star History and Daily Reports`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const repos = getAllRepos();
  const byId = new Map(repos.map((r) => [r.id, r]));
  const trending = getLatestTrending();
  const daily = trending?.periods.daily || [];
  const reports = getReports();
  const latestDaily = reports.find((r) => r.kind === "daily");
  const featured = latestDaily?.featured ? byId.get(latestDaily.featured) : byId.get(daily[0]?.repo);
  const gainers = topGainers(7, 5);

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          What the open-source world is starring
          {trending ? <span className="text-muted"> — {formatDate(trending.date)}</span> : null}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          {site.name} tracks trending GitHub repositories twice a day: star history, unusual star
          jumps, licenses, tech stacks, contributors, and what each project is actually for.
        </p>
      </section>

      {featured ? (
        <section aria-labelledby="rotd">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="rotd" className="text-lg font-semibold">Repository of the day</h2>
            {latestDaily ? (
              <Link href={`/reports/daily/${latestDaily.slug}`} className="text-sm text-accent hover:underline">
                Read today&apos;s full report
              </Link>
            ) : null}
          </div>
          <div className="rounded-md border border-border bg-surface p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold">
                  <Link href={`/repos/${featured.id}`} className="text-accent hover:underline">
                    {featured.id}
                  </Link>
                </h3>
                <p className="mt-2">{featured.aiSummary?.whatItDoes || featured.description}</p>
                <p className="mt-3 text-sm text-muted">
                  {compactNumber(featured.stars)} stars
                  {starDelta(featured, 1) ? (
                    <span className="font-medium text-success"> (+{compactNumber(starDelta(featured, 1))} today)</span>
                  ) : null}
                  {featured.language ? ` · ${featured.language}` : ""}
                  {featured.license ? ` · ${featured.license}` : ""}
                </p>
                <Link
                  href={`/repos/${featured.id}`}
                  className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
                >
                  Full profile: star history, README, releases
                </Link>
              </div>
              <div className="min-w-0">
                <StarHistoryChart points={mergedStarHistory(featured)} partial={featured.starHistory?.partial} approximate={featured.starHistory?.source === "gharchive-clickhouse"} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="trending-today">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="trending-today" className="text-lg font-semibold">Trending today</h2>
          <Link href="/trending/daily" className="text-sm text-accent hover:underline">
            All periods: day, week, month
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daily.slice(0, 9).map((e) => {
            const repo = byId.get(e.repo);
            if (!repo) return null;
            return (
              <RepoCard key={e.repo} repo={repo} rank={e.rank} gain={e.starsGained} gainLabel="stars today" />
            );
          })}
        </div>
      </section>

      {gainers.length ? (
        <section aria-labelledby="gainers">
          <h2 id="gainers" className="mb-3 text-lg font-semibold">Biggest star gainers this week</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {gainers.map(({ repo, gain }) => (
              <li key={repo.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/repos/${repo.id}`} className="font-medium text-accent hover:underline">
                    {repo.id}
                  </Link>
                  <p className="truncate text-sm text-muted">{repo.description}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-success">+{compactNumber(gain)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="latest-reports">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="latest-reports" className="text-lg font-semibold">Latest reports</h2>
          <Link href="/reports" className="text-sm text-accent hover:underline">All reports</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.slice(0, 6).map((r) => (
            <li key={`${r.kind}-${r.slug}`} className="rounded-md border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted">{r.kind} report</p>
              <Link href={`/reports/${r.kind}/${r.slug}`} className="mt-1 block font-medium text-accent hover:underline">
                {r.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="newsletter" className="rounded-md border border-border bg-surface p-6">
        <h2 id="newsletter" className="text-lg font-semibold">The weekly digest, in your inbox</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          One email a week: repository of the week, the biggest star gainers, and new projects worth
          watching. No spam, unsubscribe anytime.
        </p>
        <NewsletterForm />
      </section>
    </div>
  );
}
