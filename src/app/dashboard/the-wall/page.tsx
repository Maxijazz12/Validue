import { redirect } from "next/navigation";
import WallFeed from "@/components/dashboard/WallFeed";
import WallOnboarding from "@/components/dashboard/WallOnboarding";
import ProfilePrompt from "@/components/dashboard/ProfilePrompt";
import { createClient } from "@/lib/supabase/server";
import { shouldShowRespondentProfile } from "@/lib/profile-role";
import { loadWallPageData } from "./load-wall-page-data";

export default async function TheWallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { profile, ideas, userProfile, profileIncomplete, showOnboarding } =
    await loadWallPageData(supabase, user.id);

  return (
    <>
      {profileIncomplete && <ProfilePrompt />}

      {showOnboarding && profile && !profileIncomplete && (
        <WallOnboarding
          userName={profile.full_name ?? ""}
          showRespondentExperience={shouldShowRespondentProfile(profile)}
          hasAvatar={!!profile.avatar_url}
          hasPosted={!!profile.has_posted}
          hasResponded={!!profile.has_responded}
          ideaCount={ideas.length}
        />
      )}

      <WallFeed ideas={ideas} userProfile={userProfile} />
    </>
  );
}
