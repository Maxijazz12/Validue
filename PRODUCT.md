# VLDTA Product Vision & Strategy

> VLDTA is a decision support tool for founders. It takes a business idea, puts it in front of real potential users, and returns a structured decision brief — not raw survey data, but synthesized signal that maps blind spots, identifies risks, and tells the founder what to do next.

## Core Thesis

Founders don't need 50 people saying the same thing. They need structured signal across different dimensions of risk. The moat is in the synthesis, not the survey mechanics. The differentiation is in the output artifact, not the number of input channels.

## Target Users

Students and young founders (18-32). Tone is direct and human. The product should feel like getting a brutally honest advisor, not filling out a form.

## What's Already Built (V1)

- Two-sided marketplace: founders post ideas, respondents answer AI-generated questions
- AI question generation with baseline question library (interest, willingness, payment, behavior, pain)
- 4-dimensional response quality scoring (depth, relevance, authenticity, consistency) with confidence adjustment
- V2 economics: 60% base pool / 40% bonus pool, qualification gates, money state machine
- Respondent reputation system (EMA smoothing, tiers)
- Reach budgeting with quality modifiers
- Anti-gaming: paste detection, timing checks, character minimums
- Subscription tiers: Free, Starter ($19), Pro ($49), Scale ($99)
- Platform takes 15% cut

## MVP Direction (Current Phase)

**One human pool. Two AI modules. One synthesis layer.**

### Consumer Lens (Crowd-Sourced) — THE core product
- Real potential users evaluate the idea: Do I understand this? Do I have this problem? Would I care? Would I buy?
- Volume-based, quality-scored, aggregate signal
- This is what's already built — refine it, don't replace it

### AI Business Analysis Module — No new respondents needed
- Takes founder's idea description + consumer response data as input
- Produces: business model viability assessment, assumption mapping, scale risk identification
- AI does 80% of what a human strategist would at this stage

### AI Competitive Overview Module — No new respondents needed
- AI-powered competitive landscape research (not crowd-sourced)
- Identifies: existing competitors, adjacent products, whitespace, differentiation gaps
- This lens is categorically better served by AI than by anonymous respondents at affordable price points

### The Founder Report — THIS IS THE PRODUCT
The output artifact is where the real value lives. Everything else is plumbing.

The report must contain:
1. **Signal summary** — 2-3 sentence synthesis of what consumer data actually says. Not scores. Meaning. ("14 of 20 understood the problem. Only 3 would pay, and they described a different use case than you pitched.")
2. **Assumption map** — The founder's implicit assumptions mapped against what data supports or contradicts. ("You assumed parents are the buyer. Data suggests the school administrator is the decision-maker.")
3. **The uncomfortable truth** — The single biggest risk the data reveals. Front and center, not buried. ("Strong problem-market fit, weak solution-market fit.")
4. **Actionable next steps** — Specific, not vague. ("Reposition around admin buyer. Test pricing at $X/seat. Strongest marketing angle from response language: [X].")

## Build Phases

### Phase 0: Validate the output
Manually write synthesis reports for 3-5 existing campaigns. Show to founders. Ask: "Would this have changed your decision?" If lukewarm, the architecture doesn't matter.

### Phase 1: AI synthesis layer on existing data
Build report generation on top of current consumer response data. No new lenses, no new respondent types. Just dramatically better output. Highest leverage, lowest risk.

### Phase 2: AI-powered analysis modules
Add competitive overview and business model analysis as supplementary report sections. Uses idea description + consumer data as input. Gives founders the multi-dimensional feeling without supply-side complexity.

### Phase 3: Consumer lens refinement
Better behavioral questions. Better WTP probing. Better problem-solution fit detection. Make the one lens significantly better before adding new ones.

### Phase 4: Expert respondent pilot
Only after Phases 1-3 work AND founders say "I wish I had expert input": recruit a small pool of marketing/strategy respondents. Test on a handful of campaigns. Prove expert humans add signal AI can't generate. This is a test, not a feature launch.

### Phase 5: Multi-lens architecture
Full lens routing, dedup, exhaustion detection, per-lens economics — only after Phase 4 proves measurable value of human expert input over AI-only analysis.

## DO NOT BUILD YET

These are explicitly deferred. Do not build these until the corresponding phase gate is passed:

- Expert deduplication engine (Phase 5)
- Dynamic exhaustion detection — use fixed response targets for now (Phase 5)
- Per-lens payout logic — one payout model until data demands differentiation (Phase 5)
- Marketing lens as its own product (Phase 4+)
- Competitive lens as crowd-sourced (never — AI-first)
- Lens-based respondent routing (Phase 5)
- Multi-lens founder report — start with consumer summary + AI addendum (Phase 2)

## Long-Term Vision (12-18 months)

If validated through the phase gates above, VLDTA evolves toward multi-lens validation:

- **Consumer lens** (crowd): volume-based, aggregate signal on demand/interest/WTP
- **Marketing lens** (expert crowd): positioning, channels, messaging — requires unique contributions
- **Business/Strategy lens** (expert crowd + AI): model viability, assumption stress-testing, scale risks
- **Competitive lens** (AI-first, possibly expert-augmented): landscape mapping, whitespace identification

Expert lenses would use:
- Net-new contribution requirements (dedup — but UX must not feel hostile)
- Dynamic exhaustion (system detects when enough signal has been gathered per dimension)
- Per-lens payout and scoring calibration
- AI synthesis across all lenses into a unified decision brief

**Key risk for expert lenses:** Good strategists bill $150-300/hr. At $2-5/response, you get aspiring experts and gamers, not real ones. The AI-first path may permanently outperform crowd-sourced experts at sustainable price points. Validate before committing.

## Decision Rules for Feature Work

When evaluating any new feature or architecture decision, apply these filters:

1. **Does it improve the founder output artifact?** If not, it's probably infrastructure you don't need yet.
2. **Does it require a new respondent pool?** If yes, defer it. Each new pool multiplies the supply-side problem.
3. **Can AI do 80% of this without human respondents?** If yes, build the AI version first.
4. **Is this optimization or validation?** Don't optimize (dedup, exhaustion, per-lens economics) before validating (do founders care about this signal?).
5. **Does this prove or assume demand?** Build things that prove demand. Defer things that assume it.

## Economic Principles

- Platform takes 15% cut on all transactions
- V2 economics: 60/40 base/bonus split, qualification-gated
- No base pay — quality is the only path to income for respondents
- Subsidized campaigns (first campaign) get flat $0.30/response
- AI modules have no marginal respondent cost — this is a major economic advantage over crowd-sourcing every lens
- Expert crowd-sourcing must clear a high bar: prove the signal justifies the cost AND that recruitment is viable at the price point
