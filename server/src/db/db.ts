import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const dbPool = connectionString
  ? new Pool({
      connectionString
    })
  : null;

export async function canReachDatabase(): Promise<boolean> {
  if (!dbPool) {
    return false;
  }
  try {
    await dbPool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
