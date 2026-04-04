import { z } from "zod";

/* ─── Server-only variables (never exposed to browser) ─── */

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
});

const stripeWebhookSchema = z.object({
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
});

const stripeConnectWebhookSchema = z.object({
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const planSchema = z.object({
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
});

const cronSchema = z.object({
  CRON_SECRET: z.string().min(1).optional(),
});

const aiSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
});

const adminSchema = z.object({
  ADMIN_API_KEY: z.string().optional(),
});

const sentryServerSchema = z.object({
  SENTRY_DSN: z.string().optional(),
});

/* ─── Client variables (NEXT_PUBLIC_ prefix, bundled into browser JS) ─── */

const supabasePublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

const appUrlSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const clientSchema = supabasePublicSchema.merge(appUrlSchema).merge(z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
}));

/* ─── Lazy singleton — parsed once on first access ─── */

const serverSchema = databaseSchema
  .merge(stripeSchema)
  .merge(stripeWebhookSchema)
  .merge(stripeConnectWebhookSchema)
  .merge(planSchema)
  .merge(cronSchema)
  .merge(aiSchema)
  .merge(adminSchema)
  .merge(sentryServerSchema);

let _env: z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

function formatEnvIssues(
  result: { error: z.ZodError }
): string {
  return result.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
}

function parseEnv<T>(
  schema: z.ZodType<T>,
  label: string
): T {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    throw new Error(`${label} validation failed:\n${formatEnvIssues(result)}`);
  }

  return result.data;
}

/**
 * Validated environment variables.
 * Throws with a clear message on first access if required vars are missing.
 */
export function env(): z.infer<typeof serverSchema> & z.infer<typeof clientSchema> {
  if (_env) return _env;

  const result = serverSchema.merge(clientSchema).safeParse(process.env);

  if (!result.success) {
    throw new Error(`Environment validation failed:\n${formatEnvIssues(result)}`);
  }

  _env = result.data;

  return _env;
}

let _databaseEnv: z.infer<typeof databaseSchema>;

export function databaseEnv(): z.infer<typeof databaseSchema> {
  if (_databaseEnv) return _databaseEnv;
  _databaseEnv = parseEnv(databaseSchema, "Database environment");
  return _databaseEnv;
}

let _stripeEnv: z.infer<typeof stripeSchema>;

export function stripeEnv(): z.infer<typeof stripeSchema> {
  if (_stripeEnv) return _stripeEnv;
  _stripeEnv = parseEnv(stripeSchema, "Stripe environment");
  return _stripeEnv;
}

let _stripeWebhookEnv: z.infer<typeof stripeWebhookSchema>;

export function stripeWebhookEnv(): z.infer<typeof stripeWebhookSchema> {
  if (_stripeWebhookEnv) return _stripeWebhookEnv;
  _stripeWebhookEnv = parseEnv(stripeWebhookSchema, "Stripe webhook environment");
  return _stripeWebhookEnv;
}

let _stripeConnectWebhookEnv: z.infer<typeof stripeConnectWebhookSchema>;

export function stripeConnectWebhookEnv(): z.infer<typeof stripeConnectWebhookSchema> {
  if (_stripeConnectWebhookEnv) return _stripeConnectWebhookEnv;
  _stripeConnectWebhookEnv = parseEnv(
    stripeConnectWebhookSchema,
    "Stripe Connect webhook environment"
  );
  return _stripeConnectWebhookEnv;
}

let _planEnv: z.infer<typeof planSchema>;

export function planEnv(): z.infer<typeof planSchema> {
  if (_planEnv) return _planEnv;
  _planEnv = parseEnv(planSchema, "Plan environment");
  return _planEnv;
}

let _cronEnv: z.infer<typeof cronSchema>;

export function cronEnv(): z.infer<typeof cronSchema> {
  if (_cronEnv) return _cronEnv;
  _cronEnv = parseEnv(cronSchema, "Cron environment");
  return _cronEnv;
}

let _aiEnv: z.infer<typeof aiSchema>;

export function aiEnv(): z.infer<typeof aiSchema> {
  if (_aiEnv) return _aiEnv;
  _aiEnv = parseEnv(aiSchema, "AI environment");
  return _aiEnv;
}

let _adminEnv: z.infer<typeof adminSchema>;

export function adminEnv(): z.infer<typeof adminSchema> {
  if (_adminEnv) return _adminEnv;
  _adminEnv = parseEnv(adminSchema, "Admin environment");
  return _adminEnv;
}

let _supabasePublicEnv: z.infer<typeof supabasePublicSchema>;

export function supabasePublicEnv(): z.infer<typeof supabasePublicSchema> {
  if (_supabasePublicEnv) return _supabasePublicEnv;
  _supabasePublicEnv = parseEnv(
    supabasePublicSchema,
    "Supabase public environment"
  );
  return _supabasePublicEnv;
}

let _appUrlEnv: z.infer<typeof appUrlSchema>;

export function appUrlEnv(): z.infer<typeof appUrlSchema> {
  if (_appUrlEnv) return _appUrlEnv;
  _appUrlEnv = parseEnv(appUrlSchema, "App URL environment");
  return _appUrlEnv;
}

/**
 * Client-only env — safe to call from "use client" modules.
 * Only validates NEXT_PUBLIC_ variables.
 */
let _clientEnv: z.infer<typeof clientSchema>;

export function clientEnv(): z.infer<typeof clientSchema> {
  if (_clientEnv) return _clientEnv;

  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  });

  if (!result.success) {
    throw new Error(`Client environment validation failed:\n${formatEnvIssues(result)}`);
  }

  _clientEnv = result.data;
  return _clientEnv;
}
