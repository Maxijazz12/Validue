# VLDTA Architecture Reference

Core architecture (data flows, parallelization, high-coupling files) is in CLAUDE.md. This file is detailed reference only.

## Safe for Parallel Worktrees (Zero Coupling)

- `src/components/landing/*` — independent UI module
- `src/components/ui/*` — pure components, no action imports
- New API routes that don't modify existing routes
- New lib utilities before anything imports them
- Test suites in `src/lib/__tests__/`
- New dashboard pages with new components

## Database Tables

Core: campaigns, questions, responses, answers, payouts, profiles, subscriptions
Supporting: notifications, campaign_reactions, reach_impressions

Key columns: campaigns.economics_version (1 or 2), responses.money_state (pending_qualification → locked → available → paid_out), profiles.reputation_tier (new/bronze/silver/gold/platinum)
