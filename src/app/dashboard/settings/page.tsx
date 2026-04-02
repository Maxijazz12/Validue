import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RespondentProfileForm from "@/components/dashboard/RespondentProfileForm";
import AvatarUpload from "@/components/dashboard/settings/AvatarUpload";
import PasswordChangeForm from "@/components/dashboard/settings/PasswordChangeForm";
import NotificationPreferences from "@/components/dashboard/settings/NotificationPreferences";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const rawName = formData.get("fullName") as string;
  const fullName = enforceLength(rawName, MAX_LENGTHS.PROFILE_NAME).text;

  const check = checkContent(fullName);
  if (!check.allowed) {
    logOps({ event: "content.flagged", userId: user.id, fieldName: "full_name", action: "blocked", reason: check.reason ?? "", entryPoint: "updateProfile" });
    redirect("/dashboard/settings?error=content");
  }

  await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  redirect("/dashboard/settings");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ "complete-profile"?: string }>;
}) {
  const params = await searchParams;
  const showCompletePrompt = params?.["complete-profile"] === "true";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const isRespondent = profile?.role === "respondent";

  return (
    <div className="max-w-2xl mx-auto pb-24 font-sans">
      {showCompletePrompt && isRespondent && (
        <div className="mb-[32px] p-[24px_32px] bg-white border border-[#E5654E]/20 shadow-[0_8px_30px_rgba(229,101,78,0.06)] rounded-[28px] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#E5654E]/50 to-transparent" />
          <p className="text-[16px] font-semibold tracking-tight text-[#1C1917] mb-[4px]">
            Complete your matching profile
          </p>
          <p className="text-[14px] text-[#78716C] leading-relaxed">
            Select your interests and expertise below so we can show you the most relevant ideas on The Wall.
          </p>
        </div>
      )}

      {/* Floating Header */}
      <div className="mb-[32px] pt-[8px]">
        <h1 className="text-[28px] font-medium tracking-tight text-[#1C1917]">Settings</h1>
        <p className="text-[15px] font-medium text-[#A8A29E] mt-[6px]">Manage your profile and account preferences</p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-[28px] border border-[#E7E5E4]/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden mb-[32px]">
        <div className="p-[32px]">
          <h2 className="text-[20px] font-medium tracking-tight text-[#1C1917] mb-[32px]">
            Profile
          </h2>

          <div className="mb-[40px]">
            <AvatarUpload
              userId={user!.id}
              name={profile?.full_name || "User"}
              currentUrl={profile?.avatar_url || null}
            />
          </div>

          <form action={updateProfile} className="flex flex-col gap-[20px] max-w-[440px]">
            <div className="flex flex-col gap-[8px]">
              <label htmlFor="fullName" className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={profile?.full_name || ""}
                className="w-full px-[18px] py-[14px] rounded-[16px] border border-transparent bg-[#F5F5F4]/60 text-[15px] text-[#1C1917] font-medium outline-none transition-all duration-300 hover:border-[#E7E5E4] focus:bg-white focus:border-[#1C1917] focus:ring-1 focus:ring-[#1C1917] shadow-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
                Email
              </label>
              <input
                type="email"
                value={user!.email || ""}
                disabled
                className="w-full px-[18px] py-[14px] rounded-[16px] border border-[#E7E5E4]/40 bg-white/50 text-[15px] text-[#A8A29E] font-medium cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
                Role
              </label>
              <div className="px-[18px] py-[14px] rounded-[16px] border border-[#E7E5E4]/40 bg-white/50 text-[15px] font-medium text-[#78716C] capitalize inline-flex">
                {profile?.role || "founder"}
              </div>
            </div>

            <button
              type="submit"
              className="self-start inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-semibold tracking-wide bg-[#1C1917] text-white transition-all duration-500 hover:bg-[#292524] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] cursor-pointer mt-[12px]"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>

      {/* Respondent matching profile */}
      {isRespondent && (
        <div className="mb-[32px]">
          <RespondentProfileForm
            interests={profile?.interests ?? []}
            expertise={profile?.expertise ?? []}
            ageRange={profile?.age_range ?? null}
            location={profile?.location ?? ""}
            occupation={profile?.occupation ?? ""}
          />
        </div>
      )}

      {/* Password change */}
      <div className="mb-[32px]">
        <PasswordChangeForm />
      </div>

      {/* Notification preferences */}
      <div className="mb-[32px]">
        <NotificationPreferences
          preferences={(profile?.notification_preferences as Record<string, boolean>) || {}}
          role={profile?.role || "founder"}
        />
      </div>

      {/* Danger zone */}
      <div className="bg-[#FFF8F8] border border-red-200/60 rounded-[28px] p-[32px] shadow-[0_8px_30px_rgba(239,68,68,0.02)]">
        <h2 className="text-[18px] font-medium tracking-tight text-red-600 mb-[10px]">
          Danger zone
        </h2>
        <p className="text-[14px] font-medium text-red-900/60 mb-[24px] max-w-[400px] leading-relaxed">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          className="inline-flex items-center justify-center px-[24px] py-[12px] rounded-full text-[13px] font-bold tracking-wide border border-transparent bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 cursor-not-allowed opacity-50"
          disabled
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
