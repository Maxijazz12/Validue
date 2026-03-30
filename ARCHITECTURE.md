# VLDTA Architecture Map

Compact reference for navigating the codebase. One line per item where possible.

## Pages & Routes

### Landing (unauthenticated)
- `/` — Home landing page → Navbar, Hero, WallPreview, Ticker, HowItWorks, Pricing, Footer
- `/auth/login` — Login form
- `/auth/signup` — Signup form
- `/auth/forgot-password` — Password reset request
- `/auth/reset-password` — Password reset confirmation
- `/auth/callback` — OAuth callback handler (route.ts)

### Dashboard (authenticated)
- `/dashboard` — Redirects to `/dashboard/the-wall`
- `/dashboard/the-wall` — Respondent feed of active campaigns → WallFeed, WallCard[], WallOnboarding
- `/dashboard/the-wall/[id]` — Campaign detail + response flow → CampaignDetail, ResponseFlow
- `/dashboard/ideas` — Founder's campaign list → IdeasList
- `/dashboard/ideas/new` — Campaign creation → CreateIdeaFlow (scribble → generate → review → pay)
- `/dashboard/ideas/[id]` — Campaign detail, stats, analytics → CampaignAnalytics, StatusButtons
- `/dashboard/ideas/[id]/responses` — Response review, ranking, payouts → ResponseList, PayoutAllocator
- `/dashboard/my-responses` — Respondent's submitted responses
- `/dashboard/earnings` — Payout history + cashout
- `/dashboard/settings` — Profile, avatar, password, notifications
- `/dashboard/notifications` — Notification center

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

## Lib Modules

### Economics Core (NEVER parallelize — sequential only)
- `defaults.ts` — All thresholds (140+ constants). Imported by 40+ files. **CRITICAL.**
- `payout-math.ts` — Pure payout distribution (V1 power-law, V2 base+bonus, subsidy). Testable, no DB.
- `plan-guard.ts` — Subscription limits, campaign allowance, 7-layer subsidy eligibility.
- `reach.ts` — Reach budgeting, quality modifiers, campaign strength, funding presets.
- `reputation.ts` — Reputation calculation + tier management (EMA smoothing).
- `reputation-config.ts` — Tier thresholds (new/bronze/silver/gold/platinum), hysteresis buffer (5pt).
- `wall-ranking.ts` — Wall feed composite score (match 35% + reward 20% + quality 15% + freshness 15% + momentum 15%).
- `plans.ts` — Subscription tier config, PLATFORM_FEE_RATE (0.15), STRENGTH_THRESHOLDS.

### AI Pipeline
- `ai/client.ts` — Claude API client, isAIAvailable(), MODELS (sonnet, haiku).
- `ai/prompts.ts` — System prompt + generation rules. Behavioral-over-opinion focus.
- `ai/schemas.ts` — Zod schemas for AI structured output.
- `ai/types.ts` — CampaignDraft, DraftQuestion, etc.
- `ai/generate-campaign.ts` — Full campaign generation via Claude.
- `ai/generate-campaign-fallback.ts` — Deterministic fallback if AI fails.
- `ai/generate-question.ts` — Single question generation.
- `ai/generate-audience.ts` — Audience targeting generation.
- `ai/quality-pass.ts` — Campaign quality scoring (audience clarity, question quality, behavioral coverage, monetization).
- `ai/rank-responses.ts` — Response quality scoring (4D: depth/relevance/authenticity/consistency) + confidence shrinkage.
- `ai/logger.ts` — AI event logging.
- `ai/sanitize-prompt.ts` — Strip user data for logging.

### Infrastructure
- `db.ts` — PostgreSQL connection pool (max=20, idle=120s).
- `rate-limit.ts` — In-memory rate limiter.
- `content-filter.ts` — Content moderation, profanity blocklist, spam patterns.
- `ops-logger.ts` — Structured operational event logging (JSON to stdout).
- `sentry.ts` — Error/warning capture.
- `stripe.ts` — Stripe client init.
- `admin-auth.ts` — Admin request validation (ADMIN_SECRET).
- `supabase/server.ts` — Server-side Supabase client (SSR).
- `supabase/client.ts` — Browser Supabase client.
- `baseline-questions.ts` — Pre-generated question library (fallback + recommendation).
- `constants.ts` — Static app-wide constants (category lists).
- `strength-colors.ts` — Color scheme for strength badges.

## Component Groups

