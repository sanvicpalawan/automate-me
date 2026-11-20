import { useEffect, useId, useRef, useState } from "react";

type Stamp = {
  a: string;
  b: string;
  note: string;
  color: string;
  angle: number;
};

const STAMPS: Stamp[] = [
  { a: "MORE", b: "SUNSETS", note: "PRIORITY: YOU", color: "#c2513c", angle: -7 },
  { a: "WEEKENDS", b: "RETURNED", note: "NO EXPIRY", color: "#0f5257", angle: 5 },
  { a: "A CALMER", b: "INBOX", note: "APPROVED", color: "#26302c", angle: -3 },
  { a: "FEWER LATE", b: "NIGHTS", note: "VALID ALWAYS", color: "#c2513c", angle: 8 },
];

function Ink({ s, uid }: { s: Stamp; uid: string }) {
  return (
    <svg viewBox="-100 -100 200 200" className="w-full h-full overflow-visible" aria-hidden>
      <defs>
        <filter id={`rg${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <path id={`top${uid}`} d="M -78 0 A 78 78 0 0 1 78 0" fill="none" />

      </defs>
      <g filter={`url(#rg${uid})`} fill="none" stroke={s.color}>
        <circle r="88" strokeWidth="4" />
        <circle r="82" strokeWidth="1.4" />
        <circle r="52" strokeWidth="1" strokeDasharray="1.5 4.5" opacity="0.8" />
      </g>
      <g fill={s.color} fontFamily="Orbitron, sans-serif">
        <text fontSize="9" letterSpacing="2.8" textAnchor="middle" fontWeight="700">
          <textPath href={`#top${uid}`} startOffset="50%">PALAWAN COLLECTIVE</textPath>
        </text>
        <text x="0" y="64" fontSize="6.8" letterSpacing="2.2" textAnchor="middle" fontWeight="500" opacity="0.9">
          APPROVED · EST. 2026
        </text>
        <text x="0" y="-4" textAnchor="middle" fontSize="17" letterSpacing="1.6" fontWeight="700">{s.a}</text>
        <text x="0" y="17" textAnchor="middle" fontSize="15" letterSpacing="2.4" fontWeight="700">{s.b}</text>
        <text x="0" y="36" textAnchor="middle" fontSize="6.5" letterSpacing="2.4" fontWeight="500" opacity="0.85">{s.note}</text>
        <g stroke={s.color} strokeWidth="1.2" opacity="0.9">
          <path d="M -34 -30 h 12 M -28 -36 v 12" />
          <path d="M 34 -30 h -12 M 28 -36 v 12" />
        </g>
      </g>
      {/* worn ink speckles, paper showing through */}
      {[
        [22, -52, 2.4], [-41, -44, 1.8], [55, 18, 1.6], [-58, 22, 2.2],
        [12, 60, 2], [-18, -12, 1.5], [48, 46, 1.8], [-4, 43, 1.4],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ece4d3" opacity="0.75" />
      ))}
    </svg>
  );
}

function StampTool() {
  return (
    <svg viewBox="0 0 200 250" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a5a33" />
          <stop offset="35%" stopColor="#c08a56" />
          <stop offset="65%" stopColor="#a06b3d" />
          <stop offset="100%" stopColor="#6b4327" />
        </linearGradient>
        <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c3826" />
          <stop offset="100%" stopColor="#241a12" />
        </linearGradient>
      </defs>
      {/* handle */}
      <ellipse cx="100" cy="24" rx="27" ry="15" fill="#a9764a" />
      <ellipse cx="100" cy="21" rx="23" ry="11" fill="#c49363" />
      <rect x="87" y="30" width="26" height="62" rx="11" fill="url(#wood)" />
      {/* neck / shoulder */}
      <path d="M 86 88 H 114 L 140 128 H 60 Z" fill="url(#wood)" />
      <rect x="58" y="124" width="84" height="20" rx="6" fill="#7d5230" />
      {/* stamp face */}
      <rect x="38" y="148" width="124" height="54" rx="7" fill="url(#plate)" />
      <rect x="38" y="148" width="124" height="10" rx="5" fill="#6d5137" />
      <rect x="46" y="192" width="108" height="7" rx="3" fill="#3b2819" />
      <g fill="none" stroke="#b9835a" strokeWidth="1.2" opacity="0.5">
        <path d="M 50 158 H 150" />
        <path d="M 62 178 H 138" />
      </g>
      <text x="100" y="174" textAnchor="middle" fontFamily="Orbitron, sans-serif" fontSize="10" letterSpacing="3" fill="#d9b08c">PALAWAN</text>
      {/* motion ticks */}
      <g stroke="#c2513c" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <path d="M 20 108 v 18" />
        <path d="M 14 118 h 18" opacity="0.6" />
        <path d="M 180 108 v 18" />
        <path d="M 174 118 h 18" opacity="0.6" />
      </g>
    </svg>
  );
}

export default function StampBand() {
  const ref = useRef<HTMLElement | null>(null);
  const [run, setRun] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.setTimeout(() => setRun(true), 220);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    // safety: never leave the page blank if the observer is slow
    const fallback = window.setTimeout(() => setRun(true), 2600);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <section ref={ref} aria-label="What you get back" className="border-y border-ink/12 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-5 md:px-8 grid md:grid-cols-[248px_1fr] gap-10 md:gap-14 items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-px bg-lagoon" />
            <span className="font-brand text-[9px] tracking-[0.35em] uppercase text-lagoon">The short version</span>
          </div>
          <h2 className="font-serif font-light text-3xl md:text-4xl leading-[1.1] mt-4">
            What you get<br />back.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/60 max-w-[15rem]">
            One stamp for every thing you never have to do by hand again.
          </p>
          <p className="mt-4 font-hand text-2xl text-coral -rotate-2">stamped &amp; approved.</p>
        </div>

        {/* passport page */}
        <div className="relative bg-[#e9e1cf] rounded-sm border border-ink/15 shadow-[0_18px_40px_-24px_rgba(20,20,20,.55)] -rotate-[0.6deg]">
          <div className="flex items-center justify-between gap-4 px-5 md:px-7 pt-4 pb-3 border-b border-dashed border-ink/25">
            <span className="font-brand text-[8px] md:text-[9px] tracking-[0.3em] uppercase text-ink/55">
              Palawan Collective · Departures
            </span>
            <span className="font-brand text-[8px] md:text-[9px] tracking-[0.3em] text-ink/40">Nº 0042</span>
          </div>

          <div key={runKey} className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-5 p-5 md:p-7">
            {STAMPS.map((s, i) => {
              const d = i * 0.55;
              return (
                <div key={i} className="relative aspect-square" style={{ transform: `rotate(${s.angle}deg)` }}>
                  {/* paper ripple at impact */}
                  {run && (
                    <span
                      className="absolute inset-6 rounded-full border border-ink/25"
                      style={{ animation: "stamp-ripple 1s ease-out both", animationDelay: `${d + 0.62}s` }}
                      aria-hidden
                    />
                  )}
                  {/* ink impression */}
                  <div
                    className="absolute inset-0 stamp-ink"
                    style={run ? { animation: "ink-in .5s ease-out both", animationDelay: `${d + 0.62}s` } : undefined}
                  >
                    <Ink s={s} uid={`${uid}${i}`} />
                  </div>

                  {/* physical stamp */}
                  {run && (
                    <div
                      className="absolute inset-x-0 -top-[16%] bottom-[8%] stamp-tool pointer-events-none drop-shadow-[0_16px_16px_rgba(20,20,20,0.22)]"
                      style={{ animation: "stamp-press 1.6s cubic-bezier(.36,.07,.19,.97) both", animationDelay: `${d}s` }}
                      aria-hidden
                    >
                      <StampTool />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4 px-5 md:px-7 pb-4">
            <span className="font-hand text-lg md:text-xl text-ink/45">no expiry · no small print</span>
            <button
              type="button"
              onClick={() => {
                setRun(false);
                setRunKey((k) => k + 1);
                window.setTimeout(() => setRun(true), 80);
              }}
              className="group inline-flex items-center gap-2 font-brand text-[8px] tracking-[0.28em] uppercase text-ink/45 hover:text-ink transition"
            >
              Stamp again
              <span className="w-6 h-6 rounded-full border border-ink/25 grid place-items-center group-hover:border-ink/60 transition">
                <span aria-hidden className="text-[10px] leading-none">↺</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
