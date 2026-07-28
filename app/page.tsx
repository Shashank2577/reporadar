import Link from "next/link";
import type { Metadata } from "next";
import { getAllRepos, getLatestTrending, getReports, topGainers, starDelta, mergedStarHistory, toBrowserRepo } from "@/lib/data";
import { compactNumber, formatDate } from "@/lib/format";
import RepoBrowser from "@/components/RepoBrowser";
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
  const gainers = topGainers(7, 8);
  const mostActive = [...repos]
    .map((r) => ({ r, commits: (r.commitActivity || []).reduce((s, w) => s + w.commits, 0) }))
    .filter((x) => x.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 8)
    .map((x) => x.r);

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
        <RepoBrowser
          repos={daily
            .map((e) => {
              const repo = byId.get(e.repo);
              if (!repo) return null;
              return toBrowserRepo(repo, { rank: e.rank, gain: e.starsGained, gainLabel: "stars today" });
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)}
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        {gainers.length ? (
          <section aria-labelledby="gainers">
            <h2 id="gainers" className="mb-3 text-lg font-semibold">Biggest star gainers this week</h2>
            <ol className="divide-y divide-border rounded-md border border-border">
              {gainers.map(({ repo, gain }, i) => (
                <li key={repo.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/repos/${repo.id}`} className="text-sm font-medium text-accent hover:underline">
                      {repo.id}
                    </Link>
                    <p className="truncate text-xs text-muted">{repo.description}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-success">+{compactNumber(gain)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="most-active">
          <h2 id="most-active" className="mb-3 text-lg font-semibold">Most actively developed</h2>
          <ol className="divide-y divide-border rounded-md border border-border">
            {mostActive.map((repo, i) => {
              const commits = (repo.commitActivity || []).reduce((s, w) => s + w.commits, 0);
              return (
                <li key={repo.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/repos/${repo.id}`} className="text-sm font-medium text-accent hover:underline">
                      {repo.id}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {repo.contributorCount ? `~${compactNumber(repo.contributorCount)} contributors` : ""}
                      {repo.language ? ` · ${repo.language}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{compactNumber(commits)} commits/yr</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section aria-labelledby="latest-reports">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="latest-reports" className="text-lg font-semibold">Latest reports</h2>
          <Link href="/reports" className="text-sm text-accent hover:underline">All reports</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {reports.slice(0, 8).map((r) => (
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
