import { getPool } from "./_db.js";

// Public, read-only content for the landing site. Safe to expose: it is
// exactly what the public page renders.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const pool = getPool();
    const [theme, sections, faq] = await Promise.all([
      pool.query("SELECT * FROM theme_settings WHERE id = 1"),
      pool.query("SELECT * FROM site_sections ORDER BY sort_order, key"),
      pool.query("SELECT * FROM faq_items ORDER BY sort_order, id"),
    ]);
    const t = theme.rows[0] ?? null;
    res.status(200).json({
      theme: t
        ? {
            id: t.id,
            siteName: t.site_name,
            tagline: t.site_tagline,
            logoSvg: t.logo_svg,
            colors: t.colors,
            fonts: t.fonts,
          }
        : null,
      sections: sections.rows.map((r) => ({
        key: r.key,
        title: r.title,
        subtitle: r.subtitle,
        body: r.body,
        sortOrder: r.sort_order,
        content: r.content,
        updatedAt: r.updated_at,
      })),
      faq: faq.rows.map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        sortOrder: r.sort_order,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
