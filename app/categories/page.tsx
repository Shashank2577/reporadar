import Link from "next/link";
import type { Metadata } from "next";
import { allCategories, CATEGORIES } from "@/lib/data";
import { compactNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Browse Trending GitHub Repositories by Category",
  description:
    "Explore trending open-source projects by category: AI and machine learning, developer tools, web development, infrastructure, security, and more.",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  const categories = allCategories();
  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Looking for a type of project rather than what happened today? Start here — every tracked
        repository is sorted into one of these categories, each led by its most-starred example.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.category}
            href={`/categories/${c.category}`}
            className="rounded-md border border-border p-4 hover:border-accent"
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{CATEGORIES[c.category]?.description}</p>
            <p className="mt-2 text-xs text-muted">
              {c.count} {c.count === 1 ? "repository" : "repositories"}
              {c.topRepo ? ` · top: ${c.topRepo.id} (${compactNumber(c.topRepo.stars)} stars)` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
