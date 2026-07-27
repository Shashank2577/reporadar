import { compactNumber, formatDate } from "@/lib/format";

type Point = { date: string; stars: number };

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) || rough;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.01; v += step) ticks.push(Math.round(v));
  return ticks;
}

// Full star-history curve: backfilled from stargazer timestamps, extended by
// daily snapshots. Server-rendered SVG — no client JS.
export default function StarHistoryChart({
  points,
  partial,
  approximate,
}: {
  points: Point[];
  partial?: boolean;
  approximate?: boolean;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Star history is still being collected for this repository.
      </p>
    );
  }

  const w = 760;
  const h = 260;
  const pad = { top: 14, right: 14, bottom: 26, left: 52 };
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const span = Math.max(t1 - t0, 1);
  const maxStars = Math.max(...points.map((p) => p.stars));
  const ticks = niceTicks(maxStars);
  const yMax = Math.max(ticks[ticks.length - 1], maxStars);

  const x = (d: string) => pad.left + ((new Date(d).getTime() - t0) / span) * (w - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - v / yMax) * (h - pad.top - pad.bottom);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.stars).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points[points.length - 1].date).toFixed(1)},${h - pad.bottom} L${pad.left},${h - pad.bottom} Z`;

  // Three or four x-axis labels spread across the time span.
  const xLabels = [0, 0.33, 0.66, 1].map((f) => {
    const t = t0 + f * span;
    return { t, label: new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) };
  });

  const last = points[points.length - 1];
  const first = points[0];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Star history: ${compactNumber(first.stars)} stars on ${formatDate(first.date)} growing to ${compactNumber(last.stars)} on ${formatDate(last.date)}`}
        className="w-full"
      >
        <defs>
          <linearGradient id="starFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text x={pad.left - 8} y={y(tick) + 3.5} fontSize="11" fill="var(--muted)" textAnchor="end">
              {compactNumber(tick)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#starFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" />
        <circle cx={x(last.date)} cy={y(last.stars)} r="3.5" fill="var(--accent)" />
        {xLabels.map(({ t, label }, i) => (
          <text
            key={t}
            x={pad.left + (i / (xLabels.length - 1)) * (w - pad.left - pad.right)}
            y={h - 8}
            fontSize="11"
            fill="var(--muted)"
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
          >
            {label}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {compactNumber(last.stars)} stars as of {formatDate(last.date)}, tracked back to {formatDate(first.date)}.
        {approximate ? " Historical curve reconstructed from public GitHub event archives, calibrated to the current total." : ""}
        {partial ? " History beyond the first 40,000 stars is approximated from daily snapshots." : ""}
      </figcaption>
    </figure>
  );
}
