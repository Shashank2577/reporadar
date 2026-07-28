import type { Metadata } from "next";
import RequestRepoForm from "@/components/RequestRepoForm";

export const metadata: Metadata = {
  title: "Request a Repository",
  description:
    "Can't find a repository for what you're looking for? Describe it and we'll search GitHub for the best match, ranked by stars, and start tracking it.",
  alternates: { canonical: "/request" },
  robots: { index: false },
};

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Request a repository</h1>
      <p className="mt-2 text-muted">
        Describe the kind of project you&apos;re looking for — a topic, a use case, a description of
        what it should do. We search GitHub for the best match by stars and relevance, add it to the
        tracked list, and it gets its own profile page with star history, README, and everything
        else on this site.
      </p>
      <div className="mt-6">
        <RequestRepoForm />
      </div>
    </div>
  );
}
