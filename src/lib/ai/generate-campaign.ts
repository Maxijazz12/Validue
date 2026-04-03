import type { GenerateCampaignResponse } from "./types";

/**
 * Generate a campaign draft from freeform scribble text.
 * Calls the server-side API route which handles AI generation
 * and falls back to deterministic generation if needed.
 */
export async function generateCampaignDraft(
  scribbleText: string
): Promise<GenerateCampaignResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65_000);
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scribbleText }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Generation timed out. Please try again.");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Generation failed (${response.status})`
    );
  }

  return response.json();
}
