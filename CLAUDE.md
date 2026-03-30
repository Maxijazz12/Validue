# Product Context

VLDTA is an assumption-testing engine for founders. AI extracts testable assumptions, real humans provide behavioral evidence, AI synthesizes a Decision Brief. See `PRODUCT.md` for roadmap, scope, and priorities.

# Critical Rules

- Follow hook messages literally
- Preserve logging, validation, RLS, and AI fallbacks when extending the system
- New AI features require deterministic fallbacks
- Treat Stripe, auth, and payout flows as state-machine-sensitive areas
- Before finishing non-trivial work, run the relevant lint/tests/checks
- Do not casually change economics, ranking, reputation, or trust mechanics
- When blocked on human input, either do durable adjacent work or say there is nothing to code yet

# Context Management

If you estimate your context usage is approaching 200k tokens, stop current work and do a clean handoff:
1. Commit any in-progress work to the current branch
2. Append a detailed handoff entry to `session-handoffs.md` (what's done, what's in progress, what remains, any tricky context the next session needs)
3. Tell the user to start a new session to continue

Do not wait for compression. Hand off early with full context rather than late with lossy context.

# Memory System

At session start, check `memory/phase-status.md` and `memory/session-handoffs.md`.
After meaningful work, **append** a dated entry to `session-handoffs.md` (never overwrite previous entries).
Keep only the last 5 entries — summarize older entries into one "prior context" line.
After major decisions, add to `memory/decision-log.md`.

# Autonomous Execution

When running headless or unsupervised:

## Workflow
- Create branch `auto/<description>` — never commit to main
- Run tests + lint before every commit; never bypass hooks
- Create PR with description when done — never merge without human approval
- Append dated entry to `session-handoffs.md` before session ends
- Use Sonnet by default, Opus for architecture decisions

## Scope
- Do only what was asked — no bonus refactoring
- If blocked or ambiguous, log and stop — do not guess

## Error Recovery
- Build failure: retry once, then stop and log
- Test failure: do not commit, investigate, log to handoff
- Migration failure: never auto-retry, wait for human
- Unknown error: stop, log full context, leave clean state

# Task Classification

- Economics files (payout-math, defaults, plan-guard, reach, reputation, wall-ranking): consider council. Read `.claude/council-protocol.md`.
- Cross-cutting or unclear **code** architecture (>3 files of code changes): plan first.
- Config, docs, rules, and settings changes: just do it — no plan mode even if >3 files.
- Broad discovery in unknown code: use subagents. Known file paths: use direct Read.
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

Safe for parallel worktrees (zero coupling): `src/components/landing/*`, `src/components/ui/*`, new API routes, new lib utilities before anything imports them, test suites in `src/lib/__tests__/`, new dashboard pages with new components.

## High-Coupling Files

Economics files are listed in `.claude/rules/economics.md` — the PreToolUse hook enforces this. Additionally: `ideas/new/actions.ts` and Stripe webhook paths are creation/payment state-sensitive.
