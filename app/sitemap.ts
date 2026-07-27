import type { MetadataRoute } from "next";
import { getAllRepos, getReports, allTopics, allLanguages, languageSlug } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/trending/daily"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/trending/weekly"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/trending/monthly"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/reports"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/topics"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/languages"), lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/search"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/newsletter"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
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

  const topics: MetadataRoute.Sitemap = allTopics().map(({ topic }) => ({
    url: absoluteUrl(`/topics/${encodeURIComponent(topic)}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const languages: MetadataRoute.Sitemap = allLanguages().map(({ language }) => ({
    url: absoluteUrl(`/languages/${languageSlug(language)}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  return [...statics, ...repos, ...reports, ...topics, ...languages];
}
