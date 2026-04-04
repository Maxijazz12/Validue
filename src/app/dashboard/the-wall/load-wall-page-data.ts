import type { createClient } from "@/lib/supabase/server";
import type { WallCardProps } from "@/components/dashboard/WallCardUnified";
import type { WallUserProfile } from "@/components/dashboard/WallFeed";
import {
  computeWallScore,
  sortByWallScore,
  type RespondentProfile,
  type WallCampaign,
} from "@/lib/wall-ranking";
import { DEFAULTS, safeNumber } from "@/lib/defaults";
import {
  hasRemainingReachBudget,
  isCampaignOpenForResponses,
} from "@/lib/campaign-availability";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = {
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
  has_responded: boolean | null;
  has_posted: boolean | null;
  interests: string[] | null;
  expertise: string[] | null;
  age_range: string | null;
  profile_completed: boolean | null;
  reputation_score: number | null;
  total_responses_completed: number | null;
  reputation_tier: WallUserProfile["reputation_tier"] | null;
  average_quality_score: number | null;
  total_earned: number | null;
};

type CampaignRow = {
  id: string;
  status: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  estimated_minutes: number | null;
  reward_amount: number | null;
  current_responses: number | null;
  target_responses: number | null;
  created_at: string;
  deadline: string | null;
  expires_at: string | null;
  bonus_available: boolean | null;
  rewards_top_answers: boolean | null;
  reward_type: string | null;
  effective_reach_units: number | null;
  total_reach_units: number | null;
  reach_served: number | null;
  is_subsidized: boolean | null;
  economics_version: number | null;
  format: string | null;
  quality_score: number | null;
  match_priority: number | null;
  target_interests: string[] | null;
  target_expertise: string[] | null;
  target_age_ranges: string[] | null;
  estimated_responses_low: number | null;
  creator: { full_name: string | null; avatar_url: string | null } | null;
};

type FirstQuestionRow = {
  id: string;
  text: string;
  type: string;
  options: string[] | null;
  campaign_id: string;
};

type ReactionRow = {
  campaign_id: string;
  reaction_type: string;
  user_id: string;
};

type ResponseDateRow = {
  created_at: string;
};

type FirstQuestionMapValue = {
  id: string;
  text: string;
  type: string;
  options: string[] | null;
};

type WallPageData = {
  profile: ProfileRow | null;
  ideas: WallCardProps[];
  userProfile: WallUserProfile;
  profileIncomplete: boolean;
  showOnboarding: boolean;
};

function buildRespondentProfile(profile: ProfileRow | null): RespondentProfile {
  return {
    interests: profile?.interests ?? [],
    expertise: profile?.expertise ?? [],
    age_range: profile?.age_range ?? null,
    profile_completed: !!profile?.profile_completed,
    reputation_score: safeNumber(profile?.reputation_score),
    total_responses_completed: safeNumber(profile?.total_responses_completed),
  };
}

function buildFirstQuestionMap(rows: FirstQuestionRow[]): Map<string, FirstQuestionMapValue> {
  const map = new Map<string, FirstQuestionMapValue>();

  for (const question of rows) {
    if (map.has(question.campaign_id)) continue;
    map.set(question.campaign_id, {
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options,
    });
  }

  return map;
}

function buildReactionMaps(rows: ReactionRow[], userId: string) {
  const reactionCountsMap = new Map<string, Record<string, number>>();
  const userReactionsMap = new Map<string, string[]>();

  for (const reaction of rows) {
    const counts = reactionCountsMap.get(reaction.campaign_id) || {};
    counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
    reactionCountsMap.set(reaction.campaign_id, counts);

    if (reaction.user_id === userId) {
      const userReactions = userReactionsMap.get(reaction.campaign_id) || [];
      userReactions.push(reaction.reaction_type);
      userReactionsMap.set(reaction.campaign_id, userReactions);
    }
  }

  return { reactionCountsMap, userReactionsMap };
}

