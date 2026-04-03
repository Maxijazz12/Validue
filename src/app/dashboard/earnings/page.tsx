import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Button from "@/components/ui/Button";
import ReputationBadge from "@/components/ui/ReputationBadge";
import StatCard from "@/components/dashboard/StatCard";
import type { ReputationTier } from "@/lib/reputation-config";
import { DEFAULTS } from "@/lib/defaults";

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
      <div className="mb-[24px]">
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">Earnings</h1>
        <p className="text-[14px] text-text-secondary mt-[4px]">Track your earnings from responding to ideas</p>
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
      {availableBalanceCents > 0 && availableBalanceCents < DEFAULTS.MIN_CASHOUT_BALANCE_CENTS && (
        <div className="bg-white border border-warning/20 rounded-[24px] p-[20px] mb-[24px] shadow-card">
          <span className="font-mono text-[11px] font-medium tracking-wide text-warning uppercase block mb-[6px]">Threshold</span>
          <p className="text-[14px] text-text-secondary font-medium">
            You need <span className="font-bold font-mono text-text-primary">${((DEFAULTS.MIN_CASHOUT_BALANCE_CENTS - availableBalanceCents) / 100).toFixed(2)}</span> more
            in available balance to cash out. Minimum cash-out is ${(DEFAULTS.MIN_CASHOUT_BALANCE_CENTS / 100).toFixed(2)}.
          </p>
        </div>
      )}

      {/* Locked balance explainer */}
      {pendingBalanceCents > 0 && (
        <div className="bg-white border border-border-light rounded-[24px] p-[20px] mb-[24px] shadow-card">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[6px]">Lock Period</span>
          <p className="text-[14px] text-text-secondary font-medium">
            Locked payouts become available when their campaigns close. This can take up to 7 days.
          </p>
        </div>
      )}

      {/* Payout history */}
      {hasEarnings ? (
        <>
        <div>
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[6px]">Ledger</span>
          <h2 className="text-[20px] font-medium tracking-tight text-text-primary mb-[16px]">
            Payout History
          </h2>
          <div className="flex flex-col gap-[8px]">
            {allPayouts.map((payout) => {
              const statusConfig: Record<
                string,
                { label: string; bg: string; text: string }
              > = {
                pending: {
                  label: "PENDING",
                  bg: "bg-brand/10",
                  text: "text-brand-dark",
                },
                processing: {
                  label: "PROCESSING",
                  bg: "bg-info/10",
                  text: "text-info",
                },
                completed: {
                  label: "COMPLETED",
                  bg: "bg-success/10",
                  text: "text-success",
                },
                failed: {
                  label: "FAILED",
                  bg: "bg-error/10",
                  text: "text-error",
                },
              };
              const config = statusConfig[payout.status] || statusConfig.pending;

              return (
                <div
                  key={payout.id}
                  className="bg-white border border-border-light rounded-[24px] p-[20px] flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start shadow-card-interactive transition-all duration-400"
                >
                  <div className="min-w-0">
                    <span className="text-[15px] font-medium tracking-tight text-text-primary block truncate">
                      {payout.campaign?.title || "Unknown Campaign"}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide mt-[4px] block">
                      {formatDate(payout.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-[10px] shrink-0">
                    <span className="font-mono text-[16px] font-bold text-text-primary">
                      ${Number(payout.amount).toFixed(2)}
                    </span>
                    <span
                      className={`px-[10px] py-[4px] rounded-md font-mono text-[11px] font-medium uppercase tracking-wide ${config.bg} ${config.text}`}
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
          <div className="mt-[32px]">
            <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[6px]">Pipeline</span>
            <h2 className="text-[20px] font-medium tracking-tight text-text-primary mb-[16px]">Recent Responses</h2>
            <div className="flex flex-col gap-[8px]">
              {responseList.map((r) => {
                const moneyStateConfig: Record<string, { label: string; bg: string; text: string }> = {
                  pending_qualification: { label: "PENDING", bg: "bg-[#94A3B8]/10", text: "text-text-secondary" },
                  locked: { label: "LOCKED", bg: "bg-warning/10", text: "text-[#D97706]" },
                  available: { label: "AVAILABLE", bg: "bg-success/10", text: "text-success" },
                  paid_out: { label: "PAID OUT", bg: "bg-info/10", text: "text-info" },
                  not_qualified: { label: "NOT QUALIFIED", bg: "bg-error/10", text: "text-error" },
                };
                const state = r.money_state || "pending_qualification";
                const config = moneyStateConfig[state] || moneyStateConfig.pending_qualification;
                const amount = Number(r.payout_amount) || 0;

                return (
                  <div key={r.id} className="bg-white border border-border-light rounded-[20px] p-[16px] flex items-center justify-between gap-[12px] shadow-card-interactive transition-all duration-400">
                    <span className="text-[14px] font-medium tracking-tight text-text-primary truncate min-w-0">
                      {r.campaign?.title || "Unknown Campaign"}
                    </span>
                    <div className="flex items-center gap-[8px] shrink-0">
                      {amount > 0 && (
                        <span className="font-mono text-[13px] font-bold text-text-primary">
                          ${amount.toFixed(2)}
                        </span>
                      )}
                      {state === "not_qualified" && (
                        <span className="font-mono text-[13px] text-text-muted">$0.00</span>
                      )}
                      <span className={`px-[8px] py-[3px] rounded-md font-mono text-[11px] font-medium uppercase tracking-wide ${config.bg} ${config.text}`}>
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
        <div className="py-[120px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Balance Empty</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">
            No earnings yet
          </p>
          <p className="text-[14px] text-text-secondary mt-[4px] max-w-[360px] mx-auto mb-[28px]">
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
