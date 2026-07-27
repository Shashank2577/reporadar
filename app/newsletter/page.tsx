import type { Metadata } from "next";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata: Metadata = {
  title: "Weekly Open-Source Newsletter",
  description:
    "A free weekly email digest of trending GitHub repositories: repository of the week, biggest star gainers, and new open-source projects worth watching.",
  alternates: { canonical: "/newsletter" },
};

export default function NewsletterPage() {
  return (
    <div className="mx-auto max-w-2xl" data-pagefind-body>
      <h1 className="text-2xl font-semibold tracking-tight">The weekly digest</h1>
      <p className="mt-2 text-muted">
        Every week we compress seven days of GitHub trending data into one email: the repository of
        the week, the biggest star gainers, notable star jumps, and first-time entrants worth a
        look. Free, no spam, unsubscribe anytime.
      </p>
      <div className="mt-6">
        <NewsletterForm />
      </div>
      <h2 className="mt-10 text-lg font-semibold">Prefer a feed?</h2>
      <p className="mt-2 text-sm text-muted">
        Every report is also published to the{" "}
        <a href="/feed.xml" className="text-accent hover:underline">
          RSS feed
        </a>
        , so you can follow along from any feed reader without giving us an email address.
      </p>
    </div>
  );
}
