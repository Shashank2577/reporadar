# RepoRadar

Open-source intelligence on trending GitHub repositories, updated twice a day.
The git repository itself is the database; content pages are still fully
static, with a couple of small serverless routes for GitHub login.

- Daily, weekly, and monthly trending reports with a featured repository each period
- Per-repo profiles: star history charts, star-jump detection, what it does, use
  cases, tech stack, contributors, license, first commit, commit counts
- List views with multi-select topic filtering on trending/topic/language pages
- Browse by topic and language; in-browser search (Pagefind); localStorage watchlist
- Request a repository: sign in with GitHub, describe what you're looking for, and
  the site opens a GitHub Issue (as you) that a workflow resolves automatically —
  it searches GitHub by stars/relevance, adds the best match to tracking, comments
  the result, and closes the issue
- SEO/AEO: JSON-LD structured data, sitemap, RSS feed, `llms.txt`
- Vercel Web Analytics + Speed Insights for real traffic and performance data
- Near-zero infrastructure cost: hybrid Next.js on Vercel, data via GitHub Actions

## Architecture

```
GitHub Actions (cron 06:15 + 18:15 UTC, plus hourly-refresh.yml every hour)
  scripts/fetch-trending.mjs      -> data/trending/<date>.json   (scrapes github.com/trending)
  scripts/update-repos.mjs        -> data/repos/<owner>__<name>.json  (GitHub REST/GraphQL + daily star snapshot)
  scripts/enrich.mjs              -> aiSummary via GitHub Models API (free, falls back to template)
  scripts/generate-reports.mjs    -> content/reports/{daily,weekly,monthly}/<slug>.md
  scripts/process-repo-requests.mjs -> resolves open `repo-request` issues, adds matches to data/repos/
  git commit + push               -> Vercel rebuilds and deploys

Runtime (Vercel, Node runtime)
  /api/auth/[...nextauth]  -> Auth.js v5, GitHub OAuth (login only — no accounts, no user table)
  /api/request-repo        -> creates a GitHub Issue as the signed-in user
  everything else          -> prerendered static HTML, same as before
```

Almost every page is still fully static and prerendered at build time — the
only server-side code is the two API routes above, both existing solely
because GitHub's OAuth token exchange requires a secret that can never live
in browser JavaScript. Star history accumulates one snapshot per day per
tracked repo, so charts and "biggest gainers" get richer every day the
pipeline runs.

### Why the search index build changed

Pagefind needs a folder of rendered HTML to crawl. The site used to produce
that for free via `output: "export"`, but static export disables API routes
entirely, so login required dropping it. `scripts/build-search-index.mjs`
replaces that: it starts the built app with `next start`, fetches every known
content URL (enumerated straight from `data/` and `content/`, no guessing),
saves the HTML into `.crawl/`, and runs Pagefind against that folder into
`public/pagefind/` — which Next serves as static files at `/pagefind/*`,
exactly where the existing search component already looked. No frontend
changes were needed; `npm run build` still does everything in one command.

## Local development

```
npm ci
npm run dev            # dev server (search index unavailable in dev)
npm run build           # build + crawl-based search index (see above)
GITHUB_TOKEN=$(gh auth token) npm run pipeline:morning   # run the data pipeline locally
```

For login to work locally, create `.env.local` with `AUTH_SECRET` (any random
string — `openssl rand -base64 32`) and a GitHub OAuth App's `AUTH_GITHUB_ID` /
`AUTH_GITHUB_SECRET` (see the deployment checklist below for creating one).

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

### Rate-limit budgeting: targeting 90% of whatever's actually left

Every run starts by calling `/rate_limit` (free — it doesn't count against
the quota itself) to learn the real remaining budget in the current window,
then computes a stop point at `remaining × (1 - TARGET_UTILIZATION)` (default
90% target, so it stops once 10% is left as a safety margin — never a fixed
call count). This matters because GitHub's hourly window is a **rolling**
reset from whenever it started, not aligned to the wall-clock hour, so a cron
firing at `:00` can land anywhere inside that window; checking live is what
makes "use up to 90% every hour" correct regardless of that drift.

Within that budget, priority order is: today's trending repos first (freshest
signal), then the `RENOWNED_COUNT` most-starred tracked repos (default 100 —
the pages most visitors actually look at, refreshed every run regardless of
where the round-robin cursor sits), then the shard fills whatever's left for
full-corpus coverage. At today's scale (49 tracked repos) there simply isn't
enough real work to spend anywhere near 90% of a ~5,000-call budget — a full
deep-facts refresh of every tracked repo only costs ~900 calls total, so
usage stays low until the corpus or the refresh cadence grows into that
budget. The mechanism doesn't manufacture busywork to hit a percentage; it
uses what's actually there, up to the target.

