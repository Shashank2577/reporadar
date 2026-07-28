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
2. **Improve repo summaries.** In `data/repos/*.json`, if an `aiSummary` has
   `"source": "template"`, replace `whatItDoes`, `whyItMatters`, `useCases`,
   and `tags` with better content derived from `readmeExcerpt` and
   `description`, and set `"source": "jules"`.
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
