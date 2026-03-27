import Anthropic from "@anthropic-ai/sdk";

/* ─── Model Configuration ─── */

export const MODELS = {
  /** Main generation — balanced speed + quality */
  generation: "claude-sonnet-4-6" as const,
  /** Light tasks (single question regen) — fastest + cheapest */
  light: "claude-haiku-4-5-20251001" as const,
} as const;

/* ─── Singleton Client ─── */

let _client: Anthropic | null = null;

/**
 * Returns the Anthropic SDK client.
 * Reads ANTHROPIC_API_KEY from environment.
 * Throws if the key is not set — callers should catch and fall back.
 */
export function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. AI generation will use the deterministic fallback."
    );
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Check whether the API key is configured.
 * Useful for deciding whether to attempt AI generation or skip to fallback.
 */
export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
