# VLDTA Product Vision & Strategy

> VLDTA is an assumption-testing engine for founders. It takes a business idea, extracts what the founder is betting on, pressure-tests those bets against real human behavior, and delivers a decision brief that says what survived and what didn't. We exist because founders don't need more opinions — they need faster access to uncomfortable truth.

## The Deepest Truth

Founders don't die from lack of feedback. They die from false confidence. A founder who runs a survey and gets 15 people saying "I'd definitely use that" has manufactured evidence that confirms their bias. They leave feeling validated when they should feel uncertain.

Every other tool optimizes for volume of feedback. VLDTA optimizes for **speed to disconfirmation.**

What makes this structurally different: ChatGPT can simulate adversarial analysis but can't test assumptions against real human behavior. Survey tools collect answers but don't synthesize meaning. VLDTA combines real behavioral data + AI synthesis — categorically better than either alone.

## Core Thesis

Assumptions are the atomic unit of startup risk. Not questions. Not responses. Not scores. The founder's implicit assumptions — about who the buyer is, what they'll pay, whether the problem is real — are what kill or validate an idea. The product's job is to make those assumptions visible and then verdict them with evidence.

## Target Users

Students and young founders (18-32). Tone is direct and human. The product should feel like getting a brutally honest stress-test, not filling out a form.

## The Emotional Promise

**"I finally know what's actually true about my idea — and I know exactly what to do next."**

Not excitement. Not validation. Not confidence. Clarity. The feeling of fog lifting — even if what's clear is that you need to pivot.

## What's Already Built (Infrastructure)

The plumbing works. What's missing is the output layer.

- Two-sided marketplace: founders post ideas, respondents answer AI-generated questions
- AI question generation with baseline question library (interest, willingness, payment, behavior, pain)
- AI extracts key assumptions from founder's idea description (up to 5)
- 4-dimensional response quality scoring (depth, relevance, authenticity, consistency) with confidence adjustment
- V2 economics: 60% base pool / 40% bonus pool, qualification gates, money state machine
- Respondent reputation system (EMA smoothing, tiers)
- Reach budgeting with quality modifiers
- Anti-gaming: paste detection, timing checks, character minimums
- Subscription tiers: Free, Starter ($19), Pro ($49), Scale ($99)
- Platform takes 15% cut

## Product Model — The Assumption Autopsy

**You submit an idea. AI extracts your assumptions. Real humans provide behavioral evidence. AI synthesizes it into a brief that tells you which assumptions survived and which didn't.**

### How It Works

1. **Founder scribbles their idea** — unstructured, raw, whatever format feels natural
2. **AI extracts testable assumptions** — "You're assuming parents are the buyer", "You're assuming people currently solve this with spreadsheets", "You're assuming they'd pay $20/month"
3. **AI generates behavioral questions** — each question is an instrument for testing specific assumptions. Not generic survey questions — targeted probes.
4. **Real humans respond** — matched by interest/expertise/demographics. Quality-scored, anti-gaming protected, incentive-aligned via base+bonus payouts.
5. **AI synthesizes responses into a Decision Brief** — organized by assumption, not by respondent. Each assumption gets a verdict (confirmed / challenged / refuted) with the evidence chain.

### The Decision Brief — THIS IS THE PRODUCT

The brief is the product. Everything else is plumbing. Individual responses are raw material — the founder should never need to read them to get value.

The brief must contain:

1. **Assumption verdicts** — Each assumption extracted in step 2, with a verdict and the behavioral evidence supporting it. ("You assumed parents are the buyer. 14/20 respondents described the school administrator as the decision-maker. Verdict: CHALLENGED.")
2. **The uncomfortable truth** — The single biggest risk the data reveals. Front and center, not buried. Hardest finding leads. ("Strong problem-market fit, weak solution-market fit. Users love the concept but described a fundamentally different use case than you're building.")
3. **Signal summary** — 2-3 sentence synthesis of what the behavioral data collectively means. Not scores. Meaning.
4. **Actionable next steps** — Specific, not vague. ("Reposition around admin buyer. Test pricing at $X/seat. Strongest marketing angle from response language: [direct quotes].")

## Core Product Principles

