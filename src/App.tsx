import { useEffect, useRef, useState } from "react";
import Turtle from "./components/Turtle";
import Logo from "./components/Logo";
import Coconut from "./components/Coconut";
import StampBand from "./components/StampBand";
import Admin from "./admin/Admin";
import {
  fetchContent,
  applyTheme,
  sectionOf,
  HEADER_DEFAULT,
  HERO_DEFAULT,
  FOOTER_DEFAULT,
  type SiteContent,
  type HeaderContent,
  type HeroContent,
  type FooterContent,
  type FaqItem,
  type Section,
} from "./content";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Consistent section header: rule + small caps label, then a measured heading. */
function SectionHead({
  label,
  title,
  intro,
  tone = "light",
}: {
  label: string;
  title: string;
  intro?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <span className={`w-8 h-px ${dark ? "bg-coral" : "bg-lagoon"}`} />
        <span className={`font-brand text-[10px] tracking-[0.35em] uppercase ${dark ? "text-coral" : "text-lagoon"}`}>
          {label}
        </span>
      </div>
      <h2 className={`font-serif font-light text-4xl md:text-[3.25rem] leading-[1.08] tracking-tight mt-6 ${dark ? "text-sand" : ""}`}>
        {title}
      </h2>
      {intro && <p className={`mt-5 text-base md:text-lg leading-relaxed ${dark ? "text-sand/65" : "text-ink/65"}`}>{intro}</p>}
    </div>
  );
}

