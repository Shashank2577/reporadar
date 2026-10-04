// Writes out/_redirects (Cloudflare Pages) so the old names of renamed repos
// keep working: /repos/<old owner>/<old name> -> /repos/<current id>, 301.
// Aliases come from the `aliases` field that scripts/lib/merge.mjs records.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const OUT = path.join(ROOT, "out");
const PAGES_STATIC_REDIRECT_LIMIT = 2000;

const profiles = fs
  .readdirSync(REPO_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(REPO_DIR, f), "utf8"));
    } catch {
      return null;
    }
  })
  .filter((p) => p?.id);

// An old name that another tracked repo now uses must not be redirected away.
const liveIds = new Set(profiles.map((p) => p.id.toLowerCase()));
const lines = [];
const seen = new Set();
for (const p of profiles) {
  for (const alias of p.aliases || []) {
    const key = alias.toLowerCase();
    if (liveIds.has(key) || seen.has(alias) || !/^[\w.-]+\/[\w.-]+$/.test(alias)) continue;
    seen.add(alias);
    lines.push(`/repos/${alias} /repos/${p.id} 301`);
  }
}

if (lines.length > PAGES_STATIC_REDIRECT_LIMIT) {
  console.warn(`${lines.length} redirects exceed Cloudflare's ${PAGES_STATIC_REDIRECT_LIMIT} limit; truncating`);
  lines.length = PAGES_STATIC_REDIRECT_LIMIT;
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "_redirects"), lines.join("\n") + (lines.length ? "\n" : ""));
console.log(`Wrote ${lines.length} repo redirects`);
