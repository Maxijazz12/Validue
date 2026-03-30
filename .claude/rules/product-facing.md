---
description: Design reference workflow and product intelligence protocol — loads when editing landing, UI, or product-facing files
globs: ["src/components/**/*.{ts,tsx}", "src/app/page.tsx", "src/app/(landing)/**", "globals.css"]
---

# Product-Facing Rules

## Design Reference Workflow

When Max references another product's design ("use Linear's design", "give this a Notion vibe"):

1. **Research** the product's design patterns via WebSearch + training knowledge
2. **Extract** relevant tokens: typography, colors, shape, spacing, motion
3. **Update DESIGN.md** under "Design References"
4. **Update `globals.css`** if new CSS variables needed
5. **Then implement** using those tokens

When reskinning multiple components, use worktree agents in parallel — each component is independent once tokens are defined. If the reference is vague ("make it more premium"), ask which product Max has in mind.

## Product Intelligence Protocol

INTELLIGENCE.md contains accumulated product lessons, evidence hierarchy, and simulation rules.

**Invoke when:** pricing/packaging decisions, landing page work, onboarding/conversion, UX flow design, trust-building, feature prioritization.

**Simulate before committing:** Spawn 3 agents with distinct founder personas (skeptical, first-time, experienced PM). Tag results [SIMULATED]. Use to narrow options and generate better real-world tests.

**After real outcomes:** Update INTELLIGENCE.md with actual data (Tier 1-2). Supersede simulated hypotheses that real data contradicts.
