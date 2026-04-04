"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkContent, enforceLength, MAX_LENGTHS } from "@/lib/content-filter";
import { logOps } from "@/lib/ops-logger";
import { INTEREST_OPTIONS, EXPERTISE_OPTIONS } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

export async function updateRespondentProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const rl = rateLimit(`profile:${user.id}`, 60000, 10);
  if (!rl.allowed) redirect("/dashboard/settings?error=rate-limit");

  const interests = (formData.getAll("interests") as string[])
    .filter((i) => (INTEREST_OPTIONS as readonly string[]).includes(i))
    .slice(0, 10);
  const expertise = (formData.getAll("expertise") as string[])
    .filter((e) => (EXPERTISE_OPTIONS as readonly string[]).includes(e))
    .slice(0, 10);
  const ageRange = (formData.get("ageRange") as string) || null;
  const location = (formData.get("location") as string) || null;
  const rawOccupation = (formData.get("occupation") as string) || null;

  // Length enforcement + content check on free-text fields
  const occupation = rawOccupation
    ? enforceLength(rawOccupation, MAX_LENGTHS.OCCUPATION).text
    : null;

  if (occupation) {
    const check = checkContent(occupation);
    if (!check.allowed) {
      logOps({ event: "content.flagged", userId: user.id, fieldName: "occupation", action: "blocked", reason: check.reason ?? "", entryPoint: "updateRespondentProfile" });
      redirect("/dashboard/settings?error=content");
    }
  }

  const profileCompleted = interests.length > 0 && expertise.length > 0;

  await supabase
    .from("profiles")
    .update({
      interests,
      expertise,
      age_range: ageRange,
      location,
      occupation,
      profile_completed: profileCompleted,
    })
    .eq("id", user.id);

  // Send newly-completed respondents to The Wall to see their personalized feed
  if (profileCompleted) {
    redirect("/dashboard/the-wall");
  }
  redirect("/dashboard/settings");
}
