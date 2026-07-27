import { compactNumber, formatDate } from "@/lib/format";

// Weekly additions above the axis, deletions below — GitHub's code frequency
// graph.
export default function CodeFrequencyChart({
  weeks,
}: {
  weeks: { week: string; additions: number; deletions: number }[];
}) {
  const data = (weeks || []).slice(-52);
  if (!data.length) return null;
  const maxAdd = Math.max(...data.map((d) => d.additions), 1);
  const maxDel = Math.max(...data.map((d) => d.deletions), 1);
  const scale = Math.max(maxAdd, maxDel);
  if (scale <= 1) return null;

  const w = 760;
  const h = 150;
  const pad = { top: 8, bottom: 22, left: 44, right: 8 };
  const mid = pad.top + (h - pad.top - pad.bottom) / 2;
  const half = (h - pad.top - pad.bottom) / 2;
  const bw = (w - pad.left - pad.right) / data.length;

  const totalAdd = data.reduce((s, d) => s + d.additions, 0);
  const totalDel = data.reduce((s, d) => s + d.deletions, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Code frequency: ${totalAdd} lines added and ${totalDel} removed over the last year`}
        className="w-full"
      >
        <line x1={pad.left} x2={w - pad.right} y1={mid} y2={mid} stroke="var(--border)" strokeWidth="1" />
        <text x={pad.left - 6} y={pad.top + 8} fontSize="9" fill="var(--muted)" textAnchor="end">
          +{compactNumber(scale)}
        </text>
        <text x={pad.left - 6} y={h - pad.bottom} fontSize="9" fill="var(--muted)" textAnchor="end">
          -{compactNumber(scale)}
        </text>
        {data.map((d, i) => {
          const ah = (d.additions / scale) * half;
          const dh = (d.deletions / scale) * half;
          const x = pad.left + i * bw + 0.5;
          const bar = Math.max(bw - 1.5, 1.5);
          return (
            <g key={d.week}>
              <rect x={x} y={mid - ah} width={bar} height={Math.max(ah, d.additions ? 1 : 0)} fill="var(--success)" opacity="0.85">
                <title>{`Week of ${d.week}: +${d.additions.toLocaleString()} lines`}</title>
              </rect>
              <rect x={x} y={mid} width={bar} height={Math.max(dh, d.deletions ? 1 : 0)} fill="var(--danger)" opacity="0.75">
                <title>{`Week of ${d.week}: -${d.deletions.toLocaleString()} lines`}</title>
              </rect>
            </g>
          );
        })}
        <text x={pad.left} y={h - 6} fontSize="9" fill="var(--muted)">
          {formatDate(data[0].week)}
        </text>
        <text x={w - pad.right} y={h - 6} fontSize="9" fill="var(--muted)" textAnchor="end">
          {formatDate(data[data.length - 1].week)}
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        <span className="font-medium text-success">+{compactNumber(totalAdd)}</span> lines added,{" "}
        <span className="font-medium text-danger">-{compactNumber(totalDel)}</span> removed over the last year.
      </figcaption>
    </figure>
  );
}
