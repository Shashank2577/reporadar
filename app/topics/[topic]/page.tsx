import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allTopics, reposByTopic, toBrowserRepo } from "@/lib/data";
import RepoBrowser from "@/components/RepoBrowser";

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
        Use the topic filters below to narrow further.
      </p>
      <div className="mt-6">
        <RepoBrowser repos={repos.map((r) => toBrowserRepo(r))} />
      </div>
    </div>
  );
}
