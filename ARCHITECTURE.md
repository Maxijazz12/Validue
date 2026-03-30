# VLDTA Architecture Map

Compact reference. Scoped module inventories in `.claude/rules/arch-*.md` (load automatically when editing matching files).

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

**Use subagents for:** broad file discovery, option comparison, deep code review, implementing across 3+ files with no shared edits, leaf-node tasks (tests, lint, docs) that don't need main context.

**Use worktree agents for:** genuinely independent features touching zero shared files — new modules, pages, API routes, test suites.

**Stay inline for:** sequential edits where each depends on the previous, or when you need the full picture to make coherent changes.

**Do not parallelize when:** tasks edit the same files or shared dependencies, work is sequential, or you have to think hard about whether tasks will conflict (they will).

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