1. **Assumptions are the atomic unit.** Every campaign is structured around testable assumptions, not questions. Founders see assumptions and verdicts, not questions and responses.
2. **The brief is the product.** Response-level access is a power-user feature, not the main experience.
3. **Uncomfortable truths go first.** The thing the founder least wants to hear is the thing they most need to hear.
4. **Evidence over opinion.** Every claim must link to behavioral data from real humans. This is what separates VLDTA from ChatGPT.
5. **AI synthesizes, humans provide signal.** Use each where they're strongest. Never reverse them.
6. **Speed is validation's half-life.** 48-hour turnaround > 2-week turnaround. 10 high-quality responses > 50 mediocre ones.
7. **One brief, all lenses.** Single integrated document. Fragmented output is a survey tool. Integrated output is a decision tool.
8. **Don't optimize plumbing until output is proven.** Brief quality is what founders pay for.

## Build Phases

### Phase 0: Validate the output (CURRENT)
Manually write 3-5 assumption-structured briefs for existing campaigns. Show to founders. Ask: "Would this have changed your decision?" If lukewarm, the framing doesn't matter and the architecture is irrelevant.

**Progress:**
- [ ] Manual brief #1 — campaign: [TBD], founder feedback: [pending]
- [ ] Manual brief #2 — campaign: [TBD], founder feedback: [pending]
- [ ] Manual brief #3 — campaign: [TBD], founder feedback: [pending]
- **Gate:** 2+ founders confirm "yes, this changes my decision" → Phase 1 unblocked
- **During Phase 0:** Focus on plumbing that enables brief writing. Do not build Phase 1 features yet.

### Phase 1: Assumption extraction + Decision Brief
- Evolve campaign creation: AI extracts assumptions from scribble, generates questions that test them
- Build response-to-assumption mapping: which responses provide evidence for/against which assumptions
- Build AI synthesis layer that produces the Decision Brief
- Brief template: assumption verdicts, evidence chains, uncomfortable truth, next steps
- Highest leverage, lowest risk. No new respondent types needed.

### Phase 2: AI-powered analysis modules
Add competitive overview and business model analysis as supplementary brief sections. Uses idea description + consumer data as input. Zero marginal respondent cost.

### Phase 3: Consumer lens refinement
Better behavioral questions. Better WTP probing. Better problem-solution fit detection. Better assumption-targeted question generation. Make the signal significantly better before adding new signal sources.

### Phase 4: Longitudinal validation
Track how assumptions evolve across repeated validation rounds. "In round 1, pain resonance was 3/20. After your pivot, it improved to 14/20." Natural retention mechanic.

### Phase 5: Expert respondent pilot
Only after Phases 1-4 work AND founders say "I wish I had expert input." Prove expert humans add signal AI can't generate. This is a test, not a feature launch.

## DO NOT BUILD YET

- Expert deduplication engine (Phase 5+)
- Dynamic exhaustion detection — use fixed response targets (Phase 5+)
- Per-lens payout logic — one model until data demands differentiation (Phase 5+)
- Marketing lens as its own product (Phase 5+)
- Competitive lens as crowd-sourced (never — AI-first)
- Lens-based respondent routing (Phase 5+)
- Dashboard for reading individual responses as primary UX (never — brief is primary)

## What VLDTA Must NOT Become

- **A survey builder.** Founders describe ideas, not research protocols. Abstract survey mechanics away entirely.
- **A dashboard for reading individual responses.** If founders spend time reading raw responses, the synthesis layer isn't doing its job.
- **A feedback marketplace with some AI on top.** Marketplace mechanics are invisible infrastructure, not user-facing concepts.
- **An AI-only validation tool.** Remove real humans and you're ChatGPT-with-a-wrapper. Human behavioral data is the structural moat.
- **A tool for all founder stages.** Pre-build, pre-revenue only. Not growth-stage, not enterprise, not academic.
- **A tool that makes founders feel good.** If briefs consistently confirm ideas, the product is broken. Uncomfortable truths are the product.

## Decision Rules for Feature Work

1. **Does it improve the Decision Brief?** If not, it's probably infrastructure you don't need yet.
2. **Does it sharpen assumption verdicts?** Better evidence, clearer verdicts, more actionable next steps — that's the priority.
3. **Does it require a new respondent pool?** If yes, defer it.
4. **Can AI do 80% of this without human respondents?** If yes, build the AI version first.
5. **Is this optimization or validation?** Don't optimize before validating.
6. **Does this prove or assume demand?** Build things that prove demand.

## Economic Principles

- Platform takes 15% cut on all transactions
- V2 economics: 60/40 base/bonus split, qualification-gated
- No base pay — quality is the only path to income for respondents
- Subsidized campaigns (first campaign) get flat $0.30/response
- AI modules have no marginal respondent cost — major economic advantage
- Expert crowd-sourcing must clear a high bar: prove signal justifies cost AND recruitment is viable at price point
