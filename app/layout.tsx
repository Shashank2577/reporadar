import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SideNav from "@/components/SideNav";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — GitHub Trending Repositories, Star History and Daily Reports`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: {
    canonical: "./",
    types: { "application/rss+xml": [{ url: "/feed.xml", title: `${site.name} reports feed` }] },
  },
  openGraph: {
    siteName: site.name,
    type: "website",
    locale: site.locale,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.url,
  description: site.description,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <SiteHeader />
        <div className="flex flex-1 items-start">
          <aside className="sticky top-[57px] hidden max-h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r border-border px-3 py-5 xl:block">
            <SideNav />
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">{children}</main>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
