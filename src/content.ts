// Shared content types, static fallbacks, and helpers for the public site.
// The public site renders these defaults and hydrates from GET /api/content
// when the backend is reachable.

export type Theme = {
  siteName: string;
  tagline: string;
  logoSvg: string | null;
  colors: Record<string, string>;
  fonts: Record<string, string>;
};

export type Section = {
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  sortOrder: number;
  content: Record<string, any>;
  updatedAt?: string;
};

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
};

export type SiteContent = {
  theme: Theme | null;
  sections: Section[];
  faq: FaqItem[];
};

export const THEME_DEFAULT: Theme = {
  siteName: "Palawan Collective",
  tagline: "Slow and steady runs the business.",
  logoSvg: null,
  colors: {
    sand: "#efe8da",
    shell: "#e5dcc9",
    ink: "#141414",
    lagoon: "#0f5257",
    deep: "#0a3236",
    coral: "#e2725b",
    foam: "#cfe3d8",
  },
  fonts: {
    brand: "Orbitron",
    serif: "Fraunces",
    sans: "DM Sans",
    hand: "Caveat",
  },
};

export type HeaderContent = {
  links: { label: string; href: string }[];
  cta: { label: string; href: string };
};

export const HEADER_DEFAULT: HeaderContent = {
  links: [
    { label: "The weight", href: "#weight" },
    { label: "How it works", href: "#how" },
    { label: "A Tuesday", href: "#tuesday" },
    { label: "Stories", href: "#stories" },
  ],
  cta: { label: "Say hello", href: "#hello" },
};

export type HeroContent = {
  kicker: string;
  heading: string;
  subheading: string;
  cta: { label: string; href: string };
  note: string;
};

export const HERO_DEFAULT: HeroContent = {
  kicker: "psst… you look tired.",
  heading: "Your business can swim on its own.",
  subheading:
    "We take the repetitive, every-single-day work off your shoulders, so you can get back to the part you actually love. Or go to the beach. We don't judge.",
  cta: { label: "Show me how light it gets", href: "#weight" },
  note: "(no jargon, promise)",
};

export type FooterContent = {
  tagline: string;
  copyright: string;
  contact: string;
};

export const FOOTER_DEFAULT: FooterContent = {
  tagline: "Slow and steady runs the business.",
  copyright: "© 2026 Palawan Collective",
  contact: "hello@palawancollective.com",
};

export function sectionOf(site: SiteContent | null, key: string): Section | null {
  return site?.sections.find((s) => s.key === key) ?? null;
}

export async function fetchContent(): Promise<SiteContent | null> {
  try {
    const res = await fetch("/api/content", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SiteContent;
  } catch {
    return null;
  }
}

const FONT_FALLBACK: Record<string, string> = {
  serif: "Georgia, serif",
  hand: "cursive",
  sans: "sans-serif",
  brand: "sans-serif",
};

export function applyTheme(theme: Theme | null) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.colors ?? {})) {
    if (v) root.style.setProperty(`--color-${k}`, v);
  }
  for (const [k, v] of Object.entries(theme.fonts ?? {})) {
    if (!v) continue;
    root.style.setProperty(`--font-${k}`, `"${v}", ${FONT_FALLBACK[k] ?? "sans-serif"}`);
  }
  applyGoogleFonts(Object.values(theme.fonts ?? {}).filter(Boolean) as string[]);
}

function applyGoogleFonts(families: string[]) {
  const existing = document.querySelector<HTMLLinkElement>("link[data-admin-fonts]");
  const unique = [...new Set(families)].filter(Boolean);
  if (!unique.length) {
    existing?.remove();
    return;
  }
  const params = unique.map((f) => `family=${encodeURIComponent(f.replace(/\s+/g, "+"))}:wght@400;500;700`).join("&");
  const href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
  if (existing && existing.getAttribute("href") === href) return;
  existing?.remove();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.adminFonts = "true";
  document.head.appendChild(link);
}
