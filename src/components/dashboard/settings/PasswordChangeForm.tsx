"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";

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
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px]">
      <h2 className="text-[16px] font-semibold text-[#111111] mb-[4px]">
        Change Password
      </h2>
      <p className="text-[13px] text-[#64748B] mb-[24px]">
        Update your password to keep your account secure
      </p>

      {success && (
        <div className="mb-[16px] px-[14px] py-[10px] bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-lg text-[13px] text-[#22c55e] font-medium">
          Password updated successfully
        </div>
      )}

      {error && (
        <div className="mb-[16px] px-[14px] py-[10px] bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[16px] max-w-[400px]">
        <Input
          id="currentPassword"
          label="Current password"
          type="password"
          placeholder="Enter current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          id="newPassword"
          label="New password"
          type="password"
          placeholder="Min 6 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
        <Input
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className={`self-start inline-flex items-center justify-center px-[24px] py-[12px] rounded-xl text-[14px] font-semibold bg-[#111111] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#1a1a1a] transition-all duration-300 cursor-pointer border-none mt-[8px] ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
