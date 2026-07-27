import Link from "next/link";
import { site } from "@/lib/site";

const nav = [
  { href: "/trending/daily", label: "Trending" },
  { href: "/reports", label: "Reports" },
  { href: "/topics", label: "Topics" },
  { href: "/languages", label: "Languages" },
  { href: "/search", label: "Search" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/newsletter", label: "Newsletter" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {site.name}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
