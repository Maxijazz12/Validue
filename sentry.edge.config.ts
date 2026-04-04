import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
  enabled: !!process.env.SENTRY_DSN,

  // Strip PII from error payloads (mirrors sentry.server.config.ts)
  beforeSend(event) {
    if (event.extra) {
      delete event.extra.email;
      delete event.extra.full_name;
      delete event.extra.name;
    }
    return event;
  },
});
