---
title: "What 1,136 trending GitHub repositories show: languages, licenses and AI tooling, October 2026"
date: "2026-10-04"
description: "A look at 1,136 repositories that reached GitHub trending since late July 2026: language mix, license split, how much is AI tooling, and how old the projects are."
tags:
  - "data"
  - "trends"
  - "open-source"
---

RepoRadar has tracked every repository that reached GitHub's trending lists since 27 July 2026. As of 4 October 2026 that is 1,136 distinct repositories with a combined 33.7 million stars. This post summarizes what that set looks like.

One caveat before the numbers. The set is selected by trending, not sampled from all of GitHub. It over-represents new and fast-moving projects, and it says nothing about the long tail of quiet repositories. Read it as a description of what gets attention, not of what exists.

## The set is young and active

- 687 of the 1,136 repositories (60.5%) were created within the last 12 months, and only 120 are more than five years old.
- 787 (69.3%) received a push in the last 30 days. Ten are archived.
- The median repository has 10,961 stars. The distribution is heavily skewed: a few projects hold hundreds of thousands of stars, which is why the total is 33.7 million while the median is about 11,000.

Trending rewards momentum, so older projects appear mostly when something changes, such as a major release or a renewed wave of attention.

## Python and TypeScript dominate

Of the 1,136 repositories, 109 report no primary language (mostly documentation, lists and data repositories). Among the rest:

| Language | Repositories | Share of set |
| --- | --- | --- |
| Python | 313 | 27.6% |
| TypeScript | 261 | 23.0% |
| Rust | 106 | 9.3% |
| JavaScript | 79 | 7.0% |
| Go | 52 | 4.6% |

Python, TypeScript and Rust together account for 59.9% of the set. Rust is third with 106 repositories; the current list is on the [Rust page](/languages/rust). Full breakdowns are on the [Python](/languages/python) and [TypeScript](/languages/typescript) pages.

## One in five is AI tooling

236 repositories (20.8%) are categorized as AI and machine learning, the second largest category after developer tools (285). Within AI projects, Python is 53.8% and TypeScript 14.8%, which reflects a split between model-side work (Python) and agent, editor and interface tooling (TypeScript).

The most common topics tell the same story. Across the set, `ai` appears on 157 repositories, `llm` on 113, `claude-code` on 113, `ai-agents` on 106, and `mcp` on 83. The Model Context Protocol topic (`mcp`) is already a top-five tag in the set. If you want to use this data directly, RepoRadar exposes it over MCP; the setup is on the [MCP page](/mcp).

Browse the full list on the [AI and machine learning category page](/categories/ai-ml).

## Licensing: permissive by default, with a visible gap

| License | Repositories | Share |
| --- | --- | --- |
| MIT | 463 | 40.8% |
| Apache-2.0 | 234 | 20.6% |
| No license listed | 150 | 13.2% |
| Other | 128 | 11.3% |
| AGPL-3.0 | 69 | 6.1% |
| GPL-3.0 | 46 | 4.0% |

Permissive licenses (MIT, Apache-2.0, BSD, ISC, MPL and similar) cover 717 repositories, or 63.1%. Two numbers deserve attention. First, 13.2% of trending repositories state no license at all, which in practice means others have no clear right to reuse the code. Second, AGPL-3.0 (6.1%) appears more often than GPL-3.0 (4.0%) in this set.

## How to read the star history on RepoRadar

Each repository page shows star history built from our own daily snapshots, which began on 27 July 2026. Where a public event archive covers at least 60% of a repository's real star total, we also reconstruct the earlier curve; where it does not, we show only what we measured and say so on the chart. We changed this deliberately: scaling an incomplete archive up to the current total produced curves that started at zero and showed one-day jumps that never happened.

## Reproducing this

Every figure above comes from the JSON profiles in the RepoRadar dataset, computed over distinct repositories after merging renamed duplicates. The daily numbers update as the set grows; the [trending page](/trending/daily) and the [reports archive](/reports) show how the list changes day to day.
