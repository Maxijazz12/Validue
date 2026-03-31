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

# Session Continuity

After meaningful work, append a dated entry to `memory/session-handoffs.md` (keep last 5, summarize older).
Near 200k tokens: commit work, write handoff, tell Max to start a new session.

# Autonomous Execution

When headless: branch `auto/<description>`, never commit to main, PR when done, never merge without human.
- Run tests + lint before every commit; never bypass hooks
- Do only what was asked — no bonus refactoring. If blocked, log and stop.
- Build failure: retry once then stop. Test failure: investigate, don't commit. Migration failure: wait for human.
- Append dated entry to `session-handoffs.md` before session ends.

# Task Classification

- L0 (default): just do it. Direct tools only.
- L1 (economics, architecture, pricing): hard-to-reverse — pause and reason carefully inline. No agents, just slower thinking.
- Economics files (payout-math, defaults, plan-guard, reach, reputation, wall-ranking): always L1.

# Token Efficiency

- Use Grep/Glob/Read directly. Never spawn agents unless Max explicitly asks for one.
- Use `offset+limit` for files >100 lines when you know which section you need
- After editing a file, trust your own edits — don't re-read unless something else changed it

# Architecture Core

## Critical Data Flows

Campaign creation: `scribble → AI draft → draft review → funding → webhook → publish`
Response flow: `wall → start response → save answers → submit → founder notified`
Payout flow: `rank → AI score → qualification → payout distribution → profile/reputation update`

## High-Coupling Files

Economics files: `.claude/rules/economics.md` — PreToolUse hook enforces.
Also high-coupling: `ideas/new/actions.ts`, Stripe webhook paths.
