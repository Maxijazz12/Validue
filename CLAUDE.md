# Product Context (full detail in PRODUCT.md — read it for feature/architecture decisions)

VLDTA is an assumption-testing engine for founders. AI extracts testable assumptions from a business idea, real humans provide behavioral evidence, AI synthesizes a Decision Brief with verdicts. The brief is the product — everything else is plumbing.

- **Current phase:** Phase 1 — Assumption extraction + Decision Brief (core pipeline committed, polish remaining)
- **Phase gate:** Phase 0 passed with caveats (2026-03-29). Brief format "The Verdict" green-lit.
- **Blocked on:** End-to-end testing with real campaign data, behavioral screening enforcement, question randomization
- **Do not build yet:** Expert respondents, dynamic exhaustion, per-lens payouts, dashboard-as-primary-UX
- **Success criteria:** Founders say the brief would have changed their decision

# Critical Rules (always obey)

- **PRODUCT.md is the canonical source of truth** for what to build, what not to build, and in what order. Reference before architecture or feature decisions.
- **When a phase gate is blocked on human action**, identify work that is valuable regardless of gate outcome, or state "nothing to code — waiting for real-world input."
- **When a hook message fires, follow its instructions literally.** COUNCIL REQUIRED = stop and ask Max. LINT ERRORS = fix before continuing. Context warnings = follow escalation protocol.

# Autonomous Behaviors — Do These Without Asking

- Apply all global proven patterns (Zod, rate limiting, RLS, fallbacks) on new code
- Log new operations through ops-logger.ts
- Before committing: verify RLS on new tables, fallbacks on AI features, no temp dev artifacts

# Document Consultation

Read PRODUCT.md before feature work, INTELLIGENCE.md before pricing/UX, DESIGN.md before styling, ARCHITECTURE.md before parallelization. These are on-demand — hooks inject reminders when you touch relevant files.

# Memory System

At session start, check `memory/phase-status.md` for current gate and `memory/session-handoffs.md` for continuity. After every session with meaningful work, update `memory/session-handoffs.md`. After every council decision, add entry to `memory/decision-log.md`.

# Task Classification

| If the task... | Level | Parallel? | Plan mode? |
|---|---|---|---|
| Single file, clear change | 0 | No | No |
| UI component, no shared imports | 0 | Worktree OK | No |
| New API route (standalone) | 0 | Worktree OK | No |
| Bug fix | 0 | No | No |
| Touches economics files | 1 council | No | Yes |
| Schema migration + code changes | 1 council | No | Yes |
| New AI feature | 1 council | No | Yes |
| Auth/RLS changes | 1 council | No | Yes |
| Pricing/payout formula changes | 2 council | No | Yes |
| Product direction change | 3 council | No | Yes |
| Touches >3 files | — | No | Yes (auto) |

# Contextual Rules

Rules auto-load via `.claude/rules/` when editing matching files: economics lessons, Next.js gotchas, architecture maps. Read ARCHITECTURE.md before parallelization decisions.
