import Link from "next/link";
import { site } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
        <p>
          {site.name} — {site.tagline}. Data refreshed twice daily from the GitHub API.
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-foreground">About</Link>
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
