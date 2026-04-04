import postgres from "postgres";
import { databaseEnv } from "@/lib/env";

const sql = postgres(databaseEnv().DATABASE_URL, {
  max: 20,
  idle_timeout: 120,
  connect_timeout: 15,
  prepare: false,
});

export async function checkDbConnection() {
  try {
    const [{ now }] = await sql`SELECT now()`;
    return { ok: true as const, timestamp: now };
  } catch (err) {
    return { ok: false as const, error: (err as Error).message };
  }
}

export default sql;
