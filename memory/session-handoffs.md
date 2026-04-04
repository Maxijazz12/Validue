# Session Handoffs

## Prior sessions (summarized)
- 2026-03-30: Phase 2-4 marathon (audience segmentation, WTP probing, longitudinal validation)
- 2026-03-31: Infrastructure + grounding check + evidence pipeline fixes
- 2026-04-01: UX/UI consistency sweep (~40 files) + question generation rewrite (assumption-killing)
- 2026-04-02: Partial response model, reciprocal gate, economics rebalance, Scale removal, cold-start fix, dead code cleanup
- 2026-04-02 (night): E2e testing session — migrations applied, respond flow verified, brief fallback rendering
- 2026-04-03 (afternoon): Full codebase security & math audit + 12 fixes (CAS locks, timing-safe cron, spam bypass, idempotency)
- 2026-04-03: Cashout flow + launch blockers sweep (7 features)
- 2026-04-03 (night): Full 9-system audit + 12 critical/high fixes (payout CAS, reputation NaN, timing-safe cron, atomic submission CTE)
- 2026-04-04: Phase 2 targeting — critique + full implementation (4 workstreams)

## 2026-04-04 — Phase 2: Targeting Strictness, Match Snapshots, Funnel Analytics, Brief Segmentation

### What was done

Fixed a live bug in `assumption-evidence.ts` and `extract-price-signal.ts` (industry + experience_level columns missing from SQL queries — match scores in briefs were wrong for those dimensions since Phase 1 shipped). Then implemented all 4 workstreams of Phase 2.

#### WS1: Targeting Strictness Modes
- Founders choose `broad` / `balanced` / `strict` when creating campaigns
- `broad` = no eligibility check (ranking only), `balanced` = any-dimension overlap (existing behavior), `strict` = all-dimension overlap required
- Migration `052_targeting_strictness.sql` — column + CHECK constraint
- Refactored `meetsMinimumEligibility` to accept `TargetingMode` param with backward-compatible default
- 21 new tests covering all mode × dimension × edge case combinations
- Subsidized campaigns forced to `balanced` (anti-gaming)
- 3-option segmented control in `AudienceTargetingPanel` with mode descriptions
- Reach warnings adjusted for strict mode (lower filter threshold)
- Mode-aware error messages in `startResponse`

#### WS3: Response-Time Match Snapshots
- Captures `match_score_at_start` (smallint) + `match_bucket` (core/adjacent/off_target) at response creation time
- Migration `053_response_match_snapshot.sql` — columns + CHECK constraints + partial index
- `classifyMatchBucket()` helper in `wall-ranking.ts` (reusable across codebase)
- `MATCH_BUCKET_CORE_THRESHOLD: 70` and `MATCH_BUCKET_ADJACENT_THRESHOLD: 40` in defaults
- Eliminated duplicate profile fetch in `startResponse` (saves 1 DB round-trip per response start)
- 6 new bucket classification tests

#### WS4: Founder Audience-Funnel Analytics
- `wall_impressions` table tracks which campaigns each respondent sees on The Wall
- Migration `054_wall_impressions.sql` — table + PK + CHECK constraints + indexes + both SELECT and INSERT RLS policies
- Fire-and-forget batch impression recording in `load-wall-page-data.ts` via `jsonb_to_recordset` + `ON CONFLICT DO NOTHING`
- Funnel query on responses page: shown → started → submitted → qualified → paid, broken out by match bucket
- Demographics query: top industries, experience levels, age ranges from submitted responses
- `AudienceFunnel` component — stacked bar chart with conversion rates per stage, color-coded by bucket
- `RespondentDemographics` component — top-5 breakdowns with mini bar charts

#### WS5: Brief Segmentation by Fit Bucket
- Added `matchBucket: MatchBucket` to `AssumptionEvidence` type
- Added `groupByBucket()` helper for evidence grouping
- Updated AI system prompt with detailed segmentation instructions (weighting rules, expansion market detection, segment alignment definitions)
- `buildSynthesisPrompt` groups evidence by bucket per assumption when `isSegmented` is true
- Added `segmentAlignment` (ALIGNED/SPLIT/CORE_ONLY/UNSEGMENTED) to `AssumptionVerdictSchema`
- Added `sampleQuality` to `DecisionBriefSchema` (bucket counts + note)
- Segmentation decision: activate when >=3 total responses AND >=1 core-fit
- "Sample Composition" card in brief UI with colored bucket indicators
- Segment alignment badges on each verdict card

#### Deferred
- **WS2 (Hard Filters)** — deferred until strict mode adoption data exists. Adds nested config (which dimensions are "hard" within strict mode) that most founders won't use yet.

### Migrations to apply (3 new)
- `052_targeting_strictness.sql`
- `053_response_match_snapshot.sql`
- `054_wall_impressions.sql`

### Files created (5)
- `supabase/migrations/052_targeting_strictness.sql`
- `supabase/migrations/053_response_match_snapshot.sql`
- `supabase/migrations/054_wall_impressions.sql`
- `src/components/dashboard/responses/AudienceFunnel.tsx`
- `src/components/dashboard/responses/RespondentDemographics.tsx`

