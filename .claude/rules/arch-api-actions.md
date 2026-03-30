---
description: API routes and server actions map — endpoints, auth requirements, DB tables
globs: ["src/app/api/**/*.ts", "src/app/dashboard/**/actions.ts", "src/app/dashboard/**/*-actions.ts"]
---

## API Routes

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/generate` | POST | User | AI campaign generation from scribble (rate: 10/hr) |
| `/api/generate/question` | POST | User | Generate single question |
| `/api/generate/audience` | POST | User | Generate audience targeting |
| `/api/export/responses` | GET | User (Pro+) | CSV export of campaign responses |
| `/api/reach-impression` | POST | User | Track wall feed impression |
| `/api/webhooks/stripe` | POST | Stripe sig | Handle payment events (checkout, subscription) |
| `/api/cron/expire-campaigns` | POST | Admin | Auto-close expired campaigns, clean stale responses |
| `/api/health` | GET | None | Basic health check |
| `/api/admin/diagnostics` | GET | Admin | DB status, system health |

## Server Actions

| File | Functions | DB Tables |
|------|-----------|-----------|
| `ideas/new/actions.ts` | publishCampaign() | campaigns, questions, subscriptions |
| `ideas/new/payment-actions.ts` | createFundingSession(), createSubscriptionSession() | (Stripe API) |
| `ideas/[id]/responses/payout-actions.ts` | suggestDistribution(), allocatePayouts(), allocatePayoutsV2() | responses, payouts, profiles, notifications |
| `ideas/[id]/campaign-actions.ts` | Campaign lifecycle (draft, publish, close) | campaigns |
| `the-wall/[id]/actions.ts` | startResponse(), saveAnswer(), submitResponse() | responses, answers, campaigns, profiles |
| `the-wall/[id]/reaction-actions.ts` | addReaction() | campaign_reactions |
| `settings/actions.ts` | updateProfile(), updateAvatar(), updatePassword() | profiles |
| `notifications/actions.ts` | markRead(), deleteNotification() | notifications |
