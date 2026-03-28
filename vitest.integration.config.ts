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
      // Override DATABASE_URL with local test database
      // Set TEST_DATABASE_URL in .env.test or environment before running
      DATABASE_URL: process.env.TEST_DATABASE_URL || "",
    },
  },
});
