import type { CampaignDraft, QualityScores, QualityWarning } from "./types";

/* ─── Helpers ─── */

function getWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
}

function wordOverlap(a: string, b: string): number {
  const wa = getWords(a);
  const wb = getWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  // V2: Use max denominator to prevent short questions from falsely matching long ones
  return shared / Math.max(wa.size, wb.size);
}

const BEHAVIOR_KEYWORDS =
  /currently|how do you|walk me through|when do you|day-to-day|what does .* look like|tell me about your|describe .* process|how often/i;

const PAIN_KEYWORDS =
  /frustrat|annoying|painful|difficult|struggle|worst part|most challenging|biggest problem|hate|waste|tedious|broken/i;

const MONETIZATION_KEYWORDS =
  /pay|price|cost|willing.*pay|budget|spend|subscribe|purchase|invest|free.*vs/i;

const LEADING_PATTERNS =
  /^(don't you|wouldn't you|isn't it|aren't you|shouldn't|can't you|won't you|doesn't it|isn't that)/i;

const HYPOTHETICAL_PATTERNS =
  /^(would you|could you|might you|if you could|imagine if|what if you)/i;

const GENERIC_PATTERNS = [
  /^what do you think\??$/i,
  /^any thoughts\??$/i,
  /^how do you feel about this\??$/i,
  /^what's your opinion\??$/i,
  /^do you like this idea\??$/i,
];

/* ─── Scoring Dimensions ─── */

function scoreAudienceClarity(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const { audience } = draft;
  let score = 0;

  // Core targeting fields
  if (audience.interests.length >= 1) score += 20;
  else warnings.push({ severity: "high", dimension: "audience", message: "No target interests selected — your campaign won't reach the right people." });

  if (audience.expertise.length >= 1) score += 20;
  else warnings.push({ severity: "medium", dimension: "audience", message: "No target expertise set — consider who can give you the most useful feedback." });

  if (audience.ageRanges.length >= 1) score += 10;

  // Specificity bonus
  if (audience.location.trim()) score += 15;
  if (audience.occupation.trim()) score += 15;
  if (audience.industry.trim()) score += 10;
  if (audience.nicheQualifier.trim()) score += 10;

  // Penalize over-broad targeting
  if (audience.interests.length > 5) {
    score -= 15;
    warnings.push({ severity: "medium", dimension: "audience", message: "Too many interest tags — narrow to 2–3 for more targeted feedback." });
  }

  if (audience.expertise.length > 4) {
    score -= 10;
    warnings.push({ severity: "low", dimension: "audience", message: "Consider narrowing expertise to your ideal respondent profile." });
  }

  return { score: Math.min(Math.max(score, 0), 100), warnings };
}

function scoreQuestionQuality(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;
  let score = 100; // start full, deduct for issues

  // V2: Gentler count penalty — focused short surveys shouldn't be punished
  const total = questions.length;
  if (total < 3) {
    score -= 20;
    warnings.push({ severity: "high", dimension: "questions", message: "Too few questions — add at least 3 for meaningful signal." });
  } else if (total < 5) {
    score -= 10;
    warnings.push({ severity: "medium", dimension: "questions", message: "Consider adding 1–2 more questions for stronger signal." });
  } else if (total > 12) {
    score -= 15;
    warnings.push({ severity: "high", dimension: "questions", message: "Survey is too long — respondent quality drops sharply past 12 questions." });
  } else if (total > 10) {
    score -= 5;
    warnings.push({ severity: "low", dimension: "questions", message: "More than 10 questions risks respondent fatigue — consider trimming." });
  }

  // Leading questions
  const leadingQs = questions.filter((q) => LEADING_PATTERNS.test(q.text.trim()));
  for (const q of leadingQs) {
    score -= 15;
    warnings.push({
      severity: "high",
      dimension: "questions",
      message: `Leading question detected — rephrase for neutral wording.`,
      questionId: q.id,
    });
  }

  // Generic questions
  for (const q of questions) {
    if (q.text.length < 40 || GENERIC_PATTERNS.some((p) => p.test(q.text.trim()))) {
      if (!q.isBaseline) {
        score -= 10;
        warnings.push({
          severity: "medium",
          dimension: "questions",
          message: `This question is too generic — make it specific to your idea.`,
          questionId: q.id,
        });
      }
    }
  }

  // Hypothetical density
  const nonBaseline = questions.filter((q) => !q.isBaseline);
  const hypotheticalCount = nonBaseline.filter((q) => HYPOTHETICAL_PATTERNS.test(q.text.trim())).length;
  if (nonBaseline.length > 0 && hypotheticalCount / nonBaseline.length > 0.5) {
    score -= 15;
    warnings.push({ severity: "medium", dimension: "questions", message: "Over half your questions are hypothetical — add more behavior-based questions." });
  }

  // Redundancy
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      if (wordOverlap(questions[i].text, questions[j].text) > 0.6) {
        score -= 10;
        warnings.push({
          severity: "medium",
          dimension: "questions",
          message: `These two questions overlap — consider removing or rewording one.`,
          questionId: questions[j].id,
        });
      }
    }
  }

  // Quant/qual balance
  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;
  if (total > 0) {
    const mcRatio = mcCount / total;
    if (mcRatio === 0) {
      score -= 10;
      warnings.push({ severity: "low", dimension: "questions", message: "No quantitative questions — add at least one for measurable signal." });
    } else if (mcRatio > 0.6) {
      score -= 5;
      warnings.push({ severity: "low", dimension: "questions", message: "Heavy on multiple-choice — open-ended questions give richer insight." });
    }
  }

  return { score: Math.min(Math.max(score, 0), 100), warnings };
}

