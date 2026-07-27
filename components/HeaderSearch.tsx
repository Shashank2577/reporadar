"use client";

import { useEffect, useRef, useState } from "react";

type Result = { url: string; meta: { title?: string }; excerpt: string };
type PagefindResult = { data: () => Promise<Result> };
type PagefindApi = {
  init?: () => Promise<void>;
  debouncedSearch: (q: string) => Promise<{ results: PagefindResult[] } | null>;
};

// GitHub-style header search: an inline input with a results dropdown, backed
// by the static Pagefind index. Available on every page, no separate
// destination needed.
export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const apiRef = useRef<PagefindApi | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the Pagefind bundle on first focus so it never blocks page render.
  async function ensureApi() {
    if (apiRef.current || ready === false) return apiRef.current;
    try {
      // Pagefind is generated at build time into out/pagefind, so the module
      // does not exist at compile time — load it dynamically at runtime.
      const url = "/pagefind/pagefind.js";
      const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ url)) as PagefindApi;
      await mod.init?.();
      apiRef.current = mod;
      setReady(true);
      return mod;
    } catch {
      setReady(false);
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!query.trim()) {
        if (!cancelled) setResults([]);
        return;
      }
      const api = await ensureApi();
      if (!api || cancelled) return;
      const search = await api.debouncedSearch(query);
      if (!search || cancelled) return;
      const data = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
      if (!cancelled) setResults(data);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close on outside click; focus with "/" like GitHub.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || "");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 focus-within:border-accent">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="var(--muted)" aria-hidden="true">
          <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.253 1.233.749.749 0 0 1-.817-.173ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            void ensureApi();
          }}
          placeholder="Search repositories, topics, reports"
          aria-label="Search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded border border-border px-1.5 text-xs text-muted sm:inline">/</kbd>
      </div>

      {open && query.trim() ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {ready === false ? (
            <p className="p-3 text-sm text-muted">
              Search runs against the published index; it is unavailable in the dev server.
            </p>
          ) : results.length ? (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.url}>
                  <a href={r.url} className="block px-3 py-2.5 hover:bg-surface">
                    <span className="block text-sm font-medium text-accent">{r.meta?.title || r.url}</span>
                    <span
                      className="mt-0.5 line-clamp-2 block text-xs text-muted"
                      dangerouslySetInnerHTML={{ __html: r.excerpt }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-muted">No matches for “{query}”.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
