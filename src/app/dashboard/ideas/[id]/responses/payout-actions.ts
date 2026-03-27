"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateRespondentReputation } from "@/lib/reputation";

const PLATFORM_FEE_RATE = 0.15;
const MIN_PAYOUT = 0.5;

export type PayoutSuggestion = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  suggestedAmount: number;
};

export async function suggestDistribution(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reward_amount, distributable_amount")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  const distributable = Number(campaign.distributable_amount) || 0;
  if (distributable <= 0) return { suggestions: [], distributable: 0 };

  // Fetch ranked responses
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id, quality_score, respondent:profiles!respondent_id(full_name)")
    .eq("campaign_id", campaignId)
    .eq("status", "ranked")
    .order("quality_score", { ascending: false, nullsFirst: false });

  if (!responses || responses.length === 0)
    return { suggestions: [], distributable };

  // AI-suggested distribution: quadratic weighting
  const scored = responses
    .map((r) => {
      const score = Number(r.quality_score) || 0;
      const weight = Math.pow(Math.max(score - 20, 0), 2);
      const respondentRaw = r.respondent as unknown;
      const respondent = (
        Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
      ) as { full_name: string } | null;
      return {
        responseId: r.id,
        respondentId: r.respondent_id,
        respondentName: respondent?.full_name || "Anonymous",
        qualityScore: score,
        weight,
      };
    })
    .filter((r) => r.weight > 0);

  const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);

  if (totalWeight === 0)
    return { suggestions: [], distributable };

  // Distribute proportionally, apply min payout floor
  let suggestions: PayoutSuggestion[] = scored.map((r) => ({
    responseId: r.responseId,
    respondentId: r.respondentId,
    respondentName: r.respondentName,
    qualityScore: r.qualityScore,
    suggestedAmount: Math.round(
      ((r.weight / totalWeight) * distributable) * 100
    ) / 100,
  }));

  // Filter out amounts below minimum payout
  suggestions = suggestions.filter((s) => s.suggestedAmount >= MIN_PAYOUT);

  // Redistribute leftover from filtered entries
  const allocated = suggestions.reduce((s, r) => s + r.suggestedAmount, 0);
  if (allocated < distributable && suggestions.length > 0) {
    const leftover = distributable - allocated;
    // Give leftover to top response
    suggestions[0].suggestedAmount =
      Math.round((suggestions[0].suggestedAmount + leftover) * 100) / 100;
  }

  return { suggestions, distributable };
}

export type PayoutAllocation = {
  responseId: string;
  amount: number;
};

export async function allocatePayouts(
  campaignId: string,
  allocations: PayoutAllocation[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership and get campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, reward_amount, distributable_amount, payout_status")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.payout_status === "allocated")
    throw new Error("Payouts already allocated");

  const distributable = Number(campaign.distributable_amount) || 0;
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

  if (totalAllocated > distributable + 0.01)
    throw new Error(
      `Total ($${totalAllocated.toFixed(2)}) exceeds distributable amount ($${distributable.toFixed(2)})`
    );

  // Validate all responses belong to this campaign
  const responseIds = allocations.map((a) => a.responseId);
  const { data: responses } = await supabase
    .from("responses")
    .select("id, respondent_id")
    .eq("campaign_id", campaignId)
    .in("id", responseIds);

  if (!responses || responses.length !== responseIds.length)
    throw new Error("Some responses not found");

  const respondentMap = new Map(
    responses.map((r) => [r.id, r.respondent_id])
  );

  // Create payouts and update responses
  for (const allocation of allocations) {
    if (allocation.amount < MIN_PAYOUT) continue;

    const respondentId = respondentMap.get(allocation.responseId);
    if (!respondentId) continue;

    const platformFee =
      Math.round(allocation.amount * PLATFORM_FEE_RATE * 100) / 100;

    // Create payout record
    await supabase.from("payouts").insert({
      response_id: allocation.responseId,
      campaign_id: campaignId,
      founder_id: user.id,
      respondent_id: respondentId,
      amount: allocation.amount,
      platform_fee: platformFee,
      status: "pending",
    });

    // Update response payout_amount
    await supabase
      .from("responses")
      .update({ payout_amount: allocation.amount })
      .eq("id", allocation.responseId);
  }

  // Mark campaign as allocated
  await supabase
    .from("campaigns")
    .update({ payout_status: "allocated" })
    .eq("id", campaignId);

  // Update reputation for all paid respondents
  const paidRespondentIds = new Set(
    allocations
      .filter((a) => a.amount >= MIN_PAYOUT)
      .map((a) => respondentMap.get(a.responseId))
      .filter(Boolean) as string[]
  );
  for (const rid of paidRespondentIds) {
    await updateRespondentReputation(rid);
  }

  revalidatePath(`/dashboard/ideas/${campaignId}/responses`);
  revalidatePath("/dashboard/my-responses");
  revalidatePath("/dashboard/earnings");

  return { success: true, count: allocations.filter((a) => a.amount >= MIN_PAYOUT).length };
}
