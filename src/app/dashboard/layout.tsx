import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { count: ideaCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id);

  const userName = profile?.full_name || user.email || "User";
  const userAvatar = profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Sidebar userName={userName} userAvatar={userAvatar} ideaCount={ideaCount ?? 0} />
      <main className="md:ml-[240px] min-h-screen">
        <div className="max-w-[960px] mx-auto px-[32px] py-[40px] max-md:px-[20px] max-md:pt-[72px]">
          {children}
        </div>
      </main>
    </div>
  );
}
