// Processes open issues labeled `repo-request`: searches GitHub for the
// best-matching repository (by stars) for the requester's description, adds
// it to the tracked corpus, comments on the issue with the result, and
// closes it. The issue itself is the durable, attributed request record —
// its author is literally the GitHub user who asked, no separate database.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, repoSlug, token } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
// GITHUB_REPOSITORY ("owner/repo") is set automatically inside every GitHub
// Actions run; no separate config needed.
const [targetOwner, targetRepo] = (process.env.GITHUB_REPOSITORY || "").split("/");

function extractQuery(issue) {
  const body = (issue.body || "").split("\n---\n")[0].trim();
  return body || issue.title.replace(/^Repo request:\s*/i, "").trim();
}

async function findBestMatch(query) {
  const q = encodeURIComponent(query.replace(/[^\w\s.-]/g, " ").trim().slice(0, 250));
  const res = await ghFetch(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`);
  const items = (res.data?.items || []).filter((r) => !r.archived);
  return items[0] || null;
}

async function postJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  if (!targetOwner || !targetRepo) throw new Error("GITHUB_REPOSITORY is not set (owner/repo)");

  const res = await ghFetch(
    `/repos/${targetOwner}/${targetRepo}/issues?state=open&labels=repo-request&per_page=20`
  );
  const issues = (res.data || []).filter((i) => !i.pull_request);
  console.log(`Found ${issues.length} open repo-request issue(s)`);

  for (const issue of issues) {
    const query = extractQuery(issue);
    console.log(`#${issue.number}: "${query}"`);
    let match = null;
    try {
      match = await findBestMatch(query);
    } catch (err) {
      console.warn(`  search failed: ${err.message}`);
    }

    let comment;
    if (!match) {
      comment =
        `I couldn't find a good match on GitHub for: "${query}".\n\n` +
        `Try rephrasing with more specific keywords (language, framework, or the exact problem it solves).`;
    } else {
      const file = path.join(REPO_DIR, `${repoSlug(match.full_name)}.json`);
      const isNew = !fs.existsSync(file);
      if (isNew) {
        fs.mkdirSync(REPO_DIR, { recursive: true });
        fs.writeFileSync(
          file,
          JSON.stringify({ id: match.full_name, snapshots: [], trendingHistory: [] }, null, 2)
        );
      }
      comment =
        `Best match: **[${match.full_name}](${match.html_url})** ` +
        `(${match.stargazers_count.toLocaleString()} stars${match.description ? ` — ${match.description}` : ""}).\n\n` +
        (isNew
          ? `Added to tracking — its full profile (star history, README, contributors, and more) will appear on the site within a day.`
          : `This repository is already tracked — see its profile on the site.`);
    }

    try {
      await postJson(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/issues/${issue.number}/comments`,
        "POST",
        { body: comment }
      );
      await postJson(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/issues/${issue.number}`,
        "PATCH",
        { state: "closed", labels: [...(issue.labels || []).map((l) => l.name), match ? "added" : "no-match"] }
      );
      console.log(`  ${match ? `matched ${match.full_name}` : "no match"}, commented and closed`);
    } catch (err) {
      console.warn(`  failed to comment/close: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
