import { describe, it, expect } from "vitest";
import { runQualityPass } from "../ai/quality-pass";
import type { CampaignDraft, DraftQuestion, EvidenceCategory } from "../ai/types";
import { BASELINE_QUESTIONS } from "../baseline-questions";

/* ─── Helpers ─── */

function makeDraft(overrides: Partial<CampaignDraft> = {}): CampaignDraft {
  return {
    title: "Test Campaign",
    summary: "A test idea for validation.",
    category: "Technology",
    tags: ["Students"],
    assumptions: [
      "Users currently solve this with manual workarounds",
      "Users are willing to pay for a better solution",
      "The problem occurs frequently enough to justify a product",
    ],
    questions: [
      makeOpenQuestion(0, "Walk me through the last time you tried to handle this problem — what tools did you use and where did you give up?", 0, "behavior"),
      makeOpenQuestion(1, "What tools or services have you tried for this? What made you stop using them?", 0, "attempts"),
      makeOpenQuestion(2, "What would make you NOT switch from your current approach, even if a better option existed?", 0, "negative"),
      makeOpenQuestion(3, "How much have you spent trying to solve this problem in the past year?", 1, "price"),
      makeOpenQuestion(4, "Think about this past week. How many times did you run into this issue, and what did you do each time?", 2, "pain"),
      makeFollowupQuestion(5, "When was the last time you searched for a better solution? What did you find and why didn't it work?", 1, "attempts"),
      makeFollowupQuestion(6, "What's the biggest reason you might NOT pay for a solution to this?", 1, "negative"),
      makeFollowupQuestion(7, "How willing would you be to try a new tool for this, even if it meant changing your workflow?", 2, "willingness"),
      makeFollowupQuestion(8, "What if the solution made things worse — what's the downside risk you'd worry about?", 2, "negative"),
      ...makeBaselineQuestions(),
    ],
    audience: {
      interests: ["Technology"],
      expertise: ["Founder"],
      ageRanges: ["18-24", "25-34"],
      location: "",
      occupation: "",
      industry: "",
      experienceLevel: "",
      nicheQualifier: "",
    },
    ...overrides,
  };
}

function makeOpenQuestion(idx: number, text: string, assumptionIndex: number, category: EvidenceCategory = "behavior"): DraftQuestion {
  return {
    id: `q-open-${idx}`,
    text,
    type: "open",
    options: null,
    section: "open",
    isBaseline: false,
    assumptionIndex,
    anchors: ["Include: specific tools or apps you used", "Mention: how often and how long ago"],
    category,
  };
}

function makeFollowupQuestion(idx: number, text: string, assumptionIndex: number, category: EvidenceCategory = "negative"): DraftQuestion {
  return {
    id: `q-followup-${idx}`,
    text,
    type: "open",
    options: null,
    section: "followup",
    isBaseline: false,
    assumptionIndex,
    anchors: ["Include: what you tried and what happened", "Mention: specific outcomes"],
    category,
  };
}

function makeBaselineQuestions(): DraftQuestion[] {
  const picks = [BASELINE_QUESTIONS[0], BASELINE_QUESTIONS[4], BASELINE_QUESTIONS[6]];
  return picks.map((bq) => ({
    id: `q-bl-${bq.id}`,
    text: bq.text,
    type: "multiple_choice" as const,
    options: bq.options,
    section: "baseline" as const,
    isBaseline: true,
    baselineId: bq.id,
    category: bq.category,
  }));
}

/* ─── Tests ─── */

