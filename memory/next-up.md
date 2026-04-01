# Next Up — 2026-04-01

## Status
Phases 1-4 shipped. Brief synthesis pipeline is solid (grounding check, evidence weighting, analysis modules). No real users yet. The respondent acquisition model is the blocker — not code quality, not brief quality.

## Recommendation
Redesign the response model from "one respondent answers all questions" to "partial responses split across many respondents." This is the unlock that makes reciprocal exchange viable and fixes the cold-start problem.

## Why This, Why Now
The current model requires 8-15 respondents each spending 5-7 minutes answering 15-25 questions. At $0.50-0.85/response, a useful brief costs $5-12 — viable but impossible to bootstrap without a respondent pool. Reciprocal exchange ("respond to 3 campaigns to publish yours") is the cold-start solution, but only works if responding is fast (~90 seconds). That requires splitting the question set across respondents.

The economics shift: instead of 8 deep responses at $0.60 each, you get 25 partial responses at $0.15 each. Total cost drops, statistical coverage improves, and reciprocity becomes a 90-second ask instead of a 20-minute wall.

## Architecture Changes Required

### 1. Partial Response Model
- A "response" becomes a set of 3-5 assigned questions, not the full campaign
- Questions are assigned based on respondent-to-assumption match quality
- The `responses` table needs a concept of "question assignment" — which subset this respondent gets
- Evidence aggregation in `assumption-evidence.ts` already groups by assumption_index — this works as-is

### 2. Smart Question Assignment
- When a respondent opens a campaign, the system selects 3-5 questions optimized for:
  - Assumption coverage (which assumptions have the fewest responses so far)
  - Respondent match (which assumptions this person is best positioned to answer)
  - Evidence category diversity (don't give one respondent 3 price questions)
- At least 1 open-ended + 2 baseline MCQ per assignment
- This is the critical new module — targeting quality determines brief quality

### 3. Reciprocal Gate
- After campaign draft review, publish button becomes "Answer 3-5 questions on other campaigns to publish"
- Queue shows campaigns filtered by: different category, best match, fewest responses
- Each reciprocal response = one partial assignment (3-5 questions, ~90 sec)
- Campaign auto-publishes when gate is cleared

### 4. Brief Synthesis Adaptation
- `synthesizeBrief` already handles variable evidence counts per assumption
- May need to lower INSUFFICIENT_DATA threshold since evidence is partial
- Grounding check works as-is (validates against whatever evidence exists)

### 5. What to Keep As-Is
- AI assumption extraction + question generation
- Quality pass on campaign drafts
- Grounding check on brief output
- Evidence weighting (quality × match)
- All analysis modules (price signal, consistency gaps, segments)

### 6. What to Mothball (keep code, hide from UX)
- Stripe payout flow and respondent payments (Phase 2)
- Full response wall for paid respondents (Phase 2)
- Reputation tiers and cashout (Phase 2)
- Weekly digest banner (Phase 2)

## Targeting Must Be Excellent
With 3-5 questions per respondent, every slot is precious. A bad match wastes 20-25% of a partial response. The matching system needs to consider:
- Profile match (interests, expertise, demographics)
- Assumption relevance (which assumptions this person can speak to)
- Evidence gap (which assumptions need more data)
This is the hardest engineering problem in the redesign.

## Open Questions for Max
1. Should the reciprocal gate be mandatory for ALL campaigns, or only free-tier?
2. How many questions per partial response? 3-5 seems right but needs testing.
3. Do we show respondents which assumption they're testing, or keep it blind?
4. When do paid respondents enter? At a specific founder count, or when a founder explicitly pays for "more responses"?

## What NOT to Build Yet
- AI-augmented/synthetic respondents (trust is the product — kill permanently)
- Founder-to-founder messaging or community features
- Campaign bundling across founders
- Prolific/MTurk integration (Phase 3)
