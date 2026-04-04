# Potential Improvements

Spotted during development. Not urgent — revisit when we have real usage data.

---

## Wall Feed Ranking (WallFeed.tsx)

- **Category diversity** — No penalty for same-category clustering. Top of feed could be all one type if profile skews heavily.
- **Seen dampening** — Same cards stay pinned to the top across visits. Could decay score for cards the user has already scrolled past.
- **Reward weight vs match** — Reward (15 pts max) is strong relative to match score (35 pts). A high-paying but poorly matched campaign can outrank a great match. May want to rebalance after observing click-through data.
- **Fill ratio tradeoff** — Boosting nearly-full campaigns is good for founders (fills faster) but arguably bad for respondents (less chance of getting in). Worth watching drop-off rates on high-fill cards.

---

## Deterministic Truth Engine

Build when brief quality plateaus despite good input signal. Not before. Prerequisites: enough real campaigns to see where verdicts are wrong or vague, and clear evidence that input quality (response volume, question quality, respondent effort) is no longer the bottleneck.

### Structured Assumption Slots
Replace freeform `key_assumptions: string[]` with four fixed slots: `problem_severity`, `current_alternative`, `stakeholder_willingness`, `adoption_feasibility`. Each slot carries: `statement`, `falsifier`, `evidence_needed`, `criticality`, `required_stakeholder_type`, `required_fit_bucket_min`, `required_min_rows`. Dual-write `key_assumptions` as `[slot.statement]` for backward compat. Gate on `campaign_version >= 2`. Default criticality: `problem_severity` and `stakeholder_willingness` are critical unless explicitly downgraded.

### Deterministic Verdict Rules
Move verdict logic upstream of the LLM. Rules, not model mood:
- `CONFIRMED`: ≥N core-fit responses, ≥70% supporting polarity, ≥1 behavioral evidence
- `CHALLENGED`: ≥N core-fit responses, 30-70% supporting
- `REFUTED`: ≥N core-fit responses, <30% supporting, ≥1 strong contradicting
- `INSUFFICIENT_DATA`: below response/category minimums
- Brief verdict: `PROCEED` / `PAUSE (missing evidence)` / `PAUSE (negative evidence)` / `PIVOT`
- Distinguish "pause because missing" from "pause because negative" explicitly in the model
- Concrete thresholds TBD from real campaign data — do not guess these

### Evidence Annotation Layer
Per-answer structured annotations: `assumption_id`, `polarity`, `evidence_category`, `fit_score`, `stakeholder_fit`, `behavioral_strength`, `commitment_strength`, `contradiction_flag`, `contradiction_reason`, `weight` + `weight_breakdown` (stored, not recomputed). Weight formula is heuristic and inspectable. At build time decide which fields are heuristic-derived vs need a lightweight AI classification pass — `polarity` and `contradiction_reason` likely need content understanding.

### Respondent Quotas by Stakeholder Cell
One secondary stakeholder type per campaign: `buyer` (budget/approval), `blocker` (rollout/compliance), or `implementer` (workflow/integration). Selection source TBD — could be user choice in create flow or AI inference from scribble. Set minimum response quotas per cell. When quotas aren't met: keep assumption at `INSUFFICIENT_DATA`, downgrade brief verdict, surface gap to founder. Define what "extend the run" means mechanically.

### LLM as Renderer
Pre-compute a `brief_model` JSON (executive verdict, pause reason, assumption statuses, contradiction summaries, stakeholder map, strongest segment, weakest link, next disconfirming test, confidence tiers). LLM receives this and produces prose — it does not decide outcomes. Bump `BRIEF_CACHE_VERSION` and handle migration of existing cached briefs.

### Evidence Inbox
Make the responses view a first-class debugging surface. Show weight breakdown, polarity, stakeholder fit per evidence row. Parity between what the founder inspects and what the brief concludes. Filters by assumption slot, match bucket, polarity.

### Enum Vocabulary (freeze before implementation)
- Assumption status: `CONFIRMED` / `CHALLENGED` / `REFUTED` / `INSUFFICIENT_DATA`
- Assumption confidence: `directional` / `emerging` / `confident`
- Brief verdict: `PROCEED` / `PIVOT` / `PAUSE`
- Match bucket: `core` / `adjacent` / `off_target`
These must not blur together. Lock definitions before any code ships.
