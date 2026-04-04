export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // Warn about missing security env vars in production
    if (process.env.NODE_ENV === "production") {
      if (!process.env.CRON_SECRET) {
        console.warn("[startup] CRON_SECRET is not set — cron endpoints will reject all requests");
      }
      if (!process.env.ADMIN_API_KEY) {
        console.warn("[startup] ADMIN_API_KEY is not set — admin diagnostic routes will reject all requests");
      }
      if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
        console.warn("[startup] STRIPE_CONNECT_WEBHOOK_SECRET is not set — Connect webhooks will return 500");
      }
      if (!process.env.SENTRY_DSN) {
        console.warn("[startup] SENTRY_DSN is not set — error tracking is disabled");
      }
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — Sentry.captureRequestError signature varies by version
  return Sentry.captureRequestError?.(...args);
};
