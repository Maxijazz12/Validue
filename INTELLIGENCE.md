# Product Intelligence
<!-- Last reviewed: 2026-03-29 -->

Self-improving product judgment system. Loaded on-demand via hooks. Lessons accumulate over time from real outcomes, external benchmarks, simulations, and past decisions.

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

**ALL lessons below are unvalidated hypotheses from LLM simulations (Tier 4) or internal reasoning (Tier 5). None have been tested against real founder behavior. Treat as hypotheses to test, not facts to rely on.**

Each lesson: one sentence + evidence tier + source + date + status.

### Pricing & Monetization
- **[T4]** $49 is likely viable for 3 of 4 founder segments. Skeptical/experienced founders see it as cheap insurance. First-timers see it as expensive but justified. — simulation 2026-03-29, hypothesis
- **[T4]** A sample report on the website is likely critical for conversion. Every simulated persona said they need to see output quality before paying. — simulation 2026-03-29, hypothesis
- **[T4]** $29 "student/first-time" tier at ~15 respondents could expand the market without cannibalizing $49 tier. — simulation 2026-03-29, hypothesis

### Landing & Conversion
- **[T4]** The assumption-verdict structure is likely the core format differentiator vs ChatGPT and generic surveys. — simulation 2026-03-29, hypothesis
- **[T4]** The "uncomfortable truth" section is likely the single highest-emotional-impact element. — simulation 2026-03-29, hypothesis

### Trust & Credibility
- **[T4]** Respondent transparency (who responded, sample size, caveats) likely increases trust even when revealing limitations. — simulation 2026-03-29, hypothesis
- **[T4]** Competitive landscape tables from AI feel "fake-smart" and can damage credibility. Better omitted than poorly done. — simulation 2026-03-29, hypothesis

### Feature Packaging
- **[T4]** Top-line decision recommendation (PROCEED/PIVOT/PAUSE) likely increases actionability vs letting founder interpret raw verdicts. — simulation 2026-03-29, hypothesis
- **[T4]** "Cheapest next test in 5 days" is likely more actionable than "strategic pivot recommendation." — simulation 2026-03-29, hypothesis
- **[T4]** Recommendations need same scrutiny as the original idea. An unvalidated pivot suggestion is "half a product." — simulation 2026-03-29, hypothesis

### Architecture (User-Facing Impact)
- **[T4]** Respondent quality is the #1 trust concern and the binding constraint. The path to higher trust runs through better response collection, not better AI. — simulation 2026-03-29, hypothesis
- **[T5]** Response collection structure (question design, behavioral probes, respondent UX) is likely the make-or-break factor. Input quality caps output quality. — founder input (Max) 2026-03-29, hypothesis — CRITICAL: test before Phase 1 engine build

---

## Decision Outcomes

Track major product decisions and what happened. Update "Outcome" column when real data arrives.

| Decision | Date | Rationale | Outcome | Lesson |
|----------|------|-----------|---------|--------|
| Assumption Autopsy framing over generic survey model | 2026-03-29 | No competitor owns assumption-testing. Brief organized by assumptions > survey responses. (Tier 5: internal reasoning + Tier 3: competitor landscape analysis) | [pending — validate in Phase 0] | [pending] |
| Variant B ("The Verdict") as brief format | 2026-03-29 | Performed best in comparative simulation (3 variants × 2 ideas × 4 personas). Decision call + transparency + evidence labels. (Tier 4: simulation) | [pending — needs real-founder testing] | [pending] |
| Response collection quality is the binding constraint | 2026-03-29 | Simulated buyers flagged respondent quality as #1 trust concern. Max confirmed: scoring catches bad responses but doesn't produce good ones. Question design and respondent UX determine signal quality. (Tier 4: simulation + Tier 2: founder input) | [pending — needs response structure experimentation] | [pending] |
