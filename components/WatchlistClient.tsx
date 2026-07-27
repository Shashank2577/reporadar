"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readWatchlist, writeWatchlist, type WatchedRepo } from "@/components/WatchButton";
import { compactNumber } from "@/lib/format";

export default function WatchlistClient() {
  const [list, setList] = useState<WatchedRepo[] | null>(null);

  useEffect(() => {
    const sync = () => setList(readWatchlist());
    sync();
    window.addEventListener("reporadar:watchlist-changed", sync);
    return () => window.removeEventListener("reporadar:watchlist-changed", sync);
  }, []);

  if (list === null) return <p className="text-sm text-muted">Loading your watchlist…</p>;
  if (!list.length) {
    return (
      <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted">
        <p>
          Nothing here yet. Browse{" "}
          <Link href="/trending/daily" className="text-accent hover:underline">
            trending repositories
          </Link>{" "}
          and press Watch on any repo to pin it here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {list.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link href={`/repos/${r.id}`} className="font-medium text-accent hover:underline">
              {r.id}
            </Link>
            {r.description ? <p className="truncate text-sm text-muted">{r.description}</p> : null}
            <p className="mt-0.5 text-xs text-muted">
              {typeof r.stars === "number" ? `${compactNumber(r.stars)} stars` : ""}
              {r.language ? ` · ${r.language}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => writeWatchlist(readWatchlist().filter((x) => x.id !== r.id))}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
