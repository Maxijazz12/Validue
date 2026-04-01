import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Button from "@/components/ui/Button";
import ReputationBadge from "@/components/ui/ReputationBadge";
import StatCard from "@/components/dashboard/StatCard";
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

  // Fetch reputation tier + V2 balance fields
  const { data: profile } = await supabase
    .from("profiles")
    .select("reputation_score, reputation_tier, available_balance_cents, pending_balance_cents")
    .eq("id", user.id)
    .single();

  const repTier = (profile?.reputation_tier || "new") as ReputationTier;
  const repScore = Number(profile?.reputation_score) || 0;
  const availableBalanceCents = Number(profile?.available_balance_cents) || 0;
  const pendingBalanceCents = Number(profile?.pending_balance_cents) || 0;

  // Fetch all payouts for this respondent (include V2 base/bonus)
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount, base_amount, bonus_amount, platform_fee, status, created_at, campaign:campaigns!campaign_id(id, title)")
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

  const totalPayouts = allPayouts.length;
  const hasEarnings = totalPayouts > 0;

  // V2: Fetch recent responses with money_state for the status list
  const { data: recentResponses } = await supabase
    .from("responses")
    .select("id, payout_amount, base_payout, bonus_payout, money_state, created_at, campaign:campaigns!campaign_id(id, title)")
    .eq("respondent_id", user.id)
    .in("status", ["submitted", "ranked"])
    .order("created_at", { ascending: false })
    .limit(20);

  const responseList = (recentResponses || []).map((r) => {
    const campaignRaw = r.campaign as unknown;
    const campaign = (Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw) as { id: string; title: string } | null;
    return { ...r, campaign };
  });

  return (
    <>
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[24px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111111]">Earnings</h1>
        <p className="text-[14px] text-[#64748B] mt-[4px]">Track your earnings from responding to ideas</p>
      </div>

      {/* V2 Balance cards */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <StatCard label="Available Balance" value={`$${(availableBalanceCents / 100).toFixed(2)}`} valueColor="#22c55e" />
        <StatCard label="Locked Balance" value={`$${(pendingBalanceCents / 100).toFixed(2)}`} valueColor="#F59E0B" />
        <StatCard label="Total Paid Out" value={`$${totalEarned.toFixed(2)}`} />
        <StatCard label="Reputation" value={repScore}>
          <div className="mt-[4px]">
            <ReputationBadge tier={repTier} size="md" />
          </div>
        </StatCard>
      </div>

      {/* Cash-out threshold notice */}
      {availableBalanceCents > 0 && availableBalanceCents < 200 && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-[16px] mb-[24px]">
          <p className="text-[13px] text-[#64748B]">
            You need <span className="font-semibold font-mono">${((200 - availableBalanceCents) / 100).toFixed(2)}</span> more
            in available balance to cash out. Minimum cash-out is $2.00.
          </p>
        </div>
      )}

      {/* Locked balance explainer */}
      {pendingBalanceCents > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-[16px] mb-[24px]">
          <p className="text-[13px] text-[#64748B]">
            Locked payouts become available when their campaigns close. This can take up to 7 days.
          </p>
        </div>
      )}

      {/* Payout history */}
      {hasEarnings ? (
        <>
        <div>
          <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">
            Payout History
          </h2>
          <div className="flex flex-col gap-[12px]">
            {allPayouts.map((payout) => {
              const statusConfig: Record<
                string,
                { label: string; bg: string; text: string }
              > = {
                pending: {
                  label: "Pending",
                  bg: "bg-[#E5654E]/10",
                  text: "text-[#CC5340]",
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
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start hover:border-[#CBD5E1] transition-all duration-200"
                >
                  <div className="min-w-0">
                    <span className="text-[14px] font-medium text-[#111111] block truncate">
                      {payout.campaign?.title || "Unknown Campaign"}
                    </span>
                    <span className="text-[12px] text-[#94A3B8]">
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

        {/* V2: Recent responses with money state */}
        {responseList.length > 0 && (
          <div className="mt-[24px]">
            <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">Recent Responses</h2>
            <div className="flex flex-col gap-[8px]">
              {responseList.map((r) => {
                const moneyStateConfig: Record<string, { label: string; bg: string; text: string }> = {
                  pending_qualification: { label: "Pending", bg: "bg-[#94A3B8]/10", text: "text-[#64748B]" },
                  locked: { label: "Locked", bg: "bg-[#F59E0B]/10", text: "text-[#D97706]" },
                  available: { label: "Available", bg: "bg-[#22c55e]/10", text: "text-[#22c55e]" },
                  paid_out: { label: "Paid out", bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
                  not_qualified: { label: "Not qualified", bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
                };
                const state = r.money_state || "pending_qualification";
                const config = moneyStateConfig[state] || moneyStateConfig.pending_qualification;
                const amount = Number(r.payout_amount) || 0;

                return (
                  <div key={r.id} className="bg-white border border-[#E2E8F0] rounded-xl p-[12px] flex items-center justify-between gap-[12px]">
                    <span className="text-[13px] text-[#111111] truncate min-w-0">
                      {r.campaign?.title || "Unknown Campaign"}
                    </span>
                    <div className="flex items-center gap-[8px] shrink-0">
                      {amount > 0 && (
                        <span className="font-mono text-[13px] font-semibold text-[#111111]">
                          ${amount.toFixed(2)}
                        </span>
                      )}
                      {state === "not_qualified" && (
                        <span className="text-[13px] text-[#94A3B8]">$0.00</span>
                      )}
                      <span className={`px-[6px] py-[2px] rounded-full text-[10px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
      ) : (
        <div className="bg-[#FAF9FA] border border-[#E2E8F0] rounded-2xl p-[48px] text-center relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
            No earnings <span className="italic font-normal text-gradient-warm">yet</span>
          </h2>
          <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto mb-[28px]">
            Thoughtful feedback pays. Literally. Head to The Wall and share what you know.
          </p>
          <Button href="/dashboard/the-wall">
            Browse The Wall
          </Button>
        </div>
      )}
    </>
  );
}
