import { redirect } from "next/navigation";
import WallFeed from "@/components/dashboard/WallFeed";
import WallOnboarding from "@/components/dashboard/WallOnboarding";
import ProfilePrompt from "@/components/dashboard/ProfilePrompt";
import { createClient } from "@/lib/supabase/server";
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

  if (profileIncomplete) {
    redirect("/dashboard/settings?complete-profile=true");
  }

  return (
    <>
      {showOnboarding && profile && (
        <WallOnboarding
          userName={profile.full_name ?? ""}
          userRole={profile.role ?? "founder"}
          hasAvatar={!!profile.avatar_url}
          hasPosted={!!profile.has_posted}
          hasResponded={!!profile.has_responded}
          ideaCount={ideas.length}
        />
      )}

      {profileIncomplete && <ProfilePrompt />}

      <WallFeed ideas={ideas} userProfile={userProfile} />
    </>
  );
}
