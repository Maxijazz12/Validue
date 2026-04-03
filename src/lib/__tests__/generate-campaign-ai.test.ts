import { describe, expect, it } from "vitest";
import { GenerateCampaignAIError, adaptAICampaignDraft } from "../ai/generate-campaign-ai";
import { repairCampaignDraft } from "../ai/repair-campaign-draft";
import { runQualityPass } from "../ai/quality-pass";
import type { AICampaignDraftRaw } from "../ai/schemas";

function makeRawDraft(
  overrides: Partial<AICampaignDraftRaw> = {}
): AICampaignDraftRaw {
  return {
    title: "AI Research Copilot for Students",
    summary:
      "A research assistant that helps students summarize papers, compare claims, and save time while studying for exams.",
    category: "Education",
    tags: ["Students", "Researchers", "Exam Prep"],
    assumptions: [
      "University students currently spend more than 2 hours per week summarizing dense reading materials by hand.",
      "Students who already use study tools would pay at least $10/month for a research copilot that saves them time.",
      "Students trust AI-generated summaries enough to use them as a first-pass study aid during exam season.",
    ],
    openQuestions: [
      {
        text: "In the past week, how many times did you manually summarize an article, paper, or chapter for class?",
        section: "open",
        questionType: "multiple_choice",
        options: ["0 times", "1-2 times", "3-5 times", "6+ times"],
        assumptionIndex: 0,
        evidenceCategory: "behavior",
      },
      {
        text: "What is the main reason you would keep your current study workflow instead of switching to a new AI tool?",
        section: "open",
        questionType: "multiple_choice",
        options: [
          "My current workflow is already good enough",
          "I do not trust AI summaries",
          "Setup would take too much effort",
          "I rarely need this kind of help",
        ],
        assumptionIndex: 0,
        evidenceCategory: "negative",
      },
      {
        text: "What did you try the last time you needed to understand a hard reading assignment quickly?",
        section: "open",
        questionType: "open",
        assumptionIndex: 0,
        anchors: ["Name the app, tool, or workflow", "Include how long it took"],
        evidenceCategory: "attempts",
      },
      {
        text: "How much would you realistically pay per month for a tool that cuts reading-summary time in half?",
        section: "open",
        questionType: "multiple_choice",
        options: ["$0 - I would not pay", "Under $10/month", "$10-$20/month", "$20+/month"],
        assumptionIndex: 1,
        evidenceCategory: "price",
      },
    ],
    followupQuestions: [
      {
        text: "If you stopped using an AI study tool after trying it, what was the biggest reason?",
        section: "followup",
        questionType: "open",
        assumptionIndex: 2,
        anchors: ["Mention the tool if you remember it", "Include what made you stop"],
        evidenceCategory: "negative",
      },
    ],
    baselineQuestionIds: ["bl-behavior-2", "bl-payment-3", "bl-willingness-1"],
    audience: {
      interests: ["Education"],
      expertise: ["Student"],
      ageRanges: ["18-24"],
      location: "",
      occupation: "University student",
      industry: "Education",
      experienceLevel: "",
      nicheQualifier: "Exam-heavy university courses",
    },
    ...overrides,
  };
}

function makeSuiteRawDraft(
  draft: Omit<AICampaignDraftRaw, "baselineQuestionIds"> & {
    baselineQuestionIds?: AICampaignDraftRaw["baselineQuestionIds"];
  }
): AICampaignDraftRaw {
  return {
    ...draft,
    baselineQuestionIds: draft.baselineQuestionIds ?? [
      "bl-behavior-2",
      "bl-payment-3",
      "bl-willingness-1",
    ],
  };
}

