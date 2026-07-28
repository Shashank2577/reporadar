"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="h-8 w-8 shrink-0" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("github")}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-surface"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.5-2.69-.96-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.65-.89-2.65-2.36 0-.7.25-1.28.66-1.73-.09-.22-.29-.79.06-1.56 0 0 .54-.17 1.77.66a5.6 5.6 0 0 1 1.6-.22c.55 0 1.1.07 1.61.22 1.22-.83 1.76-.66 1.76-.66.35.77.15 1.34.07 1.56.41.45.65 1.03.65 1.73 0 1.48-.87 2.16-2.66 2.36.28.24.52.71.52 1.44l-.01 2.13c0 .21.14.46.55.38A8 8 0 0 0 8 0Z" />
        </svg>
        Sign in
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut()}
      title={`Signed in as ${session.user.name || session.user.email}. Click to sign out.`}
      className="shrink-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={session.user.image || ""}
        alt={session.user.name || "Signed in"}
        width={32}
        height={32}
        className="rounded-full border border-border"
      />
    </button>
  );
}
