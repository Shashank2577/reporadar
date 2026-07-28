import Link from "next/link";
import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing about open-source trends, how RepoRadar works, and what's happening in the GitHub ecosystem.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getBlogPosts();
  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Longer-form writing on open-source trends and how this site works — separate from the
        automated daily/weekly/monthly reports.
      </p>
      <ul className="mt-6 space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="rounded-md border border-border p-4">
            <p className="text-xs text-muted">{formatDate(p.date)}</p>
            <Link href={`/blog/${p.slug}`} className="mt-1 block text-lg font-medium text-accent hover:underline">
              {p.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{p.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
