import type { Metadata } from "next";
import WatchlistClient from "@/components/WatchlistClient";

export const metadata: Metadata = {
  title: "Your Watchlist",
  description: "Repositories you are watching on RepoRadar. Stored locally in your browser.",
  alternates: { canonical: "/watchlist" },
  robots: { index: false },
};

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
      <p className="mt-2 text-muted">
        Repositories you marked with Watch. This list lives in your browser only — no account
        needed, nothing leaves your device.
      </p>
      <div className="mt-6">
        <WatchlistClient />
      </div>
    </div>
  );
}
