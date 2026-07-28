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

Measured, not estimated (numbers from real runs on this repository, including
actual GitHub Actions executions, not just local tests):

| Resource | Free allowance | What this project uses |
| --- | --- | --- |
| GitHub Actions minutes | Unlimited (public repo) | ~45s per run; 26 runs/day (24 hourly + morning + evening) ≈ 20 min/day, all free regardless |
| GitHub REST API | 5,000/hour observed with `GITHUB_TOKEN` in Actions on this repo (GitHub documents 1,000/hour per repository for Actions tokens — treat 1,000 as the planning floor) | ~40 calls/run at today's scale (40 tracked repos); auto-scales with population, see below |
| GitHub Models (AI summaries) | ~50 requests/day for `openai/gpt-4o` on the free tier | 1 call per newly-tracked or stale-summary repo, capped at 20 per run |
| GH Archive on ClickHouse (star history) | Public, anonymous | 1 batched query per run, only for repos missing history |
| Vercel Hobby | 100 deploys/day, generous build minutes | Up to 26 deploys/day if every run changes data, ~1 min build each |
| Buttondown | 100 subscribers | RSS-to-email, no code |

Safety behaviour built in: the pipeline reports its own API usage every run,
stops starting new work below a rate-limit floor (deferring repos to the next
run rather than failing), staggers deep refreshes across days so they never
all come due at once, and stops enrichment cleanly when the model quota is hit.

### Do you need Jules?

No. The site is fully autonomous on GitHub Actions alone: the workflows collect
data, generate reports, commit, and Vercel redeploys. Jules is an optional
editorial layer that rewrites the human-voice paragraph between the
`<!-- jules:editorial -->` markers and improves any summary still marked
`"source": "template"`. Without Jules, those sections keep their generated text.

### How coverage scales as the tracked repo count grows

`.github/workflows/hourly-refresh.yml` runs `scripts/update-repos.mjs` every
hour, in addition to the morning and evening runs (26 executions/day total).
Every run always refreshes today's trending repos immediately, plus one
**shard** of a round-robin rotation over the entire tracked corpus. The shard
size is not a fixed number — it is computed each run as
`ceil(tracked_repo_count / 20)`, so it auto-scales:

| Tracked repos | Shard size per run | Repos covered per day (26 runs) |
| --- | --- | --- |
| 40 (today) | 40 (floored to the whole corpus) | every repo, multiple times |
| 500 | 40 | ~1,040 — every repo covered more than once |
| 2,000 | 100 | ~2,600 — full coverage with margin |
| 3,000 (`MAX_TRACKED` default) | 150 | ~3,900 — full coverage with margin |

A rotation cursor persists in `data/.pipeline-cursor.json` (committed like
everything else) so the shard picks up where the last run left off, and
nothing is skipped or double-processed across restarts. New trending repos
are added to the tracked corpus up to `MAX_TRACKED` (default 3,000, raise via
the env var); past that ceiling nothing new is added but nothing already
tracked is ever dropped or archived — nothing goes stale as long as the
population fits the daily rotation. Snapshot calls (1 REST call/repo) are
cheap enough that this holds at real-world scale; deep-fact refreshes (the
expensive ~18-call profile rebuild) stay capped per run regardless of
population size, so they simply take longer to cycle through at very large
scale rather than ever exceeding the rate limit.

Practically: this design comfortably handles thousands of tracked repos
before any limit is at risk. If it ever gets there, add a `REPORADAR_TOKEN`
secret (a classic PAT with `public_repo` scope, 5,000/hour guaranteed) — the
workflows already use it automatically when present.

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
   - `hourly-refresh.yml` (top of every hour) — one round-robin shard of the
     tracked corpus, so coverage keeps up as the repo count grows (see above)
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
