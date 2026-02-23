import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}
const connectionString = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/db";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
