import type { Metadata } from "next";
import SearchClient from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Search Trending Repositories and Reports",
  description:
    "Search every tracked GitHub repository, topic, language, and trending report. Instant, private, in-browser search.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <p className="mt-2 text-muted">
        Search across repository profiles, reports, topics, and languages. The index is built at
        publish time and runs entirely in your browser.
      </p>
      <div className="mt-6">
        <SearchClient />
      </div>
    </div>
  );
}
