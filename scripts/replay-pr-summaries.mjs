// Replays the AI summaries from an open data PR onto the CURRENT working tree.
//
// Jules enrichment PRs rewrite data/repos/*.json on old branches; by the time
// they are reviewed the hourly pipeline, rename merges and history repairs have
// changed those same files, so the branches conflict and can never merge.
// What a PR actually contributes is the `aiSummary` of each repo, so this takes
// only that, applies it to the file as it is now (following renames through
// `aliases`), and only when it is better than the summary already there.
//
//   node scripts/replay-pr-summaries.mjs <pr-number> [--dry-run]
//
// Expects the PR head to be fetched as refs/prs/<n>. Prints a JSON result.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { betterSummary } from "./lib/merge.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const KNOWN_CATEGORIES = new Set([
  "ai-ml", "developer-tools", "web", "mobile", "data", "infrastructure",
  "security", "systems", "learning", "productivity", "other",
]);

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// id (any case) or old name -> file path of the profile it is now.
function buildIndex() {
  const index = new Map();
  for (const f of fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))) {
    const file = path.join(REPO_DIR, f);
    const p = readJson(file);
    if (!p?.id) continue;
    index.set(p.id.toLowerCase(), file);
    for (const a of p.aliases || []) if (!index.has(a.toLowerCase())) index.set(a.toLowerCase(), file);
  }
  return index;
}

function valid(summary) {
  return (
    summary &&
    typeof summary.oneLiner === "string" &&
    typeof summary.whatItDoes === "string" &&
    Array.isArray(summary.keyFeatures) &&
    Array.isArray(summary.useCases)
  );
}

export function replay(pr, { dryRun = false } = {}) {
  const ref = `refs/prs/${pr}`;
  const base = git("merge-base", "HEAD", ref).trim();
  const changed = git("diff", "--name-only", base, ref).split("\n").filter(Boolean);
  const result = { pr, applied: [], skipped: [], ignored: [] };
  const index = buildIndex();

  for (const file of changed) {
    if (!/^data\/repos\/[^/]+\.json$/.test(file)) {
      result.ignored.push(file);
      continue;
    }
    let theirs;
    try {
      theirs = JSON.parse(git("show", `${ref}:${file}`));
    } catch {
      result.skipped.push({ file, reason: "unreadable in PR" });
      continue;
    }
    if (!valid(theirs.aiSummary)) {
      result.skipped.push({ file, reason: "no valid aiSummary in PR" });
      continue;
    }
    const target = index.get(String(theirs.id).toLowerCase());
    if (!target) {
      result.skipped.push({ file, reason: `${theirs.id} is no longer tracked` });
      continue;
    }
    const current = readJson(target);
    const summary = { ...theirs.aiSummary };
    if (!KNOWN_CATEGORIES.has(summary.category)) summary.category = "other";

    // Keep the existing summary only if it ranks higher (source, then version, then length).
    const candidate = { ...current, aiSummary: summary };
    if (current.aiSummary && betterSummary(candidate, current) !== candidate) {
      result.skipped.push({ file, reason: "existing summary is as good or better" });
      continue;
    }
    if (!dryRun) {
      current.aiSummary = summary;
      fs.writeFileSync(target, JSON.stringify(current, null, 2));
    }
    result.applied.push({ file: path.relative(ROOT, target), id: current.id });
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pr = process.argv[2];
  if (!pr) {
    console.error("usage: replay-pr-summaries.mjs <pr-number> [--dry-run]");
    process.exit(2);
  }
  console.log(JSON.stringify(replay(pr, { dryRun: process.argv.includes("--dry-run") })));
}
