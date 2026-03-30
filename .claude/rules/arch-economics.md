---
description: Economics core risk map — high-coupling files for payouts, limits, reach, reputation, ranking, and plans
globs: ["src/lib/defaults.ts", "src/lib/payout-math.ts", "src/lib/plan-guard.ts", "src/lib/reach.ts", "src/lib/reputation.ts", "src/lib/reputation-config.ts", "src/lib/wall-ranking.ts", "src/lib/plans.ts"]
---

# Economics Core

Treat these files as high-coupling and sequential. Stay inline unless the change is clearly independent. Do not parallelize.

- `defaults.ts` — global thresholds and constants; small changes cascade widely
- `payout-math.ts` — payout logic; preserve fairness and sum invariants
- `plan-guard.ts` — plan limits and subsidy gating; anti-gaming critical
- `reach.ts` — reach budgeting and campaign strength mechanics
- `reputation.ts` — reputation updates and trust stability
- `reputation-config.ts` — tier boundaries and demotion/promotion behavior
- `wall-ranking.ts` — feed quality, fairness, and ordering logic
- `plans.ts` — subscription assumptions, fee logic, and plan configuration

Before changing these files:
1. Understand downstream effects
2. Preserve existing invariants
3. Prefer tested extensions over rewrites
4. Escalate only for structural or policy changes, not routine edits
