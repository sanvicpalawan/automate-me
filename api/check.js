import { adminCookieValue, sessionIsValid } from "./_auth.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (sessionIsValid(adminCookieValue(req))) {
    res.status(200).json({ ok: true });
    return;
  }
  res.status(401).json({ error: "unauthorized" });
}