### Files modified (18)
- `src/lib/wall-ranking.ts` — `TargetingMode`, `MatchBucket`, `classifyMatchBucket()`, refactored `meetsMinimumEligibility`
- `src/lib/defaults.ts` — `MATCH_BUCKET_CORE_THRESHOLD`, `MATCH_BUCKET_ADJACENT_THRESHOLD`
- `src/lib/supabase/database.types.ts` — `targeting_mode` on campaigns, `match_score_at_start`/`match_bucket` on responses, `wall_impressions` table
- `src/lib/ai/types.ts` — `targetingMode` on `CampaignDraft`
- `src/lib/campaign-draft-persistence.ts` — `targetingMode` through all types + builders
- `src/lib/reach.ts` — `getCampaignWarnings` accepts `targetingMode`
- `src/lib/ai/assumption-evidence.ts` — `matchBucket` on evidence, `groupByBucket()`, fixed missing industry/experience columns in SQL
- `src/lib/ai/extract-price-signal.ts` — fixed missing industry/experience columns in SQL
- `src/lib/ai/brief-prompts.ts` — segmentation instructions in system prompt, bucket-grouped evidence in user message
- `src/lib/ai/brief-schemas.ts` — `segmentAlignment` on verdicts, `sampleQuality` on brief
- `src/lib/ai/synthesize-brief.ts` — segmentation decision, `isSegmented`/`bucketCounts` on `BriefResult`
- `src/app/dashboard/ideas/new/actions.ts` — `targeting_mode` in publish/save/update SQL
- `src/app/dashboard/the-wall/[id]/actions.ts` — targeting mode + match snapshot in startResponse
- `src/app/dashboard/the-wall/load-wall-page-data.ts` — impression recording
- `src/app/dashboard/ideas/[id]/responses/page.tsx` — funnel + demographics queries + rendering
- `src/app/dashboard/ideas/[id]/brief/BriefPageContent.tsx` — sample composition card + segment alignment badges
- `src/app/dashboard/ideas/[id]/brief/page.tsx` — passes segmentation props
- `src/components/dashboard/create-idea/AudienceTargetingPanel.tsx` — targeting mode selector
- `src/components/dashboard/create-idea/DraftReviewStep.tsx` — passes targeting mode props

### Verification
- Tests: 408/408 passing (was 381 at session start)
- ESLint: 0 errors
- Build: successful

### Known gaps (carried forward)
- WS2 (Hard Filters) deferred — revisit after strict mode adoption data
- matchSkew in `segment-disagreements.ts` still uses hardcoded 70/30 thresholds (should use `classifyMatchBucket`)
- `assumption-evidence.ts` re-computes match scores at brief time — future: use stored `match_score_at_start` from WS3 with fallback for pre-WS3 rows
- Brief cache does not have a version — old cached briefs won't have segmentation fields (they render fine since fields are optional, but won't show the new UI)
- `Database` type not wired into Supabase clients
- Dead V1 DB columns still exist

## 2026-04-03 (night) — Full 9-system audit + 12 critical/high fixes

### What was done
Ran 9 parallel audit agents covering auth, Stripe/payments, economics, AI, response/wall flows, campaign lifecycle, DB migrations/RLS, API routes, and UI components. Found ~30 issues across severity levels. Fixed the 12 most critical.

#### Critical fixes
1. **Auth recovery flow broken** — Reset password page had no session validation; callback didn't handle recovery codes; no signout after password change. Fixed all three + added "checking" UI gate.
2. **Campaign state machine dual-condition bug** — Funded+gated campaigns could activate from either Stripe webhook OR gate clearing independently. Now webhook checks gate status before activating; gate clearing checks `funded_at` before activating.
3. **Webhook credit clearing swallowed errors** — `.catch()` on welcome/platform credit SQL returned 200 to Stripe (no retry). Removed `.catch()` so errors propagate to outer try-catch → 500 → Stripe retries.
4. **V1 fill-cap not atomic** — Two concurrent users could overshoot `target_responses`. Replaced Supabase `.insert()` with atomic `INSERT...WHERE (SELECT COUNT(*) < target)`.
5. **Partial response bypass** — `is_partial=true` with empty `assigned_question_ids` skipped all questions. Added explicit guard.

#### High fixes
6. **Cashout transfer idempotency** — Added `idempotencyKey: cashout_${cashoutId}` to Stripe transfer call.
7. **V2 allocatePayouts** — Missing `responses.length === responseIds.length` check allowed silent skipping.
8. **Payout status check** — Only blocked `allocated`, not `completed`. Now blocks both.
9. **Orphaned pending_funding campaigns** — Cron only cleaned `pending_gate`. Added 7-day TTL for unfunded `pending_funding`.
10. **Notifications RLS** — Any authenticated user could INSERT. Tightened to service_role only (migration 043).
11. **Cron error info disclosure** — Removed `details` from error response, added `captureError`.
12. **UI promise rejections** — Added `.catch()` to NotificationPanel and CashoutPanel useEffect hooks.

#### Clean systems (no bugs found)
- AI/LLM (excellent fallbacks, prompt injection defense, grounding checks)
- Economics/ranking (payout sums reconcile, wall weights sum to 1.0, anti-gaming solid)
- UI components (all directives correct, hydration handled, types match schema)

### Files modified (11)
- `src/app/auth/reset-password/page.tsx`, `src/app/auth/callback/route.ts` — auth recovery
- `src/app/api/webhooks/stripe/route.ts` — gate check + credit error propagation
- `src/app/dashboard/ideas/new/reciprocal-actions.ts` — gate-only activation
- `src/app/dashboard/earnings/cashout-actions.ts` — transfer idempotency
- `src/app/dashboard/the-wall/[id]/actions.ts` — atomic V1 fill-cap + partial guard
- `src/app/api/cron/expire-campaigns/route.ts` — pending_funding cleanup + error disclosure
- `src/app/dashboard/ideas/[id]/responses/payout-actions.ts` — response count validation + status check
- `src/components/dashboard/NotificationPanel.tsx`, `src/app/dashboard/earnings/CashoutPanel.tsx` — promise handlers
- `supabase/migrations/043_rls_policy_hardening.sql` — notifications, disputes, cashouts policies

### Pre-existing issues (not fixed this session)
- `layout.tsx` type error (`planLimit` undefined) — likely from prior uncommitted work
- 1 lint error + 7 warnings in integration tests — pre-existing

## 2026-04-03 (evening) — Deep audit: math, targeting, race conditions, test coverage

### What was done
Full codebase audit across economics, targeting, API routes, and integration tests. Found 16+ issues, fixed all severity levels from critical through low. Wrote 25 new integration tests.

#### Critical fixes (money + security)
1. **Payout disqualification reasons inverted** (`payout-math.ts:232`) — Ternary logic scrambled: paid+qualified got failure reasons, unpaid+qualified got nothing, disqualified got empty. Fixed to: qualified+paid=[], qualified+unpaid=["budget exhausted"], disqualified=actual reasons.
2. **Cron auth fail-open** (`expire-campaigns/route.ts:48`) — `if (cronSecret && ...)` let all requests through when env var missing. Changed to `if (!cronSecret || ...)` — fail closed.
3. **NaN balance corruption** (`expire-campaigns/route.ts:294`) — `Number(lr.total)` on NULL → NaN propagated through `Math.round(NaN * 100)` into balance updates. Added `Number.isFinite()` guard + anomaly logging.
4. **Double-submission race** (`actions.ts:441-453`) — Response status update and campaign counter were separate operations. Replaced with single CTE: `UPDATE responses WHERE status = 'in_progress' RETURNING` feeds conditional `UPDATE campaigns SET current_responses + 1`.

