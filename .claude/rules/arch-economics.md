---
description: Economics core module map — thresholds, payouts, reputation, ranking
globs: ["src/lib/defaults.ts", "src/lib/payout-math.ts", "src/lib/plan-guard.ts", "src/lib/reach.ts", "src/lib/reputation.ts", "src/lib/reputation-config.ts", "src/lib/wall-ranking.ts", "src/lib/plans.ts"]
---

## Economics Core (NEVER parallelize — sequential only)

- `defaults.ts` — All thresholds (140+ constants). Imported by 40+ files. **CRITICAL.**
- `payout-math.ts` — Pure payout distribution (V1 power-law, V2 base+bonus, subsidy). Testable, no DB.
- `plan-guard.ts` — Subscription limits, campaign allowance, 7-layer subsidy eligibility.
- `reach.ts` — Reach budgeting, quality modifiers, campaign strength, funding presets.
- `reputation.ts` — Reputation calculation + tier management (EMA smoothing).
- `reputation-config.ts` — Tier thresholds (new/bronze/silver/gold/platinum), hysteresis buffer (5pt).
- `wall-ranking.ts` — Wall feed composite score (match 50% + reward 15% + quality 10% + freshness 12% + momentum 13%).
- `plans.ts` — Subscription tier config, PLATFORM_FEE_RATE (0.15), STRENGTH_THRESHOLDS.
