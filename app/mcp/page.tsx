import type { Metadata } from "next";
import { site, absoluteUrl } from "@/lib/site";
import { getAllRepos } from "@/lib/data";

export const metadata: Metadata = {
  title: "MCP server for AI coding agents",
  description:
    "Connect Claude Code, Codex, Cursor, or any MCP-compatible agent to RepoRadar's tracked GitHub repository data: search, trending, categories, and reports.",
  alternates: { canonical: "/mcp" },
};

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "reporadar": {
      "url": "${absoluteUrl("/api/mcp")}"
    }
  }
}`;

const STDIO_SNIPPET = `{
  "mcpServers": {
    "reporadar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${absoluteUrl("/api/mcp")}"]
    }
  }
}`;

export default function McpPage() {
  const repoCount = getAllRepos().length;
  return (
    <article className="prose mx-auto max-w-3xl" data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">MCP server for AI coding agents</h1>
      <p>
        {site.name} runs a{" "}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
          Model Context Protocol
        </a>{" "}
        server that lets Claude Code, Codex, Cursor, or any MCP-compatible agent query tracked
        GitHub repository data directly — search, trending lists, category browsing, AI-generated
        summaries, and reports — without scraping pages or leaving the terminal.
      </p>

      <h2>Add it to your agent</h2>
      <p>
        If your client supports remote MCP servers over Streamable HTTP, point it directly at the
        endpoint:
      </p>
      <pre>
        <code>{CONFIG_SNIPPET}</code>
      </pre>
      <p>
        Claude Code:{" "}
        <code>claude mcp add --transport http reporadar {absoluteUrl("/api/mcp")}</code>
      </p>
      <p>
        For stdio-only clients that don&apos;t yet support remote servers, use{" "}
        <a href="https://www.npmjs.com/package/mcp-remote" target="_blank" rel="noopener noreferrer">
          mcp-remote
        </a>{" "}
        as a bridge:
      </p>
      <pre>
        <code>{STDIO_SNIPPET}</code>
      </pre>

      <h2>Available tools</h2>
      <ul>
        <li>
          <strong>search_repos</strong> — search tracked repositories by name, topic, or keyword
        </li>
        <li>
          <strong>get_repo</strong> — full profile for one repo: description, stars, AI summary,
          use cases, getting-started
        </li>
        <li>
          <strong>get_trending</strong> — what was trending on GitHub for a given day (defaults to
          latest)
        </li>
        <li>
          <strong>browse_category</strong> — list repos in a category, or list all categories
        </li>
        <li>
          <strong>get_report</strong> — a published daily, weekly, or monthly report
        </li>
      </ul>
      <p>
        All five are read-only and backed by the same data that powers the site itself — nothing
        is agent-specific or served differently. See <a href="/about">how the data is collected</a>{" "}
        for details on sourcing and update cadence.
      </p>

      <h2>Why this exists</h2>
      <p>
        An agent helping someone evaluate or discover open-source tools shouldn&apos;t have to
        guess star counts or re-derive a project&apos;s use cases from a README on the fly —
        {site.name} already tracks that, twice a day, across {repoCount.toLocaleString()}{" "}
        repositories. This makes
        that data queryable directly instead of requiring a web fetch and re-parsing of the page.
      </p>
    </article>
  );
}
