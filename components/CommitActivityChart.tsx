import { compactNumber, formatDate } from "@/lib/format";

// 52 weeks of commit counts as a bar chart. Server-rendered SVG.
export default function CommitActivityChart({
  weeks,
}: {
  weeks: { week: string; commits: number }[];
}) {
  const data = (weeks || []).slice(-52);
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.commits, 0);
  if (total === 0) return null;

  const w = 760;
  const h = 120;
  const pad = { top: 8, right: 8, bottom: 20, left: 34 };
  const max = Math.max(...data.map((d) => d.commits), 1);
  const bw = (w - pad.left - pad.right) / data.length;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Commit activity: ${total} commits in the last 52 weeks, peaking at ${max} in one week`}
        className="w-full"
      >
        <text x={pad.left - 6} y={pad.top + 8} fontSize="10" fill="var(--muted)" textAnchor="end">
          {max}
        </text>
        <text x={pad.left - 6} y={h - pad.bottom} fontSize="10" fill="var(--muted)" textAnchor="end">
          0
        </text>
        {data.map((d, i) => {
          const bh = (d.commits / max) * (h - pad.top - pad.bottom);
          return (
            <rect
              key={d.week}
              x={pad.left + i * bw + 1}
              y={h - pad.bottom - bh}
              width={Math.max(bw - 2, 2)}
              height={Math.max(bh, d.commits > 0 ? 2 : 0)}
              rx="1.5"
              fill="var(--success)"
              opacity={0.45 + 0.55 * (d.commits / max)}
            >
              <title>{`Week of ${d.week}: ${d.commits} commits`}</title>
            </rect>
          );
        })}
        <text x={pad.left} y={h - 6} fontSize="10" fill="var(--muted)">
          {formatDate(data[0].week)}
        </text>
        <text x={w - pad.right} y={h - 6} fontSize="10" fill="var(--muted)" textAnchor="end">
          {formatDate(data[data.length - 1].week)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {compactNumber(total)} commits in the last 52 weeks.
      </figcaption>
    </figure>
  );
}
