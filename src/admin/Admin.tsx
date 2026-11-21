import { useEffect, useState } from "react";
import { api } from "./api";
import { THEME_DEFAULT } from "../content";
import type { Section, FaqItem, Theme } from "../content";

/* ------------------------------- auth ------------------------------- */

type AuthState = "checking" | "in" | "out";

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api.login(password);
    setBusy(false);
    if (res.ok) {
      onLogin();
    } else {
      setError(res.error ?? "Could not log in");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#0b0f10] text-[#efe8da] px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11181b] p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm text-white/55">Enter the admin password to manage the site.</p>
        <label className="mt-6 block text-xs font-medium uppercase tracking-widest text-white/45">Password</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-lg bg-[#0b0f10] border border-white/10 px-4 py-3 outline-none focus:border-[#0f5257]"
          placeholder="••••••••"
        />
        {error && <p className="mt-3 text-sm text-[#e2725b]">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 w-full rounded-full bg-[#0f5257] px-4 py-3 font-medium text-white transition hover:bg-[#0d4a4f] disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-xs text-white/40">
          First time here? Set <code className="text-white/60">ADMIN_PASSWORD</code> in Vercel (Settings → Environment
          Variables) and redeploy.
        </p>
      </form>
    </div>
  );
}

/* ----------------------------- helpers ------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-white/45">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "mt-2 w-full rounded-lg bg-[#0b0f10] border border-white/10 px-4 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#0f5257] " +
        (props.className ?? "")
      }
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "mt-2 w-full rounded-lg bg-[#0b0f10] border border-white/10 px-4 py-2.5 text-white placeholder-white/25 outline-none focus:border-[#0f5257] " +
        (props.className ?? "")
      }
    />
  );
}

function SaveButton({ busy, onClick, children }: { busy: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-full bg-[#0f5257] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0d4a4f] disabled:opacity-40"
    >
      {busy ? "Saving…" : children ?? "Save"}
    </button>
  );
}

function Status({ ok, msg }: { ok: boolean; msg: string }) {
  if (!msg) return null;
  return <p className={`text-sm ${ok ? "text-emerald-400" : "text-[#e2725b]"}`}>{msg}</p>;
}

/* ---------------------------- theme panel ---------------------------- */

const COLOR_KEYS = ["sand", "shell", "ink", "lagoon", "deep", "coral", "foam"];
const FONT_KEYS = ["brand", "serif", "sans", "hand"];

function ThemePanel({ onSaved }: { onSaved: () => void }) {
  const [siteName, setSiteName] = useState(THEME_DEFAULT.siteName);
  const [tagline, setTagline] = useState(THEME_DEFAULT.tagline);
  const [logoSvg, setLogoSvg] = useState("");
  const [colors, setColors] = useState<Record<string, string>>(THEME_DEFAULT.colors);
  const [fonts, setFonts] = useState<Record<string, string>>(THEME_DEFAULT.fonts);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  useEffect(() => {
    api.content().then((res) => {
      const theme = res.json?.theme as Theme | null | undefined;
      if (!theme) return;
      setSiteName(theme.siteName ?? "");
      setTagline(theme.tagline ?? "");
      setLogoSvg(theme.logoSvg ?? "");
      setColors({ ...THEME_DEFAULT.colors, ...(theme.colors ?? {}) });
      setFonts({ ...THEME_DEFAULT.fonts, ...(theme.fonts ?? {}) });
    });
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await api.theme({ siteName, tagline, logoSvg: logoSvg || null, colors, fonts });
    setBusy(false);
    setMsgOk(res.ok);
    setMsg(res.ok ? "Saved." : res.error ?? "Could not save");
    if (res.ok) onSaved();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Branding</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Site name">
            <TextInput value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </Field>
          <Field label="Tagline">
            <TextInput value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <Field label="Logo (inline SVG)">
            <TextArea rows={3} value={logoSvg} onChange={(e) => setLogoSvg(e.target.value)} placeholder="<svg>…</svg>" />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Color palette</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_KEYS.map((k) => (
            <Field key={k} label={k}>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={colors[k] ?? "#000000"}
                  onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))}
                  className="h-10 w-12"
                />
                <input
                  type="text"
                  value={colors[k] ?? ""}
                  onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))}
                  className="flex-1 rounded-lg bg-[#0b0f10] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#0f5257]"
                  spellCheck={false}
                />
              </div>
            </Field>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Fonts</h2>
        <p className="mt-1 text-xs text-white/40">Fonts are loaded at runtime from Google Fonts.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FONT_KEYS.map((k) => (
            <Field key={k} label={k}>
              <TextInput value={fonts[k] ?? ""} onChange={(e) => setFonts((f) => ({ ...f, [k]: e.target.value }))} placeholder="e.g. Fraunces" />
            </Field>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <SaveButton busy={busy} onClick={save}>Save theme</SaveButton>
        <Status ok={msgOk} msg={msg} />
      </div>
    </div>
  );
}

/* ---------------------------- sections panel --------------------------- */

type SectionForm = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  content: any;
};

