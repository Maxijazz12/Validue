"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push("/dashboard/the-wall");
      router.refresh();
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center px-[24px] relative overflow-hidden">
      {/* Ambient washes */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute" style={{ top: '10%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,193,176,0.06) 0%, transparent 70%)' }} />
        <div className="absolute" style={{ bottom: '5%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,196,200,0.05) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-[48px]">
          <Link href="/" className="inline-flex items-center gap-[8px] no-underline">
            <Image src="/logo-icon.svg" alt="" width={20} height={20} />
            <span className="text-[20px] font-bold tracking-[1px] text-[#111111]">Validue</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[40px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />

          {success ? (
            <>
              <div className="w-[48px] h-[48px] rounded-2xl bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-[16px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-[24px] font-bold text-[#111111] mb-[8px] text-center">
                Password updated
              </h1>
              <p className="text-[14px] text-[#64748B] text-center">
                Your password has been reset. Redirecting you to the dashboard...
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-bold text-[#111111] mb-[8px]">
                Set new password
              </h1>
              <p className="text-[14px] text-[#94A3B8] mb-[32px]">
                Choose a new password for your account
              </p>

              {error && (
                <div className="mb-[20px] px-[14px] py-[10px] bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="flex flex-col gap-[16px]">
                <Input
                  id="password"
                  label="New password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Input
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full mt-[8px]"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}

          {/* Back to login */}
          <p className="text-center text-[13px] text-[#94A3B8] mt-[24px]">
            <Link href="/auth/login" className="text-[#111111] font-medium no-underline hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
