import { describe, expect, it } from "vitest";
import { BASELINE_QUESTIONS } from "../baseline-questions";
import { runQualityPass } from "../ai/quality-pass";
import { repairCampaignDraft } from "../ai/repair-campaign-draft";
import type { CampaignDraft, DraftQuestion } from "../ai/types";

function makeQuestion(
  id: string,
  text: string,
  category: DraftQuestion["category"],
  assumptionIndex: number,
  overrides: Partial<DraftQuestion> = {}
): DraftQuestion {
  return {
    id,
    text,
    type: "multiple_choice",
    options: [
      "0 times - this does not happen",
      "1-2 times",
      "3-5 times",
      "6+ times",
    ],
    section: "open",
    isBaseline: false,
    category,
    assumptionIndex,
    ...overrides,
  };
}

function makeBaselineQuestions(): DraftQuestion[] {
  return [BASELINE_QUESTIONS[0], BASELINE_QUESTIONS[8], BASELINE_QUESTIONS[6]].map((question, index) => ({
    id: `baseline-${index}`,
    text: question.text,
    type: "multiple_choice",
    options: [...question.options],
    section: "baseline",
    isBaseline: true,
    baselineId: question.id,
    category: question.category,
  }));
}

function makeDraft(): CampaignDraft {
  return {
    title: "AI Workout Planner That Adapts to Equipment, Injuries, and Schedule",
    summary:
      "Most fitness apps offer generic programs that ignore your home equipment, physical limitations, and schedule constraints. This AI workout planner builds routines around what you actually have and how your body feels.",
    category: "Health",
    tags: [
      "Fitness Enthusiasts",
      "Home Workout Users",
      "Busy Professionals",
      "Injury-Prone Athletes",
    ],
    assumptions: [
      "Adults aged 25-44 who exercise at home currently abandon workout apps within 6 weeks because the programs do not adapt to their available equipment or time constraints.",
      "Home fitness users who have experienced an injury or physical limitation in the past 12 months currently skip or self-modify workouts weekly because no app accounts for their restrictions.",
      "Health-conscious adults currently spending $10-30/month on fitness apps or subscriptions would switch to an AI-adaptive planner at the same price point if it personalized to their constraints within the first session.",
    ],
    questions: [
      makeQuestion(
        "q-1",
        "In the past month, how many scheduled workouts did you skip or modify because the plan did not fit your equipment, time, or how your body felt that day?",
        "behavior",
        0
      ),
      makeQuestion(
        "q-2",
        "What is the main reason you have stopped using or never stuck with a workout app?",
        "negative",
        0,
        {
          options: [
            "I have not stopped - I am happy with my current app",
            "Plans did not match my available equipment",
            "Workouts were too rigid for my schedule",
            "I lost motivation unrelated to the app",
            "I do not use workout apps at all",
          ],
        }
      ),
      makeQuestion(
        "q-3",
        "How do you currently handle a workout plan that does not account for an injury, soreness, or missing equipment?",
        "attempts",
        1,
        {
          options: [
            "I skip the workout entirely",
            "I improvise on my own",
            "I search YouTube for an alternative",
            "I message or pay a trainer for guidance",
            "I do not train with constraints like these",
          ],
        }
      ),
      makeQuestion(
        "q-4",
        "In the past 3 months, how often did a physical limitation force you to change or abandon a planned workout?",
        "pain",
        1,
        {
          options: [
            "Never - I train without physical limitations",
            "Once or twice total",
            "About once a week",
            "Multiple times a week",
            "Almost every session",
          ],
        }
      ),
      makeQuestion(
        "q-5",
        "What is the single biggest reason you would NOT trust an AI to replace your current approach to workout planning?",
        "negative",
        2,
        {
          options: [
            "I already have a system that works fine",
            "I do not trust AI to handle injury safety",
            "I need human accountability to stay consistent",
            "I would pay for a real trainer before an app",
            "I do not pay for fitness apps - I use free content",
          ],
        }
      ),
      makeQuestion(
        "q-6",
        "Which aspect of your current workout routine is hardest to solve with apps or free content you already use?",
        "pain",
        0,
        {
          type: "open",
          options: null,
          anchors: [
            "Name the part that still breaks or feels generic",
            "Include why your current tool does not handle it",
          ],
        }
      ),
      makeQuestion(
        "q-7",
        "How much do you currently pay per month for fitness apps, programs, or coaching combined?",
        "price",
        2,
        {
          section: "followup",
          options: [
            "$0 - I only use free resources",
            "Under $10/month",
            "$10-20/month",
            "$20-50/month",
            "$50+/month",
          ],
        }
      ),
      makeQuestion(
        "q-8",
        "If an AI planner built a personalized workout around your equipment, injuries, and available time right now, what would you pay per month?",
        "willingness",
        2,
        {
          section: "followup",
          options: [
            "$0 - I would not pay for this",
            "$5-10/month",
            "$10-20/month",
            "$20-40/month",
            "I would pay once for lifetime access, not monthly",
          ],
        }
      ),
      ...makeBaselineQuestions(),
    ],
    audience: {
      interests: ["Consumer", "Health", "AI/ML"],
      expertise: ["Developer", "Designer", "Founder"],
      ageRanges: ["25-34", "35-44"],
      location: "",
      occupation: "",
      industry: "Healthcare",
      experienceLevel: "",
      nicheQualifier: "Home exercisers managing equipment limits or minor injuries",
    },
    format: "quick",
  };
}

