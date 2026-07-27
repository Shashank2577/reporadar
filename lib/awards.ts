import { starDelta, type RepoProfile } from "@/lib/data";

// GitHub does not expose user achievements/trophies through any public API, so
// awards here are derived from the data we collect. Each one is checkable
// against a stated rule, shown on the repo page and used for ranking.
export type Award = {
  id: string;
  label: string;
  detail: string;
  tone: "accent" | "success" | "attention" | "muted";
};

export function awardsFor(repo: RepoProfile, allRepos?: RepoProfile[]): Award[] {
  const awards: Award[] = [];
  const ageDays = (Date.now() - new Date(repo.createdAt).getTime()) / 86400000;
  const weekGain = starDelta(repo, 7) ?? 0;
  const dayGain = starDelta(repo, 1) ?? 0;
  const commits52 = (repo.commitActivity || []).reduce((s, w) => s + w.commits, 0);
  const pushedDaysAgo = (Date.now() - new Date(repo.pushedAt).getTime()) / 86400000;

  if (repo.stars >= 50000) {
    awards.push({ id: "landmark", label: "Landmark project", detail: `${repo.stars.toLocaleString()} stars`, tone: "accent" });
  } else if (repo.stars >= 10000) {
    awards.push({ id: "established", label: "Widely adopted", detail: `${repo.stars.toLocaleString()} stars`, tone: "accent" });
  }

  if (ageDays <= 120 && repo.stars >= 3000) {
    awards.push({
      id: "breakout",
      label: "Breakout launch",
      detail: `${repo.stars.toLocaleString()} stars in ${Math.round(ageDays)} days`,
      tone: "success",
    });
  }

  if (weekGain > 0 && repo.stars > 0 && weekGain / repo.stars > 0.05) {
    awards.push({
      id: "rising",
      label: "Rising fast",
      detail: `+${weekGain.toLocaleString()} stars this week`,
      tone: "success",
    });
  } else if (dayGain >= 500) {
    awards.push({ id: "momentum", label: "High momentum", detail: `+${dayGain.toLocaleString()} stars today`, tone: "success" });
  }

  if (ageDays > 365 * 5) {
    awards.push({
      id: "battle-tested",
      label: "Battle-tested",
      detail: `${Math.floor(ageDays / 365)} years of history`,
      tone: "muted",
    });
  }

  if (commits52 >= 500 && pushedDaysAgo <= 7) {
    awards.push({ id: "very-active", label: "Very active", detail: `${commits52.toLocaleString()} commits in 52 weeks`, tone: "success" });
  } else if (pushedDaysAgo <= 2) {
    awards.push({ id: "fresh", label: "Actively maintained", detail: "Pushed within 48 hours", tone: "success" });
  }

  if ((repo.contributorCount || 0) >= 100) {
    awards.push({
      id: "community",
      label: "Community-driven",
      detail: `~${(repo.contributorCount || 0).toLocaleString()} contributors`,
      tone: "accent",
    });
  }

  // GitHub attributes "owner" commits to the owner account itself, which is
  // always zero for organizations — only meaningful when it is non-zero.
  if (repo.participation && repo.participation.all > 0 && repo.participation.owner > 0) {
    const share = repo.participation.community / repo.participation.all;
    if (share >= 0.7 && repo.participation.all >= 100) {
      awards.push({
        id: "outside-contributions",
        label: "Outside contributions",
        detail: `${Math.round(share * 100)}% of recent commits from the community`,
        tone: "accent",
      });
    }
  }

  if ((repo.community?.healthPercentage || 0) >= 80) {
    awards.push({ id: "well-documented", label: "Well documented", detail: "High community health score", tone: "success" });
  }

  if (repo.license && !/NOASSERTION/i.test(repo.license)) {
    const permissive = /^(MIT|Apache-2\.0|BSD|ISC|Unlicense|MPL)/i.test(repo.license);
    if (permissive) {
      awards.push({ id: "permissive", label: "Permissive license", detail: repo.license, tone: "muted" });
    }
  }

  if (repo.workflowRuns?.some((r) => r.status === "success")) {
    awards.push({ id: "ci", label: "Continuous integration", detail: "Automated checks passing", tone: "muted" });
  }

  if (repo.trendingHistory && repo.trendingHistory.length >= 3) {
    awards.push({
      id: "repeat-trending",
      label: "Repeat trending",
      detail: `${repo.trendingHistory.length} trending appearances`,
      tone: "attention",
    });
  }

  // Top-percentile award needs the full corpus for context.
  if (allRepos?.length) {
    const rank = allRepos.filter((r) => r.stars > repo.stars).length;
    const pct = (rank / allRepos.length) * 100;
    if (pct <= 10) {
      awards.push({ id: "top-tracked", label: "Top 10% tracked", detail: `Rank ${rank + 1} of ${allRepos.length}`, tone: "attention" });
    }
  }

  return awards.slice(0, 8);
}
