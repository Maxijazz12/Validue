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
  if (scores.assumptionSpecificity >= 70) {
    tips.push({ type: "success", message: "Well-defined, testable assumptions." });
  }

  // ─── Actionable engagement tips ───
  // Reward-based tips
  if (!draft.rewardPool || draft.rewardPool === 0) {
    tips.push({ type: "warning", message: "Add a reward pool to attract 3x more responses. Even $10 makes a difference." });
  } else if (draft.rewardPool > 0 && draft.rewardPool < 25) {
    tips.push({ type: "info", message: "Campaigns with $25+ rewards fill 2x faster. Consider increasing your pool." });
  } else if (draft.rewardPool >= 50) {
    tips.push({ type: "success", message: "Strong reward — your campaign will get priority visibility on The Wall." });
  }

  // Description length
  if (draft.summary.length < 100) {
    tips.push({ type: "warning", message: "Your description is under 100 characters — longer descriptions get 40% more responses." });
  } else if (draft.summary.length >= 200) {
    tips.push({ type: "success", message: "Detailed description — respondents will understand exactly what you need." });
  }

  // Targeting tips
  const hasInterests = draft.audience.interests.length > 0;
  const hasExpertise = draft.audience.expertise.length > 0;
  const hasSpecificAudienceContext =
    hasExpertise ||
    draft.audience.occupation.trim().length > 0 ||
    draft.audience.nicheQualifier.trim().length > 0;
  if (!hasInterests && !hasSpecificAudienceContext) {
    tips.push({ type: "warning", message: "Add audience targeting (interests or expertise) to improve match quality." });
  } else if (hasInterests && hasSpecificAudienceContext) {
    tips.push({ type: "success", message: "Strong targeting — you'll reach the right respondents." });
  } else if (hasInterests) {
    tips.push({ type: "info", message: "Interests are set, but adding a niche qualifier or occupation could sharpen respondent matching." });
  }

  // Question count (exclude baselines — founder didn't choose those)
  const customQuestionCount = draft.questions.filter((q) => !q.isBaseline).length;
  if (customQuestionCount < 3) {
    tips.push({ type: "info", message: "Consider adding more questions — 4-6 custom questions is the sweet spot for actionable insights." });
  } else if (customQuestionCount > 6) {
    tips.push({ type: "warning", message: "Too many custom questions — consider trimming to your best 4-6 for higher completion rates." });
  }

  const score = scores.overall;

  let label: string;
  let color: string;
  if (score >= 75) {
    label = "Strong";
    color = "#22c55e";
  } else if (score >= 50) {
    label = "Good";
    color = "#E8725C";
  } else if (score >= 30) {
    label = "Needs work";
    color = "#E8725C";
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
      assumptionSpecificity: scores.assumptionSpecificity,
    },
  };
}
