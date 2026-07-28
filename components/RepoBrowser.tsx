"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WatchButton from "@/components/WatchButton";
import Sparkline from "@/components/Sparkline";

export type BrowserRepo = {
  id: string;
  description: string;
  language: string | null;
  license: string | null;
  stars: number;
  forks: number;
  tags: string[];
  history: { date: string; stars: number }[];
  rank?: number;
  gain?: number | null;
  gainLabel?: string;
};

// Dense, GitHub-style list view (name, description, one line of meta) with a
// client-side multi-select tag filter. Filtering runs entirely in the
// browser against the props payload — no server, no search index needed
// since this is structured filtering over a bounded, already-loaded list.
export default function RepoBrowser({ repos, pageSize = 40 }: { repos: BrowserRepo[]; pageSize?: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"any" | "all">("any");
  const [visible, setVisible] = useState(pageSize);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of repos) for (const t of r.tags) counts.set(t, (counts.get(t) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [repos]);

  const filtered = useMemo(() => {
    if (!selected.size) return repos;
    return repos.filter((r) => {
      const tagSet = new Set(r.tags);
      const hits = [...selected].filter((t) => tagSet.has(t));
      return mode === "all" ? hits.length === selected.size : hits.length > 0;
    });
  }, [repos, selected, mode]);

  function toggle(tag: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    setVisible(pageSize);
  }

  return (
    <div>
      {tagCounts.length ? (
        <div className="mb-4 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Filter by topic</span>
            {selected.size > 1 ? (
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("any")}
                  className={`rounded-full px-2 py-0.5 ${mode === "any" ? "bg-accent text-accent-fg" : "text-muted hover:bg-border/40"}`}
                >
                  Match any
                </button>
                <button
                  type="button"
                  onClick={() => setMode("all")}
                  className={`rounded-full px-2 py-0.5 ${mode === "all" ? "bg-accent text-accent-fg" : "text-muted hover:bg-border/40"}`}
                >
                  Match all
                </button>
              </div>
            ) : null}
            {selected.size ? (
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-accent hover:underline">
                Clear ({selected.size})
              </button>
            ) : null}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tagCounts.map(([tag, count]) => {
              const on = selected.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(tag)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    on ? "border-accent bg-accent text-accent-fg" : "border-border bg-background text-accent hover:bg-surface"
                  }`}
                >
                  {tag} <span className={on ? "opacity-80" : "text-muted"}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="mb-2 text-sm text-muted">
        {filtered.length} of {repos.length} {repos.length === 1 ? "repository" : "repositories"}
      </p>

      <ul className="divide-y divide-border rounded-md border border-border">
        {filtered.slice(0, visible).map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium">
                {r.rank ? <span className="mr-1.5 text-muted">{r.rank}.</span> : null}
                <Link href={`/repos/${r.id}`} className="text-accent hover:underline break-words">
                  {r.id}
                </Link>
              </h3>
              {r.description ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{r.description}</p> : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                  </svg>
                  {r.stars.toLocaleString()}
                </span>
                {typeof r.gain === "number" && r.gain > 0 ? (
                  <span className="font-medium text-success">+{r.gain.toLocaleString()} {r.gainLabel || "stars"}</span>
                ) : null}
                {r.language ? <span>{r.language}</span> : null}
                {r.license ? <span>{r.license}</span> : null}
                {r.tags.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className="rounded-full border border-border bg-surface px-2 py-0.5 text-accent hover:bg-border/40"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <WatchButton repo={{ id: r.id, description: r.description, language: r.language, stars: r.stars }} compact />
              <Sparkline points={r.history} />
            </div>
          </li>
        ))}
      </ul>

      {filtered.length > visible ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-border/40"
          >
            Show more ({filtered.length - visible} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}
