// Runs only the star-history backfill/repair (no GitHub API calls).
//   node scripts/backfill-star-history.mjs [--force]   (--force re-checks unreliable markers now)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backfillStarHistories } from "./lib/star-history.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
await backfillStarHistories(path.join(ROOT, "data", "repos"), { force: process.argv.includes("--force") });
