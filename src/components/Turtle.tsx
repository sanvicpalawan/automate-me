import { useMemo } from "react";

type P = [number, number];
type Dot = { x: number; y: number; r: number };

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function cubic(p: [P, P, P, P], t: number): P {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
    a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
  ];
}

function stroke(p: [P, P, P, P], rMax: number, rMin: number, rand: () => number): Dot[] {
  const dots: Dot[] = [];
  let prev = cubic(p, 0);
  let acc = 0;
  let next = 0;
  for (let i = 1; i <= 400; i++) {
    const t = i / 400;
    const pt = cubic(p, t);
    acc += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
    prev = pt;
    if (acc >= next) {
      const prof = Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.9 + 0.08)), 0.7);
      const r = rMin + (rMax - rMin) * prof * (0.7 + 0.3 * rand());
      dots.push({ x: pt[0], y: pt[1], r });
      acc = 0;
      next = r * 2.25;
    }
  }
  return dots;
}

function multi(base: [P, P, P, P], offsets: P[], rMax: number, rMin: number, rand: () => number) {
  return offsets.flatMap(([ox, oy], i) =>
    stroke(
      [
        [base[0][0] + ox * 0.3, base[0][1] + oy * 0.3],
        [base[1][0] + ox, base[1][1] + oy],
        [base[2][0] + ox, base[2][1] + oy],
        [base[3][0] + ox * (1 - i * 0.15), base[3][1] + oy * (1 - i * 0.15)],
      ],
      rMax * (1 - i * 0.12),
      rMin,
      rand
    )
  );
}

function buildTurtle() {
  const rand = rng(42);
  const shell: Dot[] = [];
  // spiral
  let th = 0.9;
  while (th < 5.4 * Math.PI) {
    const rr = 6.2 * th;
    const dr = 1.1 + th * 0.3 * (0.75 + 0.35 * rand());
    if (Math.sin(th * 2.3) < 0.92) shell.push({ x: rr * Math.cos(th) * 0.92, y: rr * Math.sin(th), r: dr });
    th += (dr * 2.3) / rr;
  }
  // broken outer rings
  [
    [122, 132, 4.6],
    [138, 148, 3.2],
  ].forEach(([rx, ry, rr], k) => {
    for (let a = 0; a < Math.PI * 2; a += 0.045 + k * 0.01) {
      if (Math.sin(a * 5 + k * 2) > 0.8) continue;
      const r = rr * (0.6 + 0.5 * rand());
      shell.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry, r });
    }
  });

  const head: Dot[] = [];
  for (let y = -205; y < -150; y += 6) {
    for (let x = -24; x < 24; x += 6) {
      const nx = x / 24, ny = (y + 178) / 30;
      if (nx * nx + ny * ny < 1 && rand() > 0.1)
        head.push({ x: x + (rand() - 0.5) * 3, y: y + (rand() - 0.5) * 3, r: 1.6 + rand() * 2.2 });
    }
  }
  for (let y = -150; y < -138; y += 5) for (let x = -14; x <= 14; x += 6) head.push({ x, y, r: 1.4 + rand() * 1.5 });

  const flFL = multi([[-55, -110], [-110, -190], [-200, -215], [-290, -185]], [[0, 0], [12, 20], [20, 40]], 6.5, 1.2, rand);
  const flFR = multi([[85, -85], [150, -60], [185, 10], [165, 110]], [[0, 0], [-18, 8], [-34, 14]], 6.5, 1.2, rand);
  const flBL = multi([[-95, 85], [-140, 90], [-180, 100], [-220, 95]], [[0, 0], [5, 18], [15, 34]], 4.5, 1, rand);
  const flBR = multi([[60, 115], [80, 150], [75, 190], [55, 225]], [[0, 0], [-15, -5], [-30, -10]], 4.5, 1, rand);
  const tail = stroke([[-5, 140], [-8, 155], [-10, 170], [-14, 182]], 3, 1, rand);
  return { shell: [...shell, ...tail], head, flFL, flFR, flBL, flBR };
}

const Dots = ({ d }: { d: Dot[] }) => (
  <>
    {d.map((p, i) => (
      <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} />
    ))}
  </>
);

export default function Turtle({
  className = "",
  color = "currentColor",
  swim = true,
  rotate = 32,
}: {
  className?: string;
  color?: string;
  swim?: boolean;
  rotate?: number;
}) {
  const t = useMemo(buildTurtle, []);
  const fl = (origin: string, delay: string, anim = "paddle") =>
    swim
      ? ({
          transformBox: "view-box",
          transformOrigin: origin,
          animation: `${anim} 3.6s ease-in-out ${delay} infinite`,
        } as React.CSSProperties)
      : undefined;
  return (
    <svg viewBox="-300 -300 600 600" className={className} fill={color} aria-hidden>
      <g transform={`rotate(${rotate})`}>
        <g style={fl("calc(50% - 55px) calc(50% - 110px)", "0s")}>
          <Dots d={t.flFL} />
        </g>
        <g style={fl("calc(50% + 85px) calc(50% - 85px)", "-1.8s", "paddle2")}>
          <Dots d={t.flFR} />
        </g>
        <g style={fl("calc(50% - 95px) calc(50% + 85px)", "-0.9s", "paddle2")}>
          <Dots d={t.flBL} />
        </g>
        <g style={fl("calc(50% + 60px) calc(50% + 115px)", "-2.4s")}>
          <Dots d={t.flBR} />
        </g>
        <g style={swim ? { transformBox: "view-box", transformOrigin: "50% 50%", animation: "nod 3.6s ease-in-out infinite" } : undefined}>
          <Dots d={t.head} />
        </g>
        <Dots d={t.shell} />
      </g>
    </svg>
  );
}