describe("generation-quality: baseline questions are behavioral", () => {
  it("no baseline question starts with 'Would you'", () => {
    for (const q of BASELINE_QUESTIONS) {
      expect(q.text).not.toMatch(/^Would you/i);
    }
  });

  it("no baseline question starts with 'Do you think'", () => {
    for (const q of BASELINE_QUESTIONS) {
      expect(q.text).not.toMatch(/^Do you think/i);
    }
  });

  it("no baseline question uses hypothetical framing", () => {
    for (const q of BASELINE_QUESTIONS) {
      expect(q.text).not.toMatch(/^If this existed/i);
      expect(q.text).not.toMatch(/^Imagine if/i);
    }
  });

  it("all baseline questions have at least 3 options", () => {
    for (const q of BASELINE_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("baseline categories cover core evidence types", () => {
    const categories = new Set(BASELINE_QUESTIONS.map((q) => q.category));
    expect(categories).toContain("willingness");
    expect(categories).toContain("price");
    expect(categories).toContain("behavior");
    expect(categories).toContain("pain");
  });
});

describe("generation-quality: assumption coverage", () => {
  it("quality pass passes a well-formed draft with full assumption coverage", () => {
    const draft = makeDraft();
    const { scores } = runQualityPass(draft, "test scribble about a tool for students");
    expect(scores.overall).toBeGreaterThan(50);
    // No high-severity assumption warnings
    const assumptionWarnings = scores.warnings.filter(
      (w) => w.dimension === "assumptions" && w.severity === "high"
    );
    expect(assumptionWarnings).toHaveLength(0);
  });

  it("quality pass warns when an assumption has no mapped question", () => {
    const draft = makeDraft({
      assumptions: [
        "Users currently solve this with manual workarounds",
        "Users are willing to pay for a better solution",
        "The problem occurs frequently enough to justify a product",
        "Users prefer mobile over desktop for this workflow", // no question maps to index 3
      ],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const unmappedWarnings = scores.warnings.filter(
      (w) => w.dimension === "assumptions" && w.message.includes("no question testing it")
    );
    expect(unmappedWarnings.length).toBeGreaterThan(0);
  });

  it("quality pass warns on invalid assumptionIndex", () => {
    const draft = makeDraft();
    // Add a question with an out-of-bounds assumptionIndex
    draft.questions.push({
      id: "q-bad-idx",
      text: "What tools do you use for this?",
      type: "open",
      options: null,
      section: "open",
      isBaseline: false,
      assumptionIndex: 99, // way out of bounds
      anchors: ["Include: tool names"],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const idxWarnings = scores.warnings.filter(
      (w) => w.message.includes("assumption index")
    );
    expect(idxWarnings.length).toBeGreaterThan(0);
  });
});

describe("generation-quality: baseline enforcement", () => {
  it("flags high severity when zero baseline questions", () => {
    const draft = makeDraft({
      questions: [
        makeOpenQuestion(0, "Walk me through the last time you tried to handle this problem.", 0),
        makeOpenQuestion(1, "How many times did you run into this issue this week?", 1),
        makeFollowupQuestion(2, "When was the last time you searched for a better solution?", 2),
        // No baseline questions
      ],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const baselineWarnings = scores.warnings.filter(
      (w) => w.dimension === "baselines" && w.severity === "high"
    );
    expect(baselineWarnings).toHaveLength(1);
    expect(baselineWarnings[0].message).toContain("No baseline questions");
  });

  it("flags medium severity when fewer than 3 baseline questions", () => {
    const draft = makeDraft({
      questions: [
        makeOpenQuestion(0, "Walk me through the last time you tried to handle this problem.", 0),
        ...makeBaselineQuestions().slice(0, 1), // Only 1 baseline
      ],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const mediumWarnings = scores.warnings.filter(
      (w) => w.dimension === "baselines" && w.severity === "medium"
    );
    expect(mediumWarnings).toHaveLength(1);
  });
});

describe("generation-quality: evidence category triangulation", () => {
  it("well-formed draft has no evidence category warnings", () => {
    const draft = makeDraft(); // default has ≥3 categories per assumption + negative per assumption
    const { scores } = runQualityPass(draft, "test scribble");
    const evidenceWarnings = scores.warnings.filter((w) => w.dimension === "evidence");
    expect(evidenceWarnings).toHaveLength(0);
  });

  it("warns when assumption has fewer than 3 evidence categories", () => {
    const draft = makeDraft({
      questions: [
        // Assumption 0: only 2 categories (behavior + behavior = 1 distinct)
        makeOpenQuestion(0, "Walk me through how you handle this today.", 0, "behavior"),
        makeOpenQuestion(1, "What does your typical workflow look like?", 0, "behavior"),
        makeFollowupQuestion(2, "What would stop you from switching?", 0, "negative"),
        ...makeBaselineQuestions(),
      ],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const categoryWarnings = scores.warnings.filter(
      (w) => w.dimension === "evidence" && w.message.includes("triangulation")
    );
    expect(categoryWarnings.length).toBeGreaterThan(0);
  });

  it("warns when assumption has no negative question", () => {
    const draft = makeDraft({
      questions: [
        makeOpenQuestion(0, "Walk me through how you handle this today.", 0, "behavior"),
        makeOpenQuestion(1, "What tools have you tried for this?", 0, "attempts"),
        makeOpenQuestion(2, "How much have you spent on this?", 0, "price"),
        // No negative category for assumption 0
        ...makeBaselineQuestions(),
      ],
    });
    const { scores } = runQualityPass(draft, "test scribble");
    const negativeWarnings = scores.warnings.filter(
      (w) => w.dimension === "evidence" && w.message.includes("disconfirmation")
    );
    expect(negativeWarnings.length).toBeGreaterThan(0);
  });
});

describe("generation-quality: question quality checks", () => {
  it("detects leading questions", () => {
    const draft = makeDraft();
    draft.questions.push({
      id: "q-leading",
      text: "Don't you think this would be useful for students?",
      type: "open",
      options: null,
      section: "open",
      isBaseline: false,
      assumptionIndex: 0,
    });
    const { scores } = runQualityPass(draft, "test");
    const leadingWarnings = scores.warnings.filter(
      (w) => w.message.includes("Leading question")
    );
    expect(leadingWarnings.length).toBeGreaterThan(0);
  });

  it("penalizes too many hypothetical questions", () => {
    const draft = makeDraft({
      questions: [
        { id: "q1", text: "Would you use a tool that helps you plan meals automatically?", type: "open", options: null, section: "open", isBaseline: false, assumptionIndex: 0, anchors: ["test"] },
        { id: "q2", text: "Could you see yourself paying for something like this monthly?", type: "open", options: null, section: "open", isBaseline: false, assumptionIndex: 1, anchors: ["test"] },
        { id: "q3", text: "Would you recommend this kind of tool to a friend?", type: "open", options: null, section: "followup", isBaseline: false, assumptionIndex: 2, anchors: ["test"] },
        ...makeBaselineQuestions(),
      ],
    });
    const { scores } = runQualityPass(draft, "test");
    const hypotheticalWarnings = scores.warnings.filter(
      (w) => w.message.includes("hypothetical")
    );
    expect(hypotheticalWarnings.length).toBeGreaterThan(0);
  });

  it("rewards behavioral questions with high behavioral coverage score", () => {
    const draft = makeDraft(); // default draft has behavioral questions
    const { scores } = runQualityPass(draft, "test scribble about a tool");
    expect(scores.behavioralCoverage).toBeGreaterThanOrEqual(50);
  });
});

describe("generation-quality: DraftQuestion type supports new fields", () => {
  it("assumptionIndex is preserved on DraftQuestion", () => {
    const q = makeOpenQuestion(0, "test question", 2);
    expect(q.assumptionIndex).toBe(2);
  });

  it("anchors are preserved on DraftQuestion", () => {
    const q = makeOpenQuestion(0, "test question", 0);
    expect(q.anchors).toHaveLength(2);
    expect(q.anchors![0]).toContain("Include:");
  });
});
