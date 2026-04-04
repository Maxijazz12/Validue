import { describe, expect, it } from "vitest";
import {
  buildCopiedCampaignDraft,
  buildCopiedQuestionRecords,
  buildDraftFromStoredCampaign,
  buildPersistedCampaignDraft,
  buildPersistedQuestionRecords,
} from "../campaign-draft-persistence";
import type { CampaignDraft } from "../ai/types";

const qualityScores = {
  audienceClarity: 81,
  questionQuality: 77,
  behavioralCoverage: 72,
  monetizationCoverage: 68,
  assumptionSpecificity: 79,
  overall: 76,
  warnings: [],
};

const sampleDraft: CampaignDraft = {
  title: "Warehouse forecasting tool",
  summary: "Planning software for small distributors",
  category: "SaaS",
  tags: ["forecasting", "ops"],
  assumptions: ["Teams still update stock plans by hand", "   "],
  questions: [
    {
      id: "q-1",
      text: "How do you forecast inventory right now?",
      type: "open",
      options: null,
      section: "baseline",
      isBaseline: true,
      category: "behavior",
      assumptionIndex: 0,
      anchors: ["Tool used", "How often", "Biggest pain"],
    },
    {
      id: "q-2",
      text: "Would you pay for automated alerts?",
      type: "multiple_choice",
      options: ["Yes", "No"],
      section: "followup",
      isBaseline: false,
      category: "willingness",
      assumptionIndex: 0,
      anchors: null,
    },
  ],
  audience: {
    interests: ["Operations"],
    expertise: ["Supply Chain"],
    ageRanges: ["25-34"],
    location: "Oslo",
    occupation: "Operations Manager",
    industry: "Retail",
    experienceLevel: "Mid",
    nicheQualifier: "SMB",
  },
  qualityScores,
  rewardPool: 24,
  format: "standard",
  rewardType: "top_only",
  bonusAvailable: true,
  rewardsTopAnswers: true,
};

