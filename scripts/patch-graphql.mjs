// Re-runs the GraphQL extras query for every tracked repo. Cheap (one call
// per repo) and used when the query itself changed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGraphQLExtras } from "./lib/details.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");

let ok = 0;
for (const f of fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))) {
  const file = path.join(REPO_DIR, f);
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  try {
    const extras = await fetchGraphQLExtras(...profile.id.split("/"));
    if (!extras) {
      console.warn(`skip ${profile.id}`);
      continue;
    }
    Object.assign(profile, {
      watchers: extras.watchers ?? profile.watchers,
      fundingLinks: extras.fundingLinks,
      openIssuesOnly: extras.openIssuesOnly,
      openPRs: extras.openPRs,
      releaseCount: extras.releaseCount,
      discussionsEnabled: extras.discussionsEnabled,
      discussionCount: extras.discussionCount,
      discussions: extras.discussions,
      closedIssues: extras.closedIssues,
      mergedPRs: extras.mergedPRs,
      environmentCount: extras.environmentCount,
      isFork: extras.isFork,
      isInOrganization: extras.isInOrganization,
      securityPolicyUrl: extras.securityPolicyUrl,
      codeOfConduct: extras.codeOfConduct,
      latestRelease: extras.latestRelease,
    });
    if (extras.commitCount) profile.commitCount = extras.commitCount;
    fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    ok++;
  } catch (err) {
    console.warn(`fail ${profile.id}: ${err.message}`);
  }
}
console.log(`Patched GraphQL extras for ${ok} repos`);
