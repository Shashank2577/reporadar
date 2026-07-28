export const site = {
  name: "RepoRadar",
  tagline: "Open-source intelligence, updated twice a day",
  description:
    "Daily reports on trending GitHub repositories: star history, star-jump detection, use cases, tech stacks, contributors, and licenses. Repo of the day, week, and month.",
  // Set NEXT_PUBLIC_SITE_URL in Vercel to the production domain.
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://reporadar.vercel.app",
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO || "",
  // Buttondown username for the newsletter embed form (free tier, RSS-to-email).
  buttondownUsername: process.env.NEXT_PUBLIC_BUTTONDOWN_USERNAME || "",
  locale: "en_US",
} as const;

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

// ItemList structured data for ranked listing pages (trending, topic,
// language, category browse pages) — tells search engines these are ranked
// lists of distinct entities, which is what backs list/carousel-style rich
// results for "best X" and "top X" style queries.
export function itemListJsonLd(name: string, repoIds: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: repoIds.map((id, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/repos/${id}`),
      name: id,
    })),
  };
}
