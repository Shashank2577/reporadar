import type { Award } from "@/lib/awards";

const TONES: Record<Award["tone"], { bg: string; fg: string }> = {
  accent: { bg: "var(--accent-subtle)", fg: "var(--accent)" },
  success: { bg: "var(--success-subtle)", fg: "var(--success)" },
  attention: { bg: "var(--attention-subtle)", fg: "var(--attention)" },
  muted: { bg: "var(--surface)", fg: "var(--muted)" },
};

export default function AwardList({ awards, compact = false }: { awards: Award[]; compact?: boolean }) {
  if (!awards.length) return null;
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {awards.slice(0, 3).map((a) => {
          const t = TONES[a.tone];
          return (
            <span
              key={a.id}
              title={a.detail}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: t.bg, color: t.fg }}
            >
              {a.label}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {awards.map((a) => {
        const t = TONES[a.tone];
        return (
          <li key={a.id} className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: t.bg, color: t.fg }}
            >
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M3.75 1.5a.25.25 0 0 0-.25.25V6c0 .28.02.55.06.81A4.5 4.5 0 0 0 8 10.5a4.5 4.5 0 0 0 4.44-3.69c.04-.26.06-.53.06-.81V1.75a.25.25 0 0 0-.25-.25Zm4.25 10.5v1.25h2a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5h2V12Z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: t.fg }}>{a.label}</p>
              <p className="text-xs text-muted">{a.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
