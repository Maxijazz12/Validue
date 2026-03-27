import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import RespondentProfileForm from "@/components/dashboard/RespondentProfileForm";

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const fullName = formData.get("fullName") as string;

  await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  redirect("/dashboard/settings");
}

export default async function SettingsPage() {
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
      <div className="mb-[40px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          Settings
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          Manage your profile and account
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[24px]">
          Profile
        </h2>

        <div className="flex items-center gap-[16px] mb-[32px]">
          <Avatar
            name={profile?.full_name || "User"}
            imageUrl={profile?.avatar_url}
            size={56}
          />
          <div>
            <div className="text-[15px] font-semibold text-[#111111]">
              {profile?.full_name || "Unnamed"}
            </div>
            <div className="text-[13px] text-[#999999]">
              {user!.email}
            </div>
          </div>
        </div>

        <form action={updateProfile} className="flex flex-col gap-[16px] max-w-[400px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="fullName" className="text-[13px] font-medium text-[#555555]">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={profile?.full_name || ""}
              className="w-full px-[16px] py-[12px] rounded-lg border border-[#ebebeb] bg-white text-[15px] text-[#111111] font-sans outline-none transition-all duration-200 focus:border-[#d4d4d4] focus:shadow-[0_0_0_3px_rgba(232,184,122,0.1)]"
              required
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-[#555555]">
              Email
            </label>
            <input
              type="email"
              value={user!.email || ""}
              disabled
              className="w-full px-[16px] py-[12px] rounded-lg border border-[#ebebeb] bg-[#fafafa] text-[15px] text-[#999999] font-sans cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[13px] font-medium text-[#555555]">
              Role
            </label>
            <div className="px-[16px] py-[12px] rounded-lg border border-[#ebebeb] bg-[#fafafa] text-[15px] text-[#555555] capitalize">
              {profile?.role || "founder"}
            </div>
          </div>

          <button
            type="submit"
            className="self-start inline-flex items-center justify-center px-[24px] py-[12px] rounded-lg text-[14px] font-semibold bg-[#111111] text-white hover:bg-[#222222] transition-all cursor-pointer border-none mt-[8px]"
          >
            Save Changes
          </button>
        </form>
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

      {/* Account section */}
      <div className="bg-white border border-red-200 rounded-2xl p-[32px]">
        <h2 className="text-[16px] font-semibold text-red-600 mb-[8px]">
          Danger zone
        </h2>
        <p className="text-[13px] text-[#555555] mb-[20px]">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <button
          className="inline-flex items-center justify-center px-[20px] py-[10px] rounded-lg text-[13px] font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-all cursor-pointer"
          disabled
        >
          Delete Account
        </button>
      </div>
    </>
  );
}
