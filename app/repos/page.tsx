import Link from "next/link";
import type { Metadata } from "next";
import { getAllRepos, toBrowserRepo } from "@/lib/data";
import RepoBrowser from "@/components/RepoBrowser";

export const metadata: Metadata = {
  title: "All Tracked Repositories",
  description:
    "Every GitHub repository RepoRadar tracks, ranked by stars — not scoped to today, this week, or this month. Filter by topic to narrow down.",
  alternates: { canonical: "/repos" },
};

export default function AllReposPage() {
  const repos = getAllRepos();
  const withFacts = repos.filter((r) => r.language || r.stars > 0).length;

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">All tracked repositories</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every repository RepoRadar has ever tracked, ranked by stars — this is the full corpus, not
        scoped to today, this week, or this month like the{" "}
        <Link href="/trending/daily" className="text-accent hover:underline">
          trending pages
        </Link>
        . Use the topic filters to narrow down, or browse by{" "}
        <Link href="/categories" className="text-accent hover:underline">
          category
        </Link>{" "}
        instead.
      </p>
      {withFacts < repos.length ? (
        <p className="mt-2 text-sm text-muted">
          {repos.length - withFacts} of {repos.length} were added recently and are still waiting
          on their first data refresh — their full profile (stars, language, tags) will appear
          within the next few pipeline runs.
        </p>
      ) : null}
      <div className="mt-6">
        <RepoBrowser repos={repos.map((r) => toBrowserRepo(r))} pageSize={60} />
      </div>
    </div>
  );
}
