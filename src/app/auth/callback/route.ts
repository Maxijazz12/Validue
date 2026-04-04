import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sql from "@/lib/db";
import {
  sanitizeAuthRedirectPath,
  sanitizeOAuthSignupRole,
  shouldApplyOAuthSignupRole,
} from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = sanitizeAuthRedirectPath(searchParams.get("next"));
  const signupRole = sanitizeOAuthSignupRole(searchParams.get("signup_role"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (signupRole) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const [profile] = await sql`
              SELECT role, created_at
              FROM profiles
              WHERE id = ${user.id}
            `;

            if (
              shouldApplyOAuthSignupRole(
                signupRole,
                profile?.role,
                profile?.created_at
              )
            ) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TransactionSql loses call signature
              await sql.begin(async (tx: any) => {
                await tx`
                  UPDATE profiles
                  SET role = ${signupRole}
                  WHERE id = ${user.id}
                    AND role = 'founder'
                    AND created_at >= NOW() - INTERVAL '10 minutes'
                `;

                await tx`
                  UPDATE auth.users
                  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                    || jsonb_build_object('role', ${signupRole})
                  WHERE id = ${user.id}
                    AND created_at >= NOW() - INTERVAL '10 minutes'
                `;
              });
            }
          }
        } catch (roleSyncError) {
          console.error("[auth/callback] Failed to sync OAuth signup role:", roleSyncError);
        }
      }

      // Recovery codes redirect to reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