const repairPromptSuite = [
  {
    name: "meal prep planner for shift workers",
    expected: {
      assumptions: 2,
      customQuestions: 6,
      retainTags: ["Shift Workers"],
      retainInterests: ["Health"],
      expertise: [],
    },
    draft: {
      title: "AI Meal Prep Planner for Shift Workers",
      summary:
        "A meal prep planner for nurses, shift workers, and other chaotic schedules. It helps people prep realistic meals around irregular hours instead of defaulting to vending machines, takeout, or skipped meals.",
      category: "Health",
      tags: ["Shift Workers", "Meal Preppers", "Nurses", "Busy Professionals"],
      assumptions: [
        "Shift workers currently buy takeout or skip meals at least 3 times per week because standard meal-planning advice assumes predictable hours.",
        "Nurses and other rotating-schedule workers who have tried meal prep in the past 6 months stop within 2 weeks because plans break when shifts change.",
        "Health-conscious shift workers already spending $40-100/week on convenience food would pay for a planner that adapts shopping and prep to their live rota.",
      ],
      questions: [
        makeQuestion(
          "shift-q-1",
          "In a typical week, how many meals do you buy on the fly or skip because your work schedule disrupted your food plan?",
          "behavior",
          0,
          {
            options: [
              "0 meals - my current system already works",
              "1-2 meals",
              "3-5 meals",
              "6+ meals",
            ],
          }
        ),
        makeQuestion(
          "shift-q-2",
          "What is the biggest cost when your schedule blows up the food plan you intended to follow?",
          "pain",
          0,
          {
            options: [
              "No real cost - I adapt easily",
              "A little wasted time",
              "I spend more money than planned",
              "I end up eating badly or skipping meals",
            ],
          }
        ),
        makeQuestion(
          "shift-q-3",
          "What is the strongest reason you would keep your current meal routine instead of using a new planner?",
          "negative",
          0,
          {
            options: [
              "My current routine already works well enough",
              "My schedule changes too much for any tool to help",
              "Meal planning is not painful enough to pay for",
              "I do not prep meals at all",
            ],
          }
        ),
        makeQuestion(
          "shift-q-4",
          "What did you try the last time you seriously attempted meal prep around an unpredictable work schedule?",
          "attempts",
          1,
          {
            type: "open",
            options: null,
            anchors: [
              "Name the app, template, or workaround",
              "Include what broke first",
            ],
          }
        ),
        makeQuestion(
          "shift-q-5",
          "How much do you currently spend each week on takeout, vending machines, or convenience food because your schedule changed?",
          "price",
          2,
          {
            section: "followup",
            options: [
              "$0 - I do not spend on this",
              "Under $25/week",
              "$25-50/week",
              "$50-100/week",
              "$100+/week",
            ],
          }
        ),
        makeQuestion(
          "shift-q-6",
          "If a planner rebuilt your shopping list and prep plan around your actual rota each week, what would stop you from paying for it?",
          "willingness",
          2,
          {
            section: "followup",
            options: [
              "Nothing - I would pay if it worked",
              "I do not trust it to fit my reality",
              "I would rather keep winging it",
              "It would need to save serious time first",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["Health", "Consumer"],
        expertise: ["Founder", "Healthcare Pro"],
        ageRanges: ["25-34", "35-44", "45-54"],
        location: "USA",
        occupation: "Nurse or shift worker",
        industry: "Healthcare",
        experienceLevel: "",
        nicheQualifier: "Works rotating or night shifts",
      },
      format: "quick",
    } satisfies CampaignDraft,
  },
  {
    name: "family travel planner",
    expected: {
      assumptions: 2,
      customQuestions: 6,
      retainTags: ["Parents"],
      retainInterests: ["Consumer"],
      expertise: [],
    },
    draft: {
      title: "Family Travel Planner for Parents With Toddlers",
      summary:
        "A trip planner that builds realistic daily itineraries around naps, meals, stroller logistics, and meltdown windows. The goal is to stop parents from planning adult trips that collapse the moment kids get tired.",
      category: "Consumer",
      tags: ["Parents", "Family Travelers", "Toddler Parents", "Busy Professionals"],
      assumptions: [
        "Parents traveling with kids under 5 currently drop or heavily rewrite at least one itinerary day per trip because generic travel plans ignore naps, meals, and stroller logistics.",
        "Parents who spend 2+ hours planning family trips currently keep planning manually because existing travel apps optimize for adults instead of young kids.",
        "Families already paying for premium trip-planning tools would pay for realistic toddler-friendly itineraries if they saved at least 2 hours of planning time per trip.",
      ],
      questions: [
        makeQuestion(
          "travel-q-1",
          "On your last family trip with a child under 5, how much of the original daily plan did you end up changing or dropping?",
          "behavior",
          0,
          {
            options: [
              "None - our plan worked fine",
              "A small part",
              "About half of it",
              "Most of it",
            ],
          }
        ),
        makeQuestion(
          "travel-q-2",
          "What is the biggest cost when a travel day is planned around adults instead of your child's real limits?",
          "pain",
          0,
          {
            options: [
              "No real cost - we adapt easily",
              "A little wasted time",
              "One parent ends up carrying the whole day",
              "The day falls apart entirely",
            ],
          }
        ),
        makeQuestion(
          "travel-q-3",
          "What is the strongest reason you would keep your current family-trip planning workflow instead of switching?",
          "negative",
          1,
          {
            options: [
              "Our current planning method already works",
              "Trips with kids are too unpredictable for a tool to help",
              "Planning is not painful enough to pay for",
              "I only take a few trips a year",
            ],
          }
        ),
        makeQuestion(
          "travel-q-4",
          "What do you use today to plan around naps, meals, and child logistics before a trip?",
          "attempts",
          1,
          {
            type: "open",
            options: null,
            anchors: ["Name the doc, app, or routine", "Include what still feels messy"],
          }
        ),
        makeQuestion(
          "travel-q-5",
          "How much would you pay for a planner that gave you a realistic toddler-friendly itinerary in one sitting before a trip?",
          "price",
          2,
          {
            section: "followup",
            options: [
              "$0 - I would keep planning manually",
              "$5-10 per trip",
              "$10-25 per trip",
              "$25+/trip",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["Consumer"],
        expertise: ["Founder", "Product Manager"],
        ageRanges: ["25-34", "35-44"],
        location: "USA",
        occupation: "Parent",
        industry: "",
        experienceLevel: "",
        nicheQualifier: "Travels with children under 5",
      },
      format: "quick",
    } satisfies CampaignDraft,
  },
  {
    name: "creator sponsorship manager",
    expected: {
      assumptions: 2,
      customQuestions: 6,
      retainTags: ["Creators"],
      retainInterests: ["Creator Economy"],
      expertise: [],
    },
    draft: {
      title: "Sponsorship Inbox for Creators",
      summary:
        "A sponsorship inbox that pulls brand leads from email, DMs, and notes into one view so creators stop losing deals and can quickly see which conversations are worth chasing.",
      category: "SaaS",
      tags: ["Creators", "Brand Partnerships", "Talent Managers", "Operations"],
      assumptions: [
        "Independent creators with 3+ active brand conversations currently lose at least one sponsor lead per month because outreach is split across inboxes and DMs.",
        "Creators already using spreadsheets or Notion to track deals would pay monthly for a unified sponsorship inbox if it reduced follow-up time and missed revenue.",
        "Talent managers would reject a creator CRM unless it also shows deal stage and expected payout clearly.",
      ],
      questions: [
        makeQuestion(
          "creator-q-1",
          "In the past month, how many sponsor leads or follow-ups have you lost track of across email, DMs, or notes?",
          "behavior",
          0,
          {
            options: [
              "0 - my current system works well",
              "1 lead",
              "2-3 leads",
              "4+ leads",
            ],
          }
        ),
        makeQuestion(
          "creator-q-2",
          "What do you currently use to track brand conversations and follow-ups?",
          "attempts",
          0,
          {
            type: "open",
            options: null,
            anchors: ["Name the tool or doc", "Include what still falls through the cracks"],
          }
        ),
        makeQuestion(
          "creator-q-3",
          "What is the strongest reason you would keep your current sponsorship tracking workflow instead of switching?",
          "negative",
          0,
          {
            options: [
              "My current setup already works fine",
              "I don't manage enough deals to need this",
              "A CRM would add more admin than it removes",
              "I only need occasional reminders",
            ],
          }
        ),
        makeQuestion(
          "creator-q-4",
          "What is the biggest cost when a brand follow-up slips through the cracks?",
          "pain",
          0,
          {
            options: [
              "No real cost",
              "Some wasted time",
              "I lose negotiating leverage",
              "I lose the deal or miss money",
            ],
          }
        ),
        makeQuestion(
          "creator-q-5",
          "How much would you pay per month for one place to manage sponsor conversations, deal stage, and next steps?",
          "price",
          1,
          {
            section: "followup",
            options: [
              "$0 - I'd keep using spreadsheets or DMs",
              "$10-20/month",
              "$20-50/month",
              "$50+/month",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["Creator Economy", "SaaS"],
        expertise: ["Founder", "Operations"],
        ageRanges: ["18-24", "25-34"],
        location: "Global",
        occupation: "Independent creator",
        industry: "Media & Entertainment",
        experienceLevel: "",
        nicheQualifier: "Has active brand partnerships",
      },
      format: "quick",
    } satisfies CampaignDraft,
  },
  {
    name: "bookkeeping concierge for freelancers",
    expected: {
      assumptions: 2,
      customQuestions: 6,
      retainTags: ["Freelancers"],
      retainInterests: ["Fintech"],
      expertise: [],
    },
    draft: {
      title: "Bookkeeping Concierge for Freelancers",
      summary:
        "A bookkeeping concierge that organizes income, expenses, and tax prep for freelancers who keep everything in scattered tools until it becomes urgent and painful.",
      category: "Fintech",
      tags: ["Freelancers", "Solo Founders", "Creatives", "Finance Pro"],
      assumptions: [
        "Freelancers currently spend at least 2 stressful days per quarter cleaning up expenses, invoices, and tax prep because their books are scattered across tools.",
        "Independent workers who have tried bookkeeping software in the past year stop using it within 30 days because setup and maintenance still feel like work.",
        "Freelancers already paying for accountants or admin help would pay monthly for a concierge that keeps records clean all year instead of only at tax time.",
      ],
      questions: [
        makeQuestion(
          "books-q-1",
          "In the past quarter, how many days did you spend cleaning up expenses, invoices, or tax prep because your books were behind?",
          "behavior",
          0,
          {
            options: [
              "0 days - my current system stays clean",
              "Less than a day",
              "1-2 days",
              "3+ days",
            ],
          }
        ),
        makeQuestion(
          "books-q-2",
          "What have you already tried to stay on top of freelance bookkeeping?",
          "attempts",
          1,
          {
            type: "open",
            options: null,
            anchors: ["Name the software, spreadsheet, or person", "Include why you stopped or ignored it"],
          }
        ),
        makeQuestion(
          "books-q-3",
          "What is the strongest reason you would keep your current bookkeeping setup instead of switching?",
          "negative",
          1,
          {
            options: [
              "My current setup already works fine",
              "I only think about this a few times a year",
              "I would rather hand it to an accountant",
              "A new tool would create more admin work",
            ],
          }
        ),
        makeQuestion(
          "books-q-4",
          "What is the biggest cost when your bookkeeping falls behind?",
          "pain",
          0,
          {
            options: [
              "Not much - I catch up quickly",
              "Some wasted time",
              "Stress and uncertainty about taxes",
              "Real money lost through mistakes or missed deductions",
            ],
          }
        ),
        makeQuestion(
          "books-q-5",
          "How much do you currently spend each month on accounting help, bookkeeping software, or admin support?",
          "price",
          2,
          {
            section: "followup",
            options: [
              "$0/month",
              "Under $25/month",
              "$25-100/month",
              "$100+/month",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["Fintech", "Consumer"],
        expertise: ["Founder", "Finance Pro"],
        ageRanges: ["25-34", "35-44", "45-54"],
        location: "USA",
        occupation: "Freelancer or independent contractor",
        industry: "",
        experienceLevel: "",
        nicheQualifier: "Handles their own books and taxes",
      },
      format: "quick",
    } satisfies CampaignDraft,
  },
  {
    name: "restaurant inventory copilot",
    expected: {
      assumptions: 3,
      customQuestions: 9,
      retainTags: ["Restaurant Operators"],
      retainInterests: ["Food & Bev"],
      expertise: ["Operations"],
    },
    draft: {
      title: "Inventory Copilot for Independent Restaurants",
      summary:
        "An ordering copilot for small restaurants that turns sales patterns and current stock into smarter purchase suggestions so teams stop relying on gut feel and stale spreadsheets.",
      category: "Other",
      tags: ["Restaurant Operators", "Chefs", "Food & Bev Managers", "Operations"],
      assumptions: [
        "Independent restaurant operators currently run out of key ingredients at least once per week because ordering is based on gut feel or stale spreadsheets.",
        "Back-of-house teams already spending 2+ hours per week on ordering would pay for a tool that reduced stockouts and over-ordering within the first month.",
        "Chefs would reject a new ordering tool if it could not explain why it recommended a quantity in plain language.",
      ],
      questions: [
        makeQuestion(
          "restaurant-q-1",
          "In the past month, how often did your team run out of an ingredient you expected to have on hand?",
          "behavior",
          0,
          {
            options: [
              "Never - our current ordering works well",
              "1-2 times",
              "About once a week",
              "Multiple times a week",
            ],
          }
        ),
        makeQuestion(
          "restaurant-q-2",
          "What do you currently rely on to decide how much inventory to order each week?",
          "attempts",
          0,
          {
            type: "open",
            options: null,
            anchors: ["Name the spreadsheet, vendor system, or habit", "Include what still breaks"],
          }
        ),
        makeQuestion(
          "restaurant-q-3",
          "What is the strongest reason you would NOT switch away from your current ordering workflow?",
          "negative",
          0,
          {
            options: [
              "Our current process already works well enough",
              "I don't trust software to understand service reality",
              "Training the team would take too much effort",
              "We don't have enough ordering complexity to need this",
            ],
          }
        ),
        makeQuestion(
          "restaurant-q-4",
          "What is the biggest cost when your ordering is wrong today?",
          "pain",
          0,
          {
            options: [
              "Not much - we can adjust quickly",
              "Some extra waste",
              "A stressful service or menu compromise",
              "Meaningful lost revenue or margin",
            ],
          }
        ),
        makeQuestion(
          "restaurant-q-5",
          "How much would you pay each month for ordering suggestions that cut stockouts and over-ordering without adding more admin time?",
          "price",
          1,
          {
            section: "followup",
            options: [
              "$0 - we'd keep using our current process",
              "$20-50/month",
              "$50-100/month",
              "$100+/month",
            ],
          }
        ),
        makeQuestion(
          "restaurant-q-6",
          "What would stop you from trusting a new ordering recommendation even if the numbers looked right?",
          "negative",
          2,
          {
            options: [
              "Nothing - I'd trust it if it worked",
              "I need to understand why it suggested that quantity",
              "The kitchen changes too fast for software to stay useful",
              "I would still rely on instinct over a tool",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["Food & Bev", "Marketplace"],
        expertise: ["Operations", "Founder"],
        ageRanges: ["25-34", "35-44", "45-54"],
        location: "USA",
        occupation: "Restaurant owner or chef",
        industry: "Food & Beverage",
        experienceLevel: "Mid-level (3–5 years)",
        nicheQualifier: "Independent restaurant with weekly ordering responsibility",
      },
      format: "standard",
    } satisfies CampaignDraft,
  },
] as const;

describe("repairCampaignDraft", () => {
  it("repairs quick drafts into a consistent 2-assumption, 6-custom-question shape", () => {
    const repaired = repairCampaignDraft(makeDraft());
    const customQuestions = repaired.questions.filter((question) => !question.isBaseline);

    expect(repaired.assumptions).toHaveLength(2);
    expect(customQuestions).toHaveLength(6);
    expect(repaired.questions.filter((question) => question.isBaseline)).toHaveLength(3);

    for (let assumptionIndex = 0; assumptionIndex < repaired.assumptions.length; assumptionIndex++) {
      const questions = customQuestions.filter(
        (question) => question.assumptionIndex === assumptionIndex
      );
      const categories = new Set(questions.map((question) => question.category));

      expect(questions).toHaveLength(3);
      expect(categories.size).toBeGreaterThanOrEqual(3);
      expect(categories.has("negative")).toBe(true);
    }
  });

  it("prunes mismatched builder expertise for consumer health ideas", () => {
    const repaired = repairCampaignDraft(makeDraft());

    expect(repaired.audience.interests).toEqual(["Health", "Consumer"]);
    expect(repaired.audience.expertise).toEqual([]);
    expect(repaired.audience.ageRanges).toEqual(["25-34", "35-44"]);
  });

  it.each(repairPromptSuite)(
    "keeps $name stable through repair and quality scoring",
    ({ draft, expected }) => {
      const repaired = repairCampaignDraft(draft);
      const { scores } = runQualityPass(repaired, draft.summary);
      const customQuestions = repaired.questions.filter((question) => !question.isBaseline);

      expect(repaired.assumptions).toHaveLength(expected.assumptions);
      expect(customQuestions).toHaveLength(expected.customQuestions);
      expect(repaired.questions.filter((question) => question.isBaseline)).toHaveLength(3);
      expect(repaired.tags).toEqual(expect.arrayContaining(expected.retainTags));
      expect(repaired.audience.interests).toEqual(
        expect.arrayContaining(expected.retainInterests)
      );
      expect(repaired.audience.expertise).toEqual(expected.expertise);
      expect(repaired.tags).toHaveLength(new Set(repaired.tags).size);
      expect(repaired.tags.length).toBeLessThanOrEqual(4);
      expect(repaired.audience.ageRanges.length).toBeLessThanOrEqual(2);

      for (let assumptionIndex = 0; assumptionIndex < repaired.assumptions.length; assumptionIndex++) {
        const questionsForAssumption = customQuestions.filter(
          (question) => question.assumptionIndex === assumptionIndex
        );
        const categories = new Set(
          questionsForAssumption.map((question) => question.category)
        );

        expect(questionsForAssumption).toHaveLength(3);
        expect(categories.size).toBeGreaterThanOrEqual(3);
        expect(categories.has("negative")).toBe(true);
      }

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

  it("removes the evidence and question-count warnings that triggered in the unrepaired draft", () => {
    const repaired = repairCampaignDraft(makeDraft());
    const { scores } = runQualityPass(repaired, repaired.summary);
    const messages = scores.warnings.map((warning) => warning.message);

    expect(
      messages.some((message) => message.includes("triangulation"))
    ).toBe(false);
    expect(
      messages.some((message) => message.includes("disconfirmation question"))
    ).toBe(false);
    expect(
      messages.some((message) => message.includes("More than 10 questions"))
    ).toBe(false);
    expect(
      messages.some((message) => message.includes("No target expertise set"))
    ).toBe(false);
  });

  it("extracts the problem phrase from 'not already solving' assumptions instead of using the product summary", () => {
    const repaired = repairCampaignDraft({
      title: "AI Meeting Assistant: Auto-Generated Summaries & Action Items",
      summary:
        "A tool that silently sits in Zoom, Teams, and Google Meet meetings to automatically extract decisions, action items, and summaries - eliminating the need for manual note-taking.",
      category: "SaaS",
      tags: ["Managers", "Knowledge Workers", "Remote Teams"],
      assumptions: [
        "Professionals who lose track of meeting decisions are not already solving this adequately with existing tools (notes apps, built-in transcription, or manual follow-ups).",
        "Managers and team leads would pay $10-20/month as a standalone subscription for automatic meeting action-item extraction rather than waiting for it as a bundled feature.",
      ],
      questions: [
        makeQuestion(
          "meeting-q-1",
          "How do you currently capture action items and decisions during meetings?",
          "attempts",
          0,
          {
            options: [
              "I take manual notes and it works fine",
              "Someone on the team writes a follow-up email or doc",
              "We use a tool and it is good enough",
              "Nothing - things get lost and it is a real problem",
              "I rely on others to track it",
            ],
          }
        ),
        makeQuestion(
          "meeting-q-2",
          "How satisfied are you with your current method for tracking meeting decisions and follow-ups?",
          "negative",
          0,
          {
            options: [
              "Very satisfied - I do not need anything new",
              "Somewhat satisfied - minor gaps but not worth fixing",
              "Neutral - it works but wastes time",
              "Unsatisfied - I lose things regularly",
              "There is no method - it is chaotic",
            ],
          }
        ),
        makeQuestion(
          "meeting-q-3",
          "How much would you personally pay per month for a standalone tool that automatically joins your meetings and delivers accurate action items and summaries within 2 minutes of the call ending?",
          "price",
          1,
          {
            section: "followup",
            options: [
              "$0 - I would not pay for this separately",
              "$1-9/month",
              "$10-20/month",
              "$21-40/month",
              "$40+/month",
            ],
          }
        ),
        makeQuestion(
          "meeting-q-4",
          "If your current meeting platform offered basic AI summaries for free tomorrow, how likely are you to pay for a separate, more powerful standalone tool?",
          "willingness",
          1,
          {
            section: "followup",
            options: [
              "Not at all - free built-in is good enough for me",
              "Unlikely - I would use free first and never upgrade",
              "Possibly - if it was meaningfully better",
              "Very likely - integrations are never good enough",
              "I would pay for the standalone regardless of what is built in",
            ],
          }
        ),
        makeQuestion(
          "meeting-q-5",
          "What is the main reason you would NOT pay for a standalone AI meeting summary tool, even if it worked perfectly?",
          "negative",
          1,
          {
            options: [
              "My company already provides something like this",
              "I would only want it if it was part of Zoom, Teams, or Notion",
              "I do not think AI summaries would be accurate enough to trust",
              "The problem is not painful enough to pay for separately",
              "My employer would never approve a new paid tool",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["SaaS"],
        expertise: [],
        ageRanges: ["25-34", "35-44"],
        location: "Global",
        occupation: "Knowledge worker or team manager",
        industry: "Technology",
        experienceLevel: "Mid-level (3-5 years)",
        nicheQualifier: "Attends 5+ video calls per week",
      },
      format: "quick",
    });

    const meetingProblemIndex = repaired.assumptions.findIndex((assumption) =>
      assumption.includes("lose track of meeting decisions")
    );
    const meetingProblemQuestions = repaired.questions.filter(
      (question) => !question.isBaseline && question.assumptionIndex === meetingProblemIndex
    );
    const syntheticBehaviorQuestion = meetingProblemQuestions.find(
      (question) => question.category === "behavior"
    );

    expect(meetingProblemIndex).toBeGreaterThanOrEqual(0);
    expect(meetingProblemQuestions.map((question) => question.category)).toContain("behavior");
    expect(syntheticBehaviorQuestion).toBeDefined();
    expect(syntheticBehaviorQuestion!.text).toContain("lose track of meeting decisions");
    expect(syntheticBehaviorQuestion!.text).not.toContain(
      "A tool that silently sits in Zoom"
    );
  });

  it("does not infer expertise from broad tags alone for meeting workflow ideas", () => {
    const repaired = repairCampaignDraft({
      title: "AI Meeting Assistant: Auto-Generated Action Items & Summaries",
      summary:
        "A meeting intelligence tool that silently joins Zoom, Teams, and Google Meet calls to automatically extract decisions, action items, and summaries in real time.",
      category: "SaaS",
      tags: [
        "Managers",
        "Knowledge Workers",
        "Remote Teams",
        "Product Managers",
        "Operations",
      ],
      assumptions: [
        "Managers and ICs who experience dropped action items after meetings currently use manual workarounds (notes apps, email summaries, memory) that take 10+ minutes per meeting to maintain.",
        "Meeting-heavy professionals spending time on manual post-meeting follow-up would pay $10-20/month for automated action item capture if it replaced their current manual process.",
      ],
      questions: [
        makeQuestion(
          "meeting-expertise-q-1",
          "In the past month, how often did you leave a meeting without a clear written record of decisions made or next steps?",
          "behavior",
          0,
          {
            options: [
              "Never - I always have a system that captures this",
              "Once or twice",
              "A few times per week",
              "Almost every meeting",
              "I do not attend enough meetings for this to matter",
            ],
          }
        ),
        makeQuestion(
          "meeting-expertise-q-2",
          "How do you currently capture action items from meetings?",
          "attempts",
          0,
          {
            options: [
              "My company uses a tool that does this automatically",
              "I take notes manually in Notion or Docs",
              "I rely on memory or follow-up emails",
              "Someone else on the team handles it",
              "I rarely track action items at all",
            ],
          }
        ),
        makeQuestion(
          "meeting-expertise-q-3",
          "How satisfied are you with how your team currently tracks decisions and follow-ups after meetings?",
          "negative",
          0,
          {
            options: [
              "Very satisfied - nothing needs to change",
              "Mostly satisfied - minor gaps occasionally",
              "Neutral - it works but wastes time",
              "Frustrated - things regularly fall through the cracks",
              "It is a serious recurring problem for my team",
            ],
          }
        ),
        makeQuestion(
          "meeting-expertise-q-4",
          "How much do you currently spend per month on tools, apps, or services related to this?",
          "price",
          1,
          {
            section: "followup",
            options: [
              "$0 - I only use free options",
              "Under $10/month",
              "$10-20/month",
              "$20-50/month",
              "$50+/month",
            ],
          }
        ),
        makeQuestion(
          "meeting-expertise-q-5",
          "If a meeting AI tool existed today, what would most likely stop you from switching to it from your current process?",
          "willingness",
          1,
          {
            section: "followup",
            options: [
              "Cost - I would not pay for this personally",
              "Accuracy concerns - AI would miss context or get it wrong",
              "Adoption - my team would not use it consistently",
              "IT or security approval would block it",
              "Nothing - I would switch immediately if it worked",
            ],
          }
        ),
        ...makeBaselineQuestions(),
      ],
      audience: {
        interests: ["SaaS"],
        expertise: ["Operations"],
        ageRanges: ["25-34", "35-44"],
        location: "USA",
        occupation: "Manager or Individual Contributor at a knowledge-work company",
        industry: "Technology",
        experienceLevel: "Mid-level (3-5 years)",
        nicheQualifier: "Attends 5+ video meetings per week",
      },
      format: "quick",
    });

    expect(repaired.audience.expertise).toEqual([]);
    expect(repaired.audience.interests).toContain("SaaS");
    expect(repaired.tags).toEqual(
      expect.arrayContaining(["Managers", "Knowledge Workers", "Remote Teams"])
    );
    expect(repaired.tags).toHaveLength(3);
    expect(repaired.tags).not.toContain("Product Managers");
    expect(repaired.tags).not.toContain("Operations");
  });
});
