import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllRepos, getRepo, starDelta, languageSlug } from "@/lib/data";
import { compactNumber, fullNumber, formatDate, repoAge } from "@/lib/format";
import StarChart from "@/components/StarChart";
import LanguageBar from "@/components/LanguageBar";
import Tag from "@/components/Tag";
import WatchButton from "@/components/WatchButton";
import { absoluteUrl, site } from "@/lib/site";

type Params = { owner: string; name: string };

export function generateStaticParams(): Params[] {
  return getAllRepos().map((r) => ({ owner: r.owner, name: r.name }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);
  if (!repo) return {};
  const title = `${repo.id}: ${repo.description || "GitHub repository profile"}`.slice(0, 65);
  const description =
    `${repo.id} — ${compactNumber(repo.stars)} stars, ${repo.language || "multi-language"}, ${repo.license || "unspecified"} license. ` +
    `${(repo.aiSummary?.whatItDoes || repo.description || "").slice(0, 90)}`;
  return {
    title,
    description,
    alternates: { canonical: `/repos/${repo.id}` },
    openGraph: { title, description, type: "article", url: absoluteUrl(`/repos/${repo.id}`) },
  };
}

export default async function RepoPage({ params }: { params: Promise<Params> }) {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);
  if (!repo) notFound();

  const s = repo.aiSummary;
  const gainDay = starDelta(repo, 1);
  const gainWeek = starDelta(repo, 7);
  const gainMonth = starDelta(repo, 30);
  const tags = [...new Set([...(repo.topics || []), ...(s?.tags || [])])].slice(0, 12);
  const appearances = [...(repo.trendingHistory || [])].sort((a, b) => b.date.localeCompare(a.date));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: repo.name,
    alternateName: repo.id,
    description: repo.description || undefined,
    codeRepository: repo.url,
    url: absoluteUrl(`/repos/${repo.id}`),
    programmingLanguage: repo.language || undefined,
    license: repo.license ? `https://spdx.org/licenses/${repo.license}` : undefined,
    dateCreated: repo.createdAt,
    dateModified: repo.pushedAt,
    keywords: tags.join(", ") || undefined,
    maintainer: { "@type": repo.ownerType === "Organization" ? "Organization" : "Person", name: repo.owner, url: `https://github.com/${repo.owner}` },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: repo.stars },
    ],
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: site.name, item: site.url },
      { "@type": "ListItem", position: 2, name: "Repositories", item: absoluteUrl("/trending/daily") },
      { "@type": "ListItem", position: 3, name: repo.id, item: absoluteUrl(`/repos/${repo.id}`) },
    ],
  };

  const stats: [string, string][] = [
    ["Stars", fullNumber(repo.stars)],
    ["Forks", fullNumber(repo.forks)],
    ["Open issues", fullNumber(repo.openIssues)],
    ["Contributors", repo.contributorCount ? `~${fullNumber(repo.contributorCount)}` : "n/a"],
    ["Commits", repo.commitCount ? `~${fullNumber(repo.commitCount)}` : "n/a"],
    ["License", repo.license || "Unspecified"],
    ["First commit", formatDate(repo.firstCommitAt || repo.createdAt)],
    ["Age", repoAge(repo.createdAt)],
    ["Last push", formatDate(repo.pushedAt)],
  ];

  return (
    <article className="mx-auto max-w-4xl" data-pagefind-body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <header>
        <p className="text-sm text-muted">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/trending/daily" className="hover:underline">Repositories</Link>
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            <a href={`https://github.com/${repo.owner}`} className="text-accent hover:underline" rel="noopener">
              {repo.owner}
            </a>
            <span className="text-muted"> / </span>
            <span data-pagefind-meta="title">{repo.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            <WatchButton repo={{ id: repo.id, description: repo.description, language: repo.language, stars: repo.stars }} />
            <a
              href={repo.url}
              rel="noopener"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              View on GitHub
            </a>
          </div>
        </div>
        {repo.description ? <p className="mt-2 max-w-3xl text-muted">{repo.description}</p> : null}
        {repo.archived ? (
          <p className="mt-2 inline-block rounded-md border border-attention px-2 py-0.5 text-xs text-attention">
            This repository is archived and read-only.
          </p>
        ) : null}
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Tag key={t} label={t} href={`/topics/${t}`} />
            ))}
          </div>
        ) : null}
      </header>

      <section aria-labelledby="stats" className="mt-8">
        <h2 id="stats" className="sr-only">Key statistics</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-background p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {(gainDay || gainWeek || gainMonth) ? (
          <p className="mt-3 text-sm text-muted">
            Recent momentum:
            {gainDay ? <span className="ml-2 font-medium text-success">+{compactNumber(gainDay)} stars/day</span> : null}
            {gainWeek ? <span className="ml-2 font-medium text-success">+{compactNumber(gainWeek)}/week</span> : null}
            {gainMonth ? <span className="ml-2 font-medium text-success">+{compactNumber(gainMonth)}/month</span> : null}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="star-history" className="mt-10">
        <h2 id="star-history" className="mb-3 text-lg font-semibold">Star history</h2>
        <StarChart snapshots={repo.snapshots} />
      </section>

      {s?.whatItDoes ? (
        <section aria-labelledby="what-it-does" className="mt-10 space-y-3">
          <h2 id="what-it-does" className="text-lg font-semibold">What {repo.name} does</h2>
          <p>{s.whatItDoes}</p>
          {s.whyItMatters ? <p>{s.whyItMatters}</p> : null}
        </section>
      ) : null}

      {s?.useCases?.length ? (
        <section aria-labelledby="use-cases" className="mt-10">
          <h2 id="use-cases" className="mb-3 text-lg font-semibold">Intended use cases</h2>
          <ul className="list-disc space-y-1 pl-6">
            {s.useCases.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {s?.gettingStarted ? (
        <section aria-labelledby="getting-started" className="mt-10">
          <h2 id="getting-started" className="mb-3 text-lg font-semibold">Getting started</h2>
          <p>{s.gettingStarted}</p>
          <p className="mt-2 text-sm text-muted">
            Full installation and usage instructions live in the{" "}
            <a href={repo.url} className="text-accent hover:underline" rel="noopener">project README</a>.
          </p>
        </section>
      ) : null}

      {repo.languages && Object.keys(repo.languages).length ? (
        <section aria-labelledby="tech-stack" className="mt-10">
          <h2 id="tech-stack" className="mb-3 text-lg font-semibold">Tech stack</h2>
          <LanguageBar languages={repo.languages} />
          {repo.language ? (
            <p className="mt-3 text-sm text-muted">
              Primary language:{" "}
              <Link href={`/languages/${languageSlug(repo.language)}`} className="text-accent hover:underline">
                {repo.language}
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {appearances.length ? (
        <section aria-labelledby="trending-appearances" className="mt-10">
          <h2 id="trending-appearances" className="mb-3 text-lg font-semibold">Trending appearances</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">List</th>
                <th className="py-2 pr-4 font-medium">Rank</th>
                <th className="py-2 font-medium">Stars gained</th>
              </tr>
            </thead>
            <tbody>
              {appearances.slice(0, 20).map((a) => (
                <tr key={`${a.date}-${a.period}`} className="border-b border-border/60">
                  <td className="py-2 pr-4">{formatDate(a.date)}</td>
                  <td className="py-2 pr-4 capitalize">{a.period}</td>
                  <td className="py-2 pr-4">#{a.rank}</td>
                  <td className="py-2">{a.starsGained ? `+${fullNumber(a.starsGained)}` : "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {repo.contributors?.length ? (
        <section aria-labelledby="contributors" className="mt-10">
          <h2 id="contributors" className="mb-3 text-lg font-semibold">Top contributors</h2>
          <ul className="flex flex-wrap gap-3">
            {repo.contributors.map((c) => (
              <li key={c.login}>
                <a href={c.url} rel="noopener" className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${c.avatarUrl}&s=40`} alt="" width={20} height={20} className="rounded-full" loading="lazy" />
                  {c.login}
                  <span className="text-xs text-muted">{compactNumber(c.contributions)}</span>
                </a>
              </li>
            ))}
          </ul>
          {repo.contributorCount ? (
            <p className="mt-2 text-sm text-muted">
              Roughly {fullNumber(repo.contributorCount)} people have contributed.{" "}
              <a href={`${repo.url}/graphs/contributors`} className="text-accent hover:underline" rel="noopener">
                See all contributors on GitHub
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="links" className="mt-10">
        <h2 id="links" className="mb-3 text-lg font-semibold">Links</h2>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          <li><a href={repo.url} className="text-accent hover:underline" rel="noopener">Repository on GitHub</a></li>
          {repo.homepage ? (
            <li><a href={repo.homepage} className="text-accent hover:underline" rel="noopener nofollow">Project homepage</a></li>
          ) : null}
          <li><a href={`${repo.url}/issues`} className="text-accent hover:underline" rel="noopener">Issues</a></li>
          <li><a href={`${repo.url}/releases`} className="text-accent hover:underline" rel="noopener">Releases</a></li>
          <li><a href={`https://github.com/${repo.owner}`} className="text-accent hover:underline" rel="noopener">Maintainer profile: {repo.owner}</a></li>
        </ul>
        <p className="mt-4 text-xs text-muted">
          Data from the GitHub API, last refreshed {formatDate(repo.updatedAt)}.
          {s?.source === "llm" ? " Editorial sections are AI-generated and reviewed via pull request." : ""}
        </p>
      </section>
    </article>
  );
}
