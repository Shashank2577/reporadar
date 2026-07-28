import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allLanguages, getAllRepos, languageSlug, toBrowserRepo } from "@/lib/data";
import RepoBrowser from "@/components/RepoBrowser";

function langFromSlug(slug: string): string | null {
  return allLanguages().find(({ language }) => languageSlug(language) === slug)?.language || null;
}

export function generateStaticParams() {
  return allLanguages().map(({ language }) => ({ lang: languageSlug(language) }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const language = langFromSlug(lang);
  if (!language) return {};
  return {
    title: `Trending ${language} Repositories on GitHub`,
    description: `Open-source ${language} projects trending on GitHub right now, with star history, use cases, contributors, and licenses.`,
    alternates: { canonical: `/languages/${lang}` },
  };
}

export default async function LanguagePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const language = langFromSlug(lang);
  if (!language) notFound();
  const repos = getAllRepos().filter((r) => r.language === language);

  return (
    <div data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">
        Trending <span className="text-accent">{language}</span> repositories
      </h1>
      <p className="mt-2 text-muted">
        {repos.length} tracked {repos.length === 1 ? "repository" : "repositories"} with {language} as the primary language.
      </p>
      <div className="mt-6">
        <RepoBrowser repos={repos.map((r) => toBrowserRepo(r))} />
      </div>
    </div>
  );
}
