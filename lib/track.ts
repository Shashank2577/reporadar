// Product analytics event helper. A no-op unless PostHog was initialised
// (NEXT_PUBLIC_POSTHOG_KEY set at build time), so call sites never need to check.
import posthog from "posthog-js";

export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.capture(event, properties);
}