function sectionsToForms(sections: Section[]): Record<string, SectionForm> {
  const map: Record<string, SectionForm> = {};
  for (const s of sections) {
    map[s.key] = { key: s.key, title: s.title ?? "", subtitle: s.subtitle ?? "", body: s.body ?? "", content: s.content ?? {} };
  }
  return map;
}

function HeaderEditor({ form, onChange }: { form: SectionForm; onChange: (patch: Partial<SectionForm>) => void }) {
  const links = (form.content.links ?? []).map((l: any) => `${l.label} | ${l.href}`).join("\n");
  const cta = form.content.cta ?? { label: "", href: "#" };
  return (
    <div className="space-y-4">
      <Field label="Nav links (one “label | href” per line)">
        <TextArea
          rows={4}
          value={links}
          onChange={(e) =>
            onChange({
              content: {
                ...form.content,
                links: e.target.value
                  .split("\n")
                  .map((line) => line.split("|").map((p) => p.trim()))
                  .filter((p) => p.length >= 2 && p[0] && p[1])
                  .map(([label, href]) => ({ label, href })),
              },
            })
          }
          placeholder={"The weight | #weight\nHow it works | #how"}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA label">
          <TextInput value={cta.label ?? ""} onChange={(e) => onChange({ content: { ...form.content, cta: { ...cta, label: e.target.value } } })} />
        </Field>
        <Field label="CTA link">
          <TextInput value={cta.href ?? ""} onChange={(e) => onChange({ content: { ...form.content, cta: { ...cta, href: e.target.value } } })} />
        </Field>
      </div>
    </div>
  );
}

