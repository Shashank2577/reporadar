// Tiny inline star-history sparkline for repo cards.
export default function Sparkline({ points }: { points: { date: string; stars: number }[] }) {
  if (points.length < 3) return null;
  const w = 120;
  const h = 32;
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const span = Math.max(t1 - t0, 1);
  const min = Math.min(...points.map((p) => p.stars));
  const max = Math.max(...points.map((p) => p.stars));
  const range = Math.max(max - min, 1);
  const x = (d: string) => ((new Date(d).getTime() - t0) / span) * (w - 2) + 1;
  const y = (v: number) => (1 - (v - min) / range) * (h - 6) + 3;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.stars).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="shrink-0">
      <path d={`${line} L${w - 1},${h - 1} L1,${h - 1} Z`} fill="var(--accent)" opacity="0.1" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}
