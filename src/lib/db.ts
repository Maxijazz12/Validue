import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
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
