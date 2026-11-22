// MerQato media worker — stores portfolio images/videos in Cloudflare R2 and
// serves them back. Every write is authorised by a signature that the site's
// admin API (Vercel) creates. Nothing is written without a valid signature.
//
// Host: media.merqato.digital
//   POST   /multipart/start?key&mime&exp&sig            -> start an upload
//   PUT    /multipart/part?key&mime&uploadId&partNumber&exp&sig
//   POST   /multipart/complete?key&mime&uploadId&exp&sig -> finish an upload
//   DELETE /object?key&exp&sig                          -> remove a file
//   GET    /media/<key>                                 -> read a file (range aware)
//
// The signature covers: purpose.key.mime.uploadId.expiry
// It must match api/_media.js on the site side.

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // R2 object ceiling
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function cors(extra = {}) {
  return { ...CORS_HEADERS, ...extra };
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(secret, purpose, key, mime, expiresAt) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    enc.encode(`${purpose}.${key}.${mime}.${expiresAt}`)
  );
  return toHex(mac);
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorized(request, env, purpose) {
  const secret = env.MEDIA_SECRET;
  if (!secret) return false;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const mime = url.searchParams.get("mime") || "";
  const uploadId = url.searchParams.get("uploadId") || "";
  const exp = url.searchParams.get("exp") || "";
  const sig = url.searchParams.get("sig") || "";
  if (!key || !exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = await sign(secret, purpose, key, mime, exp);
  return timingSafeEqual(expected, sig);
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

function parseRange(header) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const start = match[1] === "" ? null : Number(match[1]);
  const end = match[2] === "" ? null : Number(match[2]);
  if (start === null && end === null) return null;
  if (start === null) return { suffix: end };
  return { offset: start, length: end === null ? undefined : end - start + 1 };
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      // Always answer with CORS headers, even on failure, so the browser
      // shows the real error instead of a generic "failed to fetch".
      const message = String((err && err.message) || err).slice(0, 300);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }
  },
};

async function handle(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

    // Begin a chunked upload.
    if (request.method === "POST" && path === "/multipart/start") {
      const mime = url.searchParams.get("mime") || "";
      const key = url.searchParams.get("key") || "";
      if (!ALLOWED_MIME.has(mime)) return jsonError("That file type is not supported.", 400);
      if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) return jsonError("Invalid file key.", 400);
      if (!(await authorized(request, env, "start"))) return jsonError("Upload not authorised.", 403);
      const multipart = await env.MEDIA_BUCKET.createMultipartUpload(key, {
        httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" },
      });
      return new Response(JSON.stringify({ ok: true, uploadId: multipart.uploadId }), {
        status: 200,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Upload one chunk.
    if (request.method === "PUT" && path === "/multipart/part") {
      const mime = url.searchParams.get("mime") || "";
      const key = url.searchParams.get("key") || "";
      const uploadId = url.searchParams.get("uploadId") || "";
      const partNumber = Number(url.searchParams.get("partNumber") || "0");
      if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) return jsonError("Invalid file key.", 400);
      if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
        return jsonError("Invalid upload part.", 400);
      }
      if (!(await authorized(request, env, "write"))) return jsonError("Upload not authorised.", 403);
      const body = await request.arrayBuffer();
      if (!body.byteLength) return jsonError("Empty chunk.", 400);
      const multipart = env.MEDIA_BUCKET.resumeMultipartUpload(key, uploadId);
      const part = await multipart.uploadPart(partNumber, body);
      return new Response(JSON.stringify({ ok: true, etag: part.etag }), {
        status: 200,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Finish an upload.
    if (request.method === "POST" && path === "/multipart/complete") {
      const mime = url.searchParams.get("mime") || "";
      const key = url.searchParams.get("key") || "";
      const uploadId = url.searchParams.get("uploadId") || "";
      if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) return jsonError("Invalid file key.", 400);
      if (!uploadId) return jsonError("Missing upload id.", 400);
      if (!(await authorized(request, env, "complete"))) return jsonError("Upload not authorised.", 403);
      let payload = null;
      try {
        payload = await request.json();
      } catch {
        payload = null;
      }
      const parts = Array.isArray(payload?.parts) ? payload.parts : [];
      if (!parts.length) return jsonError("No parts were uploaded.", 400);
      const multipart = env.MEDIA_BUCKET.resumeMultipartUpload(key, uploadId);
      await multipart.complete(
        parts.map((p) => ({ partNumber: Number(p.partNumber), etag: String(p.etag) }))
      );
      return new Response(JSON.stringify({ ok: true, key }), {
        status: 200,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Remove a file.
    if (request.method === "DELETE" && path === "/object") {
      const key = url.searchParams.get("key") || "";
      if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) return jsonError("Invalid file key.", 400);
      if (!(await authorized(request, env, "delete"))) return jsonError("Delete not authorised.", 403);
      await env.MEDIA_BUCKET.delete(key);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    // Serve a file.
    if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/media/")) {
      // Accepts /media/<file> and /media/media/<file> for the same object.
      const rel = decodeURIComponent(path.slice("/media/".length));
      const key = rel.startsWith("media/") ? rel : `media/${rel}`;
      if (!/^media\/[A-Za-z0-9._-]+$/.test(key)) return new Response("Not found", { status: 404 });
      const range = parseRange(request.headers.get("range") || "");
      const object = await env.MEDIA_BUCKET.get(key, range ? { range } : undefined);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
      headers.set(
        "Cache-Control",
        object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable"
      );
      headers.set("ETag", object.httpEtag);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Access-Control-Allow-Origin", "*");
      if (range && object.range) {
        const start = object.range.offset ?? 0;
        const length = object.range.length ?? object.size;
        headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${object.size}`);
        headers.set("Content-Length", String(length));
        return new Response(request.method === "HEAD" ? null : object.body, { status: 206, headers });
      }
      headers.set("Content-Length", String(object.size));
      return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
    }

    return jsonError("Not found", 404);
}
