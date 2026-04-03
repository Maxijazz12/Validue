"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("No email found. Please log in again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });

    if (error) {
      setError(error.message);
    } else {
      setResent(true);
    }
    setLoading(false);
  }

  async function handleCheckAndContinue() {
    const supabase = createClient();
    // Refresh the session to pick up email_confirmed_at
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email_confirmed_at) {
      window.location.href = "/dashboard/the-wall";
    } else {
      setError("Email not yet verified. Please check your inbox and click the link.");
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center px-[24px] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute" style={{ top: '10%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,193,176,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="flex justify-center mb-[32px]">
          <Image src="/logo-icon.svg" alt="Validue" width={32} height={32} />
        </div>

        <div className="bg-white rounded-[28px] p-[36px] shadow-[0_8px_30px_rgba(28,25,23,0.04)] border border-border-light text-center">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[8px]">
            Verification Required
          </span>
          <h1 className="text-[22px] font-medium tracking-tight text-text-primary mb-[12px]">
            Check your email
          </h1>
          <p className="text-[14px] text-text-secondary font-medium leading-relaxed mb-[28px]">
            We sent a verification link to your email. Click it to activate your account
            and access the dashboard.
          </p>

          {error && (
            <p className="text-[13px] text-error font-medium mb-[16px]">{error}</p>
          )}

          {resent && (
            <p className="text-[13px] text-success font-medium mb-[16px]">
              Verification email resent. Check your inbox.
            </p>
          )}

          <div className="flex flex-col gap-[12px]">
            <Button onClick={handleCheckAndContinue}>
              I&apos;ve Verified — Continue
            </Button>
            <Button variant="outline" onClick={handleResend} disabled={loading || resent}>
              {loading ? "Sending…" : resent ? "Email Sent" : "Resend Verification Email"}
            </Button>
          </div>

          <p className="text-[12px] text-text-muted mt-[20px]">
            Wrong account?{" "}
            <a href="/auth/login" className="text-accent hover:text-accent-dark transition-colors font-medium">
              Log in with a different email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
