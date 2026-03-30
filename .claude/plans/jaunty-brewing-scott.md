# V2 Defaults, Bounds & Defensive Layer Specification

## Context
The V2 candidate system has correct formulas but needs a formalized defensive layer — precise rules for defaults, bounds, clamping, rounding, sparse-data behavior, and missing-data handling. This spec stops silent distortions.

---

## 1. Defaults and Bounds by System

### Quality Score
| Property | Value |
|---|---|
| Neutral default | 50 (produces 1.0x modifier) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Yes — `Math.max(0, Math.min(100, score))` |
| Round | Yes — integer |
| Surfaced | Yes — shown to campaign creator as quality meter |

### Quality Modifier
| Property | Value |
|---|---|
| Neutral default | 1.0 (when qualityScore = 50) |
| Minimum | 0.7 |
| Maximum | 1.3 |
| Clamp | Implicit — input clamped [0,100] produces output [0.7,1.3] |
| Round | No — keep full precision for reach multiplication |
| Surfaced | No — internal multiplier. Users see quality score, not modifier |

### Effective Reach (RU)
| Property | Value |
|---|---|
| Neutral default | plan.baselineReachUnits (tier-dependent) |
| Minimum | 0 |
| Maximum | Unbounded (diminishing returns provide soft ceiling) |
| Clamp | Floor at 0 via `Math.max(0, fundingAmount)` |
| Round | Yes — `Math.round()` on final value |
| Surfaced | Yes — shown as reach estimate |

### Campaign Strength
| Property | Value |
|---|---|
| Neutral default | 1 (minimum strength) |
| Minimum | 1 |
| Maximum | 10 |
| Clamp | Yes — `Math.min(i + 1, 10)`, floor at 1 |
| Round | N/A — discrete integer from threshold lookup |
| Surfaced | Yes — shown as strength meter (1–10) |

### Conversion Rate
| Property | Value |
|---|---|
| Neutral default | 0.06 (6% base) |
| Minimum | 0.06 |
| Maximum | ~0.20 (0.06 + 0.14 asymptote) |
| Clamp | Implicit — exponential saturation can't exceed asymptote |
| Round | No — keep full precision for response estimation |
| Surfaced | No — internal. Users see estimated response range |

### Estimated Responses
| Property | Value |
|---|---|
| Neutral default | 1 (minimum) |
| Minimum | 1 (`Math.max(1, ...)`) |
| Maximum | Unbounded |
| Clamp | Floor at 1 |
| Round | Low: `Math.floor()`, High: `Math.ceil()` |
| Surfaced | Yes — shown as "X–Y estimated responses" range |

### Match Score
| Property | Value |
|---|---|
| Neutral default | 40 (incomplete profile) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Yes — `Math.min(100, Math.round(score))` |
| Round | Yes — integer |
| Surfaced | No — internal ranking signal. Users see campaign order, not score |

### Reward Score
| Property | Value |
|---|---|
| Neutral default | 0 (unfunded campaign) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Yes — `Math.min(100, ...)` |
| Round | Yes — `Math.round()` |
| Surfaced | No — internal. Users see reward amount in dollars |

### Freshness Score
| Property | Value |
|---|---|
| Neutral default | 100 (brand new campaign) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Floor at 0 via `Math.max(0, ...)` |
| Round | Yes — `Math.round()` |
| Surfaced | No — internal ranking signal |

### Momentum Score
| Property | Value |
|---|---|
| Neutral default | 50 (when target_responses missing) |
| Minimum | 20 |
| Maximum | 80 |
| Clamp | Implicit — sigmoid output scaled to [20, 80] |
| Round | Yes — `Math.round()` |
| Surfaced | No — internal. Users see response count / target |

### Wall Score (Composite)
| Property | Value |
|---|---|
| Neutral default | N/A — always computed |
| Minimum | 0 (theoretical) |
| Maximum | 100 (theoretical) |
| Clamp | No — component clamping prevents out-of-range |
| Round | Yes — 2 decimal places `Math.round(x * 100) / 100` |
| Surfaced | No — internal. Users see campaign ranking order |

### Answer Score (Response Quality)
| Property | Value |
|---|---|
| Neutral default | 55 (population mean, used as shrinkage target) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Yes — `Math.min(Math.max(rawScore, 0), 100)` before shrinkage |
| Round | Yes — `Math.round()` after shrinkage |
| Surfaced | Yes — shown to campaign creator per response |

### AI Confidence
| Property | Value |
|---|---|
| Neutral default | 0.7 (schema default) |
| Minimum | 0.3 (DEFAULTS.MIN_AI_CONFIDENCE) |
| Maximum | 1.0 |
| Clamp | Yes — `Math.max(0.3, Math.min(1.0, confidence))` |
| Round | No — keep full precision |
| Surfaced | No — internal. Users see final adjusted score |

