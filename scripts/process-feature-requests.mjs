// Feature requests ("get featured") and their approval.
//
//   opened  + title "Feature request: owner/name" -> validate, track the repo,
//                                                   acknowledge; stays open for review
//   labeled + "feature-approved" (maintainers only) -> add to data/featured.json
//                                                   for FEATURE_DAYS, comment, close
//
// Nothing is ever featured automatically. Issue text is untrusted: it is only
// read through the API and treated as data (never interpolated into a shell).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ghFetch, repoSlug } from "./lib/gh.mjs";
import { postJson } from "./process-repo-requests.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const FEATURED_FILE = path.join(ROOT, "data", "featured.json");
const FEATURE_DAYS = Number(process.env.FEATURE_DAYS || 30);
const MAX_ENTRIES = 50;
const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");

export function parseRequest(body) {
  const id = /^Repository:\s*([\w.-]+\/[\w.-]+)\s*$/m.exec(body || "")?.[1] || null;
  const raw = /^Pitch:\s*(.+)$/m.exec(body || "")?.[1] || "";
  // Plain text only, bounded.
  const pitch = raw.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
  return { id, pitch };
}

function isoDay(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export function readFeatured(file = FEATURED_FILE) {
  try {
    const list = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function upsertFeatured(list, entry) {
  const rest = list.filter((e) => e.id.toLowerCase() !== entry.id.toLowerCase());
  return [entry, ...rest].slice(0, MAX_ENTRIES);
}

const api = (p) => `https://api.github.com/repos/${owner}/${repo}${p}`;
const comment = (n, body) => postJson(api(`/issues/${n}/comments`), "POST", { body });
const addLabels = (n, labels) => postJson(api(`/issues/${n}/labels`), "POST", { labels }).catch(() => {});
const close = (n) => postJson(api(`/issues/${n}`), "PATCH", { state: "closed" });

async function canonicalRepo(id) {
  const res = await ghFetch(`/repos/${id}`);
  return res.status === 200 && res.data && !res.data.private ? res.data : null;
}

function ensureTracked(fullName) {
  const file = path.join(REPO_DIR, `${repoSlug(fullName)}.json`);
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(REPO_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ id: fullName, snapshots: [], trendingHistory: [] }, null, 2));
  return true;
}

async function handleRequest(issue) {
  await addLabels(issue.number, ["feature-request"]);
  const { id, pitch } = parseRequest(issue.body);
  const data = id ? await canonicalRepo(id) : null;
  if (!data) {
    await comment(issue.number, `I couldn't find a public GitHub repository for \`${id || "(none given)"}\`. Check the name and request again.`);
    await addLabels(issue.number, ["invalid"]);
    await close(issue.number);
    return;
  }
  if (data.archived) {
    await comment(issue.number, `${data.full_name} is archived, so it can't be featured.`);
    await addLabels(issue.number, ["invalid"]);
    await close(issue.number);
    return;
  }
  const isNew = ensureTracked(data.full_name);
  await comment(
    issue.number,
    `Thanks. **[${data.full_name}](${data.html_url})** ${isNew ? "is now being tracked, and its profile page will appear after the next data refresh" : "is already tracked"}.\n\n` +
      `A maintainer reviews every request. If approved, it is shown in the "Featured" section for ${FEATURE_DAYS} days, labelled as featured` +
      `${pitch ? ` with your pitch: "${pitch}"` : ""}. Featuring never changes any ranking or trending list.`
  );
}

async function handleApproval(issue) {
  if (!(issue.labels || []).some((l) => l.name === "feature-request")) {
    console.log("Approved issue is not a feature request; ignoring.");
    return;
  }
  const { id, pitch } = parseRequest(issue.body);
  const data = id ? await canonicalRepo(id) : null;
  if (!data || data.archived) {
    await comment(issue.number, `Can't feature \`${id}\`: the repository is missing, private, or archived.`);
    return;
  }
  ensureTracked(data.full_name);
  const until = isoDay(FEATURE_DAYS);
  const entry = {
    id: data.full_name,
    since: isoDay(),
    until,
    pitch,
    sponsored: (issue.labels || []).some((l) => l.name === "sponsored"),
    issue: issue.number,
  };
  fs.writeFileSync(FEATURED_FILE, JSON.stringify(upsertFeatured(readFeatured(), entry), null, 2) + "\n");
  await comment(issue.number, `Approved. **${data.full_name}** is featured until ${until}${entry.sponsored ? " (labelled as sponsored)" : ""}. It appears on the next site deploy.`);
  await close(issue.number);
  console.log(`Featured ${data.full_name} until ${until}`);
}

async function main() {
  if (!owner || !repo) throw new Error("GITHUB_REPOSITORY is not set");
  const n = Number(process.env.ISSUE_NUMBER);
  if (!n) throw new Error("ISSUE_NUMBER is not set");
  const res = await ghFetch(`/repos/${owner}/${repo}/issues/${n}`);
  const issue = res.data;
  if (!issue || issue.pull_request) return;

  if (process.env.EVENT_ACTION === "labeled" && process.env.LABEL_NAME === "feature-approved") {
    await handleApproval(issue);
  } else if (process.env.EVENT_ACTION === "opened" && /^Feature request:/i.test(issue.title)) {
    await handleRequest(issue);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