function scoreBehavioralCoverage(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;

  const behaviorQs = questions.filter((q) => BEHAVIOR_KEYWORDS.test(q.text));
  const painQs = questions.filter((q) => PAIN_KEYWORDS.test(q.text));

  let score = 0;

  if (behaviorQs.length >= 2) score += 50;
  else if (behaviorQs.length === 1) score += 30;
  else {
    warnings.push({ severity: "high", dimension: "behavioral", message: "No behavior-based questions — ask about current habits, not hypothetical preferences." });
  }

  if (painQs.length >= 1) score += 30;
  else {
    warnings.push({ severity: "medium", dimension: "behavioral", message: "No pain/urgency questions — ask about frustrations or frequency to gauge real need." });
  }

  // Bonus for behavior + pain combo
  if (behaviorQs.length >= 1 && painQs.length >= 1) score += 20;

  return { score: Math.min(score, 100), warnings };
}

function scoreMonetizationCoverage(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;

  const monetizationQs = questions.filter((q) => MONETIZATION_KEYWORDS.test(q.text));
  const hasPaymentBaseline = questions.some(
    (q) => q.isBaseline && q.category === "payment"
  );

  let score = 0;

  if (hasPaymentBaseline) score += 40;
  if (monetizationQs.length >= 1) score += 40;
  else {
    warnings.push({
      severity: "low",
      dimension: "monetization",
      message: "No pricing signal — consider adding a willingness-to-pay question or baseline.",
    });
  }

  // Bonus for both custom + baseline payment coverage
  if (hasPaymentBaseline && monetizationQs.length >= 1) score += 20;

  // If the idea explicitly mentions pricing, weight this higher
  if (MONETIZATION_KEYWORDS.test(draft.summary)) {
    if (monetizationQs.length === 0 && !hasPaymentBaseline) {
      warnings.push({
        severity: "medium",
        dimension: "monetization",
        message: "Your idea mentions pricing but your survey doesn't test willingness to pay.",
      });
    }
  }

  return { score: Math.min(score, 100), warnings };
}

/* ─── Assumption Quality Check ─── */

function checkAssumptions(draft: CampaignDraft): QualityWarning[] {
  const warnings: QualityWarning[] = [];

  if (draft.assumptions.length === 0) {
    warnings.push({ severity: "high", dimension: "assumptions", message: "No assumptions listed — define what you're testing." });
  } else if (draft.assumptions.length === 1) {
    warnings.push({ severity: "medium", dimension: "assumptions", message: "Only one assumption — add 2–4 more for a stronger validation." });
  }

  for (const a of draft.assumptions) {
    if (a.includes("?")) {
      warnings.push({ severity: "low", dimension: "assumptions", message: `Assumptions should be statements, not questions: "${a.slice(0, 60)}…"` });
    }
  }

  return warnings;
}

/* ─── Baseline Validation ─── */

function checkBaselines(draft: CampaignDraft): QualityWarning[] {
  const warnings: QualityWarning[] = [];
  const baselines = draft.questions.filter((q) => q.isBaseline);

  if (baselines.length < 3) {
    warnings.push({ severity: "medium", dimension: "baselines", message: `Only ${baselines.length} baseline question${baselines.length === 1 ? "" : "s"} — campaigns need exactly 3 for comparable signal.` });
  }

  // Check category diversity
  const categories = new Set(baselines.map((q) => q.category).filter(Boolean));
  if (baselines.length >= 3 && categories.size < 3) {
    warnings.push({ severity: "low", dimension: "baselines", message: "Baseline questions cover the same categories — diversify for broader signal." });
  }

  return warnings;
}

/* ─── Main Quality Pass ─── */

export interface QualityPassResult {
  draft: CampaignDraft;
  scores: QualityScores;
}

/**
 * Run a deterministic quality evaluation on a campaign draft.
 * Returns the draft with qualityScores attached, plus auto-patched assumptions.
 */
export function runQualityPass(
  draft: CampaignDraft,
  _scribbleText: string
): QualityPassResult {
  // Auto-patch: strip trailing "?" from assumptions
  const patchedAssumptions = draft.assumptions.map((a) =>
    a.endsWith("?") ? a.slice(0, -1).trim() : a
  );

  const patchedDraft: CampaignDraft = {
    ...draft,
    assumptions: patchedAssumptions,
  };

  // Score each dimension
  const audience = scoreAudienceClarity(patchedDraft);
  const questionQuality = scoreQuestionQuality(patchedDraft);
  const behavioral = scoreBehavioralCoverage(patchedDraft);
  const monetization = scoreMonetizationCoverage(patchedDraft);

  // Collect all warnings
  const allWarnings: QualityWarning[] = [
    ...audience.warnings,
    ...questionQuality.warnings,
    ...behavioral.warnings,
    ...monetization.warnings,
    ...checkAssumptions(patchedDraft),
    ...checkBaselines(patchedDraft),
  ];

  // Weighted overall score
  const overall = Math.round(
    audience.score * 0.25 +
    questionQuality.score * 0.30 +
    behavioral.score * 0.25 +
    monetization.score * 0.20
  );

  const scores: QualityScores = {
    audienceClarity: audience.score,
    questionQuality: questionQuality.score,
    behavioralCoverage: behavioral.score,
    monetizationCoverage: monetization.score,
    overall: Math.min(Math.max(overall, 0), 100),
    warnings: allWarnings,
  };

  return {
    draft: { ...patchedDraft, qualityScores: scores },
    scores,
  };
}
