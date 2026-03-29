# Product Intelligence

Self-improving product judgment system. Loaded every session via `@INTELLIGENCE.md`. Lessons accumulate over time from real outcomes, external benchmarks, simulations, and past decisions.

## Evidence Hierarchy

| Tier | Source | Trust | Action |
|------|--------|-------|--------|
| 1 | Real user behavior (analytics, conversion, session data) | Highest | Overrides all. Update lessons immediately. |
| 2 | Explicit user/founder feedback (interviews, Phase 0 briefs) | High | Drives direction. But weight what users DO over what they SAY. |
| 3 | Observed external patterns (studied products) | Medium | Extract WHY it works, not WHAT it looks like. Hypothesis until tested. |
| 4 | Simulated reactions (synthetic user agents) | Low | Generates hypotheses. Never proves anything. |
| 5 | Internal reasoning / heuristics | Lowest | Starting point. Replace with higher-tier evidence ASAP. |

Higher-tier evidence always overrides lower-tier.

## Simulation Protocol

**Use simulation to:**
- Surface likely objections before building
- Identify confusion points in flows
- Compare messaging angles
- Stress-test pricing perception
- Predict navigation confusion
- Generate better real-world tests

**Never use simulation to:**
- Claim real conversion truth (simulated users don't have wallets)
- Replace real user feedback (synthetic reactions miss irrational human behavior)
- Justify irreversible decisions alone
- Present LLM consensus as market signal

**How to simulate:** Spawn 3 agents with distinct personas:
- Skeptical founder (been burned, questions everything)
- First-time founder (enthusiastic, confused by jargon)
- Experienced PM (knows competitors, judges on detail)

Each produces: first reaction, main objection, what would make them pay, what would make them leave.

**Storage:** Tag `[SIMULATED]`. Record hypothesis generated, not "finding." Mark superseded when real data arrives.

## Studying External Examples

When analyzing a product (Stripe, Linear, Notion, etc.):
1. Extract the principle, not the pixels
2. Ask why it works for THEM — may not transfer to student founders
3. Separate visual taste from conversion logic
4. Record as Tier 3 with rationale for applicability
5. Treat as hypothesis until tested in VLDTA's context

## Anti-Bullshit Rules

1. Simulated behavior is not proof. It generates hypotheses. Period.
2. One external example is not a causal truth. Extract the principle, test it.
3. Tier 4-5 evidence creates hypotheses, not "best practices."
4. Max 20 product lessons. Adding one? Consider removing another.
5. One-off wins don't generalize. Capture the conditions, not just the tactic.
6. If a lesson hasn't influenced a decision in 3 months, delete it.
7. "Looks premium" and "converts well" are different claims requiring different evidence.
8. Label the evidence tier on every lesson. No unlabeled wisdom.

---

## Product Lessons

Each lesson: one sentence + evidence tier + source + date + status (active / hypothesis / superseded).

### Pricing & Monetization
<!-- No lessons yet. First lessons will come from Phase 0 founder feedback and real conversion data. -->

### Onboarding & First Experience
<!-- No lessons yet. -->

### Landing & Conversion
<!-- No lessons yet. -->

### UX & Navigation
<!-- No lessons yet. -->

### Trust & Credibility
<!-- No lessons yet. -->

### Feature Packaging
<!-- No lessons yet. -->

### Architecture (User-Facing Impact)
<!-- No lessons yet. -->

---

## Decision Outcomes

Track major product decisions and what happened. Update "Outcome" column when real data arrives.

| Decision | Date | Rationale | Outcome | Lesson |
|----------|------|-----------|---------|--------|
| Assumption Autopsy framing over generic survey model | 2026-03-29 | No competitor owns assumption-testing. Brief organized by assumptions > survey responses. (Tier 5: internal reasoning + Tier 3: competitor landscape analysis) | [pending — validate in Phase 0] | [pending] |
