import Link from "next/link";
import { compactNumber } from "@/lib/format";
import type { FeaturedProject } from "@/lib/featured";

// Featured projects are chosen by a maintainer after a request, shown for a
// limited time, and always labelled. They are separate from (and never change)
// the data-driven trending lists. Sponsored ones carry rel="sponsored".
export default function FeaturedProjects({ projects }: { projects: FeaturedProject[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map(({ repo, pitch, sponsored }) => (
        <article key={repo.id} className="flex flex-col rounded-md border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words font-semibold">
              <Link href={`/repos/${repo.id}`} className="text-accent hover:underline">
                {repo.id}
              </Link>
            </h3>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              {sponsored ? "Sponsored" : "Featured"}
            </span>
          </div>
          <p className="mt-2 text-sm">{pitch || repo.aiSummary?.oneLiner || repo.description}</p>
          <p className="mt-auto pt-3 text-xs text-muted">
            {compactNumber(repo.stars)} stars
            {repo.language ? ` · ${repo.language}` : ""}
            {repo.license ? ` · ${repo.license}` : ""}
            {" · "}
            <a
              href={repo.url}
              rel={sponsored ? "sponsored nofollow noopener" : "noopener"}
              className="text-accent hover:underline"
            >
              GitHub
            </a>
          </p>
        </article>
      ))}
    </div>
  );
}
