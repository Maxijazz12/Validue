import type { DraftAudience, DraftQuestion } from "./types";

/**
 * Suggest improved audience targeting via the server-side AI API.
 * Sends assumptions and questions for context-aware improvement.
 */
export async function improveAudience(
  scribbleText: string,
  currentAudience: DraftAudience,
  assumptions?: string[],
  questions?: DraftQuestion[]
): Promise<DraftAudience> {
  const response = await fetch("/api/generate/audience", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scribbleText,
      currentAudience,
      assumptions: assumptions ?? [],
      questions: questions ?? [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Audience improvement failed (${response.status})`);
  }

  return response.json();
}