### Payout Weight
| Property | Value |
|---|---|
| Neutral default | 0 (scores ≤ 25 get zero weight) |
| Minimum | 0 |
| Maximum | Unbounded (but practical max is 75^1.5 ≈ 650) |
| Clamp | Floor at 0 via `Math.max(score - 25, 0)` |
| Round | Amounts rounded to cents: `Math.round(x * 100) / 100` |
| Surfaced | Partially — users see suggested dollar amounts, not weights |

### Reputation Score
| Property | Value |
|---|---|
| Neutral default | 0 (below gate threshold) |
| Minimum | 0 |
| Maximum | 100 |
| Clamp | Yes — `Math.min(Math.max(raw, 0), 100)` |
| Round | Yes — 2 decimal places |
| Surfaced | Yes — shown as tier badge + score |

### Platform Fee Rate
| Property | Value |
|---|---|
| Value | 0.15 (15%) |
| Applied | Exactly once at funding time |
| Surfaced | Yes — shown during funding step |

### Minimum Payout
| Property | Value |
|---|---|
| Value | $0.50 |
| Applied | Sub-minimum amounts redistributed proportionally |
| Surfaced | Indirectly — respondents below threshold silently excluded from payout |

---

## 2. Fallback Rules

### No quality score present
- **When:** `campaign.quality_score` is `null` (campaign hasn't been scored yet or quality pass failed)
- **Fallback:** Use `DEFAULTS.QUALITY_SCORE` (50)
- **Effect:** Quality modifier = 1.0x (neutral). Campaign gets no boost or penalty
- **Current code:** `campaign.quality_score ?? DEFAULTS.QUALITY_SCORE` — correct
- **Rationale:** 50 is the neutral point by design. Unscored campaigns shouldn't be advantaged or punished

### Missing AI score (AI unavailable or errored)
- **When:** AI scoring call fails or AI is not configured
- **Fallback:** Run `scoreResponseFallback()` — deterministic heuristic scoring
- **Effect:** Heuristic scores use fixed confidence of 0.5, which pulls scores toward population mean (55)
- **Current code:** try/catch in `scoreResponse()` falls back correctly
- **Rationale:** Fallback confidence of 0.5 means heuristic scores cluster in 40–70 range. This is intentionally conservative — uncertain scores shouldn't produce outliers

### AI score with low confidence
- **When:** AI returns confidence < 0.3
- **Fallback:** Clamp confidence to 0.3 floor
- **Effect:** At 0.3 confidence, a raw score of X becomes `X × 0.3 + 55 × 0.7`. A perfect 100 becomes 68.5. A terrible 0 becomes 38.5
- **Current code:** `Math.max(DEFAULTS.MIN_AI_CONFIDENCE, Math.min(1.0, confidence))` — correct
- **FIX NEEDED:** If `rawData.confidence` is `undefined` or `NaN`, the clamp produces `NaN`. Add: `const rawConf = Number(rawData.confidence); const safeConf = isNaN(rawConf) ? DEFAULTS.FALLBACK_CONFIDENCE : rawConf;`

### Zero or tiny funding
- **When:** `fundingAmount === 0` or `fundingAmount < plan.minFundingAmount`
- **Fallback:** $0 is always valid (baseline-only campaign). Amounts between $0 and min are rejected at validation
- **Effect:** No funded RU. Conversion rate = base 6% only (no payout bonus). Response estimates based on baseline reach only
- **Current code:** `validateFunding()` handles this correctly
- **Rationale:** $0 campaigns are legitimate (free tier). The gap between $0 and min prevents micro-funding that wastes slot space

### No estimated responses available
- **When:** `estimated_responses_low` is null in database
- **Fallback:** Default to 1
- **Current code in the-wall/page.tsx:** `c.estimated_responses_low ?? 1` — correct
- **Rationale:** 1 is the safe floor. This field should always be computed at campaign creation, so null means data corruption

### Target responses missing or zero
- **When:** `target_responses` is null or 0
- **Fallback:** Momentum score = 50 (neutral)
- **Current code:** `if (targetResponses <= 0) return DEFAULTS.MOMENTUM_NO_TARGET` — correct
- **FIX NEEDED in the-wall/page.tsx:** Hardcoded `?? 50` should use `DEFAULTS.MOMENTUM_NO_TARGET` for consistency. Currently: `target_responses: c.target_responses ?? 50`
- **Rationale:** Without a target, momentum can't measure fill progress. Neutral 50 means momentum neither helps nor hurts

### Too few responses for reputation
- **When:** `totalCompleted < DEFAULTS.REPUTATION_MIN_RESPONSES` (3)
- **Fallback:** Score = 0, tier = "new"
- **Current code:** Gate check in `calculateReputation()` — correct
- **Rationale:** With < 3 data points, any reputation score would be noise. Zero + "new" tier is honest

### Reputation too immature for wall influence
- **When:** `completedResponses < DEFAULTS.REPUTATION_WALL_MIN_RESPONSES` (5)
- **Fallback:** Reputation boost = 0 (no wall ranking influence)
- **Current code:** Guard in `computeMatchScore()` — correct
- **Rationale:** 5-response minimum prevents gaming. A respondent must demonstrate sustained quality before earning ranking advantages

---

## 3. Sparse-Data Rules

### Incomplete respondent profile
- **When:** `profile.profile_completed === false`
- **Behavior:** Entire match score bypassed. Use `DEFAULTS.MATCH_SCORE_INCOMPLETE` (40)
- **Effect:** 40/100 match score — slightly pessimistic. Campaigns still shown, but ranked lower than matched profiles
- **Current code:** `profile.profile_completed ? computeMatchScore(...) : DEFAULTS.MATCH_SCORE_INCOMPLETE` — correct
- **Rationale:** 40 (not 0, not 50) because incomplete profiles can't demonstrate relevance but shouldn't be invisible

### Completed-but-empty profile
- **When:** Profile exists and is marked complete, but interests/expertise/age are all empty arrays/null
- **Behavior:** Each empty dimension scored at 40% of its max weight (MATCH_SCORE_UNKNOWN_DIM = 0.4)
- **Effect:** interests empty → 16/40 pts, expertise empty → 12/30 pts, age empty → 6/15 pts. Total from empty dims = 34/85 pts
- **Current code:** Symmetric empty checks per dimension — correct
- **Rationale:** 40% is below neutral (50%) but above zero. A profile that filled out nothing signals "might match" not "definitely doesn't match"

### Missing campaign targeting
- **When:** Campaign has empty `target_interests`, `target_expertise`, or `target_age_ranges`
- **Behavior:** Same symmetric rule — empty campaign dimension scores at 40% of max
- **Effect:** A campaign targeting nobody gets the same treatment as a respondent matching nobody — mild pessimism, not zero
- **Current code:** Same `unknownFraction` check on both sides — correct
- **Rationale:** Symmetric handling prevents the asymmetry where "targeting everyone" accidentally scores better than "targeting a specific group"

### All ranked responses have null quality scores
- **When:** Every response in a campaign has `quality_score = null`
- **Behavior:** Average quality = 0 (all nulls coerce to 0 via `Number(null) || 0`)
- **Current code:** `ranked.reduce((s, r) => s + (Number(r.quality_score) || 0), 0) / ranked.length`
- **FIX NEEDED:** This is indistinguishable from "all scores are genuinely 0." Should track whether ANY scores are non-null. If all null → don't calculate reputation yet (treat as insufficient data)

### Too little signal for dynamic adjustments
- **When:** < 3 responses scored, or all scores are fallback-sourced
- **Behavior:** No dynamic adjustment possible. Use static defaults
- **Rationale:** Dynamic adjustments (like adjusting quality thresholds based on response distribution) require sample size. Until sample exists, static defaults are safer than estimates

---

## 4. Missing-Data Rules (NaN / Type Safety)

### Number() coercion producing NaN
- **Affected files:** payout-actions.ts, reputation.ts, the-wall/page.tsx, responses/page.tsx
- **Current pattern:** `Number(x) || 0`
- **Problem:** `Number(undefined)` = NaN, `Number("invalid")` = NaN. `NaN || 0` = `NaN` (NaN is not falsy in `||`)
- **FIX NEEDED:** Replace all `Number(x) || 0` with safe coercion:
  ```typescript
  function safeNumber(x: unknown, fallback = 0): number {
    const n = Number(x);
    return isNaN(n) ? fallback : n;
  }
  ```
- **Locations to fix:**
  - `payout-actions.ts:35` — `Number(campaign.distributable_amount) || 0`
  - `payout-actions.ts:52` — `Number(r.quality_score) || 0`
  - `reputation.ts:32` — `Number(r.quality_score) || 0`
  - `reputation.ts:72` — `Number(p.amount) || 0`

### Confidence undefined/NaN propagation
- **File:** rank-responses.ts:141-144
- **Current code:** `Math.max(0.3, Math.min(1.0, rawData.confidence))`
- **Problem:** If `rawData.confidence` is undefined → `Math.min(1.0, undefined)` = NaN → `Math.max(0.3, NaN)` = NaN
- **FIX NEEDED:** Guard before clamp: `const rawConf = typeof rawData.confidence === 'number' && !isNaN(rawData.confidence) ? rawData.confidence : 0.7;`

### Distributable amount chain fallback
- **File:** responses/page.tsx:204
- **Current:** `Number(campaign.distributable_amount) || Number(campaign.reward_amount) * 0.85`
- **Problem:** If both are null → `NaN || NaN * 0.85` = NaN
- **FIX NEEDED:** Use `safeNumber()` and explicit zero check

### Reach units hardcoded fallback
- **File:** the-wall/page.tsx:59
- **Current:** `c.effective_reach_units ?? c.total_reach_units ?? 75`
- **Problem:** Hardcoded 75 doesn't match non-free tier baselines
- **FIX NEEDED:** Use `PLAN_CONFIG[tier].baselineReachUnits` as final fallback, or `DEFAULTS` constant

---

## 5. User-Facing vs Internal-Only Values

### Surfaced to campaign creators
| Value | How shown | Notes |
|---|---|---|
| Quality score (0–100) | Quality meter during draft review | Full score visible |
| Quality dimension scores | Breakdown under meter | Individual dimension scores |
| Campaign strength (1–10) | Strength meter during funding | Integer label |
| Estimated responses | "X–Y responses" range | ±40% range, never shows 0 |
| Effective reach | Reach estimate number | After quality modifier |
| Reward amount | Dollar amount | Raw input |
| Platform fee | "15% platform fee" | Shown during funding |
| Fill speed estimate | "~1–2 weeks" text | Rough bucket label |
| Response quality scores | Per-response score (0–100) | After confidence shrinkage |
| Payout suggestions | Dollar amounts per respondent | After weighting |

### Surfaced to respondents
| Value | How shown | Notes |
|---|---|---|
| Reputation tier | Badge (Bronze/Silver/Gold/Platinum) | Tier label only |
| Reputation score | Numeric score on profile | 0–100 |
| Payout received | Dollar amount | After allocation |
| Campaign reward | "Up to $X reward" | Total pool, not per-response |

### Internal only — never shown to users
| Value | Why hidden |
|---|---|
| Quality modifier (0.7–1.3) | Confusing multiplier. Users see quality score instead |
| Match score (0–100) | Would reveal ranking algorithm. Users see campaign order |
| Reward score (0–100) | Log-transformed internal signal. Users see dollar amount |
| Freshness score (0–100) | Would incentivize gaming post timing |
| Momentum score (20–80) | Would reveal fill urgency to respondents |
| Wall score (composite) | Full ranking signal — exposing enables gaming |
| Conversion rate (0.06–0.20) | Internal estimation. Users see response range |
| Payout weights | Would reveal scoring-to-money formula |
| Confidence values | AI internals. Users see final score |
| Reputation boost (0–5 pts) | Would reveal ranking advantage mechanics |

### Surfaced indirectly
| Value | Indirect signal |
|---|---|
| Funding diminishing returns | Presets show strength-per-dollar slowing down |
| Quality impact on reach | Warnings: "quality is limiting reach" |
| Minimum payout threshold | Respondents below $0.50 silently excluded |
| Match priority (tier-based) | Higher tiers described as "priority matching" |

---

## 6. Implementation Changes Required

### Add `safeNumber` utility to defaults.ts
```typescript
export function safeNumber(x: unknown, fallback = 0): number {
  const n = Number(x);
  return isNaN(n) ? fallback : n;
}
```

### Fix NaN-vulnerable coercions
1. **payout-actions.ts:35** — `safeNumber(campaign.distributable_amount)`
2. **payout-actions.ts:52** — `safeNumber(r.quality_score)`
3. **rank-responses.ts:141** — guard confidence before clamp
4. **reputation.ts:32** — `safeNumber(r.quality_score)`
5. **reputation.ts:72** — `safeNumber(p.amount)`

### Fix hardcoded fallbacks
6. **the-wall/page.tsx:70** — replace `?? 50` with `?? DEFAULTS.MOMENTUM_NO_TARGET`
7. **the-wall/page.tsx:59** — replace `?? 75` with tier-aware baseline fallback

### Fix all-null quality score in reputation
8. **reputation.ts** — track if any quality scores are non-null; if all null, treat as insufficient data (return score=0, tier="new")

### Fix distributable amount chain
9. **responses/page.tsx:204** — use `safeNumber` for both values in chain

---

## Verification

After implementation:
1. Test each `safeNumber` replacement with `undefined`, `null`, `NaN`, `"invalid"`, and valid numbers
2. Verify that a campaign with all-null quality scores produces reputation tier "new" (not bronze with score 0)
3. Verify that AI confidence of `undefined` falls back to 0.7 (schema default), not NaN
4. Verify that the-wall page renders correctly when `effective_reach_units`, `total_reach_units`, and `target_responses` are all null
5. Verify payout distribution with a mix of null and valid quality scores doesn't produce NaN weights