const promptSuite = [
  {
    name: "meeting assistant",
    scribble:
      "meeting copilot that joins zoom and spits out action items so managers stop losing follow-ups after calls",
    expected: {
      retainTag: "Remote Teams",
      retainInterest: "SaaS",
      expertise: [],
    },
    raw: makeSuiteRawDraft({
      title: "  AI Meeting Assistant for Action Items  ",
      summary:
        "  A meeting copilot that joins Zoom, Teams, and Meet calls to capture decisions, owners, and follow-ups right after the call. It is built for managers and operators who are tired of post-meeting admin work.  ",
      category: "SaaS",
      tags: ["Managers", " Knowledge Workers ", "Remote Teams"],
      assumptions: [
        "Managers running 5+ remote meetings per week currently lose at least one action item or decision every week because follow-up capture is manual.",
        "Teams already using docs or notes apps would pay $10-20/month per seat for automatic action-item extraction if it saved 30+ minutes of admin time per week.",
        "IT-heavy organizations currently delay adopting new meeting tooling for at least one quarter because security review and rollout friction are slow.",
      ],
      openQuestions: [
        {
          text: "In the past 2 weeks, how many meetings ended without a clear written list of decisions or owners?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "0 meetings - we already close this loop well",
            "1-2 meetings",
            "3-5 meetings",
            "6+ meetings",
          ],
          assumptionIndex: 0,
          evidenceCategory: "behavior",
        },
        {
          text: "What do you currently rely on to capture action items after meetings?",
          section: "open",
          questionType: "open",
          assumptionIndex: 0,
          anchors: ["Name the tool, doc, or person", "Include what usually gets missed"],
          evidenceCategory: "attempts",
        },
        {
          text: "What is the strongest reason you would NOT switch away from your current meeting follow-up process?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Our current process already works well enough",
            "AI summaries are too risky to trust",
            "Switching tools would create adoption overhead",
            "We do not have enough meetings for this to matter",
          ],
          assumptionIndex: 0,
          evidenceCategory: "negative",
        },
        {
          text: "How painful is it when meeting follow-ups are missed or delayed today?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Not painful - we recover easily",
            "Minor annoyance",
            "Noticeable wasted time each week",
            "It regularly causes dropped work or confusion",
          ],
          assumptionIndex: 0,
          evidenceCategory: "pain",
        },
      ],
      followupQuestions: [
        {
          text: "How much would your team realistically pay per seat each month for a tool that sends accurate action items within 2 minutes of every meeting ending?",
          section: "followup",
          questionType: "multiple_choice",
          options: [
            "$0 - we'd stick with our current workflow",
            "Under $10/month",
            "$10-20/month",
            "$20+/month",
          ],
          assumptionIndex: 1,
          evidenceCategory: "price",
        },
      ],
      audience: {
        interests: ["SaaS"],
        expertise: ["Founder"],
        ageRanges: ["25-34", "35-44"],
        location: "Global",
        occupation: "Manager or operator",
        industry: "Technology",
        experienceLevel: "Mid-level (3–5 years)",
        nicheQualifier: "Attends 5+ video meetings per week",
      },
    }),
  },
  {
    name: "adaptive workout planner",
    scribble:
      "ai workout planner that adapts to home equipment injuries and time so people stop quitting generic plans",
    expected: {
      retainTag: "Home Workout Users",
      retainInterest: "Health",
      expertise: [],
    },
    raw: makeSuiteRawDraft({
      title: "Adaptive Workout Planner for Busy Home Exercisers",
      summary:
        "A workout planner that adapts each session around the equipment you have, the time you actually have today, and any injuries or soreness you are managing.",
      category: "Health",
      tags: ["Fitness Enthusiasts", "Home Workout Users", "Busy Professionals"],
      assumptions: [
        "Adults exercising at home currently skip or modify at least one planned workout per week because their program does not match available equipment or time.",
        "People who have managed an injury in the past 12 months currently improvise workouts weekly because most fitness apps do not adapt to physical restrictions.",
        "Home fitness users already paying $10-30/month for programs would switch to an adaptive planner at the same price if it personalized the first workout immediately.",
      ],
      openQuestions: [
        {
          text: "In the past month, how many workouts did you skip or modify because the plan did not fit your equipment, time, or how your body felt?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "0 workouts - my current plan already fits",
            "1-2 workouts",
            "3-5 workouts",
            "6+ workouts",
          ],
          assumptionIndex: 0,
          evidenceCategory: "behavior",
        },
        {
          text: "How do you usually handle a workout that clashes with an injury, soreness, or missing equipment?",
          section: "open",
          questionType: "open",
          assumptionIndex: 1,
          anchors: ["Name the workaround or tool", "Include what you do next"],
          evidenceCategory: "attempts",
        },
        {
          text: "What is the main reason you would keep your current workout app or routine instead of switching to a new planner?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "My current setup already works well enough",
            "I don't trust AI with injury safety",
            "I do not train consistently enough to need this",
            "Switching would be too much effort",
          ],
          assumptionIndex: 1,
          evidenceCategory: "negative",
        },
        {
          text: "What is the biggest cost when a workout plan does not adapt to your real constraints?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "No real cost - I adjust easily",
            "A little extra planning time",
            "I skip part of the workout",
            "I abandon the session entirely",
          ],
          assumptionIndex: 1,
          evidenceCategory: "pain",
        },
      ],
      followupQuestions: [
        {
          text: "How much would you realistically pay per month for a planner that adapts each workout around your equipment, soreness, and schedule on the same day?",
          section: "followup",
          questionType: "multiple_choice",
          options: [
            "$0 - I would not pay for this",
            "$5-10/month",
            "$10-20/month",
            "$20+/month",
          ],
          assumptionIndex: 2,
          evidenceCategory: "price",
        },
      ],
      audience: {
        interests: ["Health", "Consumer", "AI/ML"],
        expertise: ["Founder"],
        ageRanges: ["25-34", "35-44"],
        location: "",
        occupation: "Working professional",
        industry: "Healthcare",
        experienceLevel: "",
        nicheQualifier: "Exercises at home with limited equipment",
      },
    }),
  },
  {
    name: "family travel planner",
    scribble:
      "trip planner for parents with toddlers that builds realistic itineraries around naps snacks and meltdown windows",
    expected: {
      retainTag: "Parents",
      retainInterest: "Consumer",
      expertise: [],
    },
    raw: makeSuiteRawDraft({
      title: "Family Travel Planner for Parents With Toddlers",
      summary:
        "A travel planning assistant that builds realistic itineraries around naps, snacks, stroller logistics, and meltdown windows so parents stop planning fantasy trips they cannot actually execute.",
      category: "Consumer",
      tags: ["Parents", "Family Travelers", "Toddler Parents"],
      assumptions: [
        "Parents traveling with kids under 5 currently abandon or heavily rewrite at least one itinerary per trip because generic travel plans ignore naps, meals, and stroller logistics.",
        "Parents who spend 2+ hours planning family trips today would pay for a planner that produces realistic toddler-friendly schedules in one sitting.",
        "Families already using Google Docs and saved lists currently keep planning manually because existing travel apps optimize for adults instead of young kids.",
      ],
      openQuestions: [
        {
          text: "On your last family trip with a child under 5, how much of the original daily plan did you end up changing or dropping?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "None - our plan worked fine",
            "A small part",
            "About half of it",
            "Most of it",
          ],
          assumptionIndex: 0,
          evidenceCategory: "behavior",
        },
        {
          text: "What do you use today to plan travel days around naps, meals, and child logistics?",
          section: "open",
          questionType: "open",
          assumptionIndex: 2,
          anchors: ["Name the doc, app, or routine", "Include what still feels messy"],
          evidenceCategory: "attempts",
        },
        {
          text: "What is the biggest reason you would NOT switch away from your current family-trip planning workflow?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Our current planning method already works",
            "Trips with kids are too unpredictable for a tool to help",
            "Planning is not painful enough to pay for",
            "I only take a few trips a year",
          ],
          assumptionIndex: 2,
          evidenceCategory: "negative",
        },
        {
          text: "What is the biggest cost when a travel day is planned for adults instead of your child’s real needs?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Not much - we adjust easily",
            "A little wasted time",
            "One parent ends up stressed or carrying the day",
            "The day falls apart entirely",
          ],
          assumptionIndex: 0,
          evidenceCategory: "pain",
        },
      ],
      followupQuestions: [
        {
          text: "How much would you pay for a planner that gave you a realistic toddler-friendly itinerary in one sitting before a trip?",
          section: "followup",
          questionType: "multiple_choice",
          options: [
            "$0 - I would keep planning manually",
            "$5-10 per trip",
            "$10-25 per trip",
            "$25+/trip",
          ],
          assumptionIndex: 1,
          evidenceCategory: "price",
        },
      ],
      audience: {
        interests: ["Consumer"],
        expertise: ["Founder"],
        ageRanges: ["25-34", "35-44"],
        location: "USA",
        occupation: "Parent",
        industry: "",
        experienceLevel: "",
        nicheQualifier: "Travels with children under 5",
      },
    }),
  },
  {
    name: "creator sponsorship manager",
    scribble:
      "crm for creators to keep sponsor leads from getting lost across gmail instagram and notion and know which brand deals to chase",
    expected: {
      retainTag: "Creators",
      retainInterest: "Creator Economy",
      expertise: [],
    },
    raw: makeSuiteRawDraft({
      title: "Sponsorship Inbox for Creators",
      summary:
        "A sponsorship inbox that pulls brand leads from email, DMs, and notes into one view so creators stop losing deals and can see which conversations are worth chasing.",
      category: "Other",
      tags: ["Creators", "Brand Partnerships", "Talent Managers"],
      assumptions: [
        "Independent creators with 3+ active brand conversations currently lose at least one sponsor lead per month because outreach is split across inboxes and DMs.",
        "Creators already using spreadsheets or Notion to track deals would pay monthly for a unified sponsorship inbox if it increased close rate or reduced follow-up time.",
        "Talent managers would not adopt a creator CRM unless it also shows deal stage and expected payout clearly.",
      ],
      openQuestions: [
        {
          text: "In the past month, how many sponsor leads or follow-ups have you lost track of across email, DMs, or notes?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "0 - my current system works well",
            "1 lead",
            "2-3 leads",
            "4+ leads",
          ],
          assumptionIndex: 0,
          evidenceCategory: "behavior",
        },
        {
          text: "What do you currently use to track brand conversations and follow-ups?",
          section: "open",
          questionType: "open",
          assumptionIndex: 0,
          anchors: ["Name the tools or docs", "Include what still falls through the cracks"],
          evidenceCategory: "attempts",
        },
        {
          text: "What is the biggest reason you would keep your current sponsorship tracking workflow instead of switching?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "My current setup already works fine",
            "I don't manage enough deals to need this",
            "A CRM would add more admin than it removes",
            "I only need occasional reminders",
          ],
          assumptionIndex: 0,
          evidenceCategory: "negative",
        },
        {
          text: "What is the biggest cost when a brand follow-up slips through the cracks?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "No real cost",
            "Some wasted time",
            "I lose negotiating leverage",
            "I lose the deal or miss money",
          ],
          assumptionIndex: 0,
          evidenceCategory: "pain",
        },
      ],
      followupQuestions: [
        {
          text: "How much would you pay per month for one place to manage sponsor conversations, deal stage, and next steps?",
          section: "followup",
          questionType: "multiple_choice",
          options: [
            "$0 - I'd keep using spreadsheets or DMs",
            "$10-20/month",
            "$20-50/month",
            "$50+/month",
          ],
          assumptionIndex: 8,
          evidenceCategory: "price",
        },
      ],
      audience: {
        interests: ["Creator Economy", "SaaS"],
        expertise: ["Founder"],
        ageRanges: ["18-24", "25-34"],
        location: "Global",
        occupation: "Independent creator",
        industry: "Media & Entertainment",
        experienceLevel: "",
        nicheQualifier: "Has active brand partnerships",
      },
    }),
  },
  {
    name: "restaurant inventory copilot",
    scribble:
      "inventory ordering copilot for small restaurants so chefs stop running out or overordering because ordering is still gut feel and spreadsheets",
    expected: {
      retainTag: "Restaurant Operators",
      retainInterest: "Food & Bev",
      expertise: ["Operations"],
    },
    raw: makeSuiteRawDraft({
      title: "Inventory Copilot for Independent Restaurants",
      summary:
        "An ordering copilot for small restaurants that turns sales patterns and current stock into smarter purchase suggestions so teams stop relying on gut feel and stale spreadsheets.",
      category: "Other",
      tags: ["Restaurant Operators", "Chefs", "Food & Bev Managers"],
      assumptions: [
        "Independent restaurant operators currently run out of key ingredients at least once per week because ordering is based on gut feel or stale spreadsheets.",
        "Back-of-house teams already spending 2+ hours per week on ordering would pay for a tool that reduced stockouts and over-ordering within the first month.",
        "Chefs would reject a new ordering tool if it could not explain why it recommended a quantity in plain language.",
      ],
      openQuestions: [
        {
          text: "In the past month, how often did your team run out of an ingredient you expected to have on hand?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Never - our current ordering works well",
            "1-2 times",
            "About once a week",
            "Multiple times a week",
          ],
          assumptionIndex: 0,
          evidenceCategory: "behavior",
        },
        {
          text: "What do you currently rely on to decide how much inventory to order each week?",
          section: "open",
          questionType: "open",
          assumptionIndex: 0,
          anchors: ["Name the spreadsheet, vendor system, or habit", "Include what still breaks"],
          evidenceCategory: "attempts",
        },
        {
          text: "What is the strongest reason you would NOT switch away from your current ordering workflow?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Our current process already works well enough",
            "I don't trust software to understand service reality",
            "Training the team would take too much effort",
            "We don't have enough ordering complexity to need this",
          ],
          assumptionIndex: 0,
          evidenceCategory: "negative",
        },
        {
          text: "What is the biggest cost when your ordering is wrong today?",
          section: "open",
          questionType: "multiple_choice",
          options: [
            "Not much - we can adjust quickly",
            "Some extra waste",
            "A stressful service or menu compromise",
            "Meaningful lost revenue or margin",
          ],
          assumptionIndex: 0,
          evidenceCategory: "pain",
        },
      ],
      followupQuestions: [
        {
          text: "How much would you pay each month for ordering suggestions that cut stockouts and over-ordering without adding more admin time?",
          section: "followup",
          questionType: "multiple_choice",
          options: [
            "$0 - we'd keep using our current process",
            "$20-50/month",
            "$50-100/month",
            "$100+/month",
          ],
          assumptionIndex: 1,
          evidenceCategory: "price",
        },
      ],
      audience: {
        interests: ["Food & Bev", "Marketplace"],
        expertise: ["Operations"],
        ageRanges: ["25-34", "35-44", "45-54"],
        location: "USA",
        occupation: "Restaurant owner or chef",
        industry: "Food & Beverage",
        experienceLevel: "Mid-level (3–5 years)",
        nicheQualifier: "Independent restaurant with weekly ordering responsibility",
      },
    }),
  },
] as const;

