/**
 * Seed a test campaign for testing the response flow.
 *
 * Usage:
 *   npx tsx src/scripts/seed-test-campaign.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - At least one user in the profiles table
 *
 * This creates:
 *   - 1 active campaign with $25 reward
 *   - 5 questions (3 open-ended, 2 multiple choice)
 *   - Targeting: SaaS, AI/ML interests
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
  console.log(`Creating campaign for user: ${creator.full_name} (${creator.id})`);

  // Insert campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      creator_id: creator.id,
      title: "Should We Build a Peer Review Marketplace for SaaS Products?",
      description:
        "We're exploring the idea of a marketplace where SaaS founders can get honest, structured feedback from real users — not investors, not friends, not Twitter. Think of it as user testing meets peer review. We want to validate whether people would actually pay for curated, quality feedback on their products before they launch. Your perspective as someone in the tech/SaaS space is exactly what we need.",
      status: "active",
      category: "SaaS / Software",
      tags: ["SaaS Founders", "Product Managers", "Developers", "Early Adopters", "Tech Workers"],
      estimated_minutes: 8,
      reward_amount: 25,
      reward_type: "pool",
      distributable_amount: 21.25, // 25 * (1 - 0.15)
      bonus_available: true,
      rewards_top_answers: true,
      target_interests: ["SaaS", "AI/ML", "Startups"],
      target_expertise: ["Product Management", "Software Engineering"],
      target_age_ranges: ["25-34", "35-44"],
      target_responses: 50,
      current_responses: 3, // Looks like it has some traction
      key_assumptions: [
        "Founders will pay for structured feedback",
        "Quality feedback is hard to find",
        "Users prefer honest reviews over vanity metrics",
      ],
      quality_score: 75,
      baseline_reach_units: 75,
      funded_reach_units: 50,
      total_reach_units: 125,
      effective_reach_units: 125,
      campaign_strength: 7,
      match_priority: 1,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("Failed to create campaign:", campaignError?.message);
    process.exit(1);
  }

  console.log(`Campaign created: ${campaign.id}`);

  // Insert questions
  const questions = [
    {
      campaign_id: campaign.id,
      text: "Have you ever paid for user feedback or product validation? If so, what was your experience?",
      type: "open",
      sort_order: 0,
      is_baseline: true,
      category: "Experience",
    },
    {
      campaign_id: campaign.id,
      text: "How do you currently validate new product ideas before building them?",
      type: "multiple_choice",
      sort_order: 1,
      options: [
        "Talk to friends and family",
        "Post on social media and gauge interest",
        "Build an MVP and see what happens",
        "Run surveys or interviews with target users",
        "I don't really validate — I just build",
      ],
      is_baseline: false,
      category: "Behavior",
    },
    {
      campaign_id: campaign.id,
      text: "What would make you trust feedback from strangers on the internet more than feedback from people you know?",
      type: "open",
      sort_order: 2,
      is_baseline: false,
      category: "Trust",
    },
    {
      campaign_id: campaign.id,
      text: "How much would you pay per response for high-quality, structured feedback on your product idea?",
      type: "multiple_choice",
      sort_order: 3,
      options: [
        "Nothing — I'd only use it if free",
        "$1-5 per response",
        "$5-15 per response",
        "$15-30 per response",
        "$30+ per response for premium insights",
      ],
      is_baseline: false,
      category: "Pricing",
    },
    {
      campaign_id: campaign.id,
      text: "If this marketplace existed today, what would be the first thing you'd want feedback on? Be specific — we want to understand your real use case.",
      type: "open",
      sort_order: 4,
      is_baseline: false,
      category: "Use Case",
    },
  ];

  const { error: questionsError } = await supabase
    .from("questions")
    .insert(questions);

  if (questionsError) {
    console.error("Failed to create questions:", questionsError.message);
    process.exit(1);
  }

  console.log(`5 questions created`);
  console.log(`\nDone! Visit /dashboard/the-wall to see the campaign.`);
  console.log(`Direct link: /dashboard/the-wall/${campaign.id}`);
}

seed().catch(console.error);
