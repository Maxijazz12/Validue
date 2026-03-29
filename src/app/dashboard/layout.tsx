import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileTabBar from "@/components/dashboard/MobileTabBar";
import CommandPalette from "@/components/dashboard/CommandPalette";
import SubscriptionBanner from "@/components/dashboard/SubscriptionBanner";
import NotificationToast from "@/components/dashboard/NotificationToast";
import { getSubscription } from "@/lib/plan-guard";
import { PLAN_CONFIG } from "@/lib/plans";

/** Server-component-safe timestamp (avoids react-hooks/purity false positive). */
const serverNow = () => Date.now();

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
    .select("full_name, avatar_url, total_earned")
    .eq("id", user.id)
    .single();

  const { count: ideaCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", user.id);

  const sub = await getSubscription(user.id);
  const planLimit = PLAN_CONFIG[sub.tier].campaignsPerMonth;

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  // Check if founder has recent responses on their campaigns (last 24h)
  const oneDayAgo = new Date(serverNow() - 24 * 60 * 60 * 1000).toISOString();
  const { count: newResponseCount } = await supabase
    .from("responses")
    .select("*, campaigns!inner(creator_id)", { count: "exact", head: true })
    .eq("campaigns.creator_id", user.id)
    .in("status", ["submitted", "ranked"])
    .gte("created_at", oneDayAgo);

  const userName = profile?.full_name || user.email || "User";
  const userAvatar = profile?.avatar_url || null;
  const totalEarned = Number(profile?.total_earned) || 0;

  return (
    <div className="min-h-screen bg-[#FCFCFD] dark:bg-[#0F1117] relative overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-[8px] focus:left-[8px] focus:px-[16px] focus:py-[8px] focus:bg-[#111111] focus:text-white focus:rounded-lg focus:text-[14px] focus:font-medium">
        Skip to main content
      </a>
      {/* Ambient color washes (matches landing page depth) */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute" style={{ top: '10%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,193,176,0.09) 0%, transparent 70%)' }} />
        <div className="absolute" style={{ bottom: '5%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,196,200,0.08) 0%, transparent 70%)' }} />
        <div className="absolute" style={{ top: '50%', left: '20%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,193,176,0.05) 0%, transparent 70%)' }} />
      </div>
      <Sidebar
        userName={userName}
        userAvatar={userAvatar}
        ideaCount={ideaCount ?? 0}
        planTier={sub.tier}
        campaignsUsed={sub.campaignsUsed}
        campaignLimit={planLimit}
        unreadCount={unreadCount ?? 0}
        totalEarned={totalEarned}
        hasNewResponses={(newResponseCount ?? 0) > 0}
      />
      <MobileTabBar />
      <CommandPalette />
      <main id="main-content" className="md:ml-[240px] min-h-screen relative z-10">
        <div className="max-w-[960px] mx-auto px-[32px] py-[40px] max-md:px-[20px] max-md:pt-[72px] max-md:pb-[80px]">
          <Suspense>
            <SubscriptionBanner />
          </Suspense>
          <NotificationToast userId={user.id} />
          {children}
        </div>
      </main>
    </div>
  );
}
