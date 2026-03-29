# LLM Council Protocol

A decision-quality system for solo SaaS builders. Not every decision needs a council. Most don't. This protocol exists to catch expensive mistakes on the few decisions where being wrong costs more than thinking twice.

## Models & Cost Reality

**Claude (Opus 4.6, Sonnet 4.6, Haiku 4.5):** Covered by Max plan subscription. Subagents, fan-out, worktree agents — all $0 marginal cost. The only constraint is rate limits and time.

**GPT-4o (OpenAI API):** Pay-per-token. Only used at Level 2+. ~$0.05-0.15 per call. Not yet automated — currently manual (paste into ChatGPT, bring answer back). Automate when usage justifies it (3+ uses where it catches a real mistake).

**No Gemini.** Two models is enough. Third model adds near-zero marginal insight.

| Level | Models | Marginal Cost |
|-------|--------|---------------|
| 0 | Claude Opus | $0 (subscription) |
| 1 | 3x Claude Opus subagents | $0 (subscription) |
| 1 (cost-conscious variant) | 2x Sonnet + 1x Opus | $0 (subscription, faster) |
| 2 | Claude Opus + GPT-4o | ~$0.05-0.15 (OpenAI only) |
| 3 | 3x Claude Opus + GPT-4o | ~$0.10-0.30 (OpenAI only) |

**Because fan-out is free, use it more liberally than you would on a per-token plan.** The only cost is time (~15 min) and rate limit headroom. The decision to fan out should be based on "is this hard to reverse?" not "can I afford it?"

## 1. What's Good in the Multi-Model Idea

- Independent derivations that agree are much more trustworthy than one model self-checking
- Different models fail differently — disagreements surface blind spots
- Fan-out is cheap and fast; it's the best ratio of cost to insight
- Forcing a structured synthesis memo creates a decision artifact you can reference later

## 2. What's Weak or Dangerous

- **Debate is overrated for solo builders.** Multiple critique rounds sound rigorous but mostly produce longer text, not better decisions. The marginal insight from round 2+ of debate is almost zero compared to simple fan-out. Skip it.
- **Multi-model adds latency for manual paste workflow.** Only justified for irreversible decisions with real financial consequences. Not for "should I use Zustand or Jotai."
- **Council creates false confidence.** Three weak analyses that agree don't equal one strong analysis. If the input framing is wrong, all runs fail the same way. Garbage in, consensus garbage out.
- **Compromise is the default failure mode.** When synthesizing multiple outputs, the natural tendency is to hedge — "consider both approaches" instead of making a hard call. The synthesizer must be forced to choose.
- **Over-analysis kills momentum.** A solo founder spending 45 minutes on a council for a medium decision has lost the most valuable resource: shipping time. The protocol must protect speed as aggressively as it protects decision quality.

## 3. The Decision Ladder

### Level 0: Just Do It (90% of work)
**Trigger:** Implementation tasks, UI, API routes, component work, migrations, tests, bug fixes.
**Protocol:** Single agent. No council. Ship it.
**Cost:** $0.
**Why:** The answer is verifiable by running the code. If it's wrong, you fix it in minutes. Council adds latency with zero value.

### Level 1: Fan-Out (8% of work)
**Trigger:** Any of these:
- Schema design that will be painful to migrate later
- Auth/permissions architecture
- New scoring algorithm or formula
- Integration design (Stripe flows, webhook handling, cron job logic)
- Choosing between 2+ viable technical approaches with different tradeoffs

**Protocol:** 3 independent Claude subagents, then synthesis. See Section 4.
**Cost:** $0 (subscription). Only costs ~15-20 min of time.
**Why:** These decisions are reversible but expensive to reverse. 20 minutes of fan-out can save 2 days of migration. Since it's free, the threshold for using it should be "is this hard to reverse?" not "is this important enough to justify the cost."

