# Session Handoffs

## Prior sessions (summarized)
- 2026-03-30: Phase 2-4 marathon (audience segmentation, WTP probing, longitudinal validation)
- 2026-03-31: Infrastructure + grounding check + evidence pipeline fixes
- 2026-04-01: UX/UI consistency sweep (~40 files) + question generation rewrite (assumption-killing)
- 2026-04-02 (morning): Partial response model + reciprocal gate backend (migration 034, question assignment, gate logic)
- 2026-04-02 (afternoon): Economics rebalance, Scale tier removal, reciprocal gate during generation
- 2026-04-02 (evening): System critique + fixes + e2e prep (scribble→generate→gate tested)

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