### Landing (src/components/landing/) — 12 files, zero coupling
Navbar, Hero, WallPreview, Ticker, HowItWorks, QualityFeature, Pricing, PricingButtons, PricingCalculator, DidYouKnow, CtaBanner, Footer, FloatingCard

### Dashboard Shell
Sidebar, MobileTabBar, CommandPalette, NotificationPanel, NotificationToast, ProfilePrompt, SubscriptionBanner, AchievementBanner, WeeklyDigestBanner, KeyboardHint

### Campaign Creation (src/components/dashboard/create-idea/) — 6 files
CreateIdeaFlow → ScribbleStep → GeneratingStep → DraftReviewStep (+ AudienceTargetingPanel, BaselineQuestionPicker, SurveyEditor, SignalStrengthMeter)

### Response Flow (src/components/dashboard/respond/) — 6 files
ResponseFlow → CampaignDetail → QuestionStepper → MultipleChoiceAnswer / OpenEndedAnswer → ProgressBar → SubmissionConfirmation

### Response Review & Payout — 5 files
ResponseList → ResponseCard, ResponseSection, RankButton, PayoutAllocator, ExportResponsesButton

### Wall Feed
WallFeed → WallCard[] → WallReactionBar, WallCardTracker, TrendingRow, ActivityTicker

### UI Primitives (src/components/ui/) — 9 files, zero coupling
Button, Input, ChipSelect, Avatar, ReputationBadge, Skeleton, SectionHeader

### Settings
AvatarUpload, PasswordChangeForm, NotificationPreferences, RespondentProfileForm

## Critical Data Flows

### Campaign Creation
```
Scribble → POST /api/generate → AI draft → DraftReviewStep (edit) → createFundingSession() → Stripe checkout → webhook → publishCampaign() → active on wall
```

### Response Submission
```
Wall feed (ranked by wall-ranking.ts) → startResponse() → saveAnswer() × N → submitResponse() → founder notified
```

### Payout Allocation
```
Founder clicks "Rank" → AI scores (4D + confidence) → suggestDistribution() → qualifyResponse() (V2) → distributePayoutsV2() → atomic: create payouts + update responses + update profiles → notify respondents → updateReputation()
```

## Parallelization Rules

**Default: single agent with subagents.** Only escalate to worktrees when there's a clear speed win with zero shared files.

**Use subagents for:** codebase exploration (2-3 Explore in parallel), plan design, background verification (tests/lint/build).

**Use worktree agents for:** genuinely independent features touching zero shared files — new modules, pages, API routes, test suites.

**Do not parallelize when:** tasks edit the same files or shared dependencies, work is sequential, or you have to think hard about whether tasks will conflict (they will).

**Rule of thumb:** If a task will require >3 tool calls, spawn a subagent. Keep main thread for decisions, synthesis, small edits, commits.

## High-Coupling Files (Risk Assessment)

| File | Dependents | Risk | Why |
|------|-----------|------|-----|
| `lib/defaults.ts` | 40+ | CRITICAL | All thresholds; changes cascade everywhere |
| `lib/payout-math.ts` | payout-actions, tests | HIGH | Core economics; V1+V2 must stay consistent |
| `lib/plan-guard.ts` | publishCampaign, funding | HIGH | Gates campaign creation; 7 subsidy rules |
| `lib/reputation.ts` | payout-actions, response actions | HIGH | Updates after every payout |
| `api/generate/route.ts` | 3+ endpoints | MEDIUM | Question generation hub |
| `api/webhooks/stripe/route.ts` | payment state machine | MEDIUM | Stripe event handling |
| `ideas/new/actions.ts` | create flow | MEDIUM | Campaign + questions + subscription insert |
| `responses/payout-actions.ts` | responses page | MEDIUM | Two parallel V1/V2 code paths |

## Safe for Parallel Worktrees (Zero Coupling)

- `src/components/landing/*` — Independent UI module
- `src/components/ui/*` — Pure components, no action imports
- New API routes that don't modify existing routes
- New lib utilities before anything imports them
- Test suites in `src/lib/__tests__/`
- New dashboard pages with new components

## Database Tables

Core: campaigns, questions, responses, answers, payouts, profiles, subscriptions
Supporting: notifications, campaign_reactions, reach_impressions

Key columns: campaigns.economics_version (1 or 2), responses.money_state (pending_qualification → locked → available → paid_out), profiles.reputation_tier (new/bronze/silver/gold/platinum)
