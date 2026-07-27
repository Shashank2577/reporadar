"use client";

import { useEffect, useRef, useState } from "react";

// Loads the Pagefind UI generated at build time (out/pagefind/). Search runs
// entirely in the browser against a static index — no server involved.
declare global {
  interface Window {
    PagefindUI?: new (opts: Record<string, unknown>) => unknown;
  }
}

export default function SearchClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/pagefind/pagefind-ui.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = () => {
      if (cancelled || !window.PagefindUI) return;
      new window.PagefindUI({
        element: containerRef.current,
        showSubResults: true,
        showImages: false,
        pageSize: 10,
        translations: { placeholder: "Search repositories, reports, topics" },
      });
      setStatus("ready");
      containerRef.current?.querySelector("input")?.focus();
    };
    script.onerror = () => !cancelled && setStatus("missing");
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      css.remove();
      script.remove();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} />
      {status === "missing" ? (
        <p className="text-sm text-muted">
          The search index is generated during the production build (npm run build). It is not
          available in the dev server.
        </p>
      ) : null}
    </div>
  );
}