### Level 2: Multi-Model Verification (2% of work)
**Trigger:** ALL of these must be true:
- The decision involves real money (payout formulas, pricing, platform economics)
- OR the decision is genuinely irreversible (public API contract, data model that users depend on)
- OR you're about to commit to a strategic direction that constrains the next 3+ months
- AND the cost of being wrong exceeds $500

**Protocol:** Claude Opus + GPT-4o, independent derivation, delta comparison. See Section 4.
**Cost:** ~$0.05-0.15 (OpenAI API only). Claude portion is free.
**Why:** Different models have different failure modes. When both independently arrive at the same answer, confidence is very high. When they disagree, that's the most valuable signal — it means the problem has non-obvious complexity.

### Level 3: Full Council (rare — maybe 2-3x per quarter)
**Trigger:** "Point of no return" decisions:
- Pricing model for launch
- Core economic model changes (V2 → V3 economics)
- Platform architecture that locks in a technical direction
- Pivoting the product

**Protocol:** Fan-out (3x Claude) + GPT-4o verification + structured synthesis memo + sleep on it. See Section 4.
**Cost:** ~$0.10-0.30 (OpenAI API only). Claude fan-out is free.
**Why:** These are the decisions you'll live with for 6-12 months. $0.30 is trivial compared to the cost of getting them wrong.

### Escalation Rules
- Start at Level 0. Escalate only if the trigger conditions are met.
- If you're unsure whether to escalate: don't. The default is speed.
- If a Level 1 fan-out produces 3 answers that all agree: done. Don't escalate further.
- If a Level 1 fan-out produces disagreement: escalate to Level 2 on the specific point of disagreement only.
- Never escalate because a decision "feels important." Escalate because the cost of being wrong is concrete and high.

## 4. Protocol for Each Pattern

### Level 1: Fan-Out + Synthesis

**Setup:**
- 3 independent Claude runs (subagents or separate prompts)
- Each gets the SAME problem statement but a DIFFERENT framing:
  - Run A: "Design the best solution for [problem]."
  - Run B: "What are the risks and failure modes of [problem]? Then propose a solution that mitigates them."
  - Run C: "A junior engineer proposed [naive solution]. What's wrong with it? What would you do instead?"
- Varying the frame prevents convergence on the same blind spot.

**Each run produces:**
- Recommended approach (1-2 paragraphs max)
- Key tradeoffs acknowledged
- Biggest risk of this approach
- What would make you change your mind

**Synthesis:**
- Compare the 3 outputs. Identify: where do they agree? Where do they diverge?
- On agreement: high confidence. Adopt.
- On disagreement: that's the interesting part. The synthesizer must pick a side and explain why, not hedge.
- Output: Synthesis Memo (see Section 5).

**Time budget:** 15-20 minutes total. If it's taking longer, the problem framing is wrong.

### Level 2: Multi-Model Verification

