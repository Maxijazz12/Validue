---
description: AI pipeline module map — generation, scoring, quality, fallbacks
globs: ["src/lib/ai/**/*.ts"]
---

## AI Pipeline

- `ai/client.ts` — Claude API client, isAIAvailable(), MODELS (sonnet, haiku).
- `ai/prompts.ts` — System prompt + generation rules. Behavioral-over-opinion focus.
- `ai/schemas.ts` — Zod schemas for AI structured output.
- `ai/types.ts` — CampaignDraft, DraftQuestion, etc.
- `ai/generate-campaign.ts` — Full campaign generation via Claude.
- `ai/generate-campaign-fallback.ts` — Deterministic fallback if AI fails.
- `ai/generate-question.ts` — Single question generation.
- `ai/generate-audience.ts` — Audience targeting generation.
- `ai/quality-pass.ts` — Campaign quality scoring (audience clarity, question quality, behavioral coverage, monetization).
- `ai/rank-responses.ts` — Response quality scoring (4D: depth/relevance/authenticity/consistency) + confidence shrinkage.
- `ai/logger.ts` — AI event logging.
- `ai/sanitize-prompt.ts` — Strip user data for logging.
