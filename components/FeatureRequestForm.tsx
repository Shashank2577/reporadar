"use client";

import { useState } from "react";
import { useSession } from "@/components/AuthProvider";
import { track } from "@/lib/track";

export default function FeatureRequestForm() {
  const { data: session, status, signIn } = useSession();
  const [repo, setRepo] = useState("");
  const [pitch, setPitch] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, pitch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      track("feature_request_submitted");
      setState("sent");
      setMessage(data.url);
      setRepo("");
      setPitch("");
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
          Sign in with GitHub to request a feature. The request is opened as a GitHub Issue under your own
          account, so it is always clear who asked.
        </p>
        <button
          type="button"
          onClick={() => {
            track("sign_in_clicked", { from: "featured" });
            signIn();
          }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="feature-repo" className="block text-sm font-medium">
        Repository
      </label>
      <input
        id="feature-repo"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        required
        placeholder="owner/name or https://github.com/owner/name"
        className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent"
      />
      <label htmlFor="feature-pitch" className="block text-sm font-medium">
        One-line pitch <span className="font-normal text-muted">(what it does and who it is for)</span>
      </label>
      <textarea
        id="feature-pitch"
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        rows={3}
        maxLength={240}
        required
        placeholder="e.g. A fast, self-hosted search engine for developer docs, built for small teams."
        className="w-full rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-accent"
      />
      <p className="text-xs text-muted">{pitch.length}/240</p>
      <button
        type="submit"
        disabled={state === "sending" || pitch.trim().length < 20 || repo.trim().length < 3}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {state === "sending" ? "Submitting…" : "Request to be featured"}
      </button>
      {message ? (
        <p className={`text-sm ${state === "error" ? "text-danger" : "text-success"}`}>
          {state === "sent" ? (
            <>
              Request opened:{" "}
              <a href={message} className="underline">
                view on GitHub
              </a>
              . A maintainer will review it.
            </>
          ) : (
            message
          )}
        </p>
      ) : null}
    </form>
  );
}
