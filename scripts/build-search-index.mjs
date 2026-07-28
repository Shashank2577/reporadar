// Builds the Pagefind search index for the hybrid (non-static-export) app.
//
// Pagefind needs a folder of rendered HTML to crawl. Content pages here are
// still fully static (Next prerenders them at build time even without
// `output: "export"`), so this script starts the built app with `next
// start`, fetches every known content URL, saves the HTML into .crawl/, runs
// Pagefind against that folder, and writes the index to public/pagefind —
// which Next serves as-is at /pagefind/*, exactly where the existing
// HeaderSearch component already expects it. No frontend code changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";
import matter from "gray-matter";

const KNOWN_CATEGORIES = new Set([
  "ai-ml", "developer-tools", "web", "mobile", "data", "infrastructure",
  "security", "systems", "learning", "productivity", "other",
]);

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const CRAWL_DIR = path.join(ROOT, ".crawl");
const PORT = 4610;

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function collectRoutes() {
  const routes = new Set([
    "/",
    "/reports",
    "/repos",
    "/blog",
    "/categories",
    "/topics",
    "/languages",
    "/about",
    "/newsletter",
    "/request",
  ]);

  const blogDir = path.join(ROOT, "content", "blog");
  if (fs.existsSync(blogDir)) {
    for (const f of fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"))) {
      routes.add(`/blog/${f.replace(/\.md$/, "")}`);
    }
  }

  const repos = readJsonDir(path.join(ROOT, "data", "repos"));
  for (const r of repos) if (r.id) routes.add(`/repos/${r.id}`);

  const topics = new Set();
  const languages = new Set();
  const categories = new Set();
  for (const r of repos) {
    for (const t of [...(r.topics || []), ...(r.aiSummary?.tags || [])]) topics.add(t);
    if (r.language) languages.add(r.language);
    const cat = r.aiSummary?.category;
    if (cat) categories.add(KNOWN_CATEGORIES.has(cat) ? cat : "other");
  }
  for (const t of topics) routes.add(`/topics/${encodeURIComponent(t)}`);
  for (const l of languages) {
    routes.add(`/languages/${l.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  }
  for (const c of categories) routes.add(`/categories/${c}`);

  for (const period of ["daily", "weekly", "monthly"]) routes.add(`/trending/${period}`);
  // The archive index is worth full-text search; the ~200+ individual date
  // pages are near-duplicates of each other for search purposes (same repo
  // names repeated) — they're still discoverable via the sitemap for SEO,
  // just not worth bloating the Pagefind index with.
  routes.add("/trending/archive");

  const reportsDir = path.join(ROOT, "content", "reports");
  for (const kind of ["daily", "weekly", "monthly"]) {
    const dir = path.join(reportsDir, kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      matter(fs.readFileSync(path.join(dir, f), "utf8")); // validates frontmatter parses
      routes.add(`/reports/${kind}/${f.replace(/\.md$/, "")}`);
    }
  }

  return [...routes];
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server not up yet.
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function main() {
  fs.rmSync(CRAWL_DIR, { recursive: true, force: true });
  fs.mkdirSync(CRAWL_DIR, { recursive: true });

  const routes = collectRoutes();
  console.log(`Crawling ${routes.length} routes for the search index...`);

  // `npx next start` spawns further child processes (the actual Next server).
  // Killing just this PID leaves that grandchild alive on Linux, which can
  // stall the whole CI step indefinitely even after this script "finishes" —
  // `detached: true` puts the server in its own process group so `-pid`
  // reaches the entire tree, not just the immediate child.
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", (d) => process.stderr.write(d));

  function stopServer() {
    try {
      process.kill(-server.pid, "SIGKILL");
    } catch {
      try {
        server.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }

  // Belt-and-suspenders: if anything about the crawl hangs, force the whole
  // process to exit rather than leave a CI job stuck for hours.
  const watchdog = setTimeout(() => {
    console.error("Crawl watchdog fired — forcing exit after 4 minutes");
    stopServer();
    process.exit(1);
  }, 4 * 60 * 1000);
  watchdog.unref?.();

  let failures = 0;
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    for (const route of routes) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`http://localhost:${PORT}${route}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          failures++;
          continue;
        }
        const html = await res.text();
        const filePath =
          route === "/" ? path.join(CRAWL_DIR, "index.html") : path.join(CRAWL_DIR, route, "index.html");
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html);
      } catch (err) {
        failures++;
        console.warn(`  ${route}: ${err.message}`);
      }
    }
  } finally {
    clearTimeout(watchdog);
    stopServer();
  }

  if (failures) console.warn(`${failures}/${routes.length} routes failed to crawl`);
  console.log(`Crawled ${routes.length - failures}/${routes.length} routes`);

  fs.mkdirSync(path.join(ROOT, "public"), { recursive: true });
  execSync(`npx pagefind --site .crawl --output-path public/pagefind`, { cwd: ROOT, stdio: "inherit" });
}

main()
  .then(() => process.exit(0)) // don't let a lingering handle keep the process (and CI step) alive
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
