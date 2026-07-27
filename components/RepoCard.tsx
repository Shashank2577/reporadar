import Link from "next/link";
import { mergedStarHistory, type RepoProfile } from "@/lib/data";
import { compactNumber } from "@/lib/format";
import Tag from "@/components/Tag";
import WatchButton from "@/components/WatchButton";
import Sparkline from "@/components/Sparkline";

export default function RepoCard({
  repo,
  rank,
  gain,
  gainLabel,
}: {
  repo: RepoProfile;
  rank?: number;
  gain?: number | null;
  gainLabel?: string;
}) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-semibold">
          {rank ? <span className="mr-2 text-muted">{rank}.</span> : null}
          <Link href={`/repos/${repo.id}`} className="text-accent hover:underline break-words">
            {repo.id}
          </Link>
        </h3>
        <WatchButton repo={{ id: repo.id, description: repo.description, language: repo.language, stars: repo.stars }} compact />
      </div>
      {repo.description ? (
        <p className="mt-1 text-sm text-muted">{repo.description}</p>
      ) : null}
      <div className="mt-2">
        <Sparkline points={mergedStarHistory(repo)} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {compactNumber(repo.stars)}
        </span>
        {typeof gain === "number" && gain > 0 ? (
          <span className="font-medium text-success">
            +{compactNumber(gain)} {gainLabel || "stars"}
          </span>
        ) : null}
        {repo.language ? <span>{repo.language}</span> : null}
        {repo.license ? <span>{repo.license}</span> : null}
      </div>
      {repo.topics?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 5).map((t) => (
            <Tag key={t} label={t} href={`/topics/${t}`} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
