<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent instructions for RepoRadar

RepoRadar is a static Next.js site that publishes automated reports on trending
GitHub repositories. Data lives in the repo itself:

- `data/repos/<owner>__<name>.json` — one profile per repository (facts, star
  snapshots, trending history, AI summary). Written by `scripts/update-repos.mjs`
  and `scripts/enrich.mjs`.
- `data/trending/<date>.json` — raw trending lists per day.
- `content/reports/{daily,weekly,monthly}/<slug>.md` — published reports with
  YAML frontmatter. Written by `scripts/generate-reports.mjs`.
- `content/blog/<slug>.md` — long-form editorial posts (SEO/AEO content, not
  generated from data). Frontmatter: `title`, `date` (YYYY-MM-DD), `description`
  (used as the meta description — keep it under ~160 characters), `tags`
  (array of strings). Rendered at `/blog/<slug>`.

## Tasks Jules is scheduled for

1. **Editorial pass on the latest report.** Open the newest file in
   `content/reports/daily/`. Rewrite ONLY the text between
   `<!-- jules:editorial:start -->` and `<!-- jules:editorial:end -->` into a
   sharp 2-4 sentence editorial summarizing the day's most interesting signal
   (use the tables and jump list below it as source material). Do not modify
   the generated tables or section structure.
2. **Deep repo enrichment pass** (scheduled every ~2 hours, ~7-8 runs/day —
   configure this schedule in Jules's own UI, not in this repo). Each run:

   a. **Select a batch of 15-20 repos** from `data/repos/*.json` that meet
      BOTH conditions: `readmeExcerpt` is present and non-empty (a repo with
      no README fetched yet has nothing to research — skip it, our own
      pipeline fills this in automatically over time), AND `aiSummary` is
      either missing, has `"source": "template"`, or has `"source": "llm"`
      with a `whatItDoes` under ~2 sentences or `keyFeatures`/`useCases`
      arrays with fewer than 3 items (a sign the model's own pass came back
      thin). Prefer repos with more stars — they're the pages most visitors
      actually look at.

   b. **Actually research each one** before writing: read the full
      `readmeExcerpt` (and `readmeHtml` if more context is needed), the
      repo's `topics`, `language`, `license`, `releases`, and
      `recentIssues`/`discussions` if present. If genuinely useful, look at
      the live GitHub repo itself (you have browsing access our static
      pipeline doesn't) — the actual issues, discussions, and recent commits
      often reveal what a project is *really* used for versus what its
      one-line description claims.

   c. **Write a genuinely deep `aiSummary`**, replacing the whole object:
      - `oneLiner` (<=120 chars): specific, names the actual differentiator,
        not generic ("a tool for X").
      - `whatItDoes` (4-6 sentences): the real problem it solves, the
        technical approach, what's actually distinctive — grounded in
        specifics from the README, not paraphrased boilerplate.
      - `keyFeatures` (5-8 items, `"Feature: one concrete sentence"` each).
      - `useCases` (4-6 items, each `{title, description}`): concrete
        scenarios naming who does this and why this project over
        alternatives — not restated topics.
      - `whoIsItFor` (2-3 sentences): audiences and prerequisites.
      - `gettingStarted`: the real first command from the README, verbatim
        if there is one.
      - `tags` (5-10, lowercase kebab-case) and `category` (one of: ai-ml,
        developer-tools, web, mobile, data, infrastructure, security,
        systems, learning, productivity, other — never invent a new one,
        it will 404 the corresponding browse page).
      - Set `"source": "jules"` and bump `"version"` by 1 (or to 3 if unset).

   d. **Only touch the `aiSummary` object** in each file — never edit
      `snapshots`, `trendingHistory`, `stars`, or any other field. This repo's
      own pipeline writes to those constantly (twice hourly); touching them
      here just increases how often your PR conflicts with an unrelated bot
      commit for no reason.
3. **Weekly digest polish** (Sundays): same editorial pass on the newest file
   in `content/reports/weekly/`.
4. **Blog posts** (when explicitly scheduled/requested — not automatic).
   Write a new file in `content/blog/` on a topic relevant to the current
   repo/report data: a trend across several tracked repos, an explainer of
   a category, a "what changed this month" retrospective. 500-900 words,
   specific and technical (name real repos, real numbers), no hype. Link to
   relevant `/repos/<id>`, `/categories/<slug>`, or `/reports/...` pages
   inline where natural — internal links help both users and search engines.
   Use a unique, descriptive slug (the filename). Never edit or delete an
   existing post; publish a new one instead.

## Hard rules

- Never use emojis anywhere.
- Plain, factual, developer-facing tone. No hype, no marketing language.
- Only modify files under `data/` and `content/`. PRs touching anything else
  will not be auto-merged.
- Keep YAML frontmatter valid; do not rename or remove frontmatter keys.
- Do not delete or rewrite historical reports; they are a permanent archive.
  Fixing a factual error in an old report is allowed.
- One focused PR per task. CI must pass; content-only PRs auto-merge after CI.

## Local verification

```
npm ci
npm run build
```

The build fails if reports have broken frontmatter or the data files are
invalid JSON — always build before opening a PR.