#### Targeting + behavioral fixes
5. **Incomplete profile ranked above non-matching complete** (`defaults.ts`) — `MATCH_SCORE_INCOMPLETE` was 40, but complete profile with unknown dimensions scored 34. Dropped to 30 — completing profile is now always better.
6. **Partial response time floor too low** (`actions.ts:408`) — Flat 15s floor meant 1-of-100 questions could be answered in 15s. Now 8s per assigned question (`PARTIAL_MIN_TIME_PER_QUESTION_MS`).
7. **Abandoned response duplicate exploit** (`reciprocal-actions.ts:63,105,283`) — `abandoned` status excluded from dedup queries let users start→abandon→re-respond to same campaign. Added `abandoned` to all exclusion queries + explicit rejection in `saveReciprocalAnswer`.

#### Race condition fixes
8. **Platform credit double-spend** (`payment-actions.ts:90-113`) — Credit read without lock let concurrent checkouts both apply same credit. Wrapped in `sql.begin()` + `SELECT ... FOR UPDATE` + eager deduction under lock.
9. **Reciprocal gate counter race** (`reciprocal-actions.ts:416-445`) — Counter computed in app code (`+1`) then written back. Two concurrent completions both read same value. Moved increment to SQL: `SET reciprocal_responses_completed = COALESCE(..., 0) + 1 RETURNING`.

#### Low severity fixes
10. **Payout sum invariant assertion** (`payout-math.ts:207`) — Added post-reconciliation check: throws if qualified payout sum drifts >1¢ from distributable.
11. **Reputation -1 sentinel → NaN** (`reputation.ts:65-77`) — Replaced fragile `-1` sentinel with `NaN` + `Number.isFinite()` checks throughout. NaN propagates obviously instead of silently comparing as "less than zero."
12. **Variable naming** (`plan-guard.ts:224`) — `subsidizedThisMonth` → `subsidizedLast30Days` (was a rolling window, not calendar month).
13. **Reach iteration convergence** (`reach.ts:186`) — Added comment documenting why 3 iterations suffices (monotonic contraction).
14. **Null reach config fallback** (`load-wall-page-data.ts:117`) — Changed fallback from 75 to 0. Campaigns without reach config now hidden from wall instead of getting phantom 75-unit budget.

#### New integration tests (25 cases across 2 files)
- `subsidized-payout.integration.test.ts` (7 tests): flat payout under/at/over cap, budget exhaustion reasons, disqualified reasons, zero qualified, empty input, mixed ordering.
- `reputation.integration.test.ts` (18 tests): tier assignment (new/bronze/silver/gold/platinum), confidence dampener, gaming penalty, reliability, hysteresis retention + demotion, volume bonus, exact manual calculations at 5 and 10 responses, DB-backed stats + flagging.

