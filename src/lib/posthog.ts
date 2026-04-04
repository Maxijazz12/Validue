import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: false, // We capture manually via router events
    capture_pageleave: true,
    respect_dnt: true,
  });
}

export { posthog };
