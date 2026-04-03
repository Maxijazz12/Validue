import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next") ?? "/dashboard/the-wall";

  // Prevent open-redirect: only allow whitelisted path prefixes
  const ALLOWED_PREFIXES = ["/dashboard", "/auth/reset-password"];
  const DEFAULT_REDIRECT = "/dashboard/the-wall";

  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    ALLOWED_PREFIXES.some((prefix) => rawNext.startsWith(prefix))
      ? rawNext
      : DEFAULT_REDIRECT;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Recovery codes redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
