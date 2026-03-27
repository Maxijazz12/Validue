import type { CampaignDraft } from "./types";

/**
 * Generate a campaign draft from freeform scribble text.
 * Calls the server-side API route which handles AI generation
 * and falls back to deterministic generation if needed.
 */
export async function generateCampaignDraft(
  scribbleText: string
): Promise<CampaignDraft> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scribbleText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Generation failed (${response.status})`
    );
  }

  return response.json();
}
