// One-off: fetch GitHub-rendered README HTML for repos missing it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchReadmeHtml } from "./lib/details.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");

for (const f of fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))) {
  const file = path.join(REPO_DIR, f);
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  if (profile.readmeHtml) continue;
  try {
    profile.readmeHtml = await fetchReadmeHtml(profile.id, profile.defaultBranch);
    fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    console.log(`ok ${profile.id} (${(profile.readmeHtml || "").length} bytes)`);
  } catch (err) {
    console.warn(`fail ${profile.id}: ${err.message}`);
  }
}
