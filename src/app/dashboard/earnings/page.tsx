import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReputationBadge from "@/components/ui/ReputationBadge";
import type { ReputationTier } from "@/lib/reputation-config";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch reputation tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("reputation_score, reputation_tier")
    .eq("id", user.id)
    .single();

  const repTier = (profile?.reputation_tier || "new") as ReputationTier;
  const repScore = Number(profile?.reputation_score) || 0;

  // Fetch all payouts for this respondent
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, platform_fee, status, created_at, campaign:campaigns!campaign_id(id, title)")
    .eq("respondent_id", user.id)
    .order("created_at", { ascending: false });

  const allPayouts = (payouts || []).map((p) => {
    const campaignRaw = p.campaign as unknown;
    const campaign = (
      Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw
    ) as { id: string; title: string } | null;
    return { ...p, campaign };
  });

  const totalEarned = allPayouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingAmount = allPayouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPayouts = allPayouts.length;
  const hasEarnings = totalPayouts > 0;

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          Earnings
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          Track your earnings from responding to ideas
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-[#ebebeb] rounded-xl p-[20px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Total Earned
          </span>
          <div className="font-mono text-[28px] font-bold text-[#65a30d] mt-[4px]">
            ${totalEarned.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[20px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Pending
          </span>
          <div className="font-mono text-[28px] font-bold text-[#e8b87a] mt-[4px]">
            ${pendingAmount.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[20px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Payouts
          </span>
          <div className="font-mono text-[28px] font-bold text-[#111111] mt-[4px]">
            {totalPayouts}
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[20px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Reputation
          </span>
          <div className="flex items-center gap-[8px] mt-[4px]">
            <span className="font-mono text-[28px] font-bold text-[#111111]">
              {repScore}
            </span>
            <ReputationBadge tier={repTier} size="md" />
          </div>
        </div>
      </div>

      {/* Payout notice */}
      {pendingAmount > 0 && (
        <div className="bg-[#e8b87a]/10 border border-[#e8b87a]/20 rounded-xl p-[16px] mb-[24px]">
          <p className="text-[13px] text-[#555555]">
            Payouts are tracked and will be processed when the payment system
            goes live. Your earnings are safe.
          </p>
        </div>
      )}

      {/* Payout history */}
      {hasEarnings ? (
        <div>
          <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">
            Payout History
          </h2>
          <div className="flex flex-col gap-[8px]">
            {allPayouts.map((payout) => {
              const statusConfig: Record<
                string,
                { label: string; bg: string; text: string }
              > = {
                pending: {
                  label: "Pending",
                  bg: "bg-[#e8b87a]/10",
                  text: "text-[#c4883a]",
                },
                processing: {
                  label: "Processing",
                  bg: "bg-[#3b82f6]/10",
                  text: "text-[#3b82f6]",
                },
                completed: {
                  label: "Completed",
                  bg: "bg-[#22c55e]/10",
                  text: "text-[#22c55e]",
                },
                failed: {
                  label: "Failed",
                  bg: "bg-[#ef4444]/10",
                  text: "text-[#ef4444]",
                },
              };
              const config = statusConfig[payout.status] || statusConfig.pending;

              return (
                <div
                  key={payout.id}
                  className="bg-white border border-[#ebebeb] rounded-xl p-[16px] flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start"
                >
                  <div className="min-w-0">
                    <span className="text-[14px] font-medium text-[#111111] block truncate">
                      {payout.campaign?.title || "Unknown Campaign"}
                    </span>
                    <span className="text-[12px] text-[#999999]">
                      {formatDate(payout.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-[10px] shrink-0">
                    <span className="font-mono text-[16px] font-bold text-[#111111]">
                      ${Number(payout.amount).toFixed(2)}
                    </span>
                    <span
                      className={`px-[8px] py-[3px] rounded-full text-[11px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-[48px] text-center">
          <div className="text-[40px] mb-[16px]">&#x1F4B0;</div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No earnings yet
          </h2>
          <p className="text-[14px] text-[#555555] max-w-[360px] mx-auto mb-[28px]">
            Respond to campaigns on The Wall. Founders reward the best
            responses — higher quality means higher earnings.
          </p>
          <Link
            href="/dashboard/the-wall"
            className="inline-flex items-center justify-center px-[32px] py-[14px] rounded-lg text-[15px] font-medium bg-[#111111] text-white hover:bg-[#222222] transition-all no-underline"
          >
            Browse The Wall
          </Link>
        </div>
      )}
    </>
  );
}
