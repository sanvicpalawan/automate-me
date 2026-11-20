export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Smooth closed organic outline through jittered points around an ellipse. */
export function blobPath(seed: number, rx = 95, ry = 72, n = 9, jitter = 0.14) {
  const rand = rng(seed * 977 + 13);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.14;
    const f = 1 - jitter / 2 + rand() * jitter;
    pts.push([Math.cos(a) * rx * f, Math.sin(a) * ry * f]);
  }
  const mid = (a: [number, number], b: [number, number]) =>
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number];
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const m = mid(p, q);
    if (i === 0) d += `M ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    else d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  const last = mid(pts[0], pts[1]);
  d += ` Q ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} ${last[0].toFixed(1)} ${last[1].toFixed(1)} Z`;
  return d;
}
