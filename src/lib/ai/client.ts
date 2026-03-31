import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

/* ─── Model Configuration ─── */

export const MODELS = {
  /** Main generation — balanced speed + quality */
  generation: "claude-sonnet-4-6" as const,
  /** Light tasks (single question regen) — fastest + cheapest */
  light: "claude-haiku-4-5-20251001" as const,
} as const;

/* ─── Prompt Caching Helpers ─── */

/**
 * Wrap a system prompt string as a cached content block array.
 * Anthropic caches matching prefixes for 5 min at 10% of input token cost.
 */
export function cachedSystem(text: string) {
  return [
    {
      type: "text" as const,
      text,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/**
 * Add cache_control to the last tool definition (Anthropic caches by prefix,
 * so the breakpoint goes on the final static block in the request).
 */
export function cachedTools<T extends Record<string, unknown>>(tools: T[]): T[] {
  return tools.map((t, i) =>
    i === tools.length - 1
      ? { ...t, cache_control: { type: "ephemeral" as const } }
      : t
  );
}

/* ─── Singleton Client ─── */

let _client: Anthropic | null = null;

/**
 * Returns the Anthropic SDK client.
 * Reads ANTHROPIC_API_KEY from environment.
 * Throws if the key is not set — callers should catch and fall back.
 */
export function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = env().ANTHROPIC_API_KEY;
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
  return !!env().ANTHROPIC_API_KEY;
}
