import { getAllRepos, getLatestTrending, CATEGORIES } from "@/lib/data";
import { absoluteUrl, site } from "@/lib/site";
import { normalizeCategory } from "@/lib/categories";

export const dynamic = "force-static";

const TOP_N = 300;

// llms-full.txt: the substance of the top repositories in one plain-text file,
// so an answer engine can quote RepoRadar's summaries without crawling pages.
// (llms.txt is the short index; this is the full text companion.)
export function GET() {
  const repos = getAllRepos().slice(0, TOP_N);
  const trending = getLatestTrending();

  const lines = [
    `# ${site.name}: top ${repos.length} tracked repositories`,
    "",
    `> ${site.description}`,
    trending ? `Data as of ${trending.date}. Full index: ${absoluteUrl("/llms.txt")}` : "",
    "",
  ];

  for (const r of repos) {
    const s = r.aiSummary;
    const category = normalizeCategory(s?.category);
    lines.push(
      `## ${r.id}`,
      "",
      `URL: ${absoluteUrl(`/repos/${r.id}`)}`,
      `GitHub: ${r.url}`,
      `Stars: ${r.stars}. Forks: ${r.forks}. Language: ${r.language || "unknown"}. License: ${r.license || "none"}.` +
        (category ? ` Category: ${CATEGORIES[category]?.title || category}.` : ""),
      ""
    );
    const one = s?.oneLiner || r.description;
    if (one) lines.push(one, "");
    if (s?.whatItDoes) lines.push(s.whatItDoes, "");
    if (s?.keyFeatures?.length) lines.push("Key features:", ...s.keyFeatures.slice(0, 5).map((f) => `- ${f}`), "");
    if (s?.whoIsItFor) lines.push(`Who it is for: ${s.whoIsItFor}`, "");
    if (s?.gettingStarted) lines.push(`Getting started: ${s.gettingStarted}`, "");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
