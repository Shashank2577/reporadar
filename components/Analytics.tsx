"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { track } from "@/lib/track";

// PostHog: pageviews, time on page and scroll depth (via $pageleave), clicks
// (autocapture), and heatmaps, plus the site-specific events below. Runs
// cookieless (in-memory persistence) so no consent banner is needed; the
// trade-off is that a returning visitor is a new visitor, and session replay
// stays off. Does nothing unless NEXT_PUBLIC_POSTHOG_KEY was set at build time.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export default function Analytics() {
  useEffect(() => {
    if (!KEY) return;
    if (!posthog.__loaded) {
      posthog.init(KEY, {
        api_host: HOST,
        persistence: "memory",
        person_profiles: "identified_only",
        capture_pageview: "history_change", // also fires on Next client-side navigations
        capture_pageleave: true,
        autocapture: true,
        enable_heatmaps: true,
        disable_session_recording: true,
      });
    }

    function onClick(e: MouseEvent) {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;

      const tracked = el.closest<HTMLElement>("[data-track]");
      if (tracked) track(tracked.dataset.track!, { path: location.pathname });

      const a = el.closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) {
        track("outbound_click", { url: a.href, host: url.host, from: location.pathname });
      } else if (url.pathname.startsWith("/repos/") && url.pathname.split("/").length >= 4) {
        track("repo_open", { repo: url.pathname.replace("/repos/", ""), from: location.pathname });
      }
    }

    // Anyone copying the MCP config or install command from the docs page.
    function onCopy() {
      if (location.pathname === "/mcp") {
        track("mcp_config_copied", { text: (document.getSelection()?.toString() || "").slice(0, 200) });
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  return null;
}
