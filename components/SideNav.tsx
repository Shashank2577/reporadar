import Link from "next/link";
import { getAllRepos, allLanguages, allTopics, languageSlug } from "@/lib/data";
import { compactNumber } from "@/lib/format";

// Persistent left rail, in the spirit of GitHub's dashboard sidebar: primary
// navigation plus jump-off points into the corpus. Fills the left real estate
// on wide screens instead of leaving it empty.
const nav = [
  { href: "/repos", label: "All repositories" },
  { href: "/categories", label: "Browse by category" },
  { href: "/trending/daily", label: "Trending today" },
  { href: "/trending/weekly", label: "Trending this week" },
  { href: "/trending/monthly", label: "Trending this month" },
  { href: "/trending/archive", label: "Trending archive (by date)" },
  { href: "/reports", label: "Reports archive" },
  { href: "/topics", label: "All topics" },
  { href: "/languages", label: "All languages" },
  { href: "/watchlist", label: "Your watchlist" },
];

export default function SideNav() {
  const repos = getAllRepos();
  const topRepos = repos.slice(0, 8);
  const languages = allLanguages().slice(0, 10);
  const topics = allTopics().slice(0, 14);

  return (
    <nav aria-label="Site sections" className="space-y-6 text-sm">
      <ul className="space-y-0.5">
        {nav.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-surface"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Most starred</h2>
        <ul className="mt-1.5 space-y-0.5">
          {topRepos.map((r) => (
            <li key={r.id}>
              <Link
                href={`/repos/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface"
              >
                <span className="truncate text-accent">{r.name}</span>
                <span className="shrink-0 text-xs text-muted">{compactNumber(r.stars)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Languages</h2>
        <ul className="mt-1.5 space-y-0.5">
          {languages.map(({ language, count }) => (
            <li key={language}>
              <Link
                href={`/languages/${languageSlug(language)}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface"
              >
                <span className="truncate">{language}</span>
                <span className="shrink-0 text-xs text-muted">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Topics</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-2">
          {topics.map(({ topic }) => (
            <Link
              key={topic}
              href={`/topics/${topic}`}
              className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-accent hover:bg-border/40"
            >
              {topic}
            </Link>
          ))}
        </div>
      </section>
    </nav>
  );
}
