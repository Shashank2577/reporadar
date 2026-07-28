import Link from "next/link";
import { site } from "@/lib/site";
import HeaderSearch from "@/components/HeaderSearch";
import UserMenu from "@/components/UserMenu";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="flex items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" aria-hidden="true">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          <span className="hidden sm:inline">{site.name}</span>
        </Link>
        <div className="flex-1">
          <HeaderSearch />
        </div>
        <nav className="hidden shrink-0 items-center gap-4 text-sm md:flex">
          <Link href="/trending/daily" className="hover:text-accent">Trending</Link>
          <Link href="/reports" className="hover:text-accent">Reports</Link>
          <Link href="/watchlist" className="hover:text-accent">Watchlist</Link>
          <Link href="/request" className="hover:text-accent">Request a repo</Link>
          <Link
            href="/newsletter"
            className="rounded-md border border-border bg-background px-3 py-1 font-medium hover:bg-surface"
          >
            Subscribe
          </Link>
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
