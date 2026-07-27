import type { Contributor } from "@/lib/data";
import { compactNumber, fullNumber } from "@/lib/format";

// GitHub's contributors panel: a count in the heading, a grid of circular
// avatars, then a "+ N contributors" link through to the full graph.
export default function Contributors({
  contributors,
  total,
  repoUrl,
}: {
  contributors: Contributor[];
  total?: number;
  repoUrl: string;
}) {
  if (!contributors?.length) return null;
  const shown = contributors.slice(0, 12);
  const remainder = Math.max((total || contributors.length) - shown.length, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => (
          <a
            key={c.login}
            href={c.url}
            rel="noopener"
            title={`${c.login} — ${fullNumber(c.contributions)} commits`}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${c.avatarUrl}&s=64`}
              alt={c.login}
              width={32}
              height={32}
              loading="lazy"
              className="h-8 w-8 rounded-full border border-border transition-transform hover:scale-110"
            />
          </a>
        ))}
      </div>
      {remainder > 0 ? (
        <a
          href={`${repoUrl}/graphs/contributors`}
          rel="noopener"
          className="mt-3 block text-sm text-accent hover:underline"
        >
          + {compactNumber(remainder)} contributors
        </a>
      ) : (
        <a
          href={`${repoUrl}/graphs/contributors`}
          rel="noopener"
          className="mt-3 block text-sm text-accent hover:underline"
        >
          View contributor graph
        </a>
      )}
      <ol className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
        {contributors.slice(0, 3).map((c, i) => (
          <li key={c.login} className="flex items-center gap-2">
            <span className="w-3 shrink-0 text-xs tabular-nums text-muted">{i + 1}</span>
            <a href={c.url} rel="noopener" className="min-w-0 flex-1 truncate text-accent hover:underline">
              {c.login}
            </a>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {compactNumber(c.contributions)} commits
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
