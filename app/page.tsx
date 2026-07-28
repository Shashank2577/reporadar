import Link from "next/link";
import type { Metadata } from "next";
import { getAllRepos, getLatestTrending, getReports, topGainers, starDelta, mergedStarHistory, toBrowserRepo, allCategories, CATEGORIES } from "@/lib/data";
import { compactNumber } from "@/lib/format";
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
  const categories = allCategories();
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
          Find the best open-source projects, by category
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          {site.name} tracks {repos.length}+ trending GitHub repositories across {categories.length}{" "}
          categories, twice a day: star history, unusual star jumps, licenses, tech stacks,
          contributors, and what each project is actually for. Looking for what&apos;s new today
          instead? See what&apos;s{" "}
          <Link href="/trending/daily" className="text-accent hover:underline">
            trending right now
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="categories">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="categories" className="text-lg font-semibold">Browse by category</h2>
          <Link href="/categories" className="text-sm text-accent hover:underline">All categories</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/categories/${c.category}`}
              className="rounded-md border border-border p-4 hover:border-accent"
            >
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{CATEGORIES[c.category]?.description}</p>
              <p className="mt-2 text-xs text-muted">
                {c.count} {c.count === 1 ? "repository" : "repositories"}
                {c.topRepo ? ` · top: ${c.topRepo.id}` : ""}
              </p>
            </Link>
          ))}
        </div>
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
