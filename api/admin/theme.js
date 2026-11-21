import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";

// PATCH /api/admin/theme — update the singleton theme row.
export default async function handler(req, res) {
  if (req.method !== "PATCH" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const pool = getPool();
    const b = req.body ?? {};
    const { siteName, tagline, logoSvg, colors, fonts } = b;
    const result = await pool.query(
      `INSERT INTO theme_settings (id, site_name, site_tagline, logo_svg, colors, fonts, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET
         site_name = EXCLUDED.site_name,
         site_tagline = EXCLUDED.site_tagline,
         logo_svg = EXCLUDED.logo_svg,
         colors = EXCLUDED.colors,
         fonts = EXCLUDED.fonts,
         updated_at = now()
       RETURNING *`,
      [
        siteName ?? "Palawan Collective",
        tagline ?? "",
        logoSvg ?? null,
        colors ? JSON.stringify(colors) : "{}",
        fonts ? JSON.stringify(fonts) : "{}",
      ]
    );
    const row = result.rows[0];
    res.status(200).json({
      ok: true,
      theme: {
        id: row.id,
        siteName: row.site_name,
        tagline: row.site_tagline,
        logoSvg: row.logo_svg,
        colors: row.colors,
        fonts: row.fonts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
