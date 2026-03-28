import * as Sentry from "@sentry/nextjs";

/**
 * Operational context for error tagging.
 * Only safe-to-send fields — no PII.
 */
export type ErrorContext = {
  campaignId?: string;
  responseId?: string;
  userId?: string;
  respondentId?: string;
  stripeEventId?: string;
  operation?: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Capture a system error with operational context.
 * Use for DB failures, API errors, unexpected exceptions.
 * NOT for expected business logic (auth failures, validation).
 */
export function captureError(
  err: unknown,
  context?: ErrorContext,
  level: "error" | "fatal" = "error"
): void {
  const error = err instanceof Error ? err : new Error(String(err));

  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context) {
      if (context.campaignId) scope.setTag("campaign_id", context.campaignId);
      if (context.responseId) scope.setTag("response_id", context.responseId);
      if (context.userId) scope.setTag("user_id", context.userId);
      if (context.respondentId) scope.setTag("respondent_id", context.respondentId);
      if (context.stripeEventId) scope.setTag("stripe_event_id", context.stripeEventId);
      if (context.operation) scope.setTag("operation", context.operation);

      // Add remaining fields as extra context (not tags)
      const { campaignId, responseId, userId, respondentId, stripeEventId, operation, ...extra } = context;
      if (Object.keys(extra).length > 0) {
        scope.setContext("operational", extra);
      }
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a warning — for anomalies that aren't exceptions.
 * Use for payout mismatches, reach anomalies, unexpected-but-handled states.
 */
export function captureWarning(
  message: string,
  context?: ErrorContext
): void {
  Sentry.withScope((scope) => {
    scope.setLevel("warning");

    if (context) {
      if (context.campaignId) scope.setTag("campaign_id", context.campaignId);
      if (context.userId) scope.setTag("user_id", context.userId);
      if (context.operation) scope.setTag("operation", context.operation);

      const { campaignId, responseId, userId, respondentId, stripeEventId, operation, ...extra } = context;
      if (Object.keys(extra).length > 0) {
        scope.setContext("operational", extra);
      }
    }

    Sentry.captureMessage(message);
  });
}
