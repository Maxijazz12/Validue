# Session Handoffs

## Prior context
Phase 1-3 complete. Phase 4 shipped.

## 2026-03-30 — Phase 2-4 marathon session

### Phase 2 (complete)
- Audience segmentation: `segment-disagreements.ts` — high-match vs low-match disagreement analysis

### Phase 3 (complete)
- Assumption specificity validation: 5th quality dimension in `quality-pass.ts`
- Better WTP probing: `bl-payment-3` (forward WTP), `bl-payment-4` (payment model), context-aware `recommendBaseline()`
- Forward price mismatch consistency gap detector
- Assumption auto-improvement: `/api/generate/assumption` route + star button in DraftReviewStep

### Phase 4 (complete) — Longitudinal Validation
- **Migration `029_longitudinal.sql`**: added `parent_campaign_id`, `round_number`, `brief_verdicts` to campaigns
- **`retestCampaign()` server action**: creates linked round 2+ campaign from completed campaign, strips/re-prefixes title, clones questions with assumption_index + anchors
- **Brief verdict persistence**: `persistVerdicts()` writes `{ recommendation, verdicts }` JSONB to campaign row on first AI synthesis (write-once, fire-and-forget)
- **Parent verdict fetching**: `synthesizeBrief()` queries parent's cached verdicts for round 2+ campaigns, passes to prompt builder
- **Prior round prompt context**: Claude sees previous verdicts and is instructed to reference changes (CHALLENGED→CONFIRMED = progress, CONFIRMED→REFUTED = reversal)
- **`RetestCampaignButton`**: blue "Retest" button on completed campaigns
- **Campaign page**: Round N badge, "Previous round" link when parent exists
- **Brief page**: "Changes from Round N-1" section with per-assumption verdict arrows (green for improvements, red for regressions, neutral for unchanged), recommendation change indicator, round number in methodology stats
- **`BriefResult`** extended with `roundNumber` and `parentVerdicts`

### Stats
- 240 tests passing across 13 test files. Lint + build clean.
- Migration pending: `029_longitudinal.sql` needs `supabase db push` or manual apply

### What's next
- Apply migration 029 to database
- Phase 5: expand signal sources (per PRODUCT.md)
- Known gap: `it.skipIf(!dbAvailable)` pattern always skips in integration tests
