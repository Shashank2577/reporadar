import { getReports, getBlogPosts } from "@/lib/data";
import { absoluteUrl, site } from "@/lib/site";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-static";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// RSS 2.0 feed of all reports and blog posts. Buttondown (or any RSS-to-email
// service) sends the weekly digest straight from this feed, filtered to
// category "weekly" — blog posts are tagged "blog" so they never trigger
// that automation, but still show up for plain RSS subscribers.
export function GET() {
  const reports = getReports().slice(0, 30);
  const blogPosts = getBlogPosts().slice(0, 20);

  function reportItem(r: (typeof reports)[number]) {
    const url = absoluteUrl(`/reports/${r.kind}/${r.slug}`);
    const html = renderMarkdown(r.body).replace(/href="\//g, `href="${site.url}/`);
    return `    <item>
      <title>${esc(r.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${r.date}T08:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(r.kind)}</category>
      <description>${esc(r.description)}</description>
      <content:encoded><![CDATA[${html}]]></content:encoded>
    </item>`;
  }

  function blogItem(p: (typeof blogPosts)[number]) {
    const url = absoluteUrl(`/blog/${p.slug}`);
    const html = renderMarkdown(p.body).replace(/href="\//g, `href="${site.url}/`);
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${p.date}T08:00:00Z`).toUTCString()}</pubDate>
      <category>blog</category>
      <description>${esc(p.description)}</description>
      <content:encoded><![CDATA[${html}]]></content:encoded>
    </item>`;
  }

  const items = [...reports.map(reportItem), ...blogPosts.map(blogItem)]
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} — GitHub Trending Reports</title>
    <link>${site.url}</link>
    <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml"/>
    <description>${esc(site.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
