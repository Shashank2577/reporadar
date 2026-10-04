// Cloudflare Pages caps a deployment at 20,000 files. A static Next export
// writes ~9 files per page (the HTML plus RSC payloads that only speed up
// client-side <Link> navigation), which would put the ~1,100 repo pages alone
// at ~10,000 files and leave no room to grow. For the two big dynamic trees we
// drop the RSC payloads and keep the HTML: Next falls back to a normal page
// load when a payload is missing, so links still work.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "out");
const TREES = ["repos", "trending/archive"];

function prune(dir) {
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += prune(full);
      if (!fs.readdirSync(full).length) fs.rmdirSync(full);
    } else if (entry.name.endsWith(".txt")) {
      fs.rmSync(full);
      removed++;
    }
  }
  return removed;
}

for (const tree of TREES) {
  const dir = path.join(OUT, tree);
  if (fs.existsSync(dir)) console.log(`Pruned ${prune(dir)} RSC payload files from ${tree}/`);
}
