import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllRepos, getRepo, starDelta, languageSlug, mergedStarHistory } from "@/lib/data";
import { compactNumber, fullNumber, formatDate, repoAge } from "@/lib/format";
import StarHistoryChart from "@/components/StarHistoryChart";
import CommitActivityChart from "@/components/CommitActivityChart";
import ReadmeViewer from "@/components/ReadmeViewer";
import LanguageBar from "@/components/LanguageBar";
import Tag from "@/components/Tag";
import WatchButton from "@/components/WatchButton";
import { absoluteUrl } from "@/lib/site";

type Params = { owner: string; name: string };

export function generateStaticParams(): Params[] {
  return getAllRepos().map((r) => ({ owner: r.owner, name: r.name }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);
  if (!repo) return {};
  const title = `${repo.id}: ${repo.aiSummary?.oneLiner || repo.description || "repository profile"}`.slice(0, 65);
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

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Card({ id, title, meta, children }: { id: string; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-md border border-border">
      <div className="flex items-baseline justify-between border-b border-border bg-surface px-4 py-2.5">
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-xs text-muted">{meta}</span> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default async function RepoPage({ params }: { params: Promise<Params> }) {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);
  if (!repo) notFound();

  const s = repo.aiSummary;
  const history = mergedStarHistory(repo);
  const gainDay = starDelta(repo, 1);
  const gainWeek = starDelta(repo, 7);
  const gainMonth = starDelta(repo, 30);
  const tags = [...new Set([...(repo.topics || []), ...(s?.tags || [])])].slice(0, 12);
  const appearances = [...(repo.trendingHistory || [])].sort((a, b) => b.date.localeCompare(a.date));
  const totalContrib = (repo.contributors || []).reduce((sum, c) => sum + c.contributions, 0);
  const useCases = (s?.useCases || []).map((u) =>
    typeof u === "string" ? { title: u, description: "" } : u
  );

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
    maintainer: {
      "@type": repo.ownerType === "Organization" ? "Organization" : "Person",
      name: repo.owner,
      url: `https://github.com/${repo.owner}`,
    },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: repo.stars },
    ],
  };

  const heroStats: { label: string; value: string; sub?: string }[] = [
    { label: "Stars", value: compactNumber(repo.stars), sub: gainDay ? `+${compactNumber(gainDay)} today` : undefined },
    { label: "Forks", value: compactNumber(repo.forks) },
    { label: "Watchers", value: repo.watchers != null ? compactNumber(repo.watchers) : "n/a" },
    { label: "Open issues", value: compactNumber(repo.openIssuesOnly ?? repo.openIssues) },
    { label: "Open PRs", value: repo.openPRs != null ? compactNumber(repo.openPRs) : "n/a" },
    { label: "Contributors", value: repo.contributorCount ? `~${compactNumber(repo.contributorCount)}` : "n/a" },
  ];

  return (
    <div data-pagefind-body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <header className="rounded-md border border-border bg-surface p-5">
        <p className="text-sm text-muted">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/trending/daily" className="hover:underline">Repositories</Link>
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {repo.ownerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${repo.ownerAvatarUrl}&s=96`} alt="" width={48} height={48} className="mt-1 rounded-md border border-border" />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight break-words">
                <a href={`https://github.com/${repo.owner}`} className="text-accent hover:underline" rel="noopener">{repo.owner}</a>
                <span className="text-muted"> / </span>
                <span data-pagefind-meta="title">{repo.name}</span>
              </h1>
              <p className="mt-1 max-w-2xl">{s?.oneLiner || repo.description}</p>
              <p className="mt-1.5 text-sm text-muted">
                {repo.language ? `${repo.language} · ` : ""}
                {repo.license || "No license"} · created {formatDate(repo.createdAt)} · last push {timeAgo(repo.pushedAt)}
                {repo.archived ? " · ARCHIVED" : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WatchButton repo={{ id: repo.id, description: repo.description, language: repo.language, stars: repo.stars }} />
            <a href={repo.url} rel="noopener" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90">
              Star on GitHub
            </a>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-6">
          {heroStats.map((st) => (
            <div key={st.label} className="bg-background px-3 py-2.5">
              <dt className="text-xs text-muted">{st.label}</dt>
              <dd className="text-lg font-semibold leading-tight">{st.value}</dd>
              {st.sub ? <dd className="text-xs font-medium text-success">{st.sub}</dd> : null}
            </div>
          ))}
        </dl>

        {(gainDay || gainWeek || gainMonth) ? (
          <p className="mt-3 text-sm">
            <span className="text-muted">Momentum:</span>
            {gainDay ? <span className="ml-2 font-medium text-success">+{compactNumber(gainDay)} stars today</span> : null}
            {gainWeek ? <span className="ml-2 font-medium text-success">+{compactNumber(gainWeek)} this week</span> : null}
            {gainMonth ? <span className="ml-2 font-medium text-success">+{compactNumber(gainMonth)} this month</span> : null}
          </p>
        ) : null}
      </header>

      {/* Two-column dashboard */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Card
            id="star-history"
            title="Star history"
            meta={repo.starHistory ? `since ${formatDate(history[0]?.date)}` : undefined}
          >
            <StarHistoryChart points={history} partial={repo.starHistory?.partial} approximate={repo.starHistory?.source === "gharchive-clickhouse"} />
          </Card>

          {s?.whatItDoes ? (
            <Card id="overview" title={`What ${repo.name} does`}>
              <p>{s.whatItDoes}</p>
              {s.whoIsItFor ? <p className="mt-3 text-sm text-muted">{s.whoIsItFor}</p> : null}
              {s.keyFeatures?.length ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {s.keyFeatures.map((f) => {
                    const [head, ...rest] = f.split(":");
                    return (
                      <li key={f} className="rounded-md border border-border bg-surface p-3 text-sm">
                        <span className="font-semibold">{head.trim()}</span>
                        {rest.length ? <span className="text-muted">: {rest.join(":").trim()}</span> : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </Card>
          ) : null}

          {useCases.length ? (
            <Card id="use-cases" title="Where teams use it">
              <div className="grid gap-3 sm:grid-cols-2">
                {useCases.map((u) => (
                  <div key={u.title} className="rounded-md border border-border p-3">
                    <h3 className="text-sm font-semibold">{u.title}</h3>
                    {u.description ? <p className="mt-1 text-sm text-muted">{u.description}</p> : null}
                  </div>
                ))}
              </div>
              {s?.gettingStarted ? (
                <p className="mt-4 border-t border-border pt-3 text-sm">
                  <span className="font-semibold">Getting started: </span>
                  {s.gettingStarted}
                </p>
              ) : null}
            </Card>
          ) : null}

          {repo.commitActivity?.length ? (
            <Card id="commit-activity" title="Commit activity" meta="last 52 weeks">
              <CommitActivityChart weeks={repo.commitActivity} />
            </Card>
          ) : null}

          {repo.readmeHtml ? (
            <Card id="readme" title="README">
              <ReadmeViewer html={repo.readmeHtml} repoUrl={repo.url} />
            </Card>
          ) : null}

          {repo.releases?.length ? (
            <Card
              id="releases"
              title="Releases and announcements"
              meta={repo.releaseCount ? `${fullNumber(repo.releaseCount)} total` : undefined}
            >
              <ol className="space-y-4">
                {repo.releases.map((rel) => (
                  <li key={rel.tag} className="border-l-2 border-border pl-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <a href={rel.url} rel="noopener" className="font-semibold text-accent hover:underline">
                        {rel.name}
                      </a>
                      <span className="font-mono text-xs text-muted">{rel.tag}</span>
                      <span className="text-xs text-muted">{formatDate(rel.publishedAt)}</span>
                      {rel.prerelease ? (
                        <span className="rounded-full border border-attention px-2 py-0.5 text-xs text-attention">pre-release</span>
                      ) : null}
                      {rel.downloads > 0 ? (
                        <span className="text-xs text-muted">{compactNumber(rel.downloads)} downloads</span>
                      ) : null}
                    </div>
                    {rel.body ? (
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">{rel.body}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            {repo.recentIssues?.length ? (
              <Card
                id="issues"
                title="Recent open issues"
                meta={<a href={`${repo.url}/issues`} className="text-accent hover:underline" rel="noopener">all {compactNumber(repo.openIssuesOnly ?? repo.openIssues)}</a>}
              >
                <ul className="space-y-3">
                  {repo.recentIssues.map((i) => (
                    <li key={i.number} className="text-sm">
                      <a href={i.url} rel="noopener" className="font-medium text-accent hover:underline">
                        {i.title}
                      </a>
                      <p className="mt-0.5 text-xs text-muted">
                        #{i.number} · {timeAgo(i.createdAt)}
                        {i.author ? ` · by ${i.author}` : ""}
                        {i.comments ? ` · ${i.comments} comments` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {repo.discussions?.length ? (
              <Card
                id="discussions"
                title="Discussions"
                meta={<a href={`${repo.url}/discussions`} className="text-accent hover:underline" rel="noopener">all {compactNumber(repo.discussionCount || 0)}</a>}
              >
                <ul className="space-y-3">
                  {repo.discussions.map((d) => (
                    <li key={d.url} className="text-sm">
                      <a href={d.url} rel="noopener" className="font-medium text-accent hover:underline">
                        {d.title}
                      </a>
                      <p className="mt-0.5 text-xs text-muted">
                        {d.category ? `${d.category} · ` : ""}
                        {timeAgo(d.createdAt)}
                        {d.comments ? ` · ${d.comments} comments` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>

          {appearances.length ? (
            <Card id="trending-appearances" title="Trending appearances">
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
                  {appearances.slice(0, 15).map((a) => (
                    <tr key={`${a.date}-${a.period}`} className="border-b border-border/60">
                      <td className="py-2 pr-4">{formatDate(a.date)}</td>
                      <td className="py-2 pr-4 capitalize">{a.period}</td>
                      <td className="py-2 pr-4">#{a.rank}</td>
                      <td className="py-2">{a.starsGained ? `+${fullNumber(a.starsGained)}` : "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card id="facts" title="Facts">
            <dl className="space-y-2.5 text-sm">
              {[
                ["License", repo.license || "Unspecified"],
                ["First commit", formatDate(repo.firstCommitAt || repo.createdAt)],
                ["Age", repoAge(repo.createdAt)],
                ["Commits", repo.commitCount ? fullNumber(repo.commitCount) : "n/a"],
                ["Default branch", repo.defaultBranch || "n/a"],
                ["Last push", formatDate(repo.pushedAt)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {repo.community?.healthPercentage != null ? (
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Community health</span>
                  <span className="font-medium">{repo.community.healthPercentage}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${repo.community.healthPercentage}%`,
                      background: repo.community.healthPercentage >= 70 ? "var(--success)" : "var(--attention)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          {repo.languages && Object.keys(repo.languages).length ? (
            <Card id="tech-stack" title="Tech stack">
              <LanguageBar languages={repo.languages} />
              {repo.language ? (
                <p className="mt-3 text-sm text-muted">
                  More{" "}
                  <Link href={`/languages/${languageSlug(repo.language)}`} className="text-accent hover:underline">
                    trending {repo.language} repos
                  </Link>
                </p>
              ) : null}
            </Card>
          ) : null}

          {repo.contributors?.length ? (
            <Card
              id="contributors"
              title="Top contributors"
              meta={repo.contributorCount ? `~${fullNumber(repo.contributorCount)} total` : undefined}
            >
              <ul className="space-y-2.5">
                {repo.contributors.slice(0, 10).map((c) => {
                  const share = totalContrib ? (c.contributions / totalContrib) * 100 : 0;
                  return (
                    <li key={c.login}>
                      <a href={c.url} rel="noopener" className="flex items-center gap-2.5 text-sm hover:underline">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${c.avatarUrl}&s=48`} alt="" width={24} height={24} className="rounded-full" loading="lazy" />
                        <span className="min-w-0 flex-1 truncate font-medium text-accent">{c.login}</span>
                        <span className="text-xs text-muted">{compactNumber(c.contributions)}</span>
                      </a>
                      <div className="ml-[34px] mt-1 h-1 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(share, 2)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <a href={`${repo.url}/graphs/contributors`} rel="noopener" className="mt-3 block text-sm text-accent hover:underline">
                All contributors on GitHub
              </a>
            </Card>
          ) : null}

          {tags.length ? (
            <Card id="topics" title="Topics">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Tag key={t} label={t} href={`/topics/${t}`} />
                ))}
              </div>
            </Card>
          ) : null}

          <Card id="links" title="Links">
            <ul className="space-y-1.5 text-sm">
              <li><a href={repo.url} className="text-accent hover:underline" rel="noopener">Repository</a></li>
              {repo.homepage ? <li><a href={repo.homepage} className="text-accent hover:underline" rel="noopener nofollow">Project homepage</a></li> : null}
              <li><a href={`${repo.url}/releases`} className="text-accent hover:underline" rel="noopener">Releases</a></li>
              <li><a href={`${repo.url}/issues`} className="text-accent hover:underline" rel="noopener">Issues</a></li>
              {repo.discussionsEnabled ? <li><a href={`${repo.url}/discussions`} className="text-accent hover:underline" rel="noopener">Discussions</a></li> : null}
              <li><a href={`https://github.com/${repo.owner}`} className="text-accent hover:underline" rel="noopener">Maintainer: {repo.owner}</a></li>
              {(repo.fundingLinks || []).map((f) => (
                <li key={f.url}>
                  <a href={f.url} className="text-accent hover:underline" rel="noopener nofollow">
                    Sponsor via {f.platform.toLowerCase().replace(/_/g, " ")}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
              Data from the GitHub API, refreshed {formatDate(repo.updatedAt)}.
              {s?.source === "llm" ? " Editorial sections are AI-generated from the README." : ""}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
