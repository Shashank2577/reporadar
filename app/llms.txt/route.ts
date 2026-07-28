import { getAllRepos, getReports, getBlogPosts, getLatestTrending, allCategories } from "@/lib/data";
import { absoluteUrl, site } from "@/lib/site";

export const dynamic = "force-static";

// llms.txt: a machine-readable orientation file for AI agents and answer
// engines (AEO). Regenerated on every build, so it always reflects the
// current data.
export function GET() {
  const repos = getAllRepos();
  const reports = getReports();
  const trending = getLatestTrending();
  const categories = allCategories();

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${site.name} publishes automated, data-backed reports on trending GitHub repositories.`,
    "All pages are static HTML with JSON-LD structured data (SoftwareSourceCode for",
    "repositories, Article for reports). Data updates twice daily via the GitHub API.",
    trending ? `Latest data: ${trending.date}. Tracked repositories: ${repos.length}.` : "",
    "",
    "## Key pages",
    "",
    `- [All repositories](${absoluteUrl("/repos")}): every tracked repository, not scoped to any period`,
    `- [Categories](${absoluteUrl("/categories")}): browse by project type (${categories.map((c) => c.title).join(", ")})`,
    `- [Trending today](${absoluteUrl("/trending/daily")}): today's trending repositories, ranked`,
    `- [Trending this week](${absoluteUrl("/trending/weekly")}) and [this month](${absoluteUrl("/trending/monthly")})`,
    `- [Reports archive](${absoluteUrl("/reports")}): every daily, weekly, and monthly report`,
    `- [Topics](${absoluteUrl("/topics")}) and [Languages](${absoluteUrl("/languages")}): browse by tag or language`,
    `- [RSS feed](${absoluteUrl("/feed.xml")}): all reports, machine-readable`,
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
    "## Repository profiles",
    "",
    "Each profile includes: star history with recorded snapshots, star-jump detection,",
    "what the project does, intended use cases, getting-started pointers, tech stack by",
    "language bytes, top contributors, license, first-commit date, and commit counts.",
    "",
    ...repos.slice(0, 50).map(
      (r) =>
        `- [${r.id}](${absoluteUrl(`/repos/${r.id}`)}): ${(r.description || "").slice(0, 120)}`
    ),
    "",
    "## Latest reports",
    "",
    ...reports.slice(0, 10).map(
      (r) => `- [${r.title}](${absoluteUrl(`/reports/${r.kind}/${r.slug}`)})`
    ),
    "",
    "## Blog",
    "",
    ...getBlogPosts().map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.description}`),
    "",
  ];

  return new Response(lines.filter((l) => l !== null).join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
