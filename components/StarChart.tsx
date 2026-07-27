import type { Snapshot } from "@/lib/data";
import { compactNumber, formatDate } from "@/lib/format";

// Server-rendered SVG area chart of the star history we have collected.
// History accumulates one point per pipeline run day; no client JS needed.
export default function StarChart({ snapshots }: { snapshots: Snapshot[] }) {
  const points = (snapshots || []).slice(-120);
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Star history is being collected. The chart appears after the pipeline has recorded at least
        two daily snapshots for this repository.
      </p>
    );
  }

  const w = 720;
  const h = 180;
  const pad = { top: 10, right: 8, bottom: 22, left: 8 };
  const min = Math.min(...points.map((p) => p.stars));
  const max = Math.max(...points.map((p) => p.stars));
  const range = Math.max(max - min, 1);
  const x = (i: number) => pad.left + (i / (points.length - 1)) * (w - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - min) / range) * (h - pad.top - pad.bottom);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.stars).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z`;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Star history from ${formatDate(first.date)} (${compactNumber(first.stars)} stars) to ${formatDate(last.date)} (${compactNumber(last.stars)} stars)`}
        className="w-full"
      >
        <path d={area} fill="var(--accent)" opacity="0.12" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {points.map((p, i) =>
          points.length <= 30 ? (
            <circle key={p.date} cx={x(i)} cy={y(p.stars)} r="2.5" fill="var(--accent)">
              <title>{`${p.date}: ${p.stars.toLocaleString()} stars`}</title>
            </circle>
          ) : null
        )}
        <text x={pad.left} y={h - 6} fontSize="11" fill="var(--muted)">
          {formatDate(first.date)}
        </text>
        <text x={w - pad.right} y={h - 6} fontSize="11" fill="var(--muted)" textAnchor="end">
          {formatDate(last.date)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {compactNumber(first.stars)} stars on {formatDate(first.date)} to {compactNumber(last.stars)} stars on{" "}
        {formatDate(last.date)} ({points.length} recorded snapshots).
      </figcaption>
    </figure>
  );
}
