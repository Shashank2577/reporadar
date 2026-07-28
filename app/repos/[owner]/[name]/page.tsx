import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllRepos, getRepo, starDelta, languageSlug, mergedStarHistory } from "@/lib/data";
import { awardsFor } from "@/lib/awards";
import { compactNumber, fullNumber, formatDate, repoAge } from "@/lib/format";
import StarHistoryChart from "@/components/StarHistoryChart";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import PunchCard from "@/components/PunchCard";
import CodeFrequencyChart from "@/components/CodeFrequencyChart";
import CommitActivityChart from "@/components/CommitActivityChart";
import ActivityFeed from "@/components/ActivityFeed";
import ReadmeViewer from "@/components/ReadmeViewer";
import LanguageBar from "@/components/LanguageBar";
import FileTree from "@/components/FileTree";
import Contributors from "@/components/Contributors";
import AwardList from "@/components/AwardList";
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

function Card({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-20 rounded-md border border-border">
      <div className="flex items-baseline justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        {meta ? <span className="shrink-0 text-xs text-muted">{meta}</span> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CounterTab({ label, count, href }: { label: string; count?: number | null; href: string }) {
  return (
    <a href={href} rel="noopener" className="flex items-center gap-1.5">
      {label}
      {count != null ? (
        <span className="rounded-full bg-surface px-1.5 text-xs tabular-nums text-muted">{compactNumber(count)}</span>
      ) : null}
    </a>
  );
}

export default async function RepoPage({ params }: { params: Promise<Params> }) {
  const { owner, name } = await params;
  const repo = getRepo(owner, name);
  if (!repo) notFound();

  const allRepos = getAllRepos();
  const s = repo.aiSummary;
  const history = mergedStarHistory(repo);
  const awards = awardsFor(repo, allRepos);
  const gainDay = starDelta(repo, 1);
  const gainWeek = starDelta(repo, 7);
  const gainMonth = starDelta(repo, 30);
  const tags = [...new Set([...(repo.topics || []), ...(s?.tags || [])])].slice(0, 14);
  const appearances = [...(repo.trendingHistory || [])].sort((a, b) => b.date.localeCompare(a.date));
  const useCases = (s?.useCases || []).map((u) => (typeof u === "string" ? { title: u, description: "" } : u));
  const related = allRepos
    .filter((r) => r.id !== repo.id && (r.language === repo.language || r.topics?.some((t) => repo.topics?.includes(t))))
    .slice(0, 6);

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
    { label: "Commits", value: repo.commitCount ? compactNumber(repo.commitCount) : "n/a" },
    { label: "Branches", value: repo.branchCount != null ? compactNumber(repo.branchCount) : "n/a" },
  ];

  return (
    <div data-pagefind-body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Repo header, in GitHub's shape */}
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {repo.ownerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${repo.ownerAvatarUrl}&s=96`} alt="" width={40} height={40} className="mt-0.5 rounded-md border border-border" />
            ) : null}
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                <a href={`https://github.com/${repo.owner}`} className="text-accent hover:underline" rel="noopener">
                  {repo.owner}
                </a>
                <span className="text-muted">/</span>
                <span data-pagefind-meta="title">{repo.name}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted">
                  {repo.isFork ? "Fork" : "Public"}
                </span>
                {repo.archived ? (
                  <span className="rounded-full border border-attention bg-attention-subtle px-2 py-0.5 text-xs font-normal text-attention">
                    Archived
                  </span>
                ) : null}
              </h1>
              {repo.description ? <p className="mt-1.5 max-w-3xl text-sm">{repo.description}</p> : null}
              {s?.oneLiner ? (
                <p className="mt-1 max-w-3xl text-sm text-muted">
                  <span className="font-medium text-foreground">AI summary: </span>
                  {s.oneLiner}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <WatchButton repo={{ id: repo.id, description: repo.description, language: repo.language, stars: repo.stars }} />
            <a
              href={repo.url}
              rel="noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-border/40"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.5-2.69-.96-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.65-.89-2.65-2.36 0-.7.25-1.28.66-1.73-.09-.22-.29-.79.06-1.56 0 0 .54-.17 1.77.66a5.6 5.6 0 0 1 1.6-.22c.55 0 1.1.07 1.61.22 1.22-.83 1.76-.66 1.76-.66.35.77.15 1.34.07 1.56.41.45.65 1.03.65 1.73 0 1.48-.87 2.16-2.66 2.36.28.24.52.71.52 1.44l-.01 2.13c0 .21.14.46.55.38A8 8 0 0 0 8 0Z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>

        {/* GitHub-style counter tab bar */}
        <nav className="tabnav mt-4" aria-label="Repository sections on GitHub">
          <a href="#overview" aria-current="page">Overview</a>
          <a href="#activity">Activity</a>
          <a href="#insights">Insights</a>
          <CounterTab label="Issues" count={repo.openIssuesOnly ?? repo.openIssues} href={`${repo.url}/issues`} />
          <CounterTab label="Pull requests" count={repo.openPRs} href={`${repo.url}/pulls`} />
          {repo.discussionsEnabled ? (
            <CounterTab label="Discussions" count={repo.discussionCount} href={`${repo.url}/discussions`} />
          ) : null}
          <CounterTab label="Releases" count={repo.releaseCount} href={`${repo.url}/releases`} />
          <CounterTab label="Tags" count={repo.tagCount} href={`${repo.url}/tags`} />
        </nav>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4 xl:grid-cols-8">
          {heroStats.map((st) => (
            <div key={st.label} className="bg-background px-3 py-2.5">
              <dt className="text-xs text-muted">{st.label}</dt>
              <dd className="text-lg font-semibold leading-tight tabular-nums">{st.value}</dd>
              {st.sub ? <dd className="text-xs font-medium text-success">{st.sub}</dd> : null}
            </div>
          ))}
        </dl>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {repo.language ? (
            <span>
              <Link href={`/languages/${languageSlug(repo.language)}`} className="text-accent hover:underline">
                {repo.language}
              </Link>
            </span>
          ) : null}
          <span>{repo.license || "No license"}</span>
          <span>Created {formatDate(repo.createdAt)}</span>
          <span>Last push {timeAgo(repo.pushedAt)}</span>
          {repo.latestRelease ? <span>Latest release {repo.latestRelease.tag}</span> : null}
          {gainWeek ? <span className="font-medium text-success">+{compactNumber(gainWeek)} stars this week</span> : null}
          {gainMonth ? <span className="font-medium text-success">+{compactNumber(gainMonth)} this month</span> : null}
        </p>
      </header>

      {/* Wide dashboard grid — main column plus right rail */}
      <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5" id="overview">
          <Card id="star-history" title="Star history" meta={history.length ? `since ${formatDate(history[0]?.date)}` : undefined}>
            <StarHistoryChart
              points={history}
              partial={repo.starHistory?.partial}
              approximate={repo.starHistory?.source === "gharchive-clickhouse"}
            />
          </Card>

          {repo.contributionDays?.length ? (
            <Card id="contributions" title="Contribution activity" meta="commits per day, last 52 weeks">
              <ContributionHeatmap days={repo.contributionDays} />
            </Card>
          ) : null}

          {awards.length ? (
            <Card id="awards" title="Signals and awards" meta="derived from tracked data">
              <AwardList awards={awards} />
            </Card>
          ) : null}

          {s?.whatItDoes ? (
            <Card id="what-it-does" title={`What ${repo.name} does`}>
              <p>{s.whatItDoes}</p>
              {s.whoIsItFor ? <p className="mt-3 text-sm text-muted">{s.whoIsItFor}</p> : null}
              {s.keyFeatures?.length ? (
                <ul className="mt-4 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
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
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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

          {repo.readmeHtml ? (
            <Card id="readme" title="README" meta={repo.defaultBranch ? `${repo.defaultBranch} branch` : undefined}>
              <ReadmeViewer html={repo.readmeHtml} repoUrl={repo.url} />
            </Card>
          ) : null}

          {/* Activity */}
          <div id="activity" className="grid gap-5 lg:grid-cols-2">
            <Card id="recent-activity" title="Recent activity" meta="commits and pull requests">
              <ActivityFeed repo={repo} />
            </Card>
            <div className="space-y-5">
              {repo.recentIssues?.length ? (
                <Card
                  id="issues"
                  title="Recent open issues"
                  meta={
                    <a href={`${repo.url}/issues`} className="text-accent hover:underline" rel="noopener">
                      view all
                    </a>
                  }
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
                        {i.labels?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {i.labels.map((l) => (
                              <span key={l} className="rounded-full border border-border px-1.5 text-xs text-muted">
                                {l}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {repo.discussions?.length ? (
                <Card
                  id="discussions"
                  title="Discussions"
                  meta={
                    <a href={`${repo.url}/discussions`} className="text-accent hover:underline" rel="noopener">
                      all {compactNumber(repo.discussionCount || 0)}
                    </a>
                  }
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
          </div>

          {repo.releases?.length ? (
            <Card
              id="releases"
              title="Releases and announcements"
              meta={repo.releaseCount ? `${fullNumber(repo.releaseCount)} total` : undefined}
            >
              <ol className="grid gap-4 lg:grid-cols-2">
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
                      <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{rel.body}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {/* Insights */}
          <div id="insights" className="grid gap-5 lg:grid-cols-2">
            {repo.codeFrequency?.length ? (
              <Card id="code-frequency" title="Code frequency" meta="additions and deletions">
                <CodeFrequencyChart weeks={repo.codeFrequency} />
              </Card>
            ) : null}
            {repo.commitActivity?.length ? (
              <Card id="commit-activity" title="Commits per week" meta="last 52 weeks">
                <CommitActivityChart weeks={repo.commitActivity} />
              </Card>
            ) : null}
            {repo.punchCard?.length ? (
              <Card id="punch-card" title="When work happens" meta="weekday and hour">
                <PunchCard points={repo.punchCard} />
              </Card>
            ) : null}
            {repo.participation && repo.participation.owner > 0 ? (
              <Card id="participation" title="Who is committing" meta="last 52 weeks">
                <div className="space-y-3">
                  {[
                    { label: "Maintainer commits", value: repo.participation.owner, color: "var(--accent)" },
                    { label: "Community commits", value: repo.participation.community, color: "var(--success)" },
                  ].map((row) => {
                    const pct = repo.participation!.all ? (row.value / repo.participation!.all) * 100 : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-sm">
                          <span>{row.label}</span>
                          <span className="font-medium tabular-nums">
                            {fullNumber(row.value)} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted">
                    {fullNumber(repo.participation.all)} commits in total over the last year.
                  </p>
                </div>
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

          {related.length ? (
            <Card id="related" title="Related repositories">
              <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {related.map((r) => (
                  <li key={r.id} className="rounded-md border border-border p-3">
                    <Link href={`/repos/${r.id}`} className="text-sm font-medium text-accent hover:underline">
                      {r.id}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {compactNumber(r.stars)} stars{r.language ? ` · ${r.language}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* Right rail — sticks so it stays useful beside the long main column */}
        <aside className="space-y-5 2xl:sticky 2xl:top-[70px] 2xl:max-h-[calc(100vh-90px)] 2xl:self-start 2xl:overflow-y-auto 2xl:pr-1">
          <Card id="facts" title="About">
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["License", repo.license || "Unspecified"],
                  ["First commit", formatDate(repo.firstCommitAt || repo.createdAt)],
                  ["Age", repoAge(repo.createdAt)],
                  ["Default branch", repo.defaultBranch || "n/a"],
                  ["Tags", repo.tagCount != null ? fullNumber(repo.tagCount) : "n/a"],
                  ["Closed issues", repo.closedIssues != null ? fullNumber(repo.closedIssues) : "n/a"],
                  ["Merged PRs", repo.mergedPRs != null ? fullNumber(repo.mergedPRs) : "n/a"],
                  ["Owner type", repo.isInOrganization ? "Organization" : "Individual"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
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
                <ul className="mt-2.5 space-y-1 text-xs text-muted">
                  {[
                    ["Contributing guide", repo.community.hasContributing],
                    ["Code of conduct", repo.community.hasCodeOfConduct || Boolean(repo.codeOfConduct)],
                    ["Issue templates", repo.community.hasIssueTemplate],
                    ["Security policy", Boolean(repo.securityPolicyUrl)],
                  ].map(([label, present]) => (
                    <li key={label as string} className="flex items-center gap-1.5">
                      <span style={{ color: present ? "var(--success)" : "var(--muted)" }}>{present ? "✓" : "—"}</span>
                      {label as string}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          {repo.workflowRuns?.length ? (
            <Card id="ci" title="Continuous integration">
              <ul className="space-y-2 text-sm">
                {repo.workflowRuns.map((run) => {
                  const ok = run.status === "success";
                  const failed = run.status === "failure";
                  return (
                    <li key={run.name} className="flex items-center justify-between gap-2">
                      <a href={run.url} rel="noopener" className="min-w-0 truncate hover:text-accent hover:underline">
                        {run.name}
                      </a>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: ok ? "var(--success-subtle)" : failed ? "var(--danger-subtle)" : "var(--surface)",
                          color: ok ? "var(--success)" : failed ? "var(--danger)" : "var(--muted)",
                        }}
                      >
                        {run.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {repo.fileTree?.length ? (
            <Card id="files" title="Source" meta={`${repo.fileTree.length} top-level entries`}>
              <FileTree files={repo.fileTree} repoUrl={repo.url} branch={repo.defaultBranch} />
            </Card>
          ) : null}

          {repo.languages && Object.keys(repo.languages).length ? (
            <Card id="tech-stack" title="Languages">
              <LanguageBar languages={repo.languages} />
            </Card>
          ) : null}

          {repo.manifestDependencies?.dependencies?.length ? (
            <Card
              id="dependencies"
              title="Direct dependencies"
              meta={repo.manifestDependencies.manifest}
            >
              <div className="flex flex-wrap gap-1">
                {repo.manifestDependencies.dependencies.slice(0, 24).map((d) => (
                  <span
                    key={d.name}
                    title={d.version ? `${d.name} ${d.version}` : d.name}
                    className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs"
                  >
                    {d.name}
                  </span>
                ))}
              </div>
              <a
                href={`${repo.url}/network/dependencies`}
                rel="noopener"
                className="mt-3 block text-sm text-accent hover:underline"
              >
                Full dependency graph
              </a>
            </Card>
          ) : null}

          {repo.contributors?.length ? (
            <Card
              id="contributors"
              title="Contributors"
              meta={repo.contributorCount ? fullNumber(repo.contributorCount) : String(repo.contributors.length)}
            >
              <Contributors
                contributors={repo.contributors}
                total={repo.contributorCount}
                repoUrl={repo.url}
              />
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
              {repo.homepage ? (
                <li><a href={repo.homepage} className="text-accent hover:underline" rel="noopener nofollow">Project homepage</a></li>
              ) : null}
              <li><a href={`${repo.url}/releases`} className="text-accent hover:underline" rel="noopener">Releases</a></li>
              <li><a href={`${repo.url}/issues`} className="text-accent hover:underline" rel="noopener">Issues</a></li>
              <li><a href={`${repo.url}/pulls`} className="text-accent hover:underline" rel="noopener">Pull requests</a></li>
              {repo.discussionsEnabled ? (
                <li><a href={`${repo.url}/discussions`} className="text-accent hover:underline" rel="noopener">Discussions</a></li>
              ) : null}
              {repo.securityPolicyUrl ? (
                <li><a href={repo.securityPolicyUrl} className="text-accent hover:underline" rel="noopener">Security policy</a></li>
              ) : null}
              {repo.codeOfConduct?.url ? (
                <li><a href={repo.codeOfConduct.url} className="text-accent hover:underline" rel="noopener">{repo.codeOfConduct.name}</a></li>
              ) : null}
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
