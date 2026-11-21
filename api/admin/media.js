import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";

async function ensureTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS uploaded_media (
    id BIGSERIAL PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '', bytes BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
}
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const pool = getPool();
    await ensureTable(pool);
    if (req.method === "GET") {
      const rows = await pool.query("SELECT id, filename, mime_type AS mime, alt_text AS alt, octet_length(bytes) AS size, created_at AS created FROM uploaded_media ORDER BY id DESC LIMIT 100");
      return res.status(200).json({ media: rows.rows.map((m) => ({ ...m, url: "/api/media?id=" + m.id })) });
    }
    if (req.method === "POST") {
      const { filename, mime, data, alt } = req.body || {};
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(data || "");
      if (!match || mime !== match[1]) return res.status(400).json({ error: "Upload a PNG, JPG, WEBP, or GIF image." });
      const buf = Buffer.from(match[2], "base64");
      if (!buf.length || buf.length > 2 * 1024 * 1024) return res.status(413).json({ error: "Image must be below 2 MB. Resize it before uploading." });
      const valid = (mime === "image/png" && buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
        (mime === "image/jpeg" && buf[0] === 255 && buf[1] === 216 && buf[2] === 255) ||
        (mime === "image/webp" && buf.toString("ascii",0,4) === "RIFF" && buf.toString("ascii",8,12) === "WEBP") ||
        (mime === "image/gif" && buf.toString("ascii",0,3) === "GIF");
      if (!valid) return res.status(400).json({ error: "File signature is not a valid image." });
      const result = await pool.query("INSERT INTO uploaded_media (filename,mime_type,alt_text,bytes) VALUES ($1,$2,$3,$4) RETURNING id", [String(filename || "image").slice(0,120),mime,String(alt || "").slice(0,300),buf]);
      return res.status(201).json({ ok:true, url: "/api/media?id=" + result.rows[0].id });
    }
    if (req.method === "DELETE") {
      const id = Number(req.query?.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({error:"Invalid ID"});
      await pool.query("DELETE FROM uploaded_media WHERE id = $1", [id]);
      return res.status(200).json({ok:true});
    }
    res.status(405).json({error:"Method not allowed"});
  } catch (err) {
    res.status(500).json({error:"Media operation failed"});
  }
}