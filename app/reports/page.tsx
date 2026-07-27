import Link from "next/link";
import type { Metadata } from "next";
import { getReports } from "@/lib/data";

export const metadata: Metadata = {
  title: "GitHub Trending Reports — Daily, Weekly and Monthly Archive",
  description:
    "The full archive of GitHub trending reports: daily trending snapshots, weekly digests, and monthly roundups with repository of the day, week, and month.",
  alternates: { canonical: "/reports" },
};

export default function ReportsIndexPage() {
  const reports = getReports();
  const kinds = ["daily", "weekly", "monthly"] as const;

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Reports archive</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every report is generated from GitHub API data and kept forever, so you can see how the
        open-source landscape looked on any given day — and how earlier reports changed over time.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {kinds.map((kind) => {
          const list = reports.filter((r) => r.kind === kind);
          return (
            <section key={kind} aria-labelledby={`reports-${kind}`}>
              <h2 id={`reports-${kind}`} className="mb-3 text-lg font-semibold capitalize">
                {kind} reports
              </h2>
              {list.length ? (
                <ul className="space-y-2">
                  {list.slice(0, 30).map((r) => (
                    <li key={r.slug} className="rounded-md border border-border p-3">
                      <Link href={`/reports/${kind}/${r.slug}`} className="font-medium text-accent hover:underline">
                        {r.title}
                      </Link>
                      {r.featured ? (
                        <p className="mt-1 text-sm text-muted">Featured: {r.featured}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No {kind} reports yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
