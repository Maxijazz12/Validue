import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReputationBadge from "@/components/ui/ReputationBadge";
import StatCard from "@/components/dashboard/StatCard";
import Button from "@/components/ui/Button";
import MyResponsesFeed, { type ResponseItem } from "@/components/dashboard/MyResponsesFeed";
import CashoutPanel from "./CashoutPanel";
import RetryCashoutButton from "./RetryCashoutButton";
import type { ReputationTier } from "@/lib/reputation-config";
import { DEFAULTS } from "@/lib/defaults";
import { FEATURES } from "@/lib/feature-flags";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MyResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { connect: connectParam } = await searchParams;

  const [
    { data: profile },
    { data: responses },
    { data: cashouts },
    { data: disputes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("reputation_score, reputation_tier, total_responses_completed, average_quality_score, total_earned, available_balance_cents, pending_balance_cents, stripe_connect_account_id, stripe_connect_onboarding_complete")
      .eq("id", user.id)
      .single(),
    supabase
      .from("responses")
      .select("id, status, quality_score, payout_amount, money_state, disqualification_reasons, ai_feedback, created_at, campaign:campaigns!campaign_id(id, title, category, reward_amount, reward_type)")
      .eq("respondent_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cashouts")
      .select("id, amount_cents, status, created_at, completed_at")
      .eq("respondent_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("disputes")
      .select("response_id")
      .eq("respondent_id", user.id),
  ]);

  const repScore = Number(profile?.reputation_score) || 0;
  const repTier = (profile?.reputation_tier || "new") as ReputationTier;
  const totalCompleted = profile?.total_responses_completed || 0;
  const avgQuality = Number(profile?.average_quality_score) || 0;
  const totalEarned = Number(profile?.total_earned) || 0;
  const availableBalanceCents = Number(profile?.available_balance_cents) || 0;
  const pendingBalanceCents = Number(profile?.pending_balance_cents) || 0;
  const hasConnectAccount = !!profile?.stripe_connect_account_id;
  const onboardingComplete = !!profile?.stripe_connect_onboarding_complete;

  const totalPaidOut = (cashouts || [])
    .filter((c) => c.status === "completed")
    .reduce((sum, c) => sum + ((Number(c.amount_cents) || 0) / 100), 0);

  const hasMoneyActivity =
    availableBalanceCents > 0 ||
    pendingBalanceCents > 0 ||
    totalPaidOut > 0 ||
    totalEarned > 0 ||
    (cashouts?.length ?? 0) > 0;

  const disputedResponseIds = new Set((disputes || []).map((d) => d.response_id));

  // Normalize response data for client component
  const items: ResponseItem[] = (responses || []).map((response) => {
    const campaignRaw = response.campaign as unknown;
    const campaign = (
      Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw
    ) as ResponseItem["campaign"];

    return {
      id: response.id,
      status: response.status,
      quality_score: response.quality_score,
      payout_amount: response.payout_amount,
      money_state: response.money_state,
      disqualification_reasons: response.disqualification_reasons,
      ai_feedback: response.ai_feedback,
      created_at: response.created_at ?? new Date(0).toISOString(),
      campaign,
      alreadyDisputed: disputedResponseIds.has(response.id),
    };
  });

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">My Responses</h1>
        <p className="text-[14px] text-text-secondary mt-[4px]">
          Track your responses{FEATURES.RESPONDENT_PAYOUTS ? ", earnings, and payouts" : " and feedback history"}
        </p>
      </div>

      {/* Stat cards */}
      <div className={`grid gap-[12px] mb-[24px] ${FEATURES.RESPONDENT_PAYOUTS || hasMoneyActivity ? "grid-cols-4 max-md:grid-cols-2" : "grid-cols-3 max-md:grid-cols-1"}`}>
        <StatCard label="Completed" value={totalCompleted} />
        <StatCard label="Reputation" value={repScore}>
          <div className="mt-[4px]">
            <ReputationBadge tier={repTier} size="md" />
          </div>
        </StatCard>
        {totalCompleted > 0 && (
          <StatCard label="Avg Quality" value={avgQuality} valueColor={avgQuality >= 70 ? "#22c55e" : avgQuality >= 40 ? "#E5654E" : "#ef4444"} />
        )}
        {(FEATURES.RESPONDENT_PAYOUTS || hasMoneyActivity) && (
          <StatCard
            label="Available"
            value={`$${(availableBalanceCents / 100).toFixed(2)}`}
            valueColor={availableBalanceCents > 0 ? "#22c55e" : undefined}
          />
        )}
      </div>

      {/* Cashout panel */}
      {FEATURES.CASHOUT && (
        <CashoutPanel
          availableBalanceCents={availableBalanceCents}
          minCashoutCents={DEFAULTS.MIN_CASHOUT_BALANCE_CENTS}
          hasConnectAccount={hasConnectAccount}
          onboardingComplete={onboardingComplete}
          connectReturnParam={connectParam ?? null}
        />
      )}

      {/* Locked balance explainer */}
      {pendingBalanceCents > 0 && (
        <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] md:p-[28px] mb-[24px] shadow-card">
          <span className="text-[11px] font-medium uppercase tracking-tight text-text-muted block mb-[6px]">Lock Period</span>
          <p className="text-[14px] text-text-secondary font-medium">
            Locked payouts become available when their campaigns close. This can take up to 7 days.
          </p>
        </div>
      )}

      {/* Response feed */}
      <MyResponsesFeed responses={items} />

      {/* Cashout history */}
      {cashouts && cashouts.length > 0 && (
        <div className="mt-[32px]">
          <span className="text-[11px] font-medium tracking-tight text-text-muted uppercase block mb-[6px]">Withdrawals</span>
          <h2 className="text-[20px] font-medium tracking-tight text-text-primary mb-[16px]">Cashout History</h2>
          <div className="flex flex-col gap-[8px]">
            {cashouts.map((c) => {
              const cashoutStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
                pending: { label: "PENDING", bg: "bg-brand/10", text: "text-brand-dark" },
                processing: { label: "PROCESSING", bg: "bg-info/10", text: "text-info" },
                completed: { label: "COMPLETED", bg: "bg-success/10", text: "text-success" },
                failed: { label: "FAILED", bg: "bg-error/10", text: "text-error" },
              };
              const config = cashoutStatusConfig[c.status] || cashoutStatusConfig.pending;

              return (
                <div key={c.id} className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] px-[14px] py-[20px] md:p-[28px] flex items-center justify-between gap-[12px] shadow-card transition-all duration-400">
                  <div className="min-w-0">
                    <span className="text-[14px] font-medium tracking-tight text-text-primary block">
                      Cashout to bank
                    </span>
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-tight mt-[2px] block">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-[8px] shrink-0">
                    <span className="text-[14px] font-semibold text-text-primary">
                      ${(c.amount_cents / 100).toFixed(2)}
                    </span>
                    <span className={`px-[8px] py-[3px] rounded-md text-[11px] font-medium uppercase tracking-tight ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                    {FEATURES.CASHOUT && c.status === "failed" && (
                      <RetryCashoutButton cashoutId={c.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
