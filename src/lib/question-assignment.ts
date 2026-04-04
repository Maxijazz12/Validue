/**
 * Question Assignment Module
 *
 * When a respondent opens a campaign in partial-response mode, this module
 * selects 3-5 questions optimized for:
 *   1. Assumption coverage — assumptions with fewest responses get priority
 *   2. Respondent match — profile dimensions vs campaign targeting per assumption
 *   3. Category diversity — mix open-ended + MCQ, spread evidence categories
 *
 * Pure logic — no DB calls. Caller fetches inputs and passes them in.
 */

import { computeMatchScore, type RespondentProfile } from "./wall-ranking";

/* ─── Config ─── */

/** Min/max questions per partial assignment */
export const MIN_ASSIGNED = 3;
export const MAX_ASSIGNED = 5;

/** Minimum total questions in a campaign before partial assignment kicks in */
export const MIN_QUESTIONS_FOR_PARTIAL_ASSIGNMENT = 6;

/** Minimum open-ended questions per assignment */
const MIN_OPEN = 1;

/** Minimum MCQ questions per assignment */
const MIN_MCQ = 2;

/** Keep screening in the mix without crowding out core assumption questions */
const MAX_BASELINE_ASSIGNED = 1;

/* ─── Types ─── */

export type CampaignQuestion = {
  id: string;
  text: string;
  type: "open" | "multiple_choice";
  category: string | null;
  assumptionIndex: number | null;
  isBaseline: boolean;
  sortOrder: number;
};

export type AssumptionCoverageCount = {
  /** assumption_index → number of submitted answers for questions testing it */
  [assumptionIndex: number]: number;
};

export type CampaignTargeting = {
  targetInterests: string[];
  targetExpertise: string[];
  targetAgeRanges: string[];
  tags: string[];
};

export type AssignmentResult = {
  questionIds: string[];
  /** Why these were chosen (for debugging/ops logging) */
  reasoning: {
    totalCandidates: number;
    assignedCount: number;
    assumptionsCovered: number[];
    openCount: number;
    mcqCount: number;
  };
};

/* ─── Scoring ─── */

/**
 * Scores a question for assignment priority. Higher = more valuable to assign.
 *
 * Components:
 * - Coverage need (0-50): inverse of how many answers this assumption already has
 * - Match quality (0-30): how well the respondent fits this question's assumption
 * - Category diversity bonus (0-20): bonus for under-represented evidence categories
 */
function scoreQuestion(
  question: CampaignQuestion,
  coverageCounts: AssumptionCoverageCount,
  respondentMatch: number,
  assignedCategories: Set<string>,
  assignedAssumptions: Set<number>
): number {
  let score = 0;

  // Coverage need: assumptions with fewer responses get priority
  if (question.assumptionIndex !== null) {
    const count = coverageCounts[question.assumptionIndex] ?? 0;
    // Inverse coverage: 0 responses = 50 pts, 10+ responses = 0 pts
    score += Math.max(0, 50 - count * 5);

    // Penalty for already-assigned assumptions (spread across assumptions)
    if (assignedAssumptions.has(question.assumptionIndex)) {
      score -= 15;
    }
  } else {
    // Baseline questions with no assumption: moderate priority
    score += 20;
  }

  // Match quality: respondent fit (0-30)
  score += (respondentMatch / 100) * 30;

  // Category diversity: bonus for categories not yet assigned
  const cat = question.category ?? "behavior";
  if (!assignedCategories.has(cat)) {
    score += 20;
  }

  return score;
}

/* ─── Main Assignment ─── */

/**
 * Assigns 3-5 questions from a campaign to a respondent.
 *
 * Algorithm:
 * 1. Separate questions into open-ended and MCQ pools
 * 2. Guarantee minimums: at least 1 open + 2 MCQ
 * 3. Fill remaining slots by score (coverage need × match × diversity)
 * 4. Exclude any question IDs the respondent already answered
 *
 * Returns null if not enough questions are available for a valid assignment.
 */
