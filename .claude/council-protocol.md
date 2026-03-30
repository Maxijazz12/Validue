# LLM Council Protocol

Use extra review only when the cost of being wrong is meaningfully high.

## Default

Level 0 is the default for normal implementation, UI, API work, migrations, tests, and bug fixes.

## Escalation Ladder

### Level 1 — Fan-Out
Use when the decision is hard to reverse, tradeoff-heavy, or likely to shape later work.

Typical cases:
- schema choices that will be painful to migrate
- auth or permission architecture
- new scoring or ranking mechanics
- major integration design
- choosing between viable approaches with materially different tradeoffs

Process: run 3 independent takes, synthesize, pick a side.

### Level 2 — Cross-Check
Use only when being wrong has real downside and the decision will stick.

Typical cases:
- money logic
- long-lived architectural constraints
- decisions with meaningful business downside if wrong

Process: solve independently in Claude, compare against an outside model or second independent pass, focus on disagreements.

### Level 3 — Full Council
Use rarely for core model, pricing, major pivots, or architecture lock-in.

## Escalation Rules

- Start at Level 0 unless a clear trigger is met
- Escalate because the decision is costly and sticky, not because it feels important
- If Level 1 converges cleanly, stop there
- If Level 1 disagrees, escalate only on the disagreement
- Routine edits inside risky files do not automatically require council; structural or policy changes do
