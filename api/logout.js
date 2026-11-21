export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader(
    "Set-Cookie",
    "palawan_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure"
  );
  res.status(200).json({ ok: true });
}
