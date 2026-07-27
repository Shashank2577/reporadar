import { site } from "@/lib/site";

// Buttondown embed form: static HTML POST to Buttondown, no backend required.
// Set NEXT_PUBLIC_BUTTONDOWN_USERNAME once the Buttondown account exists.
export default function NewsletterForm() {
  if (!site.buttondownUsername) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
        <p>
          The newsletter is not wired up yet. Subscribe to the{" "}
          <a href="/feed.xml" className="text-accent hover:underline">
            RSS feed
          </a>{" "}
          in the meantime — every weekly digest is published there first.
        </p>
      </div>
    );
  }
  return (
    <form
      action={`https://buttondown.com/api/emails/embed-subscribe/${site.buttondownUsername}`}
      method="post"
      target="_blank"
      className="flex max-w-md gap-2"
    >
      <label htmlFor="bd-email" className="sr-only">
        Email address
      </label>
      <input
        type="email"
        name="email"
        id="bd-email"
        required
        placeholder="you@example.com"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Subscribe
      </button>
    </form>
  );
}
