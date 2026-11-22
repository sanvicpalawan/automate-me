// Shared helpers for talking to the media worker (Cloudflare R2).
//
// The worker signs every write with HMAC-SHA256 over:
//   purpose.key.mime.expiry
// These helpers must stay in step with worker/media-worker.js.

import crypto from "node:crypto";

export const MEDIA_BASE = (process.env.MEDIA_BASE_URL || "https://media.merqato.digital").replace(/\/$/, "");
export const MEDIA_TICKET_TTL_MS = 60 * 60 * 1000;

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
export const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const PART_BYTES = 8 * 1024 * 1024;

export function mediaSecret() {
  return process.env.MEDIA_SECRET || null;
}

export function kindForMime(mime) {
  if (IMAGE_MIMES.includes(mime)) return "image";
  if (VIDEO_MIMES.includes(mime)) return "video";
  return null;
}

export function extensionForMime(mime) {
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-m4v": "m4v",
  };
  return map[mime] || "bin";
}

export function slugifyFilename(filename) {
  const base = String(filename || "file")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "file";
}

export function buildKey(filename, mime) {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(6).toString("hex");
  return `media/${stamp}-${rand}-${slugifyFilename(filename)}.${extensionForMime(mime)}`;
}

function sign(purpose, key, mime, expiresAt) {
  const secret = mediaSecret();
  if (!secret) return null;
  const payload = `${purpose}.${key}.${mime}.${expiresAt}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function ticket(purpose, path, key, mime) {
  const secret = mediaSecret();
  if (!secret) return null;
  const expiresAt = String(Date.now() + MEDIA_TICKET_TTL_MS);
  const sig = sign(purpose, key, mime, expiresAt);
  if (!sig) return null;
  const params = new URLSearchParams({ key, mime, exp: expiresAt, sig });
  return `${MEDIA_BASE}${path}?${params.toString()}`;
}

/**
 * Signed URLs the browser can call directly. The file never passes through
 * Vercel, so phone videos of any size are fine.
 */
export function uploadTickets({ key, mime }) {
  return {
    startUrl: ticket("start", "/multipart/start", key, mime),
    partUrl: ticket("write", "/multipart/part", key, mime),
    completeUrl: ticket("complete", "/multipart/complete", key, mime),
  };
}

export function deleteUrl({ key }) {
  return ticket("delete", "/object", key, "");
}

export function publicUrl(key) {
  // key already starts with "media/", e.g. media/abc-photo.jpg
  return `${MEDIA_BASE}/${key}`;
}
