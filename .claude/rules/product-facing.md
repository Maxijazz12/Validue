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

## Product Intelligence

Read INTELLIGENCE.md before pricing/packaging, landing page, onboarding/conversion, or UX flow decisions.
