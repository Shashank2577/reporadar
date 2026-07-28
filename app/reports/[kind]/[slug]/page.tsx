import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReport, getReports, type Report } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { absoluteUrl, site } from "@/lib/site";
import NewsletterInline from "@/components/NewsletterInline";

type Params = { kind: Report["kind"]; slug: string };

export function generateStaticParams(): Params[] {
  return getReports().map((r) => ({ kind: r.kind, slug: r.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { kind, slug } = await params;
  const report = getReport(kind, slug);
  if (!report) return {};
  return {
    title: report.title,
    description: report.description,
    keywords: report.tags,
    alternates: { canonical: `/reports/${kind}/${slug}` },
    openGraph: {
      title: report.title,
      description: report.description,
      type: "article",
      publishedTime: report.date,
      url: absoluteUrl(`/reports/${kind}/${slug}`),
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<Params> }) {
  const { kind, slug } = await params;
  const report = getReport(kind, slug);
  if (!report) notFound();

  const siblings = getReports(kind);
  const idx = siblings.findIndex((r) => r.slug === slug);
  const newer = idx > 0 ? siblings[idx - 1] : null;
  const older = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.title,
    description: report.description,
    datePublished: report.date,
    keywords: report.tags.join(", "),
    url: absoluteUrl(`/reports/${kind}/${slug}`),
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    author: { "@type": "Organization", name: site.name },
  };

  return (
    <article className="mx-auto max-w-3xl" data-pagefind-body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header>
        <p className="text-sm text-muted">
          <Link href="/reports" className="hover:underline">Reports</Link>
          {" / "}
          <span className="capitalize">{kind}</span>
          {" / "}
          {formatDate(report.date)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{report.title}</h1>
      </header>
      <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(report.body) }} />
      <NewsletterInline />
      <nav className="mt-6 flex justify-between border-t border-border pt-4 text-sm" aria-label="Report navigation">
        {older ? (
          <Link href={`/reports/${kind}/${older.slug}`} className="text-accent hover:underline">
            Older: {older.slug}
          </Link>
        ) : <span />}
        {newer ? (
          <Link href={`/reports/${kind}/${newer.slug}`} className="text-accent hover:underline">
            Newer: {newer.slug}
          </Link>
        ) : <span />}
      </nav>
    </article>
  );
}
