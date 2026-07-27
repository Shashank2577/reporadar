import type { RepoProfile } from "@/lib/data";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StateBadge({ state, draft }: { state: string; draft?: boolean }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    merged: { bg: "var(--done-subtle)", fg: "var(--done)", label: "Merged" },
    open: { bg: "var(--success-subtle)", fg: "var(--success)", label: draft ? "Draft" : "Open" },
    closed: { bg: "var(--danger-subtle)", fg: "var(--danger)", label: "Closed" },
  };
  const s = map[state] || map.open;
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

// Interleaved commits and pull requests, in the shape of GitHub's repo
// activity view.
export default function ActivityFeed({ repo }: { repo: RepoProfile }) {
  const commits = (repo.recentCommits || []).map((c) => ({
    kind: "commit" as const,
    at: c.date || "",
    data: c,
  }));
  const pulls = (repo.recentPulls || []).map((p) => ({
    kind: "pull" as const,
    at: p.updatedAt,
    data: p,
  }));
  const items = [...commits, ...pulls]
    .filter((i) => i.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  if (!items.length) {
    return <p className="text-sm text-muted">No recent activity was recorded for this repository.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) =>
        item.kind === "commit" ? (
          <li key={`c-${item.data.sha}`} className="flex items-start gap-2.5">
            {item.data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${item.data.avatarUrl}&s=40`} alt="" width={20} height={20} className="mt-0.5 rounded-full" loading="lazy" />
            ) : (
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] text-muted">
                {(item.data.author || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <a href={item.data.url} rel="noopener" className="block truncate text-sm hover:text-accent hover:underline">
                {item.data.message}
              </a>
              <p className="text-xs text-muted">
                <span className="font-medium">{item.data.author || "unknown"}</span> committed{" "}
                <span className="font-mono">{item.data.sha}</span> · {timeAgo(item.data.date)}
              </p>
            </div>
          </li>
        ) : (
          <li key={`p-${item.data.number}`} className="flex items-start gap-2.5">
            <svg viewBox="0 0 16 16" width="16" height="16" className="mt-1 shrink-0" fill="var(--muted)" aria-hidden="true">
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <a href={item.data.url} rel="noopener" className="min-w-0 truncate text-sm hover:text-accent hover:underline">
                  {item.data.title}
                </a>
                <StateBadge state={item.data.state} draft={item.data.draft} />
              </div>
              <p className="text-xs text-muted">
                #{item.data.number} by {item.data.author || "unknown"} · updated {timeAgo(item.data.updatedAt)}
              </p>
            </div>
          </li>
        )
      )}
    </ul>
  );
}
