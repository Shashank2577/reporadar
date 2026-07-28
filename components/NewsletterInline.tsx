import NewsletterForm from "@/components/NewsletterForm";

// Compact, non-blocking newsletter CTA for end-of-content placements (reports,
// blog posts) — the moment someone just finished reading is the highest-
// intent point to ask, without a popup or gate. Purely additive: no visitor
// is required to interact with it.
export default function NewsletterInline() {
  return (
    <div className="mt-10 rounded-md border border-border bg-surface p-5">
      <p className="text-sm font-medium">Want the next one in your inbox?</p>
      <p className="mt-1 text-sm text-muted">
        One email a week: repository of the week, the biggest star gainers, and new projects worth
        watching.
      </p>
      <div className="mt-3">
        <NewsletterForm />
      </div>
    </div>
  );
}
