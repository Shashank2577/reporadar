import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getAllRepos,
  getRepo,
  getLatestTrending,
  getTrendingByDate,
  allCategories,
  reposByCategory,
  getReports,
  getReport,
  type RepoProfile,
} from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

// MCP server exposing RepoRadar's tracked-repo data to AI coding agents
// (Claude, Codex, Cursor, etc.). Read-only, backed by the same lib/data.ts
// functions the site itself uses -- no separate data layer to keep in sync.

function summarizeRepo(r: RepoProfile) {
  return {
    id: r.id,
    url: absoluteUrl(`/repos/${r.id}`),
    description: r.description,
    stars: r.stars,
    forks: r.forks,
    language: r.language,
    license: r.license,
    topics: r.topics,
    oneLiner: r.aiSummary?.oneLiner,
    whatItDoes: r.aiSummary?.whatItDoes,
    useCases: r.aiSummary?.useCases,
    whoIsItFor: r.aiSummary?.whoIsItFor,
    gettingStarted: r.aiSummary?.gettingStarted,
    category: r.aiSummary?.category,
  };
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const handler = createMcpHandler((server) => {
  server.registerTool(
    "search_repos",
    {
      title: "Search tracked repositories",
      description:
        "Search RepoRadar's tracked GitHub repositories by name, topic, or description. Returns a compact list ranked by stars.",
      inputSchema: z.object({
        query: z.string().describe("Search term: repo name, topic, or keyword from its description"),
        limit: z.number().int().min(1).max(50).default(15),
      }),
    },
    async ({ query, limit }) => {
      const q = query.toLowerCase();
      const matches = getAllRepos()
        .filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q) ||
            r.topics?.some((t) => t.toLowerCase().includes(q))
        )
        .slice(0, limit)
        .map(summarizeRepo);
      return textResult({ count: matches.length, repos: matches });
    }
  );

  server.registerTool(
    "get_repo",
    {
      title: "Get repository profile",
      description:
        "Get the full RepoRadar profile for one GitHub repository: description, stars, AI-generated summary, use cases, and getting-started info.",
      inputSchema: z.object({
        owner: z.string().describe("GitHub repo owner/org, e.g. \"anthropics\""),
        name: z.string().describe("GitHub repo name, e.g. \"claude-code\""),
      }),
    },
    async ({ owner, name }) => {
      const repo = getRepo(owner, name);
      if (!repo) {
        return textResult({ error: `${owner}/${name} is not tracked by RepoRadar.` });
      }
      return textResult(summarizeRepo(repo));
    }
  );

  server.registerTool(
    "get_trending",
    {
      title: "Get trending repositories",
      description:
        "Get the repositories trending on GitHub for a given day. Defaults to the most recent tracked date.",
      inputSchema: z.object({
        date: z
          .string()
          .optional()
          .describe("Date as YYYY-MM-DD. Omit for the latest available date."),
      }),
    },
    async ({ date }) => {
      const day = date ? getTrendingByDate(date) : getLatestTrending();
      if (!day) {
        return textResult({ error: date ? `No trending data for ${date}.` : "No trending data available." });
      }
      return textResult(day);
    }
  );

  server.registerTool(
    "browse_category",
    {
      title: "Browse repositories by category",
      description:
        "List tracked repositories in one category, or list all categories with counts if none is given.",
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe(
            "One of: ai-ml, developer-tools, web, mobile, data, infrastructure, security, systems, learning, productivity, other. Omit to list all categories."
          ),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    },
    async ({ category, limit }) => {
      if (!category) {
        return textResult(
          allCategories().map((c) => ({ category: c.category, title: c.title, count: c.count }))
        );
      }
      const repos = reposByCategory(category).slice(0, limit).map(summarizeRepo);
      return textResult({ category, count: repos.length, repos });
    }
  );

  server.registerTool(
    "get_report",
    {
      title: "Get a trending report",
      description:
        "Get a published daily, weekly, or monthly RepoRadar report. Defaults to the most recent report of that kind.",
      inputSchema: z.object({
        kind: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        slug: z
          .string()
          .optional()
          .describe("Specific report slug (usually a date). Omit for the most recent."),
      }),
    },
    async ({ kind, slug }) => {
      const report = slug ? getReport(kind, slug) : getReports(kind)[0];
      if (!report) {
        return textResult({ error: `No ${kind} report found${slug ? ` for ${slug}` : ""}.` });
      }
      return textResult(report);
    }
  );
});

export { handler as GET, handler as POST };