export function assignQuestions(
  questions: CampaignQuestion[],
  coverageCounts: AssumptionCoverageCount,
  profile: RespondentProfile,
  targeting: CampaignTargeting,
  options?: {
    /** Question IDs the respondent has already answered (e.g. from reciprocal) */
    excludeQuestionIds?: Set<string>;
    /** Override assignment size (default: computed from question count) */
    assignCount?: number;
  }
): AssignmentResult | null {
  const exclude = options?.excludeQuestionIds ?? new Set();

  // Filter to available questions
  const available = questions.filter((q) => !exclude.has(q.id));

  if (available.length < MIN_ASSIGNED) {
    return null; // Not enough questions for a valid partial assignment
  }

  // Compute respondent match score once (campaign-level)
  const matchScore = computeMatchScore(
    {
      target_interests: targeting.targetInterests,
      target_expertise: targeting.targetExpertise,
      target_age_ranges: targeting.targetAgeRanges,
      tags: targeting.tags,
    },
    profile
  );

  // Determine assignment size
  const targetCount = options?.assignCount
    ?? Math.min(MAX_ASSIGNED, Math.max(MIN_ASSIGNED, Math.ceil(available.length * 0.3)));

  // Split into pools
  const openPool = available.filter((q) => q.type === "open");
  const mcqPool = available.filter((q) => q.type === "multiple_choice");

  const assigned: CampaignQuestion[] = [];
  const assignedCategories = new Set<string>();
  const assignedAssumptions = new Set<number>();

  // Helper: pick best from a pool by score, remove from pool
  function pickBest(pool: CampaignQuestion[]): CampaignQuestion | null {
    if (pool.length === 0) return null;

    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const s = scoreQuestion(
        pool[i],
        coverageCounts,
        matchScore,
        assignedCategories,
        assignedAssumptions
      );
      if (s > bestScore || (s === bestScore && Math.random() > 0.5)) {
        bestScore = s;
        bestIdx = i;
      }
    }

    const picked = pool[bestIdx];
    pool.splice(bestIdx, 1);
    return picked;
  }

  function addToAssigned(q: CampaignQuestion) {
    assigned.push(q);
    if (q.category) assignedCategories.add(q.category);
    if (q.assumptionIndex !== null) assignedAssumptions.add(q.assumptionIndex);
  }

  // Step 0: Always include baseline (screening) questions first
  const baselineQuestions = available.filter((q) => q.isBaseline);
  const assignedIds = new Set<string>();
  const baselinePool = [...baselineQuestions];
  const baselineLimit = Math.min(targetCount, MAX_BASELINE_ASSIGNED);
  for (let i = 0; i < baselineLimit; i++) {
    const bq = pickBest(baselinePool);
    if (!bq) break;
    if (assigned.length >= targetCount) break;
    addToAssigned(bq);
    assignedIds.add(bq.id);
  }
  // Remove baseline questions from type pools so they aren't double-picked
  const removeAssigned = (pool: CampaignQuestion[]) => {
    for (let i = pool.length - 1; i >= 0; i--) {
      if (assignedIds.has(pool[i].id)) pool.splice(i, 1);
    }
  };
  removeAssigned(openPool);
  removeAssigned(mcqPool);

  // Step 1: Guarantee type minimums

  // At least MIN_OPEN open-ended questions (beyond any baselines already assigned)
  const openNeeded = Math.min(
    Math.max(0, MIN_OPEN - assigned.filter((q) => q.type === "open").length),
    openPool.length
  );
  for (let i = 0; i < openNeeded; i++) {
    const q = pickBest(openPool);
    if (q) addToAssigned(q);
  }

  // At least MIN_MCQ MCQ questions (beyond any baselines already assigned)
  const mcqNeeded = Math.min(
    Math.max(0, MIN_MCQ - assigned.filter((q) => q.type === "multiple_choice").length),
    mcqPool.length
  );
  for (let i = 0; i < mcqNeeded; i++) {
    const q = pickBest(mcqPool);
    if (q) addToAssigned(q);
  }

  // Step 2: Fill remaining slots from combined pool by score
  const remaining = [...openPool, ...mcqPool];
  while (assigned.length < targetCount && remaining.length > 0) {
    const q = pickBest(remaining);
    if (q) addToAssigned(q);
  }

  if (assigned.length < MIN_ASSIGNED) {
    return null;
  }

  // Sort by original sort_order for consistent respondent experience
  assigned.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    questionIds: assigned.map((q) => q.id),
    reasoning: {
      totalCandidates: available.length,
      assignedCount: assigned.length,
      assumptionsCovered: [...assignedAssumptions].sort((a, b) => a - b),
      openCount: assigned.filter((q) => q.type === "open").length,
      mcqCount: assigned.filter((q) => q.type === "multiple_choice").length,
    },
  };
}
