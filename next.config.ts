import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP directives — kept readable, joined at build time
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`, // unsafe-eval only in dev (HMR)
  "style-src 'self' 'unsafe-inline'", // Tailwind injects inline styles
  "img-src 'self' data: blob: ooamtvochbfkpvwhvged.supabase.co",
  "font-src 'self'",
  "connect-src 'self' *.supabase.co *.ingest.sentry.io us.i.posthog.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: cspDirectives },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI logs during build
  silent: true,

  // Upload source maps for readable stack traces
  widenClientFileUpload: true,

  // Disable telemetry
  telemetry: false,
});
