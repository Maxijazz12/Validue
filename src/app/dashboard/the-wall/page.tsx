import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import WallFeed from "@/components/dashboard/WallFeed";
import WallOnboarding from "@/components/dashboard/WallOnboarding";
import ProfilePrompt from "@/components/dashboard/ProfilePrompt";
import type { WallCardProps } from "@/components/dashboard/WallCard";

/* ─── Match scoring ─── */

type RespondentProfile = {
  interests: string[];
  expertise: string[];
  age_range: string | null;
  profile_completed: boolean;
  reputation_score: number;
};

type CampaignTargeting = {
  target_interests: string[];
  target_expertise: string[];
  target_age_ranges: string[];
  tags: string[];
};

function computeMatchScore(
  campaign: CampaignTargeting,
  profile: RespondentProfile
): number {
  let score = 0;

  // Interest overlap (0-40 pts)
  if (campaign.target_interests.length > 0 && profile.interests.length > 0) {
    const overlap = campaign.target_interests.filter((i) =>
      profile.interests.includes(i)
    ).length;
    const ratio = overlap / campaign.target_interests.length;
    score += ratio * 40;
  } else if (campaign.target_interests.length === 0) {
    score += 20; // untargeted = neutral match
  }

  // Expertise overlap (0-30 pts)
  if (campaign.target_expertise.length > 0 && profile.expertise.length > 0) {
    const overlap = campaign.target_expertise.filter((e) =>
      profile.expertise.includes(e)
    ).length;
    const ratio = overlap / campaign.target_expertise.length;
    score += ratio * 30;
  } else if (campaign.target_expertise.length === 0) {
    score += 15;
  }

  // Age range match (0-15 pts)
  if (campaign.target_age_ranges.length > 0 && profile.age_range) {
    if (campaign.target_age_ranges.includes(profile.age_range)) score += 15;
  } else if (campaign.target_age_ranges.length === 0) {
    score += 8;
  }

  // Tag overlap with interests/expertise (0-15 pts) — fallback for campaigns using old tags
  if (campaign.tags.length > 0) {
    const allProfileTags = [...profile.interests, ...profile.expertise];
    const tagOverlap = campaign.tags.filter((t) =>
      allProfileTags.includes(t)
    ).length;
    score += Math.min((tagOverlap / campaign.tags.length) * 15, 15);
  }

  // Reputation boost (0-10 pts) — higher reputation = better matching
  if (profile.reputation_score > 0) {
    score += Math.min(10, profile.reputation_score / 10);
  }

  return Math.round(score);
}

/* ─── Page ─── */

export default async function TheWallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile including matching fields
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, role, avatar_url, onboarding_completed, has_responded, has_posted, interests, expertise, age_range, profile_completed, reputation_score"
    )
    .eq("id", user!.id)
    .single();

  // Fetch active campaigns with targeting fields + reach budget
  // Only show campaigns that still have remaining reach units
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "*, creator:profiles!creator_id(full_name, avatar_url)"
    )
    .eq("status", "active")
    .order("match_priority", { ascending: false })
    .order("created_at", { ascending: false });

  // Build respondent profile for matching
  const respondentProfile: RespondentProfile = {
    interests: profile?.interests ?? [],
    expertise: profile?.expertise ?? [],
    age_range: profile?.age_range ?? null,
    profile_completed: !!profile?.profile_completed,
    reputation_score: Number(profile?.reputation_score) || 0,
  };

  const isRespondent = profile?.role === "respondent";
  const profileIncomplete = isRespondent && !respondentProfile.profile_completed;

  // Filter campaigns with remaining reach budget and map to card props
  const visibleCampaigns = (campaigns || []).filter((c) => {
    const totalRU = c.total_reach_units ?? 100;
    const served = c.reach_served ?? 0;
    return served < totalRU; // still has reach budget
  });

  const ideas: WallCardProps[] = visibleCampaigns.map((c) => {
    // Compute match score for respondents with completed profiles
    let matchScore =
      isRespondent && respondentProfile.profile_completed
        ? computeMatchScore(
            {
              target_interests: c.target_interests ?? [],
              target_expertise: c.target_expertise ?? [],
              target_age_ranges: c.target_age_ranges ?? [],
              tags: c.tags ?? [],
            },
            respondentProfile
          )
        : 50; // neutral for founders or incomplete profiles

    // Boost score by match_priority (tier-based: 1-4 → 0-15 bonus pts)
    const priority = c.match_priority ?? 1;
    matchScore += (priority - 1) * 5;

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category ?? null,
      tags: c.tags ?? [],
      estimatedMinutes: c.estimated_minutes ?? 5,
      rewardAmount: Number(c.reward_amount) || 0,
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
      matchScore: Math.min(matchScore, 100),
    };
  });

  // Increment reach_served for campaigns shown to this respondent (fire-and-forget)
  if (isRespondent && ideas.length > 0) {
    const shownIds = ideas.map((i) => i.id);
    sql`
      UPDATE campaigns
      SET reach_served = reach_served + 1
      WHERE id = ANY(${shownIds})
        AND status = 'active'
    `.catch((err) => {
      console.error("[wall] Failed to increment reach_served:", err);
    });
  }

  const showOnboarding = profile && !profile.onboarding_completed;

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          The Wall
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          Ideas matched to your profile. Earn by sharing qualified feedback.
        </p>
      </div>

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

      <div id="wall-feed">
        <WallFeed ideas={ideas} />
      </div>
    </>
  );
}
