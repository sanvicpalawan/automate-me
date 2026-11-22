import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";
import {
  buildKey,
  deleteUrl,
  kindForMime,
  publicUrl,
  uploadTickets,
  IMAGE_MIMES,
  VIDEO_MIMES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  mediaSecret,
} from "../_media.js";

// Media library for the site.
//
// Storage:
//   - Images up to 2 MB can still be stored in the database (legacy path).
//   - Anything larger, and every video, is uploaded straight to Cloudflare R2
//     through the media worker. The browser never sends the file through
//     Vercel, so phone videos of any size work.
//
// GET    /api/admin/media          -> list media
// POST   /api/admin/media          -> { action:"ticket", filename, mime, size }
//                                      returns signed upload URLs
// POST   /api/admin/media          -> { action:"register", key, filename, mime,
//                                      alt, size } records an uploaded file
// DELETE /api/admin/media?id=      -> remove a file (and its stored bytes)

async function ensureTable(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS uploaded_media (
    id BIGSERIAL PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '', bytes BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`ALTER TABLE uploaded_media ADD COLUMN IF NOT EXISTS storage TEXT NOT NULL DEFAULT 'db'`);
  await pool.query(`ALTER TABLE uploaded_media ADD COLUMN IF NOT EXISTS object_key TEXT`);
  await pool.query(`ALTER TABLE uploaded_media ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'image'`);
  await pool.query(`ALTER TABLE uploaded_media ADD COLUMN IF NOT EXISTS size_bytes BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE uploaded_media ALTER COLUMN bytes DROP NOT NULL`);
}

function rowToMedia(m) {
  return {
    id: m.id,
    filename: m.filename,
    mime: m.mime,
    alt: m.alt || "",
    kind: m.kind || "image",
    size: Number(m.size || 0),
    storage: m.storage || "db",
    url: m.storage === "r2" ? publicUrl(m.object_key) : "/api/media?id=" + m.id,
    created: m.created,
  };
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const pool = getPool();
    await ensureTable(pool);

    if (req.method === "GET") {
      const rows = await pool.query(
        `SELECT id, filename, mime_type AS mime, alt_text AS alt, kind,
                storage, object_key, size_bytes AS size, created_at AS created
           FROM uploaded_media ORDER BY id DESC LIMIT 200`
      );
      return res.status(200).json({ media: rows.rows.map(rowToMedia) });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      // Step 1: hand the browser signed URLs so it can upload directly.
      if (body.action === "ticket") {
        if (!mediaSecret()) {
          return res.status(503).json({ error: "Media uploads are not configured yet." });
        }
        const mime = String(body.mime || "");
        const kind = kindForMime(mime);
        if (!kind) {
          return res.status(400).json({ error: "Upload a PNG, JPG, WEBP, GIF, MP4, MOV or WEBM file." });
        }
        const size = Number(body.size || 0);
        const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (size && size > limit) {
          return res
            .status(413)
            .json({ error: kind === "video" ? "Video must be under 500 MB." : "Image must be under 25 MB." });
        }
        const key = buildKey(body.filename || "file", mime);
        return res.status(200).json({
          ok: true,
          key,
          kind,
          mime,
          tickets: uploadTickets({ key, mime }),
        });
      }

      // Step 2: the browser finished uploading — remember the file.
      if (body.action === "register") {
        const key = String(body.key || "");
        if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) {
          return res.status(400).json({ error: "Invalid file key." });
        }
        const mime = String(body.mime || "");
        const kind = kindForMime(mime) || "image";
        const result = await pool.query(
          `INSERT INTO uploaded_media (filename, mime_type, alt_text, bytes, storage, object_key, kind, size_bytes)
           VALUES ($1,$2,$3,NULL,'r2',$4,$5,$6) RETURNING id`,
          [
            String(body.filename || "file").slice(0, 120),
            mime,
            String(body.alt || "").slice(0, 300),
            key,
            kind,
            Number(body.size || 0),
          ]
        );
        return res.status(201).json({
          ok: true,
          id: result.rows[0].id,
          url: publicUrl(key),
          kind,
        });
      }

      // Small images can still go straight into the database.
      const { filename, mime, data, alt } = body;
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(data || "");
      if (!match || mime !== match[1]) {
        return res.status(400).json({ error: "Upload a PNG, JPG, WEBP, or GIF image." });
      }
      const buf = Buffer.from(match[2], "base64");
      if (!buf.length || buf.length > 2 * 1024 * 1024) {
        return res.status(413).json({ error: "Image must be below 2 MB. Resize it before uploading." });
      }
      const valid =
        (mime === "image/png" && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (mime === "image/jpeg" && buf[0] === 255 && buf[1] === 216 && buf[2] === 255) ||
        (mime === "image/webp" && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") ||
        (mime === "image/gif" && buf.toString("ascii", 0, 3) === "GIF");
      if (!valid) return res.status(400).json({ error: "File signature is not a valid image." });
      const result = await pool.query(
        `INSERT INTO uploaded_media (filename, mime_type, alt_text, bytes, storage, kind, size_bytes)
         VALUES ($1,$2,$3,$4,'db','image',$5) RETURNING id`,
        [String(filename || "image").slice(0, 120), mime, String(alt || "").slice(0, 300), buf, buf.length]
      );
      return res.status(201).json({ ok: true, url: "/api/media?id=" + result.rows[0].id, kind: "image" });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query?.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid ID" });
      const existing = await pool.query(
        "SELECT storage, object_key FROM uploaded_media WHERE id = $1",
        [id]
      );
      if (existing.rowCount && existing.rows[0].storage === "r2" && existing.rows[0].object_key) {
        const url = deleteUrl({ key: existing.rows[0].object_key });
        if (url) {
          try {
            await fetch(url, { method: "DELETE" });
          } catch {
            // The row is removed either way; a stale object is harmless.
          }
        }
      }
      await pool.query("DELETE FROM uploaded_media WHERE id = $1", [id]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(500).json({ error: "Media operation failed" });
  }
}

export { IMAGE_MIMES, VIDEO_MIMES };
