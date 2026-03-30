@PRODUCT.md
@ARCHITECTURE.md
@AGENTS.md

# Mandatory Document Consultation Rules

These are not optional. Skipping a required check is a protocol violation.

| Before doing... | Read first |
|---|---|
| Feature work or architecture decisions | PRODUCT.md |
| Product/UX/pricing/conversion decisions | INTELLIGENCE.md (on-demand) |
| Parallelization or file-touch decisions | ARCHITECTURE.md |
| Design or styling work | DESIGN.md (on-demand) |
| New Next.js code patterns | AGENTS.md |
| Proposing next task | PRODUCT.md phase gate status |

**When the phase gate is blocked on a human action** (e.g., "show briefs to real founders"), do NOT propose code that assumes the gate will pass. Instead: identify work that is valuable regardless of gate outcome, or explicitly state "nothing to code — waiting for real-world input."

# On-Demand Documents (loaded by hooks when relevant, not @-referenced)

These docs are NOT auto-loaded. Hooks inject reminders to read them when you touch relevant files. This keeps context lean for tasks that don't need them.

- **DESIGN.md** — Hook fires when editing `src/components/` or `globals.css`. Read it then.
- **INTELLIGENCE.md** — Hook fires when editing `landing/`, pricing, or conversion areas. Read it then.
- **COUNCIL.md** — Hook fires when council trigger hits (economics, auth, AI pipeline files). Read it then.
- **CAPABILITIES.md** — Static stack reference. Read manually only if unsure about what tools/APIs are available (rare).

# Context Management

Context thresholds and subagent offloading rules are in global `~/.claude/CLAUDE.md`. Hooks in `settings.json` enforce tool-use warnings at 40/60/80. When a warning fires: finish current action, write handoff summary, stop.

# Hook-Enforced Behaviors (Automated)

Hooks in `~/.claude/settings.json` inject system messages automatically. They guard economics files (COUNCIL REQUIRED), critical APIs/actions (HIGH-RISK), migrations (safety checklist), AI pipeline (fallback reminder), landing/UI (read DESIGN.md or INTELLIGENCE.md), plus auto-lint on every .ts/.tsx edit and test reminders every 8 edits. SessionStart loads phase status and last handoff. Context warnings fire at 40/60/80 tool uses. PreCompact/PostCompact manage session transitions.

**When a hook message fires, follow its instructions literally.** "COUNCIL REQUIRED" = stop and ask Max. "LINT ERRORS" = fix before continuing. Context warnings = follow escalation protocol in global CLAUDE.md.

**Hook verification (run after settings.json changes):** Edit defaults.ts → expect COUNCIL REQUIRED. Edit a .tsx → expect lint run. Check /tmp/claude-tool-count.txt increments. If any fail, the hook regex is broken.

## Memory System

Persistent memory lives at the project memory path (loaded via additionalDirectories). At session start, check `memory/phase-status.md` for current gate and `memory/session-handoffs.md` for continuity.

**After every session with meaningful work:** Update `memory/session-handoffs.md` with what was done, in progress (with file paths), what's next, and pending decisions.

**After every council decision:** Add entry to `memory/decision-log.md`.

# Product Vision Rule

PRODUCT.md is the canonical source of truth for what VLDTA is, what to build, what not to build, and in what order. Reference it before making architecture or feature decisions.

**When to update PRODUCT.md:** Only when Max explicitly confirms a direction change — not during exploratory brainstorming. If you think direction changed but Max didn't say so, ask: "Should I update PRODUCT.md with this?" Never encode half-formed ideas as official direction.

# Design Reference Workflow

When Max references another product, company, or website's design — whether directly ("use Linear's design") or indirectly ("make this look like Linear", "I like how Stripe does their cards", "give this a Notion vibe", "that Vercel feel") — treat it as a design reference request:

