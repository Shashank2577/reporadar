import Link from "next/link";
import type { Metadata } from "next";
import { allLanguages, languageSlug } from "@/lib/data";

export const metadata: Metadata = {
  title: "Browse Trending Repositories by Programming Language",
  description:
    "Trending GitHub repositories grouped by programming language: Python, TypeScript, Rust, Go, and more.",
  alternates: { canonical: "/languages" },
};

export default function LanguagesPage() {
  const languages = allLanguages();
  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">Languages</h1>
      <p className="mt-2 text-muted">Primary languages of the repositories currently tracked.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {languages.map(({ language, count }) => (
          <li key={language} className="rounded-md border border-border p-3">
            <Link href={`/languages/${languageSlug(language)}`} className="font-medium text-accent hover:underline">
              {language}
            </Link>
            <p className="text-sm text-muted">{count} {count === 1 ? "repository" : "repositories"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
