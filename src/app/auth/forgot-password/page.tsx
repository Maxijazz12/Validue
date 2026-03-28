"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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

          {sent ? (
            <>
              <div className="w-[48px] h-[48px] rounded-2xl bg-[#22c55e]/10 flex items-center justify-center mx-auto mb-[16px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </div>
              <h1 className="text-[24px] font-bold text-[#111111] mb-[8px] text-center">
                Check your email
              </h1>
              <p className="text-[14px] text-[#64748B] text-center mb-[24px]">
                We sent a password reset link to{" "}
                <span className="font-medium text-[#111111]">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-[13px] text-[#94A3B8] text-center">
                Didn&apos;t receive the email?{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-[#111111] font-medium cursor-pointer bg-transparent border-none p-0 hover:underline"
                >
                  Try again
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-bold text-[#111111] mb-[8px]">
                Reset password
              </h1>
              <p className="text-[14px] text-[#94A3B8] mb-[32px]">
                Enter your email and we&apos;ll send you a reset link
              </p>

              {error && (
                <div className="mb-[20px] px-[14px] py-[10px] bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-[16px]">
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button
                  variant="primary"
                  type="submit"
                  className="w-full mt-[8px]"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
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
