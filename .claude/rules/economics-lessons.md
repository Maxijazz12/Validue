---
description: VLDTA economics lessons — keep fairness, anti-gaming, and invariant preservation when editing economics core files
globs: ["src/lib/payout-math.ts", "src/lib/defaults.ts", "src/lib/plan-guard.ts", "src/lib/reach.ts", "src/lib/reputation.ts", "src/lib/reputation-config.ts", "src/lib/plans.ts", "src/lib/wall-ranking.ts"]
---

# Economics Lessons

## Do Not Regress

- Do not return to old payout shapes that felt unfair in practice
- Do not weaken anti-gaming checks around incentives, qualification, or subsidy access
- Do not ship temporary economics/debug behavior into production

## Preserve These Principles

- Extend the current payout model carefully; do not casually replace it
- Low-confidence AI judgments should be constrained, not trusted raw
- Money math must reconcile cleanly after rounding
- Reputation and ranking should be stable, not twitchy
- Incentives must include layered abuse resistance
- Expiry and cleanup rules are part of product integrity

## Threshold Changes

Constants in `defaults.ts` are calibrated for launch. Change them only from evidence, in source code, with comments and tests.
