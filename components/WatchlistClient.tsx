"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readWatchlist, writeWatchlist, type WatchedRepo } from "@/components/WatchButton";
import { compactNumber } from "@/lib/format";
import Blankslate from "@/components/Blankslate";

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
      <Blankslate heading="Nothing on your watchlist yet" actionLabel="Browse trending repositories" actionHref="/trending/daily">
        Press Watch on any repository to pin it here. The list is stored in this browser only.
      </Blankslate>
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
