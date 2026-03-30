# LLM Council Protocol

Decision-quality system for catching expensive mistakes. Most decisions don't need a council.

## Models

| Level | Models | Cost |
|-------|--------|------|
| 0 | Claude Opus (single agent) | $0 |
| 1 | 3x Claude Opus subagents | $0 |
| 2 | Claude Opus + GPT-4o (manual paste) | ~$0.10 |
| 3 | 3x Claude Opus + GPT-4o + 24hr hold | ~$0.30 |

Fan-out is free. Threshold: "is this hard to reverse?" not "can I afford it?"

## Decision Ladder

### Level 0: Just Do It (90%)
**Trigger:** Implementation, UI, API routes, components, migrations, tests, bug fixes.
Single agent. No council. Ship it.

### Level 1: Fan-Out (8%)
**Trigger:** Schema design painful to migrate, auth/permissions architecture, new scoring algorithms, integration design, choosing between viable approaches with different tradeoffs.
**Protocol:** 3 independent Claude subagents with different framings (best solution / risks first / critique naive approach), then synthesis. Pick a side on disagreements — no hedging.
**Time:** 15-20 min max.

### Level 2: Multi-Model (2%)
**Trigger:** ALL true: involves real money OR genuinely irreversible OR constrains 3+ months, AND cost of being wrong > $500.
**Protocol:** Claude solves independently, Max pastes same problem (NOT Claude's answer) into ChatGPT. Compare — disagreements are the most valuable signal.

### Level 3: Full Council (2-3x per quarter)
**Trigger:** Launch pricing, core economic model changes, platform architecture lock-in, pivots.
**Protocol:** Level 1 + Level 2 + synthesis memo + 24-hour hold before committing.

### Escalation Rules
- Default is Level 0. Escalate only if triggers are met.
- If Level 1 produces 3 agreements: done. Don't escalate.
- If Level 1 produces disagreement: escalate to Level 2 on the specific disagreement only.
- Never escalate because it "feels important." Escalate because cost of being wrong is concrete and high.

## Synthesis Memo Template

```
## Council Decision: [Title]
**Level:** 1/2/3 | **Date:** YYYY-MM-DD

### Problem
[2-3 sentences: what decision, why now]

### Recommendation
[One sentence. No hedging.]

### Why This Beats Alternatives
[2-3 sentences. Direct comparison.]

### Agreement / Disagreement
- Agreed on: [what]
- Diverged on: [what — most important section]
- Unique risk surfaced by: [which run/model]

### Before Committing
[1-3 things to test/validate before locking in]
```

Keep under 20 lines. If longer, the thinking isn't clear enough.