**Setup:**
- Claude solves the problem first, independently.
- The same problem (NOT Claude's solution) is sent to a second model.
- Critical: no anchoring. The second model must not see Claude's answer.

**How to invoke (practical options):**
- **Manual:** Copy the problem statement into ChatGPT. Bring the answer back.
- **Automated (when openai SDK is installed):** Claude calls the OpenAI API via a verification script, passing only the problem statement.

**Comparison:**
- If both models reach the same conclusion: very high confidence. Proceed.
- If they reach different conclusions: DO NOT average them. Present both to Max with the specific delta highlighted. The disagreement is the insight.
- If one model identifies a risk the other missed: incorporate it regardless of which model "won."

**Output:** Delta Report — what agreed, what diverged, which risks were unique to each model, recommended path.

**Time budget:** 10-15 minutes. The second model call is fast. The value is in the comparison, not the depth.

### Level 3: Full Council

**Setup:**
- Level 1 fan-out (3 Claude runs with varied framing)
- Level 2 multi-model verification on the point of highest uncertainty
- Synthesis memo written
- 24-hour hold before committing (sleep on it)

**Why the hold:** Council outputs feel authoritative. That's dangerous. The hold prevents premature lock-in and lets Max's own judgment weigh in after the initial enthusiasm fades.

**Output:** Full Synthesis Memo (Section 5) + explicit "what to test before committing" section.

**Time budget:** 30-45 minutes for the council work. Then wait.

## 5. Synthesis Memo Template

```
## Council Decision: [Title]
**Level:** 1 / 2 / 3
**Date:** YYYY-MM-DD

### Problem
[What decision needs to be made and why now. 2-3 sentences.]

### Options Considered
- **Option A:** [one line]
- **Option B:** [one line]
- **Option C:** [one line, if applicable]

### Key Assumptions
[What must be true for the recommendation to hold. Bullets.]

### Risks
[What could go wrong. Ranked by severity, not likelihood.]

### Irreversibilities
[What becomes hard to change after this decision. If nothing, say "fully reversible."]

### Recommendation
[The choice. One sentence. No hedging.]

### Why This Beats the Alternatives
[2-3 sentences. Direct comparison.]

### Agreement / Disagreement
- **All runs agreed on:** [what]
- **Divergence on:** [what — this is the most important section]
- **Unique risk surfaced by:** [which run/model identified what]

### Before Committing
[1-3 specific things to test or validate before this decision is locked in.]
```

Keep it under 30 lines. If the memo is longer, the thinking isn't clear enough.

## 6. Failure Modes — What Goes Wrong

**1. Over-counciling.** Using Level 2+ for decisions that don't warrant it. Symptom: spending more time deciding than building. Fix: the trigger conditions are explicit — if they're not met, don't escalate. The default is Level 0.

**2. False consensus.** Three runs agree because they all share the same training bias or because the problem framing led them there. Symptom: high confidence but the answer feels "obvious." Fix: if all 3 runs agree AND the answer seems obvious, it probably is — just do it without the council next time. If all 3 agree on something surprising, that's when to be skeptical and escalate to multi-model.

**3. Compromise synthesis.** The synthesizer averages the options instead of choosing. Symptom: recommendation says "consider both" or "it depends." Fix: the synthesizer must pick ONE path. "It depends" is not a valid output. If you can't pick, the problem framing is wrong — reframe and re-run.

**4. Anchoring in multi-model.** Showing Claude's answer to ChatGPT (or vice versa) so the second model just agrees. Symptom: both models "agree" but one clearly parrots the other. Fix: second model NEVER sees first model's output. Same problem statement, fresh derivation.

**5. Spending council budget on reversible decisions.** Schema column names, component structure, folder layout. Symptom: council on things you could change in 10 minutes. Fix: ask "what does it cost to be wrong and change this later?" If less than $100 and less than 2 hours, Level 0.

**6. Analysis paralysis after council.** The memo surfaces real tradeoffs and now you can't decide. Symptom: the council made the decision harder, not easier. Fix: if the council shows the options are genuinely close, that means EITHER choice is acceptable. Pick the simpler one and ship.

**7. Paying for depth you don't read.** Long council outputs that get skimmed. Symptom: memos exceed 30 lines, key insights buried. Fix: strict template, strict length limits. The memo is a decision tool, not a research paper.

## 7. Recommended Operating Model for Solo SaaS Builder

**Daily coding:** Level 0. Single agent. Ship.

**Design decisions** (schema, auth, integration architecture): Level 1 fan-out whenever the decision is hard to reverse. It's free — the only cost is 15-20 min. Use it without guilt.

**Money decisions** (pricing, payout formulas, economics): Level 2 multi-model. ~$0.10 per decision. Maybe 1-2 per month.

**Quarterly pivots** (economic model changes, platform architecture, launch pricing): Level 3 full council. 2-3 per quarter max.

**Actual budget:** ~$1-5/month in OpenAI API costs. Claude fan-out is covered by subscription. If you're spending more on OpenAI, you're either over-counciling or should automate the API call.

**Speed rule:** Level 1 max 20 min. Level 2 max 15 min. If longer, the problem framing is wrong — reframe or just decide.

**The meta-rule:** The council exists to catch expensive mistakes, not to make you feel thorough. If you're using it for comfort rather than risk reduction, stop.