#### Confirmed not bugs (audit false positives)
- **Reach impression CTE** (#5) — `INSERT ON CONFLICT DO NOTHING RETURNING` is atomic at statement level in PostgreSQL. Only one concurrent insert gets a RETURNING row. Already correct.
- **Stripe webhook dedup** (#6) — Same pattern, already correct.

### Files modified (11)
- `src/lib/payout-math.ts` — disqualification reasons fix + sum invariant assertion
- `src/lib/reputation.ts` — NaN sentinel, `Number.isFinite()` guards
- `src/lib/defaults.ts` — `MATCH_SCORE_INCOMPLETE: 30`, `PARTIAL_MIN_TIME_PER_QUESTION_MS: 8000`
- `src/lib/plan-guard.ts` — variable rename
- `src/lib/reach.ts` — convergence comment
- `src/lib/wall-ranking.ts` — (via defaults change)
- `src/app/api/cron/expire-campaigns/route.ts` — cron auth + NaN guard
- `src/app/dashboard/the-wall/[id]/actions.ts` — atomic submission CTE + partial time floor
- `src/app/dashboard/the-wall/load-wall-page-data.ts` — null reach fallback
- `src/app/dashboard/ideas/new/payment-actions.ts` — credit lock + eager deduct
- `src/app/dashboard/ideas/new/reciprocal-actions.ts` — abandoned dedup + atomic gate counter

### Files created (2)
- `src/__integration__/subsidized-payout.integration.test.ts`
- `src/__integration__/reputation.integration.test.ts`

### Files modified (tests)
- `src/lib/__tests__/wall-ranking.test.ts` — updated MATCH_SCORE_INCOMPLETE assertion

### Verification
- TypeScript: 0 errors
- Unit tests: 301/301 passing
- Integration tests: 67/67 passing (10 files, includes 25 new)

### Known gaps (carried forward)
- matchSkew splits by quality not audience match
- `Database` type not wired into Supabase clients
- Dead V1 DB columns (`rewardsTopAnswers`, `bonusAvailable`, `top_only`)
- Brief synthesis blocker from 04-02 may still exist
- No geographic/behavioral targeting (basic interest/expertise matching only)
- Completed campaigns can briefly appear on wall before cron marks them (caught at response start)
- Campaign auto-extension has no creator existence check (zombie campaigns edge case)

### CLAUDE.md update proposal
- Add `payment-actions.ts` to high-coupling files list (Stripe + credit + subsidy interaction)
- Add `reciprocal-actions.ts` to state-machine-sensitive areas (gate lifecycle)
- Note: reach impression CTE and Stripe webhook dedup are confirmed atomic — don't re-audit

## 2026-04-03 (afternoon) — Full codebase security & math audit + fixes

### What was done
Comprehensive audit of all economics, targeting, API routes, and DB layer. Found and fixed 12 issues across money, race conditions, and security.

#### Critical fixes
1. **Payout CAS NULL bypass** — `.neq("allocated")` matched NULL; changed to `.eq("pending")` in V1+V2
2. **V2 response overfill race** — replaced separate COUNT+INSERT with atomic `INSERT...WHERE (SELECT COUNT(*)) < target`
3. **Cron duplicate payouts** — added `RETURNING id` check on `status='completed'` CAS transition
4. **Stripe webhook idempotency** — `processed_stripe_events` table + INSERT ON CONFLICT guard
5. **Spam bypass in cron** — expiration path now computes `spamFlagged` from paste metadata (was missing)
6. **Money state guard** — V2 payout UPDATE now requires `money_state = 'pending_qualification'` only

#### High-risk fixes
7. **Payout sum tolerance** — switched from float-based 0.01 tolerance to integer-cent comparison
8. **Reputation error handling** — profile fetch/update now throw on failure instead of silent fallback
9. **Cron secret timing-safe** — replaced string `!==` with `timingSafeEqual`
10. **Reach impression race** — combined INSERT+UPDATE into single CTE
11. **Balance mismatch logging** — cron balance update now checks RETURNING + logs anomalies
12. **Subsidy eligibility constant** — extracted hardcoded 30d to `DEFAULTS.SUBSIDY_ELIGIBILITY_DAYS`

#### Migration
- `039_idempotency_and_dedup.sql`: Stripe event dedup table + unique partial index on responses(respondent_id, campaign_id) for active statuses

### Files modified (7)
- `src/app/dashboard/ideas/[id]/responses/payout-actions.ts` — CAS locks, sum validation, money_state guard
- `src/app/api/cron/expire-campaigns/route.ts` — CAS, timing-safe secret, spam detection, balance logging
- `src/app/api/webhooks/stripe/route.ts` — idempotency guard
- `src/app/api/reach-impression/route.ts` — atomic CTE
- `src/app/dashboard/the-wall/[id]/actions.ts` — atomic fill-cap INSERT
- `src/lib/reputation.ts` — error handling on fetch/update
- `src/lib/defaults.ts` — SUBSIDY_ELIGIBILITY_DAYS constant
- `src/lib/plan-guard.ts` — use new constant
- `src/lib/ops-logger.ts` — balance_mismatch anomaly type

### Files created (1)
- `supabase/migrations/039_idempotency_and_dedup.sql`

### Verification
- TypeScript: 0 errors
- ESLint: clean
- Unit tests: 301/301 passing
- Build: successful

### Known gaps (carried forward)
- matchSkew splits by quality not audience match
- `Database` type not wired into Supabase clients
- Integration tests always skip
- Dead V1 DB columns
- Reputation updates not transactional with payouts (logged, not blocked)
- Incomplete profiles get flat 40/100 match score (intentional but no profile completion incentive)

## 2026-04-03 — Cashout flow + launch blockers sweep

### What was done
Built 7 features to close pre-launch gaps. All pass lint + tsc + build.

1. **Cashout flow (Stripe Connect)** — The single biggest missing piece. Full money-out path:
   - Migration `036`: `cashouts` table + `stripe_connect_account_id`/`stripe_connect_onboarding_complete` on profiles
   - Server actions: `createConnectOnboardingLink`, `checkConnectStatus`, `requestCashout`, `retryCashout`
   - Connect webhook handler at `/api/webhooks/stripe-connect`
   - `CashoutPanel` client component on earnings page (3 states: setup bank, complete setup, cash out)
   - `RetryCashoutButton` for failed cashouts
   - Cashout history section on earnings page

2. **Legal pages** — `/terms` (16 sections) + `/privacy` (13 sections), footer links wired

3. **Email verification enforcement** — Dashboard layout checks `email_confirmed_at`, redirects to `/auth/verify-email` (resend + check buttons)

4. **Account deletion** — `deleteAccount()` cascades all user data (answers → cashouts → payouts → responses → questions → campaigns → profile), blocks if pending balance. `DeleteAccountButton` with type-DELETE confirmation.

5. **Admin UI** — `/admin` page with 4 tabs: System Health, Campaign Lookup, User Lookup (new `/api/admin/users` endpoint), Disputes. Session-stored admin key auth.

6. **Dispute/appeal flow** — Migration `037`: `disputes` table (one per response). Respondents see "Appeal" on disqualified responses in earnings page. Admin can uphold or overturn (overturning re-qualifies + credits balance). `/api/admin/disputes` GET + PATCH.

7. **Cashout failure recovery** — `retryCashout()` server action re-attempts failed transfers. Retry button shown inline on failed cashout history items.

### Migrations to apply
- `036_cashouts_and_connect.sql`
- `037_disputes.sql`

### Env vars to add
- `STRIPE_CONNECT_WEBHOOK_SECRET` — create Connect webhook in Stripe Dashboard → `/api/webhooks/stripe-connect`

### Files created (15)
- `supabase/migrations/036_cashouts_and_connect.sql`
- `supabase/migrations/037_disputes.sql`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/auth/verify-email/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/disputes/route.ts`
- `src/app/api/webhooks/stripe-connect/route.ts`
- `src/app/dashboard/earnings/cashout-actions.ts`
- `src/app/dashboard/earnings/CashoutPanel.tsx`
- `src/app/dashboard/earnings/RetryCashoutButton.tsx`
- `src/app/dashboard/earnings/dispute-actions.ts`
- `src/app/dashboard/earnings/DisputeButton.tsx`
- `src/app/dashboard/settings/account-actions.ts`
- `src/app/dashboard/settings/DeleteAccountButton.tsx`

### Files modified (7)
- `src/app/dashboard/earnings/page.tsx` — CashoutPanel + DisputeButton + RetryCashout + cashout history
- `src/app/dashboard/layout.tsx` — email verification gate
- `src/app/dashboard/settings/page.tsx` — DeleteAccountButton
- `src/components/landing/Footer.tsx` — legal page links
- `src/lib/supabase/database.types.ts` — cashouts + disputes + Connect fields
- `src/lib/ops-logger.ts` — connect.account_created + cashout.initiated events
- `.env.example` — STRIPE_CONNECT_WEBHOOK_SECRET

### Known gaps (carried forward)
- matchSkew splits by quality not audience match
- `Database` type not wired into Supabase clients
- Integration tests always skip
- Dead V1 DB columns (`rewardsTopAnswers`, `bonusAvailable`, `top_only` reward type)
- Brief synthesis blocker from 04-02 session may still exist

## 2026-04-02 (late night) — E2E testing + migration deployment + brief debugging

### What was done
1. **Committed big batch** (`1b7bcb2`): reciprocal gate in GeneratingStep, economics rebalance, UI polish, dead code removal. 85 files, 277 tests, build clean.
2. **Dead code cleanup** (`0aaa6e4`): Removed ReciprocateStep.tsx, generate-action.ts, legacy ReciprocalQuestion type, stale PlanConfig fields (hasAbTesting, hasDedicatedSupport, campaignsPerMonth null branch), unused REWARD_TYPE_OPTIONS.
3. **Fixed 25 lint errors** blocking commit: JSX `// text` comments → `{"// "}text`, `useRef(Date.now())` → `useMemo`, `setState` in effect → lazy `useState`.
4. **Migrations applied to remote Supabase** (project `ooamtvochbfkpvwhvged`):
   - Created `supabase/combined_002_035.sql` — idempotent mega-script covering all 34 migrations
   - User initially ran on wrong project (`idmyqjdmjvupfbvgmxsw`), then re-ran on correct one
   - Also ran `npx supabase db push` which applied 033, 034, 035 via CLI
   - Fixed response status trigger to include `abandoned` transition (had to DROP + CREATE, not just CREATE OR REPLACE — user had to run manually in SQL Editor)
5. **Seeded test data**: 2 active campaigns with 7 questions each (seed-test-campaign.ts), 5 fake responses with realistic answers on Max's freelancer campaign (seed-responses.ts)
6. **E2E respond flow verified**: Partial assignment working (3 questions assigned from 7), responses submitted successfully to seeded campaigns

### The blocker: Brief synthesis not working
- **Page**: `/dashboard/ideas/8f97d26d-38fe-4ede-b627-791cbcd2df3f/brief`
- **Campaign**: "A simple app for freelancers..." — 5 submitted responses, 6 answers each, all data present in DB
- **Symptom**: Brief page renders the **fallback** ("AI synthesis unavailable. Manual review recommended.") instead of calling Claude for real synthesis. All assumption verdicts show "Insufficient Data" with fallback text.
- **API key works**: `curl` test to Anthropic API returns 200 with `claude-sonnet-4-6`. Key is in `.env.local`.
- **Subscription is pro**: `getSubscription()` returns pro tier, brief access gate passes.
- **Console logs added but not appearing**: Added `console.log("[brief]")` and `console.error("[brief]")` in `synthesize-brief.ts` at evidence gathering catch, AI call start, AI response received, and synthesis attempt failure — but **nothing appears in the Next.js terminal**. This suggests the server component may be running in a way that doesn't output to the local terminal, OR the page is being served from a cache/edge that bypasses the server.
- **Added 60s AbortController timeout** to the `callSynthesis` AI call (was unbounded before).
- **Brief cache was cleared** via SQL (`UPDATE campaigns SET brief_cache = NULL...`) but fallback still renders instantly — suggests the fallback result itself may be cached by Next.js (not the DB cache).

### How to debug
1. **Try `next dev` restart** — the server component logs might not flush until restart. Kill the dev server and restart `npm run dev`.
2. **Check if Next.js is caching the page** — server components in App Router can be cached. Try adding `export const dynamic = "force-dynamic"` to `src/app/dashboard/ideas/[id]/brief/page.tsx`.
3. **Check the evidence pipeline** — the `catch` at line ~253 of `synthesize-brief.ts` catches evidence gathering failures (getEvidenceByAssumption, getBriefMethodology, extractPriceSignal, detectConsistencyGaps). If any of these fail, it returns the fallback. Add explicit try/catch around each one individually to find which fails.
4. **Check `getEvidenceByAssumption`** — this queries responses + answers + questions joined. The seeded responses have `quality_score = NULL` (never ranked) — check if the evidence pipeline filters on quality_score being non-null.
5. **The Anthropic API call itself works** — confirmed via curl. The issue is upstream of the AI call (evidence gathering) or the logs genuinely not appearing.

### Known state
- **DB is fully migrated** on `ooamtvochbfkpvwhvged` (MVP - VLDATA)
- **Supabase MCP** is connected but **read-only** — DDL requires SQL Editor or CLI
- **Tests**: 277 passing, lint clean, build clean
- **Files modified this session** (not yet committed): `synthesize-brief.ts` (added error logging + 60s timeout)
- **Seed scripts**: `src/scripts/seed-test-campaign.ts` (2 campaigns), `src/scripts/seed-responses.ts` (5 responses for freelancer campaign)
- **combined_002_035.sql** in `supabase/` — can be deleted, it was a one-time apply tool

### Known gaps (carried forward)
- `bonusAvailable`, `rewardsTopAnswers`, `top_only` reward type — V1 DB columns, referenced in ~15 files, need migration to remove
- matchSkew splits by quality not audience match
- `Database` type not wired into clients
- Integration tests always skip

## 2026-04-02 (night) — Reciprocal gate cold-start fix

### Summary
Fixed server-side bug where free-tier users on an empty platform get campaigns stuck in `pending_gate` forever. No campaigns to reciprocate against → no submitted partials → `publishCampaign` refused to clear gate.

### Changes
- **`reciprocal-actions.ts`** — Added `hasReciprocalCampaigns()` server action
- **`actions.ts`** — `publishCampaign` accepts `coldStart` flag, verifies server-side, exempts gate if truly empty
- **`CreateIdeaFlow.tsx`** — Tracks `coldStart` state when assignments empty, passes to publish
- **`ops-logger.ts`** — Added `reciprocal_gate.cold_start_exempt` event type

### UX decision
Cold-start users see the normal generating skeleton. No mention of the gate.

### Pre-launch testing required
- **Free-tier cold-start e2e**: drop Max's subscription to free, test full create flow on empty platform. Deferred — Max will test later.

### What's next
1. **Brief quality validation** — does 5-question, 7-response brief feel better than 3×5?
2. **Complete e2e test** — publish → wall → respond → brief generation
3. **Known gaps** — matchSkew, dead V1 columns, `Database` type, unused `PlanConfig` fields

## 2026-04-02 (evening) — System critique + fixes + e2e prep

### Summary
Critiqued partial response + reciprocal gate implementation, fixed 5 issues, prepped for e2e testing. Reciprocal gate flow tested successfully end-to-end through the generation step.

### Fixes applied

1. **`gatePreCleared` bypass (security)** — `publishCampaign` now verifies the client's claim by counting actual submitted partial responses in DB. The client flag is a hint, not a bypass.

2. **Auto-submit race condition** — `saveReciprocalAnswer` now uses a single CTE: only increments `current_responses` if the response actually flipped from `in_progress` → `submitted`. Prevents double-counting.

3. **DebugPanel gated to dev** — wrapped in `process.env.NODE_ENV === "development"`.

4. **`pending_gate` as proper status** — new migration 035:
   - DB constraint + transition trigger updated
   - `publishCampaign` uses `pending_gate` (not `pending_funding`) for gated campaigns
   - Campaign detail page: gate UI keyed to `pending_gate` directly
   - IdeasList: "GATE" badge for `pending_gate`

5. **Animation shorthand fix** — IdeasList stagger animation mixed `animation` + `animationDelay`; moved delay into shorthand.

6. **Generate route response format** — API returned raw draft, client expected `{ status: "done", draft }`. Fixed wrapper.

### Known gaps (carried forward)
- matchSkew splits by quality not audience match
- `Database` type not wired into clients
- Integration tests always skip
- Dead V1 DB columns (`rewardsTopAnswers`, `bonusAvailable`, `top_only` reward type)
- `PlanConfig` type has unused fields (`campaignsPerMonth`, `hasAbTesting`, `hasDedicatedSupport`)

## 2026-04-01 — UX/UI consistency sweep

### Summary
Comprehensive UI consistency pass across ~40 files. No functional changes — purely visual/interaction polish.

### What changed

**Button standardization** (all primary buttons now match `Button.tsx` base):
- `rounded-lg` → `rounded-xl` on all interactive elements (buttons, inputs, selects, textareas, alerts)
- `font-semibold` → `font-medium` on all primary buttons
- `hover:bg-[#222222]` → `hover:bg-[#1a1a1a]` everywhere
- Added brand peach hover shadow (`hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),...]`) + `-translate-y-[1px]` lift to all primary buttons
- `transition-all duration-200` standardized (was mixed 200/300)

**Color consolidation**:
- `#222222` → `#111111` for all heading text (10 files)
- Navbar `#4a5568` → `#64748B` (theme secondary)
- Navbar divider `#c0c7d0` → `#CBD5E1` (theme border)
- Money/earnings amounts: `#34D399` → `#22C55E` (deeper green for readability)
- Progress bars/pulse dots kept at `#34D399` (lighter green for ambient indicators)

**Typography standardization**:
- Label tracking unified to `tracking-[0.08em]` (was `0.06em`, `1px`, `1.5px`)
- `SectionHeader` label: `text-[12px]` → `text-[11px]` to match StatCard/HowItWorks/Footer

**Card hover consistency**:
- Landing page cards now use brand peach shadow: `rgba(232,193,176,0.06)` instead of `rgba(0,0,0,0.04)`
- All card hover transitions: `duration-200`

**Focus state consistency**:
- WallCard textarea focus: `rgba(232,193,176,0.15)` → `rgba(0,0,0,0.04)` to match Input
- OpenEndedAnswer textarea: `focus:ring-2 focus:ring-[#111111]/10` → standard `focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]`

**Alert/error box consistency**:
- All error alerts: `rounded-lg` → `rounded-xl` (auth pages, create flow, settings)

### Files touched (~40)
UI primitives: `Button.tsx`, `Input.tsx`, `SectionHeader.tsx`
Landing: `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`, `HowItWorks.tsx`, `Pricing.tsx`, `WallPreview.tsx`, `CtaBanner.tsx`
Dashboard: `Sidebar.tsx`, `StatCard.tsx`, `WallCard.tsx`, `WallFeed.tsx`, `IdeasList.tsx`, `NotificationPanel.tsx`, `MyResponsesFeed.tsx`, `FundCampaignButton.tsx`, `ProfilePrompt.tsx`, `CampaignStatusButtons.tsx`, `ResponsesOverviewList.tsx`, `CampaignAnalytics.tsx`
Create flow: `CreateIdeaFlow.tsx`, `ScribbleStep.tsx`, `DraftReviewStep.tsx`, `SurveyEditor.tsx`, `AudienceTargetingPanel.tsx`
Response flow: `OpenEndedAnswer.tsx`, `QuestionStepper.tsx`
Responses: `ExportResponsesButton.tsx`, `PayoutAllocator.tsx`
Settings: `PasswordChangeForm.tsx`, `RespondentProfileForm.tsx`
Pages: `settings/page.tsx`, `earnings/page.tsx`, `my-responses/page.tsx`, `ideas/page.tsx`, `ideas/[id]/page.tsx`, `ideas/[id]/brief/page.tsx`, `ideas/[id]/responses/page.tsx`
Auth: `login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `error.tsx`

### Stats
- 0 lint errors, 1 pre-existing warning. Build clean.

## 2026-04-01 — Question generation rewrite + runtime fixes

### Runtime Fixes
- **Env vars** (`src/lib/env.ts`): `clientEnv()` now explicitly references each `process.env.NEXT_PUBLIC_*` variable instead of passing bare `process.env` (empty on client)
- **Theme init** (`layout.tsx`): Moved inline script to `public/theme-init.js` loaded via `next/script` with `strategy="beforeInteractive"` — avoids React 19 console error about inline `<script>` tags
- **Hydration fixes** (`ThemeToggle.tsx`, `WeeklyDigestBanner.tsx`): Replaced `useState` lazy initializers (which returned different values on server vs client) with `useSyncExternalStore` pattern — server snapshot returns safe default, client snapshot reads real state

### Question Generation Rewrite (assumption-killing)
Complete rewrite of question generation philosophy from "qualitative customer discovery" to "assumption-killing":

**prompts.ts**: New RULES (disconfirmation-first, 20-second rule, MCQ preference, banned narrative patterns), new few-shot example (5/7 questions are MCQ with assumption-killing options), updated system prompt and `buildGeneratePrompt()`

**schemas.ts**: Added `questionType` ("open" | "multiple_choice") + `options` (string[]) to AI question output schema. Made `anchors` optional (not needed for MCQ). Increased openQuestions max from 4 to 6.

**route.ts + question/route.ts**: Map new MCQ fields from AI output to DraftQuestion. Updated fallback question pools.

**quality-pass.ts**: New penalty patterns (NARRATIVE_PATTERNS, BROAD_EXPLORATION_PATTERNS), new reward patterns (DISCONFIRMATION_KEYWORDS, FREQUENCY_KEYWORDS). Penalizes "walk me through" prompts, rewards MCQ with disconfirmation options. `scoreBehavioralCoverage()` rebalanced to weight frequency/disconfirmation signal.

**generate-campaign-fallback.ts**: All question templates rewritten — removed narrative prompts, replaced with concrete disconfirmation-oriented questions.

### Design Decision (Max)
Audience targeting quality is gated by respondent profile depth at signup. Extensive signup (location, interests, expertise, age, occupation) = better match scores = better question assignment in partial-response model. This is critical for the partial response redesign — with only 3-5 questions per respondent, bad matches waste 20-25% of a response.

### Stats
- 265 tests passing, 0 lint errors, build clean.

### What's next
- Partial response model + reciprocal gate (pending Max's answers to open questions in `memory/next-up.md`)
- Known gaps: matchSkew splits by quality not audience match, `Database` type not wired into clients

## 2026-04-02 — Partial response model + reciprocal gate

### Summary
Complete backend implementation of the partial response model and reciprocal gate system. 8 steps, all passing (289 tests, 0 lint errors, build clean).

### Design Decisions (Max)
- Reciprocal gate: free-tier only (paid tiers exempt)
- Questions per partial response: 3-5
- Show idea headline to reciprocal respondents, not the assumption
- Paid respondent economics: deferred pending analysis
- Paste detection: keep current screening, don't disable paste entirely
- Reciprocal response weighting: no downweighting — MCQ signal is equally valid rushed or not, and early campaigns only have reciprocal data

### What was built

**Step 1 — Migration `034_partial_responses.sql`**
- `responses.assigned_question_ids uuid[]` — which questions assigned to this respondent
- `responses.is_partial boolean` — partial vs full response flag
- `responses` status constraint fix — added `abandoned` (was missing, latent bug)
- `campaigns.reciprocal_gate_status` — `pending` | `cleared` | `exempt`
- `campaigns.reciprocal_responses_completed` — gate progress counter
- Two indexes for partial response + gate queue lookups
- **Not applied to remote DB yet** — migrations need to be run via Supabase SQL Editor before live testing

**Step 2 — Question assignment module (`question-assignment.ts`)**
- Pure function: given questions + coverage counts + respondent profile → 3-5 question IDs
- Optimizes for assumption coverage (under-served assumptions first), respondent match, category diversity
- Guarantees at least 1 open + 2 MCQ, spreads across assumptions
- 14 unit tests

**Step 3 — Wire assignment into `startResponse`**
- Campaigns with 6+ questions get partial assignment; fewer stay full-response
- Fetches respondent profile + per-assumption coverage counts
- Stores `assigned_question_ids` + `is_partial` on response row
- Returns assignment to client; `ResponseFlow` filters displayed questions

**Step 4 — Adapt `submitResponse` for partial responses**
- Only requires assigned questions answered (not all campaign questions)
- Time thresholds scale proportionally: `minTime × (assigned/total)` with 15s floor
- Paste screening unchanged

**Step 5 — Reciprocal gate (`reciprocal-gate.ts`)**
- Pure logic: `initialGateStatus(tier)`, `checkGate(status, count)`, `requiresGate(tier)`
- `RECIPROCAL_REQUIRED = 3` responses to clear gate
- `publishCampaign` sets gate status; free-tier unfunded → `pending_funding` until cleared
- `incrementReciprocalGate()` server action: increments counter, activates campaign when cleared
- 11 unit tests

**Step 6 — Reciprocal actions rewrite**
- New `fetchReciprocalAssignments()` uses question assignment module (not ad-hoc picking)
- Creates proper partial response rows per reciprocal campaign
- `saveReciprocalAnswer()` auto-submits when all assigned questions answered
- Legacy `fetchReciprocalQuestions()` kept as backward-compat wrapper

**Step 7 — Brief synthesis threshold tuning**
- Total response fallback: 3 → 2 (partial = more respondents, fewer questions each)
- Per-assumption INSUFFICIENT_DATA: 3 → 2 relevant responses
- AI prompt: added principle explaining partial responses and uneven evidence distribution
- Coverage strength: "strong" 5+/3cat → 4+/2cat, "moderate" 3+/2cat → 2+/1cat

**Step 8 — Mothball paid flows (`feature-flags.ts`)**
- Single flag module: `RESPONDENT_PAYOUTS`, `EARNINGS_PAGE`, `REPUTATION_TIERS`, `CASHOUT`, `CAMPAIGN_FUNDING`, `WEEKLY_DIGEST` — all `false`
- Sidebar: earnings link hidden
- RespondentStatsBar: tier badge + earnings hidden
- ResponseSection: PayoutAllocator hidden
- CampaignDetail + SubmissionConfirmation: reward messaging hidden
- Campaign page: reciprocal gate progress banner for pending campaigns; funding UI gated
- CreateIdeaFlow: handles `gatePending` redirect

### Blockers
- **Migrations (034, 035) not applied to remote DB** — must run via Supabase SQL Editor
- UI for reciprocal step in create flow not wired (ReciprocateStep exists but CreateIdeaFlow doesn't show it for gated campaigns yet — needs UI work)

### Stats
- 289 tests passing across 16 test files. Lint + build clean.

### What's next
- Apply migration 034 to remote DB
- Wire ReciprocateStep into CreateIdeaFlow for gated campaigns (UI task)
- End-to-end test with real campaign data
- Known gaps: matchSkew splits by quality not audience match, `Database` type not wired into clients

## 2026-04-02 — Economics rebalance + reciprocal gate during generation

### Summary
Three coupled changes: (1) reciprocal gate embedded into the generation loading screen, (2) Scale tier removed + Pro repriced, (3) full economics rebalance of free tier for retention.

### Reciprocal Gate During Generation (the big UX win)
**Problem**: Free-tier founders had to answer other founders' questions as a separate blocking step after publishing. Felt like a tollbooth.
**Solution**: Moved the gate INTO the AI generation loading screen. While the AI builds the campaign (~15s), free-tier founders answer 3 questions from another campaign. Paid-tier founders see the original trivia/skeleton UI unchanged.

**Files changed:**
- `GeneratingStep.tsx` — split into `PaidGeneratingView` (original) and `ReciprocalFlow` (new). Shows questions one-at-a-time with MCQ click-to-select or open-ended textarea. Progress dots, campaign context label, bottom status bar.
- `CreateIdeaFlow.tsx` — manages dual-readiness via refs (`aiReadyRef`, `reciprocalReadyRef`). Fires AI generation + `fetchReciprocalAssignments()` in parallel. `tryTransition()` only moves to review when both complete. Passes `gatePreCleared` to publish.
- `reciprocal-actions.ts` — added `getUserTier()` server action for client-side tier detection.
- `actions.ts` (publishCampaign) — accepts `{ gatePreCleared }` option. If true + free tier: gate = `cleared`, status = `active`, `expires_at` set immediately. No post-publish gate step needed.

**Key constant**: `RECIPROCAL_REQUIRED = 1` (down from 3). One campaign × 3 questions fits the generation window. 9 questions was a dropout risk.

### Plan Structure Changes
- **Scale tier removed entirely** — `PlanTier = "free" | "starter" | "pro"` (was 4 tiers)
- **Pro price: $49 → $39** — easier sell for student/young founder audience
- Removed from: `plans.ts`, `constants.ts`, `reach.ts`, `payment-actions.ts`, `PricingCalculator.tsx`, `PricingButtons.tsx`, `DraftReviewStep.tsx`, `Pricing.tsx` (grid 4→3 cols), `.env.example`, all tests
- Legacy "scale" subscriptions in DB fall back to "free" via `isValidTier()`
- Dead Scale-only features removed from plan config type: `hasAbTesting`, `hasDedicatedSupport`, `hasExport: "api"`, `hasInsightSummary: "trends"` — these were never built

### Inconsistencies Found and Fixed
- **Fee display**: UI showed 15%, actual `PLATFORM_FEE_RATE` is 20%. Fixed in DraftReviewStep (fee calc + explainer), PayoutAllocator, responses/page.tsx fallback
- **Payout explainer**: Referenced "60% base pool → 40% bonus pool" — V2 uses flat qualified model. Updated to "split equally among qualifying respondents"
- **How-it-works copy**: "craft 5-10 questions" → "5-10" (matches tier range)
- **Duplicate constant**: `PLATFORM_FEE_RATE` in both `defaults.ts` and `plans.ts`. Removed from defaults (unused there)
- **Dead constants**: `BONUS_POOL_RATIO`, `BONUS_MIN_SCORE` — removed
- **Dead function**: `bonusWeightV2()` (always returned 0) — removed with test

### Economics Rebalance (free tier = conversion funnel)
**Thesis**: The free tier is the entire conversion funnel. 3 questions × ~5 responses = 15 data points = thin Decision Brief = founders churn. Fix the first experience.

**Changes:**
1. `maxAiQuestions: 3 → 5` (free tier) — more assumption coverage, partial responses now meaningful (3 of 5, not 3 of 3)
2. `baselineReachUnits: 75 → 100` (free tier) — more eyeballs, ~6-7 responses instead of ~4.5
3. `SUBSIDY_BUDGET_PER_CAMPAIGN: $0.90 → $1.50` — the conversion moment, not a cost center
4. `SUBSIDY_TARGET_RESPONSES: 3 → 5` — enough for a meaningful brief ($0.30/response unchanged)
5. **Publish-time check fixed**: used `distributable × BASE_POOL_RATIO / target` (stale V1 formula). Now uses `distributable / target` matching V2 flat payout model.
6. **Dead V1 payout code removed**: `distributePayouts()`, `payoutWeight()`, `PayoutAllocation` type + 11 tests. Production uses `distributePayoutsV2()` exclusively.
7. `BASE_POOL_RATIO` removed from defaults (last reference was the stale check)

**Net effect at 1,000 users:**
- Free campaign data points: ~16 → ~25 (5q × ~5r + reciprocal)
- Monthly subsidy cost: $45 → $75 (+$30 for potentially 2-4 more Starter conversions)
- No changes to reputation, wall ranking, qualification, anti-spam

### What was NOT changed (and why)
- `TARGET_AVG_PAYOUT_QUICK = $0.45` — sets `target_responses`, which drives momentum score. Lower target = higher fill ratio = lower momentum = worse wall placement. Current value keeps funded campaigns visible. Self-corrected during analysis.
- `FREE_TIER_RESET_DAYS = 15` — don't reduce (floods demand). Fix the one campaign instead.
- 20% platform fee — standard, well-hidden in UX
- Qualification thresholds (score ≥ 30, time ≥ 45s, chars ≥ 50) — well calibrated
- Reputation system — stable, correctly gated, hysteresis prevents flapping
- Wall ranking weights — match at 50% is the right moat

### Stats
- 277 tests passing across 16 test files (down from 289: removed 11 dead V1 tests + 1 dead bonusWeight test). Lint + build clean.

### Blockers for next session
1. **Migrations (034, 035) not applied to remote DB** — must run in Supabase SQL Editor before live testing
2. **Cold-start problem**: reciprocal gate requires active campaigns in DB. Need seed campaigns for first-time testing.
3. **End-to-end test**: scribble → generate (+ reciprocal gate) → review → publish → wall → respond → brief. This is the critical path. Everything else is theory until this works.
4. **Brief quality validation**: does a 5-question, 7-response brief feel meaningfully better than 3×5? The thesis is structurally sound (more assumptions tested = better coverage) but needs real data.

### Known gaps (carried forward)
- matchSkew splits by quality not audience match (moderate fix)
- `Database` type not wired into clients
- Integration tests always skip
- `rewardsTopAnswers` / `bonusAvailable` / `top_only` reward type — V1 DB columns, harmless but dead. Larger refactor to remove.
- `PlanConfig` type still has `campaignsPerMonth: number | null` and `hasAbTesting`, `hasDedicatedSupport` — no tier uses these values. Cleanup possible but low priority.
