import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allCategories, reposByCategory, toBrowserRepo, CATEGORIES } from "@/lib/data";
import RepoBrowser from "@/components/RepoBrowser";

export function generateStaticParams() {
  return allCategories().map(({ category }) => ({ category }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const meta = CATEGORIES[category];
  if (!meta) return {};
  return {
    title: `Best ${meta.title} Repositories on GitHub`,
    description: `${meta.description} Ranked by stars, with star history, use cases, and tech stack for each.`,
    alternates: { canonical: `/categories/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const meta = CATEGORIES[category];
  const repos = reposByCategory(category);
  if (!meta || !repos.length) notFound();

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{meta.description}</p>
      <p className="mt-1 text-sm text-muted">
        {repos.length} tracked {repos.length === 1 ? "repository" : "repositories"}, ranked by stars.
      </p>
      <div className="mt-6">
        <RepoBrowser repos={repos.map((r) => toBrowserRepo(r))} />
      </div>
    </div>
  );
}