/* ---------------- NAV ---------------- */
function Nav({ links, cta, logoSrc }: { links: { label: string; href: string }[]; cta: { label: string; href: string }; logoSrc?: string }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let previousY = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      if (Math.abs(y - previousY) > 7) setHidden(y > 150 && y > previousY);
      previousY = y;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { if (open) setHidden(false); }, [open]);
  const link = "px-4 py-2 rounded-full hover:bg-ink/8 transition";
  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-transform duration-300 ${hidden && !open ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-5 md:px-8 py-3 flex items-center justify-between gap-2">
        <a
          href="#top"
          className={`rounded-full pl-1 pr-2 sm:pl-2 sm:pr-4 py-1.5 transition min-w-0 max-w-[72vw] ${solid ? "bg-sand/95 backdrop-blur border border-ink/10 shadow-sm" : ""}`}
        >
          {logoSrc ? <img src={logoSrc} alt="Palawan Collective" className="h-10 w-auto max-w-[66vw] object-contain"/> : <span className="block max-w-full [&_svg]:max-w-full"><Logo size="sm" /></span>}
        </a>
        <nav
          className={`hidden md:flex items-center rounded-full p-1 text-sm transition ${solid ? "bg-sand/90 backdrop-blur border border-ink/10" : ""}`}
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className={link}>
              {l.label}
            </a>
          ))}
          <a href={cta.href} className="ml-1 px-4 py-2 rounded-full bg-ink text-sand hover:bg-lagoon transition">
            {cta.label}
          </a>
        </nav>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden ml-2 w-12 h-12 shrink-0 rounded-full border border-ink/20 grid place-items-center bg-sand/95 backdrop-blur shadow-sm"
        >
          <span className="relative block w-4 h-3">
            <span className={`absolute left-0 right-0 h-px bg-ink transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 right-0 h-px bg-ink transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
          </span>
        </button>
      </div>
      {open && (
        <div className="md:hidden mx-4 mt-1 rounded-2xl bg-sand/98 backdrop-blur-xl border border-ink/10 shadow-lg p-2 max-h-[calc(100dvh-90px)] overflow-y-auto">
          {[...links, cta].map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3.5 rounded-xl text-ink/80 hover:bg-ink hover:text-sand transition"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/* ---------------- HERO ---------------- */
function Hero({
  kicker,
  heading,
  subheading,
  ctaLabel,
  ctaHref,
  note,
  imageUrl,
}: {
  kicker: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  note: string;
  imageUrl?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ x: 0, y: 0 });
  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setM({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
      }}
      className="relative overflow-hidden"
    >
      <div className="hidden lg:block absolute right-[6%] top-[14%] w-44 h-44 rounded-full bg-coral" />
      <div
        className="hidden lg:block absolute -right-[4%] top-[10%] w-[46vw] max-w-[680px] text-ink transition-transform duration-[1200ms] ease-out"
        style={{ transform: `translate(${m.x * 30}px, ${m.y * 22}px) rotate(${m.x * 5}deg)` }}
      >
        <div className="drift">
          {imageUrl ? <img src={imageUrl} alt="" className="w-full h-auto object-contain" /> : <Turtle className="w-full h-auto" rotate={28} />}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8 pt-28 md:pt-44 pb-20 md:pb-36">
        {/* Small editorial accent, not a tall empty illustration row. */}
        <div className="lg:hidden pointer-events-none absolute right-4 top-[90px] sm:top-[105px] w-[105px] sm:w-[155px] md:w-[185px] aspect-square" aria-hidden>
          <div className="absolute right-0 top-[12%] w-[74%] aspect-square rounded-full bg-coral" />
          <div className="drift relative w-full">{imageUrl ? <img src={imageUrl} alt="" className="w-full h-auto object-contain" /> : <Turtle className="w-full h-auto" rotate={28} />}</div>
        </div>
        <p className="rise relative font-hand text-[22px] sm:text-2xl text-lagoon -rotate-1 max-w-[67%] sm:max-w-none">{kicker}</p>
        <h1
          className="rise font-serif font-light text-[clamp(2.9rem,10.2vw,5rem)] md:text-7xl leading-[1.04] tracking-tight mt-5 sm:mt-7 lg:mt-4 max-w-[15ch]"
          style={{ animationDelay: ".12s" }}
        >
          {heading}
        </h1>
        <p className="rise mt-5 sm:mt-7 max-w-md text-base sm:text-lg leading-relaxed text-ink/70" style={{ animationDelay: ".24s" }}>
          {subheading}
        </p>
        <div className="rise mt-7 sm:mt-9 flex flex-wrap items-center gap-3 sm:gap-6" style={{ animationDelay: ".36s" }}>
          <a href={ctaHref} className="inline-flex max-w-full items-center justify-between gap-3 bg-ink text-sand rounded-full pl-5 sm:pl-6 pr-1.5 py-1.5 hover:bg-lagoon transition">
            <span className="text-sm sm:text-base leading-tight">{ctaLabel}</span>
            <span className="w-9 h-9 shrink-0 rounded-full bg-coral text-ink grid place-items-center">↓</span>
          </a>
          <span className="font-hand text-xl text-ink/45">{note}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- THE WEIGHT ---------------- */
const CHORES: { t: string; h: number; skin: number; seed: number }[] = [
  { t: "Answering the same five questions", h: 4, skin: 0, seed: 3 },
  { t: "Chasing unpaid invoices", h: 3, skin: 2, seed: 11 },
  { t: "Booking & rescheduling", h: 3, skin: 1, seed: 7 },
  { t: "Copying details from A to B", h: 5, skin: 3, seed: 19 },
  { t: "Sending reminder messages", h: 2, skin: 1, seed: 23 },
  { t: "Following up with new leads", h: 3, skin: 0, seed: 31 },
  { t: "Preparing the weekly report", h: 2, skin: 2, seed: 41 },
  { t: "Welcoming new customers", h: 2, skin: 3, seed: 53 },
  { t: "Reconciling the receipts", h: 2, skin: 1, seed: 61 },
];

function Weight({ section }: { section?: Section }) {
  const [gone, setGone] = useState<number[]>([]);
  const chores = Array.isArray(section?.content?.chores) ? section.content.chores as typeof CHORES : CHORES;
  const hours = chores.reduce((s, c, i) => (gone.includes(i) ? s + c.h : s), 0);
  const total = chores.reduce((s, c) => s + c.h, 0);
  const line =
    gone.length === 0
      ? "Tap a coconut to crack it open."
      : hours < 6
      ? "That's a long lunch. Every week."
      : hours < 12
      ? "That's an afternoon off. Every week."
      : hours < 18
      ? "That's a three-day weekend."
      : "That's half your week. Yours again.";
  const toggle = (i: number) => setGone((g) => (g.includes(i) ? g.filter((x) => x !== i) : [...g, i]));

  return (
    <section id="weight" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          label="01 — The weight"
          title={section?.title || "Crack open the coconuts on your list."}
          intro={section?.body || "Some jobs are just hard shells: plenty of effort, not much inside. Tap one to see what happens when it stops being your problem."}
        />

        <div className="mt-12 md:mt-14 grid lg:grid-cols-[300px_1fr] gap-10 md:gap-12 lg:gap-16 items-start">
          <div className="lg:sticky lg:top-24 w-full">
            <div className="rounded-2xl bg-ink text-sand p-6 md:p-7">
              <div className="font-brand text-[9px] tracking-[0.35em] uppercase text-sand/45">Time handed back</div>
              <div className="flex items-end gap-3 mt-3">
                <span className="font-serif font-light text-6xl md:text-7xl leading-none tabular-nums">{hours}</span>
                <span className="pb-2 text-sm text-sand/55">hrs / week</span>
              </div>
              <div className="mt-5 h-px bg-sand/20 relative">
                <div className="absolute left-0 -top-px h-[3px] bg-coral transition-all duration-500" style={{ width: `${(hours / total) * 100}%` }} />
              </div>
              <p className="font-hand text-2xl text-coral mt-5">{line}</p>
              <div className="mt-5 flex items-center justify-between text-xs text-sand/45">
                <span>
                  {gone.length} of {chores.length} set down
                </span>
                {gone.length > 0 && (
                  <button onClick={() => setGone([])} className="underline underline-offset-4 hover:text-sand">
                    reset
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setGone(chores.map((_, i) => i))}
              className="mt-4 w-full rounded-full border border-ink/40 py-3 hover:bg-ink hover:text-sand hover:border-ink transition"
            >
              Crack them all open
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-6 md:gap-y-10">
            {chores.map((c, i) => {
              const isGone = gone.includes(i);
              return (
                <button key={i} onClick={() => toggle(i)} className="group text-left" aria-pressed={isGone}>
                  <div className="relative aspect-[13/11]">
                    <div className={`ghost absolute inset-0 ${isGone ? "opacity-100" : "opacity-0"}`}>
                      <div className="absolute inset-0 rounded-[50%] border border-dashed border-ink/20" />
                      <span className="absolute inset-0 grid place-items-center font-hand text-xl text-lagoon">handled</span>
                    </div>
                    <Coconut
                      seed={c.seed}
                      skin={c.skin}
                      open={isGone}
                      className={`coco absolute inset-0 w-full h-full ${isGone ? "scale-[0.97]" : ""}`}
                    />
                  </div>
                  <div className="mt-1">
                    <div className="font-brand text-[9px] tracking-[0.3em] text-ink/40">~{c.h} HRS / WK</div>
                    <div className={`mt-1 text-sm leading-snug transition ${isGone ? "text-ink/30 line-through" : "text-ink/80"}`}>{c.t}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS: vertical timeline ---------------- */
const STEPS = [
  {
    n: "01",
    t: "Listen",
    d: "We sit with you — coffee optional, strongly encouraged — and learn how your days really go. What drains you, what you love, what keeps slipping.",
    aside: "you talk, we listen",
  },
  {
    n: "02",
    t: "Lighten",
    d: "Quietly, in the background, we set the repetitive work up to handle itself. Messages, bookings, payments, paperwork. All in your voice, your way.",
    aside: "we build quietly",
  },
  {
    n: "03",
    t: "Let go",
    d: "We hand it over, walk you through it, and stay close. As your business grows or changes, we adjust it with you.",
    aside: "you breathe out",
  },
];

function How({ section }: { section?: Section }) {
  const [active, setActive] = useState(0);
  const steps = Array.isArray(section?.content?.steps) ? section.content.steps as typeof STEPS : STEPS;
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );
    rows.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="relative bg-deep text-sand py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          tone="dark"
          label="02 — How it works"
          title={section?.title || "Three slow steps. That is the whole thing."}
          intro={section?.body || "No forty-page proposal. No technical language. Three stages that feel like a conversation."}
        />

        <div className="relative mt-14 md:mt-20">
          {/* rail */}
          <div className="absolute left-[9px] md:left-[15px] top-3 bottom-6 w-px bg-sand/15" aria-hidden />
          <div
            className="absolute left-[9px] md:left-[15px] top-3 w-px bg-coral transition-all duration-700 ease-out"
            style={{ height: `calc(${((active + 0.55) / steps.length) * 100}% - 12px)` }}
            aria-hidden
          />

          <ol className="space-y-12 md:space-y-16">
            {steps.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.n}>
                  <div
                    ref={(el) => {
                      rows.current[i] = el;
                    }}
                    data-i={i}
                    className="relative grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-4 md:gap-16 pl-10 md:pl-20"
                  >
                    {/* dot */}
                    <span
                      className={`absolute left-0 md:left-[6px] top-2.5 w-[19px] h-[19px] rounded-full border-2 grid place-items-center transition-all duration-500 ${
                        on ? "border-coral bg-deep" : "border-sand/25 bg-deep"
                      }`}
                      aria-hidden
                    >
                      <span className={`w-2 h-2 rounded-full transition-all duration-500 ${on ? "bg-coral scale-100" : "bg-sand/25 scale-75"}`} />
                    </span>

                    <div>
                      <span className="font-brand text-[10px] tracking-[0.35em] text-coral">{s.n}</span>
                      <h3 className={`font-serif font-light text-4xl md:text-5xl mt-3 leading-none transition-colors duration-500 ${on ? "text-sand" : "text-sand/70"}`}>
                        {s.t}
                      </h3>
                      <p className={`font-hand text-xl md:text-2xl mt-3 transition-colors duration-500 ${on ? "text-coral" : "text-coral/50"}`}>→ {s.aside}</p>
                    </div>
                    <div>
                      <p className="text-sand/70 leading-relaxed md:text-[17px] md:pt-7">{s.d}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------- A TUESDAY ---------------- */
const BEFORE: string[][] = [
  ["6:40", "Wake up to 37 unread messages"],
  ["8:00", "Say “yes, we're open Saturday” again"],
  ["10:30", "Retype orders into the spreadsheet"],
  ["13:00", "Lunch at the desk. Cold."],
  ["15:00", "Chase three overdue invoices"],
  ["19:30", "Still sending reminder texts"],
  ["22:45", "“Just one more thing…”"],
];
const AFTER: string[][] = [
  ["7:30", "Wake up. Messages already answered."],
  ["9:00", "Work on the thing you're great at"],
  ["11:00", "New bookings appeared. You did nothing."],
  ["13:00", "Long lunch. Outside. Warm."],
  ["15:00", "Payments landed on their own"],
  ["17:00", "Close the laptop. Actually close it."],
  ["18:30", "Sunset swim"],
];

function Tuesday({ section }: { section?: Section }) {
  const [v, setV] = useState(50);
  const [auto, setAuto] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [mobileAfter, setMobileAfter] = useState(false);
  const before = Array.isArray(section?.content?.before) ? section.content.before as string[][] : BEFORE;
  const after = Array.isArray(section?.content?.after) ? section.content.after as string[][] : AFTER;
  const touchStart = useRef<number | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const vRef = useRef(v);
  vRef.current = v;


  useEffect(() => {
    if (!auto || dragging) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const t = performance.now() / 1000;
      const next = 50 + Math.sin(t * 0.55) * 30;
      if (Math.abs(next - vRef.current) > 0.4) setV(next);
    }, 55);
    return () => window.clearInterval(id);
  }, [auto, dragging]);

  const setFromClientX = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setV(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  const Card = ({ items, after }: { items: string[][]; after?: boolean }) => (
    <div className={`p-6 md:p-10 h-full ${after ? "bg-foam" : "bg-[#ded6c6]"}`}>
      <div className="flex items-center justify-between">
        <span className="font-brand text-[9px] tracking-[0.2em] sm:tracking-[0.35em] uppercase pr-2" aria-hidden>{after ? "After Palawan" : "Before"}</span>
        <span className="font-hand text-2xl">{after ? "ahh." : "ugh."}</span>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map(([t, d]) => (
          <li key={t} className="flex gap-4 items-baseline border-b border-ink/12 pb-2.5">
            <span className="font-brand text-[10px] w-11 shrink-0 opacity-50">{t}</span>
            <span className={`font-serif font-light text-[17px] md:text-2xl leading-snug ${after ? "" : "line-through decoration-coral decoration-2"}`}>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section id="tuesday" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          label="03 — A Tuesday"
          title={section?.title || "Same business. Different day."}
          intro={section?.body || "It moves on its own — or drag the sun yourself to compare a normal Tuesday."}
        />

        {/* Mobile comparison: switch or swipe a single full-width card. */}
        <div className="lg:hidden mt-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex rounded-full border border-ink/20 bg-shell/60 p-1" role="group" aria-label="Compare a day before and after automation">
              <button type="button" onClick={() => setMobileAfter(false)} aria-pressed={!mobileAfter}
                className={`rounded-full px-5 py-3 text-sm transition-colors ${!mobileAfter ? "bg-ink text-sand" : "text-ink/65"}`}>Before</button>
              <button type="button" onClick={() => setMobileAfter(true)} aria-pressed={mobileAfter}
                className={`rounded-full px-5 py-3 text-sm transition-colors ${mobileAfter ? "bg-lagoon text-sand" : "text-ink/65"}`}>After</button>
            </div>
            <span className="font-hand text-lg text-lagoon/75">swipe ⇆</span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-ink/15 shadow-sm"
            onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              if (touchStart.current === null) return;
              const delta = (e.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
              if (delta < -45) setMobileAfter(true);
              if (delta > 45) setMobileAfter(false);
              touchStart.current = null;
            }}>
            <Card items={mobileAfter ? after : before} after={mobileAfter} />
          </div>
          <p className="mt-3 text-xs text-ink/55 text-center">Tap Before / After or swipe the card.</p>
        </div>

        {/* desktop: self-moving comparison */}
        <div className="hidden lg:block mt-10 reveal">
          <div
            ref={box}
            className="relative h-[560px] rounded-2xl overflow-hidden border border-ink/15 select-none touch-none"
            onPointerDown={(e) => {
              setDragging(true);
              setAuto(false);
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              setFromClientX(e.clientX);
            }}
            onPointerMove={(e) => {
              if (dragging) setFromClientX(e.clientX);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            <div className="absolute inset-0">
              <Card items={before} />
            </div>
            <div className="absolute inset-0 z-[1]" style={{ clipPath: `inset(0 0 0 ${v}%)` }}>
              <Card items={after} after />
            </div>

            {/* fixed labels so both states stay readable */}
            <div className="absolute z-[2] left-5 top-1/2 -translate-y-1/2 rotate-180 font-brand text-[9px] tracking-[0.35em] uppercase text-ink/45 pointer-events-none" style={{ writingMode: "vertical-rl" }}>
              Before
            </div>
            <div className="absolute z-[2] right-5 top-1/2 -translate-y-1/2 font-brand text-[9px] tracking-[0.35em] uppercase text-ink/45 pointer-events-none" style={{ writingMode: "vertical-rl" }}>
              After
            </div>

            {/* divider */}
            <div className="absolute z-[2] top-0 bottom-0 w-px bg-ink/70 pointer-events-none" style={{ left: `${v}%` }} />

            {/* sun handle */}
            <button
              type="button"
              role="slider"
              aria-label="Compare before and after"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  setAuto(false);
                  setV((n) => Math.max(0, Math.min(100, n + (e.key === "ArrowRight" ? 4 : -4))));
                }
              }}
              className="absolute top-1/2 z-10 w-14 h-14 -ml-7 -mt-7 rounded-full bg-coral border-2 border-ink grid place-items-center cursor-ew-resize shadow-[0_6px_16px_rgba(20,20,20,.25)] focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/25"
              style={{ left: `${v}%` }}
            >
              <span className="text-ink text-base leading-none" aria-hidden>⇆</span>
              {auto && !dragging && (
                <span className="absolute inset-0 rounded-full border-2 border-coral/60" style={{ animation: "slider-pulse 2.4s ease-out infinite" }} aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="font-hand text-xl text-ink/50">
              drag the sun — or let it drift
            </p>
            <button
              type="button"
              onClick={() => setAuto((a) => !a)}
              className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 text-xs tracking-[0.08em] text-ink/65 hover:border-ink/60 hover:text-ink transition"
              aria-pressed={auto}
            >
              <span className={`grid place-items-center w-4 h-4 rounded-full border text-[8px] ${auto ? "bg-ink text-sand border-ink" : "border-ink/30"}`} aria-hidden>
                {auto ? "❙❙" : "▶"}
              </span>
              {auto ? "pause the drift" : "let it drift"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- STORIES ---------------- */
function Stories({ section }: { section?: Section }) {
  const defaultNotes = [
    { q: "I used to spend Sundays on admin. Now I spend them with my kids. That's the whole review.", w: "Maya", b: "Pilates studio" },
    { q: "Customers think I hired three people. I didn't. I just stopped doing everything by hand.", w: "Tomás", b: "Family bakery" },
    { q: "They explained everything like a friend would. I never once felt stupid. Rare.", w: "Priya", b: "Interior design" },
  ];
  const notes = Array.isArray(section?.content?.testimonials) ? section.content.testimonials as typeof defaultNotes : defaultNotes;
  return (
    <section id="stories" className="py-24 md:py-32 bg-shell/60">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead label="04 — Stories" title={section?.title || "From people who breathe easier now."} intro={section?.body || undefined}/>
        <div className="mt-10 md:mt-14 grid lg:grid-cols-3 gap-x-12 gap-y-10">
          {notes.map((n, i) => (
            <figure key={i} className="reveal border-t border-ink/25 pt-6" style={{ transitionDelay: `${i * 110}ms` }}>
              <blockquote className="font-serif font-light italic text-xl leading-snug">{n.q}</blockquote>
              <figcaption className="mt-5 font-brand text-[9px] tracking-[0.3em] uppercase text-ink/50">
                {n.w} · {n.b}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="reveal mt-12 md:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 border-t border-ink/20 pt-8">
          {[
            ["12 hrs", "handed back, weekly"],
            ["3 weeks", "first coffee to calm"],
            ["0", "words of jargon"],
            ["∞", "patience for questions"],
          ].map(([a, b]) => (
            <div key={b}>
              <div className="font-serif font-light text-4xl md:text-5xl">{a}</div>
              <div className="mt-2 text-sm text-ink/55">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* A tiny illustrated postage stamp with actual perforated edges and printed ink. */
function PostageStamp() {
  const ticks = Array.from({ length: 11 }, (_, i) => 10 + i * 10);
  const sideTicks = Array.from({ length: 14 }, (_, i) => 10 + i * 10);
  return (
    <div className="postage-stamp relative shrink-0 w-[84px] h-[108px] sm:w-[100px] sm:h-[128px] rotate-[-5deg]" aria-label="Decorative Palawan postage stamp">
      <svg className="absolute inset-0 w-full h-full drop-shadow-[0_4px_3px_rgba(20,20,20,.15)]" viewBox="0 0 120 150" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="palawan-postage-edge">
            <rect width="120" height="150" fill="white" />
            {ticks.map((x) => <g key={x}><circle cx={x} cy="0" r="3.5" fill="black" /><circle cx={x} cy="150" r="3.5" fill="black" /></g>)}
            {sideTicks.map((y) => <g key={y}><circle cx="0" cy={y} r="3.5" fill="black" /><circle cx="120" cy={y} r="3.5" fill="black" /></g>)}
          </mask>
        </defs>
        <rect x="0" y="0" width="120" height="150" fill="#d6e4d9" mask="url(#palawan-postage-edge)" />
        <rect x="8" y="8" width="104" height="134" rx="1" fill="none" stroke="#a96356" strokeWidth="1.25" opacity=".8"/>
        <rect x="12" y="12" width="96" height="126" fill="none" stroke="#a96356" strokeWidth=".45" opacity=".5"/>
        <path d="M18 42 H102 M18 117 H102" stroke="#a96356" strokeWidth=".6" opacity=".45"/>
        <text x="19" y="26" fontSize="7.5" fontFamily="sans-serif" fill="#1c5353" letterSpacing="1">PHILIPPINES</text>
        <text x="102" y="37" textAnchor="end" fontSize="18" fontFamily="serif" fill="#a04c3d">₱26</text>
        <text x="60" y="126" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="sans-serif" fill="#1c5353" letterSpacing="1.15">PALAWAN</text>
        <text x="60" y="136" textAnchor="middle" fontSize="6.5" fontFamily="sans-serif" fill="#a96356" letterSpacing="2">2026</text>
      </svg>
      <Turtle className="absolute left-[23%] top-[34%] w-[54%] h-[42%] opacity-90" swim={false}/>
    </div>
  );
}

/* ---------------- POSTCARD ---------------- */
const HANDOFFS = [
  "Messages & replies",
  "Bookings & scheduling",
  "Invoices & payments",
  "Follow-ups & leads",
  "Reports & admin",
  "Not sure yet",
];
const LOADS = ["Under 2 hrs", "2–5 hrs", "5–10 hrs", "10+ hrs", "No idea"];

function Postcard() {
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [load, setLoad] = useState("");
  const [note, setNote] = useState("");
  const [who, setWho] = useState({ name: "", business: "", email: "", site: "" });
  const [tried, setTried] = useState(false);

  const toggle = (h: string) => {
    setPicks((p) => (h === "Not sure yet" ? (p.includes(h) ? [] : [h]) : p.includes(h) ? p.filter((x) => x !== h) : [...p.filter((x) => x !== "Not sure yet"), h]));
  };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email);
  const canReview = who.name.trim().length > 1 && emailOk;
  const canSend = picks.length > 0 || note.trim().length > 0;

  const next = () => {
    if (step === 1 && !canReview) {
      setTried(true);
      return;
    }
    if (step === 2) return;
    setTried(false);
    setStep((s) => Math.min(2, s + 1));
  };
  const back = () => {
    setTried(false);
    setStep((s) => Math.max(0, s - 1));
  };

  const field = "mt-1 w-full bg-transparent border-b border-ink/25 focus:border-coral outline-none py-2 font-serif font-light text-xl placeholder:text-ink/25";
  const label = "font-brand text-[9px] tracking-[0.35em] uppercase text-ink/45";

  return (
    <section id="hello" className="relative bg-lagoon py-24 md:py-32 overflow-hidden">
      <div className="absolute -left-28 top-6 w-[420px] text-deep opacity-40 pointer-events-none">
        <Turtle rotate={110} swim={false} />
      </div>
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          tone="dark"
          label="05 — Say hello"
          title="Pull up a chair. Let's talk."
          intro="Three short steps, about forty seconds. Tap what fits — you only type what we truly need."
        />

        <div className="reveal mt-8 md:mt-12 bg-sand rounded-lg md:rounded-md border border-ink/15 shadow-[0_24px_45px_-24px_rgba(0,0,0,.45)] overflow-hidden postcard-paper max-w-[780px] mx-auto">
          {sent ? (
            <div className="text-center px-6 py-16 md:py-20 step-in">
              <Turtle className="w-32 mx-auto" />
              <p className="font-serif font-light text-4xl md:text-5xl mt-6">It's on its way.</p>
              <p className="font-hand text-2xl text-lagoon mt-3">We'll write back within one working day.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-ink/55">
                <span>01 · we read it properly</span>
                <span>02 · a short, human reply</span>
                <span>03 · a 20-minute chat, no obligation</span>
              </div>
            </div>
          ) : (
            <>
              {/* card header */}
              <div className="relative flex items-start justify-between gap-3 border-b border-dashed border-ink/20 px-4 sm:px-6 py-4 md:px-10 md:py-5">
                <div>
                  <div className="font-brand text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.35em] uppercase text-ink/55">To · Palawan Collective</div>
                  <div className="mt-3 sm:mt-4 flex items-center gap-2" role="group" aria-label={`Step ${step + 1} of 3`}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          i === step ? "w-10 bg-coral" : i < step ? "w-5 bg-ink/40" : "w-5 bg-ink/15"
                        }`}
                      />
                    ))}
                    <span className="ml-2 hidden sm:inline font-brand text-[9px] tracking-[0.3em] text-ink/45">
                      0{step + 1} / 03
                    </span>
                  </div>
                </div>
                <PostageStamp />
              </div>

              <div className="px-4 sm:px-6 py-5 sm:py-7 md:px-10 md:py-9 md:min-h-[420px] flex flex-col">
                {step === 0 && (
                  <div className="step-in">
                    <h3 className="font-serif font-light text-3xl md:text-4xl">What's on your shoulders?</h3>
                    <p className="mt-2 text-sm text-ink/55">Pick as many as you like. No wrong answers.</p>
                    <div className="mt-5 grid grid-cols-1 min-[375px]:grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {HANDOFFS.map((h) => {
                        const on = picks.includes(h);
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => toggle(h)}
                            aria-pressed={on}
                            className={`inline-flex min-w-0 min-h-12 items-center gap-2 rounded-lg sm:rounded-full border px-2.5 sm:px-4 py-2 text-[12px] sm:text-sm leading-tight text-left transition ${
                              on
                                ? "bg-ink text-sand border-ink"
                                : "border-ink/25 text-ink/75 hover:border-ink/60 hover:bg-ink/[0.04]"
                            }`}
                          >
                            <span aria-hidden className={`grid shrink-0 place-items-center w-4 h-4 rounded-full border text-[9px] ${on ? "border-sand/60 bg-coral text-ink" : "border-ink/30 text-transparent"}`}>
                              ✓
                            </span>
                            {h}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-7">
                      <span className={label}>Roughly how much time does it eat?</span>
                      <div className="mt-2.5 grid grid-cols-1 min-[375px]:grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {LOADS.map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setLoad(l === load ? "" : l)}
                            aria-pressed={load === l}
                            className={`rounded-lg sm:rounded-full px-2 sm:px-4 py-2 text-xs sm:text-sm min-h-11 border transition ${
                              load === l ? "bg-lagoon text-sand border-lagoon" : "border-ink/20 text-ink/70 hover:border-ink/50"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-7">
                      <label htmlFor="note" className={label}>
                        Anything we should know? <span className="normal-case tracking-normal text-ink/35">(optional)</span>
                      </label>
                      <textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="A sentence in your own words is plenty — e.g. “I run a dental clinic and spend hours confirming appointments by phone.”"
                        className="mt-1 w-full bg-transparent font-hand text-xl leading-[1.85rem] outline-none resize-none placeholder:text-ink/25 placeholder:font-sans placeholder:text-sm placeholder:leading-relaxed"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(transparent, transparent 1.82rem, rgba(20,20,20,.14) 1.82rem, rgba(20,20,20,.14) 1.83rem)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="step-in">
                    <h3 className="font-serif font-light text-3xl md:text-4xl">How do we write back?</h3>
                    <p className="mt-2 text-sm text-ink/55">Only used to reply to you. No newsletter, no spam, ever.</p>
                    <div className="mt-6 grid md:grid-cols-2 gap-x-8 gap-y-5">
                      <label className="block">
                        <span className={label}>Your name *</span>
                        <input
                          value={who.name}
                          onChange={(e) => setWho({ ...who, name: e.target.value })}
                          className={field}
                          autoComplete="name"
                          placeholder="Maya"
                        />
                      </label>
                      <label className="block">
                        <span className={label}>Your business</span>
                        <input
                          value={who.business}
                          onChange={(e) => setWho({ ...who, business: e.target.value })}
                          className={field}
                          autoComplete="organization"
                          placeholder="Salt & Stone Pilates"
                        />
                      </label>
                      <label className="block">
                        <span className={label}>Email *</span>
                        <input
                          type="email"
                          value={who.email}
                          onChange={(e) => setWho({ ...who, email: e.target.value })}
                          className={field}
                          autoComplete="email"
                          placeholder="you@yourbusiness.com"
                        />
                      </label>
                      <label className="block">
                        <span className={label}>Website or Instagram</span>
                        <input
                          value={who.site}
                          onChange={(e) => setWho({ ...who, site: e.target.value })}
                          className={field}
                          placeholder="optional — helps us understand you"
                        />
                      </label>
                    </div>
                    {tried && !canReview && (
                      <p className="mt-5 font-hand text-xl text-coral" aria-live="polite">
                        We just need a name and a working email — the rest can wait.
                      </p>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="step-in">
                    <div className="md:grid md:grid-cols-[1.15fr_1fr] md:gap-10">
                      <div>
                        <h3 className="font-serif font-light text-3xl md:text-4xl">A last look?</h3>
                        <p className="mt-2 text-sm text-ink/55">This is what lands with us. Change anything before sending.</p>
                        <div className="mt-5 font-hand text-2xl leading-tight text-ink/80">
                          <p>Dear Palawan,</p>
                          {picks.length > 0 && (
                            <p className="mt-2">
                              Please take this off my plate: <span className="text-lagoon">{picks.join(", ").toLowerCase()}</span>.
                            </p>
                          )}
                          {load && <p className="mt-1">It costs me roughly {load.toLowerCase()} a week.</p>}
                          {note.trim() && <p className="mt-2 text-ink/65">“{note.trim()}”</p>}
                          <p className="mt-3">— {who.name}{who.business ? `, ${who.business}` : ""}</p>
                        </div>
                        {!canSend && (
                          <p className="mt-4 font-hand text-xl text-coral" aria-live="polite">
                            Pick one thing or write a line — otherwise we're just guessing.
                          </p>
                        )}
                      </div>
                      <div className="mt-6 md:mt-0 rounded-sm bg-foam/60 border border-ink/10 p-5">
                        <div className="font-brand text-[9px] tracking-[0.3em] uppercase text-ink/45">The address</div>
                        <dl className="mt-3 space-y-2.5 text-sm">
                          {[
                            ["From", who.name],
                            ["Business", who.business || "—"],
                            ["Email", who.email],
                            ["Online", who.site || "—"],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                              <dt className="text-ink/45 shrink-0">{k}</dt>
                              <dd className="text-ink/80 text-right break-all">{v}</dd>
                            </div>
                          ))}
                        </dl>
                        <button type="button" onClick={() => setStep(1)} className="mt-4 text-xs underline underline-offset-4 text-ink/50 hover:text-ink">
                          edit details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* controls */}
                <div className="mt-auto pt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                  {step > 0 && (
                    <button type="button" onClick={back} className="text-sm text-ink/55 hover:text-ink underline underline-offset-4">
                      back
                    </button>
                  )}
                  {step < 2 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="group inline-flex max-w-full items-center justify-between gap-3 bg-ink text-sand rounded-full pl-4 sm:pl-6 pr-1.5 py-1.5 hover:bg-lagoon transition"
                    >
                      <span className="text-sm sm:text-base leading-tight">{step === 0 ? "Next: how to reach you" : "Review the postcard"}</span>
                      <span className="w-9 h-9 rounded-full bg-coral text-ink grid place-items-center">→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canSend}
                      onClick={() => setSent(true)}
                      className="group inline-flex items-center gap-3 bg-ink text-sand rounded-full pl-6 pr-1.5 py-1.5 hover:bg-coral hover:text-ink transition disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-sand"
                    >
                      <span className="text-base">Send the postcard</span>
                      <span className="w-9 h-9 rounded-full bg-coral text-ink grid place-items-center">→</span>
                    </button>
                  )}
                  <span className="font-hand text-base sm:text-lg text-ink/40">no commitment, ever</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FaqSection({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <div className="flex items-center gap-4">
          <span className="w-8 h-px bg-lagoon" />
          <span className="font-brand text-[10px] tracking-[0.35em] uppercase text-lagoon">FAQ</span>
        </div>
        <h2 className="font-serif font-light text-4xl md:text-[3.25rem] leading-[1.08] tracking-tight mt-6">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-ink/15 border-y border-ink/15">
          {items.map((item) => (
            <details key={item.id} className="group py-5">
              <summary className="cursor-pointer flex items-center justify-between gap-6 list-none">
                <span className="font-serif text-xl md:text-2xl">{item.question}</span>
                <span
                  aria-hidden
                  className="shrink-0 w-8 h-8 rounded-full border border-ink/25 grid place-items-center text-ink/50 transition group-open:rotate-45 group-open:border-ink/50 group-open:text-ink"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 text-ink/70 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer({
  tagline,
  copyright,
  contact,
  logoSrc,
}: {
  tagline: string;
  copyright: string;
  contact: string;
  logoSrc?: string;
}) {
  return (
    <footer className="pt-14 md:pt-20 pb-8">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto w-full max-w-[300px] sm:max-w-[390px] md:max-w-none flex justify-center [&_svg]:max-w-full">
          {logoSrc ? <img src={logoSrc} alt="Palawan Collective" className="max-h-56 w-full object-contain"/> : <Logo size="lg" swim />}
        </div>
        <p className="text-center font-hand text-xl sm:text-2xl text-lagoon mt-5 md:mt-8">{tagline}</p>
        <div className="mt-12 md:mt-14 border-t border-ink/15 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <p className="text-xs text-ink/50 text-center md:text-left">{copyright}</p>
          <nav aria-label="Footer links" className="flex flex-wrap justify-center md:justify-end items-center gap-x-6 gap-y-3 text-xs sm:text-sm">
            <a href={`mailto:${contact}`} className="text-ink/75 underline underline-offset-4 decoration-ink/25 hover:text-lagoon break-all">{contact}</a>
            <a href="#/admin" className="text-lagoon hover:text-ink">Admin</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* CMS-controlled section layouts: content, cards, and portfolio. */
function ManagedSection({ section }: { section: Section }) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? content.items as {title?:string;description?:string;image?:string;href?:string}[] : [];
  const layout = content.kind || "content";
  const image = typeof content.image === "string" ? content.image : "";
  return <section id={section.key} className="py-20 md:py-28">
    <div className="mx-auto max-w-6xl px-5 md:px-8">
      <SectionHead label={section.subtitle || (layout === "portfolio" ? "Selected projects" : "What we do")} title={section.title || "Explore"} intro={section.body || undefined}/>
      {layout === "content" && image && <img src={image} alt={section.title || ""} loading="lazy" className="mt-10 w-full rounded-2xl max-h-[540px] object-cover"/>}
      {(layout === "cards" || layout === "portfolio") && <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => <article key={i} className="overflow-hidden rounded-2xl border border-ink/15 bg-shell/40">
          {item.image && <img src={item.image} alt={item.title || "Project image"} loading="lazy" className="aspect-[4/3] w-full object-cover"/>}
          <div className="p-5 sm:p-6"><h3 className="font-serif text-2xl">{item.title || "Untitled"}</h3>
            {item.description && <p className="mt-3 text-ink/65 text-sm leading-relaxed">{item.description}</p>}
            {item.href && <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block border-b border-lagoon pb-1 text-sm font-medium text-lagoon hover:text-ink">View project ↗</a>}
          </div>
        </article>)}
      </div>}
    </div>
  </section>;
}

function SiteApp() {
  const [site, setSite] = useState<SiteContent | null>(null);
  useReveal();

  useEffect(() => {
    let alive = true;
    fetchContent().then((s) => {
      if (!alive || !s) return;
      setSite(s);
      if (s.theme) applyTheme(s.theme);
    });
    return () => {
      alive = false;
    };
  }, []);

  const headerContent = sectionOf(site, "header")?.content as HeaderContent | undefined;
  const heroContent = sectionOf(site, "hero")?.content as HeroContent | undefined;
  const footerContent = sectionOf(site, "footer")?.content as FooterContent | undefined;
  const faqItems: FaqItem[] = (site?.faq as FaqItem[] | undefined) ?? [];
  const editorSections = (site?.sections || []).filter(s => !["header","hero","footer"].includes(s.key));
  const builtins = ["weight","how","tuesday","stories"];
  const sortedSections: Section[] = [...editorSections, ...builtins.filter(k => !editorSections.some(s=>s.key===k)).map((key,i)=>({
    key, title:null, subtitle:null, body:null, content:{}, sortOrder:10+i*10
  }))].sort((a,b)=>a.sortOrder-b.sortOrder);
  const showSection = (s:Section) => !s.content?.hidden;
  const logoSrc = /^\/api\/media\?id=\d+$/.test(site?.theme?.logoSvg || "") ? site!.theme!.logoSvg! : undefined;
  const publicLinks = headerContent?.links ?? HEADER_DEFAULT.links;
  const portfolioEntry = sortedSections.find(s=>s.content?.kind==="portfolio" && showSection(s));
  const navLinks = portfolioEntry && !publicLinks.some(l=>l.href==="#"+portfolioEntry.key)
    ? [...publicLinks, {label:"Portfolio",href:"#"+portfolioEntry.key}] : publicLinks;

  return (
    <div className="grain">
      <Nav links={navLinks} cta={headerContent?.cta ?? HEADER_DEFAULT.cta} logoSrc={logoSrc}/>
      <Hero
        kicker={heroContent?.kicker ?? HERO_DEFAULT.kicker}
        heading={heroContent?.heading ?? HERO_DEFAULT.heading}
        subheading={heroContent?.subheading ?? HERO_DEFAULT.subheading}
        ctaLabel={heroContent?.cta?.label ?? HERO_DEFAULT.cta.label}
        ctaHref={heroContent?.cta?.href ?? HERO_DEFAULT.cta.href}
        note={heroContent?.note ?? HERO_DEFAULT.note}
        imageUrl={/^\/api\/media\?id=\d+$/.test((heroContent as any)?.image||"") ? (heroContent as any).image : undefined}
      />
      <StampBand />
      {sortedSections.filter(showSection).map(section => {
        switch (section.key) {
          case "weight": return <Weight key={section.key} section={section}/>;
          case "how": return <How key={section.key} section={section}/>;
          case "tuesday": return <Tuesday key={section.key} section={section}/>;
          case "stories": return <Stories key={section.key} section={section}/>;
          default: return <ManagedSection key={section.key} section={section}/>;
        }
      })}
      <FaqSection items={faqItems} />
      <Postcard />
      <Footer
        tagline={footerContent?.tagline ?? FOOTER_DEFAULT.tagline}
        copyright={footerContent?.copyright ?? FOOTER_DEFAULT.copyright}
        contact={footerContent?.contact === "hello@palawancollective.com" ? "agent@merqato.digital" : footerContent?.contact ?? FOOTER_DEFAULT.contact}
        logoSrc={logoSrc}
      />
    </div>
  );
}

function isAdminRoute() {
  return window.location.hash.startsWith("#/admin");
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(isAdminRoute);
  useEffect(() => {
    const onHash = () => setIsAdmin(isAdminRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (isAdmin) return <Admin />;
  return <SiteApp />;
}
