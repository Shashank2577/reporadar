// Merging of duplicate repo profiles and recording of what changed.
//
// A renamed repo (new owner or name) can end up tracked twice: once under its
// old name and once under the new one that trending lists. Both files share
// the same canonical id once refreshed, so they are one repository: this
// merges them into a single profile, keeps every daily snapshot and trending
// appearance from both, remembers the old names as aliases (the site redirects
// them), and writes a changelog entry describing what changed.

import fs from "node:fs";
import path from "node:path";
import { repoSlug } from "./gh.mjs";
import { isValidStarHistory } from "./details.mjs";

const MAX_CHANGELOG = 25;
const SOURCE_RANK = { jules: 3, llm: 2, template: 1 };

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// `Owner__name.json` -> `Owner/name`
function idFromFile(file) {
  return path.basename(file, ".json").replace("__", "/");
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function freshness(p) {
  return String(p.factsUpdatedAt || p.updatedAt || "");
}

export function summaryRank(p) {
  const s = p.aiSummary;
  if (!s) return [0, 0, 0];
  return [SOURCE_RANK[s.source] || 0, s.version || 0, JSON.stringify(s).length];
}

export function betterSummary(a, b) {
  const ra = summaryRank(a);
  const rb = summaryRank(b);
  for (let i = 0; i < 3; i++) if (ra[i] !== rb[i]) return ra[i] > rb[i] ? a : b;
  return a;
}

function betterHistory(a, b) {
  const va = isValidStarHistory(a.starHistory) && a.starHistory.points?.length;
  const vb = isValidStarHistory(b.starHistory) && b.starHistory.points?.length;
  if (va && !vb) return a;
  if (vb && !va) return b;
  if (!va && !vb) return a;
  return b.starHistory.points.length > a.starHistory.points.length ? b : a;
}

export function addChangelog(profile, entry) {
  const log = profile.changelog || [];
  if (log.some((e) => e.type === entry.type && e.from === entry.from && e.summary === entry.summary)) return;
  log.unshift(entry);
  profile.changelog = log.slice(0, MAX_CHANGELOG);
}

// Merge `others` into the freshest of the group. `entries` is [{ file, profile }].
export function mergeProfiles(entries, today) {
  const sorted = [...entries].sort((a, b) => freshness(b.profile).localeCompare(freshness(a.profile)));
  const base = structuredClone(sorted[0].profile);
  const rest = sorted.slice(1);

  const snapshots = new Map();
  const trending = new Map();
  const aliases = new Set(base.aliases || []);
  let changelog = [...(base.changelog || [])];
  let summarySource = sorted[0].profile;
  let historySource = sorted[0].profile;

  for (const { file, profile } of sorted) {
    for (const s of profile.snapshots || []) if (!snapshots.has(s.date)) snapshots.set(s.date, s);
    for (const t of profile.trendingHistory || []) {
      const key = `${t.date}|${t.period}`;
      if (!trending.has(key)) trending.set(key, t);
    }
    for (const a of profile.aliases || []) aliases.add(a);
    changelog = changelog.concat(profile.changelog || []);
    summarySource = betterSummary(summarySource, profile);
    historySource = betterHistory(historySource, profile);
    for (const id of [profile.id, idFromFile(file)]) if (id && id !== base.id) aliases.add(id);
  }
  aliases.delete(base.id);

  base.snapshots = [...snapshots.values()].sort((a, b) => a.date.localeCompare(b.date));
  base.trendingHistory = [...trending.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (summarySource.aiSummary) base.aiSummary = summarySource.aiSummary;
  if (historySource.starHistory) base.starHistory = historySource.starHistory;
  base.aliases = [...aliases].sort();

  // What changed from the previous record to this one, per old name.
  for (const { file, profile } of rest) {
    const from = idFromFile(file) !== base.id ? idFromFile(file) : profile.id;
    if (!from || from === base.id) continue;
    const lastOld = (profile.snapshots || []).at(-1);
    const lastNew = base.snapshots.at(-1);
    let summary = `Previously tracked as ${from}; its ${plural((profile.snapshots || []).length, "daily snapshot")} and ${plural((profile.trendingHistory || []).length, "trending appearance")} were merged into this profile.`;
    if (lastOld && lastNew && Number.isFinite(lastOld.stars) && Number.isFinite(lastNew.stars)) {
      const delta = lastNew.stars - lastOld.stars;
      summary += ` Stars: ${lastOld.stars.toLocaleString("en-US")} on ${lastOld.date} under the old name, ${lastNew.stars.toLocaleString("en-US")} on ${lastNew.date} (${delta >= 0 ? "+" : ""}${delta.toLocaleString("en-US")}).`;
    }
    changelog.unshift({ date: today, type: "renamed", from, summary });
  }
  // De-duplicate and cap.
  const seen = new Set();
  base.changelog = changelog
    .filter((e) => {
      const k = `${e.type}|${e.from || ""}|${e.summary}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .slice(0, MAX_CHANGELOG);
  if (!base.changelog.length) delete base.changelog;
  return base;
}

// Compare the previous stored facts with freshly fetched ones and record
// notable changes (new release, description, license, language).
export function diffProfile(prev, next, today) {
  if (!prev?.updatedAt) return;
  const note = (type, summary) => addChangelog(next, { date: today, type, summary });
  if (prev.description && next.description && prev.description !== next.description) {
    note("description", `Description changed from "${prev.description.slice(0, 120)}" to "${next.description.slice(0, 120)}".`);
  }
  if (prev.license && next.license && prev.license !== next.license) {
    note("license", `License changed from ${prev.license} to ${next.license}.`);
  }
  if (prev.language && next.language && prev.language !== next.language) {
    note("language", `Primary language changed from ${prev.language} to ${next.language}.`);
  }
  const prevTag = prev.latestRelease?.tag || prev.releases?.[0]?.tag;
  const nextTag = next.latestRelease?.tag || next.releases?.[0]?.tag;
  if (prevTag && nextTag && prevTag !== nextTag) note("release", `New release ${nextTag} (previously ${prevTag}).`);
}

// Scans data/repos, merges every group of files that describe the same
// repository (case-insensitive id), and renames files whose name no longer
// matches their id. Idempotent and safe to run at the start of every pipeline run.
export function dedupeRepos(repoDir, today) {
  if (!fs.existsSync(repoDir)) return { merged: 0, renamed: 0 };
  const groups = new Map();
  for (const f of fs.readdirSync(repoDir).filter((f) => f.endsWith(".json"))) {
    const file = path.join(repoDir, f);
    const profile = readJson(file);
    if (!profile?.id) continue;
    const key = profile.id.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ file, profile });
  }

  let merged = 0;
  let renamed = 0;
  for (const entries of groups.values()) {
    const canonical = path.join(repoDir, `${repoSlug(entries[0].profile.id)}.json`);
    if (entries.length === 1) {
      const [{ file, profile }] = entries;
      if (file === canonical) continue;
      // Same repo, stale filename: move it and remember the old name.
      const next = structuredClone(profile);
      next.aliases = [...new Set([...(next.aliases || []), idFromFile(file)])].filter((a) => a !== next.id);
      const tmp = `${canonical}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
      fs.rmSync(file);
      fs.renameSync(tmp, canonical);
      renamed++;
      continue;
    }
    const base = mergeProfiles(entries, today);
    const target = path.join(repoDir, `${repoSlug(base.id)}.json`);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(base, null, 2));
    for (const { file } of entries) fs.rmSync(file, { force: true });
    fs.renameSync(tmp, target);
    merged++;
  }
  return { merged, renamed };
}
