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

// Words that carry no search signal in a natural-language request.
const STOPWORDS = new Set(
  ("a an and any are as at be by can could for from has have how i if in into is it its like of on or other others " +
    "our out should some such that the their them there these they this to up us use using want was we what when where " +
    "which who will with would you your repo repos repository repositories project projects tool tools something " +
    "anything thing things find looking need needs open source opensource github run runs running").split(" ")
);

export function keywords(text) {
  const words = text
    .toLowerCase()
    .replace(/['\u2019]s\b/g, "")
    .replace(/[^\w\s.+#-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

// GitHub search ANDs every word, so a whole sentence almost never matches.
// Try the keywords as phrase windows, longest first: the full set, then every
// run of consecutive keywords down to two words, and finally single words.
export function candidateQueries(text) {
  const kw = keywords(text).slice(0, 8);
  const queries = [];
  for (let size = kw.length; size >= 2; size--) {
    for (let start = 0; start + size <= kw.length; start++) queries.push(kw.slice(start, start + size).join(" "));
  }
  if (kw.length === 1) queries.push(kw[0]);
  return queries;
}

async function searchOnce(q) {
  const res = await ghFetch(
    `/search/repositories?q=${encodeURIComponent(`${q} in:name,description,topics archived:false fork:false`)}&sort=stars&order=desc&per_page=5`
  );
  return res.data?.items || [];
}

// A candidate must be a real, established project: a zero-star hit for a loose
// query is noise.
const MIN_STARS = 50;
const MAX_CANDIDATES = 12;
const MAX_SEARCHES = 6;
const MODEL = process.env.MODELS_MODEL || "openai/gpt-4o";

// Collect distinct candidates across the phrase windows (best-first within each).
async function gatherCandidates(query) {
  const seen = new Map();
  let searches = 0;
  for (const q of candidateQueries(query)) {
    if (seen.size >= MAX_CANDIDATES || searches >= MAX_SEARCHES) break;
    searches++;
    for (const r of await searchOnce(q)) {
      if (r.stargazers_count >= MIN_STARS && !seen.has(r.full_name)) seen.set(r.full_name, r);
    }
  }
  return [...seen.values()].slice(0, MAX_CANDIDATES);
}

// Keyword search cannot tell a social-media tool from a tutorial that merely
// mentions social media, so a model picks the genuine fit, or says none fits.
// Returns { match: repo | null } or null when the model is unavailable.
export async function pickWithModel(query, candidates) {
  const t = process.env.MODELS_TOKEN || token();
  if (!t || !candidates.length) return null;
  const list = candidates
    .map(
      (r, i) =>
        `${i + 1}. ${r.full_name} (${r.stargazers_count} stars, ${r.language || "n/a"}) topics: ${(r.topics || []).slice(0, 8).join(", ") || "n/a"}\n   ${(r.description || "no description").slice(0, 240)}`
    )
    .join("\n");
  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You match a user's request for an open-source project to the single best repository from a candidate list. " +
            "Only choose a repository whose purpose genuinely fits what was asked; tutorials, course notes, unrelated projects that merely " +
            "mention the same words, and awesome-lists do not fit unless a list was requested. If none fits, answer null. " +
            'Respond with JSON only: {"match": "owner/name" | null, "reason": "one short sentence"}',
        },
        { role: "user", content: `Request: ${query}\n\nCandidates:\n${list}` },
      ],
    }),
  });
  if (!res.ok) {
    console.warn(`  models API ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return null;
  }
  const raw = await res.text();
  try {
    const parsed = JSON.parse(JSON.parse(raw).choices[0].message.content);
    const match = parsed.match ? candidates.find((r) => r.full_name.toLowerCase() === String(parsed.match).toLowerCase()) : null;
    console.log(`  model: ${match ? match.full_name : "none fit"} (${parsed.reason || "no reason"})`);
    return { match: match || null, reason: parsed.reason || "" };
  } catch {
    console.warn(`  models API returned an unusable response: ${raw.slice(0, 150)}`);
    return null;
  }
}

// Repos that are about a subject rather than a tool for it.
const NOT_A_TOOL = /\b(tutorial|course|courses|awesome|cheatsheet|cheat-sheet|interview|roadmap|notes|homework|assignment|templates?|dataset|learning|study)\b/i;

// Deterministic fallback for when the model is unavailable (the Models API has
// been returning a bare "OK" instead of a completion). Auto-adds a repo only on
// a clear match: most of the request's keywords appear in the repo's name,
// topics or description, and it is not a tutorial or list. Anything less
// confident returns null, so the comment lists candidates instead.
// Higher than the search floor: a guess is only worth publishing for an established project.
const MIN_STARS_AUTO = 100;

export function heuristicPick(query, candidates) {
  const kw = keywords(query).slice(0, 8);
  if (kw.length < 2) return null;
  const need = Math.max(2, Math.ceil(kw.length * 0.6));
  const asksForList = NOT_A_TOOL.test(query);
  let best = null;
  for (const r of candidates) {
    const text = `${r.full_name} ${(r.topics || []).join(" ")} ${r.description || ""}`.toLowerCase();
    if (r.stargazers_count < MIN_STARS_AUTO) continue;
    if (!asksForList && NOT_A_TOOL.test(text)) continue;
    const hits = kw.filter((w) => text.includes(w)).length;
    if (hits < need) continue;
    if (!best || hits > best.hits || (hits === best.hits && r.stargazers_count > best.repo.stargazers_count)) best = { repo: r, hits };
  }
  return best ? { match: best.repo, reason: `${best.hits}/${kw.length} request keywords match` } : null;
}

export async function findBestMatch(query) {
  const candidates = await gatherCandidates(query);
  let picked = await pickWithModel(query, candidates);
  if (!picked) {
    picked = heuristicPick(query, candidates);
    if (picked) console.log(`  heuristic: ${picked.match.full_name} (${picked.reason})`);
  }
  return { candidates, picked };
}

export async function postJson(url, method, body) {
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

  // Selected by label OR by the form's title prefix: GitHub drops labels on
  // issues opened by people without push access, so the prefix is what
  // identifies a visitor's request.
  const res = await ghFetch(`/repos/${targetOwner}/${targetRepo}/issues?state=open&per_page=50`);
  const issues = (res.data || []).filter(
    (i) =>
      !i.pull_request &&
      ((i.labels || []).some((l) => l.name === "repo-request") || /^Repo request:/i.test(i.title))
  );
  console.log(`Found ${issues.length} open repo-request issue(s)`);

  for (const issue of issues) {
    if (!(issue.labels || []).some((l) => l.name === "repo-request")) {
      await postJson(`https://api.github.com/repos/${targetOwner}/${targetRepo}/issues/${issue.number}/labels`, "POST", {
        labels: ["repo-request"],
      })
        // Keep our copy in step: the closing PATCH below sends the full label list,
        // and a stale copy would silently drop the label we just added.
        .then(() => (issue.labels = [...(issue.labels || []), { name: "repo-request" }]))
        .catch((err) => console.warn(`  could not label #${issue.number}: ${err.message}`));
    }
    const query = extractQuery(issue);
    console.log(`#${issue.number}: "${query}"`);
    let match = null;
    let candidates = [];
    let modelUnavailable = false;
    try {
      const found = await findBestMatch(query);
      candidates = found.candidates;
      if (found.picked) match = found.picked.match;
      else modelUnavailable = candidates.length > 0; // neither the model nor the heuristic was confident
    } catch (err) {
      console.warn(`  search failed: ${err.message}`);
    }

    let comment;
    if (!match) {
      const top = candidates.slice(0, 3);
      comment =
        (modelUnavailable
          ? `I found some candidates for "${query}" but couldn't confirm that any of them clearly fits, so I haven't added one to the site.\n\n`
          : `I couldn't find a repository that genuinely fits: "${query}".\n\n`) +
        (top.length
          ? `Closest results (not added):\n${top.map((r) => `- [${r.full_name}](${r.html_url}) (${r.stargazers_count.toLocaleString()} stars)`).join("\n")}\n\n`
          : "") +
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
