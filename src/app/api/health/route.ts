import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";

export async function GET() {
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
