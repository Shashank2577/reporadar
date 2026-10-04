import { absoluteUrl, site } from "@/lib/site";

// Cut at a word boundary (never mid-word) and add an ellipsis if shortened.
export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(qas: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

export const publisherJsonLd = {
  "@type": "Organization",
  name: site.name,
  url: site.url,
  founder: { "@type": "Person", name: site.creator.name, url: site.creator.portfolio },
  sameAs: [site.creator.github, site.creator.linkedin],
};

// GitHub READMEs carry their own <h1>s; a page must have a single h1, so push
// every README heading down one level (h1 -> h2 ... h5 -> h6).
export function demoteHeadings(html: string): string {
  return html.replace(/<(\/?)h([1-5])(?=[\s>])/gi, (_, slash: string, n: string) => `<${slash}h${Number(n) + 1}`);
}
