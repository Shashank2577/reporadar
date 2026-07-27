import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allTopics, reposByTopic } from "@/lib/data";
import RepoCard from "@/components/RepoCard";

export function generateStaticParams() {
  return allTopics().map(({ topic }) => ({ topic }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  const t = decodeURIComponent(topic);
  return {
    title: `Trending ${t} Repositories on GitHub`,
    description: `Open-source GitHub repositories tagged ${t} that are trending or gaining stars: profiles with star history, use cases, tech stack, and license.`,
    alternates: { canonical: `/topics/${topic}` },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const t = decodeURIComponent(topic);
  const repos = reposByTopic(t);
  if (!repos.length) notFound();

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">
        Trending repositories: <span className="text-accent">{t}</span>
      </h1>
      <p className="mt-2 text-muted">
        {repos.length} tracked {repos.length === 1 ? "repository" : "repositories"} tagged with {t}, ordered by stars.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {repos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}
