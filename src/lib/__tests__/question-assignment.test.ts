import { describe, it, expect } from "vitest";
import {
  assignQuestions,
  MIN_ASSIGNED,
  MAX_ASSIGNED,
  type CampaignQuestion,
  type AssumptionCoverageCount,
  type CampaignTargeting,
} from "../question-assignment";
import type { RespondentProfile } from "../wall-ranking";

/* ─── Fixtures ─── */

function makeQuestion(overrides: Partial<CampaignQuestion> & { id: string }): CampaignQuestion {
  return {
    text: `Question ${overrides.id}`,
    type: "multiple_choice",
    category: "behavior",
    assumptionIndex: 0,
    isBaseline: false,
    sortOrder: 0,
    ...overrides,
  };
}

const baseProfile: RespondentProfile = {
  interests: ["technology", "startups"],
  expertise: ["software"],
  age_range: "25-34",
  profile_completed: true,
  reputation_score: 50,
  total_responses_completed: 5,
};

const baseTargeting: CampaignTargeting = {
  targetInterests: ["technology"],
  targetExpertise: ["software"],
  targetAgeRanges: ["25-34"],
  tags: [],
};

const emptyCoverage: AssumptionCoverageCount = {};

// 10 questions: 3 open, 7 MCQ, spread across 3 assumptions
const fullQuestionSet: CampaignQuestion[] = [
  makeQuestion({ id: "o1", type: "open", assumptionIndex: 0, category: "behavior", sortOrder: 1 }),
  makeQuestion({ id: "o2", type: "open", assumptionIndex: 1, category: "willingness_to_pay", sortOrder: 4 }),
  makeQuestion({ id: "o3", type: "open", assumptionIndex: 2, category: "need", sortOrder: 8 }),
  makeQuestion({ id: "m1", type: "multiple_choice", assumptionIndex: 0, category: "frequency", sortOrder: 2 }),
  makeQuestion({ id: "m2", type: "multiple_choice", assumptionIndex: 0, category: "behavior", sortOrder: 3 }),
  makeQuestion({ id: "m3", type: "multiple_choice", assumptionIndex: 1, category: "willingness_to_pay", sortOrder: 5 }),
  makeQuestion({ id: "m4", type: "multiple_choice", assumptionIndex: 1, category: "need", sortOrder: 6 }),
  makeQuestion({ id: "m5", type: "multiple_choice", assumptionIndex: 2, category: "frequency", sortOrder: 7 }),
  makeQuestion({ id: "m6", type: "multiple_choice", assumptionIndex: 2, category: "behavior", sortOrder: 9 }),
  makeQuestion({ id: "m7", type: "multiple_choice", assumptionIndex: null, isBaseline: true, category: null, sortOrder: 10 }),
];

/* ─── Tests ─── */

