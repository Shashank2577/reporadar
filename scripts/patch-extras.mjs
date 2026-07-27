// Fills in surfaces added after a facts run: GraphQL extras, file tree, and
// manifest-derived dependencies. Safe to re-run; skips what already exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGraphQLExtras, fetchFileTree, fetchManifestDependencies } from "./lib/details.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const onlyMissing = process.argv.includes("--only-missing");

let patched = 0;
for (const f of fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))) {
  const file = path.join(REPO_DIR, f);
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = false;

  if (!onlyMissing || profile.closedIssues === undefined) {
    try {
      const extras = await fetchGraphQLExtras(...profile.id.split("/"));
      if (extras) {
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
        changed = true;
      }
    } catch (err) {
      console.warn(`  graphql ${profile.id}: ${err.message}`);
    }
  }

  if (!profile.fileTree) {
    try {
      const tree = await fetchFileTree(profile.id);
      if (tree) {
        profile.fileTree = tree;
        changed = true;
      }
    } catch (err) {
      console.warn(`  tree ${profile.id}: ${err.message}`);
    }
  }

  if (!profile.manifestDependencies && profile.fileTree) {
    try {
      const deps = await fetchManifestDependencies(profile.id, profile.fileTree);
      if (deps) {
        profile.manifestDependencies = deps;
        changed = true;
      }
    } catch (err) {
      console.warn(`  deps ${profile.id}: ${err.message}`);
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    patched++;
    console.log(`ok ${profile.id}`);
  }
}
console.log(`Patched ${patched} repos`);
