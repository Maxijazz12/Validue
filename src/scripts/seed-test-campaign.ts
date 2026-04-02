/**
 * Seed test campaigns for the reciprocal gate cold-start problem.
 *
 * Usage:
 *   npx tsx src/scripts/seed-test-campaign.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - At least one user in the profiles table
 *
 * Creates 2 active campaigns with 6+ questions each (enough for partial assignment).
 * Uses V2 economics, assumption_index on questions, and the current schema.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

type QuestionSeed = {
  text: string;
  type: "open" | "multiple_choice";
  sort_order: number;
  options?: string[];
  is_baseline: boolean;
  category: string;
  assumption_index: number | null;
};

const CAMPAIGNS = [
  {
    title: "Is There Demand for AI-Powered Meal Planning?",
    description:
      "Testing whether busy professionals would pay for an AI tool that generates weekly meal plans based on dietary preferences, budget, and what's already in your fridge.",
    category: "Consumer / Health",
    tags: ["Health", "AI", "Meal Planning", "Busy Professionals"],
    key_assumptions: [
      "Busy professionals find meal planning painful enough to pay for",
      "AI personalization is more appealing than generic recipe apps",
      "Budget-awareness is a key differentiator",
    ],
    target_interests: ["Health", "Cooking", "AI/ML", "Productivity"],
    target_expertise: [],
    target_age_ranges: ["25-34", "35-44"],
    questions: [
      {
        text: "How many times in the past week did you eat out or order delivery because you didn't have a meal planned?",
        type: "multiple_choice" as const,
        sort_order: 0,
        options: ["0 times", "1-2 times", "3-4 times", "5+ times"],
        is_baseline: true,
        category: "behavior",
        assumption_index: 0,
      },
      {
        text: "What currently stops you from planning meals for the week?",
        type: "open" as const,
        sort_order: 1,
        is_baseline: false,
        category: "pain",
        assumption_index: 0,
      },
      {
        text: "Would you trust an AI to pick meals for you, or would you need to approve each one?",
        type: "multiple_choice" as const,
        sort_order: 2,
        options: [
          "I'd trust it fully — just tell me what to cook",
          "I'd want to approve a weekly plan before shopping",
          "I'd need to customize heavily — AI is just a starting point",
          "I wouldn't trust AI for this at all",
        ],
        is_baseline: false,
        category: "behavior",
        assumption_index: 1,
      },
      {
        text: "How much do you currently spend per month on meal kits, recipe apps, or meal planning tools?",
        type: "multiple_choice" as const,
        sort_order: 3,
        options: ["$0 — I don't use any", "$1-10", "$11-30", "$30+"],
        is_baseline: false,
        category: "willingness",
        assumption_index: 2,
      },
      {
        text: "What's the #1 feature that would make you switch from your current approach to an AI meal planner?",
        type: "open" as const,
        sort_order: 4,
        is_baseline: false,
        category: "willingness",
        assumption_index: 1,
      },
      {
        text: "If this tool cost $8/month and saved you 2+ hours per week, would you try it?",
        type: "multiple_choice" as const,
        sort_order: 5,
        options: [
          "Yes, immediately",
          "I'd try a free trial first",
          "Only if friends recommended it",
          "No, I'd rather spend the time myself",
        ],
        is_baseline: false,
        category: "willingness",
        assumption_index: 2,
      },
      {
        text: "Describe the last time you wasted food because you bought ingredients without a plan.",
        type: "open" as const,
        sort_order: 6,
        is_baseline: false,
        category: "pain",
        assumption_index: 0,
      },
    ],
  },
  {
    title: "Would Student Founders Pay for Async Mentorship?",
    description:
      "Exploring whether student founders would pay a small monthly fee for async access to experienced founders — not live calls, but written Q&A with 24-hour turnaround.",
    category: "Education / Startups",
    tags: ["Student Founders", "Mentorship", "Startups", "Education"],
    key_assumptions: [
      "Students prefer async over live mentorship",
      "Written feedback is valuable enough to pay for",
      "24-hour turnaround is fast enough",
    ],
    target_interests: ["Startups", "Education", "Entrepreneurship"],
    target_expertise: ["Software Engineering", "Business"],
    target_age_ranges: ["18-24", "25-34"],
    questions: [
      {
        text: "Have you ever reached out to a more experienced founder for advice? What happened?",
        type: "open" as const,
        sort_order: 0,
        is_baseline: true,
        category: "behavior",
        assumption_index: null,
      },
      {
        text: "When you need startup advice, how do you prefer to get it?",
        type: "multiple_choice" as const,
        sort_order: 1,
        options: [
          "Live video/phone call",
          "Written async (email, DM, forum)",
          "In-person meeting",
          "I just Google it or ask ChatGPT",
          "I don't seek advice — I figure it out myself",
        ],
        is_baseline: false,
        category: "behavior",
        assumption_index: 0,
      },
      {
        text: "What's the longest you've waited for a mentor's response, and did the delay affect your decision?",
        type: "open" as const,
        sort_order: 2,
        is_baseline: false,
        category: "pain",
        assumption_index: 2,
      },
      {
        text: "Would you pay $15/month for guaranteed written responses from 2-3 vetted founders within 24 hours?",
        type: "multiple_choice" as const,
        sort_order: 3,
        options: [
          "Yes, that's a great deal",
          "Maybe, if I could see sample answers first",
          "Only if it were cheaper ($5-10)",
          "No, I can get advice for free",
        ],
        is_baseline: false,
        category: "willingness",
        assumption_index: 1,
      },
      {
        text: "What specific question would you ask a mentor right now if you had instant access?",
        type: "open" as const,
        sort_order: 4,
        is_baseline: false,
        category: "behavior",
        assumption_index: 1,
      },
      {
        text: "How many hours per week do you spend trying to figure out startup decisions on your own?",
        type: "multiple_choice" as const,
        sort_order: 5,
        options: ["Less than 1 hour", "1-3 hours", "3-5 hours", "5+ hours"],
        is_baseline: false,
        category: "pain",
        assumption_index: 0,
      },
      {
        text: "If you got a written answer that saved you from a bad decision, how much would that be worth to you?",
        type: "open" as const,
        sort_order: 6,
        is_baseline: false,
        category: "willingness",
        assumption_index: 1,
      },
    ],
  },
];

async function seed() {
  // Find the first user to be the creator
  const { data: users, error: userError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .limit(1);

  if (userError || !users?.length) {
    console.error("No users found in profiles table:", userError?.message);
    process.exit(1);
  }

  const creator = users[0];
  console.log(`Creator: ${creator.full_name} (${creator.id})`);

  for (const c of CAMPAIGNS) {
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        creator_id: creator.id,
        title: c.title,
        description: c.description,
        status: "active",
        category: c.category,
        tags: c.tags,
        estimated_minutes: 3,
        reward_amount: 0,
        reward_type: "pool",
        distributable_amount: 0,
        target_responses: 5,
        current_responses: 0,
        format: "quick",
        economics_version: 2,
        is_subsidized: true,
        key_assumptions: c.key_assumptions,
        target_interests: c.target_interests,
        target_expertise: c.target_expertise,
        target_age_ranges: c.target_age_ranges,
        quality_score: 72,
        baseline_reach_units: 100,
        funded_reach_units: 0,
        total_reach_units: 100,
        effective_reach_units: 100,
        campaign_strength: 5,
        match_priority: 1,
        reciprocal_gate_status: "exempt",
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      console.error(`Failed to create "${c.title}":`, campaignError?.message);
      continue;
    }

    const questions = c.questions.map((q) => ({
      campaign_id: campaign.id,
      text: q.text,
      type: q.type,
      sort_order: q.sort_order,
      options: q.options ?? null,
      is_baseline: q.is_baseline,
      category: q.category,
      assumption_index: q.assumption_index,
    }));

    const { error: questionsError } = await supabase.from("questions").insert(questions);

    if (questionsError) {
      console.error(`Failed to create questions for "${c.title}":`, questionsError.message);
      continue;
    }

    console.log(`Created: "${c.title}" (${campaign.id}) — ${questions.length} questions`);
  }

  console.log("\nDone. Reciprocal gate now has campaigns to serve.");
}

seed().catch(console.error);
