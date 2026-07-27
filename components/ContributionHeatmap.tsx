import { fullNumber } from "@/lib/format";

// GitHub's contribution graph, built from per-day commit counts:
// 53 week columns x 7 day rows of graded squares.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function grade(count: number, max: number): string {
  if (count === 0) return "var(--grade0)";
  const q = count / Math.max(max, 1);
  if (q <= 0.25) return "var(--grade1)";
  if (q <= 0.5) return "var(--grade2)";
  if (q <= 0.75) return "var(--grade3)";
  return "var(--grade4)";
}

export default function ContributionHeatmap({ days }: { days: { date: string; count: number }[] }) {
  if (!days?.length) return null;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  const max = Math.max(...sorted.map((d) => d.count));

  // Group into week columns starting on Sunday.
  const weeks: { date: string; count: number }[][] = [];
  let current: { date: string; count: number }[] = [];
  for (const d of sorted) {
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (dow === 0 && current.length) {
      weeks.push(current);
      current = [];
    }
    if (current.length === 0 && weeks.length === 0) {
      // Pad the first partial week so rows align to the weekday.
      for (let i = 0; i < dow; i++) current.push({ date: `pad-${i}`, count: -1 });
    }
    current.push(d);
  }
  if (current.length) weeks.push(current);

  const cell = 11;
  const gap = 3;
  const left = 28;
  const top = 16;
  const w = left + weeks.length * (cell + gap);
  const h = top + 7 * (cell + gap);

  // Month labels at the first week of each month.
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const real = week.find((d) => d.count >= 0);
    if (!real) return;
    const m = new Date(`${real.date}T00:00:00Z`).getUTCMonth();
    if (m !== lastMonth) {
      monthLabels.push({ x: left + wi * (cell + gap), label: MONTHS[m] });
      lastMonth = m;
    }
  });

  return (
    <figure>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width={w}
          height={h}
          role="img"
          aria-label={`${total} commits across the last year, peaking at ${max} in a single day`}
          className="max-w-full"
        >
          {monthLabels.map(({ x, label }) => (
            <text key={`${x}-${label}`} x={x} y={10} fontSize="9" fill="var(--muted)">
              {label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((label, i) => (
            <text key={label} x={0} y={top + (i * 2 + 1) * (cell + gap) + 9} fontSize="9" fill="var(--muted)">
              {label}
            </text>
          ))}
          {weeks.map((week, wi) =>
            week.map((d, di) =>
              d.count < 0 ? null : (
                <rect
                  key={d.date}
                  x={left + wi * (cell + gap)}
                  y={top + di * (cell + gap)}
                  width={cell}
                  height={cell}
                  rx="2"
                  fill={grade(d.count, max)}
                  stroke="var(--border-muted)"
                  strokeWidth="0.5"
                >
                  <title>{`${d.date}: ${d.count} ${d.count === 1 ? "commit" : "commits"}`}</title>
                </rect>
              )
            )
          )}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{fullNumber(total)} commits in the last year</span>
        <span className="flex items-center gap-1">
          Less
          {["var(--grade0)", "var(--grade1)", "var(--grade2)", "var(--grade3)", "var(--grade4)"].map((c) => (
            <span
              key={c}
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: c, border: "0.5px solid var(--border-muted)" }}
            />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
