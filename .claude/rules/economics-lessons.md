---
description: VLDTA economics patterns, dead ends, and thresholds — loads when editing economics core files
globs: ["src/lib/payout-math.ts", "src/lib/defaults.ts", "src/lib/plan-guard.ts", "src/lib/reach.ts", "src/lib/reputation.ts", "src/lib/reputation-config.ts", "src/lib/plans.ts", "src/lib/wall-ranking.ts"]
---

# Economics Lessons — VLDTA-Specific

## Dead Ends — Do Not Repeat

- **V1 power-law payouts failed.** Single-dimension scoring with threshold at 25 was unfair. V2 base+bonus with multi-criteria qualification replaced it. Do not regress.
- **Test notification buttons shipped to production.** Temp dev features must be cleaned up before merging.

## Proven Patterns — Reuse These

- **Base + Bonus payout model** (`payout-math.ts`): 60/40 base/bonus split, multi-criteria qualification (score 30+, answer 50+ chars, min time, not spam). This is the economic core — extend, don't replace.
- **Confidence shrinkage toward population mean**: Low-confidence AI scores dampened toward POPULATION_MEAN_SCORE (55). Never trust AI confidence at face value.
- **Remainder reconciliation in payouts**: After rounding, adjust top earner so sum === distributable exactly. Test with tolerance ($0.02), not exact equality.
- **Hysteresis on reputation tiers**: Demote at (threshold - 5), not threshold. EMA smoothing (alpha=0.3) + confidence ramp (10 responses) prevents wild swings.
- **Wall score equivalence band (2.0 points)**: Tied scores resolved by deterministic tiebreakers (creation time, ID).
- **Subsidy multi-layer guards** (`plan-guard.ts`): Account age + zero campaigns + completed profile + flag + monthly cap. Every incentive needs anti-gaming layers.
- **Campaign expiry (7 days) + stale response cleanup (1 hour)**: The cron at `/api/cron/expire-campaigns` handles both.

## Thresholds — Empirically Derived, Not Arbitrary

Constants in `defaults.ts` are calibrated for launch. Do not change without data. New thresholds go in `defaults.ts` with a comment explaining why.

Key values: QUALIFICATION_MIN_SCORE=30, BONUS_MIN_SCORE=50, MIN_OPEN_ANSWER_CHARS=50, MIN_RESPONSE_TIME=45s/90s, MIN_CASHOUT_BALANCE_CENTS=200, CAMPAIGN_EXPIRY_DAYS=7, STALE_RESPONSE_TIMEOUT_MS=3600000, MAX_DAILY_RESPONSES=12.
