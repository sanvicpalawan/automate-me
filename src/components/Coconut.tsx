import { useEffect, useId, useMemo, useRef, useState } from "react";
import { rng } from "../lib/shape";

type Phase = "whole" | "shake" | "split" | "open";

/** Whole-coconut silhouette: round, slightly wider than tall, faintly triangular, flat base. */
function outline(rand: () => number) {
  const RX = 74;
  const RY = 72;
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    let rx = RX;
    let ry = RY;
    const lobe = 1 + 0.04 * Math.cos((a + Math.PI / 2) * 3);
    if (Math.sin(a) > 0.75) ry *= 0.78;
    if (Math.abs(a) < 0.35 && Math.sin(a) < -0.7) {
      rx *= 0.88;
      ry *= 0.92;
    }
    const jitter = 1 + (rand() - 0.5) * 0.04;
    pts.push([Math.cos(a) * rx * lobe * jitter, Math.sin(a) * ry * lobe * jitter]);
  }
  const mid = (p: [number, number], q: [number, number]) => [((p[0] + q[0]) / 2), ((p[1] + q[1]) / 2)] as [number, number];
  let d = `M ${mid(pts[n - 1], pts[0])[0].toFixed(1)} ${mid(pts[n - 1], pts[0])[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const m = mid(p, q);
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return { d, rx: RX, ry: RY };
}

/** Produce two/three chunk paths that split the coconut apart like cracked husk.
 *  Each chunk is defined by a start and end angle around the shell, plus a jagged crack edge across the middle. */
function buildChunks(rand: () => number, rx: number, ry: number) {
  // three cracks radiating roughly from the centre but offset, meeting near the middle.
  const crackAngles = [-Math.PI / 2 + 0.4, Math.PI / 2 - 0.25, Math.PI / 2 + 0.6];
  // jagged edges from center-ish outward
  function jaggedEdge(ang: number) {
    const pts: [number, number][] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = 10 + t * Math.min(rx, ry) * 1.05;
      const wob = (rand() - 0.5) * 14 * t;
      pts.push([
        Math.cos(ang) * r + wob,
        Math.sin(ang) * r + (rand() - 0.5) * 10 * t,
      ]);
    }
    return pts;
  }
  const edges = crackAngles.map(jaggedEdge);

  function arcPath(a0: number, a1: number) {
    const seg: [number, number][] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = a0 + (a1 - a0) * t;
      const lobe = 1 + 0.04 * Math.cos((a + Math.PI / 2) * 3);
      let x = Math.cos(a) * rx * lobe;
      let y = Math.sin(a) * ry * lobe;
      if (Math.sin(a) > 0.75) y = ry * 0.78 + (1 - (Math.sin(a) - 0.75) / 0.25) * 4;
      seg.push([x, y]);
    }
    return seg;
  }

  const chunks = [];
  for (let i = 0; i < 3; i++) {
    const a0 = crackAngles[i] + 0.04;
    const a1 = crackAngles[(i + 1) % 3] - 0.04;
    const outer = arcPath(a0, a1);
    const innerEdge = edges[(i + 1) % 3].slice().reverse();
    const pts = [...outer, ...innerEdge];
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let k = 1; k < pts.length; k++) d += ` L ${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
    d += " Z";
    chunks.push({ d, centerAng: (a0 + a1) / 2 });
  }
  return chunks;
}

