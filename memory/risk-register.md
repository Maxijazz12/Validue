# Valdate Risk Register

Last updated: 2026-04-04

This is the deduplicated audit register after repeated Codex/Claude review passes.
It groups issues by root cause instead of tracking every symptom as a separate fire.

## Severity rubric

- `critical`: exploitable security issue, real money loss, irreversible data loss, or broad production outage with a clear trigger
- `high`: realistic production bug or control gap affecting auth, money, core state, or trust
- `medium`: correctness or operability issue with meaningful user impact, but narrower blast radius
- `low`: consistency, UX drift, or maintainability issue with limited immediate risk

## Snapshot

| Root cause | Severity | Status | Notes |
| --- | --- | --- | --- |
| Auth/profile role drift | medium | fixed | `profiles.role` is now consistently framed as primary mode, while respondent capability stays signal/activity-based |
| Environment/config coupling | medium | fixed | DB/Supabase imports no longer require unrelated Stripe env |
| Non-durable throttling on sensitive paths | high | fixed | state-changing paths now use DB-backed limiter; read-only endpoints remain on in-memory limiter by design |
| Response lifecycle accounting drift | medium | partially fixed | submission-time cap and assignment coverage fixed; more lifecycle complexity remains |
| Copy/clone flow drift | medium | fixed | publish/save/update/clone/retest/edit now share persistence builders and regression coverage |
| Feature-flag drift | low | fixed | respondent-facing payout/cashout nav, copy, and activity surfaces now match disabled payout flags |
| Availability/reach mismatch | low | partially fixed | suggested campaigns now filter exhausted reach; more recommendation/feed drift possible over time |

## Captured in commits

- `a196bb6` `Fix role drift and draft persistence`
- `c3c62b5` `Refine signup mode messaging`

## Fixed findings

### 1. OAuth signup role-loss

- `Severity`: high
- `Status`: fixed
- `What was wrong`: Google signup ignored the selected `respondent` role and defaulted new profiles to `founder`.
- `Why it mattered`: respondent-only payout/cashout flows were blocked for affected users.
- `Fixed in`:
  - `src/app/auth/signup/SignupPageClient.tsx`
  - `src/app/auth/callback/route.ts`
  - `src/lib/auth-redirect.ts`
  - `src/lib/__tests__/auth-redirect.test.ts`

### 2. Global env validation coupling

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: importing DB or Supabase helpers could fail if unrelated Stripe/Anthropic env vars were absent.
- `Why it mattered`: increased fragility, awkward test setup, and unrelated runtime failures.
- `Fixed in`:
  - `src/lib/env.ts`
  - `src/lib/db.ts`
  - `src/lib/supabase/server.ts`
  - `src/proxy.ts`
  - Stripe/cron/plan/AI call sites

### 3. Daily response cap used response creation time instead of completion time

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: users could start responses earlier and submit later without the cap reflecting actual completed responses in the last 24 hours.
- `Fixed in`:
  - `src/app/dashboard/the-wall/[id]/actions.ts`

### 4. Partial assignment coverage counted in-progress answers

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: unfinished work distorted assumption coverage and could suppress assignment to assumptions that still lacked real evidence.
- `Fixed in`:
  - `src/app/dashboard/the-wall/[id]/actions.ts`

### 5. High-value mutations used single-process rate limiting

- `Severity`: high
- `Status`: fixed
- `What was wrong`: payout allocation, account deletion, ranking, export, and disputes relied on an in-memory limiter that disappears across restarts/instances.
- `Why it mattered`: weak abuse protection in serverless or horizontally scaled deployments.
- `Fixed in`:
  - `src/app/dashboard/ideas/[id]/responses/payout-actions.ts`
  - `src/app/dashboard/settings/account-actions.ts`
  - `src/app/dashboard/ideas/[id]/responses/actions.ts`
  - `src/app/api/export/responses/route.ts`
  - `src/app/dashboard/earnings/dispute-actions.ts`
  - `src/app/dashboard/the-wall/[id]/actions.ts`
  - `src/app/dashboard/ideas/[id]/campaign-actions.ts`
  - `src/app/dashboard/settings/actions.ts`
  - `src/app/dashboard/ideas/new/actions.ts`
  - `src/app/dashboard/ideas/new/reciprocal-actions.ts`
  - `src/app/dashboard/the-wall/[id]/reaction-actions.ts`
  - `src/app/api/reach-impression/route.ts`

### 6. Cashout mothballing drift

- `Severity`: low
- `Status`: fixed
- `What was wrong`: cashout UI and server actions remained live even though the cashout feature flag was off.
- `Fixed in`:
  - `src/app/dashboard/earnings/page.tsx`
  - `src/app/dashboard/earnings/cashout-actions.ts`

### 7. Partial-assignment first-response edge case

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: the assignment flow could perform an `.in(...)` query with an empty prior-response list.
- `Why it mattered`: fragile first-response behavior on larger campaigns.
- `Fixed in`:
  - `src/app/dashboard/the-wall/[id]/actions.ts`

### 8. Clone flow dropped question metadata

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: campaign clones lost `assumption_index` and `anchors`, changing downstream ranking/brief behavior.
- `Fixed in`:
  - `src/app/dashboard/ideas/[id]/campaign-actions.ts`

### 9. Suggested campaigns ignored reach exhaustion

- `Severity`: low
- `Status`: fixed
- `What was wrong`: post-response suggestions could include campaigns that were effectively closed due to exhausted reach.
- `Fixed in`:
  - `src/app/dashboard/the-wall/[id]/page.tsx`

