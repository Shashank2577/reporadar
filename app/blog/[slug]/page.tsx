import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { absoluteUrl, site } from "@/lib/site";
import NewsletterInline from "@/components/NewsletterInline";

export function generateStaticParams() {
  return getBlogPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: absoluteUrl(`/blog/${slug}`),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    keywords: post.tags.join(", "),
    url: absoluteUrl(`/blog/${slug}`),
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    author: { "@type": "Organization", name: site.name },
  };

  return (
    <article className="mx-auto max-w-3xl" data-pagefind-body>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-muted">
        <Link href="/blog" className="hover:underline">Blog</Link> / {formatDate(post.date)}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{post.title}</h1>
      <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
      <NewsletterInline />
    </article>
  );
}
