// Thin fetch wrapper for the same-origin Vercel functions used by the admin.
export type ApiResult<T = any> = {
  ok: boolean;
  status: number;
  json: T | null;
  error: string | null;
};

async function request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) return { ok: false, status: res.status, json, error: json?.error ?? `HTTP ${res.status}` };
    return { ok: true, status: res.status, json, error: null };
  } catch (err: any) {
    return { ok: false, status: 0, json: null, error: err?.message ?? "Network error" };
  }
}

export const api = {
  check: () => request("GET", "/api/check"),
  login: (password: string) => request("POST", "/api/login", { password }),
  logout: () => request("POST", "/api/logout"),
  content: () => request("GET", "/api/content"),
  theme: (payload: any) => request("PATCH", "/api/admin/theme", payload),
  sections: () => request("GET", "/api/admin/sections"),
  section: (payload: any) => request("POST", "/api/admin/sections", payload),
  sectionDelete: (key: string) => request("DELETE", `/api/admin/sections?key=${encodeURIComponent(key)}`),
  media: () => request("GET", "/api/admin/media"),
  mediaUpload: (payload: any) => request("POST", "/api/admin/media", payload),
  mediaDelete: (id: number) => request("DELETE", `/api/admin/media?id=${id}`),
  faq: () => request("GET", "/api/admin/faq"),
  faqCreate: (payload: any) => request("POST", "/api/admin/faq", payload),
  faqUpdate: (payload: any) => request("PUT", "/api/admin/faq", payload),
  faqDelete: (payload: any) => request("DELETE", "/api/admin/faq", payload),
};
