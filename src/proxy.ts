import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/lib/env";

/** API routes that must remain publicly accessible (no auth). */
const PUBLIC_API_ROUTES = [
  "/api/webhooks/stripe",
  "/api/health",
  "/api/admin",
  "/api/cron/",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabaseEnv = supabasePublicEnv();

  // Skip auth entirely for public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes — redirect to login
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Protect admin routes — require authentication
  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Protect API routes — return 401 JSON (no redirect for API consumers)
  if (pathname.startsWith("/api/") && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/auth") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/the-wall";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*", "/auth/:path*"],
};
