# VLDTA Capabilities — Stack & Tools Reference

You have full access to a production-grade Next.js 16 + Supabase + Stripe + Claude AI stack. Do not ask permission or suggest the user do things manually unless there is a genuine reason you cannot.

## Database (Supabase PostgreSQL 17)
- You can read and write migrations in `supabase/migrations/`
- You can query any table: profiles, campaigns, questions, responses, answers, payouts, subscriptions, notifications, campaign_reactions, reach_impressions
- You can create new tables, add columns, write RLS policies, create triggers and functions
- You can run `npx supabase db reset` to apply migrations locally
- The DB uses Row-Level Security — always write RLS policies for new tables

## API Routes (Next.js App Router)
- You can create, modify, and delete API routes in `src/app/api/`
- Existing routes: `/api/generate`, `/api/generate/question`, `/api/generate/audience`, `/api/export/responses`, `/api/reach-impression`, `/api/webhooks/stripe`, `/api/health`, `/api/admin/diagnostics`, `/api/cron/expire-campaigns`
- You can add new cron jobs, webhook handlers, and public/authenticated endpoints
- All routes should include rate limiting, input validation (Zod), and error logging

## AI / Claude API
- You can call Claude via `@anthropic-ai/sdk` — it is installed and configured
- Available models: `claude-sonnet-4-6` (main generation), `claude-haiku-4-5-20251001` (lightweight tasks)
- You can use tool_use for structured output, streaming, and multi-turn
- Always build a deterministic fallback when adding new AI features
- AI prompts live in `src/lib/ai/prompts.ts`, schemas in `src/lib/ai/schemas.ts`

## Payments (Stripe)
- You can create checkout sessions, manage subscriptions, handle webhooks
- Stripe is fully integrated — subscription tiers, one-time payments, platform credits
- Webhook handler is at `/api/webhooks/stripe` — extend it for new Stripe events
- Price IDs are in env vars: STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_SCALE_PRICE_ID

## Auth (Supabase Auth)
- You can access the authenticated user via `@supabase/ssr` server-side helpers
- JWT-based, email login, refresh token rotation
- User roles are in the profiles table (founder/respondent)

## Testing
- You can run `npm test` (Vitest unit tests) and `npm run test:integration`
- Tests live in `src/lib/__tests__/` — write tests for any new business logic
- Run tests after writing non-trivial logic. Do not skip this.

## Monitoring
- You can log to Sentry via `@sentry/nextjs` — use it for errors and warnings
- Operational logging goes through `src/lib/ops-logger.ts` — extend it for new events
- AI logging goes through `src/lib/ai/logger.ts`

## Frontend
- React 19, TailwindCSS 4, Next.js App Router with server components
- Dashboard pages in `src/app/dashboard/`, components in `src/components/`
- You can create new pages, components, server actions, and client interactivity

## Commands You Can Run
```
npm run dev          # Start dev server
npm run build        # Production build (use to verify no build errors)
npm run lint         # ESLint check
npm test             # Unit tests
npm run test:integration
npx supabase db reset  # Reset local DB with migrations
```