function buildWallIdeas(
  campaigns: CampaignRow[],
  respondentProfile: RespondentProfile,
  profile: ProfileRow | null,
  firstQuestionMap: Map<string, FirstQuestionMapValue>,
  reactionCountsMap: Map<string, Record<string, number>>,
  userReactionsMap: Map<string, string[]>
): WallCardProps[] {
  const userInterests = profile?.interests ?? [];
  const userExpertise = profile?.expertise ?? [];

  const scoredCampaigns = campaigns.map((campaign) => {
    const wallCampaign: WallCampaign = {
      id: campaign.id,
      created_at: campaign.created_at,
      current_responses: campaign.current_responses ?? 0,
      target_responses: campaign.target_responses ?? DEFAULTS.MOMENTUM_NO_TARGET,
      reward_amount: safeNumber(campaign.reward_amount),
      estimated_responses_low: campaign.estimated_responses_low ?? 1,
      quality_score: campaign.quality_score ?? null,
      match_priority: campaign.match_priority ?? 1,
      target_interests: campaign.target_interests ?? [],
      target_expertise: campaign.target_expertise ?? [],
      target_age_ranges: campaign.target_age_ranges ?? [],
      tags: campaign.tags ?? [],
    };

    const { wallScore, matchScore } = computeWallScore(wallCampaign, respondentProfile);
    const matchReasons = [
      ...(campaign.target_interests ?? []).filter((interest) => userInterests.includes(interest)),
      ...(campaign.target_expertise ?? []).filter((expertise) => userExpertise.includes(expertise)),
    ].slice(0, 3);

    return { ...campaign, wallCampaign, wallScore, matchScore, matchReasons };
  });

  const sorted = sortByWallScore(
    scoredCampaigns.map((campaign) => ({
      ...campaign.wallCampaign,
      wallScore: campaign.wallScore,
    }))
  );
  const sortedMap = new Map(scoredCampaigns.map((campaign) => [campaign.id, campaign]));

  return sorted.map((sortedCampaign) => {
    const campaign = sortedMap.get(sortedCampaign.id)!;
    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      category: campaign.category ?? null,
      tags: campaign.tags ?? [],
      estimatedMinutes: campaign.estimated_minutes ?? 5,
      rewardAmount: safeNumber(campaign.reward_amount),
      currentResponses: campaign.current_responses ?? 0,
      targetResponses: campaign.target_responses ?? 50,
      createdAt: campaign.created_at,
      deadline: campaign.deadline ?? null,
      creatorName: campaign.creator?.full_name || "Anonymous",
      creatorAvatar: campaign.creator?.avatar_url || null,
      bonusAvailable: !!campaign.bonus_available,
      rewardsTopAnswers: !!campaign.rewards_top_answers,
      rewardType: campaign.reward_type ?? null,
      matchScore: campaign.matchScore,
      matchReasons: campaign.matchReasons,
      firstQuestion: firstQuestionMap.get(campaign.id) ?? null,
      reactionCounts: reactionCountsMap.get(campaign.id) || {},
      userReactions: userReactionsMap.get(campaign.id) || [],
      isSubsidized: !!campaign.is_subsidized,
      economicsVersion: campaign.economics_version ?? 2,
      format: campaign.format ?? null,
    };
  });
}

function calculateCurrentStreak(rows: ResponseDateRow[]): number {
  if (rows.length === 0) return 0;

  const uniqueDays = [...new Set(rows.map((row) => new Date(row.created_at).toISOString().split("T")[0]))]
    .sort()
    .reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index++) {
    const previousDay = new Date(uniqueDays[index - 1]);
    const currentDay = new Date(uniqueDays[index]);
    const diffDays = Math.round((previousDay.getTime() - currentDay.getTime()) / 86400000);
    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}

function buildWallUserProfile(profile: ProfileRow | null, currentStreak: number): WallUserProfile {
  return {
    reputation_score: safeNumber(profile?.reputation_score),
    reputation_tier: profile?.reputation_tier || "new",
    total_responses_completed: safeNumber(profile?.total_responses_completed),
    average_quality_score: safeNumber(profile?.average_quality_score),
    total_earned: safeNumber(profile?.total_earned),
    interests: profile?.interests ?? [],
    expertise: profile?.expertise ?? [],
    has_responded: !!profile?.has_responded,
    current_streak: currentStreak,
  };
}

export async function loadWallPageData(
  supabase: SupabaseClient,
  userId: string
): Promise<WallPageData> {
  const [{ data: profile }, { data: campaigns }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, role, avatar_url, onboarding_completed, has_responded, has_posted, interests, expertise, age_range, profile_completed, reputation_score, total_responses_completed, reputation_tier, average_quality_score, total_earned"
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("campaigns")
      .select("*, creator:profiles!creator_id(full_name, avatar_url)")
      .eq("status", "active")
      .neq("creator_id", userId),
  ]);

  const respondentProfile = buildRespondentProfile(profile as ProfileRow | null);
  const isRespondent = profile?.role === "respondent";
  const profileIncomplete = isRespondent && !respondentProfile.profile_completed;
  const activeCampaigns = ((campaigns as CampaignRow[] | null) ?? []).filter((campaign) =>
    isCampaignOpenForResponses(campaign) && hasRemainingReachBudget(campaign)
  );
  const campaignIds = activeCampaigns.map((campaign) => campaign.id);

  const [
    { data: firstQuestions },
    { data: allReactions },
    { data: recentResponseDates },
  ] = await Promise.all([
    campaignIds.length > 0
      ? supabase
          .from("questions")
          .select("id, text, type, options, campaign_id, sort_order")
          .in("campaign_id", campaignIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as FirstQuestionRow[] }),
    campaignIds.length > 0
      ? supabase
          .from("campaign_reactions")
          .select("campaign_id, reaction_type, user_id")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [] as ReactionRow[] }),
    supabase
      .from("responses")
      .select("created_at")
      .eq("respondent_id", userId)
      .in("status", ["submitted", "ranked"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const firstQuestionMap = buildFirstQuestionMap((firstQuestions as FirstQuestionRow[] | null) ?? []);
  const { reactionCountsMap, userReactionsMap } = buildReactionMaps(
    (allReactions as ReactionRow[] | null) ?? [],
    userId
  );
  const ideas = buildWallIdeas(
    activeCampaigns,
    respondentProfile,
    profile as ProfileRow | null,
    firstQuestionMap,
    reactionCountsMap,
    userReactionsMap
  );
  const currentStreak = calculateCurrentStreak((recentResponseDates as ResponseDateRow[] | null) ?? []);

  return {
    profile: profile as ProfileRow | null,
    ideas,
    userProfile: buildWallUserProfile(profile as ProfileRow | null, currentStreak),
    profileIncomplete,
    showOnboarding: !!profile && !profile.onboarding_completed,
  };
}
