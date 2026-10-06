import Link from "next/link";
import { compactNumber } from "@/lib/format";
import type { RepoProfile } from "@/lib/data";

// "Heat": the repositories visitors opened most in the last 7 days, from the
// site's own analytics. Counts are page views, not stars.
export default function MostViewed({ items }: { items: { repo: RepoProfile; views: number }[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {items.map(({ repo, views }, i) => (
        <li key={repo.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
          <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <Link href={`/repos/${repo.id}`} className="block truncate font-medium text-accent hover:underline">
              {repo.id}
            </Link>
            <p className="truncate text-xs text-muted">{repo.aiSummary?.oneLiner || repo.description}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted">{compactNumber(views)} views</span>
        </li>
      ))}
    </ol>
  );
}