1. **Research** the product's design patterns via WebSearch + training knowledge (or screenshots if Max provides them)
2. **Extract** the relevant tokens: typography, colors, shape, spacing, motion, special treatments
3. **Update DESIGN.md** — add or update the relevant section under "Design References"
4. **Update `globals.css`** if new CSS variables or utility classes are needed
5. **Then implement** the actual component work using those tokens

When reskinning multiple components to a new reference, use worktree agents in parallel — each component is independent once the tokens are defined.

If a reference is vague ("make it more premium"), ask which product or aesthetic Max has in mind rather than guessing.

# Product Intelligence Protocol

INTELLIGENCE.md contains accumulated product lessons, evidence hierarchy, and simulation rules. Reference it before product decisions.

**When to invoke:**
- Pricing, packaging, or monetization decisions
- Landing page, onboarding, or conversion work
- UX flow design or navigation changes
- Trust-building or credibility decisions
- Feature prioritization or scope decisions
- Any work where "what actually works" matters more than "what looks right"

**When to simulate:**
- Before committing to a UX flow, landing section, or pricing structure
- Spawn 3 agents with distinct founder personas (skeptical, first-time, experienced PM)
- Tag all results as [SIMULATED] — hypotheses only
- Use to narrow options and generate better real-world tests

**After real outcomes arrive:**
- Update INTELLIGENCE.md lessons with actual data (Tier 1-2)
- Supersede any simulated hypotheses that real data contradicts
- Promote confirmed hypotheses to active lessons

# Autonomous Behaviors — Do These Without Asking
- Run `npm run lint` and `npm test` after non-trivial code changes
- Run `npm run build` when you've changed types, API routes, or server components
- Write Zod validation for any new API input
- Add rate limiting to any new public API route
- Write RLS policies for any new database table
- Create deterministic fallbacks for any new AI feature
- Log new operations through ops-logger.ts

# Lessons Learned — VLDTA-Specific

Universal lessons (N+1 queries, select("*"), atomic SQL, ReDoS, AI fallbacks) live in the global `~/.claude/CLAUDE.md`. This section is only for VLDTA-specific patterns that don't generalize.

## Dead Ends — Do Not Repeat

- **V1 power-law payouts failed.** Single-dimension scoring with threshold at 25 was unfair. V2 base+bonus with multi-criteria qualification replaced it. Do not regress.
- **`Date.now()` in server components confuses the linter** into thinking it's a hook dependency. Wrap in a `serverNow()` helper function.
- **`useEffect` for one-time localStorage sync fires twice in strict mode.** Use `useState` lazy initializer instead.
- **Test notification buttons shipped to production.** Temp dev features must be cleaned up before merging.

## Proven Patterns — Reuse These

- **Base + Bonus payout model** (`payout-math.ts`): 60/40 base/bonus split, multi-criteria qualification (score 30+, answer 50+ chars, min time, not spam). This is the economic core — extend, don't replace.
- **Confidence shrinkage toward population mean**: Low-confidence AI scores dampened toward POPULATION_MEAN_SCORE (55). Never trust AI confidence at face value.
- **Remainder reconciliation in payouts**: After rounding, adjust top earner so sum === distributable exactly. Test with tolerance ($0.02), not exact equality.
- **Hysteresis on reputation tiers**: Demote at (threshold - 5), not threshold. EMA smoothing (alpha=0.3) + confidence ramp (10 responses) prevents wild swings.
- **Wall score equivalence band (2.0 points)**: Tied scores resolved by deterministic tiebreakers (creation time, ID).
- **Subsidy multi-layer guards** (`plan-guard.ts`): Account age + zero campaigns + completed profile + flag + monthly cap. Every incentive needs anti-gaming layers.
- **Campaign expiry (7 days) + stale response cleanup (1 hour)**: The cron at `/api/cron/expire-campaigns` handles both.

## Thresholds — Empirically Derived, Not Arbitrary

