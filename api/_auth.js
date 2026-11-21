import crypto from "node:crypto";

function secretKey() {
  // Dedicated secret preferred; fall back to the password so a single
  // ADMIN_PASSWORD env var is enough for a small admin panel.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

export function validatePassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  const a = String(password);
  const b = String(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createSessionValue(maxAgeSec = 60 * 60 * 24 * 7) {
  const key = secretKey();
  if (!key) return null;
  const expiry = String(Date.now() + maxAgeSec * 1000);
  const hmac = crypto.createHmac("sha256", key).update(`admin:${expiry}`).digest("hex");
  return `${expiry}.${hmac}`;
}

export function sessionIsValid(value) {
  if (!value) return false;
  const [expiry, hmac] = value.split(".");
  if (!expiry || !hmac) return false;
  if (Number(expiry) < Date.now()) return false;
  const key = secretKey();
  if (!key) return false;
  const expected = crypto.createHmac("sha256", key).update(`admin:${expiry}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseCookies(req) {
  const header = req.headers?.cookie || req.headers?.headers?.cookie || "";
  // handle plain string header
  const raw = typeof header === "string" ? header : "";
  const out = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function adminCookieValue(req) {
  const cookies = parseCookies(req);
  return cookies["palawan_admin"] || null;
}

export function requireAdmin(req, res) {
  const value = adminCookieValue(req);
  if (sessionIsValid(value)) return true;
  res.status(401).json({ error: "unauthorized" });
  return false;
}
