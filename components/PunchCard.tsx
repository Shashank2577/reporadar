// GitHub's classic punch card: commit volume by weekday and hour of day,
// drawn as sized dots. Shows when a project's contributors actually work.
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PunchCard({ points }: { points: { day: number; hour: number; commits: number }[] }) {
  if (!points?.length) return null;
  const max = Math.max(...points.map((p) => p.commits));
  if (max === 0) return null;

  const left = 30;
  const top = 6;
  const stepX = 26;
  const stepY = 22;
  const w = left + 24 * stepX;
  const h = top + 7 * stepY + 16;

  return (
    <figure>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="Commits by day of week and hour of day" className="max-w-full">
          {DAYS.map((d, i) => (
            <text key={d} x={0} y={top + i * stepY + 4} fontSize="9" fill="var(--muted)">
              {d}
            </text>
          ))}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => (
            <text key={hour} x={left + hour * stepX} y={h - 4} fontSize="9" fill="var(--muted)" textAnchor="middle">
              {hour}
            </text>
          ))}
          {points.map((p) => {
            const r = p.commits === 0 ? 0 : 1.5 + (p.commits / max) * 8;
            return (
              <circle
                key={`${p.day}-${p.hour}`}
                cx={left + p.hour * stepX}
                cy={top + p.day * stepY}
                r={r}
                fill="var(--accent)"
                opacity={0.75}
              >
                <title>{`${DAYS[p.day]} ${p.hour}:00 — ${p.commits} commits`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-1 text-xs text-muted">
        Commit volume by weekday and hour (UTC). Larger dots mean more commits.
      </figcaption>
    </figure>
  );
}
