// GitHub-style repository file listing for the top level of the default branch.
function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const DirIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="#54aeff" aria-hidden="true">
    <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3h-6.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.32 1.26 5.884 1 5.42 1Z" />
  </svg>
);

const FileIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="var(--muted)" aria-hidden="true">
    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 0 0-.011-.013l-2.914-2.914a.272.272 0 0 0-.013-.011Z" />
  </svg>
);

export default function FileTree({
  files,
  repoUrl,
  branch,
}: {
  files: { name: string; type: string; size: number; url: string }[];
  repoUrl: string;
  branch?: string;
}) {
  if (!files?.length) return null;
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <ul className="divide-y divide-border text-sm">
        {files.map((f) => (
          <li key={f.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface">
            {f.type === "dir" ? <DirIcon /> : <FileIcon />}
            <a href={f.url} rel="noopener" className="min-w-0 flex-1 truncate hover:text-accent hover:underline">
              {f.name}
            </a>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {f.type === "file" ? formatBytes(f.size) : ""}
            </span>
          </li>
        ))}
      </ul>
      <a
        href={`${repoUrl}/tree/${branch || "HEAD"}`}
        rel="noopener"
        className="block border-t border-border bg-surface px-3 py-2 text-sm text-accent hover:underline"
      >
        Browse the full source tree
      </a>
    </div>
  );
}
