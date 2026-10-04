import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { CATEGORIES, normalizeCategory } from "../../lib/categories";
import type { Env } from "../_lib/session";

// MCP server exposing RepoRadar's tracked-repo data to AI coding agents
// (Claude, Codex, Cursor, etc.). Read-only. Data comes from the static JSON
// that scripts/build-mcp-data.mjs writes next to the site (out/mcp-data), so
// there is no separate data layer to keep in sync.

type Repo = {
  id: string;
  description: string;
  stars: number;
  forks: number;
  language: string | null;
  license: string | null;
  topics: string[];
  oneLiner?: string;
  whatItDoes?: string;
  useCases?: unknown;
  whoIsItFor?: string;
  gettingStarted?: string;
  category?: string;
};
type ReportKind = "daily" | "weekly" | "monthly";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Isolate-level cache: the repo list is a few MB and identical for every request.
let reposCache: Repo[] | null = null;

async function loadJson<T>(env: Env, origin: string, rel: string): Promise<T | null> {
  const res = await env.ASSETS.fetch(new URL(`/mcp-data/${rel}`, origin));
  return res.ok ? ((await res.json()) as T) : null;
}

async function loadRepos(env: Env, origin: string): Promise<Repo[]> {
  if (!reposCache) reposCache = (await loadJson<Repo[]>(env, origin, "repos.json")) ?? [];
  return reposCache;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const origin = new URL(request.url).origin;

  const summarize = (r: Repo) => ({ ...r, url: `${origin}/repos/${r.id}` });

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
        const matches = (await loadRepos(env, origin))
          .filter(
            (r) =>
              r.id.toLowerCase().includes(q) ||
              (r.description || "").toLowerCase().includes(q) ||
              (r.topics || []).some((t) => t.toLowerCase().includes(q)) ||
              (r.oneLiner || "").toLowerCase().includes(q)
          )
          .slice(0, limit)
          .map(summarize);
        return textResult({ query, count: matches.length, repos: matches });
      }
    );

    server.registerTool(
      "get_repo",
      {
        title: "Get a repository profile",
        description:
          "Get the full RepoRadar profile for one GitHub repository: description, stars, AI-generated summary, use cases, and getting-started info.",
        inputSchema: z.object({
          owner: z.string().describe("GitHub repo owner/org, e.g. \"anthropics\""),
          name: z.string().describe("GitHub repo name, e.g. \"claude-code\""),
        }),
      },
      async ({ owner, name }) => {
        const id = `${owner}/${name}`.toLowerCase();
        const repo = (await loadRepos(env, origin)).find((r) => r.id.toLowerCase() === id);
        if (!repo) return textResult({ error: `${owner}/${name} is not tracked by RepoRadar.` });
        return textResult(summarize(repo));
      }
    );

    server.registerTool(
      "get_trending",
      {
        title: "Get trending repositories",
        description:
          "Get the repositories trending on GitHub for a given day. Defaults to the most recent tracked date.",
        inputSchema: z.object({
          date: z.string().optional().describe("Date as YYYY-MM-DD. Omit for the latest available date."),
        }),
      },
      async ({ date }) => {
        const target = date ?? (await loadJson<string[]>(env, origin, "trending/index.json"))?.[0];
        // Dates become part of a path: only accept the exact YYYY-MM-DD shape.
        const day = target && /^\d{4}-\d{2}-\d{2}$/.test(target) ? await loadJson(env, origin, `trending/${target}.json`) : null;
        if (!day) return textResult({ error: date ? `No trending data for ${date}.` : "No trending data available." });
        return textResult(day);
      }
    );

    server.registerTool(
      "browse_category",
      {
        title: "Browse repositories by category",
        description: "List tracked repositories in one category, or list all categories with counts if none is given.",
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
        const repos = await loadRepos(env, origin);
        if (!category) {
          const counts = new Map<string, number>();
          for (const r of repos) {
            const c = normalizeCategory(r.category);
            if (c) counts.set(c, (counts.get(c) || 0) + 1);
          }
          return textResult(
            [...counts.entries()]
              .map(([c, count]) => ({ category: c, title: CATEGORIES[c]?.title || c, count }))
              .sort((a, b) => b.count - a.count)
          );
        }
        const matches = repos.filter((r) => normalizeCategory(r.category) === category).slice(0, limit).map(summarize);
        return textResult({ category, count: matches.length, repos: matches });
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
          slug: z.string().optional().describe("Specific report slug (usually a date). Omit for the most recent."),
        }),
      },
      async ({ kind, slug }) => {
        const index = await loadJson<Record<ReportKind, string[]>>(env, origin, "reports/index.json");
        const target = slug ?? index?.[kind]?.[0];
        // Slugs become part of a path: only accept slugs that exist in the index.
        const report = target && index?.[kind]?.includes(target) ? await loadJson(env, origin, `reports/${kind}/${target}.json`) : null;
        if (!report) return textResult({ error: `No ${kind} report found${slug ? ` for ${slug}` : ""}.` });
        return textResult(report);
      }
    );
  });

  return handler(request);
};
