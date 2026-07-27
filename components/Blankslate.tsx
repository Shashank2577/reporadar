import Link from "next/link";

// GitHub's "blankslate" pattern: centered icon, heading, explanation, action.
// Used wherever a section or page has nothing to show, so empty states look
// deliberate instead of broken.
export default function Blankslate({
  heading,
  children,
  actionLabel,
  actionHref,
}: {
  heading: string;
  children?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-6 py-12 text-center">
      <svg viewBox="0 0 16 16" width="28" height="28" fill="var(--muted)" aria-hidden="true" className="mx-auto">
        <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c.464 0 .898.232 1.153.618l.579.87a.25.25 0 0 0 .208.112h6.307A1.75 1.75 0 0 1 15 4.75v8.5A1.75 1.75 0 0 1 13.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.5.75v10.75c0 .138.112.25.25.25h11.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25H6.943a1.75 1.75 0 0 1-1.457-.78L4.907 2.63a.25.25 0 0 0-.208-.111Z" />
      </svg>
      <h3 className="mt-3 text-base font-semibold">{heading}</h3>
      {children ? <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{children}</p> : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
