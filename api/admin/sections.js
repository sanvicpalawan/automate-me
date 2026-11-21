import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";

// GET  /api/admin/sections — list all sections
// POST /api/admin/sections — upsert a section (body: { key, title, subtitle, body, content, sortOrder })
export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    try {
      const pool = getPool();
      const result = await pool.query("SELECT * FROM site_sections ORDER BY sort_order, key");
      res.status(200).json({
        sections: result.rows.map((r) => ({
          key: r.key,
          title: r.title,
          subtitle: r.subtitle,
          body: r.body,
          sortOrder: r.sort_order,
          content: r.content,
          updatedAt: r.updated_at,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    const key = String(req.query?.key || "");
    if (["header","hero","footer"].includes(key)) return res.status(400).json({ error: "Core sections cannot be deleted" });
    if (!/^[a-z][a-z0-9_-]{1,60}$/.test(key)) return res.status(400).json({ error: "Invalid key" });
    try {
      const pool = getPool();
      await pool.query("DELETE FROM site_sections WHERE key = $1", [key]);
      return res.status(200).json({ ok: true });
    } catch (error) { return res.status(500).json({ error: "Unable to delete section" }); }
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const pool = getPool();
    const b = req.body ?? {};
    const key = b.key;
    if (typeof key !== "string" || !/^[a-z][a-z0-9_-]{1,60}$/.test(key)) {
      res.status(400).json({ error: "section key is required" });
      return;
    }
    const result = await pool.query(
      `INSERT INTO site_sections (key, title, subtitle, body, sort_order, content, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (key) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         body = EXCLUDED.body,
         sort_order = EXCLUDED.sort_order,
         content = EXCLUDED.content,
         updated_at = now()
       RETURNING *`,
      [
        key,
        b.title ?? null,
        b.subtitle ?? null,
        b.body ?? null,
        Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
        b.content && typeof b.content === "object" ? JSON.stringify(b.content) : "{}",
      ]
    );
    const row = result.rows[0];
    res.status(200).json({
      ok: true,
      section: {
        key: row.key,
        title: row.title,
        subtitle: row.subtitle,
        body: row.body,
        sortOrder: row.sort_order,
        content: row.content,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
