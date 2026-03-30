# Product Context

VLDTA is an assumption-testing engine for founders. AI extracts testable assumptions from an idea, real humans provide behavioral evidence, and AI synthesizes a Decision Brief. The brief is the product; everything else is supporting machinery.

- Current phase: Phase 1 — assumption extraction + Decision Brief
- Blockers: end-to-end testing with real data, behavioral screening enforcement, question randomization
- Do not build yet: expert respondents, dynamic exhaustion, per-lens payouts, dashboard-as-primary UX
- Success criterion: founders say the brief would have changed their decision

# Critical Rules

- For roadmap, scope, and priority decisions, consult `PRODUCT.md`
- When blocked on human input, either do durable adjacent work or say there is nothing to code yet
- Follow hook messages literally
- Preserve logging, validation, RLS, and AI fallbacks when extending the system
- Before finishing non-trivial work, run the relevant lint/tests/checks
- Do not casually change economics, ranking, reputation, or trust mechanics

# Memory System

At session start, check `memory/phase-status.md` and `memory/session-handoffs.md`.
After meaningful work, update `session-handoffs.md`.
After major decisions, add to `memory/decision-log.md`.

# Task Classification

- Economics files (payout-math, defaults, plan-guard, reach, reputation, wall-ranking): consider council. Read `.claude/council-protocol.md`.
- Cross-cutting or unclear architectural work (>3 files): plan first.
- Broad discovery, option comparison, or deep review: use subagents.
- Everything else: just do it.

# Architecture Core

## Critical Data Flows

Campaign creation: `scribble → AI draft → draft review → funding → webhook → publish`
Response flow: `wall → start response → save answers → submit → founder notified`
Payout flow: `rank → AI score → qualification → payout distribution → profile/reputation update`

## Parallelization

- Default: single agent with subagents
- Use subagents for discovery, comparison, review, or clearly separable leaf tasks
- Use worktrees only for genuinely independent work with zero shared files
- Stay inline for sequential or tightly coupled edits
- Never parallelize shared files or uncertain coupling

## High-Coupling Files

- `defaults.ts` — thresholds and constants, high cascade risk
- `payout-math.ts` — payout invariants
- `plan-guard.ts` — plan/subsidy gating
- `reputation.ts` / `reputation-config.ts` — trust stability
- `wall-ranking.ts` — feed fairness
- `ideas/new/actions.ts` and Stripe webhook paths — creation/payment state changes
