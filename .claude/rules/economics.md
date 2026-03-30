---
description: Economics core — risk map, anti-regression rules, and invariant preservation for payouts, limits, reach, reputation, ranking, and plans
globs: ["src/lib/defaults.ts", "src/lib/payout-math.ts", "src/lib/plan-guard.ts", "src/lib/reach.ts", "src/lib/reputation.ts", "src/lib/reputation-config.ts", "src/lib/wall-ranking.ts", "src/lib/plans.ts"]
---

# Economics Core

Treat these files as high-coupling and sequential. Stay inline unless the change is clearly independent. Do not parallelize.

- `defaults.ts` — global thresholds and constants; small changes cascade widely
- `payout-math.ts` — payout logic; preserve fairness and sum invariants
- `plan-guard.ts` — plan limits and subsidy gating; anti-gaming critical
- `reach.ts` — reach budgeting and campaign strength mechanics
- `reputation.ts` / `reputation-config.ts` — trust stability and tier boundaries
- `wall-ranking.ts` — feed quality, fairness, and ordering logic
- `plans.ts` — subscription assumptions, fee logic, and plan configuration

## Before Changing

1. Understand downstream effects
2. Preserve existing invariants
3. Prefer tested extensions over rewrites
4. Escalate only for structural or policy changes, not routine edits

## Do Not Regress

- Do not return to old payout shapes that felt unfair in practice
- Do not weaken anti-gaming checks around incentives, qualification, or subsidy access
- Do not ship temporary economics/debug behavior into production

## Principles

- Extend the current payout model carefully; do not casually replace it
- Low-confidence AI judgments should be constrained, not trusted raw
- Money math must reconcile cleanly after rounding
- Reputation and ranking should be stable, not twitchy
- Incentives must include layered abuse resistance
- Expiry and cleanup rules are part of product integrity

## Threshold Changes

Constants in `defaults.ts` are calibrated for launch. Change them only from evidence, in source code, with comments and tests.
