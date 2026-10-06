import type { MetadataRoute } from "next";
import { reposByTopic, reposByCategory, reposByLanguage, getAllRepos, getReports, getBlogPosts, getAllTrendingDates, topTopics, allLanguages, allCategories, languageSlug } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

// Most recent real data change among a set of repos, instead of "now" (which
// would claim every hub page changed on every build and teach crawlers to
// ignore lastmod).
function latestUpdate(repos: { updatedAt?: string }[], fallback: Date): Date {
  let best = 0;
  for (const r of repos) {
    const t = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (t > best) best = t;
  }
  return best ? new Date(best) : fallback;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/trending/daily"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/trending/weekly"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/trending/monthly"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/trending/archive"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/reports"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/repos"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/categories"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/topics"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/languages"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/search"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/featured"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/newsletter"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/mcp"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const repos: MetadataRoute.Sitemap = getAllRepos().map((r) => ({
    url: absoluteUrl(`/repos/${r.id}`),
    lastModified: r.updatedAt ? new Date(r.updatedAt) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const reports: MetadataRoute.Sitemap = getReports().map((r) => ({
    url: absoluteUrl(`/reports/${r.kind}/${r.slug}`),
    lastModified: r.date ? new Date(r.date) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const categories: MetadataRoute.Sitemap = allCategories().map(({ category }) => ({
    url: absoluteUrl(`/categories/${category}`),
    lastModified: latestUpdate(reposByCategory(category), now),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const topics: MetadataRoute.Sitemap = topTopics().map(({ topic }) => ({
    url: absoluteUrl(`/topics/${encodeURIComponent(topic)}`),
    lastModified: latestUpdate(reposByTopic(topic), now),
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const languages: MetadataRoute.Sitemap = allLanguages().map(({ language }) => ({
    url: absoluteUrl(`/languages/${languageSlug(language)}`),
    lastModified: latestUpdate(reposByLanguage(language), now),
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const archiveDates: MetadataRoute.Sitemap = getAllTrendingDates().map((date) => ({
    url: absoluteUrl(`/trending/archive/${date}`),
    lastModified: new Date(date),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const blogPosts: MetadataRoute.Sitemap = getBlogPosts().map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.date ? new Date(p.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...statics, ...repos, ...reports, ...blogPosts, ...categories, ...topics, ...languages, ...archiveDates];
}
