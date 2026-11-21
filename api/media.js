import { getPool } from "./_db.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const id = Number(req.query?.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).end();
  try {
    const pool = getPool();
    const result = await pool.query("SELECT mime_type, bytes FROM uploaded_media WHERE id = $1", [id]);
    if (!result.rowCount) return res.status(404).end();
    res.setHeader("Content-Type", result.rows[0].mime_type);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(result.rows[0].bytes);
  } catch { return res.status(404).end(); }
}