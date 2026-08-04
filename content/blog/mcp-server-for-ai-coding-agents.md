---
title: "RepoRadar Now Has an MCP Server for AI Coding Agents"
date: "2026-08-04"
description: "RepoRadar's tracked GitHub repository data is now queryable directly by Claude Code, Codex, Cursor, and any MCP-compatible agent, without scraping a single page."
tags:
  - "announcement"
  - "mcp"
  - "ai-agents"
---

If you're working with an AI coding agent and it needs to check a repository's
star history, figure out what a project actually does, or see what's trending
today, it's had exactly one option until now: fetch a page and re-parse the
HTML. That works, but it's slow and it throws away all the structure
[RepoRadar](/) already computed.

We just added a [Model Context Protocol](https://modelcontextprotocol.io)
server at [`/api/mcp`](/mcp) that exposes the same data as five queryable
tools instead:

- **search_repos** — search tracked repositories by name, topic, or keyword
- **get_repo** — a repo's full profile: stars, AI-generated summary, use
  cases, getting-started command
- **get_trending** — what was trending on GitHub for any tracked day
- **browse_category** — repos by category, or a list of all categories
- **get_report** — a published daily, weekly, or monthly report

All five are read-only, and every one is backed by the exact same data
functions the site's own pages use — nothing is served differently to agents
than to a browser.

## Adding it to your agent

If your client supports remote MCP servers over Streamable HTTP:

```json
{
  "mcpServers": {
    "reporadar": {
      "url": "https://reporadar.spreix.com/api/mcp"
    }
  }
}
```

For Claude Code specifically:

```
claude mcp add --transport http reporadar https://reporadar.spreix.com/api/mcp
```

Full setup instructions, including a bridge for stdio-only clients, are on
the [MCP page](/mcp).

## Why build this instead of just better docs

A page is built for a human scrolling and clicking. An agent mid-task doesn't
want to render a page, find the right section, and extract a number from
prose — it wants a structured answer to a structured question. Exposing the
same underlying data as typed tools instead of just HTML means an agent can
ask "what does `anthropics/claude-code` actually do and how do I get
started?" and get back exactly that, with nothing to parse.

This doesn't replace the site — most of what RepoRadar tracks (full star
curves, contributor graphs, release history) is still there in the [repo
profiles](/repos) for a human to explore. The MCP server is specifically for
the moment an agent needs one fact fast, in the middle of doing something
else.
