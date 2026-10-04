// Fills in or repairs the star-history backfill on every profile that needs it.
// Shared by the hourly pipeline (update-repos.mjs) and scripts/backfill-star-history.mjs.

import fs from "node:fs";
import path from "node:path";
import {
  fetchStarHistoryBatch,
  needsStarHistory,
  isValidStarHistory,
  STAR_HISTORY_VERSION,
} from "./details.mjs";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// `force` re-checks "unreliable" markers even inside their retry window.
export async function backfillStarHistories(repoDir, { force = false } = {}) {
  const need = fs
    .readdirSync(repoDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: path.join(repoDir, f), profile: readJson(path.join(repoDir, f)) }))
    .filter(({ profile }) => profile && needsStarHistory(profile.starHistory, { ignoreRetryWindow: force }));
  if (!need.length) return { filled: 0, kept: 0 };

  console.log(`Backfilling star history for ${need.length} repos`);
  const histories = await fetchStarHistoryBatch(need.map(({ profile }) => ({ id: profile.id, stars: profile.stars })));

  let filled = 0;
  let kept = 0;
  for (const { file, profile } of need) {
    const h = histories.get(profile.id);
    const prev = profile.starHistory;

    // The archive's event count only ever grows, so a result with fewer
    // events than a previous good one, or an "unreliable" verdict after an
    // accepted one, means this fetch saw a stale view. Keep what we had.
    if (
      h &&
      prev &&
      prev.version === STAR_HISTORY_VERSION &&
      !prev.unreliable &&
      prev.points?.length &&
      (h.unreliable || (Number.isFinite(prev.events) && h.events < prev.events))
    ) {
      prev.sampledAt = h.sampledAt;
      fs.writeFileSync(file, JSON.stringify(profile, null, 2));
      kept++;
      continue;
    }

    if (!h) {
      // Not re-fetchable yet (e.g. no star count). A legacy all-null history is
      // worse than none, so drop it; it is retried once facts exist.
      if (prev && !isValidStarHistory(prev)) {
        delete profile.starHistory;
        fs.writeFileSync(file, JSON.stringify(profile, null, 2));
      }
      continue;
    }

    profile.starHistory = h;
    fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    filled++;
  }
  console.log(`Backfilled ${filled}/${need.length} (kept ${kept} previous)`);
  return { filled, kept };
}