describe("campaign draft persistence helpers", () => {
  it("normalizes draft payloads for persistence", () => {
    const persisted = buildPersistedCampaignDraft(sampleDraft);
    const questions = buildPersistedQuestionRecords(sampleDraft.questions);

    expect(persisted).toMatchObject({
      title: sampleDraft.title,
      summary: sampleDraft.summary,
      category: sampleDraft.category,
      estimatedMinutes: 5,
      rewardAmount: 24,
      rewardType: "top_only",
      bonusAvailable: true,
      rewardsTopAnswers: true,
      format: "standard",
      keyAssumptions: ["Teams still update stock plans by hand"],
      targetInterests: ["Operations"],
      targetExpertise: ["Supply Chain"],
      targetAgeRanges: ["25-34"],
      targetLocation: "Oslo",
      audienceOccupation: "Operations Manager",
      audienceIndustry: "Retail",
      audienceExperienceLevel: "Mid",
      audienceNicheQualifier: "SMB",
      qualityScore: 76,
    });
    expect(persisted.qualityScoresJson).toBe(JSON.stringify(qualityScores));

    expect(questions).toMatchObject([
      {
        text: sampleDraft.questions[0].text,
        sortOrder: 0,
        isBaseline: true,
        category: "behavior",
        assumptionIndex: 0,
        anchors: ["Tool used", "How often", "Biggest pain"],
      },
      {
        text: sampleDraft.questions[1].text,
        type: "multiple_choice",
        sortOrder: 1,
        options: ["Yes", "No"],
        category: "willingness",
      },
    ]);
  });

  it("preserves cloned campaign fields that drafts depend on", () => {
    const copied = buildCopiedCampaignDraft(
      {
        title: "Original title",
        description: "Original summary",
        category: "Fintech",
        tags: ["finops"],
        reward_amount: 32,
        reward_type: "top_only",
        bonus_available: true,
        rewards_top_answers: true,
        format: null,
        estimated_minutes: 5,
        key_assumptions: ["Teams still reconcile manually"],
        target_interests: ["Finance"],
        target_expertise: ["Accounting"],
        target_age_ranges: ["35-44"],
        target_location: "London",
        audience_occupation: "Finance lead",
        audience_industry: "SaaS",
        audience_experience_level: "Senior",
        audience_niche_qualifier: "B2B",
        quality_scores: qualityScores,
        quality_score: 76,
      },
      {
        title: "Round 2: Original title",
        rewardAmount: 0,
      }
    );

    expect(copied).toMatchObject({
      title: "Round 2: Original title",
      summary: "Original summary",
      format: "standard",
      estimatedMinutes: 5,
      rewardAmount: 0,
      rewardType: "top_only",
      bonusAvailable: true,
      rewardsTopAnswers: true,
      targetInterests: ["Finance"],
      targetExpertise: ["Accounting"],
      targetAgeRanges: ["35-44"],
      targetLocation: "London",
      audienceOccupation: "Finance lead",
      audienceIndustry: "SaaS",
      audienceExperienceLevel: "Senior",
      audienceNicheQualifier: "B2B",
      keyAssumptions: ["Teams still reconcile manually"],
      qualityScore: 76,
    });
  });

  it("round-trips stored campaign/question records back into an editable draft", () => {
    const storedCampaign = {
      title: "Pricing interview sprint",
      description: "Test willingness-to-pay before building",
      category: "Research",
      tags: ["pricing"],
      reward_amount: 18,
      reward_type: "pool",
      bonus_available: false,
      rewards_top_answers: false,
      format: null,
      estimated_minutes: 5,
      key_assumptions: ["Users already budget for this"],
      target_interests: ["Startups"],
      target_expertise: ["Product"],
      target_age_ranges: ["25-34"],
      target_location: "Berlin",
      audience_occupation: "Founder",
      audience_industry: "SaaS",
      audience_experience_level: "Senior",
      audience_niche_qualifier: "Bootstrapped",
      quality_scores: qualityScores,
      quality_score: 76,
    };
    const storedQuestions = [
      {
        text: "What do you use now?",
        type: "open",
        sort_order: 0,
        options: null,
        is_baseline: true,
        category: "behavior",
        assumption_index: 0,
        anchors: ["Tool", "Frequency"],
      },
      {
        text: "Would $20/month feel reasonable?",
        type: "multiple_choice",
        sort_order: 1,
        options: ["Yes", "No"],
        is_baseline: false,
        category: "price",
        assumption_index: 0,
        anchors: null,
      },
    ];

    const copiedQuestions = buildCopiedQuestionRecords(storedQuestions);
    const draft = buildDraftFromStoredCampaign(storedCampaign, storedQuestions);

    expect(copiedQuestions).toMatchObject([
      {
        sortOrder: 0,
        category: "behavior",
        assumptionIndex: 0,
        anchors: ["Tool", "Frequency"],
      },
      {
        sortOrder: 1,
        type: "multiple_choice",
        options: ["Yes", "No"],
        category: "price",
      },
    ]);

    expect(draft).toMatchObject({
      title: storedCampaign.title,
      summary: storedCampaign.description,
      format: "standard",
      rewardPool: 18,
      audience: {
        interests: ["Startups"],
        expertise: ["Product"],
        ageRanges: ["25-34"],
        location: "Berlin",
        occupation: "Founder",
        industry: "SaaS",
        experienceLevel: "Senior",
        nicheQualifier: "Bootstrapped",
      },
      qualityScores,
    });
    expect(draft.questions).toHaveLength(2);
    expect(draft.questions[0]).toMatchObject({
      text: "What do you use now?",
      section: "baseline",
      isBaseline: true,
      category: "behavior",
      assumptionIndex: 0,
      anchors: ["Tool", "Frequency"],
    });
    expect(draft.questions[1]).toMatchObject({
      text: "Would $20/month feel reasonable?",
      type: "multiple_choice",
      options: ["Yes", "No"],
      category: "price",
      assumptionIndex: 0,
    });
  });
});
