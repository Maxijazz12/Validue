"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"founder" | "respondent">("founder");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/the-wall");
    router.refresh();
  }

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center px-[24px] py-[48px] relative overflow-hidden">
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
          <h1 className="text-[24px] font-bold text-[#111111] mb-[8px]">
            Get started
          </h1>
          <p className="text-[14px] text-[#94A3B8] mb-[32px]">
            Start validating ideas — or start earning
          </p>

          {error && (
            <div className="mb-[20px] px-[14px] py-[10px] bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="flex flex-col gap-[16px]">
            <Input
              id="fullName"
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {/* Role selector */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#64748B]">
                I want to...
              </label>
              <div className="grid grid-cols-2 gap-[10px]">
                <button
                  type="button"
                  onClick={() => setRole("founder")}
                  className={`px-[14px] py-[14px] rounded-xl border text-left transition-all cursor-pointer ${
                    role === "founder"
                      ? "border-[#E5654E] bg-[#E5654E]/5"
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={role === "founder" ? "#E5654E" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-[8px]">
                    <path d="M9 18h6" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                  </svg>
                  <div className="text-[13px] font-semibold text-[#111111]">Validate ideas</div>
                  <div className="text-[11px] text-[#94A3B8] mt-[2px]">Get real feedback fast</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("respondent")}
                  className={`px-[14px] py-[14px] rounded-xl border text-left transition-all cursor-pointer ${
                    role === "respondent"
                      ? "border-[#E5654E] bg-[#E5654E]/5"
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={role === "respondent" ? "#E5654E" : "#94A3B8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-[8px]">
                    <path d="M3 20h18" /><rect x="5" y="13" width="3" height="7" rx="1" /><rect x="10.5" y="9" width="3" height="11" rx="1" /><rect x="16" y="5" width="3" height="15" rx="1" />
                  </svg>
                  <div className="text-[13px] font-semibold text-[#111111]">Earn money</div>
                  <div className="text-[11px] text-[#94A3B8] mt-[2px]">Share feedback, get paid</div>
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              type="submit"
              className="w-full mt-[8px]"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-[16px] my-[24px]">
            <div className="flex-1 h-[1px] bg-[#E2E8F0]" />
            <span className="text-[12px] text-[#94A3B8] uppercase tracking-[1px]">or</span>
            <div className="flex-1 h-[1px] bg-[#E2E8F0]" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-[10px] px-[16px] py-[12px] border border-[#E2E8F0] rounded-xl text-[14px] font-medium text-[#64748B] bg-white hover:bg-[#FCFCFD] hover:border-[#CBD5E1] transition-all duration-300 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Login link */}
          <p className="text-center text-[13px] text-[#94A3B8] mt-[24px]">
            Already have an account?{" "}
            <a href="/auth/login" className="text-[#111111] font-medium no-underline hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
