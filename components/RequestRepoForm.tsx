"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function RequestRepoForm() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/request-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setState("sent");
      setMessage(`Request opened: ${data.url}`);
      setQuery("");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
        <p className="mb-3">
          Sign in with GitHub to request a repository. Requests are opened as a GitHub Issue under
          your own account, so it&apos;s always clear who asked.
        </p>
        <button
          type="button"
          onClick={() => signIn("github")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="repo-query" className="block text-sm font-medium">
        Describe what you&apos;re looking for
      </label>
      <textarea
        id="repo-query"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        maxLength={500}
        required
        placeholder="e.g. a self-hosted alternative to Notion, written in Rust"
        className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={state === "sending" || query.trim().length < 6}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {state === "sending" ? "Submitting…" : "Request a repository"}
      </button>
      {message ? (
        <p className={`text-sm ${state === "error" ? "text-danger" : "text-success"}`}>
          {state === "sent" ? (
            <>
              Request opened —{" "}
              <a href={message.replace("Request opened: ", "")} className="underline">
                view on GitHub
              </a>
              . We&apos;ll search for the best match and add it automatically.
            </>
          ) : (
            message
          )}
        </p>
      ) : null}
    </form>
  );
}
