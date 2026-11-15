# RepoRadar

[![GitHub stars](https://img.shields.io/github/stars/Shashank2577/reporadar?style=flat)](https://github.com/Shashank2577/reporadar/stargazers)

**Live site: [reporadar.spreix.com](https://reporadar.spreix.com)**

RepoRadar tracks trending GitHub repositories and publishes what it finds:
daily, weekly and monthly reports, plus a profile page for every repository
with star history, an AI-written summary, use cases and a getting-started
command. It follows 1,200+ repositories, refreshes them every hour, and the
whole thing runs on GitHub Actions and Cloudflare Pages. The git repository
is the database.

Traffic, last 30 days to 2026-11-15 (Cloudflare analytics): about 5 million
requests served and about 275,000 visits.

If RepoRadar saved you time, a star on this repository helps other developers
find it.

## What you get

- Daily, weekly and monthly trending reports, each with a featured repository
- Per-repo profiles: star history charts, star-jump detection, what it does, key
  features, use cases, license, contributors, first commit, commit activity
- Star history reconstructed from GH Archive, so charts do not start the day we
  began tracking
- Browse by topic, language and category; in-browser search (Pagefind); a
  localStorage watchlist
- An [MCP server](https://reporadar.spreix.com/mcp) at `/api/mcp` so Claude Code,
  Cursor, Codex and other agents can query the same data (5 read-only tools:
  `search_repos`, `get_repo`, `get_trending`, `browse_category`, `get_report`)
- Request a repository: sign in with GitHub, describe what you want, and a
  workflow finds the best match, starts tracking it and replies on the issue
- RSS feed, `llms.txt`, sitemap and JSON-LD structured data

Add the MCP server to a client that supports remote servers:

```json
{
  "mcpServers": {
    "reporadar": { "url": "https://reporadar.spreix.com/api/mcp" }
  }
}
```

## How it works

```
GitHub Actions (hourly refresh, plus morning and evening report runs)
  scripts/fetch-trending.mjs        -> data/trending/<date>.json
  scripts/update-repos.mjs          -> data/repos/<owner>__<name>.json
  scripts/enrich.mjs                -> aiSummary via GitHub Models (free)
  scripts/deep-enrich.mjs           -> deeper aiSummary via Gemini / Groq free tiers
  scripts/generate-reports.mjs      -> content/reports/{daily,weekly,monthly}/<slug>.md
  scripts/process-repo-requests.mjs -> resolves `repo-request` issues
  git commit + push                 -> deploy-cloudflare.yml builds and publishes

Cloudflare Pages
  static export of every page (Next.js)
  functions/api/auth/*     -> GitHub OAuth login (Auth.js)
  functions/api/request-repo, feature-request -> open GitHub issues as the user
  functions/api/mcp        -> MCP server
```

Pages are prerendered at build time. The only server-side code is the Pages
Functions above, which exist because GitHub's OAuth token exchange needs a
secret that cannot live in browser JavaScript. Star history accumulates one
snapshot per day per tracked repo, so charts get richer every day the
pipeline runs. Search is built by `scripts/build-search-index.mjs`, which
crawls the built site and runs Pagefind over it.

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
| Cloudflare Pages | Unlimited bandwidth; direct-upload deploys are not build-minute metered | 12 deploys/day (every 2h), built on GitHub Actions in ~1 min |
| Buttondown | 100 subscribers | RSS-to-email, no code |

Safety behaviour built in: the pipeline reports its own API usage every run,
stops starting new work below a rate-limit floor (deferring repos to the next
run rather than failing), staggers deep refreshes across days so they never
all come due at once, and stops enrichment cleanly when the model quota is hit.

### Editorial and deep enrichment

The site is autonomous on GitHub Actions alone. `scripts/deep-enrich.mjs`
(`gemini-deep-enrichment.yml`, every 6 hours) rewrites thin or template
`aiSummary` objects using the Gemini or Groq free tiers; set `GEMINI_API_KEY`
and/or `GROQ_API_KEY` as repository secrets to enable it. It only ever writes
the `aiSummary` object. Jules, which `AGENTS.md` was written for, is being
retired by Google, so these workflows replace it.

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
2. **Cloudflare Pages.** Create a Pages project named `reporadar` using
   "Direct Upload" (no Git integration; GitHub Actions uploads the build). Then:
   - Repo secrets: `CLOUDFLARE_API_TOKEN` (Pages:Edit) and `CLOUDFLARE_ACCOUNT_ID`.
   - Repo variables: `NEXT_PUBLIC_SITE_URL` (the production URL, required: canonicals,
     sitemap and robots.txt are built from it), optionally
     `NEXT_PUBLIC_BUTTONDOWN_USERNAME` and `NEXT_PUBLIC_CF_BEACON_TOKEN`.
   - Pages secrets (`wrangler pages secret put <NAME> --project-name reporadar`):
     `AUTH_SECRET` (any random string, `openssl rand -base64 32`),
     `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` (from step 3).
   - `GITHUB_REPO` (the repo repo-requests are filed against) lives in `wrangler.toml`.
   - Add the custom domain under the project's Custom domains tab.
3. **GitHub OAuth App (for "Request a repo" login).** In GitHub, go to
   Settings > Developer settings > OAuth Apps > New OAuth App. Homepage URL:
   your production URL. Authorization callback URL:
   `https://<your-domain>/api/auth/callback/github`. Copy the generated
   Client ID and Client Secret into the Pages secrets above, then redeploy.
   This step needs your GitHub account — it can't be scripted or done on your behalf.
4. **GitHub Actions.** Already configured in `.github/workflows/`:
   - `morning-report.yml` (06:15 UTC) — trending + repo refresh + daily report
   - `evening-report.yml` (18:15 UTC) — snapshot refresh; weekly digest on
     Sundays, monthly roundup on the 1st
   - `hourly-refresh.yml` (top of every hour) — one round-robin shard of the
     tracked corpus, so coverage keeps up as the repo count grows (see above)
   - `repo-requests.yml` (fires the instant a `repo-request` issue is opened) —
     searches, tracks, comments, closes
   - `ci.yml` — lint + typecheck + build on every PR (the auto-merge gate)
   - `deploy-cloudflare.yml` — builds the static export and deploys it to Cloudflare Pages
   - `auto-merge-jules.yml` — auto-merges Jules PRs that only touch `data/` and
     `content/` after CI passes
   In the repo settings, under Actions > General, set Workflow permissions to
   "Read and write permissions".
5. **Deep enrichment (optional).** Add `GEMINI_API_KEY` (from an AI Studio project
   with no billing attached, so the free tier cannot charge) and/or `GROQ_API_KEY`
   as repository secrets. `gemini-deep-enrichment.yml` skips cleanly until one exists.
6. **Newsletter (free).** Create a [Buttondown](https://buttondown.com) account
   (free tier: 100 subscribers). In Buttondown settings, add the RSS-to-email
   automation pointing at `https://<your-domain>/feed.xml`, filtered to items
   in category `weekly`. Set the `NEXT_PUBLIC_BUTTONDOWN_USERNAME` repository variable and
   redeploy — the subscribe forms go live.
7. **Search Console.** Submit `https://<your-domain>/sitemap.xml` to Google
   Search Console and Bing Webmaster Tools for fastest indexing.
8. **Analytics.** Two layers, both optional and both off until their variable is set:
   - **PostHog** (clicks, time on page, scroll depth, heatmaps, funnels, custom events
     such as `repo_open`, `outbound_click`, `search`, `mcp_config_copied`,
     `repo_request_submitted`): create a project at posthog.com, then set the
     `NEXT_PUBLIC_POSTHOG_KEY` repository variable (and `NEXT_PUBLIC_POSTHOG_HOST` for the
     EU cloud). It runs cookieless, so no consent banner is needed; session replay is off.
   - **Cloudflare Web Analytics** (traffic and Core Web Vitals): enable it on the Pages
     project's Metrics tab, or set `NEXT_PUBLIC_CF_BEACON_TOKEN`.
   After each deploy the workflow also notifies Bing and other IndexNow partners of changed URLs.

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

## Featured projects and traffic stats

**Get featured.** `/featured` lets a signed-in GitHub user request a spot for their repository with a one-line
pitch. The Pages Function `functions/api/feature-request.ts` opens an issue titled `Feature request: owner/name`.
`.github/workflows/feature-requests.yml` validates the repository, starts tracking it, and acknowledges the
request. Nothing is featured automatically: a maintainer approves by adding the **`feature-approved`** label
(add **`sponsored`** first for a paid placement, which then renders as "Sponsored" with `rel="sponsored"`).
Approval writes `data/featured.json` (30 days by default, `FEATURE_DAYS` to change) and triggers a deploy.
Featured entries never affect any ranking. Set `NEXT_PUBLIC_FEATURE_SPONSOR_URL` (for example a Stripe Payment
Link) to show a "Sponsor a slot" link on `/featured`.

GitHub drops labels on issues opened by people without push access, so both the repo-request and
feature-request workflows trigger on the issue title (`opened`) and apply labels themselves.

**Traffic stats.** The deploy workflow runs `scripts/fetch-site-stats.mjs`, which queries PostHog and writes
`data/site-stats.json` (not committed). It powers the visit count in the footer (shown once there are at least
100 visits in 30 days), "Most viewed this week" on the home page, and a "Views (30d)" figure on each repo page.
Configure the `POSTHOG_PERSONAL_API_KEY` repository secret (a personal API key with `query:read`) and the
`POSTHOG_PROJECT_ID` repository variable; without them the site builds without any of these numbers. "Visits"
are PostHog sessions; the analytics run cookieless, so a visitor who reloads in a new tab may count again.

## Costs

Everything runs on free tiers: Cloudflare Pages, GitHub Actions (public
repo: unlimited minutes), GitHub Models API (free tier via `GITHUB_TOKEN`),
Buttondown free plan, Pagefind (static, no service). There is nothing to pay
for at any scale this design supports.

## License

MIT. See [LICENSE](LICENSE).
