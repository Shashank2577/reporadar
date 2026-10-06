import Link from "next/link";
import { site } from "@/lib/site";
import { getSiteStats, MIN_PUBLIC_VISITS } from "@/lib/stats";
import { compactNumber } from "@/lib/format";

export default function SiteFooter() {
  const stats = getSiteStats();
  const showVisits = stats && stats.visits30d >= MIN_PUBLIC_VISITS;
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
        <p>
          {site.name} — {site.tagline}. Data refreshed twice daily from the GitHub API.
          {" "}Built by <Link href="/about" className="hover:text-foreground">{site.creator.name}</Link>.
          {showVisits ? ` ${compactNumber(stats.visits30d)} visits in the last 30 days.` : ""}
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/featured" className="hover:text-foreground">Get featured</Link>
          <Link href="/mcp" className="hover:text-foreground">MCP</Link>
          <Link href="/reports" className="hover:text-foreground">Reports</Link>
          <Link href="/newsletter" className="hover:text-foreground">Newsletter</Link>
          <a href="/feed.xml" className="hover:text-foreground">RSS</a>
          {site.githubRepo ? (
            <a href={`https://github.com/${site.githubRepo}`} className="hover:text-foreground">
              Source
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
