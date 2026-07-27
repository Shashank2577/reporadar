"use client";

import { useRef, useState } from "react";

// Renders the GitHub-rendered README HTML, collapsed to a preview height with
// an expand toggle so the page stays scannable.
export default function ReadmeViewer({ html, repoUrl }: { html: string; repoUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={topRef}>
      <div
        className={`readme-body prose relative overflow-hidden ${expanded ? "" : "max-h-[560px]"}`}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {!expanded ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (expanded) topRef.current?.scrollIntoView({ block: "start" });
            setExpanded(!expanded);
          }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-border/40"
        >
          {expanded ? "Collapse README" : "Read the full README"}
        </button>
        <a href={repoUrl} rel="noopener" className="text-sm text-accent hover:underline">
          View on GitHub
        </a>
      </div>
    </div>
  );
}
