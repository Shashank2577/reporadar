import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { absoluteUrl, site } from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import { breadcrumbJsonLd, publisherJsonLd } from "@/lib/seo";
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
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [absoluteUrl("/opengraph-image")] },
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
    dateModified: post.date,
    keywords: post.tags.join(", "),
    url: absoluteUrl(`/blog/${slug}`),
    mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
    image: absoluteUrl("/opengraph-image"),
    inLanguage: "en",
    publisher: publisherJsonLd,
    author: { "@type": "Person", name: site.creator.name, url: site.creator.portfolio },
  };

  return (
    <article className="mx-auto max-w-3xl" data-pagefind-body>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Blog", path: "/blog" }, { name: post.title, path: `/blog/${slug}` }])} />
      <p className="text-sm text-muted">
        <Link href="/blog" className="hover:underline">Blog</Link> / {formatDate(post.date)}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{post.title}</h1>
      <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
      <NewsletterInline />
    </article>
  );
}