These constants in `defaults.ts` are calibrated for launch:
- `QUALIFICATION_MIN_SCORE = 30` — conservative launch calibration, review after 4 weeks
- `BONUS_MIN_SCORE = 50` — below = base pay only, above = bonus pool share
- `MIN_OPEN_ANSWER_CHARS = 50` — prevents yes/no on open questions
- `MIN_RESPONSE_TIME = 45s (quick) / 90s (standard)` — catches bots
- `MIN_CASHOUT_BALANCE_CENTS = 200 ($2.00)` — Stripe fee floor
- `CAMPAIGN_EXPIRY_DAYS = 7` — prevents stale feed
- `STALE_RESPONSE_TIMEOUT_MS = 3,600,000 (1hr)` — frees abandoned slots
- `MAX_DAILY_RESPONSES = 12` — prevents farming

Do not change without data. New thresholds go in `defaults.ts` with a comment explaining why.

# Next Task Proposal

Check PRODUCT.md phase status, memory/session-handoffs.md for proposed next task, and phase-0/ artifacts to determine current state.

After completing any task:

1. **Run the learning loop** (propose CLAUDE.md updates if applicable)
2. **Assess next priority** — read PRODUCT.md build phases, check current codebase state, identify what's blocking or highest-leverage
3. **Generate the next task prompt** — write it as if a senior PM were speccing the work: clear objective, constraints, acceptance criteria, which files are likely involved
4. **Present to Max** in this format:

```
## Next: [task title]
[1-2 sentence description of what and why]

**Touches:** [key files/areas]
**Complexity:** [trivial / moderate / complex → plan mode]
**Ready to go?**
```

5. Max responds: "go", "next" (skip to different priority), or redirects

**Auto plan mode:** Enter plan mode without asking when the task touches >3 files, changes architecture, or involves new AI prompts/schemas. For trivial tasks (single file, clear change), just do it.

**Priority order** (unless Max overrides):
1. Whatever is blocking the current PRODUCT.md phase gate
2. Bugs or broken functionality
3. Highest-leverage feature for current phase
4. Tech debt that's actively causing problems
5. Polish and optimization

# Task Classification (Quick Route)

Classify every incoming task instantly. Don't re-read rules — use this table.

| If the task... | Level | Parallel? | Plan mode? |
|---|---|---|---|
| Single file, clear change | 0 | No | No |
| UI component, no shared imports | 0 | Worktree OK | No |
| New API route (standalone) | 0 | Worktree OK | No |
| Bug fix | 0 | No | No |
| Touches economics (payout-math, defaults, plan-guard, reach) | 1 council | No | Yes |
| Schema migration + code changes | 1 council | No | Yes |
| New AI feature (prompts, schemas, scoring) | 1 council | No | Yes |
| Auth/RLS changes | 1 council | No | Yes |
| Pricing/payout formula changes | 2 council | No | Yes |
| Product direction change | 3 council | No | Yes |
| Touches >3 files | — | No | Yes (auto) |
| Design reference ("make it like X") | 0 | Worktree per component | No |

**Critical path files (never parallelize against):**
Economics: payout-math.ts, defaults.ts, plan-guard.ts, reach.ts
API contracts: api/generate/route.ts, api/webhooks/stripe/route.ts
Hub actions: ideas/new/actions.ts, responses/payout-actions.ts, the-wall/[id]/actions.ts

**Safe for worktree:** landing/*, ui/*, new API routes, new lib utilities, test suites

# Post-Task Learning Loop

After tasks where something failed or a non-obvious edge case appeared — propose a CLAUDE.md update to Max. Don't silently self-edit. One-two sentences per bullet, filed under Dead Ends / Proven Patterns / Thresholds. Max 15 bullets per section. If a lesson generalizes beyond VLDTA, promote to `~/.claude/CLAUDE.md` and delete the local copy.

When CLAUDE.md or config files are updated, include them in the next git commit with a message explaining what changed.

# Pre-Commit Checklist

Before any commit, verify (in addition to universal rules in global CLAUDE.md):
- New tables have RLS policies
- New AI features have deterministic fallbacks
- No temp dev features (test buttons, console.logs, hardcoded test data)
