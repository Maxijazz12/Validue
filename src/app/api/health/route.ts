import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Rate limit: 60 health checks per IP per minute
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`health:${ip}`, 60000, 60);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = await checkDbConnection();

  if (!db.ok) {
    return NextResponse.json(
      { status: "error", db: { ok: false, error: db.error } },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "healthy",
    db: { ok: true, timestamp: db.timestamp },
  });
}
