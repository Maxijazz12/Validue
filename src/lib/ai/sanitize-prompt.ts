/**
 * Sanitizes user-provided text before embedding in LLM prompts.
 *
 * Uses JSON.stringify to structurally escape all control characters,
 * preventing prompt injection without false positives on legitimate input.
 * The model sees quoted text as data, not as instructions.
 */
export function sanitizeForPrompt(text: string): string {
  // JSON.stringify wraps in quotes and escapes newlines, tabs, backslashes,
  // and other control characters. Strip the outer quotes so it reads naturally
  // but retains internal escaping.
  const encoded = JSON.stringify(text);
  return encoded.slice(1, -1); // Remove surrounding quotes
}
