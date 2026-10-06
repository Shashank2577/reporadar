import type { Metadata } from "next";
import FeaturedProjects from "@/components/FeaturedProjects";
import FeatureRequestForm from "@/components/FeatureRequestForm";
import JsonLd from "@/components/JsonLd";
import { getFeatured } from "@/lib/featured";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Get Your Open-Source Project Featured",
  description:
    "Request a featured spot for your open-source GitHub project on RepoRadar. Featured projects are reviewed by a maintainer, clearly labelled, and never change any ranking.",
  alternates: { canonical: "/featured" },
};

// Optional paid placement: set to a Stripe Payment Link (or any checkout URL).
const SPONSOR_URL = process.env.NEXT_PUBLIC_FEATURE_SPONSOR_URL;

export default function FeaturedPage() {
  const featured = getFeatured();

  return (
    <div className="mx-auto max-w-3xl" data-pagefind-body>
      <JsonLd data={breadcrumbJsonLd([{ name: "Get featured", path: "/featured" }])} />
      <h1 className="text-2xl font-semibold tracking-tight">Get your project featured</h1>
      <p className="mt-2 text-muted">
        Building something in the open? Request a featured spot and it is shown on the home page for 30 days, with a
        short pitch you write, next to the projects that are trending on their own merit.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How it works</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
        <li>Sign in with GitHub and submit the repository and a one-line pitch.</li>
        <li>The repository is validated and added to tracking, so it gets its own profile page with star history.</li>
        <li>A maintainer reviews the request. If approved, it is featured for 30 days.</li>
      </ol>

      <h2 className="mt-8 text-lg font-semibold">What featuring does, and does not do</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
        <li>Featured projects are always labelled &quot;Featured&quot; (or &quot;Sponsored&quot; for paid placements) and links carry rel=&quot;sponsored&quot; where paid.</li>
        <li>It never changes a ranking, a trending list, a star count, or a report. Those stay data-driven.</li>
        <li>Projects must be public, not archived, and genuinely open source.</li>
      </ul>

      {SPONSOR_URL ? (
        <p className="mt-6 text-sm">
          Want a guaranteed, clearly labelled sponsored slot?{" "}
          <a href={SPONSOR_URL} className="text-accent hover:underline" rel="noopener">
            Sponsor a slot
          </a>
          . Sponsored placements are reviewed under the same rules.
        </p>
      ) : null}

      <div className="mt-8">
        <FeatureRequestForm />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Currently featured</h2>
      {featured.length ? (
        <div className="mt-3">
          <FeaturedProjects projects={featured} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">No featured projects right now. The first spots are open.</p>
      )}
    </div>
  );
}
