import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WallFeed from "@/components/dashboard/WallFeed";
import WallOnboarding from "@/components/dashboard/WallOnboarding";
import ProfilePrompt from "@/components/dashboard/ProfilePrompt";
import type { WallCardProps, WallComment } from "@/components/dashboard/WallCard";
import type { WallUserProfile } from "@/components/dashboard/WallFeed";
import type { ActivityItem } from "@/components/dashboard/ActivityTicker";
import {
  computeWallScore,
  sortByWallScore,
  type WallCampaign,
  type RespondentProfile,
} from "@/lib/wall-ranking";
import { DEFAULTS, safeNumber } from "@/lib/defaults";

/* ─── Page ─── */

/** Server-component-safe timestamp (avoids react-hooks/purity false positive). */
const serverNow = () => Date.now();

export default async function TheWallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile including matching fields + engagement stats
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, role, avatar_url, onboarding_completed, has_responded, has_posted, interests, expertise, age_range, profile_completed, reputation_score, total_responses_completed, reputation_tier, average_quality_score, total_earned"
    )
    .eq("id", user!.id)
    .single();

  // Fetch active campaigns with targeting fields + reach budget
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "*, creator:profiles!creator_id(full_name, avatar_url)"
    )
    .eq("status", "active");

  // Build respondent profile for matching
  const respondentProfile: RespondentProfile = {
    interests: profile?.interests ?? [],
    expertise: profile?.expertise ?? [],
    age_range: profile?.age_range ?? null,
    profile_completed: !!profile?.profile_completed,
    reputation_score: safeNumber(profile?.reputation_score),
    total_responses_completed: safeNumber(profile?.total_responses_completed),
  };

  const isRespondent = profile?.role === "respondent";
  const profileIncomplete = isRespondent && !respondentProfile.profile_completed;

  // Redirect respondents with incomplete profiles to complete their matching profile
  if (profileIncomplete) {
    redirect("/dashboard/settings?complete-profile=true");
  }

  // Filter campaigns with remaining reach budget
  const activeCampaigns = (campaigns || []).filter((c) => {
    const totalRU = safeNumber(c.effective_reach_units, safeNumber(c.total_reach_units, 75));
    const served = c.reach_served ?? 0;
    return served < totalRU;
  });

  // Fetch first question per campaign (bulk query)
  const campaignIds = activeCampaigns.map((c) => c.id);
  const { data: firstQuestions } = campaignIds.length > 0
    ? await supabase
        .from("questions")
        .select("id, text, type, options, campaign_id, sort_order")
        .in("campaign_id", campaignIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const firstQuestionMap = new Map<string, { id: string; text: string; type: string; options: string[] | null }>();
  for (const q of firstQuestions || []) {
    if (!firstQuestionMap.has(q.campaign_id)) {
      firstQuestionMap.set(q.campaign_id, {
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
      });
    }
  }

  // Bulk fetch comments for all campaigns
  const { data: allComments } = campaignIds.length > 0
    ? await supabase
        .from("campaign_comments")
        .select("id, campaign_id, author_id, content, created_at, author:profiles!author_id(full_name, avatar_url)")
        .in("campaign_id", campaignIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const commentMap = new Map<string, WallComment[]>();
  for (const c of allComments || []) {
    const list = commentMap.get(c.campaign_id) || [];
    list.push({
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      authorName: ((c.author as unknown as { full_name: string }) ?? {}).full_name || "Anonymous",
      authorAvatar: ((c.author as unknown as { avatar_url: string | null }) ?? {}).avatar_url || null,
      isOwn: c.author_id === user!.id,
    });
    commentMap.set(c.campaign_id, list);
  }

  // Bulk fetch reactions for all campaigns
  const { data: allReactions } = campaignIds.length > 0
    ? await supabase
        .from("campaign_reactions")
        .select("campaign_id, reaction_type, user_id")
        .in("campaign_id", campaignIds)
    : { data: [] };

  const reactionCountsMap = new Map<string, Record<string, number>>();
  const userReactionsMap = new Map<string, string[]>();
  for (const r of allReactions || []) {
    // Aggregate counts
    const counts = reactionCountsMap.get(r.campaign_id) || {};
    counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    reactionCountsMap.set(r.campaign_id, counts);
    // Track current user's reactions
    if (r.user_id === user!.id) {
      const userR = userReactionsMap.get(r.campaign_id) || [];
      userR.push(r.reaction_type);
      userReactionsMap.set(r.campaign_id, userR);
    }
  }

  // Bulk fetch recent respondents for avatar stacks + activity pulse
  const { data: recentResponders } = campaignIds.length > 0
    ? await supabase
        .from("responses")
        .select("campaign_id, created_at, respondent:profiles!respondent_id(full_name, avatar_url)")
        .in("campaign_id", campaignIds)
        .eq("status", "submitted")
        .order("created_at", { ascending: false })
    : { data: [] };

  const respondentMap = new Map<string, Array<{ name: string; avatar: string | null }>>();
  const activityMap = new Map<string, string>();
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000; // eslint-disable-line react-hooks/purity -- server component, no re-renders

  for (const r of recentResponders || []) {
    // Avatar stack (limit 5 per campaign)
    const list = respondentMap.get(r.campaign_id) || [];
    if (list.length < 5) {
      list.push({
        name: ((r.respondent as unknown as { full_name: string }) ?? {}).full_name || "Anonymous",
        avatar: ((r.respondent as unknown as { avatar_url: string | null }) ?? {}).avatar_url || null,
      });
      respondentMap.set(r.campaign_id, list);
    }
    // Activity pulse (most recent response within 30 min)
    if (!activityMap.has(r.campaign_id) && new Date(r.created_at).getTime() > thirtyMinAgo) {
      const minAgo = Math.max(1, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000)); // eslint-disable-line react-hooks/purity -- server component
      activityMap.set(r.campaign_id, `${minAgo}m ago`);
    }
  }

  // Compute wall scores and sort using v2 composite ranking
  const userInterests = profile?.interests ?? [];
  const userExpertise = profile?.expertise ?? [];

  const scoredCampaigns = activeCampaigns.map((c) => {
    const wallCampaign: WallCampaign = {
      id: c.id,
      created_at: c.created_at,
      current_responses: c.current_responses ?? 0,
      target_responses: c.target_responses ?? DEFAULTS.MOMENTUM_NO_TARGET,
      reward_amount: safeNumber(c.reward_amount),
      estimated_responses_low: c.estimated_responses_low ?? 1,
      quality_score: c.quality_score ?? null,
      match_priority: c.match_priority ?? 1,
      target_interests: c.target_interests ?? [],
      target_expertise: c.target_expertise ?? [],
      target_age_ranges: c.target_age_ranges ?? [],
      tags: c.tags ?? [],
    };

    const { wallScore, matchScore } = computeWallScore(
      wallCampaign,
      respondentProfile
    );

    // Compute match reasons (overlapping interests/expertise)
    const matchReasons = [
      ...(c.target_interests ?? []).filter((i: string) => userInterests.includes(i)),
      ...(c.target_expertise ?? []).filter((e: string) => userExpertise.includes(e)),
    ].slice(0, 3);

    return { ...c, wallScore, matchScore, wallCampaign, matchReasons };
  });

  // Sort by composite wall score with tier priority tiebreaker
  const sorted = sortByWallScore(
    scoredCampaigns.map((sc) => ({
      ...sc.wallCampaign,
      wallScore: sc.wallScore,
    }))
  );

  // Map sorted order back to full campaign data for card props
  const sortedMap = new Map(scoredCampaigns.map((sc) => [sc.id, sc]));

  const ideas: WallCardProps[] = sorted.map((s) => {
    const c = sortedMap.get(s.id)!;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category ?? null,
      tags: c.tags ?? [],
      estimatedMinutes: c.estimated_minutes ?? 5,
      rewardAmount: safeNumber(c.reward_amount),
      currentResponses: c.current_responses ?? 0,
      targetResponses: c.target_responses ?? 50,
      createdAt: c.created_at,
      deadline: c.deadline ?? null,
      creatorName:
        (c.creator as { full_name: string })?.full_name || "Anonymous",
      creatorAvatar:
        (c.creator as { avatar_url: string | null })?.avatar_url || null,
      bonusAvailable: !!c.bonus_available,
      rewardsTopAnswers: !!c.rewards_top_answers,
      rewardType: c.reward_type ?? null,
      matchScore: c.matchScore,
      matchReasons: c.matchReasons,
      firstQuestion: firstQuestionMap.get(c.id) ?? null,
      comments: commentMap.get(c.id) || [],
      reactionCounts: reactionCountsMap.get(c.id) || {},
      userReactions: userReactionsMap.get(c.id) || [],
      recentRespondents: respondentMap.get(c.id) || [],
      lastActivityLabel: activityMap.get(c.id) ?? null,
    };
  });

  // Calculate response streak (consecutive days with at least one response)
  const { data: recentResponseDates } = await supabase
    .from("responses")
    .select("created_at")
    .eq("respondent_id", user!.id)
    .in("status", ["submitted", "ranked"])
    .order("created_at", { ascending: false })
    .limit(30);

  let currentStreak = 0;
  if (recentResponseDates && recentResponseDates.length > 0) {
    const uniqueDays = [...new Set(recentResponseDates.map((r) => new Date(r.created_at).toISOString().split("T")[0]))].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(serverNow() - 86400000).toISOString().split("T")[0];
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) currentStreak++;
        else break;
      }
    }
  }

  // Build user profile for engagement features
  const userProfile: WallUserProfile = {
    reputation_score: safeNumber(profile?.reputation_score),
    reputation_tier: (profile?.reputation_tier as WallUserProfile["reputation_tier"]) || "new",
    total_responses_completed: safeNumber(profile?.total_responses_completed),
    average_quality_score: safeNumber(profile?.average_quality_score),
    total_earned: safeNumber(profile?.total_earned),
    interests: profile?.interests ?? [],
    expertise: profile?.expertise ?? [],
    has_responded: !!profile?.has_responded,
    current_streak: currentStreak,
  };

  // Build activity ticker items from recent payouts and new campaigns
  const activityItems: ActivityItem[] = [];
  const { data: recentPayouts } = await supabase
    .from("payouts")
    .select("amount, profiles!respondent_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);
  for (const p of recentPayouts || []) {
    const name = ((Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { full_name: string } | null)?.full_name || "Someone";
    const first = name.split(" ")[0];
    activityItems.push({ text: `${first} just earned $${Number(p.amount).toFixed(0)} for feedback`, accent: "green" });
  }
  // Add campaign creation activity
  const oneDay = new Date(serverNow() - 24 * 60 * 60 * 1000).toISOString();
  const { count: newCampaignCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("created_at", oneDay);
  if (newCampaignCount && newCampaignCount > 0) {
    activityItems.push({ text: `${newCampaignCount} new campaign${newCampaignCount > 1 ? "s" : ""} posted in the last 24h`, accent: "warm" });
  }
  // Add total responses today
  const { count: todayResponses } = await supabase
    .from("responses")
    .select("*", { count: "exact", head: true })
    .in("status", ["submitted", "ranked"])
    .gte("created_at", oneDay);
  if (todayResponses && todayResponses > 0) {
    activityItems.push({ text: `${todayResponses} response${todayResponses > 1 ? "s" : ""} submitted today`, accent: "blue" });
  }

  // Weekly digest data
  const oneWeekAgo = new Date(serverNow() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: responsesThisWeek } = await supabase
    .from("responses")
    .select("*", { count: "exact", head: true })
    .eq("respondent_id", user!.id)
    .in("status", ["submitted", "ranked"])
    .gte("created_at", oneWeekAgo);

  const { data: weekPayouts } = await supabase
    .from("payouts")
    .select("amount")
    .eq("respondent_id", user!.id)
    .gte("created_at", oneWeekAgo);
  const earnedThisWeek = (weekPayouts || []).reduce((sum, p) => sum + Number(p.amount), 0);

  const weeklyDigest = (responsesThisWeek ?? 0) > 0 || earnedThisWeek > 0
    ? {
        responsesThisWeek: responsesThisWeek ?? 0,
        earnedThisWeek,
        qualityDelta: 0,
        percentile: safeNumber(profile?.reputation_score) >= 70 ? 20 : safeNumber(profile?.reputation_score) >= 50 ? 40 : 0,
      }
    : undefined;

  const showOnboarding = profile && !profile.onboarding_completed;

  return (
    <>

      {showOnboarding && (
        <WallOnboarding
          userName={profile.full_name}
          userRole={profile.role}
          hasAvatar={!!profile.avatar_url}
          hasPosted={!!profile.has_posted}
          hasResponded={!!profile.has_responded}
          ideaCount={ideas.length}
        />
      )}

      {profileIncomplete && <ProfilePrompt />}

      <WallFeed ideas={ideas} userProfile={userProfile} activityItems={activityItems} weeklyDigest={weeklyDigest} />
    </>
  );
}
