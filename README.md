# RepoRadar

Open-source intelligence on trending GitHub repositories, updated twice a day.
Fully static Next.js site — the git repository itself is the database.

- Daily, weekly, and monthly trending reports with a featured repository each period
- Per-repo profiles: star history charts, star-jump detection, what it does, use
  cases, tech stack, contributors, license, first commit, commit counts
- Browse by topic and language; in-browser search (Pagefind); localStorage watchlist
- SEO/AEO: JSON-LD structured data, sitemap, RSS feed, `llms.txt`
- Zero infrastructure cost: static export on Vercel, data via GitHub Actions cron

## Architecture

```
GitHub Actions (cron 06:15 + 18:15 UTC)
  scripts/fetch-trending.mjs   -> data/trending/<date>.json   (scrapes github.com/trending)
  scripts/update-repos.mjs     -> data/repos/<owner>__<name>.json  (GitHub REST API + daily star snapshot)
  scripts/enrich.mjs           -> aiSummary via GitHub Models API (free, falls back to template)
  scripts/generate-reports.mjs -> content/reports/{daily,weekly,monthly}/<slug>.md
  git commit + push            -> Vercel rebuilds and deploys the static site
```

Star history accumulates one snapshot per day per tracked repo, so charts and
"biggest gainers" get richer every day the pipeline runs.

## Local development

```
npm ci
npm run dev            # dev server (search index unavailable in dev)
npm run build          # static export to out/ + Pagefind search index
GITHUB_TOKEN=$(gh auth token) npm run pipeline:morning   # run the data pipeline locally
```

## Running costs and autopilot reality

Measured, not estimated (numbers from real runs on this repository):

| Resource | Free allowance | What this project uses |
| --- | --- | --- |
| GitHub Actions minutes | Unlimited (public repo) | ~2 min per run, 2 runs/day, ~120 min/month |
| GitHub REST API | 5,000/hour observed with `GITHUB_TOKEN` in Actions on this repo (GitHub documents 1,000/hour per repository for Actions tokens, so treat 1,000 as the planning floor) | 40 calls for a snapshot-only run; ~20 calls per repo needing a deep refresh, capped at 25 repos per run (~540 worst case) |
| GitHub Models (AI summaries) | ~50 requests/day for `openai/gpt-4o` on the free tier | 1 call per newly-tracked repo, capped at 20 per run |
| GH Archive on ClickHouse (star history) | Public, anonymous | 1 batched query per run, only for repos missing history |
| Vercel Hobby | 100 deploys/day, generous build minutes | 2-3 deploys/day, ~1 min build |
| Buttondown | 100 subscribers | RSS-to-email, no code |

Safety behaviour built in: the pipeline reports its own API usage, stops
starting new work below a rate-limit floor (deferring repos to the next run
rather than failing), staggers deep refreshes across days so they never all
come due at once, and stops enrichment cleanly when the model quota is hit.

### Do you need Jules?

No. The site is fully autonomous on GitHub Actions alone: the workflows collect
data, generate reports, commit, and Vercel redeploys. Jules is an optional
editorial layer that rewrites the human-voice paragraph between the
`<!-- jules:editorial -->` markers and improves any summary still marked
`"source": "template"`. Without Jules, those sections keep their generated text.

### Scaling limits

At the default `TRACK_LIMIT` of 400 repositories, a snapshot-only run costs 400
REST calls plus up to ~500 for deep refreshes. That is comfortable against the
5,000/hour ceiling measured in Actions, but tight against the 1,000/hour figure
GitHub documents for Actions tokens. If runs ever start deferring repos (the log
says so explicitly), add a `REPORADAR_TOKEN` secret — a classic PAT with
`public_repo` scope — and the workflows will use it automatically for a
guaranteed 5,000/hour. Beyond roughly 1,500 tracked repositories, split the
refresh across additional scheduled runs.

## Deployment checklist

1. **Push to GitHub.** Create a repository and push this project to `main`.
2. **Vercel.** Import the repo at vercel.com/new. Framework preset: Next.js
   (static export is picked up automatically from `next.config.ts`). Set env vars:
   - `NEXT_PUBLIC_SITE_URL` — the production URL (e.g. `https://reporadar.vercel.app`)
   - `NEXT_PUBLIC_GITHUB_REPO` — `youruser/reporadar` (adds a Source footer link)
   - `NEXT_PUBLIC_BUTTONDOWN_USERNAME` — once the newsletter exists (step 5)
3. **GitHub Actions.** Already configured in `.github/workflows/`:
   - `morning-report.yml` (06:15 UTC) — trending + repo refresh + daily report
   - `evening-report.yml` (18:15 UTC) — snapshot refresh; weekly digest on
     Sundays, monthly roundup on the 1st
   - `ci.yml` — lint + build on every PR (the auto-merge gate)
   - `auto-merge-jules.yml` — auto-merges Jules PRs that only touch `data/` and
     `content/` after CI passes
   In the repo settings, under Actions > General, set Workflow permissions to
   "Read and write permissions".
4. **Jules (scheduled editorial).** In [jules.google.com](https://jules.google.com)
   connect the repo. `AGENTS.md` tells Jules exactly what to do. Create scheduled
   tasks, e.g. daily: "Do the editorial pass on the latest daily report as
   described in AGENTS.md" and weekly (Sunday): "Do the weekly digest polish as
   described in AGENTS.md". Jules opens PRs; content-only PRs auto-merge after CI.
5. **Newsletter (free).** Create a [Buttondown](https://buttondown.com) account
   (free tier: 100 subscribers). In Buttondown settings, add the RSS-to-email
   automation pointing at `https://<your-domain>/feed.xml`, filtered to items
   in category `weekly`. Set `NEXT_PUBLIC_BUTTONDOWN_USERNAME` in Vercel and
   redeploy — the subscribe forms go live.
6. **Search Console.** Submit `https://<your-domain>/sitemap.xml` to Google
   Search Console and Bing Webmaster Tools for fastest indexing.

## Data model

- `data/trending/<date>.json` — raw daily/weekly/monthly trending lists
- `data/repos/<owner>__<name>.json` — repository profile: facts, `snapshots`
  (star history), `trendingHistory` (rank appearances), `aiSummary`
- `content/reports/<kind>/<slug>.md` — published reports (permanent archive);
  frontmatter drives titles, descriptions, and featured repos

## Costs

Everything runs on free tiers: Vercel static hosting, GitHub Actions (public
repo: unlimited minutes), GitHub Models API (free tier via `GITHUB_TOKEN`),
Buttondown free plan, Pagefind (static, no service). There is nothing to pay
for at any scale this design supports.
