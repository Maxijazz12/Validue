"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateRespondentProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const interests = formData.getAll("interests") as string[];
  const expertise = formData.getAll("expertise") as string[];
  const ageRange = (formData.get("ageRange") as string) || null;
  const location = (formData.get("location") as string) || null;
  const occupation = (formData.get("occupation") as string) || null;

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

  redirect("/dashboard/settings");
}
