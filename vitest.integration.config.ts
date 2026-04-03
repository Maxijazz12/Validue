import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/__integration__/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    env: {
      // Point server-side imports at the integration test database by default.
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      // Provide harmless placeholders so server-only env parsing doesn't fail
      // when DB-backed modules are imported during integration tests.
      STRIPE_SECRET_KEY: "test_stripe_secret",
      STRIPE_WEBHOOK_SECRET: "test_stripe_webhook_secret",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test_supabase_anon_key",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
    },
  },
});