## Deployment checklist

1. **Push to GitHub.** Create a repository and push this project to `main`.
2. **Vercel.** Import the repo at vercel.com/new. Framework preset: Next.js
   is auto-detected (the app is no longer a static export, so Vercel builds
   it as a normal hybrid Next.js app — same deploy flow, still free on Hobby).
   Set env vars:
   - `NEXT_PUBLIC_SITE_URL` — the production URL (e.g. `https://reporadar.vercel.app`)
   - `NEXT_PUBLIC_GITHUB_REPO` — `youruser/reporadar` (adds a Source footer link
     and is the repo repo-requests are filed against)
   - `NEXT_PUBLIC_BUTTONDOWN_USERNAME` — once the newsletter exists (step 6 below)
   - `AUTH_SECRET` — any random string (`openssl rand -base64 32`)
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from step 3
3. **GitHub OAuth App (for "Request a repo" login).** In GitHub, go to
   Settings > Developer settings > OAuth Apps > New OAuth App. Homepage URL:
   your production URL. Authorization callback URL:
   `https://<your-domain>/api/auth/callback/github`. Copy the generated
   Client ID and Client Secret into Vercel as `AUTH_GITHUB_ID` and
   `AUTH_GITHUB_SECRET`, then redeploy. This step needs your GitHub account —
   it can't be scripted or done on your behalf.
4. **GitHub Actions.** Already configured in `.github/workflows/`:
   - `morning-report.yml` (06:15 UTC) — trending + repo refresh + daily report
   - `evening-report.yml` (18:15 UTC) — snapshot refresh; weekly digest on
     Sundays, monthly roundup on the 1st
   - `hourly-refresh.yml` (top of every hour) — one round-robin shard of the
     tracked corpus, so coverage keeps up as the repo count grows (see above)
   - `repo-requests.yml` (fires the instant a `repo-request` issue is opened) —
     searches, tracks, comments, closes
   - `ci.yml` — lint + build on every PR (the auto-merge gate)
   - `auto-merge-jules.yml` — auto-merges Jules PRs that only touch `data/` and
     `content/` after CI passes
   In the repo settings, under Actions > General, set Workflow permissions to
   "Read and write permissions".
5. **Jules (scheduled editorial).** In [jules.google.com](https://jules.google.com)
   connect the repo. `AGENTS.md` tells Jules exactly what to do. Create scheduled
   tasks, e.g. daily: "Do the editorial pass on the latest daily report as
   described in AGENTS.md" and weekly (Sunday): "Do the weekly digest polish as
   described in AGENTS.md". Jules opens PRs; content-only PRs auto-merge after CI.
6. **Newsletter (free).** Create a [Buttondown](https://buttondown.com) account
   (free tier: 100 subscribers). In Buttondown settings, add the RSS-to-email
   automation pointing at `https://<your-domain>/feed.xml`, filtered to items
   in category `weekly`. Set `NEXT_PUBLIC_BUTTONDOWN_USERNAME` in Vercel and
   redeploy — the subscribe forms go live.
7. **Search Console.** Submit `https://<your-domain>/sitemap.xml` to Google
   Search Console and Bing Webmaster Tools for fastest indexing.
8. **Analytics.** Nothing to configure — Vercel Web Analytics and Speed
   Insights are wired into every page already. Enable them for the project
   in the Vercel dashboard (Analytics tab) to start seeing real visitor and
   performance data; both are free on Hobby.

## Backfilling trending history

GitHub's own trending page has no history or archive API — it only ever
shows the current day. `scripts/backfill-trending-history.mjs` reconstructs a
day-by-day "most stars gained that day" ranking for however far back you ask,
from the same GH Archive dataset (via ClickHouse's public playground) used
for star-history backfill:

```
node scripts/backfill-trending-history.mjs 200   # last 200 days, or set BACKFILL_DAYS
```

This costs **zero GitHub API calls** — it only queries ClickHouse and writes
`data/trending/<date>.json` files plus minimal repo stubs (`id`, `owner`,
`name`, and a `trendingHistory` entry per day they appeared). It never
overwrites a trending file that already has real scraped data. The existing
hourly/morning/evening pipeline then fills in full facts, README, contributors,
star history, and AI summaries for every newly discovered repo on its normal
rate-limited rotation (the 90%-utilization budgeting above is exactly what
makes a large one-time population jump like this safe to absorb over a few
runs instead of needing a special bulk-import mode). Safe to re-run any time
with a larger day count — it only adds what's missing.

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
