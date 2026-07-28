---
title: "Why We Built RepoRadar"
date: "2026-07-28"
description: "Why we started tracking trending GitHub repositories twice a day, and what makes RepoRadar different from GitHub's own trending page."
tags:
  - "announcement"
  - "open-source"
---

GitHub's own trending page only shows one thing: what's popular right now. It
resets every day, keeps no history, and tells you nothing about *why* a
project is moving or whether that momentum is real.

RepoRadar exists to answer the questions the trending page can't:

- **How did this repository actually grow?** Every tracked project gets a
  full star history, not just today's snapshot — reconstructed back to its
  first star where possible, then extended by our own daily tracking from
  here on.
- **Is a star jump real or a fluke?** We flag repositories gaining stars at
  several times their normal rate, so you can tell a genuine breakout from
  noise.
- **What does this project actually do?** Every profile includes a plain,
  technical summary — what problem it solves, who it's for, and how to get
  started — generated from its own README, not just its GitHub description.
- **What's the full picture?** Contributors, commit activity, releases, open
  issues, discussions, dependencies, and CI status, all on one page, so you
  rarely need to leave to understand a project.

We also don't believe "trending" should be the only way in. Most people
looking for open-source software already know roughly what they want — an AI
agent framework, a self-hosted alternative to some SaaS tool, a fast CLI file
manager — so RepoRadar is organized by [category](/categories) first, with
day-by-day trending as a secondary view for people who want to see what's new.

Everything on this site is generated from the GitHub API by an automated
pipeline that runs on a schedule, with no backend server and no database —
the data itself lives in this project's git history, which means every past
report stays online forever. You can read exactly how it works on the
[about page](/about).

If there's a repository you think deserves tracking, you can
[request it](/request) and we'll find the best match automatically.
