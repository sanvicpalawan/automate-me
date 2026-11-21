// Applies db/schema.sql (idempotent). Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL is not set.");
  process.exit(1);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const pool = new pg.Pool({ connectionString: url });
try {
  await pool.query(sql);
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("✔ schema applied. Tables:", rows.map((r) => r.table_name).join(", "));
} finally {
  await pool.end();
}