export default function Coconut({
  seed,
  skin = 0,
  open = false,
  className = "",
}: {
  seed: number;
  skin?: number;
  open?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [phase, setPhase] = useState<Phase>(open ? "open" : "whole");
  const wasOpen = useRef(open);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (open && !wasOpen.current) {
      setPhase("shake");
      timers.current.push(window.setTimeout(() => setPhase("split"), 380));
      timers.current.push(window.setTimeout(() => setPhase("open"), 1350));
    } else if (!open) {
      setPhase("whole");
    }
    wasOpen.current = open;
    return () => timers.current.forEach(clearTimeout);
  }, [open]);

  const model = useMemo(() => {
    const rand = rng(seed * 547 + 11);
    const { d, rx, ry } = outline(rand);
    const rot = (rand() - 0.5) * 10;
    const chunks = buildChunks(rand, rx, ry);

    // Coir fibres — short, dense strokes following the surface, dark and light
    const fibers: { d: string; c: string; w: number; o: number }[] = [];
    for (let i = 0; i < 180; i++) {
      const a = rand() * Math.PI * 2;
      const lobe = 1 + 0.04 * Math.cos((a + Math.PI / 2) * 3);
      const r = (0.6 + rand() * 0.38) * Math.min(rx, ry) * lobe;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const len = 3 + rand() * 9;
      const tangent = a + Math.PI / 2 + (rand() - 0.5) * 0.6;
      const x2 = x + Math.cos(tangent) * len;
      const y2 = y + Math.sin(tangent) * len;
      const dark = rand() > 0.55;
      fibers.push({
        d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        c: dark ? "#1f0f05" : "#c79064",
        w: dark ? 0.6 + rand() * 0.9 : 0.4 + rand() * 0.7,
        o: dark ? 0.35 + rand() * 0.35 : 0.15 + rand() * 0.25,
      });
    }
    // the three prominent suture ridges (every coconut has them)
    const seams = [-Math.PI / 2 + 0.4, -Math.PI / 2 + 2.55, Math.PI / 2 - 0.3].map((ang) => {
      const pts: [number, number][] = [];
      for (let t = 0; t <= 1; t += 0.08) {
        const a = ang;
        const r = t * Math.min(rx, ry) * 0.98;
        pts.push([
          Math.cos(a) * r + (rand() - 0.5) * 1.5,
          Math.sin(a) * r + (rand() - 0.5) * 1.5,
        ]);
      }
      // trace the ridge out to the shell edge
      const outA = ang;
      const edgeR = Math.min(rx, ry) * 0.99;
      pts.push([Math.cos(outA) * edgeR, Math.sin(outA) * edgeR]);
      let path = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) path += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
      return path;
    });

    // Water drops & splashes
    const drops = Array.from({ length: 26 }, () => {
      const a = rand() * Math.PI * 2;
      const d0 = 20 + rand() * 78;
      return {
        x: (rand() - 0.5) * 10,
        y: (rand() - 0.5) * 10,
        dx: Math.cos(a) * d0,
        dy: Math.sin(a) * d0,
        r: 1.5 + rand() * 4.6,
        ring: rand() > 0.6,
        delay: rand() * 0.1,
      };
    });

    // bubbles inside the water
    const bubbles = Array.from({ length: 12 }, () => ({
      x: (rand() - 0.5) * rx * 0.7,
      y: 10 + (rand() - 0.5) * ry * 0.5,
      r: 1.5 + rand() * 4,
    }));

    return { d, rx, ry, rot, chunks, fibers, seams, drops, bubbles };
  }, [seed]);

  const palettes = [
    { hi: "#a9734a", mid: "#6a3f22", low: "#231207", shadow: "#0b0603" },
    { hi: "#8f5e37", mid: "#522e18", low: "#1a0c05", shadow: "#0b0603" },
    { hi: "#b98257", mid: "#734726", low: "#2a1608", shadow: "#0b0603" },
    { hi: "#6e4527", mid: "#3f2310", low: "#140a04", shadow: "#0b0603" },
  ];
  const s = palettes[skin % palettes.length];

  const split = phase === "split" || phase === "open";

  const wholeShell = (
    <>
      <path d={model.d} fill={s.mid} />
      {/* darker lower hemisphere */}
      <ellipse cx="0" cy="22" rx={model.rx * 1.02} ry={model.ry * 0.78} fill={s.low} opacity="0.55" />
      {/* suture ridges darker */}
      {model.seams.map((p, i) => (
        <path key={"s" + i} d={p} stroke={s.low} strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.75" />
      ))}
      {model.seams.map((p, i) => (
        <path key={"sl" + i} d={p} stroke={s.hi} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.55" transform="translate(-1,-1)" />
      ))}
      {/* dense short fibres */}
      {model.fibers.map((f, i) => (
        <path key={i} d={f.d} stroke={f.c} strokeWidth={f.w} strokeLinecap="round" opacity={f.o} />
      ))}
      {/* subtle highlight top-left */}
      <path d={model.d} fill="#fff" opacity="0.06" transform="translate(-6,-10) scale(0.96)" />
      {/* three eyes at top */}
      {[[-11, -58, 4.4], [10, -61, 4], [24, -54, 3.4]].map(([cx, cy, r], i) => (
        <g key={"e" + i}>
          <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.1} fill={s.shadow} />
          <ellipse cx={cx - r * 0.25} cy={cy - r * 0.3} rx={r * 0.35} ry={r * 0.35} fill="#a8764d" opacity="0.35" />
        </g>
      ))}
      {/* soft shadow underneath */}
      <ellipse cx="2" cy={model.ry * 0.92 + 5} rx={model.rx * 0.9} ry="10" fill="#000" opacity="0.3" />
    </>
  );

  // Interior chunk: dark husk on the outside, thick white meat on the cut face (smaller white copy)
  const chunk = (path: string, flyClass: string, tx: number, ty: number, finalAng: number) => {
    return (
      <g
        className={phase === "split" ? flyClass : ""}
        style={
          phase === "split"
            ? { transformOrigin: "center", animation: `${flyClass} .95s cubic-bezier(.22,.9,.32,1.05) forwards` }
            : undefined
        }
        transform={phase === "open" ? `translate(${tx}px, ${ty}px) rotate(${finalAng}deg)` : undefined}
      >
        <path d={path} fill={s.mid} />
        <path d={path} fill={s.low} opacity="0.55" />
        {model.seams.map((p, i) => (
          <path key={i} d={p} stroke={s.low} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.6" />
        ))}
        {model.fibers.slice(0, 120).map((f, i) => (
          <path key={"f" + i} d={f.d} stroke={f.c} strokeWidth={f.w} strokeLinecap="round" opacity={f.o * 0.9} />
        ))}
        {/* thick white coconut meat visible on the cut inner face */}
        <path d={path} fill="#f9f0e0" transform="scale(0.72)" style={{ transformOrigin: "center" }} />
        <path d={path} fill="#ffffff" transform="scale(0.64)" style={{ transformOrigin: "center" }} />
      </g>
    );
  };

  return (
    <svg viewBox="-120 -120 240 250" className={className} aria-hidden>
      <defs>
        <radialGradient id={`w${uid}`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#e4e2db" />
          <stop offset="60%" stopColor="#c5c3bb" />
          <stop offset="100%" stopColor="#7d7b73" />
        </radialGradient>
      </defs>

      <g transform={`rotate(${model.rot.toFixed(1)})`}>
        {/* ground shadow (only when whole) */}
        {!split && <ellipse cx="4" cy={model.ry * 0.95 + 8} rx={model.rx * 0.85} ry="9" fill="#000" opacity="0.28" />}

        {!split ? (
          <g style={phase === "shake" ? { animation: "coco-shake .38s ease-in-out" } : undefined}>
            {wholeShell}
          </g>
        ) : (
          <>
            {/* bottom "bowl" half — stays put, shows water inside */}
            <g style={phase === "split" ? { animation: "coco-pop .55s cubic-bezier(.25,1.4,.45,1)" } : undefined}>
              {wholeShell}
              {/* mask the top away to reveal the interior — draw a soft dark cover across the top */}
              <path
                d={`M ${-model.rx} 0 Q 0 -54 ${model.rx} 0 L ${model.rx} 120 L ${-model.rx} 120 Z`}
                fill="#efe8da"
                opacity="0"
              />
              {/* opening */}
              <ellipse cx="0" cy="-6" rx={model.rx * 0.72} ry={model.ry * 0.34} fill="#fff6e8" />
              <ellipse cx="0" cy="-2" rx={model.rx * 0.66} ry={model.ry * 0.28} fill={`url(#w${uid})`} />
              {/* bubbles in the water */}
              {model.bubbles.map((b, i) => (
                <g key={"b" + i}>
                  <circle cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r={b.r.toFixed(1)} fill="#fff" opacity="0.65" />
                  <circle cx={(b.x - b.r * 0.35).toFixed(1)} cy={(b.y - b.r * 0.35).toFixed(1)} r={(b.r * 0.25).toFixed(1)} fill="#fff" />
                </g>
              ))}
              {/* thick white rim along the broken edge */}
              <path
                d={`M ${-model.rx * 0.78} -10 Q 0 ${-model.ry * 0.48 - 4} ${model.rx * 0.78} -10`}
                stroke="#fdf6ea"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M ${-model.rx * 0.72} -12 Q 0 ${-model.ry * 0.48} ${model.rx * 0.72} -12`}
                stroke="#fff"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
            </g>

            {/* three flying chunks, each with its own arc */}
            {chunk(model.chunks[0].d, "fly-tl", -72, -58, -34)}
            {chunk(model.chunks[1].d, "fly-tr", 78, -30, 42)}
            {chunk(model.chunks[2].d, "fly-b", 6, 82, 16)}

            {phase === "split" && (
              <g style={{ transformOrigin: "0 0" }}>
                {/* burst of water splash */}
                <ellipse cx="0" cy="-6" rx="34" ry="10" fill="#ffffff" opacity="0.85"
                  style={{ animation: "splash-burst .75s ease-out forwards" }} />
                {model.drops.map((d, i) => (
                  <g key={"d" + i}>
                    <circle
                      cx={d.x.toFixed(1)}
                      cy={d.y.toFixed(1)}
                      r={d.r.toFixed(1)}
                      fill="#ffffff"
                      style={
                        {
                          animation: `drop-fly .95s cubic-bezier(.2,.6,.3,1) ${d.delay}s forwards`,
                          "--dx": `${d.dx.toFixed(0)}px`,
                          "--dy": `${d.dy.toFixed(0)}px`,
                        } as React.CSSProperties
                      }
                    />
                    {d.ring && (
                      <circle
                        cx={d.x.toFixed(1)}
                        cy={d.y.toFixed(1)}
                        r={(d.r * 2.2).toFixed(1)}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        opacity="0.7"
                        style={
                          {
                            animation: `drop-ring .95s ease-out ${d.delay}s forwards`,
                            "--dx": `${d.dx.toFixed(0)}px`,
                            "--dy": `${d.dy.toFixed(0)}px`,
                          } as React.CSSProperties
                        }
                      />
                    )}
                  </g>
                ))}
              </g>
            )}
          </>
        )}
      </g>

      <style>{`
        @keyframes fly-tl {
          0% { transform: translate(0,0) rotate(0); }
          55% { transform: translate(-92px,-82px) rotate(-46deg); }
          100% { transform: translate(-72px,-58px) rotate(-34deg); }
        }
        @keyframes fly-tr {
          0% { transform: translate(0,0) rotate(0); }
          55% { transform: translate(96px,-52px) rotate(52deg); }
          100% { transform: translate(78px,-30px) rotate(42deg); }
        }
        @keyframes fly-b {
          0% { transform: translate(0,0) rotate(0); }
          55% { transform: translate(8px, 96px) rotate(22deg); }
          100% { transform: translate(6px, 82px) rotate(16deg); }
        }
        @keyframes splash-burst {
          0% { transform: scale(.2); opacity: .9; }
          60% { opacity: .5; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes drop-fly {
          0% { transform: translate(0,0) scale(1); opacity: .95; }
          65% { opacity: .9; }
          100% { transform: translate(var(--dx), var(--dy)) scale(.35); opacity: 0; }
        }
        @keyframes drop-ring {
          0% { transform: translate(0,0) scale(.6); opacity: .75; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.8); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
