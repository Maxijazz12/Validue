@PRODUCT.md
@CAPABILITIES.md
@ARCHITECTURE.md
@AGENTS.md
@DESIGN.md
@INTELLIGENCE.md

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

# Parallelization Rules

## When to use subagents (within one session)
- **Explore agents**: Codebase research, dependency mapping, finding existing patterns. Launch 2-3 in parallel when scope is uncertain.
- **Plan agents**: Architecture design after exploration. One at a time — they need Explore results as input.
- **Background agents**: Run tests, lint, or build verification while continuing other work.

## When to use worktree isolation
Use `isolation: "worktree"` when building a feature that is genuinely independent — new page + new API route + new lib utility that don't modify existing shared files. The agent gets a full repo copy and works on a branch.

Good candidates for worktree agents:
- New landing page sections (`src/components/landing/` — 14 files, zero coupling)
- New API endpoints that don't modify existing routes
- New lib utilities before anything imports them
- Pure UI components (`src/components/ui/` — no action imports)
- Test suites for existing code

## When NOT to parallelize
- **Economics logic** (`payout-math.ts`, `defaults.ts`, `plan-guard.ts`, `reach.ts`) — this is the critical path. 5% of files, 80% of merge conflict risk. Always sequential.
- **Server actions** — 12 action files are imported by 17+ components. Two agents modifying different actions that share lib imports will collide.
- **Any task where files overlap** — if two agents would edit the same file, run sequentially.
- **Tasks that are tightly sequential** — if step 2 depends on step 1's output, don't force parallelism.

## Default: single agent with subagents
Most VLDTA tasks are tightly coupled enough that one agent with Explore/Plan subagents is the right call. Only escalate to worktree agents when you can clearly identify independent work streams that touch zero shared files.

## LLM Council — Execution Rules

Full protocol in `COUNCIL.md` — read it when a council is triggered. These are not suggestions — when a trigger is hit, execute the protocol automatically.

- **Level 0 (default):** UI, API, migrations, components, tests, refactors. Single agent. Just build.
- **Level 1 (fan-out):** Schema changes to campaigns/responses/payouts, new cron/webhook logic, auth/RLS changes, competing technical approaches. Launch 3 subagents with varied framing, synthesize, pick one.
- **Level 2 (multi-model):** Changes to `payout-math.ts`, new scoring algorithms, pricing/economics changes, AI synthesis prompt design. Run Level 1 first, then give Max the problem statement for ChatGPT verification.
- **Level 3 (full council):** V2→V3 economics, launch pricing, core pivots. Level 1 + Level 2 + synthesis memo + sleep on it.

# Autonomous Workflow — Self-Driving Mode

After completing any task, automatically:

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

After non-trivial tasks where something failed, a non-obvious edge case appeared, or a new pattern emerged — propose a CLAUDE.md update to Max. Don't silently self-edit. One-two sentences per bullet, filed under Dead Ends / Proven Patterns / Thresholds. Max 15 bullets per section. If a lesson generalizes beyond VLDTA, promote to `~/.claude/CLAUDE.md` and delete the local copy.

When CLAUDE.md or config files are updated, include them in the next git commit with a message explaining what changed.

# Pre-Commit Checklist

Before any commit, verify:
- No `select("*")` in new/modified Supabase queries
- New API routes have Zod validation + rate limiting
- New tables have RLS policies
- New AI features have deterministic fallbacks
- No temp dev features (test buttons, console.logs, hardcoded test data)
