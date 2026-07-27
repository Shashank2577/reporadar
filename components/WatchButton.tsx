"use client";

import { useEffect, useState } from "react";

export type WatchedRepo = {
  id: string;
  description?: string | null;
  language?: string | null;
  stars?: number;
};

const KEY = "reporadar:watchlist";

export function readWatchlist(): WatchedRepo[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeWatchlist(list: WatchedRepo[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("reporadar:watchlist-changed"));
}

export default function WatchButton({ repo, compact = false }: { repo: WatchedRepo; compact?: boolean }) {
  const [watched, setWatched] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setWatched(readWatchlist().some((r) => r.id === repo.id));
    sync();
    window.addEventListener("reporadar:watchlist-changed", sync);
    return () => window.removeEventListener("reporadar:watchlist-changed", sync);
  }, [repo.id]);

  function toggle() {
    const list = readWatchlist();
    if (list.some((r) => r.id === repo.id)) {
      writeWatchlist(list.filter((r) => r.id !== repo.id));
    } else {
      writeWatchlist([...list, { ...repo, stars: repo.stars }]);
    }
  }

  // Render nothing until hydrated to avoid a flash of the wrong state.
  if (watched === null) {
    return <span className={compact ? "h-6 w-16" : "h-8 w-24"} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watched}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface font-medium hover:bg-border/40 ${
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"
        fill={watched ? "var(--attention)" : "none"}
        stroke="currentColor" strokeWidth={watched ? 0 : 1.5}>
        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
      </svg>
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
