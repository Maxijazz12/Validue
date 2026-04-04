"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPrimaryModeLabel,
  getRespondentCapabilityLabel,
  getRespondentCapabilityState,
} from "@/lib/profile-role";

type DiagnosticsData = Record<string, unknown>;
type CampaignData = Record<string, unknown>;
type UserData = {
  id: string;
  full_name: string | null;
  role: string | null;
  email?: string | null;
  reputation_score: number | null;
  reputation_tier: string | null;
  available_balance_cents: number | null;
  pending_balance_cents: number | null;
  total_earned: number | null;
  total_responses_completed: number | null;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  created_at: string;
  has_responded: boolean | null;
  profile_completed: boolean | null;
  interests: string[] | null;
  expertise: string[] | null;
  age_range: string | null;
};

type DisputeData = {
  id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  response_id: string;
  campaign_id: string;
  respondent_name: string;
  respondent_id: string;
  quality_score: number | null;
  money_state: string | null;
  disqualification_reasons: string[] | null;
  campaign_title: string;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "campaign" | "users" | "disputes">("diagnostics");

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Campaign lookup
  const [campaignId, setCampaignId] = useState("");
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [campLoading, setCampLoading] = useState(false);
  const [campError, setCampError] = useState<string | null>(null);

  // User lookup
  const [userSearch, setUserSearch] = useState("");
  const [userData, setUserData] = useState<UserData[] | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Disputes
  const [disputesList, setDisputesList] = useState<DisputeData[] | null>(null);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesError, setDisputesError] = useState<string | null>(null);

  const resetAdminSession = useCallback((message: string | null = null) => {
    setAuthenticated(false);
    setAdminKey("");
    setActiveTab("diagnostics");
    setDiagnostics(null);
    setCampaignData(null);
    setUserData(null);
    setDisputesList(null);
    setDiagError(null);
    setCampError(null);
    setUserError(null);
    setDisputesError(null);
    setAuthError(message);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedKey = adminKey.trim();
    if (!trimmedKey) {
      setAuthError("Admin key is required");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setDiagError(null);

    try {
      const res = await fetch("/api/admin/diagnostics", {
        headers: { "x-admin-key": trimmedKey },
      });
      if (!res.ok) {
        if (res.status === 401) {
          resetAdminSession("Invalid admin key");
          return;
        }
        throw new Error(`${res.status}: ${await res.text()}`);
      }

      setDiagnostics(await res.json());
      setAdminKey(trimmedKey);
      setAuthenticated(true);
    } catch (err) {
      setAuthenticated(false);
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  }

  const fetchDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch("/api/admin/diagnostics", {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) {
        if (res.status === 401) {
          resetAdminSession("Admin session expired. Please sign in again.");
          return;
        }
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      setDiagnostics(await res.json());
    } catch (err) {
      setDiagError((err as Error).message);
    } finally {
      setDiagLoading(false);
    }
  }, [adminKey, resetAdminSession]);

  async function fetchCampaign() {
    if (!campaignId.trim()) return;
    setCampLoading(true);
    setCampError(null);
    try {
      const res = await fetch(`/api/admin/campaign/${campaignId.trim()}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) {
        resetAdminSession("Admin session expired. Please sign in again.");
        return;
      }
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      setCampaignData(await res.json());
    } catch (err) {
      setCampError((err as Error).message);
    } finally {
      setCampLoading(false);
    }
  }

  async function fetchUser() {
    if (!userSearch.trim()) return;
    setUserLoading(true);
    setUserError(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userSearch.trim())}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) {
        resetAdminSession("Admin session expired. Please sign in again.");
        return;
      }
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setUserData(data.users);
    } catch (err) {
      setUserError((err as Error).message);
    } finally {
      setUserLoading(false);
    }
  }

  const fetchDisputes = useCallback(async () => {
    setDisputesLoading(true);
    setDisputesError(null);
    try {
      const res = await fetch("/api/admin/disputes?status=open", {
        headers: { "x-admin-key": adminKey },
      });
      if (res.status === 401) {
        resetAdminSession("Admin session expired. Please sign in again.");
        return;
      }
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = await res.json();
      setDisputesList(data.disputes);
    } catch (err) {
      setDisputesError((err as Error).message);
    } finally {
      setDisputesLoading(false);
    }
  }, [adminKey, resetAdminSession]);

  async function resolveDispute(disputeId: string, status: string, adminNotes: string) {
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { "x-admin-key": adminKey, "content-type": "application/json" },
        body: JSON.stringify({ disputeId, status, adminNotes }),
      });
      if (res.status === 401) {
        resetAdminSession("Admin session expired. Please sign in again.");
        return;
      }
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      // Refresh disputes list
      fetchDisputes();
    } catch (err) {
      setDisputesError((err as Error).message);
    }
  }

  // Auto-load diagnostics/disputes on tab switch
  useEffect(() => {
    if (authenticated && activeTab === "diagnostics" && !diagnostics) {
      fetchDiagnostics();
    }
    if (authenticated && activeTab === "disputes" && !disputesList) {
      fetchDisputes();
    }
  }, [authenticated, activeTab, diagnostics, disputesList, fetchDiagnostics, fetchDisputes]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-[360px]">
          <h1 className="text-white text-[20px] font-mono font-bold mb-6 text-center">
            ADMIN ACCESS
          </h1>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin API key"
            className="w-full px-4 py-3 rounded-lg bg-[#1A1A1A] border border-[#333] text-white font-mono text-[14px] outline-none focus:border-[#D4A088] mb-4"
            autoFocus
          />
          <button
            type="submit"
            disabled={authLoading}
            className="w-full px-4 py-3 rounded-lg bg-[#D4A088] text-[#0A0A0A] font-mono font-bold text-[14px] hover:bg-[#E8C1B0] transition-colors"
          >
            {authLoading ? "Checking..." : "Enter"}
          </button>
          {authError && (
            <p className="mt-3 text-center text-[13px] text-red-400">{authError}</p>
          )}
        </form>
      </div>
    );
  }

  const tabs = [
    { id: "diagnostics" as const, label: "System Health" },
    { id: "campaign" as const, label: "Campaign Lookup" },
    { id: "users" as const, label: "User Lookup" },
    { id: "disputes" as const, label: "Disputes" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-mono">
      <div className="max-w-[1000px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[20px] font-bold tracking-wider">ADMIN CONSOLE</h1>
          <button
            onClick={() => {
              resetAdminSession();
            }}
            className="text-[12px] text-[#666] hover:text-white transition-colors"
          >
            LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#222]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[12px] font-bold tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-[#D4A088] border-[#D4A088]"
                  : "text-[#666] border-transparent hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Diagnostics tab */}
        {activeTab === "diagnostics" && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={fetchDiagnostics}
                disabled={diagLoading}
                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[12px] font-bold hover:border-[#D4A088] transition-colors disabled:opacity-50"
              >
                {diagLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {diagError && <p className="text-red-400 text-[13px] mb-4">{diagError}</p>}
            {diagnostics && (
              <pre className="bg-[#111] rounded-lg p-4 text-[12px] text-[#A8A29E] overflow-x-auto max-h-[70vh] overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Campaign lookup tab */}
        {activeTab === "campaign" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="Campaign UUID"
                className="flex-1 px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[13px] text-white outline-none focus:border-[#D4A088]"
                onKeyDown={(e) => e.key === "Enter" && fetchCampaign()}
              />
              <button
                onClick={fetchCampaign}
                disabled={campLoading}
                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[12px] font-bold hover:border-[#D4A088] transition-colors disabled:opacity-50"
              >
                {campLoading ? "Loading…" : "Lookup"}
              </button>
            </div>
            {campError && <p className="text-red-400 text-[13px] mb-4">{campError}</p>}
            {campaignData && (
              <pre className="bg-[#111] rounded-lg p-4 text-[12px] text-[#A8A29E] overflow-x-auto max-h-[70vh] overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(campaignData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* User lookup tab */}
        {activeTab === "users" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Name, email, or UUID"
                className="flex-1 px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[13px] text-white outline-none focus:border-[#D4A088]"
                onKeyDown={(e) => e.key === "Enter" && fetchUser()}
              />
              <button
                onClick={fetchUser}
                disabled={userLoading}
                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[12px] font-bold hover:border-[#D4A088] transition-colors disabled:opacity-50"
              >
                {userLoading ? "Loading…" : "Search"}
              </button>
            </div>
            {userError && <p className="text-red-400 text-[13px] mb-4">{userError}</p>}
            {userData && userData.length === 0 && (
              <p className="text-[#666] text-[13px]">No users found</p>
            )}
            {userData && userData.length > 0 && (
              <div className="flex flex-col gap-3">
                {userData.map((u) => (
                  <div key={u.id} className="bg-[#111] rounded-lg p-4 border border-[#222]">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <span className="text-[14px] font-bold text-white block">
                          {u.full_name || u.email || "Unnamed user"}
                        </span>
                        {u.email && (
                          <span className="text-[11px] text-[#666] block truncate">
                            {u.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">
                          {getPrimaryModeLabel(u.role).toUpperCase()}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            getRespondentCapabilityState(u) === "active"
                              ? "bg-blue-900/40 text-blue-400"
                              : getRespondentCapabilityState(u) === "ready"
                                ? "bg-amber-900/40 text-amber-300"
                                : "bg-[#333] text-[#A8A29E]"
                          }`}
                        >
                          {getRespondentCapabilityLabel(u).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-[#A8A29E]">
                      <span>ID: <span className="text-[#666]">{u.id}</span></span>
                      <span>Primary mode: {getPrimaryModeLabel(u.role)}</span>
                      <span>Reputation: {u.reputation_score ?? "—"} ({u.reputation_tier ?? "new"})</span>
                      <span>Available: ${((u.available_balance_cents ?? 0) / 100).toFixed(2)}</span>
                      <span>Pending: ${((u.pending_balance_cents ?? 0) / 100).toFixed(2)}</span>
                      <span>Total earned: ${Number(u.total_earned ?? 0).toFixed(2)}</span>
                      <span>Responses: {u.total_responses_completed ?? 0}</span>
                      <span>Respondent capability: {getRespondentCapabilityLabel(u)}</span>
                      <span>Profile completed: {u.profile_completed ? "Yes" : "No"}</span>
                      <span>Connect: {u.stripe_connect_account_id ? (u.stripe_connect_onboarding_complete ? "Active" : "Incomplete") : "Not set up"}</span>
                      <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Disputes tab */}
        {activeTab === "disputes" && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={fetchDisputes}
                disabled={disputesLoading}
                className="px-4 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[12px] font-bold hover:border-[#D4A088] transition-colors disabled:opacity-50"
              >
                {disputesLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {disputesError && <p className="text-red-400 text-[13px] mb-4">{disputesError}</p>}
            {disputesList && disputesList.length === 0 && (
              <p className="text-[#666] text-[13px]">No open disputes</p>
            )}
            {disputesList && disputesList.length > 0 && (
              <div className="flex flex-col gap-4">
                {disputesList.map((d) => (
                  <DisputeCard key={d.id} dispute={d} onResolve={resolveDispute} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DisputeCard({
  dispute: d,
  onResolve,
}: {
  dispute: DisputeData;
  onResolve: (id: string, status: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleResolve(status: string) {
    setResolving(true);
    await onResolve(d.id, status, notes);
    setResolving(false);
  }

  return (
    <div className="bg-[#111] rounded-lg p-5 border border-[#222]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[14px] font-bold text-white block">{d.respondent_name}</span>
          <span className="text-[11px] text-[#666]">{d.respondent_id}</span>
        </div>
        <span className="text-[11px] text-[#666]">{new Date(d.created_at).toLocaleDateString()}</span>
      </div>

      <div className="mb-3 text-[12px] text-[#A8A29E]">
        <span className="text-[#666]">Campaign:</span> {d.campaign_title}
      </div>
      <div className="mb-3 text-[12px] text-[#A8A29E]">
        <span className="text-[#666]">Score:</span> {d.quality_score ?? "—"} |{" "}
        <span className="text-[#666]">State:</span> {d.money_state ?? "—"}
        {d.disqualification_reasons && d.disqualification_reasons.length > 0 && (
          <span className="text-red-400"> | DQ: {d.disqualification_reasons.join(", ")}</span>
        )}
      </div>

      <div className="bg-[#0A0A0A] rounded p-3 mb-3">
        <span className="text-[10px] text-[#666] uppercase tracking-wider block mb-1">Respondent&apos;s appeal</span>
        <p className="text-[13px] text-[#D4D4D4]">{d.reason}</p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Admin notes (optional)…"
        className="w-full px-3 py-2 rounded bg-[#1A1A1A] border border-[#333] text-[12px] text-white outline-none focus:border-[#D4A088] resize-none h-[50px] mb-3"
      />

      <div className="flex gap-2">
        <button
          onClick={() => handleResolve("resolved_upheld")}
          disabled={resolving}
          className="px-3 py-1.5 rounded text-[11px] font-bold bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
        >
          Uphold (Deny Appeal)
        </button>
        <button
          onClick={() => handleResolve("resolved_overturned")}
          disabled={resolving}
          className="px-3 py-1.5 rounded text-[11px] font-bold bg-green-900/40 text-green-400 hover:bg-green-900/60 transition-colors disabled:opacity-50"
        >
          Overturn (Grant Appeal)
        </button>
        <button
          onClick={() => handleResolve("under_review")}
          disabled={resolving}
          className="px-3 py-1.5 rounded text-[11px] font-bold bg-[#333] text-[#A8A29E] hover:bg-[#444] transition-colors disabled:opacity-50"
        >
          Mark Under Review
        </button>
      </div>
    </div>
  );
}
