import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // The __next.*.txt files are Next.js client-navigation (RSC) payloads, about
    // nine per page. Crawlers read the HTML, so keep them out of the crawl.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/*__next."] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