function HeroEditor({ form, onChange }: { form: SectionForm; onChange: (patch: Partial<SectionForm>) => void }) {
  const c = form.content ?? {};
  return (
    <div className="space-y-4">
      <Field label="Kicker">
        <TextInput value={c.kicker ?? ""} onChange={(e) => onChange({ content: { ...c, kicker: e.target.value } })} />
      </Field>
      <Field label="Heading">
        <TextInput value={c.heading ?? ""} onChange={(e) => onChange({ content: { ...c, heading: e.target.value } })} />
      </Field>
      <Field label="Subheading">
        <TextArea rows={3} value={c.subheading ?? ""} onChange={(e) => onChange({ content: { ...c, subheading: e.target.value } })} />
      </Field>
      <Field label="Note (small text by the button)">
        <TextInput value={c.note ?? ""} onChange={(e) => onChange({ content: { ...c, note: e.target.value } })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CTA label">
          <TextInput value={c.cta?.label ?? ""} onChange={(e) => onChange({ content: { ...c, cta: { ...c.cta, label: e.target.value } } })} />
        </Field>
        <Field label="CTA link">
          <TextInput value={c.cta?.href ?? ""} onChange={(e) => onChange({ content: { ...c, cta: { ...c.cta, href: e.target.value } } })} />
        </Field>
      </div>
    </div>
  );
}

function FooterEditor({ form, onChange }: { form: SectionForm; onChange: (patch: Partial<SectionForm>) => void }) {
  const c = form.content ?? {};
  return (
    <div className="space-y-4">
      <Field label="Tagline">
        <TextInput value={c.tagline ?? ""} onChange={(e) => onChange({ content: { ...c, tagline: e.target.value } })} />
      </Field>
      <Field label="Copyright line">
        <TextInput value={c.copyright ?? ""} onChange={(e) => onChange({ content: { ...c, copyright: e.target.value } })} />
      </Field>
      <Field label="Contact email">
        <TextInput value={c.contact ?? ""} onChange={(e) => onChange({ content: { ...c, contact: e.target.value } })} />
      </Field>
    </div>
  );
}

function GenericSectionEditor({ form, onChange }: { form: SectionForm; onChange: (patch: Partial<SectionForm>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <TextInput value={form.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Subtitle">
        <TextInput value={form.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
      <Field label="Body">
        <TextArea rows={3} value={form.body} onChange={(e) => onChange({ body: e.target.value })} />
      </Field>
    </div>
  );
}

function SectionsPanel() {
  const [forms, setForms] = useState<Record<string, SectionForm>>({});
  const [active, setActive] = useState("header");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  useEffect(() => {
    api.sections().then((res) => {
      const list = (res.json?.sections ?? []) as Section[];
      setForms(sectionsToForms(list));
    });
  }, []);

  const knownKeys = ["header", "hero", "footer", "weight", "how", "tuesday", "stories"];

  const current = forms[active];

  function setForm(patch: Partial<SectionForm>) {
    setForms((f) => ({ ...f, [active]: { ...(f[active] ?? { key: active, title: "", subtitle: "", body: "", content: {} }), ...patch } }));
  }

  async function save() {
    const current = forms[active];
    if (!current) return;
    setBusy(true);
    setMsg("");
    const res = await api.section(current);
    setBusy(false);
    setMsgOk(res.ok);
    setMsg(res.ok ? "Saved." : res.error ?? "Could not save");
    if (res.ok) {
      api.sections().then((r) => setForms(sectionsToForms((r.json?.sections ?? []) as Section[])));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {knownKeys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className={`rounded-full px-4 py-1.5 text-sm border transition ${active === k ? "bg-[#0f5257] text-white border-[#0f5257]" : "border-white/15 text-white/60 hover:border-white/40"}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#11181b] p-6">
        <h2 className="text-lg font-semibold capitalize">{active}</h2>
        <div className="mt-4">
          {!current ? (
            <p className="text-sm text-white/40">No content yet — save below to create it.</p>
          ) : active === "header" ? (
            <HeaderEditor form={current} onChange={setForm} />
          ) : active === "hero" ? (
            <HeroEditor form={current} onChange={setForm} />
          ) : active === "footer" ? (
            <FooterEditor form={current} onChange={setForm} />
          ) : (
            <GenericSectionEditor form={current} onChange={setForm} />
          )}
        </div>
        <div className="mt-6 flex items-center gap-4">
          <SaveButton busy={busy} onClick={save}>Save section</SaveButton>
          <Status ok={msgOk} msg={msg} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- faq panel ------------------------------ */

function FaqPanel() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  useEffect(() => {
    api.faq().then((res) => setItems((res.json?.faq ?? []) as FaqItem[]));
  }, []);

  async function refresh() {
    const res = await api.faq();
    setItems((res.json?.faq ?? []) as FaqItem[]);
  }

  async function add() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setBusy(true);
    setMsg("");
    const res = await api.faqCreate({ question: newQuestion.trim(), answer: newAnswer.trim(), sortOrder: items.length });
    setBusy(false);
    if (res.ok) {
      setNewQuestion("");
      setNewAnswer("");
      setMsgOk(true);
      setMsg("Added.");
      refresh();
    } else {
      setMsgOk(false);
      setMsg(res.error ?? "Could not add");
    }
  }

  async function saveEdit() {
    if (editing === null) return;
    setBusy(true);
    setMsg("");
    const res = await api.faqUpdate({ id: editing, question: draft.question.trim(), answer: draft.answer.trim(), sortOrder: items.find((i) => i.id === editing)?.sortOrder ?? 0 });
    setBusy(false);
    if (res.ok) {
      setEditing(null);
      setMsgOk(true);
      setMsg("Saved.");
      refresh();
    } else {
      setMsgOk(false);
      setMsg(res.error ?? "Could not save");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this FAQ item?")) return;
    setBusy(true);
    setMsg("");
    const res = await api.faqDelete({ id });
    setBusy(false);
    if (res.ok) {
      setMsgOk(true);
      setMsg("Deleted.");
      refresh();
    } else {
      setMsgOk(false);
      setMsg(res.error ?? "Could not delete");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#11181b] p-6">
        <h2 className="text-lg font-semibold">Add a question</h2>
        <div className="mt-4 space-y-4">
          <Field label="Question">
            <TextInput value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
          </Field>
          <Field label="Answer">
            <TextArea rows={3} value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} />
          </Field>
          <SaveButton busy={busy} onClick={add}>Add question</SaveButton>
        </div>
      </section>

      <section className="space-y-3">
        {items.length === 0 && <p className="text-sm text-white/40">No FAQ items yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-[#11181b] p-5">
            {editing === item.id ? (
              <div className="space-y-3">
                <Field label="Question">
                  <TextInput value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
                </Field>
                <Field label="Answer">
                  <TextArea rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
                </Field>
                <div className="flex gap-3">
                  <SaveButton busy={busy} onClick={saveEdit}>Save</SaveButton>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 hover:border-white/40">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.question}</p>
                  <p className="mt-1 text-sm text-white/60 whitespace-pre-wrap">{item.answer}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(item.id);
                      setDraft({ question: item.question, answer: item.answer });
                    }}
                    className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 hover:border-white/40"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-full border border-[#e2725b]/40 px-4 py-1.5 text-xs text-[#e2725b] hover:bg-[#e2725b]/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      <Status ok={msgOk} msg={msg} />
    </div>
  );
}

/* ------------------------------ admin shell --------------------------- */

const TABS = ["Theme", "Sections", "FAQ"] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [tab, setTab] = useState<Tab>("Theme");

  useEffect(() => {
    api.check().then((res) => setAuth(res.ok ? "in" : "out"));
  }, []);

  async function signOut() {
    await api.logout();
    setAuth("out");
  }

  if (auth === "checking") {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0b0f10] text-white/60">Loading admin…</div>
    );
  }
  if (auth === "out") {
    return <LoginForm onLogin={() => setAuth("in")} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f10] text-[#efe8da]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0f10]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-white/40 uppercase">Palawan</p>
            <h1 className="text-lg font-medium">Admin</h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/40"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm border transition ${tab === t ? "bg-[#efe8da] text-[#0b0f10] border-[#efe8da]" : "border-white/15 text-white/60 hover:border-white/40"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {tab === "Theme" && <ThemePanel onSaved={() => {}} />}
          {tab === "Sections" && <SectionsPanel />}
          {tab === "FAQ" && <FaqPanel />}
        </div>
      </main>
    </div>
  );
}

export { api };
