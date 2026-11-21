import { getPool } from "../_db.js";
import { requireAdmin } from "../_auth.js";

function mapRow(r) {
  return {
    id: r.id,
    question: r.question,
    answer: r.answer,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  };
}

// GET    /api/admin/faq — list items
// POST   /api/admin/faq — { question, answer, sortOrder } -> insert
// PUT    /api/admin/faq — { id, question, answer, sortOrder } -> update
// DELETE /api/admin/faq — { id } -> delete
export default async function handler(req, res) {
  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    try {
      const pool = getPool();
      const result = await pool.query("SELECT * FROM faq_items ORDER BY sort_order, id");
      res.status(200).json({ faq: result.rows.map(mapRow) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (!requireAdmin(req, res)) return;

  try {
    const pool = getPool();
    const b = req.body ?? {};

    if (req.method === "POST") {
      const question = (b.question ?? "").trim();
      const answer = (b.answer ?? "").trim();
      if (!question && !answer) {
        res.status(400).json({ error: "question and answer are required" });
        return;
      }
      const result = await pool.query(
        `INSERT INTO faq_items (question, answer, sort_order)
         VALUES ($1, $2, $3) RETURNING *`,
        [question, answer, Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : 0]
      );
      res.status(200).json({ ok: true, item: mapRow(result.rows[0]) });
      return;
    }

    if (req.method === "PUT") {
      const id = Number(b.id);
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const result = await pool.query(
        `UPDATE faq_items SET question = $1, answer = $2, sort_order = $3, updated_at = now()
         WHERE id = $4 RETURNING *`,
        [
          (b.question ?? "").trim(),
          (b.answer ?? "").trim(),
          Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : 0,
          id,
        ]
      );
      if (!result.rows[0]) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).json({ ok: true, item: mapRow(result.rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      const id = Number(b.id);
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const result = await pool.query("DELETE FROM faq_items WHERE id = $1 RETURNING id", [id]);
      if (!result.rows[0]) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).json({ ok: true, id: result.rows[0].id });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
