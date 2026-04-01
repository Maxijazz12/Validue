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
    <>
      {showCompletePrompt && isRespondent && (
        <div className="mb-[24px] p-[20px_24px] bg-[#F3F4F6] border border-[#E2E8F0] rounded-xl">
          <p className="text-[15px] font-semibold text-[#111111] mb-[4px]">
            Complete your matching profile
          </p>
          <p className="text-[13px] text-[#64748B]">
            Select your interests and expertise below so we can show you the most relevant ideas on The Wall.
          </p>
        </div>
      )}

      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[24px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111111]">Settings</h1>
        <p className="text-[14px] text-[#64748B] mt-[4px]">Manage your profile and account</p>
      </div>

      {/* Profile section */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden mb-[24px]">
        <div className="h-[8px] rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #E5654E, #E8C1B0, #9BC4C8)' }} />
        <div className="p-[32px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[24px]">
          Profile
        </h2>

        <div className="mb-[32px]">
          <AvatarUpload
            userId={user!.id}
            name={profile?.full_name || "User"}
            currentUrl={profile?.avatar_url || null}
          />
        </div>

        <form action={updateProfile} className="flex flex-col gap-[16px] max-w-[400px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="fullName" className="text-[13px] font-medium text-[#64748B]">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={profile?.full_name || ""}
              className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans outline-none transition-all duration-300 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
              required
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-[#64748B]">
              Email
            </label>
            <input
              type="email"
              value={user!.email || ""}
              disabled
              className="w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-[#FCFCFD] text-[15px] text-[#94A3B8] font-sans cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-[#64748B]">
              Role
            </label>
            <div className="px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-[#FCFCFD] text-[15px] text-[#64748B] capitalize">
              {profile?.role || "founder"}
            </div>
          </div>

          <button
            type="submit"
            className="self-start inline-flex items-center justify-center px-[24px] py-[12px] rounded-xl text-[14px] font-medium bg-[#111111] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer border-none mt-[8px]"
          >
            Save Changes
          </button>
        </form>
        </div>
      </div>

      {/* Respondent matching profile */}
      {isRespondent && (
        <RespondentProfileForm
          interests={profile?.interests ?? []}
          expertise={profile?.expertise ?? []}
          ageRange={profile?.age_range ?? null}
          location={profile?.location ?? ""}
          occupation={profile?.occupation ?? ""}
        />
      )}

      {/* Password change */}
      <div className="mb-[24px]">
        <PasswordChangeForm />
      </div>

      {/* Notification preferences */}
      <div className="mb-[24px]">
        <NotificationPreferences
          preferences={(profile?.notification_preferences as Record<string, boolean>) || {}}
          role={profile?.role || "founder"}
        />
      </div>

      {/* Account section */}
      <div className="bg-white border border-red-200 rounded-2xl p-[32px]">
        <h2 className="text-[16px] font-semibold text-red-600 mb-[8px]">
          Danger zone
        </h2>
        <p className="text-[13px] text-[#64748B] mb-[20px]">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          className="inline-flex items-center justify-center px-[20px] py-[10px] rounded-xl text-[13px] font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-all duration-200 cursor-pointer"
          disabled
        >
          Delete Account
        </button>
      </div>
    </>
  );
}
