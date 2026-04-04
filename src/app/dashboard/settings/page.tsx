import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RespondentProfileForm from "@/components/dashboard/RespondentProfileForm";
import AvatarUpload from "@/components/dashboard/settings/AvatarUpload";
import PasswordChangeForm from "@/components/dashboard/settings/PasswordChangeForm";
import NotificationPreferences from "@/components/dashboard/settings/NotificationPreferences";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";
import {
  getPrimaryModeLabel,
  shouldShowRespondentProfile,
} from "@/lib/profile-role";
import DeleteAccountButton from "./DeleteAccountButton";

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
  searchParams: Promise<{ "complete-profile"?: string; error?: string }>;
}) {
  const params = await searchParams;
  const showCompletePrompt = params?.["complete-profile"] === "true";
  const errorType = params?.error;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const showRespondentProfile = shouldShowRespondentProfile(profile);

  return (
    <div className="max-w-2xl mx-auto pb-24 font-sans">
      {showCompletePrompt && showRespondentProfile && (
        <div className="mb-[32px] p-[24px_32px] bg-white border border-brand/20 shadow-[0_8px_30px_rgba(229,101,78,0.06)] rounded-[28px] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
          <p className="text-[16px] font-semibold tracking-tight text-text-primary mb-[4px]">
            Complete your matching profile
          </p>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            Select your interests and expertise below so we can show you the most relevant ideas on The Wall.
          </p>
        </div>
      )}

      {/* Floating Header */}
      <div className="mb-[24px] pt-[8px]">
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">Profile</h1>
        <p className="text-[14px] text-text-secondary mt-[4px]">Manage your profile and account preferences</p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-[20px] md:rounded-[28px] border border-border-light/60 shadow-card overflow-hidden mb-[24px]">
        <div className="p-[32px]">
          <div className="mb-[32px]">
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[6px]">Identity</span>
            <h2 className="text-[20px] font-medium tracking-tight text-text-primary">
              Profile
            </h2>
          </div>

          <div className="mb-[40px]">
            <AvatarUpload
              userId={user!.id}
              name={profile?.full_name || "User"}
              currentUrl={profile?.avatar_url || null}
            />
          </div>

          <form action={updateProfile} className="flex flex-col gap-[20px] max-w-[440px]">
            <div className="flex flex-col gap-[8px]">
              <label htmlFor="fullName" className="text-[13px] font-bold uppercase tracking-[0.04em] text-text-muted">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={profile?.full_name || ""}
                maxLength={MAX_LENGTHS.PROFILE_NAME}
                className={`w-full px-[18px] py-[14px] rounded-[16px] border bg-bg-muted/60 text-[15px] text-text-primary font-medium outline-none transition-all duration-300 hover:border-border-light focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent shadow-sm ${
                  errorType === "content" ? "border-[var(--color-error)] bg-[var(--color-error-light)]" : "border-transparent"
                }`}
                required
              />
              {errorType === "content" && (
                <span className="text-[12px] font-semibold text-[var(--color-error)] tracking-wide">
                  Name contains disallowed content. Please try a different name.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className="text-[13px] font-bold uppercase tracking-[0.04em] text-text-muted">
                Email
              </label>
              <input
                type="email"
                value={user!.email || ""}
                disabled
                className="w-full px-[18px] py-[14px] rounded-[16px] border border-border-light/40 bg-white/50 text-[15px] text-text-muted font-medium cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className="text-[13px] font-bold uppercase tracking-[0.04em] text-text-muted">
                Primary mode
              </label>
              <div className="flex flex-col gap-[8px]">
                <div className="px-[18px] py-[14px] rounded-[16px] border border-border-light/40 bg-white/50 text-[15px] font-medium text-text-secondary inline-flex">
                  {getPrimaryModeLabel(profile?.role)}
                </div>
                <p className="text-[12px] leading-relaxed text-text-muted max-w-[420px]">
                  This sets your default onboarding path. You can still post ideas and respond to other people&apos;s ideas from the same account.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="self-start inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-medium tracking-wide bg-accent text-white transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent-dark hover:shadow-[0_8px_24px_-8px_rgba(28,25,23,0.3)] hover:-translate-y-[1px] cursor-pointer mt-[12px]"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>

      {/* Respondent matching profile */}
      {showRespondentProfile && (
        <div className="mb-[32px]">
          <RespondentProfileForm
            interests={profile?.interests ?? []}
            expertise={profile?.expertise ?? []}
            ageRange={profile?.age_range ?? null}
            location={profile?.location ?? ""}
            occupation={profile?.occupation ?? ""}
            industry={profile?.industry ?? ""}
            experienceLevel={profile?.experience_level ?? ""}
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
        />
      </div>

      {/* Danger zone */}
      <div className="bg-[#FFF8F8] border border-red-200/60 rounded-[20px] md:rounded-[28px] p-[20px] md:p-[28px] shadow-card">
        <span className="font-mono text-[11px] font-medium tracking-wide text-red-400 uppercase block mb-[6px]">Caution</span>
        <h2 className="text-[18px] font-medium tracking-tight text-red-600 mb-[10px]">
          Danger zone
        </h2>
        <p className="text-[14px] font-medium text-red-900/60 mb-[24px] max-w-[400px] leading-relaxed">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
