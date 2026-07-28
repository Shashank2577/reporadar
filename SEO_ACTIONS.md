# SEO / AEO action checklist

Everything the code and pipeline can do for SEO is already built in: JSON-LD
on every page type, a sitemap with 550+ URLs, `robots.txt` allowing all
crawlers (including AI bots), `llms.txt`, RSS, canonical URLs, and now the
blog. **None of that makes Google show the site yet.** A brand-new domain has
to be discovered, crawled, and indexed before it can rank for anything — that
step needs a few actions only you can take (they're tied to your Google/Bing
accounts), and then real time (days to weeks, sometimes longer).

Verify current status any time by searching **`site:reporadar.spreix.com`**
on Google. Today it returns nothing. The day that search starts returning
pages is the real signal that indexing has begun — not a keyword ranking,
which takes much longer and depends on backlinks and competition, not just
on-page SEO.

## 1. Get indexed (do this first — nothing else matters until this happens)

- [ ] **Google Search Console** — go to
      [search.google.com/search-console](https://search.google.com/search-console),
      add `reporadar.spreix.com` as a property (use the DNS or HTML-tag
      verification method), then submit the sitemap:
      `https://reporadar.spreix.com/sitemap.xml`. This is the single highest-
      leverage action available — it tells Google the site exists instead of
      waiting for accidental discovery.
- [ ] **Bing Webmaster Tools** — same thing at
      [bing.com/webmasters](https://www.bing.com/webmasters). Bing also feeds
      some AI answer engines directly, so this matters for AEO too.
- [ ] **Request indexing manually** for the homepage and 2-3 key pages
      (`/categories`, `/blog`, the newest daily report) inside Search Console's
      URL Inspection tool, once the property is verified — this can pull
      those specific pages in within hours instead of waiting for a full
      crawl.

## 2. Get backlinks (this is what actually drives ranking, not code)

No on-page change can substitute for another site linking to you. In rough
order of effort-to-impact:

- [ ] Post the site (or a specific report/blog post) on **Hacker News**
      ("Show HN: ..."), **r/opensource** or **r/programming** on Reddit, and
      **dev.to** or **Hashnode** (a short cross-post with a canonical link
      back to the original counts as a real backlink).
- [ ] Share on **X/Twitter** and **LinkedIn** when a report finds something
      genuinely interesting (a real star jump, a notable new repo) — link
      directly to that repo's profile page, not just the homepage.
- [ ] List the project on relevant **directories**: alternativeto.net,
      libhunt.com, and similar "discover open source tools" sites often
      accept submissions and link back.
- [ ] If you know any GitHub-adjacent newsletter writers or bloggers, a
      single mention from an established, already-indexed site is worth more
      than dozens of directory listings.

## 3. Publish content regularly (SEO and AEO both reward freshness + depth)

- [ ] The daily/weekly/monthly reports already provide recurring, dated,
      unique content — keep the automation running, that alone is a real
      signal.
- [ ] Use the new **`/blog`** section (`content/blog/*.md`) for anything that
      doesn't fit the data-table report format: "why X category is growing,"
      "how we built the star-jump detector," retrospectives, category deep
      dives. Longer, more narrative content ranks for different (often
      higher-value) search terms than the reports do, and is what other sites
      are actually likely to link to.
- [ ] Jules can write these too — see the "Blog posts" task in `AGENTS.md`.
      Ask for one explicitly when you want it; it isn't scheduled
      automatically like the daily editorial pass.
- [ ] Link between pages liberally (blog → repo profile → category → report).
      Internal links help both search engines and readers, and cost nothing.

## 4. AEO (showing up in ChatGPT / Claude / Perplexity answers)

- [ ] Already done: `llms.txt` at the site root, plain factual "what X does"
      style headers on every repo page, `robots.txt` explicitly allowing
      GPTBot/ClaudeBot/PerplexityBot/CCBot.
- [ ] The biggest lever here is the same as SEO: **being cited from other
      already-trusted sources**. Answer engines lean heavily on sites that
      already rank well and get linked to, so steps 1-3 above are not
      separate from AEO — they're the same work.
- [ ] Keep content factual, specific, and dated (which the reports already
      are) — this is exactly the shape of content answer engines prefer to
      quote.

## 5. Analytics (so you can see whether any of this is working)

- [ ] Vercel Web Analytics and Speed Insights are already wired into every
      page. Enable them for the project in the Vercel dashboard's Analytics
      tab (nothing to code) to start seeing real visitor counts, top pages,
      and referrers — this is how you'll actually see traffic arrive from
      the channels above, days to weeks after doing them.
- [ ] Once Search Console is verified, its own dashboard shows real search
      impressions and clicks per query — a more direct signal than
      `site:` searches or general analytics.

## What "done" looks like, realistically

- **Days**: `site:reporadar.spreix.com` starts returning pages.
- **Weeks**: the site starts appearing for its own exact name and very
  specific long-tail queries (e.g. a specific repo name + "star history").
- **Months, with real backlinks**: ranking for competitive terms like "best
  AI agent repositories" or "GitHub trending alternative." This timeline is
  normal for any new site and is not a sign anything is broken.
