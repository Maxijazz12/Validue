import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Sample 10% of requests for performance tracing
  tracesSampleRate: 0.1,

  // Only send events in production (or when DSN is explicitly set)
  enabled: !!process.env.SENTRY_DSN,

  // Strip PII from error payloads
  beforeSend(event) {
    if (event.extra) {
      delete event.extra.email;
      delete event.extra.full_name;
      delete event.extra.name;
    }
    return event;
  },
});
