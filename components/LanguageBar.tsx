// Horizontal composition bar of a repo's languages by bytes, GitHub-style.
const COLORS = [
  "#3178c6", "#f1e05a", "#e34c26", "#563d7c", "#00ADD8",
  "#dea584", "#701516", "#4F5D95", "#89e051", "#555555",
];

export default function LanguageBar({ languages }: { languages: Record<string, number> }) {
  const entries = Object.entries(languages || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;
  const top = entries.slice(0, 8);

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-border">
        {top.map(([lang, bytes], i) => (
          <div
            key={lang}
            style={{ width: `${(bytes / total) * 100}%`, background: COLORS[i % COLORS.length] }}
            title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {top.map(([lang, bytes], i) => (
          <li key={lang} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {lang} {((bytes / total) * 100).toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
