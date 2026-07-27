import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">
        This repository or report is not on the radar (yet). It may appear after the next pipeline
        run.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg">
          Home
        </Link>
        <Link href="/search" className="rounded-md border border-border px-4 py-2 text-sm">
          Search
        </Link>
      </div>
    </div>
  );
}
