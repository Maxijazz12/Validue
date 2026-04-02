# Session Handoffs

## Prior context
Phase 1-3 complete. Phase 4 shipped.

## 2026-03-30 — Phase 2-4 marathon session

### Phase 2 (complete)
- Audience segmentation: `segment-disagreements.ts` — high-match vs low-match disagreement analysis

### Phase 3 (complete)
- Assumption specificity validation: 5th quality dimension in `quality-pass.ts`
- Better WTP probing: `bl-payment-3` (forward WTP), `bl-payment-4` (payment model), context-aware `recommendBaseline()`
- Forward price mismatch consistency gap detector
- Assumption auto-improvement: `/api/generate/assumption` route + star button in DraftReviewStep

### Phase 4 (complete) — Longitudinal Validation
- **Migration `029_longitudinal.sql`**: added `parent_campaign_id`, `round_number`, `brief_verdicts` to campaigns
- **`retestCampaign()` server action**: creates linked round 2+ campaign from completed campaign, strips/re-prefixes title, clones questions with assumption_index + anchors
- **Brief verdict persistence**: `persistVerdicts()` writes `{ recommendation, verdicts }` JSONB to campaign row on first AI synthesis (write-once, fire-and-forget)
- **Parent verdict fetching**: `synthesizeBrief()` queries parent's cached verdicts for round 2+ campaigns, passes to prompt builder
- **Prior round prompt context**: Claude sees previous verdicts and is instructed to reference changes (CHALLENGED→CONFIRMED = progress, CONFIRMED→REFUTED = reversal)
- **`RetestCampaignButton`**: blue "Retest" button on completed campaigns
- **Campaign page**: Round N badge, "Previous round" link when parent exists
- **Brief page**: "Changes from Round N-1" section with per-assumption verdict arrows (green for improvements, red for regressions, neutral for unchanged), recommendation change indicator, round number in methodology stats
- **`BriefResult`** extended with `roundNumber` and `parentVerdicts`

### Stats
- 240 tests passing across 13 test files. Lint + build clean.

## 2026-03-31 — Infrastructure + autonomous setup

### DB Schema Sync
- Migration 029 applied (longitudinal columns were already on remote)
- Migration history repaired: 001-029 all synced between local and remote
- **Migration 030 (`030_schema_repair.sql`)**: idempotent repair that applied missing DDL from migrations 016-028 to remote DB. Added ~30 columns, 3 tables (`campaign_reactions`, `notifications`, `reach_impressions`), constraints, indexes, triggers, RLS policies.
- **Generated `src/lib/supabase/database.types.ts`**: 837-line Supabase types file as schema reference. NOT wired into clients (would cause ~30 nullable type errors across 15+ files). Exists as documentation to prevent column name hallucination.

### Fixes
- Lazy-load `db.ts` in `detect-consistency-gaps.ts` (dynamic import) — fixed test crash when env vars missing
- Replaced `useEffect` setState with lazy initializers in `ThemeToggle` and `WeeklyDigestBanner` (lint fix)

### Post-Synthesis Grounding Check (new)
- **`grounding-check.ts`**: deterministic validation after every AI brief synthesis
  - Check 1: verdict direction consistent with supporting/contradicting counts
  - Check 2: every quote exists as substring in source evidence (catches hallucination)
  - Check 3: claimed response counts plausible vs actual evidence provided
- On failure: re-synthesize with grounding feedback injected into prompt
- If second attempt still fails: apply deterministic corrections (downgrade confidence, strip ungrounded quotes)
- Wired into `synthesize-brief.ts` between `callSynthesis()` and `persistVerdicts()`
- 21 tests in `grounding-check.test.ts`

### Evidence Pipeline Fixes (from adversarial debate)
- **Evidence cap diversity** (`assumption-evidence.ts`): reserve at least 1 slot for "negative" category evidence so disconfirming signal survives the 8-item cap
- **Segment content classification** (`segment-disagreements.ts`): `classifyEvidence()` now checks answer text for contradicting phrases (e.g. "would never", "not interested"), not just category metadata. Fixes bug where devastating negative feedback in a "behavior" question was counted as supporting.
- **Target responses clamp** (`payout-math.ts`): `defaultTargetResponses()` now clamped to `MAX_TARGET_RESPONSES`

### Autonomous Agent Setup
- Remote trigger `vldta-brief-test-suite` fired (Sonnet, `auto/brief-test-suite` branch) — check GitHub for results
- Remote trigger `vldta-weekly-strategy` created (Haiku, Mondays 9am Oslo) — writes `memory/next-up.md` with single opinionated recommendation + implementation spec
- Existing triggers: `vldta-daily-health` (daily 8:23am), `vldta-weekly-hygiene` (Mondays 9:17am)

### Stats
- 265 tests passing across 14 test files. Lint + build clean.
- All changes pushed to main: `2189f2c`

### What's next
- Check `auto/brief-test-suite` branch for agent results, merge if clean
- Check `memory/next-up.md` Monday morning for strategy memo
- Real campaign testing across all 4 phases — this is the blocker before Phase 5
- Known gaps: price signal matchSkew splits by quality not audience match (moderate fix), `Database` type not wired into clients, integration tests always skip

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
- **NOT YET APPLIED TO REMOTE DB** — Max needs to run SQL in Supabase dashboard

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
- **Migration 034 not applied to remote DB** — must be run via Supabase SQL Editor
- UI for reciprocal step in create flow not wired (ReciprocateStep exists but CreateIdeaFlow doesn't show it for gated campaigns yet — needs UI work)

### Stats
- 289 tests passing across 16 test files. Lint + build clean.

### What's next
- Apply migration 034 to remote DB
- Wire ReciprocateStep into CreateIdeaFlow for gated campaigns (UI task)
- End-to-end test with real campaign data
- Known gaps: matchSkew splits by quality not audience match, `Database` type not wired into clients
