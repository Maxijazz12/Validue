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
  /currently|how do you|in the past (week|month|year)|how many times|how often|what do you actually|what did you|what happened/i;

const PAIN_KEYWORDS =
  /frustrat|annoying|painful|difficult|struggle|worst part|most challenging|biggest problem|hate|waste|tedious|broken/i;

const MONETIZATION_KEYWORDS =
  /pay|price|cost|willing.*pay|budget|spend|subscribe|purchase|invest|free.*vs|how much/i;

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

/** Narrative/story prompts that are too slow for partial responses */
const NARRATIVE_PATTERNS =
  /^(walk me through|tell me about a time|describe .*process|imagine you're|think about the last time|talk me through)/i;

/** Broad exploration prompts that don't test a specific assumption */
const BROAD_EXPLORATION_PATTERNS =
  /^what tools.*(have you|do you|apps|methods)|^what have you tried/i;

/** Question patterns that produce strong disconfirmation signal */
const DISCONFIRMATION_KEYWORDS =
  /wouldn't|would.*not|main reason.*not|why.*not|what.*stop|what.*prevent|be honest/i;

const DISCONFIRMATION_OPTION_PATTERNS =
  /not (a |interested|a problem)|never|0 (times|—)|don't|doesn't apply|none of|i already|already works|works (fine|well enough)|not relevant|happy|satisfied|nothing needs to change|would(?:\s+)?not|wouldn't|too minor|too much (effort|friction)|built[- ]in is enough|provided by my company|company already provides|would never expense|won't budget|not worth fixing|not worth paying|isn't a pain point/i;

/** Behavioral frequency/recency patterns — high signal for assumption testing */
const FREQUENCY_KEYWORDS =
  /how many times|how often|in the past (week|month|year)|per (week|month|day)|last time you/i;

/* ─── Scoring Dimensions ─── */

function scoreAudienceClarity(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const { audience } = draft;
  let score = 0;
  const hasAudienceSpecificity =
    audience.expertise.length >= 1 ||
    audience.occupation.trim().length > 0 ||
    audience.nicheQualifier.trim().length > 0;

  // Core targeting fields
  if (audience.interests.length >= 1) score += 20;
  else warnings.push({ severity: "high", dimension: "audience", message: "No target interests selected — your campaign won't reach the right people." });

  if (audience.expertise.length >= 1) score += 20;
  else if (audience.occupation.trim() || audience.nicheQualifier.trim()) score += 12;
  else warnings.push({ severity: "low", dimension: "audience", message: "No target expertise set — that can be fine for broad consumer ideas, but add an occupation or niche qualifier if you can." });

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

  if (audience.interests.length > 3 && !hasAudienceSpecificity) {
    score -= 5;
    warnings.push({ severity: "low", dimension: "audience", message: "Broad interests with little audience specificity — narrow to your best 2–3 segments." });
  }

  return { score: Math.min(Math.max(score, 0), 100), warnings };
}

function scoreQuestionQuality(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;
  let score = 100; // start full, deduct for issues
  const preferredQuestionLimit = draft.format === "standard" ? 12 : 10;
  const hardQuestionLimit = draft.format === "standard" ? 14 : 12;

  const total = questions.length;
  if (total < 3) {
    score -= 20;
    warnings.push({ severity: "high", dimension: "questions", message: "Too few questions — add at least 3 for meaningful signal." });
  } else if (total < 5) {
    score -= 10;
    warnings.push({ severity: "medium", dimension: "questions", message: "Consider adding 1–2 more questions for stronger signal." });
  } else if (total > hardQuestionLimit) {
    score -= 15;
    warnings.push({
      severity: "high",
      dimension: "questions",
      message:
        draft.format === "standard"
          ? "Survey is too long for a standard run — respondent quality drops sharply past 14 questions."
          : "Survey is too long — respondent quality drops sharply past 12 questions.",
    });
  } else if (total > preferredQuestionLimit) {
    score -= 5;
    warnings.push({
      severity: "low",
      dimension: "questions",
      message:
        draft.format === "standard"
          ? "More than 12 questions risks respondent fatigue even in a standard run — consider trimming."
          : "More than 10 questions risks respondent fatigue — consider trimming.",
    });
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

  // Narrative/story prompts — penalize these heavily
  const nonBaseline = questions.filter((q) => !q.isBaseline);
  const narrativeQs = nonBaseline.filter((q) => NARRATIVE_PATTERNS.test(q.text.trim()));
  for (const q of narrativeQs) {
    score -= 10;
    warnings.push({
      severity: "medium",
      dimension: "questions",
      message: `Narrative prompt detected — replace with a specific, fast-answer question.`,
      questionId: q.id,
    });
  }

  // Broad exploration prompts
  const broadQs = nonBaseline.filter((q) => BROAD_EXPLORATION_PATTERNS.test(q.text.trim()));
  for (const q of broadQs) {
    score -= 8;
    warnings.push({
      severity: "medium",
      dimension: "questions",
      message: `Broad exploration question — narrow to test a specific assumption.`,
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

  // MCQ ratio — reward more MCQ (custom, non-baseline)
  const customMcCount = nonBaseline.filter((q) => q.type === "multiple_choice").length;
  const mcCount = questions.filter((q) => q.type === "multiple_choice").length;
  if (mcCount === 0) {
    score -= 10;
    warnings.push({ severity: "low", dimension: "questions", message: "No multiple-choice questions — add MCQ with well-designed options for faster, measurable signal." });
  }
  if (nonBaseline.length > 0 && customMcCount === 0) {
    score -= 5;
    warnings.push({ severity: "low", dimension: "questions", message: "All custom questions are open-ended — MCQ produces faster signal and enables disconfirmation." });
  }

  // MCQ option quality: check that MCQs include disconfirmation options
  const customMcqs = nonBaseline.filter((q) => q.type === "multiple_choice" && q.options);
  for (const q of customMcqs) {
    const opts = (q.options ?? []).map((o) => o.toLowerCase());
    const hasDisconfirmation = opts.some(
      (o) => DISCONFIRMATION_OPTION_PATTERNS.test(o)
    );
    if (!hasDisconfirmation) {
      score -= 5;
      warnings.push({
        severity: "medium",
        dimension: "questions",
        message: "MCQ missing a disconfirmation option — add an option that signals the assumption is wrong.",
        questionId: q.id,
      });
    }
  }

  return { score: Math.min(Math.max(score, 0), 100), warnings };
}

function scoreBehavioralCoverage(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;

  const behaviorQs = questions.filter((q) => BEHAVIOR_KEYWORDS.test(q.text));
  const painQs = questions.filter((q) => PAIN_KEYWORDS.test(q.text));
  const frequencyQs = questions.filter((q) => FREQUENCY_KEYWORDS.test(q.text));
  const disconfirmationQs = questions.filter((q) => DISCONFIRMATION_KEYWORDS.test(q.text));

  let score = 0;

  // Behavior: revealed behavior questions (what they actually did)
  if (behaviorQs.length >= 2) score += 30;
  else if (behaviorQs.length === 1) score += 20;
  else {
    warnings.push({ severity: "high", dimension: "behavioral", message: "No behavior-based questions — ask about what people actually do, not what they would do." });
  }

  // Frequency/recency: quantifiable problem occurrence
  if (frequencyQs.length >= 1) score += 20;
  else {
    warnings.push({ severity: "medium", dimension: "behavioral", message: "No frequency/recency question — add one to test whether the problem actually occurs." });
  }

  // Disconfirmation: questions that can kill assumptions
  if (disconfirmationQs.length >= 1) score += 20;
  else {
    warnings.push({ severity: "medium", dimension: "behavioral", message: "No disconfirmation question in text — add a question that explicitly invites negative responses." });
  }

  // Pain: problem severity
  if (painQs.length >= 1) score += 15;

  // Bonus for strong signal combination
  if (behaviorQs.length >= 1 && frequencyQs.length >= 1 && disconfirmationQs.length >= 1) score += 15;

  return { score: Math.min(score, 100), warnings };
}

function scoreMonetizationCoverage(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const questions = draft.questions;

  const monetizationQs = questions.filter((q) => MONETIZATION_KEYWORDS.test(q.text));
  const hasPaymentBaseline = questions.some(
    (q) => q.isBaseline && q.category === "price"
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

/* ─── Assumption Specificity Scoring ─── */

const GENERIC_OPENER =
  /^(Users want|People need|There is a market for|Customers want|Everyone needs)/i;

const FEATURE_REQUEST =
  /^(Users want|People want|Customers want) .{0,20}(feature|tool|app|product|solution)/i;

const WEASEL_WORDS =
  /\b(some|many|most|generally|probably|might|could)\b/i;

const BEHAVIORAL_VERBS =
  /\b(spend|use|pay|switch|search|try|buy|adopt|cancel|abandon|choose|prefer|track|manage|handle|solve|waste|lose|save|invest|subscribe|download|visit|complete|skip|ignore|avoid)\b/i;

const TEMPORAL_MARKERS =
  /\b(weekly|daily|monthly|per month|per week|per day|currently|right now|every|annually|quarterly|each time)\b/i;

const QUANTITATIVE_MARKERS =
  /(\d+|[$%]|\bhours?\b|\bminutes?\b|\btimes?\b)/i;

const SPECIFIC_AUDIENCE =
  /\b(freelancers?|founders?|parents?|teachers?|developers?|designers?|managers?|students?|professionals?|teams?|startups?|agencies?|creators?|marketers?|engineers?|writers?|coaches?|consultants?|retailers?|artists?)\b/i;

function scoreAssumptionSpecificity(draft: CampaignDraft): { score: number; warnings: QualityWarning[] } {
  const warnings: QualityWarning[] = [];
  const { assumptions } = draft;

  if (assumptions.length === 0) return { score: 0, warnings: [] };

  let totalScore = 0;

  for (const assumption of assumptions) {
    let s = 50; // neutral baseline

    // Vagueness deductions
    if (assumption.length < 40) s -= 15;
    if (GENERIC_OPENER.test(assumption)) s -= 20;
    if (WEASEL_WORDS.test(assumption)) s -= 10;
    if (FEATURE_REQUEST.test(assumption)) s -= 15;
    if (!BEHAVIORAL_VERBS.test(assumption)) s -= 10;

    // Specificity bonuses
    if (TEMPORAL_MARKERS.test(assumption)) s += 15;
    if (QUANTITATIVE_MARKERS.test(assumption)) s += 15;
    if (BEHAVIORAL_VERBS.test(assumption)) s += 10;
    if (SPECIFIC_AUDIENCE.test(assumption)) s += 10;

    s = Math.min(Math.max(s, 0), 100);

    if (s < 40) {
      warnings.push({
        severity: "high",
        dimension: "assumptions",
        message: `Assumption is vague — make it specific and testable: "${assumption.slice(0, 60)}…"`,
      });
    } else if (s < 60) {
      warnings.push({
        severity: "medium",
        dimension: "assumptions",
        message: `Assumption could be more specific: "${assumption.slice(0, 60)}…"`,
      });
    }

    totalScore += s;
  }

  return {
    score: Math.min(Math.max(Math.round(totalScore / assumptions.length), 0), 100),
    warnings,
  };
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

  if (baselines.length === 0) {
    warnings.push({ severity: "high", dimension: "baselines", message: "No baseline questions — at least 1 behavioral screening question is required." });
  } else if (baselines.length < 3) {
    warnings.push({ severity: "medium", dimension: "baselines", message: `Only ${baselines.length} baseline question${baselines.length === 1 ? "" : "s"} — campaigns need exactly 3 for comparable signal.` });
  }

  // Check category diversity
  const categories = new Set(baselines.map((q) => q.category).filter(Boolean));
  if (baselines.length >= 3 && categories.size < 3) {
    warnings.push({ severity: "low", dimension: "baselines", message: "Baseline questions cover the same categories — diversify for broader signal." });
  }

  return warnings;
}

/* ─── Assumption Coverage Check ─── */

function checkAssumptionCoverage(draft: CampaignDraft): QualityWarning[] {
  const warnings: QualityWarning[] = [];
  const nonBaseline = draft.questions.filter((q) => !q.isBaseline);

  // Check that every assumption has at least one question mapped to it
  for (let i = 0; i < draft.assumptions.length; i++) {
    const hasQuestion = nonBaseline.some((q) => q.assumptionIndex === i);
    if (!hasQuestion) {
      warnings.push({
        severity: "high",
        dimension: "assumptions",
        message: `Assumption "${draft.assumptions[i].slice(0, 50)}…" has no question testing it — add a question or remove the assumption.`,
      });
    }
  }

  // Check for questions with invalid assumptionIndex
  for (const q of nonBaseline) {
    if (q.assumptionIndex !== undefined && q.assumptionIndex >= draft.assumptions.length) {
      warnings.push({
        severity: "medium",
        dimension: "assumptions",
        message: `Question maps to assumption index ${q.assumptionIndex} but only ${draft.assumptions.length} assumptions exist.`,
        questionId: q.id,
      });
    }
  }

  return warnings;
}

/* ─── Evidence Category Triangulation Check ─── */

function checkEvidenceCategories(draft: CampaignDraft): QualityWarning[] {
  const warnings: QualityWarning[] = [];
  const nonBaseline = draft.questions.filter((q) => !q.isBaseline);

  let lowCategoryCount = 0;
  let noNegativeCount = 0;

  // Per-assumption: check category diversity and negative coverage
  for (let i = 0; i < draft.assumptions.length; i++) {
    const questionsForAssumption = nonBaseline.filter((q) => q.assumptionIndex === i);
    if (questionsForAssumption.length === 0) continue; // handled by checkAssumptionCoverage

    const categories = new Set(questionsForAssumption.map((q) => q.category).filter(Boolean));

    if (categories.size < 3) lowCategoryCount++;
    if (!categories.has("negative")) noNegativeCount++;
  }

  // Emit one aggregated warning per issue type
  if (lowCategoryCount > 0) {
    warnings.push({
      severity: "high",
      dimension: "evidence",
      message: lowCategoryCount === 1
        ? `1 assumption lacks evidence category triangulation — need ≥3 categories per assumption.`
        : `${lowCategoryCount} assumptions lack evidence category triangulation — need ≥3 categories each.`,
    });
  }

  if (noNegativeCount > 0) {
    warnings.push({
      severity: "high",
      dimension: "evidence",
      message: noNegativeCount === 1
        ? `1 assumption has no disconfirmation question — add a "negative" category question to test against it.`
        : `${noNegativeCount} assumptions have no disconfirmation question — add "negative" category questions.`,
    });
  }

  // Campaign-wide: warn if no negative questions at all
  const hasAnyNegative = nonBaseline.some((q) => q.category === "negative");
  if (!hasAnyNegative && noNegativeCount === 0) {
    warnings.push({
      severity: "medium",
      dimension: "evidence",
      message: "No disconfirmation questions in the campaign — add at least one to surface evidence against your assumptions.",
    });
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
  const assumptionSpec = scoreAssumptionSpecificity(patchedDraft);

  // Collect all warnings
  const allWarnings: QualityWarning[] = [
    ...audience.warnings,
    ...questionQuality.warnings,
    ...behavioral.warnings,
    ...monetization.warnings,
    ...assumptionSpec.warnings,
    ...checkAssumptions(patchedDraft),
    ...checkBaselines(patchedDraft),
    ...checkAssumptionCoverage(patchedDraft),
    ...checkEvidenceCategories(patchedDraft),
  ];

  // Weighted overall score
  const overall = Math.round(
    audience.score * 0.20 +
    questionQuality.score * 0.25 +
    behavioral.score * 0.20 +
    monetization.score * 0.20 +
    assumptionSpec.score * 0.15
  );

  const scores: QualityScores = {
    audienceClarity: audience.score,
    questionQuality: questionQuality.score,
    behavioralCoverage: behavioral.score,
    monetizationCoverage: monetization.score,
    assumptionSpecificity: assumptionSpec.score,
    overall: Math.min(Math.max(overall, 0), 100),
    warnings: allWarnings,
  };

  return {
    draft: { ...patchedDraft, qualityScores: scores },
    scores,
  };
}