describe("adaptAICampaignDraft", () => {
  it("maps a validated AI tool payload into a CampaignDraft", () => {
    const draft = adaptAICampaignDraft(makeRawDraft());

    expect(draft.title).toBe("AI Research Copilot for Students");
    expect(draft.questions).toHaveLength(8);
    expect(draft.questions.filter((question) => question.isBaseline)).toHaveLength(3);
    expect(draft.questions[0].type).toBe("multiple_choice");
    expect(draft.questions[2].type).toBe("open");
    expect(draft.questions[2].anchors).toEqual([
      "Name the app, tool, or workflow",
      "Include how long it took",
    ]);
    expect(draft.audience.occupation).toBe("University student");
    expect(draft.format).toBe("quick");
  });

  it("rejects unknown baseline IDs as validation failures", () => {
    expect(() =>
      adaptAICampaignDraft(
        makeRawDraft({
          baselineQuestionIds: ["bl-behavior-2", "bl-payment-3", "not-a-real-id"],
        })
      )
    ).toThrowError(GenerateCampaignAIError);

    try {
      adaptAICampaignDraft(
        makeRawDraft({
          baselineQuestionIds: ["bl-behavior-2", "bl-payment-3", "not-a-real-id"],
        })
      );
    } catch (error) {
      expect(error).toBeInstanceOf(GenerateCampaignAIError);
      expect((error as GenerateCampaignAIError).reason).toBe("validation_failed");
    }
  });

  it("rejects duplicate baseline IDs", () => {
    expect(() =>
      adaptAICampaignDraft(
        makeRawDraft({
          baselineQuestionIds: ["bl-behavior-2", "bl-payment-3", "bl-payment-3"],
        })
      )
    ).toThrowError(GenerateCampaignAIError);
  });

  it.each(promptSuite)(
    "keeps $name stable through adapt -> repair -> quality pass",
    ({ raw, scribble, expected }) => {
      const adapted = adaptAICampaignDraft(raw);
      const repaired = repairCampaignDraft(adapted);
      const { scores } = runQualityPass(repaired, scribble);
      const customQuestions = repaired.questions.filter((question) => !question.isBaseline);

      expect(adapted.title).toBe(raw.title.trim());
      expect(adapted.summary).toBe(raw.summary.trim());
      expect(adapted.questions.filter((question) => question.isBaseline)).toHaveLength(3);
      expect(customQuestions).toHaveLength(repaired.assumptions.length * 3);
      expect(repaired.tags).toContain(expected.retainTag);
      expect(repaired.audience.interests).toContain(expected.retainInterest);
      expect(repaired.audience.expertise).toEqual(expected.expertise);
      expect(repaired.audience.ageRanges.length).toBeLessThanOrEqual(2);

      repaired.assumptions.forEach((_, assumptionIndex) => {
        const questionsForAssumption = customQuestions.filter(
          (question) => question.assumptionIndex === assumptionIndex
        );
        const categories = new Set(
          questionsForAssumption.map((question) => question.category)
        );

        expect(questionsForAssumption).toHaveLength(3);
        expect(categories.size).toBeGreaterThanOrEqual(3);
        expect(categories.has("negative")).toBe(true);
      });

      const messages = scores.warnings.map((warning) => warning.message);
      expect(
        messages.some((message) => message.includes("triangulation"))
      ).toBe(false);
      expect(
        messages.some((message) => message.includes("disconfirmation question"))
      ).toBe(false);
      expect(
        messages.some((message) => message.includes("Narrative prompt"))
      ).toBe(false);
      expect(
        messages.some((message) => message.includes("Broad exploration"))
      ).toBe(false);
      expect(
        messages.some((message) => message.includes("More than 10 questions"))
      ).toBe(false);
    }
  );
});
