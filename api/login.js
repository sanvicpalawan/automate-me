import { createSessionValue, validatePassword } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const password = req.body?.password;
  if (!validatePassword(password)) {
    res.status(401).json({ error: "incorrect password" });
    return;
  }
  const session = createSessionValue();
  if (!session) {
    res.status(503).json({ error: "auth not configured — set ADMIN_PASSWORD" });
    return;
  }
  res.setHeader(
    "Set-Cookie",
    `palawan_admin=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure`
  );
  res.status(200).json({ ok: true });
}
