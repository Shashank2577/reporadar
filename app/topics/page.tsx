import Link from "next/link";
import type { Metadata } from "next";
import { allTopics } from "@/lib/data";

export const metadata: Metadata = {
  title: "Browse Trending Repositories by Topic",
  description:
    "Explore trending GitHub repositories by topic: AI, machine learning, developer tools, web frameworks, security, and more.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  const topics = allTopics();
  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
      <p className="mt-2 text-muted">
        Every topic and tag attached to repositories currently on the radar.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {topics.map(({ topic, count }) => (
          <li key={topic}>
            <Link
              href={`/topics/${topic}`}
              className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-sm text-accent hover:bg-border/40"
            >
              {topic} <span className="text-muted">({count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