### 10. Runtime role handling was inconsistent across founder/respondent surfaces

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: some runtime paths treated `profile.role` like a hard authorization boundary while others treated it like onboarding intent.
- `What improved`:
  - wall profile gating now follows respondent signals instead of a single string check
  - payout setup/cashout now key off respondent activity capability rather than only `role = respondent`
  - notification settings no longer hide options based on one primary role value
  - subsidy eligibility no longer requires `role = founder`
  - signup and OAuth helpers now describe `profiles.role` as a primary mode choice instead of a hard persona
  - admin diagnostics distinguish respondent-first accounts from broader respondent-capable accounts
  - admin lookup and static privacy copy now expose the field as primary mode instead of a categorical role bucket
- `Fixed in`:
  - `src/lib/profile-role.ts`
  - `src/lib/auth-redirect.ts`
  - `src/app/auth/callback/route.ts`
  - `src/app/auth/signup/SignupPageClient.tsx`
  - `src/app/dashboard/the-wall/load-wall-page-data.ts`
  - `src/app/dashboard/the-wall/page.tsx`
  - `src/app/dashboard/settings/page.tsx`
  - `src/app/dashboard/earnings/cashout-actions.ts`
  - `src/app/api/admin/diagnostics/route.ts`
  - `src/app/admin/page.tsx`
  - `src/app/privacy/page.tsx`
  - `src/lib/plan-guard.ts`
  - `src/components/dashboard/settings/NotificationPreferences.tsx`
  - `src/components/dashboard/WallOnboarding.tsx`
  - `src/lib/__tests__/profile-role.test.ts`
  - `src/lib/__tests__/auth-redirect.test.ts`

### 11. Draft/copy persistence drift across publish, save, edit, clone, and retest flows

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: campaign and question persistence lived in several hand-maintained mappings, so new schema fields could silently diverge by path.
- `Why it mattered`: clones, retests, saved drafts, and edited drafts could preserve different field sets and quietly change downstream behavior.
- `Fixed in`:
  - `src/lib/campaign-draft-persistence.ts`
  - `src/app/dashboard/ideas/new/actions.ts`
  - `src/app/dashboard/ideas/[id]/campaign-actions.ts`
  - `src/app/dashboard/ideas/[id]/edit/page.tsx`
  - `src/lib/__tests__/campaign-draft-persistence.test.ts`

### 12. Respondent payout-disabled UX still advertised active monetization

- `Severity`: low
- `Status`: fixed
- `What was wrong`: several respondent-facing surfaces still implied an active payout loop while `RESPONDENT_PAYOUTS` and `CASHOUT` were disabled.
- `What improved`:
  - earnings/activity labeling now reflects the disabled payout mode
  - wall cards and respondent campaign detail no longer advertise active cash on disabled paths
  - onboarding, nav, command palette, and submission confirmation copy now align with feedback-only mode
  - historical payout records remain intentionally visible instead of being hidden
- `Fixed in`:
  - `src/app/auth/signup/SignupPageClient.tsx`
  - `src/lib/feature-flags.ts`
  - `src/app/dashboard/earnings/page.tsx`
  - `src/app/dashboard/my-responses/page.tsx`
  - `src/components/dashboard/Sidebar.tsx`
  - `src/components/dashboard/MobileTabBar.tsx`
  - `src/components/dashboard/CommandPalette.tsx`
  - `src/components/dashboard/WallCardUnified.tsx`
  - `src/components/dashboard/WallFeed.tsx`
  - `src/components/dashboard/WallOnboarding.tsx`
  - `src/components/dashboard/respond/CampaignDetail.tsx`
  - `src/components/dashboard/respond/SubmissionConfirmation.tsx`
  - `src/components/dashboard/RespondentProfileForm.tsx`

### 13. Admin role reporting drifted from runtime capability rules

- `Severity`: medium
- `Status`: fixed
- `What was wrong`: admin lookup and diagnostics still treated `profiles.role` like a hard user bucket even after runtime gating moved to primary-mode plus respondent-signal checks.
- `Why it mattered`: support/debugging views could misclassify multi-mode accounts and hide the real reason an account could access respondent features.
- `Fixed in`:
  - `src/lib/profile-role.ts`
  - `src/app/api/admin/users/route.ts`
  - `src/app/admin/page.tsx`
  - `src/app/api/admin/diagnostics/route.ts`

### 14. Wall streak accounting still used response start time

- `Severity`: low
- `Status`: fixed
- `What was wrong`: the wall streak counter still grouped activity by `responses.created_at`, even though response-limit enforcement had already moved to completion-time accounting.
- `Why it mattered`: a response started before midnight and submitted after midnight could count toward a different day depending on which surface you looked at.
- `Fixed in`:
  - `src/lib/response-activity.ts`
  - `src/app/dashboard/the-wall/load-wall-page-data.ts`
  - `src/lib/__tests__/response-activity.test.ts`

## Open risks

- No active role-model issues remain. Deferred monitoring items stay below.

## Deferred / monitor

### D. Feed and suggestion relevance drift

- `Severity`: low
- `Status`: deferred
- `What it is`: the wall/suggestion system has several heuristics that may still drift from real availability or quality over time.
- `Why deferred`: this is more product tuning than a concrete correctness bug now that the reach-exhaustion case is fixed.

## Next best actions

1. Monitor feed/suggestion relevance drift as availability heuristics evolve.
2. If payout positioning changes again, audit legal/static/admin copy outside the live respondent UX.
