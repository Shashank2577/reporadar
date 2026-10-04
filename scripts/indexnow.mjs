// IndexNow: tells Bing (and through it DuckDuckGo, ChatGPT search, Yandex and
// others) which URLs changed, minutes after a deploy instead of days later.
//
//   node scripts/indexnow.mjs write-key   -> writes out/<key>.txt (run in the build)
//   node scripts/indexnow.mjs submit      -> posts changed URLs (run after a deploy)
//
// The key is not a secret: it only proves the host serves the key file. It is
// derived from the site URL so it stays stable across builds.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const KEY = crypto.createHash("sha256").update(`indexnow:${SITE}`).digest("hex").slice(0, 32);
const RECENT_HOURS = 30;
const MAX_URLS = 500;


function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function urlList() {
  const urls = new Set(
    ["/", "/trending/daily", "/trending/weekly", "/trending/monthly", "/reports", "/repos", "/categories", "/llms.txt"].map(
      (p) => SITE + p
    )
  );
  // Newest report of each kind.
  for (const kind of ["daily", "weekly", "monthly"]) {
    const dir = path.join(ROOT, "content", "reports", kind);
    if (!fs.existsSync(dir)) continue;
    const newest = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().at(-1);
    if (newest) urls.add(`${SITE}/reports/${kind}/${newest.replace(/\.md$/, "")}`);
  }
  // Repos refreshed recently, most-starred first.
  const dir = path.join(ROOT, "data", "repos");
  const cutoff = Date.now() - RECENT_HOURS * 3600 * 1000;
  const recent = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(path.join(dir, f)))
    .filter((p) => p?.id && new Date(p.updatedAt || 0).getTime() > cutoff)
    .sort((a, b) => (b.stars || 0) - (a.stars || 0));
  for (const p of recent) {
    if (urls.size >= MAX_URLS) break;
    urls.add(`${SITE}/repos/${p.id}`);
  }
  return [...urls];
}

const mode = process.argv[2];
if (!SITE) {
  // Local and CI builds don't set the production URL; there is nothing to publish.
  console.warn("NEXT_PUBLIC_SITE_URL not set; skipping IndexNow");
  process.exit(mode === "submit" ? 1 : 0);
}
if (mode === "write-key") {
  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "out", `${KEY}.txt`), KEY);
  console.log(`IndexNow key file written (${KEY}.txt)`);
} else if (mode === "submit") {
  const list = urlList();
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: list }),
  });
  console.log(`IndexNow: submitted ${list.length} URLs, HTTP ${res.status}`);
  // 200/202 accepted; anything else is reported but never fails a deploy.
} else {
  console.error("usage: indexnow.mjs write-key | submit");
  process.exit(1);
}
