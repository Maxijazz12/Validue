"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Verify current password by re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError("Could not verify your account");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setError("Current password is incorrect");
      setLoading(false);
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-[28px] border border-[#E7E5E4]/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden p-[32px]">
      <h2 className="text-[20px] font-medium tracking-tight text-[#1C1917] mb-[4px]">
        Change Password
      </h2>
      <p className="text-[14px] text-[#A8A29E] font-medium mb-[32px]">
        Update your password to keep your account secure
      </p>

      {success && (
        <div className="mb-[20px] px-[16px] py-[12px] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-[12px] text-[13px] text-[#22c55e] font-semibold tracking-wide">
          Password updated successfully
        </div>
      )}

      {error && (
        <div className="mb-[20px] px-[16px] py-[12px] bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-semibold tracking-wide">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[20px] max-w-[440px]">
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="currentPassword" className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-[18px] py-[14px] rounded-[16px] border border-transparent bg-[#F5F5F4]/60 text-[15px] text-[#1C1917] font-medium outline-none transition-all duration-300 hover:border-[#E7E5E4] focus:bg-white focus:border-[#1C1917] focus:ring-1 focus:ring-[#1C1917] shadow-sm placeholder:text-[#D6D3D1]"
            required
          />
        </div>

        <div className="flex flex-col gap-[8px]">
          <label htmlFor="newPassword" className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-[18px] py-[14px] rounded-[16px] border border-transparent bg-[#F5F5F4]/60 text-[15px] text-[#1C1917] font-medium outline-none transition-all duration-300 hover:border-[#E7E5E4] focus:bg-white focus:border-[#1C1917] focus:ring-1 focus:ring-[#1C1917] shadow-sm placeholder:text-[#D6D3D1]"
            required
            minLength={6}
          />
        </div>

        <div className="flex flex-col gap-[8px]">
          <label htmlFor="confirmPassword" className="text-[13px] font-bold uppercase tracking-[0.04em] text-[#A8A29E]">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-[18px] py-[14px] rounded-[16px] border border-transparent bg-[#F5F5F4]/60 text-[15px] text-[#1C1917] font-medium outline-none transition-all duration-300 hover:border-[#E7E5E4] focus:bg-white focus:border-[#1C1917] focus:ring-1 focus:ring-[#1C1917] shadow-sm placeholder:text-[#D6D3D1]"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`self-start inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-semibold tracking-wide bg-[#1C1917] text-white transition-all duration-500 hover:bg-[#292524] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] cursor-pointer mt-[12px] ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