describe("assignQuestions", () => {
  it("returns null when fewer than MIN_ASSIGNED questions available", () => {
    const twoQuestions = fullQuestionSet.slice(0, 2);
    const result = assignQuestions(twoQuestions, emptyCoverage, baseProfile, baseTargeting);
    expect(result).toBeNull();
  });

  it("assigns between MIN and MAX questions", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.questionIds.length).toBeGreaterThanOrEqual(MIN_ASSIGNED);
    expect(result!.questionIds.length).toBeLessThanOrEqual(MAX_ASSIGNED);
  });

  it("guarantees at least 1 open-ended question", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.reasoning.openCount).toBeGreaterThanOrEqual(1);
  });

  it("guarantees at least 2 MCQ questions", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.reasoning.mcqCount).toBeGreaterThanOrEqual(2);
  });

  it("prioritizes assumptions with low coverage", () => {
    // Assumption 0 has 10 responses, assumptions 1 and 2 have 0
    const skewedCoverage: AssumptionCoverageCount = { 0: 10, 1: 0, 2: 0 };
    const result = assignQuestions(fullQuestionSet, skewedCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();

    // Should cover the under-served assumptions (1 and 2)
    expect(result!.reasoning.assumptionsCovered).toContain(1);
    expect(result!.reasoning.assumptionsCovered).toContain(2);
  });

  it("spreads across assumptions rather than clustering", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    // With 3 assumptions and 3-5 slots, should cover at least 2 assumptions
    expect(result!.reasoning.assumptionsCovered.length).toBeGreaterThanOrEqual(2);
  });

  it("excludes already-answered question IDs", () => {
    const exclude = new Set(["o1", "m1", "m2"]);
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting, {
      excludeQuestionIds: exclude,
    });
    expect(result).not.toBeNull();
    for (const qid of result!.questionIds) {
      expect(exclude.has(qid)).toBe(false);
    }
  });

  it("returns null when exclusions leave fewer than MIN_ASSIGNED", () => {
    // Exclude all but 2
    const exclude = new Set(fullQuestionSet.slice(2).map((q) => q.id));
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting, {
      excludeQuestionIds: exclude,
    });
    expect(result).toBeNull();
  });

  it("respects assignCount override", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting, {
      assignCount: 4,
    });
    expect(result).not.toBeNull();
    expect(result!.questionIds.length).toBe(4);
  });

  it("returns questions sorted by original sort_order", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();

    const sortOrders = result!.questionIds.map((id) => {
      const q = fullQuestionSet.find((q) => q.id === id)!;
      return q.sortOrder;
    });
    // Should be in ascending order
    for (let i = 1; i < sortOrders.length; i++) {
      expect(sortOrders[i]).toBeGreaterThanOrEqual(sortOrders[i - 1]);
    }
  });

  it("works with all-open question set (relaxes MCQ minimum)", () => {
    const allOpen: CampaignQuestion[] = [
      makeQuestion({ id: "a", type: "open", assumptionIndex: 0, sortOrder: 1 }),
      makeQuestion({ id: "b", type: "open", assumptionIndex: 1, sortOrder: 2 }),
      makeQuestion({ id: "c", type: "open", assumptionIndex: 2, sortOrder: 3 }),
    ];
    const result = assignQuestions(allOpen, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.questionIds.length).toBe(3);
  });

  it("works with all-MCQ question set (relaxes open minimum)", () => {
    const allMcq: CampaignQuestion[] = [
      makeQuestion({ id: "a", type: "multiple_choice", assumptionIndex: 0, sortOrder: 1 }),
      makeQuestion({ id: "b", type: "multiple_choice", assumptionIndex: 1, sortOrder: 2 }),
      makeQuestion({ id: "c", type: "multiple_choice", assumptionIndex: 2, sortOrder: 3 }),
    ];
    const result = assignQuestions(allMcq, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.questionIds.length).toBe(3);
  });

  it("caps baseline questions so partial assignments still include core assumption questions", () => {
    const withManyBaselines: CampaignQuestion[] = [
      makeQuestion({ id: "b1", isBaseline: true, assumptionIndex: null, category: null, sortOrder: 1 }),
      makeQuestion({ id: "b2", isBaseline: true, assumptionIndex: null, category: null, sortOrder: 2 }),
      makeQuestion({ id: "b3", isBaseline: true, assumptionIndex: null, category: null, sortOrder: 3 }),
      makeQuestion({ id: "o1", type: "open", assumptionIndex: 0, category: "behavior", sortOrder: 4 }),
      makeQuestion({ id: "m1", type: "multiple_choice", assumptionIndex: 1, category: "need", sortOrder: 5 }),
      makeQuestion({ id: "m2", type: "multiple_choice", assumptionIndex: 2, category: "willingness_to_pay", sortOrder: 6 }),
      makeQuestion({ id: "m3", type: "multiple_choice", assumptionIndex: 0, category: "frequency", sortOrder: 7 }),
    ];

    const result = assignQuestions(withManyBaselines, emptyCoverage, baseProfile, baseTargeting, {
      assignCount: 4,
    });

    expect(result).not.toBeNull();
    const assignedQuestions = withManyBaselines.filter((question) =>
      result!.questionIds.includes(question.id)
    );
    expect(assignedQuestions.filter((question) => question.isBaseline)).toHaveLength(1);
    expect(
      assignedQuestions.some(
        (question) => !question.isBaseline && question.assumptionIndex !== null
      )
    ).toBe(true);
  });

  it("handles incomplete respondent profile gracefully", () => {
    const incompleteProfile: RespondentProfile = {
      interests: [],
      expertise: [],
      age_range: null,
      profile_completed: false,
      reputation_score: 0,
      total_responses_completed: 0,
    };
    const result = assignQuestions(fullQuestionSet, emptyCoverage, incompleteProfile, baseTargeting);
    expect(result).not.toBeNull();
    expect(result!.questionIds.length).toBeGreaterThanOrEqual(MIN_ASSIGNED);
  });

  it("reasoning reports correct counts", () => {
    const result = assignQuestions(fullQuestionSet, emptyCoverage, baseProfile, baseTargeting);
    expect(result).not.toBeNull();
    const r = result!.reasoning;
    expect(r.totalCandidates).toBe(fullQuestionSet.length);
    expect(r.assignedCount).toBe(result!.questionIds.length);
    expect(r.openCount + r.mcqCount).toBe(r.assignedCount);
  });
});
