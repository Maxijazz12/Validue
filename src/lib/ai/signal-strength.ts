import type { CampaignDraft, SignalStrengthResult, SignalTip } from "./types";
import { runQualityPass } from "./quality-pass";

/**
 * Compute signal strength from a campaign draft.
 * Always recomputes from the live draft data so the meter
 * reflects the current state, not stale initial scores.
 */
export function computeSignalStrength(draft: CampaignDraft): SignalStrengthResult {
  const { scores } = runQualityPass(draft, draft.summary);

  // Map warnings to tips
  const tips: SignalTip[] = scores.warnings.map((w) => ({
    type: w.severity === "high" ? "warning" as const : w.severity === "medium" ? "info" as const : "success" as const,
    message: w.message,
    questionId: w.questionId,
  }));

  // Add success tips for high-scoring dimensions
  if (scores.audienceClarity >= 70) {
    tips.push({ type: "success", message: "Well-defined target audience." });
  }
  if (scores.behavioralCoverage >= 70) {
    tips.push({ type: "success", message: "Good behavioral question coverage." });
  }
  if (scores.questionQuality >= 80) {
    tips.push({ type: "success", message: "Strong question quality — non-leading and specific." });
  }

  const score = scores.overall;

  let label: string;
  let color: string;
  if (score >= 75) {
    label = "Strong";
    color = "#22c55e";
  } else if (score >= 50) {
    label = "Good";
    color = "#e8b87a";
  } else if (score >= 30) {
    label = "Needs work";
    color = "#f59e0b";
  } else {
    label = "Weak";
    color = "#ef4444";
  }

  return {
    score,
    label,
    color,
    tips,
    dimensions: {
      audienceClarity: scores.audienceClarity,
      questionQuality: scores.questionQuality,
      behavioralCoverage: scores.behavioralCoverage,
      monetizationCoverage: scores.monetizationCoverage,
    },
  };
}
