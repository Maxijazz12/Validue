import type { DraftQuestion, DraftAudience } from "./types";

/**
 * Regenerate a single question via the server-side AI API.
 * Sends full campaign context for coherent, campaign-aware regeneration.
 */
export async function regenerateQuestion(
  scribbleText: string,
  currentQuestion: DraftQuestion,
  allQuestions: DraftQuestion[],
  campaignSummary?: string,
  assumptions?: string[],
  audience?: DraftAudience
): Promise<DraftQuestion> {
  const response = await fetch("/api/generate/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scribbleText,
      campaignSummary: campaignSummary ?? "",
      assumptions: assumptions ?? [],
      audience: audience ?? null,
      currentQuestion,
      allQuestions,
    }),
  });

  if (!response.ok) {
    throw new Error(`Question regeneration failed (${response.status})`);
  }

  return response.json();
}
