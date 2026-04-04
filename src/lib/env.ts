import { z } from "zod";

/* ─── Server-only variables (never exposed to browser) ─── */

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

/* ─── Client variables (NEXT_PUBLIC_ prefix, bundled into browser JS) ─── */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

/* ─── Lazy singleton — parsed once on first access ─── */

let _env: z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

/**
 * Validated environment variables.
 * Throws with a clear message on first access if required vars are missing.
 */
export function env(): z.infer<typeof serverSchema> & z.infer<typeof clientSchema> {
  if (_env) return _env;

  const result = serverSchema.merge(clientSchema).safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${missing}`);
  }

  _env = result.data;

  return _env;
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
  });

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Client environment validation failed:\n${missing}`);
  }

  _clientEnv = result.data;
  return _clientEnv;
}
