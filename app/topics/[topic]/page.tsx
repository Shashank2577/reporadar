import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allTopics, reposByTopic, toBrowserRepo } from "@/lib/data";
import RepoBrowser from "@/components/RepoBrowser";
import { itemListJsonLd } from "@/lib/site";

// Prerendering every topic (3,800+, most tagging only 1-2 repos) was the
// single biggest driver of build time and page count for near-zero benefit --
// thin, rarely-visited pages. Only the topics with real traction are worth
// prerendering; the long tail still works, it just renders on first request
// and gets cached from then on (the default when dynamicParams isn't set to
// false), instead of being generated at every single build forever.
const PRERENDER_TOP_N = 100;

export function generateStaticParams() {
  return allTopics()
    .slice(0, PRERENDER_TOP_N)
    .map(({ topic }) => ({ topic }));
}

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(`Trending ${t} repositories`, repos.map((r) => r.id))) }}
      />
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
