/**
 * Seed fake responses for brief generation testing.
 * Usage: npx tsx src/scripts/seed-responses.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const CAMPAIGN_ID = "8f97d26d-38fe-4ede-b627-791cbcd2df3f";

// Realistic respondent answers per question
const RESPONDENT_ANSWERS: Record<string, string[]> = {
  // "How much have you spent trying to solve this in the past year?"
  "c320332f-4bd8-45bb-af7c-b2004d168b8c": [
    "About $200 on an accountant for quarterly estimates, plus maybe $50 on apps I tried and abandoned. The accountant was worth it but I can't afford that every quarter.",
    "Honestly zero. I just wing it and then scramble in April. Last year I owed $3,200 I didn't expect and it wrecked my cash flow for two months.",
    "I pay $30/month for QuickBooks Self-Employed but I only actually use it during tax season. The rest of the year I forget to categorize things.",
    "Around $500 total — $300 for TurboTax plus hours of my own time trying to figure out estimated payments. I'm a designer, not an accountant.",
    "Maybe $150 on various apps. Nothing stuck because they all want me to manually enter every transaction. I need something that just works in the background.",
  ],
  // "What's your current workaround, and what's wrong with it?"
  "aa48fb8a-86c0-404d-a2da-96c179f0af6c": [
    "I use a spreadsheet I found on Reddit. It technically works but I have to remember to update it, and I never do. By Q3 I'm always behind.",
    "I literally just save 30% of every payment into a separate savings account. It's way too much but I'm terrified of underpaying. That money could be working for me.",
    "QuickBooks Self-Employed estimates my quarterly taxes but the estimates are always wrong because my income is irregular. Feast or famine as a freelancer.",
    "My workaround is denial. I ignore it until January and then panic. I know it's terrible but the cognitive load of tracking everything on top of actually doing client work is too much.",
    "I hired a bookkeeper for $150/month but honestly for my income level ($60-80k) it feels like overkill. I just need something between 'do nothing' and 'hire a person'.",
  ],
  // "How do you currently decide what to use for this?"
  "2084afa6-5f1f-4138-b938-178e6e1c759f": [
    "I ask other freelancers in my Slack communities. Most of them are just as lost as I am. The blind leading the blind.",
    "I google 'best tax app for freelancers' every January, try whatever's top-rated, use it for two weeks, then stop. The switching cost is low because I never commit.",
    "Price is the biggest factor. I won't pay more than $15/month for something like this. After that it's ease of use — if I have to spend 30 minutes setting it up, I'm out.",
    "I look for something that connects to my bank automatically. Manual entry is a dealbreaker. Also it needs to understand that my income varies wildly month to month.",
    "Honestly I just use whatever my accountant recommends. But her suggestions are always enterprise-level tools that are way too complex for a solo freelancer.",
  ],
  // "What would need to be true for you to pay for a solution?"
  "3584be6c-db0b-442d-aeb3-0c983d10f4e9": [
    "It would need to automatically connect to my bank, categorize expenses, and tell me exactly how much to set aside each month. No manual work.",
    "I'd pay if it could guarantee I'd never owe a surprise amount at tax time. The peace of mind alone is worth $10-15/month to me.",
    "It would need to handle the quarterly estimated payment calculations AND remind me when they're due. Bonus if it could auto-pay the IRS for me.",
    "Two things: it has to be dead simple (I'm not an accountant) and it has to save me more money than it costs. If it can find deductions I'm missing, I'm sold.",
    "I'd need to trust that it actually understands freelancer tax rules. Most apps are built for W-2 employees. Show me it works for 1099 income and I'll pay.",
  ],
  // "How much have you spent on tools?" (MCQ)
  "361923f7-92b0-4598-84cf-f2c00fe2595a": [
    "$0 - I use free tools only",
    "$50-200 per year",
    "$50-200 per year",
    "$200-500 per year",
    "$0 - I use free tools only",
  ],
  // "What do you currently use?" (MCQ)
  "96ff38fa-256e-4c5f-a164-791f3a77eec4": [
    "Spreadsheets (Google Sheets, Excel)",
    "Nothing / I wing it",
    "QuickBooks Self-Employed",
    "Nothing / I wing it",
    "Spreadsheets (Google Sheets, Excel)",
  ],
};

async function seed() {
  // Get 5 different respondent profiles (not the campaign creator)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("creator_id")
    .eq("id", CAMPAIGN_ID)
    .single();

  if (!campaign) {
    console.error("Campaign not found");
    process.exit(1);
  }

  // Get all profiles except creator
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .neq("id", campaign.creator_id)
    .limit(10);

  if (!profiles?.length) {
    console.error("No respondent profiles found. Creating fake ones...");
    process.exit(1);
  }

  const questionIds = Object.keys(RESPONDENT_ANSWERS);

  for (let i = 0; i < 5; i++) {
    // Cycle through available profiles, reuse if needed
    const profile = profiles[i % profiles.length];

    // Create response
    const { data: response, error: respError } = await supabase
      .from("responses")
      .insert({
        campaign_id: CAMPAIGN_ID,
        respondent_id: profile.id,
        status: "submitted",
        is_partial: false,
        money_state: "pending_qualification",
      })
      .select("id")
      .single();

    if (respError) {
      console.error(`Response ${i + 1} failed:`, respError.message);
      continue;
    }

    // Create answers
    for (const qId of questionIds) {
      const answerText = RESPONDENT_ANSWERS[qId][i];
      await supabase.from("answers").insert({
        response_id: response.id,
        question_id: qId,
        text: answerText,
        metadata: {
          timeSpentMs: 15000 + Math.floor(Math.random() * 45000),
          charCount: answerText.length,
          pasteDetected: false,
          pasteCount: 0,
        },
      });
    }

    console.log(`Response ${i + 1}/5 created (${profile.full_name})`);
  }

  // Update campaign response count
  await supabase
    .from("campaigns")
    .update({ current_responses: 5 })
    .eq("id", CAMPAIGN_ID);

  console.log("\nDone. 5 responses seeded. Go to /dashboard/ideas/" + CAMPAIGN_ID + "/brief");
}

seed().catch(console.error);
